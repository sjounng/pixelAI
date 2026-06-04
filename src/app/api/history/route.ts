import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getPublicArtworks,
  getUserArtworks,
  getPublicArtworksCursor,
  getUserArtworksCursor
} from "@/lib/artworks";
import { getWishlistedIds } from "@/lib/wishlist";
import { reapStalePendingArtworks } from "@/lib/reaper";
import { isUnlimitedTokensFor } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const isPublic = url.searchParams.get("public") === "true";
  const cursorParam = url.searchParams.get("cursor");
  const useCursor = url.searchParams.has("cursor") || url.searchParams.has("limit");
  const limit = Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const attachWishlist = async (items: { id: string }[]) => {
    if (!userId) return {} as Record<string, string | null>;
    const map = await getWishlistedIds(userId, items.map((i) => i.id));
    const out: Record<string, string | null> = {};
    map.forEach((folderId, artworkId) => {
      out[artworkId] = folderId;
    });
    return out;
  };

  if (isPublic) {
    const result = useCursor
      ? await getPublicArtworksCursor({ cursor: cursorParam, limit })
      : await getPublicArtworks({ page });
    const wishlistMap = await attachWishlist(result.items);
    return NextResponse.json({ ...result, wishlistMap });
  }

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Refund any artworks that started but never completed (timeout/crash).
  const unlimited = isUnlimitedTokensFor(session?.user?.email);
  await reapStalePendingArtworks(userId, unlimited).catch(() => {});

  const result = useCursor
    ? await getUserArtworksCursor(userId, { cursor: cursorParam, limit })
    : await getUserArtworks(userId, { page });
  const wishlistMap = await attachWishlist(result.items);
  return NextResponse.json({ ...result, wishlistMap });
}
