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

function PieceView({ color }: { color: 'white' | 'black' }) {
  return (
    <View
      style={[
        styles.piece,
        color === 'white' ? styles.whitePiece : styles.blackPiece,
      ]}
    />
  );
}

export default function Board() {
  const [board, setBoard] = useState<Piece[][]>(createInitialBoard());
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  
  function handleCellPress(row: number, col: number) {
    const piece = board[row][col];

    if (selected) {
    // Ha már ki van választva egy korong, és most egy üres mezőre koppintasz -> lépés
        const targetIsEmpty = board[row][col] === null;
    if (targetIsEmpty) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = newBoard[selected.row][selected.col];
        newBoard[selected.row][selected.col] = null;
        setBoard(newBoard);
    }
    setSelected(null);
    } else if (piece) {
    // Ha még nincs kiválasztva semmi, és van korong ezen a mezőn -> kiválasztás
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
        {piece && <PieceView color={piece} />}
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
  selectedCell: {
    borderWidth: 3,
    borderColor: '#ffcc00',
  },
});