import type { Theme } from './types';

export const OCEAN_THEME: Theme = {
  id: 'ocean',
  worldName: 'Oceà',
  background: { from: '#30C7D8', to: '#083B66' },
  levels: [
    { id: 'plankton', name: 'Plàncton', definite: 'el plàncton', color: '#9BE3A8', sprite: 'ocean/plankton' },
    { id: 'sardine', name: 'Sardina', definite: 'la sardina', color: '#B8ECF5', sprite: 'ocean/sardine' },
    { id: 'tuna', name: 'Tonyina', definite: 'la tonyina', color: '#087FBD', sprite: 'ocean/tuna' },
    { id: 'shark', name: 'Tauró', definite: 'el tauró', color: '#7A8C99', sprite: 'ocean/shark' },
    { id: 'orca', name: 'Orca', definite: "l'orca", color: '#1B2A3A', sprite: 'ocean/orca' },
  ],
  wild: { id: 'octopus', name: 'Pop', color: '#E86A92', sprite: 'ocean/octopus' },
};
