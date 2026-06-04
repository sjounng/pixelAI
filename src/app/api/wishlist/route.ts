import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listWishlist, addToWishlist } from "@/lib/wishlist";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const folderRaw = url.searchParams.get("folder");
  // "all" | null(uncategorized) | <id>
  const folder =
    folderRaw === null || folderRaw === "all"
      ? "all"
      : folderRaw === ""
      ? null
      : folderRaw;
  const items = await listWishlist(userId, folder);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const artworkId = typeof body.artworkId === "string" ? body.artworkId : "";
  const folderId =
    typeof body.folderId === "string" && body.folderId
      ? body.folderId
      : null;
  if (!artworkId) {
    return NextResponse.json({ error: "artworkId_required" }, { status: 400 });
  }
  await addToWishlist(userId, artworkId, folderId);
  return NextResponse.json({ ok: true, folderId });
}
