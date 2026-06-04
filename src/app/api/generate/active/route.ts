import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Window in which a recent artwork is still considered the user's "active"
// generation. Slightly longer than the reaper's 90s so the client can observe
// the final state (completed or failed) before the row drops out of scope.
const ACTIVE_WINDOW_MS = 150_000;

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

  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const [row, user] = await Promise.all([
    prisma.artwork.findFirst({
      where: { userId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true }
    })
  ]);

  if (!row) {
    return NextResponse.json({ active: null, token_balance: user?.tokenBalance ?? null });
  }

  return NextResponse.json({
    active: {
      id: row.id,
      prompt: row.prompt,
      size: row.size,
      provider: row.provider,
      status: row.status,
      pixels: row.status === "completed" ? decodePixels(row.pixelData) : null,
      failureReason: row.failureReason,
      token_cost: row.tokenCost,
      created_at: row.createdAt.toISOString()
    },
    token_balance: user?.tokenBalance ?? null
  });
}
