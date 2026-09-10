// @vitest-environment node
import { it, expect, vi } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getSettings, saveSettings } from "./store";
import { LocalEntryStore } from "../entries/store";
it("persists settings, preserves old regimes and retains a backup of legacy entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "macy-tracking-"));
  vi.stubEnv("MACY_STORAGE", "local");
  vi.stubEnv("MACY_DATA_DIR", dir);
  vi.stubEnv("DATE_DEBUT_PLAQUETTE", "2026-01-01");
  vi.stubEnv("PILULES_ACTIVES", "21");
  vi.stubEnv("JOURS_ARRET", "7");
  try {
    const initial = await getSettings();
    await saveSettings({ ...initial, sleepHours: 6.5 });
    expect((await getSettings()).sleepHours).toBe(6.5);
    await expect(saveSettings({ ...initial, regimens: [] })).rejects.toThrow();
    const legacy = {
      date: "2026-01-01",
      noteGlobale: 3,
      humeurBasse: 3,
      energie: 3,
      envieSucre: 3,
      crise: false,
      notes: "conserver",
      noteCrise: "",
    };
    const content = JSON.stringify([legacy]);
    await writeFile(join(dir, "entries.json"), content);
    const store = new LocalEntryStore(dir);
    await store.save({
      ...legacy,
      details: { sommeilHeures: 5, saignement: "Aucun" },
    });
    expect(
      await readFile(
        join(dir, "entries-before-detailed-tracking.json"),
        "utf8",
      ),
    ).toBe(content);
    expect((await store.list())[0].notes).toBe("conserver");
    expect((await store.list())[0].details?.sommeilHeures).toBe(5);
  } finally {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  }
});
