import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BlockRegistry } from './registry.js?v=new-engine-330';

export class VoxelManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.doorMap = {};
    this.doorPhysics = {};
    this.lastChunkX = null;
    this.lastChunkY = null;
  }

  isBlockOccluded(x, y, z, shape) {
    if (shape !== 'cube') return false;
    const cm = this.renderer.engine.mapManager;
    if (!cm) return false;

    const getShape = (v) => {
      if (!v) return null;
      if (v.tex && (v.tex.startsWith('glass') || v.tex.startsWith('clear_stained_glass'))) return 'transparent';
      if (v.tex === 'light_block') return 'transparent';
      return v.shape || 'cube';
    };

    const top = cm.getVoxelAt(x, y, z + 32);
    const bottom = z <= -96 ? { shape: 'cube' } : cm.getVoxelAt(x, y, z - 32);
    const north = cm.getVoxelAt(x, y - 32, z);
    const south = cm.getVoxelAt(x, y + 32, z);
    const east = cm.getVoxelAt(x + 32, y, z);
    const west = cm.getVoxelAt(x - 32, y, z);

    if (getShape(top) === 'cube' && getShape(bottom) === 'cube' &&
        getShape(north) === 'cube' && getShape(south) === 'cube' &&
        getShape(east) === 'cube' && getShape(west) === 'cube') {
      return true;
    }
    return false;
  }

  cacheOcclusion() {
    if (!this.renderer.engine.mapManager) return;
    for (const chunk of this.renderer.engine.mapManager.chunks.values()) {
      for (const [key, voxel] of chunk.entries()) {
        const [vx, vy, vz] = key.split('_').map(Number);
        voxel.isOccluded = this.isBlockOccluded(vx * 32, vy * 32, vz * 32, voxel.shape || 'cube');
      }
    }
  }

  updateBlockOcclusion(localX, localY, localZ) {
    if (!this.renderer.engine.mapManager) return;
    const offsets = [
      [0, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0]
    ];
    for (const [dx, dy, dz] of offsets) {
      const nx = localX + dx;
      const ny = localY + dy;
      const nz = localZ + dz;
      const cx = Math.floor(nx / 16);
      const cy = Math.floor(ny / 16);
      const chunk = this.renderer.engine.mapManager.chunks.get(`${cx}_${cy}`);
      const voxel = chunk ? chunk.get(`${nx}_${ny}_${nz}`) : undefined;
      if (voxel) voxel.isOccluded = this.isBlockOccluded(nx * 32, ny * 32, nz * 32, voxel.shape || 'cube');
    }
  }

  checkChunkUpdate() {
    if (!this.renderer.engine.mapManager) return;
    const player = this.renderer.engine.player;
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;

    const currentChunkX = Math.floor(px / 512);
    const currentChunkY = Math.floor(py / 512);
    if (this.lastChunkX !== currentChunkX || this.lastChunkY !== currentChunkY) {
      this.renderer.needsVoxelUpdate = true;
      this.lastChunkX = currentChunkX;
      this.lastChunkY = currentChunkY;
    }
  }

  *updateVoxelsGenerator() {
    if (!this.renderer.engine.mapManager) return;

    const player = this.renderer.engine.player;
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;

    let newDoorMap = {};
    if (this.doorPhysics) {
      for (const key in this.doorPhysics) {
        this.doorPhysics[key].initialized = false;
      }
    }

    const nameToId = {};
    for (const id in BlockRegistry) {
      nameToId[BlockRegistry[id].name] = id;
    }

    let iCube = 0, iSlab = 0, iRamp = 0, iStair = 0, iDecor = 0, iGlass = 0, iGlassSlab = 0, iGlassRamp = 0, iGlassStair = 0, iDoor = 0, iGlassDoor = 0, iLightBlock = 0;
    const newModelCounts = {};
    for (const id in this.renderer.assetManager.modelMeshes) newModelCounts[id] = 0;
    const dummy = new THREE.Object3D();

    let newSplash = [];
    let newLava = [];
    let newLight = [];

    const renderRadius = this.renderer.engine.clientSettings.renderDistance || 2000;
    const visibleVoxels = this.renderer.engine.mapManager.getVoxelsInView(px, py, renderRadius);

    let counter = 0;
    for (const [key, voxel] of visibleVoxels.entries()) {
      counter++;
      if (counter % 1200 === 0) yield;

      if (voxel.isOccluded) continue;

        const firstScore = key.indexOf('_');
        const secondScore = key.indexOf('_', firstScore + 1);
        const vx = parseInt(key.substring(0, firstScore), 10);
        const vy = parseInt(key.substring(firstScore + 1, secondScore), 10);
        const vz = parseInt(key.substring(secondScore + 1), 10);
        const absX = vx * 32;
        const absY = vy * 32;
        const absZ = vz * 32;

        if (voxel.tex === 'water_flow') {
           const bottomVoxel = this.renderer.engine.mapManager.getVoxelAt(absX, absY, absZ - 32);
           if (bottomVoxel && bottomVoxel.tex === 'water') {
              let wColor = bottomVoxel.color;
              if (!wColor || typeof wColor !== 'string' || !wColor.startsWith('#') || wColor.includes('NaN')) {
                wColor = '#3498db';
              }

              let fallHeight = 1;
              while (this.renderer.engine.mapManager.getVoxelAt(absX, absY, absZ + (fallHeight * 32))?.tex === 'water_flow') {
                 fallHeight++;
              }
              newSplash.push({ x: absX, y: absY, z: absZ - 16, color: wColor, fallHeight });
           }
        }

        if (voxel.tex === 'lava' || voxel.tex === 'acid') {
           const topVoxel = this.renderer.engine.mapManager.getVoxelAt(absX, absY, absZ + 32);
           if (!topVoxel || topVoxel.shape !== 'cube') {
              let lColor = voxel.color;
              if (!lColor || typeof lColor !== 'string' || !lColor.startsWith('#') || lColor.includes('NaN')) {
                lColor = voxel.tex === 'acid' ? '#2ecc71' : '#ff5d00';
              }
              newLava.push({ x: absX, y: absY, z: absZ, color: lColor, isAcid: voxel.tex === 'acid' });
              if (voxel.tex === 'lava') {
                 newLight.push({ x: absX, y: absY, z: absZ, color: lColor });
              }
           }
        } else if (voxel.tex === 'light_block') {
            let lColor = voxel.color;
            if (!lColor || typeof lColor !== 'string' || !lColor.startsWith('#') || lColor.includes('NaN')) lColor = '#f1c40f';
            newLight.push({ x: absX, y: absY, z: absZ, color: lColor });
        } else if (voxel.tex && voxel.tex.startsWith('block-lamp-on')) {
            let lColor = voxel.color;
            if (!lColor || typeof lColor !== 'string' || !lColor.startsWith('#') || lColor.includes('NaN')) {
              lColor = '#f1c40f';
            }
            let lampMult = 1.0;
            if (voxel.tex === 'block-lamp-on-3') lampMult = 0.75;
            else if (voxel.tex === 'block-lamp-on-2') lampMult = 0.50;
            else if (voxel.tex === 'block-lamp-on-1') lampMult = 0.25;
            else if (voxel.tex === 'block-lamp-on-0') lampMult = 0.125;
            newLight.push({ x: absX, y: absY, z: absZ, color: lColor, isLamp: lampMult });
        }

        const shape = voxel.shape || 'cube';
        const isGlassBlock = voxel.tex && (voxel.tex.startsWith('glass') || voxel.tex.startsWith('clear_stained_glass'));

        let currentMesh, currentI, currentUVTop, currentUVSide, currentUVBottom, currentFluidAttr, currentN1, currentN2;

        dummy.rotation.set(0, 0, 0);
        let fluidType = 0.0;
        if (voxel.tex === 'water' || voxel.tex === 'water_flow') fluidType = 1.0;
        else if (voxel.tex === 'lava' || voxel.tex === 'lava_flow') fluidType = 2.0;
        else if (voxel.tex === 'acid') fluidType = 3.0;
        else if (voxel.tex && voxel.tex.startsWith('block-lamp-on')) fluidType = 4.0;
        const isFluid = fluidType > 0.0 && fluidType < 4.0;

        if (voxel.tex === 'light_block') {
            if (this.renderer.engine.editMode) {
                currentMesh = this.renderer.lightBlockMesh;
                currentI = iLightBlock;
                iLightBlock++;
            } else {
                continue;
            }
        } else if (shape === 'decor') {
          currentMesh = this.renderer.decorMesh; currentI = iDecor; iDecor++;
        } else if (this.renderer.assetManager.modelMeshes && this.renderer.assetManager.modelMeshes[shape]) {
          currentMesh = this.renderer.assetManager.modelMeshes[shape];
          currentI = newModelCounts[shape];
          newModelCounts[shape]++;
          let rot = 0;
          if (voxel.dir === 'e') rot = -Math.PI / 2;
          else if (voxel.dir === 'n') rot = Math.PI;
          else if (voxel.dir === 'w') rot = Math.PI / 2;
          dummy.rotation.set(0, 0, rot);
          currentUVSide = null; currentUVBottom = null;
          currentFluidAttr = null; currentN1 = null; currentN2 = null;

          if (shape.startsWith('neon-sign')) {
            let lColor = voxel.color;
            if (!lColor || typeof lColor !== 'string' || !lColor.startsWith('#') || lColor.includes('NaN')) lColor = '#f1c40f';
            newLight.push({ x: absX, y: absY, z: absZ, color: lColor, isLamp: 0.25 });
          }
        } else if (shape === 'slab') {
          if (isGlassBlock) { currentMesh = this.renderer.glassSlabMesh; currentI = iGlassSlab; iGlassSlab++; }
          else { currentMesh = this.renderer.slabMesh; currentI = iSlab; iSlab++; }
        } else if (shape.startsWith('ramp')) {
          if (isGlassBlock) { currentMesh = this.renderer.glassRampMesh; currentI = iGlassRamp; iGlassRamp++; }
          else { currentMesh = this.renderer.rampMesh; currentI = iRamp; iRamp++; }
          if (shape === 'ramp_e') dummy.rotation.set(0, 0, -Math.PI / 2);
          else if (shape === 'ramp_n') dummy.rotation.set(0, 0, Math.PI);
          else if (shape === 'ramp_w') dummy.rotation.set(0, 0, Math.PI / 2);
        } else if (shape.startsWith('stair')) {
          if (isGlassBlock) { currentMesh = this.renderer.glassStairMesh; currentI = iGlassStair; iGlassStair++; }
          else { currentMesh = this.renderer.stairMesh; currentI = iStair; iStair++; }
          if (shape === 'stair_e') dummy.rotation.set(0, 0, -Math.PI / 2);
          else if (shape === 'stair_n') dummy.rotation.set(0, 0, Math.PI);
          else if (shape === 'stair_w') dummy.rotation.set(0, 0, Math.PI / 2);
        } else if (shape.startsWith('door')) {
          if (isGlassBlock) { currentMesh = this.renderer.glassDoorMesh; currentI = iGlassDoor; iGlassDoor++; }
          else { currentMesh = this.renderer.doorMesh; currentI = iDoor; iDoor++; }

          let baseRot = 0;
          if (shape.includes('door_e')) baseRot = -Math.PI / 2;
          else if (shape.includes('door_n')) baseRot = Math.PI;
          else if (shape.includes('door_w')) baseRot = Math.PI / 2;
          else if (shape.includes('door_s')) baseRot = 0;

          let rot = baseRot;
          const isOp = shape.includes('_open');
          const isFlip = shape.includes('_flip');

          if (isOp) rot += isFlip ? -Math.PI / 2 : Math.PI / 2;

          newDoorMap[`${absX}_${absY}_${absZ}`] = {
            id: currentI, targetRot: rot, baseRot: baseRot, isGlass: isGlassBlock,
            cx: absX, cy: absY, cz: absZ, flip: isFlip
          };
          dummy.rotation.set(0, 0, rot);
        } else {
          if (isGlassBlock) { currentMesh = this.renderer.glassMesh; currentI = iGlass; iGlass++; }
          else { currentMesh = this.renderer.voxelMesh; currentI = iCube; iCube++; }
        }

        currentUVTop = currentMesh.geometry.attributes.instanceUVTop;
        currentUVSide = currentMesh.geometry.attributes.instanceUVSide;
        currentUVBottom = currentMesh.geometry.attributes.instanceUVBottom;
        currentFluidAttr = currentMesh.geometry.attributes.isFluid;
        currentN1 = currentMesh.geometry.attributes.instanceNeighbors1;
        currentN2 = currentMesh.geometry.attributes.instanceNeighbors2;

        const maxCapacity = currentMesh.instanceMatrix.array.length / 16;
        if (currentI >= maxCapacity) continue;

        dummy.scale.set(1, 1, 1);
        dummy.position.set(absX, absY, absZ);

        dummy.updateMatrix();
        currentMesh.setMatrixAt(currentI, dummy.matrix);

        let blockColor = voxel.color;
        if (!blockColor || typeof blockColor !== 'string' || !blockColor.startsWith('#') || blockColor.includes('NaN')) {
          if (voxel.tex === 'lava') blockColor = '#ff5d00';
          else if (voxel.tex === 'acid') blockColor = '#2ecc71';
          else blockColor = voxel.tex === 'grass' ? '#51852E' : '#ffffff';
        }

        let finalColor = new THREE.Color(blockColor);
        if (isFluid) {
            let depth = 0;
            let checkZ = absZ + 32;
            while (true) {
                const topVoxel = this.renderer.engine.mapManager.getVoxelAt(absX, absY, checkZ);
                if (topVoxel && (topVoxel.tex === 'water' || topVoxel.tex === 'water_flow' || topVoxel.tex === 'lava' || topVoxel.tex === 'acid')) {
                    depth++;
                    checkZ += 32;
                } else {
                    break;
                }
            }
            if (depth > 0) {
                const darkenFactor = Math.max(0.3, 1.0 - (depth * 0.2));
                finalColor.multiplyScalar(darkenFactor);
            }
        }
        currentMesh.setColorAt(currentI, finalColor);

        const blockId = nameToId[voxel.tex];
        const voxelDef = blockId ? BlockRegistry[blockId] : null;
        let mainAtlasPos, sidesAtlasPos, bottomAtlasPos;

        let blockType = voxel.tex || 'grass';
        if (blockType === 'mud') {
          const hash = Math.abs(Math.sin(vx * 12.9898 + vy * 78.233 + vz * 37.719)) * 10000;
          blockType = `mud${Math.floor(hash) % 3 + 1}`;
        } else if (blockType === 'stone-bricks') {
          const hash = Math.abs(Math.sin(vx * 12.9898 + vy * 78.233 + vz * 37.719)) * 10000;
          blockType = `stone-bricks${Math.floor(hash) % 6 + 1}`;
        }

        if (voxelDef && voxelDef.faces && blockType === voxel.tex) {
          mainAtlasPos = this.renderer.assetManager.atlasMap[voxelDef.name];
          sidesAtlasPos = this.renderer.assetManager.atlasMap[voxelDef.name + '_flow'];
          if (!sidesAtlasPos) sidesAtlasPos = mainAtlasPos;
          bottomAtlasPos = this.renderer.assetManager.atlasMap[voxelDef.name + '_bottom'] || mainAtlasPos;
        } else {
          mainAtlasPos = this.renderer.assetManager.atlasMap[blockType] || this.renderer.assetManager.atlasMap['stone'];
          sidesAtlasPos = mainAtlasPos;
          bottomAtlasPos = mainAtlasPos;
        }

        const uvScaleX = 64 / 2048; const uvScaleY = 64 / 2048;

        let subScale = 1.0;
        let subOffsetX = 0;
        let subOffsetY = 0;

        if (blockType === 'arcade-carpet') {
          subScale = 0.5;
          subOffsetX = ((vx % 2 + 2) % 2) * 0.5;
          subOffsetY = ((vy % 2 + 2) % 2) * 0.5;
        }

        if (currentFluidAttr) currentFluidAttr.setX(currentI, fluidType);

        let visE = 1, visW = 1, visS = 1, visN = 1, visT = 1, visB = 1;
        if (isGlassBlock || isFluid) {
           const checkCull = (v) => v && v.tex === voxel.tex && (v.shape || 'cube') === shape;
           if (checkCull(this.renderer.engine.mapManager.getVoxelAt(absX + 32, absY, absZ))) visE = 0;
           if (checkCull(this.renderer.engine.mapManager.getVoxelAt(absX - 32, absY, absZ))) visW = 0;
           if (checkCull(this.renderer.engine.mapManager.getVoxelAt(absX, absY + 32, absZ))) visS = 0;
           if (checkCull(this.renderer.engine.mapManager.getVoxelAt(absX, absY - 32, absZ))) visN = 0;
           if (checkCull(this.renderer.engine.mapManager.getVoxelAt(absX, absY, absZ + 32))) visT = 0;
           if (checkCull(this.renderer.engine.mapManager.getVoxelAt(absX, absY, absZ - 32))) visB = 0;
        }

        if (currentN1) currentN1.setXYZW(currentI, visE, visW, visS, visN);
        if (currentN2) currentN2.setXY(currentI, visT, visB);

        if (currentUVTop) {
          const tx = mainAtlasPos ? mainAtlasPos.x : 0; const ty = mainAtlasPos ? mainAtlasPos.y : 0;
          let tw = uvScaleX * subScale; let to = (tx + subOffsetX) * uvScaleX;
          if (shape.includes('_flip')) { tw = -tw; to += Math.abs(tw); }
          currentUVTop.setXYZW(currentI, to, 1.0 - ((ty + subScale + subOffsetY) * uvScaleY), tw, uvScaleY * subScale);
        }
        if (currentUVSide) {
          const sx = sidesAtlasPos ? sidesAtlasPos.x : 0; const sy = sidesAtlasPos ? sidesAtlasPos.y : 0;
          let sw = uvScaleX * subScale; let so = (sx + subOffsetX) * uvScaleX;
          if (shape.includes('_flip')) { sw = -sw; so += Math.abs(sw); }
          currentUVSide.setXYZW(currentI, so, 1.0 - ((sy + subScale + subOffsetY) * uvScaleY), sw, uvScaleY * subScale);
        }
        if (currentUVBottom) {
          const bx = bottomAtlasPos ? bottomAtlasPos.x : 0; const by = bottomAtlasPos ? bottomAtlasPos.y : 0;
          let bw = uvScaleX * subScale; let bo = (bx + subOffsetX) * uvScaleX;
          if (shape.includes('_flip')) { bw = -bw; bo += Math.abs(bw); }
          currentUVBottom.setXYZW(currentI, bo, 1.0 - ((by + subScale + subOffsetY) * uvScaleY), bw, uvScaleY * subScale);
        }
    }

    this.doorMap = newDoorMap;
    this.renderer.engine.splashPoints = newSplash;
    this.renderer.engine.lavaPoints = newLava;
    this.renderer.lightPoints = newLight;
    for (const id in newModelCounts) {
      this.renderer.assetManager.modelCounts[id] = newModelCounts[id];
    }

    this.renderer.voxelMesh.count = iCube;
    this.renderer.slabMesh.count = iSlab;
    this.renderer.rampMesh.count = iRamp;
    this.renderer.stairMesh.count = iStair;
    this.renderer.decorMesh.count = iDecor;
    this.renderer.glassMesh.count = iGlass;
    this.renderer.glassSlabMesh.count = iGlassSlab;
    this.renderer.glassRampMesh.count = iGlassRamp;
    this.renderer.glassStairMesh.count = iGlassStair;
    this.renderer.doorMesh.count = iDoor;
    this.renderer.glassDoorMesh.count = iGlassDoor;
    this.renderer.lightBlockMesh.count = iLightBlock;

    [this.renderer.voxelMesh, this.renderer.slabMesh, this.renderer.rampMesh, this.renderer.stairMesh, this.renderer.decorMesh, this.renderer.glassMesh, this.renderer.glassSlabMesh, this.renderer.glassRampMesh, this.renderer.glassStairMesh, this.renderer.doorMesh, this.renderer.glassDoorMesh, this.renderer.lightBlockMesh].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      if (m.geometry.attributes.instanceUVTop) m.geometry.attributes.instanceUVTop.needsUpdate = true;
      if (m.geometry.attributes.instanceUVSide) m.geometry.attributes.instanceUVSide.needsUpdate = true;
      if (m.geometry.attributes.instanceUVBottom) m.geometry.attributes.instanceUVBottom.needsUpdate = true;
      if (m.geometry.attributes.isFluid) m.geometry.attributes.isFluid.needsUpdate = true;
      if (m.geometry.attributes.instanceNeighbors1) m.geometry.attributes.instanceNeighbors1.needsUpdate = true;
      if (m.geometry.attributes.instanceNeighbors2) m.geometry.attributes.instanceNeighbors2.needsUpdate = true;
    });

    for (const [id, mesh] of Object.entries(this.renderer.assetManager.modelMeshes)) {
      mesh.count = this.renderer.assetManager.modelCounts[id] || 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (mesh.geometry.attributes.instanceUVTop) mesh.geometry.attributes.instanceUVTop.needsUpdate = true;
    }

    if (!this.renderer.initialLoadComplete) {
      this.renderer.initialLoadComplete = true;
      if (this.renderer.engine.ui) {
        this.renderer.engine.ui.hideLoadingScreen();
      }
      const hint = document.getElementById('load-hint-msg');
      if (hint) hint.remove();
    }
  }
}
