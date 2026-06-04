import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { parseJsonResponse, parseDataUrl, Pixels } from "./index";
import { claudeUserPrompt } from "./prompts/claude";
import { getSystemPrompt } from "./prompts/resolver";

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: env.anthropicApiKey() });
  return _client;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function generateWithClaude(
  prompt: string,
  size: 16 | 32,
  referenceImage?: string,
  userId?: string | null
): Promise<Pixels> {
  const text = claudeUserPrompt(prompt, size, Boolean(referenceImage));
  const content = referenceImage
    ? (() => {
        const { mediaType, base64 } = parseDataUrl(referenceImage);
        return [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType as ImageMediaType,
              data: base64
            }
          },
          { type: "text" as const, text }
        ];
      })()
    : [{ type: "text" as const, text }];

  const system = await getSystemPrompt("claude", userId);
  const resp = await client().messages.create({
    model: env.anthropicModel(),
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content }]
  });

  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return parseJsonResponse(block.text, size);
}
