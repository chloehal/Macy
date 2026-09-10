import { detailFields, selections } from "./fields";
export const metrics = [
  {
    key: "noteGlobale",
    label: "Globalement",
    low: "Difficile",
    high: "Facile",
  },
  {
    key: "humeurBasse",
    label: "Humeur basse",
    low: "Pas du tout",
    high: "Beaucoup",
  },
  { key: "energie", label: "Énergie", low: "Basse", high: "Haute" },
  { key: "envieSucre", label: "Envie de sucré", low: "Aucune", high: "Forte" },
] as const;
export type Metric = (typeof metrics)[number]["key"];
export type Entry = Record<Metric, number | null> & {
  date: string;
  crise: boolean | null;
  details?: Record<string, number | string | boolean | null>;
  noteCrise: string;
  notes: string;
};
export function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function parseEntry(value: unknown): Entry {
  if (!value || typeof value !== "object") throw new Error("Saisie invalide.");
  const raw = value as Record<string, unknown>;
  if (!validDate(raw.date) || raw.date > todayDate())
    throw new Error("Choisis une date valide, aujourd’hui ou dans le passé.");
  for (const { key } of metrics)
    if (
      raw[key] !== null &&
      (typeof raw[key] !== "number" ||
        !Number.isInteger(raw[key]) ||
        raw[key] < 1 ||
        raw[key] > 5)
    )
      throw new Error("Les notes doivent être comprises entre 1 et 5.");
  if (raw.crise !== null && typeof raw.crise !== "boolean")
    throw new Error("Marqueur invalide.");
  for (const key of ["notes", "noteCrise"])
    if (typeof raw[key] !== "string" || raw[key].length > 5000)
      throw new Error("Les notes sont limitées à 5 000 caractères.");
  let details: Entry["details"];
  if (raw.details !== undefined) {
    if (
      !raw.details ||
      typeof raw.details !== "object" ||
      Array.isArray(raw.details)
    )
      throw new Error("Détails invalides.");
    const input = raw.details as Record<string, unknown>;
    details = {};
    for (const field of detailFields) {
      const v = input[field.key];
      if (v === undefined) continue;
      if (
        v !== null &&
        (typeof v !== "number" ||
          !Number.isFinite(v) ||
          v < field.min ||
          v > field.max ||
          Math.abs(v / (field.step || 1) - Math.round(v / (field.step || 1))) >
            1e-8)
      )
        throw new Error(`${field.label} : valeur invalide.`);
      details[field.key] = v as number | null;
    }
    for (const [key, field] of Object.entries(selections)) {
      const v = input[key];
      if (v === undefined) continue;
      if (v !== null && !(field.options as readonly unknown[]).includes(v))
        throw new Error(`${field.label} : valeur invalide.`);
      details[key] = v as string | null;
    }
    for (const key of ["heurePrise", "heureCoucher"]) {
      const v = input[key];
      if (v === undefined) continue;
      if (
        v !== null &&
        (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
      )
        throw new Error("Heure invalide.");
      details[key] = v as string | null;
    }
    if (input.debutPlaquette !== undefined) {
      if (typeof input.debutPlaquette !== "boolean")
        throw new Error("Début invalide.");
      details.debutPlaquette = input.debutPlaquette;
    }
  }
  return {
    ...(details ? { details } : {}),
    date: raw.date,
    noteGlobale: raw.noteGlobale as number,
    humeurBasse: raw.humeurBasse as number,
    energie: raw.energie as number,
    envieSucre: raw.envieSucre as number,
    crise: raw.crise,
    noteCrise: raw.noteCrise as string,
    notes: raw.notes as string,
  };
}
export function blankEntry(date: string): Entry {
  return {
    date,
    noteGlobale: null,
    humeurBasse: null,
    energie: null,
    envieSucre: null,
    crise: null,
    noteCrise: "",
    notes: "",
  };
}
