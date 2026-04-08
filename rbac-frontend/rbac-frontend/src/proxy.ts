import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
export async function proxy(req: NextRequest) {
  const { jwtVerify } = await import("jose");
  const token = req.cookies.get("frensai_token")?.value;
  console.log("Token nhận được trong Middleware:", token ? "Đã thấy" : "Trống");
  const { pathname } = req.nextUrl;

  if (!token && (pathname === "/" || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      console.log("Xác thực Token thành công!", payload);
      const userRole = payload.role;

      if (pathname === "/login") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      if (pathname.startsWith("/admin") && userRole !== "Admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    } catch (e) {
      console.log("JWT Verify Error:", e);
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/login"],
};
