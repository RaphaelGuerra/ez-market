import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { writeAuditLog } from "../../utils/audit.js";
import { notifyUser } from "../notifications/notifications.service.js";

const orderListQuery = z.object({
  status: z
    .enum([
      "PENDING_APPROVAL",
      "APPROVED",
      "PROCESSING",
      "PARTIAL_FAILED",
      "COMPLETED",
      "CANCELED",
      "FAILED"
    ])
    .optional()
});

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const userId = request.user.userId;

    const order = await prisma.order.findFirst({
      where: { id: params.id, userId },
      include: {
        orderLegs: true,
        orderEvents: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!order) {
      return reply.code(404).send({ message: "Order not found" });
    }

    return order;
  });

  app.get("/", { preHandler: app.authenticate }, async (request) => {
    const query = orderListQuery.parse(request.query);
    const userId = request.user.userId;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: query.status
      },
      include: {
        orderLegs: true
      },
      orderBy: { createdAt: "desc" }
    });

    return {
      count: orders.length,
      orders
    };
  });

  app.post("/:id/cancel", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const params = z.object({ id: z.string() }).parse(request.params);

    const order = await prisma.order.findFirst({
      where: { id: params.id, userId },
      include: { orderLegs: true }
    });

    if (!order) {
      return reply.code(404).send({ message: "Order not found" });
    }

    if (["COMPLETED", "FAILED", "CANCELED"].includes(order.status)) {
      return reply.code(409).send({ message: `Order cannot be canceled in status ${order.status}` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELED" }
      });

      await tx.orderLeg.updateMany({
        where: {
          orderId: order.id,
          status: { in: ["PENDING", "PROCESSING"] }
        },
        data: {
          status: "CANCELED"
        }
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          userId,
          type: "ORDER_CANCELED",
          payload: {}
        }
      });
    });

    await writeAuditLog({
      userId,
      action: "ORDER_CANCELED",
      entity: "Order",
      entityId: order.id
    });

    await notifyUser({
      userId,
      type: "ORDER_CANCELED",
      title: "Order canceled",
      message: `Order ${order.id} was canceled.`
    });

    return { orderId: order.id, status: "CANCELED" };
  });
};
