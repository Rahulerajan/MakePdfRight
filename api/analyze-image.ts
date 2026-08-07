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
    const { imageBase64, mimeType, prompt, enableThinking } = req.body || {};
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: 'imageBase64, mimeType, and prompt are required.' });
    }

    ValidationService.validateImageUpload(imageBase64, mimeType);
    const cleanImageBase64 = ValidationService.validateStrictBase64(imageBase64);
    ValidationService.validateTextPrompt(prompt, 5000);

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
                mimeType,
                data: cleanImageBase64,
              },
            },
            {
              text: prompt,
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
