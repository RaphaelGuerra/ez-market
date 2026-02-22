import { Worker } from "bullmq";
import { redisConnection } from "./queues.js";
import { logger } from "../utils/logger.js";

export function createNoopWorker(queueName: string) {
  const worker = new Worker(
    queueName,
    async (job) => {
      logger.info({ queueName, jobId: job.id, name: job.name }, "noop_worker_processed_job");
    },
    {
      connection: redisConnection,
      concurrency: 2
    }
  );

  worker.on("failed", (job, error) => {
    logger.error({ queueName, jobId: job?.id, error }, "noop_worker_failed_job");
  });

  return worker;
}
