import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BlockRegistry } from './registry.js?v=cache-bust-005';

export class VoxelManager {
  constructor(renderer) {
    this.renderer = renderer;
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

    const nameToId = {};
    for (const id in BlockRegistry) {
      nameToId[BlockRegistry[id].name] = id;
    }

    let newSplash = [];
    let newLava = [];
    let newLight = [];
    let newDoors = [];

    const renderRadius = this.renderer.engine.clientSettings.renderDistance || 2000;

    const localRadius = Math.ceil(renderRadius / 32);
    const pxGrid = Math.round(px / 32);
    const pyGrid = Math.round(py / 32);
    const minX = pxGrid - localRadius;
    const maxX = pxGrid + localRadius;
    const minY = pyGrid - localRadius;
    const maxY = pyGrid + localRadius;

    const minChunkX = Math.floor(minX / 16);
    const maxChunkX = Math.floor(maxX / 16);
    const minChunkY = Math.floor(minY / 16);
    const maxChunkY = Math.floor(maxY / 16);

    let counter = 0;
    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        const chunk = this.renderer.engine.mapManager.chunks.get(`${cx}_${cy}`);
        if (!chunk) continue;

        const isEdgeChunk = cx === minChunkX || cx === maxChunkX || cy === minChunkY || cy === maxChunkY;

        for (const [key, voxel] of chunk.entries()) {
          if (!voxel || voxel.isOccluded) continue;

          const firstScore = key.indexOf('_');
          const secondScore = key.indexOf('_', firstScore + 1);
          const vx = parseInt(key.substring(0, firstScore), 10);
          const vy = parseInt(key.substring(firstScore + 1, secondScore), 10);

          if (isEdgeChunk) {
            if (vx < minX || vx > maxX || vy < minY || vy > maxY) continue;
          }

          counter++;
          const genSpeed = this.renderer.engine.clientSettings.chunkGenSpeed || 3;
          if (counter % (400 * genSpeed) === 0) yield;

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

        if (voxel.shape && voxel.shape.includes('door')) {
            newDoors.push({ x: absX, y: absY, z: absZ, shape: voxel.shape, tex: voxel.tex, color: voxel.color, dir: voxel.dir });
        }
        }
      }
    }

    this.renderer.engine.splashPoints = newSplash;
    this.renderer.engine.lavaPoints = newLava;
    this.renderer.lightPoints = newLight;
    this.renderer.engine.doors = newDoors;
  }
}
