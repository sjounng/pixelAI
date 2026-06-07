/**
 * 재생성용 베이스 픽셀 블록.
 * 기존 그림의 픽셀 그리드(색상 코드)를 그대로 주입해, AI가 이 이미지를 출발점으로
 * 삼아 "변경 지시(subject)"에 해당하는 부분만 고치도록 한다.
 */
export function basePixelsBlock(basePixels?: string[][]): string {
  if (!basePixels || basePixels.length === 0) return "";
  return `\n\nBASE IMAGE — the current pixel grid as a JSON matrix (top row first; each cell is a hex color like "#3f2d1a" or "transparent"). Start from THIS exact image and apply ONLY the change described in the subject above. Keep every other pixel as close to the original as possible.\n${JSON.stringify(
    basePixels
  )}`;
}
