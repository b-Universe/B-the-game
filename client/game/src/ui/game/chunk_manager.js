
import { TerrainGenerator } from './generator.js?v=cache-bust-005';

export class MapManager {
  constructor(engine) {
    this.engine = engine;
    this.mapWidth = 512;
    this.mapHeight = 512;
    this.maxChunkX = Math.floor((this.mapWidth - 1) / 16);
    this.maxChunkY = Math.floor((this.mapHeight - 1) / 16);
    this.chunks = new Map();
    this.generatedChunks = new Set();
    this.chunkQueue = new Set();
    this.generator = new TerrainGenerator(engine);

    // Offscreen Minimap Cache
    this.mapCacheCanvas = document.createElement('canvas');
    this.mapCacheCanvas.width = this.mapWidth;
    this.mapCacheCanvas.height = this.mapHeight;
    this.mapCacheCtx = this.mapCacheCanvas.getContext('2d');
    this.cacheBounds = { minX: 0, maxX: this.mapWidth - 1, minY: 0, maxY: this.mapHeight - 1 };
    this._lastCx = null;
    this._lastCy = null;
    this._lastChunk = null;
  }

  getAllVoxels() {
    const all = new Map();
    for (const chunk of this.chunks.values()) {
      for (const [key, voxel] of chunk.entries()) {
        all.set(key, voxel);
      }
    }
    return all;
  }

  update(dt) {
    const playerX = this.engine.player ? this.engine.player.x : 0;
    const playerY = this.engine.player ? this.engine.player.y : 0;

    const pxChunk = Math.floor(playerX / 512);
    const pyChunk = Math.floor(playerY / 512);

    const renderRadius = this.engine.clientSettings.renderDistance || 2000;
    const loadRadius = Math.ceil(renderRadius / 512);

    for (let cy = pyChunk - loadRadius; cy <= pyChunk + loadRadius; cy++) {
      for (let cx = pxChunk - loadRadius; cx <= pxChunk + loadRadius; cx++) {
        if (Math.abs(cx - pxChunk) <= 1 && Math.abs(cy - pyChunk) <= 1) {
          this.forceGenerateChunk(cx, cy);
        } else {
          this.ensureChunkExists(cx, cy);
        }
      }
    }
    this.unloadDistantChunks(playerX, playerY);

    const startTime = performance.now();
    const speedMult = this.engine.clientSettings.chunkGenSpeed || 3;
    const timeBudgetMs = 5 + (speedMult * 3.5); // Ranges from 8.5ms (Potato) to ~40ms (Ultra) per frame

    while (this.chunkQueue.size > 0 && (performance.now() - startTime) < timeBudgetMs) {
      this.processChunkQueue(playerX, playerY);
    }
  }

  updateChunkMinimap(cx, cy, chunk) {
    if (!chunk) return;
    const minX = cx * 16;
    const maxX = minX + 15;
    const minY = cy * 16;
    const maxY = minY + 15;

    const topVoxels = new Map();
    for (const [key, v] of chunk.entries()) {
      if (!v || v.tex === 'light_block') continue;
      const lastScore = key.lastIndexOf('_');
      const z = parseInt(key.substring(lastScore + 1), 10);
      const xyKey = key.substring(0, lastScore);
      const existing = topVoxels.get(xyKey);
      if (!existing || z > existing.z) {
        topVoxels.set(xyKey, { z, color: v.color, tex: v.tex });
      }
    }

    const ctx = this.mapCacheCtx;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const v = topVoxels.get(`${x}_${y}`);
        ctx.clearRect(x, y, 1, 1);
        if (v) {
          let color = v.color;
          if (!color || color === '#ffffff' || color.toLowerCase() === '#fff') {
            let baseTex = v.tex || '';
            if (baseTex.startsWith('mud')) baseTex = 'mud';
            if (baseTex.startsWith('stone-bricks')) baseTex = 'stone-bricks';
            const texColors = {
              'grass': '#51852E', 'dirt': '#5c4033', 'stone': '#7f8c8d',
              'stone-bricks': '#95a5a6', 'cobblestone': '#7f8c8d', 'cobbled_deepslate': '#34495e',
              'sand': '#f1c40f', 'water': '#3498db', 'water_flow': '#3498db',
              'lava': '#e67e22', 'lava_flow': '#e67e22', 'acid': '#2ecc71',
              'mud': '#3e2723', 'wood-planks': '#8B5A2B', 'bark-log': '#5c4033',
              'glass': '#aaddff', 'ice': '#a0e6ff'
            };
            color = texColors[baseTex] || '#bdc3c7';
          }

          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);

          // Apply elevation shading
          if (v.z !== 0) {
            ctx.fillStyle = v.z > 0 ? '#ffffff' : '#000000';
            ctx.globalAlpha = Math.min(0.25, Math.abs(v.z) * 0.025);
            ctx.fillRect(x, y, 1, 1);
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }
  }

  updatePixel(x, y) {
    let topV = null;
    let topZ = -Infinity;
    const cx = Math.floor(x / 16);
    const cy = Math.floor(y / 16);
    const chunk = this.chunks.get(`${cx}_${cy}`);
    if (chunk) {
      for (let z = 64; z >= -64; z--) {
        const v = chunk.get(`${x}_${y}_${z}`);
        if (v && v.tex !== 'light_block') {
          topV = v;
          topZ = z;
          break;
        }
      }
    }

    const ctx = this.mapCacheCtx;
    ctx.clearRect(x, y, 1, 1);

    if (topV) {
      let color = topV.color;
      if (!color || color === '#ffffff' || color.toLowerCase() === '#fff') {
        let baseTex = topV.tex || '';
        if (baseTex.startsWith('mud')) baseTex = 'mud';
        if (baseTex.startsWith('stone-bricks')) baseTex = 'stone-bricks';
        const texColors = { 'grass': '#51852E', 'dirt': '#5c4033', 'stone': '#7f8c8d', 'stone-bricks': '#95a5a6', 'cobblestone': '#7f8c8d', 'cobbled_deepslate': '#34495e', 'sand': '#f1c40f', 'water': '#3498db', 'water_flow': '#3498db', 'lava': '#e67e22', 'lava_flow': '#e67e22', 'acid': '#2ecc71', 'mud': '#3e2723', 'wood-planks': '#8B5A2B', 'bark-log': '#5c4033', 'glass': '#aaddff', 'ice': '#a0e6ff' };
        color = texColors[baseTex] || '#bdc3c7';
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
      if (topZ !== 0) {
        ctx.fillStyle = topZ > 0 ? '#ffffff' : '#000000';
        ctx.globalAlpha = Math.min(0.25, Math.abs(topZ) * 0.025);
        ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1.0;
      }
    }
  }

  loadFullMap() {
    for (let cy = 0; cy <= this.maxChunkY; cy++) {
      for (let cx = 0; cx <= this.maxChunkX; cx++) {
        this.ensureChunkExists(cx, cy);
      }
    }
  }

  ensureChunkExists(chunkX, chunkY) {
    if (chunkX < 0 || chunkX > this.maxChunkX || chunkY < 0 || chunkY > this.maxChunkY) return;

    const chunkKey = `${chunkX}_${chunkY}`;
    if (this.generatedChunks.has(chunkKey) || this.chunkQueue.has(chunkKey)) return;
    this.chunkQueue.add(chunkKey);
  }

  forceGenerateChunk(chunkX, chunkY) {
    if (chunkX < 0 || chunkX > this.maxChunkX || chunkY < 0 || chunkY > this.maxChunkY) return;

    const chunkKey = `${chunkX}_${chunkY}`;
    if (this.generatedChunks.has(chunkKey)) return;

    this.chunkQueue.delete(chunkKey);
    this.generatedChunks.add(chunkKey);

    if (!this.chunks.has(chunkKey)) {
      this.chunks.set(chunkKey, new Map());
    }
    const chunk = this.chunks.get(chunkKey);

    this.generator.generateChunk(chunkX, chunkY, 16, chunk);
    this.updateChunkMinimap(chunkX, chunkY, chunk);

    const playerX = this.engine.player ? this.engine.player.x : 0;
    const playerY = this.engine.player ? this.engine.player.y : 0;
    const pxChunk = Math.floor(playerX / 512);
    const pyChunk = Math.floor(playerY / 512);
    const renderRadius = this.engine.clientSettings.renderDistance || 2000;
    const unloadRadius = Math.ceil(renderRadius / 512) + 2;

    // Only pass the chunk over to the 3D Mesher if it's within visual range!
    if (Math.abs(chunkX - pxChunk) <= unloadRadius && Math.abs(chunkY - pyChunk) <= unloadRadius) {
      if (this.engine.renderer) {
        this.engine.renderer.updateChunkColumn(chunkX, chunkY, chunk);

        const neighbors = [
          { cx: chunkX - 1, cy: chunkY },
          { cx: chunkX + 1, cy: chunkY },
          { cx: chunkX, cy: chunkY - 1 },
          { cx: chunkX, cy: chunkY + 1 }
        ];
        neighbors.forEach(n => {
          if (this.chunks.has(`${n.cx}_${n.cy}`)) {
            this.engine.renderer.updateChunkColumn(n.cx, n.cy, this.chunks.get(`${n.cx}_${n.cy}`), true);
          }
        });
      }
    } else {
      // We generated the terrain and drew it to the 2D Map Cache, but it's too far to render in 3D.
      // Immediately free it from RAM since we no longer need the raw grid data!
      this.generatedChunks.delete(chunkKey);
      if (!chunk.isModified) {
        this.chunks.delete(chunkKey);
      }
    }
  }

  processChunkQueue(playerX, playerY) {
    if (this.chunkQueue.size === 0) return;

    // Get the first item from the Set
    let chunkKey = null;
    let bestDist = Infinity;

    if (playerX !== undefined && playerY !== undefined) {
      const px = Math.floor(playerX / 512);
      const py = Math.floor(playerY / 512);
      for (const key of this.chunkQueue) {
        const underscore = key.indexOf('_');
        const cx = parseInt(key.substring(0, underscore), 10);
        const cy = parseInt(key.substring(underscore + 1), 10);
        const distSq = (cx - px) ** 2 + (cy - py) ** 2;
        if (distSq < bestDist) {
          bestDist = distSq;
          chunkKey = key;
        }
      }
    } else {
      chunkKey = this.chunkQueue.values().next().value;
    }

    this.chunkQueue.delete(chunkKey);

    if (this.generatedChunks.has(chunkKey)) return;

    const underscore = chunkKey.indexOf('_');
    const chunkX = parseInt(chunkKey.substring(0, underscore), 10);
    const chunkY = parseInt(chunkKey.substring(underscore + 1), 10);

    this.forceGenerateChunk(chunkX, chunkY);

    if (this.engine.renderer) {
      this.engine.renderer.needsVoxelUpdate = true;
    }
  }

  unloadDistantChunks(playerX, playerY) {
    const px = Math.floor(playerX / 512);
    const py = Math.floor(playerY / 512);
    const renderRadius = this.engine.clientSettings.renderDistance || 2000;
    const unloadRadius = Math.ceil(renderRadius / 512) + 2;
    let unloaded = false;

    for (const chunkKey of this.generatedChunks) {
      const parts = chunkKey.split('_');
      const cx = parseInt(parts[0], 10);
      const cy = parseInt(parts[1], 10);

      // If the chunk is outside our safe radius
      if (Math.abs(cx - px) > unloadRadius || Math.abs(cy - py) > unloadRadius) {
        this.generatedChunks.delete(chunkKey);
        if (this.engine.renderer) this.engine.renderer.removeChunkColumn(cx, cy);
        unloaded = true;

        if (this._lastCx === cx && this._lastCy === cy) {
          this._lastCx = null;
          this._lastCy = null;
          this._lastChunk = null;
        }

        const chunk = this.chunks.get(chunkKey);
        if (chunk && !chunk.isModified) {
          this.chunks.delete(chunkKey);
        }
      }
    }
  }

  getVoxelAt(worldX, worldY, worldZ) {
    const localX = Math.round(worldX / 32);
    const localY = Math.round(worldY / 32);
    const localZ = Math.round(worldZ / 32);
    const cx = Math.floor(localX / 16);
    const cy = Math.floor(localY / 16);

    if (this._lastCx !== cx || this._lastCy !== cy) {
      this._lastCx = cx;
      this._lastCy = cy;
      this._lastChunk = this.chunks.get(`${cx}_${cy}`);
    }

    return this._lastChunk ? this._lastChunk.get(`${localX}_${localY}_${localZ}`) : undefined;
  }

  setVoxelAt(worldX, worldY, worldZ, voxelData, broadcast = true) {
    const localX = Math.round(worldX / 32);
    const localY = Math.round(worldY / 32);
    const localZ = Math.round(worldZ / 32);

    if (localX < 0 || localX >= this.mapWidth || localY < 0 || localY >= this.mapHeight) return false;

    const cx = Math.floor(localX / 16);
    const cy = Math.floor(localY / 16);

    if (this._lastCx !== cx || this._lastCy !== cy) {
      this._lastCx = cx;
      this._lastCy = cy;
      this._lastChunk = this.chunks.get(`${cx}_${cy}`);
    }

    if (!this._lastChunk) {
      this._lastChunk = new Map();
      this.chunks.set(`${cx}_${cy}`, this._lastChunk);
    }
    const chunk = this._lastChunk;
    chunk.isModified = true;
    this.engine.worldDirty = true;

    const key = `${localX}_${localY}_${localZ}`;
    // Treat 0, null, or undefined as air/deletion
    if (voxelData === null || voxelData === undefined || voxelData === 0) {
      chunk.delete(key);
    } else {
      chunk.set(key, voxelData);
    }

    if (this.engine.renderer) {
      this.engine.renderer.updateBlockOcclusion(localX, localY, localZ);
      this.engine.renderer.needsVoxelUpdate = true;

      // Sub-chunk border checking: If a block touches the edge of a 16x16x16 sub-chunk, update the neighbors!
      const activeUpdates = new Set();
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const ncx = Math.floor((localX + dx) / 16);
            const ncy = Math.floor((localY + dy) / 16);
            const ncz = Math.floor((localZ + dz) / 16);
            activeUpdates.add(`${ncx}_${ncy}_${ncz}`);
          }
        }
      }
      for (const key of activeUpdates) {
        const [ncx, ncy, ncz] = key.split('_').map(Number);
        const nChunk = this.chunks.get(`${ncx}_${ncy}`);
        this.engine.renderer.updateChunkMesh(ncx, ncy, ncz, nChunk, true);
      }
    }
    this.updatePixel(localX, localY);

    if (broadcast && this.engine.socket) {
      this.engine.network.sendUpdateBlock({ worldX, worldY, worldZ, voxelData });
    }
    return true;
  }
}
