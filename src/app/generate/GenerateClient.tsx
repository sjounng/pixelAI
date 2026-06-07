"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROVIDERS, Provider } from "@/lib/ai";
import {
  IconGenerate,
  IconSearch,
  IconRegenerate,
  IconPublic,
  IconPrivate,
  IconDownload,
  IconClose
} from "@/components/icons";

type Size = 16 | 32;

interface GenerateResponse {
  id: string;
  pixels: string[][];
  size: number;
  provider: Provider;
  token_used: number;
  token_balance: number | null;
  unlimited?: boolean;
}

const COST: Record<Size, number> = { 16: 10, 32: 25 };

interface Props {
  available: Provider[];
  isAdmin: boolean;
  webSearchAvailable: boolean;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const EDIT_STORAGE_KEY = "pixelai:edit-source";
const PENDING_STORAGE_KEY = "pixelai:pending-generation";

function errorMessage(data: { error?: string } & Record<string, unknown>): string {
  switch (data.error) {
    case "session_invalid":
      return "세션이 만료되었습니다. 다시 로그인해 주세요.";
    case "insufficient_tokens":
      return `토큰이 부족합니다. (필요 ${data.cost} · 잔액 ${data.balance})`;
    case "provider_not_configured":
      return `${data.provider} API 키가 설정되지 않았습니다.`;
    case "prompt_too_long":
      return `프롬프트가 너무 깁니다. (최대 ${data.limit}자)`;
    default:
      return "생성 요청에 실패했습니다.";
  }
}
const PENDING_MAX_AGE_MS = 150_000;
const POLL_INTERVAL_MS = 2000;
const NORMAL_PROMPT_LIMIT = 200;
const ADMIN_PROMPT_LIMIT = 1000;

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

export default function GenerateClient({ available, isAdmin, webSearchAvailable }: Props) {
  const promptLimit = isAdmin ? ADMIN_PROMPT_LIMIT : NORMAL_PROMPT_LIMIT;
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<Size>(16);
  const [provider, setProvider] = useState<Provider>(available[0] ?? "claude");
  const [useSearch, setUseSearch] = useState(false);
  const [basePixels, setBasePixels] = useState<string[][] | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "info" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, kind: "info" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [makingPublic, setMakingPublic] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollAbortRef = useRef<{ stopped: boolean } | null>(null);

  const handleFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("PNG / JPEG / WebP / GIF 이미지만 업로드 가능합니다.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(typeof reader.result === "string" ? reader.result : null);
      setError(null);
    };
    reader.onerror = () => setError("이미지 읽기 실패");
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const draw = (pixels: string[][], n: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = n;
    canvas.height = n;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, n, n);
    for (let y = 0; y < n; y++) {
      const row = pixels[y] ?? [];
      for (let x = 0; x < n; x++) {
        const c = row[x];
        if (!c || c === "transparent") continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };

  useEffect(() => {
    if (result) draw(result.pixels, result.size);
  }, [result]);

  // 마이페이지 "수정" 버튼에서 넘어온 경우 — 프롬프트와 이전 결과를 참고 이미지로 채움.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(EDIT_STORAGE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(EDIT_STORAGE_KEY);
    try {
      const data = JSON.parse(raw) as {
        prompt?: string;
        size?: number;
        pixels?: string[][];
        mode?: string;
      };
      if (typeof data.prompt === "string") setPrompt(data.prompt);
      if (data.size === 16 || data.size === 32) setSize(data.size);
      // 재생성: 픽셀 벡터를 그대로 베이스로 전달(PNG 변환 안 함).
      if (data.mode === "regenerate" && Array.isArray(data.pixels) && data.pixels.length > 0) {
        setBasePixels(data.pixels);
      } else if (Array.isArray(data.pixels) && data.pixels.length > 0) {
        // 구버전 호환: PNG 참조 이미지로.
        const url = pixelsToDataUrl(data.pixels, data.size === 32 ? 32 : 16);
        if (url) setReferenceImage(url);
      }
    } catch {
      // 손상된 데이터는 무시.
    }
  }, []);

  // 페이지 이동 후 돌아왔을 때 생성 중이던 세션을 복구.
  // localStorage 마커가 있으면 서버에서 최근 작업을 조회해 상태를 이어간다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return;

    let marker: { prompt: string; size: Size; provider: Provider; startedAt: number };
    try {
      marker = JSON.parse(raw);
    } catch {
      localStorage.removeItem(PENDING_STORAGE_KEY);
      return;
    }
    if (Date.now() - marker.startedAt > PENDING_MAX_AGE_MS) {
      localStorage.removeItem(PENDING_STORAGE_KEY);
      return;
    }

    setPrompt(marker.prompt);
    setSize(marker.size);
    setProvider(marker.provider);
    setLoading(true);

    const controller = { stopped: false };
    pollAbortRef.current = controller;
    void pollActive(controller, marker);

    return () => {
      controller.stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollActive = async (
    controller: { stopped: boolean },
    marker: { prompt: string; size: Size; provider: Provider; startedAt: number }
  ) => {
    while (!controller.stopped) {
      try {
        const res = await fetch("/api/generate/active");
        if (controller.stopped) return;
        if (!res.ok) {
          // 인증 실패 등 — 마커 제거하고 종료.
          localStorage.removeItem(PENDING_STORAGE_KEY);
          setLoading(false);
          return;
        }
        const data = await res.json();
        const active = data.active as
          | {
              id: string;
              size: number;
              provider: Provider;
              status: "pending" | "completed" | "failed";
              pixels: string[][] | null;
              failureReason: string | null;
              token_cost: number;
            }
          | null;

        // 마커 시각보다 더 앞선 작업이 없으면 서버에 도달하기 전 끊긴 것 — 마커 폐기.
        if (!active) {
          if (Date.now() - marker.startedAt > 5000) {
            localStorage.removeItem(PENDING_STORAGE_KEY);
            setLoading(false);
            return;
          }
        } else if (active.status === "completed" && active.pixels) {
          localStorage.removeItem(PENDING_STORAGE_KEY);
          setResult({
            id: active.id,
            pixels: active.pixels,
            size: active.size,
            provider: active.provider,
            token_used: active.token_cost,
            token_balance: data.token_balance ?? null,
            unlimited: false
          });
          setLoading(false);
          window.dispatchEvent(new Event("tokens:update"));
          return;
        } else if (active.status === "failed") {
          localStorage.removeItem(PENDING_STORAGE_KEY);
          setError(active.failureReason || "생성 실패 (토큰 환불됨)");
          setLoading(false);
          window.dispatchEvent(new Event("tokens:update"));
          return;
        }
      } catch {
        // 네트워크 오류는 일시적일 수 있음 — 다음 루프에서 재시도.
      }

      if (Date.now() - marker.startedAt > PENDING_MAX_AGE_MS) {
        localStorage.removeItem(PENDING_STORAGE_KEY);
        setLoading(false);
        setError("생성이 너무 오래 걸립니다. 잠시 후 마이페이지를 확인하세요.");
        return;
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  };

  // 생성은 백그라운드로 보내고 생성기에는 그대로 남는다. 요청(fetch)은 페이지를
  // 옮기거나 모델을 바꿔도 브라우저가 응답까지 유지하므로 진행 중인 생성이 사라지지
  // 않는다. 결과는 대기열 페이지에서 폴링해 확인한다.
  const handleGenerate = () => {
    const p = prompt.trim();
    if (!p || available.length === 0) return;

    const body = {
      prompt: p,
      size,
      provider,
      referenceImage: referenceImage ?? undefined,
      // 웹 검색은 Claude + 참조 이미지 없을 때만 의미가 있음.
      webSearch: provider === "claude" && !referenceImage ? useSearch : false,
      // 재생성: 기존 그림 벡터를 AI에 기본 주입.
      basePixels: basePixels ?? undefined
    };

    void fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showToast(errorMessage(data), "error");
        }
        window.dispatchEvent(new Event("tokens:update"));
      })
      .catch(() => {
        // 네트워크 오류여도 서버에선 진행 중일 수 있음 — 대기열 폴링이 회수.
      });

    showToast("대기열로 이동되었습니다", "info");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `pixelai-${result?.id ?? "art"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const togglePublic = async () => {
    if (!result) return;
    setMakingPublic(true);
    try {
      const res = await fetch(`/api/artworks/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !isPublic })
      });
      if (res.ok) {
        setIsPublic((v) => !v);
      }
    } finally {
      setMakingPublic(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="card space-y-4">
        {basePixels && (
          <div className="flex items-start justify-between gap-2 rounded-md border-2 border-ink bg-amber-100 px-3 py-2 text-xs">
            <p className="flex items-center gap-1">
              <IconRegenerate />
              <span>
                <span className="font-bold">재생성 모드</span> — 기존 그림을 기반으로 변형합니다.{" "}
                <span className="font-semibold">바꿀 부분</span>을 프롬프트에 적어주세요.
              </span>
            </p>
            <button
              onClick={() => setBasePixels(null)}
              className="shrink-0 hover:text-accent"
              aria-label="재생성 모드 해제"
            >
              <IconClose />
            </button>
          </div>
        )}

        <div>
          <label className="text-sm font-bold">프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 다이아몬드 검, 픽셀 고양이, 8비트 우주선"
            rows={isAdmin ? 6 : 3}
            className="input mt-1 resize-none"
            maxLength={promptLimit}
          />
          <p className="mt-1 text-right text-xs text-gray-500">
            {prompt.length}/{promptLimit}
            {isAdmin && <span className="ml-2 text-amber-600">admin</span>}
          </p>
        </div>

        <div>
          <label className="text-sm font-bold">예시 이미지 (선택)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {referenceImage ? (
            <div className="relative mt-1 inline-block">
              <img
                src={referenceImage}
                alt="참고 이미지"
                className="h-32 w-32 rounded-md border-2 border-ink object-cover shadow-pixel"
              />
              <button
                type="button"
                onClick={() => setReferenceImage(null)}
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
              onDrop={handleDrop}
              className={
                "mt-1 flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-ink text-xs text-gray-600 transition-colors " +
                (dragActive ? "bg-accent/10" : "bg-paper hover:bg-ink/5")
              }
            >
              <p className="font-semibold">📎 이미지를 드래그하거나 클릭하여 업로드</p>
              <p className="mt-1 text-gray-500">PNG / JPEG / WebP / GIF · 최대 5MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-bold">AI 모델</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => {
              const enabled = available.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => enabled && setProvider(p.id)}
                  disabled={!enabled}
                  title={enabled ? "" : "API 키 미설정"}
                  className={
                    "rounded-md border-2 border-ink px-3 py-2 text-sm font-semibold shadow-pixel disabled:cursor-not-allowed disabled:opacity-40 " +
                    (provider === p.id && enabled ? "bg-ink text-paper" : "bg-paper text-ink")
                  }
                >
                  <span className="mr-1">{p.emoji}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
          {available.length === 0 && (
            <p className="mt-1 text-xs text-accent">
              어떤 AI 키도 설정되지 않았습니다. .env.local 확인.
            </p>
          )}
        </div>

        {webSearchAvailable && provider === "claude" && !referenceImage && (
          <div>
            <label className="flex items-center justify-between gap-3 rounded-md border-2 border-ink bg-paper px-3 py-2 shadow-pixel">
              <span className="text-sm">
                <span className="inline-flex items-center gap-1 font-bold"><IconSearch /> AI 검색</span>
                <span className="ml-1 text-xs text-gray-500">
                  생성 전 웹에서 대상을 조사 (정확도↑·다소 느려짐)
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={useSearch}
                onClick={() => setUseSearch((v) => !v)}
                className={
                  "relative h-6 w-11 shrink-0 rounded-full border-2 border-ink transition-colors " +
                  (useSearch ? "bg-accent" : "bg-paper")
                }
              >
                <span
                  className={
                    "absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-paper transition-all " +
                    (useSearch ? "left-5" : "left-0.5")
                  }
                />
              </button>
            </label>
          </div>
        )}

        <div>
          <label className="text-sm font-bold">해상도</label>
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

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim() || available.length === 0}
          className="btn-accent inline-flex w-full items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconGenerate /> {loading ? "생성 중…" : "픽셀 아트 생성"}
        </button>

        {error && (
          <div className="rounded-md border-2 border-accent bg-accent/10 p-3 text-sm">
            <p className="font-semibold text-accent">에러</p>
            <p>{error}</p>
            {error.includes("토큰이 부족") && (
              <Link href="/shop" className="mt-2 inline-block underline">
                토큰 충전하러 가기 →
              </Link>
            )}
          </div>
        )}

        <div className="border-t-2 border-dashed border-ink pt-3 text-xs text-gray-600">
          <p>💡 팁</p>
          <ul className="ml-4 list-disc">
            <li>주제를 단순하고 구체적으로 묘사하세요.</li>
            <li>모델마다 화풍이 다릅니다. 여러 번 비교해보세요.</li>
            <li>32×32는 디테일이 풍부하지만 토큰이 더 듭니다.</li>
          </ul>
        </div>
      </section>

      <section className="card flex flex-col items-center justify-center gap-4">
        <div className="pixel-grid flex aspect-square w-full max-w-[512px] items-center justify-center rounded-md border-2 border-ink bg-paper p-2">
          {result ? (
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <p className="px-4 text-center text-sm text-gray-500">
              생성을 누르면 백그라운드로 제작됩니다.{" "}
              <Link href="/queue" className="underline">대기열</Link>에서 결과를 확인하세요.
            </p>
          )}
        </div>

        {result && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-600">
              {result.provider}{" "}
              {result.unlimited
                ? "· 테스트 모드 (∞)"
                : `· -${result.token_used} · 잔액 ${result.token_balance}`}
            </p>
            <div className="flex gap-2">
              <button onClick={togglePublic} disabled={makingPublic} className="btn inline-flex items-center gap-1">
                {isPublic ? <IconPrivate /> : <IconPublic />}
                {isPublic ? "비공개로" : "갤러리에 공개"}
              </button>
              <button onClick={handleDownload} className="btn-primary inline-flex items-center gap-1">
                <IconDownload /> PNG 다운로드
              </button>
            </div>
          </div>
        )}
      </section>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            className={
              "pointer-events-auto flex items-center gap-3 rounded-md border-2 border-ink px-4 py-2 text-sm font-semibold shadow-pixel " +
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
