"use client";

import { useEffect, useRef } from "react";

interface Props {
  pixels: string[][];
  size: number;
  scale?: number;
  className?: string;
}

export default function PixelPreview({ pixels, size, scale = 12, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size * scale;
    canvas.height = size * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < size; y++) {
      const row = pixels[y] ?? [];
      for (let x = 0; x < size; x++) {
        const color = row[x] ?? "transparent";
        if (!color || color === "transparent") {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [pixels, size, scale]);

  return (
    <canvas
      ref={canvasRef}
      className={
        "block h-auto w-full image-rendering-pixelated " +
        (className ?? "")
      }
      style={{ imageRendering: "pixelated" }}
    />
  );
}
