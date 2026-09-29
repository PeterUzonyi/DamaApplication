import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PuzzleSolver from './PuzzleSolver';
import LevelPath from './LevelPath';
import PuzzleDots from './PuzzleDots';
import { INTERNATIONAL_RULES, RUSSIAN_RULES, Variant } from '../logic/engine';
import { RUSSIAN_LEVELS, INTERNATIONAL_LEVELS } from '../logic/levelsData';
import {
  INITIAL_PROGRESS,
  VariantProgress,
  goToNext,
  goToNextLevel,
  markSolved,
  puzzleKey,
  selectLevel,
  selectPuzzle,
} from '../logic/progress';

export default function PuzzleBrowser() {
  const [variant, setVariant] = useState<Variant>('russian');
  // Mindkét variáns saját haladását külön tároljuk, így váltáskor megmarad
  const [progress, setProgress] = useState<{ russian: VariantProgress; international: VariantProgress }>({
    russian: INITIAL_PROGRESS,
    international: INITIAL_PROGRESS,
  });

  const levels = variant === 'russian' ? RUSSIAN_LEVELS : INTERNATIONAL_LEVELS;
  const rules = variant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;
  const current = progress[variant];
  const level = levels[current.levelIndex];
  const puzzle = level.puzzles[current.puzzleIndex];

  function update(fn: (p: VariantProgress) => VariantProgress) {
    setProgress(prev => ({ ...prev, [variant]: fn(prev[variant]) }));
  }

  function handleSolved() {
    update(p => markSolved(p, puzzleKey(level, puzzle)));
  }

  function handleNext() {
    update(p => goToNext(markSolved(p, puzzleKey(level, puzzle)), levels));
  }

  function handleSelectLevel(index: number) {
    update(p => selectLevel(p, levels, index));
  }

  function handleSelectPuzzle(index: number) {
    update(p => selectPuzzle(p, index));
  }

  function handleNextLevel() {
    update(p => goToNextLevel(p, levels));
  }

  const isLastLevel = current.levelIndex === levels.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.variantSwitcher}>
        <Pressable
          onPress={() => setVariant('russian')}
          style={[styles.variantButton, variant === 'russian' && styles.variantButtonActive]}
        >
          <Text style={styles.variantButtonText}>Orosz dáma</Text>
        </Pressable>
        <Pressable
          onPress={() => setVariant('international')}
          style={[styles.variantButton, variant === 'international' && styles.variantButtonActive]}
        >
          <Text style={styles.variantButtonText}>Nemzetközi dáma</Text>
        </Pressable>
      </View>

      <LevelPath
        levels={levels}
        currentLevelIndex={current.levelIndex}
        completed={current.completed}
        onSelectLevel={handleSelectLevel}
      />

      {current.screen === 'levelComplete' ? (
        <View style={styles.completeBox}>
          <Text style={styles.completeTitle}>🎉 {level.title} kész!</Text>
          <Text style={styles.completeText}>
            Az összes feladványt megoldottad ezen a szinten.
          </Text>
          {isLastLevel ? (
            <Text style={styles.completeText}>Ez volt az utolsó elérhető szint egyelőre.</Text>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleNextLevel}>
              <Text style={styles.primaryButtonText}>Következő szint</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <PuzzleDots
            level={level}
            currentIndex={current.puzzleIndex}
            completed={current.completed}
            onSelect={handleSelectPuzzle}
          />
          <Text style={styles.counter}>
            {level.title} – {current.puzzleIndex + 1}. / {level.puzzles.length} ({puzzle.id})
          </Text>

          {/* A key miatt feladvány- vagy módváltáskor mindig tiszta állapotból indul a megoldás */}
          <PuzzleSolver
            key={`${variant}-${level.id}-${puzzle.id}`}
            puzzle={puzzle}
            rules={rules}
            onNext={handleNext}
            onSolved={handleSolved}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  variantSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
  },
  variantButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#769656',
  },
  variantButtonActive: {
    backgroundColor: '#769656',
  },
  variantButtonText: {
    fontSize: 13,
  },
  counter: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  completeBox: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  completeText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#769656',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
