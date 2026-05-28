export const TravelPowerScripts = {
  'teleport': (eng) => {
    if (eng.targetingPower === 'teleport') {
      eng.targetingPower = null;
      if (eng.canvas) eng.canvas.style.cursor = '';
      document.body.style.cursor = '';
      return;
    }
    eng.targetingPower = 'teleport';
    if (eng.canvas) eng.canvas.style.cursor = 'crosshair';
    document.body.style.cursor = 'crosshair';
  }
};

export const TravelPowerExecutors = {
  'teleport': (eng, targetX, targetY) => {
    if (eng.player.state === 'death' || eng.player.teleportTarget) return;

    const maxMapSize = 511 * 32;
    targetX = Math.max(0, Math.min(targetX, maxMapSize));
    targetY = Math.max(0, Math.min(targetY, maxMapSize));

    if (eng.player.energy < 30) {
      eng.floatingTexts.push({
        x: eng.player.x, y: eng.player.y, z: eng.player.z, offsetY: 130, rndX: 0, rndY: 0,
        text: 'Not Enough Energy', life: 1.0, color: '#f39c12'
      });
      return;
    }
    eng.player.energy -= 30;
    eng.ui.update();

    const fxData = {
      x: eng.player.x, y: eng.player.y, z: (eng.player.z || 0) + 50,
      vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport', isFX: true
    };
    const fxData2 = {
      x: eng.player.x, y: eng.player.y, z: (eng.player.z || 0) + 32,
      vx: 0, vy: 0, vz: 0, life: 0.6, maxLife: 0.6, crumpleTimer: 0, wasteTex: 'fx_teleport_2', isFX: true
    };
    eng.debris.push(fxData);
    eng.debris.push(fxData2);
    if (eng.network) {
      eng.network.sendSpawnFX(fxData);
      eng.network.sendSpawnFX(fxData2);
    }

    eng.player.teleportTarget = { x: targetX, y: targetY, timer: 0.5 };
    eng.player.vx = 0; eng.player.vy = 0; eng.player.momentumX = 0; eng.player.momentumY = 0; eng.player.moveTarget = null;
  }
};
