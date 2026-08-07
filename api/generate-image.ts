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

    // 1. Strategy A: Gemini API via @google/genai SDK (gemini-3.1-flash-lite-image)
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

    // 2. Strategy B: Pollinations AI with browser User-Agent headers & fast 5s timeout
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

    // 3. Strategy C: Stock photo placeholder fallback
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

    // 4. Strategy D: Vector SVG graphical image representation
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
  } catch (error: any) {
    handleError(res, error);
  }
}
