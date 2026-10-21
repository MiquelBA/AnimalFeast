// Which names can go on the public ranking. The same list and normalisation run in the database
// (supabase/protect-and-stats.sql), so a name that passes here passes there.
import bannedList from '../../supabase/banned-words.txt?raw';

const BANNED = bannedList.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

const LEET: Readonly<Record<string, string>> = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

/** Lowercase, no accents, digits and symbols read as letters, only letters kept. */
export function normalizeName(raw: string): string {
  return [...raw.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')]
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .replace(/[^a-z]/g, '');
}

export function nameIsClean(raw: string): boolean {
  const name = normalizeName(raw);
  return !BANNED.some((word) => name.includes(word));
}
