// Ezt a szkriptet kell futtatni minden alkalommal, amikor egy level_N.json fájlt
// hozzáadsz/törölsz/átnevezel a data/puzzles/russian vagy data/puzzles/international
// mappában. Automatikusan legenerálja a logic/levelsData.ts-t a mappák tartalma alapján.
//
// Futtatás a projekt gyökeréből: npx tsx scripts/generateLevels.ts

import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const VARIANTS = [
  { key: 'russian', folder: 'data/puzzles/russian', constName: 'RUSSIAN_LEVELS' },
  { key: 'international', folder: 'data/puzzles/international', constName: 'INTERNATIONAL_LEVELS' },
] as const;

// "level_2.json" -> 2, hogy szám szerint (ne ábécé szerint: level_10 < level_2) rendezzünk
function levelNumber(fileName: string): number {
  const match = /^level_(\d+)\.json$/.exec(fileName);
  if (!match) throw new Error(`Váratlan fájlnév (level_N.json formátum kell): ${fileName}`);
  return parseInt(match[1], 10);
}

let imports = '';
let arrays = '';

for (const variant of VARIANTS) {
  const files = readdirSync(join(process.cwd(), variant.folder))
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => levelNumber(a) - levelNumber(b));

  if (files.length === 0) {
    console.warn(`Figyelem: a ${variant.folder} mappa üres, ${variant.constName} üres lista lesz.`);
  }

  const entries = files.map(file => {
    const n = levelNumber(file);
    const varName = `${variant.key}_${n}`;
    imports += `import ${varName} from '../${variant.folder}/${file}';\n`;
    return `  { id: '${variant.key}_level_${n}', title: '${n}. szint', puzzles: ${varName} as Puzzle[] },`;
  });

  arrays += `export const ${variant.constName}: Level[] = [\n${entries.join('\n')}\n];\n\n`;
}

const output = `// EZ A FÁJL AUTOMATIKUSAN GENERÁLT! Ne szerkeszd kézzel.
// Új szint hozzáadásához tedd be a JSON fájlt a data/puzzles/<variáns>/level_N.json
// helyre, majd futtasd: npx tsx scripts/generateLevels.ts

import { Level } from './progress';
import { Puzzle } from './engine';

${imports}
${arrays}`;

writeFileSync(join(process.cwd(), 'logic/levelsData.ts'), output);
console.log('logic/levelsData.ts frissítve.');