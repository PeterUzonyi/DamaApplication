import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import PuzzleSolver from './PuzzleSolver';
import LevelMap from './LevelMap';
import PuzzleDots from './PuzzleDots';
import MenuOverlay from './MenuOverlay';
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
import {
  StoredUserData,
  emptyUserData,
  loadUserData,
  saveUserData,
  loadPuzzleRating,
  savePuzzleRating,
} from '../logic/cloudProgress';
import { playGame } from '../logic/glicko2';
import { recordSolve, todayString, withDailyGoal } from '../logic/streak';
import { useAuth } from '../logic/authContext';
import { useTheme } from '../logic/themeContext';

export default function PuzzleBrowser() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [variant, setVariant] = useState<Variant>('russian');
  const [view, setView] = useState<'map' | 'level'>('map');
  const [menuVisible, setMenuVisible] = useState(false);
  const [data, setData] = useState<StoredUserData | null>(null); // null = még töltjük Firestore-ból
  const [saveError, setSaveError] = useState('');
  const [ratingNote, setRatingNote] = useState('');

  // Betöltés bejelentkezéskor (ill. ha valamiért másik felhasználóra váltana)
  useEffect(() => {
    let cancelled = false;
    setData(null);
    loadUserData(user!.uid).then(loaded => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Mentés Firestore-ba minden alkalommal, amikor az adat változik (a kezdeti
  // betöltést nem írjuk vissza feleslegesen - lásd az isFirstRun ref-et)
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (!data) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setSaveError('');
    saveUserData(user!.uid, data).catch(() => {
      setSaveError('A mentés nem sikerült. Ellenőrizd az internetkapcsolatot.');
    });
  }, [data, user]);

  if (!data) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Betöltés...</Text>
      </View>
    );
  }

  const levels = variant === 'russian' ? RUSSIAN_LEVELS : INTERNATIONAL_LEVELS;
  const rules = variant === 'russian' ? RUSSIAN_RULES : INTERNATIONAL_RULES;
  const current = data[variant];
  const level = levels[current.levelIndex];
  const puzzle = level.puzzles[current.puzzleIndex];
  const ratingKey = variant === 'russian' ? 'russianRating' : 'internationalRating';

  function update(fn: (d: StoredUserData) => StoredUserData) {
    setData(prev => (prev ? fn(prev) : prev));
  }

  function updateProgress(fn: (p: VariantProgress) => VariantProgress) {
    update(d => ({ ...d, [variant]: fn(d[variant]) }));
  }

  // Pontszámítás + streak egy megoldott feladvány után. A feladvány saját, megosztott
  // pontszámát a Firestore-ban külön tároljuk - betöltjük, frissítjük, visszaírjuk.
  async function handleSolved(hadMistake: boolean) {
    if (!data) return;
    updateProgress(p => markSolved(p, puzzleKey(level, puzzle), levels));
    update(d => ({ ...d, streak: recordSolve(d.streak, todayString()) }));

    try {
      const puzzleRating = await loadPuzzleRating(variant, level.id, puzzle.id);
      const userRatingBefore = data[ratingKey];
      const result = playGame(userRatingBefore, puzzleRating, hadMistake ? 0 : 1);

      update(d => ({ ...d, [ratingKey]: result.a }));
      const delta = Math.round(result.a.rating - userRatingBefore.rating);
      setRatingNote(delta >= 0 ? `+${delta} pont` : `${delta} pont`);

      await savePuzzleRating(variant, level.id, puzzle.id, result.b);
    } catch {
      // A pontszám-frissítés hálózati hiba esetén elmarad, de ez nem akadályozza a játékot
    }
  }

  function handleNext() {
    updateProgress(p => goToNext(p, levels));
    setRatingNote('');
  }

  function handleSelectLevel(index: number) {
    updateProgress(p => selectLevel(p, levels, index));
    setView('level');
    setRatingNote('');
  }

  function handleSelectPuzzle(index: number) {
    updateProgress(p => selectPuzzle(p, index));
    setRatingNote('');
  }

  function handleBackToMap() {
    setView('map');
    setRatingNote('');
  }

  function handleVariantChange(v: Variant) {
    setVariant(v);
    setView('map');
    setRatingNote('');
  }

  function handleChangeDailyGoal(newGoal: number) {
    update(d => ({ ...d, streak: withDailyGoal(d.streak, newGoal) }));
  }

  const isLastLevel = current.levelIndex === levels.length - 1;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Játékos';

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>
          Szia, {displayName}!
        </Text>
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.menuButtonText, { color: colors.text }]}>☰</Text>
        </Pressable>
      </View>

      {saveError ? <Text style={[styles.saveError, { color: colors.danger }]}>{saveError}</Text> : null}

      <View style={styles.variantSwitcher}>
        <Pressable
          onPress={() => handleVariantChange('russian')}
          style={[
            styles.variantButton,
            { borderColor: colors.accent },
            variant === 'russian' && { backgroundColor: colors.accent },
          ]}
        >
          <Text style={[styles.variantButtonText, { color: variant === 'russian' ? colors.accentText : colors.text }]}>
            Orosz dáma
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleVariantChange('international')}
          style={[
            styles.variantButton,
            { borderColor: colors.accent },
            variant === 'international' && { backgroundColor: colors.accent },
          ]}
        >
          <Text
            style={[
              styles.variantButtonText,
              { color: variant === 'international' ? colors.accentText : colors.text },
            ]}
          >
            Nemzetközi dáma
          </Text>
        </Pressable>
      </View>

      {view === 'map' ? (
        <LevelMap levels={levels} progress={current} onSelectLevel={handleSelectLevel} />
      ) : (
        <View style={styles.levelView}>
          <Pressable onPress={handleBackToMap} style={styles.backButton} hitSlop={8}>
            <Text style={[styles.backButtonText, { color: colors.accent }]}>‹ Pálya</Text>
          </Pressable>

          {current.screen === 'levelComplete' ? (
            <View style={styles.completeBox}>
              <Text style={[styles.completeTitle, { color: colors.text }]}>🎉 {level.title} kész!</Text>
              <Text style={[styles.completeText, { color: colors.text }]}>
                Az összes feladványt megoldottad ezen a szinten.
              </Text>
              <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={handleBackToMap}>
                <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>Vissza a pályához</Text>
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
              <Text style={[styles.counter, { color: colors.text }]}>
                {level.title} – {current.puzzleIndex + 1}. / {level.puzzles.length} ({puzzle.id})
              </Text>
              {ratingNote ? (
                <Text style={[styles.ratingNote, { color: colors.accent }]}>{ratingNote}</Text>
              ) : null}

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

      <MenuOverlay
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSignOut={() => signOut()}
        username={displayName}
        email={user?.email ?? ''}
        russianLevels={RUSSIAN_LEVELS}
        internationalLevels={INTERNATIONAL_LEVELS}
        russianProgress={data.russian}
        internationalProgress={data.international}
        russianRating={data.russianRating}
        internationalRating={data.internationalRating}
        streak={data.streak}
        onChangeDailyGoal={handleChangeDailyGoal}
      />
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
  loadingText: {},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 12,
  },
  menuButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  menuButtonText: {
    fontSize: 22,
  },
  saveError: {
    fontSize: 12,
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
    fontWeight: '600',
  },
  counter: {
    textAlign: 'center',
    marginBottom: 2,
    fontSize: 14,
  },
  ratingNote: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
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
  },
  primaryButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontWeight: 'bold',
  },
});