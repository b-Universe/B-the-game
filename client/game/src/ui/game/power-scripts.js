import { POWER_REGISTRY } from './registry.js?v=cache-bust-005';
import { TravelPowerScripts, TravelPowerExecutors } from './powers/travel.js?v=cache-bust-005';
import { AssaultRifleScripts } from './powers/assault-rifle.js?v=cache-bust-005';

const DIRECTIONS = ['down-left', 'down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left'];

const baseScripts = {
  ...TravelPowerScripts,
  ...AssaultRifleScripts,
  'satelite-support': (eng, powerId = 'satelite-support') => {
    const powerDef = POWER_REGISTRY[powerId];
    if (!powerDef) return;

    if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump')) return;

    const energyCost = powerDef.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 50;
    if (eng.player.energy < energyCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
      return;
    }

    eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
    const now = Date.now();
    const cooldownMs = (powerDef.stats?.rechargeRate || 60) * 1000;
    if (now - (eng.player.lastAttackTimes[powerId] || 0) < cooldownMs) return;

    eng.player.energy -= energyCost;
    eng.player.lastAttackTimes[powerId] = now;
    eng.ui.update();

    eng.player.state = powerDef.visuals?.animation || 'throw-attack1';
    eng.player.frame = 0;
    eng.player.frameTimer = 0;
    eng.player.actionTimer = 500;
    eng.player.movePath = null;
    eng.player.moveTarget = null;

    if (eng.network && eng.network.socket) {
      eng.network.socket.emit('summon_entity', { powerId });
    }
  },
  'teleport': (eng, powerId = 'teleport') => {
    eng.targetingPower = powerId;
    document.body.style.cursor = 'crosshair';
    if (eng.canvas) eng.canvas.style.cursor = 'crosshair';
  },
  'apartment-teleport': (eng, powerId = 'apartment-teleport') => {
    const powerDef = POWER_REGISTRY[powerId];
    if (!powerDef) return;

    if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump')) return;

    const batteryCost = powerDef.stats?.batteryCost !== undefined ? powerDef.stats.batteryCost : 100;
    if (eng.player.synthEnergy < batteryCost) {
      if (eng.showFloatingText) eng.showFloatingText('Not Enough Power', '#00d2ff');
      return;
    }

    eng.player.lastAttackTimes = eng.player.lastAttackTimes || {};
    const now = Date.now();
    const cooldownMs = (powerDef.stats?.rechargeRate !== undefined ? powerDef.stats.rechargeRate : 10.0) * 1000;
    if (now - (eng.player.lastAttackTimes[powerId] || 0) < cooldownMs) return;

    const aptZone = `apt_${eng.playerData.name.toLowerCase()}`;
    if (eng.currentZone === aptZone) {
      eng.ui.showSystemMessage("You are already in your apartment.");
      return;
    }

    eng.player.synthEnergy -= batteryCost;
    eng.player.lastAttackTimes[powerId] = now;
    eng.ui.update();

    if (eng.network && eng.network.socket) {
      eng.network.socket.emit('power_cast_start', { powerId });
    }

    const activationMs = (powerDef.stats?.activationTime !== undefined ? powerDef.stats.activationTime : 10.0) * 1000;
    eng.player.state = `cast:apartment-teleport`;
    eng.player.frame = 0;
    eng.player.frameTimer = 0;
    eng.player.actionTimer = activationMs;
    eng.player.castingPower = powerId;
    eng.player.movePath = null;
    eng.player.moveTarget = null;

    if (activationMs > 0) {
       eng.ui.showSystemMessage(`Initiating warp... Stand still for ${activationMs / 1000} seconds.`);
    }

    const executeTeleport = () => {
       eng.player.state = 'idle';
       eng.player.castingPower = null;
       eng.cameraShake = Math.max(eng.cameraShake || 0, 15);
       eng.ui.setupLoadingScreen();

       const px = eng.player.x, py = eng.player.y, pz = eng.player.z || 0;
       const fxData = { x: px, y: py, z: pz + 50, vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport', isFX: true, color: '#00d2ff' };
       const fxData2 = { x: px, y: py, z: pz + 32, vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport_2', isFX: true, color: '#00d2ff' };
       eng.debris.push(fxData); eng.debris.push(fxData2);
       eng.network.sendSpawnFX(fxData); eng.network.sendSpawnFX(fxData2);

       eng.network.socket.emit('join_zone', { zone: aptZone });

       eng.player.x = 48 * 32;
       eng.player.y = 48 * 32;
       eng.player.z = 64;
       eng.camera.x = eng.player.x;
       eng.camera.y = eng.player.y;

       eng.ui.showSystemMessage('Traveling to your personal apartment...');
    };

    if (activationMs <= 0) {
        executeTeleport();
    } else {
        let elapsed = 0;
        const castInterval = setInterval(() => {
           if (eng.player.castingPower !== powerId) {
               clearInterval(castInterval);
               return;
           }

           elapsed += 100;
           if (elapsed >= activationMs) {
               clearInterval(castInterval);
               executeTeleport();
           } else {
               const intensity = elapsed / activationMs;
               if (powerDef.visuals?.casterVisuals) {
                   powerDef.visuals.casterVisuals.forEach(vis => {
                       if (vis.particle && vis.particle !== 'none') {
                           eng.spawnEventParticles({
                               x: eng.player.x, y: eng.player.y, z: eng.player.z,
                               particle: vis.particle,
                               particleColor: vis.color,
                               particleCount: Math.max(1, Math.floor(intensity * (vis.particleCount || 5))),
                               particleScatter: vis.particleScatter || 60
                           });
                       }
                   });
               }
           }
        }, 100);
    }
  },
  'teleport-apartment': (eng, powerId) => baseScripts['apartment-teleport'](eng, powerId),
  'brawl': (eng, powerId = 'brawl') => {
    if (
      eng.player.state === 'dash' ||
      eng.player.state === 'death' ||
      (eng.player.actionTimer > 0 && eng.player.state !== 'jump')
    ) return;

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
    eng.player.movePath = null;
    eng.player.moveTarget = null;

    const px = eng.player.x;
    const py = eng.player.y;
    const pz = eng.player.z || 0;

    if (powerDef?.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
      powerDef.visuals.casterVisuals.forEach(vis => {
        if ((vis.sequence && vis.sequence !== 'None') || (vis.particle && vis.particle !== 'none')) {
          setTimeout(() => {
            const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
            const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
            const fxData = {
              x: px, y: py, z: pz + (vis.offsetZ || 0),
              vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
              wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
            };
            if (vis.sequence && vis.sequence !== 'None') eng.debris.push(fxData);
            if (vis.particle && vis.particle !== 'none') eng.spawnEventParticles({ ...fxData, particle: vis.particle, particleColor: vis.color || '#ffffff' });
            eng.network.sendSpawnFX(fxData);
          }, (vis.delay || 0) * 1000);
        }
      });
    }

    eng.combat.closeNearbyDoors(px, py, pz);

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

    if (powerDef?.stats?.dashForward) {
      eng.player.momentumX = Math.cos(angle) * 800;
      eng.player.momentumY = Math.sin(angle) * 800;
    }

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

  'paper-airplane': (eng, powerId = 'throw-airplane') => {
    if (
      eng.player.state === 'dash' ||
      eng.player.state === 'death' ||
      (eng.player.actionTimer > 0 && eng.player.state !== 'jump') ||
      eng.player.isSitting
    ) return;

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
    eng.player.movePath = null;
    eng.player.moveTarget = null;

    const px = eng.player.x;
    const py = eng.player.y;
    const pz = eng.player.z || 0;

    if (powerDef?.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
      powerDef.visuals.casterVisuals.forEach(vis => {
        if ((vis.sequence && vis.sequence !== 'None') || (vis.particle && vis.particle !== 'none')) {
          setTimeout(() => {
            const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
            const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
            const fxData = {
              x: px, y: py, z: pz + (vis.offsetZ || 0),
              vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
              wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
            };
            if (vis.sequence && vis.sequence !== 'None') eng.debris.push(fxData);
            if (vis.particle && vis.particle !== 'none') eng.spawnEventParticles({ ...fxData, particle: vis.particle, particleColor: vis.color || '#ffffff' });
            eng.network.sendSpawnFX(fxData);
          }, (vis.delay || 0) * 1000);
        }
      });
    }

    eng.combat.closeNearbyDoors(px, py, pz);

    let targetX = combatParams.targetX;
    let targetY = combatParams.targetY;
    let directTargetId = combatParams.targetEntity ? combatParams.targetEntity.id : null;

    if (targetX === px && targetY === py) {
      if (eng.mouseWorldPos) {
        const dx2 = eng.mouseWorldPos.x - px;
        const dy2 = eng.mouseWorldPos.y - py;
        const dist2 = Math.hypot(dx2, dy2) || 1;
        targetX = px + (dx2 / dist2) * 1000;
        targetY = py + (dy2 / dist2) * 1000;
      } else {
        const dirAngleMap = {
          'down-left': Math.PI * 0.75, 'down': Math.PI / 2, 'down-right': Math.PI / 4, 'right': 0,
          'up-right': -Math.PI / 4, 'up': -Math.PI / 2, 'up-left': -Math.PI * 0.75, 'left': Math.PI
        };
        const angle = dirAngleMap[eng.player.dir] || Math.PI / 2;
        targetX = px + Math.cos(angle) * 1000;
        targetY = py + Math.sin(angle) * 1000;
      }
    } else if (directTargetId === null) {
      const dx2 = targetX - px;
      const dy2 = targetY - py;
      const dist2 = Math.hypot(dx2, dy2) || 1;
      targetX = px + (dx2 / dist2) * 1000;
      targetY = py + (dy2 / dist2) * 1000;
    }

    const dx = targetX - px;
    const dy = targetY - py;
    let angle = Math.atan2(dy, dx);
    let normalizedAngle = angle + Math.PI / 8;
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    eng.player.dir = DIRECTIONS[Math.floor(normalizedAngle / (Math.PI / 4)) % 8];

    let finalTargetZ = (eng.getTerrainZ(targetX, targetY) || 0) + 10;
    if (directTargetId !== null && combatParams.targetEntity) {
      finalTargetZ = (combatParams.targetEntity.entity.z || 0) + 16;
    }

    eng.network.sendProjectile({
      powerId: powerId,
      targetId: directTargetId,
      targetX: targetX, targetY: targetY, targetZ: finalTargetZ,
    });
  }
};

export const PowerScripts = new Proxy(baseScripts, {
  get: function (target, prop) {
    if (target[prop]) return target[prop];

    // Generic Fallback Cast Logic for Custom Powers
    return (eng) => {
      const powerDef = POWER_REGISTRY[prop];
      if (!powerDef) return;

      if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump')) return;
      const energyCost = powerDef.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 10;
      const batteryCost = powerDef.stats?.batteryCost || 0;

      const combatParams = eng.combat.getCombatTargetParams(prop);
      if (combatParams.outOfRange) {
        if (eng.showFloatingText) eng.showFloatingText('Target out of range', '#e74c3c');
        return;
      }

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
      const cooldownMs = (powerDef.stats?.rechargeRate !== undefined ? powerDef.stats.rechargeRate : 1.0) * 1000;
      if (now - (eng.player.lastAttackTimes[prop] || 0) < cooldownMs) return;

      eng.player.energy -= energyCost;
      eng.player.synthEnergy -= batteryCost;
      eng.player.lastAttackTimes[prop] = now;
      eng.ui.update();

      eng.player.state = powerDef.visuals?.animation || 'throw-attack1';
      eng.player.frame = 0;
      eng.player.frameTimer = 0;

      const activationMs = (powerDef.stats?.activationTime !== undefined ? powerDef.stats.activationTime : 0.5) * 1000;
      eng.player.actionTimer = activationMs;
      eng.player.castingPower = prop;
      eng.player.movePath = null;
      eng.player.moveTarget = null;

      const px = eng.player.x;
      const py = eng.player.y;
      const pz = eng.player.z || 0;

      eng.combat.closeNearbyDoors(px, py, pz);

      let targetX = combatParams.targetX;
      let targetY = combatParams.targetY;
      let directTargetId = combatParams.targetEntity ? combatParams.targetEntity.id : null;

      const dx = targetX - px;
      const dy = targetY - py;
      let angle = Math.atan2(dy, dx);
      let normalizedAngle = angle + Math.PI / 8;
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      eng.player.dir = DIRECTIONS[Math.floor(normalizedAngle / (Math.PI / 4)) % 8];

      if (powerDef.stats?.dashForward) {
        eng.player.momentumX = Math.cos(angle) * 800;
        eng.player.momentumY = Math.sin(angle) * 800;
      }

      const executePowerEffect = () => {
        if (powerDef.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
          powerDef.visuals.casterVisuals.forEach(vis => {
            if ((vis.sequence && vis.sequence !== 'None') || (vis.particle && vis.particle !== 'none')) {
              setTimeout(() => {
                const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
                const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
                const fxData = {
                  x: px, y: py, z: pz + (vis.offsetZ || 0),
                  vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
                  wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
                };
                if (vis.sequence && vis.sequence !== 'None') eng.debris.push(fxData);
                if (vis.particle && vis.particle !== 'none') eng.spawnEventParticles({ ...fxData, particle: vis.particle, particleColor: vis.color || '#ffffff', particleCount: vis.particleCount, particleScatter: vis.particleScatter });
                eng.network.sendSpawnFX(fxData);
              }, (vis.delay || 0) * 1000);
            }
          });
        }

        const isProjectile = powerDef.isProjectile || ['laser', 'bullet', 'lightning'].includes(powerDef.visuals?.projectileStyle) || (powerDef.visuals?.projectileVisuals && powerDef.visuals.projectileVisuals.length > 0 && (powerDef.visuals.projectileVisuals[0].sequence !== 'None' || powerDef.visuals.projectileVisuals[0].particle !== 'none'));
        const isTargetedAoE = powerDef.type === 'Targeted AoE';
        const isPBAoE = powerDef.type === 'PBAoE';

        if (isProjectile) {
          if (targetX === px && targetY === py) {
            if (eng.mouseWorldPos) {
              const dx2 = eng.mouseWorldPos.x - px;
              const dy2 = eng.mouseWorldPos.y - py;
              const dist2 = Math.hypot(dx2, dy2) || 1;
              targetX = px + (dx2 / dist2) * 1000;
              targetY = py + (dy2 / dist2) * 1000;
            } else {
              const dirAngleMap = {
                'down-left': Math.PI * 0.75, 'down': Math.PI / 2, 'down-right': Math.PI / 4, 'right': 0,
                'up-right': -Math.PI / 4, 'up': -Math.PI / 2, 'up-left': -Math.PI * 0.75, 'left': Math.PI
              };
              const angle = dirAngleMap[eng.player.dir] || Math.PI / 2;
              targetX = px + Math.cos(angle) * 1000;
              targetY = py + Math.sin(angle) * 1000;
            }
          } else if (directTargetId === null) {
            const dx2 = targetX - px;
            const dy2 = targetY - py;
            const dist2 = Math.hypot(dx2, dy2) || 1;
            targetX = px + (dx2 / dist2) * 1000;
            targetY = py + (dy2 / dist2) * 1000;
          }

          let finalTargetZ = (eng.getTerrainZ(targetX, targetY) || 0) + 10;
          if (directTargetId !== null && combatParams.targetEntity) {
            finalTargetZ = (combatParams.targetEntity.entity.z || 0) + 16;
          }

          eng.network.sendProjectile({
            powerId: prop,
            targetId: directTargetId,
            targetX: targetX, targetY: targetY, targetZ: finalTargetZ,
            damage: powerDef.stats?.damage || 0,
            speed: powerDef.visuals?.projectileSpeed || 500
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

      if (activationMs > 0) {
        let elapsed = 0;
        const castInterval = setInterval(() => {
          if (eng.player.castingPower !== prop) {
            clearInterval(castInterval);
            return;
          }
          elapsed += 100;
          if (elapsed >= activationMs) {
            clearInterval(castInterval);
            eng.player.state = 'idle';
            eng.player.castingPower = null;
            executePowerEffect();
          } else {
            if (powerDef.visuals?.casterVisuals) {
              const intensity = elapsed / activationMs;
              powerDef.visuals.casterVisuals.forEach(vis => {
                if (vis.particle && vis.particle !== 'none') {
                  if (Math.random() < 0.5) {
                    eng.spawnEventParticles({
                      x: px, y: py, z: pz + (vis.offsetZ || 0),
                      particle: vis.particle,
                      particleColor: vis.color,
                      particleCount: Math.max(1, Math.floor(intensity * (vis.particleCount || 1))),
                      particleScatter: vis.particleScatter || 0
                    });
                  }
                }
              });
            }
          }
        }, 100);
      } else {
        executePowerEffect();
      }
    };
  }
});

export const PowerExecutors = {
  ...TravelPowerExecutors,
  'teleport': (eng, targetX, targetY, powerId = 'teleport') => {
    const powerDef = POWER_REGISTRY[powerId];
    if (!powerDef) return;

    if (eng.player.state === 'dash' || eng.player.state === 'death' || (eng.player.actionTimer > 0 && eng.player.state !== 'jump')) return;

    const dist = Math.hypot(targetX - eng.player.x, targetY - eng.player.y);
    const maxRange = (powerDef.stats?.range || 2000) + 50;
    if (dist > maxRange) {
      if (eng.showFloatingText) eng.showFloatingText('Target out of range', '#e74c3c');
      return;
    }

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
    eng.player.movePath = null;
    eng.player.moveTarget = null;
    const px = eng.player.x;
    const py = eng.player.y;
    const pz = eng.player.z || 0;

    if (powerDef.visuals?.casterVisuals && powerDef.visuals.casterVisuals.length > 0) {
      powerDef.visuals.casterVisuals.forEach(vis => {
        if ((vis.sequence && vis.sequence !== 'None') || (vis.particle && vis.particle !== 'none')) {
          setTimeout(() => {
            const seqData = eng.renderer.assetManager.sequenceLibrary[vis.sequence];
            const lifeTime = seqData ? (seqData.frames * seqData.speed) / 1000 : 0.6;
            const fxData = {
              x: px, y: py, z: pz + (vis.offsetZ || 0),
              vx: 0, vy: 0, vz: 0, life: lifeTime, maxLife: lifeTime, crumpleTimer: 0,
              wasteTex: vis.sequence, isFX: true, color: powerDef.visuals?.tint || '#ffffff'
            };
            if (vis.sequence && vis.sequence !== 'None') eng.debris.push(fxData);
            if (vis.particle && vis.particle !== 'none') eng.spawnEventParticles({ ...fxData, particle: vis.particle, particleColor: vis.color || '#ffffff' });
            eng.network.sendSpawnFX(fxData);
          }, (vis.delay || 0) * 1000);
        }
      });
    }
  }
};
