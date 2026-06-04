import { getBlockProps } from './blocks.js?v=cache-bust-005';
import { FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';

export class PhysicsManager {
  constructor(engine) {
    this.engine = engine;
  }

  getVoxelTop(voxel, zIndex, x, y) {
    if (!voxel) return -1000;
    if (voxel.shape === 'slab') return (zIndex * 32) + 0;
    if (voxel.shape === 'top_slab') return (zIndex * 32) + 16;
    if (FURNITURE_REGISTRY && FURNITURE_REGISTRY[voxel.shape]) {
        const customHeight = FURNITURE_REGISTRY[voxel.shape].collisionHeight;
        return customHeight !== undefined ? (zIndex * 32) - 16 + (customHeight * 32) : (zIndex * 32) + 0;
    }
    if (voxel.shape && (voxel.shape.startsWith('ramp') || voxel.shape.startsWith('half_ramp') || voxel.shape.startsWith('top_half_ramp') || voxel.shape.startsWith('stair'))) {
      const vx = Math.round(x / 32) * 32;
      const vy = Math.round(y / 32) * 32;
      const localX = x - vx;
      const localY = y - vy;
      let factor = 0.5;
      if (voxel.shape.endsWith('_s')) factor = (localY + 16) / 32;
      else if (voxel.shape.endsWith('_n')) factor = (16 - localY) / 32;
      else if (voxel.shape.endsWith('_e')) factor = (localX + 16) / 32;
      else if (voxel.shape.endsWith('_w')) factor = (16 - localX) / 32;

      if (voxel.shape.startsWith('half_ramp')) {
          return (zIndex * 32) - 16 + (16 * factor);
      } else if (voxel.shape.startsWith('top_half_ramp')) {
          return (zIndex * 32) + 0 + (16 * factor);
      }
      return (zIndex * 32) - 16 + (32 * factor);
    }
    return (zIndex * 32) + 16;
  }

  findPath(startX, startY, startZ, endX, endY) {
    const sx = Math.round(startX / 32) * 32;
    const sy = Math.round(startY / 32) * 32;
    const ex = Math.round(endX / 32) * 32;
    const ey = Math.round(endY / 32) * 32;

    const fallbackPath = [{ x: endX, y: endY }];
    fallbackPath.hasHazard = false;

    if (sx === ex && sy === ey) return fallbackPath;
    if (Math.hypot(ex - sx, ey - sy) > 2000) return fallbackPath; // Limit search range to prevent lag

    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const zMap = new Map();
    const hazardMap = new Map();

    const startNode = `${sx}_${sy}`;
    const endNode = `${ex}_${ey}`;

    openSet.push(startNode);
    gScore.set(startNode, 0);
    fScore.set(startNode, Math.hypot(ex - sx, ey - sy));
    zMap.set(startNode, startZ);
    hazardMap.set(startNode, false);

    let iterations = 0;
    while (openSet.length > 0 && iterations < 800) {
      iterations++;
      openSet.sort((a, b) => fScore.get(a) - fScore.get(b));
      const current = openSet.shift();

      if (current === endNode) {
        const path = [];
        let curr = current;
        let hasAnyHazard = false;
        while (cameFrom.has(curr)) {
          const [cx, cy] = curr.split('_').map(Number);
          if (hazardMap.get(curr)) hasAnyHazard = true;
          path.unshift({ x: cx, y: cy, z: zMap.get(curr) });
          curr = cameFrom.get(curr);
        }
        if (path.length > 0) {
            path[path.length - 1].x = endX;
            path[path.length - 1].y = endY;
            path[path.length - 1].z = this.getTerrainZ(endX, endY, zMap.get(endNode));
        }
        path.hasHazard = hasAnyHazard;
        return path;
      }

      closedSet.add(current);
      const [cx, cy] = current.split('_').map(Number);
      const cz = zMap.get(current);

      const neighbors = [ [0, -32], [0, 32], [-32, 0], [32, 0], [-32, -32], [32, -32], [-32, 32], [32, 32] ];

      for (const [dx, dy] of neighbors) {
        const nx = cx + dx; const ny = cy + dy;
        const nNode = `${nx}_${ny}`;
        if (closedSet.has(nNode)) continue;

        const nz = this.getTerrainZ(nx, ny, cz, true);
        if (Math.abs(nz - cz) > 18) continue; // Unwalkable height difference
        if (this.checkCollision(nx, ny, nz)) continue;

        let hazardPenalty = 0;
        let hasHazard = false;
        if (this.engine.mapManager) {
            const gridZ = Math.round(nz / 32);
            for (let offset = -1; offset <= 0; offset++) {
                const v = this.engine.mapManager.getVoxelAt(nx, ny, (gridZ + offset) * 32);
                if (v && (v.tex === 'lava' || v.tex === 'lava_flow' || v.tex === 'acid')) {
                    hazardPenalty = 10000;
                    hasHazard = true;
                    break;
                } else if (v && (v.tex === 'water' || v.tex === 'water_flow')) {
                    hazardPenalty = Math.max(hazardPenalty, 150);
                    hasHazard = true;
                }
            }
        }

        const tentativeG = gScore.get(current) + ((dx !== 0 && dy !== 0) ? 45.2 : 32) + hazardPenalty;
        if (!openSet.includes(nNode)) openSet.push(nNode);
        else if (tentativeG >= gScore.get(nNode)) continue;

        cameFrom.set(nNode, current);
        gScore.set(nNode, tentativeG);
        fScore.set(nNode, tentativeG + Math.hypot(ex - nx, ey - ny));
        zMap.set(nNode, nz);
        hazardMap.set(nNode, hasHazard);
      }
    }
    return fallbackPath; // Fallback if no path is found
  }

  getTerrainZ(x, y, currentZ, exactOnly = false) {
    const eng = this.engine;
    if (!eng.mapManager) return -96;
    const radius = 14;
    const corners = exactOnly ? [{ dx: 0, dy: 0 }] : [
      { dx: 0, dy: 0 }, { dx: -radius, dy: -radius }, { dx: radius, dy: -radius },
      { dx: -radius, dy: radius }, { dx: radius, dy: radius }
    ];

    const maxZ = currentZ !== undefined ? currentZ + 24 : 10000;
    const startZ = currentZ !== undefined ? Math.min(15, Math.floor(maxZ / 32) + 1) : 15;

    for (let z = startZ; z >= -10; z--) {
      let highestZ = -96;

      for (let c of corners) {
        const vx = x + c.dx;
        const vy = y + c.dy;
        const voxel = eng.mapManager.getVoxelAt(vx, vy, z * 32);
        if (voxel) {
          const props = getBlockProps(voxel.tex);
          if (props.isSolid) {
            const blockTop = this.getVoxelTop(voxel, z, vx, vy);
            if (blockTop > highestZ) highestZ = blockTop;
          }
        }
      }
      if (highestZ > -96 && highestZ <= maxZ) return highestZ;
    }
    return -96;
  }

  findSafeSpawn() {
    const eng = this.engine;
    if (eng.player.z === undefined) {
      eng.player.z = this.getTerrainZ(eng.player.x, eng.player.y);
    }

    if (!this.checkCollision(eng.player.x, eng.player.y, eng.player.z)) {
      return;
    }

    console.log("[Engine] Player is obstructed at spawn. Finding safe location...");
    const pZ = eng.player.z;
    const startGridX = Math.round(eng.player.x / 32);
    const startGridY = Math.round(eng.player.y / 32);
    const startGridZ = Math.round(pZ / 32);

    const maxRadius = 6;
    let safeSpot = null;

    for (let r = 0; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

          const checkX = startGridX + dx;
          const checkY = startGridY + dy;

          for (let zOffset = 0; zOffset <= 15; zOffset++) {
             const zDirs = zOffset === 0 ? [0] : [zOffset, -zOffset];

             for (let dz of zDirs) {
                const checkZ = startGridZ + dz;
                if (checkZ > 15 || checkZ < -10) continue;

                let hasFloor = false;
                const floorVoxel = eng.mapManager.getVoxelAt(checkX * 32, checkY * 32, (checkZ - 1) * 32);
                if (floorVoxel && getBlockProps(floorVoxel.tex).isSolid) {
                   hasFloor = true;
                } else if (checkZ <= -3) {
                   hasFloor = true;
                }

                if (hasFloor) {
                   let isClear = true;
                   for (let clearZ = 0; clearZ < 3; clearZ++) {
                      const v = eng.mapManager.getVoxelAt(checkX * 32, checkY * 32, (checkZ + clearZ) * 32);
                      if (v && getBlockProps(v.tex).isSolid) {
                         isClear = false;
                         break;
                      }
                   }
                   if (isClear) {
                      safeSpot = { x: checkX * 32, y: checkY * 32, z: checkZ * 32 };
                      break;
                   }
                }
             }
             if (safeSpot) break;
          }
          if (safeSpot) break;
        }
        if (safeSpot) break;
      }
      if (safeSpot) break;
    }

    if (safeSpot) {
       console.log("[Engine] Found safe 3x3 spawn clearance near", safeSpot);
       eng.player.x = safeSpot.x;
       eng.player.y = safeSpot.y;
       eng.player.z = safeSpot.z;
    } else {
       console.log("[Engine] Could not find 3x3 clearance nearby, moving to absolute top.");
       const highestZ = this.getTerrainZ(eng.player.x, eng.player.y);
       eng.player.z = highestZ + 10;
    }

    eng.camera.x = eng.player.x;
    eng.camera.y = eng.player.y;
    eng.camera.z = eng.player.z;
  }

  checkCollision(nextX, nextY, overrideZ) {
    const eng = this.engine;
    const radius = 14;
    const corners = [
      { dx: -radius, dy: -radius }, { dx: radius, dy: -radius },
      { dx: -radius, dy: radius }, { dx: radius, dy: radius }
    ];

    const pZ = overrideZ !== undefined ? overrideZ : (eng.player.z || 0);
    const currentGridZ = Math.floor((pZ + 5) / 32);
    const headGridZ = Math.floor((pZ + 48) / 32);

    for (let c of corners) {
      for (let z = currentGridZ - 2; z <= headGridZ; z++) { // Look downwards to catch the base of tall furniture
        const vx = nextX + c.dx;
        const vy = nextY + c.dy;
        const voxel = eng.mapManager.getVoxelAt(vx, vy, z * 32);
        if (voxel) {
          const props = getBlockProps(voxel.tex);
          if (props.isSolid) {
            if (voxel.shape && voxel.shape.includes('door')) {
              if (!voxel.shape.includes('_open')) {
                eng.player.doorPushedThisFrame = true;

                const gridX = Math.round(vx / 32) * 32;
                const gridY = Math.round(vy / 32) * 32;
                const gridZ = z * 32;

                const v = eng.mapManager.getVoxelAt(gridX, gridY, gridZ);
                if (v && v.shape && v.shape.includes('door') && !v.shape.includes('_open')) {
                  v.shape += '_open';
                  v._openedAt = performance.now(); // Record the exact moment it was pushed!
                  eng.mapManager.setVoxelAt(gridX, gridY, gridZ, v);
                  eng.autoOpenedDoors.set(`${gridX}_${gridY}_${gridZ}`, { x: gridX, y: gridY, z: gridZ, timer: 3000 });

                  if (eng.doors) {
                      const doorObj = eng.doors.find(d => d.x === gridX && d.y === gridY && d.z === gridZ);
                      if (doorObj) {
                          doorObj.shape = v.shape;
                      } else {
                          eng.doors.push({ x: gridX, y: gridY, z: gridZ, shape: v.shape, tex: v.tex, color: v.color, dir: v.dir });
                      }
                  }
                }
              }
              continue; // Let the precise broadphase check handle door collision blocking
            }
            if (voxel.shape && voxel.shape.endsWith('_open')) continue;

            const blockTop = this.getVoxelTop(voxel, z, vx, vy);
            if (blockTop > pZ + 17) {
              eng.player.doorPushTimer = 0;
              return true;
            }
          }
        }
      }
    }

    const cx = Math.round(nextX / 32) * 32;
    const cy = Math.round(nextY / 32) * 32;
    const cz = Math.round(pZ / 32) * 32;
    for (let dx = -32; dx <= 32; dx += 32) {
      for (let dy = -32; dy <= 32; dy += 32) {
        for (let dz = -32; dz <= 64; dz += 32) {
          const vx = cx + dx, vy = cy + dy, vz = cz + dz;
          const voxel = eng.mapManager.getVoxelAt(vx, vy, vz);
          if (voxel && voxel.shape && voxel.shape.includes('door')) {
             let isSolid = !voxel.shape.includes('_open');

             // If it's open, but was opened less than 150ms ago, it's still physically blocking!
             if (!isSolid && voxel._openedAt) {
                 const elapsed = performance.now() - voxel._openedAt;
                 if (elapsed < 150) {
                     isSolid = true;
                 }
             }

             if (isSolid) {
                 let minX = vx - 16, maxX = vx + 16, minY = vy - 16, maxY = vy + 16;
                 const baseShape = voxel.shape.replace('_open', '');
                 const dirE = baseShape.includes('door_e') || voxel.dir === 'e';
                 const dirN = baseShape.includes('door_n') || voxel.dir === 'n';
                 const dirW = baseShape.includes('door_w') || voxel.dir === 'w';

                 if (dirE) { minX = vx + 8; }
                 else if (dirN) { maxY = vy - 8; }
                 else if (dirW) { maxX = vx - 8; }
                 else { minY = vy + 8; }

                 if (nextX > minX - 14 && nextX < maxX + 14 && nextY > minY - 14 && nextY < maxY + 14) {
                    const customHeight = FURNITURE_REGISTRY[baseShape]?.collisionHeight || 1;
                    if (pZ < vz + (customHeight * 32) && pZ + 48 > vz - 16) return true;
                 }
             }
          }
        }
      }
    }

    if (eng.entityGrid) {
      const cellSize = 128;
      const minGx = Math.floor((nextX - 55) / cellSize);
      const maxGx = Math.floor((nextX + 55) / cellSize);
      const minGy = Math.floor((nextY - 55) / cellSize);
      const maxGy = Math.floor((nextY + 55) / cellSize);

      for (let gx = minGx; gx <= maxGx; gx++) {
        for (let gy = minGy; gy <= maxGy; gy++) {
          const cell = eng.entityGrid.get(`${gx}_${gy}`);
          if (!cell) continue;
          for (let item of cell) {
            const ent = item.ent;
            if (ent.state === 'dead' || ent.state === 'death') continue;
            if (Math.abs((ent.z || 0) - pZ) >= 48) continue;

            const dx = Math.abs(ent.x - nextX);
            if (dx >= 55) continue;
            const dy = Math.abs(ent.y - nextY);
            if (dy >= 55) continue;

            if (dx * dx + dy * dy < 3025) return true;
          }
        }
      }
    }
    return false;
  }

  applyGravity(entity, dt) {
    const eng = this.engine;
    const blockTop = this.getTerrainZ(entity.x, entity.y, entity.z);
    if (entity.z === undefined) entity.z = blockTop;
    if (entity.vz === undefined) entity.vz = 0;

    let currentlyInWater = false;
    let waterVoxel = null;
    let wZ = 0;

    if (eng.mapManager) {
      const currentGridZ = Math.round((entity.z || 0) / 32);
      const eMinZ = entity.z || 0;
      const eMaxZ = eMinZ + 38; // Assume player is ~38 units tall

      for (let offset = -2; offset <= 2; offset++) {
        const checkZ = (currentGridZ + offset) * 32;
        const v = eng.mapManager.getVoxelAt(entity.x, entity.y, checkZ);
        if (v) {
          const props = getBlockProps(v.tex);
          if (props.isFluid) {
            const voxelBottom = checkZ - 20;
            const voxelTop = checkZ + 20;
            if (eMinZ <= voxelTop && eMaxZ >= voxelBottom) {
              waterVoxel = v;
              wZ = checkZ;
              break;
            }
          }
        }
      }
      currentlyInWater = !!waterVoxel;
    }

    let runningOnWater = false;
    let effectiveBlockTop = blockTop;

    if (currentlyInWater && waterVoxel) {
      const isDangerousFluid = waterVoxel.tex === 'acid' || waterVoxel.tex === 'lava' || waterVoxel.tex === 'lava_flow';
      if (!isDangerousFluid && entity.activePowers && entity.activePowers.includes('super-speed')) {
        const speedSq = (entity.momentumX * entity.momentumX) + (entity.momentumY * entity.momentumY);
        if (speedSq > 20000) {
          runningOnWater = true;
          currentlyInWater = false;
          const fluidTop = wZ + 16;
          if (entity.z >= fluidTop - 4) {
             effectiveBlockTop = Math.max(effectiveBlockTop, fluidTop + 20);

             for (let i = 0; i < 4; i++) {
                 eng.spawnParticle({
                    x: entity.x + (Math.random() - 0.5) * 30,
                    y: entity.y + (Math.random() - 0.5) * 30,
                    z: fluidTop,
                    vx: -(entity.momentumX * 0.3) + (Math.random() - 0.5) * 100,
                    vy: -(entity.momentumY * 0.3) + (Math.random() - 0.5) * 100,
                    vz: 30 + Math.random() * 80,
                    life: 0.3 + Math.random() * 0.3,
                    maxLife: 0.6,
                    color: '#aaddff',
                    size: 2 + Math.random() * 4
                 });
             }
             if (Math.random() > 0.3) {
                 eng.spawnParticle({
                    x: entity.x + (Math.random() - 0.5) * 20,
                    y: entity.y + (Math.random() - 0.5) * 20,
                    z: fluidTop,
                    vx: -(entity.momentumX * 0.15) + (Math.random() - 0.5) * 50,
                    vy: -(entity.momentumY * 0.15) + (Math.random() - 0.5) * 50,
                    vz: 20 + Math.random() * 60,
                    life: 0.2 + Math.random() * 0.3,
                    maxLife: 0.5,
                    color: '#ffffff',
                    size: 3 + Math.random() * 5
                 });
             }
             if (Math.random() > 0.6) {
                 eng.debris.push({
                   x: entity.x + (Math.random() - 0.5) * 16, y: entity.y + (Math.random() - 0.5) * 16, z: fluidTop + 15,
                   vx: -(entity.momentumX * 0.05), vy: -(entity.momentumY * 0.05), vz: 0, life: 0.4, maxLife: 0.4, crumpleTimer: 0, wasteTex: 'fx_speed_step', isFX: true,
                   color: '#aaddff',
                   flipX: Math.random() > 0.5
                 });
             }
          } else {
             runningOnWater = false;
             currentlyInWater = true;
          }
        }
      }
    }

    if (currentlyInWater) {
      entity.vz -= 250 * (dt / 1000);
      entity.vz -= entity.vz * 4.0 * (dt / 1000);
      entity.z += entity.vz * (dt / 1000);

      if (Math.abs(entity.vz) < 20) {
        entity.z += Math.sin(performance.now() / 400) * 15 * (dt / 1000);
      }

      const props = getBlockProps(waterVoxel.tex);
      if (props.damagePerSecond && entity.hp !== undefined && entity.hp > 0 && entity.state !== 'death' && entity.state !== 'dead') {
          if (Math.random() > 0.4) {
              const isAcid = waterVoxel.tex === 'acid';
              eng.spawnParticle({
                  x: entity.x + (Math.random() - 0.5) * 20,
                  y: entity.y + (Math.random() - 0.5) * 20,
                  z: entity.z + 10 + Math.random() * 20,
                  vx: (Math.random() - 0.5) * 15,
                  vy: (Math.random() - 0.5) * 15,
                  vz: 20 + Math.random() * 30,
                  noGravity: true,
                  life: 0.4 + Math.random() * 0.4,
                  maxLife: 0.8,
                  color: isAcid ? '#2ecc71' : (Math.random() > 0.5 ? '#ff5d00' : 'rgba(100,100,100,0.8)'),
                  tex: isAcid ? 'bubble' : undefined,
                  size: isAcid ? 1 + Math.random() * 2 : 3 + Math.random() * 3
              });
          }
      }
    } else if (entity.activePowers && entity.activePowers.includes('fly')) {
      if (entity === eng.player) {
        const kbs = eng.clientSettings.keybinds || {};
        const flyDownKey = (kbs.flyDown || 'x').toLowerCase();
        if (eng.keys && eng.keys[' ']) {
          entity.vz = 450;
        } else if (eng.keys && eng.keys[flyDownKey]) {
          entity.vz = -450;
        } else {
          entity.vz = 0;
          entity.z += Math.sin(performance.now() / 400) * 15 * (dt / 1000);
        }
        entity.z += entity.vz * (dt / 1000);
      } else {
        entity.vz = 0;
      }

      if (Math.random() > 0.3) {
        eng.spawnParticle({
          x: entity.x + (Math.random() - 0.5) * 20,
          y: entity.y + (Math.random() - 0.5) * 20,
          z: entity.z + Math.random() * 10,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          vz: -20 - Math.random() * 30,
          noGravity: true,
          life: 0.4 + Math.random() * 0.4,
          maxLife: 0.8,
          color: '#9b59b6',
          size: 2 + Math.random() * 3
        });
      }
    } else {
      if (entity.z > effectiveBlockTop || entity.vz > 0) {
        let grav = 2000;
        if (entity.activePowers && (entity.activePowers.includes('super-jump') || entity.activePowers.includes('mighty-leap'))) {
          grav = entity.activePowers.includes('super-jump') ? 900 : 1300;
          if (Math.random() > 0.2) {
            eng.spawnParticle({
              x: entity.x + (Math.random() - 0.5) * 20,
              y: entity.y + (Math.random() - 0.5) * 20,
              z: entity.z + 10 + Math.random() * 20,
              vx: -(entity.momentumX || 0) * 0.1 + (Math.random() - 0.5) * 15,
              vy: -(entity.momentumY || 0) * 0.1 + (Math.random() - 0.5) * 15,
              vz: -(entity.vz || 0) * 0.2 + (Math.random() - 0.5) * 15,
              noGravity: true,
              life: 0.3 + Math.random() * 0.4,
              maxLife: 0.7,
              color: 'rgba(255, 255, 255, 0.4)',
              size: 2 + Math.random() * 3
            });
          }
        }
        entity.vz -= grav * (dt / 1000);
        entity.z += entity.vz * (dt / 1000);
      }
    }

    if (entity.z <= effectiveBlockTop) {
      if (entity === eng.player && entity.vz < -800) {
        const impact = Math.abs(entity.vz);
        eng.cameraShake = Math.max(eng.cameraShake, Math.min(10, impact * 0.004));
        for (let i = 0; i < 15; i++) {
          eng.spawnParticle({
            x: entity.x + (Math.random() - 0.5) * 40,
            y: entity.y + (Math.random() - 0.5) * 40,
            z: effectiveBlockTop + 2 + Math.random() * 10,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80,
            vz: 10 + Math.random() * 40,
            noGravity: true,
            life: 0.3 + Math.random() * 0.4,
            maxLife: 0.7,
            color: 'rgba(150, 150, 150, 0.5)',
            size: 4 + Math.random() * 5,
            tex: 'smoke'
          });
        }
      }
      entity.z = effectiveBlockTop;
      if (entity.vz < 0) entity.vz = 0;
    }

    if (eng.mapManager) {
      if (currentlyInWater && !entity.wasInWater) {
        let color = waterVoxel.color;
        if (!color || typeof color !== 'string' || !color.startsWith('#') || color.includes('NaN')) {
          color = waterVoxel.tex === 'lava' ? '#ff5d00' : '#3498db';
        }
        const impactVelocity = entity.vz && entity.vz < -100 ? Math.abs(entity.vz) : 100;
        const splashMod = Math.min(5.0, impactVelocity / 200);
        const splashCount = Math.floor(15 * splashMod);

        for (let i = 0; i < splashCount; i++) {
          const isWater = waterVoxel.tex !== 'lava';
          const pColor = (isWater && Math.random() > 0.6) ? '#ffffff' : color;
          const surfaceZ = wZ + 16;

          eng.spawnParticle({
            x: entity.x + (Math.random() - 0.5) * (20 * Math.max(1, splashMod * 0.5)),
            y: entity.y + (Math.random() - 0.5) * (20 * Math.max(1, splashMod * 0.5)),
            z: surfaceZ,
            vx: (Math.random() - 0.5) * 80 * splashMod,
            vy: (Math.random() - 0.5) * 80 * splashMod,
            vz: (50 + Math.random() * 80) * (0.5 + splashMod * 0.5),
            noGravity: false,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.6,
            color: pColor,
            size: (2 + Math.random() * 3) * (0.5 + splashMod * 0.5)
          });
        }
      }
      entity.wasInWater = currentlyInWater;
    }
  }
}
