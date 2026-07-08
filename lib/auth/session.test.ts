// lib/auth/session.test.ts
import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

const SECRET = 'test-secret';

describe('session tokens', () => {
  it('accepts a freshly created token', () => {
    const token = createSessionToken(SECRET, 1_000_000);
    expect(verifySessionToken(token, SECRET, 1_000_001)).toBe(true);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken(SECRET, 1_000_000);
    expect(verifySessionToken(token, 'other-secret', 1_000_001)).toBe(false);
  });

  it('rejects an expired token', () => {
    const token = createSessionToken(SECRET, 1_000_000);
    const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
    expect(verifySessionToken(token, SECRET, 1_000_000 + THIRTY_ONE_DAYS_MS)).toBe(false);
  });

  it('rejects a malformed token', () => {
    expect(verifySessionToken('not-a-real-token', SECRET, 1_000_000)).toBe(false);
  });

  it('rejects an empty token', () => {
    expect(verifySessionToken('', SECRET, 1_000_000)).toBe(false);
  });

  it('rejects a token that is only a separator', () => {
    expect(verifySessionToken('.', SECRET, 1_000_000)).toBe(false);
  });

  it('rejects a token with an empty signature part', () => {
    expect(verifySessionToken('123.', SECRET, 1_000_000)).toBe(false);
  });

  it('rejects a token with an empty expiry part', () => {
    expect(verifySessionToken('.abc', SECRET, 1_000_000)).toBe(false);
  });
});
