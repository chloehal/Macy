import { describe, it, expect } from "vitest";
import { parseEntry, validDate } from "./model";
const entry = {
  date: "2026-09-10",
  noteGlobale: 3,
  humeurBasse: 2,
  energie: 4,
  envieSucre: 3,
  crise: false,
  notes: "",
  noteCrise: "",
};
describe("daily entry validation", () => {
  it("accepts the full entry and strips untrusted fields", () => {
    expect(parseEntry({ ...entry, packDay: 999 })).toEqual(entry);
  });
  it("rejects invalid dates, future dates and out of scale values", () => {
    expect(validDate("2026-02-30")).toBe(false);
    for (const patch of [
      { date: "2999-01-01" },
      { energie: 0 },
      { energie: 6 },
      { energie: 2.5 },
      { crise: "false" },
      { notes: "a".repeat(5001) },
    ])
      expect(() => parseEntry({ ...entry, ...patch })).toThrow();
  });
});
