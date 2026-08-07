import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Modality } from '@google/genai';
import { applyCors, verifyAuth, getAI, handleError } from '../server/apiUtils';
import { ValidationService } from '../server/services/ValidationService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'text is required.' });
    }

    ValidationService.validateTextPrompt(text, 1000);
    const client = getAI();
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.status(200).json({ audioBase64 });
  } catch (error: any) {
    handleError(res, error);
  }
}
