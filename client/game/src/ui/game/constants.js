export const COMMAND_LIST = [
  '/teleport', '/tp', '/tpo', '/teleport-other', '/teleport_zone', '/tpz',
  '/speed', '/stuck', '/editmode', '/reload', '/dev', '/npc', '/players',
  '/pm', '/time', '/patchnotes', '/news', '/announce', '/weather', '/afk',
  '/givemoney', '/level', '/integrity', '/save', '/load', '/applymap',
  '/grant', '/revoke', '/bank'
];

export const UI_COLORS = {
  primary: '#3498db',    // Neon Blue
  success: '#2ecc71',    // Neon Green
  warning: '#f1c40f',    // Yellow/Gold
  error: '#e74c3c',      // Neon Red (Standard)
  critical: '#ff4757',   // Bright Red (Combat/Critical)
  orange: '#f39c12',     // Orange/Yellow
  purple: '#9b59b6',     // Purple
  pink: '#e056fd',       // Pink
  cyan: '#00d2ff',       // Cyan/Battery
  textDim: '#aaa',
  textBright: '#ffffff',
  background: '#0b0e14',
  bgOverlay: 'rgba(5, 7, 10, 0.85)'
};

export const GUI_DEFAULT_POSITIONS = {
  homeEditor: { top: '80px', right: '280px', left: 'auto' },
  builderTools: { xOffset: -270, y: 300 },
  textureLibrary: { xOffset: -540, y: 300 },
  objectLibrary: { xOffset: -540, y: 300 },
  devTools: { xOffset: -340, y: 70 },
  npcManager: { xCenterOffset: -425, y: 100 },
  spawnerManager: { xCenterOffset: -425, y: 100 },
  mobPackManager: { xCenterOffset: -450, y: 100 },
  entityGroupManager: { xCenterOffset: -450, y: 150 },
  npcTemplateManager: { xCenterOffset: -400, y: 150 },
  entityTypeManager: { xCenterOffset: -300, y: 150 },
  playerModifier: { xCenterOffset: -225, y: 100 },
  accountManager: { xCenterOffset: -425, y: 100 },
  accountEdit: { xCenterOffset: -250, y: 120 },
  playerManager: { xCenterOffset: -425, y: 100 }
};
