# Publicar ANIMAL FEAST

El joc és una web estàtica: `npm run build` genera la carpeta `dist/` i n'hi ha prou de servir-la per HTTPS. El build fa servir camins relatius (`base: './'` a `vite.config.ts`), així que funciona tant a l'arrel d'un domini com dins d'una subcarpeta (per exemple, `usuari.github.io/animal-feast/`).

## 1. Generar el build

```
npm install
npm run build
npm run preview -- --host   # opcional: prova el build al mòbil abans de publicar
```

## 2. Triar on publicar (totes tres opcions són gratuïtes i amb HTTPS)

### Opció A: Netlify Drop (la més ràpida, sense git)
1. Entra a https://app.netlify.com/drop i inicia sessió.
2. Arrossega la carpeta `dist/` a la pàgina.
3. Netlify dona una adreça `https://<nom>.netlify.app`. Per actualitzar el joc, fes un build nou i torna a arrossegar `dist/` dins del mateix lloc ("Deploys" → arrossegar).

### Opció B: Vercel (des d'un repositori de GitHub)
1. Puja el projecte a un repositori de GitHub.
2. A https://vercel.com/new, importa el repositori. Vercel detecta Vite sol: comanda `npm run build` i carpeta `dist`.
3. Cada push a la branca principal es publica sol a `https://<nom>.vercel.app`.

### Opció C: GitHub Pages (des d'un repositori de GitHub)
1. Puja el projecte a un repositori de GitHub.
2. Crea el fitxer `.github/workflows/pages.yml` amb aquest contingut:

   ```yaml
   name: Publica a GitHub Pages
   on:
     push:
       branches: [main]
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npm test
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
3. Al repositori, ves a Settings → Pages → Source i tria "GitHub Actions".
4. Després del primer push, el joc queda a `https://<usuari>.github.io/<repositori>/`.
5. Domini propi (ara, `https://orcalunch.com/`): registres DNS cap a GitHub Pages, el domini a Settings → Pages i «Enforce HTTPS». `public/CNAME` porta el domini dins del build, i `VITE_SITE_URL` a `.env` ha de ser la mateixa adreça (la fan servir les previsualitzacions dels enllaços).

## 3. Provar-lo al mòbil
- Obre l'adreça al mòbil i juga una partida sencera.
- Afegeix `?debug=1` a l'adreça per obrir el panell de proves (llavor, mode, regles, tauler escrit i exportació de jugades). Sense aquest paràmetre, el panell no apareix.
- Per compartir-lo amb els jugadors de prova n'hi ha prou amb l'enllaç; no cal instal·lar res.
