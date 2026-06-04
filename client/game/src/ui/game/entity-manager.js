import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { getBlockProps } from './blocks.js?v=cache-bust-005';
import { POWER_REGISTRY } from './registry.js?v=cache-bust-005';

const DIRECTIONS = ['down-left', 'down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left'];

export class EntityManager {
  constructor(engine) {
    this.engine = engine;
  }

  getFrameCount(state) {
    if (!state) return 8;
    if (state === 'idle' || state === 'fly-idle') return 12;
    if (state.startsWith('attack') || state.startsWith('throw-attack')) return 7;
    if (state.startsWith('cast:')) {
      const powerId = state.split(':')[1];
      const pDef = POWER_REGISTRY[powerId];
      if (pDef && pDef.visuals?.casterVisuals && pDef.visuals.casterVisuals.length > 0 && pDef.visuals.casterVisuals[0].sequence !== 'None') {
        const seqData = this.engine.renderer.assetManager.sequenceLibrary[pDef.visuals.casterVisuals[0].sequence];
        if (seqData) return seqData.frames;
      }
      return 4; // Fallback for generic cast
    }
    return 8; // walk, run, dash, jump, hurt, death
  }

  update(dt) {
    const updateBubbles = (entity) => {

      if (entity.chatBubble) {
        if (!entity.chatBubbles) entity.chatBubbles = [];
        entity.chatBubbles.push({ text: entity.chatBubble.text, timer: 4000, opacity: 0 });
        delete entity.chatBubble;
      }
      if (!entity.chatBubbles) return;
      for (let i = entity.chatBubbles.length - 1; i >= 0; i--) {
        const b = entity.chatBubbles[i];
        b.timer -= dt;

                if (b.timer > 0 && b.opacity < 1) b.opacity = Math.min(1, b.opacity + dt / 150);
        else if (b.timer <= 0) b.opacity -= dt / 300;

                if (b.currentY === undefined) b.currentY = b.targetY || 0;
        b.currentY += ((b.targetY || 0) - b.currentY) * 15 * (dt / 1000);

        if (b.opacity <= 0) entity.chatBubbles.splice(i, 1);
      }
    };

    updateBubbles(this.engine.player);
    for (let id in this.engine.otherPlayers) updateBubbles(this.engine.otherPlayers[id]);
    this.engine.npcs.forEach(npc => updateBubbles(npc));

    this.engine.entityGrid = new Map();
    const cellSize = 128;
    const addToGrid = (ent, type, id) => {
      const gx = Math.floor(ent.x / cellSize);
      const gy = Math.floor(ent.y / cellSize);
      const key = `${gx}_${gy}`;
      if (!this.engine.entityGrid.has(key)) this.engine.entityGrid.set(key, []);
      this.engine.entityGrid.get(key).push({ ent, type, id });
    };
    this.engine.npcs.forEach(npc => addToGrid(npc, 'npc', npc.uuid));
    for (let id in this.engine.otherPlayers) addToGrid(this.engine.otherPlayers[id], 'player', id);

    this.updatePlayer(dt);
    this.updateNpcs(dt);
    this.updateOtherPlayers(dt);
    this.updateDrones(dt);
  }

  updatePlayer(dt) {
    const eng = this.engine;
    const player = eng.player;

    if (player.teleportTarget) {
      player.teleportTarget.timer -= dt / 1000;

      const powerDef = POWER_REGISTRY['teleport'];
      const tint = powerDef?.visuals?.tint || '#9b59b6';

      for (let i = 0; i < 8; i++) {
          eng.spawnParticle({
              x: player.x + (Math.random() - 0.5) * 32,
              y: player.y + (Math.random() - 0.5) * 32,
              z: (player.z || 0) + Math.random() * 64,
              vx: (Math.random() - 0.5) * 80,
              vy: (Math.random() - 0.5) * 80,
              vz: 50 + Math.random() * 100,
              noGravity: true,
              life: 0.2 + Math.random() * 0.3,
              maxLife: 0.5,
              color: tint,
              size: 2 + Math.random() * 4
          });
      }

      if (player.teleportTarget.timer <= 0) {
          eng.cameraShake = Math.max(eng.cameraShake, 6);
          const targetX = player.teleportTarget.x;
          const targetY = player.teleportTarget.y;
          const targetZ = eng.getTerrainZ(targetX, targetY);

          eng.network.sendPlayerTeleported();

          let hasCustom = false;
          if (powerDef?.visuals?.targetVisuals && powerDef.visuals.targetVisuals.length > 0) {
            powerDef.visuals.targetVisuals.forEach(vis => {
              if (vis.sequence && vis.sequence !== 'None') {
                hasCustom = true;
                setTimeout(() => {
                  const fxData = {
                    x: targetX, y: targetY, z: targetZ + (vis.offsetZ || 0),
                    vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0,
                    wasteTex: vis.sequence, isFX: true, color: tint
                  };
                  eng.debris.push(fxData);
                  if (eng.network) eng.network.sendSpawnFX(fxData);
                }, (vis.delay || 0) * 1000);
              }
            });
          }
          if (!hasCustom) {
            // Fallback to old hardcoded effects
            const fxData = {
              x: targetX, y: targetY, z: targetZ + 50, vx: 0, vy: 0, vz: 0,
              life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport', isFX: true
            };
            const fxData2 = {
              x: targetX, y: targetY, z: targetZ + 32, vx: 0, vy: 0, vz: 0,
              life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport_2', isFX: true
            };
            eng.debris.push(fxData);
            eng.debris.push(fxData2);
            if (eng.network) { eng.network.sendSpawnFX(fxData); eng.network.sendSpawnFX(fxData2); }
          }

          player.x = targetX;
          player.y = targetY;
          player.z = targetZ;
          eng.camera.x = player.x;
          eng.camera.y = player.y;

          for (let i = 0; i < 60; i++) {
              eng.spawnParticle({
                  x: targetX + (Math.random() - 0.5) * 40,
                  y: targetY + (Math.random() - 0.5) * 40,
                  z: targetZ + Math.random() * 80,
                  vx: (Math.random() - 0.5) * 300,
                  vy: (Math.random() - 0.5) * 300,
                  vz: (Math.random() - 0.5) * 300,
                  life: 0.3 + Math.random() * 0.4,
                  maxLife: 0.7,
                  color: tint,
                  size: 3 + Math.random() * 5
              });
          }
          for (let i = 0; i < 40; i++) {
             const angle = (i / 40) * Math.PI * 2;
             eng.spawnParticle({
                 x: targetX,
                 y: targetY,
                 z: targetZ + 5,
                 vx: Math.cos(angle) * 500,
                 vy: Math.sin(angle) * 500,
                 vz: 0,
                 life: 0.4,
                 maxLife: 0.4,
                 color: tint,
                 size: 6
             });
          }

          player.teleportTarget = null;
      }
    }

    if (player.actionTimer > 0) {
      player.actionTimer -= dt;
      if (player.actionTimer <= 0) {
        if (player.state !== 'death') player.state = 'idle';
      }
    }

    if (player.hurtTimer > 0) player.hurtTimer -= dt;

    if (player.state !== 'death' && player.hp < player.maxHp) {
      const integrity = eng.playerData.integrity || 0;
      if (integrity === 0) {
        player.hp += 1 * (dt / 1000);
        if (player.hp > player.maxHp) player.hp = player.maxHp;
        eng.ui.update();
      }
    }

    if (player.state !== 'death') {
      let netEnergy = 0;
      let netBattery = 0;

      if (eng.playerData.powers) {
         eng.playerData.powers.forEach(pId => {
            const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
            if (pDef && pDef.type?.toLowerCase() === 'passive') {
               let canRecover = true;
               if (pDef.engineScript?.trim().toLowerCase() === 'solar_recovery') {
                  const cycleDuration = 480000;
                  let realT = ((Date.now() % cycleDuration) / cycleDuration);
                  let realAngle = (realT < (2 / 3)) ? (realT / (2 / 3)) * Math.PI : Math.PI + ((realT - (2 / 3)) / (1 / 3)) * Math.PI;
                  if (Math.sin(realAngle) <= 0) canRecover = false;
               }
               if (pDef.engineScript?.trim().toLowerCase() === 'lunar_recovery') {
                  const cycleDuration = 480000;
                  let realT = ((Date.now() % cycleDuration) / cycleDuration);
                  let realAngle = (realT < (2 / 3)) ? (realT / (2 / 3)) * Math.PI : Math.PI + ((realT - (2 / 3)) / (1 / 3)) * Math.PI;
                  if (Math.sin(realAngle) > 0) canRecover = false;
               }
               if (canRecover) {
                 netEnergy += pDef.stats?.recoveryRatePerSecond || 0;
                 netBattery += pDef.stats?.batteryRecoveryRatePerSecond || 0;
               }
            }
         });
      }
      if (player.activePowers) {
         player.activePowers.forEach(pId => {
            const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
            if (pDef && pDef.type?.toLowerCase() === 'toggle') {
               netEnergy -= pDef.stats?.energyCostPerSecond || 0;
               netBattery -= pDef.stats?.batteryCostPerSecond || 0;
            }
         });
      }

      if (netBattery > 0 && player.synthEnergy < (player.maxSynthEnergy || 1000)) {
         if (Math.random() > 0.6) {
             eng.spawnParticle({
                 x: player.x + (Math.random() - 0.5) * 32,
                 y: player.y + (Math.random() - 0.5) * 32,
                 z: (player.z || 0) + Math.random() * 20,
                 vx: (Math.random() - 0.5) * 15,
                 vy: (Math.random() - 0.5) * 15,
                 vz: 30 + Math.random() * 30,
                 life: 0.3 + Math.random() * 0.4,
                 maxLife: 0.7,
                 color: '#00d2ff', // Cyan / Battery color
                 size: 2 + Math.random() * 3,
                 noGravity: true
             });
         }
      }

      let updatedUI = false;
      if (netEnergy !== 0) { const oldE = player.energy; player.energy = Math.max(0, Math.min(player.maxEnergy, player.energy + netEnergy * (dt / 1000))); if (Math.floor(player.energy) !== Math.floor(oldE)) updatedUI = true; }
      if (netBattery !== 0) { const oldB = player.synthEnergy; player.synthEnergy = Math.max(0, Math.min(player.maxSynthEnergy || 1000, player.synthEnergy + netBattery * (dt / 1000))); if (Math.floor(player.synthEnergy) !== Math.floor(oldB)) updatedUI = true; }
      if (updatedUI) eng.ui.update();
    }

    let screenDx = 0; let screenDy = 0;
    let isPressingShift = false;
    let isPressingSpace = false;

    if (player.state === 'death') {
      eng.screenFade = Math.min(1.0, eng.screenFade + (dt / 3000));
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        player.state = 'idle';
        player.hp = player.maxHp;
        player.frame = 0;
        const mapCenter = (256 * 32) / 2;
        player.x = mapCenter + (Math.random() - 0.5) * 300;
        player.y = mapCenter + (Math.random() - 0.5) * 300;
        player.z = eng.getTerrainZ(player.x, player.y) + 45;
        eng.camera.x = player.x;
        eng.camera.y = player.y;
        eng.ui.update();
        eng.chat.addMessage('system', 'System', 'You have respawned!');
        eng.lastEmit.state = 'respawning';
      }
    } else {
      if (eng.screenFade > 0) eng.screenFade = Math.max(0, eng.screenFade - (dt / 2000));

      if (player.isSitting && (eng.keys['w'] || eng.keys['s'] || eng.keys['a'] || eng.keys['d'] || eng.keys[' '])) {
         player.isSitting = false;
         if (player.preSitPos) {
           player.x = player.preSitPos.x;
           player.y = player.preSitPos.y;
           player.z = player.preSitPos.z;
           if (eng.checkCollision(player.x, player.y, player.z)) {
              eng.findSafeSpawn();
           }
           eng.camera.x = player.x;
           eng.camera.y = player.y;
           player.preSitPos = null;
         }
      }

      const camSens = eng.clientSettings.cameraSensitivity !== undefined ? eng.clientSettings.cameraSensitivity : 120;
      const invertX = eng.clientSettings.invertCameraX ? -1 : 1;
      const invertY = eng.clientSettings.invertCameraY ? -1 : 1;

      const kbs = eng.clientSettings.keybinds || { undo: 'z', redo: 'y', picker: '', flyDown: 'x', camUp: 'pageup', camDown: 'pagedown', camLeft: 'q', camRight: 'e' };
      const camLeftKey = (kbs.camLeft || 'q').toLowerCase();
      const camRightKey = (kbs.camRight || 'e').toLowerCase();
      const camUpKey = (kbs.camUp || 'pageup').toLowerCase();
      const camDownKey = (kbs.camDown || 'pagedown').toLowerCase();

      if (eng.keys[camLeftKey]) {
        if (eng.renderer && eng.renderer.rotateCamera) eng.renderer.rotateCamera(camSens * invertX * (dt / 1000), 0);
      }
      if (eng.keys[camRightKey]) {
        if (eng.renderer && eng.renderer.rotateCamera) eng.renderer.rotateCamera(-camSens * invertX * (dt / 1000), 0);
      }
      if (eng.keys[camUpKey]) {
        if (eng.renderer && eng.renderer.rotateCamera) eng.renderer.rotateCamera(0, -camSens * 1.5 * invertY * (dt / 1000));
      }
      if (eng.keys[camDownKey]) {
        if (eng.renderer && eng.renderer.rotateCamera) eng.renderer.rotateCamera(0, camSens * 1.5 * invertY * (dt / 1000));
      }

      if (player.isSitting || player.teleportTarget || (eng.arcadeSystem && eng.arcadeSystem.isActive)) {
         screenDx = 0; screenDy = 0;
         isPressingShift = false; isPressingSpace = false;
         player.vx = 0; player.vy = 0;
         player.momentumX = 0; player.momentumY = 0;
         player.state = player.teleportTarget ? player.state : 'idle';
         player.frame = player.teleportTarget ? player.frame : 0;
      } else {
         if (eng.keys['w']) screenDy -= 1;
         if (eng.keys['s']) screenDy += 1;
         if (eng.keys['a']) screenDx -= 1;
         if (eng.keys['d']) screenDx += 1;
         isPressingShift = eng.clientSettings.alwaysSprint ? !eng.keys['shift'] : !!eng.keys['shift'];
         isPressingSpace = eng.keys[' '];
      }
    }

    player.vx = 0;
    player.vy = 0;

    if (screenDx !== 0 || screenDy !== 0) {
      player.moveTarget = null;
      player.movePath = null;

      const camAngle = eng.renderer ? (eng.renderer.cameraAngle || 0) : 0;
      const totalRotation = -Math.PI / 4 + (camAngle * Math.PI / 180);

      const length = Math.sqrt(screenDx * screenDx + screenDy * screenDy);
      const nx = -screenDx / length;
      const ny = screenDy / length;

      player.vx = nx * Math.cos(totalRotation) - ny * Math.sin(totalRotation);
      player.vy = nx * Math.sin(totalRotation) + ny * Math.cos(totalRotation);
          } else if (player.movePath && player.movePath.length > 0) {
      player.moveTarget.timer -= (dt / 1000);
      if (player.moveTarget.timer <= 0) {
        player.moveTarget = null;
        player.movePath = null;
      } else {
        let currentTarget = player.movePath[0];
        const distToWaypoint = Math.hypot(currentTarget.x - player.x, currentTarget.y - player.y);

        if (distToWaypoint < 16) {
          player.movePath.shift(); // Reached waypoint
          if (player.movePath.length > 0) {
            currentTarget = player.movePath[0];
          }
        }

        if (player.movePath.length > 0) {
          player.vx = currentTarget.x - player.x;
          player.vy = currentTarget.y - player.y;
          if (player.moveTarget.sprint) isPressingShift = true;

          const tz = currentTarget.z !== undefined ? currentTarget.z : eng.getTerrainZ(currentTarget.x, currentTarget.y);
          if (tz > (player.z || 0) + 8 && (player.vz || 0) <= 0 && player.actionTimer <= 0) {
             isPressingSpace = true;
          }

        } else {
          player.moveTarget = null;
        }
      }
    } else if (player.moveTarget) {
      player.moveTarget.timer -= (dt / 1000);
      if (player.moveTarget.timer <= 0) {
        player.moveTarget = null;
      } else {
        const dist = Math.hypot(player.moveTarget.x - player.x, player.moveTarget.y - player.y);
        if (dist < 5) {
          player.moveTarget = null;
        } else {
          player.vx = player.moveTarget.x - player.x;
          player.vy = player.moveTarget.y - player.y;
          if (player.moveTarget.sprint) isPressingShift = true;
        }
      }
    }

    const isMoving = player.vx !== 0 || player.vy !== 0;
    let speed = player.speed;

    if (isPressingShift && !player.wasPressingShift && isMoving && player.actionTimer <= 0) {
      if (player.energy >= 50) {
        player.energy -= 50;
        eng.ui.update();
        player.state = 'dash';
        player.frame = 0;
        player.frameTimer = 0;
        player.actionTimer = 400;
      }
    }
    player.wasPressingShift = isPressingShift;

    if (player.wasInWater) {
      if (isPressingSpace) {
        player.vz = (player.vz || 0) + 1200 * (dt / 1000); // Smooth swim force
        if (player.vz > 200) player.vz = 200; // Terminal swim up velocity
      }
    } else {
      if (isPressingSpace && player.actionTimer <= 0) {
        const targetZ = eng.getTerrainZ(player.x, player.y);
        if (player.energy >= 25 && (player.z || 0) <= targetZ + 1) {
          player.energy -= 25;
          eng.ui.update();
          player.state = 'jump';
          player.frame = 0;
          player.frameTimer = 0;
          player.actionTimer = 4 * player.frameInterval;

          let jumpVz = 450;
          let forwardBoost = 0;
          if (player.activePowers) {
            if (player.activePowers.includes('super-jump')) {
              jumpVz = 900;
              forwardBoost = 400;
            } else if (player.activePowers.includes('mighty-leap')) {
              jumpVz = 650;
              forwardBoost = 200;
            }
          }
          player.vz = jumpVz;

          if (forwardBoost > 0 && isMoving) {
            const len = Math.hypot(player.vx, player.vy);
            player.momentumX += (player.vx / len) * forwardBoost;
            player.momentumY += (player.vy / len) * forwardBoost;
          }
        }
      }

        if (!isPressingSpace && player.wasPressingSpace && player.vz > 0) {
          player.vz *= 0.4;
        }
    }
    player.wasPressingSpace = isPressingSpace;

    if (player.state === 'death' || player.teleportTarget) {
      speed = 0;
    } else {
      if (isMoving) {
        speed = isPressingShift ? player.runSpeed : player.speed;

        if (player.activePowers && player.activePowers.includes('super-speed')) {
          const oldMult = player.superSpeedMult || 1.0;
          player.superSpeedMult = Math.min(4.0, (player.superSpeedMult || 1.0) + (dt / 1000) * 1.75);
          speed *= player.superSpeedMult;

          const pGroundZ = eng.getTerrainZ(player.x, player.y);
          if (isPressingShift && player.superSpeedMult > 1.5 && Math.abs((player.z || 0) - pGroundZ) < 1.0) {
            if (oldMult <= 1.5) {
              const fxData = {
                x: player.x, y: player.y, z: (player.z || 0) + 32,
                vx: 0, vy: 0, vz: 0, life: 0.5, maxLife: 0.5, crumpleTimer: 0, wasteTex: 'fx_speed_start', isFX: true,
                color: '#f1c40f',
                flipX: Math.random() > 0.5
              };
              eng.debris.push(fxData);
              if (eng.network) eng.network.sendSpawnFX(fxData);
            }

            if (Math.random() > 0.6) {
              const stepFx = {
                x: player.x + (Math.random() - 0.5) * 16, y: player.y + (Math.random() - 0.5) * 16, z: (player.z || 0) + 19,
                vx: 0, vy: 0, vz: 0, life: 0.3, maxLife: 0.3, crumpleTimer: 0, wasteTex: 'fx_speed_step', isFX: true,
                color: '#f1c40f',
                flipX: Math.random() > 0.5
              };
              eng.debris.push(stepFx);
            }

            const particleCount = Math.floor(player.superSpeedMult);
            for (let p = 0; p < particleCount; p++) {
              if (Math.random() > 0.2) {
                eng.spawnParticle({
                  x: player.x + (Math.random() - 0.5) * 16,
                  y: player.y + (Math.random() - 0.5) * 16,
                  z: (player.z || 0) + 2,
                  vx: -(player.momentumX || 0) * 0.1 + (Math.random() - 0.5) * 50,
                  vy: -(player.momentumY || 0) * 0.1 + (Math.random() - 0.5) * 50,
                  vz: 10 + Math.random() * 40,
                  life: 0.2 + Math.random() * 0.3,
                  maxLife: 0.5,
                  color: '#f1c40f',
                  size: 2 + Math.random() * 4
                });
              }
            }
          }
        } else {
          player.superSpeedMult = 1.0;
        }

        if (player.wasInWater) speed *= 0.4; // Wading/swimming penalty
        else if (eng.mapManager) {
          const currentGridZ = Math.round((player.z || 0) / 32);
          for (let offset = 0; offset >= -1; offset--) {
            const v = eng.mapManager.getVoxelAt(player.x, player.y, (currentGridZ + offset) * 32);
            if (v) {
              const props = getBlockProps(v.tex);
              if (props.isSolid) {
                if (props.speedMultiplier) speed *= props.speedMultiplier;
                break;
              }
            }
          }
        }
      } else {
        speed = 0;
        player.superSpeedMult = 1.0;
      }

      if (player.actionTimer > 0) {
        if (player.state === 'dash') {
          speed = player.runSpeed * 1.5;
          if (player.wasInWater) speed *= 0.4;
        }
      } else {
        if (player.isSitting) {
          player.state = 'idle';
        } else if (player.activePowers && player.activePowers.includes('fly')) {
          player.state = isMoving ? 'fly' : 'fly-idle';
        } else {
          player.state = isMoving ? (isPressingShift ? 'run' : 'walk') : 'idle';
        }
      }
    }


    let groundTex = null;
    let isOnGround = false;
    const groundZ = eng.getTerrainZ(player.x, player.y, player.z, false);
    if (groundZ > -96 && Math.abs((player.z || 0) - groundZ) < 1.0) {
      isOnGround = true;
      const radius = 14;
      const corners = [
        { dx: 0, dy: 0 }, { dx: -radius, dy: -radius }, { dx: radius, dy: -radius },
        { dx: -radius, dy: radius }, { dx: radius, dy: radius }
      ];
      for (let c of corners) {
        const vx = player.x + c.dx;
        const vy = player.y + c.dy;
        for (let zOffset = 1; zOffset >= -1; zOffset--) {
          const checkZ = Math.floor(groundZ / 32) + zOffset;
          const v = eng.mapManager.getVoxelAt(vx, vy, checkZ * 32);
          if (v) {
            const props = getBlockProps(v.tex);
            if (props.isSolid) {
              const top = eng.getVoxelTop(v, checkZ, vx, vy);
              if (Math.abs(top - groundZ) < 0.5) {
                groundTex = v.tex;
                break;
              }
            }
          }
        }
        if (groundTex) break;
      }
    }

    let targetVx = 0;
    let targetVy = 0;
    if (isMoving && speed > 0) {
      const len = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      targetVx = (player.vx / len) * speed;
      targetVy = (player.vy / len) * speed;
    }

    if (player.momentumX === undefined) player.momentumX = 0;
    if (player.momentumY === undefined) player.momentumY = 0;


    if (groundTex === 'ice' || !isOnGround) {
      if (groundTex === 'ice') {
        const slopeCheckDist = 5;
        const zNorth = eng.getTerrainZ(player.x, player.y - slopeCheckDist, player.z, true);
        const zSouth = eng.getTerrainZ(player.x, player.y + slopeCheckDist, player.z, true);
        const zEast = eng.getTerrainZ(player.x + slopeCheckDist, player.y, player.z, true);
        const zWest = eng.getTerrainZ(player.x - slopeCheckDist, player.y, player.z, true);

        if (zNorth > -96 && zSouth > -96 && zEast > -96 && zWest > -96) {
          const gradX = zEast - zWest;
          const gradY = zSouth - zNorth;

          if (Math.abs(gradX) > 0.1 || Math.abs(gradY) > 0.1) {
            const gradLen = Math.hypot(gradX, gradY);
            if (gradLen > 0.1) {
              const slopeForce = 600;
              player.momentumX -= (gradX / gradLen) * slopeForce * (dt / 1000);
              player.momentumY -= (gradY / gradLen) * slopeForce * (dt / 1000);
            }
          }
        }
      }

      if (isMoving) {
        const accel = isOnGround ? 1000 : (player.activePowers && player.activePowers.includes('fly') ? 800 : 400);

        if (Math.sign(player.momentumX) === Math.sign(targetVx) && Math.abs(player.momentumX) > Math.abs(targetVx)) {
           // Preserve excess momentum when pushing the same direction
        } else {
           if (player.momentumX < targetVx) player.momentumX = Math.min(targetVx, player.momentumX + accel * (dt / 1000));
           else if (player.momentumX > targetVx) player.momentumX = Math.max(targetVx, player.momentumX - accel * (dt / 1000));
        }

        if (Math.sign(player.momentumY) === Math.sign(targetVy) && Math.abs(player.momentumY) > Math.abs(targetVy)) {
           // Preserve excess momentum when pushing the same direction
        } else {
           if (player.momentumY < targetVy) player.momentumY = Math.min(targetVy, player.momentumY + accel * (dt / 1000));
           else if (player.momentumY > targetVy) player.momentumY = Math.max(targetVy, player.momentumY - accel * (dt / 1000));
        }
      }

      let friction = isOnGround ? 150 : 50;
      if (!isOnGround && player.activePowers && player.activePowers.includes('fly')) {
        friction = 150; // Increased aerial drag for gliding, but not overly harsh
      }

      let currentSpeed = Math.hypot(player.momentumX, player.momentumY);
      if (currentSpeed > 0) {
        const frictionEffect = friction * (dt / 1000);
        if (currentSpeed < frictionEffect) {
          player.momentumX = 0;
          player.momentumY = 0;
        } else {
          player.momentumX -= (player.momentumX / currentSpeed) * frictionEffect;
          player.momentumY -= (player.momentumY / currentSpeed) * frictionEffect;
        }
      }

      let maxPhysSpeed = player.runSpeed * (isOnGround ? 1.6 : 2.0);
      if (player.activePowers && player.activePowers.includes('super-speed')) {
        maxPhysSpeed *= 4.0;
      }
      currentSpeed = Math.hypot(player.momentumX, player.momentumY);
      if (currentSpeed > maxPhysSpeed) {
        player.momentumX = (player.momentumX / currentSpeed) * maxPhysSpeed;
        player.momentumY = (player.momentumY / currentSpeed) * maxPhysSpeed;
      }
    } else {
      player.momentumX = targetVx;
      player.momentumY = targetVy;
    }

    if (!isMoving && Math.hypot(player.momentumX, player.momentumY) < 5) {
      player.momentumX = 0;
      player.momentumY = 0;
    }

    const totalMoveX = player.momentumX * (dt / 1000);
    const totalMoveY = player.momentumY * (dt / 1000);
    const isEffectivelyMoving = Math.hypot(player.momentumX, player.momentumY) > 0.5;
    player.doorPushedThisFrame = false;

    if (isEffectivelyMoving) {
      let nextX = player.x + totalMoveX;
      let nextY = player.y + totalMoveY;
      const maxMapSize = 511 * 32;

      if (nextX < 0) { nextX = 0; player.momentumX = 0; }
      if (nextX > maxMapSize) { nextX = maxMapSize; player.momentumX = 0; }
      if (nextY < 0) { nextY = 0; player.momentumY = 0; }
      if (nextY > maxMapSize) { nextY = maxMapSize; player.momentumY = 0; }

      const finalMoveX = nextX - player.x;
      const finalMoveY = nextY - player.y;

      let hitX = false;
      if (!eng.checkCollision(player.x + finalMoveX, player.y, player.z || 0)) {
        player.x += finalMoveX;
      } else {
        hitX = true;
      }

      let hitY = false;
      if (!eng.checkCollision(player.x, player.y + finalMoveY, player.z || 0)) {
        player.y += finalMoveY;
      } else {
        hitY = true;
      }

      if (groundTex === 'ice') {
        const bounceFactor = 0.8;
        if (hitX && Math.abs(player.momentumX) > 80) {
          if (Math.abs(player.momentumX) > 200) {
            eng.cameraShake = Math.max(eng.cameraShake, Math.min(10, Math.abs(player.momentumX) * 0.03));
            for (let i = 0; i < 10; i++) {
              eng.spawnParticle({
                x: player.x + Math.sign(finalMoveX) * 14,
                y: player.y + (Math.random() - 0.5) * 20,
                z: (player.z || 0) + 5 + Math.random() * 15,
                vx: -player.momentumX * 0.2 + (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                vz: 10 + Math.random() * 30,
                noGravity: true,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.6,
                color: 'rgba(150, 150, 150, 0.5)',
                size: 3 + Math.random() * 4,
                tex: 'smoke'
              });
            }
          }
          player.momentumX *= -bounceFactor;
          for (let i = 0; i < 5; i++) {
            eng.spawnParticle({
              x: player.x + Math.sign(finalMoveX) * 14, y: player.y + (Math.random() - 0.5) * 16, z: (player.z || 0) + 5 + Math.random() * 15,
              vx: player.momentumX * 0.5 + (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, vz: 10 + Math.random() * 40,
              life: 0.2 + Math.random() * 0.2, maxLife: 0.4, color: '#ffffff', size: 2 + Math.random() * 3
            });
          }
        }
        if (hitY && Math.abs(player.momentumY) > 80) {
          if (Math.abs(player.momentumY) > 200) {
            eng.cameraShake = Math.max(eng.cameraShake, Math.min(10, Math.abs(player.momentumY) * 0.03));
            for (let i = 0; i < 10; i++) {
              eng.spawnParticle({
                x: player.x + (Math.random() - 0.5) * 20,
                y: player.y + Math.sign(finalMoveY) * 14,
                z: (player.z || 0) + 5 + Math.random() * 15,
                vx: (Math.random() - 0.5) * 50,
                vy: -player.momentumY * 0.2 + (Math.random() - 0.5) * 50,
                vz: 10 + Math.random() * 30,
                noGravity: true,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.6,
                color: 'rgba(150, 150, 150, 0.5)',
                size: 3 + Math.random() * 4,
                tex: 'smoke'
              });
            }
          }
          player.momentumY *= -bounceFactor;
          for (let i = 0; i < 5; i++) {
            eng.spawnParticle({
              x: player.x + (Math.random() - 0.5) * 16, y: player.y + Math.sign(finalMoveY) * 14, z: (player.z || 0) + 5 + Math.random() * 15,
              vx: (Math.random() - 0.5) * 50, vy: player.momentumY * 0.5 + (Math.random() - 0.5) * 50, vz: 10 + Math.random() * 40,
              life: 0.2 + Math.random() * 0.2, maxLife: 0.4, color: '#ffffff', size: 2 + Math.random() * 3
            });
          }
        }
      } else {
        if (hitX) player.momentumX = 0;
        if (hitY) player.momentumY = 0;
      }

      if (!player.state.startsWith('attack') && !player.state.startsWith('throw-attack')) {
        const angle = Math.atan2(totalMoveY, totalMoveX);
        let normalizedAngle = angle + Math.PI / 8;
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
        const dirIndex = Math.floor(normalizedAngle / (Math.PI / 4)) % 8;
        player.dir = DIRECTIONS[dirIndex];
      }
    }

    if (!player.doorPushedThisFrame) {
      player.doorPushTimer = 0;
    }

    if (groundTex === 'ice' && isEffectivelyMoving) {
      const slideSpeed = Math.hypot(player.momentumX, player.momentumY);
      if (slideSpeed > 50 && Math.random() > 0.2) {
        const pCount = Math.min(3, Math.ceil(slideSpeed / 100));
        for (let i = 0; i < pCount; i++) {
          eng.spawnParticle({
            x: player.x + (Math.random() - 0.5) * 20,
            y: player.y + (Math.random() - 0.5) * 20,
            z: (player.z || 0) + 2,
            vx: -player.momentumX * 0.2 + (Math.random() - 0.5) * 40,
            vy: -player.momentumY * 0.2 + (Math.random() - 0.5) * 40,
            vz: 10 + Math.random() * 20,
            life: 0.2 + Math.random() * 0.2,
            maxLife: 0.4,
            color: '#e0f7fa',
            size: 2 + Math.random() * 2
          });
        }
      }
    }

    if (!isMoving && isEffectivelyMoving && player.actionTimer <= 0) {
      player.state = 'walk';
    }

    player.frameTimer += dt;
    let currentInterval = player.frameInterval;
    if (player.state === 'death') currentInterval *= 3;
    else if (player.state.startsWith('throw-attack')) currentInterval /= 2;
    else if (player.state.startsWith('attack')) currentInterval /= 2;
    if (player.frameTimer >= currentInterval) {
      player.frameTimer -= currentInterval;
      const maxFrames = this.getFrameCount(player.state);
      if (player.state === 'death') {
        if (player.frame < maxFrames - 1) player.frame++;
      } else {
        player.frame = (player.frame + 1) % maxFrames;
      }
    }
  }

  updateNpcs(dt) {
    this.engine.npcs.forEach(npc => {
      if (npc.hurtTimer > 0) npc.hurtTimer -= dt;
      npc.frameTimer += dt;
      let npcInterval = this.engine.player.frameInterval;
      if (npc.state === 'death') npcInterval *= 3;
      else if (npc.state && (npc.state.startsWith('throw-attack') || npc.state.startsWith('attack') || npc.state.startsWith('cast:'))) npcInterval /= 2;
      if (npc.frameTimer >= npcInterval) {
        npc.frameTimer -= npcInterval;
        const maxFrames = this.getFrameCount(npc.state);
        if (npc.state === 'dead') {
          if (npc.frame < maxFrames - 1) npc.frame++;
        } else {
          npc.frame = (npc.frame + 1) % maxFrames;
        }
      }
    });
  }

  updateOtherPlayers(dt) {
    Object.values(this.engine.otherPlayers).forEach(op => {
      if (op.hurtTimer > 0) op.hurtTimer -= dt;
      op.frameTimer = (op.frameTimer || 0) + dt;
      let opInterval = this.engine.player.frameInterval;
      if (op.state === 'death') opInterval *= 3;
      else if (op.state && (op.state.startsWith('throw-attack') || op.state.startsWith('attack') || op.state.startsWith('cast:'))) opInterval /= 2;
      if (op.frameTimer >= opInterval) {
        op.frameTimer -= opInterval;
        const maxFrames = this.getFrameCount(op.state || 'idle');
        if (op.state === 'death') {
          if ((op.frame || 0) < maxFrames - 1) op.frame = (op.frame || 0) + 1;
        } else {
          op.frame = ((op.frame || 0) + 1) % maxFrames;
        }
      }

      const opGroundZ = this.engine.getTerrainZ(op.x, op.y);
      if (op.activePowers && op.activePowers.includes('super-speed') && (op.state === 'run' || op.state === 'dash') && Math.abs((op.z || 0) - opGroundZ) < 1.0) {
         if (Math.random() > 0.6) {
             this.engine.debris.push({
               x: op.x + (Math.random() - 0.5) * 16, y: op.y + (Math.random() - 0.5) * 16, z: (op.z || 0) + 19,
               vx: 0, vy: 0, vz: 0, life: 0.3, maxLife: 0.3, crumpleTimer: 0, wasteTex: 'fx_speed_step', isFX: true,
               color: '#f1c40f',
               flipX: Math.random() > 0.5
             });
         }
         if (Math.random() > 0.4) {
             this.engine.spawnParticle({
                x: op.x + (Math.random() - 0.5) * 16,
                y: op.y + (Math.random() - 0.5) * 16,
                z: (op.z || 0) + 2,
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                vz: 10 + Math.random() * 40,
                life: 0.2 + Math.random() * 0.3,
                maxLife: 0.5,
                color: '#f1c40f',
                size: 2 + Math.random() * 4
             });
         }
      }
    });
  }

  updateDrones(dt) {
    const eng = this.engine;
    for (const id in eng.drones) {
        const drone = eng.drones[id];
        drone.frameTimer = (drone.frameTimer || 0) + dt;

        let state = 'idle';
        if (drone.dir) {
            if (drone.dir.includes('up')) state = 'forward';
            else if (drone.dir.includes('down')) state = 'backward';
        }
        drone.state = state;

        const maxFrames = 1; // Drones are single-frame for now
        const animSpeed = 120;

        if (drone.frameTimer >= animSpeed) {
            drone.frameTimer -= animSpeed;
            drone.frame = ((drone.frame || 0) + 1) % maxFrames;
        }
    }
  }

  updateEntities() {
    const activeEntities = new Set();
    const renderer = this.engine.renderer;
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(renderer.camera.quaternion);

    const updateEntityMesh = (entity, id) => {
      activeEntities.add(id);
      let group = renderer.entityMeshes.get(id);

      if (!group) {
        group = new THREE.Group();

        if (!renderer.baseEntityMaterial) {
            renderer.baseEntityMaterial = new THREE.MeshPhongMaterial({
              transparent: true,
              alphaTest: 0.5,
              depthWrite: true,
              side: THREE.FrontSide,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1,
              shininess: 0
            });
            // Force the sprite normal to always point UP in world space so the daylight hits it uniformly!
            renderer.baseEntityMaterial.onBeforeCompile = (shader) => {
              shader.vertexShader = shader.vertexShader.replace(
                '#include <defaultnormal_vertex>',
                `vec3 transformedNormal = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);`
              ).replace(
                '#include <project_vertex>',
                `
                vec4 mvPosition = vec4( transformed, 1.0 );
                #ifdef USE_INSTANCING
                    mvPosition = instanceMatrix * mvPosition;
                #endif
                mvPosition = modelViewMatrix * mvPosition;
                mvPosition.z += (position.y + 0.5) * 60.0;
                gl_Position = projectionMatrix * mvPosition;
                `
              );
            };
            renderer.baseEntityMaterial.customProgramCacheKey = () => 'baseEntityMat';
        }

        const mat = renderer.baseEntityMaterial.clone();
        mat.onBeforeCompile = renderer.baseEntityMaterial.onBeforeCompile;
        mat.customProgramCacheKey = renderer.baseEntityMaterial.customProgramCacheKey;

        const geo = new THREE.PlaneGeometry(1, 1);
        const sprite = new THREE.Mesh(geo, mat);
        sprite.castShadow = false;
        sprite.receiveShadow = true;
        sprite.frustumCulled = false;

        group.add(sprite);
        group.userData.sprite = sprite;

        const proxyGeo = new THREE.CylinderGeometry(8, 8, 38, 8);
        proxyGeo.rotateX(Math.PI / 2);
        proxyGeo.translate(0, 0, 19);
        const proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
        const shadowProxy = new THREE.Mesh(proxyGeo, proxyMat);
        shadowProxy.castShadow = this.engine.clientSettings.enableShadows !== false;
        shadowProxy.receiveShadow = false;
        group.add(shadowProxy);
        group.userData.shadowProxy = shadowProxy;

        if (!id.startsWith('proj_')) {
          const shadowGeo = new THREE.CircleGeometry(10, 16);
          const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
          const shadow = new THREE.Mesh(shadowGeo, shadowMat);
          group.add(shadow);
          group.userData.shadow = shadow;
        }

        renderer.scene.add(group);
        renderer.entityMeshes.set(id, group);
      }

      const sprite = group.userData.sprite;
      const shadow = group.userData.shadow;

      let state = entity.state || 'idle';
      if (state === 'dead') state = 'death';
      else if (entity.hurtTimer > 0) state = 'hurt';

      let width = 154;
      let height = 154;

      if (entity.type === 'drone') {
        state = `drone_${state}`;
        width = 64;
        height = 64;
        sprite.position.copy(camUp).multiplyScalar(0); // Drones are centered
      } else if (state === 'attack1' || state === 'attack2' || state === 'throw-attack1') {
        width = 230;
        height = 230;
      }

      sprite.scale.set(width, height, 1);

      // By shifting the sprite 37 units along the camera's local Y axis,
      // its physical feet perfectly anchor to the exact center of the world group!
      if (entity.type !== 'drone') {
        sprite.position.copy(camUp).multiplyScalar(37);
      }
      sprite.quaternion.copy(renderer.camera.quaternion);

      group.position.set(entity.x, entity.y, entity.z || 0);

      if (shadow) {
        shadow.visible = !!this.engine.clientSettings.showBaseplates && !this.engine.clientSettings.enableDayNightCycle;
        const terrainZ = this.engine.getTerrainZ(entity.x, entity.y, entity.z || 0);
        shadow.position.set(0, 0, terrainZ - (entity.z || 0) + 0.5);

        const heightDiff = Math.max(0, (entity.z || 0) - terrainZ);
        const shadowScale = Math.max(0.1, 1 - (heightDiff / 200));
        shadow.scale.set(shadowScale, shadowScale, 1);
      }

      const relDir = renderer.getRelativeSpriteDirection(entity.dir || 'down');
      const tex = renderer.assetManager.textures[state] || renderer.assetManager.textures['idle'];

      if (tex) {

        if (sprite.userData.mapUuid !== tex.uuid) {
          sprite.material.map = tex.clone();
          sprite.userData.mapUuid = tex.uuid;
          sprite.userData.state = state;
          sprite.material.needsUpdate = true;
        }

        if (entity.type === 'drone') {
            sprite.material.map.repeat.set(1, 1);
            sprite.material.map.offset.set(0, 0);
        } else {
            let dirCols = {
              'up-left': 0, 'left': 1, 'down-left': 2, 'down': 3,
              'down-right': 4, 'right': 5, 'up-right': 6, 'up': 7
            };
            const colIndex = dirCols[relDir] !== undefined ? dirCols[relDir] : 3;
            const rows = tex.userData.rows || 8;
            sprite.material.map.offset.x = colIndex / 8;
            sprite.material.map.offset.y = 1.0 - (((entity.frame || 0) % rows) + 1) * (1 / rows);
        }

        const maxFrames = this.getFrameCount(entity.state || 'idle');
        if (state === 'death' && (entity.frame || 0) >= maxFrames - 1) {
          group.visible = false;
        } else {
          group.visible = true;
        }
      }
    };
    if (this.engine.player) updateEntityMesh(this.engine.player, 'player_self');
    for (const id in this.engine.otherPlayers) updateEntityMesh(this.engine.otherPlayers[id], `player_${id}`);
    for (const npc of this.engine.npcs) updateEntityMesh(npc, `npc_${npc.uuid}`);
    for (const id in this.engine.drones) updateEntityMesh(this.engine.drones[id], `drone_${id}`);

    for (const [id, group] of renderer.entityMeshes.entries()) {
      if (!activeEntities.has(id) && !id.startsWith('proj_') && !id.startsWith('drone_')) {
        renderer.scene.remove(group);
        if (group.userData.sprite) group.userData.sprite.material.dispose();
        if (group.userData.shadow) {
          group.userData.shadow.material.dispose();
          group.userData.shadow.geometry.dispose();
        }
        renderer.entityMeshes.delete(id);
      }
    }
  }

  updateDebris() {
    if (!this.engine.debris) return;
    const activeDebris = new Set();
    const renderer = this.engine.renderer;

    this.engine.debris.forEach((deb, idx) => {
      const id = `deb_${idx}`;
      activeDebris.add(id);

      let group = renderer.debrisMeshes.get(id);
      if (!group) {
        group = new THREE.Group();

        if (!renderer.baseDebrisMaterial) {
            renderer.baseDebrisMaterial = new THREE.MeshPhongMaterial({ transparent: true, alphaTest: 0.5, depthWrite: true, side: THREE.DoubleSide, shininess: 0 });
            renderer.baseDebrisMaterial.onBeforeCompile = (shader) => {
              shader.vertexShader = shader.vertexShader.replace(
                '#include <defaultnormal_vertex>',
                `vec3 transformedNormal = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);`
              ).replace(
                '#include <project_vertex>',
                `
                vec4 mvPosition = vec4( transformed, 1.0 );
                #ifdef USE_INSTANCING
                    mvPosition = instanceMatrix * mvPosition;
                #endif
                mvPosition = modelViewMatrix * mvPosition;
                mvPosition.z += (position.y + 0.5) * 60.0;
                gl_Position = projectionMatrix * mvPosition;
                `
              );
            };
            renderer.baseDebrisMaterial.customProgramCacheKey = () => 'baseDebrisMat';
        }

        const mat = renderer.baseDebrisMaterial.clone();
        mat.onBeforeCompile = renderer.baseDebrisMaterial.onBeforeCompile;
        mat.customProgramCacheKey = renderer.baseDebrisMaterial.customProgramCacheKey;

        const geo = new THREE.PlaneGeometry(1, 1);
        const sprite = new THREE.Mesh(geo, mat);
        sprite.castShadow = id !== 'player_self' && this.engine.clientSettings.enableShadows !== false;
        sprite.receiveShadow = true;
        sprite.frustumCulled = false;
        group.add(sprite);
        group.userData.sprite = sprite;

        const shadowGeo = new THREE.CircleGeometry(4, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        group.add(shadow);
        group.userData.shadow = shadow;

        renderer.scene.add(group);
        renderer.debrisMeshes.set(id, group);
      }

      const sprite = group.userData.sprite;
      const shadow = group.userData.shadow;

      let texName = deb.wasteTex;
      if (deb.isCharred) texName = 'charred_1';
      else if (deb.crumpleTimer > 0.2) texName = 'cronched_1';
      else if (deb.crumpleTimer > 0.1) texName = 'cronched_2';
      else if (deb.crumpleTimer > 0) texName = 'cronched_3';

      const tex = renderer.assetManager.textures[texName];
      if (tex && sprite.userData.mapUuid !== tex.uuid) {
        sprite.material.map = tex.clone();
        sprite.userData.mapUuid = tex.uuid;
        sprite.userData.tex = texName;
        sprite.material.needsUpdate = true;
      }

      // Apply these outside the texture check to handle recycled object pooling correctly
      if (deb.isFX) {
        sprite.material.blending = THREE.AdditiveBlending;
        sprite.material.depthWrite = false;
        sprite.renderOrder = (texName === 'fx_teleport_2' || texName === 'fx_speed_start' || texName === 'fx_speed_step') ? 1000 : 999;
        sprite.material.color.setHex(0x000000); // Prevents the sun from double-brightening it
        if (deb.color) {
          sprite.material.emissive.setStyle(deb.color);
        } else {
          sprite.material.emissive.setHex(0xffffff);
        }
        sprite.material.emissiveMap = sprite.material.map;
        sprite.material.alphaTest = 0.01; // Prevents the soft glowing edges from being culled
        sprite.castShadow = false;
        if (texName === 'fx_teleport_2' || texName === 'fx_speed_start' || texName === 'fx_speed_step') {
          sprite.material.polygonOffset = true;
          sprite.material.polygonOffsetFactor = -10;
          sprite.material.polygonOffsetUnits = -10;
        } else {
          sprite.material.polygonOffset = false;
        }
      } else {
        sprite.material.blending = THREE.NormalBlending;
        sprite.material.depthWrite = true;
        sprite.renderOrder = 0;
        sprite.material.color.setHex(0xffffff);
        sprite.material.emissive.setHex(0x000000);
        sprite.material.emissiveMap = null;
        sprite.material.alphaTest = 0.5;
        sprite.castShadow = this.engine.clientSettings.enableShadows !== false;
        sprite.material.polygonOffset = false;
      }

      if (deb.isFX) {
        sprite.scale.set(deb.flipX ? -96 : 96, 192, 1);
        const seqLib = renderer.assetManager.sequenceLibrary;
        const seqData = seqLib[texName];

        if (seqData && seqData.frames > 1 && tex) {
          const frameCount = seqData.frames;
          if (sprite.material.map) sprite.material.map.repeat.set(1 / frameCount, 1);
          if (texName.startsWith('impact_')) {
            const frameIndex = Math.floor((1.0 - (deb.life / deb.maxLife)) * frameCount);
            if (sprite.material.map) sprite.material.map.offset.set(Math.min(frameIndex, frameCount - 1) / frameCount, 0);
            sprite.scale.set(192, 192, 1);
          } else {
            const speed = seqData.speed || 80;
              const elapsedMs = (deb.maxLife - deb.life) * 1000;
              const frameIndex = Math.floor(elapsedMs / speed) % frameCount;
            if (sprite.material.map) sprite.material.map.offset.set(frameIndex / frameCount, 0);
          }
        } else if ((texName === 'fx_teleport' || texName === 'fx_teleport_2' || texName === 'fx_speed_start' || texName === 'fx_speed_step') && tex) {
           const frameCount = texName === 'fx_speed_start' ? 9 : 8;
             const elapsedMs = (deb.maxLife - deb.life) * 1000;
             const frameIndex = Math.floor(elapsedMs / 80) % frameCount;
           if (sprite.material.map) sprite.material.map.offset.set(frameIndex / frameCount, 0);
        }
      } else {
        sprite.scale.set(48, 48, 1);
      }

      sprite.quaternion.copy(renderer.camera.quaternion);
      sprite.rotateZ(deb.rotation || 0);

      let currentOpacity = 1.0;
      if (deb.isFX) {
        currentOpacity = Math.max(0, deb.life / deb.maxLife);
      } else {
        const fadeStart = 3.0;
        currentOpacity = deb.life < fadeStart ? Math.max(0, deb.life / fadeStart) : 1.0;
      }
      sprite.material.opacity = currentOpacity;

      if (deb.isFX) {
        if (texName === 'fx_teleport_2' || texName === 'fx_speed_start' || texName === 'fx_speed_step') {
          sprite.position.set(0, 0, 0);
        } else {
          const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(renderer.camera.quaternion);
          sprite.position.copy(camUp).multiplyScalar(32);
        }
      } else {
        sprite.position.set(0, 0, 0);
      }
      group.position.set(deb.x, deb.y, deb.z);

      if (shadow) {
        shadow.visible = !deb.isFX;
        const tz = this.engine.getTerrainZ(deb.x, deb.y, deb.z);
        const heightDiff = Math.max(0, deb.z - tz);
        const shadowScale = Math.max(0.1, 1 - (heightDiff / 100));
        shadow.scale.set(shadowScale, shadowScale, 1);
        shadow.material.opacity = currentOpacity * 0.4;
      }
    });

    for (const [id, group] of renderer.debrisMeshes.entries()) {
      if (!activeDebris.has(id)) {
        renderer.scene.remove(group);
        if (group.userData.sprite) group.userData.sprite.material.dispose();
        if (group.userData.shadow) {
          group.userData.shadow.material.dispose();
          group.userData.shadow.geometry.dispose();
        }
        renderer.debrisMeshes.delete(id);
      }
    }
  }
}
