import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { buildPriceQuote } from "../pricing/pricing.service.js";
import { computeOptimizedPlan } from "./optimizer.service.js";
import { stableHash } from "../../utils/hash.js";
import { prisma } from "../../db/prisma.js";
import { writeAuditLog } from "../../utils/audit.js";

const planSchema = z.object({
  cartId: z.string().optional()
});

export const optimizerRoutes: FastifyPluginAsync = async (app) => {
  app.post("/plan", { preHandler: app.authenticate }, async (request, reply) => {
    const body = planSchema.parse(request.body ?? {});
    const userId = request.user.userId;

    try {
      const quote = await buildPriceQuote(userId, body.cartId);
      const result = computeOptimizedPlan(quote.offers);
      const quoteHash = stableHash({ cartId: quote.cartId, offers: quote.offers });

      const plan = await prisma.optimizationPlan.create({
        data: {
          userId,
          cartId: quote.cartId,
          quoteHash,
          subtotalCents: result.subtotalCents,
          feeCents: result.feeCents,
          taxCents: result.taxCents,
          totalCents: result.totalCents,
          projectedSavingsCents: result.projectedSavingsCents,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          planLegs: {
            create: result.legs.map((leg) => ({
              market: leg.market,
              itemSubtotalCents: leg.itemSubtotalCents,
              feeCents: leg.feeCents,
              taxCents: leg.taxCents,
              totalCents: leg.totalCents,
              lineItems: leg.lineItems,
              deliveryWindow: leg.deliveryWindow,
              reliabilityScore: leg.reliabilityScore
            }))
          }
        },
        include: { planLegs: true }
      });

      await writeAuditLog({
        userId,
        action: "OPTIMIZATION_PLAN_CREATED",
        entity: "OptimizationPlan",
        entityId: plan.id,
        metadata: {
          markets: plan.planLegs.map((leg) => leg.market),
          totalCents: plan.totalCents
        }
      });

      return {
        id: plan.id,
        quoteHash: plan.quoteHash,
        totals: {
          subtotalCents: plan.subtotalCents,
          feeCents: plan.feeCents,
          taxCents: plan.taxCents,
          totalCents: plan.totalCents,
          projectedSavingsCents: plan.projectedSavingsCents
        },
        legs: plan.planLegs
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Optimization failed"
      });
    }
  });
};
