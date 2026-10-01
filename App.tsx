import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './logic/authContext';
import AuthScreen from './components/AuthScreen';
import PuzzleBrowser from './components/PuzzleBrowser';

function Root() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#769656" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? <PuzzleBrowser /> : <AuthScreen />}
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});