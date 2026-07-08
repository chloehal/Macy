import { describe, it, expect } from 'vitest';
import { calcPackDay, isActiveDay } from './pack-day';

describe('calcPackDay', () => {
  const start = '2026-01-01';
  const pilulesActives = 21;
  const joursArret = 7;

  it('returns 1 on the start date', () => {
    expect(calcPackDay(start, start, pilulesActives, joursArret)).toBe(1);
  });

  it('returns 21 on the last active day', () => {
    expect(calcPackDay('2026-01-21', start, pilulesActives, joursArret)).toBe(21);
  });

  it('returns 22 on the first stop day', () => {
    expect(calcPackDay('2026-01-22', start, pilulesActives, joursArret)).toBe(22);
  });

  it('returns 28 on the last stop day', () => {
    expect(calcPackDay('2026-01-28', start, pilulesActives, joursArret)).toBe(28);
  });

  it('wraps around to 1 at the start of the next pack', () => {
    expect(calcPackDay('2026-01-29', start, pilulesActives, joursArret)).toBe(1);
  });

  it('handles dates before the reference start date', () => {
    expect(calcPackDay('2025-12-31', start, pilulesActives, joursArret)).toBe(28);
  });
});

describe('isActiveDay', () => {
  it('is true up to and including pilulesActives', () => {
    expect(isActiveDay(21, 21)).toBe(true);
    expect(isActiveDay(1, 21)).toBe(true);
  });

  it('is false past pilulesActives', () => {
    expect(isActiveDay(22, 21)).toBe(false);
  });
});
