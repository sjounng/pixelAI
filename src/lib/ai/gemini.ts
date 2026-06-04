import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { parseJsonResponse, parseDataUrl, Pixels } from "./index";
import { geminiUserPrompt } from "./prompts/gemini";
import { getSystemPrompt } from "./prompts/resolver";

let _client: GoogleGenAI | null = null;

function client(): GoogleGenAI {
  if (_client) return _client;
  _client = new GoogleGenAI({ apiKey: env.googleApiKey() });
  return _client;
}

export async function generateWithGemini(
  prompt: string,
  size: 16 | 32,
  referenceImage?: string
): Promise<Pixels> {
  const text = geminiUserPrompt(prompt, size, Boolean(referenceImage));
  const contents = referenceImage
    ? (() => {
        const { mediaType, base64 } = parseDataUrl(referenceImage);
        return [
          { inlineData: { mimeType: mediaType, data: base64 } },
          { text }
        ];
      })()
    : text;

  const system = await getSystemPrompt("gemini");
  const resp = await client().models.generateContent({
    model: env.googleModel(),
    contents,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: 16000
    }
  });

  const out = resp.text;
  if (!out) {
    throw new Error("Gemini returned no text content");
  }
  return parseJsonResponse(out, size);
}
