# Fita 3: prototip jugable

## Què s'ha fet

- **Pantalla vertical**: títol ANIMAL FEAST, punts, rècord i un rellotge gran a dalt. El taulell 7×7 queda al centre, una mica avall perquè el polze hi arribi. A baix hi ha una franja petita amb la cadena alimentària i els botons d'ajuda (?) i pausa.
- **Traç amb el dit** (`src/ui/Board.tsx`, `src/ui/trace.ts`):
  - Fa servir pointer events amb captura.
  - Una casella només es marca dins d'un cercle del 35% al voltant del centre, i les cantonades no marquen res, de manera que les diagonals són fàcils.
  - Si tornes enrere, es desmarca l'última casella.
  - Una línia segueix el dit.
  - Cada casella marcada canvia de color: blanc mentre la cadena encara pot ser vàlida, verd si és vàlida i vermell si no ho és.
  - En deixar anar, una cadena vàlida es juga i una invàlida fa una sacsejada suau.
  - Els lliscaments ràpids no se salten caselles, i mentre traces no hi ha scroll ni zoom.
- **Animals provisionals** (`src/assets/placeholders.tsx`, via `spriteRegistry`): 4 SVG originals amb ulls grossos, cadascun amb silueta i color diferents.
- **Energia**: tres punts discrets sota el tauró, que creix i brilla una mica a mesura que es carrega. Quan la propera cadena li farà fer un frenesí, té un halo daurat que respira.
- **Animacions a partir dels esdeveniments del motor** (`src/ui/frames.ts`):
  - Les preses s'empassen cap al depredador.
  - Els punts suren.
  - Els animals cauen amb un petit rebot.
  - El frenesí és un esclat gran però breu.
  - L'orca se'n va cap amunt.
  - Textos de combo: GENIAL!, INCREÏBLE! i FESTÍ OCEÀNIC!
  - Cap animació passa de 500 ms (hi ha un test que ho comprova), i el rellotge s'atura mentre n'hi ha.
- **Pista**: després de 5 s sense jugar, s'il·lumina una cadena possible, la més llarga.
- **Final de partida**: puntuació, rècord, cadenes, cadenes de 4, frenesís, millor jugada i el botó "Torna a jugar".
- **Rècord**: es desa a `localStorage`, sempre dins de try/catch.
- **Públic**:
  - Es pot jugar amb una sola mà.
  - Cap informació depèn del so (no n'hi ha).
  - Pausa automàtica quan l'app passa a segon pla, que també atura el rellotge.
  - Càrrega ràpida: 80 KB de JS comprimit, i la font Nunito amb `display=swap`.
- **Motor**: `traceStatus` per al color del traç i `isNearFrenzy` per a l'avís de frenesí. També he corregit `minEnergyGain`: la tonyina mai no tanca una cadena de 3 o més, així que mai no guanya energia.

## Com provar-ho

```
npm install
npm run dev -- --host
```
Obre l'adreça "Network" al mòbil (amb el mòbil i l'ordinador a la mateixa wifi). El rellotge comença amb la primera cadena.

Proves automàtiques:
- `npm test`: 55 tests.
- `npm run typecheck`, `npm run lint` i `npm run build`.
- He jugat una partida sencera en un Chromium mòbil automàtic (390×844, i també 360×640). La partida ha acabat a 0:00 i no hi ha hagut cap error de consola. He provat el traç invàlid, la pausa per canvi d'app, la pista, el frenesí, el final de partida i "Torna a jugar".

## Decisions preses (canviables)

- **Títol**: ANIMAL FEAST, no OCEAN FEAST com deia el pla.
- **Botons d'ajuda i pausa**: a baix, a l'abast del polze, i no a dalt, segons la secció Públic.
- **Inici del rellotge**: comença amb el primer traç. Fins aleshores es mostra "Traça una cadena per començar".
- **Textos flotants**: duren 500 ms per complir el límit. Un text de combo es llegeix, però de pressa.
- **Pista**: mostra la cadena més llarga, que sovint és la millor jugada. Potser és massa generosa.

## Problemes de disseny trobats

1. **La partida real s'allarga força.** Com que el rellotge s'atura durant les animacions, cada jugada afegeix uns 0,56 s (0,56 + 0,78 s si hi ha frenesí). Un jugador molt ràpid (el bot de prova, unes 170 cadenes) ha trigat 4 min 18 s reals per a 2 min de rellotge. Amb el ritme humà del simulador (3,5 s per jugada) s'hauria de mantenir a prop de l'objectiu de 2 min 40 s, però cal comprovar-ho amb persones.
2. **Traços perduts durant les animacions.** Un traç que comença mentre els animals encara cauen s'ignora: el bot n'ha perdut prop de la meitat. Algú que jugui ràpid pot notar que "no respon". Proposta: deixar començar el traç durant l'última caiguda, o bé escurçar la caiguda.
3. **Només el tauró mostra energia.** Les tonyines mai no són depredadores (una cadena necessita 3 nivells) i les orques se'n van. Si en el futur hi ha mons amb més nivells, això canviarà sol, perquè es calcula des del motor.
4. **"FESTÍ OCEÀNIC!" és un text del món oceà.** Quan hi hagi més mons, aquest text hauria de venir del tema.
5. **Espai buit en mòbils alts.** Entre el marcador i el taulell queda un espai lliure que es podria aprofitar per a objectius o per a la cadena alimentària.
