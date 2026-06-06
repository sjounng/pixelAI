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
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [row, wish] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id },
      include: { user: { select: { name: true } } }
    }),
    userId
      ? prisma.wishlist.findUnique({
          where: { userId_artworkId: { userId, artworkId: id } },
          select: { folderId: true }
        })
      : Promise.resolve(null)
  ]);

  if (!row || !row.isPublic || row.status !== "completed") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    prompt: row.prompt,
    size: row.size,
    provider: row.provider,
    pixel_data: decodePixels(row.pixelData),
    token_cost: row.tokenCost,
    created_at: row.createdAt.toISOString(),
    author_name: row.user?.name ?? null,
    wishlist: wish ? { folder_id: wish.folderId } : null
  });
}
