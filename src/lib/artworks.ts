import { prisma } from "@/lib/db";

export interface Artwork {
  id: string;
  userId: string;
  prompt: string;
  size: number;
  provider: string;
  pixel_data: string[][];
  is_public: boolean;
  token_cost: number;
  created_at: string;
}

interface ListParams {
  page?: number;
  pageSize?: number;
}

interface ListResult {
  items: Artwork[];
  total: number;
  page: number;
}

interface CursorParams {
  cursor?: string | null;
  limit?: number;
}

interface CursorResult {
  items: Artwork[];
  nextCursor: string | null;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_CURSOR_LIMIT = 20;

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
    created_at: a.createdAt.toISOString()
  };
}

// Only completed rows are user-visible. Pending = in flight; failed = refunded.
const COMPLETED = { status: "completed" } as const;

export async function getPublicArtworks(
  { page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListParams = {}
): Promise<ListResult> {
  const skip = (page - 1) * pageSize;
  const where = { isPublic: true, ...COMPLETED };
  const [rows, total] = await Promise.all([
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.artwork.count({ where })
  ]);
  return { items: rows.map(toApi), total, page };
}

export async function getUserArtworks(
  userId: string,
  { page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListParams = {}
): Promise<ListResult> {
  const skip = (page - 1) * pageSize;
  const where = { userId, ...COMPLETED };
  const [rows, total] = await Promise.all([
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.artwork.count({ where })
  ]);
  return { items: rows.map(toApi), total, page };
}

export async function getUserArtworksCursor(
  userId: string,
  { cursor, limit = DEFAULT_CURSOR_LIMIT }: CursorParams = {}
): Promise<CursorResult> {
  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.artwork.findMany({
    where: { userId, ...COMPLETED },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items: items.map(toApi),
    nextCursor: hasMore ? items[items.length - 1].id : null
  };
}

export async function getPublicArtworksCursor(
  { cursor, limit = DEFAULT_CURSOR_LIMIT }: CursorParams = {}
): Promise<CursorResult> {
  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.artwork.findMany({
    where: { isPublic: true, ...COMPLETED },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items: items.map(toApi),
    nextCursor: hasMore ? items[items.length - 1].id : null
  };
}
