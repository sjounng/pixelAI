import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeFromWishlist } from "@/lib/wishlist";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await removeFromWishlist(userId, id);
  return NextResponse.json({ ok: true });
}
