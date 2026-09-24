import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';

type PieceColor = 'white' | 'black';
type PieceData = { color: PieceColor; isKing: boolean };
type Piece = PieceData | null;
type Position = { row: number; col: number };
type Variant = 'russian' | 'international';

type RuleSet = {
  boardSize: number;
  flyingKing: boolean;
  mandatoryMaximumCapture: boolean;
  promotionDuringCaptureRequiresStop: boolean;
};

const RUSSIAN_RULES: RuleSet = {
  boardSize: 8,
  flyingKing: true,
  mandatoryMaximumCapture: false,
  promotionDuringCaptureRequiresStop: false,
};

const INTERNATIONAL_RULES: RuleSet = {
  boardSize: 10,
  flyingKing: true,
  mandatoryMaximumCapture: true,
  promotionDuringCaptureRequiresStop: true,
};

function createInitialBoard(boardSize: number): Piece[][] {
  const board: Piece[][] = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(null)
  );

  // A kezdő sorok száma a tábla mérete alapján (8x8-nál 3, 10x10-nél 4 sor)
  const rowsOfPieces = boardSize === 10 ? 4 : 3;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const isDark = (row + col) % 2 === 1;
      if (!isDark) {
        continue;
      }

      if (row < rowsOfPieces) {
        board[row][col] = { color: 'black', isKing: false };
      } else if (row > boardSize - 1 - rowsOfPieces) {
        board[row][col] = { color: 'white', isKing: false };
      }
    }
  }

  return board;
}

function isOnBoard(row: number, col: number, boardSize: number): boolean {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function getSimpleMoves(board: Piece[][], pos: Position, boardSize: number): Position[] {
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

function getCaptureMoves(board: Piece[][], pos: Position, excluded: Position[] = [], boardSize: number): Position[] {
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

      const finalForThisDirection =
        withContinuation.length > 0 ? withContinuation : directionCandidates;

      allowedMoves.push(...finalForThisDirection);
    }
  }

  return allowedMoves;
}

function simulateMove(board: Piece[][], from: Position, to: Position): Piece[][] {
  const newBoard = board.map(r => [...r]);
  newBoard[to.row][to.col] = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = null;
  return newBoard;
}

function findCapturedPosition(board: Piece[][], from: Position, to: Position): Position | null {
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

function findMaxCaptureSequences(board: Piece[][], pos: Position, excluded: Position[], boardSize: number): Position[][] {
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

function getMaxCaptureMoves(board: Piece[][], pos: Position, excluded: Position[], boardSize: number): Position[] {
  const sequences = findMaxCaptureSequences(board, pos, excluded, boardSize);

  let maxLen = 0;
  for (const seq of sequences) {
    if (seq.length > maxLen) maxLen = seq.length;
  }
  if (maxLen === 0) return [];

  return sequences
    .filter(seq => seq.length === maxLen)
    .map(seq => seq[0]);
}

function getMandatoryMaxCaptureFirstSteps(board: Piece[][], player: PieceColor, boardSize: number): Position[] {
  let maxLength = 0;
  const firstStepsByPosition: { from: Position; to: Position; length: number }[] = [];

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (board[row][col]?.color === player) {
        const sequences = findMaxCaptureSequences(board, { row, col }, [], boardSize);
        for (const seq of sequences) {
          if (seq.length === 0) continue; // nem ütés-sorozat
          firstStepsByPosition.push({ from: { row, col }, to: seq[0], length: seq.length });
          if (seq.length > maxLength) maxLength = seq.length;
        }
      }
    }
  }

  if (maxLength === 0) return []; // nincs kötelező ütés

  // Csak azokat az első lépéseket adjuk vissza, amik egy maximális hosszúságú sorozathoz tartoznak
  return firstStepsByPosition
    .filter(s => s.length === maxLength)
    .map(s => s.to);
}

function boardHasAnyCapture(board: Piece[][], player: PieceColor, excluded: Position[] = [], boardSize: number): boolean {
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (board[row][col]?.color === player) {
        if (getCaptureMoves(board, { row, col }, excluded, boardSize).length > 0)
          return true;
      }
    }
  }
  return false;
}

function PieceView({ color, isKing, faded }: { color: PieceColor; isKing: boolean; faded?: boolean }) {
  return (
    <View
      style={[
        styles.piece,
        color === 'white' ? styles.whitePiece : styles.blackPiece,
        faded && styles.fadedPiece,
      ]}
    >
      {isKing && <View style={styles.kingRing} />}
    </View>
  );
}

export default function Board() {
  const [variant, setVariant] = useState<Variant>('russian');
  //const [variant, setVariant] = useState<Variant>('international'); //Ne változzon dámává teszt
  const rules = variant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;

  const [board, setBoard] = useState<Piece[][]>(createInitialBoard(rules.boardSize));
  //const [board, setBoard] = useState<Piece[][]>(createPromotionTestBoard()); //Ne változzon dámává teszt
  const [selected, setSelected] = useState<Position | null>(null);
  const [capturedPositions, setCapturedPositions] = useState<Position[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');

  function handleVariantChange(newVariant: Variant) {
    const newRules = newVariant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;
    setVariant(newVariant);
    setBoard(createInitialBoard(newRules.boardSize));
    setSelected(null);
    setCapturedPositions([]);
    setCurrentPlayer('white');
  }

  function handleCellPress(row: number, col: number) {
    const piece = board[row][col];

    if (selected) {
      const selectedPiece = board[selected.row][selected.col];
      if (!selectedPiece) {
        setSelected(null);
        return;
      }

      const isChainCapture = capturedPositions.length > 0;
      const mustCapture =
        isChainCapture ||
        boardHasAnyCapture(board, selectedPiece.color, capturedPositions, rules.boardSize);
      let captureMoves = getCaptureMoves(board, selected, capturedPositions, rules.boardSize);

      // Nemzetközi szabály: az ütés-lánc ELSŐ lépésénél csak a maximális hosszúságú sorozatokat engedjük
      if (rules.mandatoryMaximumCapture && mustCapture) {
        if (!isChainCapture) {
        // A lánc ELSŐ lépése: az összes bábu közül a leghosszabb sorozatot választjuk ki
            const maxFirstSteps = getMandatoryMaxCaptureFirstSteps(board, selectedPiece.color, rules.boardSize);
            captureMoves = captureMoves.filter(m =>
            maxFirstSteps.some(s => s.row === m.row && s.col === m.col)
            );
        } else {
        // A lánc FOLYTATÁSA: az aktuális pozícióból újra a leghosszabb folytatást kényszerítjük ki
            captureMoves = getMaxCaptureMoves(board, selected, capturedPositions, rules.boardSize);
        }
      }

      const simpleMoves = isChainCapture ? [] : getSimpleMoves(board, selected, rules.boardSize);
      const legalMoves = mustCapture ? captureMoves : [...simpleMoves, ...captureMoves];

      const isLegal = legalMoves.some(m => m.row === row && m.col === col);

      if (isLegal) {
        const newBoard = board.map(r => [...r]);

        const reachedLastRow =
        (selectedPiece.color === 'white' && row === 0) ||
        (selectedPiece.color === 'black' && row === rules.boardSize - 1);

        const capturedPos = findCapturedPosition(board, selected, { row, col });
        const isCapture = capturedPos !== null;
        let updatedCaptured = capturedPositions;

        if (isCapture && capturedPos) {
          updatedCaptured = [...capturedPositions, capturedPos];
        }

        // Először NEM promotáljuk a bábut, hanem "korongként" nézzük meg, van-e még folytatás
        const tentativePiece: PieceData = { ...selectedPiece };
        newBoard[row][col] = tentativePiece;
        newBoard[selected.row][selected.col] = null;

        const furtherCapturesAsMan = isCapture
        ? getCaptureMoves(newBoard, { row, col }, updatedCaptured, rules.boardSize)
        : [];

        let furtherCaptures = furtherCapturesAsMan;

        if (!tentativePiece.isKing && reachedLastRow) {
          if (rules.promotionDuringCaptureRequiresStop) {
            // Nemzetközi: csak akkor válik dámává, ha NINCS további korongként ütés
            if (furtherCapturesAsMan.length === 0) {
              tentativePiece.isKing = true;
            }
            // ha van további ütés, korongként marad, és korongként folytatjuk (furtherCaptures már ez)
          } else {
            // Orosz: azonnal dámává válik, és onnantól királyként keresünk folytatást
            tentativePiece.isKing = true;
            furtherCaptures = isCapture
            ? getCaptureMoves(newBoard, { row, col }, updatedCaptured, rules.boardSize)
            : [];
          }
        }

        if (furtherCaptures.length > 0) {
          setBoard(newBoard);
          setCapturedPositions(updatedCaptured);
          setSelected({ row, col });
          return;
        }

        if (updatedCaptured.length > 0) {
          for (const pos of updatedCaptured) {
            newBoard[pos.row][pos.col] = null;
          }
        }

        setBoard(newBoard);
        setCapturedPositions([]);
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
      }
      if (!isChainCapture || isLegal) {
        setSelected(null);
      }
    } else if (piece && piece.color === currentPlayer) {
      setSelected({ row, col });
    }
  }

  const rows = [];

  for (let row = 0; row < rules.boardSize; row++) {
    const cells = [];
    for (let col = 0; col < rules.boardSize; col++) {
      const isDark = (row + col) % 2 === 1;
      const piece = board[row][col];
      const isSelected = selected?.row === row && selected?.col === col;
      const isPendingRemoval = capturedPositions.some(p => p.row === row && p.col === col);

      cells.push(
        <Pressable
          key={`${row}-${col}`}
          onPress={() => handleCellPress(row, col)}
          style={[
            styles.cell,
            isDark ? styles.darkCell : styles.lightCell,
            isSelected && styles.selectedCell,
          ]}
        >
          {piece && <PieceView color={piece.color} isKing={piece.isKing} faded={isPendingRemoval} />}
        </Pressable>
      );
    }
    rows.push(
      <View key={row} style={styles.row}>
        {cells}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.variantSwitcher}>
        <Pressable
          onPress={() => handleVariantChange('russian')}
          style={[styles.variantButton, variant === 'russian' && styles.variantButtonActive]}
        >
          <Text style={styles.variantButtonText}>Orosz dáma</Text>
        </Pressable>
        <Pressable
          onPress={() => handleVariantChange('international')}
          style={[styles.variantButton, variant === 'international' && styles.variantButtonActive]}
        >
          <Text style={styles.variantButtonText}>Nemzetközi dáma</Text>
        </Pressable>
      </View>

      <Text style={styles.turnIndicator}>
        Soron: {currentPlayer === 'white' ? 'Fehér' : 'Fekete'}
      </Text>
      <View style={styles.board}>{rows}</View>
    </View>
  );
}

// IDEIGLENES TESZT FÜGGVÉNY - a késleltetett promóció teszteléséhez, utána törölhető
function createPromotionTestBoard(): Piece[][] {
  const boardSize = 8;
  const board: Piece[][] = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(null)
  );

  board[2][7] = { color: 'white', isKing: false };
  board[0][1] = { color: 'white', isKing: true };
  board[2][3] = { color: 'black', isKing: false };
  //board[7][6] = { color: 'black', isKing: false };
  board[1][6] = { color: 'black', isKing: false };
  board[5][4] = { color: 'black', isKing: false };
  board[4][1] = { color: 'black', isKing: false };
  board[6][1] = { color: 'black', isKing: false };

  return board;
}

const styles = StyleSheet.create({
  board: {
    borderWidth: 2,
    borderColor: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCell: {
    backgroundColor: '#769656',
  },
  lightCell: {
    backgroundColor: '#eeeed2',
  },
  piece: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whitePiece: {
    backgroundColor: '#f5f5f5',
  },
  blackPiece: {
    backgroundColor: '#2b2b2b',
  },
  fadedPiece: {
    opacity: 0.35,
  },
  kingRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
  selectedCell: {
    borderWidth: 3,
    borderColor: '#ffcc00',
  },
  turnIndicator: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  variantSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  variantButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#769656',
  },
  variantButtonActive: {
    backgroundColor: '#769656',
  },
  variantButtonText: {
    fontSize: 13,
  },
});