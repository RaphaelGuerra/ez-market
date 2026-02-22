import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { writeAuditLog } from "../../utils/audit.js";
import { env } from "../../config/env.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().min(8).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4)
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.code(409).send({ message: "Email already registered" });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 10),
        name: body.name,
        phone: body.phone,
        city: env.CITY_NAME
      }
    });

    await prisma.cart.create({ data: { userId: user.id } });
    await prisma.paymentMethodRef.create({
      data: {
        userId: user.id,
        provider: "mock_psp",
        tokenRef: `tok_${user.id.slice(0, 16)}`,
        last4: "4242",
        brand: "VISA",
        isDefault: true
      }
    });

    await writeAuditLog({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      metadata: { email: user.email }
    });

    const token = await reply.jwtSign({ userId: user.id, email: user.email });

    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      },
      verificationHint: "Use code 123456 in MVP"
    });
  });

  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const token = await reply.jwtSign({ userId: user.id, email: user.email });

    await writeAuditLog({
      userId: user.id,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user.id
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      }
    };
  });

  app.post("/verify", async (request, reply) => {
    const body = verifySchema.parse(request.body);

    if (body.code !== "123456") {
      return reply.code(400).send({ message: "Invalid verification code" });
    }

    const user = await prisma.user.update({
      where: { email: body.email },
      data: { emailVerified: true }
    });

    await writeAuditLog({
      userId: user.id,
      action: "EMAIL_VERIFIED",
      entity: "User",
      entityId: user.id
    });

    return {
      message: "Email verified",
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified
      }
    };
  });
};
