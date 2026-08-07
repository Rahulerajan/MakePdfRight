import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { UploadService } from '../../server/services/UploadService';
import { CompressionService } from '../../server/services/CompressionService';
import { StorageService } from '../../server/services/StorageService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempPath: string | null = null;
  try {
    const { pdfBase64, level, customValue } = req.body || {};
    if (!pdfBase64) {
      return res.status(400).json({ error: 'pdfBase64 is required' });
    }

    ValidationService.validateStrictBase64(pdfBase64);
    const compressionLevel = level || 'recommended';
    const customVal = customValue !== undefined ? Number(customValue) : 50;

    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'document.pdf');
    const result = await CompressionService.compressPDF(tempPath, compressionLevel, customVal);
    const base64 = result.pdfBuffer.toString('base64');

    res.status(200).json({
      success: true,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      spaceSaved: result.spaceSaved,
      percentage: result.percentage,
      processingTime: result.processingTime,
      pages: result.pages,
      imagesOptimized: result.imagesOptimized,
      fontsOptimized: result.fontsOptimized,
      metadataRemoved: result.metadataRemoved,
      optimizationSummary: result.optimizationSummary,
      pdfBase64: `data:application/pdf;base64,${base64}`
    });
  } catch (err: any) {
    handleError(res, err);
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}
