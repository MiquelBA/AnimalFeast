// Turns the Vite build into one self-contained page (for hosts that serve a single HTML file, such
// as a claude.ai Artifact): the CSS and JS go inline. The host adds the <html>/<head>/<body>
// skeleton and pads the page for the phone's safe areas, so the game's own safe-area padding is off.
// Usage: npm run build && npm run artifact
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/assets/', import.meta.url).pathname;
const files = readdirSync(dist);
const css = readFileSync(join(dist, files.find((f) => f.endsWith('.css'))), 'utf8');
const js = readFileSync(join(dist, files.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');

const page = `<title>Poker Lunch</title>
<meta name="theme-color" content="#0B3B2E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700;800&display=swap">
<style>${css}
:root { --safe-top: 0px; --safe-bottom: 0px; }
</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
const out = new URL('../artifact/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'poker-lunch.html'), page);
console.log(`artifact/poker-lunch.html: ${(page.length / 1024).toFixed(0)} KB`);
