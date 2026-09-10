"use client";
import { useEffect, useState } from "react";
import { TrackingNav } from "./nav";
import { Button } from "@/components/ui/button";
import { categories, detailFields } from "@/lib/entries/fields";
import { todayDate } from "@/lib/entries/model";
import type { Settings, Regimen } from "@/lib/tracking/model";
export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const [next, setNext] = useState<Regimen>({
      name: "",
      start: todayDate(),
      active: 21,
      pause: 7,
    }),
    [append, setAppend] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/tracking", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (alive) {
          setSettings(d.settings);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      if (
        dirty &&
        (e.target as HTMLElement).closest("a") &&
        !window.confirm("Quitter sans enregistrer les paramètres ?")
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", click);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", click);
    };
  }, [dirty]);
  function change(patch: Partial<Settings>) {
    setSettings((old) => (old ? { ...old, ...patch } : old));
    setSaved(false);
    setDirty(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          regimens: append ? [...settings.regimens, next] : settings.regimens,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSettings(d.settings);
      setAppend(false);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <a href="/today" className="mb-6 block text-xl font-semibold">
        macy.
      </a>
      <TrackingNav />
      <h1 className="text-3xl font-medium">Un suivi qui te ressemble.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Choisis tes repères et les contextes à signaler. Ces réglages servent au
        carnet, pas à recommander un traitement.
      </p>
      {error && (
        <p role="alert" className="my-5 border p-4">
          {error}
        </p>
      )}
      {!settings ? (
        <Button onClick={() => setRetry((r) => r + 1)}>
          Charger les paramètres
        </Button>
      ) : (
        <form onSubmit={save} className="mt-8">
          <fieldset disabled={busy} className="space-y-8">
            <section className="border p-5">
              <h2 className="mb-4 text-xl font-medium">
                Pilule et rythme de prise
              </h2>
              {settings.regimens.length === 0 ? (
                <p className="text-sm">
                  Aucune période configurée. Ajoute ta date réelle de début.
                </p>
              ) : (
                settings.regimens.map((r) => (
                  <div className="border-b py-3 text-sm" key={r.start}>
                    <strong>{r.name}</strong>
                    <p className="mt-1 text-muted-foreground">
                      Depuis le {r.start} · {r.active} jours actifs{" "}
                      {r.pause
                        ? `+ ${r.pause} jours de pause`
                        : "· prise continue"}
                    </p>
                  </div>
                ))
              )}
              <label className="mt-5 flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={append}
                  onChange={(e) => {
                    setAppend(e.target.checked);
                    setDirty(true);
                  }}
                />
                Ajouter une période de traitement
              </label>
              <p className="text-xs text-muted-foreground">
                Les anciennes périodes restent conservées pour ne pas
                réinterpréter l’historique. Un début réel de plaquette peut être
                indiqué dans le carnet.
              </p>
              {append && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ["name", "Nom de la pilule", "text"],
                    ["start", "Date de début du nouveau régime", "date"],
                    ["active", "Nombre de jours actifs", "number"],
                    ["pause", "Jours de pause (0 si continu)", "number"],
                  ].map(([key, label, type]) => (
                    <label className="text-sm" key={key}>
                      {label}
                      <input
                        className="mt-2 min-h-11 w-full border px-2"
                        required
                        type={type}
                        value={next[key as keyof Regimen]}
                        min={
                          type === "number"
                            ? key === "active"
                              ? 1
                              : 0
                            : settings.regimens.at(-1)?.start
                        }
                        max={
                          type === "number"
                            ? key === "active"
                              ? 365
                              : 60
                            : undefined
                        }
                        onChange={(e) => {
                          setNext((old) => ({
                            ...old,
                            [key]:
                              type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          }));
                          setDirty(true);
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>
            <section className="border p-5">
              <h2 className="text-xl font-medium">Points d’attention</h2>
              <p className="my-3 text-sm text-muted-foreground">
                Ce sont tes seuils de lecture, pas des seuils diagnostiques. Le
                manque d’information reste visible.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["sleepHours", "Sommeil court : moins de (h)", 0, 24, 0.25],
                  [
                    "stressThreshold",
                    "Stress élevé : à partir de (/5)",
                    1,
                    5,
                    1,
                  ],
                  [
                    "effortThreshold",
                    "Effort intense : à partir de (/5)",
                    1,
                    5,
                    1,
                  ],
                ].map(([key, label, min, max, step]) => (
                  <label className="text-sm" key={key}>
                    <span>{label}</span>
                    <input
                      className="mt-2 min-h-11 w-full border px-2"
                      required
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      value={
                        settings[
                          key as
                            "sleepHours" | "stressThreshold" | "effortThreshold"
                        ]
                      }
                      onChange={(e) =>
                        change({ [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Autres points : qualité du sommeil 1–2/5, maladie, alcool
                renseigné, événement inhabituel, changement de médicament,
                oubli. Aucun jour n’est supprimé.
              </p>
            </section>
            <section className="border p-5">
              <h2 className="text-xl font-medium">
                Paramètres visibles dans le carnet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Masquer un champ conserve toutes ses anciennes observations.
              </p>
              {categories.map((group) => (
                <div className="mt-5" key={group}>
                  <h3 className="mb-2 font-medium">{group}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detailFields
                      .filter((f) => f.group === group)
                      .map((f) => (
                        <label
                          className="flex min-h-10 items-center gap-2 text-sm"
                          key={f.key}
                        >
                          <input
                            type="checkbox"
                            checked={settings.enabled.includes(f.key)}
                            onChange={(e) =>
                              change({
                                enabled: e.target.checked
                                  ? [...settings.enabled, f.key]
                                  : settings.enabled.filter((k) => k !== f.key),
                              })
                            }
                          />
                          {f.label}
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </section>
            <Button type="submit" className="min-h-12 w-full rounded-none">
              {busy ? "Enregistrement…" : "Enregistrer les paramètres"}
            </Button>
          </fieldset>
          {saved && (
            <p role="status" className="mt-4 text-sm">
              Paramètres enregistrés.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
