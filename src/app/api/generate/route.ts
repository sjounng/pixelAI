import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBalance } from "@/lib/users";
import { prisma } from "@/lib/db";
import { generatePixelArt, isProvider, Provider } from "@/lib/ai";
import { isProviderConfigured, isUnlimitedTokensFor, isAdminEmail } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN_COST: Record<16 | 32, number> = { 16: 10, 32: 25 };

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { prompt?: string; size?: number; provider?: string; referenceImage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  const size = body.size === 32 ? 32 : 16;
  const provider: Provider = isProvider(body.provider) ? body.provider : "claude";
  const referenceImage = body.referenceImage?.trim() || undefined;

  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }
  const promptLimit = isAdminEmail(session?.user?.email) ? 1000 : 200;
  if (prompt.length > promptLimit) {
    return NextResponse.json({ error: "prompt_too_long", limit: promptLimit }, { status: 400 });
  }
  if (referenceImage) {
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(referenceImage)) {
      return NextResponse.json({ error: "invalid_image_format" }, { status: 400 });
    }
    if (referenceImage.length > 7_000_000) {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json(
      { error: "provider_not_configured", provider },
      { status: 400 }
    );
  }

  const cost = TOKEN_COST[size as 16 | 32];
  const unlimited = isUnlimitedTokensFor(session?.user?.email);

  // STEP 1 — Atomically: spend tokens AND create a pending artwork outbox row.
  // If the function dies during the AI call (timeout, crash, client disconnect),
  // the pending row remains and the reaper will refund the user later.
  let artworkId: string;
  let newBalance: number | null = null;
  try {
    const txResult = await prisma.$transaction(async (tx) => {
      if (!unlimited) {
        const spent = await tx.user.updateMany({
          where: { id: userId, tokenBalance: { gte: cost } },
          data: { tokenBalance: { decrement: cost } }
        });
        if (spent.count === 0) {
          throw new Error("insufficient_tokens");
        }
        const u = await tx.user.findUnique({
          where: { id: userId },
          select: { tokenBalance: true }
        });
        newBalance = u?.tokenBalance ?? null;
      }
      const art = await tx.artwork.create({
        data: {
          userId,
          prompt,
          size,
          provider,
          pixelData: "[]",
          status: "pending",
          tokenCost: cost,
          isPublic: false
        },
        select: { id: true }
      });
      if (!unlimited) {
        await tx.tokenTransaction.create({
          data: {
            userId,
            amount: -cost,
            type: "generate",
            referenceId: art.id
          }
        });
      }
      return art.id;
    });
    artworkId = txResult;
  } catch (e) {
    if ((e as Error).message === "insufficient_tokens") {
      const balance = await getBalance(userId).catch(() => 0);
      return NextResponse.json(
        { error: "insufficient_tokens", balance, cost },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "spend_failed", detail: (e as Error).message },
      { status: 500 }
    );
  }

  // STEP 2 — Call the AI. On any failure here, refund + mark the row failed
  // in a single transaction. If the runtime kills us mid-call, the pending
  // row survives and the reaper handles it on the user's next history fetch.
  let pixels: string[][];
  try {
    pixels = await generatePixelArt(provider, prompt, size as 16 | 32, referenceImage, userId);
  } catch (e) {
    const reason = (e as Error).message;
    await prisma.$transaction(async (tx) => {
      await tx.artwork.update({
        where: { id: artworkId },
        data: { status: "failed", failureReason: reason.slice(0, 500) }
      });
      if (!unlimited) {
        await tx.user.update({
          where: { id: userId },
          data: { tokenBalance: { increment: cost } }
        });
        await tx.tokenTransaction.create({
          data: { userId, amount: cost, type: "refund", referenceId: artworkId }
        });
      }
    }).catch(() => { /* best-effort; reaper will catch leftovers */ });
    return NextResponse.json(
      { error: "generation_failed", detail: reason },
      { status: 502 }
    );
  }

  // STEP 3 — Persist the result and flip status to completed.
  await prisma.artwork.update({
    where: { id: artworkId },
    data: { pixelData: JSON.stringify(pixels), status: "completed" }
  });

  return NextResponse.json({
    id: artworkId,
    pixels,
    size,
    provider,
    token_used: unlimited ? 0 : cost,
    token_balance: newBalance,
    unlimited
  });
}
