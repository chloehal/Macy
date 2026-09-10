import { metrics, type Entry } from "../entries/model";
import { detailFields, type Field } from "../entries/fields";
import type { Settings } from "./model";
export const analysisFields: Field[] = [
  ...metrics.map((m) => ({
    ...m,
    group: "Quotidien",
    min: 1,
    max: 5,
    unit: "/5",
  })),
  ...detailFields,
];
export const dayNumber = (date: string) =>
  Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
export const dateFromDay = (day: number) =>
  new Date(day * 86400000).toISOString().slice(0, 10);
export function valueFor(entry: Entry, key: string): number | null {
  const value = key in entry ? entry[key as keyof Entry] : entry.details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function cycleFor(
  date: string,
  settings: Settings,
  entries: Entry[] = [],
) {
  const regimen = [...settings.regimens].reverse().find((r) => r.start <= date);
  if (!regimen) return null;
  const actual = entries
    .filter(
      (e) =>
        e.date <= date &&
        e.date >= regimen.start &&
        e.details?.debutPlaquette === true,
    )
    .map((e) => e.date)
    .sort()
    .at(-1);
  const anchor = actual || regimen.start,
    len = regimen.active + regimen.pause;
  const offset = dayNumber(date) - dayNumber(anchor),
    index = Math.floor(offset / len),
    day = (offset % len) + 1;
  const start = dateFromDay(dayNumber(anchor) + index * len);
  return {
    start,
    day,
    regimen,
    phase: day <= regimen.active ? "active" : "pause",
    key: regimen.start + "/" + start,
  };
}
export function attention(entry: Entry, s: Settings) {
  const d = entry.details || {},
    flags: string[] = [];
  if (typeof d.sommeilHeures === "number" && d.sommeilHeures < s.sleepHours)
    flags.push("Sommeil court");
  if (typeof d.sommeilQualite === "number" && d.sommeilQualite <= 2)
    flags.push("Sommeil de mauvaise qualité");
  if (typeof d.stress === "number" && d.stress >= s.stressThreshold)
    flags.push("Stress élevé");
  if (typeof d.effort === "number" && d.effort >= s.effortThreshold)
    flags.push("Effort intense");
  if (typeof d.alcool === "number" && d.alcool > 0)
    flags.push("Alcool renseigné");
  if (d.maladie === "Oui") flags.push("Maladie");
  if (d.evenement === "Oui") flags.push("Événement inhabituel");
  if (d.medicament === "Oui") flags.push("Changement de médicament");
  if (d.prise === "Oubli / non pris") flags.push("Oubli / non pris");
  return flags;
}
export function summarize(entries: Entry[], key: string) {
  const values = entries
    .map((e) => valueFor(e, key))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const n = values.length;
  return {
    n,
    mean: n ? values.reduce((a, b) => a + b, 0) / n : null,
    median: n
      ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2
      : null,
    min: n ? values[0] : null,
    max: n ? values[n - 1] : null,
  };
}
export function exportCsv(entries: Entry[]) {
  const keys = [
    "date",
    ...analysisFields.map((f) => f.key),
    "crise",
    "saignement",
    "prise",
    "heurePrise",
    "heureCoucher",
    "maladie",
    "evenement",
    "medicament",
    "notes",
    "noteCrise",
  ];
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      keys.join(";"),
      ...entries.map((e) =>
        keys
          .map((k) => cell(k in e ? e[k as keyof Entry] : e.details?.[k]))
          .join(";"),
      ),
    ].join("\r\n")
  );
}
