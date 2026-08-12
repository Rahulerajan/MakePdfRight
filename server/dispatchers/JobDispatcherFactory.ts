import { IJobDispatcher } from './IJobDispatcher.js';
import { LocalJobDispatcher } from './LocalJobDispatcher.js';
import { CloudTaskJobDispatcher } from './CloudTaskJobDispatcher.js';

export class JobDispatcherFactory {
  private static instance: IJobDispatcher;

  static getDispatcher(): IJobDispatcher {
    if (!this.instance) {
      if (process.env.CLOUD_TASKS_QUEUE && process.env.WORKER_ENDPOINT) {
        this.instance = new CloudTaskJobDispatcher();
      } else {
        this.instance = new LocalJobDispatcher();
      }
    }
    return this.instance;
  }

  static setDispatcher(dispatcher: IJobDispatcher) {
    this.instance = dispatcher;
  }
}
