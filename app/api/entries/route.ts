import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { entryStore } from "@/lib/entries/store";
import { parseEntry, validDate } from "@/lib/entries/model";
import { calcPackDay } from "@/lib/cycle/pack-day";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function authorized(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const token = request.cookies.get("macy_session")?.value;
  return !!secret && !!token && verifySessionToken(token, secret);
}
function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function GET(request: NextRequest) {
  if (!authorized(request))
    return json({ error: "Reconnecte-toi pour continuer." }, 401);
  const date = request.nextUrl.searchParams.get("date");
  if (!validDate(date)) return json({ error: "Date invalide." }, 400);
  try {
    const history = await entryStore().list();
    let cycle: string | null = null;
    const start = process.env.DATE_DEBUT_PLAQUETTE;
    const active = Number(process.env.PILULES_ACTIVES),
      rest = Number(process.env.JOURS_ARRET);
    if (
      validDate(start) &&
      Number.isInteger(active) &&
      active > 0 &&
      Number.isInteger(rest) &&
      rest >= 0
    ) {
      const day = calcPackDay(date, start, active, rest);
      cycle = `Jour ${day} · ${day <= active ? "plaquette" : "pause"}`;
    }
    return json({
      entry: history.find((p) => p.date === date) || null,
      history: history.slice(0, 30),
      cycle,
    });
  } catch {
    return json(
      {
        error:
          "Impossible de lire le carnet. Vérifie la configuration du stockage.",
      },
      503,
    );
  }
}
export async function PUT(request: NextRequest) {
  if (!authorized(request))
    return json({ error: "Reconnecte-toi pour continuer." }, 401);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (
        new URL(origin).host !==
        (request.headers.get("host") || request.nextUrl.host)
      )
        return json({ error: "Origine refusée." }, 403);
    } catch {
      return json({ error: "Origine refusée." }, 403);
    }
  }
  let entry;
  try {
    entry = parseEntry(await request.json());
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Saisie invalide." },
      400,
    );
  }
  try {
    return json({ entry: await entryStore().save(entry) });
  } catch {
    return json(
      { error: "Enregistrement impossible. Réessaie sans fermer cette page." },
      503,
    );
  }
}
