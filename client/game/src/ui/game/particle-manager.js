import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class ParticleManager {
  constructor(renderer) {
    this.renderer = renderer;

    this.poolSize = 2000;
    this.particles = new Array(this.poolSize);
    this.freeIndices = new Array(this.poolSize);
    for (let i = 0; i < this.poolSize; i++) {
      this.particles[i] = {
        active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, vr: 0, rot: 0,
        life: 0, maxLife: 0, color: '#ffffff', size: 1, tex: 'white',
        isPop: false, noGravity: false, uvOffsetX: 0, uvOffsetY: 0, uvScale: 1
      };
      this.freeIndices[i] = this.poolSize - 1 - i;
    }
    this.activeCount = 0;

    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.whiteColor = new THREE.Color(0xffffff);
    this.colorCache = new Map();

    this.vec1 = new THREE.Vector3();
    this.vec2 = new THREE.Vector3();
    this.activeProjs = new Set();
    this.projectilePool = [];
  }

  spawn(opts) {
    if (this.freeIndices.length === 0) return;
    const idx = this.freeIndices.pop();
    const p = this.particles[idx];
    p.active = true;
    p.x = opts.x || 0;
    p.y = opts.y || 0;
    p.z = opts.z || 0;
    p.vx = opts.vx || 0;
    p.vy = opts.vy || 0;
    p.vz = opts.vz || 0;
    p.vr = opts.vr || 0;
    p.rot = opts.rot || 0;
    p.life = opts.life || 1;
    p.maxLife = opts.maxLife || p.life;
    p.color = opts.color || '#ffffff';
    p.size = opts.size || 1;
    p.tex = opts.tex || 'white';
    p.isPop = opts.isPop || false;
    p.noGravity = opts.noGravity || false;
    p.uvOffsetX = opts.uvOffsetX || 0;
    p.uvOffsetY = opts.uvOffsetY || 0;
    p.uvScale = opts.uvScale !== undefined ? opts.uvScale : 1;
    this.activeCount++;
  }

  free(idx) {
    this.particles[idx].active = false;
    this.freeIndices.push(idx);
    this.activeCount--;
  }

  updatePhysics(dt) {
    for (let i = 0; i < this.poolSize; i++) {
      let p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt / 1000;
      if (p.life <= 0) {
        if (p.tex === 'bubble' && !p.isPop) {
          this.spawn({
            x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, noGravity: true,
            life: 0.15, maxLife: 0.15, tex: 'bubble', color: p.color, size: p.size, isPop: true
          });
          if (Math.random() > 0.3) {
            const drops = 2 + Math.floor(Math.random() * 2);
            for (let d = 0; d < drops; d++) {
              this.spawn({
                x: p.x + (Math.random() - 0.5) * 4, y: p.y + (Math.random() - 0.5) * 4, z: p.z,
                vx: (p.vx || 0) + (Math.random() - 0.5) * 20, vy: (p.vy || 0) + (Math.random() - 0.5) * 20, vz: ((p.vz || 0) * 0.3) + Math.random() * 25,
                noGravity: false, life: 0.1 + Math.random() * 0.15, maxLife: 0.25, color: p.color, size: 1 + Math.random()
              });
            }
          }
        }
        this.free(i);
        continue;
      }
      if (p.vx) p.x += p.vx * (dt / 1000);
      if (p.vy) p.y += p.vy * (dt / 1000);
      if (p.vz) {
        p.z += p.vz * (dt / 1000);
        if (!p.noGravity) p.vz -= 800 * (dt / 1000); // Gravity for falling bits
      }
      if (p.vr) p.rot = (p.rot || 0) + p.vr * (dt / 1000);
    }
  }

  updateProjectiles() {
    const renderer = this.renderer;
    const engine = renderer.engine;

    if (!engine.projectiles) return;
    this.activeProjs.clear();

    engine.projectiles.forEach((proj, idx) => {
      const id = `proj_${idx}`;
      this.activeProjs.add(id);

      let group = renderer.projectileMeshes.get(id);
      if (!group) {
        if (this.projectilePool.length > 0) {
          group = this.projectilePool.pop();
          group.visible = true;
        } else {
          group = new THREE.Group();

          if (!renderer.baseProjectileMaterial) {
              renderer.baseProjectileMaterial = new THREE.MeshPhongMaterial({ transparent: true, alphaTest: 0.5, depthWrite: true, side: THREE.DoubleSide, shininess: 0 });
              renderer.baseProjectileMaterial.onBeforeCompile = (shader) => {
                shader.vertexShader = shader.vertexShader.replace(
                  '#include <defaultnormal_vertex>',
                  `vec3 transformedNormal = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);`
                );
              };
              renderer.baseProjectileMaterial.customProgramCacheKey = () => 'baseProjMat';
          }

          const mat = renderer.baseProjectileMaterial.clone();
          mat.onBeforeCompile = renderer.baseProjectileMaterial.onBeforeCompile;
          mat.customProgramCacheKey = renderer.baseProjectileMaterial.customProgramCacheKey;

          const geo = new THREE.PlaneGeometry(1, 1);
          const sprite = new THREE.Mesh(geo, mat);
          sprite.castShadow = engine.clientSettings.enableShadows !== false;
          sprite.receiveShadow = true;
          sprite.frustumCulled = false;
          group.add(sprite);
          group.userData.sprite = sprite;

          const shadowGeo = new THREE.CircleGeometry(6, 16);
          const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
          const shadow = new THREE.Mesh(shadowGeo, shadowMat);
          group.add(shadow);
          group.userData.shadow = shadow;

          renderer.scene.add(group);
        }
        renderer.projectileMeshes.set(id, group);
      }

      const sprite = group.userData.sprite;
      const shadow = group.userData.shadow;

      let isLeft = false;
      let rotAngle = 0;

      if (proj.isCritLoop && proj.loopPitch !== undefined) {
        const v1 = this.vec1.set(proj.startX, proj.startY, proj.startZ).project(renderer.camera);
        const v2 = this.vec2.set(proj.targetX, proj.targetY, proj.targetZ).project(renderer.camera);
        const baseAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x);

        isLeft = Math.abs(baseAngle) > Math.PI / 2;
        rotAngle = baseAngle + (isLeft ? -proj.loopPitch : proj.loopPitch);
        proj.lastAngle = rotAngle;
      } else if (proj.lastX !== undefined) {
        const v1 = this.vec1.set(proj.lastX, proj.lastY, proj.lastZ).project(renderer.camera);
        const v2 = this.vec2.set(proj.x, proj.y, proj.z).project(renderer.camera);
        const dxScreen = v2.x - v1.x;
        const dyScreen = v2.y - v1.y;
        if (Math.abs(dxScreen) > 0.00001 || Math.abs(dyScreen) > 0.00001) {
          rotAngle = Math.atan2(dyScreen, dxScreen);
          isLeft = Math.abs(rotAngle) > Math.PI / 2;
          proj.lastAngle = rotAngle;
        } else if (proj.lastAngle !== undefined) {
          rotAngle = proj.lastAngle;
          isLeft = Math.abs(proj.lastAngle) > Math.PI / 2;
        }
      } else {
        const v1 = this.vec1.set(proj.startX, proj.startY, proj.startZ).project(renderer.camera);
        const v2 = this.vec2.set(proj.targetX, proj.targetY, proj.targetZ).project(renderer.camera);
        rotAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
        isLeft = Math.abs(rotAngle) > Math.PI / 2;
        proj.lastAngle = rotAngle;
      }

      proj.lastX = proj.x;
      proj.lastY = proj.y;
      proj.lastZ = proj.z;

      sprite.scale.set(64, 64, 1);

      sprite.quaternion.copy(renderer.camera.quaternion);
      sprite.rotateZ(rotAngle);
      group.position.set(proj.x, proj.y, proj.z);

      if (shadow) {
        const tz = engine.getTerrainZ(proj.x, proj.y, proj.z);
        const heightDiff = Math.max(0, proj.z - tz);
        const shadowScale = Math.max(0.5, 1 - (heightDiff / 200));
        shadow.scale.set(shadowScale, shadowScale, 1);
        shadow.position.set(0, 0, tz - proj.z + 0.5);
      }

      let seqId = 'proj_airplane';
      let frameCount = 4;
      let animSpeed = 80;
      let offsetZ = 0;

      if (proj.powerId && window.POWER_REGISTRY && window.POWER_REGISTRY[proj.powerId]) {
        const pDef = window.POWER_REGISTRY[proj.powerId];
        if (pDef.visuals?.projectileVisuals && pDef.visuals.projectileVisuals.length > 0) {
          const firstEvent = pDef.visuals.projectileVisuals[0];
          if (firstEvent.sequence && firstEvent.sequence !== 'None') {
            seqId = firstEvent.sequence;
            offsetZ = firstEvent.offsetZ || 0;
            const seqData = renderer.assetManager.sequenceLibrary[seqId];
            if (seqData) {
              frameCount = seqData.frames || 1;
              animSpeed = seqData.speed || 100;
            }
          }
        }
      }

      sprite.position.set(0, 0, offsetZ);

      const tex = renderer.assetManager.textures[seqId] || renderer.assetManager.textures['proj_airplane'];
      if (tex) {
        if (sprite.userData.mapUuid !== tex.uuid) {
          sprite.material.map = tex.clone();
          sprite.userData.mapUuid = tex.uuid;
          sprite.userData.tex = seqId;
          sprite.material.needsUpdate = true;
        }
        const frameIndex = Math.floor(performance.now() / animSpeed) % frameCount;

        if (isLeft) {
          sprite.material.map.repeat.set(1 / frameCount, -1);
          sprite.material.map.offset.set(frameIndex / frameCount, 1);
        } else {
          sprite.material.map.repeat.set(1 / frameCount, 1);
          sprite.material.map.offset.set(frameIndex / frameCount, 0);
        }
      }
    });

    for (const [id, group] of renderer.projectileMeshes.entries()) {
      if (!this.activeProjs.has(id)) {
        group.visible = false;
        this.projectilePool.push(group);
        renderer.projectileMeshes.delete(id);
      }
    }
  }

  updateParticles() {
    const renderer = this.renderer;
    const engine = renderer.engine;

    if (this.activeCount === 0) {
      if (renderer.particleMesh) renderer.particleMesh.count = 0;
      return;
    }

    if (!renderer.particleMesh) {
      const pGeo = new THREE.PlaneGeometry(1, 1);
      const packedUVs = new Uint32Array(this.poolSize * 3);
      pGeo.setAttribute('packedUVs', new THREE.InstancedBufferAttribute(packedUVs, 3));

      const packedColor = new Uint32Array(this.poolSize);
      pGeo.setAttribute('packedColor', new THREE.InstancedBufferAttribute(packedColor, 1));

      const packedData = new Uint32Array(this.poolSize);
      packedData.fill(63);
      pGeo.setAttribute('packedData', new THREE.InstancedBufferAttribute(packedData, 1));

      const pMat = renderer.instancedMaterial.clone();
      pMat.onBeforeCompile = renderer.instancedMaterial.onBeforeCompile;
      pMat.side = THREE.DoubleSide;
      pMat.transparent = true;
      pMat.alphaTest = 0.1;
      renderer.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.poolSize);
      renderer.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      renderer.particleMesh.frustumCulled = false;
      renderer.scene.add(renderer.particleMesh);
    }

    const dummy = this.dummy;
    const color = this.color;
    const uvAttr = renderer.particleMesh.geometry.attributes.packedUVs;
    let count = 0;

    for (let i = 0; i < this.poolSize; i++) {
      let p = this.particles[i];
      if (!p.active) continue;
      if (count >= this.poolSize) break;

      dummy.position.set(p.x, p.y, p.z);
      dummy.quaternion.copy(renderer.camera.quaternion);
      if (p.rot) dummy.rotateZ(p.rot);

      let scale = p.size * 2 * Math.max(0.1, p.life / p.maxLife);
      if (p.isPop) {
        scale = p.size * 2 * (1.0 + (1.0 - (p.life / p.maxLife)) * 1.5);
      }

      dummy.scale.set(scale, scale, 1);
      dummy.updateMatrix();

      renderer.particleMesh.setMatrixAt(count, dummy.matrix);

      const colorStr = p.color || '#ffffff';
      if (!this.colorCache.has(colorStr)) {
         let parsedColor = new THREE.Color();
         let rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
         if (rgbaMatch) {
            parsedColor.setRGB(parseInt(rgbaMatch[1])/255, parseInt(rgbaMatch[2])/255, parseInt(rgbaMatch[3])/255);
         } else {
            parsedColor.setStyle(colorStr);
         }
         this.colorCache.set(colorStr, parsedColor);
      }
      color.copy(this.colorCache.get(colorStr));

      if (p.isPop) {
        color.lerp(this.whiteColor, 1.0 - (p.life / p.maxLife));
      }

      if (renderer.particleMesh.geometry.attributes.packedColor) {
          const pr = Math.max(0, Math.min(255, color.r * 255)) | 0;
          const pg = Math.max(0, Math.min(255, color.g * 255)) | 0;
          const pb = Math.max(0, Math.min(255, color.b * 255)) | 0;
          renderer.particleMesh.geometry.attributes.packedColor.setX(count, pr | (pg << 8) | (pb << 16));
      } else {
          renderer.particleMesh.setColorAt(count, color);
      }

      let blockType = p.tex || 'white';
      if (p.tex === 'bubble') blockType = 'bubble';
      else if (p.tex === 'smoke') blockType = 'smoke';
      else if (blockType === 'mud') blockType = 'mud1';
      else if (blockType === 'stone-bricks') blockType = 'stone-bricks1';
      if (blockType === 'ice') blockType = 'ice';
      const atlasPos = renderer.assetManager.atlasMap[blockType] || renderer.assetManager.atlasMap['white'];

      let subUvX = p.uvOffsetX !== undefined ? p.uvOffsetX : 0;
      let subUvY = p.uvOffsetY !== undefined ? p.uvOffsetY : 0;
      let subScale = p.uvScale !== undefined ? p.uvScale : 1;

      let ux = Math.round((atlasPos.x + subUvX) * 8);
      let uy = Math.round((atlasPos.y + subUvY) * 8);
      let scaleLevel = subScale === 0.5 ? 1 : (subScale === 0.25 ? 2 : (subScale === 0.125 ? 3 : 0));
      let packedUV = (ux & 255) | ((uy & 255) << 8) | (scaleLevel << 16);

      uvAttr.setXYZ(count, packedUV, packedUV, packedUV);

      count++;
    }

    renderer.particleMesh.count = count;
    renderer.particleMesh.instanceMatrix.needsUpdate = true;
    if (renderer.particleMesh.instanceColor) renderer.particleMesh.instanceColor.needsUpdate = true;
    if (renderer.particleMesh.geometry.attributes.packedColor) renderer.particleMesh.geometry.attributes.packedColor.needsUpdate = true;
    uvAttr.needsUpdate = true;
  }
}
