// Napi gyakorlási sorozat (streak): hány egymást követő napon oldott meg a felhasználó
// legalább `dailyGoal` darab feladványt. A "mai nap" és a dátum-matek mindenhol a
// hívó félnek kell átadnia (YYYY-MM-DD string) - ez tiszta, tesztelhető logika,
// nem nyúl az órához/naptárhoz, így mobilon és teszt közben is ugyanúgy viselkedik.

export type StreakState = {
  dailyGoal: number; // hány sikeres megoldás kell egy naphoz (alapértelmezett: 1)
  current: number; // jelenlegi egymást követő napok száma
  longest: number; // valaha elért leghosszabb sorozat
  solvedToday: number; // ma hány feladványt oldott meg sikeresen
  solvedTodayDate: string | null; // melyik naphoz tartozik a `solvedToday` (YYYY-MM-DD)
  lastGoalMetDate: string | null; // utoljára mikor érte el a napi célt (YYYY-MM-DD)
};

export function newStreak(dailyGoal = 1): StreakState {
  return {
    dailyGoal,
    current: 0,
    longest: 0,
    solvedToday: 0,
    solvedTodayDate: null,
    lastGoalMetDate: null,
  };
}

export function todayString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isYesterday(lastDate: string, today: string): boolean {
  const last = new Date(lastDate + 'T00:00:00');
  const yesterday = new Date(today + 'T00:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  return todayString(last) === todayString(yesterday);
}

// Hívd meg minden sikeres feladvány-megoldás után. `today` a hívó fél adja át
// (pl. `todayString()`), hogy a függvény tisztán tesztelhető maradjon.
export function recordSolve(streak: StreakState, today: string): StreakState {
  let solvedToday = streak.solvedTodayDate === today ? streak.solvedToday + 1 : 1;
  let current = streak.current;
  let longest = streak.longest;
  let lastGoalMetDate = streak.lastGoalMetDate;

  const justReachedGoal = solvedToday === streak.dailyGoal && lastGoalMetDate !== today;

  if (justReachedGoal) {
    current = lastGoalMetDate && isYesterday(lastGoalMetDate, today) ? current + 1 : 1;
    lastGoalMetDate = today;
    longest = Math.max(longest, current);
  }

  return {
    ...streak,
    solvedToday,
    solvedTodayDate: today,
    current,
    longest,
    lastGoalMetDate,
  };
}

// Ha a felhasználó ma (vagy tegnap óta folyamatosan) nem érte el a célt, a sorozat
// "megszakadt" - ezt megjelenítéskor kell ellenőrizni (nem írjuk vissza automatikusan,
// amíg nincs új sikeres megoldás, hogy ne veszítsünk adatot feleslegesen).
export function isStreakActiveToday(streak: StreakState, today: string): boolean {
  if (!streak.lastGoalMetDate) return false;
  return streak.lastGoalMetDate === today || isYesterday(streak.lastGoalMetDate, today);
}

// Megjelenítéshez: 0, ha a sorozat valójában már megszakadt (de ezt még nem írtuk vissza)
export function displayedStreak(streak: StreakState, today: string): number {
  return isStreakActiveToday(streak, today) ? streak.current : 0;
}

export function withDailyGoal(streak: StreakState, dailyGoal: number): StreakState {
  return { ...streak, dailyGoal: Math.max(1, Math.round(dailyGoal)) };
}