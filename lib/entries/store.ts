import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parseEntry, type Entry } from "./model";

export class LocalEntryStore {
  private writes: Promise<void> = Promise.resolve();
  constructor(private directory: string) {}
  async list(): Promise<Entry[]> {
    try {
      const values: unknown = JSON.parse(
        await readFile(join(this.directory, "entries.json"), "utf8"),
      );
      if (!Array.isArray(values)) throw new Error("Invalid storage");
      return values
        .map(parseEntry)
        .sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  async save(input: Entry) {
    const entry = parseEntry(input);
    const operation = this.writes.then(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const entries = await this.list();
      // Preserve the original on-disk carnet before the first extended-format save.
      try {
        const previous = await readFile(join(this.directory, "entries.json"));
        await writeFile(
          join(this.directory, "entries-before-detailed-tracking.json"),
          previous,
          { flag: "wx", mode: 0o600 },
        );
      } catch (error) {
        if (
          !["ENOENT", "EEXIST"].includes(
            (error as NodeJS.ErrnoException).code || "",
          )
        )
          throw error;
      }

      const next = [
        entry,
        ...entries.filter((item) => item.date !== entry.date),
      ];
      const temporary = join(this.directory, `${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
      await rename(temporary, join(this.directory, "entries.json"));
    });
    this.writes = operation.catch(() => {});
    await operation;
    return entry;
  }
}
const globals = globalThis as typeof globalThis & {
  macyStore?: LocalEntryStore;
};
export function entryStore() {
  if (process.env.MACY_STORAGE !== "local")
    throw new Error("Configure MACY_STORAGE=local pour le stockage local.");
  return (globals.macyStore ??= new LocalEntryStore(
    process.env.MACY_DATA_DIR || join(process.cwd(), ".macy-data"),
  ));
}
