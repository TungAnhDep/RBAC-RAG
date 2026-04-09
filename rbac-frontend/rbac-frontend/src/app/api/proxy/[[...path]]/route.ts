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

  const targetUrl = `http://internal${backendPath}${url.search}`;

  const headers = new Headers(req.headers);
  const cookie = req.headers.get("Cookie") || "";
  headers.set("Cookie", cookie);

  console.log(
    `[Proxy] Chuyển tiếp tới: ${targetUrl} | Cookie length: ${cookie.length}`,
  );

  const proxyReq = new Request(targetUrl, {
    method: req.method,
    headers: headers,
    body:
      req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : null,
    duplex: "half",
  });

  try {
    const response = await env.BACKEND_SVC.fetch(proxyReq);

    return response;
  } catch (e) {
    console.error("Proxy Error:", e);
    return new Response(JSON.stringify({ error: "Kết nối Worker thất bại" }), {
      status: 502,
    });
  }
}
