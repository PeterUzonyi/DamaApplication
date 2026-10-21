// Feladvány-duplikátumok keresése a szintfájlok között.
//
// Két feladvány akkor számít duplikátumnak, ha UGYANAZON a variánson belül (mappa:
// russian / international) pontosan egyezik a `board` (a bábuk elhelyezkedése).
// Az azonosító (id) és a megoldás eltérhet - pont az az érdekes, ha a megoldások eltérnek,
// mert akkor el kell dönteni, melyik változatot tartsd meg.
//
// Ez a fájl tiszta elemző logika (nem olvas fájlt), hogy külön tesztelhető legyen.

export type SourceFile = { path: string; variant: string; text: string };

export type PuzzleRef = {
  file: string;
  variant: string;
  index: number; // a feladvány sorszáma a fájlban (0-tól)
  line: number | null; // az "id" sorának száma a fájlban (ha megállapítható)
  id: string;
  board: string[];
  solution: string[];
};

export type DuplicateGroup = {
  variant: string;
  board: string[];
  refs: PuzzleRef[];
  solutionsIdentical: boolean;
};

export type FileSummary = {
  file: string;
  variant: string;
  total: number; // érvényes feladványok száma a fájlban
  inDuplicateGroups: number; // ezek közül hány tartozik duplikált csoportba
  overlaps: { file: string; count: number }[]; // hány feladványának van másolata az adott másik fájlban
  fullyCovered: boolean; // minden feladványának van másolata MÁS fájlban is
};

export type Analysis = {
  fileCount: number;
  puzzleCount: number;
  groups: DuplicateGroup[];
  redundantCopies: number; // az első példányon felüli másolatok száma
  files: FileSummary[];
  sameFileIdDuplicates: { file: string; id: string; indexes: number[] }[];
  crossFileIdReuse: { variant: string; id: string; files: string[] }[];
  problems: string[];
};

export type AnalyzeOptions = { checkIds?: boolean };

// A fájl elején lévő BOM-ot (Windows-os szerkesztők gyakran teszik oda) el kell távolítani,
// különben a JSON.parse hibát dob.
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Az `"id"` mezők sorszámai a fájlszövegben - ha pontosan annyi van, ahány feladvány,
// akkor az n-edik találat az n-edik feladványé, és megadhatunk sorszámot ("fájl:sor").
function findIdLines(text: string): number[] {
  const lines = text.split('\n');
  const found: number[] = [];
  lines.forEach((line, i) => {
    if (/"id"\s*:/.test(line)) found.push(i + 1);
  });
  return found;
}

export function analyze(files: SourceFile[], options: AnalyzeOptions = {}): Analysis {
  const problems: string[] = [];
  const refs: PuzzleRef[] = [];
  const fileOrder: { file: string; variant: string }[] = [];

  for (const f of files) {
    fileOrder.push({ file: f.path, variant: f.variant });

    let data: unknown;
    try {
      data = JSON.parse(stripBom(f.text));
    } catch (e) {
      problems.push(`${f.path}: érvénytelen JSON (${(e as Error).message})`);
      continue;
    }
    if (!Array.isArray(data)) {
      problems.push(`${f.path}: a fájl tartalma nem feladvány-lista (tömb), kihagytam.`);
      continue;
    }

    const idLines = findIdLines(f.text);
    const useLines = idLines.length === data.length && idLines.every((l, i) => i === 0 || l > idLines[i - 1]);

    data.forEach((entry, index) => {
      const e = entry as { id?: unknown; board?: unknown; solution?: unknown };
      const boardOk =
        Array.isArray(e?.board) && e.board.length > 0 && e.board.every(r => typeof r === 'string');
      if (!boardOk) {
        problems.push(`${f.path} #${index + 1}: hibás vagy hiányzó "board", kihagytam az összehasonlításból.`);
        return;
      }
      refs.push({
        file: f.path,
        variant: f.variant,
        index,
        line: useLines ? idLines[index] : null,
        id: e.id === undefined || e.id === null ? '' : String(e.id),
        board: (e.board as string[]).map(r => r.trim()),
        solution: Array.isArray(e.solution) ? e.solution.map(String) : [],
      });
    });
  }

  // --- Csoportosítás board szerint (variánsonként külön) ---
  const byBoard = new Map<string, PuzzleRef[]>();
  for (const r of refs) {
    const key = `${r.variant}\u0000${r.board.join('/')}`;
    const list = byBoard.get(key);
    if (list) list.push(r);
    else byBoard.set(key, [r]);
  }

  const groups: DuplicateGroup[] = [];
  for (const list of byBoard.values()) {
    if (list.length < 2) continue;
    const first = list[0].solution.join(' ');
    groups.push({
      variant: list[0].variant,
      board: list[0].board,
      refs: list,
      solutionsIdentical: list.every(r => r.solution.join(' ') === first),
    });
  }
  const redundantCopies = groups.reduce((sum, g) => sum + g.refs.length - 1, 0);

  // --- Fájlonkénti összesítés és átfedések ---
  const summaries: FileSummary[] = fileOrder.map(({ file, variant }) => ({
    file,
    variant,
    total: refs.filter(r => r.file === file).length,
    inDuplicateGroups: 0,
    overlaps: [],
    fullyCovered: false,
  }));
  const summaryOf = new Map(summaries.map(s => [s.file, s]));
  const overlapCounts = new Map<string, Map<string, number>>();
  const withOtherFileCopy = new Map<string, number>();

  for (const g of groups) {
    for (const r of g.refs) {
      const s = summaryOf.get(r.file)!;
      s.inDuplicateGroups++;

      const otherFiles = new Set(g.refs.filter(o => o.file !== r.file).map(o => o.file));
      if (otherFiles.size > 0) {
        withOtherFileCopy.set(r.file, (withOtherFileCopy.get(r.file) ?? 0) + 1);
        const perFile = overlapCounts.get(r.file) ?? new Map<string, number>();
        for (const other of otherFiles) perFile.set(other, (perFile.get(other) ?? 0) + 1);
        overlapCounts.set(r.file, perFile);
      }
    }
  }
  for (const s of summaries) {
    const perFile = overlapCounts.get(s.file);
    if (perFile) {
      s.overlaps = Array.from(perFile.entries())
        .map(([file, count]) => ({ file, count }))
        .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
    }
    s.fullyCovered = s.total > 0 && (withOtherFileCopy.get(s.file) ?? 0) === s.total;
  }

  // --- Azonosítók ---
  // Azonos id ugyanabban a fájlban VALÓDI hiba: a haladás-követés (szint:feladvány kulcs)
  // összekeveri őket, megoldva az egyiket a másik is megoldottnak látszana.
  const sameFileIdDuplicates: Analysis['sameFileIdDuplicates'] = [];
  const idsByFile = new Map<string, Map<string, number[]>>();
  for (const r of refs) {
    if (r.id === '') continue;
    const perFile = idsByFile.get(r.file) ?? new Map<string, number[]>();
    perFile.set(r.id, [...(perFile.get(r.id) ?? []), r.index]);
    idsByFile.set(r.file, perFile);
  }
  for (const [file, perFile] of idsByFile) {
    for (const [id, indexes] of perFile) {
      if (indexes.length > 1) sameFileIdDuplicates.push({ file, id, indexes });
    }
  }

  const crossFileIdReuse: Analysis['crossFileIdReuse'] = [];
  if (options.checkIds) {
    const byId = new Map<string, { variant: string; id: string; files: Set<string> }>();
    for (const r of refs) {
      if (r.id === '') continue;
      const key = `${r.variant}\u0000${r.id}`;
      const entry = byId.get(key) ?? { variant: r.variant, id: r.id, files: new Set<string>() };
      entry.files.add(r.file);
      byId.set(key, entry);
    }
    for (const e of byId.values()) {
      if (e.files.size > 1) crossFileIdReuse.push({ variant: e.variant, id: e.id, files: Array.from(e.files) });
    }
  }

  return {
    fileCount: files.length,
    puzzleCount: refs.length,
    groups,
    redundantCopies,
    files: summaries,
    sameFileIdDuplicates,
    crossFileIdReuse,
    problems,
  };
}

// ---------------------------------------------------------------------------
// Szöveges jelentés
// ---------------------------------------------------------------------------

export function variantLabel(variant: string): string {
  if (variant === 'russian') return 'orosz';
  if (variant === 'international') return 'nemzetközi';
  return variant;
}

export function renderBoard(rows: string[]): string {
  const size = rows.length;
  const width = rows[0]?.length ?? size;
  const header = '      ' + Array.from({ length: width }, (_, i) => String.fromCharCode(97 + i)).join(' ');
  const body = rows.map((r, i) => `    ${String(size - i).padStart(2)}  ${r.split('').join(' ')}`);
  return [header, ...body].join('\n');
}

function refLabel(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : `#${i + 1}`;
}

function firstDifference(a: string[], b: string[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return -1;
}

export type FormatOptions = { compact?: boolean };

export function formatReport(a: Analysis, root: string, options: FormatOptions = {}): string {
  const out: string[] = [];
  out.push(`Feladvány-duplikátumok keresése: ${root}`);
  out.push(
    `Vizsgált fájlok: ${a.fileCount}, feladványok: ${a.puzzleCount}, ` +
      `duplikált csoportok: ${a.groups.length} (felesleges másolat összesen: ${a.redundantCopies})`
  );

  if (a.problems.length > 0) {
    out.push('', 'FIGYELEM - feldolgozási problémák:');
    a.problems.forEach(p => out.push(`  - ${p}`));
  }

  if (a.sameFileIdDuplicates.length > 0) {
    out.push('', 'FIGYELEM - azonos azonosítójú feladványok UGYANABBAN a fájlban (ez hibát okoz a haladás-követésben):');
    for (const d of a.sameFileIdDuplicates) {
      out.push(`  - ${d.file}: "${d.id}" a(z) ${d.indexes.map(i => `#${i + 1}`).join(', ')} feladványnál`);
    }
  }

  if (a.groups.length === 0) {
    out.push('', 'Nincs duplikált feladvány (a boardok alapján).');
  }

  a.groups.forEach((g, gi) => {
    const verdict = g.solutionsIdentical ? 'a megoldások AZONOSAK' : 'a megoldások ELTÉRNEK';
    out.push('', `=== ${gi + 1}. csoport - ${variantLabel(g.variant)}, ${g.refs.length} példány, ${verdict} ===`);
    if (!options.compact) out.push(renderBoard(g.board));

    g.refs.forEach((r, i) => {
      const loc = r.line !== null ? `${r.file}:${r.line}` : r.file;
      const steps = `${r.solution.length} lépés`;
      out.push(`  [${refLabel(i)}] ${loc}`);
      out.push(`      ${r.index + 1}. feladvány a fájlban, id: ${r.id || '(nincs)'}, ${steps}`);
      if (!g.solutionsIdentical) out.push(`      megoldás: ${r.solution.join(', ')}`);
    });

    if (g.solutionsIdentical) {
      out.push(`  Közös megoldás: ${g.refs[0].solution.join(', ')}`);
    } else {
      for (let i = 1; i < g.refs.length; i++) {
        const d = firstDifference(g.refs[0].solution, g.refs[i].solution);
        if (d === -1) {
          out.push(`  [A] és [${refLabel(i)}] megoldása azonos.`);
        } else {
          const x = g.refs[0].solution[d] ?? '(itt véget ér)';
          const y = g.refs[i].solution[d] ?? '(itt véget ér)';
          out.push(`  [A] és [${refLabel(i)}] a ${d + 1}. lépésnél válik el (A: ${x}, ${refLabel(i)}: ${y}).`);
        }
      }
    }
  });

  // Fájlonkénti összesítés: segít eldönteni, melyik fájl törölhető/javítandó
  const touched = a.files.filter(f => f.inDuplicateGroups > 0);
  if (touched.length > 0) {
    out.push('', '--- Fájlonkénti összesítés (csak az érintett fájlok) ---');
    for (const f of touched) {
      const flag = f.fullyCovered ? '  <- MINDEN feladványa megvan más fájlban is' : '';
      out.push(`${f.file}`);
      out.push(`    ${f.total} feladvány, ebből ${f.inDuplicateGroups} duplikált csoportban van${flag}`);
      for (const o of f.overlaps) {
        out.push(`    ${o.count} db másolata megvan itt is: ${o.file}`);
      }
    }
    out.push(
      '',
      'Tipp: a "MINDEN feladványa megvan más fájlban is" jelzés azt jelenti, hogy a fájl törlésével ' +
        'nem vesznél el feladványt. DE ha ezt több fájlnál is látod (pl. két fájl egymás másolata), ' +
        'ne töröld őket egyszerre: törölj egyet, majd futtasd újra a szkriptet.'
    );
  }

  if (a.crossFileIdReuse.length > 0) {
    out.push('', `Azonosító-ismétlések különböző fájlok között (${a.crossFileIdReuse.length} db):`);
    for (const r of a.crossFileIdReuse.slice(0, 50)) {
      out.push(`  - ${r.id} (${variantLabel(r.variant)}): ${r.files.join(' | ')}`);
    }
    if (a.crossFileIdReuse.length > 50) out.push(`  ... és még ${a.crossFileIdReuse.length - 50} további`);
  }

  return out.join('\n') + '\n';
}