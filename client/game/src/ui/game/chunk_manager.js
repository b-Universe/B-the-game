
import { TerrainGenerator } from './generator.js?v=new-engine-330';

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
    this.mapCacheCtx = this.mapCacheCanvas.getContext('2d');
    this.mapCacheDirty = true;
    this.cacheBounds = null;
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
    for (let cy = pyChunk - 1; cy <= pyChunk + 1; cy++) {
      for (let cx = pxChunk - 1; cx <= pxChunk + 1; cx++) {
        this.forceGenerateChunk(cx, cy);
      }
    }

    const startTime = performance.now();
    const timeBudgetMs = 16; // Spend up to 16ms per frame generating chunks

    while (this.chunkQueue.size > 0 && (performance.now() - startTime) < timeBudgetMs) {
      this.processChunkQueue(playerX, playerY);
    }

    if (this.mapCacheDirty && this.chunkQueue.size === 0) {
      this.updateTopDownCache();
    }
  }

  updateTopDownCache() {
    if (this.chunks.size === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // 1. Calculate map bounds instantly using Chunk Keys instead of checking millions of voxels
    for (const chunkKey of this.chunks.keys()) {
      const firstScore = chunkKey.indexOf('_');
      const cx = parseInt(chunkKey.substring(0, firstScore), 10);
      const cy = parseInt(chunkKey.substring(firstScore + 1), 10);

      const chunkMinX = cx * 16;
      const chunkMaxX = chunkMinX + 15;
      const chunkMinY = cy * 16;
      const chunkMaxY = chunkMinY + 15;

      if (chunkMinX < minX) minX = chunkMinX;
      if (chunkMaxX > maxX) maxX = chunkMaxX;
      if (chunkMinY < minY) minY = chunkMinY;
      if (chunkMaxY > maxY) maxY = chunkMaxY;
    }

    if (minX === Infinity) return;

    const topVoxels = new Map();

    // 2. Find the highest Z block for every X/Y coordinate
    for (const chunk of this.chunks.values()) {
      for (const [key, v] of chunk.entries()) {
        if (v.tex === 'light_block') continue;

        // Skip integer parsing and bounds checking for X and Y entirely!
        const lastScore = key.lastIndexOf('_');
        const z = parseInt(key.substring(lastScore + 1), 10);
        const xyKey = key.substring(0, lastScore);

        const existing = topVoxels.get(xyKey);
        if (!existing || z > existing.z) {
          topVoxels.set(xyKey, { z, color: v.color, tex: v.tex });
        }
      }
    }

    this.cacheBounds = { minX, maxX, minY, maxY };
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    this.mapCacheCanvas.width = width;
    this.mapCacheCanvas.height = height;
    const ctx = this.mapCacheCtx;

    ctx.clearRect(0, 0, width, height); // Keep background transparent

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const v = topVoxels.get(`${x}_${y}`);
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
          ctx.fillRect(x - minX, y - minY, 1, 1);

          // Apply elevation shading
          if (v.z !== 0) {
            ctx.fillStyle = v.z > 0 ? '#ffffff' : '#000000';
            ctx.globalAlpha = Math.min(0.25, Math.abs(v.z) * 0.025);
            ctx.fillRect(x - minX, y - minY, 1, 1);
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }
    this.mapCacheDirty = false;
  }

  updatePixel(x, y) {
    if (!this.cacheBounds) return;

    if (x < this.cacheBounds.minX || x > this.cacheBounds.maxX || y < this.cacheBounds.minY || y > this.cacheBounds.maxY) {
      this.mapCacheDirty = true;
      return;
    }

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
    const drawX = x - this.cacheBounds.minX;
    const drawY = y - this.cacheBounds.minY;

    ctx.clearRect(drawX, drawY, 1, 1);

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
      ctx.fillRect(drawX, drawY, 1, 1);
      if (topZ !== 0) {
        ctx.fillStyle = topZ > 0 ? '#ffffff' : '#000000';
        ctx.globalAlpha = Math.min(0.25, Math.abs(topZ) * 0.025);
        ctx.fillRect(drawX, drawY, 1, 1);
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
    this.mapCacheDirty = true;

    if (this.engine.socket) {
      this.engine.network.sendRequestFullMap();
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
    this.mapCacheDirty = true;
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
    const unloadRadius = 8; // Unload chunks further than 8 grid units away (~4096 units)
    let unloaded = false;

    for (const chunkKey of this.chunks.keys()) {
      const parts = chunkKey.split('_');
      const cx = parseInt(parts[0], 10);
      const cy = parseInt(parts[1], 10);

      // If the chunk is outside our safe radius
      if (Math.abs(cx - px) > unloadRadius || Math.abs(cy - py) > unloadRadius) {
        this.chunks.delete(chunkKey);
        this.generatedChunks.delete(chunkKey);
        unloaded = true;

        if (this._lastCx === cx && this._lastCy === cy) {
          this._lastCx = null;
          this._lastCy = null;
          this._lastChunk = null;
        }
      }
    }

    if (unloaded) {
      this.mapCacheDirty = true;
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

  getVoxelsInView(playerX, playerY, viewRadius) {
    const visible = new Map();
    const localRadius = Math.ceil(viewRadius / 32);
    const px = Math.round(playerX / 32);
    const py = Math.round(playerY / 32);
    const minX = px - localRadius;
    const maxX = px + localRadius;
    const minY = py - localRadius;
    const maxY = py + localRadius;

    const minChunkX = Math.floor(minX / 16);
    const maxChunkX = Math.floor(maxX / 16);
    const minChunkY = Math.floor(minY / 16);
    const maxChunkY = Math.floor(maxY / 16);

    const pxChunk = Math.floor(playerX / 512);
    const pyChunk = Math.floor(playerY / 512);

    // Expand the generation queue bounds to preload chunks before they are visible
    for (let cy = minChunkY - 2; cy <= maxChunkY + 2; cy++) {
      for (let cx = minChunkX - 2; cx <= maxChunkX + 2; cx++) {
        if (Math.abs(cx - pxChunk) <= 1 && Math.abs(cy - pyChunk) <= 1) {
          this.forceGenerateChunk(cx, cy);
        } else {
          this.ensureChunkExists(cx, cy);
        }

        if (cx < minChunkX || cx > maxChunkX || cy < minChunkY || cy > maxChunkY) {
          continue; // Preloaded chunk, do not add to visible render list
        }

        const chunk = this.chunks.get(`${cx}_${cy}`);
        if (chunk) {
          const isEdgeChunk = cx === minChunkX || cx === maxChunkX || cy === minChunkY || cy === maxChunkY;
          if (!isEdgeChunk) {
            for (const [key, voxel] of chunk.entries()) {
              visible.set(key, voxel);
            }
          } else {
            for (const [key, voxel] of chunk.entries()) {
              const firstScore = key.indexOf('_');
              const secondScore = key.indexOf('_', firstScore + 1);
              const x = parseInt(key.substring(0, firstScore), 10);
              const y = parseInt(key.substring(firstScore + 1, secondScore), 10);

              if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                visible.set(key, voxel);
              }
            }
          }
        }
      }
    }
    return visible;
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
    }
    this.updatePixel(localX, localY);

    if (broadcast && this.engine.socket) {
      this.engine.network.sendUpdateBlock({ worldX, worldY, worldZ, voxelData });
    }
    return true;
  }
}
