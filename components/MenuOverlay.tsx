import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { useTheme } from '../logic/themeContext';
import ProfileScreen from './ProfileScreen';
import SettingsScreen from './SettingsScreen';
import { Level, VariantProgress } from '../logic/progress';
import { Rating } from '../logic/glicko2';
import { StreakState } from '../logic/streak';
import { ReminderStatus } from '../logic/notifications';

type SubView = 'list' | 'profile' | 'settings';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
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
  remindersEnabled: boolean;
  reminderStatus: ReminderStatus | null;
  onToggleReminders: (enabled: boolean) => void;
};

export default function MenuOverlay(props: Props) {
  const { visible, onClose, onSignOut } = props;
  const { colors } = useTheme();
  const [sub, setSub] = useState<SubView>('list');

  function close() {
    setSub('list');
    onClose();
  }

  const title = sub === 'list' ? 'Menü' : sub === 'profile' ? 'Profil' : 'Beállítások';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.panel, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {sub !== 'list' ? (
            <Pressable onPress={() => setSub('list')} hitSlop={10} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: colors.accent }]}>‹ Vissza</Text>
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={close} hitSlop={10} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.textMuted, textAlign: 'right' }]}>
              ✕
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {sub === 'list' && (
            <View>
              <Pressable
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => setSub('profile')}
              >
                <Text style={[styles.menuItemText, { color: colors.text }]}>👤 Profil</Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => setSub('settings')}
              >
                <Text style={[styles.menuItemText, { color: colors.text }]}>⚙️ Beállítások</Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  close();
                  onSignOut();
                }}
              >
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Kijelentkezés</Text>
              </Pressable>
            </View>
          )}

          {sub === 'profile' && (
            <ProfileScreen
              uid={props.uid}
              username={props.username}
              email={props.email}
              russianLevels={props.russianLevels}
              internationalLevels={props.internationalLevels}
              russianProgress={props.russianProgress}
              internationalProgress={props.internationalProgress}
              russianRating={props.russianRating}
              internationalRating={props.internationalRating}
              streak={props.streak}
              onChangeDailyGoal={props.onChangeDailyGoal}
            />
          )}

          {sub === 'settings' && (
            <SettingsScreen
              remindersEnabled={props.remindersEnabled}
              reminderStatus={props.reminderStatus}
              onToggleReminders={props.onToggleReminders}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const PANEL_WIDTH = 320;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    maxWidth: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 16,
  },
});