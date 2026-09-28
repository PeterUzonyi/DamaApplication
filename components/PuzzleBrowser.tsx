import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PuzzleBoard, { parseBoardFromRows } from './PuzzleBoard';
import russianPuzzles from '../data/puzzles/russian_test.json';
import internationalPuzzles from '../data/puzzles/international_test.json';

type Variant = 'russian' | 'international';

export default function PuzzleBrowser() {
  const [variant, setVariant] = useState<Variant>('russian');
  const [indices, setIndices] = useState<{ russian: number; international: number }>({
    russian: 0,
    international: 0,
  });

  const puzzleSet = variant === 'russian' ? russianPuzzles : internationalPuzzles;
  const boardSize = variant === 'russian' ? 8 : 10;
  const currentIndex = indices[variant];
  const currentPuzzle = puzzleSet[currentIndex];
  const board = parseBoardFromRows(currentPuzzle.board);

  function handleNext() {
    setIndices(prev => ({
      ...prev,
      [variant]: (prev[variant] + 1) % puzzleSet.length,
    }));
  }

  function handleVariantChange(newVariant: Variant) {
    setVariant(newVariant);
    // Az indices state változatlan marad -> a másik variánsnál is ott folytatódik, ahol abbahagytuk
  }

  return (
    <View>
      <View style={styles.variantSwitcher}>
        <Pressable
          onPress={() => handleVariantChange('russian')}
          style={[styles.variantButton, variant === 'russian' && styles.variantButtonActive]}
        >
          <Text style={styles.variantButtonText}>Orosz dáma</Text>
        </Pressable>
        <Pressable
          onPress={() => handleVariantChange('international')}
          style={[styles.variantButton, variant === 'international' && styles.variantButtonActive]}
        >
          <Text style={styles.variantButtonText}>Nemzetközi dáma</Text>
        </Pressable>
      </View>

      <Text style={styles.counter}>
        Feladvány {currentIndex + 1} / {puzzleSet.length} ({currentPuzzle.id})
      </Text>

      <PuzzleBoard board={board} boardSize={boardSize} />

      <Pressable style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Következő</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  nextButton: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: '#769656',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});