import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  initializing: boolean; // igaz, amíg még nem tudjuk, be van-e jelentkezve valaki
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async function signOut() {
    await firebaseSignOut(getFirebaseAuth());
  }

  return (
    <AuthContext.Provider value={{ user, initializing, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth csak AuthProvider-en belül használható');
  return ctx;
}

// Firebase hibakódokból (pl. "auth/wrong-password") magyar, felhasználóbarát üzenet
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ezzel az email címmel már van regisztrált fiók.';
    case 'auth/invalid-email':
      return 'Érvénytelen email cím.';
    case 'auth/weak-password':
      return 'A jelszó túl gyenge (legalább 6 karakter kell).';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Hibás email cím vagy jelszó.';
    case 'auth/too-many-requests':
      return 'Túl sok próbálkozás, kérlek próbáld újra később.';
    default:
      return 'Váratlan hiba történt. Próbáld újra.';
  }
}