import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { jwtVerify } = await import("jose");
  const { pathname } = req.nextUrl;

  const JWT_SECRET = process.env.JWT_SECRET;
  const token = req.cookies.get("aura_token")?.value;

  if (!token) {
    if (pathname === "/" || pathname.startsWith("/admin")) {
      console.log("-> No token, redirecting to /login");
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userRole = payload.role;

    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/admin") && userRole !== "Admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  } catch (e) {
    console.log("-> JWT Verify Error:", e);

    if (pathname !== "/login") {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("aura_token");
      return response;
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/", "/admin/:path*", "/login", "/api/:path*"],
};
