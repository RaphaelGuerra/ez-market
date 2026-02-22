import { Queue } from "bullmq";
import { env } from "../config/env.js";

const redisUrl = new URL(env.REDIS_URL);

export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null
};

export const QUEUES = {
  ingestion: "ingestion-worker",
  optimization: "optimization-worker",
  checkout: "checkout-worker",
  connector: "connector-worker",
  reconciliation: "reconciliation-worker"
} as const;

export const checkoutQueue = new Queue(QUEUES.checkout, {
  connection: redisConnection
});
