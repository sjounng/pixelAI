import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPackage, stripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pkg = getPackage(String(body.packageId ?? ""));
  if (!pkg) {
    return NextResponse.json({ error: "invalid_package" }, { status: 400 });
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: session.user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "krw",
          unit_amount: pkg.priceKrw,
          product_data: {
            name: `PixelAI · ${pkg.label} (${pkg.tokens} 토큰)`
          }
        }
      }
    ],
    metadata: {
      user_id: userId,
      package_id: pkg.id,
      tokens: String(pkg.tokens)
    },
    success_url: `${env.appUrl()}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl()}/shop?status=cancel`
  });

  return NextResponse.json({ url: checkout.url });
}
