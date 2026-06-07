import { prisma } from "@/lib/db";
import type { Artwork } from "@/lib/artworks";

function decodePixels(raw: string): string[][] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

interface DbArtwork {
  id: string;
  userId: string;
  prompt: string;
  size: number;
  provider: string;
  pixelData: string;
  isPublic: boolean;
  tokenCost: number;
  editedByHuman?: boolean;
  createdAt: Date;
}

function toApi(a: DbArtwork): Artwork {
  return {
    id: a.id,
    userId: a.userId,
    prompt: a.prompt,
    size: a.size,
    provider: a.provider,
    pixel_data: decodePixels(a.pixelData),
    is_public: a.isPublic,
    token_cost: a.tokenCost,
    edited_by_human: a.editedByHuman ?? false,
    created_at: a.createdAt.toISOString()
  };
}

export interface WishlistItem extends Artwork {
  folder_id: string | null;
}

export interface WishlistFolder {
  id: string;
  name: string;
  created_at: string;
  count?: number;
}

export async function addToWishlist(
  userId: string,
  artworkId: string,
  folderId: string | null = null
): Promise<void> {
  // 이미 있으면 폴더만 갱신 (사용자가 다른 폴더로 이동하는 효과).
  await prisma.wishlist.upsert({
    where: { userId_artworkId: { userId, artworkId } },
    create: { userId, artworkId, folderId },
    update: { folderId }
  });
}

export async function removeFromWishlist(userId: string, artworkId: string): Promise<void> {
  await prisma.wishlist.deleteMany({ where: { userId, artworkId } });
}

export async function listWishlist(
  userId: string,
  folderId?: string | null | "all"
): Promise<WishlistItem[]> {
  const where: { userId: string; folderId?: string | null } = { userId };
  if (folderId === null) where.folderId = null;
  else if (typeof folderId === "string" && folderId !== "all") where.folderId = folderId;

  const rows = await prisma.wishlist.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { artwork: true }
  });
  return rows.map((r) => ({ ...toApi(r.artwork), folder_id: r.folderId }));
}

export async function getWishlistedIds(
  userId: string,
  artworkIds: string[]
): Promise<Map<string, string | null>> {
  if (artworkIds.length === 0) return new Map();
  const rows = await prisma.wishlist.findMany({
    where: { userId, artworkId: { in: artworkIds } },
    select: { artworkId: true, folderId: true }
  });
  return new Map(rows.map((r) => [r.artworkId, r.folderId]));
}

export async function listFolders(userId: string): Promise<WishlistFolder[]> {
  const [folders, counts] = await Promise.all([
    prisma.wishlistFolder.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    }),
    prisma.wishlist.groupBy({
      by: ["folderId"],
      where: { userId },
      _count: { _all: true }
    })
  ]);
  const countByFolder = new Map<string | null, number>();
  for (const c of counts) {
    countByFolder.set(c.folderId, c._count._all);
  }
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    created_at: f.createdAt.toISOString(),
    count: countByFolder.get(f.id) ?? 0
  }));
}

export async function createFolder(userId: string, name: string): Promise<WishlistFolder> {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) throw new Error("name_required");
  const f = await prisma.wishlistFolder.create({
    data: { userId, name: trimmed }
  });
  return { id: f.id, name: f.name, created_at: f.createdAt.toISOString(), count: 0 };
}

export async function renameFolder(
  userId: string,
  folderId: string,
  name: string
): Promise<void> {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) throw new Error("name_required");
  await prisma.wishlistFolder.updateMany({
    where: { id: folderId, userId },
    data: { name: trimmed }
  });
}

export async function deleteFolder(userId: string, folderId: string): Promise<void> {
  // Cascade Wishlist.folderId → null (SetNull in schema)
  await prisma.wishlistFolder.deleteMany({ where: { id: folderId, userId } });
}
