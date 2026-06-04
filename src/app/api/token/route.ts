import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBalance } from "@/lib/users";
import { prisma } from "@/lib/db";
import { isUnlimitedTokensFor } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const unlimited = isUnlimitedTokensFor(session?.user?.email);
  const balance = await getBalance(userId);
  const txs = await prisma.tokenTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, amount: true, type: true, createdAt: true }
  });

  return NextResponse.json({
    balance,
    unlimited,
    transactions: txs.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      created_at: t.createdAt.toISOString()
    }))
  });
}
