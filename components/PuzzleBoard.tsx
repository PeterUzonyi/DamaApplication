import React from 'react';
import { View, StyleSheet } from 'react-native';

type PieceColor = 'white' | 'black';
type PieceData = { color: PieceColor; isKing: boolean };
type Piece = PieceData | null;

export function parseBoardFromRows(rows: string[]): Piece[][] {
  return rows.map(rowStr =>
    rowStr.split('').map(char => {
      switch (char) {
        case 'w':
          return { color: 'white', isKing: false } as PieceData;
        case 'W':
          return { color: 'white', isKing: true } as PieceData;
        case 'b':
          return { color: 'black', isKing: false } as PieceData;
        case 'B':
          return { color: 'black', isKing: true } as PieceData;
        default:
          return null;
      }
    })
  );
}

function PieceView({ color, isKing }: { color: PieceColor; isKing: boolean }) {
  return (
    <View style={[styles.piece, color === 'white' ? styles.whitePiece : styles.blackPiece]}>
      {isKing && <View style={styles.kingRing} />}
    </View>
  );
}

export default function PuzzleBoard({ board, boardSize }: { board: Piece[][]; boardSize: number }) {
  const rows = [];

  for (let row = 0; row < boardSize; row++) {
    const cells = [];
    for (let col = 0; col < boardSize; col++) {
      const isDark = (row + col) % 2 === 1;
      const piece = board[row][col];

      cells.push(
        <View key={`${row}-${col}`} style={[styles.cell, isDark ? styles.darkCell : styles.lightCell]}>
          {piece && <PieceView color={piece.color} isKing={piece.isKing} />}
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
    width: 36,
    height: 36,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
  kingRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
});