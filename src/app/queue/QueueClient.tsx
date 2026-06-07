"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import { PROVIDERS } from "@/lib/ai";

type Status = "pending" | "completed" | "failed";

interface QueueItem {
  id: string;
  prompt: string;
  size: number;
  provider: string;
  status: Status;
  pixels: string[][] | null;
  failureReason: string | null;
  token_cost: number;
  is_public: boolean;
  created_at: string;
}

const POLL_INTERVAL_MS = 2500;
const NOTICE_KEY = "pixelai:queue-notice";

function providerMeta(id: string) {
  if (id === "human") return { label: "✏️ 사람 제작", emoji: "" };
  return PROVIDERS.find((p) => p.id === id) ?? { label: id, emoji: "" };
}

function pixelsToDataUrl(pixels: string[][], n: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < n; y++) {
    const row = pixels[y] ?? [];
    for (let x = 0; x < n; x++) {
      const c = row[x];
      if (!c || c === "transparent") continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL("image/png");
}

function noticeMessage(error: string, data: Record<string, unknown>): string {
  switch (error) {
    case "insufficient_tokens":
      return `토큰이 부족합니다. (필요 ${data.cost} · 잔액 ${data.balance})`;
    case "session_invalid":
      return "세션이 만료되었습니다. 다시 로그인해 주세요.";
    case "provider_not_configured":
      return `${data.provider} API 키가 설정되지 않았습니다.`;
    case "prompt_too_long":
      return `프롬프트가 너무 깁니다. (최대 ${data.limit}자)`;
    case "prompt_required":
      return "프롬프트를 입력해 주세요.";
    case "invalid_image_format":
      return "지원하지 않는 이미지 형식입니다.";
    case "image_too_large":
      return "이미지 크기가 너무 큽니다.";
    default:
      return "생성 요청에 실패했습니다.";
  }
}

export default function QueueClient() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  const readNotice = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(NOTICE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(NOTICE_KEY);
      const data = JSON.parse(raw) as { error?: string } & Record<string, unknown>;
      if (data.error) setNotice(noticeMessage(data.error, data));
    } catch {
      // 무시
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/generate/queue");
      if (!res.ok) return;
      const data = await res.json();
      if (stoppedRef.current) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setLoaded(true);
    } catch {
      // 일시적 네트워크 오류 — 다음 폴링에서 재시도
    }
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    readNotice();
    void fetchQueue();
    const timer = setInterval(() => {
      readNotice();
      void fetchQueue();
    }, POLL_INTERVAL_MS);
    return () => {
      stoppedRef.current = true;
      clearInterval(timer);
    };
  }, [fetchQueue, readNotice]);

  const download = (item: QueueItem) => {
    if (!item.pixels) return;
    const url = pixelsToDataUrl(item.pixels, item.size === 32 ? 32 : 16);
    if (!url) return;
    const link = document.createElement("a");
    link.download = `pixelai-${item.id}.png`;
    link.href = url;
    link.click();
  };

  const togglePublic = async (item: QueueItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/artworks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !item.is_public })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, is_public: !it.is_public } : it))
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">대기열</h1>
          <p className="text-sm text-gray-600">
            {pendingCount > 0
              ? `${pendingCount}개 제작 중…`
              : "제작 중인 작품이 없습니다."}
          </p>
        </div>
        <Link href="/generate" className="btn-accent">+ 새 생성</Link>
      </div>

      <p className="rounded-md border-2 border-dashed border-ink bg-paper px-3 py-2 text-xs text-gray-600">
        ℹ️ 최근 60분 내 작업이 제작 중·완료·실패 상태로 표시됩니다. 완료된 작품은 이후
        마이페이지에서 계속 확인할 수 있습니다.
      </p>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-md border-2 border-accent bg-accent/10 p-3 text-sm">
          <p>{notice}</p>
          <button onClick={() => setNotice(null)} className="font-bold" aria-label="닫기">
            ✕
          </button>
        </div>
      )}

      {loaded && items.length === 0 && (
        <div className="card text-center text-sm text-gray-600">
          <p>아직 작업이 없습니다.</p>
          <Link href="/generate" className="mt-2 inline-block underline">
            생성기로 가기 →
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const meta = providerMeta(item.provider);
          return (
            <div key={item.id} className="card space-y-3">
              <div className="pixel-grid flex aspect-square w-full items-center justify-center rounded-md border-2 border-ink bg-paper p-2">
                {item.status === "completed" && item.pixels ? (
                  <PixelPreview pixels={item.pixels} size={item.size} />
                ) : item.status === "failed" ? (
                  <div className="text-center text-xs text-accent">
                    <p className="text-2xl">✕</p>
                    <p className="mt-1 font-semibold">생성 실패</p>
                    <p className="text-gray-500">토큰 환불됨</p>
                  </div>
                ) : (
                  <div className="text-center text-xs text-gray-500">
                    <p className="animate-pulse text-2xl">▦</p>
                    <p className="mt-1 font-semibold">제작 중…</p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="line-clamp-2 text-sm font-semibold" title={item.prompt}>
                  {item.prompt}
                </p>
                <p className="text-xs text-gray-500">
                  {meta.emoji} {meta.label} · {item.size}×{item.size}
                  {item.status === "failed" && item.failureReason
                    ? ` · ${item.failureReason}`
                    : ""}
                </p>
              </div>

              {item.status === "completed" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => togglePublic(item)}
                    disabled={busyId === item.id}
                    className="btn flex-1 text-xs"
                  >
                    {item.is_public ? "비공개로" : "갤러리 공개"}
                  </button>
                  <button onClick={() => download(item)} className="btn-primary flex-1 text-xs">
                    PNG
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
