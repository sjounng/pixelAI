import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listFolders, createFolder } from "@/lib/wishlist";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const folders = await listFolders(userId);
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  try {
    const folder = await createFolder(userId, name);
    return NextResponse.json({ folder });
  } catch (e) {
    return NextResponse.json(
      { error: "create_failed", detail: (e as Error).message },
      { status: 400 }
    );
  }
}
