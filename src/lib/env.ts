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

  openaiApiKey: () => required("OPENAI_API_KEY"),
  openaiModel: () => optional("OPENAI_MODEL", "gpt-4o-2024-08-06"),

  googleApiKey: () => required("GOOGLE_AI_API_KEY"),
  googleModel: () => optional("GOOGLE_AI_MODEL", "gemini-3.5-flash"),

  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),

  appUrl: () => optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
};

export function isProviderConfigured(provider: "claude" | "openai" | "gemini"): boolean {
  switch (provider) {
    case "claude": return Boolean(process.env.ANTHROPIC_API_KEY);
    case "openai": return Boolean(process.env.OPENAI_API_KEY);
    case "gemini": return Boolean(process.env.GOOGLE_AI_API_KEY);
  }
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
