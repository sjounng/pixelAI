export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

function backendUrl(path: string): URL {
  const base = process.env.BACKEND_API_BASE_URL;
  if (!base) throw new Error("Missing required env var: BACKEND_API_BASE_URL");
  return new URL(path, base);
}

function internalSecret(): string {
  const secret = process.env.AUTH_INTERNAL_SECRET;
  if (!secret) throw new Error("Missing required env var: AUTH_INTERNAL_SECRET");
  return secret;
}

async function requestAuth(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(backendUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-auth": internalSecret()
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
}

export async function authenticateCredentials(email: string, password: string): Promise<AuthUser | null> {
  const response = await requestAuth("/internal/auth/credentials", { email, password });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Backend credentials authentication failed (${response.status})`);
  return response.json() as Promise<AuthUser>;
}

export async function resolveOAuthUser(user: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<AuthUser> {
  const response = await requestAuth("/internal/auth/oauth", user);
  if (!response.ok) throw new Error(`Backend OAuth user resolution failed (${response.status})`);
  return response.json() as Promise<AuthUser>;
}
