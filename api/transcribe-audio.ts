import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { applyCors, verifyAuth, getAI, handleError } from '../server/apiUtils';
import { ValidationService } from '../server/services/ValidationService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioBase64, mimeType, language } = req.body || {};
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: 'audioBase64 and mimeType are required.' });
    }

    ValidationService.validateAudioUpload(audioBase64, mimeType);
    const cleanAudioBase64 = ValidationService.validateStrictBase64(audioBase64);

    const client = getAI();
    const languageText = language && language !== 'auto'
      ? `The spoken language is ${language}.`
      : 'Automatically detect the spoken language.';

    const promptText = `Please transcribe the provided audio accurately.
    - ${languageText}
    - Capture the spoken words verbatim.
    - Maintain proper punctuation, capitalization, sentence boundaries, and paragraphing where logical.
    - Ignore long silent periods or ambient background noise.
    - Handle different speaking speeds and pronunciations.
    - If the audio is silent or contains no clear speech, return empty text and a low confidence score (e.g. 0).`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanAudioBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: 'The verbatim transcript of the audio with correct punctuation, capitalization, and paragraphing.'
            },
            confidence: {
              type: Type.INTEGER,
              description: 'The estimated confidence of the transcription, as an integer between 0 and 100.'
            },
            detectedLanguage: {
              type: Type.STRING,
              description: 'The name of the language detected (e.g., English, Hindi, French, German, Spanish).'
            }
          },
          required: ['text', 'confidence']
        }
      }
    });

    const jsonText = response.text || '{}';
    const result = JSON.parse(jsonText.trim());
    res.status(200).json(result);
  } catch (error: any) {
    handleError(res, error);
  }
}
