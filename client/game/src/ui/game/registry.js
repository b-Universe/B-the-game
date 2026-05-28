export const BlockRegistry = {
  1: {
    name: 'grass',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [0, 0], bottom: [1, 0], sides: [1, 0] }
  },
  2: {
    name: 'dirt',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [1, 0], bottom: [1, 0], sides: [1, 0] }
  },
  3: {
    name: 'stone',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [2, 0], bottom: [2, 0], sides: [2, 0] }
  },
  4: {
    name: 'mud',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [2, 1], bottom: [2, 1], sides: [2, 1] }
  },
  5: {
    name: 'ice',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [1, 2], bottom: [1, 2], sides: [1, 2] }
  },
  6: {
    name: 'stone-bricks',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [0, 4], bottom: [0, 4], sides: [0, 4] }
  },
  7: {
    name: 'wood-planks',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [0, 5], bottom: [0, 5], sides: [0, 5] }
  },
  8: {
    name: 'wood-stripped',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [1, 5], bottom: [1, 5], sides: [1, 5] }
  },
  15: {
    name: 'wood-door-bottom',
    type: 'block',
    shape: 'door',
    solid: true,
    faces: { top: [0, 6], bottom: [0, 6], sides: [0, 6] }
  },
  16: {
    name: 'wood-door-top',
    type: 'block',
    shape: 'door',
    solid: true,
    faces: { top: [1, 6], bottom: [1, 6], sides: [1, 6] }
  },
  42: {
    name: 'water',
    type: 'fluid',
    shape: 'cube',
    solid: false,
    animated: true,
    frametime: 100,
    faces: { top: [3, 0], bottom: [3, 0], sides: [3, 0] }
  },
  43: {
    name: 'lava',
    type: 'fluid',
    shape: 'cube',
    solid: false,
    animated: true,
    frametime: 100,
    faces: { top: [2, 3], bottom: [2, 3], sides: [2, 3] }
  },
  44: {
    name: 'acid',
    type: 'fluid',
    shape: 'cube',
    solid: false,
    animated: true,
    frametime: 100,
    faces: { top: [3, 2], bottom: [3, 2], sides: [3, 2] }
  },
  45: {
    name: 'block-lamp-on',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [4, 0], bottom: [4, 0], sides: [4, 0] }
  },
  46: {
    name: 'block-lamp-on-3',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [4, 0], bottom: [4, 0], sides: [4, 0] }
  },
  47: {
    name: 'block-lamp-on-2',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [4, 0], bottom: [4, 0], sides: [4, 0] }
  },
  48: {
    name: 'block-lamp-on-1',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [4, 0], bottom: [4, 0], sides: [4, 0] }
  },
  49: {
    name: 'block-lamp-on-0',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [4, 0], bottom: [4, 0], sides: [4, 0] }
  },
  50: {
    name: 'light_block',
    type: 'block',
    shape: 'cube',
    solid: false,
    faces: { top: [0, 1], bottom: [0, 1], sides: [0, 1] }
  },
  51: {
    name: 'arcade-carpet',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [2, 5], bottom: [2, 5], sides: [2, 5] }
  },
  52: {
    name: 'carpet',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [3, 5], bottom: [3, 5], sides: [3, 5] }
  },
  53: {
    name: 'concrete',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [4, 5], bottom: [4, 5], sides: [4, 5] }
  },
  54: {
    name: 'paint',
    type: 'block',
    shape: 'cube',
    solid: true,
    faces: { top: [5, 5], bottom: [5, 5], sides: [5, 5] }
  },
  105: {
    name: 'dandelion',
    type: 'decor',
    shape: 'decor',
    solid: false,
    faces: { top: [0, 3], bottom: [0, 3], sides: [0, 3] }
  }
};

export const FURNITURE_REGISTRY = {
  'wood-bookshelf-small': { name: 'Small Wood Bookhelf' },
  'wood-bookshelf-tall': { name: 'Tall Wood Bookhelf' },
  'wood-chair': { name: 'Wood Chair' },
  'wood-bench-small': { name: 'Small Bench' },
  'wood-bench-medium': { name: 'Medium Bench' },
  'wood-bench-large': { name: 'Large Bench' },
  'wood-table-2x2': { name: '2x2 Wood Table' },
  'wood-table-3x3': { name: '3x3 Wood Table' },
  'plant-pot-small': { name: 'Small Plant Pot' },
  'plant-pot-medium': { name: 'Medium Plant Pot' },
  'neon-sign-1': { name: 'Neon Sign 1' },
  'neon-sign-2': { name: 'Neon Sign 2' }
};

export const POWERSET_REGISTRY = {};

export const POWER_REGISTRY = {
  'flashlight': { name: 'Flashlight', type: 'toggle', description: 'Illuminate your surroundings.' },
  'teleport': { name: 'Teleport', description: 'Teleport to a target location.', stats: { energyCost: 30, rechargeRate: 2.0 } }
};
export const EFFECT_REGISTRY = {};
