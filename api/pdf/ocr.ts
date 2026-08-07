import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, getAI, handleError } from '../../server/apiUtils';
import { ValidationService } from '../../server/services/ValidationService';
import { OCRService } from '../../server/services/OCRService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    ValidationService.validateImageUpload(imageBase64, 'image/png');
    const cleanBase64 = ValidationService.validateStrictBase64(imageBase64);

    const client = getAI();
    const blocks = await OCRService.performOCR(cleanBase64, client);
    res.status(200).json({ success: true, blocks });
  } catch (err: any) {
    handleError(res, err);
  }
}
