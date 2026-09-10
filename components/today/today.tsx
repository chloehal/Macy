"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  blankEntry,
  metrics,
  todayDate,
  type Entry,
} from "@/lib/entries/model";

export function Today() {
  const router = useRouter();
  const [date, setDate] = useState(todayDate);
  const [entry, setEntry] = useState<Entry>(() => blankEntry(todayDate()));
  const [history, setHistory] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(true),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false),
    [retry, setRetry] = useState(0);
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [cycle, setCycle] = useState<string | null>(null);
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setBusy(true);
    setLoaded(false);
    setError("");
    setSaved(false);
    fetch(`/api/entries?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          throw new Error("Reconnecte-toi pour continuer.");
        }
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Chargement impossible.");
        if (!ignore) {
          setEntry(data.entry || blankEntry(date));
          setHistory(data.history);
          setCycle(data.cycle);
          setDirty(false);
          setLoaded(true);
        }
      })
      .catch((error) => {
        if (!ignore) setError(error.message);
      })
      .finally(() => {
        if (!ignore) setBusy(false);
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [date, router, retry]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(patch: Partial<Entry>) {
    setEntry((old) => ({ ...old, ...patch }));
    setDirty(true);
    setSaved(false);
  }
  function chooseDate(next: string) {
    if (!next || next === date) return;
    if (
      dirty &&
      !window.confirm(
        "Changer de date et abandonner les modifications non enregistrées ?",
      )
    )
      return;
    setDate(next);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!loaded || entry.date !== date || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Enregistrement impossible.");
      setSaved(true);
      setDirty(false);
      setHistory((old) =>
        [data.entry, ...old.filter((p) => p.date !== date)].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function logout() {
    if (dirty && !window.confirm("Quitter sans enregistrer ?")) return;
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Déconnexion impossible. Réessaie.");
    }
  }
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex items-center justify-between border-b pb-5">
        <a href="/today" className="text-xl font-semibold tracking-tight">
          macy<span className="text-muted-foreground">.</span>
        </a>
        <Button variant="ghost" onClick={logout} disabled={saving}>
          Se déconnecter
        </Button>
      </header>
      <div className="mb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Mon carnet quotidien
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Comment se passe ta journée ?
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Quelques repères, sans jugement. Juste pour garder une trace.
        </p>
      </div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <label className="space-y-2 text-sm">
          Journée
          <Input
            aria-label="Journée"
            type="date"
            value={date}
            max={todayDate()}
            disabled={saving}
            onChange={(e) => chooseDate(e.target.value)}
          />
        </label>
        {cycle && <p className="text-sm text-muted-foreground">{cycle}</p>}
      </div>
      {busy ? (
        <p role="status" className="py-12 text-muted-foreground">
          Chargement de ta journée…
        </p>
      ) : (
        <form onSubmit={save}>
          <fieldset
            disabled={saving || !loaded || entry.date !== date}
            className="space-y-8"
          >
            <div className="divide-y border-y">
              {metrics.map((metric) => (
                <div key={metric.key} className="py-6">
                  <div className="mb-5 flex justify-between">
                    <label id={metric.key} className="font-medium">
                      {metric.label}
                    </label>
                    <span className="font-mono text-sm tabular-nums">
                      {entry[metric.key]}{" "}
                      <span className="text-muted-foreground">/ 5</span>
                    </span>
                  </div>
                  <Slider
                    aria-labelledby={metric.key}
                    value={[entry[metric.key]]}
                    min={1}
                    max={5}
                    step={1}
                    disabled={saving}
                    onValueChange={(value) =>
                      change({
                        [metric.key]: Array.isArray(value) ? value[0] : value,
                      })
                    }
                  />
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>1 · {metric.low}</span>
                    <span>5 · {metric.high}</span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  className="size-5 accent-black"
                  type="checkbox"
                  checked={entry.crise}
                  onChange={(e) => change({ crise: e.target.checked })}
                />
                <span>Une crise aujourd’hui</span>
              </label>
              {entry.crise && (
                <label className="mt-3 block text-sm">
                  Quelques mots, si tu le souhaites
                  <textarea
                    className="mt-2 min-h-24 w-full border bg-background p-3"
                    maxLength={5000}
                    value={entry.noteCrise}
                    onChange={(e) => change({ noteCrise: e.target.value })}
                  />
                </label>
              )}
            </div>
            <label className="block text-sm">
              Une note pour cette journée{" "}
              <span className="text-muted-foreground">· facultatif</span>
              <textarea
                className="mt-3 min-h-24 w-full border bg-background p-3"
                placeholder="Ce que tu aimerais retenir…"
                maxLength={5000}
                value={entry.notes}
                onChange={(e) => change({ notes: e.target.value })}
              />
            </label>
            <Button type="submit" className="min-h-12 w-full rounded-none">
              {saving
                ? "Enregistrement…"
                : saved
                  ? "Journée enregistrée"
                  : "Enregistrer ma journée"}
            </Button>
          </fieldset>
          {saved && (
            <p
              role="status"
              className="mt-3 text-center text-sm text-muted-foreground"
            >
              C’est enregistré. Tu peux revenir modifier cette journée.
            </p>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 border p-4 text-sm">
          {error} Ta saisie reste affichée.
        </p>
      )}
      {!busy && !loaded && (
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setRetry((value) => value + 1)}
        >
          Réessayer le chargement
        </Button>
      )}
      <section className="mt-12">
        <h2 className="mb-4 text-lg font-medium">Les derniers jours</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tes journées enregistrées apparaîtront ici.
          </p>
        ) : (
          <div className="divide-y border-y">
            {history.slice(0, 14).map((item) => (
              <button
                disabled={saving}
                type="button"
                onClick={() => chooseDate(item.date)}
                className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left text-sm hover:bg-muted"
                key={item.date}
              >
                <span>
                  {new Date(item.date + "T12:00:00").toLocaleDateString(
                    "fr-BE",
                    { weekday: "short", day: "numeric", month: "long" },
                  )}
                </span>
                <span className="text-muted-foreground">
                  {item.crise ? "Crise notée · " : ""}Revoir →
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
