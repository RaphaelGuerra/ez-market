import { prisma } from "../db/prisma.js";

export async function writeAuditLog(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ?? {}
    }
  });
}
