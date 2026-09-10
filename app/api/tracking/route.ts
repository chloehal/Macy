import { NextRequest } from "next/server";
import { authorized, sameOrigin, json } from "@/lib/auth/request";
import { getSettings, saveSettings } from "@/lib/tracking/store";
import { entryStore } from "@/lib/entries/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!authorized(request))
    return json({ error: "Reconnecte-toi pour continuer." }, 401);
  try {
    return json({
      settings: await getSettings(),
      entries: await entryStore().list(),
    });
  } catch {
    return json({ error: "Lecture du suivi impossible. Réessaie." }, 503);
  }
}
export async function PUT(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Accès refusé." }, 401);
  if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
  try {
    return json({ settings: await saveSettings(await request.json()) });
  } catch {
    return json(
      {
        error:
          "Enregistrement impossible. Vérifie les paramètres ; les anciennes périodes doivent rester inchangées.",
      },
      400,
    );
  }
}
