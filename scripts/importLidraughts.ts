// Lidraughts study (PDN) -> feladvány hozzáadása a projekt szintfájljaihoz.
//
// Használat (a projekt gyökeréből):
//   npx tsx scripts/importLidraughts.ts <fájl.pdn> [kapcsolók]
//   npx tsx scripts/importLidraughts.ts - [kapcsolók]        (a PDN-t a bemenetről olvassa)
//
// Kapcsolók:
//   --variant russian|international   a variáns kényszerítése (alapból a PDN fejlécéből ismeri fel)
//   --level N                         melyik szintfájlba kerüljön (alapból a legmagasabb meglévő)
//   --only N                          csak a fájl N-edik játszmáját importálja (1-től számozva)
//   --dry-run                         csak kiírja az eredményt, nem módosít fájlt
//   --skip-errors                     a hibás játszmákat kihagyja, a jókat beírja
//
// A lidraughts-on egy study-fejezet PDN-jét a fejezet "Megosztás / Exportálás" (Share & export)
// menüjében találod; a PDN szövegét elmentheted .pdn fájlba, vagy a `-` jellel a parancsba
// is bemásolhatod/átirányíthatod.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Puzzle, Variant } from '../logic/engine';
import {
  appendToLevelFileText,
  importGame,
  parsePdn,
  renderBoardAscii,
  detectVariant,
} from './lib/lidraughtsImport';

type Args = {
  file: string | null;
  variant?: Variant;
  level?: number;
  only?: number;
  dryRun: boolean;
  skipErrors: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { file: null, dryRun: false, skipErrors: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-errors') args.skipErrors = true;
    else if (a === '--variant') {
      const v = argv[++i];
      if (v !== 'russian' && v !== 'international') fail('A --variant értéke russian vagy international lehet.');
      args.variant = v as Variant;
    } else if (a === '--level') args.level = parseInt(argv[++i], 10);
    else if (a === '--only') args.only = parseInt(argv[++i], 10);
    else if (a.startsWith('--')) fail(`Ismeretlen kapcsoló: ${a}`);
    else args.file = a;
  }
  if (args.level !== undefined && !(args.level >= 1)) fail('A --level értéke pozitív egész legyen.');
  if (args.only !== undefined && !(args.only >= 1)) fail('A --only értéke pozitív egész legyen.');
  return args;
}

function fail(message: string): never {
  console.error(`HIBA: ${message}`);
  process.exit(1);
}

const PREFIX: Record<Variant, string> = { russian: 'ru_', international: 'int_' };

function levelDir(variant: Variant): string {
  return join(process.cwd(), 'data', 'puzzles', variant);
}

function existingLevelNumbers(variant: Variant): number[] {
  const dir = levelDir(variant);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map(f => /^level_(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => parseInt(m[1], 10))
    .sort((a, b) => a - b);
}

// A legnagyobb meglévő azonosító-szám az adott variánsnál (pl. ru_010 -> 10)
function maxExistingIdNumber(variant: Variant): number {
  let max = 0;
  for (const n of existingLevelNumbers(variant)) {
    const text = readFileSync(join(levelDir(variant), `level_${n}.json`), 'utf8');
    for (const m of text.matchAll(new RegExp(`"id"\\s*:\\s*"${PREFIX[variant]}(\\d+)"`, 'g'))) {
      max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return max;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) fail('Add meg a PDN fájl útvonalát (vagy `-`-t a bemenetről olvasáshoz).');

  const text = args.file === '-' ? readFileSync(0, 'utf8') : readFileSync(args.file!, 'utf8');
  let games = parsePdn(text);
  if (games.length === 0) fail('Nem található játszma a PDN-ben.');

  if (args.only !== undefined) {
    if (args.only > games.length) fail(`A fájlban csak ${games.length} játszma van.`);
    games = [games[args.only - 1]];
  }

  const nextId: Partial<Record<Variant, number>> = {};
  const imported: { puzzle: Puzzle; variant: Variant }[] = [];
  let errors = 0;

  games.forEach((game, idx) => {
    const label = `${idx + 1}. játszma`;
    const variantGuess = detectVariant(game.headers, args.variant);
    try {
      if (!variantGuess) {
        // a részletes hibaüzenetet az importGame adja
        importGame(game, 'x', args.variant);
      }
      const variant = variantGuess!;
      if (nextId[variant] === undefined) nextId[variant] = maxExistingIdNumber(variant) + 1;
      const id = `${PREFIX[variant]}${String(nextId[variant]).padStart(3, '0')}`;

      const result = importGame(game, id, args.variant);
      nextId[variant] = nextId[variant]! + 1;
      imported.push({ puzzle: result.puzzle, variant });

      console.log(`\n✔ ${label} -> ${id} (${variant === 'russian' ? 'orosz' : 'nemzetközi'}, ${result.puzzle.solution.length} lépés)`);
      for (const note of result.notes) console.log(`  ! ${note}`);
      console.log(renderBoardAscii(result.puzzle.board).replace(/^/gm, '  '));
      console.log(`  Megoldás: ${result.puzzle.solution.join(', ')}`);
    } catch (e) {
      errors++;
      console.error(`\n✘ ${label}: ${(e as Error).message}`);
    }
  });

  console.log(`\n${imported.length} sikeres, ${errors} hibás játszma.`);
  console.log('Ellenőrizd a fenti ábrákat a lidraughts-on látott állással összevetve (orientáció, színek)!');

  if (errors > 0 && !args.skipErrors) {
    console.error('Hiba miatt nem írtam semmit. (A hibás játszmák kihagyásához használd a --skip-errors kapcsolót.)');
    process.exit(1);
  }
  if (imported.length === 0) process.exit(errors > 0 ? 1 : 0);

  for (const variant of ['russian', 'international'] as Variant[]) {
    const puzzles = imported.filter(p => p.variant === variant).map(p => p.puzzle);
    if (puzzles.length === 0) continue;

    const levels = existingLevelNumbers(variant);
    const level = args.level ?? (levels.length > 0 ? levels[levels.length - 1] : 1);
    const target = join(levelDir(variant), `level_${level}.json`);
    const existing = existsSync(target) ? readFileSync(target, 'utf8') : null;
    const output = appendToLevelFileText(existing, puzzles);

    if (args.dryRun) {
      console.log(`\n[dry-run] ${puzzles.length} feladvány kerülne ide: ${target}`);
    } else {
      writeFileSync(target, output);
      console.log(`\n${puzzles.length} feladvány hozzáfűzve: ${target}`);
      if (existing === null) {
        console.log('Új szintfájl jött létre - futtasd: npx tsx scripts/generateLevels.ts');
      }
    }
  }
}

main();