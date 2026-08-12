import { IJobDispatcher, JobDispatchOptions } from './IJobDispatcher.js';
import { WorkerService } from '../services/WorkerService.js';
import { LoggingService } from '../services/LoggingService.js';

export class LocalJobDispatcher implements IJobDispatcher {
  async dispatch(options: JobDispatchOptions): Promise<boolean> {
    const { jobId, ownerId } = options;
    const workerEndpoint = process.env.WORKER_ENDPOINT;

    if (workerEndpoint) {
      // If a distinct worker endpoint URL is provided, issue an HTTP POST trigger
      try {
        const workerSecret = process.env.WORKER_SECRET || '';
        fetch(workerEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-worker-secret': workerSecret
          },
          body: JSON.stringify({ jobId, ownerId })
        }).catch(err => {
          LoggingService.warn(`[LocalJobDispatcher] HTTP trigger to ${workerEndpoint} failed for job ${jobId}:`, err);
        });
        return true;
      } catch (err) {
        LoggingService.error(`[LocalJobDispatcher] Error calling worker endpoint:`, err);
      }
    }

    // Default local fallback: execute asynchronously on setImmediate without blocking caller
    setImmediate(() => {
      WorkerService.processJob(jobId, ownerId).catch((err) => {
        LoggingService.error(`[LocalJobDispatcher] Background processing trigger failed for job ${jobId}:`, err);
      });
    });

    return true;
  }
}
