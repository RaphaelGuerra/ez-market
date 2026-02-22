import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { getOrCreateActiveCart } from "./cart.service.js";
import { writeAuditLog } from "../../utils/audit.js";

const addItemSchema = z.object({
  cartId: z.string().optional(),
  catalogItemId: z.string().min(1),
  quantity: z.number().int().positive().max(25)
});

export const cartRoutes: FastifyPluginAsync = async (app) => {
  app.post("/items", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const body = addItemSchema.parse(request.body);

    const cart = body.cartId
      ? await prisma.cart.findFirst({ where: { id: body.cartId, userId } })
      : await getOrCreateActiveCart(userId);

    if (!cart) {
      return reply.code(404).send({ message: "Cart not found" });
    }

    const catalogItem = await prisma.catalogItem.findUnique({ where: { id: body.catalogItemId } });
    if (!catalogItem || !catalogItem.active) {
      return reply.code(404).send({ message: "Catalog item not found" });
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_catalogItemId: {
          cartId: cart.id,
          catalogItemId: body.catalogItemId
        }
      },
      create: {
        cartId: cart.id,
        catalogItemId: body.catalogItemId,
        quantity: body.quantity
      },
      update: {
        quantity: body.quantity
      }
    });

    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { catalogItem: true } } }
    });

    await writeAuditLog({
      userId,
      action: "CART_ITEM_UPSERTED",
      entity: "Cart",
      entityId: cart.id,
      metadata: { catalogItemId: body.catalogItemId, quantity: body.quantity }
    });

    return reply.code(200).send(updated);
  });

  app.get("/", { preHandler: app.authenticate }, async (request) => {
    const cart = await getOrCreateActiveCart(request.user.userId);
    return cart;
  });
};
