// Worker thread: plays a batch of games and posts the traces back.
import { parentPort, workerData } from 'node:worker_threads';
import type { GameConfig } from '../engine/types';
import type { BotName, BotOptions } from './bots';
import { playGame } from './run';

export interface Job {
  readonly id: number;
  readonly config: GameConfig;
  readonly bot: BotName;
  readonly seeds: readonly number[];
  readonly moves: number;
  readonly botOptions: BotOptions;
}

const jobs = workerData as Job[];
for (const job of jobs) {
  const traces = job.seeds.map((seed) => playGame(job.config, job.bot, seed, job.moves, job.botOptions));
  parentPort!.postMessage({ id: job.id, traces });
}
