// Lidraughts (PDN) -> a mi feladvány-formátumunk átalakítása.
//
// Egy lidraughts study-fejezet PDN-ben így néz ki (egyszerűsítve):
//
//   [Variant "Russian"]
//   [FEN "W:W21,22,K30:B9,10,15"]
//   1. 22-18 15x22 2. 30x15 ...
//
// - A FEN a kiinduló állást adja meg: ki lép, és mely mezőkön állnak a bábuk (K = dáma).
// - A lépések mezőszámmal (1-32 / 1-50) VAGY algebrai jelöléssel (a1-h8) is szerepelhetnek;
//   ezt a szkript mindkettőre felismeri.
// - Az ütést `x` (vagy `:`) jelöli, általában csak a kezdő- és végmezővel. Ilyenkor a pontos
//   útvonalat (köztes mezőket) a játékmotorunk szabályai alapján határozzuk meg.

import {
  INTERNATIONAL_RULES,
  Piece,
  PieceColor,
  Position,
  Puzzle,
  RUSSIAN_RULES,
  RuleSet,
  Variant,
  applyStep,
  findCapturedPosition,
  getLegalDestinations,
  parseBoardFromRows,
  playMovePath,
  samePosition,
  squareName,
  validatePuzzle,
} from '../../logic/engine';

export type PdnGame = { headers: Record<string, string>; movetext: string };

// ---------------------------------------------------------------------------
// Mezőszámozás: a lidraughts/PDN szerint az 1-es mező a fehér szemszögéből a bal felső
// sötét mező, és soronként haladva (jobbra, majd a következő sor) számozzuk a sötéteket.
//   8x8:  1-4 = b8,d8,f8,h8 ... 29-32 = a1,c1,e1,g1
//   10x10: 1-5 = b10,d10,... 46-50 = a1,c1,...
// ---------------------------------------------------------------------------

export function numberToPosition(n: number, size: number): Position | null {
  const perRow = size / 2;
  if (!Number.isInteger(n) || n < 1 || n > perRow * size) return null;
  const row = Math.floor((n - 1) / perRow);
  const k = (n - 1) % perRow;
  const col = row % 2 === 0 ? 2 * k + 1 : 2 * k;
  return { row, col };
}

export function positionToNumber(pos: Position, size: number): number {
  const perRow = size / 2;
  return pos.row * perRow + Math.floor(pos.col / 2) + 1;
}

// "22", "d4" vagy "d10" -> pozíció (az EREDETI, még nem tükrözött tájolásban)
export function parseSquare(token: string, size: number): Position | null {
  const t = token.trim().toLowerCase();
  const alpha = /^([a-j])(\d{1,2})$/.exec(t);
  if (alpha) {
    const col = alpha[1].charCodeAt(0) - 97;
    const row = size - parseInt(alpha[2], 10);
    if (row < 0 || row >= size || col >= size) return null;
    if ((row + col) % 2 !== 1) return null; // világos mezőn nem állhat bábu
    return { row, col };
  }
  if (/^\d{1,2}$/.test(t)) return numberToPosition(parseInt(t, 10), size);
  return null;
}

// ---------------------------------------------------------------------------
// PDN beolvasás
// ---------------------------------------------------------------------------

export function parsePdn(text: string): PdnGame[] {
  const games: PdnGame[] = [];
  let headers: Record<string, string> = {};
  let moveLines: string[] = [];
  let seenMoves = false;

  const flush = () => {
    if (Object.keys(headers).length > 0 || moveLines.length > 0) {
      games.push({ headers, movetext: moveLines.join(' ') });
    }
    headers = {};
    moveLines = [];
    seenMoves = false;
  };

  for (const rawLine of text.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    const header = /^\[(\w+)\s+"(.*)"\]$/.exec(line);
    if (header) {
      if (seenMoves) flush(); // új játszma fejléce kezdődik
      headers[header[1]] = header[2];
    } else {
      moveLines.push(line.replace(/;.*$/, '')); // `;` utáni sorvégi komment törlése
      seenMoves = true;
    }
  }
  flush();
  return games;
}

const RESULT_TOKEN = /^(1-0|0-1|1\/2-1\/2|2-0|0-2|1-1|\*)$/;

// A lépésszöveget lépés-tokenekké alakítja: eltávolítja a kommenteket, a változatokat
// (zárójelek), a NAG-jelöléseket ($1), a lépésszámokat és az eredményt.
export function movetextToTokens(movetext: string): string[] {
  let s = movetext.replace(/\{[^}]*\}/g, ' ');

  let out = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  s = out.replace(/\$\d+/g, ' ');

  const tokens: string[] = [];
  for (const raw of s.split(/\s+/)) {
    let tok = raw.replace(/^\d+\.+/, ''); // "12." / "12..." / "1.22-18" elejéről a lépésszám
    tok = tok.replace(/[!?]+$/, ''); // "22-18!?" -> "22-18"
    if (tok === '' || /^\.+$/.test(tok)) continue;
    if (RESULT_TOKEN.test(tok)) continue;
    tokens.push(tok);
  }
  return tokens;
}

// "22x13", "d4:b6", "c3-d4", "28x19x10" -> a megadott mezők listája
export function parseMoveToken(token: string): string[] | null {
  const parts = token.split(/[-x:]/i).filter(p => p.length > 0);
  if (parts.length < 2) return null;
  const numeric = parts.every(p => /^\d{1,2}$/.test(p));
  const alpha = parts.every(p => /^[a-j]\d{1,2}$/i.test(p));
  return numeric || alpha ? parts : null;
}

// ---------------------------------------------------------------------------
// FEN
// ---------------------------------------------------------------------------

export type FenPiece = { pos: Position; color: PieceColor; king: boolean };

export function parseFen(fen: string, size: number): { turn: 'W' | 'B'; pieces: FenPiece[] } {
  const segments = fen.trim().split(':');
  const turn = segments[0].trim().toUpperCase()[0];
  if (turn !== 'W' && turn !== 'B') throw new Error(`A FEN-ben nem értelmezhető, ki lép: "${fen}"`);

  const pieces: FenPiece[] = [];
  for (const rawSeg of segments.slice(1)) {
    const seg = rawSeg.trim();
    if (!seg) continue;
    const colorChar = seg[0].toUpperCase();
    if (colorChar !== 'W' && colorChar !== 'B') continue; // pl. "H0", "F1" (félléptek, lépésszám)
    const color: PieceColor = colorChar === 'W' ? 'white' : 'black';

    for (const rawItem of seg.slice(1).split(',')) {
      let item = rawItem.trim();
      if (!item) continue;
      let king = false;
      if (/^k/i.test(item) && item.length > 1) {
        king = true;
        item = item.slice(1);
      }
      const range = /^(\d+)-(\d+)$/.exec(item);
      const squares = range
        ? Array.from({ length: parseInt(range[2], 10) - parseInt(range[1], 10) + 1 }, (_, i) =>
            String(parseInt(range[1], 10) + i)
          )
        : [item];
      for (const sq of squares) {
        const pos = parseSquare(sq, size);
        if (!pos) throw new Error(`A FEN-ben érvénytelen mező: "${sq}" (${size}x${size}-es táblán)`);
        pieces.push({ pos, color, king });
      }
    }
  }
  return { turn, pieces };
}

// ---------------------------------------------------------------------------
// Az adott állásban a soron lévő fél ÖSSZES lehetséges teljes lépése (ütéssorozatok végéig)
// ---------------------------------------------------------------------------

export type FullMove = { path: Position[]; captured: Position[] };

export function enumerateMoves(board: Piece[][], color: PieceColor, rules: RuleSet): FullMove[] {
  const out: FullMove[] = [];
  const n = rules.boardSize;

  function dfs(b: Piece[][], from: Position, chain: Position[], path: Position[], caps: Position[]) {
    for (const to of getLegalDestinations(b, from, chain, rules)) {
      const cp = findCapturedPosition(b, from, to);
      const res = applyStep(b, from, to, chain, rules);
      const newPath = [...path, to];
      const newCaps = cp ? [...caps, cp] : caps;
      if (res.turnEnded) out.push({ path: newPath, captured: newCaps });
      else dfs(res.board, res.selected!, res.capturedPositions, newPath, newCaps);
    }
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c]?.color === color) dfs(board, { row: r, col: c }, [], [{ row: r, col: c }], []);
    }
  }
  return out;
}

const sameSet = (a: Position[], b: Position[]) =>
  a.length === b.length && a.every(p => b.some(q => samePosition(p, q)));

// A megadott mezők (kezdő, [köztes...], vég) alapján megkeresi az egyetlen odaillő teljes lépést.
function resolveMove(
  given: Position[],
  candidates: FullMove[],
  size: number,
  tokenForErrors: string
): Position[] {
  const first = given[0];
  const last = given[given.length - 1];

  const matches = candidates.filter(m => {
    if (!samePosition(m.path[0], first) || !samePosition(m.path[m.path.length - 1], last)) return false;
    // a megadott köztes mezőknek sorrendben szerepelniük kell az útvonalban
    let from = 1;
    for (let i = 1; i < given.length - 1; i++) {
      const idx = m.path.findIndex((p, k) => k >= from && samePosition(p, given[i]));
      if (idx === -1) return false;
      from = idx + 1;
    }
    return true;
  });

  const fmt = (p: Position[]) => p.map(q => squareName(q, size)).join('-');

  if (matches.length === 0) {
    const sample = candidates.slice(0, 12).map(m => fmt(m.path)).join(', ');
    throw new Error(
      `A(z) "${tokenForErrors}" lépés nem szabályos ebben az állásban. ` +
        `A szabályos lépések (${candidates.length} db): ${sample}${candidates.length > 12 ? ', ...' : ''}`
    );
  }
  if (matches.length > 1) {
    const distinctCaptures = matches.filter(
      (m, i) => matches.findIndex(o => sameSet(o.captured, m.captured)) === i
    );
    if (distinctCaptures.length > 1) {
      throw new Error(
        `A(z) "${tokenForErrors}" lépés kétértelmű (különböző bábukat ütne le): ` +
          `${matches.map(m => fmt(m.path)).join(' / ')}. Add meg a teljes útvonalat a PDN-ben.`
      );
    }
    // ugyanazokat a bábukat üti, csak a köztes mezők eltérnek: az elsőt vesszük
  }
  return matches[0].path;
}

// ---------------------------------------------------------------------------
// Egy játszma (study-fejezet) átalakítása feladvánnyá
// ---------------------------------------------------------------------------

export function detectVariant(headers: Record<string, string>, override?: Variant): Variant | null {
  if (override) return override;
  const v = (headers['Variant'] ?? '').toLowerCase();
  if (v.includes('russian')) return 'russian';
  if (v.includes('standard') || v.includes('international')) return 'international';
  const gameType = (headers['GameType'] ?? '').split(',')[0].trim();
  if (gameType === '25') return 'russian';
  if (gameType === '20') return 'international';
  return null;
}

export type ImportResult = { puzzle: Puzzle; variant: Variant; notes: string[] };

export function importGame(game: PdnGame, id: string, variantOverride?: Variant): ImportResult {
  const variant = detectVariant(game.headers, variantOverride);
  if (!variant) {
    throw new Error(
      `Nem állapítható meg a variáns (Variant: "${game.headers['Variant'] ?? ''}"). ` +
        `Add meg a --variant russian|international kapcsolóval.`
    );
  }
  const rules = variant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;
  const size = rules.boardSize;
  const notes: string[] = [];

  const fen = game.headers['FEN'];
  if (!fen) throw new Error('Ebben a játszmában nincs FEN (kiinduló állás), nem feladvány.');

  const { turn, pieces } = parseFen(fen, size);

  // Feladványaink mindig a fehér lépésével indulnak. Ha a study-ban a fekete lép először,
  // az egész állást 180°-kal elforgatjuk és kicseréljük a színeket - ez ugyanaz a feladvány
  // a másik oldal szemszögéből.
  const flip = turn === 'B';
  if (flip) notes.push('A study-ban a fekete lépett először, ezért elforgattam az állást (a lépések mezőnevei ennek megfelelően megváltoztak).');
  const tr = (p: Position): Position => (flip ? { row: size - 1 - p.row, col: size - 1 - p.col } : p);

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill('.'));
  for (const piece of pieces) {
    const p = tr(piece.pos);
    const color: PieceColor = flip ? (piece.color === 'white' ? 'black' : 'white') : piece.color;
    const ch = color === 'white' ? 'w' : 'b';
    if (grid[p.row][p.col] !== '.') throw new Error(`A FEN-ben két bábu van ugyanazon a mezőn (${squareName(p, size)}).`);
    grid[p.row][p.col] = piece.king ? ch.toUpperCase() : ch;
  }
  const rows = grid.map(r => r.join(''));

  const tokens = movetextToTokens(game.movetext);
  if (tokens.length === 0) throw new Error('Nincs lépés a játszmában (nincs megoldás).');

  let board = parseBoardFromRows(rows);
  const solution: string[] = [];

  tokens.forEach((token, i) => {
    const color: PieceColor = i % 2 === 0 ? 'white' : 'black';
    const squares = parseMoveToken(token);
    if (!squares) throw new Error(`A(z) ${i + 1}. lépés ("${token}") formátuma nem értelmezhető.`);

    const given = squares.map(sq => {
      const pos = parseSquare(sq, size);
      if (!pos) throw new Error(`A(z) ${i + 1}. lépésben ("${token}") érvénytelen mező: "${sq}".`);
      return tr(pos);
    });

    const candidates = enumerateMoves(board, color, rules);
    let path: Position[];
    try {
      path = resolveMove(given, candidates, size, token);
    } catch (e) {
      throw new Error(`${i + 1}. lépés: ${(e as Error).message}`);
    }

    const played = playMovePath(board, path, color, rules);
    if (!played.ok) throw new Error(`${i + 1}. lépés ("${token}"): ${played.error}`);
    board = played.board;
    solution.push(path.map(p => squareName(p, size)).join('-'));
  });

  const puzzle: Puzzle = { id, board: rows, solution };
  const err = validatePuzzle(puzzle, rules);
  if (err) throw new Error(`Az átalakított feladvány nem érvényes: ${err}`);

  return { puzzle, variant, notes };
}

// ---------------------------------------------------------------------------
// Megjelenítés és kiírás
// ---------------------------------------------------------------------------

export function renderBoardAscii(rows: string[]): string {
  const size = rows.length;
  const header = '    ' + Array.from({ length: size }, (_, i) => String.fromCharCode(97 + i)).join(' ');
  const body = rows.map((r, i) => `${String(size - i).padStart(2)}  ${r.split('').join(' ')}`);
  return [header, ...body].join('\n');
}

// Egy feladvány szövege a JSON fájlokban használt, olvasható tördeléssel
export function formatPuzzle(p: Puzzle, indent = '    '): string {
  const i2 = indent + indent;
  const i3 = i2 + indent;
  const board = p.board.map(r => `${i3}"${r}"`).join(',\n');
  const solution = p.solution.map(m => `"${m}"`).join(', ');
  return (
    `${indent}{\n` +
    `${i2}"id": "${p.id}",\n` +
    `${i2}"board": [\n${board}\n${i2}],\n` +
    `${i2}"solution": [${solution}]\n` +
    `${indent}}`
  );
}

// Hozzáfűz új feladványokat egy meglévő szintfájl szövegéhez a MEGLÉVŐ tartalom
// formázásának érintése nélkül (csak a záró `]` elé szúrja be őket).
export function appendToLevelFileText(existing: string | null, puzzles: Puzzle[]): string {
  const entries = puzzles.map(p => formatPuzzle(p));
  if (existing === null || existing.trim() === '') return `[\n${entries.join(',\n')}\n]\n`;

  JSON.parse(existing); // ha a meglévő fájl hibás, itt megállunk, mielőtt bármit elrontanánk
  const trimmed = existing.replace(/\s+$/, '');
  if (!trimmed.endsWith(']')) throw new Error('A szintfájl nem JSON tömbbel végződik.');
  const body = trimmed.slice(0, -1).replace(/\s+$/, '');
  const isEmpty = body.trim() === '[';
  const added = `${isEmpty ? '\n' : ',\n'}${entries.join(',\n')}\n]\n`;
  // Ha a meglévő fájl Windows-os sortöréseket (\r\n) használ, a hozzáfűzött rész is azt kapja,
  // hogy ne keveredjenek a sorvégek (különben a verziókezelő minden sort módosítottnak mutatna).
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  return body + added.replace(/\n/g, eol);
}