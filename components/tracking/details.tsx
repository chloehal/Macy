"use client";
import { categories, detailFields, selections } from "@/lib/entries/fields";
import type { Entry } from "@/lib/entries/model";
import type { Settings } from "@/lib/tracking/model";
import { attention } from "@/lib/tracking/analysis";
export function EntryDetails({
  entry,
  settings,
  onChange,
}: {
  entry: Entry;
  settings: Settings | null;
  onChange: (e: Partial<Entry>) => void;
}) {
  const values = entry.details || {};
  const set = (key: string, value: string | number | boolean | null) =>
    onChange({ details: { ...values, [key]: value } });
  const flags = settings ? attention(entry, settings) : [];
  return (
    <div className="space-y-4">
      <div className="border p-4">
        <h2 className="mb-3 font-medium">Prise et événements</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(selections).map(([key, field]) => (
            <label key={key} className="text-sm">
              {field.label}
              <select
                className="mt-2 min-h-11 w-full border bg-background px-2"
                aria-label={field.label}
                value={String(values[key] ?? "")}
                onChange={(e) => set(key, e.target.value || null)}
              >
                <option value="">Non renseigné</option>
                {field.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-sm">
            Heure de prise
            <input
              type="time"
              className="mt-2 min-h-11 w-full border px-2"
              value={String(values.heurePrise ?? "")}
              onChange={(e) => set("heurePrise", e.target.value || null)}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.debutPlaquette === true}
              onChange={(e) => set("debutPlaquette", e.target.checked)}
            />
            Début réel d’une plaquette ce jour
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Une nouvelle plaquette renseignée recale les jours suivants. Le carnet
          ne fournit pas de consigne de rattrapage.
        </p>
      </div>
      {categories.map((group) => {
        const fields = detailFields.filter(
          (f) =>
            f.group === group &&
            (!settings || settings.enabled.includes(f.key)),
        );
        if (!fields.length) return null;
        return (
          <details key={group} className="border">
            <summary className="cursor-pointer px-4 py-4 font-medium">
              {group}
              <span className="float-right text-xs font-normal text-muted-foreground">
                {fields.filter((f) => values[f.key] != null).length}/
                {fields.length}
              </span>
            </summary>
            <div className="grid gap-5 border-t p-4 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className="text-sm">
                  {f.label}{" "}
                  <span className="text-muted-foreground">{f.unit}</span>
                  {f.unit === "/5" ? (
                    <select
                      className="mt-2 min-h-11 w-full border bg-background px-2"
                      aria-label={f.label}
                      value={String(values[f.key] ?? "")}
                      onChange={(e) =>
                        set(
                          f.key,
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">Non renseigné</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                          {n === 1
                            ? " · " + f.low
                            : n === 5
                              ? " · " + f.high
                              : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-2 min-h-11 w-full border px-2"
                      type="number"
                      min={f.min}
                      max={f.max}
                      step={f.step || 1}
                      value={(values[f.key] as number) ?? ""}
                      placeholder="Non renseigné"
                      onChange={(e) =>
                        set(
                          f.key,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  )}
                </label>
              ))}
              {group === "Sommeil" && (
                <label className="text-sm">
                  Heure du coucher
                  <input
                    className="mt-2 min-h-11 w-full border px-2"
                    type="time"
                    value={String(values.heureCoucher ?? "")}
                    onChange={(e) =>
                      set("heureCoucher", e.target.value || null)
                    }
                  />
                </label>
              )}
            </div>
          </details>
        );
      })}
      {flags.length > 0 && (
        <aside className="border-l-2 border-foreground bg-muted p-4 text-sm">
          <h3 className="font-medium">À garder en tête</h3>
          <p className="mt-2">{flags.join(" · ")}.</p>
          <p className="mt-2 text-muted-foreground">
            Ces contextes peuvent accompagner les variations observées. Ils ne
            rendent pas tes notes inutiles.
          </p>
        </aside>
      )}
    </div>
  );
}
