// A felhasználó haladását a Firestore-ban a users/{uid} dokumentumban tároljuk.
// Egyetlen dokumentum mindkét variánsnak, mert kicsi az adat és ritkán módosul sokat.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_PROGRESS, VariantProgress } from './progress';

export type StoredProgress = {
  russian: VariantProgress;
  international: VariantProgress;
};

export const EMPTY_STORED_PROGRESS: StoredProgress = {
  russian: INITIAL_PROGRESS,
  international: INITIAL_PROGRESS,
};

// Csak azt mentjük/olvassuk, ami a szerveren releváns - a `screen` (melyik képernyőn
// állunk épp) tisztán UI-állapot, nem kell perzisztálni, induláskor úgyis "puzzle"-ra áll.
function toStorable(p: VariantProgress) {
  return {
    levelIndex: p.levelIndex,
    puzzleIndex: p.puzzleIndex,
    completed: p.completed,
    unlockedLevels: p.unlockedLevels,
  };
}

function fromStorable(raw: unknown): VariantProgress {
  const r = (raw ?? {}) as Partial<ReturnType<typeof toStorable>>;
  return {
    levelIndex: r.levelIndex ?? 0,
    puzzleIndex: r.puzzleIndex ?? 0,
    screen: 'puzzle',
    completed: r.completed ?? [],
    unlockedLevels: r.unlockedLevels ?? [],
  };
}

export async function loadProgress(uid: string): Promise<StoredProgress> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return EMPTY_STORED_PROGRESS;
  const data = snap.data();
  return {
    russian: fromStorable(data.russian),
    international: fromStorable(data.international),
  };
}

// `merge: true`, hogy ha csak az egyik variáns változott, a másikat ne írjuk felül semmivel
export async function saveProgress(uid: string, progress: StoredProgress): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      russian: toStorable(progress.russian),
      international: toStorable(progress.international),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}