import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Level, VariantProgress } from '../logic/progress';
import { isLevelComplete, isLevelUnlocked } from '../logic/progress';

type Props = {
  levels: Level[];
  currentLevelIndex: number;
  progress: VariantProgress;
  onSelectLevel: (index: number) => void;
};

export default function LevelPath({ levels, currentLevelIndex, progress, onSelectLevel }: Props) {
  return (
    <View style={styles.row}>
      {levels.map((level, index) => {
        const unlocked = isLevelUnlocked(levels, index, progress);
        const done = isLevelComplete(level, progress.completed);
        const isCurrent = index === currentLevelIndex;

        return (
          <Pressable
            key={level.id}
            disabled={!unlocked}
            onPress={() => onSelectLevel(index)}
            style={styles.item}
          >
            <View
              style={[
                styles.circle,
                done && styles.circleDone,
                !unlocked && styles.circleLocked,
                isCurrent && styles.circleCurrent,
              ]}
            >
              <Text style={[styles.circleText, !unlocked && styles.circleTextLocked]}>
                {done ? '✓' : unlocked ? index + 1 : '🔒'}
              </Text>
            </View>
            <Text style={[styles.label, !unlocked && styles.labelLocked]} numberOfLines={1}>
              {level.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 10,
  },
  item: {
    alignItems: 'center',
    width: 64,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eeeed2',
    borderWidth: 2,
    borderColor: '#769656',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#769656',
  },
  circleCurrent: {
    borderColor: '#ffcc00',
    borderWidth: 3,
  },
  circleLocked: {
    backgroundColor: '#e0e0e0',
    borderColor: '#bbb',
  },
  circleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  circleTextLocked: {
    color: '#999',
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
  },
  labelLocked: {
    color: '#999',
  },
});
