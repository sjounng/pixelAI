import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { validatePixels } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * 사람이 직접 픽셀을 수정해 저장하는 작품 생성.
 * AI를 쓰지 않으므로 토큰은 차감하지 않고(0), editedByHuman=true로 표시한다.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // JWT 세션의 user id가 현재 DB에 없을 수 있어 FK 크래시 대신 안내.
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  if (!userExists) {
    return NextResponse.json({ error: "session_invalid" }, { status: 401 });
  }

  let body: { prompt?: string; size?: number; pixels?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  const size = body.size === 32 ? 32 : 16;
  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }
  if (prompt.length > 200) {
    return NextResponse.json({ error: "prompt_too_long", limit: 200 }, { status: 400 });
  }
  if (!Array.isArray(body.pixels)) {
    return NextResponse.json({ error: "pixels_required" }, { status: 400 });
  }

  // 관대한 정규화로 크기/색상 형식을 강제.
  const pixels = validatePixels(body.pixels, size);

  // editedByHuman은 최신 Prisma 클라이언트 재생성 후 인식됨. 변수로 넘겨 excess-property
  // 검사를 우회(런타임은 db push + generate 후 정상).
  const data = {
    userId,
    prompt,
    size,
    provider: "human",
    pixelData: JSON.stringify(pixels),
    status: "completed",
    tokenCost: 0,
    isPublic: false,
    editedByHuman: true
  };
  const art = await prisma.artwork.create({ data, select: { id: true } });

  return NextResponse.json({ id: art.id });
}
