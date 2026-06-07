"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PixelPreview from "@/components/PixelPreview";
import WishlistStar from "@/components/WishlistStar";
import {
  IconMenu,
  IconPublic,
  IconPrivate,
  IconEdit,
  IconRegenerate,
  IconDelete,
  IconCharge,
  IconSearch,
  IconClose
} from "@/components/icons";
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

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // StrictMode 등으로 IntersectionObserver가 중복 발화해도 한 번만 로드되도록.
  const inFlightRef = useRef(false);

  // 카드 메뉴(햄버거) 외부 클릭 시 닫기.
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-card-menu]")) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  const fetchPage = useCallback(
    async (
      after: string | null,
      q: string
    ): Promise<{
      items: Artwork[];
      nextCursor: string | null;
      wishlistMap: Record<string, string | null>;
    } | null> => {
      const qs = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (after) qs.set("cursor", after);
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/history?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return res.json();
    },
    []
  );

  // 토큰 잔액·활동은 검색과 무관하게 최초 1회만 로드.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/token", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setBalance(d.balance);
        setTxs(d.transactions ?? []);
      }
    })();
  }, []);

  // 검색어 디바운스.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 검색어가 바뀌면 첫 페이지부터 다시 로드.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const data = await fetchPage(null, debouncedQuery);
      if (cancelled) return;
      setItems(data?.items ?? []);
      setWishlistMap(data?.wishlistMap ?? {});
      setCursor(data?.nextCursor ?? null);
      setHasMore(Boolean(data?.nextCursor));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, fetchPage]);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !hasMore || !cursor) return;
    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursor, debouncedQuery);
      if (!data) return;
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setWishlistMap((prev) => ({ ...prev, ...(data.wishlistMap ?? {}) }));
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } finally {
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, [cursor, hasMore, fetchPage, debouncedQuery]);

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

  const regenerate = (a: Artwork) => {
    sessionStorage.setItem(
      EDIT_STORAGE_KEY,
      JSON.stringify({
        prompt: a.prompt,
        size: a.size,
        pixels: a.pixel_data,
        mode: "regenerate"
      })
    );
    router.push("/generate");
  };

  return (
    <div className="space-y-8">
      <header className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="text-xs uppercase text-gray-500">현재 토큰 잔액</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">
            ◆ {balance ?? "—"}
          </p>
          <a href="/shop" className="btn-accent mt-3 inline-flex items-center gap-1">
            <IconCharge /> 충전하기
          </a>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">내 작품</h2>
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
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">
            {debouncedQuery ? "검색 결과가 없습니다." : "아직 생성한 작품이 없습니다."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {items.map((a) => (
                <article key={a.id} className="card">
                  <div className="group relative">
                    <Link
                      href={`/mypage/${a.id}`}
                      className="block cursor-pointer transition-opacity hover:opacity-80"
                      aria-label="작품 상세 보기"
                    >
                      <PixelPreview pixels={a.pixel_data} size={a.size} />
                    </Link>
                    <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
                      {a.edited_by_human ? " · 사람 수정" : ""}
                    </span>
                    <span className="text-gray-400">{a.size}×{a.size}</span>
                  </div>
                  <div className="relative mt-2" data-card-menu>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === a.id ? null : a.id)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpenId === a.id}
                      className="btn inline-flex w-full items-center justify-center gap-1 text-xs"
                    >
                      <IconMenu /> 메뉴
                    </button>
                    {menuOpenId === a.id && (
                      <div
                        role="menu"
                        className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-md border-2 border-ink bg-paper text-xs shadow-pixel"
                      >
                        <button
                          role="menuitem"
                          onClick={() => {
                            togglePublic(a);
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ink/5"
                        >
                          {a.is_public ? <IconPrivate /> : <IconPublic />}
                          {a.is_public ? "비공개로" : "갤러리 공개"}
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenuOpenId(null);
                            router.push(`/edit/${a.id}`);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ink/5"
                        >
                          <IconEdit /> 수정
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenuOpenId(null);
                            regenerate(a);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ink/5"
                        >
                          <IconRegenerate /> 재생성
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenuOpenId(null);
                            remove(a);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-accent hover:bg-accent/10"
                        >
                          <IconDelete /> 삭제
                        </button>
                      </div>
                    )}
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
