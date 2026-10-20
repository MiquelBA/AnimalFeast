# POKER CRUSH — Regles (v0.1)

Font de veritat de les regles. Els valors són a `src/engine/config.ts`.

## 1. Tauler i cartes
- Tauler de 6×6, sempre ple. Veïns: les 8 caselles del voltant.
- Les cartes surten d'un **sabot de 2 baralles (104 cartes) i 3 comodins**, barrejat amb la llavor de la partida. Quan s'acaba, se'n barreja un de nou.
- Un 4% de les cartes que surten són **daurades** (mai un comodí).

## 2. La jugada
- Es traça un camí de **3 a 5 cartes** veïnes, sense repetir casella; pot girar.
- **Totes les cartes del camí han de formar part de la mà.** L'ordre no importa.
- L'as fa d'1 o de 14. El **comodí** fa de la carta que falti; la mà ha de tenir com a mínim una carta real.

| Cartes | Mans possibles |
|---|---|
| 3 | Trio |
| 4 | Doble parella, pòquer |
| 5 | Escala, color, full, escala de color, repòquer (5 iguals, possible amb 2 baralles), escala reial |

## 3. Punts i efectes
`punts = (punts de la mà + 2 × suma dels números de les cartes reals) × combo × 2^(daurades)`

| Mà | Punts | Temps | Efecte al tauler |
|---|---:|---:|---|
| Trio | 60 | | |
| Doble parella | 100 | | |
| Escala | 200 | | |
| Color | 250 | | |
| Full | 400 | +2 s | |
| Pòquer | 800 | +3 s | Rebenta la fila i la columna de l'última carta |
| Escala de color | 1.500 | +4 s | Rebenta les cartes del mateix pal que toquen el camí |
| Repòquer | 3.000 | +4 s | Rebenta totes les cartes d'aquell número |
| Escala reial | 5.000 | +5 s | Rebenta tot el tauler |

- Cada carta rebentada val 25 punts × combo.
- **Combo de velocitat**: una mà a menys de 2,5 s de l'anterior; multiplicadors ×1,2, ×1,5, ×2.
- Bonificació de temps màxima per partida: +20 s.

## 4. Gravetat, reposició i remenat
- Les cartes cauen per omplir els forats; les noves surten del sabot, columna per columna, de baix a dalt.
- Si hi ha menys de 3 mans possibles, el tauler es remena (fins a 20 intents); si no n'hi ha prou, es reparteix un tauler nou.

## 5. Partida
- 2 minuts, amb compte enrere. El rellotge s'atura mentre es reprodueixen les animacions i quan l'app passa a segon pla.
- **Repte diari**: la mateixa llavor per a tothom cada dia (hora de Barcelona); només compta el primer intent, després és pràctica. Ratxa de dies seguits.

## 6. Dades del simulador (`npm run sim -- 20 40`, bot greedy)
Taulers de 6×6 amb 3 comodins: unes 130 mans possibles de mitjana (mínim 18). Percentatge de taulers on hi ha cada mà: trio 83%, full 99%, pòquer 26%, escala de color 13%, repòquer 8%, escala reial 1,4%. Amb 7×7 i 6 comodins l'escala reial apareixia en un 6% dels taulers i el bot en feia 2,5 per partida.
