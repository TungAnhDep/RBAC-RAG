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
  let env: any;
  let isLocalDev = false;

  try {
    const context = getRequestContext();
    env = context.env;
    if (!env || !env.BACKEND_SVC) {
      isLocalDev = true;
    }
  } catch (e) {
    isLocalDev = true;
    env = process.env;
  }
  const url = new URL(req.url);

  if (url.pathname === "/api/proxy/logout") {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");

    const deleteCookie = `aura_token=; Path=/; HttpOnly; ${isLocalDev ? "" : "Secure;"} ${isLocalDev ? "SameSite=Lax;" : "SameSite=None; Partitioned;"}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    headers.append("Set-Cookie", deleteCookie);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: headers,
    });
  }

  let backendPath = url.pathname.replace("/api/proxy", "");
  if (!backendPath.startsWith("/")) backendPath = "/" + backendPath;

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

  const internalTargetUrl = `http://internal${backendPath}${url.search}`;

  const requestInit: RequestInit = {
    method: req.method,
    headers: proxyHeaders,
    body:
      req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : null,
    duplex: "half",
  };

  try {
    if (!isLocalDev && env.BACKEND_SVC) {
      const proxyReq = new Request(internalTargetUrl, requestInit);
      return await env.BACKEND_SVC.fetch(proxyReq);
    } else {
      const localBase = env.BACKEND_LOCAL_URL || "http://localhost:8787";
      const localTargetUrl = `${localBase}${backendPath}${url.search}`;
      return await fetch(localTargetUrl, requestInit);
    }
  } catch (e) {
    console.error("Proxy Error:", e);
    return new Response(
      JSON.stringify({
        error: "Backend Connection Failed",
        detail: e instanceof Error ? e.message : "Unknown Error",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
