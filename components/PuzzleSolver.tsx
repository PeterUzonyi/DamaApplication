import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PuzzleBoard from './PuzzleBoard';
import { Puzzle, RuleSet, validatePuzzle } from '../logic/engine';
import {
  HINT_MESSAGE,
  SessionState,
  createSession,
  handleClick,
  parseSolution,
  playComputerMove,
} from '../logic/puzzleSession';

type Props = {
  puzzle: Puzzle;
  rules: RuleSet;
  onNext: () => void;
  // hadMistake: igaz, ha az aktuális (utolsó "Újrakezdés" óta tartó) próbálkozás alatt
  // volt legalább egy rossz lépés - ez dönti el a Glicko-2 pontszámítást (győzelem/vereség).
  onSolved?: (hadMistake: boolean) => void;
};

const WRONG_MOVE_MESSAGE = 'Nem ez a megoldás lépése. Próbáld újra!';

// FONTOS: a szülő `key`-jel hozza létre ezt a komponenst (variáns + feladvány azonosító),
// ezért feladványváltáskor vagy módváltáskor mindig tiszta, "még el sem kezdett" állapotból indul.
export default function PuzzleSolver({ puzzle, rules, onNext, onSolved }: Props) {
  const solution = useMemo(() => parseSolution(puzzle, rules), [puzzle, rules]);
  const validationError = useMemo(() => validatePuzzle(puzzle, rules), [puzzle, rules]);
  const ctx = useMemo(() => ({ solution: solution ?? [], rules }), [solution, rules]);

  const [session, setSession] = useState<SessionState>(() => createSession(puzzle, solution));
  const [hadMistake, setHadMistake] = useState(false);

  // Amikor a fekete jön, egy kis szünet után lépi meg a megoldás szerinti választ
  useEffect(() => {
    if (session.phase !== 'computer') return;
    const timer = setTimeout(() => {
      setSession(s => playComputerMove(s, ctx));
    }, 600);
    return () => clearTimeout(timer);
  }, [session.phase, session.moveIndex, ctx]);

  // Rossz lépés felismerése - ez számít "hibának" a pontszámításnál
  useEffect(() => {
    if (session.message === WRONG_MOVE_MESSAGE) {
      setHadMistake(true);
    }
  }, [session.message]);

  // A megoldás pillanatában (csak egyszer, feladványonként) jelezzük a szülőnek
  useEffect(() => {
    if (session.phase === 'solved') {
      onSolved?.(hadMistake);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase]);

  function handleCellPress(row: number, col: number) {
    setSession(s => handleClick(s, { row, col }, ctx));
  }

  function handleReset() {
    setSession(createSession(puzzle, solution));
    setHadMistake(false);
  }

  const isSolved = session.phase === 'solved';
  const isError = session.phase === 'error';

  return (
    <View style={styles.container}>
      {validationError && (
        <Text style={styles.warning}>
          Hibás feladvány ({puzzle.id}): {validationError}
        </Text>
      )}

      <PuzzleBoard
        board={session.board}
        boardSize={rules.boardSize}
        selected={session.selected}
        capturedPositions={session.capturedPositions}
        onCellPress={handleCellPress}
      />

      <Text
        style={[
          styles.message,
          isSolved && styles.messageSolved,
          isError && styles.messageError,
        ]}
      >
        {session.message || HINT_MESSAGE}
      </Text>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleReset}>
          <Text style={styles.secondaryButtonText}>Újrakezdés</Text>
        </Pressable>
        <Pressable
          style={[styles.button, isSolved ? styles.primaryButton : styles.secondaryButton]}
          onPress={onNext}
        >
          <Text style={isSolved ? styles.primaryButtonText : styles.secondaryButtonText}>
            Következő
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  warning: {
    color: '#b00020',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 340,
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
    minHeight: 22,
  },
  messageSolved: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  messageError: {
    color: '#b00020',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#769656',
  },
  primaryButton: {
    backgroundColor: '#769656',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#333',
  },
});