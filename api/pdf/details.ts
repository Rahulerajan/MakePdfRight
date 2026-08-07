import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { UploadService } from '../../server/services/UploadService';
import { ThumbnailService } from '../../server/services/ThumbnailService';
import { StorageService } from '../../server/services/StorageService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempPath: string | null = null;
  try {
    const { pdfBase64 } = req.body || {};
    if (!pdfBase64) {
      return res.status(400).json({ error: 'pdfBase64 is required' });
    }

    ValidationService.validateStrictBase64(pdfBase64);
    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'details.pdf');
    const details = await ThumbnailService.getDetails(tempPath);

    res.status(200).json({
      success: true,
      ...details
    });
  } catch (err: any) {
    handleError(res, err);
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}
