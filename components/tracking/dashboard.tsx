"use client";
import { useEffect, useMemo, useState } from "react";
import { TrackingNav } from "./nav";
import { Chart, type Series } from "./chart";
import { Button } from "@/components/ui/button";
import type { Entry } from "@/lib/entries/model";
import { todayDate } from "@/lib/entries/model";
import type { Settings } from "@/lib/tracking/model";
import {
  analysisFields,
  attention,
  cycleFor,
  dayNumber,
  dateFromDay,
  summarize,
  valueFor,
  exportCsv,
} from "@/lib/tracking/analysis";
const fmt = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("fr-BE", { maximumFractionDigits: 2 });
const colors = ["#18181b", "#2563eb", "#a855f7", "#059669"];
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Dashboard() {
  const [data, setData] = useState<{
      settings: Settings;
      entries: Entry[];
    } | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [compareStart, setCompareStart] = useState(""),
    [compareEnd, setCompareEnd] = useState("");
  const [context, setContext] = useState("all");
  const [metric, setMetric] = useState("energie"),
    [second, setSecond] = useState("sommeilHeures"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(todayDate),
    [exclude, setExclude] = useState(false),
    [chosen, setChosen] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    setError("");
    fetch("/api/tracking", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (alive) {
          setData(d);
          const first =
            d.settings.regimens[0]?.start ||
            d.entries.at(-1)?.date ||
            todayDate();
          setCompareStart(dateFromDay(dayNumber(first) - 28));
          setCompareEnd(dateFromDay(dayNumber(first) - 1));
          setStart(
            d.settings.regimens[0]?.start ||
              d.entries.at(-1)?.date ||
              todayDate(),
          );
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  const field = analysisFields.find((f) => f.key === metric)!;
  const period = useMemo(
    () =>
      data?.entries.filter(
        (e) => (!start || e.date >= start) && e.date <= end,
      ) || [],
    [data, start, end],
  );
  const rows = period.filter(
    (e) =>
      !exclude ||
      !attention(e, data!.settings).some(
        (flag) => context === "all" || context === flag,
      ),
  );
  const summary = summarize(rows, metric),
    allSummary = summarize(period, metric);
  const totalDays =
    start && end >= start ? dayNumber(end) - dayNumber(start) + 1 : 0;
  const grouped = new Map<
    string,
    {
      label: string;
      entries: Entry[];
      length: number;
      active: number;
      start: string;
      regimen: string;
    }
  >();
  for (const e of rows) {
    const c = cycleFor(e.date, data!.settings, data!.entries);
    if (c) {
      if (!grouped.has(c.key))
        grouped.set(c.key, {
          label: `${c.regimen.name} · ${c.start}`,
          entries: [],
          length: c.regimen.active + c.regimen.pause,
          active: c.regimen.active,
          start: c.start,
          regimen: c.regimen.start,
        });
      grouped.get(c.key)!.entries.push(e);
    }
  }
  const cycles = [...grouped.entries()].sort((a, b) =>
    a[1].start.localeCompare(b[1].start),
  );
  const selectedKeys =
    chosen === null
      ? cycles.slice(-4).map(([key]) => key)
      : chosen.filter((key) => cycles.some(([k]) => k === key));
  const visible = cycles.filter(([key]) => selectedKeys.includes(key));
  const series: Series[] = visible.map(([, group], i) => ({
    label: group.label,
    color: colors[i],
    points: Array.from({ length: group.length }, (_, index) => {
      const day = index + 1;
      const e = group.entries.find(
        (e) => cycleFor(e.date, data!.settings, data!.entries)?.day === day,
      );
      return {
        x: day,
        y: e ? valueFor(e, metric) : null,
        label: `J${day} · ${day <= group.active ? "actif" : "pause"}`,
      };
    }),
  }));
  const compatible =
    visible.length > 0 &&
    visible.every(
      ([, c]) =>
        c.regimen === visible[0][1].regimen &&
        c.length === visible[0][1].length,
    );
  const profile = compatible
    ? Array.from({ length: visible[0][1].length }, (_, i) => {
        const values = series
          .map((s) => s.points[i]?.y)
          .filter((v): v is number => typeof v === "number");
        return {
          day: i + 1,
          n: values.length,
          mean: values.length
            ? values.reduce((a, b) => a + b, 0) / values.length
            : null,
          min: values.length ? Math.min(...values) : null,
          max: values.length ? Math.max(...values) : null,
        };
      })
    : [];
  const flags = new Map<string, number>();
  for (const e of period)
    for (const flag of attention(e, data!.settings))
      flags.set(flag, (flags.get(flag) || 0) + 1);
  const unknownSleep = period.filter(
    (e) => valueFor(e, "sommeilHeures") === null,
  ).length;
  const phase = (name: string) =>
    rows.filter(
      (e) => cycleFor(e.date, data!.settings, data!.entries)?.phase === name,
    );
  const pairs = rows.filter(
    (e) => valueFor(e, metric) !== null && valueFor(e, second) !== null,
  );
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-6 flex items-center justify-between">
        <a href="/today" className="text-xl font-semibold">
          macy.
        </a>
        <span className="text-xs text-muted-foreground">
          Comprendre, à ton rythme
        </span>
      </header>
      <TrackingNav />
      <h1 className="text-3xl font-medium tracking-tight">
        Les nuances de ton quotidien.
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Compare tes observations, les plaquettes et leur contexte. Ces
        associations ne prouvent pas un effet de la pilule.
      </p>
      {error && (
        <div role="alert" className="my-6 border p-4">
          {error}
          <Button onClick={() => setRetry((r) => r + 1)}>Réessayer</Button>
        </div>
      )}
      {!data && !error && (
        <p role="status" className="py-10">
          Chargement du suivi…
        </p>
      )}
      {data && (
        <>
          <div className="my-8 grid gap-4 border-y py-5 sm:grid-cols-3">
            <label className="text-sm">
              Du
              <input
                className="mt-2 min-h-11 w-full border px-2"
                type="date"
                value={start}
                max={end}
                onChange={(e) => {
                  if (e.target.value && e.target.value <= end)
                    setStart(e.target.value);
                }}
              />
            </label>
            <label className="text-sm">
              Au
              <input
                className="mt-2 min-h-11 w-full border px-2"
                type="date"
                value={end}
                min={start}
                max={todayDate()}
                onChange={(e) => {
                  if (
                    e.target.value &&
                    e.target.value >= start &&
                    e.target.value <= todayDate()
                  )
                    setEnd(e.target.value);
                }}
              />
            </label>
            <label className="text-sm">
              Indicateur
              <select
                className="mt-2 min-h-11 w-full border bg-background px-2"
                aria-label="Indicateur"
                value={metric}
                onChange={(e) => {
                  setMetric(e.target.value);
                  if (second === e.target.value)
                    setSecond(
                      analysisFields.find((f) => f.key !== e.target.value)!.key,
                    );
                }}
              >
                {analysisFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.unit})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Journées enregistrées", `${period.length} / ${totalDays}`],
              ["Observations retenues", `${summary.n} / ${rows.length}`],
              [
                `Moyenne · ${field.label}`,
                `${fmt(summary.mean)} ${field.unit}`,
              ],
              ["Plaquettes documentées", String(cycles.length)],
            ].map(([label, value]) => (
              <div className="border p-4" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-3 text-2xl tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <section className="my-8 border-l-2 border-foreground bg-muted p-5">
            <h2 className="font-medium">Points d’attention</h2>
            <p className="mt-2 text-sm">
              {summary.n < 7
                ? "Moins de 7 observations pour cet indicateur : lecture descriptive, encore très partielle."
                : "Les jours renseignés ne représentent pas nécessairement toute la période."}{" "}
              {cycles.length < 2
                ? "Une seconde plaquette renseignée sera nécessaire pour comparer deux plaquettes."
                : ""}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {[...flags].map(([label, n]) => (
                <li key={label}>
                  {label} : {n} journée{n > 1 ? "s" : ""}.
                </li>
              ))}
              <li>
                Sommeil non renseigné : {unknownSleep}/{period.length} journées
                ; aucune durée n’est supposée.
              </li>
            </ul>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={exclude}
                onChange={(e) => setExclude(e.target.checked)}
              />
              Comparer sans les journées portant un point d’attention
            </label>
            <label className="my-3 block text-sm">
              Contexte à exclure
              <select
                className="ml-3 min-h-11 border bg-background px-2"
                aria-label="Contexte à exclure"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              >
                <option value="all">Tous les points d’attention</option>
                {[
                  ...new Set([
                    ...data.entries.flatMap((e) => attention(e, data.settings)),
                    ...(context === "all" ? [] : [context]),
                  ]),
                ].map((flag) => (
                  <option key={flag}>{flag}</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">
              {period.length - rows.length} exclues · {rows.length} conservées.
              Les jours sans contexte renseigné restent inclus. Moyenne avant
              filtre : {fmt(allSummary.mean)} ({allSummary.n} observations).
              Seuils ajustables dans Paramètres.
            </p>
          </section>
          <section className="border p-5">
            <h2 className="text-xl font-medium">Comparer les plaquettes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Alignement par jour de plaquette ; au maximum quatre courbes. Les
              points absents restent vides. La phase est celle du régime prévu,
              les oublis restent signalés séparément.
            </p>
            <div className="my-4 flex flex-wrap gap-3">
              {cycles.map(([key, c]) => (
                <label
                  key={key}
                  className="flex min-h-11 items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    disabled={
                      !selectedKeys.includes(key) && selectedKeys.length >= 4
                    }
                    onChange={(e) => {
                      const base = selectedKeys;
                      setChosen(
                        e.target.checked
                          ? [...base, key]
                          : base.filter((k) => k !== key),
                      );
                    }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
            {series.length ? (
              <Chart
                series={series}
                field={field}
                maxX={Math.max(...visible.map(([, c]) => c.length))}
              />
            ) : (
              <p className="py-8 text-sm text-muted-foreground">
                Renseigne une journée dans une période configurée pour afficher
                une courbe.
              </p>
            )}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="py-3">Plaquette</th>
                    <th>Moyenne</th>
                    <th>Médiane</th>
                    <th>Min–max</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map(([k, c]) => {
                    const s = summarize(c.entries, metric);
                    return (
                      <tr className="border-t" key={k}>
                        <th className="py-3 pr-3 font-normal">{c.label}</th>
                        <td>{fmt(s.mean)}</td>
                        <td>{fmt(s.median)}</td>
                        <td>
                          {fmt(s.min)}–{fmt(s.max)}
                        </td>
                        <td>
                          {s.n}/{c.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="my-6 grid gap-6 lg:grid-cols-2">
            <section className="border p-5">
              <h2 className="text-xl font-medium">Actifs et pause</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {field.label} · uniquement les dates avec une période
                configurée.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  ["active", "Jours actifs"],
                  ["pause", "Pause"],
                ].map(([key, label]) => {
                  const s = summarize(phase(key), metric);
                  return (
                    <div key={key}>
                      <p className="text-sm">{label}</p>
                      <p className="my-2 text-2xl">{fmt(s.mean)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.n} observations · médiane {fmt(s.median)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Une différence peut aussi accompagner le sommeil, le stress ou
                un autre contexte. Les rythmes continus n’ont pas de pause
                supposée.
              </p>
            </section>
            <section className="border p-5">
              <h2 className="text-xl font-medium">Événements renseignés</h2>
              {[
                [
                  "Crises",
                  rows.filter((e) => e.crise === true).length,
                  rows.filter((e) => e.crise !== null).length,
                ],
                [
                  "Saignements",
                  rows.filter(
                    (e) =>
                      e.details?.saignement && e.details.saignement !== "Aucun",
                  ).length,
                  rows.filter((e) => e.details?.saignement != null).length,
                ],
                [
                  "Oublis / non pris",
                  rows.filter((e) => e.details?.prise === "Oubli / non pris")
                    .length,
                  rows.filter((e) => e.details?.prise != null).length,
                ],
              ].map(([l, n, d]) => (
                <p className="mt-4 flex justify-between text-sm" key={l}>
                  <span>{l}</span>
                  <span>
                    {n}/{d} jours renseignés
                  </span>
                </p>
              ))}
            </section>
          </div>
          <section className="my-6 border p-5">
            <h2 className="text-xl font-medium">Profil moyen par jour</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Même régime uniquement, parmi les plaquettes affichées.
              L’intervalle min–max décrit les observations, pas une prévision.
            </p>
            {compatible ? (
              <>
                <Chart
                  field={field}
                  maxX={profile.length}
                  series={[
                    {
                      label: "Moyenne des plaquettes sélectionnées",
                      color: colors[0],
                      points: profile.map((p) => ({
                        x: p.day,
                        y: p.mean,
                        label: `J${p.day} · ${p.n} observations`,
                      })),
                    },
                  ]}
                />
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm">
                    Valeurs, dispersion et nombre d’observations
                  </summary>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Jour</th>
                          <th>Moyenne</th>
                          <th>Min–max</th>
                          <th>n</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.map((p) => (
                          <tr key={p.day}>
                            <td>J{p.day}</td>
                            <td>{fmt(p.mean)}</td>
                            <td>
                              {fmt(p.min)}–{fmt(p.max)}
                            </td>
                            <td>{p.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <p className="py-6 text-sm">
                Sélectionne des plaquettes du même régime pour obtenir un profil
                comparable.
              </p>
            )}
          </section>
          <section className="my-6 border p-5">
            <h2 className="text-xl font-medium">
              Mettre deux paramètres en regard
            </h2>
            <label className="mt-4 block text-sm">
              Comparer {field.label} avec
              <select
                className="mt-2 min-h-11 w-full border bg-background px-2"
                aria-label="Paramètre de comparaison"
                value={second}
                onChange={(e) => setSecond(e.target.value)}
              >
                {analysisFields
                  .filter((f) => f.key !== metric)
                  .map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({f.unit})
                    </option>
                  ))}
              </select>
            </label>
            <p className="my-3 text-xs text-muted-foreground">
              {pairs.length} journées avec les deux mesures. Chaque unité reste
              distincte ; aucune causalité n’est calculée.
            </p>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{field.label}</th>
                    <th>
                      {analysisFields.find((f) => f.key === second)?.label}
                    </th>
                    <th>Contexte</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((e) => (
                    <tr className="border-t" key={e.date}>
                      <td className="py-3 pr-2">{e.date}</td>
                      <td>{valueFor(e, metric)}</td>
                      <td>{valueFor(e, second)}</td>
                      <td className="text-xs">
                        {attention(e, data.settings).join(", ") ||
                          "Aucun signal renseigné"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="my-6 border p-5">
            <h2 className="text-xl font-medium">Calendrier des observations</h2>
            <p className="my-3 text-xs text-muted-foreground">
              {field.label} : intensité de {field.min} à {field.max}{" "}
              {field.unit}. « — » = mesure absente. Derniers 90 jours de la
              plage ; clique pour revoir la journée.
            </p>
            <div className="grid grid-cols-7 gap-1 sm:grid-cols-10">
              {Array.from({ length: Math.min(90, totalDays) }, (_, i) =>
                dateFromDay(dayNumber(end) - Math.min(90, totalDays) + 1 + i),
              ).map((date) => {
                const e = rows.find((e) => e.date === date),
                  value = e ? valueFor(e, metric) : null;
                return (
                  <a
                    href={`/today?date=${date}`}
                    key={date}
                    title={`${date} : ${value ?? "non renseigné"} ${e ? attention(e, data.settings).join(", ") : ""}`}
                    className="border p-2 text-center text-xs"
                    style={
                      value !== null
                        ? {
                            background: `rgba(24,24,27,${0.06 + (0.2 * (value - field.min)) / (field.max - field.min || 1)})`,
                          }
                        : {}
                    }
                  >
                    <span className="block">
                      {date.slice(8)}/{date.slice(5, 7)}
                    </span>
                    <strong>{value ?? "—"}</strong>
                    {e?.details?.saignement &&
                    e.details.saignement !== "Aucun" ? (
                      <span aria-label="Saignement renseigné"> ·</span>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </section>
          <section className="my-6 border p-5">
            <h2 className="text-xl font-medium">Comparer deux périodes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              La période principale est celle des filtres en haut. Choisis une
              période de référence ; aucun jour absent n’est complété.
            </p>
            <div className="my-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Référence du
                <input
                  className="mt-2 min-h-11 w-full border px-2"
                  type="date"
                  value={compareStart}
                  max={compareEnd}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= compareEnd)
                      setCompareStart(e.target.value);
                  }}
                />
              </label>
              <label className="text-sm">
                Référence au
                <input
                  className="mt-2 min-h-11 w-full border px-2"
                  type="date"
                  value={compareEnd}
                  min={compareStart}
                  max={todayDate()}
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      e.target.value >= compareStart &&
                      e.target.value <= todayDate()
                    )
                      setCompareEnd(e.target.value);
                  }}
                />
              </label>
            </div>
            {(() => {
              const reference = data.entries.filter(
                (e) =>
                  e.date >= compareStart &&
                  e.date <= compareEnd &&
                  (!exclude ||
                    !attention(e, data.settings).some(
                      (flag) => context === "all" || context === flag,
                    )),
              );
              const s = summarize(reference, metric);
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="border p-3 text-sm">
                    Période principale : {fmt(summary.mean)} {field.unit} ·{" "}
                    {summary.n} mesures
                  </p>
                  <p className="border p-3 text-sm">
                    Référence : {fmt(s.mean)} {field.unit} · {s.n} mesures
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Écart des moyennes :{" "}
                    {summary.mean !== null && s.mean !== null
                      ? fmt(summary.mean - s.mean)
                      : "non calculable sans mesures dans les deux périodes"}
                    . Les mêmes exclusions de contexte sont appliquées.
                  </p>
                  {compareStart <= end && compareEnd >= start && (
                    <p className="text-xs text-muted-foreground">
                      Attention : les plages se chevauchent et partagent
                      potentiellement des observations.
                    </p>
                  )}
                </div>
              );
            })()}
          </section>
          <section className="my-6 border p-5">
            <h2 className="text-xl font-medium">Périodes de traitement</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Comparaison descriptive des périodes documentées ; aucune
              référence avant traitement n’est inventée.
            </p>
            {data.settings.regimens.map((r) => {
              const es = rows.filter(
                  (e) =>
                    cycleFor(e.date, data.settings, data.entries)?.regimen
                      .start === r.start,
                ),
                s = summarize(es, metric);
              return (
                <p className="mt-3 text-sm" key={r.start}>
                  {r.name} · depuis le {r.start} · {r.active}+{r.pause} :{" "}
                  {fmt(s.mean)} {field.unit} ({s.n} observations).
                </p>
              );
            })}
          </section>
          <footer className="my-8 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                download(
                  "macy-observations.csv",
                  exportCsv(rows),
                  "text/csv;charset=utf-8",
                )
              }
            >
              Exporter la sélection CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  "macy-sauvegarde.json",
                  JSON.stringify({ version: 2, ...data }, null, 2),
                  "application/json",
                )
              }
            >
              Sauvegarde complète JSON
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Imprimer la synthèse
            </Button>
          </footer>
          <p className="text-xs text-muted-foreground">
            Les anciennes notes du carnet minimal sont conservées ; une ancienne
            valeur à 3 peut provenir du réglage initial. Les nouvelles mesures
            restent vides tant qu’elles ne sont pas renseignées.
          </p>
        </>
      )}
    </main>
  );
}
