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
