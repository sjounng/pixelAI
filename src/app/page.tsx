import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import RecentPublicArtworks from "./RecentPublicArtworks";

export const revalidate = 60;

export default function LandingPage() {
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            프롬프트 한 줄로
            <br />
            <span className="text-accent">픽셀 아트</span>를 만들어보세요.
          </h1>
          <p className="text-lg text-gray-700">
            16×16 또는 32×32 캔버스 위에 AI가 한 픽셀씩 색을 채워줍니다.
            게임 도트, 아이콘, 일러스트까지 — 토큰 한 개로 시작하세요.
          </p>
          <div className="flex gap-3">
            <Link href="/generate" className="btn-accent">바로 생성하기 →</Link>
            <Link href="/gallery" className="btn">갤러리 둘러보기</Link>
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            <li className="badge">#한줄프롬프트</li>
            <li className="badge">#AI_스타일</li>
            <li className="badge">#PNG_다운로드</li>
            <li className="badge">#공개_갤러리</li>
          </ul>
        </div>
        <div className="card pixel-grid">
          <div className="grid grid-cols-4 gap-3">
            {DEMO_TILES.map((t, i) => (
              <PixelPreviewStatic key={i} pixels={t} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold">최근 공개 작품</h2>
          <Link href="/gallery" className="text-sm font-semibold underline">
            전체 보기 →
          </Link>
        </div>
        <RecentPublicArtworks />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Feature title="① 입력" body="원하는 그림을 한 줄로 설명하세요." />
        <Feature title="② 생성" body="AI가 해상도에 맞는 색상 배열을 만듭니다." />
        <Feature title="③ 다운로드" body="Canvas에서 PNG로 저장하거나 갤러리에 공개하세요." />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-gray-700">{body}</p>
    </div>
  );
}

function PixelPreviewStatic({ pixels }: { pixels: string[][] }) {
  return <PixelPreview pixels={pixels} size={pixels.length} />;
}

// 8개 데모 타일 (8x8) — 정적 렌더, 외부 호출 없음
const D = {
  k: "#0b0b10",
  w: "#f4f1ea",
  r: "#ff2e63",
  c: "#08d9d6",
  y: "#ffd166",
  g: "#06d6a0",
  b: "#118ab2",
  t: "transparent"
} as const;

function tile(rows: string): string[][] {
  return rows.split("/").map((r) =>
    r.split("").map((c) => (D[c as keyof typeof D] ?? D.t))
  );
}

// 8x8 데모 타일 — 좌상단 1px 하이라이트로 픽셀 아트 룩 유지. 팔레트 키: k/w/r/c/y/g/b/t.
const DEMO_TILES: string[][][] = [
  // 하트
  tile("tttttttt/trrttrrt/rrrrrrrr/rwrrrrrr/rrrrrrrr/trrrrrrt/ttrrrrtt/tttrrttt"),
  // 스마일
  tile("ttyyyytt/tyyyyyyt/yykyykyy/yyyyyyyy/yyyyyyyy/ykyyyyky/yykkkkyy/ttyyyytt"),
  // 버섯
  tile("ttrrrrtt/trrrrrrt/rrwrrwrr/rrrrrrrr/trrrrrrt/tttwwttt/ttwwwwtt/ttwwwwtt"),
  // 스파클/플러스
  tile("tttyyttt/tttyyttt/tyyyyyyt/yyyyyyyy/yyyyyyyy/tyyyyyyt/tttyyttt/tttyyttt"),
  // 보석
  tile("tttccttt/ttcwcctt/tcccccct/cccccccc/cccccccc/tcccccct/ttcccctt/tttccttt"),
  // 나무
  tile("ttggggtt/tggggggt/ggwggggg/gggggggg/tggggggt/ttggggtt/tttyyttt/tttyyttt"),
  // 사과
  tile("tttgtttt/tttgrttt/ttrrrrtt/trrrrrrt/rwrrrrrr/rrrrrrrr/trrrrrrt/ttrrrrtt"),
  // 열기구
  tile("ttrrrrtt/trrrrrrt/yyyyyyyy/gggggggg/bbbbbbbb/tcccccct/ttkkkktt/ttkkkktt")
];
