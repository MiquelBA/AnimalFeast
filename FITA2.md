# Fita 2 — Regles v0.3 i simulador

## Què s'ha fet

- **Regles v0.3** al motor, a `REGLES.md` i als tests (46 en verd):
  - `maxTierLeaves: true`: l'orca menja i se'n va. Amb 2-3-4 desapareix la cadena sencera; amb 1-2-3-4 fa un frenesí des de la seva casella (després de la gravetat) i se'n va. L'orca no guanya energia.
  - Temps: només `timeBonusMs.frenzy = 2000`, amb `maxTimeBonusMs = 20000` per partida.
  - Opció nova, només per comparar: `fullChainFrenzy` (per defecte `true`). Amb `false`, l'orca d'una cadena 1-2-3-4 se'n va sense frenesí.
- **Simulador** (`npm run sim`, 37 s amb 4 nuclis): bots `random`, `greedy` i `greedy+frenzy`, 200 partides per bot i variant, i 11 variants. Treu una taula per variant, un resum d'objectius i un JSON a `sim-results/`.
  - Opcions: `--games`, `--variants=base,candA`, `--bots`, `--spm=2.5,3.5,5`, `--moves=30,50`, `--animMs=600`, `--spawnWeights=38,30,24,8`, `--timeBonus=2000` i qualsevol clau de `config` (`--frenzyThreshold=12`, `--adjacency=4`…).
  - El mode temps es deriva de cada partida: la jugada k es fa a k × (segons per jugada) mentre quedi temps. La **durada real** és el rellotge més **600 ms d'animació per jugada** (suposició: el rellotge s'atura durant les animacions; es pot canviar amb `--animMs`).
  - Amb 2,5 s o més per jugada no hi ha mai combo, perquè la finestra és < 2.500 ms.

## Resultats (bot greedy, 3,5 s per jugada; 200 partides)

| Variant | Mín. cadenes | Taulers amb c4 possible | Remenats | Orques % (jugada 0→10→20→30→40) | c4 per partida | Frenesís | Durada real p90 | greedy/random | greedy+frenzy/greedy |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| v0.2 | 1 | 88% | 11,6% | 18→37→42→41→43 | 134 | 138 | 695 s | 5,24 | 1,00 |
| **v0.3 (base)** | 1 | 90% | 10,5% | 18→37→42→41→42 | 35 | 35,6 | 163 s | 2,26 | 1,00 |
| frenesí 9 | 1 | 89% | 10,3% | 18→37→42→41→41 | 35 | 35,0 | 163 s | 2,30 | 1,00 |
| frenesí 12 | 1 | 89% | 10,3% | 18→37→42→41→41 | 35 | 34,9 | 163 s | 2,29 | 1,00 |
| tauler 7×7 | 2 | 90% | 7,8% | 18→34→42→43→42 | — | 36,1 | 163 s | 2,14 | 1,00 |
| veïnatge 4 | 1 | 54% | 16,8% | 18→30→37→38→38 | — | 23,0 | 163 s | 2,33 | 1,00 |
| sense traçat descendent | 1 | 90% | 10,5% | igual que base | — | 35,6 | 163 s | 2,26 | 1,00 |
| pesos 35/30/22/13 | 1 | 83% | 5,8% | 13→21→28→29→30 | — | 34,5 | 163 s | 2,29 | 1,00 |
| pesos 40/30/20/10 | 2 | 71% | 4,5% | 10→13→17→17→19 | — | 31,6 | 163 s | 2,12 | 1,00 |
| **A**: pesos 38/30/24/8, frenesí 12, mín. 3 cadenes | **3** | **51%** | 2,0% | **8→7→8→8→9** | 20 | 21,3 | 163 s | 2,26 | 1,00 |
| **B**: com A, però la c4 no fa frenesí (pesos 33/30/23/14, frenesí 9) | **3** | **53%** | 2,3% | 14→8→6→6→6 | 19 | **2,2** | **150 s** | 1,60 | 1,00 |

Objectius: mínim 3 cadenes; c4 possible en el 30–60% dels taulers; remenats < 1%; orques estables; 1–3 frenesís (greedy); p90 real ≤ 160 s amb 3,5 s per jugada; greedy/random ≥ 1,3; greedy+frenzy/greedy ≥ 1,2.

## Què diuen els números

1. **"L'orca menja i se'n va" no evita que les orques s'acumulin.** Les orques continuen pujant del 18% al 42%. La causa és el frenesí: es menja tots els veïns de nivell inferior (sardines, tonyines i taurons), que es reposen amb animals nous, però mai es menja orques. Cada jugada treu una sola orca. **El que estabilitza les orques és el pes d'aparició:** amb un 8% es queden al 7–9% (variant A).
2. **El llindar de frenesí (6, 9 o 12) gairebé no canvia res**, perquè gairebé tots els frenesís venen de cadenes de 4 i no dels taurons. Els frenesís de taurons són només 1–2 per partida amb el llindar 12.
3. **Els objectius de cadenes de 4 i de frenesís són incompatibles amb "una cadena de 4 sempre fa frenesí".** Si hi ha una cadena de 4 possible en el 30–60% dels taulers, el greedy en fa 15–20 per partida (val ×3), i per tant hi ha 15–20 frenesís, no 1–3. Només la variant B, en què la cadena de 4 no fa frenesí, arriba a 2,2 frenesís per partida.
4. **La durada:** amb tants frenesís, la bonificació arriba al màxim de +20 s a totes les partides. Queden 140 s de rellotge i uns 163 s reals. Amb B, els frenesís són pocs i el p90 real és de 150 s.
5. **Preparar frenesís no compensa** (ràtio 1,00 en totes les variants). Un frenesí de tauró val uns 150–300 punts, menys que una sola cadena de 4 (420 o més), i el greedy ja aprofita tots els frenesís que li surten sols. Perquè l'estratègia es noti, el frenesí ha de valer molt més si l'has preparat. Per exemple, que els punts creixin amb l'energia acumulada, o que tingui un radi més gran. No ho he provat.
6. **Remenats:** cap variant baixa de l'1%. La millor és A, amb el 2%. Exigir 3 cadenes mínimes (`minValidMoves: 3`) és el que garanteix "sempre hi ha 3 cadenes a la vista". Per baixar més, caldria una reposició més intel·ligent (per exemple, afavorir els nivells que falten). No ho he provat.
7. L'estratègia bàsica sí que es nota: greedy/random va de 1,6 a 2,3 a totes les variants.

## Recomanació

- Si es manté "una cadena de 4 sempre fa frenesí": **A** (`spawnWeights 38/30/24/8`, `frenzyThreshold 12`, `minValidMoves 3`). Compleix les cadenes mínimes, la c4 possible al 51% i les orques estables. No compleix els frenesís (21 per partida), els remenats (2%) ni la ràtio greedy+frenzy.
- Si el frenesí ha de ser rar, com diuen els objectius: **B** (`fullChainFrenzy: false`, pesos 33/30/23/14, `frenzyThreshold 9`, `minValidMoves 3`). Compleix 5 dels 8 objectius: cadenes, c4, 2,2 frenesís, 150 s i greedy/random 1,6. Les orques baixen del 14% al 6% durant les 10 primeres jugades i després es mantenen estables. No compleix els remenats (2,3%) ni la ràtio greedy+frenzy.

He deixat els valors per defecte de `config.ts` tal com diu REGLES.md v0.3 fins que decideixis.

## Com provar-ho

```
cd ocean-feast
npm install
npm test
npm run sim                                    # totes les variants, ~40 s
npm run sim -- --variants=candA,candB --games=500
npm run sim -- --variants=base --spawnWeights=38,30,24,8 --frenzyThreshold=12
```
