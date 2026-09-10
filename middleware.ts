import { localAccessEnabled } from "@/lib/auth/local-access";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  if (localAccessEnabled()) {
    if (request.nextUrl.pathname === "/login")
      return NextResponse.redirect(new URL("/today", request.url));
    return NextResponse.next();
  }
  const isPublicPath =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/api/auth/login";

  if (isPublicPath) return NextResponse.next();

  const token = request.cookies.get("macy_session")?.value;
  const isValid =
    !!token && verifySessionToken(token, process.env.SESSION_SECRET!);

  if (!isValid) {
    if (request.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json(
        { error: "Reconnecte-toi pour continuer." },
        { status: 401 },
      );
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
