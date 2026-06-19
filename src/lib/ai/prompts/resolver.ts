import { prisma } from "@/lib/db";
import type { Provider } from "@/lib/ai";
import { CLAUDE_SYSTEM_PROMPT } from "./claude";
import { CONVERT_SYSTEM_PROMPT } from "./convert";

// 프롬프트 오버라이드 키 = 생성(claude) + 변환기("convert").
export type PromptKey = Provider | "convert";

export const PROMPT_KEYS: PromptKey[] = ["claude", "convert"];

export function isPromptKey(v: unknown): v is PromptKey {
  return v === "claude" || v === "convert";
}

// 코드에 박혀 있는 기본값. DB에 override row가 없으면 이걸 사용.
export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
  claude: CLAUDE_SYSTEM_PROMPT,
  convert: CONVERT_SYSTEM_PROMPT
};

/**
 * 호출자(admin)의 본인 PromptOverride row가 있으면 그걸 사용, 없으면 코드 기본값.
 * userId가 없으면 (게스트, 또는 호출처에서 누락) 바로 기본값.
 * DB 오류 시에는 안전하게 기본값으로 폴백.
 */
export async function getSystemPrompt(
  provider: PromptKey,
  userId: string | null | undefined
): Promise<string> {
  if (!userId) return DEFAULT_PROMPTS[provider];
  try {
    const row = await prisma.promptOverride.findUnique({
      where: { provider_userId: { provider, userId } },
      select: { systemPrompt: true }
    });
    if (row?.systemPrompt) return row.systemPrompt;
  } catch {
    // DB 미접속/스키마 미동기화 등은 무시하고 기본값 사용.
  }
  return DEFAULT_PROMPTS[provider];
}
