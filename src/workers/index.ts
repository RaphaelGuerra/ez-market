import { checkoutWorker } from "./checkout.worker.js";
import { createNoopWorker } from "./noop.worker.js";
import { QUEUES } from "./queues.js";
import { logger } from "../utils/logger.js";

const ingestionWorker = createNoopWorker(QUEUES.ingestion);
const optimizationWorker = createNoopWorker(QUEUES.optimization);
const connectorWorker = createNoopWorker(QUEUES.connector);
const reconciliationWorker = createNoopWorker(QUEUES.reconciliation);

logger.info("workers_started");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, "stopping_workers");
    await checkoutWorker.close();
    await ingestionWorker.close();
    await optimizationWorker.close();
    await connectorWorker.close();
    await reconciliationWorker.close();
    process.exit(0);
  });
}
