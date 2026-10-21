// Poker hand evaluation (REGLES.md §2). Every card of the path must be part of the hand: the
// path's length already says which hands it can be. Order doesn't matter. Jokers fill any gap.
import { HAND_TYPES, type CardSpec, type HandType, type Rank } from './types';

export const ACE = 14;

/** The best hand these cards make using all of them, or null. */
export function evaluateHand(cards: readonly CardSpec[]): HandType | null {
  const real = cards.filter((c) => !c.joker);
  if (real.length === 0) return null;
  const n = cards.length;
  const counts = rankCounts(real);
  const distinct = counts.size;
  const maxCount = Math.max(...counts.values());
  if (n === 3) return distinct === 1 ? 'trips' : null;
  if (n === 4) {
    if (distinct === 1) return 'quads';
    return distinct <= 2 && maxCount <= 2 ? 'twoPair' : null;
  }
  if (n !== 5) return null;
  const flush = sameSuit(real);
  const window = straightWindow(real);
  if (flush && window === ACE) return 'royalFlush';
  if (distinct === 1) return 'fiveKind';
  if (flush && window !== null) return 'straightFlush';
  if (distinct <= 2 && maxCount <= 3) return 'fullHouse';
  if (flush) return 'flush';
  if (window !== null) return 'straight';
  return null;
}

/** Could this partial path, with more cards (up to `maxLength` in all), still become a hand? */
export function canComplete(cards: readonly CardSpec[], maxLength: number): boolean {
  const k = cards.length;
  if (k > maxLength) return false;
  const real = cards.filter((c) => !c.joker);
  if (real.length === 0) return true;
  const counts = rankCounts(real);
  const distinct = counts.size;
  const maxCount = Math.max(...counts.values());
  // One rank: trips, quads or five of a kind.
  if (distinct === 1) return true;
  // Two ranks: two pair (4 cards) or a full house (5).
  if (distinct === 2 && maxCount <= 2 && k <= 4 && maxLength >= 4) return true;
  if (maxLength < 5) return false;
  if (distinct === 2 && maxCount <= 3) return true;
  // Straights and flushes.
  return sameSuit(real) || straightWindow(real) !== null;
}

/**
 * The highest card of a five-card straight that holds all these ranks (each once), or null.
 * The ace plays high (10-J-Q-K-A) or low (A-2-3-4-5).
 */
export function straightWindow(real: readonly CardSpec[]): Rank | null {
  const ranks = real.map((c) => c.rank);
  if (new Set(ranks).size !== ranks.length) return null;
  for (let high = ACE; high >= 5; high--) {
    const low = high - 4;
    const fits = ranks.every((r) => (r >= low && r <= high) || (r === ACE && low === 1));
    if (fits) return high;
  }
  return null;
}

function sameSuit(real: readonly CardSpec[]): boolean {
  return real.every((c) => c.suit === real[0].suit);
}

function rankCounts(real: readonly CardSpec[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const c of real) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  return counts;
}

/** 0 for the weakest hand. */
export function handStrength(hand: HandType): number {
  return HAND_TYPES.indexOf(hand);
}

/** For a straight flush / five of a kind blast: the suit or rank the hand is built on. */
export function handSuit(cards: readonly CardSpec[]): number | null {
  const real = cards.find((c) => !c.joker);
  return real ? real.suit : null;
}

export function handRank(cards: readonly CardSpec[]): Rank | null {
  const real = cards.find((c) => !c.joker);
  return real ? real.rank : null;
}

/** The rank most of a hand's real cards share (a full house's three), higher on a tie. */
export function handMainRank(cards: readonly CardSpec[]): Rank | null {
  let best: Rank | null = null;
  let bestCount = 0;
  for (const [rank, count] of rankCounts(cards.filter((c) => !c.joker))) {
    if (count > bestCount || (count === bestCount && best !== null && rank > best)) [best, bestCount] = [rank, count];
  }
  return best;
}
