import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PuzzleSolver from './PuzzleSolver';
import {
  INTERNATIONAL_RULES,
  Puzzle,
  RUSSIAN_RULES,
  Variant,
} from '../logic/engine';
import russianPuzzlesData from '../data/puzzles/russian_test.json';
import internationalPuzzlesData from '../data/puzzles/international_test.json';

const russianPuzzles = russianPuzzlesData as Puzzle[];
const internationalPuzzles = internationalPuzzlesData as Puzzle[];

export default function PuzzleBrowser() {
  const [variant, setVariant] = useState<Variant>('russian');
  // Mindkét variáns aktuális feladványának sorszámát külön tároljuk, így váltáskor megmarad
  const [indices, setIndices] = useState<{ russian: number; international: number }>({
    russian: 0,
    international: 0,
  });

  const puzzleSet = variant === 'russian' ? russianPuzzles : internationalPuzzles;
  const rules = variant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;
  const currentIndex = indices[variant];
  const currentPuzzle = puzzleSet[currentIndex];

  function handleNext() {
    setIndices(prev => ({
      ...prev,
      [variant]: (prev[variant] + 1) % puzzleSet.length,
    }));
  }

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

      <Text style={styles.counter}>
        Feladvány {currentIndex + 1} / {puzzleSet.length} ({currentPuzzle.id})
      </Text>

      {/* A key miatt módváltásnál és feladványváltásnál a megoldás nulláról indul */}
      <PuzzleSolver
        key={`${variant}-${currentPuzzle.id}`}
        puzzle={currentPuzzle}
        rules={rules}
        onNext={handleNext}
      />
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
    marginBottom: 8,
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
});
