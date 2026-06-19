"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconSave, IconEraser, IconPen, IconCheck } from "@/components/icons";
import ColorPicker from "@/components/ColorPicker";
import { FormSkeleton } from "@/components/Skeleton";

interface Props {
  artworkId: string;
}

const DEFAULT_SWATCHES = [
  "#000000", "#ffffff", "#e0245e", "#ff8c1a", "#ffd93b",
  "#43c463", "#2e8bff", "#8b5cf6", "#7a3f1a", "#9aa0a6"
];

function cloneGrid(g: string[][]): string[][] {
  return g.map((row) => [...row]);
}

export default function EditClient({ artworkId }: Props) {
  const router = useRouter();
  const [size, setSize] = useState(16);
  const [pixels, setPixels] = useState<string[][] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [color, setColor] = useState("#000000");
  const [erasing, setErasing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const paintingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/artworks/${artworkId}`, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setError("작품을 불러오지 못했습니다.");
          return;
        }
        const art = await res.json();
        setSize(art.size === 32 ? 32 : 16);
        setPixels(Array.isArray(art.pixel_data) ? art.pixel_data : null);
        setPrompt(`${art.prompt} (수정)`.slice(0, 200));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  // 현재 그림에 쓰인 색 + 기본 스와치를 합친 팔레트.
  const palette = useMemo(() => {
    const set = new Set<string>(DEFAULT_SWATCHES);
    if (pixels) {
      for (const row of pixels) {
        for (const c of row) {
          if (c && c !== "transparent") set.add(c.toLowerCase());
        }
      }
    }
    return Array.from(set).slice(0, 24);
  }, [pixels]);

  const paint = (x: number, y: number) => {
    setPixels((prev) => {
      if (!prev) return prev;
      const next = cloneGrid(prev);
      next[y][x] = erasing ? "transparent" : color;
      return next;
    });
  };

  const save = async () => {
    if (!pixels || saving) return;
    if (!prompt.trim()) {
      setError("이름(프롬프트)을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size, pixels })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "session_invalid"
            ? "세션이 만료되었습니다. 다시 로그인해 주세요."
            : data.error || "저장 실패"
        );
        return;
      }
      router.push(`/mypage/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FormSkeleton />;
  if (error && !pixels) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-accent">{error}</p>
        <Link href="/mypage" className="btn inline-flex">← 내 작품</Link>
      </div>
    );
  }
  if (!pixels) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">픽셀 수정</h1>
          <p className="text-sm text-gray-600">
            직접 칠해 새 작품으로 저장합니다. (사람 수정으로 표시)
          </p>
        </div>
        <Link href={`/mypage/${artworkId}`} className="text-sm text-gray-600 hover:underline">
          ← 원본
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="card flex items-center justify-center bg-paper">
          <div
            className="grid w-full max-w-[512px] select-none touch-none border-2 border-ink"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, aspectRatio: "1 / 1" }}
            onPointerDown={() => (paintingRef.current = true)}
            onPointerUp={() => (paintingRef.current = false)}
            onPointerLeave={() => (paintingRef.current = false)}
          >
            {pixels.map((row, y) =>
              row.map((c, x) => {
                const transparent = !c || c === "transparent";
                return (
                  <div
                    key={`${x}-${y}`}
                    onPointerDown={() => paint(x, y)}
                    onPointerEnter={() => {
                      if (paintingRef.current) paint(x, y);
                    }}
                    className={"aspect-square " + (transparent ? "pixel-grid" : "")}
                    style={{
                      backgroundColor: transparent ? undefined : c,
                      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)"
                    }}
                  />
                );
              })
            )}
          </div>
        </section>

        <section className="card space-y-4">
          <div>
            <label className="text-sm font-bold">이름</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={200}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-bold">색상</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setErasing(false);
                  }}
                  title={c}
                  className={
                    "h-7 w-7 rounded-sm border-2 " +
                    (!erasing && color === c ? "border-ink ring-2 ring-accent" : "border-ink")
                  }
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2">
              <ColorPicker
                value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"}
                onChange={(c) => {
                  setColor(c);
                  setErasing(false);
                }}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setErasing(false)}
                aria-pressed={!erasing}
                className={
                  "inline-flex flex-1 items-center justify-center gap-1 rounded-md border-2 border-ink px-3 py-2 text-xs font-semibold shadow-pixel " +
                  (!erasing
                    ? "bg-accent text-paper ring-2 ring-ink"
                    : "bg-paper text-ink opacity-70")
                }
              >
                {!erasing && <IconCheck />}
                <IconPen /> 펜
              </button>
              <button
                onClick={() => setErasing(true)}
                aria-pressed={erasing}
                className={
                  "inline-flex flex-1 items-center justify-center gap-1 rounded-md border-2 border-ink px-3 py-2 text-xs font-semibold shadow-pixel " +
                  (erasing
                    ? "bg-accent text-paper ring-2 ring-ink"
                    : "bg-paper text-ink opacity-70")
                }
              >
                {erasing && <IconCheck />}
                <IconEraser /> 지우개
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              현재 도구: <span className="font-bold">{erasing ? "지우개" : "펜"}</span>
            </p>
          </div>

          {error && <p className="text-sm text-accent">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="btn-accent inline-flex w-full items-center justify-center gap-1 disabled:opacity-50"
          >
            <IconSave /> {saving ? "저장 중…" : "새 작품으로 저장"}
          </button>
          <p className="text-xs text-gray-500">
            저장하면 토큰 차감 없이 내 작품에 추가됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
