import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError, getOwnerId } from '../server/apiUtils.js';
import { dispatchAiAction } from '../server/dispatchers/aiDispatcher.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  try {
    getOwnerId(req, res);
    await dispatchAiAction(req, res);
  } catch (err: any) {
    handleError(res, err);
  }
}
