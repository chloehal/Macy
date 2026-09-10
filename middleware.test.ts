// middleware.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { createSessionToken } from '@/lib/auth/session';

const ORIGINAL_ENV = { ...process.env };
const TEST_SECRET = 'test-secret';

describe('middleware', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('redirects to /login when no session cookie is present on a protected path', () => {
    const request = new NextRequest(new URL('/today', 'http://localhost:3000'));
    const response = middleware(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  it('passes through when a valid session cookie is present on a protected path', () => {
    const token = createSessionToken(TEST_SECRET);
    const request = new NextRequest(new URL('/today', 'http://localhost:3000'), {
      headers: { Cookie: `macy_session=${token}` },
    });
    const response = middleware(request);

    expect(response.status).not.toBe(307);
    expect(response.status).not.toBe(308);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects to /login when the session cookie is expired/invalid', () => {
    const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // matches lib/auth/session.ts
    // createSessionToken sets expires = now + TTL, so to get a token whose
    // expiry is already in the past, shift the reference "now" back by more
    // than the TTL.
    const expiredToken = createSessionToken(TEST_SECRET, Date.now() - SESSION_TTL_MS - 1000);
    const request = new NextRequest(new URL('/today', 'http://localhost:3000'), {
      headers: { Cookie: `macy_session=${expiredToken}` },
    });
    const response = middleware(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  it('passes through /login with no cookie', () => {
    const request = new NextRequest(new URL('/login', 'http://localhost:3000'));
    const response = middleware(request);

    expect(response.status).not.toBe(307);
    expect(response.status).not.toBe(308);
    expect(response.headers.get('location')).toBeNull();
  });

  it('passes through /api/auth/login with no cookie', () => {
    const request = new NextRequest(new URL('/api/auth/login', 'http://localhost:3000'));
    const response = middleware(request);

    expect(response.status).not.toBe(307);
    expect(response.status).not.toBe(308);
    expect(response.headers.get('location')).toBeNull();
  });
});
