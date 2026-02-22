import { logger } from "../../utils/logger.js";
import { writeAuditLog } from "../../utils/audit.js";

export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  logger.info({ notification: params }, "notification_emitted");
  await writeAuditLog({
    userId: params.userId,
    action: "NOTIFICATION_SENT",
    entity: "Notification",
    metadata: {
      type: params.type,
      title: params.title,
      message: params.message,
      ...params.metadata
    }
  });
}
