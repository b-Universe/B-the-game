import { UI_COLORS } from './constants.js?v=cache-bust-005';

export const CHAT_CONFIG = {
  channels: {
    general: { id: 'general', label: 'General', color: UI_COLORS.orange },
    local: { id: 'local', label: 'Local', color: UI_COLORS.textBright },
    combat: { id: 'combat', label: 'Combat', color: UI_COLORS.critical },
    system: { id: 'system', label: 'System', color: UI_COLORS.warning },
    pm: { id: 'pm', label: 'PM', color: UI_COLORS.pink }
  },
  defaultSendChannel: 'general'
};
