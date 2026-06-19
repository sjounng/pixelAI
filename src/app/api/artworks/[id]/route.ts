import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const runtime = "nodejs";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  return proxyToBackend(req, `/api/artworks/${id}`);
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  return proxyToBackend(req, `/api/artworks/${id}`);
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  return proxyToBackend(req, `/api/artworks/${id}`);
}
