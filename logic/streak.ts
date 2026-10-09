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

// Ha a mai megoldások száma elérte a napi célt, és a mai napot még nem írtuk jóvá,
// akkor a sorozat nő (vagy újraindul 1-ről, ha tegnap nem volt jóváírva). Egy napot
// legfeljebb egyszer írunk jóvá (lastGoalMetDate őrzi). Az `>=` összehasonlítás miatt
// akkor is működik, ha a napi célt menet közben csökkentették.
function creditTodayIfGoalMet(streak: StreakState, today: string): StreakState {
  const solved = streak.solvedTodayDate === today ? streak.solvedToday : 0;
  if (solved < streak.dailyGoal || streak.lastGoalMetDate === today) return streak;

  const current =
    streak.lastGoalMetDate && isYesterday(streak.lastGoalMetDate, today) ? streak.current + 1 : 1;
  return {
    ...streak,
    current,
    longest: Math.max(streak.longest, current),
    lastGoalMetDate: today,
  };
}

// Hívd meg minden sikeres feladvány-megoldás után. `today` a hívó fél adja át
// (pl. `todayString()`), hogy a függvény tisztán tesztelhető maradjon.
export function recordSolve(streak: StreakState, today: string): StreakState {
  const solvedToday = streak.solvedTodayDate === today ? streak.solvedToday + 1 : 1;
  return creditTodayIfGoalMet({ ...streak, solvedToday, solvedTodayDate: today }, today);
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

// Igaz, ha a `recordSolve` hívás EREDMÉNYEKÉNT érte el éppen most a napi célt
// (tehát előtte még nem, utána már igen) - erre épül az ünneplő képernyő.
export function justReachedGoalToday(before: StreakState, after: StreakState, today: string): boolean {
  return before.lastGoalMetDate !== today && after.lastGoalMetDate === today;
}

// A napi cél módosítása. Ha megadod a mai napot, és a mai megoldások már elérik az ÚJ (alacsonyabb)
// célt, a mai napot azonnal jóváírja - különben a sorozat védelme a következő megoldásig késne.
export function withDailyGoal(streak: StreakState, dailyGoal: number, today?: string): StreakState {
  const updated = { ...streak, dailyGoal: Math.max(1, Math.round(dailyGoal)) };
  return today ? creditTodayIfGoalMet(updated, today) : updated;
}

// Hány feladványt oldott meg a felhasználó MA sikeresen? (A tárolt `solvedToday` csak akkor
// vonatkozik a mai napra, ha a hozzá tartozó dátum egyezik; különben új nap van, tehát 0.)
export function solvedTodayCount(streak: StreakState, today: string): number {
  return streak.solvedTodayDate === today ? streak.solvedToday : 0;
}

// A mai nap beleszámít-e már a sorozatba? (Ez védi ténylegesen a sorozatot - ezt mutatjuk a
// profilon, és ez dönt arról is, hogy kell-e még emlékeztető.)
export function isGoalMetToday(streak: StreakState, today: string): boolean {
  return streak.lastGoalMetDate === today;
}

export type TodayStatus = {
  solved: number; // ma megoldott feladványok
  goal: number; // napi cél
  remaining: number; // hány feladvány hiányzik még a célig (0, ha kész)
  goalMet: boolean; // a mai nap beleszámít a sorozatba
  streakAlive: boolean; // van élő sorozat (tegnap vagy ma teljesítette a célt)
  atRisk: boolean; // van élő sorozat, de a mai cél még nincs meg -> veszélyben
};

export function todayStatus(streak: StreakState, today: string): TodayStatus {
  const solved = solvedTodayCount(streak, today);
  const goalMet = isGoalMetToday(streak, today);
  const streakAlive = streak.current > 0 && isStreakActiveToday(streak, today);
  return {
    solved,
    goal: streak.dailyGoal,
    remaining: goalMet ? 0 : Math.max(0, streak.dailyGoal - solved),
    goalMet,
    streakAlive,
    atRisk: streakAlive && !goalMet,
  };
}