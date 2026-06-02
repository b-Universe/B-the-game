import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class LightingManager {
  constructor(renderer) {
    this.renderer = renderer;

    // Color palettes for day/night cycle
    this.dayHemi = new THREE.Color(0xffffff);
    this.dayGround = new THREE.Color(0x444444);
    this.daySun = new THREE.Color(0xffffee);

    this.duskHemi = new THREE.Color(0xffaa55);
    this.duskGround = new THREE.Color(0x221100);
    this.duskSun = new THREE.Color(0xff6600);

    this.nightHemi = new THREE.Color(0x334466);
    this.nightGround = new THREE.Color(0x1a2233);
    this.nightSun = new THREE.Color(0x6677aa);
  }

  updateTimeOfDay() {
    const renderer = this.renderer;
    const engine = renderer.engine;
    const cycleDuration = 480000;

    let realT = ((Date.now() % cycleDuration) / cycleDuration);
    realT = realT % 1.0;
    if (realT < 0) realT += 1.0;

    if (engine.timeOverride !== undefined) {
      realT = engine.timeOverride;
    }

    let visualT = realT;
    if (engine.clientSettings && engine.clientSettings.enableDayNightCycle === false) {
      visualT = 1 / 3; // Lock exactly to High Noon
    }

    let visualAngle;
    if (visualT < (2 / 3)) {
      visualAngle = (visualT / (2 / 3)) * Math.PI; // Expand daytime (0 to PI) over the first 66% of the cycle
    } else {
      visualAngle = Math.PI + ((visualT - (2 / 3)) / (1 / 3)) * Math.PI; // Compress nighttime (PI to 2PI) into the last 33%
    }

    let realAngle;
    if (realT < (2 / 3)) {
      realAngle = (realT / (2 / 3)) * Math.PI;
    } else {
      realAngle = Math.PI + ((realT - (2 / 3)) / (1 / 3)) * Math.PI;
    }

    const sunDist = 2000;
    const height = Math.sin(visualAngle);
    renderer.sunOffsetZ = Math.abs(height) * sunDist;
    renderer.sunOffsetY = Math.cos(visualAngle) * sunDist;
    renderer.sunOffsetX = Math.cos(visualAngle) * sunDist * 0.5;

    if (height > 0) {
      renderer.sunLight.shadow.radius = 1.0 + Math.pow(1.0 - height, 3) * 5.0; // Soften shadows near the horizon
    } else {
      renderer.sunLight.shadow.radius = 2.0; // Moonlight shadow softness
    }

    const dayHemiInt = 0.7;
    const daySunInt = 1.2;
    const duskHemiInt = 0.55;
    const duskSunInt = 0.9;
    const nightHemiInt = 0.4;
    const nightSunInt = 0.6;

    if (height >= 0.2) {
      renderer.hemiLight.color.copy(this.dayHemi);
      renderer.hemiLight.groundColor.copy(this.dayGround);
      renderer.hemiLight.intensity = dayHemiInt;
      renderer.sunLight.color.copy(this.daySun);
      renderer.sunLight.intensity = daySunInt;
    } else if (height >= 0) {
      const t = height / 0.2; // 0 at dusk, 1 at day
      renderer.hemiLight.color.copy(this.duskHemi).lerp(this.dayHemi, t);
      renderer.hemiLight.groundColor.copy(this.duskGround).lerp(this.dayGround, t);
      renderer.hemiLight.intensity = duskHemiInt + (dayHemiInt - duskHemiInt) * t;
      renderer.sunLight.color.copy(this.duskSun).lerp(this.daySun, t);
      renderer.sunLight.intensity = duskSunInt + (daySunInt - duskSunInt) * t;
    } else if (height >= -0.2) {
      const t = (height + 0.2) / 0.2; // 0 at night, 1 at dusk
      renderer.hemiLight.color.copy(this.nightHemi).lerp(this.duskHemi, t);
      renderer.hemiLight.groundColor.copy(this.nightGround).lerp(this.duskGround, t);
      renderer.hemiLight.intensity = nightHemiInt + (duskHemiInt - nightHemiInt) * t;
      renderer.sunLight.color.copy(this.nightSun).lerp(this.duskSun, t);
      renderer.sunLight.intensity = nightSunInt + (duskSunInt - nightSunInt) * t;
    } else {
      renderer.hemiLight.color.copy(this.nightHemi);
      renderer.hemiLight.groundColor.copy(this.nightGround);
      renderer.hemiLight.intensity = nightHemiInt;
      renderer.sunLight.color.copy(this.nightSun);
      renderer.sunLight.intensity = nightSunInt;
    }

    if (renderer.playerLight) {
      const isFlashlightOn = engine.player && engine.player.activePowers && engine.player.activePowers.includes('flashlight');

      let flickerMult = 1.0;
      if (engine.player && engine.player.hurtTimer > 0) {
        flickerMult = Math.random() > 0.3 ? 0.2 : 1.2; // Flickers heavily when hurt
      } else if (isFlashlightOn && engine.player && engine.player.synthEnergy < (engine.player.maxSynthEnergy || 1000) * 0.1) {
        if (Math.random() > 0.75) {
          flickerMult = 0.1 + Math.random() * 0.4; // Dying battery flicker (10% to 50% intensity)
        }
      }

      if (isFlashlightOn) {
        renderer.playerLight.color.setHex(0xeef4ff); // Crisp, modern cool-white LED tint
        renderer.playerLight.intensity = 20000 * flickerMult; // Override day/night cycle if flashlight is on
      } else if (height > 0.1) {
        renderer.playerLight.intensity = 0;
      } else if (height > 0) {
        renderer.playerLight.color.setHex(0xaaccff); // Revert to ambient moonlight blue
        renderer.playerLight.intensity = ((0.1 - height) * 5.0) * 30 * flickerMult; // Fades in during dusk
      } else {
        renderer.playerLight.color.setHex(0xaaccff); // Revert to ambient moonlight blue
        renderer.playerLight.intensity = (0.5 + Math.abs(height) * 0.5) * 30 * flickerMult; // Peaks at midnight
      }
    }

    const sunEl = document.getElementById('compass-sun');
    const clockEl = document.getElementById('in-game-clock');
    if (sunEl && clockEl) {
      const r = 26;
      const realHeight = Math.sin(realAngle);
      const sx = -Math.cos(realAngle) * r;
      const sy = -realHeight * r;
      sunEl.style.transform = `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px))`;

      if (realHeight > 0.2) {
        sunEl.style.background = '#f1c40f';
        sunEl.style.boxShadow = '0 0 8px #f1c40f';
      } else if (realHeight > 0) {
        sunEl.style.background = '#e67e22';
        sunEl.style.boxShadow = '0 0 8px #e67e22';
      } else {
        sunEl.style.background = '#bdc3c7';
        sunEl.style.boxShadow = '0 0 8px #bdc3c7';
      }

      let hours = ((realAngle / (Math.PI * 2)) * 24 + 6) % 24;
      const h = Math.floor(hours);
      const m = Math.floor((hours - h) * 60);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = m < 10 ? '0' + m : m;
      clockEl.innerText = `${displayH}:${displayM} ${ampm}`;
    }
  }

  updateDynamicLights() {
    const renderer = this.renderer;
    const engine = renderer.engine;

    if (!renderer.lightPoints || !renderer.blockLights) return;

    const cycleDuration = 480000;
    let t = (Date.now() % cycleDuration) / cycleDuration;
    if (engine.timeOverride !== undefined) {
      t = engine.timeOverride;
    } else if (engine.clientSettings && engine.clientSettings.enableDayNightCycle === false) {
      t = 1 / 3; // Lock exactly to High Noon
    }
    let angle;
    if (t < (2 / 3)) angle = (t / (2 / 3)) * Math.PI;
    else angle = Math.PI + ((t - (2 / 3)) / (1 / 3)) * Math.PI;
    const height = Math.sin(angle);

    let baseIntensity = 0;
    if (height < 0.2) {
      baseIntensity = (0.2 - Math.max(0, height)) * 5.0;
    }
    if (height < 0) {
      baseIntensity = 1.0 + (Math.abs(height) * 1.0);
    }

    const maxLights = engine.clientSettings.maxDynamicLights !== undefined ? engine.clientSettings.maxDynamicLights : 48;

    if (renderer.blockLights.length !== maxLights) {
      while (renderer.blockLights.length < maxLights) {
        const light = new THREE.PointLight(0xff5d00, 0, 400, 1.5);
        light.layers.enableAll();
        renderer.scene.add(light);
        renderer.blockLights.push(light);
      }
      while (renderer.blockLights.length > maxLights) {
        const light = renderer.blockLights.pop();
        renderer.scene.remove(light);
        if (light.dispose) light.dispose();
      }
    }

    let hasFlashes = false;
    if (engine.debris) {
      for (let i = 0; i < engine.debris.length; i++) {
        if (engine.debris[i].isFX && engine.debris[i].wasteTex === 'fx_teleport') {
          hasFlashes = true;
          break;
        }
      }
    }

    if ((baseIntensity <= 0.01 && !hasFlashes) || maxLights <= 0) {
      renderer.blockLights.forEach(l => l.intensity = 0);
      return;
    }

    const cx = renderer.camera.position.x;
    const cy = renderer.camera.position.y;

    let closestLava = [];

    if (maxLights > 0) {
      if (baseIntensity > 0.01) {
        for (let i = 0; i < renderer.lightPoints.length; i++) {
          const lp = renderer.lightPoints[i];

          const dx = lp.x - cx;
          const dy = lp.y - cy;
          const distSq = dx * dx + dy * dy;

          const cullDist = lp.isLamp ? Math.max(3000, 5000 * lp.isLamp) : 3000;
          if (distSq > cullDist * cullDist) continue;

          if (closestLava.length < maxLights) {
            closestLava.push({ lp, distSq });
            if (closestLava.length === maxLights) closestLava.sort((a, b) => a.distSq - b.distSq);
          } else if (distSq < closestLava[maxLights - 1].distSq) {
            closestLava[maxLights - 1] = { lp, distSq };
            closestLava.sort((a, b) => a.distSq - b.distSq);
          }
        }
      }

      if (hasFlashes) {
        for (let i = 0; i < engine.debris.length; i++) {
          const d = engine.debris[i];
          if (d.isFX && d.wasteTex === 'fx_teleport') {
            const ratio = Math.max(0, d.life / d.maxLife);
            const lp = {
              x: d.x, y: d.y, z: d.z,
              color: '#d260ff', // Bright purple-pink core
              isFlash: true,
              intensity: 15000 * ratio, // Insanely bright, fading rapidly to 0
              distance: 1000 * Math.max(0.2, ratio) // Shrinks inward as it fades
            };

            const dx = lp.x - cx;
            const dy = lp.y - cy;
            const distSq = dx * dx + dy * dy;

            if (distSq > lp.distance * lp.distance) continue;

            if (closestLava.length < maxLights) {
              closestLava.push({ lp, distSq });
              if (closestLava.length === maxLights) closestLava.sort((a, b) => a.distSq - b.distSq);
            } else if (distSq < closestLava[maxLights - 1].distSq) {
              closestLava[maxLights - 1] = { lp, distSq };
              closestLava.sort((a, b) => a.distSq - b.distSq);
            }
          }
        }
      }
    }

    for (let i = 0; i < renderer.blockLights.length; i++) {
      const light = renderer.blockLights[i];
      if (i < closestLava.length) {
        const item = closestLava[i].lp;
        light.position.set(item.x, item.y, item.z + 24);

        let lColor = item.color;
        if (!lColor || typeof lColor !== 'string' || !lColor.startsWith('#') || lColor.includes('NaN')) {
          lColor = '#ff5d00';
        }
        light.color.setStyle(lColor);

        if (item.isFlash) {
          light.intensity = item.intensity;
          light.distance = item.distance;
          light.decay = 2.0;
        } else {
          const flicker = item.isLamp ? 1.0 : 1.0 + (Math.random() * 0.1 - 0.05);
          light.intensity = baseIntensity * flicker * (item.isLamp ? 15 : 150);
          light.distance = item.isLamp ? 2250 * item.isLamp : 400;
          light.decay = item.isLamp ? 0.25 : 1.5;
        }
      } else {
        light.intensity = 0;
      }
    }
  }
}
