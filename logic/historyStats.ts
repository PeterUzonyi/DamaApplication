// Egy feladvány-megoldás naplóbejegyzése, és az ebből számolt összesítések
// (napi siker/hiba arány variánsonként, pontszám-idősor a grafikonhoz) -
// pont úgy, ahogy a lidraughts is mutatja a saját irányítópultján.

export type Variant = 'russian' | 'international';

export type HistoryEntry = {
  timestamp: number; // Date.now() a megoldás pillanatában
  date: string; // YYYY-MM-DD, a `timestamp`-ből származtatva (eszköz helyi ideje)
  variant: Variant;
  correct: boolean; // hiba nélkül oldotta-e meg (ez számított győzelemnek a Glicko-2-nél is)
  ratingAfter: number; // a megoldás UTÁNI pontszám (ebből rajzoljuk a grafikont)
};

export type DailyStat = {
  date: string;
  russian: { correct: number; incorrect: number };
  international: { correct: number; incorrect: number };
};

// Dátum szerint csökkenő sorrendbe (legújabb elöl), variánsonként szétbontott
// napi összesítés - erre épül a "mikor mennyit oldott meg" lista a profilon.
export function aggregateDailyStats(entries: HistoryEntry[]): DailyStat[] {
  const byDate = new Map<string, DailyStat>();

  for (const entry of entries) {
    let stat = byDate.get(entry.date);
    if (!stat) {
      stat = {
        date: entry.date,
        russian: { correct: 0, incorrect: 0 },
        international: { correct: 0, incorrect: 0 },
      };
      byDate.set(entry.date, stat);
    }
    const bucket = stat[entry.variant];
    if (entry.correct) bucket.correct++;
    else bucket.incorrect++;
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// A pontszám alakulása időben, egy adott variánsra szűrve, időrendben (grafikonhoz)
export function ratingSeries(entries: HistoryEntry[], variant: Variant): { timestamp: number; rating: number }[] {
  return entries
    .filter(e => e.variant === variant)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(e => ({ timestamp: e.timestamp, rating: e.ratingAfter }));
}