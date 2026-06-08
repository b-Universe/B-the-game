export const ROBOTICS_SPRITES = [
  { state: 'drone-1-death', file: 'drone-1-death' },
  { state: 'drone-1-fly-forward', file: 'drone-1-fly-forward' },
  { state: 'drone-1-idle', file: 'drone-1-idle' },
  { state: 'drone-2-attack', file: 'drone-2-attack' },
  { state: 'drone-2-death', file: 'drone-2-death' },
  { state: 'drone-2-fly-attack', file: 'drone-2-fly-attack' },
  { state: 'drone-2-fly-forward', file: 'drone-2-fly-forward' },
  { state: 'drone-2-idle', file: 'drone-2-idle' },
  { state: 'drone-3-attack-left', file: 'drone-3-attack-left' },
  { state: 'drone-3-attack-right', file: 'drone-3-attack-right' },
  { state: 'drone-3-attack-idle', file: 'drone-3-attack-idle' },
  { state: 'drone-3-death', file: 'drone-3-death' },
  { state: 'drone-3-fly-backward', file: 'drone-3-fly-backward' },
  { state: 'drone-3-fly-forward', file: 'drone-3-fly-forward' },
  { state: 'drone-3-fly-idle', file: 'drone-3-fly-idle' }
];

export function getRoboticsFrameCount(state) {
  if (state.startsWith('drone-1-')) {
    if (state.includes('death')) return 6;
    return 4;
  }
  if (state.startsWith('drone-2-')) {
    if (state.includes('attack')) return 8;
    if (state.includes('death')) return 6;
    return 4;
  }
  if (state.startsWith('drone-3-')) {
    if (state.includes('attack')) return 16;
    if (state.includes('death')) return 8;
    return 4;
  }
  return null;
}

export function updateDrones(eng, dt, em) {
  const now = Date.now();
  for (const id in eng.drones) {
    const drone = eng.drones[id];
    drone.frameTimer = (drone.frameTimer || 0) + dt;

    if (drone.state !== 'dead' && drone.state !== 'death' && !drone.state.endsWith('-death')) {
      // Client-side smooth orbit simulation
      let owner = eng.otherPlayers[drone.ownerSocketId];
      if (drone.ownerSocketId === eng.socket?.id) owner = eng.player;

      if (owner) {
        let idealX, idealY, idealZ;

        if (drone.isAssaultDrone) {
          const baseAngle = (now * 0.65 / 1000) + (drone.orbitOffset || 0);
          const rotAngle = (now * 0.3 / 1000);
          const localX = 150 * Math.cos(baseAngle);
          const localY = 50 * Math.sin(baseAngle);

          idealX = owner.x + localX * Math.cos(rotAngle) - localY * Math.sin(rotAngle);
          idealY = owner.y + localX * Math.sin(rotAngle) + localY * Math.cos(rotAngle);
          const terrainZ = eng.getTerrainZ(idealX, idealY);
          idealZ = Math.max((owner.z || 0) + 180 + Math.sin(baseAngle * 3) * 10, terrainZ + 32);
        } else {
          const orbitRadius = 100 + ((drone.orbitIndex || 0) * 150);
          const orbitSpeed = 0.5 + ((drone.orbitIndex || 0) * 0.3);
          const angle = (now * orbitSpeed / 1000) + (drone.orbitOffset || 0);

          let actualRadius = orbitRadius;
          for (let step = 1; step <= 4; step++) {
            const checkX = owner.x + Math.cos(angle) * (orbitRadius * (step / 4));
            const checkY = owner.y + Math.sin(angle) * (orbitRadius * (step / 4));
            const checkZ = (owner.z || 0) + 100;
            const tZ = eng.getTerrainZ(checkX, checkY);
            if (tZ > checkZ) {
              actualRadius = orbitRadius * ((step - 1) / 4);
              break;
            }
          }

          idealX = owner.x + Math.cos(angle) * actualRadius;
          idealY = owner.y + Math.sin(angle) * actualRadius;
          const terrainZ = eng.getTerrainZ(idealX, idealY);
          idealZ = Math.max((owner.z || 0) + 220 + Math.sin(angle * 3) * 10, terrainZ + 32);
        }

        let currentLerp = 2 * (dt / 1000);
        let targetZ = idealZ;

        if (drone.deployTimer !== undefined && drone.deployTimer > 0) {
          drone.deployTimer -= dt / 1000;
          currentLerp = 8 * (dt / 1000);
          const t = 1.5 - Math.max(0, drone.deployTimer);
          const bounce = Math.sin(t * Math.PI * 4) * (80 * (drone.deployTimer / 1.5));
          targetZ -= bounce;

          // Emitting a custom glowing trail while deploying!
          eng.spawnParticle({
            x: drone.x + (Math.random() - 0.5) * 20,
            y: drone.y + (Math.random() - 0.5) * 20,
            z: drone.z + 10,
            vx: 0, vy: 0, vz: 50 + Math.random() * 50,
            life: 0.3, maxLife: 0.3,
            color: drone.isUpgraded ? '#f1c40f' : '#00d2ff',
            size: 3 + Math.random() * 4,
            noGravity: true
          });
        }

        drone.x += (idealX - drone.x) * currentLerp;
        drone.y += (idealY - drone.y) * currentLerp;
        drone.z += (targetZ - drone.z) * currentLerp;
      }

      if (drone.isAssaultDrone) {
        drone.combatBlinkTimer = (drone.combatBlinkTimer || 0) - (dt / 1000);
        if (drone.combatBlinkTimer <= 0) {
          drone.combatBlinkTimer = 0.2;
          eng.spawnParticle({ x: drone.x, y: drone.y, z: drone.z - 4, vx: 0, vy: 0, vz: 0, life: 0.2, maxLife: 0.2, color: '#f39c12', size: 4, noGravity: true });
        }
      } else if (drone.isCombatDrone) {
        drone.combatBlinkTimer = (drone.combatBlinkTimer || 0) - (dt / 1000);
        if (drone.combatBlinkTimer <= 0) {
          drone.combatBlinkTimer = 0.5;
          eng.spawnParticle({ x: drone.x, y: drone.y, z: drone.z - 4, vx: 0, vy: 0, vz: 0, life: 0.2, maxLife: 0.2, color: '#e74c3c', size: 4, noGravity: true });
        }
      } else {
        drone.beepTimer = (drone.beepTimer || 0) - (dt / 1000);
        if (drone.beepTimer <= 0) {
          drone.beepTimer = 1.5;
          eng.spawnParticle({ x: drone.x, y: drone.y, z: drone.z + 16, vx: 0, vy: 0, vz: 0, life: 0.2, maxLife: 0.2, color: '#ff4757', size: 3, noGravity: true });
        }
      }

      if (drone.isAssaultDrone) {
        // Hold the attack state independent of the server to ensure the animation finishes smoothly!
        if (drone.targetX !== null && drone.targetX !== undefined) {
          drone.clientTargetX = drone.targetX;
          drone.clientTargetY = drone.targetY;
          if (!drone.wasFiring) {
            drone.clientFireAnimTimer = 960; // 16 frames * 60ms
            drone.frame = 0;
            drone.wasFiring = true;
          }
        } else {
          drone.wasFiring = false;
        }

        if (drone.clientFireAnimTimer > 0) drone.clientFireAnimTimer -= dt;

        let isFiring = drone.clientFireAnimTimer > 0;
        if (isFiring) {
          let moveDx = drone.x - (drone.lastX || drone.x);
          let fireDx = drone.clientTargetX - drone.x;
          let fireDy = drone.clientTargetY - drone.y;
          if (fireDx === 0 && fireDy === 0) fireDx = 1;
          if (Math.abs(fireDy) > Math.abs(fireDx) * 2) {
            drone.state = 'drone-3-attack-idle'; drone.isFlipped = fireDx < 0;
          } else {
            let flyingRight = moveDx >= 0; let firingRight = fireDx >= 0;
            if (flyingRight && firingRight) { drone.state = 'drone-3-attack-right'; drone.isFlipped = false; }
            else if (!flyingRight && firingRight) { drone.state = 'drone-3-attack-left'; drone.isFlipped = false; }
            else if (!flyingRight && !firingRight) { drone.state = 'drone-3-attack-right'; drone.isFlipped = true; }
            else if (flyingRight && !firingRight) { drone.state = 'drone-3-attack-left'; drone.isFlipped = true; }
          }
        } else {
          drone.hoverTimer = (drone.hoverTimer || 0) - (dt / 1000);
          if (drone.hoverTimer <= 0) {
            drone.hoverTimer = 0.1;
            eng.spawnParticle({ x: drone.x + (Math.random() - 0.5) * 16, y: drone.y + (Math.random() - 0.5) * 16, z: drone.z - 4, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, vz: -15 - Math.random() * 20, life: 0.3 + Math.random() * 0.2, maxLife: 0.5, color: '#f39c12', size: 1.5 + Math.random(), noGravity: true });
          }
          const relDir = eng.renderer ? eng.renderer.getRelativeSpriteDirection(drone.dir || 'down') : drone.dir;
          if (relDir.includes('left')) { drone.state = 'drone-3-fly-backward'; drone.isFlipped = false; }
          else if (relDir.includes('right')) { drone.state = 'drone-3-fly-forward'; drone.isFlipped = false; }
          else { drone.state = 'drone-3-fly-idle'; drone.isFlipped = false; }
        }
      } else {
        let dPrefix = drone.isCombatDrone ? 'drone-2' : 'drone-1';
        drone.hoverTimer = (drone.hoverTimer || 0) - (dt / 1000);
        if (drone.hoverTimer <= 0) {
          drone.hoverTimer = 0.1;
          eng.spawnParticle({ x: drone.x + (Math.random() - 0.5) * 16, y: drone.y + (Math.random() - 0.5) * 16, z: drone.z - 4, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, vz: -15 - Math.random() * 20, life: 0.3 + Math.random() * 0.2, maxLife: 0.5, color: '#00d2ff', size: 1.5 + Math.random(), noGravity: true });
        }
        if (drone.isCombatDrone && drone.stunAnimTimer > 0) {
          drone.stunAnimTimer -= dt;
          const relDir = eng.renderer ? eng.renderer.getRelativeSpriteDirection(drone.dir || 'down') : drone.dir;
          if (relDir.includes('left')) { drone.state = 'drone-2-fly-attack'; drone.isFlipped = true; }
          else if (relDir.includes('right')) { drone.state = 'drone-2-fly-attack'; drone.isFlipped = false; }
          else { drone.state = 'drone-2-attack'; drone.isFlipped = false; }
        } else {
          const relDir = eng.renderer ? eng.renderer.getRelativeSpriteDirection(drone.dir || 'down') : drone.dir;
          if (relDir.includes('left')) { drone.state = `${dPrefix}-fly-forward`; drone.isFlipped = true; }
          else if (relDir.includes('right')) { drone.state = `${dPrefix}-fly-forward`; drone.isFlipped = false; }
          else { drone.state = `${dPrefix}-idle`; drone.isFlipped = false; }
        }
      }
    } else {
      let dPrefix = drone.isAssaultDrone ? 'drone-3' : (drone.isCombatDrone ? 'drone-2' : 'drone-1');
      drone.state = `${dPrefix}-death`;
      if (drone.vz === undefined) drone.vz = 0;
      drone.vz -= 1000 * (dt / 1000); drone.z += drone.vz * (dt / 1000);
      const tz = eng.getTerrainZ(drone.x, drone.y);
      if (drone.z <= tz) { drone.z = tz; if (drone.vz < 0) { drone.vz = 0; if (!drone.hasHitGround) { drone.hasHitGround = true; eng.debris.push({ x: drone.x, y: drone.y, z: drone.z + 16, vx: 0, vy: 0, vz: 0, life: 0.5, maxLife: 0.5, crumpleTimer: 0, wasteTex: 'fx_drone_circuit', isFX: true, color: '#f1c40f' }); for (let i = 0; i < 12; i++) { eng.spawnParticle({ x: drone.x + (Math.random() - 0.5) * 32, y: drone.y + (Math.random() - 0.5) * 32, z: drone.z + Math.random() * 32, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, vz: 50 + Math.random() * 150, life: 0.4 + Math.random() * 0.4, maxLife: 0.8, color: Math.random() > 0.5 ? '#3498db' : '#f1c40f', size: 2 + Math.random() * 4 }); } } } }
    }
    const maxFrames = em.getFrameCount(drone.state);
    const animSpeed = drone.isAssaultDrone ? 60 : 120;
    if (drone.frameTimer >= animSpeed) { drone.frameTimer -= animSpeed; if (drone.state.endsWith('-death')) { drone.frame = Math.min((drone.frame || 0) + 1, maxFrames - 1); } else { drone.frame = ((drone.frame || 0) + 1) % maxFrames; } }
  }
}
