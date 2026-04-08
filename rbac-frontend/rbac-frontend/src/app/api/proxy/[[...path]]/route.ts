export const runtime = "edge";
export const dynamic = "force-dynamic";
import { getRequestContext } from "@cloudflare/next-on-pages";

export async function POST(req: Request) {
  return handleRequest(req);
}

export async function GET(req: Request) {
  return handleRequest(req);
}

async function handleRequest(req: Request) {
  const { env } = getRequestContext();
  const url = new URL(req.url);

  const backendPath = url.pathname.replace("/api/proxy", "");
  const searchParams = url.search;

  return await env.BACKEND_SVC.fetch(
    `http://internal${backendPath}${searchParams}`,
    {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" ? await req.blob() : null,
    },
  );
}
