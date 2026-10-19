# Fita 4: eines de playtesting i poliment mòbil

## Abans: traç durant l'última caiguda (decisió de Miquel)
Mentre els animals encara cauen al final d'una jugada, ja es pot començar a traçar la següent sobre el tauler final. Si deixes anar el dit abans que acabi la caiguda, l'animació salta al final i la jugada nova es fa a l'acte.

Amb un bot que traça 0,3 s després de cada jugada s'han jugat 11 de 12 traços; abans se'n perdia prop de la meitat. El que es va perdre va coincidir amb un frenesí: durant el menjar i el frenesí encara no es pot traçar.

## Què s'ha fet
- **Panell de depuració amb `?debug=1`.** Apareix un engranatge a dalt a l'esquerra, i obrir el panell posa el joc en pausa. Sense el paràmetre, el panell no existeix. Permet:
  - Triar la llavor (o una a l'atzar).
  - Canviar el mode entre temps i moviments. En mode moviments, el marcador mostra els que queden: 30.
  - Triar les regles entre totes les variants del simulador (ara viuen a `src/engine/variants.ts` i el simulador les comparteix).
  - Carregar un tauler escrit amb la notació (S T R O, amb l'energia en número: R6), o posar-hi el tauler actual per editar-lo.
  - Exportar el registre de jugades en JSON: es descarrega i es copia al porta-retalls. Conté la llavor, les regles, el tauler inicial si n'hi havia, la puntuació i les jugades amb el seu temps. Un test comprova que el registre reprodueix exactament la partida.
  - Les partides de prova no compten per al rècord.
- **Mòbil.** El joc respecta les zones segures del notch pels quatre costats, també als diàlegs. He comprovat que a 360×640 tot hi cap: el tauler, els botons i el panell.
- **Build i publicació.**
  - `npm run build` genera `dist/` (82 KB de JS comprimit) amb camins relatius. He comprovat que funciona des d'una subcarpeta, com faria GitHub Pages.
  - Les instruccions per a Netlify, Vercel i GitHub Pages són a [PUBLICAR.md](PUBLICAR.md). No he publicat res.
- README nou, en lloc del de la plantilla de Vite.

## Com provar-ho
- `npm install && npm run dev -- --host` i obre l'adreça al mòbil. Afegeix `?debug=1` per veure el panell.
- `npm test` (58 tests), `npm run typecheck`, `npm run lint` i `npm run build`.

## Problemes trobats
1. **Zones segures sense provar en un aparell real.** No les he pogut provar en un telèfon amb notch real; el navegador automàtic no en simula cap. Cal mirar-ho en un iPhone.
2. **Tauler escrit sense cap cadena.** Un tauler escrit al panell que no tingui cap cadena possible es queda encallat fins que en carreguis un altre. El motor només remena després d'una jugada. És una eina de proves, així que ho he deixat així.
3. **Dependència de Google Fonts.** La font Nunito es carrega de Google Fonts. Si es vol que el joc funcioni sense connexió o sense dependre de tercers, caldria incloure-la al projecte.
