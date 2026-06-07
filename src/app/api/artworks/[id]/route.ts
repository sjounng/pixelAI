import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function decodePixels(raw: string): string[][] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [row, wish] = await Promise.all([
    prisma.artwork.findUnique({ where: { id } }),
    prisma.wishlist.findUnique({
      where: { userId_artworkId: { userId, artworkId: id } },
      select: { folderId: true }
    })
  ]);
  if (!row || row.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    prompt: row.prompt,
    size: row.size,
    provider: row.provider,
    pixel_data: decodePixels(row.pixelData),
    is_public: row.isPublic,
    token_cost: row.tokenCost,
    edited_by_human: (row as { editedByHuman?: boolean }).editedByHuman ?? false,
    status: row.status,
    failure_reason: row.failureReason,
    created_at: row.createdAt.toISOString(),
    wishlist: wish ? { folder_id: wish.folderId } : null
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: { isPublic?: boolean } = {};
  if (typeof body.is_public === "boolean") update.isPublic = body.is_public;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const result = await prisma.artwork.updateMany({
    where: { id, userId },
    data: update
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const fresh = await prisma.artwork.findUnique({
    where: { id },
    select: { id: true, isPublic: true }
  });
  return NextResponse.json({ id: fresh?.id, is_public: fresh?.isPublic });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.artwork.deleteMany({
    where: { id, userId }
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
