import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Piece, PieceColor, Position } from '../logic/engine';

type Props = {
  board: Piece[][];
  boardSize: number;
  selected?: Position | null;
  capturedPositions?: Position[];
  onCellPress?: (row: number, col: number) => void;
};

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

export default function PuzzleBoard({
  board,
  boardSize,
  selected = null,
  capturedPositions = [],
  onCellPress,
}: Props) {
  const rows = [];

  for (let row = 0; row < boardSize; row++) {
    const cells = [];
    for (let col = 0; col < boardSize; col++) {
      const isDark = (row + col) % 2 === 1;
      const piece = board[row]?.[col] ?? null;
      const isSelected = selected?.row === row && selected?.col === col;
      const isPendingRemoval = capturedPositions.some(p => p.row === row && p.col === col);

      cells.push(
        <Pressable
          key={`${row}-${col}`}
          onPress={() => onCellPress?.(row, col)}
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
  selectedCell: {
    borderWidth: 3,
    borderColor: '#ffcc00',
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
  fadedPiece: {
    opacity: 0.35,
  },
  kingRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
});
