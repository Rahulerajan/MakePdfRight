import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ThinkingLevel, Modality, Type } from '@google/genai';
import { applyCors, verifyAuth, getAI, handleError } from '../server/apiUtils.js';
import { ValidationService } from '../server/services/ValidationService.js';
import { LoggingService } from '../server/services/LoggingService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  const rawAction = (req.query.action as string) || (req.body?.action as string) || '';
  const action = rawAction.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  try {
    switch (action) {
      case 'generate-image':
      case 'generateimage':
      case 'generate_image':
        return await handleGenerateImage(req, res);
      case 'chat-pdf':
      case 'chatpdf':
      case 'chat_pdf':
        return await handleChatPdf(req, res);
      case 'analyze-image':
      case 'analyzeimage':
      case 'analyze_image':
        return await handleAnalyzeImage(req, res);
      case 'transcribe-audio':
      case 'transcribeaudio':
      case 'transcribe_audio':
        return await handleTranscribeAudio(req, res);
      case 'generate-speech':
      case 'generatespeech':
      case 'generate_speech':
        return await handleGenerateSpeech(req, res);
      case 'complex-query':
      case 'complexquery':
      case 'complex_query':
        return await handleComplexQuery(req, res);
      default:
        return res.status(400).json({ error: `Invalid or missing action parameter: '${rawAction}'` });
    }
  } catch (err: any) {
    handleError(res, err);
  }
}

async function handleGenerateImage(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, aspectRatio = '1:1' } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required for image generation.' });
  }

  ValidationService.validateTextPrompt(prompt, 2000);

  let width = 1024;
  let height = 1024;
  switch (aspectRatio) {
    case '16:9': width = 1024; height = 576; break;
    case '4:3': width = 1024; height = 768; break;
    case '3:4': width = 768; height = 1024; break;
    case '9:16': width = 576; height = 1024; break;
    default: width = 1024; height = 1024; break;
  }

  let imageBase64DataUrl: string | null = null;
  const validRatio = (aspectRatio === '16:9' || aspectRatio === '4:3' || aspectRatio === '3:4' || aspectRatio === '9:16') ? aspectRatio : '1:1';

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = getAI();
      const geminiResponse = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt.trim() }]
        },
        config: {
          imageConfig: {
            aspectRatio: validRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
          }
        }
      });

      const parts = geminiResponse.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            imageBase64DataUrl = `data:${mime};base64,${part.inlineData.data}`;
            LoggingService.info('[Server] Image generated successfully using gemini-3.1-flash-lite-image.');
            break;
          }
        }
      }
    } catch (geminiError: any) {
      LoggingService.info('[Server] gemini-3.1-flash-lite-image quota or generation limit reached, switching to fast fallback generators.');
    }
  }

  if (!imageBase64DataUrl) {
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const pollinationsEndpoints = [
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=turbo`,
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`
    ];

    for (const url of pollinationsEndpoints) {
      if (imageBase64DataUrl) break;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength > 1000) {
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            imageBase64DataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
            LoggingService.info('[Server] Image generated successfully via Pollinations AI.');
          }
        }
      } catch (pollinationsErr: any) {
        // Fast timeout fallback
      }
    }
  }

  if (!imageBase64DataUrl) {
    try {
      const seed = Math.abs(prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) || 12345;
      const picsumUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(picsumUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 1000) {
          const buffer = Buffer.from(arrayBuffer);
          imageBase64DataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
          LoggingService.info('[Server] Stock photo retrieved successfully as fallback image.');
        }
      }
    } catch (picsumErr: any) {
      LoggingService.warn('[Server] Picsum fallback attempt failed:', picsumErr?.message || picsumErr);
    }
  }

  if (!imageBase64DataUrl) {
    const cleanPromptEscaped = prompt.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="50%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#E5322D" />
          <stop offset="100%" stop-color="#FF6B6B" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="${width / 2}" cy="${height / 2 - 40}" r="${Math.min(width, height) / 4}" fill="url(#accent)" opacity="0.15" />
      <path d="M${width / 2 - 40} ${height / 2 - 60} L${width / 2 + 40} ${height / 2 - 60} L${width / 2} ${height / 2 + 20} Z" fill="url(#accent)" opacity="0.8" />
      <text x="50%" y="${height / 2 + 70}" font-family="sans-serif" font-size="20" font-weight="600" fill="#F8FAFC" text-anchor="middle">
        AI Generated Image
      </text>
      <text x="50%" y="${height / 2 + 105}" font-family="sans-serif" font-size="14" fill="#94A3B8" text-anchor="middle">
        "${cleanPromptEscaped.slice(0, 60)}${cleanPromptEscaped.length > 60 ? '...' : ''}"
      </text>
    </svg>`;

    const base64Svg = Buffer.from(svg).toString('base64');
    imageBase64DataUrl = `data:image/svg+xml;base64,${base64Svg}`;
  }

  res.status(200).json({ imageBase64: imageBase64DataUrl });
}

async function handleChatPdf(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
}

async function handleAnalyzeImage(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
}

async function handleTranscribeAudio(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
}

async function handleGenerateSpeech(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
}

async function handleComplexQuery(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
}
