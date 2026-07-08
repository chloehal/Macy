// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken } from '@/lib/auth/session';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };

  if (!password || !verifyPassword(password, process.env.PASSWORD_HASH!)) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
  }

  const token = createSessionToken(process.env.SESSION_SECRET!);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('macy_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
