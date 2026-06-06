"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import WishlistStar from "@/components/WishlistStar";
import { PROVIDERS } from "@/lib/ai";

interface ArtworkDetail {
  id: string;
  prompt: string;
  size: number;
  provider: string;
  pixel_data: string[][];
  token_cost: number;
  created_at: string;
  author_name: string | null;
  wishlist: { folder_id: string | null } | null;
}

interface Props {
  artworkId: string;
}

function providerLabel(id: string): string {
  const p = PROVIDERS.find((x) => x.id === id);
  return p ? `${p.emoji} ${p.label}` : id;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function pixelsToDataUrl(pixels: string[][], n: number, scale: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = n * scale;
  canvas.height = n * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < n; y++) {
    const row = pixels[y] ?? [];
    for (let x = 0; x < n; x++) {
      const c = row[x];
      if (!c || c === "transparent") continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas.toDataURL("image/png");
}

export default function GalleryDetailClient({ artworkId }: Props) {
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/gallery/${artworkId}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setError("작품을 찾을 수 없거나 공개된 작품이 아닙니다.");
          return;
        }
        if (!res.ok) {
          setError("작품을 불러오지 못했습니다.");
          return;
        }
        const art = (await res.json()) as ArtworkDetail;
        setArtwork(art);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  const download = (scale: number) => {
    if (!artwork) return;
    const url = pixelsToDataUrl(artwork.pixel_data, artwork.size, scale);
    if (!url) return;
    const link = document.createElement("a");
    link.download = `pixelai-${artwork.id}-${artwork.size * scale}.png`;
    link.href = url;
    link.click();
  };

  const copyPrompt = async () => {
    if (!artwork) return;
    try {
      await navigator.clipboard.writeText(artwork.prompt);
    } catch {
      // 무시
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중…</p>;
  }
  if (error || !artwork) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-accent">{error ?? "작품 정보 없음"}</p>
        <Link href="/gallery" className="btn inline-flex">← 갤러리로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/gallery" className="text-sm text-gray-600 hover:underline">
          ← 갤러리
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="card flex items-center justify-center bg-paper">
          <div className="pixel-grid w-full max-w-[512px] rounded-md border-2 border-ink bg-paper p-2">
            <PixelPreview pixels={artwork.pixel_data} size={artwork.size} scale={16} />
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-gray-500">프롬프트</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">
                {artwork.prompt}
              </p>
            </div>
            <WishlistStar
              artworkId={artwork.id}
              initialFolderId={artwork.wishlist ? artwork.wishlist.folder_id : undefined}
            />
          </div>

          <button onClick={copyPrompt} className="btn text-xs">프롬프트 복사</button>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t-2 border-dashed border-ink pt-4 text-sm">
            {artwork.author_name && (
              <>
                <dt className="text-gray-500">작성자</dt>
                <dd className="font-semibold">{artwork.author_name}</dd>
              </>
            )}

            <dt className="text-gray-500">AI 모델</dt>
            <dd className="font-semibold">{providerLabel(artwork.provider)}</dd>

            <dt className="text-gray-500">해상도</dt>
            <dd className="font-semibold">{artwork.size}×{artwork.size}</dd>

            <dt className="text-gray-500">사용 토큰</dt>
            <dd className="font-semibold">◆ {artwork.token_cost}</dd>

            <dt className="text-gray-500">생성 일시</dt>
            <dd className="font-semibold">{formatDate(artwork.created_at)}</dd>
          </dl>

          <div className="space-y-2 border-t-2 border-dashed border-ink pt-4">
            <p className="text-xs uppercase text-gray-500">다운로드</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => download(1)} className="btn-primary">
                원본 {artwork.size}×{artwork.size}
              </button>
              <button onClick={() => download(16)} className="btn-primary">
                확대 {artwork.size * 16}×{artwork.size * 16}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
