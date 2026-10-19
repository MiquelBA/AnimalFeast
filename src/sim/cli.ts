// npm run sim -- [--games=200] [--variants=base,thr9] [--bots=random,greedy] [--spm=2.5,3.5,5]
//                [--moves=30,50] [--animMs=600] [--workers=4] [--energyWeight=1]
//                [--spawnWeights=30,28,24,18] [--timeBonus=2000] [--<any GameConfig key>=value]
// Plays every variant × bot, prints a table and writes sim-results/<timestamp>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { DEFAULT_CONFIG, type ConfigOverrides } from '../engine/config';
import type { GameConfig } from '../engine/types';
import { BOT_NAMES, DEFAULT_BOT_OPTIONS, type BotName } from './bots';
import { botMetrics, type BotMetrics } from './metrics';
import type { GameTrace } from './run';
import { VARIANTS, variantConfig, withSpawnWeights } from '../engine/variants';
import type { Job } from './worker';

const SIM_KEYS = new Set(['games', 'variants', 'bots', 'spm', 'moves', 'animMs', 'workers', 'energyWeight', 'spawnWeights', 'timeBonus', 'out']);

function parseArgs(argv: readonly string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) throw new Error(`Bad argument "${a}" (use --key=value)`);
    args.set(m[1], m[2] ?? 'true');
  }
  return args;
}

const numbers = (s: string) => s.split(',').map(Number);

/** Any other --key=value is a GameConfig override, parsed by the type of its default value. */
function configOverrides(args: Map<string, string>): ConfigOverrides {
  const o: Record<string, unknown> = {};
  for (const [key, raw] of args) {
    if (SIM_KEYS.has(key)) continue;
    if (!(key in DEFAULT_CONFIG)) throw new Error(`Unknown option --${key}`);
    const current = (DEFAULT_CONFIG as unknown as Record<string, unknown>)[key];
    if (typeof current === 'number') o[key] = Number(raw);
    else if (typeof current === 'boolean') o[key] = raw === 'true';
    else if (Array.isArray(current)) o[key] = numbers(raw);
    else if (typeof current === 'string') o[key] = raw;
    else o[key] = JSON.parse(raw);
  }
  if (args.has('spawnWeights')) Object.assign(o, withSpawnWeights(numbers(args.get('spawnWeights')!)));
  if (args.has('timeBonus')) o.timeBonusMs = { frenzy: Number(args.get('timeBonus')) };
  return o as ConfigOverrides;
}

async function runJobs(jobs: Job[], workers: number): Promise<Map<number, GameTrace[]>> {
  const results = new Map<number, GameTrace[]>();
  const batches: Job[][] = Array.from({ length: workers }, () => []);
  jobs.forEach((j, i) => batches[i % workers].push(j));
  await Promise.all(
    batches.filter((b) => b.length).map(
      (batch) =>
        new Promise<void>((resolve, reject) => {
          const w = new Worker(new URL('./worker-entry.mjs', import.meta.url), { workerData: batch });
          w.on('message', (m: { id: number; traces: GameTrace[] }) => results.set(m.id, m.traces));
          w.on('error', reject);
          w.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Worker exited with ${code}`))));
        }),
    ),
  );
  return results;
}

const f0 = (x: number) => x.toFixed(0);
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);

interface VariantResult {
  readonly name: string;
  readonly label: string;
  readonly config: GameConfig;
  readonly bots: Partial<Record<BotName, BotMetrics>>;
  readonly ratios: { greedyVsRandom: number | null; frenzyVsGreedy: number | null };
  readonly targets: Record<string, { value: string; ok: boolean }>;
}

function ratio(a: number | undefined, b: number | undefined): number | null {
  return a !== undefined && b !== undefined && b > 0 ? a / b : null;
}

async function main() {
  const t0 = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const games = Number(args.get('games') ?? 200);
  const variantNames = (args.get('variants') ?? Object.keys(VARIANTS).join(',')).split(',');
  const bots = (args.get('bots') ?? BOT_NAMES.join(',')).split(',') as BotName[];
  const spm = numbers(args.get('spm') ?? '2.5,3.5,5');
  const movesModes = numbers(args.get('moves') ?? '30,50');
  const animMs = Number(args.get('animMs') ?? 600);
  const workers = Number(args.get('workers') ?? Math.max(1, cpus().length));
  const botOptions = { ...DEFAULT_BOT_OPTIONS, energyWeight: Number(args.get('energyWeight') ?? DEFAULT_BOT_OPTIONS.energyWeight) };
  const extra = configOverrides(args);
  for (const b of bots) if (!BOT_NAMES.includes(b)) throw new Error(`Unknown bot "${b}"`);

  const configs = variantNames.map((v) => variantConfig(v, extra));
  // Enough moves for the longest time-mode game and the longest moves-mode game.
  const traceMoves = configs.map((c) => Math.max(...movesModes, Math.ceil((c.durationMs + Math.min(c.maxTimeBonusMs, 600_000)) / (Math.min(...spm) * 1000))));
  const seeds = Array.from({ length: games }, (_, i) => i + 1);
  const jobs: Job[] = [];
  configs.forEach((config, vi) => bots.forEach((bot) => {
    // Split each variant × bot into chunks so workers stay busy.
    const chunk = Math.ceil(games / workers);
    for (let s = 0; s < games; s += chunk) {
      jobs.push({ id: jobs.length, config, bot, seeds: seeds.slice(s, s + chunk), moves: Math.min(traceMoves[vi], 400), botOptions });
    }
  }));
  const traces = await runJobs(jobs, workers);

  const results: VariantResult[] = configs.map((config, vi) => {
    const name = variantNames[vi];
    const metrics: Partial<Record<BotName, BotMetrics>> = {};
    for (const bot of bots) {
      const all = jobs.filter((j) => j.config === config && j.bot === bot).flatMap((j) => traces.get(j.id)!);
      metrics[bot] = botMetrics(all, config, { movesModes, spm, animMs });
    }
    const t35 = (b: BotName) => metrics[b]?.timeMode.find((t) => t.secondsPerMove === 3.5) ?? metrics[b]?.timeMode[0];
    const greedyVsRandom = ratio(t35('greedy')?.score.mean, t35('random')?.score.mean);
    const frenzyVsGreedy = ratio(t35('greedy+frenzy')?.score.mean, t35('greedy')?.score.mean);
    const g = metrics.greedy ?? metrics[bots[0]]!;
    const gt = t35(bots.includes('greedy') ? 'greedy' : bots[0])!;
    const share = Object.values(g.topTierPctByMove);
    const drift = Math.max(...share) - Math.min(...share);
    const targets: VariantResult['targets'] = {
      'mín. cadenes ≥ 3': { value: f0(g.chainsAvailable.min), ok: g.chainsAvailable.min >= 3 },
      'cadena de 4 possible 30–60%': { value: `${f0(g.chain4AvailablePct)}%`, ok: g.chain4AvailablePct >= 30 && g.chain4AvailablePct <= 60 },
      'remenats < 1%': { value: `${f2(g.shufflePct)}%`, ok: g.shufflePct < 1 },
      'orques estables (±3 punts)': { value: `${share.map(f0).join('→')}%`, ok: drift <= 3 },
      'frenesís greedy 1–3': { value: f1(gt.frenziesPerGame.mean), ok: gt.frenziesPerGame.mean >= 1 && gt.frenziesPerGame.mean <= 3 },
      'p90 durada real ≤ 160 s': { value: `${f0(gt.realSeconds.p90)} s`, ok: gt.realSeconds.p90 <= 160 },
      'greedy/random ≥ 1,3': { value: greedyVsRandom === null ? '—' : f2(greedyVsRandom), ok: (greedyVsRandom ?? 0) >= 1.3 },
      'greedy+frenzy/greedy ≥ 1,2': { value: frenzyVsGreedy === null ? '—' : f2(frenzyVsGreedy), ok: (frenzyVsGreedy ?? 0) >= 1.2 },
    };
    return { name, label: VARIANTS[name].label, config, bots: metrics, ratios: { greedyVsRandom, frenzyVsGreedy }, targets };
  });

  // Console report.
  console.log(`\nANIMAL FEAST — simulació: ${games} partides per bot i variant, ${spm.join(' / ')} s per jugada, ${animMs} ms d'animació per jugada\n`);
  for (const r of results) {
    console.log(`■ ${r.name}: ${r.label}`);
    const rows: Record<string, Record<string, string>> = {};
    for (const bot of bots) {
      const m = r.bots[bot]!;
      const row: Record<string, string> = {
        'cadenes/tauler (mitj · mín · p10)': `${f1(m.chainsAvailable.mean)} · ${m.chainsAvailable.min} · ${m.chainsAvailable.p10}`,
        'tauler amb c4 possible': `${f0(m.chain4AvailablePct)}%`,
        'remenats': `${f2(m.shufflePct)}%`,
        'orques % (0→10→…)': Object.values(m.topTierPctByMove).map(f0).join('→'),
      };
      for (const n of movesModes) {
        const mm = m.movesMode[n];
        row[`${n} jug: punts · pts/jug · c4 · frenesís`] = `${f0(mm.score.mean)} · ${f0(mm.pointsPerMove)} · ${f1(mm.chain4PerGame)} · ${f1(mm.frenziesPerGame.mean)}`;
      }
      for (const t of m.timeMode) {
        row[`${t.secondsPerMove} s: punts · jug · c4 · frenesís · real med/p90`] =
          `${f0(t.score.mean)} · ${f0(t.moves.median)} · ${f1(t.chain4PerGame)} · ${f1(t.frenziesPerGame.mean)} · ${f0(t.realSeconds.median)}/${f0(t.realSeconds.p90)} s`;
      }
      rows[bot] = row;
    }
    console.table(rows);
    console.log('  Objectius:', Object.entries(r.targets).map(([k, v]) => `${v.ok ? '✓' : '✗'} ${k}: ${v.value}`).join(' | '), '\n');
  }
  console.log('Resum d\'objectius (bot greedy, 3,5 s per jugada):');
  console.table(Object.fromEntries(results.map((r) => [r.name, Object.fromEntries(Object.entries(r.targets).map(([k, v]) => [k, `${v.ok ? '✓' : '✗'} ${v.value}`]))])));

  const outDir = args.get('out') ?? 'sim-results';
  mkdirSync(outDir, { recursive: true });
  const file = `${outDir}/sim-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify({ args: Object.fromEntries(args), games, spm, movesModes, animMs, botOptions, results }, null, 2));
  console.log(`\nJSON: ${file} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
