"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PixelPreview from "@/components/PixelPreview";
import WishlistStar from "@/components/WishlistStar";
import type { Artwork } from "@/lib/artworks";

const EDIT_STORAGE_KEY = "pixelai:edit-source";

interface TokenTx {
  id: string;
  amount: number;
  type: string;
  created_at: string;
}

const PAGE_LIMIT = 20;

export default function MyPageClient() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<TokenTx[]>([]);
  const [items, setItems] = useState<Artwork[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Record<string, string | null>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // StrictMode 등으로 IntersectionObserver가 중복 발화해도 한 번만 로드되도록.
  const inFlightRef = useRef(false);

  const fetchPage = useCallback(
    async (
      after: string | null
    ): Promise<{
      items: Artwork[];
      nextCursor: string | null;
      wishlistMap: Record<string, string | null>;
    } | null> => {
      const qs = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (after) qs.set("cursor", after);
      const res = await fetch(`/api/history?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return res.json();
    },
    []
  );

  const loadFirst = useCallback(async () => {
    const [tokenRes, historyData] = await Promise.all([
      fetch("/api/token", { cache: "no-store" }),
      fetchPage(null)
    ]);
    if (tokenRes.ok) {
      const d = await tokenRes.json();
      setBalance(d.balance);
      setTxs(d.transactions ?? []);
    }
    if (historyData) {
      setItems(historyData.items ?? []);
      setWishlistMap(historyData.wishlistMap ?? {});
      setCursor(historyData.nextCursor ?? null);
      setHasMore(Boolean(historyData.nextCursor));
    }
    setLoading(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !hasMore || !cursor) return;
    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursor);
      if (!data) return;
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setWishlistMap((prev) => ({ ...prev, ...(data.wishlistMap ?? {}) }));
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } finally {
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, [cursor, hasMore, fetchPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  const togglePublic = async (a: Artwork) => {
    const res = await fetch(`/api/artworks/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: !a.is_public })
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, is_public: !a.is_public } : x))
      );
    }
  };

  const remove = async (a: Artwork) => {
    if (!confirm("이 작품을 삭제할까요?")) return;
    const res = await fetch(`/api/artworks/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== a.id));
    }
  };

  const editInGenerator = (a: Artwork) => {
    sessionStorage.setItem(
      EDIT_STORAGE_KEY,
      JSON.stringify({
        prompt: a.prompt,
        size: a.size,
        pixels: a.pixel_data
      })
    );
    router.push("/generate");
  };

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-8">
      <header className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="text-xs uppercase text-gray-500">현재 토큰 잔액</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">
            ◆ {balance ?? "—"}
          </p>
          <a href="/shop" className="btn-accent mt-3 inline-flex">충전하기</a>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-gray-500">최근 활동</p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
            {txs.length === 0 && (
              <li className="text-gray-400">아직 활동이 없습니다.</li>
            )}
            {txs.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{labelType(t.type)}</span>
                <span className={t.amount > 0 ? "text-emerald-600" : ""}>
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-2xl font-bold">내 작품</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">아직 생성한 작품이 없습니다.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {items.map((a) => (
                <article key={a.id} className="card">
                  <div className="relative">
                    <Link
                      href={`/mypage/${a.id}`}
                      className="block cursor-pointer transition-opacity hover:opacity-80"
                      aria-label="작품 상세 보기"
                    >
                      <PixelPreview pixels={a.pixel_data} size={a.size} />
                    </Link>
                    <div className="absolute right-1 top-1">
                      <WishlistStar
                        artworkId={a.id}
                        initialFolderId={a.id in wishlistMap ? wishlistMap[a.id] : undefined}
                      />
                    </div>
                  </div>
                  <Link href={`/mypage/${a.id}`} className="mt-2 block">
                    <p className="line-clamp-2 text-xs text-gray-700 hover:underline">
                      {a.prompt}
                    </p>
                  </Link>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className={a.is_public ? "text-emerald-600" : "text-gray-400"}>
                      {a.is_public ? "공개" : "비공개"}
                    </span>
                    <span className="text-gray-400">{a.size}×{a.size}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button onClick={() => togglePublic(a)} className="btn flex-1 text-xs">
                      {a.is_public ? "비공개" : "공개"}
                    </button>
                    <button onClick={() => editInGenerator(a)} className="btn text-xs">
                      수정
                    </button>
                    <button onClick={() => remove(a)} className="btn text-xs">삭제</button>
                  </div>
                </article>
              ))}
            </div>
            <div ref={sentinelRef} className="h-12 text-center text-xs text-gray-500">
              {loadingMore
                ? "불러오는 중…"
                : hasMore
                ? "스크롤해서 더 보기"
                : "마지막 페이지입니다."}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function labelType(t: string): string {
  switch (t) {
    case "generate": return "생성";
    case "charge": return "충전";
    case "bonus": return "보너스";
    case "refund": return "환불";
    default: return t;
  }
}
