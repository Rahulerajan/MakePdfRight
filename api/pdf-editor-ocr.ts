import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, getAI, handleError } from '../server/apiUtils';
import { ValidationService } from '../server/services/ValidationService';
import { LoggingService } from '../server/services/LoggingService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 page snapshot is required for OCR.' });
    }

    ValidationService.validateImageUpload(imageBase64, 'image/png');
    const cleanImageBase64 = ValidationService.validateStrictBase64(imageBase64);

    const client = getAI();
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: cleanImageBase64,
          },
        },
        {
          text: `Analyze this document page image. Please perform optical character recognition (OCR) to detect any blocks of text.
          For each key line or block of text, output a JSON array of objects.
          Each object MUST have the following schema:
          {
            "text": "The exact detected text",
            "x": x_coordinate_percentage (0 to 100 representing left offset ratio of the page),
            "y": y_coordinate_percentage (0 to 100 representing top offset ratio of the page),
            "fontSize": standard_font_size_in_px_estimated (between 10 and 24),
            "fontFamily": "Helvetica"
          }
          Return ONLY the valid raw JSON array of blocks. Do not add any markdown, backticks, or text outside the JSON block. Example output format:
          [{"text": "Sample Heading", "x": 10, "y": 15, "fontSize": 20, "fontFamily": "Helvetica"}]`
        }
      ]
    });

    let rawText = response.text || '[]';
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let blocks = [];
    try {
      blocks = JSON.parse(rawText);
    } catch (parseError) {
      LoggingService.warn('[OCR Parse Warning] Direct JSON parse failed, trying to find array pattern.', rawText);
      const match = rawText.match(/\[\s*\{.*\}\s*\]/s);
      if (match) {
        blocks = JSON.parse(match[0]);
      }
    }

    res.status(200).json({ blocks });
  } catch (error: any) {
    handleError(res, error);
  }
}
