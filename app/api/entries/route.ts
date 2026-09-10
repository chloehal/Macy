import { localAccessEnabled } from "@/lib/auth/local-access";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { entryStore } from "@/lib/entries/store";
import { parseEntry, validDate } from "@/lib/entries/model";
import { getSettings } from "@/lib/tracking/store";
import { cycleFor } from "@/lib/tracking/analysis";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function authorized(request: NextRequest) {
  if (localAccessEnabled()) return true;
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
    const settings = await getSettings();
    const position = cycleFor(date, settings, history);
    const cycle = position
      ? `${position.regimen.name} · Jour ${position.day} · ${position.phase === "active" ? "prise active" : "pause"}`
      : null;
    return json({
      entry: history.find((p) => p.date === date) || null,
      history: history.slice(0, 30),
      localAccess: localAccessEnabled(),
      cycle,
      settings,
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
    const settings = await getSettings();
    const previous = await entryStore().list();
    const position = cycleFor(entry.date, settings, [
      ...previous.filter((e) => e.date !== entry.date),
      entry,
    ]);
    const cycle = position
      ? `${position.regimen.name} · Jour ${position.day} · ${position.phase === "active" ? "prise active" : "pause"}`
      : null;
    return json({ entry: await entryStore().save(entry), cycle });
  } catch {
    return json(
      { error: "Enregistrement impossible. Réessaie sans fermer cette page." },
      503,
    );
  }
}
