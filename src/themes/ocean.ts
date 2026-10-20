import type { Theme } from './types';

export const OCEAN_THEME: Theme = {
  id: 'ocean',
  worldName: 'Oceà',
  palette: { lagoon: '#30C7D8', sea: '#087FBD', deep: '#083B66', foam: '#B8ECF5', ink: '#062A4A' },
  levels: [
    { id: 'plankton', name: 'Plàncton', definite: 'el plàncton', color: '#8BD630', sprite: 'ocean/plankton' },
    { id: 'sardine', name: 'Sardina', definite: 'la sardina', color: '#5CCBF5', sprite: 'ocean/sardine' },
    { id: 'tuna', name: 'Tonyina', definite: 'la tonyina', color: '#FFC531', sprite: 'ocean/tuna' },
    { id: 'shark', name: 'Tauró', definite: 'el tauró', color: '#BCC6CE', sprite: 'ocean/shark' },
    { id: 'orca', name: 'Orca', definite: "l'orca", color: '#1B2A3A', sprite: 'ocean/orca' },
  ],
  wild: { id: 'octopus', name: 'Pop', color: '#FF6FA8', sprite: 'ocean/octopus' },
  whirl: { id: 'whirlpool', name: 'Remolí', color: '#5FD3E6', sprite: 'ocean/whirlpool' },
};
