// Text notation for boards, shared by tests and the debug panel.
// Rows separated by "/", cells by spaces: "O . . / S R3 . / . . .".
// Letters: S sardine, T tuna, R shark, O orca; optional number = energy; "." = empty.
// Missing rows/columns are filled with empty cells up to boardSize.
import type { Animal, Board, Cell, Species } from './types';

export const SPECIES_LETTER: Readonly<Record<Species, string>> = { SARDINE: 'S', TUNA: 'T', SHARK: 'R', ORCA: 'O' };

const LETTER_SPECIES: Readonly<Record<string, Species>> = Object.fromEntries(
  Object.entries(SPECIES_LETTER).map(([s, l]) => [l, s as Species]),
);

const TOKEN = /^([A-Z])(\d*)$/;

export function parseBoard(text: string, size: number, firstId = 1): Board {
  const rows = text.trim() ? text.trim().split('/').map((r) => r.trim().split(/\s+/).filter(Boolean)) : [];
  if (rows.length > size || rows.some((r) => r.length > size)) throw new Error(`Board text exceeds ${size}x${size}`);
  let id = firstId;
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c): Cell => {
      const token = rows[r]?.[c] ?? '.';
      if (token === '.') return null;
      const m = TOKEN.exec(token);
      const species = m && LETTER_SPECIES[m[1]];
      if (!m || !species) throw new Error(`Bad cell token "${token}" at (${r},${c})`);
      return { id: id++, species, energy: m[2] ? Number(m[2]) : 0 };
    }),
  );
}

export function animalToken(a: Animal): string {
  return SPECIES_LETTER[a.species] + (a.energy ? String(a.energy) : '');
}

export function boardToString(board: Board): string {
  return board.map((row) => row.map((a) => (a ? animalToken(a) : '.')).join(' ')).join(' / ');
}
