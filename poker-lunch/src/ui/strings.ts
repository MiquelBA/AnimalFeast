// Every text on screen, in Catalan.
import type { BlastKind, HandType, PowerKind } from '../engine/types';

const n = (v: number) => v.toLocaleString('ca');

/** 1r, 2n, 3r, 4t, 5è… */
function ordinal(v: number): string {
  return `${v}${({ 1: 'r', 2: 'n', 3: 'r', 4: 't' } as Record<number, string>)[v] ?? 'è'}`;
}

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
  row: 'Rebenta la fila',
  storm: 'Rebenta totes les cartes del pal',
};

/** The streak power's name, shown big when it fires. */
export const POWER_NAMES: Readonly<Record<PowerKind, string>> = {
  joker: 'Comodí!',
  time: '+3 segons!',
  row: 'Fila fora!',
  storm: 'Tempesta de color!',
  gild: 'Pluja d’or!',
  double: 'Punts ×2!',
};

/** What the third hand of a type does, for the help sheet. */
export const POWER_RULES: Readonly<Record<PowerKind, string>> = {
  joker: 'cau un comodí',
  time: '+3 segons',
  row: 'rebenta la fila on acaba',
  storm: 'rebenta totes les cartes del pal',
  gild: 'les cartes del número del trio es tornen daurades',
  double: 'punts dobles',
};

export const STRINGS = {
  title: 'Poker Lunch',
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
  comboBoom: 'BOOM!',
  gameOver: 'Temps!',
  newBest: 'Nou rècord!',
  bestMove: 'Millor jugada',
  bestHand: 'Millor mà',
  hands: 'Mans',
  noHands: 'Cap mà',
  copyResult: 'Copia el resultat',
  copied: 'Copiat!',
  shareText: (score: number, best: string, daily: string | null) =>
    `${daily ? `Poker Lunch · repte del ${daily}` : 'Poker Lunch'}: ${n(score)} punts${best ? ` · millor mà: ${best}` : ''}`,
  leaderboard: {
    title: 'Classificació',
    open: 'Classificació',
    tabGeneral: 'General',
    tabToday: 'Repte d’avui',
    askName: 'Posa el teu nom per sortir a la classificació',
    changeName: 'Canvia el teu nom',
    namePlaceholder: 'El teu nom',
    save: 'Desa',
    playingAs: 'Jugues com a',
    edit: 'Canvia',
    loading: 'Carregant…',
    offline: 'No s’ha pogut connectar.',
    retry: 'Torna-ho a provar',
    empty: 'Encara no hi ha ningú. Sigues el primer!',
    badName: 'Aquest nom no es pot fer servir. Prova amb un altre.',
    refused: 'Aquesta puntuació no s’ha pogut afegir a la classificació.',
    rank: (p: number) => `Aquesta partida queda en la posició ${p}`,
    dailyRank: (p: number, total: number) => `Ets el ${ordinal(p)} de ${total}`,
  },
  help: {
    title: 'Com es juga',
    trace: 'Llisca el dit per cartes veïnes, també en diagonal, i fes una mà de pòquer de 3 a 5 cartes.',
    all: 'Totes les cartes del traç han de formar part de la mà. L’ordre no importa.',
    time: 'Tens 2 minuts. Les mans grans donen temps extra i mans seguides fan combo.',
    joker: 'El comodí fa de la carta que et falti.',
    golden: 'Una carta daurada duplica els punts de la mà.',
    streak: 'Fes 3 vegades la mateixa mà i desfermes el seu poder. Els puntets blaus al costat de cada mà diuen quantes en portes.',
    power: '3a vegada',
    handsTitle: 'Les mans, de menys a més',
  },
} as const;
