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
    /** "L'orca es menja el tauró, que es menja la tonyina, …" from the biggest down. */
    eats: (definites: readonly string[]) =>
      `${capitalize(definites[0])} es menja ${definites.slice(1).join(', que es menja ')}.`,
    yum: 'Ñam!',
    points: (lengths: readonly number[], diagonal: boolean, reverse: boolean) => [
      reverse
        ? `Llisca el dit per sobre de ${lengths.join(', ').replace(/, (\d+)$/, ' o $1')} animals seguits, del més gran al més petit o al revés${diagonal ? ', també en diagonal' : ''}.`
        : `Llisca el dit per sobre de ${lengths.join(', ').replace(/, (\d+)$/, ' o $1')} animals seguits, del més petit al més gran${diagonal ? ', també en diagonal' : ''}.`,
      'Cada animal ha de ser just el següent de la cadena.',
      'El més gran es menja tota la cadena i guanyes punts. Com més llarga, més punts!',
    ],
    go: 'A jugar!',
    again: 'Mira com es juga',
  },
  daily: {
    free: 'Partida lliure',
    freeSub: 'Quan vulguis, per batre el teu rècord',
    button: "🗓 Repte d'avui",
    sub: 'El mateix tauler per a tothom · 1 intent',
    doneSub: (time: string) => `Ja l'has jugat · el proper, d'aquí a ${time}`,
    streak: (n: number) => `🔥 Ratxa de ${n} ${n === 1 ? 'dia' : 'dies'}`,
    title: "Repte d'avui",
    /** The challenge in a few lines: on its intro card and in the help. */
    rules: [
      'Cada dia hi ha un tauler nou, i és el mateix per a tothom: tots jugueu amb els mateixos animals.',
      'Només compta el primer intent. Després el pots tornar a jugar per practicar, però ja no puntua.',
      'Té una classificació pròpia, només amb les partides del dia.',
      "A mitjanit (hora d'aquí) arriba un repte nou.",
      'Juga cada dia per fer créixer la teva ratxa 🔥.',
    ],
    begin: 'Comença el repte',
    later: 'Ara no',
    doneTitle: "Ja has jugat el repte d'avui",
    doneScore: (score: string) => `Has fet ${score} punts.`,
    comeBack: (time: string) => `Torna demà! El proper repte arriba d'aquí a ${time}.`,
    practice: 'Practica-hi (no puntua)',
    seeRanking: "Mira la classificació d'avui",
    hud: (date: string) => `REPTE ${date}`,
    practiceHud: 'PRÀCTICA',
    officialNote: (date: string) => `Repte del ${date} · el teu intent oficial`,
    practiceNote: 'Partida de pràctica: no puntua.',
    playFree: 'Juga una partida lliure',
    playDaily: "🗓 Juga el repte d'avui",
    practiceAgain: "Torna'l a jugar (pràctica)",
    rank: (n: number, total: number) => `Ets el ${ordinal(n)} de ${total}`,
    tabGeneral: 'General',
    tabToday: 'Avui',
    time: (ms: number) => {
      const min = Math.ceil(ms / 60_000);
      const h = Math.floor(min / 60);
      return h ? `${h} h ${min % 60} min` : `${min} min`;
    },
    /** Spoiler-free result to share: date, score, place, and the big moments. */
    shareText: (o: { date: string; score: string; rank: number | null; total: number | null; frenzies: number; whirlpools: number }) => [
      `🐋 Orca Lunch · Repte ${o.date}`,
      o.rank && o.total ? `${o.score} punts · ${ordinal(o.rank)} de ${o.total}` : `${o.score} punts`,
      [
        o.frenzies ? `${'🔥'.repeat(Math.min(o.frenzies, 5))} ${o.frenzies} ${o.frenzies === 1 ? 'frenesí' : 'frenesís'}` : '',
        o.whirlpools ? `🌀 ${o.whirlpools} ${o.whirlpools === 1 ? 'remolí' : 'remolins'}` : '',
      ].filter(Boolean).join(' · '),
    ].filter(Boolean).join('\n'),
  },
  rating: {
    ask: "T'ha agradat?",
    up: "M'ha agradat",
    down: "No m'ha agradat",
    thanks: 'Gràcies!',
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
    audio: (state: string) => `So: ${state}`,
    close: 'Tanca',
  },
} as const;

export type StringKey = keyof typeof STRINGS;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Catalan ordinals: 1r, 2n, 3r, 4t, 5è… */
function ordinal(n: number): string {
  return `${n}${({ 1: 'r', 2: 'n', 3: 'r', 4: 't' } as Record<number, string>)[n] ?? 'è'}`;
}

function listOr(items: readonly (string | number)[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

function listAnd(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} i ${items[items.length - 1]}`;
}
