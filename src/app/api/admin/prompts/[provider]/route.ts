import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ provider: string }>;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { provider } = await params;
  return proxyToBackend(req, `/api/admin/prompts/${provider}`);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { provider } = await params;
  return proxyToBackend(req, `/api/admin/prompts/${provider}`);
}
