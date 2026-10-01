import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import PuzzleSolver from './PuzzleSolver';
import LevelMap from './LevelMap';
import PuzzleDots from './PuzzleDots';
import { INTERNATIONAL_RULES, RUSSIAN_RULES, Variant } from '../logic/engine';
import { RUSSIAN_LEVELS, INTERNATIONAL_LEVELS } from '../logic/levelsData';
import {
  VariantProgress,
  goToNext,
  markSolved,
  puzzleKey,
  selectLevel,
  selectPuzzle,
} from '../logic/progress';
import { EMPTY_STORED_PROGRESS, StoredProgress, loadProgress, saveProgress } from '../logic/cloudProgress';
import { useAuth } from '../logic/authContext';

type MapOrLevel = 'map' | 'level';

export default function PuzzleBrowser() {
  const { user, signOut } = useAuth();
  const [variant, setVariant] = useState<Variant>('russian');
  const [view, setView] = useState<MapOrLevel>('map');
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
    setView('level');
  }

  function handleSelectPuzzle(index: number) {
    update(p => selectPuzzle(p, index));
  }

  function handleBackToMap() {
    setView('map');
  }

  function handleVariantChange(v: Variant) {
    setVariant(v);
    setView('map');
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <Text style={styles.userEmail} numberOfLines={1}>
          {user?.email}
        </Text>
        <Pressable
          onPress={() => signOut()}
          style={styles.signOutButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.signOutText}>Kijelentkezés</Text>
        </Pressable>
      </View>

      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

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

      {view === 'map' ? (
        <LevelMap levels={levels} progress={current} onSelectLevel={handleSelectLevel} />
      ) : (
        <View style={styles.levelView}>
          <Pressable onPress={handleBackToMap} style={styles.backButton} hitSlop={8}>
            <Text style={styles.backButtonText}>‹ Pálya</Text>
          </Pressable>

          {current.screen === 'levelComplete' ? (
            <View style={styles.completeBox}>
              <Text style={styles.completeTitle}>🎉 {level.title} kész!</Text>
              <Text style={styles.completeText}>
                Az összes feladványt megoldottad ezen a szinten.
              </Text>
              <Pressable style={styles.primaryButton} onPress={handleBackToMap}>
                <Text style={styles.primaryButtonText}>Vissza a pályához</Text>
              </Pressable>
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 16,
    minHeight: '100%',
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
    marginBottom: 20,
  },
  userEmail: {
    fontSize: 12,
    color: '#555',
    flexShrink: 1,
    marginRight: 12,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  signOutText: {
    fontSize: 13,
    color: '#b00020',
    fontWeight: '600',
  },
  saveError: {
    fontSize: 12,
    color: '#b00020',
    marginBottom: 10,
  },
  variantSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  variantButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
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
  levelView: {
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#769656',
    fontWeight: '600',
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