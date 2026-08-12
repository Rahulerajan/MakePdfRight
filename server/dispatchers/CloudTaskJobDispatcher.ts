import { IJobDispatcher, JobDispatchOptions } from './IJobDispatcher.js';
import { LocalJobDispatcher } from './LocalJobDispatcher.js';
import { LoggingService } from '../services/LoggingService.js';

export class CloudTaskJobDispatcher implements IJobDispatcher {
  private localFallback = new LocalJobDispatcher();

  async dispatch(options: JobDispatchOptions): Promise<boolean> {
    const queue = process.env.CLOUD_TASKS_QUEUE;
    const location = process.env.CLOUD_TASKS_LOCATION || 'us-central1';
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
    const workerEndpoint = process.env.WORKER_ENDPOINT;

    if (!queue || !project || !workerEndpoint) {
      LoggingService.info('[CloudTaskJobDispatcher] Cloud Tasks environment variables incomplete. Falling back to local/in-process dispatch.');
      return this.localFallback.dispatch(options);
    }

    try {
      // Dynamic import of @google-cloud/tasks to support optional production deployment
      const pkgName = '@google-cloud/tasks';
      const tasksModule = await (import(pkgName) as Promise<any>).catch(() => null);
      if (!tasksModule) {
        LoggingService.warn('[CloudTaskJobDispatcher] @google-cloud/tasks package not available. Falling back to local dispatch.');
        return this.localFallback.dispatch(options);
      }

      const { CloudTasksClient } = tasksModule;
      const client = new CloudTasksClient();
      const parent = client.queuePath(project, location, queue);

      const workerSecret = process.env.WORKER_SECRET || '';
      const payloadString = JSON.stringify(options);

      const task: any = {
        httpRequest: {
          httpMethod: 'POST',
          url: workerEndpoint,
          headers: {
            'Content-Type': 'application/json',
            'x-worker-secret': workerSecret
          },
          body: Buffer.from(payloadString).toString('base64')
        }
      };

      if (process.env.CLOUD_TASKS_SERVICE_ACCOUNT) {
        task.httpRequest.oidcToken = {
          serviceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT
        };
      }

      await client.createTask({ parent, task });
      LoggingService.info(`[CloudTaskJobDispatcher] Successfully dispatched Cloud Task for job ${options.jobId}`);
      return true;

    } catch (err) {
      LoggingService.error(`[CloudTaskJobDispatcher] Failed to dispatch Cloud Task for job ${options.jobId}. Falling back:`, err);
      return this.localFallback.dispatch(options);
    }
  }
}
