// A felhasználó minden adatát (haladás, pontszám, napi sorozat) a Firestore-ban
// a users/{uid} dokumentumban tároljuk - egyetlen dokumentum, mert kicsi az adat.

import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_PROGRESS, VariantProgress } from './progress';
import { Rating, newRating } from './glicko2';
import { StreakState, newStreak } from './streak';
import { HistoryEntry } from './historyStats';

export type StoredUserData = {
  russian: VariantProgress;
  international: VariantProgress;
  russianRating: Rating;
  internationalRating: Rating;
  streak: StreakState;
};

export function emptyUserData(dailyGoal = 1): StoredUserData {
  return {
    russian: INITIAL_PROGRESS,
    international: INITIAL_PROGRESS,
    russianRating: newRating(1400),
    internationalRating: newRating(1400),
    streak: newStreak(dailyGoal),
  };
}

export const EMPTY_STORED_PROGRESS = emptyUserData();

// Csak azt mentjük/olvassuk, ami a szerveren releváns - a `screen` (melyik képernyőn
// állunk épp) tisztán UI-állapot, nem kell perzisztálni, induláskor úgyis "puzzle"-ra áll.
function progressToStorable(p: VariantProgress) {
  return {
    levelIndex: p.levelIndex,
    puzzleIndex: p.puzzleIndex,
    completed: p.completed,
    unlockedLevels: p.unlockedLevels,
  };
}

function progressFromStorable(raw: unknown): VariantProgress {
  const r = (raw ?? {}) as Partial<ReturnType<typeof progressToStorable>>;
  return {
    levelIndex: r.levelIndex ?? 0,
    puzzleIndex: r.puzzleIndex ?? 0,
    screen: 'puzzle',
    completed: r.completed ?? [],
    unlockedLevels: r.unlockedLevels ?? [],
  };
}

function ratingFromStorable(raw: unknown): Rating {
  const r = (raw ?? {}) as Partial<Rating>;
  return {
    rating: r.rating ?? 1400,
    deviation: r.deviation ?? 350,
    volatility: r.volatility ?? 0.06,
  };
}

function streakFromStorable(raw: unknown): StreakState {
  const r = (raw ?? {}) as Partial<StreakState>;
  return {
    dailyGoal: r.dailyGoal ?? 1,
    current: r.current ?? 0,
    longest: r.longest ?? 0,
    solvedToday: r.solvedToday ?? 0,
    solvedTodayDate: r.solvedTodayDate ?? null,
    lastGoalMetDate: r.lastGoalMetDate ?? null,
  };
}

export async function loadUserData(uid: string): Promise<StoredUserData> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return emptyUserData();
  const data = snap.data();
  return {
    russian: progressFromStorable(data.russian),
    international: progressFromStorable(data.international),
    russianRating: ratingFromStorable(data.russianRating),
    internationalRating: ratingFromStorable(data.internationalRating),
    streak: streakFromStorable(data.streak),
  };
}

// `merge: true`, hogy részleges frissítésnél (pl. csak a streak változott) a többi
// mezőt ne írjuk felül semmivel.
export async function saveUserData(uid: string, data: StoredUserData): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      russian: progressToStorable(data.russian),
      international: progressToStorable(data.international),
      russianRating: data.russianRating,
      internationalRating: data.internationalRating,
      streak: data.streak,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

// Egy adott felhasználó kezdeti adatainak létrehozása regisztrációkor
// (ekkor még csak a napi célt kérdezzük meg, minden más alapértékről indul).
export async function initializeUserData(uid: string, dailyGoal: number): Promise<void> {
  await saveUserData(uid, emptyUserData(dailyGoal));
}

// --- Feladvány-pontszámok (megosztott, nem felhasználónkénti adat) ---
// A feladvány "ellenfélként" viselkedik a Glicko-2 rendszerben: minden kísérlet után
// az ő pontszáma is változik, ahogy a lidraughts-nál is.

function puzzleDocId(variant: 'russian' | 'international', levelId: string, puzzleId: string): string {
  return `${variant}_${levelId}_${puzzleId}`;
}

export async function loadPuzzleRating(
  variant: 'russian' | 'international',
  levelId: string,
  puzzleId: string
): Promise<Rating> {
  const snap = await getDoc(doc(db, 'puzzleRatings', puzzleDocId(variant, levelId, puzzleId)));
  if (!snap.exists()) return newRating(1400);
  return ratingFromStorable(snap.data());
}

export async function savePuzzleRating(
  variant: 'russian' | 'international',
  levelId: string,
  puzzleId: string,
  rating: Rating
): Promise<void> {
  await setDoc(doc(db, 'puzzleRatings', puzzleDocId(variant, levelId, puzzleId)), rating);
}

// --- Megoldás-napló (a profil statisztikáihoz és a pontszám-grafikonhoz) ---
// users/{uid}/history/{autoId} - minden feladvány-megoldás egy bejegyzés.

export async function appendHistoryEntry(uid: string, entry: HistoryEntry): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'history'), entry);
}

// A legutóbbi `max` bejegyzést tölti be (nem az összeset, hogy ne nőjön korlátlanul
// az olvasási költség/méret egy régóta aktív felhasználónál).
export async function loadHistory(uid: string, max = 1000): Promise<HistoryEntry[]> {
  const q = query(collection(db, 'users', uid, 'history'), orderBy('timestamp', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as HistoryEntry);
}