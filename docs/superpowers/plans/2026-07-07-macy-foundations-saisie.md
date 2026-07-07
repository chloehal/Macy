# Macy — Fondations + Saisie (`/today`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Macy personal cycle-tracking app's foundations (Next.js + MySQL on Hostinger + password-gated access) and ship the `/today` entry screen — the single highest-priority deliverable per the product spec, since adherence to daily logging is the project's #1 success criterion.

**Architecture:** Next.js App Router (TypeScript) talking directly to a MySQL database hosted on Hostinger via Drizzle ORM + `mysql2`. No user accounts: a single shared password gates the whole app via a signed session cookie, since this is explicitly a single-user tool. All UI built from Base UI primitives wrapped by shadcn/ui components, following the same conventions as the `coal-ui` component library (pnpm, Next 15, React 19, Tailwind v4).

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Base UI primitives, now the CLI default) · Drizzle ORM + `mysql2` · Zod (via `drizzle-orm/zod`) · Vitest + React Testing Library · pnpm

## Global Constraints

These apply to every task below; they encode decisions made with the user that diverge from (or sharpen) the original spec.

- **Rating scale is 1–5, not 0–4.** Every field the spec lists as `smallint 0–4` is stored and validated as an integer **1–5** instead. Polarity semantics (↑ = mieux / ↑ = pire) are unchanged, just shifted by one. Neutral/default value is **3** (was 2).
- **No user accounts, no magic link, no Supabase.** This is a single-user app. Access is gated by **one shared password** (set as an env var, stored hashed) protecting a signed session cookie. There is no `user_id` column anywhere — `settings` is a singleton row (`id = 1`) and `entries` is keyed by `date` alone.
- **Backend is MySQL on Hostinger** (Node.js hosting plan, confirmed to support a persistent Node process), accessed via Drizzle ORM. No Postgres, no Supabase Auth, no Row Level Security (there is nothing to isolate between rows — one password protects the whole app instead).
- **No dependencies requiring native binaries.** Password hashing uses Node's built-in `node:crypto` `scrypt` (no `bcrypt`). Session signing uses a hand-rolled HMAC token (no `jose`/JWT library). This avoids native-binary or platform-specific install issues on Hostinger's Node hosting.
- **Two MySQL databases on the same Hostinger MySQL server**: `macy` (production) and `macy_dev` (local development + integration tests). Both reachable via Hostinger's "Remote MySQL" feature (must be enabled in hPanel for the developer's IP) — no local Docker/MySQL install required.
- **Copy is descriptive, never prescriptive** (spec §2.1, §7). No screen, label, or error message may imply a verdict, judgment, or diagnosis. The `crise` marker is a neutral event marker — no red/alarm styling, no score.
- **Testing stack:** Vitest for all pure logic and the database-access layer (run against the real `macy_dev` database — no mocking of MySQL), React Testing Library for interactive component behavior. No Playwright/E2E in this plan.
- **UX budget** (spec §6.1): a "flat" day (accepting all defaults) must be completable in **under 5 seconds**; a fully-detailed day in under 30 seconds. Verified manually in the final task.
- **Scope:** this plan covers spec Phase 0 (Fondations) and Phase 1 (Saisie `/today`) only. Phase 2 (`/cycle` average view) and Phase 3 (`/trend` + export) are separate follow-up plans, written once this MVP is validated in daily use.

---

## Task 0: Hostinger MySQL setup (manual, user-performed)

This task has no code — it unblocks Task 3. Do this before continuing:

1. In hPanel → Databases → Remote MySQL, enable remote access for your development machine's IP.
2. In hPanel → Databases → MySQL Databases, create two databases: `macy` and `macy_dev`, both owned by the same MySQL user, and note the host (usually looks like `srv####.hstgr.io` or similar), port (usually `3306`), username, and password.
3. Confirm the MySQL server version is 8.0+ (check in hPanel or via `SELECT VERSION();` in phpMyAdmin) — this plan uses `CHECK` constraints, which require MySQL 8.0.16+.

- [ ] **Step 1: Confirm access**

Run (with real credentials substituted), from the developer machine:
```bash
mysql -h <host> -P 3306 -u <user> -p -e "SELECT VERSION();" macy_dev
```
Expected: prints a version string starting with `8.` — if this fails, remote access isn't enabled yet or credentials are wrong. Do not proceed until this succeeds.

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.gitignore`, `.env.example`

**Interfaces:**
- Produces: a working `pnpm dev` Next.js app on `http://localhost:3000`, TypeScript strict mode, Tailwind v4 wired into `app/globals.css`, import alias `@/*` → project root.

- [ ] **Step 1: Scaffold via create-next-app**

```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-pnpm --turbopack
```

When prompted about the non-empty directory (README.md, docs/ already exist), confirm to proceed.

- [ ] **Step 2: Verify the dev server runs**

```bash
pnpm dev
```
Expected: server starts on port 3000, `curl -s http://localhost:3000 | grep -o '<title>[^<]*</title>'` prints the default Next.js title. Stop the server after confirming (Ctrl-C).

- [ ] **Step 3: Add `.env.example`**

```bash
# .env.example
DATABASE_URL="mysql://user:password@host:3306/macy"
DATABASE_URL_DEV="mysql://user:password@host:3306/macy_dev"
PASSWORD_HASH=""
SESSION_SECRET=""
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app"
```

---

## Task 2: Base UI + shadcn/ui components

**Files:**
- Create: `components.json`
- Create: `lib/utils.ts`
- Create: `components/ui/button.tsx`, `components/ui/label.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/slider.tsx`, `components/ui/switch.tsx`, `components/ui/collapsible.tsx`, `components/ui/card.tsx` (all generated by the CLI)

**Interfaces:**
- Produces: `cn(...)` helper from `lib/utils.ts`, used by every component below and by all future components in this project.

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```
As of the 2026-07 CLI release, Base UI is the default primitive library (no `--base radix` flag needed — that would opt back into Radix, which we don't want). Accept the `new-york`/`base-nova` preset defaults, base color `neutral`, CSS variables on.

- [ ] **Step 2: Add the components this plan needs**

```bash
pnpm dlx shadcn@latest add button label input textarea slider switch collapsible card
```

- [ ] **Step 3: Verify**

```bash
pnpm build
```
Expected: build succeeds with no type errors. This confirms `lib/utils.ts` and every generated component compile together.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add shadcn/ui components on Base UI"
```

---

## Task 3: MySQL schema, Drizzle client, and migrations

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/client.ts`
- Create: `drizzle.config.ts`
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Test: `lib/db/client.test.ts`

**Interfaces:**
- Produces: `db` (Drizzle instance) from `lib/db/client.ts`; `settings`, `entries` tables and `entryInsertSchema`, `type Entry = typeof entries.$inferSelect`, `type NewEntry = typeof entries.$inferInsert`, `type Settings = typeof settings.$inferSelect` from `lib/db/schema.ts`. Every later task's DB code imports from these two files only.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add drizzle-orm mysql2 zod
pnpm add -D drizzle-kit dotenv vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

- [ ] **Step 2: Write the schema**

```typescript
// lib/db/schema.ts
import {
  mysqlTable, int, tinyint, boolean, date, time, timestamp,
  varchar, text, decimal, mysqlEnum, check,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-orm/zod';

export const settings = mysqlTable('settings', {
  id: tinyint().primaryKey(),
  pilulesActives: int().notNull(),
  joursArret: int().notNull(),
  dateDebutPlaquette: date({ mode: 'string' }).notNull(),
  updatedAt: timestamp().notNull().defaultNow().onUpdateNow(),
});

export const saignementValues = ['none', 'spotting', 'light', 'medium', 'heavy'] as const;
export const entrainementValues = ['repos', 'leger', 'intense'] as const;
export const appetitValues = ['bas', 'normal', 'eleve'] as const;

const scale = () => tinyint();

export const entries = mysqlTable('entries', {
  id: int().autoincrement().primaryKey(),
  date: date({ mode: 'string' }).notNull().unique(),
  packDay: int(),

  // Coeur
  noteGlobale: scale(),
  humeurBasse: scale(),
  energie: scale(),
  envieSucre: scale(),

  // Marqueurs
  crise: boolean().notNull().default(false),
  noteCrise: text(),
  saignement: mysqlEnum(saignementValues),

  // Replie / optionnel
  irritabilite: scale(),
  anxiete: scale(),
  sensibilite: scale(),
  libido: scale(),
  concentration: scale(),
  ressentiEffort: scale(),
  stress: scale(),
  sommeilHeures: decimal({ precision: 3, scale: 1, mode: 'number' }),
  sommeilQualite: scale(),
  heureCoucher: time(),
  reveilsNocturnes: scale(),
  entrainement: mysqlEnum(entrainementValues),
  alcool: tinyint(),
  malade: boolean().notNull().default(false),
  envieSale: scale(),
  appetit: mysqlEnum(appetitValues),
  notes: text(),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow().onUpdateNow(),
}, (table) => [
  check('note_globale_range', sql`${table.noteGlobale} between 1 and 5`),
  check('humeur_basse_range', sql`${table.humeurBasse} between 1 and 5`),
  check('energie_range', sql`${table.energie} between 1 and 5`),
  check('envie_sucre_range', sql`${table.envieSucre} between 1 and 5`),
  check('irritabilite_range', sql`${table.irritabilite} between 1 and 5`),
  check('anxiete_range', sql`${table.anxiete} between 1 and 5`),
  check('sensibilite_range', sql`${table.sensibilite} between 1 and 5`),
  check('libido_range', sql`${table.libido} between 1 and 5`),
  check('concentration_range', sql`${table.concentration} between 1 and 5`),
  check('ressenti_effort_range', sql`${table.ressentiEffort} between 1 and 5`),
  check('stress_range', sql`${table.stress} between 1 and 5`),
  check('sommeil_qualite_range', sql`${table.sommeilQualite} between 1 and 5`),
  check('reveils_nocturnes_range', sql`${table.reveilsNocturnes} between 1 and 5`),
  check('envie_sale_range', sql`${table.envieSale} between 1 and 5`),
]);

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

export const SCALE_FIELDS = [
  'noteGlobale', 'humeurBasse', 'energie', 'envieSucre',
  'irritabilite', 'anxiete', 'sensibilite', 'libido',
  'concentration', 'ressentiEffort', 'stress', 'sommeilQualite',
  'reveilsNocturnes', 'envieSale',
] as const;
export type ScaleField = (typeof SCALE_FIELDS)[number];

const scaleRefinement = (schema: import('zod').ZodTypeAny) =>
  (schema as unknown as { min: (n: number) => { max: (n: number) => import('zod').ZodTypeAny } })
    .min(1).max(5);

export const entryInsertSchema = createInsertSchema(entries, {
  noteGlobale: scaleRefinement,
  humeurBasse: scaleRefinement,
  energie: scaleRefinement,
  envieSucre: scaleRefinement,
  irritabilite: scaleRefinement,
  anxiete: scaleRefinement,
  sensibilite: scaleRefinement,
  libido: scaleRefinement,
  concentration: scaleRefinement,
  ressentiEffort: scaleRefinement,
  stress: scaleRefinement,
  sommeilQualite: scaleRefinement,
  reveilsNocturnes: scaleRefinement,
  envieSale: scaleRefinement,
});
```

- [ ] **Step 3: Write the Drizzle client**

```typescript
// lib/db/client.ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const connectionString = process.env.NODE_ENV === 'test'
  ? process.env.DATABASE_URL_DEV!
  : process.env.DATABASE_URL!;

const pool = mysql.createPool(connectionString);

export const db = drizzle(pool, { schema, mode: 'default', casing: 'snake_case' });
```

- [ ] **Step 4: Write `drizzle.config.ts`**

```typescript
// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL_DEV!,
  },
});
```

- [ ] **Step 5: Generate and apply the migration against `macy_dev`**

```bash
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit migrate
```
Expected: a new file under `drizzle/` with `CREATE TABLE` statements for `settings` and `entries`; the second command applies it to `macy_dev` (per `drizzle.config.ts`'s `dbCredentials`). Verify with:
```bash
mysql -h <host> -u <user> -p macy_dev -e "SHOW TABLES;"
```
Expected output includes `settings` and `entries`.

- [ ] **Step 6: Set up Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    env: { NODE_ENV: 'test' },
  },
});
```

```typescript
// vitest.setup.ts
import 'dotenv/config';
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 7: Write a DB wiring smoke test**

```typescript
// lib/db/client.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { db } from './client';
import { settings } from './schema';
import { eq } from 'drizzle-orm';

describe('db client wiring', () => {
  afterEach(async () => {
    await db.delete(settings).where(eq(settings.id, 99));
  });

  it('round-trips a row against macy_dev', async () => {
    await db.insert(settings).values({
      id: 99,
      pilulesActives: 21,
      joursArret: 7,
      dateDebutPlaquette: '2026-01-01',
    });

    const rows = await db.select().from(settings).where(eq(settings.id, 99));
    expect(rows).toHaveLength(1);
    expect(rows[0].pilulesActives).toBe(21);
  });
});
```

- [ ] **Step 8: Run the test**

```bash
pnpm test
```
Expected: PASS. This confirms the app can actually reach the Hostinger `macy_dev` database over the network.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: MySQL schema, Drizzle client, and migrations"
```

---

## Task 4: `calcPackDay` — pure cycle-day calculation

**Files:**
- Create: `lib/cycle/pack-day.ts`
- Test: `lib/cycle/pack-day.test.ts`

**Interfaces:**
- Produces: `calcPackDay(date: string, dateDebutPlaquette: string, pilulesActives: number, joursArret: number): number` and `isActiveDay(packDay: number, pilulesActives: number): boolean`, both consumed by Task 11 (`/today` page) and by the future `/cycle` plan.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/cycle/pack-day.test.ts
import { describe, it, expect } from 'vitest';
import { calcPackDay, isActiveDay } from './pack-day';

describe('calcPackDay', () => {
  const start = '2026-01-01';
  const pilulesActives = 21;
  const joursArret = 7;

  it('returns 1 on the start date', () => {
    expect(calcPackDay(start, start, pilulesActives, joursArret)).toBe(1);
  });

  it('returns 21 on the last active day', () => {
    expect(calcPackDay('2026-01-21', start, pilulesActives, joursArret)).toBe(21);
  });

  it('returns 22 on the first stop day', () => {
    expect(calcPackDay('2026-01-22', start, pilulesActives, joursArret)).toBe(22);
  });

  it('returns 28 on the last stop day', () => {
    expect(calcPackDay('2026-01-28', start, pilulesActives, joursArret)).toBe(28);
  });

  it('wraps around to 1 at the start of the next pack', () => {
    expect(calcPackDay('2026-01-29', start, pilulesActives, joursArret)).toBe(1);
  });

  it('handles dates before the reference start date', () => {
    expect(calcPackDay('2025-12-31', start, pilulesActives, joursArret)).toBe(28);
  });
});

describe('isActiveDay', () => {
  it('is true up to and including pilulesActives', () => {
    expect(isActiveDay(21, 21)).toBe(true);
    expect(isActiveDay(1, 21)).toBe(true);
  });

  it('is false past pilulesActives', () => {
    expect(isActiveDay(22, 21)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test pack-day
```
Expected: FAIL — `./pack-day` has no exports yet.

- [ ] **Step 3: Implement**

```typescript
// lib/cycle/pack-day.ts
const DAY_MS = 24 * 60 * 60 * 1000;

export function calcPackDay(
  date: string,
  dateDebutPlaquette: string,
  pilulesActives: number,
  joursArret: number,
): number {
  const cycleLen = pilulesActives + joursArret;
  const d = Date.UTC(...parseIsoDate(date));
  const start = Date.UTC(...parseIsoDate(dateDebutPlaquette));
  const diff = Math.floor((d - start) / DAY_MS);
  return (((diff % cycleLen) + cycleLen) % cycleLen) + 1;
}

export function isActiveDay(packDay: number, pilulesActives: number): boolean {
  return packDay <= pilulesActives;
}

function parseIsoDate(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m - 1, d];
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test pack-day
```
Expected: PASS, all 8 cases.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: calcPackDay pure cycle-day calculation"
```

---

## Task 5: Smart pre-fill and catch-up detection — pure functions

**Files:**
- Create: `lib/cycle/defaults.ts`
- Test: `lib/cycle/defaults.test.ts`

**Interfaces:**
- Consumes: `Entry`, `SCALE_FIELDS`, `ScaleField` from `lib/db/schema.ts` (Task 3).
- Produces: `computeDefaults(recentEntries: Pick<Entry, ScaleField>[]): Record<ScaleField, number>` and `isYesterdayMissing(recentEntries: Pick<Entry, 'date'>[], today: string): boolean`, both consumed by Task 11 and Task 13.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/cycle/defaults.test.ts
import { describe, it, expect } from 'vitest';
import { computeDefaults, isYesterdayMissing } from './defaults';

describe('computeDefaults', () => {
  it('defaults every field to 3 when there is no history', () => {
    const result = computeDefaults([]);
    expect(result.noteGlobale).toBe(3);
    expect(result.energie).toBe(3);
  });

  it('rounds the average of recent entries', () => {
    const result = computeDefaults([
      { noteGlobale: 4, humeurBasse: 2, energie: 5, envieSucre: 3, irritabilite: null, anxiete: null, sensibilite: null, libido: null, concentration: null, ressentiEffort: null, stress: null, sommeilQualite: null, reveilsNocturnes: null, envieSale: null },
      { noteGlobale: 2, humeurBasse: 2, energie: 4, envieSucre: 3, irritabilite: null, anxiete: null, sensibilite: null, libido: null, concentration: null, ressentiEffort: null, stress: null, sommeilQualite: null, reveilsNocturnes: null, envieSale: null },
    ]);
    expect(result.noteGlobale).toBe(3); // avg 3
    expect(result.humeurBasse).toBe(2); // avg 2
    expect(result.energie).toBe(5); // avg 4.5 rounds to 5
  });

  it('ignores null values when averaging', () => {
    const result = computeDefaults([
      { noteGlobale: 4, humeurBasse: null, energie: null, envieSucre: null, irritabilite: null, anxiete: null, sensibilite: null, libido: null, concentration: null, ressentiEffort: null, stress: null, sommeilQualite: null, reveilsNocturnes: null, envieSale: null },
      { noteGlobale: null, humeurBasse: null, energie: null, envieSucre: null, irritabilite: null, anxiete: null, sensibilite: null, libido: null, concentration: null, ressentiEffort: null, stress: null, sommeilQualite: null, reveilsNocturnes: null, envieSale: null },
    ]);
    expect(result.noteGlobale).toBe(4);
  });
});

describe('isYesterdayMissing', () => {
  it('is true when yesterday has no entry', () => {
    expect(isYesterdayMissing([{ date: '2026-01-05' }], '2026-01-07')).toBe(true);
  });

  it('is false when yesterday has an entry', () => {
    expect(isYesterdayMissing([{ date: '2026-01-06' }], '2026-01-07')).toBe(false);
  });

  it('handles month boundaries', () => {
    expect(isYesterdayMissing([{ date: '2026-01-31' }], '2026-02-01')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test defaults
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/cycle/defaults.ts
import { SCALE_FIELDS, type ScaleField } from '@/lib/db/schema';

const NEUTRAL = 3;

export function computeDefaults(
  recentEntries: Partial<Record<ScaleField, number | null>>[],
): Record<ScaleField, number> {
  const result = {} as Record<ScaleField, number>;

  for (const field of SCALE_FIELDS) {
    const values = recentEntries
      .map((entry) => entry[field])
      .filter((value): value is number => typeof value === 'number');

    result[field] = values.length === 0
      ? NEUTRAL
      : Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  return result;
}

export function isYesterdayMissing(
  recentEntries: { date: string }[],
  today: string,
): boolean {
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return !recentEntries.some((entry) => entry.date === yesterday);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test defaults
```
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: smart pre-fill defaults and yesterday catch-up detection"
```

---

## Task 6: Settings data layer

**Files:**
- Create: `lib/db/settings-repo.ts`
- Test: `lib/db/settings-repo.test.ts`

**Interfaces:**
- Consumes: `db`, `settings`, `Settings`, `NewSettings` from Task 3.
- Produces: `getSettings(): Promise<Settings | null>`, `saveSettings(input: Omit<NewSettings, 'id'>): Promise<void>`, consumed by Task 10 (`/settings` page) and Task 11 (`/today` page).

- [ ] **Step 1: Write the failing test**

```typescript
// lib/db/settings-repo.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { db } from './client';
import { settings } from './schema';
import { eq } from 'drizzle-orm';
import { getSettings, saveSettings } from './settings-repo';

describe('settings repo', () => {
  afterEach(async () => {
    await db.delete(settings).where(eq(settings.id, 1));
  });

  it('returns null when no settings exist', async () => {
    expect(await getSettings()).toBeNull();
  });

  it('saves and reads back settings', async () => {
    await saveSettings({ pilulesActives: 24, joursArret: 4, dateDebutPlaquette: '2026-02-01' });
    const result = await getSettings();
    expect(result?.pilulesActives).toBe(24);
    expect(result?.joursArret).toBe(4);
    expect(result?.dateDebutPlaquette).toBe('2026-02-01');
  });

  it('overwrites on a second save (singleton row)', async () => {
    await saveSettings({ pilulesActives: 21, joursArret: 7, dateDebutPlaquette: '2026-01-01' });
    await saveSettings({ pilulesActives: 24, joursArret: 4, dateDebutPlaquette: '2026-02-01' });
    const result = await getSettings();
    expect(result?.pilulesActives).toBe(24);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test settings-repo
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/db/settings-repo.ts
import { db } from './client';
import { settings, type Settings, type NewSettings } from './schema';
import { eq } from 'drizzle-orm';

export async function getSettings(): Promise<Settings | null> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1));
  return rows[0] ?? null;
}

export async function saveSettings(input: Omit<NewSettings, 'id'>): Promise<void> {
  await db
    .insert(settings)
    .values({ id: 1, ...input })
    .onDuplicateKeyUpdate({ set: input });
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test settings-repo
```
Expected: PASS, all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: settings data layer"
```

---

## Task 7: Entries data layer

**Files:**
- Create: `lib/db/entries-repo.ts`
- Test: `lib/db/entries-repo.test.ts`

**Interfaces:**
- Consumes: `db`, `entries`, `Entry`, `NewEntry` from Task 3.
- Produces: `getEntryByDate(date: string): Promise<Entry | null>`, `upsertEntry(input: NewEntry): Promise<void>`, `getRecentEntries(beforeDate: string, limit?: number): Promise<Entry[]>`, consumed by Task 11 and Task 13.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/db/entries-repo.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { db } from './client';
import { entries } from './schema';
import { eq } from 'drizzle-orm';
import { getEntryByDate, upsertEntry, getRecentEntries } from './entries-repo';

describe('entries repo', () => {
  afterEach(async () => {
    await db.delete(entries).where(eq(entries.date, '2026-03-01'));
    await db.delete(entries).where(eq(entries.date, '2026-03-02'));
    await db.delete(entries).where(eq(entries.date, '2026-03-03'));
  });

  it('returns null for a date with no entry', async () => {
    expect(await getEntryByDate('2026-03-01')).toBeNull();
  });

  it('upserts and reads back an entry', async () => {
    await upsertEntry({ date: '2026-03-01', packDay: 5, noteGlobale: 4, crise: false, malade: false });
    const result = await getEntryByDate('2026-03-01');
    expect(result?.noteGlobale).toBe(4);
    expect(result?.packDay).toBe(5);
  });

  it('updates in place on a second upsert for the same date', async () => {
    await upsertEntry({ date: '2026-03-01', packDay: 5, noteGlobale: 4, crise: false, malade: false });
    await upsertEntry({ date: '2026-03-01', packDay: 5, noteGlobale: 2, crise: true, malade: false });
    const result = await getEntryByDate('2026-03-01');
    expect(result?.noteGlobale).toBe(2);
    expect(result?.crise).toBe(true);
  });

  it('returns recent entries before a date, most recent first', async () => {
    await upsertEntry({ date: '2026-03-01', crise: false, malade: false });
    await upsertEntry({ date: '2026-03-02', crise: false, malade: false });
    const result = await getRecentEntries('2026-03-03', 14);
    expect(result.map((e) => e.date)).toEqual(['2026-03-02', '2026-03-01']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test entries-repo
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/db/entries-repo.ts
import { db } from './client';
import { entries, type Entry, type NewEntry } from './schema';
import { eq, lt, desc } from 'drizzle-orm';

export async function getEntryByDate(date: string): Promise<Entry | null> {
  const rows = await db.select().from(entries).where(eq(entries.date, date));
  return rows[0] ?? null;
}

export async function upsertEntry(input: NewEntry): Promise<void> {
  await db
    .insert(entries)
    .values(input)
    .onDuplicateKeyUpdate({ set: input });
}

export async function getRecentEntries(beforeDate: string, limit = 14): Promise<Entry[]> {
  return db
    .select()
    .from(entries)
    .where(lt(entries.date, beforeDate))
    .orderBy(desc(entries.date))
    .limit(limit);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test entries-repo
```
Expected: PASS, all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: entries data layer"
```

---

## Task 8: Password hashing and session tokens — pure functions

**Files:**
- Create: `lib/auth/password.ts`
- Create: `lib/auth/session.ts`
- Test: `lib/auth/password.test.ts`
- Test: `lib/auth/session.test.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): string`, `verifyPassword(password: string, stored: string): boolean`, `createSessionToken(secret: string, now?: number): string`, `verifySessionToken(token: string, secret: string, now?: number): boolean` — all consumed by Task 9 (login route + middleware).

- [ ] **Step 1: Write the failing password tests**

```typescript
// lib/auth/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password against its hash', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', stored)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(verifyPassword('wrong password', stored)).toBe(false);
  });

  it('produces a different hash each time (random salt)', () => {
    const a = hashPassword('same password');
    const b = hashPassword('same password');
    expect(a).not.toBe(b);
    expect(verifyPassword('same password', a)).toBe(true);
    expect(verifyPassword('same password', b)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test lib/auth/password
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement password hashing**

```typescript
// lib/auth/password.ts
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const candidate = scryptSync(password, salt, KEY_LENGTH);

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test lib/auth/password
```
Expected: PASS, all 3 cases.

- [ ] **Step 5: Write the failing session token tests**

```typescript
// lib/auth/session.test.ts
import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

const SECRET = 'test-secret';

describe('session tokens', () => {
  it('accepts a freshly created token', () => {
    const token = createSessionToken(SECRET, 1_000_000);
    expect(verifySessionToken(token, SECRET, 1_000_001)).toBe(true);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken(SECRET, 1_000_000);
    expect(verifySessionToken(token, 'other-secret', 1_000_001)).toBe(false);
  });

  it('rejects an expired token', () => {
    const token = createSessionToken(SECRET, 1_000_000);
    const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
    expect(verifySessionToken(token, SECRET, 1_000_000 + THIRTY_ONE_DAYS_MS)).toBe(false);
  });

  it('rejects a malformed token', () => {
    expect(verifySessionToken('not-a-real-token', SECRET, 1_000_000)).toBe(false);
  });
});
```

- [ ] **Step 6: Run to verify failure**

```bash
pnpm test lib/auth/session
```
Expected: FAIL — module not found.

- [ ] **Step 7: Implement session tokens**

```typescript
// lib/auth/session.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionToken(secret: string, now: number = Date.now()): string {
  const expires = String(now + SESSION_TTL_MS);
  return `${expires}.${sign(expires, secret)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;

  const expectedSignature = sign(expires, secret);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (signatureBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return false;

  return Number(expires) > now;
}
```

- [ ] **Step 8: Run to verify pass**

```bash
pnpm test lib/auth/session
```
Expected: PASS, all 4 cases.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: password hashing and session tokens"
```

---

## Task 9: Login route, logout route, middleware, and `/login` page

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `middleware.ts`
- Create: `app/login/page.tsx`
- Test: `app/api/auth/login/route.test.ts`

**Interfaces:**
- Consumes: `verifyPassword` from `lib/auth/password.ts`, `createSessionToken`/`verifySessionToken` from `lib/auth/session.ts` (Task 8).
- Produces: cookie name `macy_session`, checked by `middleware.ts` on every request; consumed conceptually by every future page (they're all behind the gate).

- [ ] **Step 1: Write the failing login route test**

```typescript
// app/api/auth/login/route.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { hashPassword } from '@/lib/auth/password';

const ORIGINAL_ENV = { ...process.env };

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.PASSWORD_HASH = hashPassword('the-real-password');
    process.env.SESSION_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('sets a session cookie on the correct password', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'the-real-password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('macy_session=');
  });

  it('returns 401 on the wrong password', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test app/api/auth/login
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the login route**

```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken } from '@/lib/auth/session';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };

  if (!password || !verifyPassword(password, process.env.PASSWORD_HASH!)) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
  }

  const token = createSessionToken(process.env.SESSION_SECRET!);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('macy_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test app/api/auth/login
```
Expected: PASS, both cases.

- [ ] **Step 5: Implement the logout route**

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('macy_session');
  return response;
}
```

- [ ] **Step 6: Implement middleware**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/session';

export function middleware(request: NextRequest) {
  const isPublicPath = request.nextUrl.pathname === '/login'
    || request.nextUrl.pathname === '/api/auth/login';

  if (isPublicPath) return NextResponse.next();

  const token = request.cookies.get('macy_session')?.value;
  const isValid = !!token && verifySessionToken(token, process.env.SESSION_SECRET!);

  if (!isValid) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
};
```

- [ ] **Step 7: Implement the login page**

```tsx
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(false);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      router.push('/today');
      router.refresh();
    } else {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-muted-foreground">Mot de passe incorrect.</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          Entrer
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 8: Manual verification**

```bash
pnpm dev
```
Visit `http://localhost:3000/today` in a browser — expect a redirect to `/login`. Set `PASSWORD_HASH` (via `node -e "console.log(require('./lib/auth/password').hashPassword('test'))"` — note this requires compiling TS or running via `tsx`; alternatively derive it from a small ad-hoc script) and `SESSION_SECRET` in `.env.local`, restart, log in with the matching password, confirm redirect to `/today` succeeds.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: single shared password auth with signed session cookie"
```

---

## Task 10: `/settings` page — régime configuration

**Files:**
- Create: `app/settings/page.tsx`
- Create: `app/api/settings/route.ts`
- Create: `app/settings/settings-form.tsx`
- Test: `app/settings/settings-form.test.tsx`

**Interfaces:**
- Consumes: `getSettings`, `saveSettings` from `lib/db/settings-repo.ts` (Task 6).
- Produces: a configured `settings` row, required before `/today` (Task 11) can compute a `pack_day`.

- [ ] **Step 1: Write the failing form test**

```tsx
// app/settings/settings-form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from './settings-form';

describe('SettingsForm', () => {
  it('submits the current field values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsForm
        initial={{ pilulesActives: 21, joursArret: 7, dateDebutPlaquette: '2026-01-01' }}
        onSave={onSave}
      />,
    );

    await userEvent.clear(screen.getByLabelText(/comprimés actifs/i));
    await userEvent.type(screen.getByLabelText(/comprimés actifs/i), '24');
    await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(onSave).toHaveBeenCalledWith({
      pilulesActives: 24,
      joursArret: 7,
      dateDebutPlaquette: '2026-01-01',
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test settings-form
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the form component**

```tsx
// app/settings/settings-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SettingsValues = {
  pilulesActives: number;
  joursArret: number;
  dateDebutPlaquette: string;
};

export function SettingsForm({
  initial,
  onSave,
}: {
  initial: SettingsValues;
  onSave: (values: SettingsValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSave(values);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <Label htmlFor="pilulesActives">Comprimés actifs</Label>
        <Input
          id="pilulesActives"
          type="number"
          value={values.pilulesActives}
          onChange={(e) => setValues({ ...values, pilulesActives: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="joursArret">Jours d&apos;arrêt</Label>
        <Input
          id="joursArret"
          type="number"
          value={values.joursArret}
          onChange={(e) => setValues({ ...values, joursArret: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dateDebutPlaquette">Premier jour de la plaquette de référence</Label>
        <Input
          id="dateDebutPlaquette"
          type="date"
          value={values.dateDebutPlaquette}
          onChange={(e) => setValues({ ...values, dateDebutPlaquette: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={saving}>Enregistrer</Button>
    </form>
  );
}
```

Note on the interface-design "no native `<input type=\"date\">`" rule: this is a v1-internal setup form filled once and rarely revisited, not part of the daily `/today` flow the rule targets — a custom date picker is deferred to avoid scope creep here; revisit if this form turns out to be used often.

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test settings-form
```
Expected: PASS.

- [ ] **Step 5: Implement the API route**

```typescript
// app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db/settings-repo';
import { z } from 'zod';

const settingsSchema = z.object({
  pilulesActives: z.number().int().positive(),
  joursArret: z.number().int().min(0),
  dateDebutPlaquette: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function POST(request: Request) {
  const body = settingsSchema.parse(await request.json());
  await saveSettings(body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Implement the page**

```tsx
// app/settings/page.tsx
import { getSettings } from '@/lib/db/settings-repo';
import { SettingsPageClient } from './settings-page-client';

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <SettingsPageClient
      initial={settings ?? { pilulesActives: 21, joursArret: 7, dateDebutPlaquette: new Date().toISOString().slice(0, 10) }}
    />
  );
}
```

```tsx
// app/settings/settings-page-client.tsx
'use client';

import { SettingsForm, type SettingsValues } from './settings-form';

export function SettingsPageClient({ initial }: { initial: SettingsValues }) {
  async function handleSave(values: SettingsValues) {
    await fetch('/api/settings', { method: 'POST', body: JSON.stringify(values) });
  }

  return (
    <main className="p-6">
      <h1 className="text-lg font-medium mb-4">Réglages</h1>
      <SettingsForm initial={initial} onSave={handleSave} />
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

```bash
pnpm dev
```
Log in, visit `/settings`, submit values (e.g. 21 / 7 / today's date), confirm via `mysql -h <host> -u <user> -p macy_dev -e "SELECT * FROM settings;"` that the row was written.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: settings page for pack configuration"
```

---

## Task 11: `/today` page — core sliders (couche 1) and save

**Files:**
- Create: `app/today/page.tsx`
- Create: `app/today/today-form.tsx`
- Create: `components/today/core-sliders.tsx`
- Create: `app/api/entries/route.ts`
- Test: `components/today/core-sliders.test.tsx`

**Interfaces:**
- Consumes: `calcPackDay` (Task 4), `computeDefaults` (Task 5), `getSettings` (Task 6), `getEntryByDate`/`upsertEntry`/`getRecentEntries` (Task 7), `entryInsertSchema` (Task 3).
- Produces: `CoreSliders` component and the entry save flow, extended by Task 12 with the remaining two layers.

- [ ] **Step 1: Write the failing component test**

```tsx
// components/today/core-sliders.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoreSliders } from './core-sliders';

describe('CoreSliders', () => {
  it('renders the current value for each metric and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <CoreSliders
        values={{ noteGlobale: 3, humeurBasse: 3, energie: 3, envieSucre: 3 }}
        onChange={onChange}
      />,
    );

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(4);

    sliders[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('noteGlobale', 4);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test core-sliders
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CoreSliders`**

```tsx
// components/today/core-sliders.tsx
'use client';

import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export type CoreValues = {
  noteGlobale: number;
  humeurBasse: number;
  energie: number;
  envieSucre: number;
};

const METRICS: { key: keyof CoreValues; label: string }[] = [
  { key: 'noteGlobale', label: 'Comment te sens-tu, globalement ?' },
  { key: 'humeurBasse', label: 'Humeur basse' },
  { key: 'energie', label: 'Énergie' },
  { key: 'envieSucre', label: 'Envie de sucré' },
];

export function CoreSliders({
  values,
  onChange,
}: {
  values: CoreValues;
  onChange: (key: keyof CoreValues, value: number) => void;
}) {
  return (
    <div className="space-y-6">
      {METRICS.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Slider
            id={key}
            min={1}
            max={5}
            step={1}
            value={[values[key]]}
            onValueChange={([value]) => onChange(key, value)}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test core-sliders
```
Expected: PASS.

- [ ] **Step 5: Implement the entries API route**

```typescript
// app/api/entries/route.ts
import { NextResponse } from 'next/server';
import { entryInsertSchema } from '@/lib/db/schema';
import { upsertEntry, getEntryByDate } from '@/lib/db/entries-repo';

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date_required' }, { status: 400 });
  return NextResponse.json(await getEntryByDate(date));
}

export async function POST(request: Request) {
  const body = entryInsertSchema.parse(await request.json());
  await upsertEntry(body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Implement the `/today` page (server component: loads data, computes pack_day and defaults)**

```tsx
// app/today/page.tsx
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/db/settings-repo';
import { getEntryByDate, getRecentEntries } from '@/lib/db/entries-repo';
import { calcPackDay } from '@/lib/cycle/pack-day';
import { computeDefaults } from '@/lib/cycle/defaults';
import { TodayForm } from './today-form';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const settings = await getSettings();
  if (!settings) redirect('/settings');

  const { date } = await searchParams;
  const today = date ?? new Date().toISOString().slice(0, 10);

  const [existingEntry, recentEntries] = await Promise.all([
    getEntryByDate(today),
    getRecentEntries(today, 14),
  ]);

  const packDay = calcPackDay(today, settings.dateDebutPlaquette, settings.pilulesActives, settings.joursArret);
  const defaults = computeDefaults(recentEntries);

  return (
    <TodayForm
      date={today}
      packDay={packDay}
      existingEntry={existingEntry}
      defaults={defaults}
      recentEntries={recentEntries.map((e) => ({ date: e.date }))}
    />
  );
}
```

- [ ] **Step 7: Implement `TodayForm` (client component wiring `CoreSliders` to save)**

```tsx
// app/today/today-form.tsx
'use client';

import { useState } from 'react';
import { CoreSliders, type CoreValues } from '@/components/today/core-sliders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Entry } from '@/lib/db/schema';
import type { ScaleField } from '@/lib/db/schema';

export function TodayForm({
  date,
  packDay,
  existingEntry,
  defaults,
}: {
  date: string;
  packDay: number;
  existingEntry: Entry | null;
  defaults: Record<ScaleField, number>;
  recentEntries: { date: string }[];
}) {
  // pack_day is pre-filled from the automatic calculation but stays a manual
  // override per spec §5 — the stored value always wins over the computed one.
  const [packDayOverride, setPackDayOverride] = useState(existingEntry?.packDay ?? packDay);
  const [core, setCore] = useState<CoreValues>({
    noteGlobale: existingEntry?.noteGlobale ?? defaults.noteGlobale,
    humeurBasse: existingEntry?.humeurBasse ?? defaults.humeurBasse,
    energie: existingEntry?.energie ?? defaults.energie,
    envieSucre: existingEntry?.envieSucre ?? defaults.envieSucre,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleCoreChange(key: keyof CoreValues, value: number) {
    setCore((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ date, packDay: packDayOverride, ...core, crise: false, malade: false }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="packDay">Jour</label>
        <Input
          id="packDay"
          type="number"
          min={1}
          value={packDayOverride}
          onChange={(e) => { setPackDayOverride(Number(e.target.value)); setSaved(false); }}
          className="w-16 h-7 px-2"
        />
        <span>de la plaquette</span>
      </div>
      <CoreSliders values={core} onChange={handleCoreChange} />
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saved ? 'Enregistré' : 'Valider'}
      </Button>
    </main>
  );
}
```

- [ ] **Step 8: Manual verification**

```bash
pnpm dev
```
Log in, visit `/today` (after `/settings` is configured), confirm the four sliders show default values and the "Jour" field shows the auto-computed pack day, move a slider, click "Valider", reload the page, confirm the moved value persisted. Then edit the "Jour" field to a different number, save, reload, confirm the override persisted instead of the auto-computed value.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: /today core sliders layer with save"
```

---

## Task 12: `/today` — marker toggles (couche 2) and details panel (couche 3)

**Files:**
- Create: `components/today/marker-toggles.tsx`
- Create: `components/today/details-panel.tsx`
- Modify: `app/today/today-form.tsx`
- Test: `components/today/marker-toggles.test.tsx`
- Test: `components/today/details-panel.test.tsx`

**Interfaces:**
- Consumes: `CoreValues` pattern from Task 11; `saignementValues`, `entrainementValues`, `appetitValues` from `lib/db/schema.ts` (Task 3).
- Produces: the full entry payload (all ~24 fields), replacing Task 11's minimal `{ ...core, crise: false, malade: false }` stub.

- [ ] **Step 1: Write the failing marker-toggles test**

```tsx
// components/today/marker-toggles.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkerToggles } from './marker-toggles';

describe('MarkerToggles', () => {
  it('toggles crise and reveals the optional note field', async () => {
    const onChange = vi.fn();
    render(
      <MarkerToggles
        crise={false}
        noteCrise={null}
        saignement="none"
        onCriseChange={onChange}
        onNoteCriseChange={vi.fn()}
        onSaignementChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/note/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: /crise/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows the note field once crise is true', () => {
    render(
      <MarkerToggles
        crise={true}
        noteCrise={null}
        saignement="none"
        onCriseChange={vi.fn()}
        onNoteCriseChange={vi.fn()}
        onSaignementChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test marker-toggles
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `MarkerToggles`**

```tsx
// components/today/marker-toggles.tsx
'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { entries } from '@/lib/db/schema';

type Saignement = (typeof entries.$inferSelect)['saignement'];

const SAIGNEMENT_OPTIONS: { value: NonNullable<Saignement>; label: string }[] = [
  { value: 'none', label: 'Aucun' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Léger' },
  { value: 'medium', label: 'Moyen' },
  { value: 'heavy', label: 'Abondant' },
];

export function MarkerToggles({
  crise,
  noteCrise,
  saignement,
  onCriseChange,
  onNoteCriseChange,
  onSaignementChange,
}: {
  crise: boolean;
  noteCrise: string | null;
  saignement: Saignement;
  onCriseChange: (value: boolean) => void;
  onNoteCriseChange: (value: string) => void;
  onSaignementChange: (value: NonNullable<Saignement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="crise">Crise alimentaire</Label>
        <Switch id="crise" checked={crise} onCheckedChange={onCriseChange} aria-label="crise" />
      </div>
      {crise && (
        <Textarea
          aria-label="Note (optionnel)"
          placeholder="Contexte (optionnel)"
          value={noteCrise ?? ''}
          onChange={(event) => onNoteCriseChange(event.target.value)}
        />
      )}
      <div className="space-y-2">
        <Label>Saignement</Label>
        <div className="flex flex-wrap gap-2">
          {SAIGNEMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSaignementChange(option.value)}
              aria-pressed={saignement === option.value}
              className="rounded-full border px-3 py-1 text-sm data-[pressed=true]:bg-accent"
              data-pressed={saignement === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test marker-toggles
```
Expected: PASS.

- [ ] **Step 5: Write the failing details-panel test**

```tsx
// components/today/details-panel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailsPanel } from './details-panel';

describe('DetailsPanel', () => {
  it('hides fields until expanded', async () => {
    render(<DetailsPanel values={{}} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/stress/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /détails/i }));
    expect(screen.getByLabelText(/stress/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify failure**

```bash
pnpm test details-panel
```
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `DetailsPanel`**

```tsx
// components/today/details-panel.tsx
'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { entries, ScaleField } from '@/lib/db/schema';

type Entrainement = (typeof entries.$inferSelect)['entrainement'];
type Appetit = (typeof entries.$inferSelect)['appetit'];

export type DetailsValues = Partial<Record<ScaleField, number>> & {
  sommeilHeures?: number | null;
  heureCoucher?: string | null;
  entrainement?: Entrainement;
  alcool?: number | null;
  malade?: boolean;
  appetit?: Appetit;
  notes?: string | null;
};

const DETAIL_SLIDERS: { key: ScaleField; label: string }[] = [
  { key: 'irritabilite', label: 'Irritabilité' },
  { key: 'anxiete', label: 'Anxiété' },
  { key: 'sensibilite', label: 'Sensibilité (tendance aux larmes)' },
  { key: 'libido', label: 'Libido' },
  { key: 'concentration', label: 'Concentration' },
  { key: 'ressentiEffort', label: 'Ressenti à l’effort' },
  { key: 'stress', label: 'Stress' },
  { key: 'sommeilQualite', label: 'Qualité du sommeil' },
  { key: 'reveilsNocturnes', label: 'Réveils nocturnes' },
  { key: 'envieSale', label: 'Envie de salé' },
];

const ENTRAINEMENT_OPTIONS: { value: NonNullable<Entrainement>; label: string }[] = [
  { value: 'repos', label: 'Repos' },
  { value: 'leger', label: 'Léger' },
  { value: 'intense', label: 'Intense' },
];

const APPETIT_OPTIONS: { value: NonNullable<Appetit>; label: string }[] = [
  { value: 'bas', label: 'Bas' },
  { value: 'normal', label: 'Normal' },
  { value: 'eleve', label: 'Élevé' },
];

function ButtonGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{legend}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={legend}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            data-pressed={value === option.value}
            className="rounded-full border px-3 py-1 text-sm data-[pressed=true]:bg-accent"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DetailsPanel({
  values,
  onChange,
}: {
  values: DetailsValues;
  onChange: (values: DetailsValues) => void;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" type="button">+ détails</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6 pt-4">
        {DETAIL_SLIDERS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Slider
              id={key}
              min={1}
              max={5}
              step={1}
              value={[values[key] ?? 3]}
              onValueChange={([value]) => onChange({ ...values, [key]: value })}
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label htmlFor="sommeilHeures">Heures de sommeil (nuit précédente)</Label>
          <Input
            id="sommeilHeures"
            type="number"
            step="0.5"
            value={values.sommeilHeures ?? ''}
            onChange={(e) => onChange({ ...values, sommeilHeures: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        {/* Native time input kept for this rarely-touched rhythm field — same v1 scope
            trade-off as the settings date picker, revisit if usage patterns say otherwise. */}
        <div className="space-y-1">
          <Label htmlFor="heureCoucher">Heure du coucher</Label>
          <Input
            id="heureCoucher"
            type="time"
            value={values.heureCoucher ?? ''}
            onChange={(e) => onChange({ ...values, heureCoucher: e.target.value || null })}
          />
        </div>
        <ButtonGroup
          legend="Entraînement"
          options={ENTRAINEMENT_OPTIONS}
          value={values.entrainement}
          onChange={(value) => onChange({ ...values, entrainement: value })}
        />
        <div className="space-y-1">
          <Label htmlFor="alcool">Verres d&apos;alcool</Label>
          <Input
            id="alcool"
            type="number"
            value={values.alcool ?? ''}
            onChange={(e) => onChange({ ...values, alcool: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="malade">Malade</Label>
          <Switch
            id="malade"
            checked={values.malade ?? false}
            onCheckedChange={(checked) => onChange({ ...values, malade: checked })}
            aria-label="malade"
          />
        </div>
        <ButtonGroup
          legend="Appétit"
          options={APPETIT_OPTIONS}
          value={values.appetit}
          onChange={(value) => onChange({ ...values, appetit: value })}
        />
        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={values.notes ?? ''}
            onChange={(e) => onChange({ ...values, notes: e.target.value })}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 8: Run to verify pass**

```bash
pnpm test details-panel
```
Expected: PASS.

- [ ] **Step 9: Wire both into `TodayForm`**

```tsx
// app/today/today-form.tsx
'use client';

import { useState } from 'react';
import { CoreSliders, type CoreValues } from '@/components/today/core-sliders';
import { MarkerToggles } from '@/components/today/marker-toggles';
import { DetailsPanel, type DetailsValues } from '@/components/today/details-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Entry, ScaleField } from '@/lib/db/schema';

export function TodayForm({
  date,
  packDay,
  existingEntry,
  defaults,
}: {
  date: string;
  packDay: number;
  existingEntry: Entry | null;
  defaults: Record<ScaleField, number>;
  recentEntries: { date: string }[];
}) {
  // pack_day is pre-filled from the automatic calculation but stays a manual
  // override per spec §5 — the stored value always wins over the computed one.
  const [packDayOverride, setPackDayOverride] = useState(existingEntry?.packDay ?? packDay);
  const [core, setCore] = useState<CoreValues>({
    noteGlobale: existingEntry?.noteGlobale ?? defaults.noteGlobale,
    humeurBasse: existingEntry?.humeurBasse ?? defaults.humeurBasse,
    energie: existingEntry?.energie ?? defaults.energie,
    envieSucre: existingEntry?.envieSucre ?? defaults.envieSucre,
  });
  const [crise, setCrise] = useState(existingEntry?.crise ?? false);
  const [noteCrise, setNoteCrise] = useState(existingEntry?.noteCrise ?? null);
  const [saignement, setSaignement] = useState(existingEntry?.saignement ?? 'none');
  const [details, setDetails] = useState<DetailsValues>({
    irritabilite: existingEntry?.irritabilite ?? undefined,
    anxiete: existingEntry?.anxiete ?? undefined,
    sensibilite: existingEntry?.sensibilite ?? undefined,
    libido: existingEntry?.libido ?? undefined,
    concentration: existingEntry?.concentration ?? undefined,
    ressentiEffort: existingEntry?.ressentiEffort ?? undefined,
    stress: existingEntry?.stress ?? undefined,
    sommeilQualite: existingEntry?.sommeilQualite ?? undefined,
    reveilsNocturnes: existingEntry?.reveilsNocturnes ?? undefined,
    envieSale: existingEntry?.envieSale ?? undefined,
    sommeilHeures: existingEntry?.sommeilHeures ?? null,
    heureCoucher: existingEntry?.heureCoucher ?? null,
    entrainement: existingEntry?.entrainement ?? undefined,
    alcool: existingEntry?.alcool ?? null,
    malade: existingEntry?.malade ?? false,
    appetit: existingEntry?.appetit ?? undefined,
    notes: existingEntry?.notes ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function markDirty() {
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        date,
        packDay: packDayOverride,
        ...core,
        crise,
        noteCrise,
        saignement,
        ...details,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="packDay">Jour</label>
        <Input
          id="packDay"
          type="number"
          min={1}
          value={packDayOverride}
          onChange={(e) => { setPackDayOverride(Number(e.target.value)); markDirty(); }}
          className="w-16 h-7 px-2"
        />
        <span>de la plaquette</span>
      </div>
      <CoreSliders
        values={core}
        onChange={(key, value) => {
          setCore((prev) => ({ ...prev, [key]: value }));
          markDirty();
        }}
      />
      <MarkerToggles
        crise={crise}
        noteCrise={noteCrise}
        saignement={saignement}
        onCriseChange={(value) => { setCrise(value); markDirty(); }}
        onNoteCriseChange={(value) => { setNoteCrise(value); markDirty(); }}
        onSaignementChange={(value) => { setSaignement(value); markDirty(); }}
      />
      <DetailsPanel values={details} onChange={(value) => { setDetails(value); markDirty(); }} />
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saved ? 'Enregistré' : 'Valider'}
      </Button>
    </main>
  );
}
```

- [ ] **Step 10: Manual verification**

```bash
pnpm dev
```
Log in, visit `/today`, toggle "Crise alimentaire" and confirm the note field appears, expand "+ détails" and confirm all ten sliders plus sleep hours, bedtime, entraînement, alcohol, malade, appétit, and notes fields appear, submit, reload, confirm every field's value persisted.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: /today marker toggles and collapsible details layer"
```

---

## Task 13: Catch-up banner for a missing yesterday

**Files:**
- Create: `components/today/catchup-banner.tsx`
- Modify: `app/today/page.tsx`
- Test: `components/today/catchup-banner.test.tsx`

**Interfaces:**
- Consumes: `isYesterdayMissing` from `lib/cycle/defaults.ts` (Task 5).
- Produces: a banner linking to `/today?date=<yesterday>`, reusing the `date` query param already read by Task 11's `page.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/today/catchup-banner.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CatchupBanner } from './catchup-banner';

describe('CatchupBanner', () => {
  it('renders nothing when yesterday is not missing', () => {
    const { container } = render(<CatchupBanner missing={false} yesterdayDate="2026-01-05" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links to yesterday when missing', () => {
    render(<CatchupBanner missing={true} yesterdayDate="2026-01-05" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/today?date=2026-01-05');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test catchup-banner
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// components/today/catchup-banner.tsx
import Link from 'next/link';

export function CatchupBanner({
  missing,
  yesterdayDate,
}: {
  missing: boolean;
  yesterdayDate: string;
}) {
  if (!missing) return null;

  return (
    <div className="rounded-md border px-4 py-3 text-sm flex items-center justify-between gap-4">
      <span>Il manque hier.</span>
      <Link href={`/today?date=${yesterdayDate}`} className="underline shrink-0">
        Tu complètes ?
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test catchup-banner
```
Expected: PASS.

- [ ] **Step 5: Wire into `/today` page**

```tsx
// app/today/page.tsx
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/db/settings-repo';
import { getEntryByDate, getRecentEntries } from '@/lib/db/entries-repo';
import { calcPackDay } from '@/lib/cycle/pack-day';
import { computeDefaults, isYesterdayMissing } from '@/lib/cycle/defaults';
import { TodayForm } from './today-form';
import { CatchupBanner } from '@/components/today/catchup-banner';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const settings = await getSettings();
  if (!settings) redirect('/settings');

  const { date } = await searchParams;
  const realToday = new Date().toISOString().slice(0, 10);
  const viewedDate = date ?? realToday;

  const [existingEntry, recentEntries] = await Promise.all([
    getEntryByDate(viewedDate),
    getRecentEntries(viewedDate, 14),
  ]);

  const packDay = calcPackDay(viewedDate, settings.dateDebutPlaquette, settings.pilulesActives, settings.joursArret);
  const defaults = computeDefaults(recentEntries);

  const yesterday = new Date(realToday);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);
  const showCatchup = viewedDate === realToday
    && isYesterdayMissing(recentEntries.map((e) => ({ date: e.date })), realToday);

  return (
    <>
      <CatchupBanner missing={showCatchup} yesterdayDate={yesterdayDate} />
      <TodayForm
        date={viewedDate}
        packDay={packDay}
        existingEntry={existingEntry}
        defaults={defaults}
        recentEntries={recentEntries.map((e) => ({ date: e.date }))}
      />
    </>
  );
}
```

- [ ] **Step 6: Manual verification**

Insert an entry for two days ago but not yesterday, visit `/today`, confirm the banner appears and its link opens `/today?date=<yesterday>` pre-filled for that date. Then fill yesterday's entry and reload today — confirm the banner disappears.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: gentle catch-up prompt for a missing yesterday"
```

---

## Task 14: PWA manifest and service worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `app/layout.tsx`
- Create: `components/sw-register.tsx`

**Interfaces:**
- Produces: an installable PWA; no other task depends on this one.

- [ ] **Step 1: Write the manifest**

```json
// public/manifest.json
{
  "name": "Macy",
  "short_name": "Macy",
  "description": "Suivi de cycle personnel",
  "start_url": "/today",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate placeholder icons**

```bash
pnpm dlx sharp-cli -i /dev/stdin -o public/icons/icon-192.png resize 192 192 <<< '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#111111"/></svg>' 2>/dev/null || echo "install any square PNG at public/icons/icon-192.png and icon-512.png manually if this command is unavailable"
```
If the above doesn't work in this environment, place any 192×192 and 512×512 PNG at those paths manually — they're visual placeholders, swappable later.

- [ ] **Step 3: Write a minimal service worker (installability only, no offline caching)**

```javascript
// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

- [ ] **Step 4: Register the service worker client-side**

```tsx
// components/sw-register.tsx
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  return null;
}
```

- [ ] **Step 5: Wire manifest link and registration into the root layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { ServiceWorkerRegister } from '@/components/sw-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Macy',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Manual verification**

```bash
pnpm build && pnpm start
```
Open `http://localhost:3000/today` in Chrome, open DevTools → Application → Manifest, confirm it loads with no errors and an install icon appears in the address bar.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: installable PWA manifest and minimal service worker"
```

---

## Task 15: Final verification against the spec's non-negotiables

No new code — this is a manual review pass against spec §2 and §6.1 before calling the MVP done.

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```
Expected: every test from Tasks 3–13 passes.

- [ ] **Step 2: Run the production build**

```bash
pnpm build
```
Expected: no type errors, no lint errors.

- [ ] **Step 3: Copy audit (spec §2.1, §7)**

Grep for language that could read as a verdict or diagnosis:
```bash
grep -rniE "tes symptômes|probablement|anormal|il faudrait|devrais" app/ components/ lib/
```
Expected: no matches. If any surface, rewrite them as neutral/descriptive text.

- [ ] **Step 4: Neutral styling audit for `crise` (spec §2.3)**

Review `components/today/marker-toggles.tsx` — confirm no red/alarm color classes are applied to the crise switch or its label (it should look identical in weight to every other toggle on the screen).

- [ ] **Step 5: Time the flat-day flow (spec §6.1 budget: < 5s)**

With `/settings` already configured and no existing entry for today, load `/today` and time from page load to a visible "Enregistré" state while touching only the "Valider" button (accepting every default). This should be well under 5 seconds — if it isn't, the defaults or the save round-trip are the bottleneck to investigate before moving to Phase 2.

- [ ] **Step 6: Time the fully-detailed flow (spec §6.1 budget: < 30s)**

Repeat, this time adjusting all four core sliders, toggling crise, picking a saignement value, expanding "+ détails" and setting every field, then saving. Should be under 30 seconds.

- [ ] **Step 7: Commit any fixes from steps 3–6, or if none were needed, tag the milestone**

```bash
git commit --allow-empty -m "chore: Phase 0 + Phase 1 (foundations + /today) verified against spec"
```
