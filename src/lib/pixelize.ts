// 고해상도 픽셀아트 이미지 → N×N 픽셀 그리드 (주 방식: 그리드 점유색 판정).
// 브라우저 canvas의 ImageData를 입력으로 받는 순수 함수.

type Pixels = string[][];
interface RGB {
  r: number;
  g: number;
  b: number;
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function dist2(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

// 무채색(채널 편차 작음) 여부.
function isAchromatic(c: RGB): boolean {
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) <= 18;
}

// 배경 후보: 무채색이면서 매우 밝거나(흰/체크무늬 밝은 칸) 매우 어두움(검정).
function bgLike(c: RGB): boolean {
  if (!isAchromatic(c)) return false;
  const l = (c.r + c.g + c.b) / 3;
  return l >= 200 || l <= 34;
}

/**
 * @param N 타깃 해상도(16 | 32)
 * @param mergeThreshold 로우컬러 통일 강도(채널당 허용 편차). 클수록 색이 더 합쳐짐.
 */
export function imageDataToPixels(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  N: number,
  mergeThreshold = 22
): Pixels {
  const cells: (RGB | null)[][] = [];

  // 1) 각 그리드 셀에서 영역을 가장 많이 차지하는 색(베이스톤)을 판정.
  for (let gy = 0; gy < N; gy++) {
    const row: (RGB | null)[] = [];
    const y0 = Math.floor((gy * h) / N);
    const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / N));
    for (let gx = 0; gx < N; gx++) {
      const x0 = Math.floor((gx * w) / N);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / N));

      const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
      let transparent = 0;
      let total = 0;
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          total++;
          const i = (py * w + px) * 4;
          if (data[i + 3] < 128) {
            transparent++;
            continue;
          }
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // 5비트 양자화 키로 미세 노이즈를 묶어 빈도 집계.
          const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          const e = buckets.get(key);
          if (e) {
            e.n++;
            e.r += r;
            e.g += g;
            e.b += b;
          } else {
            buckets.set(key, { n: 1, r, g, b });
          }
        }
      }

      if (transparent > total * 0.5 || buckets.size === 0) {
        row.push(null);
        continue;
      }
      let best: { n: number; r: number; g: number; b: number } | null = null;
      for (const e of buckets.values()) {
        if (!best || e.n > best.n) best = e;
      }
      row.push({
        r: Math.round(best!.r / best!.n),
        g: Math.round(best!.g / best!.n),
        b: Math.round(best!.b / best!.n)
      });
    }
    cells.push(row);
  }

  // 2) 로우컬러 통일: 베이스톤 대비 변환율이 미세하면 한 색으로 합침(greedy 팔레트).
  const palette: RGB[] = [];
  const T = mergeThreshold * mergeThreshold * 3;
  const repOf = (c: RGB): RGB => {
    for (const p of palette) if (dist2(c, p) <= T) return p;
    palette.push(c);
    return c;
  };
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = cells[y][x];
      if (c) cells[y][x] = repOf(c);
    }

  // 3) 벡터라이즈: 테두리에서 flood fill로 외곽 배경(투명/흰/검/체크무늬)만 제거.
  //    내부 윤곽선(검정 등)은 테두리와 연결되지 않으므로 보존됨.
  const removed: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  const stack: [number, number][] = [];
  const seed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= N || y >= N || removed[y][x]) return;
    const c = cells[y][x];
    if (c === null || bgLike(c)) {
      removed[y][x] = true;
      stack.push([x, y]);
    }
  };
  for (let i = 0; i < N; i++) {
    seed(i, 0);
    seed(i, N - 1);
    seed(0, i);
    seed(N - 1, i);
  }
  while (stack.length) {
    const [x, y] = stack.pop()!;
    seed(x + 1, y);
    seed(x - 1, y);
    seed(x, y + 1);
    seed(x, y - 1);
  }

  // 4) 출력 그리드.
  const out: Pixels = [];
  for (let y = 0; y < N; y++) {
    const r: string[] = [];
    for (let x = 0; x < N; x++) {
      const c = cells[y][x];
      r.push(c === null || removed[y][x] ? "transparent" : toHex(c.r, c.g, c.b));
    }
    out.push(r);
  }
  return out;
}

/** File/이미지 → N×N 픽셀 그리드 (브라우저 전용). */
export async function fileToPixels(file: File, N: number): Promise<Pixels> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context 없음");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);
    return imageDataToPixels(data, w, h, N);
  } finally {
    URL.revokeObjectURL(url);
  }
}
