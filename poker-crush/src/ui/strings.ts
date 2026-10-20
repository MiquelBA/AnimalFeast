// Every text on screen, in Catalan.
import type { BlastKind, HandType } from '../engine/types';

const n = (v: number) => v.toLocaleString('ca');

export const HAND_NAMES: Readonly<Record<HandType, string>> = {
  trips: 'Trio',
  twoPair: 'Doble parella',
  straight: 'Escala',
  flush: 'Color',
  fullHouse: 'Full',
  quads: 'Pòquer',
  straightFlush: 'Escala de color',
  fiveKind: 'Repòquer',
  royalFlush: 'Escala reial',
};

/** One-line description for the help sheet. */
export const HAND_RULES: Readonly<Record<HandType, string>> = {
  trips: '3 cartes del mateix número',
  twoPair: '2 parelles, 4 cartes',
  straight: '5 números seguits, en qualsevol ordre',
  flush: '5 cartes del mateix pal',
  fullHouse: 'Un trio i una parella',
  quads: '4 cartes del mateix número',
  straightFlush: 'Escala del mateix pal',
  fiveKind: '5 cartes del mateix número',
  royalFlush: '10, J, Q, K i A del mateix pal',
};

/** Example of each hand for the help sheet (notation). */
export const HAND_EXAMPLES: Readonly<Record<HandType, string>> = {
  trips: '7S 7H 7D',
  twoPair: '9C 9D 4H 4S',
  straight: '6H 7C 8D 9S TH',
  flush: '2D 6D 9D JD KD',
  fullHouse: 'QS QH QC 5D 5H',
  quads: 'AS AH AD AC',
  straightFlush: '5C 6C 7C 8C 9C',
  fiveKind: 'KS KH KD KC KS',
  royalFlush: 'TH JH QH KH AH',
};

export const BLAST_RULES: Readonly<Record<BlastKind, string>> = {
  cross: 'Rebenta la fila i la columna',
  suit: 'Rebenta les cartes del pal que la toquen',
  rank: 'Rebenta totes les cartes d’aquell número',
  board: 'Rebenta tot el tauler',
};

export const STRINGS = {
  title: 'Poker Crush',
  tagline: 'Traça mans de pòquer amb el dit',
  play: 'Juga',
  playAgain: 'Torna a jugar',
  daily: 'Repte del dia',
  dailyPlayed: 'Repte fet',
  dailyPractice: 'Practica el repte',
  dailyInfo: 'El mateix tauler per a tothom. Només compta el primer intent.',
  streak: (d: number) => (d === 1 ? '1 dia seguit' : `${d} dies seguits`),
  nextDaily: (h: number, m: number) => `Nou repte d’aquí a ${h} h ${m} min`,
  howTo: 'Com es juga',
  score: 'Punts',
  best: 'Rècord',
  time: 'Temps',
  pause: 'Pausa',
  paused: 'En pausa',
  resume: 'Continua',
  quit: 'Surt',
  go: 'Som-hi!',
  soundOn: 'So activat',
  soundOff: 'So desactivat',
  close: 'Tanca',
  notAHand: 'No és cap mà',
  keepGoing: 'Continua…',
  points: (p: number) => `+${n(p)}`,
  timeBonus: (s: number) => `+${s} s`,
  times: (m: number) => `×${String(m).replace('.', ',')}`,
  golden: (m: number) => `DAURADA ×${m}`,
  shuffle: 'Barregem!',
  comboHot: 'Combo!',
  comboFire: 'En ratxa!',
  comboCrush: 'CRUSH!',
  gameOver: 'Temps!',
  newBest: 'Nou rècord!',
  bestMove: 'Millor jugada',
  bestHand: 'Millor mà',
  hands: 'Mans',
  noHands: 'Cap mà',
  copyResult: 'Copia el resultat',
  copied: 'Copiat!',
  shareText: (score: number, best: string, daily: string | null) =>
    `${daily ? `Poker Crush · repte del ${daily}` : 'Poker Crush'}: ${n(score)} punts${best ? ` · millor mà: ${best}` : ''}`,
  help: {
    title: 'Com es juga',
    trace: 'Llisca el dit per cartes veïnes, també en diagonal, i fes una mà de pòquer de 3 a 5 cartes.',
    all: 'Totes les cartes del traç han de formar part de la mà. L’ordre no importa.',
    time: 'Tens 2 minuts. Les mans grans donen temps extra i mans seguides fan combo.',
    joker: 'El comodí fa de la carta que et falti.',
    golden: 'Una carta daurada duplica els punts de la mà.',
    handsTitle: 'Les mans, de menys a més',
  },
} as const;
