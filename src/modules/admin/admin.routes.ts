import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { writeAuditLog } from "../../utils/audit.js";

const toggleSchema = z.object({
  enabled: z.boolean(),
  notes: z.string().max(500).optional()
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const ensureAdmin = async (request: any, reply: any) => {
    await app.authenticate(request, reply);
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (!user || user.role !== "ADMIN") {
      return reply.code(403).send({ message: "Admin role required" });
    }
  };

  app.get("/connectors", { preHandler: ensureAdmin }, async () => {
    const policies = await prisma.connectorPolicy.findMany({
      include: {
        health: {
          orderBy: { checkedAt: "desc" },
          take: 1
        }
      },
      orderBy: { market: "asc" }
    });

    return { connectors: policies };
  });

  app.post("/connectors/:market/kill-switch", { preHandler: ensureAdmin }, async (request) => {
    const params = z.object({ market: z.string().min(1) }).parse(request.params);
    const body = toggleSchema.parse(request.body);

    const policy = await prisma.connectorPolicy.upsert({
      where: { market: params.market },
      update: {
        killSwitchEnabled: body.enabled,
        notes: body.notes
      },
      create: {
        market: params.market,
        enabled: true,
        mode: "HYBRID",
        robotsCompliant: true,
        tosCompliant: true,
        killSwitchEnabled: body.enabled,
        notes: body.notes
      }
    });

    await writeAuditLog({
      userId: request.user.userId,
      action: body.enabled ? "CONNECTOR_KILL_SWITCH_ON" : "CONNECTOR_KILL_SWITCH_OFF",
      entity: "ConnectorPolicy",
      entityId: policy.id,
      metadata: { market: params.market, notes: body.notes }
    });

    return {
      market: policy.market,
      killSwitchEnabled: policy.killSwitchEnabled,
      notes: policy.notes,
      updatedAt: policy.updatedAt
    };
  });
};
