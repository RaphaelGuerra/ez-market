import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { writeAuditLog } from "../../utils/audit.js";
import { loadIdempotentResponse, storeIdempotentResponse } from "../../utils/idempotency.js";
import { buildPriceQuote } from "../pricing/pricing.service.js";
import { computeOptimizedPlan } from "../optimizer/optimizer.service.js";
import { checkoutQueue } from "../../workers/queues.js";
import { notifyUser } from "../notifications/notifications.service.js";

const prepareSchema = z.object({
  optimizationPlanId: z.string().min(1)
});

const approveSchema = z.object({
  approvalBundleId: z.string().min(1),
  confirm: z.literal(true)
});

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post("/prepare", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const body = prepareSchema.parse(request.body);
    const idemKey = request.headers["x-idempotency-key"] as string | undefined;

    const cached = await loadIdempotentResponse({ key: idemKey, endpoint: "/v1/checkout/prepare" });
    if (cached) {
      return reply.code(cached.statusCode).send(cached.response);
    }

    const plan = await prisma.optimizationPlan.findFirst({
      where: {
        id: body.optimizationPlanId,
        userId
      },
      include: { planLegs: true }
    });

    if (!plan) {
      return reply.code(404).send({ message: "Optimization plan not found" });
    }

    if (plan.expiresAt.getTime() < Date.now()) {
      return reply.code(409).send({ message: "Optimization plan expired" });
    }

    const bundle = await prisma.approvalBundle.create({
      data: {
        userId,
        optimizationPlanId: plan.id,
        quoteHash: plan.quoteHash,
        status: "PENDING",
        expiresAt: new Date(Date.now() + env.APPROVAL_BUNDLE_TTL_MIN * 60_000),
        metadata: {
          totalCents: plan.totalCents,
          markets: plan.planLegs.map((leg) => leg.market)
        }
      }
    });

    const response = {
      id: bundle.id,
      status: bundle.status,
      quoteHash: bundle.quoteHash,
      expiresAt: bundle.expiresAt,
      totalCents: plan.totalCents,
      planLegs: plan.planLegs
    };

    await storeIdempotentResponse({
      key: idemKey,
      endpoint: "/v1/checkout/prepare",
      userId,
      request: body,
      response,
      statusCode: 201
    });

    await writeAuditLog({
      userId,
      action: "CHECKOUT_PREPARED",
      entity: "ApprovalBundle",
      entityId: bundle.id,
      metadata: {
        optimizationPlanId: plan.id,
        totalCents: plan.totalCents
      }
    });

    return reply.code(201).send(response);
  });

  app.post("/approve", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const body = approveSchema.parse(request.body);
    const idemKey = request.headers["x-idempotency-key"] as string | undefined;

    const cached = await loadIdempotentResponse({ key: idemKey, endpoint: "/v1/checkout/approve" });
    if (cached) {
      return reply.code(cached.statusCode).send(cached.response);
    }

    const bundle = await prisma.approvalBundle.findFirst({
      where: { id: body.approvalBundleId, userId },
      include: {
        optimizationPlan: {
          include: {
            planLegs: true
          }
        }
      }
    });

    if (!bundle) {
      return reply.code(404).send({ message: "Approval bundle not found" });
    }

    if (bundle.status !== "PENDING") {
      return reply.code(409).send({ message: "Approval bundle already processed" });
    }

    if (bundle.expiresAt.getTime() < Date.now()) {
      await prisma.approvalBundle.update({
        where: { id: bundle.id },
        data: { status: "EXPIRED" }
      });
      return reply.code(409).send({ message: "Approval bundle expired" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    const refreshedQuote = await buildPriceQuote(userId, bundle.optimizationPlan.cartId);
    const refreshedPlan = computeOptimizedPlan(refreshedQuote.offers);

    const deltaPct =
      Math.abs(refreshedPlan.totalCents - bundle.optimizationPlan.totalCents) /
      Math.max(1, bundle.optimizationPlan.totalCents) *
      100;

    if (deltaPct > Number(user.maxPriceDeltaPct ?? env.DEFAULT_MAX_PRICE_DELTA_PCT)) {
      await writeAuditLog({
        userId,
        action: "CHECKOUT_REAPPROVAL_REQUIRED",
        entity: "ApprovalBundle",
        entityId: bundle.id,
        metadata: {
          deltaPct,
          oldTotalCents: bundle.optimizationPlan.totalCents,
          newTotalCents: refreshedPlan.totalCents
        }
      });

      await notifyUser({
        userId,
        type: "REAPPROVAL_REQUIRED",
        title: "Price changed before checkout",
        message: "Please re-run optimization and approve the updated price."
      });

      return reply.code(409).send({
        message: "Price changed above configured threshold; re-approval required",
        deltaPct,
        previousTotalCents: bundle.optimizationPlan.totalCents,
        latestTotalCents: refreshedPlan.totalCents
      });
    }

    const accounts = await prisma.marketAccount.findMany({
      where: {
        userId,
        status: "ACTIVE",
        market: {
          in: bundle.optimizationPlan.planLegs.map((leg) => leg.market)
        }
      }
    });

    const accountByMarket = new Map(accounts.map((account) => [account.market, account]));
    for (const leg of bundle.optimizationPlan.planLegs) {
      if (!accountByMarket.has(leg.market)) {
        return reply.code(400).send({
          message: `Missing linked active market account for ${leg.market}`
        });
      }
    }

    const paymentRef = await prisma.paymentMethodRef.findFirst({
      where: { userId, isDefault: true },
      orderBy: { createdAt: "asc" }
    });

    if (!paymentRef) {
      return reply.code(400).send({ message: "Default payment method token is required" });
    }

    const order = await prisma.$transaction(async (tx) => {
      const updatedBundle = await tx.approvalBundle.update({
        where: { id: bundle.id },
        data: { status: "APPROVED", approvedAt: new Date() }
      });

      const createdOrder = await tx.order.create({
        data: {
          userId,
          approvalBundleId: updatedBundle.id,
          status: "APPROVED",
          totalCents: bundle.optimizationPlan.totalCents,
          orderLegs: {
            create: bundle.optimizationPlan.planLegs.map((leg) => ({
              market: leg.market,
              marketAccountId: accountByMarket.get(leg.market)!.id,
              status: "PENDING",
              totalCents: leg.totalCents,
              payload: {
                lineItems: leg.lineItems,
                deliveryWindow: leg.deliveryWindow
              }
            }))
          }
        },
        include: { orderLegs: true }
      });

      await tx.orderEvent.create({
        data: {
          orderId: createdOrder.id,
          userId,
          type: "ORDER_APPROVED",
          payload: {
            approvalBundleId: bundle.id,
            totalCents: createdOrder.totalCents
          }
        }
      });

      return createdOrder;
    });

    await checkoutQueue.add(
      "execute-order",
      {
        orderId: order.id,
        userId,
        paymentTokenRef: paymentRef.tokenRef
      },
      {
        attempts: 4,
        backoff: {
          type: "exponential",
          delay: 2500
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    await writeAuditLog({
      userId,
      action: "CHECKOUT_APPROVED",
      entity: "Order",
      entityId: order.id,
      metadata: {
        orderLegs: order.orderLegs.length,
        totalCents: order.totalCents
      }
    });

    const response = {
      orderId: order.id,
      status: order.status,
      totalCents: order.totalCents,
      legs: order.orderLegs
    };

    await storeIdempotentResponse({
      key: idemKey,
      endpoint: "/v1/checkout/approve",
      userId,
      request: body,
      response,
      statusCode: 200
    });

    await notifyUser({
      userId,
      type: "ORDER_STARTED",
      title: "Order submitted",
      message: `Order ${order.id} has started processing.`
    });

    return response;
  });
};
