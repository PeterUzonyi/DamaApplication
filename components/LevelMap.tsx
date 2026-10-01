import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Level, VariantProgress } from '../logic/progress';
import { frontierIndex, isLevelComplete, isLevelUnlocked, isPuzzleDone } from '../logic/progress';

type Props = {
  levels: Level[];
  progress: VariantProgress;
  onSelectLevel: (index: number) => void;
};

function solvedCount(level: Level, completed: string[]): number {
  return level.puzzles.filter((_, i) => isPuzzleDone(level, i, completed)).length;
}

export default function LevelMap({ levels, progress, onSelectLevel }: Props) {
  return (
    <View style={styles.container}>
      {levels.map((level, index) => {
        const unlocked = isLevelUnlocked(levels, index, progress);
        const done = isLevelComplete(level, progress.completed);
        const solved = solvedCount(level, progress.completed);

        return (
          <View key={level.id} style={styles.item}>
            <Pressable
              disabled={!unlocked}
              onPress={() => onSelectLevel(index)}
              style={({ pressed }) => [
                styles.circle,
                done && styles.circleDone,
                !unlocked && styles.circleLocked,
                pressed && unlocked && styles.circlePressed,
              ]}
            >
              <Text style={[styles.circleText, !unlocked && styles.circleTextLocked]}>
                {done ? '✓' : unlocked ? index + 1 : '🔒'}
              </Text>
            </Pressable>
            <Text style={[styles.label, !unlocked && styles.labelLocked]}>{level.title}</Text>
            {unlocked && (
              <Text style={styles.sublabel}>
                {solved} / {level.puzzles.length} feladvány
              </Text>
            )}
            {index < levels.length - 1 && <View style={styles.connector} />}
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  item: {
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#eeeed2',
    borderWidth: 3,
    borderColor: '#769656',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#769656',
  },
  circlePressed: {
    opacity: 0.8,
  },
  circleLocked: {
    backgroundColor: '#e8e8e8',
    borderColor: '#bbb',
  },
  circleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  circleTextLocked: {
    color: '#999',
    fontSize: 22,
  },
  label: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  labelLocked: {
    color: '#999',
  },
  sublabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  connector: {
    width: 4,
    height: 28,
    backgroundColor: '#ccc',
    marginVertical: 6,
    borderRadius: 2,
  },
});
