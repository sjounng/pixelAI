import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/generate/events");
}
