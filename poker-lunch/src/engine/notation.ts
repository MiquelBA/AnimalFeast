// Text notation for cards and boards (tests, debug).
// A card is its rank (2-9, T, J, Q, K, A) and suit (S spades, H hearts, D diamonds, C clubs): "TH" is
// the ten of hearts. "JK" is a joker. A trailing "*" marks a golden card. Boards: one line per row,
// top first, cards separated by spaces; "." is an empty cell.
import type { Board, Card, CardSpec, Cell, Suit } from './types';

const RANKS = '23456789TJQKA';
const SUITS = 'SHDC';

export function parseCard(text: string): CardSpec {
  let t = text.trim().toUpperCase();
  const golden = t.endsWith('*');
  if (golden) t = t.slice(0, -1);
  if (t === 'JK') return { rank: 0, suit: 0, joker: true };
  if (t.startsWith('10')) t = `T${t.slice(2)}`;
  const rank = RANKS.indexOf(t[0]) + 2;
  const suit = SUITS.indexOf(t[1]);
  if (t.length !== 2 || rank < 2 || suit < 0) throw new Error(`Bad card: ${text}`);
  return golden ? { rank, suit: suit as Suit, golden } : { rank, suit: suit as Suit };
}

export function formatCard(c: CardSpec): string {
  if (c.joker) return 'JK';
  return `${RANKS[c.rank - 2]}${SUITS[c.suit]}${c.golden ? '*' : ''}`;
}

export function parseCards(text: string): CardSpec[] {
  return text.trim().split(/\s+/).filter(Boolean).map(parseCard);
}

/** Cards get ids 1, 2, 3… in reading order. */
export function parseBoard(text: string): Board {
  let id = 1;
  return text
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/).map((t): Cell => (t === '.' ? null : ({ ...parseCard(t), id: id++ } as Card))));
}

export function formatBoard(board: Board): string {
  return board.map((row) => row.map((c) => (c ? formatCard(c) : '.')).join(' ')).join('\n');
}
