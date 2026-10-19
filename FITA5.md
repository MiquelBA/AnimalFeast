# Fita 5 — Poliment (sensació de joc)

Tot és presentació: el motor i les regles no canvien.

- **So** (`src/ui/audio.ts`): efectes sintetitzats amb Web Audio, sense fitxers. Traç, cadenes de 3/4/5, menjar, daurat, combo, frenesí, temps extra, cadena no vàlida, barreja, avís dels últims 5 s, fi de partida i rècord. Botó d'altaveu a dalt a la dreta; la preferència es desa (`animal-feast:sound`). El joc es pot jugar igual sense so.
- **Vibració** (`src/ui/haptics.ts`): patrons curts a `UI.haptics`. Android sí; iOS Safari no ho permet.
- **Celebracions** (`src/ui/Board.tsx`): partícules en cada cadena (més en les llargues i el frenesí) i sacsejada del tauler en cadenes llargues i frenesí. Tot dins de la regla dels 500 ms i sense bloquejar el traç.
- **Pantalla final**: la mascota (el depredador de dalt), puntuació que compta cap amunt, estadístiques que entren en cascada i confeti quan hi ha rècord nou.
- `prefers-reduced-motion` apaga partícules, confeti i animacions de pampallugues.
- Les partides de prova (`?debug=1`) ja no mostren un rècord fals al marcador.

Valors a `src/ui/uiConfig.ts` (`haptics`, `shake`, `particles`, `warningTickMs`, `countUpMs`, `confettiMs`, `confettiPieces`).
