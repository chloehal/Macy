import { it, expect, vi, afterEach } from "vitest";
import { localAccessEnabled } from "./local-access";
afterEach(() => vi.unstubAllEnvs());
it("only bypasses authentication with explicit development opt-in", () => {
  vi.stubEnv("MACY_LOCAL_NO_PASSWORD", "true");
  vi.stubEnv("NODE_ENV", "production");
  expect(localAccessEnabled()).toBe(false);
  vi.stubEnv("NODE_ENV", "development");
  expect(localAccessEnabled()).toBe(true);
  vi.stubEnv("MACY_LOCAL_NO_PASSWORD", "false");
  expect(localAccessEnabled()).toBe(false);
});
