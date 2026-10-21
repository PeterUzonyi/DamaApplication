// Duplikált feladványok keresése a data/puzzles mappa összes JSON fájljában.
//
// Használat (a projekt gyökeréből):
//   npx tsx scripts/findDuplicates.ts
//   npx tsx scripts/findDuplicates.ts data/puzzles/russian        (csak egy mappa)
//   npx tsx scripts/findDuplicates.ts --out jelentes.txt          (jelentés mentése fájlba is)
//
// Kapcsolók:
//   --out <fájl>   a jelentést UTF-8 szövegfájlba is kiírja (Windows-on így nem torzulnak az ékezetek)
//   --compact      nem rajzolja ki a táblákat (rövidebb jelentés)
//   --ids          azt is jelzi, ha ugyanaz az azonosító (pl. ru_001) több fájlban is előfordul
//
// A mappa összes alkönyvtárát bejárja; az első alkönyvtár neve adja a variánst
// (russian / international), a különböző variánsokat nem hasonlítja össze egymással.
// A fájlnevek bármilyenek lehetnek (nem kell level_N.json formátum).
//
// Kilépési kód: 0 = nincs duplikátum, 1 = van duplikátum, 2 = hiba (pl. nem olvasható mappa).
// A szkript SEMMIT nem módosít és nem töröl - csak jelentést készít.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative, sep } from 'path';
import { SourceFile, analyze, formatReport } from './lib/duplicates';

type Args = { root: string; out: string | null; compact: boolean; ids: boolean };

function fail(message: string): never {
  console.error(`HIBA: ${message}`);
  process.exit(2);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { root: join('data', 'puzzles'), out: null, compact: false, ids: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--compact') args.compact = true;
    else if (a === '--ids') args.ids = true;
    else if (a === '--out') {
      const v = argv[++i];
      if (!v) fail('Az --out kapcsolónak meg kell adni egy fájlnevet.');
      args.out = v;
    } else if (a.startsWith('--')) fail(`Ismeretlen kapcsoló: ${a}`);
    else args.root = a;
  }
  return args;
}

// Rekurzívan összegyűjti a .json fájlokat, stabil (ábécé szerinti) sorrendben
function listJsonFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) result.push(...listJsonFiles(full));
    else if (entry.toLowerCase().endsWith('.json')) result.push(full);
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.root) || !statSync(args.root).isDirectory()) {
    fail(`A mappa nem található: ${args.root}`);
  }

  const files: SourceFile[] = listJsonFiles(args.root).map(full => {
    // a variáns a vizsgált mappán belüli első alkönyvtár neve
    const inside = relative(args.root, full).split(sep);
    const variant = inside.length > 1 ? inside[0] : '(gyökér)';
    return {
      path: relative(process.cwd(), full).split(sep).join('/'),
      variant,
      text: readFileSync(full, 'utf8'),
    };
  });

  if (files.length === 0) fail(`Nem található .json fájl itt: ${args.root}`);

  const analysis = analyze(files, { checkIds: args.ids });
  const report = formatReport(analysis, args.root.split(sep).join('/'), { compact: args.compact });

  console.log(report);
  if (args.out) {
    // UTF-8 BOM-mal, hogy a Windows-os Jegyzettömb/PowerShell is helyesen mutassa az ékezeteket
    writeFileSync(args.out, '\uFEFF' + report, 'utf8');
    console.log(`A jelentés elmentve ide: ${args.out}`);
  }

  process.exit(analysis.groups.length > 0 ? 1 : 0);
}

main();