import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ThinkingLevel } from '@google/genai';
import { applyCors, verifyAuth, getAI, handleError } from '../server/apiUtils';
import { ValidationService } from '../server/services/ValidationService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, message, enableThinking } = req.body || {};
    if (!pdfBase64 || !message) {
      return res.status(400).json({ error: 'Both pdfBase64 and message are required.' });
    }

    const cleanPdfBase64 = ValidationService.validateStrictBase64(pdfBase64);
    ValidationService.validateTextPrompt(message, 5000);

    const client = getAI();
    const isThinking = !!enableThinking;
    const model = isThinking ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
    const config: any = {};
    if (isThinking) {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
    }

    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanPdfBase64,
              },
            },
            {
              text: message,
            },
          ],
        },
      ],
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    handleError(res, error);
  }
}
