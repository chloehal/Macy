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
