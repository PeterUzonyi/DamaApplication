// Firebase inicializálása. A konkrét projekt-kulcsokat a Firebase konzolból kell
// bemásolnod (Project settings > General > Your apps > SDK setup and configuration).
//
// FONTOS: ezek az értékek NEM titkosak (kliens-oldali azonosítók), simán bekerülhetnek
// a repóba - a tényleges védelmet a Firestore biztonsági szabályok adják (lásd lentebb).
 
import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - a `getReactNativePersistence` FUTÁSIDŐBEN létezik natív platformon,
// csak a Firebase SDK TypeScript-definíciói hiányosak ehhez a React Native-specifikus
// exporthoz - ismert, nyitott SDK-hiba: https://github.com/firebase/firebase-js-sdk/issues/9316
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDXgMvVuPH5Hb0DL6L1u3fimtrusxrBgKE",
  authDomain: "dama-application.firebaseapp.com",
  projectId: "dama-application",
  storageBucket: "dama-application.firebasestorage.app",
  messagingSenderId: "859976359440",
  appId: "1:859976359440:web:427597b69e938d378e3495",
  measurementId: "G-3NBBB160JD"
};

// Ha a Fast Refresh (fejlesztés közbeni élő újratöltés) miatt ez a fájl többször is
// lefutna, ne inicializáljuk kétszer az appot.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
 
// FONTOS: a `getReactNativePersistence` csak NATÍV platformon (telefon/emulátor) létezik
// a Firebase SDK-ban - böngészőben (Expo web) nincs ilyen export, és a hívása hibát dob.
// Ezért platform szerint kell elágaznunk: webre a sima `getAuth` (ami a böngésző saját,
// beépített tárolóját használja az állapot megtartásához), natívra az AsyncStorage-es verzió.
let cachedAuth: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    if (Platform.OS === 'web') {
      cachedAuth = getAuth(firebaseApp);
    } else {
      cachedAuth = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  }
  return cachedAuth;
}
 
export const db = getFirestore(firebaseApp);