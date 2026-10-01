import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import PuzzleSolver from './PuzzleSolver';
import LevelPath from './LevelPath';
import PuzzleDots from './PuzzleDots';
import { INTERNATIONAL_RULES, RUSSIAN_RULES, Variant } from '../logic/engine';
import { RUSSIAN_LEVELS, INTERNATIONAL_LEVELS } from '../logic/levelsData';
import {
  VariantProgress,
  goToNext,
  goToNextLevel,
  markSolved,
  puzzleKey,
  selectLevel,
  selectPuzzle,
} from '../logic/progress';
import { EMPTY_STORED_PROGRESS, StoredProgress, loadProgress, saveProgress } from '../logic/cloudProgress';
import { useAuth } from '../logic/authContext';

export default function PuzzleBrowser() {
  const { user, signOut } = useAuth();
  const [variant, setVariant] = useState<Variant>('russian');
  const [progress, setProgress] = useState<StoredProgress | null>(null); // null = még töltjük Firestore-ból
  const [saveError, setSaveError] = useState('');

  // Betöltés bejelentkezéskor (ill. ha valamiért másik felhasználóra váltana)
  useEffect(() => {
    let cancelled = false;
    setProgress(null);
    loadProgress(user!.uid).then(loaded => {
      if (!cancelled) setProgress(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Mentés Firestore-ba minden alkalommal, amikor a haladás változik (a kezdeti
  // betöltést nem írjuk vissza feleslegesen - lásd az isFirstRun ref-et)
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (!progress) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setSaveError('');
    saveProgress(user!.uid, progress).catch(() => {
      setSaveError('A haladás mentése nem sikerült. Ellenőrizd az internetkapcsolatot.');
    });
  }, [progress, user]);

  if (!progress) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#769656" />
        <Text style={styles.loadingText}>Haladás betöltése...</Text>
      </View>
    );
  }

  const levels = variant === 'russian' ? RUSSIAN_LEVELS : INTERNATIONAL_LEVELS;
  const rules = variant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;
  const current = progress[variant];
  const level = levels[current.levelIndex];
  const puzzle = level.puzzles[current.puzzleIndex];

  function update(fn: (p: VariantProgress) => VariantProgress) {
    setProgress(prev => (prev ? { ...prev, [variant]: fn(prev[variant]) } : prev));
  }

  function handleSolved() {
    update(p => markSolved(p, puzzleKey(level, puzzle), levels));
  }

  function handleNext() {
    update(p => goToNext(markSolved(p, puzzleKey(level, puzzle), levels), levels));
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
      <View style={styles.topBar}>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Pressable onPress={() => signOut()}>
          <Text style={styles.signOutText}>Kijelentkezés</Text>
        </Pressable>
      </View>

      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

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
        progress={current}
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
    width: '100%',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#555',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 12,
    color: '#555',
  },
  signOutText: {
    fontSize: 12,
    color: '#b00020',
  },
  saveError: {
    fontSize: 12,
    color: '#b00020',
    marginBottom: 6,
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
