import { validDate } from "../entries/model";
import { detailFields } from "../entries/fields";
export type Regimen = {
  start: string;
  name: string;
  active: number;
  pause: number;
};
export type Settings = {
  regimens: Regimen[];
  sleepHours: number;
  stressThreshold: number;
  effortThreshold: number;
  enabled: string[];
};
export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") throw new Error("Paramètres invalides.");
  const s = raw as Settings;
  if (!Array.isArray(s.regimens) || s.regimens.length > 100)
    throw new Error("Historique invalide.");
  const regimens = s.regimens
    .map((r) => {
      if (
        !r ||
        !validDate(r.start) ||
        typeof r.name !== "string" ||
        !r.name.trim() ||
        r.name.length > 100 ||
        !Number.isInteger(r.active) ||
        r.active < 1 ||
        r.active > 365 ||
        !Number.isInteger(r.pause) ||
        r.pause < 0 ||
        r.pause > 60
      )
        throw new Error("Régime invalide.");
      return {
        start: r.start,
        name: r.name.trim(),
        active: r.active,
        pause: r.pause,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  if (new Set(regimens.map((r) => r.start)).size !== regimens.length)
    throw new Error("Une seule période peut commencer à une date donnée.");
  if (
    typeof s.sleepHours !== "number" ||
    s.sleepHours < 0 ||
    s.sleepHours > 24 ||
    !Number.isFinite(s.sleepHours)
  )
    throw new Error("Seuil de sommeil invalide.");
  for (const v of [s.stressThreshold, s.effortThreshold])
    if (!Number.isInteger(v) || v < 1 || v > 5)
      throw new Error("Seuil invalide.");
  if (
    !Array.isArray(s.enabled) ||
    s.enabled.some((k) => !detailFields.some((f) => f.key === k))
  )
    throw new Error("Paramètre suivi invalide.");
  return {
    regimens,
    sleepHours: s.sleepHours,
    stressThreshold: s.stressThreshold,
    effortThreshold: s.effortThreshold,
    enabled: [...new Set(s.enabled)],
  };
}
