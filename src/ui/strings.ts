// All user-facing text (Catalan).
export const STRINGS = {
  title: 'ORCA LUNCH',
  score: 'Punts',
  best: 'Rècord',
  help: 'Ajuda',
  soundOn: 'Activa el so',
  soundOff: 'Silencia el so',
  pause: 'Pausa',
  resume: 'Continua',
  paused: 'En pausa',
  pausedHint: 'Toca per continuar quan vulguis.',
  go: 'Som-hi!',
  tapToStart: 'Toca per començar',
  tutorial: {
    title: 'Com es juga',
    goal: 'Completa la cadena tròfica!',
    yum: 'Ñam!',
    points: (lengths: readonly number[], diagonal: boolean, reverse: boolean) => [
      `Llisca el dit per sobre de ${lengths.join(', ').replace(/, (\d+)$/, ' o $1')} animals seguits, del més petit al més gran${reverse || diagonal ? ` (${[reverse && 'també al revés', diagonal && (reverse ? 'en diagonal' : 'també en diagonal')].filter(Boolean).join(' i ')})` : ''}.`,
      'Cada animal ha de ser just el següent de la cadena.',
      'El més gran es menja els altres i guanyes punts. Com més llarga la cadena, més punts!',
    ],
    go: 'A jugar!',
    again: 'Mira com es juga',
  },
  share: {
    button: 'Repta un amic',
    text: (score: string) => `He fet ${score} punts a Orca Lunch 🐋 Em superes?`,
  },
  install: {
    button: "Instal·la l'app",
    title: 'Afegeix-lo a la pantalla d\'inici',
    iosSteps: [
      'Obre aquesta pàgina amb Safari.',
      'Toca el botó Compartir (el quadrat amb la fletxa cap amunt).',
      'Tria «Afegeix a la pantalla d\'inici» i després «Afegeix».',
    ],
  },
  feedback: {
    button: 'Envia un comentari',
    title: 'Què en penses?',
    hint: 'Què t\'agrada, què canviaries o què no funciona. Ho llegim tot.',
    placeholder: 'Escriu aquí…',
    send: 'Envia',
    sending: 'Enviant…',
    thanks: 'Gràcies! Ho hem rebut.',
    failed: "No s'ha pogut enviar. Torna-ho a provar d'aquí a una estona.",
  },
  helpTitle: 'Com es juga',
  helpChain: 'La cadena alimentària',
  /** Help rules for the current rules: chain lengths, length multipliers and who gathers energy. */
  helpRules: (o: { lengths: readonly number[]; multipliers: readonly [number, number][]; chargers: readonly string[]; top: string; frenzyBonusS: number; cross: boolean; lines: boolean; waves: readonly number[]; whirlLength: number }) => [
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
    'El pop és un comodí: pot fer de qualsevol presa de la cadena, també de la més petita on comences. L\'únic que no pot fer és de depredador, l\'animal gran que menja al final: aquest ha de ser sempre un animal de veritat, perquè és el que es queda al tauler, guanya força i pot entrar en frenesí.',
    ...(o.lines ? ['Cadenes espontànies: quan cauen els animals i en queden en fila o columna en l\'ordre de la cadena, el gran es menja els petits sol. Cada onada seguida multiplica més: ' + o.waves.map((m) => `×${m}`).join(', ') + '…'] : []),
    ...(o.whirlLength ? [`Una cadena de ${o.whirlLength} deixa un remolí. El remolí fa de comodí i, quan el fas servir, s'empassa tota la seva fila i columna.`] : []),
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
  statWhirlpools: 'Remolins',
  statBestMove: 'Millor jugada',
  playAgain: 'Torna a jugar',
  leaderboard: {
    title: 'Classificació',
    open: 'Mira la classificació',
    close: 'Tanca',
    askName: 'Posa el teu nom per sortir a la classificació',
    changeName: 'Canvia el teu nom',
    namePlaceholder: 'El teu nom',
    save: 'Desa',
    playingAs: 'Jugues com a',
    edit: 'Canvia',
    loading: 'Carregant…',
    offline: "No s'ha pogut connectar.",
    retry: 'Torna-ho a provar',
    empty: 'Encara no hi ha ningú. Sigues el primer!',
    badName: 'Aquest nom no es pot fer servir. Prova amb un altre.',
    refused: "Aquesta puntuació no s'ha pogut afegir a la classificació.",
    rank: (n: number) => `Aquesta partida queda en la posició ${n}`,
  },
  frenzy: 'FRENESÍ!',
  golden: (m: number) => `DAURAT ×${m}!`,
  wave: (m: number) => `REACCIÓ ×${m}!`,
  whirl: 'REMOLÍ!',
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
