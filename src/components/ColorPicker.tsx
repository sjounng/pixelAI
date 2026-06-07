"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // #rrggbb
  onChange: (hex: string) => void;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

type Hsv = { h: number; s: number; v: number };

function hexToHsv(hex: string): Hsv | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsv(rgb[0], rgb[1], rgb[2]) : null;
}

function hsvToHex({ h, s, v }: Hsv): string {
  const [r, g, b] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export default function ColorPicker({ value, onChange }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 0, s: 1, v: 1 });
  const [hexDraft, setHexDraft] = useState(value);
  const lastHex = useRef(value.toLowerCase());

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const satRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLDivElement>(null);

  // 외부에서 value가 바뀌면(예: 팔레트 클릭) 내부 상태 동기화.
  useEffect(() => {
    if (value.toLowerCase() === lastHex.current) return;
    const next = hexToHsv(value);
    if (next) {
      setHsv(next);
      setHexDraft(value);
      lastHex.current = value.toLowerCase();
    }
  }, [value]);

  const emit = (next: Hsv) => {
    const hex = hsvToHex(next);
    lastHex.current = hex.toLowerCase();
    setHexDraft(hex);
    onChange(hex);
  };

  const setSV = (s: number, v: number) => {
    const next = { ...hsv, s, v };
    setHsv(next);
    emit(next);
  };
  const setH = (h: number) => {
    const next = { ...hsv, h };
    setHsv(next);
    emit(next);
  };
  const setV = (v: number) => {
    const next = { ...hsv, v };
    setHsv(next);
    emit(next);
  };
  const setS = (s: number) => {
    const next = { ...hsv, s };
    setHsv(next);
    emit(next);
  };

  const pickSV = (clientX: number, clientY: number) => {
    const r = svRef.current?.getBoundingClientRect();
    if (!r) return;
    setSV(clamp01((clientX - r.left) / r.width), 1 - clamp01((clientY - r.top) / r.height));
  };
  const pickHue = (clientX: number) => {
    const r = hueRef.current?.getBoundingClientRect();
    if (!r) return;
    setH(clamp01((clientX - r.left) / r.width) * 360);
  };
  const pickVal = (clientX: number) => {
    const r = valRef.current?.getBoundingClientRect();
    if (!r) return;
    setV(clamp01((clientX - r.left) / r.width));
  };
  const pickSat = (clientX: number) => {
    const r = satRef.current?.getBoundingClientRect();
    if (!r) return;
    setS(clamp01((clientX - r.left) / r.width));
  };

  const startDrag = (kind: "sv" | "hue" | "val" | "sat") => (e: React.PointerEvent) => {
    e.preventDefault();
    const apply = (cx: number, cy: number) => {
      if (kind === "sv") pickSV(cx, cy);
      else if (kind === "hue") pickHue(cx);
      else if (kind === "val") pickVal(cx);
      else pickSat(cx);
    };
    const move = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    apply(e.clientX, e.clientY); // 첫 클릭 위치 즉시 반영
  };

  const onHex = (raw: string) => {
    setHexDraft(raw);
    const next = hexToHsv(raw);
    if (next) {
      setHsv(next);
      const hex = raw.startsWith("#") ? raw.toLowerCase() : "#" + raw.toLowerCase();
      lastHex.current = hex;
      onChange(hex);
    }
  };

  const current = hsvToHex(hsv);

  return (
    <div className="space-y-2 select-none">
      {/* 채도(가로) × 명도(세로) 영역 */}
      <div
        ref={svRef}
        onPointerDown={startDrag("sv")}
        className="relative h-36 w-full cursor-crosshair rounded-sm border-2 border-ink"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))"
        }}
      >
        <span
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            boxShadow: "0 0 0 1px #000"
          }}
        />
      </div>

      {/* 채도 슬라이더 */}
      <div
        ref={satRef}
        onPointerDown={startDrag("sat")}
        className="relative h-4 w-full cursor-pointer rounded-sm border-2 border-ink"
        style={{
          backgroundImage: `linear-gradient(to right, ${hsvToHex({ h: hsv.h, s: 0, v: hsv.v })}, ${hsvToHex(
            { h: hsv.h, s: 1, v: hsv.v }
          )})`
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white"
          style={{ left: `${hsv.s * 100}%`, boxShadow: "0 0 0 1px #000" }}
        />
      </div>

      {/* 명도(밝기) 슬라이더 */}
      <div
        ref={valRef}
        onPointerDown={startDrag("val")}
        className="relative h-4 w-full cursor-pointer rounded-sm border-2 border-ink"
        style={{
          backgroundImage: `linear-gradient(to right, #000, ${hsvToHex({ h: hsv.h, s: hsv.s, v: 1 })})`
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white"
          style={{ left: `${hsv.v * 100}%`, boxShadow: "0 0 0 1px #000" }}
        />
      </div>

      {/* 색조 슬라이더 */}
      <div
        ref={hueRef}
        onPointerDown={startDrag("hue")}
        className="relative h-4 w-full cursor-pointer rounded-sm border-2 border-ink"
        style={{
          backgroundImage:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white"
          style={{ left: `${(hsv.h / 360) * 100}%`, boxShadow: "0 0 0 1px #000" }}
        />
      </div>

      {/* 헥스 입력 + 현재 색 미리보기 */}
      <div className="flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-sm border-2 border-ink"
          style={{ backgroundColor: current }}
        />
        <input
          value={hexDraft}
          onChange={(e) => onHex(e.target.value)}
          spellCheck={false}
          maxLength={7}
          placeholder="#000000"
          className="input flex-1 font-mono text-xs uppercase"
          aria-label="헥스 색상 코드"
        />
      </div>
      <p className="text-[10px] text-gray-500">
        H {Math.round(hsv.h)}° · S {Math.round(hsv.s * 100)}% · V {Math.round(hsv.v * 100)}%
      </p>
    </div>
  );
}
