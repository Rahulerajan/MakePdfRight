/**
 * Gemini Client Service
 * Bridges the client browser to the secure Express server API endpoints.
 */

export const chatWithPDF = async (pdfBase64: string, message: string): Promise<string> => {
  console.log("[Client Service] Sending chatWithPDF request to server...");
  const response = await fetch("/api/chat-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64, message }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to process PDF request. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const analyzeImage = async (imageBase64: string, mimeType: string, prompt: string): Promise<string> => {
  console.log("[Client Service] Sending analyzeImage request to server...");
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType, prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze image. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  console.log("[Client Service] Generating image via Pollinations AI:", { prompt, aspectRatio });
  
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required for image generation.");
  }

  // Determine width & height based on aspect ratio
  let width = 1024;
  let height = 1024;
  
  switch (aspectRatio) {
    case "1:1":
      width = 1024;
      height = 1024;
      break;
    case "4:3":
      width = 1024;
      height = 768;
      break;
    case "16:9":
      width = 1024;
      height = 576;
      break;
    case "3:4":
      width = 768;
      height = 1024;
      break;
    case "9:16":
      width = 576;
      height = 1024;
      break;
    default:
      width = 1024;
      height = 1024;
  }

  // Pollinations AI supports parameters like width, height, nologo, and seed
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`;

  console.log("[Client Service] Fetching image from Pollinations AI:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Pollinations AI returned status ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Convert Blob to Base64 to seamlessly work with the existing UI/download functions
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image blob to data URL."));
        }
      };
      reader.onerror = () => reject(new Error("File reader error while reading image blob."));
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error("[Client Service] Pollinations AI image fetch failed:", error);
    throw new Error(error.message || "Failed to fetch image from Pollinations AI. Please check your network or try a different prompt.");
  }
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
  const response = await fetch("/api/transcribe-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const response = await fetch("/api/generate-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const response = await fetch("/api/complex-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to perform complex query. Server returned status ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};
