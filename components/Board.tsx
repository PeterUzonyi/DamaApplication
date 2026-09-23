import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';


const BOARD_SIZE = 8;
type PieceColor = 'white' | 'black';
type PieceData = { color: PieceColor; isKing: boolean };
type Piece = PieceData | null;

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
        board[row][col] = { color: 'black', isKing: false };
      } else if (row > 4) {
        board[row][col] = { color: 'white', isKing: false };
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

  const moves: Position[] = [];

  if (!piece.isKing) {
    const direction = piece.color === 'white' ? -1 : 1;
    for (const dcol of [-1, 1]) {
      const newRow = pos.row + direction;
      const newCol = pos.col + dcol;
      if (isOnBoard(newRow, newCol) && board[newRow][newCol] === null) {
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
        if (!isOnBoard(newRow, newCol) || board[newRow][newCol] !== null) break;
        moves.push({ row: newRow, col: newCol });
        steps++;
      }
    }
  }

  return moves;
}

function getCaptureMoves(board: Piece[][], pos: Position, excluded: Position[] = []): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const opponent = piece.color === 'white' ? 'black' : 'white';
  const moves: Position[] = [];

  if (!piece.isKing) {
    for (const drow of [-1, 1]) {
      for (const dcol of [-1, 1]) {
        const midRow = pos.row + drow;
        const midCol = pos.col + dcol;
        const targetRow = pos.row + drow * 2;
        const targetCol = pos.col + dcol * 2;

        const midIsExcluded = excluded.some(p => p.row === midRow && p.col === midCol);
        const midPiece = board[midRow]?.[midCol];

        if (
          isOnBoard(targetRow, targetCol) &&
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

  // Király ütése: végigmegy az átlón, amíg üres mezőket talál,
  // ha ellenfél-korongba ütközik (és nincs kizárva), a mögötte lévő üres mezőkre tud landolni
  for (const drow of [-1, 1]) {
    for (const dcol of [-1, 1]) {
      let steps = 1;
      let foundOpponent: Position | null = null;

      while (true) {
        const r = pos.row + drow * steps;
        const c = pos.col + dcol * steps;
        if (!isOnBoard(r, c)) break;

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
          break; // saját bábu, vagy kizárt ellenfél-korong -> nem tud átugrani
        } else {
          if (cellPiece === null) {
            moves.push({ row: r, col: c });
            steps++;
            continue;
          }
          break; // a leütendő korong mögött csak üres mezőkre landolhat, itt megáll a szakasz
        }
      }
    }
  }

  return moves;
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

function boardHasAnyCapture(board: Piece[][], player: 'white' | 'black', excluded: Position[] = []): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]?.color === player) {
        if (getCaptureMoves(board, { row, col }, excluded).length > 0) 
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
  const [board, setBoard] = useState<Piece[][]>(createInitialBoard());
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [capturedPositions, setCapturedPositions] = useState<Position[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  
  function handleCellPress(row: number, col: number) {
  const piece = board[row][col];

  if (selected) {
    const selectedPiece = board[selected.row][selected.col];
    if (!selectedPiece) {
      setSelected(null);
      return;
    }

    const isChainCapture = capturedPositions.length > 0;
    const mustCapture = isChainCapture || boardHasAnyCapture(board, selectedPiece.color, capturedPositions);
    const captureMoves = getCaptureMoves(board, selected, capturedPositions);
    const simpleMoves = isChainCapture ? [] : getSimpleMoves(board, selected);
    const legalMoves = mustCapture ? captureMoves : [...simpleMoves, ...captureMoves];

    const isLegal = legalMoves.some(m => m.row === row && m.col === col);

    if (isLegal) {
      const newBoard = board.map(r => [...r]);
      
      const promotedPiece: PieceData = { ...selectedPiece };
      if (!promotedPiece.isKing) {
        if (
          (promotedPiece.color === 'white' && row === 0) ||
          (promotedPiece.color === 'black' && row === BOARD_SIZE - 1)
        ) {
          promotedPiece.isKing = true;
        }
      }
      newBoard[row][col] = promotedPiece;

      newBoard[selected.row][selected.col] = null;

      const capturedPos = findCapturedPosition(board, selected, { row, col });
      const isCapture = capturedPos !== null;
      let updatedCaptured = capturedPositions;

      if (isCapture && capturedPos) {
        updatedCaptured = [...capturedPositions, capturedPos];
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
      setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
    }
        setSelected(null);
    } else if (piece && piece.color === currentPlayer) {
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
        <Text style={styles.turnIndicator}>
            Soron: {currentPlayer === 'white' ? 'Fehér' : 'Fekete'}
        </Text>
        <View style={styles.board}>{rows}</View>
    </View>
);
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
});