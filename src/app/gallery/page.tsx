import GalleryClient from "./GalleryClient";
import { getPublicArtworks } from "@/lib/artworks";
import { getWishlistedIds } from "@/lib/wishlist";
import { auth } from "@/auth";

export const metadata = { title: "갤러리 · PixelAI" };
export const revalidate = 30;

export default async function GalleryPage() {
  const initial = await getPublicArtworks({ page: 1 }).catch(() => ({
    items: [],
    total: 0,
    page: 1
  }));
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const wishlistMap: Record<string, string | null> = {};
  if (userId) {
    const m = await getWishlistedIds(userId, initial.items.map((i) => i.id));
    m.forEach((folderId, artworkId) => {
      wishlistMap[artworkId] = folderId;
    });
  }
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-extrabold">갤러리</h1>
        <p className="mt-1 text-sm text-gray-600">
          유저들이 공개한 픽셀 아트 · 총 {initial.total}개
        </p>
      </header>
      <GalleryClient initial={initial.items} initialWishlist={wishlistMap} />
    </div>
  );
}
