import React from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Piece, PieceColor, Position } from '../logic/engine';

type Props = {
  board: Piece[][];
  boardSize: number;
  selected?: Position | null;
  capturedPositions?: Position[];
  onCellPress?: (row: number, col: number) => void;
};

function PieceView({
  color,
  isKing,
  faded,
  cellSize,
}: {
  color: PieceColor;
  isKing: boolean;
  faded?: boolean;
  cellSize: number;
}) {
  const pieceSize = Math.round(cellSize * 0.78);
  const ringSize = Math.round(cellSize * 0.34);

  return (
    <View
      style={[
        styles.piece,
        {
          width: pieceSize,
          height: pieceSize,
          borderRadius: pieceSize / 2,
        },
        color === 'white' ? styles.whitePiece : styles.blackPiece,
        faded && styles.fadedPiece,
      ]}
    >
      {isKing && (
        <View
          style={[
            styles.kingRing,
            { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
          ]}
        />
      )}
    </View>
  );
}

// A tábla a rendelkezésre álló szélesség alapján méretezi magát, hogy a 10×10-es
// (nemzetközi) tábla is elférjen keskeny telefonokon, a 8×8-as (orosz) pedig ne legyen
// feleslegesen apró egy nagyobb képernyőn.
const MAX_BOARD_PIXELS = 380;
const SIDE_PADDING = 32;
const MIN_CELL_SIZE = 26;

export default function PuzzleBoard({
  board,
  boardSize,
  selected = null,
  capturedPositions = [],
  onCellPress,
}: Props) {
  const { width } = useWindowDimensions();
  const available = Math.min(width - SIDE_PADDING, MAX_BOARD_PIXELS);
  const cellSize = Math.max(Math.floor(available / boardSize), MIN_CELL_SIZE);

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
            { width: cellSize, height: cellSize },
            isDark ? styles.darkCell : styles.lightCell,
            isSelected && styles.selectedCell,
          ]}
        >
          {piece && (
            <PieceView
              color={piece.color}
              isKing={piece.isKing}
              faded={isPendingRemoval}
              cellSize={cellSize}
            />
          )}
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
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
});