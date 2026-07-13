import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const chatWithPDF = async (pdfBase64: string, message: string) => {
  const genAI = new GoogleGenAI({ apiKey: apiKey! });
  
  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64
            }
          },
          {
            text: message
          }
        ]
      }
    ]
  });
  
  return response.text;
};

export const analyzeImage = async (imageBase64: string, mimeType: string, prompt: string) => {
  const genAI = new GoogleGenAI({ apiKey: apiKey! });
  
  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    ]
  });
  
  return response.text;
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1") => {
  const genAI = new GoogleGenAI({ apiKey: apiKey! });
  
  const response = await genAI.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
      }
    }
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
};

export const transcribeAudio = async (audioBase64: string, mimeType: string) => {
  const genAI = new GoogleGenAI({ apiKey: apiKey! });
  
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: "Please transcribe this audio accurately."
          }
        ]
      }
    ]
  });
  
  return response.text;
};

export const generateSpeech = async (text: string) => {
  const genAI = new GoogleGenAI({ apiKey: apiKey! });
  
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
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
  
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const complexQuery = async (prompt: string) => {
  const genAI = new GoogleGenAI({ apiKey: apiKey! });
  
  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH
      }
    }
  });
  
  return response.text;
};
