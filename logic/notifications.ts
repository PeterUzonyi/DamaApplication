// Napi emlékeztető (push értesítés): minden nap 18:00-kor, ha a felhasználó még nem érte el
// a napi célt. HELYI értesítésekkel dolgozunk (nincs hozzá szerver): az app előre beütemez
// egy-egy értesítést a következő napokra, az operációs rendszer pedig akkor is elsüti őket,
// ha az app nincs megnyitva.
//
// Mivel egy helyi értesítés a kiküldés pillanatában már nem tud "gondolkodni", az ütemezést
// minden alkalommal újra kell számolni, amikor a helyzet változhat (app megnyitása, visszatérés
// a háttérből, feladvány megoldása, kapcsoló átállítása): ilyenkor töröljük a korábbiakat, és
// újraütemezzük őket a friss állapot alapján. Ha tehát a felhasználó ma már teljesítette a
// célt, a mai 18:00-s értesítés törlődik; a holnapi és az utána következők megmaradnak.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { computeReminderTimes } from './reminderTimes';

const ENABLED_KEY = 'dama-reminders-enabled';

// (az időpont-számítás a reminderTimes.ts-ben van, hogy külön tesztelhető legyen)

// --- Beállítás: be van-e kapcsolva az emlékeztető (eszközönként tároljuk) ---

export async function getRemindersEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(ENABLED_KEY);
    return stored === null ? true : stored === 'true'; // alapértelmezés: bekapcsolva
  } catch {
    return true;
  }
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // ha a mentés nem sikerül, a kapcsoló akkor is működik a futó alkalmazásban
  }
}

// --- Expo-s rész ---

export type ReminderStatus =
  | 'scheduled' // ütemezve
  | 'disabled' // a felhasználó kikapcsolta
  | 'denied' // az operációs rendszer nem adott engedélyt
  | 'unsupported'; // pl. böngészőben (web) nem elérhető

let handlerConfigured = false;

function configureHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  // Ha az app épp előtérben van, amikor az értesítés esedékes, akkor is jelenjen meg
  Notifications.setNotificationHandler({
    // A régebbi és az újabb expo-notifications verziók más-más mezőneveket használnak
    // (shouldShowAlert vs. shouldShowBanner/shouldShowList), ezért mindkettőt megadjuk.
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }) as Notifications.NotificationBehavior,
  });
}

async function ensurePermission(): Promise<boolean> {
  // Androidon az értesítési csatornát létre kell hozni, különben (Android 8+/13+) nem jelenik
  // meg az engedélykérő ablak, és az értesítések sem látszanak megfelelően.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Napi emlékeztető',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current)) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return isGranted(requested);
}

// Az engedély-válasz `granted` mezője (újabb) vagy `status` mezője (régebbi) jelzi az engedélyt
function isGranted(response: unknown): boolean {
  const r = response as { granted?: boolean; status?: string };
  return r.granted === true || r.status === 'granted';
}

// Minden változás után hívd meg: törli a régi ütemezést, és a friss állapot alapján újraütemez.
export async function syncReminders(params: {
  enabled: boolean;
  goalMetToday: boolean;
  now?: Date;
}): Promise<ReminderStatus> {
  if (Platform.OS === 'web') return 'unsupported';

  try {
    configureHandler();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!params.enabled) return 'disabled';

    const granted = await ensurePermission();
    if (!granted) return 'denied';

    const times = computeReminderTimes(params.now ?? new Date(), params.goalMetToday);
    for (const date of times) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Ne veszítsd el a sorozatod!',
          body: 'Ma még nem teljesítetted a napi célodat. Egy gyors feladvány még belefér!',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
    return 'scheduled';
  } catch {
    return 'unsupported';
  }
}