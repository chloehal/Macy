// app/api/auth/login/route.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { hashPassword } from '@/lib/auth/password';

const ORIGINAL_ENV = { ...process.env };

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.PASSWORD_HASH = hashPassword('the-real-password');
    process.env.SESSION_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('sets a session cookie on the correct password', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'the-real-password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('macy_session=');
  });

  it('returns 401 on the wrong password', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
