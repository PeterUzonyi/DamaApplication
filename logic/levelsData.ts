// EZ A FÁJL AUTOMATIKUSAN GENERÁLT! Ne szerkeszd kézzel.
// Új szint hozzáadásához tedd be a JSON fájlt a data/puzzles/<variáns>/level_N.json
// helyre, majd futtasd: npx tsx scripts/generateLevels.ts

import { Level } from './progress';
import { Puzzle } from './engine';

import russian_1 from '../data/puzzles/russian/level_1.json';
import russian_2 from '../data/puzzles/russian/level_2.json';
import russian_3 from '../data/puzzles/russian/level_3.json';
import international_1 from '../data/puzzles/international/level_1.json';

export const RUSSIAN_LEVELS: Level[] = [
  { id: 'russian_level_1', title: '1. szint', puzzles: russian_1 as Puzzle[] },
  { id: 'russian_level_2', title: '2. szint', puzzles: russian_2 as Puzzle[] },
  { id: 'russian_level_3', title: '3. szint', puzzles: russian_3 as Puzzle[] },
];

export const INTERNATIONAL_LEVELS: Level[] = [
  { id: 'international_level_1', title: '1. szint', puzzles: international_1 as Puzzle[] },
];

