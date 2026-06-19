import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/convert");
}
