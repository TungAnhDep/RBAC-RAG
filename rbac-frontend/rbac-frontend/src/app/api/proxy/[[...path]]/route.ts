export const runtime = "edge";
export const dynamic = "force-dynamic";
import { getRequestContext } from "@cloudflare/next-on-pages";

// PHẢI EXPORT ĐỦ CÁC HÀM NÀY ĐỂ DASHBOARD CHẠY ĐƯỢC
export async function POST(req: Request) {
  return handleRequest(req);
}
export async function GET(req: Request) {
  return handleRequest(req);
}
export async function PUT(req: Request) {
  return handleRequest(req);
}
export async function DELETE(req: Request) {
  return handleRequest(req);
}

async function handleRequest(req: Request) {
  const { env } = getRequestContext();
  const url = new URL(req.url);

  let backendPath = url.pathname.replace("/api/proxy", "");
  if (!backendPath.startsWith("/")) backendPath = "/" + backendPath;

  const searchParams = url.search;
  const targetUrl = `http://internal${backendPath}${searchParams}`;

  const proxyReq = new Request(targetUrl, {
    method: req.method,
    headers: req.headers,
    body:
      req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : null,
    duplex: "half",
  });

  try {
    return await env.BACKEND_SVC.fetch(proxyReq);
  } catch (e) {
    console.error("Proxy Error:", e);
    return new Response("Backend Bridge Failed", { status: 502 });
  }
}
