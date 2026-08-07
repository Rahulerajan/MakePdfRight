import { GoogleGenAI } from "@google/genai";
import { LoggingService } from './LoggingService.js';
import { AppError } from './ErrorHandler.js';

export class OCRService {
  static async performOCR(imageBase64: string, aiClient: GoogleGenAI): Promise<any> {
    LoggingService.info("Starting AI-powered OCR via Gemini...");
    if (!imageBase64) {
      throw new AppError("Page snapshot data is required for OCR.", 400);
    }
    
    // Clean potential base64 prefixes
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/png",
            data: cleanBase64,
          },
        },
        {
          text: `Analyze this page image. Please perform optical character recognition (OCR) to detect blocks of text.
          Output a JSON array of objects, where each object has:
          {
            "text": "The exact detected text",
            "x": x_coordinate_percentage (0 to 100),
            "y": y_coordinate_percentage (0 to 100),
            "fontSize": estimated_font_size_px (10 to 24),
            "fontFamily": "Helvetica"
          }
          Return ONLY raw JSON, with no markdown code blocks or formatting.`
        }
      ]
    });

    let text = response.text || "[]";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(text);
    } catch (err) {
      LoggingService.warn("Failed parsing JSON output, attempting regex recovery.", text);
      const match = text.match(/\[\s*\{.*\}\s*\]/s);
      if (match) {
        return JSON.parse(match[0]);
      }
      return [];
    }
  }
}
