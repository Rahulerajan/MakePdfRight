import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Handle larger payloads for base64 files
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("[Server] Gemini client initialized successfully with API key.");
  } else {
    console.warn("[Server] WARNING: GEMINI_API_KEY environment variable is not defined.");
  }

  // Helper to ensure Gemini is initialized
  const getAI = () => {
    if (!ai) {
      const currentKey = process.env.GEMINI_API_KEY;
      if (!currentKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server. Please check your secrets/environment.");
      }
      ai = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  };

  // --- API Endpoints ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", apiKeyConfigured: !!process.env.GEMINI_API_KEY });
  });

  // 2. Chat with PDF Endpoint
  app.post("/api/chat-pdf", async (req, res) => {
    const { pdfBase64, message } = req.body;
    if (!pdfBase64 || !message) {
      return res.status(400).json({ error: "Both pdfBase64 and message are required." });
    }

    try {
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: message,
              },
            ],
          },
        ],
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[API Error] Chat with PDF failed:", error);
      res.status(500).json({ error: error.message || "Failed to process PDF request." });
    }
  });

  // 3. Analyze Image Endpoint
  app.post("/api/analyze-image", async (req, res) => {
    const { imageBase64, mimeType, prompt } = req.body;
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: "imageBase64, mimeType, and prompt are required." });
    }

    try {
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[API Error] Analyze image failed:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image." });
    }
  });

  // 4. Transcribe Audio Endpoint
  app.post("/api/transcribe-audio", async (req, res) => {
    const { audioBase64, mimeType, language } = req.body;
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: "audioBase64 and mimeType are required." });
    }

    try {
      const client = getAI();
      const languageText = language && language !== "auto"
        ? `The spoken language is ${language}.`
        : "Automatically detect the spoken language.";

      const promptText = `Please transcribe the provided audio accurately.
      - ${languageText}
      - Capture the spoken words verbatim.
      - Maintain proper punctuation, capitalization, sentence boundaries, and paragraphing where logical.
      - Ignore long silent periods or ambient background noise.
      - Handle different speaking speeds and pronunciations.
      - If the audio is silent or contains no clear speech, return empty text and a low confidence score (e.g. 0).`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The verbatim transcript of the audio with correct punctuation, capitalization, and paragraphing."
              },
              confidence: {
                type: Type.INTEGER,
                description: "The estimated confidence of the transcription, as an integer between 0 and 100."
              },
              detectedLanguage: {
                type: Type.STRING,
                description: "The name of the language detected (e.g., English, Hindi, French, German, Spanish)."
              }
            },
            required: ["text", "confidence"]
          }
        }
      });

      const jsonText = response.text || "{}";
      const result = JSON.parse(jsonText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("[API Error] Transcribe audio failed:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio." });
    }
  });

  // 5. Generate Speech (Text-to-Speech) Endpoint
  app.post("/api/generate-speech", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required." });
    }

    try {
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audioBase64 });
    } catch (error: any) {
      console.error("[API Error] Generate speech failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate speech." });
    }
  });

  // 6. Complex Query Endpoint (with thinking mode)
  app.post("/api/complex-query", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required." });
    }

    try {
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[API Error] Complex query failed:", error);
      res.status(500).json({ error: error.message || "Failed to perform complex query." });
    }
  });

  // 7. PDF Editor AI Assistant
  app.post("/api/pdf-editor-ai", async (req, res) => {
    const { promptType, selectedText, customPrompt } = req.body;
    if (!promptType) {
      return res.status(400).json({ error: "promptType is required." });
    }

    try {
      const client = getAI();
      let promptText = "";

      switch (promptType) {
        case "rewrite":
          promptText = `Please rewrite the following text professionally, making it clear, engaging, and well-phrased while preserving the exact semantic meaning. Do not add conversational framing or explanations; return ONLY the rewritten text:\n\n"${selectedText || ""}"`;
          break;
        case "summarize":
          promptText = `Please summarize the following text concisely. Return ONLY the summarized text, with no introductory text:\n\n"${selectedText || ""}"`;
          break;
        case "translate":
          promptText = `Please translate the following text to Spanish/French (or detect and translate Spanish to English) beautifully. Return ONLY the translation, with no extra text:\n\n"${selectedText || ""}"`;
          break;
        case "grammar":
          promptText = `Please fix any spelling or grammar mistakes in the following text. Preserve the original phrasing where possible. Return ONLY the corrected text:\n\n"${selectedText || ""}"`;
          break;
        case "expand":
          promptText = `Please elaborate or expand on this topic professionally, keeping it aligned with the context of a document. Return ONLY the expanded text:\n\n"${selectedText || ""}"`;
          break;
        case "shorten":
          promptText = `Please make this text shorter and more concise. Return ONLY the shortened text:\n\n"${selectedText || ""}"`;
          break;
        case "custom":
          promptText = `Given this context text: "${selectedText || ""}", please perform this specific instruction: "${customPrompt}". Return ONLY the final resulting text with no extra conversational comments:`;
          break;
        default:
          promptText = `Please analyze or assist with this document text:\n\n"${selectedText || ""}"`;
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("[API Error] PDF Editor AI assistance failed:", error);
      res.status(500).json({ error: error.message || "Failed to perform AI assistance." });
    }
  });

  // 8. PDF Editor OCR Vision (Page Text Extraction to Overlays)
  app.post("/api/pdf-editor-ocr", async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 page snapshot is required for OCR." });
    }

    try {
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64,
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

      let rawText = response.text || "[]";
      // Sanitize potential markdown JSON blocks
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let blocks = [];
      try {
        blocks = JSON.parse(rawText);
      } catch (parseError) {
        console.warn("[OCR Parse Warning] Direct JSON parse failed, trying to find array pattern.", rawText);
        const match = rawText.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          blocks = JSON.parse(match[0]);
        }
      }

      res.json({ blocks });
    } catch (error: any) {
      console.error("[API Error] PDF Editor OCR extraction failed:", error);
      res.status(500).json({ error: error.message || "Failed to extract text from page image." });
    }
  });


  // --- Frontend Server ---

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware
    console.log("[Server] Mounting Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets
    console.log("[Server] Running in production. Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start listening
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Express server running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[Server] Bootstrapping failed:", error);
});
