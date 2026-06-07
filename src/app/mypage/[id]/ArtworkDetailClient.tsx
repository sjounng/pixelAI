"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PixelPreview from "@/components/PixelPreview";
import WishlistStar from "@/components/WishlistStar";
import { PROVIDERS } from "@/lib/ai";

const EDIT_STORAGE_KEY = "pixelai:edit-source";

interface ArtworkDetail {
  id: string;
  prompt: string;
  size: number;
  provider: string;
  pixel_data: string[][];
  is_public: boolean;
  token_cost: number;
  edited_by_human: boolean;
  status: string;
  failure_reason: string | null;
  created_at: string;
  wishlist: { folder_id: string | null } | null;
}

interface Props {
  artworkId: string;
}

function providerLabel(id: string): string {
  if (id === "human") return "✏️ 사람 제작";
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

// 픽셀 데이터를 지정한 배율로 PNG dataURL로 변환.
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

export default function ArtworkDetailClient({ artworkId }: Props) {
  const router = useRouter();
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/artworks/${artworkId}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setError("작품을 찾을 수 없거나 접근 권한이 없습니다.");
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

  const togglePublic = async () => {
    if (!artwork || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/artworks/${artwork.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !artwork.is_public })
      });
      if (res.ok) {
        setArtwork({ ...artwork, is_public: !artwork.is_public });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!artwork || busy) return;
    if (!confirm("이 작품을 삭제할까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/artworks/${artwork.id}`, { method: "DELETE" });
      if (res.ok) router.push("/mypage");
    } finally {
      setBusy(false);
    }
  };

  // 재생성: 기존 그림의 벡터를 AI에 기본 주입하고, 생성기에서 바꿀 부분을 적게 한다.
  const regenerate = () => {
    if (!artwork) return;
    sessionStorage.setItem(
      EDIT_STORAGE_KEY,
      JSON.stringify({
        prompt: artwork.prompt,
        size: artwork.size,
        pixels: artwork.pixel_data,
        mode: "regenerate"
      })
    );
    router.push("/generate");
  };

  // 수정: 사람이 직접 픽셀을 편집하는 에디터로 이동.
  const editPixels = () => {
    if (!artwork) return;
    router.push(`/edit/${artwork.id}`);
  };

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
        <Link href="/mypage" className="btn inline-flex">← 내 작품으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mypage" className="text-sm text-gray-600 hover:underline">
          ← 내 작품
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
              {artwork.edited_by_human && (
                <span className="mb-1 inline-block rounded-sm border-2 border-ink bg-amber-200 px-2 py-0.5 text-[11px] font-bold">
                  ✏️ 사람 수정
                </span>
              )}
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
            <dt className="text-gray-500">AI 모델</dt>
            <dd className="font-semibold">{providerLabel(artwork.provider)}</dd>

            <dt className="text-gray-500">해상도</dt>
            <dd className="font-semibold">{artwork.size}×{artwork.size}</dd>

            <dt className="text-gray-500">사용 토큰</dt>
            <dd className="font-semibold">◆ {artwork.token_cost}</dd>

            <dt className="text-gray-500">생성 일시</dt>
            <dd className="font-semibold">{formatDate(artwork.created_at)}</dd>

            <dt className="text-gray-500">공개 상태</dt>
            <dd className={artwork.is_public ? "font-semibold text-emerald-600" : "font-semibold text-gray-500"}>
              {artwork.is_public ? "갤러리에 공개됨" : "비공개"}
            </dd>
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

          <div className="space-y-2 border-t-2 border-dashed border-ink pt-4">
            <p className="text-xs uppercase text-gray-500">작품 관리</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={togglePublic} disabled={busy} className="btn">
                {artwork.is_public ? "비공개로 전환" : "갤러리에 공개"}
              </button>
              <button onClick={editPixels} disabled={busy} className="btn">
                ✏️ 수정 (직접 편집)
              </button>
              <button onClick={regenerate} disabled={busy} className="btn">
                🔄 재생성 (AI 변형)
              </button>
              <button onClick={remove} disabled={busy} className="btn text-accent">
                삭제
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
