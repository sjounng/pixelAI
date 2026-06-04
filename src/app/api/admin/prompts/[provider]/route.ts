import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/env";
import { isProvider } from "@/lib/ai";

export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 32_000;

interface Ctx {
  params: Promise<{ provider: string }>;
}

async function authorize(): Promise<string | null> {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session?.user?.email ?? null;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const email = await authorize();
  if (!email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const systemPrompt = typeof body.system_prompt === "string" ? body.system_prompt : "";
  if (!systemPrompt.trim()) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }
  if (systemPrompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: "prompt_too_long" }, { status: 413 });
  }

  const row = await prisma.promptOverride.upsert({
    where: { provider },
    update: { systemPrompt, updatedBy: email },
    create: { provider, systemPrompt, updatedBy: email }
  });
  return NextResponse.json({
    provider: row.provider,
    updated_at: row.updatedAt.toISOString(),
    updated_by: row.updatedBy
  });
}

// 오버라이드 제거 → 코드 기본값으로 롤백
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const email = await authorize();
  if (!email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }
  await prisma.promptOverride.deleteMany({ where: { provider } });
  return NextResponse.json({ ok: true });
}
