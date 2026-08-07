import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getOwnerId, handleError } from '../../../server/apiUtils';
import { JobService } from '../../../server/services/JobService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const jobId = (req.query.jobId as string) || (req.query.id as string);
    if (!jobId) {
      return res.status(400).json({ error: 'jobId query parameter is required.' });
    }

    const ownerId = getOwnerId(req);
    const job = JobService.getJob(jobId, ownerId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied.' });
    }

    res.status(200).json({
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error
    });
  } catch (err: any) {
    handleError(res, err);
  }
}
