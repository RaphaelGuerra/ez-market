import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { writeAuditLog } from "../../utils/audit.js";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  maxPriceDeltaPct: z.number().min(0).max(50).optional(),
  approvalSpendCapCents: z.number().int().positive().optional()
});

const createAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(3),
  country: z.string().min(2).default("US"),
  latitude: z.number(),
  longitude: z.number(),
  isDefault: z.boolean().default(true)
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        marketAccounts: true,
        paymentMethodRefs: true
      }
    });

    return user;
  });

  app.patch("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const body = updateProfileSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        phone: body.phone,
        maxPriceDeltaPct: body.maxPriceDeltaPct,
        approvalSpendCapCents: body.approvalSpendCapCents
      }
    });

    await writeAuditLog({
      userId,
      action: "USER_PROFILE_UPDATED",
      entity: "User",
      entityId: userId,
      metadata: body
    });

    return reply.send(user);
  });

  app.post("/me/address", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const body = createAddressSchema.parse(request.body);

    if (body.city.toLowerCase() !== env.CITY_NAME.toLowerCase()) {
      return reply
        .code(400)
        .send({ message: `MVP supports only ${env.CITY_NAME} addresses` });
    }

    if (body.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.userAddress.create({
      data: {
        userId,
        line1: body.line1,
        line2: body.line2,
        city: body.city,
        state: body.state,
        zip: body.zip,
        country: body.country,
        latitude: body.latitude,
        longitude: body.longitude,
        isDefault: body.isDefault
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { city: body.city }
    });

    await writeAuditLog({
      userId,
      action: "ADDRESS_ADDED",
      entity: "UserAddress",
      entityId: address.id,
      metadata: { city: address.city, zip: address.zip }
    });

    return reply.code(201).send(address);
  });
};
