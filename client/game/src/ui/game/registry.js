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
  },
  106: {
    name: 'line-dashed',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [0, 6], bottom: [0, 6], sides: [0, 6] }
  },
  107: {
    name: 'line-solid',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [1, 6], bottom: [1, 6], sides: [1, 6] }
  },
  108: {
    name: 'line-double-solid',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [2, 6], bottom: [2, 6], sides: [2, 6] }
  },
  109: {
    name: 'line-sidewalk-2',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [3, 6], bottom: [3, 6], sides: [3, 6] }
  },
  110: {
    name: 'line-sidewalk-4',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [4, 6], bottom: [4, 6], sides: [4, 6] }
  },
  111: {
    name: 'line-edge-1-dashed',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [5, 6], bottom: [5, 6], sides: [5, 6] }
  },
  112: {
    name: 'line-edge-2-dashed',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [6, 6], bottom: [6, 6], sides: [6, 6] }
  },
  113: {
    name: 'line-double-dashed-solid',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [7, 6], bottom: [7, 6], sides: [7, 6] }
  },
  114: {
    name: 'line-corner-3-dashed',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [8, 6], bottom: [8, 6], sides: [8, 6] }
  },
  115: {
    name: 'line-t-dashed',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [9, 6], bottom: [9, 6], sides: [9, 6] }
  },
  116: {
    name: 'line-split-1',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [10, 6], bottom: [10, 6], sides: [10, 6] }
  },
  117: {
    name: 'line-split-2',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [11, 6], bottom: [11, 6], sides: [11, 6] }
  },
  118: {
    name: 'line-t-1',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [12, 6], bottom: [12, 6], sides: [12, 6] }
  },
  119: {
    name: 'line-t-2',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [13, 6], bottom: [13, 6], sides: [13, 6] }
  },
  120: {
    name: 'line-x',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [14, 6], bottom: [14, 6], sides: [14, 6] }
  },
  121: {
    name: 'line-corner-1',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [15, 6], bottom: [15, 6], sides: [15, 6] }
  },
  122: {
    name: 'line-corner-2',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [16, 6], bottom: [16, 6], sides: [16, 6] }
  },
  123: {
    name: 'line-corner-3',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [17, 6], bottom: [17, 6], sides: [17, 6] }
  },
  124: {
    name: 'line-corner-4',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [18, 6], bottom: [18, 6], sides: [18, 6] }
  },
  125: {
    name: 'line-corner-5',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [19, 6], bottom: [19, 6], sides: [19, 6] }
  },
  126: {
    name: 'line-edge-1',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [20, 6], bottom: [20, 6], sides: [20, 6] }
  },
  127: {
    name: 'line-edge-2',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [21, 6], bottom: [21, 6], sides: [21, 6] }
  },
  128: {
    name: 'line-edge-end-1',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [22, 6], bottom: [22, 6], sides: [22, 6] }
  },
  129: {
    name: 'line-edge-end-2',
    type: 'block',
    shape: 'decal',
    solid: false,
    faces: { top: [23, 6], bottom: [23, 6], sides: [23, 6] }
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
  'wooden-door-1': {
    name: 'Wooden Door 1',
    useMeshUV: true,
    customTexture: 'assets/tiles/base/interactable/wooden-door-1.png',
    collisionHeight: 2
  },
  'wooden-door-2': {
    name: 'Wooden Door 2',
    useMeshUV: true,
    customTexture: 'assets/tiles/base/interactable/wooden-door-2.png',
    collisionHeight: 2
  },
  'neon-sign-1': { name: 'Neon Sign 1' },
  'neon-sign-2': { name: 'Neon Sign 2' },
  'arcade-box-1': {
    name: 'Arcade Cabinet',
    customTexture: 'assets/tiles/base/industrial/arcade-box.png',
    collisionHeight: 3,
    useMeshUV: true,
    screenUVs: { x: 8, y: 8, w: 48, h: 48 }
  }
};

export const POWERSET_REGISTRY = {};

export const POWER_REGISTRY = {
  'flashlight': { name: 'Flashlight', type: 'toggle', description: 'Illuminate your surroundings.' },
  'teleport': { name: 'Teleport', description: 'Teleport to a target location.', stats: { energyCost: 30, rechargeRate: 2.0 } }
};
export const EFFECT_REGISTRY = {};
