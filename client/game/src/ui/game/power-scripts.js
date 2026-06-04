import { POWER_REGISTRY } from './registry.js?v=cache-bust-005';
import { TravelPowerScripts, TravelPowerExecutors } from './powers/travel.js?v=cache-bust-005';

const DIRECTIONS = ['down-left', 'down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left'];

const baseScripts = {
  ...TravelPowerScripts,
  'satelite-support': (eng, powerId = 'satelite-support') => {
    eng.combat.toggleTravelPower(powerId);
  },
  'teleport': (eng, powerId = 'teleport') => {
    eng.targetingPower = powerId;
    document.body.style.cursor = 'crosshair';
    if (eng.canvas) eng.canvas.style.cursor = 'crosshair';
  },
  'brawl': (eng, powerId = 'brawl') => {
    if (
      eng.player.state === 'dash' ||
      eng.player.state === 'death' ||
      (eng.player.actionTimer > 0 && eng.player.state !== 'jump') ||
      eng.player.isSitting
    ) return;

    const powerDef = POWER_REGISTRY[powerId];
    const energyCost = powerDef?.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 10;
    const batteryCost = powerDef?.stats?.batteryCost || 0;
    if (eng.player.energy < energyCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
      return;
    }
    if (eng.player.synthEnergy < batteryCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Power', '#00d2ff');
      return;
    }

    eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
    const now = Date.now();
    const cooldownMs = powerDef?.stats?.rechargeRate !== undefined ? powerDef.stats.rechargeRate * 1000 : 500;
    if (now - (eng.player.lastAttackTimes[powerId] || 0) < cooldownMs) return;

    eng.player.energy -= energyCost;
    eng.player.synthEnergy -= batteryCost;
    eng.player.lastAttackTimes[powerId] = now;
    eng.ui.update();

    eng.player.state = `attack${eng.player.nextAttack}`;
    eng.player.nextAttack = eng.player.nextAttack === 1 ? 2 : 1;
    eng.player.frame = 0;
    eng.player.frameTimer = 0;
    eng.player.actionTimer = 7 * (eng.player.frameInterval / 2);

    const px = eng.player.x;
    const py = eng.player.y;
    const pz = eng.player.z || 0;

    if (powerDef?.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
      powerDef.visuals.casterVisuals.forEach(vis => {
        if (vis.sequence && vis.sequence !== 'None') {
          setTimeout(() => {
            const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
            const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
            const fxData = {
              x: px, y: py, z: pz + (vis.offsetZ || 0),
              vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
              wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
            };
            eng.debris.push(fxData);
            eng.network.sendSpawnFX(fxData);
          }, (vis.delay || 0) * 1000);
        }
      });
    }

    eng.combat.closeNearbyDoors(px, py, pz);

    const combatParams = eng.combat.getCombatTargetParams('brawl');
    let targetX = combatParams.targetX;
    let targetY = combatParams.targetY;

    if (targetX === px && targetY === py) {
      if (eng.mouseWorldPos) {
        const dx = eng.mouseWorldPos.x - px;
        const dy = eng.mouseWorldPos.y - py;
        const dist = Math.hypot(dx, dy) || 1;
        targetX = px + (dx / dist) * 100;
        targetY = py + (dy / dist) * 100;
      }
    } else {
      const dx = targetX - px;
      const dy = targetY - py;
      const dist = Math.hypot(dx, dy) || 1;
      targetX = px + (dx / dist) * 100;
      targetY = py + (dy / dist) * 100;
    }

    const dx = targetX - px;
    const dy = targetY - py;

    let angle = Math.atan2(dy, dx);
    let normalizedAngle = angle + Math.PI / 8;

    if (normalizedAngle < 0) {
      normalizedAngle += Math.PI * 2;
    }

    eng.player.dir = DIRECTIONS[Math.floor(normalizedAngle / (Math.PI / 4)) % 8];

    const facingAngle = Math.atan2(dy, dx);
    const fov = Math.PI / 3;

    const checkHit = (tx, ty, tz) => {
      tz = tz || 0;
      if (Math.abs(pz - tz) > 48) return false;
      const dist = Math.hypot(tx - px, ty - py);
      if (dist > 200) return false;
      const angleToTarget = Math.atan2(ty - py, tx - px);
      let angleDiff = angleToTarget - facingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > fov) return false;
      const steps = Math.ceil(dist / 16);
      for (let i = 1; i <= steps; i++) {
        const sampleX = px + ((tx - px) * (i / steps));
        const sampleY = py + ((ty - py) * (i / steps));
        const terrainZ = eng.getTerrainZ(sampleX, sampleY);
        if (terrainZ >= pz + 64 && terrainZ >= tz + 64) return false;
      }
      return true;
    };

    eng.npcs.forEach(npc => {
      if (npc.state !== 'dead') {
        if (checkHit(npc.x, npc.y, npc.z)) {
          if (npc.type === 'trainer') {
            const words = ['Miss', 'Dodge', 'Deflect'];
            const word = words[Math.floor(Math.random() * words.length)];
            eng.floatingTexts.push({
              x: npc.x, y: npc.y, z: npc.z, offsetY: 130, rndX: (Math.random() - 0.5) * 50, rndY: (Math.random() - 0.5) * 40,
              text: word, life: 1.0, color: '#bdc3c7'
            });
          } else {
            eng.network.sendCombatHit({ targetId: npc.uuid, targetType: 'npc', powerId: 'brawl' });
          }
        }
      }
    });

    const myAlignment = eng.playerData.alignment || 'hero';
    for (let id in eng.otherPlayers) {
      const op = eng.otherPlayers[id];
      if (op.state !== 'death') {
        const opAlignment = op.alignment || 'hero';
        if (myAlignment === 'hero' && opAlignment === 'hero') continue;
        if (checkHit(op.x, op.y, op.z)) {
          eng.network.sendCombatHit({ targetId: id, targetType: 'player', powerId: 'brawl' });
        }
      }
    }
  },

  'throw-airplane': (eng, powerId = 'throw-airplane') => {
    if (
      eng.player.state === 'dash' ||
      eng.player.state === 'death' ||
      (eng.player.actionTimer > 0 && eng.player.state !== 'jump') ||
      eng.player.isSitting
    ) return;

    const powerDef = POWER_REGISTRY[powerId];
    const energyCost = powerDef?.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 10;
    const batteryCost = powerDef?.stats?.batteryCost || 0;
    if (eng.player.energy < energyCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
      return;
    }
    if (eng.player.synthEnergy < batteryCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Power', '#00d2ff');
      return;
    }

    eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
    const now = Date.now();
    const cooldownMs = powerDef?.stats?.rechargeRate !== undefined ? powerDef.stats.rechargeRate * 1000 : 500;
    if (now - (eng.player.lastAttackTimes[powerId] || 0) < cooldownMs) return;

    eng.player.energy -= energyCost;
    eng.player.synthEnergy -= batteryCost;
    eng.player.lastAttackTimes[powerId] = now;
    eng.ui.update();

    eng.player.state = 'throw-attack1';
    eng.player.frame = 0;
    eng.player.frameTimer = 0;
    eng.player.actionTimer = 7 * (eng.player.frameInterval / 2);

    const px = eng.player.x;
    const py = eng.player.y;
    const pz = eng.player.z || 0;

    if (powerDef?.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
      powerDef.visuals.casterVisuals.forEach(vis => {
        if (vis.sequence && vis.sequence !== 'None') {
          setTimeout(() => {
            const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
            const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
            const fxData = {
              x: px, y: py, z: pz + (vis.offsetZ || 0),
              vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
              wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
            };
            eng.debris.push(fxData);
            eng.network.sendSpawnFX(fxData);
          }, (vis.delay || 0) * 1000);
        }
      });
    }

    eng.combat.closeNearbyDoors(px, py, pz);

    const combatParams = eng.combat.getCombatTargetParams('throw-airplane');
    let targetX = combatParams.targetX;
    let targetY = combatParams.targetY;
    let directTargetId = combatParams.targetEntity ? combatParams.targetEntity.id : null;

    const dx = targetX - px;
    const dy = targetY - py;
    let angle = Math.atan2(dy, dx);
    let normalizedAngle = angle + Math.PI / 8;
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    eng.player.dir = DIRECTIONS[Math.floor(normalizedAngle / (Math.PI / 4)) % 8];

    eng.network.sendProjectile({
      powerId: powerId,
      targetId: directTargetId,
      targetX: targetX, targetY: targetY, targetZ: (eng.getTerrainZ(targetX, targetY) || 0) + 10,
    });
  }
};

export const PowerScripts = new Proxy(baseScripts, {
  get: function(target, prop) {
    if (target[prop]) return target[prop];

    // Generic Fallback Cast Logic for Custom Powers
    return (eng) => {
       const powerDef = POWER_REGISTRY[prop];
       if (!powerDef) return;

       if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump') || eng.player.isSitting) return;
       const energyCost = powerDef.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 10;
       const batteryCost = powerDef.stats?.batteryCost || 0;
       if (eng.player.energy < energyCost) {
         if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
         return;
       }
       if (eng.player.synthEnergy < batteryCost) {
         if (eng.showFloatingText) eng.showFloatingText('Not Enough Power', '#00d2ff');
         return;
       }

       eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
       const now = Date.now();
       const cooldownMs = (powerDef.stats?.rechargeRate || 1.0) * 1000;
       if (now - (eng.player.lastAttackTimes[prop] || 0) < cooldownMs) return;

       eng.player.energy -= energyCost;
       eng.player.synthEnergy -= batteryCost;
       eng.player.lastAttackTimes[prop] = now;
       eng.ui.update();

       eng.player.state = powerDef.visuals?.animation || 'throw-attack1';
       eng.player.frame = 0;
       eng.player.frameTimer = 0;

       let animDuration = 500; // Generic animation lock
       if (powerDef.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
         const seqData = eng.renderer.assetManager.sequenceLibrary[powerDef.visuals.casterVisuals[0].sequence];
         if (seqData && powerDef.visuals.casterVisuals[0].sequence !== 'None') animDuration = seqData.frames * seqData.speed;
       }
       eng.player.actionTimer = animDuration;

       const px = eng.player.x;
       const py = eng.player.y;
       const pz = eng.player.z || 0;

       if (powerDef.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
         powerDef.visuals.casterVisuals.forEach(vis => {
           if (vis.sequence && vis.sequence !== 'None') {
             setTimeout(() => {
               const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
               const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
               const fxData = {
                 x: px, y: py, z: pz + (vis.offsetZ || 0),
                 vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
                 wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
               };
               eng.debris.push(fxData);
               eng.network.sendSpawnFX(fxData);
             }, (vis.delay || 0) * 1000);
           }
         });
       }

       eng.combat.closeNearbyDoors(px, py, pz);
       const combatParams = eng.combat.getCombatTargetParams(prop);

       let targetX = combatParams.targetX;
       let targetY = combatParams.targetY;
       let directTargetId = combatParams.targetEntity ? combatParams.targetEntity.id : null;

       const dx = targetX - px;
       const dy = targetY - py;
       let angle = Math.atan2(dy, dx);
       let normalizedAngle = angle + Math.PI / 8;
       if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
       eng.player.dir = DIRECTIONS[Math.floor(normalizedAngle / (Math.PI / 4)) % 8];

       const isProjectile = powerDef.visuals?.projectileVisuals && powerDef.visuals.projectileVisuals.length > 0 && powerDef.visuals.projectileVisuals[0].sequence !== 'None';
       const isTargetedAoE = powerDef.type === 'Targeted AoE';
       const isPBAoE = powerDef.type === 'PBAoE';

       if (isProjectile) {
          eng.network.sendProjectile({
            powerId: prop,
            targetId: directTargetId,
            targetX: targetX, targetY: targetY, targetZ: (eng.getTerrainZ(targetX, targetY) || 0) + 10,
            damage: powerDef.stats?.damage || 0,
            speed: 500
          });
       } else {
          if (isTargetedAoE) {
             const checkHit = (tx, ty, tz) => Math.hypot(tx - targetX, ty - targetY) <= (powerDef.stats?.aoeRadius || 50);
             eng.npcs.forEach(npc => { if (npc.state !== 'dead' && checkHit(npc.x, npc.y, npc.z)) eng.network.sendCombatHit({ targetId: npc.uuid, targetType: 'npc', powerId: prop }); });
             for (let id in eng.otherPlayers) { const op = eng.otherPlayers[id]; if (op.state !== 'death' && checkHit(op.x, op.y, op.z)) eng.network.sendCombatHit({ targetId: id, targetType: 'player', powerId: prop }); }
          } else if (isPBAoE) {
             const checkHit = (tx, ty, tz) => Math.hypot(tx - px, ty - py) <= (powerDef.stats?.aoeRadius || 50);
             eng.npcs.forEach(npc => { if (npc.state !== 'dead' && checkHit(npc.x, npc.y, npc.z)) eng.network.sendCombatHit({ targetId: npc.uuid, targetType: 'npc', powerId: prop }); });
             for (let id in eng.otherPlayers) { const op = eng.otherPlayers[id]; if (op.state !== 'death' && checkHit(op.x, op.y, op.z)) eng.network.sendCombatHit({ targetId: id, targetType: 'player', powerId: prop }); }
          } else {
             if (directTargetId) {
                eng.network.sendCombatHit({ targetId: directTargetId, targetType: combatParams.targetEntity.type, powerId: prop });
             } else {
                const checkHit = (tx, ty, tz) => Math.hypot(tx - px, ty - py) <= (powerDef.stats?.range || 200);
                eng.npcs.forEach(npc => { if (npc.state !== 'dead' && checkHit(npc.x, npc.y, npc.z)) eng.network.sendCombatHit({ targetId: npc.uuid, targetType: 'npc', powerId: prop }); });
                for (let id in eng.otherPlayers) { const op = eng.otherPlayers[id]; if (op.state !== 'death' && checkHit(op.x, op.y, op.z)) eng.network.sendCombatHit({ targetId: id, targetType: 'player', powerId: prop }); }
             }
          }
       }
    };
  }
});

export const PowerExecutors = {
  ...TravelPowerExecutors,
  'teleport': (eng, targetX, targetY, powerId = 'teleport') => {
    const powerDef = POWER_REGISTRY[powerId];
    if (!powerDef) return;

    if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump') || eng.player.isSitting) return;

    const energyCost = powerDef.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 30;
    const batteryCost = powerDef.stats?.batteryCost || 0;
    if (eng.player.energy < energyCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
      return;
    }
    if (eng.player.synthEnergy < batteryCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Power', '#00d2ff');
      return;
    }

    eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
    const now = Date.now();
    const cooldownMs = (powerDef.stats?.rechargeRate || 2.0) * 1000;
    if (now - (eng.player.lastAttackTimes[powerId] || 0) < cooldownMs) return;

    eng.player.energy -= energyCost;
    eng.player.synthEnergy -= batteryCost;
    eng.player.lastAttackTimes[powerId] = now;
    eng.ui.update();

    if (eng.network && eng.network.socket) {
      eng.network.socket.emit('power_cast_start', { powerId });
    }

    eng.player.teleportTarget = { x: targetX, y: targetY, timer: 0.5 };
    eng.player.state = `cast:teleport`;
    eng.player.frame = 0;
    eng.player.frameTimer = 0;
    eng.player.actionTimer = 500;
    const px = eng.player.x;
    const py = eng.player.y;
    const pz = eng.player.z || 0;

    if (powerDef.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
      powerDef.visuals.casterVisuals.forEach(vis => {
        if (vis.sequence && vis.sequence !== 'None') {
          setTimeout(() => {
            const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
            const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
            const fxData = {
              x: px, y: py, z: pz + (vis.offsetZ || 0),
              vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
              wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
            };
            eng.debris.push(fxData);
            eng.network.sendSpawnFX(fxData);
          }, (vis.delay || 0) * 1000);
        }
      });
    }
  }
};
