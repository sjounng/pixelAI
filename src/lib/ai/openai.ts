import OpenAI from "openai";
import { env } from "@/lib/env";
import { parseJsonResponse, Pixels } from "./index";
import { openaiUserPrompt } from "./prompts/openai";
import { getSystemPrompt } from "./prompts/resolver";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: env.openaiApiKey() });
  return _client;
}

export async function generateWithOpenAI(
  prompt: string,
  size: 16 | 32,
  referenceImage?: string,
  userId?: string | null,
  basePixels?: string[][]
): Promise<Pixels> {
  const text = openaiUserPrompt(prompt, size, Boolean(referenceImage), basePixels);
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = referenceImage
    ? [
        { type: "image_url", image_url: { url: referenceImage } },
        { type: "text", text }
      ]
    : [{ type: "text", text }];

  const system = await getSystemPrompt("openai", userId);
  const resp = await client().chat.completions.create({
    model: env.openaiModel(),
    max_completion_tokens: 16000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user",   content: userContent }
    ]
  });

  const out = resp.choices[0]?.message?.content;
  if (!out) {
    throw new Error("OpenAI returned no content");
  }
  return parseJsonResponse(out, size);
}
