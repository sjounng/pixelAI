import { generateWithClaude } from "./claude";
import { generateWithOpenAI } from "./openai";
import { generateWithGemini } from "./gemini";

export type Provider = "claude" | "openai" | "gemini";
export type Pixels = string[][];

export const PROVIDERS: { id: Provider; label: string; emoji: string }[] = [
  { id: "claude", label: "Claude", emoji: "🟠" },
  { id: "openai", label: "GPT",    emoji: "🟢" },
  { id: "gemini", label: "Gemini", emoji: "🔵" }
];

export function isProvider(v: unknown): v is Provider {
  return v === "claude" || v === "openai" || v === "gemini";
}

export async function generatePixelArt(
  provider: Provider,
  prompt: string,
  size: 16 | 32,
  referenceImage?: string,
  userId?: string | null
): Promise<Pixels> {
  switch (provider) {
    case "claude": return generateWithClaude(prompt, size, referenceImage, userId);
    case "openai": return generateWithOpenAI(prompt, size, referenceImage, userId);
    case "gemini": return generateWithGemini(prompt, size, referenceImage, userId);
  }
}

export function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid data URL");
  return { mediaType: m[1], base64: m[2] };
}

export function stripFences(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  return t;
}

const HEX_FULL = /^#[0-9a-f]{6}$/i;
const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_ALPHA = /^#[0-9a-f]{8}$/i;

function normalizeCell(cell: unknown): string {
  if (typeof cell !== "string") return "transparent";
  const v = cell.trim().toLowerCase();
  if (!v || v === "transparent" || v === "none" || v === "null") return "transparent";
  if (HEX_FULL.test(v)) return v;
  const m = v.match(HEX_SHORT);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  if (HEX_ALPHA.test(v)) return v.slice(0, 7);
  return "transparent";
}

/**
 * 관대한 검증: 행/열 부족 시 transparent 패딩, 초과 시 잘라냄.
 * AI 출력이 살짝 어긋나도 렌더링이 깨지지 않도록 함.
 */
export function validatePixels(raw: unknown, size: number): Pixels {
  const empty = (): string[] => Array(size).fill("transparent");
  if (!Array.isArray(raw)) {
    return Array.from({ length: size }, empty);
  }
  const out: Pixels = [];
  for (let y = 0; y < size; y++) {
    const row = raw[y];
    if (!Array.isArray(row)) {
      out.push(empty());
      continue;
    }
    const norm: string[] = [];
    for (let x = 0; x < size; x++) {
      norm.push(normalizeCell(row[x]));
    }
    out.push(norm);
  }
  return out;
}

/**
 * 응답 텍스트에서 가장 바깥쪽 JSON 객체를 추출. 모델이 앞뒤로 설명을
 * 붙이거나 끝이 잘려도 닫는 괄호를 보정해 복구를 시도.
 */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) return text;
  const end = text.lastIndexOf("}");
  if (end > start) return text.slice(start, end + 1);
  let open = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === "\"") { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") open++;
    else if (ch === "}" || ch === "]") open--;
  }
  let patched = text.slice(start).replace(/,\s*$/, "");
  while (open-- > 0) patched += "}";
  return patched;
}

export function parseJsonResponse(raw: string, size: number): Pixels {
  const cleaned = stripFences(raw);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = JSON.parse(extractJsonObject(cleaned));
    } catch {
      parsed = null;
    }
  }
  const pixels =
    parsed && typeof parsed === "object"
      ? (parsed as { pixels?: unknown }).pixels
      : null;
  return validatePixels(pixels, size);
}