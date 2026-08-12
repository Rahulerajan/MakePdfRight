export interface JobDispatchOptions {
  jobId: string;
  ownerId: string;
  operation: string;
  payload?: any;
}

export interface IJobDispatcher {
  dispatch(options: JobDispatchOptions): Promise<boolean>;
}
