import type { RedisClient } from "bun";
import { getRedisClient } from "../services/redis.ts";

export interface Job {
  id: string;
  type: JobType;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export type JobType = "extract_product" | "resolve_merchants" | "fetch_prices";

const QUEUE_NAMES: Record<JobType, string> = {
  extract_product: "queue:extract_product",
  resolve_merchants: "queue:resolve_merchants",
  fetch_prices: "queue:fetch_prices",
};

const JOB_STATUS_KEY = "job_status:";

export class JobQueue {
  private redis: RedisClient;

  constructor() {
    this.redis = getRedisClient();
  }

  async enqueue(type: JobType, payload: unknown, jobId?: string): Promise<string> {
    const id = jobId || crypto.randomUUID();
    const job: Job = {
      id,
      type,
      payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    // Add to queue
    await this.redis.lpush(QUEUE_NAMES[type], JSON.stringify(job));
    
    // Wake up any waiting workers
    await this.redis.publish(QUEUE_NAMES[type], "new_job");
    
    // Set initial status
    await this.setJobStatus(id, "queued", { type, payload });

    return id;
  }

  async dequeue(type: JobType): Promise<Job | null> {
    const result = await this.redis.brpop(QUEUE_NAMES[type], "1");
    if (!result) return null;

    // brpop returns [queue_name, value]
    const jobData = Array.isArray(result) ? result[1] : result;
    const job: Job = JSON.parse(jobData);
    job.attempts++;
    
    await this.setJobStatus(job.id, "processing", { 
      type: job.type, 
      attempts: job.attempts 
    });

    return job;
  }

  async complete(jobId: string, result: unknown): Promise<void> {
    await this.setJobStatus(jobId, "completed", { result });
  }

  async fail(jobId: string, error: string, canRetry: boolean): Promise<void> {
    await this.setJobStatus(jobId, canRetry ? "failed" : "permanent_fail", { error });
  }

  async retry(job: Job): Promise<void> {
    if (job.attempts >= job.maxAttempts) {
      await this.fail(job.id, "Max attempts exceeded", false);
      return;
    }

    // Re-queue with incremented attempts
    await this.redis.lpush(QUEUE_NAMES[job.type], JSON.stringify(job));
    await this.setJobStatus(job.id, "queued", { 
      type: job.type, 
      attempts: job.attempts 
    });
  }

  async getJobStatus(jobId: string): Promise<{
    status: "queued" | "processing" | "completed" | "failed" | "permanent_fail";
    data?: unknown;
  } | null> {
    const result = await this.redis.get(`${JOB_STATUS_KEY}${jobId}`);
    if (!result) return null;
    return JSON.parse(result);
  }

  private async setJobStatus(
    jobId: string, 
    status: string, 
    data: unknown
  ): Promise<void> {
    const statusData = {
      status,
      data,
      updatedAt: new Date().toISOString(),
    };
    
    // Store with 24h TTL
    await this.redis.setex(`${JOB_STATUS_KEY}${jobId}`, 86400, JSON.stringify(statusData));
  }
}

export const jobQueue = new JobQueue();
