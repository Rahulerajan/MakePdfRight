import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { UploadService } from '../../server/services/UploadService';
import { WatermarkService } from '../../server/services/WatermarkService';
import { StorageService } from '../../server/services/StorageService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempPath: string | null = null;
  try {
    const { pdfBase64, text, fontSize, opacity, color, rotation } = req.body || {};
    if (!pdfBase64 || !text) {
      return res.status(400).json({ error: 'pdfBase64 and text are required' });
    }

    ValidationService.validateStrictBase64(pdfBase64);
    ValidationService.validateWatermarkText(text);

    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'watermark.pdf');
    const watermarkedBuffer = await WatermarkService.addWatermark(tempPath, {
      text,
      fontSize: fontSize ? Number(fontSize) : undefined,
      opacity: opacity !== undefined ? Number(opacity) : undefined,
      color,
      rotation: rotation !== undefined ? Number(rotation) : undefined
    });

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${watermarkedBuffer.toString('base64')}`
    });
  } catch (err: any) {
    handleError(res, err);
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}
