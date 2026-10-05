import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../logic/themeContext';

export default function SettingsScreen() {
  const { mode, colors, toggleTheme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Megjelenés</Text>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Sötét mód</Text>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} />
      </View>

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