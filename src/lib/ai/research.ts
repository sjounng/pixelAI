import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: env.anthropicApiKey() });
  return _client;
}

const RESEARCH_SYSTEM = `You are a visual reference researcher for a pixel artist.
Given a subject, search the web only if needed to pin down what it actually looks like,
then write a SHORT visual brief (max ~120 words, plain text, no markdown):
- Distinct parts and their arrangement.
- Overall silhouette shape.
- Characteristic colors (give rough hex when you can).
- A couple of notable identifying details.
Describe appearance only. Do not mention sources, searching, or pixel art.
If the subject is generic/imaginary and needs no lookup, answer from your own knowledge.`;

/**
 * 생성 전 대상의 시각적 특징을 웹으로 조사해 짧은 브리프를 반환.
 * 비활성/오류/빈 결과 시 null을 반환해 기존 생성 흐름이 그대로 동작하도록 함.
 *
 * 동적 필터링: web_search_20260209 + code_execution을 함께 제공하면 Claude가
 * 검색 결과를 컨텍스트에 넣기 전 코드로 선필터링한다(정확도↑, 토큰↓).
 * web_search_20260209와 함께 쓰는 code execution은 무료(토큰 비용만 발생).
 * 둘 다 서버 툴 — SDK 0.32.1에 타입이 없어 캐스트로 전달.
 */
export async function researchSubject(prompt: string): Promise<string | null> {
  if (!env.webSearchEnabled()) return null;

  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: env.webSearchMaxUses() },
    { type: "code_execution_20250825", name: "code_execution" }
  ] as unknown as Anthropic.Tool[];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Subject: "${prompt}"\n\nWrite the visual brief.` }
  ];

  // 실제 웹 검색/코드 실행이 몇 번 일어났는지 누적 집계 (턴마다 합산).
  let searches = 0;
  let codeRuns = 0;
  const t0 = Date.now();

  try {
    // 서버 툴 루프: pause_turn이면 누적 응답을 다시 넣어 이어서 호출.
    // 검색+코드실행이 섞이면 턴이 늘어날 수 있어 여유 있게 반복.
    for (let i = 0; i < 6; i++) {
      const resp = await client().messages.create({
        model: env.anthropicModel(),
        max_tokens: 4096,
        system: RESEARCH_SYSTEM,
        messages,
        tools
      });

      const stu = (resp.usage as unknown as {
        server_tool_use?: { web_search_requests?: number; code_execution_requests?: number };
      }).server_tool_use;
      searches += stu?.web_search_requests ?? 0;
      codeRuns += stu?.code_execution_requests ?? 0;

      messages.push({
        role: "assistant",
        content: resp.content as unknown as Anthropic.MessageParam["content"]
      });

      if ((resp.stop_reason as string) === "pause_turn") continue;

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      console.log(
        `[research] prompt=${JSON.stringify(prompt)} searches=${searches} ` +
          `codeRuns=${codeRuns} ms=${Date.now() - t0} brief=${text ? text.length + "chars" : "none"}`
      );
      return text || null;
    }
    console.log(
      `[research] prompt=${JSON.stringify(prompt)} searches=${searches} ` +
        `codeRuns=${codeRuns} ms=${Date.now() - t0} brief=loop_exhausted`
    );
  } catch (e) {
    // 조사 실패는 치명적이지 않음 — 조용히 폴백하되 원인은 로그로 남김.
    console.warn(
      `[research] failed prompt=${JSON.stringify(prompt)} searches=${searches} ` +
        `codeRuns=${codeRuns} ms=${Date.now() - t0} err=${(e as Error).message}`
    );
    return null;
  }
  return null;
}
