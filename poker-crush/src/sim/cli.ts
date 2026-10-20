// Simulator: how often each hand is on the board and what a greedy player makes.
// npm run sim -- [games] [movesPerGame]
import { makeConfig } from '../engine/config';
import { applyMove, findHands, handPoints, newGame, pathCards } from '../engine/game';
import { HAND_TYPES, type HandType } from '../engine/types';

const games = Number(process.argv[2] ?? 40);
const movesPerGame = Number(process.argv[3] ?? 40);
const config = makeConfig({ mode: 'moves', maxMoves: movesPerGame });

const onBoard = Object.fromEntries(HAND_TYPES.map((h) => [h, 0])) as Record<HandType, number>;
const made = { ...onBoard };
let boards = 0, totalHands = 0, minHands = Infinity, score = 0, shuffles = 0;

for (let g = 0; g < games; g++) {
  let s = newGame({ seed: 1000 + g, config });
  while (!s.gameOver) {
    const hands = findHands(s.board, config);
    boards++;
    totalHands += hands.length;
    minHands = Math.min(minHands, hands.length);
    for (const h of HAND_TYPES) if (hands.some((x) => x.hand === h)) onBoard[h]++;
    // Greedy: the hand worth most right now (blasts not counted).
    let best = hands[0];
    let bestPts = -1;
    for (const h of hands) {
      const pts = handPoints(h.hand, pathCards(s.board, h.path)!, config);
      if (pts > bestPts) { bestPts = pts; best = h; }
    }
    made[best.hand]++;
    s = applyMove(s, { path: best.path }).state;
  }
  score += s.score;
  shuffles += s.shuffles;
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`${games} games × ${movesPerGame} moves, greedy bot`);
console.log(`hands on the board: mean ${(totalHands / boards).toFixed(0)}, min ${minHands}; shuffles per game ${(shuffles / games).toFixed(2)}`);
console.log(`score per game: ${Math.round(score / games)}`);
console.log('hand            on board   made by greedy (per game)');
for (const h of HAND_TYPES) console.log(`${h.padEnd(15)} ${pct(onBoard[h], boards).padStart(8)}   ${(made[h] / games).toFixed(2)}`);
