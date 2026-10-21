import { describe, expect, it } from 'vitest';
import { canComplete, evaluateHand } from '../hands';
import { parseCards } from '../notation';

const hand = (s: string) => evaluateHand(parseCards(s));

describe('evaluateHand: every card must count', () => {
  it('three cards make trips only', () => {
    expect(hand('7S 7H 7D')).toBe('trips');
    expect(hand('7S 7H 8D')).toBeNull();
    expect(hand('7S 8S 9S')).toBeNull();
  });

  it('four cards make two pair or quads, never a hand with a kicker', () => {
    expect(hand('7S 7H KD KC')).toBe('twoPair');
    expect(hand('7S 7H 7D 7C')).toBe('quads');
    expect(hand('7S 7H 7D KC')).toBeNull();
    expect(hand('7S 7H 8D 9C')).toBeNull();
  });

  it('five cards: straights, flushes, full house and better', () => {
    expect(hand('9H 7S 8D JC TS')).toBe('straight');
    expect(hand('AS 2H 3D 4C 5S')).toBe('straight');
    expect(hand('TS JH QD KC AS')).toBe('straight');
    expect(hand('QS KH AD 2C 3S')).toBeNull();
    expect(hand('2H 7H 9H JH KH')).toBe('flush');
    expect(hand('7S 7H 7D KC KS')).toBe('fullHouse');
    expect(hand('5D 6D 7D 8D 9D')).toBe('straightFlush');
    expect(hand('AH KH QH JH TH')).toBe('royalFlush');
    expect(hand('7S 7H 7D 7C KS')).toBeNull();
    expect(hand('7S 7H KD KC 2S')).toBeNull();
  });

  it('two decks allow five of a kind', () => {
    expect(hand('7S 7H 7D 7C 7S')).toBe('fiveKind');
  });

  it('a joker fills whatever the hand needs', () => {
    expect(hand('7S JK 7D')).toBe('trips');
    expect(hand('7S 7H KD JK')).toBe('twoPair');
    expect(hand('7S 7H 7D JK')).toBe('quads');
    expect(hand('5D 6D JK 8D 9D')).toBe('straightFlush');
    expect(hand('AH KH JK JH TH')).toBe('royalFlush');
    expect(hand('7S 7H JK KC KS')).toBe('fullHouse');
    expect(hand('7S 7H 7D 7C JK')).toBe('fiveKind');
    expect(hand('JK JK JK')).toBeNull();
  });
});

describe('canComplete', () => {
  it('keeps paths that can still become a hand', () => {
    expect(canComplete(parseCards('7S 2H'), 5)).toBe(true);
    expect(canComplete(parseCards('7S 8H 9D'), 5)).toBe(true);
    expect(canComplete(parseCards('2S 9S 7S'), 5)).toBe(true);
    expect(canComplete(parseCards('7S 7H 7D KC'), 5)).toBe(true);
  });

  it('drops dead ends', () => {
    expect(canComplete(parseCards('2S 9H KD'), 5)).toBe(false);
    expect(canComplete(parseCards('7S 7H 2D 9C'), 5)).toBe(false);
    expect(canComplete(parseCards('7S 8H'), 3)).toBe(false);
  });
});
