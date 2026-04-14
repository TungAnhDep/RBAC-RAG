export const runtime = "edge";
export const dynamic = "force-dynamic";
import { getRequestContext } from "@cloudflare/next-on-pages";

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
  if (url.pathname === "/api/proxy/logout") {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");

    const deleteCookie =
      "aura_token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Partitioned";

    headers.append("Set-Cookie", deleteCookie);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: headers,
    });
  }
  let backendPath = url.pathname.replace("/api/proxy", "");
  if (!backendPath.startsWith("/")) backendPath = "/" + backendPath;

  const targetUrl = `http://internal${backendPath}${url.search}`;

  const proxyHeaders = new Headers(req.headers);

  const cookieString = req.headers.get("Cookie") || "";
  const token = cookieString
    .split(";")
    .find((c) => c.trim().startsWith("aura_token="))
    ?.split("=")[1];

  if (token) {
    proxyHeaders.set("Authorization", `Bearer ${token}`);
  }

  proxyHeaders.delete("host");

  console.log(`[Proxy] Forwarding to: ${targetUrl} | Token found: ${!!token}`);

  const proxyReq = new Request(targetUrl, {
    method: req.method,
    headers: proxyHeaders,
    body:
      req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : null,
    duplex: "half",
  });

  try {
    const response = await env.BACKEND_SVC.fetch(proxyReq);
    return response;
  } catch (e) {
    console.error("Proxy Error:", e);
    return new Response(
      JSON.stringify({ error: "Backend Connection Failed" }),
      {
        status: 502,
      },
    );
  }
}
