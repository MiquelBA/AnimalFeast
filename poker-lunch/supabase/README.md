# Classificació (Supabase)

Poker Lunch comparteix el projecte de Supabase d'Orca Lunch (`gjfkfmqweimyjvapdoof`). Les taules, les polítiques i els límits ja hi són (els SQL són al repositori d'Orca Lunch: `leaderboard.sql`, `protect-and-stats.sql`, `daily.sql`), així que no cal executar res.

- Rànquing general: `poker-v1`. Canvia la versió a `src/leaderboard/config.ts` quan canviï la puntuació, per començar una classificació nova.
- Repte del dia: `poker-v1-d20261021`. Una sola puntuació per jugador i només el dia del repte o l'endemà (ho imposa la base de dades).
- Límits de la base de dades: noms de la llista `banned-words.txt`, puntuacions d'1 a 400.000, 100 s entre dues puntuacions d'un mateix jugador i 60 al dia.
- Moderació: posa `hidden = true` a la fila (Table editor) per treure-la de la classificació.

Per fer servir un projecte propi, crea'l, executa-hi els tres SQL d'Orca Lunch i posa `VITE_LEADERBOARD_URL` i `VITE_LEADERBOARD_KEY` al build (o canvia `src/leaderboard/config.ts`).

`banned-words.txt` és una còpia de la d'Orca Lunch: si s'hi afegeixen paraules, cal fer-ho també a la base de dades.
