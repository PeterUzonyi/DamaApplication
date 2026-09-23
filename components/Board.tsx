import React from 'react';
import { View, StyleSheet } from 'react-native';

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
  const board = createInitialBoard();
  const rows = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    const cells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isDark = (row + col) % 2 === 1;
      const piece = board[row][col];

      cells.push(
        <View
          key={`${row}-${col}`}
          style={[styles.cell, isDark ? styles.darkCell : styles.lightCell]}
        >
          {piece && <PieceView color={piece} />}
        </View>
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
});