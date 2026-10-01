// Szintek és haladás (Duolingo-szerű): egy szint = egy feladványlista (egy JSON fájl).
// Tiszta függvények, így a UI-tól és a Firestore-tól is függetlenül tesztelhetők.
//
// FONTOS TERVEZÉSI DÖNTÉS a visszamenőleges szint-bővítésről:
// - `completed`: mely feladványok vannak megoldva (ID alapján, nem pozíció alapján).
//   Ha egy szintbe utólag bekerül egy új feladvány, ez a lista nem "felejt" semmit,
//   csak az új feladvány nem lesz benne -> a szint átmenetileg "nem teljes".
// - `unlockedLevels`: mely szintek NYITVA VANNAK a felhasználó számára. Ez a lista
//   CSAK BŐVÜLHET, soha nem szűkül. Ha egy felhasználó egyszer elért egy szintet,
//   az onnantól véglegesen elérhető marad neki, akkor is, ha egy korábbi szintet
//   utólag kibővítünk egy új feladvánnyal (a szigorú, "vissza kell menni pótolni"
//   viselkedés helyett).

import { Puzzle } from './engine';

export type Level = { id: string; title: string; puzzles: Puzzle[] };

export type Screen = 'puzzle' | 'levelComplete';

export type VariantProgress = {
  levelIndex: number; // melyik szintet nézzük
  puzzleIndex: number; // melyik feladványnál tartunk a szinten belül
  screen: Screen;
  completed: string[]; // megoldott feladványok kulcsai (szint azonosító + feladvány azonosító)
  unlockedLevels: string[]; // véglegesen feloldott szint-azonosítók (csak bővül)
};

export const INITIAL_PROGRESS: VariantProgress = {
  levelIndex: 0,
  puzzleIndex: 0,
  screen: 'puzzle',
  completed: [],
  unlockedLevels: [],
};

export function puzzleKey(level: Level, puzzle: Puzzle): string {
  return `${level.id}:${puzzle.id}`;
}

export function isPuzzleDone(level: Level, index: number, completed: string[]): boolean {
  return completed.includes(puzzleKey(level, level.puzzles[index]));
}

export function isLevelComplete(level: Level, completed: string[]): boolean {
  return level.puzzles.every((_, i) => isPuzzleDone(level, i, completed));
}

// Az első megoldatlan feladvány sorszáma ("ez jön most"). Ha mind megvan, 0.
export function frontierIndex(level: Level, completed: string[]): number {
  const i = level.puzzles.findIndex((_, k) => !isPuzzleDone(level, k, completed));
  return i === -1 ? 0 : i;
}

// A 0. szint mindig nyitva; minden más szint csak akkor, ha korábban már bekerült
// az `unlockedLevels` listába (ez a lista soha nem szűkül vissza).
export function isLevelUnlocked(levels: Level[], index: number, p: VariantProgress): boolean {
  return index === 0 || p.unlockedLevels.includes(levels[index].id);
}

// Megoldott feladványt újra lehet játszani, a soron következőt el lehet kezdeni, a többi zárolt
export function isPuzzleUnlocked(level: Level, index: number, completed: string[]): boolean {
  return index <= frontierIndex(level, completed) || isPuzzleDone(level, index, completed);
}

// Végigmegy a szinteken, és minden olyan szintet felvesz `unlockedLevels`-be, ami elé
// (az előző szint teljesítése miatt) már el kellene jutnia a felhasználónak - de csak
// HOZZÁAD, sosem töröl belőle. Ezt kell hívni minden `completed`-et érintő változás után.
export function withUnlockedLevels(p: VariantProgress, levels: Level[]): VariantProgress {
  let unlocked = p.unlockedLevels;
  for (let i = 0; i < levels.length - 1; i++) {
    const nextId = levels[i + 1].id;
    if (isLevelComplete(levels[i], p.completed) && !unlocked.includes(nextId)) {
      unlocked = [...unlocked, nextId];
    }
  }
  return unlocked === p.unlockedLevels ? p : { ...p, unlockedLevels: unlocked };
}

export function markSolved(p: VariantProgress, key: string, levels: Level[]): VariantProgress {
  const next = p.completed.includes(key) ? p : { ...p, completed: [...p.completed, key] };
  return withUnlockedLevels(next, levels);
}

// "Következő" gomb: a szinten belül léptet, a szint végén a szint-teljesítés képernyőre visz
export function goToNext(p: VariantProgress, levels: Level[]): VariantProgress {
  const level = levels[p.levelIndex];
  if (p.puzzleIndex < level.puzzles.length - 1) {
    return { ...p, puzzleIndex: p.puzzleIndex + 1 };
  }
  if (isLevelComplete(level, p.completed)) {
    return { ...p, screen: 'levelComplete' };
  }
  // Csak szabad böngészésnél fordulhat elő: vissza az első megoldatlan feladványhoz
  return { ...p, puzzleIndex: frontierIndex(level, p.completed) };
}

export function selectPuzzle(p: VariantProgress, index: number): VariantProgress {
  return { ...p, puzzleIndex: index, screen: 'puzzle' };
}

export function selectLevel(p: VariantProgress, levels: Level[], levelIndex: number): VariantProgress {
  const level = levels[levelIndex];
  return {
    ...p,
    levelIndex,
    puzzleIndex: frontierIndex(level, p.completed),
    screen: 'puzzle',
  };
}

export function goToNextLevel(p: VariantProgress, levels: Level[]): VariantProgress {
  return p.levelIndex + 1 < levels.length ? selectLevel(p, levels, p.levelIndex + 1) : p;
}

export function replayLevel(p: VariantProgress): VariantProgress {
  return { ...p, puzzleIndex: 0, screen: 'puzzle' };
}