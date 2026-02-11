import { jobQueue, type Job } from "../services/jobQueue.ts";
import { processExtractProductJob } from "./extractWorker.ts";
import { processResolveMerchantsJob } from "./resolveWorker.ts";
import { processFetchPricesJob } from "./priceWorker.ts";

const WORKER_CONCURRENCY = 3;
const WORKER_POLL_INTERVAL = 1000; // 1 second

let isRunning = false;

export function startAllWorkers(): void {
  if (isRunning) {
    console.log("[Workers] Already running");
    return;
  }

  isRunning = true;
  console.log("[Workers] Starting job workers...");

  // Start workers for each queue
  for (let i = 0; i < WORKER_CONCURRENCY; i++) {
    startExtractWorker(i);
    startResolveWorker(i);
    startPriceWorker(i);
  }
}

async function startExtractWorker(workerId: number): Promise<void> {
  console.log(`[ExtractWorker-${workerId}] Started`);
  
  while (isRunning) {
    try {
      const job = await jobQueue.dequeue("extract_product");
      
      if (job) {
        await processExtractProductJob(job);
      } else {
        // No jobs, wait before polling again
        await sleep(WORKER_POLL_INTERVAL);
      }
    } catch (error) {
      console.error(`[ExtractWorker-${workerId}] Error:`, error);
      await sleep(WORKER_POLL_INTERVAL);
    }
  }
}

async function startResolveWorker(workerId: number): Promise<void> {
  console.log(`[ResolveWorker-${workerId}] Started`);
  
  while (isRunning) {
    try {
      const job = await jobQueue.dequeue("resolve_merchants");
      
      if (job) {
        await processResolveMerchantsJob(job);
      } else {
        await sleep(WORKER_POLL_INTERVAL);
      }
    } catch (error) {
      console.error(`[ResolveWorker-${workerId}] Error:`, error);
      await sleep(WORKER_POLL_INTERVAL);
    }
  }
}

async function startPriceWorker(workerId: number): Promise<void> {
  console.log(`[PriceWorker-${workerId}] Started`);
  
  while (isRunning) {
    try {
      const job = await jobQueue.dequeue("fetch_prices");
      
      if (job) {
        await processFetchPricesJob(job);
      } else {
        await sleep(WORKER_POLL_INTERVAL);
      }
    } catch (error) {
      console.error(`[PriceWorker-${workerId}] Error:`, error);
      await sleep(WORKER_POLL_INTERVAL);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function stopAllWorkers(): void {
  isRunning = false;
  console.log("[Workers] Stopping...");
}
