import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { creditTokens } from "@/lib/users";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, env.stripeWebhookSecret());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_signature", detail: (e as Error).message },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const tokens = Number(session.metadata?.tokens ?? 0);

  if (!userId || !tokens || tokens <= 0) {
    return NextResponse.json({ error: "bad_metadata" }, { status: 400 });
  }

  try {
    await prisma.tokenTransaction.create({
      data: {
        userId,
        amount: tokens,
        type: "charge",
        stripeSessionId: session.id
      }
    });
  } catch (e) {
    // Unique 충돌 = 이미 처리된 세션 (멱등)
    if (String((e as Error).message).includes("Unique")) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw e;
  }

  await creditTokens(userId, tokens);
  return NextResponse.json({ received: true });
}
