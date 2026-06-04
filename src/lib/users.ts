import { prisma } from "@/lib/db";

export interface AppUser {
  id: string;
  email: string | null;
  tokenBalance: number;
}

export async function getUser(userId: string): Promise<AppUser | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, tokenBalance: true }
  });
  return u;
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true }
  });
  if (!u) throw new Error("user_not_found");
  return u.tokenBalance;
}

/** 잔액 ≥ amount면 차감하고 새 잔액 반환, 부족하면 null */
export async function spendTokens(userId: string, amount: number): Promise<number | null> {
  const res = await prisma.user.updateMany({
    where: { id: userId, tokenBalance: { gte: amount } },
    data: { tokenBalance: { decrement: amount } }
  });
  if (res.count === 0) return null;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true }
  });
  return u?.tokenBalance ?? null;
}

export async function creditTokens(userId: string, amount: number): Promise<number> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: amount } },
    select: { tokenBalance: true }
  });
  return u.tokenBalance;
}
