/* Board import (2 személyes játszható rész))
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Board from './components/Board';

export default function App() {
  return (
    <View style={styles.container}>
      <Board />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
*/

//Teszt feladvány import (Feladványok)
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PuzzleBrowser from './components/PuzzleBrowser';

export default function App() {
  return (
    <View style={styles.container}>
      <PuzzleBrowser />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});