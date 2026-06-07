import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { reapStalePendingArtworks, } from "@/lib/reaper";
import { isUnlimitedTokensFor } from "@/lib/env";

export const runtime = "nodejs";

// 대기열에 보여줄 최근 작업 범위. 최근 60분 내 작업만 큐로 간주.
const QUEUE_WINDOW_MS = 60 * 60_000;
const QUEUE_LIMIT = 30;

function decodePixels(raw: string): string[][] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 타임아웃/크래시로 멈춘 pending 행을 먼저 정리(실패 처리 + 환불).
  const unlimited = isUnlimitedTokensFor(session?.user?.email);
  await reapStalePendingArtworks(userId, unlimited).catch(() => {});

  const cutoff = new Date(Date.now() - QUEUE_WINDOW_MS);
  const [rows, user] = await Promise.all([
    prisma.artwork.findMany({
      where: { userId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: QUEUE_LIMIT
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true }
    })
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    size: r.size,
    provider: r.provider,
    status: r.status as "pending" | "completed" | "failed",
    pixels: r.status === "completed" ? decodePixels(r.pixelData) : null,
    failureReason: r.failureReason,
    token_cost: r.tokenCost,
    is_public: r.isPublic,
    created_at: r.createdAt.toISOString()
  }));

  return NextResponse.json({ items, token_balance: user?.tokenBalance ?? null });
}
