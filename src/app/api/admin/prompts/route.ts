import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/env";
import { DEFAULT_PROMPTS } from "@/lib/ai/prompts/resolver";
import type { Provider } from "@/lib/ai";

export const runtime = "nodejs";

const PROVIDERS: Provider[] = ["claude", "openai", "gemini"];

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const overrides = await prisma.promptOverride.findMany({
      where: { userId },
      select: { provider: true, systemPrompt: true, updatedAt: true }
    });
    const overrideMap = new Map(overrides.map((o) => [o.provider, o]));

    const items = PROVIDERS.map((p) => {
      const o = overrideMap.get(p);
      return {
        provider: p,
        default_prompt: DEFAULT_PROMPTS[p],
        override: o
          ? {
              system_prompt: o.systemPrompt,
              updated_at: o.updatedAt.toISOString()
            }
          : null
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[admin/prompts GET] failed:", e);
    return NextResponse.json(
      { error: "db_error", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
