import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../logic/themeContext';
import { ReminderStatus } from '../logic/notifications';

type Props = {
  remindersEnabled: boolean;
  reminderStatus: ReminderStatus | null;
  onToggleReminders: (enabled: boolean) => void;
};

function statusHint(enabled: boolean, status: ReminderStatus | null): string | null {
  if (!enabled) return null;
  if (status === 'denied') {
    return 'Az értesítések le vannak tiltva. Engedélyezd őket a telefon beállításaiban, majd kapcsold ki és be újra ezt a kapcsolót.';
  }
  if (status === 'unsupported') {
    return 'Az értesítések csak a telefonos alkalmazásban működnek (böngészőben nem).';
  }
  return 'Minden nap 18:00-kor kapsz értesítést, ha aznap még nem érted el a napi célodat.';
}

export default function SettingsScreen({ remindersEnabled, reminderStatus, onToggleReminders }: Props) {
  const { mode, colors, toggleTheme } = useTheme();
  const hint = statusHint(remindersEnabled, reminderStatus);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Megjelenés</Text>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Sötét mód</Text>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Értesítések</Text>
      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Napi emlékeztető (18:00)</Text>
        <Switch value={remindersEnabled} onValueChange={onToggleReminders} />
      </View>
      {hint && <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
        Korongok és dámák kinézete
      </Text>
      <View style={[styles.row, styles.disabledRow, { borderColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
          Több stílus választása
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>Hamarosan</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disabledRow: {
    opacity: 0.6,
  },
  rowLabel: {
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});