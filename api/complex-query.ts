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
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required.' });
    }

    ValidationService.validateTextPrompt(prompt, 5000);
    const client = getAI();
    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    handleError(res, error);
  }
}
