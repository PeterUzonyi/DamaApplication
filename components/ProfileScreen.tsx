import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../logic/themeContext';
import { Level, VariantProgress, isLevelComplete, isPuzzleDone } from '../logic/progress';
import { Rating } from '../logic/glicko2';
import { StreakState, displayedStreak, todayString } from '../logic/streak';
import { HistoryEntry, Variant, aggregateDailyStats, ratingSeries } from '../logic/historyStats';
import { loadHistory } from '../logic/cloudProgress';
import RatingChart from './RatingChart';

type Props = {
  uid: string;
  username: string;
  email: string;
  russianLevels: Level[];
  internationalLevels: Level[];
  russianProgress: VariantProgress;
  internationalProgress: VariantProgress;
  russianRating: Rating;
  internationalRating: Rating;
  streak: StreakState;
  onChangeDailyGoal: (newGoal: number) => void;
};

function levelSummary(levels: Level[], progress: VariantProgress) {
  const level = levels[progress.levelIndex];
  const solvedInLevel = level.puzzles.filter((_, i) => isPuzzleDone(level, i, progress.completed)).length;
  const completedLevels = levels.filter(l => isLevelComplete(l, progress.completed)).length;
  return {
    levelTitle: level.title,
    solvedInLevel,
    totalInLevel: level.puzzles.length,
    completedLevels,
    totalLevels: levels.length,
  };
}

export default function ProfileScreen({
  uid,
  username,
  email,
  russianLevels,
  internationalLevels,
  russianProgress,
  internationalProgress,
  russianRating,
  internationalRating,
  streak,
  onChangeDailyGoal,
}: Props) {
  const { colors } = useTheme();
  const ru = levelSummary(russianLevels, russianProgress);
  const intl = levelSummary(internationalLevels, internationalProgress);
  const streakCount = displayedStreak(streak, todayString());

  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [chartVariant, setChartVariant] = useState<Variant>('russian');

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setHistoryError(false);
    loadHistory(uid)
      .then(entries => {
        if (!cancelled) setHistory(entries);
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const dailyStats = history ? aggregateDailyStats(history) : [];

  return (
    <View style={styles.container}>
      <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
      <Text style={[styles.email, { color: colors.textMuted }]}>{email}</Text>

      <View style={[styles.streakBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <View>
          <Text style={[styles.streakNumber, { color: colors.text }]}>{streakCount} napos sorozat</Text>
          <Text style={[styles.streakSub, { color: colors.textMuted }]}>
            Leghosszabb: {streak.longest} nap · Napi cél: {streak.dailyGoal} feladvány
          </Text>
        </View>
      </View>

      <View style={styles.goalRow}>
        <Text style={[styles.goalLabel, { color: colors.text }]}>Napi cél módosítása</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepperButton, { borderColor: colors.border }]}
            onPress={() => onChangeDailyGoal(streak.dailyGoal - 1)}
          >
            <Text style={[styles.stepperButtonText, { color: colors.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.stepperValue, { color: colors.text }]}>{streak.dailyGoal}</Text>
          <Pressable
            style={[styles.stepperButton, { borderColor: colors.border }]}
            onPress={() => onChangeDailyGoal(streak.dailyGoal + 1)}
          >
            <Text style={[styles.stepperButtonText, { color: colors.text }]}>+</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Haladás</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Orosz dáma</Text>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          Pontszám: {Math.round(russianRating.rating)}
          {russianRating.deviation > 200 ? ' (ideiglenes)' : ''}
        </Text>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          {ru.levelTitle}: {ru.solvedInLevel}/{ru.totalInLevel} feladvány
        </Text>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          Teljesített szintek: {ru.completedLevels}/{ru.totalLevels}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Nemzetközi dáma</Text>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          Pontszám: {Math.round(internationalRating.rating)}
          {internationalRating.deviation > 200 ? ' (ideiglenes)' : ''}
        </Text>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          {intl.levelTitle}: {intl.solvedInLevel}/{intl.totalInLevel} feladvány
        </Text>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          Teljesített szintek: {intl.completedLevels}/{intl.totalLevels}
        </Text>
      </View>

      {historyError && (
        <Text style={[styles.errorNote, { color: colors.danger }]}>
          Az előzmények betöltése nem sikerült. Ellenőrizd az internetkapcsolatot, vagy
          próbáld újra később.
        </Text>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pontszám alakulása</Text>
      <View style={styles.chartVariantRow}>
        <Pressable
          onPress={() => setChartVariant('russian')}
          style={[
            styles.chartVariantButton,
            { borderColor: colors.accent },
            chartVariant === 'russian' && { backgroundColor: colors.accent },
          ]}
        >
          <Text style={{ color: chartVariant === 'russian' ? colors.accentText : colors.text, fontSize: 12 }}>
            Orosz
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setChartVariant('international')}
          style={[
            styles.chartVariantButton,
            { borderColor: colors.accent },
            chartVariant === 'international' && { backgroundColor: colors.accent },
          ]}
        >
          <Text style={{ color: chartVariant === 'international' ? colors.accentText : colors.text, fontSize: 12 }}>
            Nemzetközi
          </Text>
        </Pressable>
      </View>

      {history === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
      ) : (
        <RatingChart points={ratingSeries(history, chartVariant)} />
      )}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Napi tevékenység</Text>
      {history === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
      ) : dailyStats.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLine, { color: colors.textMuted }]}>
            Még nincs megoldott feladványod.
          </Text>
        </View>
      ) : (
        dailyStats.map(day => {
          const parts: string[] = [];
          if (day.russian.correct + day.russian.incorrect > 0) {
            parts.push(`Orosz: ${day.russian.correct} jó, ${day.russian.incorrect} rossz`);
          }
          if (day.international.correct + day.international.incorrect > 0) {
            parts.push(`Nemzetközi: ${day.international.correct} jó, ${day.international.incorrect} rossz`);
          }
          return (
            <View
              key={day.date}
              style={[styles.dayRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.dayDate, { color: colors.text }]}>{day.date}</Text>
              <Text style={[styles.dayDetail, { color: colors.textMuted }]}>{parts.join(' · ')}</Text>
            </View>
          );
        })
      )}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Ismerősök</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>
          Ez a funkció hamarosan érkezik.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 13,
    marginBottom: 16,
  },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakSub: {
    fontSize: 12,
    marginTop: 2,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalLabel: {
    fontSize: 14,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    opacity: 0.7,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardLine: {
    fontSize: 13,
    marginTop: 2,
  },
  errorNote: {
    fontSize: 12,
    marginBottom: 12,
  },
  chartVariantRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chartVariantButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayDetail: {
    fontSize: 12,
    marginTop: 2,
  },
});