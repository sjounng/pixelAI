"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import WishlistStar from "@/components/WishlistStar";
import { ArtworkGridSkeleton } from "@/components/Skeleton";
import { IconEdit, IconSearch, IconClose } from "@/components/icons";
import type { Artwork } from "@/types/api";

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
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 현재 로드된 검색어. SSR 초기 데이터는 q="" 이므로 빈 문자열로 시작.
  const loadedQueryRef = useRef(initial.length > 0 ? "" : null);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const qs = new URLSearchParams({ public: "true", page: String(next) });
      if (debouncedQuery.trim()) qs.set("q", debouncedQuery.trim());
      const res = await fetch(`/api/history?${qs.toString()}`, { cache: "no-store" });
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

  // 검색어 디바운스.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 검색어가 바뀌면 1페이지부터 다시 로드(초기 SSR 데이터는 재요청하지 않음).
  useEffect(() => {
    if (debouncedQuery === loadedQueryRef.current) return;
    let cancelled = false;
    setSearching(true);
    (async () => {
      const qs = new URLSearchParams({ public: "true", page: "1" });
      if (debouncedQuery.trim()) qs.set("q", debouncedQuery.trim());
      const res = await fetch(`/api/history?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      const newItems: Artwork[] = data.items ?? [];
      setItems(newItems);
      setWishlistMap(data.wishlistMap ?? {});
      setPage(1);
      setHasMore(newItems.length > 0);
      loadedQueryRef.current = debouncedQuery;
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loading, debouncedQuery]);

  const searchBox = (
    <div className="relative w-full max-w-xs">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <IconSearch />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목으로 검색"
        className="input w-full text-sm"
        style={{ paddingLeft: "2rem", paddingRight: query ? "2rem" : undefined }}
        aria-label="제목으로 검색"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          aria-label="검색 지우기"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink"
        >
          <IconClose />
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-4 flex justify-end">{searchBox}</div>

      {searching ? (
        <ArtworkGridSkeleton />
      ) : items.length === 0 ? (
        <div className="card text-center text-sm text-gray-600">
          {debouncedQuery
            ? "검색 결과가 없습니다."
            : "아직 공개된 작품이 없습니다. 첫 작품의 주인공이 되어보세요!"}
        </div>
      ) : (
        <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((a) => (
          <article key={a.id} className="card">
            <div className="group relative">
              <Link href={`/gallery/${a.id}`} className="block">
                <PixelPreview pixels={a.pixel_data} size={a.size} />
              </Link>
              <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                <span>{a.size}×{a.size}</span>
                {a.edited_by_human && (
                  <span className="inline-flex items-center gap-0.5 rounded-sm border border-ink bg-amber-200 px-1 font-bold text-ink">
                    <IconEdit /> 사람 수정
                  </span>
                )}
              </p>
            </Link>
          </article>
        ))}
      </div>
          <div ref={sentinelRef} className="flex min-h-28 items-end justify-center pt-12">
            <span className="rounded-sm border border-ink/20 bg-paper/80 px-3 py-1 text-xs text-gray-500 shadow-sm">
              {loading ? "불러오는 중…" : hasMore ? "스크롤해서 더 보기" : "마지막 페이지입니다."}
            </span>
          </div>
        </>
      )}
    </>
  );
}
