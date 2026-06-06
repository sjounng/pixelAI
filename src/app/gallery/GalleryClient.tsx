"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import WishlistStar from "@/components/WishlistStar";
import type { Artwork } from "@/lib/artworks";

interface Props {
  initial: Artwork[];
  initialWishlist?: Record<string, string | null>;
}

export default function GalleryClient({ initial, initialWishlist = {} }: Props) {
  const [items, setItems] = useState<Artwork[]>(initial);
  const [wishlistMap, setWishlistMap] = useState<Record<string, string | null>>(initialWishlist);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial.length > 0);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetch(`/api/history?public=true&page=${next}`, {
        cache: "no-store"
      });
      const data = await res.json();
      const newItems: Artwork[] = data.items ?? [];
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setWishlistMap((prev) => ({ ...prev, ...(data.wishlistMap ?? {}) }));
        setPage(next);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loading]);

  if (items.length === 0) {
    return (
      <div className="card text-center text-sm text-gray-600">
        아직 공개된 작품이 없습니다. 첫 작품의 주인공이 되어보세요!
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((a) => (
          <article key={a.id} className="card">
            <div className="relative">
              <Link href={`/gallery/${a.id}`} className="block">
                <PixelPreview pixels={a.pixel_data} size={a.size} />
              </Link>
              <div className="absolute right-1 top-1">
                <WishlistStar
                  artworkId={a.id}
                  initialFolderId={
                    a.id in wishlistMap ? wishlistMap[a.id] : undefined
                  }
                />
              </div>
            </div>
            <Link href={`/gallery/${a.id}`} className="block">
              <p className="mt-2 line-clamp-2 text-xs text-gray-700">{a.prompt}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{a.size}×{a.size}</p>
            </Link>
          </article>
        ))}
      </div>
      <div ref={sentinelRef} className="h-12 text-center text-xs text-gray-500">
        {loading ? "불러오는 중…" : hasMore ? "스크롤해서 더 보기" : "마지막 페이지입니다."}
      </div>
    </>
  );
}
