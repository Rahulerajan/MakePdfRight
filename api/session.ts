import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getOwnerId, handleError } from '../server/apiUtils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  try {
    const ownerId = getOwnerId(req, res);
    res.status(200).json({ success: true, sessionId: ownerId });
  } catch (err: any) {
    handleError(res, err);
  }
}
