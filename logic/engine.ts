// Játékmotor: tiszta (UI-független) függvények a dáma szabályaihoz.
// Ide került át a Board.tsx-ben már kipróbált lépés-, ütés- és promóció-logika.

export type PieceColor = 'white' | 'black';
export type PieceData = { color: PieceColor; isKing: boolean };
export type Piece = PieceData | null;
export type Position = { row: number; col: number };
export type Variant = 'russian' | 'international';

export type RuleSet = {
  boardSize: number;
  flyingKing: boolean;
  mandatoryMaximumCapture: boolean;
  promotionDuringCaptureRequiresStop: boolean;
};

export const RUSSIAN_RULES: RuleSet = {
  boardSize: 8,
  flyingKing: true,
  mandatoryMaximumCapture: false,
  promotionDuringCaptureRequiresStop: false,
};

export const INTERNATIONAL_RULES: RuleSet = {
  boardSize: 10,
  flyingKing: true,
  mandatoryMaximumCapture: true,
  promotionDuringCaptureRequiresStop: true,
};

// Egy feladvány a JSON fájlokban:
// - board: sorok szövegként (fentről lefelé), . = üres, w/W = fehér korong/király, b/B = fekete korong/király
// - solution: a megoldás lépései felváltva: fehér, fekete, fehér, ... Egy lépés (akár ütéssorozat)
//   a érintett mezők listája kötőjellel, pl. "c3-e5-g7"
export type Puzzle = { id: string; board: string[]; solution: string[] };

// ---------------------------------------------------------------------------
// Segédfüggvények
// ---------------------------------------------------------------------------

export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isOnBoard(row: number, col: number, boardSize: number): boolean {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

// Mezőnév a hagyományos jelöléssel: a oszlop = bal szél, 1. sor = fehér oldal (alul)
export function squareName(pos: Position, boardSize: number): string {
  return String.fromCharCode(97 + pos.col) + (boardSize - pos.row);
}

export function parseBoardFromRows(rows: string[]): Piece[][] {
  return rows.map(rowStr =>
    rowStr.split('').map((char): Piece => {
      switch (char) {
        case 'w':
          return { color: 'white', isKing: false };
        case 'W':
          return { color: 'white', isKing: true };
        case 'b':
          return { color: 'black', isKing: false };
        case 'B':
          return { color: 'black', isKing: true };
        default:
          return null;
      }
    })
  );
}

// "c3-e5-g7" -> [{row,col}, {row,col}, {row,col}]. Hibás formátumnál null.
export function parseMove(moveStr: string, boardSize: number): Position[] | null {
  const parts = moveStr.trim().toLowerCase().split(/[-:x]/).filter(p => p.length > 0);
  const path: Position[] = [];

  for (const part of parts) {
    const match = /^([a-j])(\d{1,2})$/.exec(part);
    if (!match) return null;
    const col = match[1].charCodeAt(0) - 97;
    const rank = parseInt(match[2], 10);
    const row = boardSize - rank;
    if (!isOnBoard(row, col, boardSize)) return null;
    path.push({ row, col });
  }

  return path.length >= 2 ? path : null;
}

// ---------------------------------------------------------------------------
// Lépések és ütések keresése
// ---------------------------------------------------------------------------

export function getSimpleMoves(board: Piece[][], pos: Position, boardSize: number): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: Position[] = [];

  if (!piece.isKing) {
    const direction = piece.color === 'white' ? -1 : 1;
    for (const dcol of [-1, 1]) {
      const newRow = pos.row + direction;
      const newCol = pos.col + dcol;
      if (isOnBoard(newRow, newCol, boardSize) && board[newRow][newCol] === null) {
        moves.push({ row: newRow, col: newCol });
      }
    }
    return moves;
  }

  // Király: tetszőleges távolság mind a négy átlós irányban, amíg üres a mező
  for (const drow of [-1, 1]) {
    for (const dcol of [-1, 1]) {
      let steps = 1;
      while (true) {
        const newRow = pos.row + drow * steps;
        const newCol = pos.col + dcol * steps;
        if (!isOnBoard(newRow, newCol, boardSize) || board[newRow][newCol] !== null) break;
        moves.push({ row: newRow, col: newCol });
        steps++;
      }
    }
  }

  return moves;
}

export function findCapturedPosition(board: Piece[][], from: Position, to: Position): Position | null {
  const drow = Math.sign(to.row - from.row);
  const dcol = Math.sign(to.col - from.col);
  let r = from.row + drow;
  let c = from.col + dcol;

  while (r !== to.row || c !== to.col) {
    if (board[r][c] !== null) {
      return { row: r, col: c };
    }
    r += drow;
    c += dcol;
  }

  return null;
}

export function simulateMove(board: Piece[][], from: Position, to: Position): Piece[][] {
  const newBoard = board.map(r => [...r]);
  newBoard[to.row][to.col] = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = null;
  return newBoard;
}

export function getCaptureMoves(
  board: Piece[][],
  pos: Position,
  excluded: Position[] = [],
  boardSize: number
): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const opponent = piece.color === 'white' ? 'black' : 'white';

  if (!piece.isKing) {
    const moves: Position[] = [];
    for (const drow of [-1, 1]) {
      for (const dcol of [-1, 1]) {
        const midRow = pos.row + drow;
        const midCol = pos.col + dcol;
        const targetRow = pos.row + drow * 2;
        const targetCol = pos.col + dcol * 2;

        const midIsExcluded = excluded.some(p => p.row === midRow && p.col === midCol);
        const midPiece = board[midRow]?.[midCol];

        if (
          isOnBoard(targetRow, targetCol, boardSize) &&
          midPiece?.color === opponent &&
          !midIsExcluded &&
          board[targetRow][targetCol] === null
        ) {
          moves.push({ row: targetRow, col: targetCol });
        }
      }
    }
    return moves;
  }

  // Király: irányonként (leütött korongonként) KÜLÖN gyűjtjük és szűrjük a landolási helyeket
  const allowedMoves: Position[] = [];

  for (const drow of [-1, 1]) {
    for (const dcol of [-1, 1]) {
      let steps = 1;
      let foundOpponent: Position | null = null;
      const directionCandidates: Position[] = [];

      while (true) {
        const r = pos.row + drow * steps;
        const c = pos.col + dcol * steps;
        if (!isOnBoard(r, c, boardSize)) break;

        const cellPiece = board[r][c];
        const isExcluded = excluded.some(p => p.row === r && p.col === c);

        if (foundOpponent === null) {
          if (cellPiece === null) {
            steps++;
            continue;
          }
          if (cellPiece.color === opponent && !isExcluded) {
            foundOpponent = { row: r, col: c };
            steps++;
            continue;
          }
          break;
        } else {
          if (cellPiece === null) {
            directionCandidates.push({ row: r, col: c });
            steps++;
            continue;
          }
          break;
        }
      }

      if (directionCandidates.length === 0) continue;

      // Ezen az EGY irányon (ugyanazon leütött korongon) belül szűrünk: van-e folytatás
      const withContinuation = directionCandidates.filter(candidate => {
        const capturedPos = findCapturedPosition(board, pos, candidate);
        if (!capturedPos) return false;
        const simulatedBoard = simulateMove(board, pos, candidate);
        const newExcluded = [...excluded, capturedPos];
        return getCaptureMoves(simulatedBoard, candidate, newExcluded, boardSize).length > 0;
      });

      allowedMoves.push(...(withContinuation.length > 0 ? withContinuation : directionCandidates));
    }
  }

  return allowedMoves;
}

export function boardHasAnyCapture(
  board: Piece[][],
  player: PieceColor,
  excluded: Position[] = [],
  boardSize: number
): boolean {
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (board[row][col]?.color === player) {
        if (getCaptureMoves(board, { row, col }, excluded, boardSize).length > 0) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Kötelező maximális ütés (nemzetközi szabály)
// ---------------------------------------------------------------------------

export function findMaxCaptureSequences(
  board: Piece[][],
  pos: Position,
  excluded: Position[],
  boardSize: number
): Position[][] {
  const nextCaptures = getCaptureMoves(board, pos, excluded, boardSize);

  if (nextCaptures.length === 0) {
    return [[]];
  }

  const sequences: Position[][] = [];

  for (const target of nextCaptures) {
    const capturedPos = findCapturedPosition(board, pos, target);
    if (!capturedPos) continue;

    const newExcluded = [...excluded, capturedPos];
    const simulatedBoard = simulateMove(board, pos, target);
    const continuations = findMaxCaptureSequences(simulatedBoard, target, newExcluded, boardSize);

    for (const cont of continuations) {
      sequences.push([target, ...cont]);
    }
  }

  return sequences;
}

export function getMaxCaptureMoves(
  board: Piece[][],
  pos: Position,
  excluded: Position[],
  boardSize: number
): Position[] {
  const sequences = findMaxCaptureSequences(board, pos, excluded, boardSize);

  let maxLen = 0;
  for (const seq of sequences) {
    if (seq.length > maxLen) maxLen = seq.length;
  }
  if (maxLen === 0) return [];

  return sequences.filter(seq => seq.length === maxLen).map(seq => seq[0]);
}

// Az összes bábu közül a leghosszabb ütéssorozatok első lépései (honnan + hova)
export function getMandatoryMaxCaptureFirstSteps(
  board: Piece[][],
  player: PieceColor,
  boardSize: number
): { from: Position; to: Position }[] {
  let maxLength = 0;
  const firstSteps: { from: Position; to: Position; length: number }[] = [];

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (board[row][col]?.color === player) {
        const sequences = findMaxCaptureSequences(board, { row, col }, [], boardSize);
        for (const seq of sequences) {
          if (seq.length === 0) continue;
          firstSteps.push({ from: { row, col }, to: seq[0], length: seq.length });
          if (seq.length > maxLength) maxLength = seq.length;
        }
      }
    }
  }

  if (maxLength === 0) return [];

  return firstSteps
    .filter(s => s.length === maxLength)
    .map(s => ({ from: s.from, to: s.to }));
}

// ---------------------------------------------------------------------------
// Egy lépés szabályos célmezői és végrehajtása (ez volt a handleCellPress magja)
// ---------------------------------------------------------------------------

// Hova léphet a `selected` mezőn álló bábu? A `capturedPositions` nem üres, ha
// éppen egy ütéssorozat közepén vagyunk.
export function getLegalDestinations(
  board: Piece[][],
  selected: Position,
  capturedPositions: Position[],
  rules: RuleSet
): Position[] {
  const selectedPiece = board[selected.row][selected.col];
  if (!selectedPiece) return [];

  const isChainCapture = capturedPositions.length > 0;
  const mustCapture =
    isChainCapture ||
    boardHasAnyCapture(board, selectedPiece.color, capturedPositions, rules.boardSize);

  let captureMoves = getCaptureMoves(board, selected, capturedPositions, rules.boardSize);

  if (rules.mandatoryMaximumCapture && mustCapture) {
    if (!isChainCapture) {
      const maxFirstSteps = getMandatoryMaxCaptureFirstSteps(board, selectedPiece.color, rules.boardSize);
      captureMoves = captureMoves.filter(m =>
        maxFirstSteps.some(s => samePosition(s.from, selected) && samePosition(s.to, m))
      );
    } else {
      captureMoves = getMaxCaptureMoves(board, selected, capturedPositions, rules.boardSize);
    }
  }

  const simpleMoves = isChainCapture ? [] : getSimpleMoves(board, selected, rules.boardSize);
  return mustCapture ? captureMoves : [...simpleMoves, ...captureMoves];
}

export type StepResult = {
  board: Piece[][];
  capturedPositions: Position[]; // még a táblán lévő, de már leütött bábuk (ütéssorozat közben)
  selected: Position | null; // nem null, ha az ütéssorozat folytatódik ezzel a bábuval
  turnEnded: boolean;
};

// Végrehajt egy (már szabályosnak ismert) lépést: mozgatás, ütés, promóció.
export function applyStep(
  board: Piece[][],
  from: Position,
  to: Position,
  capturedPositions: Position[],
  rules: RuleSet
): StepResult {
  const piece = board[from.row][from.col];
  if (!piece) {
    return { board, capturedPositions, selected: null, turnEnded: true };
  }

  const newBoard = board.map(r => [...r]);

  const reachedLastRow =
    (piece.color === 'white' && to.row === 0) ||
    (piece.color === 'black' && to.row === rules.boardSize - 1);

  const capturedPos = findCapturedPosition(board, from, to);
  const isCapture = capturedPos !== null;
  let updatedCaptured = capturedPositions;
  if (capturedPos) {
    updatedCaptured = [...capturedPositions, capturedPos];
  }

  // Először NEM promotáljuk a bábut, hanem "korongként" nézzük meg, van-e még folytatás
  const tentativePiece: PieceData = { ...piece };
  newBoard[to.row][to.col] = tentativePiece;
  newBoard[from.row][from.col] = null;

  const furtherCapturesAsMan = isCapture
    ? getCaptureMoves(newBoard, to, updatedCaptured, rules.boardSize)
    : [];
  let furtherCaptures = furtherCapturesAsMan;

  if (!tentativePiece.isKing && reachedLastRow) {
    if (rules.promotionDuringCaptureRequiresStop) {
      // Nemzetközi: csak akkor válik dámává, ha NINCS további korongként ütés
      if (furtherCapturesAsMan.length === 0) {
        tentativePiece.isKing = true;
      }
    } else {
      // Orosz: azonnal dámává válik, és onnantól királyként keresünk folytatást
      tentativePiece.isKing = true;
      furtherCaptures = isCapture
        ? getCaptureMoves(newBoard, to, updatedCaptured, rules.boardSize)
        : [];
    }
  }

  if (furtherCaptures.length > 0) {
    return { board: newBoard, capturedPositions: updatedCaptured, selected: to, turnEnded: false };
  }

  // A sorozat véget ért -> most tűnnek el ténylegesen a leütött bábuk
  for (const pos of updatedCaptured) {
    newBoard[pos.row][pos.col] = null;
  }

  return { board: newBoard, capturedPositions: [], selected: null, turnEnded: true };
}

// ---------------------------------------------------------------------------
// Egy teljes lépés (akár ütéssorozat) lejátszása útvonal alapján, ellenőrzéssel
// ---------------------------------------------------------------------------

export function playMovePath(
  board: Piece[][],
  path: Position[],
  color: PieceColor,
  rules: RuleSet
): { ok: boolean; board: Piece[][]; error?: string } {
  const name = (p: Position) => squareName(p, rules.boardSize);

  if (path.length < 2) {
    return { ok: false, board, error: 'a lépésnek legalább két mezőből kell állnia' };
  }

  const start = path[0];
  const piece = board[start.row]?.[start.col];
  if (!piece) {
    return { ok: false, board, error: `nincs bábu a(z) ${name(start)} mezőn` };
  }
  if (piece.color !== color) {
    return { ok: false, board, error: `a(z) ${name(start)} mezőn nem a soron lévő fél bábuja áll` };
  }

  let current = board;
  let captured: Position[] = [];

  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const legal = getLegalDestinations(current, from, captured, rules);

    if (!legal.some(m => samePosition(m, to))) {
      return { ok: false, board, error: `szabálytalan lépés: ${name(from)}-${name(to)}` };
    }

    const result = applyStep(current, from, to, captured, rules);
    current = result.board;
    captured = result.capturedPositions;

    const isLast = i === path.length - 1;
    if (result.turnEnded && !isLast) {
      return { ok: false, board, error: `az ütéssorozat már a(z) ${name(to)} mezőn véget ér` };
    }
    if (!result.turnEnded && isLast) {
      return { ok: false, board, error: `a(z) ${name(to)} mezőről kötelező tovább ütni` };
    }
  }

  return { ok: true, board: current };
}

// Végigjátssza a teljes megoldást a kezdőállásból. Ha hiba van, szöveges leírást ad vissza.
export function validatePuzzle(puzzle: Puzzle, rules: RuleSet): string | null {
  if (puzzle.board.length !== rules.boardSize) {
    return `a tábla ${puzzle.board.length} soros, de ${rules.boardSize} sor kell`;
  }
  for (let i = 0; i < puzzle.board.length; i++) {
    const rowStr = puzzle.board[i];
    if (rowStr.length !== rules.boardSize || !/^[.wWbB]+$/.test(rowStr)) {
      return `a(z) ${i + 1}. sor hibás ("${rowStr}")`;
    }
  }
  if (!puzzle.solution || puzzle.solution.length === 0) {
    return 'nincs megoldás megadva';
  }

  let board = parseBoardFromRows(puzzle.board);

  for (let i = 0; i < puzzle.solution.length; i++) {
    const moveStr = puzzle.solution[i];
    const path = parseMove(moveStr, rules.boardSize);
    if (!path) {
      return `a(z) ${i + 1}. lépés ("${moveStr}") formátuma hibás`;
    }
    const color: PieceColor = i % 2 === 0 ? 'white' : 'black';
    const result = playMovePath(board, path, color, rules);
    if (!result.ok) {
      return `${i + 1}. lépés (${moveStr}): ${result.error}`;
    }
    board = result.board;
  }

  return null;
}