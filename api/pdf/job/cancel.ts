import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getOwnerId, handleError } from '../../../server/apiUtils';
import { JobService } from '../../../server/services/JobService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const jobId = (req.query.jobId as string) || (req.query.id as string);
    if (!jobId) {
      return res.status(400).json({ error: 'jobId parameter is required.' });
    }

    const ownerId = getOwnerId(req);
    const success = JobService.cancelJob(jobId, ownerId);
    if (!success) {
      return res.status(400).json({ error: 'Job could not be cancelled (either not found or already completed).' });
    }

    res.status(200).json({ success: true, message: 'Cancellation request sent.' });
  } catch (err: any) {
    handleError(res, err);
  }
}
