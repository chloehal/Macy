import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parseSettings, type Settings } from "./model";
import { detailFields } from "../entries/fields";
import { validDate } from "../entries/model";
function path() {
  if (process.env.MACY_STORAGE !== "local")
    throw new Error("Stockage local non configuré.");
  return join(
    process.env.MACY_DATA_DIR || join(process.cwd(), ".macy-data"),
    "settings.json",
  );
}
export async function getSettings(): Promise<Settings> {
  try {
    return parseSettings(JSON.parse(await readFile(path(), "utf8")));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const start = process.env.DATE_DEBUT_PLAQUETTE;
  return parseSettings({
    regimens: validDate(start)
      ? [
          {
            start,
            name: process.env.PILL_NAME || "Ma pilule",
            active: Number(process.env.PILULES_ACTIVES),
            pause: Number(process.env.JOURS_ARRET),
          },
        ]
      : [],
    sleepHours: 7,
    stressThreshold: 4,
    effortThreshold: 4,
    enabled: detailFields.map((f) => f.key),
  });
}
let writes: Promise<unknown> = Promise.resolve();
export async function saveSettings(raw: unknown) {
  const next = parseSettings(raw);
  const op = writes.then(async () => {
    const old = await getSettings();
    if (
      old.regimens.some(
        (r, i) => JSON.stringify(next.regimens[i]) !== JSON.stringify(r),
      )
    )
      throw new Error(
        "Les périodes historiques sont conservées. Ajoute une nouvelle période après la dernière.",
      );
    const file = path();
    await mkdir(join(file, ".."), { recursive: true, mode: 0o700 });
    const tmp = file + "." + randomUUID();
    await writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
    await rename(tmp, file);
    return next;
  });
  writes = op.catch(() => {});
  return op;
}
