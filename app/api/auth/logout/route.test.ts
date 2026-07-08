// app/api/auth/logout/route.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('clears the macy_session cookie', async () => {
    const response = await POST();
    expect(response.status).toBe(200);

    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('macy_session=;');
    expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
  });
});
