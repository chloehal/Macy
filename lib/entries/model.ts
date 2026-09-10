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
export type Entry = Record<Metric, number> & {
  date: string;
  crise: boolean;
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
      typeof raw[key] !== "number" ||
      !Number.isInteger(raw[key]) ||
      raw[key] < 1 ||
      raw[key] > 5
    )
      throw new Error("Les notes doivent être comprises entre 1 et 5.");
  if (typeof raw.crise !== "boolean") throw new Error("Marqueur invalide.");
  for (const key of ["notes", "noteCrise"])
    if (typeof raw[key] !== "string" || raw[key].length > 5000)
      throw new Error("Les notes sont limitées à 5 000 caractères.");
  return {
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
    noteGlobale: 3,
    humeurBasse: 3,
    energie: 3,
    envieSucre: 3,
    crise: false,
    noteCrise: "",
    notes: "",
  };
}
