module.exports = {
  serverPowersetsData: { Melee: [], Ranged: [], Defense: [], Resistance: [], Support: [], Control: [], Neural: [], Travel: [], Innate: [] },
  serverPowersetsById: {},
  SERVER_POWER_REGISTRY: {},
  SERVER_EFFECT_REGISTRY: {
    'env_lava_burn': { name: 'Lava Burn', type: 'DoT', damage: 15, tickRate: 100, duration: 2000, description: 'Rapidly taking severe burning damage.' },
    'env_acid_melt': { name: 'Acid Melt', type: 'DoT', damage: 5, tickRate: 100, duration: 2000, description: 'Rapidly melting from corrosive acid.' },
    'status_stun': { name: 'Stunned', type: 'Status', duration: 3000, description: 'Movement drastically reduced.' }
  },
  mapChunks: {},
  npcsCatalog: [],
  spawnersCatalog: [],
  mapBadgesCatalog: [],
  zonesConfig: {},
  neighborhoods: {},
  mobPacks: {},
  npcTemplates: {},
  entityTypes: {},
  entityGroups: {},
  permissionsCatalog: {},
  activePlayers: {},
  activeProjectiles: [],
  globalWeather: 'clear',
  activeDrones: {},
  apartmentInvites: {}
};
