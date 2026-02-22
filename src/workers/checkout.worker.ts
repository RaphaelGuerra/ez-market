import { Worker } from "bullmq";
import { QUEUES, redisConnection } from "./queues.js";
import { prisma } from "../db/prisma.js";
import { connectorForMarket } from "../connectors/registry.js";
import { logger } from "../utils/logger.js";
import { writeAuditLog } from "../utils/audit.js";
import { notifyUser } from "../modules/notifications/notifications.service.js";

type ExecuteOrderJob = {
  orderId: string;
  userId: string;
  paymentTokenRef: string;
};

export const checkoutWorker = new Worker(
  QUEUES.checkout,
  async (job) => {
    const payload = job.data as ExecuteOrderJob;
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        orderLegs: {
          include: {
            marketAccount: true
          }
        },
        user: {
          include: {
            addresses: {
              where: { isDefault: true },
              take: 1
            }
          }
        }
      }
    });

    if (!order) {
      logger.warn({ orderId: payload.orderId }, "order_not_found_for_worker");
      return;
    }

    await prisma.order.update({ where: { id: order.id }, data: { status: "PROCESSING" } });

    const defaultAddress = order.user.addresses[0];
    if (!defaultAddress) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          userId: payload.userId,
          type: "ORDER_FAILED_NO_ADDRESS",
          payload: {}
        }
      });
      return;
    }

    let completed = 0;
    let failed = 0;

    for (const leg of order.orderLegs) {
      const connector = connectorForMarket(leg.market);

      if (!connector) {
        await prisma.orderLeg.update({
          where: { id: leg.id },
          data: {
            status: "FAILED",
            errorCode: "NO_CONNECTOR",
            errorMessage: "No connector registered"
          }
        });
        failed += 1;
        continue;
      }

      await prisma.orderLeg.update({ where: { id: leg.id }, data: { status: "PROCESSING" } });

      const response = await connector.placeOrder({
        accountExternalId: leg.marketAccount.externalAccountId ?? undefined,
        lineItems: (leg.payload as any).lineItems.map((line: any) => ({
          externalSkuId: line.externalSkuId,
          quantity: line.quantity
        })),
        paymentTokenRef: payload.paymentTokenRef,
        deliveryAddress: {
          line1: defaultAddress.line1,
          city: defaultAddress.city,
          state: defaultAddress.state,
          zip: defaultAddress.zip,
          country: defaultAddress.country
        }
      });

      if (!response.success) {
        failed += 1;

        const nextStatus = response.errorCode === "REAUTH_REQUIRED" ? "REAUTH_REQUIRED" : "ACTIVE";
        if (response.errorCode === "REAUTH_REQUIRED") {
          await prisma.marketAccount.update({
            where: { id: leg.marketAccountId },
            data: { status: "REAUTH_REQUIRED" }
          });

          await notifyUser({
            userId: payload.userId,
            type: "MARKET_REAUTH_REQUIRED",
            title: `Reconnect ${leg.market}`,
            message: `Session expired for ${leg.market}; refresh account to continue automation.`
          });
        }

        await prisma.orderLeg.update({
          where: { id: leg.id },
          data: {
            status: "FAILED",
            errorCode: response.errorCode ?? "UNKNOWN",
            errorMessage: response.errorMessage ?? "Order placement failed"
          }
        });

        await writeAuditLog({
          userId: payload.userId,
          action: "ORDER_LEG_FAILED",
          entity: "OrderLeg",
          entityId: leg.id,
          metadata: {
            market: leg.market,
            errorCode: response.errorCode,
            nextAccountStatus: nextStatus
          }
        });
      } else {
        completed += 1;
        await prisma.orderLeg.update({
          where: { id: leg.id },
          data: {
            status: "COMPLETED",
            externalOrderId: response.externalOrderId
          }
        });
      }
    }

    const finalStatus = failed === 0 ? "COMPLETED" : completed > 0 ? "PARTIAL_FAILED" : "FAILED";

    await prisma.order.update({
      where: { id: order.id },
      data: { status: finalStatus }
    });

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        userId: payload.userId,
        type: finalStatus === "COMPLETED" ? "ORDER_COMPLETED" : "ORDER_FINISHED_WITH_ERRORS",
        payload: { completedLegs: completed, failedLegs: failed }
      }
    });

    await writeAuditLog({
      userId: payload.userId,
      action: "ORDER_EXECUTION_FINISHED",
      entity: "Order",
      entityId: order.id,
      metadata: { completedLegs: completed, failedLegs: failed, status: finalStatus }
    });

    await notifyUser({
      userId: payload.userId,
      type: finalStatus,
      title: "Order execution update",
      message: `Order ${order.id} finished with status ${finalStatus}.`,
      metadata: { completedLegs: completed, failedLegs: failed }
    });
  },
  {
    connection: redisConnection,
    concurrency: 4
  }
);

checkoutWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "checkout_job_failed");
});
