import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Level } from '../logic/progress';
import { isPuzzleDone, isPuzzleUnlocked } from '../logic/progress';

type Props = {
  level: Level;
  currentIndex: number;
  completed: string[];
  onSelect: (index: number) => void;
};

export default function PuzzleDots({ level, currentIndex, completed, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {level.puzzles.map((puzzle, index) => {
        const done = isPuzzleDone(level, index, completed);
        const unlocked = isPuzzleUnlocked(level, index, completed);
        const isCurrent = index === currentIndex;

        return (
          <Pressable
            key={puzzle.id}
            disabled={!unlocked}
            onPress={() => onSelect(index)}
            style={[
              styles.dot,
              done && styles.dotDone,
              !unlocked && styles.dotLocked,
              isCurrent && styles.dotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#eeeed2',
    borderWidth: 1.5,
    borderColor: '#769656',
  },
  dotDone: {
    backgroundColor: '#769656',
  },
  dotCurrent: {
    borderColor: '#ffcc00',
    borderWidth: 2.5,
  },
  dotLocked: {
    backgroundColor: '#e0e0e0',
    borderColor: '#bbb',
  },
});
