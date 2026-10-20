// Placeholder art: four original, simple animals facing right, with big eyes.
// Each has a distinct silhouette (slim / round / finned / tall fin) and colour.
import type { SpriteProps } from './spriteRegistry';

const OUTLINE = '#062A4A';
const STROKE = { stroke: OUTLINE, strokeWidth: 3, strokeLinejoin: 'round' as const };

function Eye({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#FFFFFF" {...STROKE} strokeWidth={2.5} />
      <circle cx={x + r * 0.2} cy={y + r * 0.1} r={r * 0.55} fill={OUTLINE} />
      <circle cx={x + r * 0.4} cy={y - r * 0.2} r={r * 0.2} fill="#FFFFFF" />
    </g>
  );
}

export function Sardine({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <path d="M14 36 L30 50 L14 64 Z" fill={color} {...STROKE} />
      <ellipse cx="54" cy="50" rx="32" ry="15" fill={color} {...STROKE} />
      <path d="M30 52 Q54 58 80 52" fill="none" stroke="#5FB8CC" strokeWidth="3" strokeLinecap="round" />
      <Eye x={70} y={46} r={10} />
    </svg>
  );
}

export function Tuna({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <path d="M8 28 L26 50 L8 72 L18 50 Z" fill={color} {...STROKE} />
      <path d="M44 30 L54 16 L60 31 Z" fill="#FFD34E" {...STROKE} strokeWidth={2.5} />
      <path d="M44 70 L52 82 L58 69 Z" fill="#FFD34E" {...STROKE} strokeWidth={2.5} />
      <ellipse cx="54" cy="50" rx="34" ry="23" fill={color} {...STROKE} />
      <path d="M28 56 Q54 72 84 56 Q60 68 28 56 Z" fill="#CFEFFF" />
      <Eye x={68} y={44} r={11} />
    </svg>
  );
}

export function Shark({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <path d="M6 30 L24 52 L8 74 L20 52 Z" fill={color} {...STROKE} />
      <path d="M40 38 L52 8 L64 38 Z" fill={color} {...STROKE} />
      <path d="M18 54 Q40 30 72 36 Q92 42 96 56 Q84 72 54 72 Q30 72 18 54 Z" fill={color} {...STROKE} />
      <path d="M40 66 Q66 74 90 60 Q80 70 56 72 Q44 72 40 66 Z" fill="#FFFFFF" />
      <path d="M74 62 L78 66 L81 61 L84 65 L87 60" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 48 L46 58 M54 48 L52 58" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
      <Eye x={74} y={47} r={9} />
    </svg>
  );
}

export function Orca({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <path d="M4 38 Q16 48 20 56 Q10 66 6 76 Q22 70 28 60 Z" fill={color} {...STROKE} />
      <path d="M38 34 Q42 4 54 6 Q50 20 58 34 Z" fill={color} {...STROKE} />
      <path d="M20 58 Q24 30 58 30 Q94 30 94 58 Q94 80 58 80 Q26 80 20 58 Z" fill={color} {...STROKE} />
      <path d="M36 72 Q60 86 88 66 Q86 78 58 80 Q42 80 36 72 Z" fill="#FFFFFF" />
      <ellipse cx="68" cy="44" rx="15" ry="11" fill="#FFFFFF" />
      <Eye x={70} y={46} r={11} />
    </svg>
  );
}

export function Octopus({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      {[22, 36, 50, 64, 78].map((x, i) => (
        <path
          key={x}
          d={`M${x} 58 Q${x + (i % 2 ? 6 : -6)} 74 ${x + (i % 2 ? -2 : 2)} 88`}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
        />
      ))}
      <path d="M18 56 Q16 14 50 12 Q84 14 82 56 Q50 66 18 56 Z" fill={color} {...STROKE} />
      <circle cx="30" cy="34" r="3" fill="#FFFFFF" opacity="0.6" />
      <Eye x={39} y={40} r={10} />
      <Eye x={61} y={40} r={10} />
      <path d="M44 54 Q50 58 56 54" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Whirlpool({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill={color} opacity="0.35" />
      <path
        d="M50 50 m0 -4 a4 4 0 1 1 -4 4 a9 9 0 0 1 9 -9 a14 14 0 0 1 14 14 a19 19 0 0 1 -19 19 a24 24 0 0 1 -24 -24 a29 29 0 0 1 29 -29 a34 34 0 0 1 34 34"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M50 50 m0 -4 a4 4 0 1 1 -4 4 a9 9 0 0 1 9 -9 a14 14 0 0 1 14 14 a19 19 0 0 1 -19 19 a24 24 0 0 1 -24 -24 a29 29 0 0 1 29 -29 a34 34 0 0 1 34 34"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Plankton({ color }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <circle cx="24" cy="30" r="7" fill={color} {...STROKE} strokeWidth={2.5} />
      <circle cx="78" cy="26" r="5" fill={color} {...STROKE} strokeWidth={2.5} />
      <circle cx="80" cy="74" r="6" fill={color} {...STROKE} strokeWidth={2.5} />
      <circle cx="20" cy="72" r="4" fill={color} {...STROKE} strokeWidth={2.5} />
      <path d="M50 22 L50 30 M30 50 L38 50 M70 50 L62 50 M50 78 L50 70" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="20" fill={color} {...STROKE} />
      <Eye x={43} y={48} r={7} />
      <Eye x={58} y={48} r={7} />
    </svg>
  );
}
