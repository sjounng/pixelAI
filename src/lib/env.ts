function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),

  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),
  anthropicModel: () => optional("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),

  // 생성 전 웹 조사(web search) 사용 여부. 기본 비활성.
  webSearchEnabled: () => /^(1|true|yes|on)$/i.test(process.env.ANTHROPIC_WEB_SEARCH ?? ""),
  webSearchMaxUses: () => {
    const n = parseInt(process.env.ANTHROPIC_WEB_SEARCH_MAX_USES ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
  },
  // 검색을 강제할지 여부. 켜면 첫 호출에서 web_search를 tool_choice로 강제 + 프롬프트 명시.
  webSearchForce: () => /^(1|true|yes|on)$/i.test(process.env.ANTHROPIC_WEB_SEARCH_FORCE ?? ""),

  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),

  appUrl: () => optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
};

export function isProviderConfigured(_provider: "claude"): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

function emailInEnvList(envName: string, email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env[envName];
  if (!raw) return false;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** UNLIMITED_TOKEN_EMAILS에 포함된 계정만 토큰 차감 없이 생성 가능. */
export function isUnlimitedTokensFor(email: string | null | undefined): boolean {
  return emailInEnvList("UNLIMITED_TOKEN_EMAILS", email);
}

/** ADMIN_EMAILS에 포함된 계정만 /admin/* 접근 가능. 비어 있으면 admin 기능 비활성. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return emailInEnvList("ADMIN_EMAILS", email);
}
