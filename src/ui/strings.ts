// All user-facing text (Catalan).
export const STRINGS = {
  title: 'ANIMAL FEAST',
  score: 'Punts',
  best: 'Rècord',
  help: 'Ajuda',
  soundOn: 'Activa el so',
  soundOff: 'Silencia el so',
  pause: 'Pausa',
  resume: 'Continua',
  paused: 'En pausa',
  pausedHint: 'Toca per continuar quan vulguis.',
  tapToStart: 'Traça una cadena per començar',
  helpTitle: 'Com es juga',
  helpChain: 'La cadena alimentària',
  /** Help rules for the current rules: chain lengths, length multipliers and who gathers energy. */
  helpRules: (o: { lengths: readonly number[]; multipliers: readonly [number, number][]; chargers: readonly string[]; top: string; frenzyBonusS: number; cross: boolean; lines: boolean; waves: readonly number[] }) => [
    o.cross
      ? `Llisca el dit per sobre de ${listOr(o.lengths)} animals seguits de la cadena, en creu (amunt, avall, als costats) i girant, però no en diagonal.`
      : `Llisca el dit per sobre de ${listOr(o.lengths)} animals seguits de la cadena, en qualsevol direcció (també en diagonal i girant).`,
    'Les preses desapareixen i el depredador es queda. Els animals de dalt cauen.',
    `Com més llarga la cadena, més punts: ${o.multipliers.map(([len, m]) => `×${m} amb ${len}`).join(', ')}. ${capitalize(o.top)} menja i se'n va.`,
    o.chargers.length > 1
      ? `${capitalize(listAnd(o.chargers))} es fan més forts cada cop que mengen. Quan arriben al màxim, entren en frenesí i es mengen tots els veïns més petits (+${o.frenzyBonusS} s).`
      : `${capitalize(listAnd(o.chargers))} es fa més fort cada cop que menja. Quan arriba al màxim, entra en frenesí i es menja tots els veïns més petits (+${o.frenzyBonusS} s).`,
    'Fes cadenes ràpides seguides per multiplicar els punts.',
    'Els animals daurats doblen els punts de la cadena on entren.',
    'El pop és un comodí: fa de l\'animal que falti a la cadena, però mai de depredador.',
    ...(o.lines ? ['Cadenes espontànies: quan cauen els animals i en queden en fila o columna en l\'ordre de la cadena, el gran es menja els petits sol. Cada onada seguida multiplica més: ' + o.waves.map((m) => `×${m}`).join(', ') + '…'] : []),
  ],
  close: 'Entesos',
  gameOver: 'Temps!',
  newBest: 'Nou rècord!',
  statScore: 'Puntuació',
  statBest: 'Millor puntuació',
  statChains: 'Cadenes',
  statChains4: 'Cadenes de 4',
  statFrenzies: 'Frenesís',
  statSpontaneous: 'Cadenes espontànies',
  statBestMove: 'Millor jugada',
  playAgain: 'Torna a jugar',
  frenzy: 'FRENESÍ!',
  golden: (m: number) => `DAURAT ×${m}!`,
  wave: (m: number) => `REACCIÓ ×${m}!`,
  comboGreat: 'GENIAL!',
  comboAmazing: 'INCREÏBLE!',
  comboFeast: 'FESTÍ OCEÀNIC!',
  shuffle: 'Remenant…',
  timeBonus: (s: number) => `+${s} s`,
  times: (m: number) => `×${m}`,
  clockLabel: 'Temps',
  movesLeft: 'Moviments',
  gameOverMoves: 'Fi de la partida!',
  debug: {
    open: 'Depuració',
    title: 'Depuració',
    note: 'Les partides de prova no compten per al rècord.',
    seed: 'Llavor',
    randomSeed: 'Llavor a l\'atzar',
    mode: 'Mode',
    modeTime: 'Temps',
    modeMoves: 'Moviments',
    variant: 'Regles',
    board: 'Tauler inicial (opcional)',
    boardHelp: 'Una fila per línia o separades per /. S T R O = sardina, tonyina, tauró, orca; K = plàncton (5 nivells); P = pop; * = daurat; un número = energia (R*6).',
    copyBoard: 'Posa-hi el tauler actual',
    badBoard: 'Tauler no vàlid: revisa les lletres (S T R O) i que totes les files tinguin la mateixa mida.',
    badSeed: 'La llavor ha de ser un nombre enter.',
    start: 'Nova partida de prova',
    export: 'Exporta les jugades',
    exported: 'Registre descarregat i copiat',
    current: (seed: number, moves: number) => `Partida actual: llavor ${seed}, ${moves} jugades`,
    close: 'Tanca',
  },
} as const;

export type StringKey = keyof typeof STRINGS;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function listOr(items: readonly (string | number)[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

function listAnd(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} i ${items[items.length - 1]}`;
}
