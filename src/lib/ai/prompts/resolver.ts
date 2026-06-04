import { prisma } from "@/lib/db";
import type { Provider } from "@/lib/ai";
import { CLAUDE_SYSTEM_PROMPT } from "./claude";
import { OPENAI_SYSTEM_PROMPT } from "./openai";
import { GEMINI_SYSTEM_PROMPT } from "./gemini";

// 코드에 박혀 있는 기본값. DB에 override row가 없으면 이걸 사용.
export const DEFAULT_PROMPTS: Record<Provider, string> = {
  claude: CLAUDE_SYSTEM_PROMPT,
  openai: OPENAI_SYSTEM_PROMPT,
  gemini: GEMINI_SYSTEM_PROMPT
};

/**
 * provider별 system prompt 반환.
 * DB의 PromptOverride row가 있으면 그것을, 없으면 코드 기본값을 돌려준다.
 * DB 오류 시에는 안전하게 기본값으로 폴백.
 */
export async function getSystemPrompt(provider: Provider): Promise<string> {
  try {
    const row = await prisma.promptOverride.findUnique({
      where: { provider },
      select: { systemPrompt: true }
    });
    if (row?.systemPrompt) return row.systemPrompt;
  } catch {
    // DB 미접속/스키마 미동기화 등은 무시하고 기본값 사용.
  }
  return DEFAULT_PROMPTS[provider];
}
