import { POWER_REGISTRY } from './registry.js?v=new-engine-330';
import { PowerScripts, PowerExecutors } from './power-scripts.js?v=new-engine-330';
const DIRECTIONS = ['down-left', 'down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left'];

export class CombatManager {
  constructor(engine) {
    this.engine = engine;
  }

  getCombatTargetParams(powerId) {
    const eng = this.engine;
    const power = POWER_REGISTRY[powerId] || {};
    const isSupport = power.category === 'Support' || power.type === 'support';
    const combatStyle = eng.clientSettings.combatStyle || 'hybrid';

    let targetX = eng.player.x;
    let targetY = eng.player.y;
    let targetEntity = null;

    if (combatStyle === 'mouse') {
      if (eng.mouseWorldPos) {
        targetX = eng.mouseWorldPos.x;
        targetY = eng.mouseWorldPos.y;
      }
      return { targetX, targetY, targetEntity };
    }

    let selectedEnt = null;
    if (eng.selectedTarget) {
      if (eng.selectedTarget.type === 'npc') {
        selectedEnt = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
      } else if (eng.selectedTarget.type === 'player') {
        selectedEnt = eng.otherPlayers[eng.selectedTarget.id];
      }
      if (selectedEnt && selectedEnt.state !== 'dead' && selectedEnt.state !== 'death') {
        targetEntity = { type: eng.selectedTarget.type, id: eng.selectedTarget.id, entity: selectedEnt };
      }
    }

    if (!targetEntity && combatStyle === 'hybrid' && eng.hoveredEntity) {
      if (eng.hoveredEntity.type === 'npc') {
        selectedEnt = eng.npcs.find(n => n.uuid === eng.hoveredEntity.id);
      } else if (eng.hoveredEntity.type === 'player') {
        selectedEnt = eng.otherPlayers[eng.hoveredEntity.id];
      }
      if (selectedEnt && selectedEnt.state !== 'dead' && selectedEnt.state !== 'death') {
        targetEntity = { type: eng.hoveredEntity.type, id: eng.hoveredEntity.id, entity: selectedEnt };
      }
    }

    let findClosest = false;
    let maxRange = Infinity;
    if (combatStyle === 'target') {
      findClosest = true;
    } else if (combatStyle === 'hybrid' && (power.type === 'melee' || powerId === 'brawl')) {
      findClosest = true;
      maxRange = (power.range || 200) + 50; // Give a 50px leniency to match server-side dropoff limits
    }

    if (!targetEntity && findClosest) {
      let closestDist = Infinity;
      let closestEnt = null;
      let closestType = null;
      let closestId = null;

      const px = eng.player.x;
      const py = eng.player.y;
      const myAlignment = eng.playerData.alignment || 'hero';

      const checkValidTarget = (ent, isPlayer) => {
        if (ent.state === 'dead' || ent.state === 'death') return false;

        let isEnemy = true;
        if (isPlayer) {
          const opAlignment = ent.alignment || 'hero';
          if (myAlignment === 'hero' && opAlignment === 'hero') isEnemy = false;
        }

        if (isSupport) {
          return !isEnemy || ent === eng.player;
        } else {
          return isEnemy;
        }
      };

      eng.npcs.forEach(npc => {
        if (checkValidTarget(npc, false)) {
          const dist = Math.hypot(npc.x - px, npc.y - py);
          if (dist < closestDist && dist <= maxRange) {
            closestDist = dist;
            closestEnt = npc;
            closestType = 'npc';
            closestId = npc.uuid;
          }
        }
      });

      for (let id in eng.otherPlayers) {
        const op = eng.otherPlayers[id];
        if (checkValidTarget(op, true)) {
          const dist = Math.hypot(op.x - px, op.y - py);
          if (dist < closestDist && dist <= maxRange) {
            closestDist = dist;
            closestEnt = op;
            closestType = 'player';
            closestId = id;
          }
        }
      }

      if (closestEnt) {
        targetEntity = { type: closestType, id: closestId, entity: closestEnt };
        eng.selectedTarget = { type: closestType, id: closestId };
        eng.ui.update();
      }
    }

    if (targetEntity) {
      targetX = targetEntity.entity.x;
      targetY = targetEntity.entity.y;
    } else {
      if (combatStyle === 'hybrid' && eng.mouseWorldPos) {
        targetX = eng.mouseWorldPos.x;
        targetY = eng.mouseWorldPos.y;
      }
    }

    return { targetX, targetY, targetEntity };
  }

  closeNearbyDoors(px, py, pz) {
    const eng = this.engine;

    for (let dx = -64; dx <= 64; dx += 32) {
      for (let dy = -64; dy <= 64; dy += 32) {
        for (let dz = -64; dz <= 64; dz += 32) {
          const vx = Math.round((px + dx) / 32) * 32;
          const vy = Math.round((py + dy) / 32) * 32;
          const vz = Math.round((pz + dz) / 32) * 32;

          const voxel = eng.mapManager.getVoxelAt(vx, vy, vz);

          if (
            voxel &&
            voxel.shape &&
            voxel.shape.includes('door') &&
            voxel.shape.includes('_open')
          ) {
            voxel.shape = voxel.shape.replace('_open', '');
            eng.mapManager.setVoxelAt(vx, vy, vz, voxel);
          }
        }
      }
    }
  }

  toggleTravelPower(powerName) {
    const eng = this.engine;

    if (!eng.player.activePowers) eng.player.activePowers = [];
    const idx = eng.player.activePowers.indexOf(powerName);

    if (idx === -1) {
      const powerDef = POWER_REGISTRY[powerName];
      if (powerDef) {
        const energyCost = powerDef.stats?.energyCost || 0;
        const batteryCost = powerDef.stats?.batteryCost || 0;
        if (eng.player.energy < energyCost) {
          if (eng.showFloatingText) eng.showFloatingText('Not Enough Energy', '#3498db');
          return;
        }
        if (eng.player.synthEnergy < batteryCost) {
          if (eng.showFloatingText) eng.showFloatingText('Not Enough Power', '#00d2ff');
          return;
        }
        eng.player.energy -= energyCost;
        eng.player.synthEnergy -= batteryCost;
      }
      eng.player.activePowers.push(powerName);
    } else {
      eng.player.activePowers.splice(idx, 1);
      if (powerName === 'super-speed') eng.player.superSpeedMult = 1.0;
    }

    if (eng.ui && eng.ui.powerbar) eng.ui.powerbar.updatePowerbar();
    eng.ui.update();
  }

  usePower(powerId, isRepeat = false) {
    const eng = this.engine;
    const powerDef = POWER_REGISTRY[powerId];
    const engineScript = powerDef?.engineScript || powerId;

    if (powerDef?.type?.toLowerCase() === 'toggle' || ['fly', 'super-jump', 'super-speed', 'mighty-leap', 'dash', 'speed-serum', 'combat-flight', 'combat-jumping', 'jetpack', 'flashlight'].includes(engineScript)) {
      if (isRepeat) return; // Prevent rapid toggling when holding down the key
      this.toggleTravelPower(powerId);
      return;
    }

    if (PowerScripts[engineScript]) {
      PowerScripts[engineScript](eng, powerId);
      return;
    }

    this.triggerTargetedPower(powerId);
  }

  executePowerLocation(powerId, targetX, targetY) {
    const eng = this.engine;
    const powerDef = POWER_REGISTRY[powerId];
    const engineScript = powerDef?.engineScript || powerId;
    if (PowerExecutors[engineScript]) {
      PowerExecutors[engineScript](eng, targetX, targetY, powerId);
    }
  }

  triggerTargetedPower(powerId) {
    const eng = this.engine;
    if (eng.player.state === 'death' && powerId !== 'dev-reset') return;

    let directTargetId = null;
    let targetType = null;

    if (powerId === 'dev-reset') {
       directTargetId = eng.accountUuid; // Server will override to self
       targetType = 'player';
    } else {
       const combatParams = this.getCombatTargetParams(powerId);
       if (combatParams.targetEntity) {
         directTargetId = combatParams.targetEntity.id;
         targetType = combatParams.targetEntity.type;
       }
    }

    if (!directTargetId) {
       eng.chat.addMessage('system', 'System', 'You need a target for this power.');
       return;
    }

    eng.network.sendCombatHit({
      targetId: directTargetId,
      targetType: targetType,
      powerId: powerId
    });
  }
}
