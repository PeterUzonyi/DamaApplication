// Glicko-2 pontszámító rendszer - ugyanaz a módszer, amit a lichess (és az abból
// forkolt lidraughts) használ a feladványok pontozásához. Nyilvános, szabadon
// felhasználható algoritmus (Mark Glickman: http://www.glicko.net/glicko/glicko2.pdf).
//
// A "lichess-stílusú" rész: a klasszikus Glicko-2 batch-ekben (rating period)
// dolgozná fel a játszmákat, de mi - ahogy a lichess is - minden egyes eredmény után
// AZONNAL frissítünk, egyetlen ellenféllel, egyetlen "rating periódusként" kezelve azt
// az egy eseményt. Ez praktikusan azt jelenti, hogy minden feladvány-megoldás egy saját,
// 1 elemű periódus.

export type Rating = {
  rating: number; // a megszokott, Elo-szerű skálán (pl. 1400, 1500, 1800...)
  deviation: number; // RD - mennyire megbízható a pontszám (minél kisebb, annál stabilabb)
  volatility: number; // mennyire szokott ingadozni a játékos/feladvány teljesítménye
};

export function newRating(startingRating = 1400): Rating {
  return { rating: startingRating, deviation: 350, volatility: 0.06 };
}

const SCALE = 173.7178;
const TAU = 0.5; // rendszer-konstans: mennyire változhat a volatilitás menetenként
const EPSILON = 0.000001;
const MIN_DEVIATION = 30; // ne engedjük, hogy a bizonytalanság 0-hoz tartson

function toInternalScale(r: Rating): { mu: number; phi: number } {
  return { mu: (r.rating - 1500) / SCALE, phi: r.deviation / SCALE };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function expectedScore(mu: number, muOpponent: number, phiOpponent: number): number {
  return 1 / (1 + Math.exp(-g(phiOpponent) * (mu - muOpponent)));
}

// Az új volatilitás megkeresése az "Illinois" gyökkereső algoritmussal
// (ez a hivatalos Glicko-2 leírás javasolt módszere).
function newVolatility(phi: number, v: number, delta: number, sigma: number): number {
  const a = Math.log(sigma * sigma);

  function f(x: number): number {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * (phi * phi + v + ex) * (phi * phi + v + ex);
    return num / den - (x - a) / (TAU * TAU);
  }

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

// Egyetlen játékos pontszámát frissíti EGYETLEN eredmény alapján (egy ellenféllel szemben).
// score: 1 = győzelem, 0 = vereség, 0.5 = döntetlen (nálunk ez nem fordul elő, de a
// teljesség kedvéért támogatja a képlet).
export function updateRating(player: Rating, opponent: Rating, score: 0 | 0.5 | 1): Rating {
  const { mu, phi } = toInternalScale(player);
  const opp = toInternalScale(opponent);

  const E = expectedScore(mu, opp.mu, opp.phi);
  const gPhiOpp = g(opp.phi);
  const v = 1 / (gPhiOpp * gPhiOpp * E * (1 - E));
  const delta = v * gPhiOpp * (score - E);

  const sigmaPrime = newVolatility(phi, v, delta, player.volatility);
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * gPhiOpp * (score - E);

  const newDeviation = Math.max(phiPrime * SCALE, MIN_DEVIATION);

  return {
    rating: muPrime * SCALE + 1500,
    deviation: newDeviation,
    volatility: sigmaPrime,
  };
}

// Egy "játszma" mindkét oldalát egyszerre frissíti - pontosan úgy, ahogy a
// lidraughts is teszi: a feladvány pontszáma is változik minden kísérlet után.
export function playGame(
  a: Rating,
  b: Rating,
  scoreForA: 0 | 1
): { a: Rating; b: Rating } {
  const scoreForB = (1 - scoreForA) as 0 | 1;
  return {
    a: updateRating(a, b, scoreForA),
    b: updateRating(b, a, scoreForB),
  };
}