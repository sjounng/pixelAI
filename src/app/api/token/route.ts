import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/token");
}
