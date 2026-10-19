# Fita 1b — Motor nou (REGLES.md v0.2)

## Què s'ha fet

- S'ha eliminat el motor v0.1 (queda a l'historial de git; la feina a mig fer de la Fita 2 antiga és a la branca `wip/v0.1-endgame-options`).
- `src/engine/`, TypeScript pur i determinista, només amb nivells (1–4):
  - `types.ts`, `config.ts`: tots els valors de REGLES.md v0.2.
  - `rng.ts`: el mateix mulberry32 de la Fita 1.
  - `board.ts`: veïnatge de 8 o 4, gravetat i reposició (columna a columna, de baix a dalt), cua d'aparició fixa.
  - `chains.ts`: `checkChain` (amb el motiu de l'error), `isValidChain` i `legalChains`, que compta cada conjunt de caselles un sol cop.
  - `score.ts`: punts de cadena, de frenesí, energia heretada i combo.
  - `game.ts`: `createGame`, `applyMove`, `tick`, `moveError` / `isLegalMove`, `ensurePlayable` (remenat i regeneració), `replay`, `gameStats`.
  - `notation.ts`: ara accepta taulers rectangulars i salts de línia (`"O O O / S S S / S T R3"`), i `parseTiers("S S R")` per a la cua.
- Esdeveniments: `chain`, `eat`, `energyGain`, `fall`, `spawn`, `frenzy`, `leave`, `shuffle`, `regenerate`, `timeBonus`, `combo`, `moveEnd`, `gameOver`.
- `src/themes/`: el tema `ocean` (nom, color i clau de sprite per a cada nivell, nom del món i fons), només dades.
- El paquet ara es diu `animal-feast`. La carpeta continua sent `ocean-feast` per no trencar res.

## Com provar-ho

```
cd ocean-feast
npm install
npm test            # escenaris G1–G12 i més
npm run typecheck   # inclou el motor i els temes sense la llibreria DOM
```

## Dubtes sobre REGLES.md v0.2 (he triat una opció; cal confirmar)

1. **G1 contradiu el remenat.** El tauler resultant de G1 (`T T O / O O S / S S R3`) no té cap cadena possible, i amb `minValidMoves: 1` s'hauria de remenar. El test de G1 fa servir `minValidMoves: 0` per comprovar el tauler exacte, i un altre test comprova que amb el valor per defecte es remena. El mateix passa amb el tauler intermedi de G5.
2. **Regeneració després de 20 remenats fallits:** el tauler nou ha de tenir com a mínim `max(minValidMoves, minInitialMoves)` cadenes, és a dir, 3 amb els valors per defecte.
3. **Frenesí amb `adjacency: 4`:** REGLES.md diu que el frenesí sempre és amb 8 direccions. Ho he deixat així, en un paràmetre a part (`frenzyAdjacency: 8`).
4. **Rellotge:** el motor porta `elapsedMs`. `tick` l'avança, i cada jugada l'avança fins al seu `atMs`. Es rebutja una jugada si el seu `atMs` és anterior al de la jugada anterior o si és ≥ el límit de temps (2 minuts més les bonificacions).
5. **Combo:** a `comboMultipliers[min(comptador, longitud) − 1]` he entès que la "longitud" és la de la llista de multiplicadors, no la de la cadena. La finestra és estricta: a exactament 2.500 ms ja no hi ha combo.
6. **Cua d'aparició fixa:** quan s'acaba, es continua amb l'RNG.

## Problemes de disseny detectats (primera mirada, 300 partides aleatòries de 50 jugades)

| Mesura | Valor | Objectiu de la Fita 2 |
|---|---|---|
| Orques al tauler | 20% a l'inici → 40% a la jugada 30 | — |
| Frenesís | 25 per partida (un cada 2 jugades) | "la gran recompensa" |
| Taulers amb una cadena de 4 possible | 93% | 30–60% |
| Remenats | 6% de les jugades, i ~1 regeneració completa per partida | excepcionals |
| Cadenes possibles per tauler | mitjana 36, p10 8, mínim 1 | ≥ 3 sempre |

**El mode temps no s'acaba.** Les bonificacions (+2 s per cadena de 4, +3 s per frenesí) superen el temps que es gasta en cada jugada. Amb un jugador aleatori (200 partides):

| Temps per jugada | Durada mediana de la "partida de 2 minuts" |
|---|---|
| 1 s | infinita (les 200 arriben al límit de 1.000 jugades) |
| 2,5 s (l'estimació del pla) | ~17 minuts (p90: 27 minuts) |
| 4 s | ~4 minuts |

Per què: el depredador final mai desapareix, i l'orca només pot ser depredador. Per tant, les orques només surten del tauler amb un frenesí, i s'acumulen. Una orca que fa 2-3-4 queda amb energia 5 i qualsevol cadena següent li provoca el frenesí, de manera que el frenesí deixa de ser especial. Amb tantes orques, hi ha més taulers sense cadenes i més remenats.

Això és exactament el que ha de mesurar la Fita 2, amb bots de veritat (el bot aleatori exagera). Ajustos que es podrien provar: menys pes d'aparició per a les orques, un `frenzyThreshold` més alt o que l'orca també hagi de "sortir" després de menjar.
