import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { UploadService } from '../../server/services/UploadService';
import { SplitService } from '../../server/services/SplitService';
import { StorageService } from '../../server/services/StorageService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempPath: string | null = null;
  try {
    const { pdfBase64, pageIndices } = req.body || {};
    if (!pdfBase64) {
      return res.status(400).json({ error: 'pdfBase64 is required' });
    }

    ValidationService.validateStrictBase64(pdfBase64);
    ValidationService.validateSplitPayload(pageIndices);

    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'split.pdf');
    const splitBuffer = await SplitService.splitPDF(tempPath, pageIndices);

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${splitBuffer.toString('base64')}`
    });
  } catch (err: any) {
    handleError(res, err);
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}
