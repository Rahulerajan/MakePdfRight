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
    const { promptType, selectedText, customPrompt, enableThinking } = req.body || {};
    if (!promptType) {
      return res.status(400).json({ error: 'promptType is required.' });
    }

    const client = getAI();
    let promptText = '';

    switch (promptType) {
      case 'deep-think':
      case 'reasoning':
        promptText = `Perform a deep, step-by-step logical reasoning analysis of the following document text or instruction: "${customPrompt || selectedText || ''}". Provide detailed, thorough explanations and key conclusions.`;
        break;
      case 'rewrite':
        promptText = `Please rewrite the following text professionally, making it clear, engaging, and well-phrased while preserving the exact semantic meaning. Do not add conversational framing or explanations; return ONLY the rewritten text:\n\n"${selectedText || ''}"`;
        break;
      case 'summarize':
        promptText = `Please summarize the following text concisely. Return ONLY the summarized text, with no introductory text:\n\n"${selectedText || ''}"`;
        break;
      case 'translate':
        promptText = `Please translate the following text to Spanish/French (or detect and translate Spanish to English) beautifully. Return ONLY the translation, with no extra text:\n\n"${selectedText || ''}"`;
        break;
      case 'grammar':
        promptText = `Please fix any spelling or grammar mistakes in the following text. Preserve the original phrasing where possible. Return ONLY the corrected text:\n\n"${selectedText || ''}"`;
        break;
      case 'expand':
        promptText = `Please elaborate or expand on this topic professionally, keeping it aligned with the context of a document. Return ONLY the expanded text:\n\n"${selectedText || ''}"`;
        break;
      case 'shorten':
        promptText = `Please make this text shorter and more concise. Return ONLY the shortened text:\n\n"${selectedText || ''}"`;
        break;
      case 'custom':
        promptText = `Given this context text: "${selectedText || ''}", please perform this specific instruction: "${customPrompt}". Return ONLY the final resulting text with no extra conversational comments:`;
        break;
      default:
        promptText = `Please analyze or assist with this document text:\n\n"${selectedText || ''}"`;
    }

    ValidationService.validateTextPrompt(promptText, 10000);

    const isThinkingRequested = !!enableThinking || promptType === 'deep-think' || promptType === 'reasoning';
    const model = isThinkingRequested ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
    const config: any = {};
    if (isThinkingRequested) {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
    }

    const response = await client.models.generateContent({
      model,
      contents: promptText,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    res.status(200).json({ text: response.text || '' });
  } catch (error: any) {
    handleError(res, error);
  }
}
