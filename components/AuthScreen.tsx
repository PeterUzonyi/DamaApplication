import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { authErrorMessage, useAuth } from '../logic/authContext';
import { useTheme } from '../logic/themeContext';
import { initializeUserData } from '../logic/cloudProgress';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dailyGoal, setDailyGoal] = useState('1');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email.trim() || !password) {
      setError('Add meg az email címet és a jelszót.');
      return;
    }
    if (mode === 'signUp' && !username.trim()) {
      setError('Add meg a felhasználóneved.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        const goal = Math.max(1, Math.round(Number(dailyGoal) || 1));
        const uid = await signUp(email.trim(), password, username.trim());
        await initializeUserData(uid, goal);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Dáma</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {mode === 'signIn' ? 'Jelentkezz be a folytatáshoz' : 'Hozz létre egy fiókot'}
      </Text>

      {mode === 'signUp' && (
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Felhasználónév"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
      )}
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Email cím"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Jelszó"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'signUp' && (
        <View style={styles.goalRow}>
          <Text style={[styles.goalLabel, { color: colors.text }]}>
            Napi cél (hány feladvány/nap a streak-hez)
          </Text>
          <TextInput
            style={[styles.goalInput, { borderColor: colors.border, color: colors.text }]}
            keyboardType="number-pad"
            value={dailyGoal}
            onChangeText={setDailyGoal}
          />
        </View>
      )}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.accent }]}
        onPress={handleSubmit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>
            {mode === 'signIn' ? 'Bejelentkezés' : 'Regisztráció'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
        <Text style={[styles.switchText, { color: colors.accent }]}>
          {mode === 'signIn'
            ? 'Még nincs fiókod? Regisztrálj itt'
            : 'Már van fiókod? Jelentkezz be'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  goalLabel: {
    fontSize: 13,
    flex: 1,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    width: 60,
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  switchText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
});