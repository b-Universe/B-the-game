import { POWER_REGISTRY } from '../registry.js?v=cache-bust-005';

const DIRECTIONS = ['down-left', 'down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left'];

export const AssaultRifleScripts = {
  'slug': (eng, powerId = 'slug') => {
    if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump')) return;

    const combatParams = eng.combat.getCombatTargetParams(powerId);
    if (combatParams.outOfRange) {
      if (eng.showFloatingText) eng.showFloatingText('Target out of range', '#e74c3c');
      return;
    }
    if (eng.clientSettings.combatStyle === 'target' && !combatParams.targetEntity) {
      if (eng.showFloatingText) eng.showFloatingText('Requires a Target', '#e74c3c');
      return;
    }

    const powerDef = POWER_REGISTRY[powerId];
    const energyCost = powerDef?.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 5;

    if (eng.player.energy < energyCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
      return;
    }

    eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
    const now = Date.now();
    const cooldownMs = powerDef?.stats?.rechargeRate !== undefined ? powerDef.stats.rechargeRate * 1000 : 1000;
    if (now - (eng.player.lastAttackTimes[powerId] || 0) < cooldownMs) return;

    eng.player.energy -= energyCost;
    eng.player.lastAttackTimes[powerId] = now;
    eng.ui.update();

    eng.player.state = 'throw-attack1';
    eng.player.frame = 0;
    eng.player.frameTimer = 0;
    eng.player.actionTimer = 500;

    let targetX = combatParams.targetX;
    let targetY = combatParams.targetY;
    let directTargetId = combatParams.targetEntity ? combatParams.targetEntity.id : null;

    const dx = targetX - eng.player.x;
    const dy = targetY - eng.player.y;
    let angle = Math.atan2(dy, dx);
    let normalizedAngle = angle + Math.PI / 8;
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    eng.player.dir = DIRECTIONS[Math.floor(normalizedAngle / (Math.PI / 4)) % 8];

    if (directTargetId) {
      eng.network.sendCombatHit({ targetId: directTargetId, targetType: combatParams.targetEntity.type, powerId: powerId });
    }
  }
};
