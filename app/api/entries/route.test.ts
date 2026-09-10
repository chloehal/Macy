// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "./route";
import { createSessionToken } from "@/lib/auth/session";
import { blankEntry } from "@/lib/entries/model";
const { list, save } = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue([]),
  save: vi.fn(),
}));
vi.mock("@/lib/entries/store", () => ({ entryStore: () => ({ list, save }) }));
vi.mock("@/lib/tracking/store", () => ({
  getSettings: async () => ({
    regimens: [],
    sleepHours: 7,
    stressThreshold: 4,
    effortThreshold: 4,
    enabled: [],
  }),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function req(method: string, body?: unknown, origin = "http://localhost") {
  vi.stubEnv("SESSION_SECRET", "test-secret");
  return new NextRequest("http://localhost/api/entries?date=2026-09-01", {
    method,
    headers: {
      Cookie: `macy_session=${createSessionToken("test-secret")}`,
      Origin: origin,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe("entry HTTP boundary", () => {
  it("rejects anonymous access without touching storage", async () => {
    expect(
      (
        await GET(
          new NextRequest("http://localhost/api/entries?date=2026-09-01"),
        )
      ).status,
    ).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });
  it("returns saved day and history", async () => {
    const entry = blankEntry("2026-09-01");
    list.mockResolvedValue([entry]);
    expect((await (await GET(req("GET"))).json()).entry).toEqual(entry);
  });
  it("rejects cross-origin and invalid entries before writing", async () => {
    expect(
      (await PUT(req("PUT", blankEntry("2026-09-01"), "https://other.test")))
        .status,
    ).toBe(403);
    expect(
      (await PUT(req("PUT", { ...blankEntry("2026-09-01"), energie: 6 })))
        .status,
    ).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });
  it("acknowledges only successful persistence", async () => {
    save.mockRejectedValue(new Error("disk unavailable"));
    expect((await PUT(req("PUT", blankEntry("2026-09-01")))).status).toBe(503);
  });
  it("accepts the browser host when Next normalizes the internal URL", async () => {
    const entry = blankEntry("2026-09-01");
    const request = req("PUT", entry, "http://127.0.0.1:5184");
    request.headers.set("host", "127.0.0.1:5184");
    save.mockResolvedValue(entry);
    expect((await PUT(request)).status).toBe(200);
  });
});
