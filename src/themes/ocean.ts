import type { Theme } from './types';

export const OCEAN_THEME: Theme = {
  id: 'ocean',
  worldName: 'Oceà',
  background: { from: '#30C7D8', to: '#083B66' },
  levels: [
    { tier: 1, id: 'sardine', name: 'Sardina', color: '#B8ECF5', sprite: 'ocean/sardine' },
    { tier: 2, id: 'tuna', name: 'Tonyina', color: '#087FBD', sprite: 'ocean/tuna' },
    { tier: 3, id: 'shark', name: 'Tauró', color: '#7A8C99', sprite: 'ocean/shark' },
    { tier: 4, id: 'orca', name: 'Orca', color: '#1B2A3A', sprite: 'ocean/orca' },
  ],
};
