import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  border: string;
  danger: string;
};

const LIGHT_COLORS: ThemeColors = {
  background: '#ffffff',
  surface: '#f5f5f0',
  text: '#222222',
  textMuted: '#666666',
  accent: '#769656',
  accentText: '#ffffff',
  border: '#dddddd',
  danger: '#b00020',
};

const DARK_COLORS: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#f0f0f0',
  textMuted: '#aaaaaa',
  accent: '#8fbc6f',
  accentText: '#121212',
  border: '#333333',
  danger: '#ff6b6b',
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'dama-theme-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'dark' || stored === 'light') setMode(stored);
    });
  }, []);

  function setTheme(newMode: ThemeMode) {
    setMode(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }

  function toggleTheme() {
    setTheme(mode === 'light' ? 'dark' : 'light');
  }

  const colors = mode === 'light' ? LIGHT_COLORS : DARK_COLORS;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme csak ThemeProvider-en belül használható');
  return ctx;
}
