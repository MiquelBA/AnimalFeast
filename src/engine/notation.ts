// Text notation for boards, shared by tests and the debug panel.
// Rows top to bottom, separated by "/" or newlines; cells by spaces: "O O O / S S S / S T R3".
// Letters are tiers: S = 1, T = 2, R = 3, O = 4 (Ocean names); an optional number is the energy.
// Boards may be rectangular.
import type { Animal, Board, Cell, Tier } from './types';

export const TIER_LETTERS: readonly string[] = ['S', 'T', 'R', 'O'];

const TOKEN = /^([A-Z])(\d*)$/;

export function parseBoard(text: string, firstId = 1): Board {
  const lines = text.split(/[/\n]/).map((l) => l.trim()).filter(Boolean);
  const grid = lines.map((l) => l.split(/\s+/));
  if (grid.some((row) => row.length !== grid[0].length)) throw new Error('All board rows must have the same length');
  let id = firstId;
  return grid.map((row, r) =>
    row.map((token, c): Cell => {
      if (token === '.') return null;
      const m = TOKEN.exec(token);
      const index = m ? TIER_LETTERS.indexOf(m[1]) : -1;
      if (!m || index < 0) throw new Error(`Bad cell token "${token}" at (${r},${c})`);
      return { id: id++, tier: index + 1, energy: m[2] ? Number(m[2]) : 0 };
    }),
  );
}

export function parseTiers(text: string): Tier[] {
  return text.split(/[\s,]+/).filter(Boolean).map((l) => {
    const index = TIER_LETTERS.indexOf(l);
    if (index < 0) throw new Error(`Bad tier letter "${l}"`);
    return index + 1;
  });
}

export function animalToken(a: Animal): string {
  return (TIER_LETTERS[a.tier - 1] ?? String(a.tier)) + (a.energy ? String(a.energy) : '');
}

export function boardToString(board: Board): string {
  return board.map((row) => row.map((a) => (a ? animalToken(a) : '.')).join(' ')).join(' / ');
}
