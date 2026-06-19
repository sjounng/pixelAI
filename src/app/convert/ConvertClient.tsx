"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import { IconImage, IconClose, IconGenerate } from "@/components/icons";
import { fileToPixels } from "@/lib/pixelize";

type Size = 16 | 32;

const COST: Record<Size, number> = { 16: 10, 32: 25 };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function errorMessage(data: { error?: string } & Record<string, unknown>): string {
  switch (data.error) {
    case "session_invalid":
      return "세션이 만료되었습니다. 다시 로그인해 주세요.";
    case "insufficient_tokens":
      return `토큰이 부족합니다. (필요 ${data.cost} · 잔액 ${data.balance})`;
    case "pixels_required":
      return "변환할 이미지를 먼저 올려주세요.";
    default:
      return "변환 요청에 실패했습니다.";
  }
}

export default function ConvertClient() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState<Size>(16);
  const [pixels, setPixels] = useState<string[][] | null>(null);
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "info" | "error" } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, kind: "info" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const handleFile = (f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      showToast("PNG / JPEG / WebP / GIF 이미지만 가능합니다.", "error");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      showToast("이미지 크기는 8MB 이하여야 합니다.", "error");
      return;
    }
    setFile(f);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  // 파일/해상도가 바뀌면 1차 알고리즘 변환을 다시 계산.
  useEffect(() => {
    if (!file) {
      setPixels(null);
      return;
    }
    let cancelled = false;
    setWorking(true);
    fileToPixels(file, size)
      .then((px) => {
        if (!cancelled) setPixels(px);
      })
      .catch(() => {
        if (!cancelled) showToast("이미지를 변환하지 못했습니다.", "error");
      })
      .finally(() => {
        if (!cancelled) setWorking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, size]);

  const submit = () => {
    if (!pixels) return;
    void fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basePixels: pixels, size, prompt: name.trim() || undefined })
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showToast(errorMessage(data), "error");
          return;
        }
        window.dispatchEvent(new Event("tokens:update"));
      })
      .catch(() => {});
    showToast("대기열로 전송했습니다 (AI 보정 중)", "info");
    window.dispatchEvent(new Event("queue:poke"));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="card space-y-4">
        <div>
          <h1 className="text-xl font-extrabold">변환기</h1>
          <p className="text-sm text-gray-600">
            고해상도 픽셀아트 이미지를 16×16 / 32×32 픽셀로 되돌립니다.
          </p>
        </div>

        <div>
          <label className="text-sm font-bold">이미지</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {imageUrl ? (
            <div className="relative mt-1 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="원본"
                className="pixel-grid h-40 w-40 rounded-md border-2 border-ink object-contain shadow-pixel"
                style={{ imageRendering: "pixelated" }}
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setImageUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
                }}
                className="absolute -right-2 -top-2 inline-flex items-center justify-center rounded-full border-2 border-ink bg-paper p-1 text-xs shadow-pixel hover:bg-accent hover:text-paper"
                aria-label="이미지 제거"
              >
                <IconClose />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={
                "mt-1 flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-ink text-xs text-gray-600 transition-colors " +
                (dragActive ? "bg-accent/10" : "bg-paper hover:bg-ink/5")
              }
            >
              <p className="inline-flex items-center gap-1 font-semibold">
                <IconImage /> 이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="mt-1 text-gray-500">PNG / JPEG / WebP / GIF · 최대 8MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-bold">변환 해상도</label>
          <div className="mt-1 flex gap-2">
            {[16, 32].map((n) => (
              <button
                key={n}
                onClick={() => setSize(n as Size)}
                className={
                  "flex-1 rounded-md border-2 border-ink px-3 py-2 text-sm font-semibold shadow-pixel " +
                  (size === n ? "bg-ink text-paper" : "bg-paper text-ink")
                }
              >
                {n}×{n} · {COST[n as Size]} 토큰
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold">이름 (선택)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            placeholder="예: 변환한 슬라임"
            className="input mt-1 text-sm"
          />
        </div>

        <button
          onClick={submit}
          disabled={!pixels || working}
          className="btn-accent inline-flex w-full items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconGenerate /> {working ? "변환 중…" : "AI 보정 후 저장"}
        </button>
        <p className="text-xs text-gray-500">
          업로드 즉시 1차 변환(미리보기)이 만들어지고, 저장 시 AI가 다듬어 대기열에 추가됩니다.
        </p>
      </section>

      <section className="card flex flex-col items-center justify-center gap-3">
        <p className="text-xs uppercase text-gray-500">1차 변환 미리보기</p>
        <div className="pixel-grid flex aspect-square w-full max-w-[420px] items-center justify-center rounded-md border-2 border-ink bg-paper p-2">
          {pixels ? (
            <PixelPreview pixels={pixels} size={size} />
          ) : (
            <p className="px-4 text-center text-sm text-gray-500">
              이미지를 올리면 변환 미리보기가 표시됩니다.
            </p>
          )}
        </div>
        {pixels && (
          <Link href="/queue" className="text-xs underline">
            대기열에서 결과 확인 →
          </Link>
        )}
      </section>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            className={
              "anim-slide-up pointer-events-auto flex items-center gap-3 rounded-md border-2 border-ink px-4 py-2 text-sm font-semibold shadow-pixel " +
              (toast.kind === "error" ? "bg-accent text-paper" : "bg-ink text-paper")
            }
          >
            <span>{toast.msg}</span>
            {toast.kind === "info" && (
              <Link href="/queue" className="underline">
                대기열 보기
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
