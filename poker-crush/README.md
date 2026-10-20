# Poker Crush

Joc casual per a mòbil, germà d'Orca Lunch: el tauler és ple de cartes de pòquer i el jugador llisca el dit per cartes veïnes (també en diagonal) per fer mans de 3 a 5 cartes. Les cartes de la mà desapareixen, les de dalt cauen i en surten de noves. Partides de 2 minuts, repte diari i rècord al mòbil.

Les regles són a [REGLES.md](REGLES.md). Tots els valors de joc són a `src/engine/config.ts`.

## Ordres
- `npm install`
- `npm run dev` (amb `-- --host` per provar-ho al mòbil)
- `npm test` · `npm run typecheck`
- `npm run sim -- 40 40`: simulador (freqüència de cada mà i un bot greedy)
- `npm run build`: web estàtica a `dist/`
- `npm run build && npm run artifact`: una sola pàgina HTML a `artifact/poker-crush.html`

## Arquitectura
Com a Orca Lunch: `src/engine/` és TypeScript pur i determinista (`newGame`, `applyMove`, `tick`, `findHands`), i la interfície (`src/ui/`) només reprodueix els esdeveniments del motor. El so és sintetitzat (Web Audio) i els efectes van en un canvas sobre el tauler.
