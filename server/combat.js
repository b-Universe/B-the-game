module.exports = function registerCombatSockets(socket, io, state, deps) {
  const { SERVER_POWER_REGISTRY, activePlayers, npcsCatalog, activeDrones, activeProjectiles } = state;
  const { logSystem, randomUUID, getServerTerrainZ, checkLoS, handleNpcDeath, CombatCalculator } = deps;

  socket.on('power_cast_start', (data) => {
    const player = activePlayers[socket.id];
    if (player && data.powerId) {
      const isIncapable = player.activeEffects && player.activeEffects.some(e => e.type === 'Status' && (e.statusType === 'stun' || e.statusType === 'hold'));
      if (isIncapable) { socket.emit('action_incapable', { reason: 'Incapable: You are stunned or held!' }); return; }
      const powerDef = SERVER_POWER_REGISTRY[data.powerId];
      if (powerDef) {
        const eCost = powerDef.stats?.energyCost !== undefined ? powerDef.stats.energyCost : 0;
        const bCost = powerDef.stats?.batteryCost || 0;
        if (player.energy >= eCost) player.energy -= eCost;
        if (player.synthEnergy !== undefined && player.synthEnergy >= bCost) player.synthEnergy -= bCost;
      }
    }
  });

  socket.on('player_teleported', () => {
    const player = activePlayers[socket.id];
    if (player) player.exemptNextMove = true;
  });

  socket.on('combat_hit', (data) => {
    const { targetId, targetType, powerId } = data;
    const attacker = activePlayers[socket.id];
    if (!attacker) return;

    const isIncapable = attacker.activeEffects && attacker.activeEffects.some(e => e.type === 'Status' && (e.statusType === 'stun' || e.statusType === 'hold'));
    if (isIncapable) { socket.emit('action_incapable', { reason: 'Incapable: You are stunned or held!' }); return; }

    const power = SERVER_POWER_REGISTRY[powerId];
    if (!power) { logSystem(`COMBAT REJECTED: Unknown power ${powerId} from ${attacker.name}`, "WARN"); return; }
    if (!attacker.powers || !attacker.powers.includes(powerId)) { logSystem(`COMBAT REJECTED: ${attacker.name} attempted to use unowned power ${powerId}`, "WARN"); return; }

    let target = null;
    let effectiveTargetId = targetId;
    if (powerId === 'dev-reset') {
      target = attacker;
      targetType = 'player';
      effectiveTargetId = socket.id;
    } else {
      if (targetType === 'npc') target = npcsCatalog.find(n => n.uuid === targetId);
      else if (targetType === 'player') target = activePlayers[targetId];
    }

    if (targetType === 'drone') {
      target = activeDrones[targetId];
      if (target && target.ownerSocketId === socket.id) return;
    }

    if (attacker.isLoading || (target && target.isLoading)) return;
    if (!target || target.type === 'trainer') return;

    const isDevPower = ['dev-reset', 'dev-reset-target', 'dev-defeat'].includes(powerId);
    if (!isDevPower && target.hp <= 0) return;

    if (!isDevPower) {
      const attackerGroup = (attacker.alignment || 'hero').toLowerCase();
      let targetGroup = 'Civilian';
      if (targetType === 'player') targetGroup = (target.alignment || 'hero').toLowerCase();
      else if (targetType === 'npc') targetGroup = target.group || 'Civilian';
      else if (targetType === 'drone') {
        const dOwner = activePlayers[target.ownerSocketId];
        targetGroup = dOwner ? (dOwner.alignment || 'hero').toLowerCase() : 'hero';
      }
      const isSupport = power.effects && power.effects.some(e => e.type === 'Heal' || e.type === 'MaxHP' || e.type === 'MaxEnergy');
      const hostile = (state.entityGroups[attackerGroup]?.hostileTo || []).includes(targetGroup) || (state.entityGroups[targetGroup]?.hostileTo || []).includes(attackerGroup);
      const isValid = isSupport ? !hostile : hostile;
      if (!isValid) return;
    }

    if (attacker.x === undefined || attacker.y === undefined || target.x === undefined || target.y === undefined) return;
    const attackerZ = attacker.z !== undefined ? attacker.z : getServerTerrainZ(attacker.x, attacker.y, attacker.zone || 'untitled');
    const targetZ = target.z !== undefined ? target.z : getServerTerrainZ(target.x, target.y, attacker.zone || 'untitled');

    const now = Date.now();

    const isProj = power.isProjectile || ['laser', 'bullet', 'lightning'].includes(power.visuals?.projectileStyle) || (power.visuals?.projectileSpeed !== undefined && power.visuals.projectileSpeed > 0) || (power.visuals?.projectileVisuals?.length > 0 && power.visuals.projectileVisuals[0].sequence !== 'None');

    if (isProj) { return; }
    else {
      attacker.lastAttackTimes = attacker.lastAttackTimes || {};
      const lastTime = attacker.lastAttackTimes[powerId] || 0;
      const cooldownMs = power.stats?.rechargeRate !== undefined ? power.stats.rechargeRate * 1000 : 250;
      if (now - lastTime < cooldownMs - 50) return;

      if (attacker.energy === undefined) attacker.energy = 1000;
      if (attacker.synthEnergy === undefined) attacker.synthEnergy = 1000;
      const energyCost = power.stats?.energyCost !== undefined ? power.stats.energyCost : 10;
      const batteryCost = power.stats?.batteryCost || 0;
      if (attacker.energy < energyCost || attacker.synthEnergy < batteryCost) return;

      attacker.energy -= energyCost;
      attacker.synthEnergy -= batteryCost;
      attacker.lastAttackTimes[powerId] = now;

      if (!isDevPower) {
        const dist = Math.hypot(target.x - attacker.x, target.y - attacker.y, targetZ - attackerZ);
        const allowedDist = (power.stats?.range || 200) + (power.stats?.aoeRadius || 0) + 50;
        if (dist > allowedDist) return;
        if (!checkLoS(attacker.x, attacker.y, attackerZ, target.x, target.y, targetZ, attacker.zone || 'untitled')) return;
      }
    }

    let attackerStats = { critChance: 0, critDmg: 0, control: 0, dmg: 0, healOut: 0, acc: 0, tohit: 0 };
    if (attacker.powers) {
      attacker.powers.forEach(pId => {
        const pDef = SERVER_POWER_REGISTRY[pId];
        if (pDef && pDef.type?.toLowerCase() === 'passive' && pDef.stats) {
          attackerStats.critChance += pDef.stats.critChanceBonus || 0;
          attackerStats.critDmg += pDef.stats.critDamageBonus || 0;
          attackerStats.control += pDef.stats.controlBonus || 0;
          attackerStats.dmg += pDef.stats.damageBonus || 0;
          attackerStats.healOut += pDef.stats.healingOutBonus || 0;
          attackerStats.acc += pDef.stats.accuracyBonus || 0;
          attackerStats.tohit += pDef.stats.toHitBonus || 0;
        }
      });
    }
    if (attacker.activePowers) {
      attacker.activePowers.forEach(pId => {
        const pDef = SERVER_POWER_REGISTRY[pId];
        if (pDef && pDef.type?.toLowerCase() === 'toggle' && pDef.stats) {
          attackerStats.critChance += pDef.stats.critChanceBonus || 0;
          attackerStats.critDmg += pDef.stats.critDamageBonus || 0;
          attackerStats.control += pDef.stats.controlBonus || 0;
          attackerStats.dmg += pDef.stats.damageBonus || 0;
          attackerStats.healOut += pDef.stats.healingOutBonus || 0;
          attackerStats.acc += pDef.stats.accuracyBonus || 0;
          attackerStats.tohit += pDef.stats.toHitBonus || 0;
        }
      });
    }

    if (powerId === 'dev-reset' || powerId === 'dev-reset-target') {
      target.hp = target.maxHp;
      if (target.maxEnergy) target.energy = target.maxEnergy;
      target.state = 'idle';
      target.activeEffects = [];
      if (targetType === 'player') {
        target.lastAttackTimes = {}; target.hurtTimer = 0;
        io.to(effectiveTargetId).emit('player_stats_updated', { hp: target.hp, energy: target.energy });
        io.emit('player_moved', target);
      } else {
        io.emit('npc_took_damage', { targetUuid: effectiveTargetId, damage: 0, hp: target.hp, state: target.state, attackerName: 'System', isDead: false, isCrit: false });
      }
      return;
    }

    if (powerId === 'dev-defeat') {
      target.hp = 0;
      target.state = targetType === 'npc' ? 'dead' : 'death';
      if (targetType === 'npc') { handleNpcDeath(target); io.emit('npc_took_damage', { targetUuid: effectiveTargetId, damage: 0, hp: 0, state: target.state, attackerName: attacker.name, isDead: true, isCrit: false }); }
      else { io.emit('player_took_damage', { targetId: effectiveTargetId, damage: 0, hp: 0, state: target.state, attackerName: attacker.name, isDead: true, isCrit: false }); }
      return;
    }

    let isDeflect = false;
    let tTypeDef = targetType === 'npc' ? (state.entityTypes ? state.entityTypes[target.type] : null) : null;
    if (targetType === 'npc' && (target.type === 'trainer' || (tTypeDef && tTypeDef.isTargetable === false))) {
      isDeflect = true;
    }

    const combatResult = CombatCalculator.calculate(attacker, target, power, attackerStats);
    if (!combatResult.hit) {
      // TODO: Emit miss/dodge event
      return;
    }
    let { totalDamage: dmg, totalHeal, isCrit, appliedEffects } = combatResult;

    if (totalHeal > 0) {
      target.hp = Math.min(target.maxHp, target.hp + totalHeal);
      for (const npc of npcsCatalog) {
        if (npc.state === 'dead' || npc.zone !== attacker.zone) continue;
        const npcHostileTo = state.entityGroups[npc.group || 'Civilian']?.hostileTo || [];
        const attackerGroup = (attacker.alignment || 'hero').toLowerCase();
        if (npcHostileTo.includes(attackerGroup)) {
          const distToTarget = Math.hypot(npc.x - target.x, npc.y - target.y);
          const distToHealer = Math.hypot(npc.x - attacker.x, npc.y - attacker.y);
          if (distToTarget < 400 || distToHealer < 400) {
            npc.aggroList = npc.aggroList || {};
            npc.aggroList[socket.id] = (npc.aggroList[socket.id] || 0) + totalHeal * 1.5;
          }
        }
      }
    }

    appliedEffects.forEach(eff => {
      if (eff.type === 'DoT') {
        if (!target.activeEffects) target.activeEffects = [];
        const existing = target.activeEffects.find(e => e.id === `dot_${powerId}`);
        if (existing) { existing.endTime = Date.now() + ((eff.duration || 5.0) * 1000); existing.damage = (eff.magnitude || 0); existing.tickRate = (eff.tickRate || 1.0) * 1000; }
        else { target.activeEffects.push({ id: `dot_${powerId}`, isDynamic: true, type: 'DoT', damage: (eff.magnitude || 0), tickRate: (eff.tickRate || 1.0) * 1000, duration: (eff.duration || 5.0) * 1000, startTime: Date.now(), endTime: Date.now() + ((eff.duration || 5.0) * 1000), lastTick: Date.now() }); }
      } else if (eff.type === 'Status') {
        const attackerLvl = attacker.level || 1; const targetLvl = target.level || 1; const levelDiff = targetLvl - attackerLvl;
        let resistance = Math.max(-1.0, Math.min(1.0, levelDiff * 0.15));
        resistance -= (attackerStats.control / 100);
        resistance = Math.max(-1.0, Math.min(1.0, resistance));
        const durationMult = Math.max(0.1, 1.0 - resistance);
        const finalDurationMs = Math.floor((eff.duration || 3) * 1000 * durationMult);
        if (finalDurationMs > 0) {
          if (!target.activeEffects) target.activeEffects = [];
          const statusType = eff.statusType || 'stun';
          const effectId = `status_${statusType}_${powerId}`;
          const existing = target.activeEffects.find(e => e.id === effectId);
          if (existing) { existing.endTime = Math.max(existing.endTime, Date.now() + finalDurationMs); existing.duration = finalDurationMs; }
          else { target.activeEffects.push({ id: effectId, isDynamic: true, type: 'Status', statusType: statusType, magnitude: eff.magnitude || 0, duration: finalDurationMs, startTime: Date.now(), endTime: Date.now() + finalDurationMs }); }
          io.to(target.zone || 'untitled').emit('status_applied', { targetId: effectiveTargetId, targetType: targetType, statusType: statusType });
        }
      }
    });

    if (isDeflect) dmg = 0;
    else {
      const levelDiff = (target.level || 1) - (attacker.level || 1);
      let resMult = 1.0 - Math.max(-1.0, Math.min(1.0, levelDiff * 0.15));
      resMult = Math.max(0.1, resMult);
      dmg *= resMult;
      target.hp -= dmg;
    }

    let isDead = false;
    if (target.hp <= 0) {
      target.hp = 0; target.state = targetType === 'npc' || targetType === 'drone' ? 'dead' : 'death'; isDead = true;
      if (targetType === 'npc') {
        handleNpcDeath(target);
        if (!isDeflect && attacker) {
          const expResult = deps.ProgressionSystem.awardExperience(attacker, target);
          if (expResult.expGained > 0) {
            if (expResult.leveledUp) {
              io.to(attacker.id).emit('system_dialog', `Congratulations! You reached Level ${expResult.newLevel}!`);
              io.to(attacker.zone || 'untitled').emit('spawn_fx', { x: attacker.x, y: attacker.y, z: (attacker.z || 0) + 50, vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport', isFX: true, color: '#f1c40f' });
              io.to(attacker.zone || 'untitled').emit('spawn_fx', { x: attacker.x, y: attacker.y, z: (attacker.z || 0) + 32, vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport_2', isFX: true, color: '#f1c40f' });
              for (let i = 0; i < 5; i++) io.to(attacker.zone || 'untitled').emit('spawn_fx', { x: attacker.x, y: attacker.y, z: (attacker.z || 0) + 64, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, vz: 100 + Math.random() * 200, life: 1.5, maxLife: 1.5, crumpleTimer: 0, wasteTex: 'fx_sparks', isFX: true, color: '#f1c40f', scale: 1.5 });

              for (let l = expResult.newLevel - expResult.levelsGained + 1; l <= expResult.newLevel; l++) {
                if (l % 2 === 0) attacker.unspentPowerPicks = (attacker.unspentPowerPicks || 0) + 1;
                if (l % 10 === 0) {
                  if (Array.isArray(attacker.unspentPowersetPicks)) attacker.unspentPowersetPicks.push("any");
                  else attacker.unspentPowersetPicks = (attacker.unspentPowersetPicks || 0) + 1;
                }
              }
            }
            io.to(attacker.id).emit('player_data_updated', {
              experience: attacker.experience, level: attacker.level,
              unspentPowerPicks: attacker.unspentPowerPicks, unspentPowersetPicks: attacker.unspentPowersetPicks
            });
          }
        }
      }
      else if (targetType === 'drone') { setTimeout(() => { delete activeDrones[targetId]; io.emit('drone_despawned', { uuid: targetId }); }, 2000); }
    }

    if (targetType === 'npc') {
      target.aggroList = target.aggroList || {};
      if (!isDeflect) target.aggroList[attacker.id] = (target.aggroList[attacker.id] || 0) + dmg + 50;
      io.emit('npc_took_damage', { targetUuid: targetId, damage: dmg, hp: target.hp, state: target.state, attackerName: attacker.name, isDead: isDead, isCrit: isCrit, isDeflect: isDeflect, activeEffects: target.activeEffects });
    } else if (targetType === 'player') {
      io.emit('player_took_damage', { targetId: targetId, damage: dmg, hp: target.hp, state: target.state, attackerName: attacker.name, isDead: isDead, isCrit: isCrit });
      io.to(targetId).emit('player_stats_updated', { hp: target.hp, energy: target.energy, synthEnergy: target.synthEnergy, activePowers: target.activePowers, maxHp: target.maxHp, maxEnergy: target.maxEnergy, maxSynthEnergy: target.maxSynthEnergy, activeEffects: target.activeEffects });
    } else if (targetType === 'drone') {
      io.emit('drone_took_damage', { targetUuid: targetId, damage: dmg, hp: target.hp, state: target.state, attackerName: attacker.name, isDead: isDead, isCrit: isCrit });
    }
  });

  socket.on('spawn_projectile', (data) => {
    const attacker = activePlayers[socket.id];
    if (!attacker || attacker.isLoading) return;
    const isIncapable = attacker.activeEffects && attacker.activeEffects.some(e => e.type === 'Status' && (e.statusType === 'stun' || e.statusType === 'hold'));
    if (isIncapable) { socket.emit('action_incapable', { reason: 'Incapable: You are stunned or held!' }); return; }
    const powerId = data.powerId || 'throw-airplane';
    const power = SERVER_POWER_REGISTRY[powerId];
    if (!power || !attacker.powers || !attacker.powers.includes(powerId)) return;
    const now = Date.now();
    attacker.lastAttackTimes = attacker.lastAttackTimes || {};
    const lastTime = attacker.lastAttackTimes[powerId] || 0;
    const cooldownMs = power.stats?.rechargeRate !== undefined ? power.stats.rechargeRate * 1000 : 1000;
    if (now - lastTime < cooldownMs - 50) return;
    if (attacker.energy === undefined) attacker.energy = 1000;
    if (attacker.synthEnergy === undefined) attacker.synthEnergy = 1000;
    const energyCost = power.stats?.energyCost !== undefined ? power.stats.energyCost : 10;
    const batteryCost = power.stats?.batteryCost || 0;
    if (attacker.energy < energyCost || attacker.synthEnergy < batteryCost) return;
    attacker.energy -= energyCost; attacker.synthEnergy -= batteryCost; attacker.lastAttackTimes[powerId] = now;

    let attackerStats = { critChance: 0, critDmg: 0, control: 0 };
    if (attacker.powers) {
      attacker.powers.forEach(pId => {
        const pDef = SERVER_POWER_REGISTRY[pId];
        if (pDef && pDef.type?.toLowerCase() === 'passive' && pDef.stats) {
          attackerStats.critChance += pDef.stats.critChanceBonus || 0;
          attackerStats.critDmg += pDef.stats.critDamageBonus || 0;
          attackerStats.control += pDef.stats.controlBonus || 0;
        }
      });
    }
    if (attacker.activePowers) {
      attacker.activePowers.forEach(pId => {
        const pDef = SERVER_POWER_REGISTRY[pId];
        if (pDef && pDef.type?.toLowerCase() === 'toggle' && pDef.stats) {
          attackerStats.critChance += pDef.stats.critChanceBonus || 0;
          attackerStats.critDmg += pDef.stats.critDamageBonus || 0;
          attackerStats.control += pDef.stats.controlBonus || 0;
        }
      });
    }

    const startX = attacker.x; const startY = attacker.y; const startZ = (attacker.z !== undefined ? attacker.z : getServerTerrainZ(attacker.x, attacker.y)) + 24;
    const targetX = data.targetX !== undefined ? data.targetX : startX; const targetY = data.targetY !== undefined ? data.targetY : startY; const targetZ = data.targetZ !== undefined ? data.targetZ : getServerTerrainZ(targetX, targetY) + 10;
    let bonusCrit = data.targetId ? 0.25 : 0;
    let isCrit = false; let damage = 0;
    if (power.effects && power.effects.length > 0) {
      const finalCritChance = (power.stats?.critChance || 5) + attackerStats.critChance + (bonusCrit * 100);
      isCrit = Math.random() * 100 <= finalCritChance; const finalCritMult = isCrit ? ((power.stats?.critMult || 1.5) + (attackerStats.critDmg / 100)) : 1.0;
      power.effects.forEach(eff => { if (eff.type === 'Damage' && Math.random() * 100 <= (eff.chance || 100)) { damage += (eff.magnitude || 0) * finalCritMult; } });
    } else { isCrit = Math.random() * 100 <= ((power.critChance || 0) + (bonusCrit * 100) + attackerStats.critChance); damage = (isCrit ? (power.critDamage || 0) * (1.0 + (attackerStats.critDmg / 100)) : power.damage) || 0; }
    const maxDist = Math.max(1, Math.hypot(targetX - startX, targetY - startY, targetZ - startZ));
    const cappedDist = Math.min(maxDist, power.stats?.range || 1000);
    const proj = { uuid: randomUUID(), powerId: powerId, senderId: socket.id, senderName: attacker.name, startX: startX, startY: startY, startZ: startZ, x: startX, y: startY, z: startZ, targetX: startX + ((targetX - startX) / maxDist) * cappedDist, targetY: startY + ((targetY - startY) / maxDist) * cappedDist, targetZ: startZ + ((targetZ - startZ) / maxDist) * cappedDist, speed: power.visuals?.projectileSpeed !== undefined ? power.visuals.projectileSpeed : (power.projSpeed || 400), damage: damage, effects: power.effects || [], critMult: isCrit ? ((power.stats?.critMult || 1.5) + (attackerStats.critDmg / 100)) : 1.0, isCrit: isCrit, attackerStats: attackerStats, projectileArc: power.visuals?.projectileArc || 0, trailSize: power.visuals?.trailSize || 2.5, projectileStyle: power.visuals?.projectileStyle || (power.visuals?.isLaser ? 'laser' : 'sprite'), trailColor: power.visuals?.trailColor || '#f1c40f', maxDist: cappedDist, distTravelled: 0, active: true, zone: attacker.zone || 'untitled' };
    activeProjectiles.push(proj);
    io.to(attacker.zone || 'untitled').emit('spawn_projectile', {
      uuid: proj.uuid, powerId: proj.powerId, senderId: proj.senderId, startX: proj.startX, startY: proj.startY, startZ: proj.startZ, targetX: proj.targetX, targetY: proj.targetY, targetZ: proj.targetZ, speed: proj.speed, isCrit: proj.isCrit, damage: proj.damage,
      projectileStyle: proj.projectileStyle, trailColor: proj.trailColor, trailSize: proj.trailSize, projectileArc: proj.projectileArc,
      projectileVisuals: power.visuals?.projectileVisuals
    });
  });

  socket.on('summon_entity', (data) => {
    const player = activePlayers[socket.id];
    if (!player || player.state === 'death') return;
    if (data.powerId === 'satelite-support') {
      const hasEquipRobot = player.powers && player.powers.some(pId => pId === 'equip-robot' || (SERVER_POWER_REGISTRY[pId] && SERVER_POWER_REGISTRY[pId].name === 'Equip Robot'));
      const hasUpgradeRobot = player.powers && player.powers.some(pId => pId === 'upgrade-robot' || pId === 'upgrade-robots' || (SERVER_POWER_REGISTRY[pId] && (SERVER_POWER_REGISTRY[pId].name === 'Upgrade Robot' || SERVER_POWER_REGISTRY[pId].name === 'Upgrade Robots')));
      const numDrones = hasUpgradeRobot ? 3 : (hasEquipRobot ? 2 : 1);
      const existingDrones = Object.values(activeDrones).filter(d => d.ownerSocketId === socket.id && d.state !== 'dead');
      const existingIndices = existingDrones.map(d => d.orbitIndex);
      let delay = 0;
      for (let i = 0; i < numDrones; i++) {
        if (existingIndices.includes(i)) continue;
        setTimeout(() => {
          const p = activePlayers[socket.id]; if (!p || p.state === 'death') return;
          const droneId = randomUUID();
          const newDrone = { uuid: droneId, ownerSocketId: socket.id, ownerName: p.name, x: p.x, y: p.y, z: (p.z || 0) + 220, state: 'idle', dir: 'down', orbitIndex: i, orbitOffset: (i / numDrones) * Math.PI * 2 + (Math.random() * Math.PI), hp: hasUpgradeRobot ? 150 : 100, maxHp: hasUpgradeRobot ? 150 : 100, type: 'drone', isCombatDrone: i === 1, isAssaultDrone: i === 2, isUpgraded: hasUpgradeRobot, zone: p.zone || 'untitled' };
          activeDrones[droneId] = newDrone; io.to(p.zone || 'untitled').emit('drone_spawned', newDrone);
        }, delay);
        delay += 2000;
      }
    }
  });
};
