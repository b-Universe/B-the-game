export const BLOCK_REGISTRY = {
  'water': {
    isSolid: false,
    isFluid: true
  },
  'water_flow': {
    isSolid: false,
    isFluid: true
  },
  'lava': {
    isSolid: false,
    isFluid: true,
    damagePerSecond: 150
  },
  'acid': {
    isSolid: false,
    isFluid: true,
    damagePerSecond: 50
  },
  'mud': {
    isSolid: true,
    isFluid: false,
    speedMultiplier: 0.5 // Slows movement by 50%
  },
  'ice': {
    isSolid: true,
    isFluid: false,
    slipperiness: 0.95 // Momentum retention factor
  },
  'block-lamp-on': {
    isSolid: true,
    isFluid: false
  },
  'clear_stained_glass_edges': {
    isSolid: true,
    isFluid: false
  },
  'clear_stained_glass_edgeless': {
    isSolid: true,
    isFluid: false
  },
  'block-lamp-on-3': {
    isSolid: true,
    isFluid: false
  },
  'block-lamp-on-2': {
    isSolid: true,
    isFluid: false
  },
  'block-lamp-on-1': {
    isSolid: true,
    isFluid: false
  },
  'block-lamp-on-0': {
    isSolid: true,
    isFluid: false
  },
  'light_block': {
    isSolid: false,
    isFluid: false
  },
  'arcade-carpet': {
    isSolid: true,
    isFluid: false
  },
  'carpet': {
    isSolid: true,
    isFluid: false
  },
  'concrete': {
    isSolid: true,
    isFluid: false
  },
  'paint': {
    isSolid: true,
    isFluid: false
  },
  'air': {
    isSolid: false,
    isFluid: false
  }
  // Any block not explicitly defined here will fallback to the defaults below.
};

/**
 * Returns the physical properties for a given texture name.
 */
export function getBlockProps(textureName) {
  if (!textureName) return { isSolid: true, isFluid: false };
  return BLOCK_REGISTRY[textureName] || { isSolid: true, isFluid: false };
}
