// Text notation for boards, shared by tests and the debug panel.
// Rows top to bottom, separated by "/" or newlines; cells by spaces: "O O O / S S S / S T R3".
// Letters are ocean species, top-anchored: with 4 tiers S = 1, T = 2, R = 3, O = 4; with 5 tiers
// K (plankton) = 1 and the rest move up one. "*" after the letter marks a golden
// animal and an optional number is the energy ("R*6"). P is the wildcard octopus, W a whirlpool. Boards may be rectangular.
import { makeAnimal } from './board';
import type { Animal, Board, Cell, SpawnSpec } from './types';

/** Lowest species first; a game with n tiers uses the last n letters. */
export const SPECIES_LETTERS: readonly string[] = ['K', 'S', 'T', 'R', 'O'];
const DEFAULT_TIER_COUNT = 4;

function letters(tierCount: number): readonly string[] {
  return SPECIES_LETTERS.slice(SPECIES_LETTERS.length - tierCount);
}
export const WILD_LETTER = 'P';
export const WHIRL_LETTER = 'W';

const TOKEN = /^([A-Z])(\*?)(\d*)$/;

function parseSpec(token: string, tierCount: number): { spec: SpawnSpec; energy: number } | null {
  const m = TOKEN.exec(token);
  if (!m) return null;
  if (m[1] === WHIRL_LETTER) return m[2] || m[3] ? null : { spec: { tier: 0, wild: true, whirl: true }, energy: 0 };
  if (m[1] === WILD_LETTER) return m[2] || m[3] ? null : { spec: { tier: 0, wild: true }, energy: 0 };
  const index = letters(tierCount).indexOf(m[1]);
  if (index < 0) return null;
  return { spec: { tier: index + 1, golden: m[2] === '*' }, energy: m[3] ? Number(m[3]) : 0 };
}

export function parseBoard(text: string, firstId = 1, tierCount = DEFAULT_TIER_COUNT): Board {
  const lines = text.split(/[/\n]/).map((l) => l.trim()).filter(Boolean);
  const grid = lines.map((l) => l.split(/\s+/));
  if (grid.some((row) => row.length !== grid[0].length)) throw new Error('All board rows must have the same length');
  let id = firstId;
  return grid.map((row, r) =>
    row.map((token, c): Cell => {
      if (token === '.') return null;
      const parsed = parseSpec(token, tierCount);
      if (!parsed) throw new Error(`Bad cell token "${token}" at (${r},${c})`);
      return makeAnimal(id++, parsed.spec, parsed.energy);
    }),
  );
}

/** A spawn queue: "S T R*" (golden shark), "P" (octopus). */
export function parseTiers(text: string, tierCount = DEFAULT_TIER_COUNT): SpawnSpec[] {
  return text.split(/[\s,]+/).filter(Boolean).map((l) => {
    const parsed = parseSpec(l, tierCount);
    if (!parsed || parsed.energy) throw new Error(`Bad spawn token "${l}"`);
    return parsed.spec;
  });
}

export function animalToken(a: Animal, tierCount = DEFAULT_TIER_COUNT): string {
  if (a.whirl) return WHIRL_LETTER;
  if (a.wild) return WILD_LETTER;
  return (letters(tierCount)[a.tier - 1] ?? String(a.tier)) + (a.golden ? '*' : '') + (a.energy ? String(a.energy) : '');
}

export function boardToString(board: Board, tierCount = DEFAULT_TIER_COUNT): string {
  return board.map((row) => row.map((a) => (a ? animalToken(a, tierCount) : '.')).join(' ')).join(' / ');
}
