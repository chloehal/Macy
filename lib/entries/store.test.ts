// @vitest-environment node
import { it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalEntryStore } from "./store";
import { blankEntry } from "./model";
it("persists across instances and serializes writes without losing other days", async () => {
  const dir = await mkdtemp(join(tmpdir(), "macy-test-"));
  try {
    const store = new LocalEntryStore(dir);
    await Promise.all([
      store.save(blankEntry("2026-09-01")),
      store.save(blankEntry("2026-09-02")),
    ]);
    await store.save({ ...blankEntry("2026-09-01"), energie: 5 });
    const loaded = await new LocalEntryStore(dir).list();
    expect(loaded).toHaveLength(2);
    expect(loaded.find((p) => p.date === "2026-09-01")?.energie).toBe(5);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
