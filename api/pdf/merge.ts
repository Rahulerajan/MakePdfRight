import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { UploadService } from '../../server/services/UploadService';
import { MergeService } from '../../server/services/MergeService';
import { StorageService } from '../../server/services/StorageService';
import { AppError } from '../../server/services/ErrorHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tempPaths: string[] = [];
  try {
    const { files } = req.body || {};
    ValidationService.validateMergeFilesPayload(files);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !file.data) {
        throw new AppError(`File item at index ${i} is missing base64 data.`, 400);
      }
      ValidationService.validateStrictBase64(file.data);
      const path = await UploadService.handleBase64Upload(file.data, file.name || `doc_${i}.pdf`);
      tempPaths.push(path);
    }

    const mergedBuffer = await MergeService.mergePDFs(tempPaths);
    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${mergedBuffer.toString('base64')}`
    });
  } catch (err: any) {
    handleError(res, err);
  } finally {
    tempPaths.forEach(p => StorageService.deleteTempFile(p));
  }
}
