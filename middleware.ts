// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/session';

export function middleware(request: NextRequest) {
  const isPublicPath = request.nextUrl.pathname === '/login'
    || request.nextUrl.pathname === '/api/auth/login';

  if (isPublicPath) return NextResponse.next();

  const token = request.cookies.get('macy_session')?.value;
  const isValid = !!token && verifySessionToken(token, process.env.SESSION_SECRET!);

  if (!isValid) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
};
