import { describe, it, expect } from "vitest";
import { attention, cycleFor, summarize, exportCsv } from "./analysis";
import { blankEntry, parseEntry } from "../entries/model";
import { parseSettings, type Settings } from "./model";
const settings: Settings = {
  regimens: [{ start: "2026-01-01", name: "Test", active: 21, pause: 7 }],
  sleepHours: 7,
  stressThreshold: 4,
  effortThreshold: 4,
  enabled: [],
};
describe("tracking comparisons", () => {
  it("respects active/pause boundaries and refuses fictitious pre-treatment cycles", () => {
    expect(cycleFor("2025-12-31", settings)).toBeNull();
    expect(cycleFor("2026-01-21", settings)?.phase).toBe("active");
    expect(cycleFor("2026-01-22", settings)?.phase).toBe("pause");
    expect(cycleFor("2026-01-29", settings)?.day).toBe(1);
  });
  it("handles real starts, continuous regimens and a change without rewriting the past", () => {
    const entries = [
      { ...blankEntry("2026-01-28"), details: { debutPlaquette: true } },
    ];
    expect(cycleFor("2026-01-29", settings, entries)?.day).toBe(2);
    const next = {
      ...settings,
      regimens: [
        ...settings.regimens,
        { start: "2026-02-01", name: "Other", active: 28, pause: 0 },
      ],
    };
    expect(cycleFor("2026-01-22", next)?.regimen.name).toBe("Test");
    expect(cycleFor("2026-02-28", next)?.phase).toBe("active");
  });
  it("does not turn missing ratings into zero and keeps a real zero sleep duration", () => {
    const entries = [
      blankEntry("2026-01-01"),
      {
        ...blankEntry("2026-01-02"),
        energie: 4,
        details: { sommeilHeures: 0 },
      },
    ];
    expect(summarize(entries, "energie")).toMatchObject({
      n: 1,
      mean: 4,
      median: 4,
    });
    expect(summarize(entries, "sommeilHeures")).toMatchObject({
      n: 1,
      mean: 0,
    });
    expect(attention(entries[0], settings)).toEqual([]);
    expect(attention(entries[1], settings)).toContain("Sommeil court");
  });
  it("validates detailed values and preserves nullable absence", () => {
    const e = {
      ...blankEntry("2026-01-01"),
      details: { sommeilHeures: 6.25, saignement: "Aucun", maladie: null },
    };
    expect(parseEntry(e)).toEqual(e);
    expect(() => parseEntry({ ...e, details: { reveils: 1.5 } })).toThrow();
    expect(() =>
      parseEntry({ ...e, details: { sommeilHeures: 25 } }),
    ).toThrow();
    expect(() =>
      parseEntry({ ...e, details: { heurePrise: "25:30" } }),
    ).toThrow();
  });
  it("rejects invalid settings and neutralizes spreadsheet formulas", () => {
    expect(() => parseSettings({ ...settings, sleepHours: NaN })).toThrow();
    expect(
      exportCsv([{ ...blankEntry("2026-01-01"), notes: "=1+1" }]),
    ).toContain("'=1+1");
  });
});
