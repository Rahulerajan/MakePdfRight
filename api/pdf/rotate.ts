import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { UploadService } from '../../server/services/UploadService';
import { RotateService } from '../../server/services/RotateService';
import { StorageService } from '../../server/services/StorageService';
import { AppError } from '../../server/services/ErrorHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempPath: string | null = null;
  try {
    const { pdfBase64, rotations } = req.body || {};
    if (!pdfBase64 || !rotations || !Array.isArray(rotations)) {
      return res.status(400).json({ error: 'pdfBase64 and rotations array are required' });
    }

    if (rotations.length > 2000) {
      throw new AppError('Rotations array length exceeds 2000 items limit.', 400);
    }

    ValidationService.validateStrictBase64(pdfBase64);
    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'rotate.pdf');
    const rotatedBuffer = await RotateService.rotatePDF(tempPath, rotations);

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${rotatedBuffer.toString('base64')}`
    });
  } catch (err: any) {
    handleError(res, err);
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}
