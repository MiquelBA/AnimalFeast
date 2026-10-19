# Fita 1 — Motor de joc

## Què s'ha fet

- Projecte Vite `react-ts` + Vitest, TypeScript en mode `strict`. La interfície encara és la plantilla de Vite (es farà a la Fita 3).
- `src/engine/`, TypeScript pur i determinista:
  - `types.ts`: `Animal`, `Board`, `GameState`, `Move`, `GameEvent`, `GameConfig`.
  - `config.ts`: `DEFAULT_CONFIG` amb tots els valors de `REGLES.md`, i `makeConfig(overrides)` per a les variants.
  - `rng.ts`: mulberry32 amb l'estat dins de `GameState`, pesos d'aparició i `spawnSchedule`.
  - `rules.ts`: veïns (N, E, S, O), `canEat` amb `eatRule`, `sameSpeciesCaptures` i `isStable`.
  - `resolve.ts`: el bucle A/B/C amb focus, amb `predatorMovesIntoPrey` true/false.
  - `score.ts`: `captureValue`, multiplicador de cadena, energia guanyada, `energyTier`.
  - `game.ts`: `createGame`, `applyMove(state, move) → { state, events }`, `legalMoves`, `replay`, `gameStats`.
  - `notation.ts`: `parseBoard("O . . / S R3 . / . . .")` i `boardToString` (també servirà per al panell de depuració).
- Esdeveniments emesos: `place`, `capture` (amb `kind: hunt | hunted`, posicions d'origen i destí, casella buidada, punts i multiplicador), `energyGain` (amb nivell visual abans i després), `chainStep`, `turnEnd`, `handRefill`, `gameOver` (amb les estadístiques de §7).

## Com provar-ho

```
cd ocean-feast
npm install
npm test            # 40 tests
npm run typecheck   # inclou una comprovació del motor sense la llibreria DOM
```

Tests:
- `scenarios.test.ts`: T1–T12 i T14 amb els valors exactes de `REGLES.md`, a més de les variants (`predatorMovesIntoPrey: false`, `sameSpeciesCaptures: false`, tria de presa per valor, límit del multiplicador), la notació i que `applyMove` no muta l'estat.
- `properties.test.ts` (T13): 1.000 partides aleatòries amb les regles per defecte i 200 per a cadascuna de les altres 7 combinacions. Comprova l'estabilitat després de cada torn, que cada captura treu exactament un animal, que la puntuació és la suma dels punts de les captures i que cap torn passa de 36 captures.
- `purity.test.ts`: el motor només importa fitxers del motor i no usa `window`, `document`, `localStorage`, etc.

## Problema de disseny important: la partida pràcticament no s'acaba

Amb jugades aleatòries i un límit de 1.000 torns (200 partides per variant):

| eatRule | el depredador es mou | captures mateixa espècie | partides sense acabar | torns (mediana de les que acaben) |
|---|---|---|---:|---:|
| oneLevelBelow | sí | sí (**per defecte**) | **199 / 200** | 327 |
| oneLevelBelow | sí | no | 0 / 200 | 350 |
| oneLevelBelow | no | sí | 15 / 200 | 286 |
| oneLevelBelow | no | no | 0 / 200 | 146 |
| anyLower | sí | sí | 200 / 200 | — |
| anyLower | sí | no | 1 / 200 | 714 |
| anyLower | no | sí | 200 / 200 | — |
| anyLower | no | no | 1 / 200 | 714 |

Per què: cada captura allibera una casella, de manera que un torn amb captura no fa créixer el tauler (+1 animal col·locat, −1 per captura). El tauler només s'omple en torns sense cap captura, i com més ple està, més difícil és col·locar res sense que hi hagi caça. Amb les captures dins la mateixa espècie apareixen orques gegants (energia 100–800 a la mostra) que es mengen qualsevol orca o tauró que hi posis al costat i que res no pot matar.

Conseqüència: un jugador que busqui punts pot allargar la partida indefinidament, i la puntuació deixa de mesurar habilitat. Fins i tot quan acaba, la mediana de 150–350 torns està molt per sobre de "partides curtes" per a 36 caselles.

Això ho mesurarem bé a la Fita 2 (amb bots greedy), però ja cal pensar en una condició de final. Opcions possibles: un límit de torns o una mà/bossa finita d'animals, que la partida també acabi si totes les caselles buides queden "bloquejades", un límit d'energia, o que la casella buidada no sempre quedi lliure.

## Suposicions on `REGLES.md` no diu res (cal confirmar)

1. **Tauler inicial buit.** `REGLES.md` no parla de la posició inicial. `createGame` accepta un tauler opcional per si en voleu un de preomplert.
2. **`spawnSchedule`**: format `[{ fromTurn, weights }]`. S'aplica l'última entrada amb `fromTurn ≤ torn`. El torn és el nombre de jugades ja fetes (la mà inicial es genera amb el torn 0 i el recanvi després de la jugada n amb el torn n).
3. **La ranura de la mà es reposa també a l'última jugada** (pas 6 abans del 7). No afecta el joc, però sí la seqüència del RNG.
4. **El nivell no es guarda a cada animal**: es deriva de l'espècie a `config.species`, de manera que no es pot desincronitzar.
5. **Una jugada il·legal** (casella ocupada, fora del tauler, partida acabada) fa que `applyMove` llanci un error. La interfície ha d'usar `isLegalMove` / `legalMoves`.
6. **T13 no exigeix que la partida acabi**, així que el test limita cada partida a 200 torns i només comprova els invariants. El percentatge de partides infinites el donarà el simulador.
