import { NextRequest, NextResponse } from "next/server";

function backendBaseUrl(): string | null {
  return process.env.BACKEND_API_BASE_URL ?? null;
}

export async function proxyToBackend(req: NextRequest, path: string): Promise<NextResponse> {
  const base = backendBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "Set BACKEND_API_BASE_URL." },
      { status: 503 }
    );
  }

  const incomingUrl = new URL(req.url);
  const target = new URL(path, base);
  target.search = incomingUrl.search;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const response = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store"
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
