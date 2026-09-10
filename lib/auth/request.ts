import { NextRequest, NextResponse } from "next/server";
import { localAccessEnabled } from "./local-access";
import { verifySessionToken } from "./session";
export function authorized(request: NextRequest) {
  if (localAccessEnabled()) return true;
  const secret = process.env.SESSION_SECRET,
    token = request.cookies.get("macy_session")?.value;
  return !!secret && !!token && verifySessionToken(token, secret);
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return (
      new URL(origin).host ===
      (request.headers.get("host") || request.nextUrl.host)
    );
  } catch {
    return false;
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
