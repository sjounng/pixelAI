import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { parseJsonResponse, Pixels } from "./index";
import { convertUserPrompt } from "./prompts/convert";
import { getSystemPrompt } from "./prompts/resolver";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: env.anthropicApiKey() });
  return _client;
}

/** 1차 알고리즘 그리드를 받아 변환 전용 프롬프트로 다듬은 최종 픽셀을 반환. */
export async function convertWithClaude(
  basePixels: Pixels,
  size: 16 | 32,
  userId?: string | null
): Promise<Pixels> {
  const text = convertUserPrompt(size, basePixels);
  const system = await getSystemPrompt("convert", userId);
  const resp = await client().messages.create({
    model: env.anthropicModel(),
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: text }]
  });
  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return parseJsonResponse(block.text, size);
}
