// A feladvány megoldásának menete: kattintások kezelése, a megoldáshoz hasonlítás,
// a fekete válaszlépés. Tiszta függvények: (régi állapot, esemény) -> új állapot.

import {
  Piece,
  Position,
  Puzzle,
  RuleSet,
  applyStep,
  getLegalDestinations,
  parseBoardFromRows,
  parseMove,
  playMovePath,
  samePosition,
} from './engine';

export type Phase = 'user' | 'computer' | 'solved' | 'error';

export type SessionState = {
  board: Piece[][];
  turnStartBoard: Piece[][]; // a kör elejének állása, ide állunk vissza hibás lépésnél
  selected: Position | null;
  capturedPositions: Position[];
  currentPath: Position[]; // a fehér aktuális lépésének eddigi mezői
  moveIndex: number; // hányadik lépésnél tartunk a megoldásban (páros = fehér, páratlan = fekete)
  phase: Phase;
  message: string;
};

export type SessionContext = {
  solution: Position[][];
  rules: RuleSet;
};

export const HINT_MESSAGE = 'Fehér lép. Találd meg a megoldást!';

// A megoldás szövegeiből mezőlistákat készít. Ha bármelyik hibás, null.
export function parseSolution(puzzle: Puzzle, rules: RuleSet): Position[][] | null {
  if (!puzzle.solution || puzzle.solution.length === 0) return null;
  const parsed: Position[][] = [];
  for (const moveStr of puzzle.solution) {
    const path = parseMove(moveStr, rules.boardSize);
    if (!path) return null;
    parsed.push(path);
  }
  return parsed;
}

export function createSession(puzzle: Puzzle, solution: Position[][] | null): SessionState {
  const board = parseBoardFromRows(puzzle.board);
  return {
    board,
    turnStartBoard: board,
    selected: null,
    capturedPositions: [],
    currentPath: [],
    moveIndex: 0,
    phase: solution ? 'user' : 'error',
    message: solution ? '' : 'A feladvány megoldása hiányzik vagy hibás formátumú.',
  };
}

function isPrefix(path: Position[], full: Position[]): boolean {
  return path.length <= full.length && path.every((p, i) => samePosition(p, full[i]));
}

// Hibás lépés: az egész kört visszavesszük a kör elejének állására
function rejectTurn(state: SessionState, message: string): SessionState {
  return {
    ...state,
    board: state.turnStartBoard,
    selected: null,
    capturedPositions: [],
    currentPath: [],
    message,
  };
}

function dataError(state: SessionState, message: string): SessionState {
  return { ...rejectTurn(state, message), phase: 'error' };
}

export function handleClick(
  state: SessionState,
  clicked: Position,
  ctx: SessionContext
): SessionState {
  if (state.phase !== 'user') return state;

  const { board, selected, capturedPositions, currentPath, moveIndex } = state;
  const { rules, solution } = ctx;
  const piece = board[clicked.row]?.[clicked.col] ?? null;

  // 1) Még nincs kijelölt bábu
  if (!selected) {
    if (piece && piece.color === 'white') {
      return { ...state, selected: clicked, currentPath: [clicked], message: '' };
    }
    return state;
  }

  // 2) Van kijelölt bábu: szabályos célmezőre kattintottunk?
  const inChain = capturedPositions.length > 0;
  const legal = getLegalDestinations(board, selected, capturedPositions, rules);
  const isLegal = legal.some(m => samePosition(m, clicked));

  if (!isLegal) {
    // Ütéssorozat közben kötelező folytatni, ilyenkor a kattintás nem csinál semmit
    if (inChain) return state;
    if (piece && piece.color === 'white') {
      return { ...state, selected: clicked, currentPath: [clicked], message: '' };
    }
    return { ...state, selected: null, currentPath: [], message: '' };
  }

  // 3) Szabályos lépés: egyezik a megoldás soron következő lépésével?
  const solutionPath = solution[moveIndex];
  const newPath = [...currentPath, clicked];

  if (!isPrefix(newPath, solutionPath)) {
    return rejectTurn(state, 'Nem ez a megoldás lépése. Próbáld újra!');
  }

  const result = applyStep(board, selected, clicked, capturedPositions, rules);

  // 3a) Az ütéssorozat folytatódik ugyanazzal a bábuval
  if (!result.turnEnded) {
    if (newPath.length >= solutionPath.length) {
      return dataError(
        state,
        'Adathiba: a szabályok szerint tovább kellene ütni, de a megoldás itt véget ér.'
      );
    }
    return {
      ...state,
      board: result.board,
      capturedPositions: result.capturedPositions,
      selected: result.selected,
      currentPath: newPath,
      message: '',
    };
  }

  // 3b) A fehér lépés befejeződött
  if (newPath.length !== solutionPath.length) {
    return dataError(
      state,
      'Adathiba: a szabályok szerint itt véget ér az ütéssorozat, a megoldás viszont hosszabb.'
    );
  }

  const nextIndex = moveIndex + 1;
  const solved = nextIndex >= solution.length;

  return {
    ...state,
    board: result.board,
    turnStartBoard: result.board,
    selected: null,
    capturedPositions: [],
    currentPath: [],
    moveIndex: nextIndex,
    phase: solved ? 'solved' : 'computer',
    message: solved ? 'Megoldva! Szép munka.' : 'Helyes lépés! Fekete válaszol...',
  };
}

// A fekete válaszlépése a megoldás szerint
export function playComputerMove(state: SessionState, ctx: SessionContext): SessionState {
  if (state.phase !== 'computer') return state;

  const path = ctx.solution[state.moveIndex];
  const result = playMovePath(state.board, path, 'black', ctx.rules);

  if (!result.ok) {
    return {
      ...state,
      phase: 'error',
      message: `Adathiba: a fekete válasz nem játszható le (${result.error}).`,
    };
  }

  const nextIndex = state.moveIndex + 1;
  const solved = nextIndex >= ctx.solution.length;

  return {
    ...state,
    board: result.board,
    turnStartBoard: result.board,
    moveIndex: nextIndex,
    phase: solved ? 'solved' : 'user',
    message: solved ? 'Megoldva! Szép munka.' : '',
  };
}