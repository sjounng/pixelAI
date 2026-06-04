interface Props {
  size?: number;
  className?: string;
}

// 8x8 검은 캔버스. 각 셀 크기는 동일하고, 내부 원의 반지름이 열 인덱스에 비례해 커진다.
// 행마다 색이 노랑 → 빨강으로 점진적으로 변한다.
const ROW_COLORS = [
  "#fbbf24", "#fab21f", "#fa9c1a", "#f97316",
  "#f15a16", "#ec4420", "#e6332a", "#dc2626"
];

const CELL = 32;                       // 셀 크기 (단위)
const COLS = 8;
const ROWS = 8;
const SIDE = CELL * COLS;              // 256
const MIN_R = 6;                       // 가장 왼쪽 열의 원 반지름
const MAX_R = CELL / 2 - 2;            // 14 — 셀에 닿지 않도록 여백 2

export default function Logo({ size = 32, className }: Props) {
  const circles: React.ReactNode[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = col / (COLS - 1);
      const r = MIN_R + (MAX_R - MIN_R) * t;
      circles.push(
        <circle
          key={`${row}-${col}`}
          cx={col * CELL + CELL / 2}
          cy={row * CELL + CELL / 2}
          r={r}
          fill={ROW_COLORS[row]}
        />
      );
    }
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SIDE} ${SIDE}`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect width={SIDE} height={SIDE} fill="#000" />
      {circles}
    </svg>
  );
}
