import { prisma } from "@/lib/db";

// AI calls are capped by route.ts `maxDuration = 60`. Anything still pending
// 90s after creation is dead — function timed out or the server crashed before
// the completion update landed.
const STALE_MS = 90_000;

/**
 * Mark abandoned pending artworks as failed and refund their token cost.
 * Safe to call repeatedly; uses a transaction per row so partial failure
 * doesn't leave the system inconsistent.
 *
 * `unlimited` should reflect whether the caller is on the unlimited-tokens
 * whitelist — when true, no refund row is written.
 *
 * Returns the number of rows reaped (for observability/testing).
 */
export async function reapStalePendingArtworks(
  userId: string,
  unlimited: boolean
): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await prisma.artwork.findMany({
    where: { userId, status: "pending", createdAt: { lt: cutoff } },
    select: { id: true, tokenCost: true }
  });
  if (stale.length === 0) return 0;

  let reaped = 0;
  for (const row of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-check status inside the tx so two concurrent reapers can't double-refund.
        const claim = await tx.artwork.updateMany({
          where: { id: row.id, status: "pending" },
          data: { status: "failed", failureReason: "timeout_or_crash" }
        });
        if (claim.count === 0) return;
        if (!unlimited && row.tokenCost > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { tokenBalance: { increment: row.tokenCost } }
          });
          await tx.tokenTransaction.create({
            data: {
              userId,
              amount: row.tokenCost,
              type: "refund",
              referenceId: row.id
            }
          });
        }
        reaped++;
      });
    } catch {
      // Best-effort: leave for next pass rather than crashing the request path.
    }
  }
  return reaped;
}
