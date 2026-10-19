// Maps a theme's sprite keys to drawing functions. Real art replaces entries here.
import type { ReactNode } from 'react';
import { Octopus, Orca, Plankton, Sardine, Shark, Tuna } from './placeholders';

export interface SpriteProps {
  readonly color: string;
}

type Sprite = (props: SpriteProps) => ReactNode;

const REGISTRY: Readonly<Record<string, Sprite>> = {
  'ocean/plankton': Plankton,
  'ocean/sardine': Sardine,
  'ocean/tuna': Tuna,
  'ocean/shark': Shark,
  'ocean/orca': Orca,
  'ocean/octopus': Octopus,
};

export function hasSprite(key: string): boolean {
  return key in REGISTRY;
}

/** Draws the sprite registered under `key` (sprites are plain drawing functions, no hooks). */
export function renderSprite(key: string, props: SpriteProps): ReactNode {
  const sprite = REGISTRY[key];
  if (!sprite) throw new Error(`No sprite registered for "${key}"`);
  return sprite(props);
}
