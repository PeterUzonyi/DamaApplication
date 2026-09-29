// Szintek és haladás (Duolingo-szerű): egy szint = egy feladványlista (egy JSON fájl).
// Tiszta függvények, így a UI-tól függetlenül tesztelhetők.

import { Puzzle } from './engine';

export type Level = { id: string; title: string; puzzles: Puzzle[] };

export type Screen = 'puzzle' | 'levelComplete';

export type VariantProgress = {
  levelIndex: number; // melyik szintet nézzük
  puzzleIndex: number; // melyik feladványnál tartunk a szinten belül
  screen: Screen;
  completed: string[]; // megoldott feladványok kulcsai (szint azonosító + feladvány azonosító)
};

export const INITIAL_PROGRESS: VariantProgress = {
  levelIndex: 0,
  puzzleIndex: 0,
  screen: 'puzzle',
  completed: [],
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

// Egy szint akkor nyílik meg, ha az előző szint minden feladványa megoldva
export function isLevelUnlocked(levels: Level[], index: number, completed: string[]): boolean {
  return index === 0 || isLevelComplete(levels[index - 1], completed);
}

// Megoldott feladványt újra lehet játszani, a soron következőt el lehet kezdeni, a többi zárolt
export function isPuzzleUnlocked(level: Level, index: number, completed: string[]): boolean {
  return index <= frontierIndex(level, completed) || isPuzzleDone(level, index, completed);
}

export function markSolved(p: VariantProgress, key: string): VariantProgress {
  return p.completed.includes(key) ? p : { ...p, completed: [...p.completed, key] };
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