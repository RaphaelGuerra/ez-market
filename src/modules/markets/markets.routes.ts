import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { encryptSecret } from "../../utils/crypto-vault.js";
import { writeAuditLog } from "../../utils/audit.js";
import { connectorForMarket } from "../../connectors/registry.js";

const linkMarketSchema = z.object({
  market: z.string().min(1),
  externalAccountId: z.string().optional(),
  credential: z.string().min(1)
});

const refreshMarketSchema = z.object({
  sessionToken: z.string().optional(),
  credential: z.string().optional()
});

export const marketsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/accounts/link", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const body = linkMarketSchema.parse(request.body);

    if (!connectorForMarket(body.market)) {
      return reply.code(400).send({ message: "Unsupported market" });
    }

    const policy = await prisma.connectorPolicy.findUnique({
      where: { market: body.market }
    });

    if (!policy || policy.killSwitchEnabled || !policy.enabled) {
      return reply.code(403).send({ message: "Market temporarily unavailable" });
    }

    const account = await prisma.marketAccount.upsert({
      where: {
        userId_market: {
          userId,
          market: body.market
        }
      },
      update: {
        encryptedCredential: encryptSecret(body.credential),
        externalAccountId: body.externalAccountId,
        status: "ACTIVE",
        lastRefreshedAt: new Date()
      },
      create: {
        userId,
        market: body.market,
        encryptedCredential: encryptSecret(body.credential),
        externalAccountId: body.externalAccountId,
        status: "ACTIVE",
        lastRefreshedAt: new Date()
      }
    });

    await writeAuditLog({
      userId,
      action: "MARKET_ACCOUNT_LINKED",
      entity: "MarketAccount",
      entityId: account.id,
      metadata: { market: account.market }
    });

    return reply.code(201).send({
      id: account.id,
      market: account.market,
      status: account.status,
      externalAccountId: account.externalAccountId
    });
  });

  app.post("/accounts/:id/refresh", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = refreshMarketSchema.parse(request.body);

    const account = await prisma.marketAccount.findFirst({ where: { id: params.id, userId } });
    if (!account) {
      return reply.code(404).send({ message: "Market account not found" });
    }

    const refreshed = await prisma.marketAccount.update({
      where: { id: params.id },
      data: {
        encryptedSession: body.sessionToken ? encryptSecret(body.sessionToken) : account.encryptedSession,
        encryptedCredential: body.credential ? encryptSecret(body.credential) : account.encryptedCredential,
        status: "ACTIVE",
        lastRefreshedAt: new Date()
      }
    });

    await writeAuditLog({
      userId,
      action: "MARKET_ACCOUNT_REFRESHED",
      entity: "MarketAccount",
      entityId: refreshed.id,
      metadata: { market: refreshed.market }
    });

    return {
      id: refreshed.id,
      market: refreshed.market,
      status: refreshed.status,
      lastRefreshedAt: refreshed.lastRefreshedAt
    };
  });

  app.delete("/accounts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const params = z.object({ id: z.string() }).parse(request.params);

    const account = await prisma.marketAccount.findFirst({ where: { id: params.id, userId } });
    if (!account) {
      return reply.code(404).send({ message: "Market account not found" });
    }

    await prisma.marketAccount.delete({ where: { id: params.id } });

    await writeAuditLog({
      userId,
      action: "MARKET_ACCOUNT_DELETED",
      entity: "MarketAccount",
      entityId: account.id,
      metadata: { market: account.market }
    });

    return reply.code(204).send();
  });
};
