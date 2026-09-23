import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';

const BOARD_SIZE = 8;
type Piece = 'white' | 'black' | null;

function createInitialBoard(): Piece[][] {
  const board: Piece[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isDark = (row + col) % 2 === 1;
      if (!isDark) {
        continue;
      }

      if (row < 3) {
        board[row][col] = 'black';
      } else if (row > 4) {
        board[row][col] = 'white';
      }
    }
  }

  return board;
}

type Position = { row: number; col: number };

function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getSimpleMoves(board: Piece[][], pos: Position): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const direction = piece === 'white' ? -1 : 1;
  const moves: Position[] = [];

  for (const dcol of [-1, 1]) {
    const newRow = pos.row + direction;
    const newCol = pos.col + dcol;
    if (isOnBoard(newRow, newCol) && board[newRow][newCol] === null) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

function getCaptureMoves(board: Piece[][], pos: Position, excluded: Position[] = []): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const opponent = piece === 'white' ? 'black' : 'white';
  const moves: Position[] = [];

  for (const drow of [-1, 1]) {
    for (const dcol of [-1, 1]) {
      const midRow = pos.row + drow;
      const midCol = pos.col + dcol;
      const targetRow = pos.row + drow * 2;
      const targetCol = pos.col + dcol * 2;

      const midIsExcluded = excluded.some(p => p.row === midRow && p.col === midCol);

      if (
        isOnBoard(targetRow, targetCol) &&
        board[midRow]?.[midCol] === opponent &&
        !midIsExcluded &&
        board[targetRow][targetCol] === null
      ) {
        moves.push({ row: targetRow, col: targetCol });
      }
    }
  }

  return moves;
}

function boardHasAnyCapture(board: Piece[][], player: 'white' | 'black', excluded: Position[] = []): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === player) {
        if (getCaptureMoves(board, { row, col }, excluded).length > 0) 
            return true;
      }
    }
  }
  return false;
}

function PieceView({ color, faded }: { color: 'white' | 'black'; faded?: boolean }) {
  return (
    <View
      style={[
        styles.piece,
        color === 'white' ? styles.whitePiece : styles.blackPiece,
        faded && styles.fadedPiece,
      ]}
    />
  );
}

export default function Board() {
  const [board, setBoard] = useState<Piece[][]>(createInitialBoard());
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [capturedPositions, setCapturedPositions] = useState<Position[]>([]);
  
  function handleCellPress(row: number, col: number) {
  const piece = board[row][col];

  if (selected) {
    const selectedPiece = board[selected.row][selected.col];
    if (!selectedPiece) {
      setSelected(null);
      return;
    }

    const isChainCapture = capturedPositions.length > 0;
    const mustCapture = isChainCapture || boardHasAnyCapture(board, selectedPiece, capturedPositions);
    const captureMoves = getCaptureMoves(board, selected, capturedPositions);
    const simpleMoves = isChainCapture ? [] : getSimpleMoves(board, selected);
    const legalMoves = mustCapture ? captureMoves : [...simpleMoves, ...captureMoves];

    const isLegal = legalMoves.some(m => m.row === row && m.col === col);

    if (isLegal) {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = selectedPiece;
      newBoard[selected.row][selected.col] = null;

      const isCapture = Math.abs(row - selected.row) === 2;
      let updatedCaptured = capturedPositions;

      if (isCapture) {
        const midRow = (row + selected.row) / 2;
        const midCol = (col + selected.col) / 2;
        updatedCaptured = [...capturedPositions, { row: midRow, col: midCol }];
      }

      const furtherCaptures = isCapture
        ? getCaptureMoves(newBoard, { row, col }, updatedCaptured)
        : [];

      if (furtherCaptures.length > 0) {
        // Van még folytatás -> a leütött korongok egyelőre halványan a táblán maradnak
        setBoard(newBoard);
        setCapturedPositions(updatedCaptured);
        setSelected({ row, col });
        return;
      }

      // A sorozat véget ért (vagy sima lépés volt) -> most tűnnek el ténylegesen a leütött korongok
      if (updatedCaptured.length > 0) {
        for (const pos of updatedCaptured) {
          newBoard[pos.row][pos.col] = null;
        }
      }

      setBoard(newBoard);
      setCapturedPositions([]);
    }
        setSelected(null);
    } else if (piece) {
        setSelected({ row, col });
    }
  }
  
  const rows = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    const cells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
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
        {piece && <PieceView color={piece} faded={isPendingRemoval} />}
        </Pressable>
      );
    }
    rows.push(
      <View key={row} style={styles.row}>
        {cells}
      </View>
    );
  }

  return <View style={styles.board}>{rows}</View>;
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
    backgroundColor: '#769656',//Zöldes: 769656
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
  selectedCell: {
    borderWidth: 3,
    borderColor: '#ffcc00',
  },
});