/**
 * Gemini Client Service
 * Bridges the client browser to the secure Express server API endpoints.
 */

export const chatWithPDF = async (pdfBase64: string, message: string, enableThinking: boolean = false): Promise<string> => {
  console.log("[Client Service] Sending chatWithPDF request to server...", { enableThinking });
  const response = await fetch("/api/ai-tools?action=chat-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ pdfBase64, message, enableThinking }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to process PDF request. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const analyzeImage = async (imageBase64: string, mimeType: string, prompt: string, enableThinking: boolean = false): Promise<string> => {
  console.log("[Client Service] Sending analyzeImage request to server...", { enableThinking });
  const response = await fetch("/api/ai-tools?action=analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ imageBase64, mimeType, prompt, enableThinking }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze image. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  console.log("[Client Service] Sending generateImage request to server...", { prompt, aspectRatio });
  
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required for image generation.");
  }

  const response = await fetch("/api/ai-tools?action=generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ prompt, aspectRatio }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate image. Server returned status ${response.status}`);
  }

  const data = await response.json();
  if (!data.imageBase64) {
    throw new Error("No image was generated. Please try a different prompt.");
  }

  return data.imageBase64;
};

export interface TranscriptionResult {
  text: string;
  confidence: number;
  detectedLanguage?: string;
}

export const transcribeAudio = async (
  audioBase64: string, 
  mimeType: string, 
  language: string = "auto"
): Promise<TranscriptionResult> => {
  console.log("[Client Service] Sending transcribeAudio request to server...");
  const response = await fetch("/api/ai-tools?action=transcribe-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ audioBase64, mimeType, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to transcribe audio. Server returned status ${response.status}`);
  }

  return await response.json();
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  console.log("[Client Service] Sending generateSpeech request to server...");
  const response = await fetch("/api/ai-tools?action=generate-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate speech. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.audioBase64;
};

export const complexQuery = async (prompt: string): Promise<string> => {
  console.log("[Client Service] Sending complexQuery request to server...");
  const response = await fetch("/api/ai-tools?action=complex-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to perform complex query. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};
