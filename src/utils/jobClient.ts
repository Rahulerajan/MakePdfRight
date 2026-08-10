export interface JobResultOutput {
  objectKey: string;
  filename: string;
  size: number;
  downloadUrl: string;
}

export interface JobStatusResponse {
  id: string;
  ownerId: string;
  operation: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
  progress: number;
  result?: any;
  errorCode?: string;
  safeErrorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface JobClientOptions {
  type: string;
  payload: any;
  idempotencyKey?: string;
  pollIntervalMs?: number;
  maxTimeoutMs?: number;
  onProgress?: (progress: number, status: string) => void;
  signal?: AbortSignal;
  sessionStorageKey?: string; // Key to persist jobId across page reloads
}

export class JobClient {
  /**
   * Submits a processing job and polls until completion, failure, or cancellation.
   */
  static async executeJob(options: JobClientOptions): Promise<JobStatusResponse> {
    const {
      type,
      payload,
      idempotencyKey,
      pollIntervalMs = 1500,
      maxTimeoutMs = 5 * 60 * 1000,
      onProgress,
      signal,
      sessionStorageKey
    } = options;

    let jobId: string | null = null;

    // Check if there is an active job ID in sessionStorage to restore
    if (sessionStorageKey) {
      try {
        const saved = sessionStorage.getItem(sessionStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.jobId && Date.now() - parsed.createdAt < 30 * 60 * 1000) {
            jobId = parsed.jobId;
          }
        }
      } catch {}
    }

    // If no existing job restored, create a new job via HTTP API
    if (!jobId) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idempotencyKey) {
        headers['idempotency-key'] = idempotencyKey;
      }

      const createRes = await fetch('/api/pdf-tools?action=job-create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, payload, idempotencyKey }),
        signal
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `Failed to create processing job (${createRes.status})`);
      }

      const createData = await createRes.json();
      if (!createData.success || !createData.job?.id) {
        throw new Error('Invalid job creation response returned by server.');
      }

      jobId = createData.job.id;

      if (sessionStorageKey) {
        try {
          sessionStorage.setItem(sessionStorageKey, JSON.stringify({ jobId, createdAt: Date.now() }));
        } catch {}
      }
    }

    // Poll status until terminal state
    const startTime = Date.now();
    let networkConsecutiveErrors = 0;

    while (true) {
      if (signal?.aborted) {
        if (jobId) {
          this.cancelJob(jobId).catch(() => {});
        }
        throw new Error('Job execution aborted by client.');
      }

      if (Date.now() - startTime > maxTimeoutMs) {
        throw new Error('Job processing timed out on client wait limit.');
      }

      try {
        const statusRes = await fetch(`/api/pdf-tools?action=job-status&id=${encodeURIComponent(jobId)}`, {
          signal
        });

        if (!statusRes.ok) {
          networkConsecutiveErrors++;
          if (networkConsecutiveErrors > 5) {
            throw new Error(`Failed to query job status (${statusRes.status})`);
          }
        } else {
          networkConsecutiveErrors = 0;
          const statusData = await statusRes.json();
          const job: JobStatusResponse = statusData.job;

          if (!job) {
            throw new Error('Job status response missing job payload.');
          }

          if (onProgress) {
            onProgress(job.progress || 0, job.status);
          }

          if (job.status === 'completed') {
            if (sessionStorageKey) {
              try { sessionStorage.removeItem(sessionStorageKey); } catch {}
            }
            return job;
          }

          if (job.status === 'failed') {
            if (sessionStorageKey) {
              try { sessionStorage.removeItem(sessionStorageKey); } catch {}
            }
            throw new Error(job.safeErrorMessage || 'PDF processing job failed on server.');
          }

          if (job.status === 'cancelled') {
            if (sessionStorageKey) {
              try { sessionStorage.removeItem(sessionStorageKey); } catch {}
            }
            throw new Error('Processing job was cancelled.');
          }

          if (job.status === 'expired') {
            if (sessionStorageKey) {
              try { sessionStorage.removeItem(sessionStorageKey); } catch {}
            }
            throw new Error('Processing job has expired.');
          }
        }
      } catch (pollErr: any) {
        if (pollErr.name === 'AbortError') throw pollErr;
        networkConsecutiveErrors++;
        if (networkConsecutiveErrors > 5) throw pollErr;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Cancels a running job on the server.
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/pdf-tools?action=job-cancel&id=${encodeURIComponent(jobId)}`, {
        method: 'POST'
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
