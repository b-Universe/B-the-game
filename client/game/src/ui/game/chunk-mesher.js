import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';
import { MeshCache } from './mesh-cache.js?v=new-engine-330';

export class ChunkMesher {
  constructor(engine) {
    this.engine = engine;
    this.meshCache = new MeshCache();

    this.useWorkers = true;
    this.workerPool = [];
    this.callbacks = new Map();

    if (this.useWorkers && typeof Worker !== 'undefined') {
        for (let i = 0; i < 2; i++) {
            const worker = new Worker(new URL('./mesher.worker.js?v=new-engine-331', import.meta.url), { type: 'module' });
            worker.onmessage = (e) => {
                if (e.data.error) {
                    console.error("[ChunkMesher] Worker execution failed:", e.data.error);
                    const cb = this.callbacks.get(e.data.jobId);
                    if (cb && cb.reject) {
                        cb.reject(new Error(e.data.error));
                        this.callbacks.delete(e.data.jobId);
                    }
                    return;
                }
                const { jobId, cx, cy, cz, opVertexCount, opIndexCount, trVertexCount, trIndexCount, buffers } = e.data;
                const cb = this.callbacks.get(jobId);
                if (cb && cb.resolve) {
                    cb.resolve({ opVertexCount, opIndexCount, trVertexCount, trIndexCount, buffers });
                    this.callbacks.delete(jobId);
                }
            };
            worker.onerror = (err) => {
                console.error("[ChunkMesher] Worker execution error:", err);
            };
            this.workerPool.push(worker);
        }
    }

    this.MAX_VERTICES = 120000;
    this.positions = new Float32Array(this.MAX_VERTICES * 3);
    this.normals = new Float32Array(this.MAX_VERTICES * 3);
    this.uvs = new Float32Array(this.MAX_VERTICES * 2);
    this.packedUVs = new Uint32Array(this.MAX_VERTICES);
    this.packedColors = new Uint32Array(this.MAX_VERTICES);
    this.packedData = new Uint32Array(this.MAX_VERTICES);
    this.indices = new Uint32Array(this.MAX_VERTICES * 3); // Increased to safely accommodate complex model index counts

    this.t_positions = new Float32Array(this.MAX_VERTICES * 3);
    this.t_normals = new Float32Array(this.MAX_VERTICES * 3);
    this.t_uvs = new Float32Array(this.MAX_VERTICES * 2);
    this.t_packedUVs = new Uint32Array(this.MAX_VERTICES);
    this.t_packedColors = new Uint32Array(this.MAX_VERTICES);
    this.t_packedData = new Uint32Array(this.MAX_VERTICES);
    this.t_indices = new Uint32Array(this.MAX_VERTICES * 3);

    this.transferPool = [];
    this.bufferWaiters = [];
    for (let i = 0; i < 4; i++) {
        this.transferPool.push(this.createTransferBuffers());
    }
  }

  async clearCache() {
    await this.meshCache.clear();
    if (this.pendingChunkUpdates) this.pendingChunkUpdates.clear();
    this.pendingMeshes = 0;
  }

  createTransferBuffers() {
      return {
          opPositions: new Float32Array(this.MAX_VERTICES * 3),
          opNormals: new Float32Array(this.MAX_VERTICES * 3),
          opUvs: new Float32Array(this.MAX_VERTICES * 2),
          opPackedUVs: new Uint32Array(this.MAX_VERTICES),
          opPackedColors: new Uint32Array(this.MAX_VERTICES),
          opPackedData: new Uint32Array(this.MAX_VERTICES),
          opIndices: new Uint32Array(this.MAX_VERTICES * 3),
          trPositions: new Float32Array(this.MAX_VERTICES * 3),
          trNormals: new Float32Array(this.MAX_VERTICES * 3),
          trUvs: new Float32Array(this.MAX_VERTICES * 2),
          trPackedUVs: new Uint32Array(this.MAX_VERTICES),
          trPackedColors: new Uint32Array(this.MAX_VERTICES),
          trPackedData: new Uint32Array(this.MAX_VERTICES),
          trIndices: new Uint32Array(this.MAX_VERTICES * 3)
      };
  }

  async getTransferBuffer() {
      if (this.transferPool.length > 0) return this.transferPool.pop();
      return new Promise(resolve => this.bufferWaiters.push(resolve));
  }

  releaseTransferBuffer(buffer) {
      if (this.bufferWaiters.length > 0) this.bufferWaiters.shift()(buffer);
      else this.transferPool.push(buffer);
  }

  async buildChunkMesh(cx, cy, cz, chunkMap, forceRebuild = false) {
    const cacheKey = `${this.engine.currentZone || 'untitled'}_${cx}_${cy}_${cz}`;

    let chunkHash = 330;
    if (chunkMap) {
        for (const [key, v] of chunkMap.entries()) {
            if (!v) continue;
            const z = parseInt(key.substring(key.lastIndexOf('_') + 1), 10);
            if (Math.floor(z / 16) === cz) {
                const str = key + (v.tex||'') + (v.shape||'') + (v.color||'') + (v.dir||'');
                for (let i = 0; i < str.length; i++) {
                    chunkHash = Math.imul(31, chunkHash) + str.charCodeAt(i) | 0;
                }
            }
        }
    }

    let opVertexCount = 0; let opIndexCount = 0;
    let trVertexCount = 0; let trIndexCount = 0;

    if (!forceRebuild && this.engine.renderer.assetManager.assetsPending <= 0) {
      try {
        const cached = await this.meshCache.get(cacheKey);
        if (cached && cached.hash === chunkHash) {
          return this.reconstructGeometries(cached);
        }
      } catch (e) {
        console.warn("[MeshCache] Read failed:", e);
      }
    }

    if (chunkMap && chunkMap.size > 0) {
      const dimX = 18; const dimY = 18; const dimZ = 18;

      const volume = new Array(dimX * dimY * dimZ).fill(null);

      const getIndex = (x, y, z) => {
        return (x + 1) + ((y + 1) * dimX) + ((z + 1) * dimX * dimY);
      };

      const mapManager = this.engine.mapManager;
      const startX = cx * 16;
      const startY = cy * 16;
      const startZ = cz * 16;

      for (let x = -1; x <= 16; x++) {
        for (let y = -1; y <= 16; y++) {
          for (let z = -1; z <= 16; z++) {
            const voxel = mapManager.getVoxelAt((startX + x) * 32, (startY + y) * 32, (startZ + z) * 32);
            if (voxel) {
              volume[getIndex(x, y, z)] = { tex: voxel.tex, color: voxel.color, shape: voxel.shape, dir: voxel.dir };
            }
          }
        }
      }

      const getPackedColor = (colorStr, tex) => {
          let blockColor = colorStr;
          if (!blockColor || typeof blockColor !== 'string' || !blockColor.startsWith('#') || blockColor.includes('NaN')) {
            if (tex === 'lava') blockColor = '#ff5d00';
            else if (tex === 'acid') blockColor = '#2ecc71';
            else blockColor = tex === 'grass' ? '#51852E' : '#ffffff';
          }
          const c = new THREE.Color(blockColor);
          const pr = Math.max(0, Math.min(255, c.r * 255)) | 0;
          const pg = Math.max(0, Math.min(255, c.g * 255)) | 0;
          const pb = Math.max(0, Math.min(255, c.b * 255)) | 0;
          return pr | (pg << 8) | (pb << 16);
      };

      const getPackedUV = (tex, shape, axis, dir) => {
        let furnId = '';
        if (shape) {
            for (const id in FURNITURE_REGISTRY) {
               if (shape.startsWith(id)) { furnId = id; break; }
            }
        }
        const furn = FURNITURE_REGISTRY[furnId];
        let blockType = (furn && furn.customTexture) ? furnId : (tex || 'grass');

        if (blockType === 'mud') blockType = 'mud1';
        else if (blockType === 'stone-bricks') blockType = 'stone-bricks1';

        const nameToId = {};
        for (const id in BlockRegistry) nameToId[BlockRegistry[id].name] = id;
        const blockId = nameToId[blockType];
        const voxelDef = blockId ? BlockRegistry[blockId] : null;

        const assetManager = this.engine.renderer.assetManager;
        let mainAtlasPos = assetManager.atlasMap[blockType] || assetManager.atlasMap['stone'];
        let sidesAtlasPos = mainAtlasPos;
        let bottomAtlasPos = mainAtlasPos;

        if (voxelDef && voxelDef.faces && blockType === tex) {
          mainAtlasPos = assetManager.atlasMap[voxelDef.name];
          sidesAtlasPos = assetManager.atlasMap[voxelDef.name + '_flow'] || mainAtlasPos;
          bottomAtlasPos = assetManager.atlasMap[voxelDef.name + '_bottom'] || mainAtlasPos;
        }

        let atlasPos = mainAtlasPos;
        if (axis === 2) atlasPos = dir > 0 ? mainAtlasPos : bottomAtlasPos;
        else atlasPos = sidesAtlasPos;

        if (!atlasPos) atlasPos = { x: 0, y: 1 }; // SAFEGUARD: Fallback to white pixel if texture is missing

        let subScale = 1.0;
        if (blockType === 'arcade-carpet') subScale = 0.5;

        const ux = Math.round(atlasPos.x * 8);
        const uy = Math.round(atlasPos.y * 8);
        let scaleLevel = subScale === 0.5 ? 1 : (subScale === 0.25 ? 2 : (subScale === 0.125 ? 3 : 0));
        const isFlipped = shape && shape.includes('_flip') ? 1 : 0;

        return (ux & 255) | ((uy & 255) << 8) | (scaleLevel << 16) | (isFlipped << 19);
      };

      const getLocalVoxel = (lx, ly, lz) => {
        if (lx < -1 || lx > 16 || ly < -1 || ly > 16 || lz < -1 || lz > 16) return null;
        return volume[getIndex(lx, ly, lz)];
      };

      const isTrans = (v) => {
        if (!v) return false;
        if (['water', 'water_flow', 'lava', 'lava_flow', 'acid', 'light_block'].includes(v.tex)) return true;
        if (v.tex && (v.tex.startsWith('glass') || v.tex.startsWith('clear_stained'))) return true;
        if (v.shape) {
            const cleanShape = v.shape.replace('_open', '');
            if (FURNITURE_REGISTRY[cleanShape] && FURNITURE_REGISTRY[cleanShape].transparent) return true;
        }
        return false;
      };

      if (this.useWorkers && this.workerPool.length > 0) {
          const atlasMap = this.engine.renderer.assetManager.atlasMap;
          const workerIndex = (Math.abs(cx || 0) + Math.abs(cy || 0)) % this.workerPool.length;
          const worker = this.workerPool[workerIndex];

          const jobId = Date.now() + Math.random();
          let transferBuffers = await this.getTransferBuffer();

          try {
              const workerResult = await new Promise((resolve, reject) => {
                  this.callbacks.set(jobId, { resolve, reject });
                  const transferList = [
                      transferBuffers.opPositions.buffer, transferBuffers.opNormals.buffer, transferBuffers.opUvs.buffer,
                      transferBuffers.opPackedUVs.buffer, transferBuffers.opPackedColors.buffer, transferBuffers.opPackedData.buffer, transferBuffers.opIndices.buffer,
                      transferBuffers.trPositions.buffer, transferBuffers.trNormals.buffer, transferBuffers.trUvs.buffer,
                      transferBuffers.trPackedUVs.buffer, transferBuffers.trPackedColors.buffer, transferBuffers.trPackedData.buffer, transferBuffers.trIndices.buffer
                  ];
                  try {
                      worker.postMessage({ jobId, cx, cy, cz, volume, atlasMap, buffers: transferBuffers }, transferList);
                  } catch (e) {
                      this.callbacks.delete(jobId);
                      reject(e);
                  }
              });

              const { opVertexCount: wOpVc, opIndexCount: wOpIc, trVertexCount: wTrVc, trIndexCount: wTrIc, buffers: retBuffers } = workerResult;

              if (wOpVc > 0) {
                  opVertexCount = wOpVc;
                  opIndexCount = wOpIc;
                  this.positions.set(retBuffers.opPositions.subarray(0, wOpVc * 3), 0);
                  this.normals.set(retBuffers.opNormals.subarray(0, wOpVc * 3), 0);
                  this.uvs.set(retBuffers.opUvs.subarray(0, wOpVc * 2), 0);
                  this.packedUVs.set(retBuffers.opPackedUVs.subarray(0, wOpVc), 0);
                  this.packedColors.set(retBuffers.opPackedColors.subarray(0, wOpVc), 0);
                  this.packedData.set(retBuffers.opPackedData.subarray(0, wOpVc), 0);
                  this.indices.set(retBuffers.opIndices.subarray(0, wOpIc), 0);
              }
              if (wTrVc > 0) {
                  trVertexCount = wTrVc;
                  trIndexCount = wTrIc;
                  this.t_positions.set(retBuffers.trPositions.subarray(0, wTrVc * 3), 0);
                  this.t_normals.set(retBuffers.trNormals.subarray(0, wTrVc * 3), 0);
                  this.t_uvs.set(retBuffers.trUvs.subarray(0, wTrVc * 2), 0);
                  this.t_packedUVs.set(retBuffers.trPackedUVs.subarray(0, wTrVc), 0);
                  this.t_packedColors.set(retBuffers.trPackedColors.subarray(0, wTrVc), 0);
                  this.t_packedData.set(retBuffers.trPackedData.subarray(0, wTrVc), 0);
                  this.t_indices.set(retBuffers.trIndices.subarray(0, wTrIc), 0);
              }

              this.releaseTransferBuffer(retBuffers);
          } catch (e) {
              console.error("[ChunkMesher] Worker promise rejected:", e);
              this.releaseTransferBuffer(this.createTransferBuffers());
          }
      } else {
          const isFaceVisible = (v1, v2) => {
             if (!v1) return false;
             if (v1.shape && v1.shape !== 'cube') return false; // Only greedy mesh cubes
             if (!v2) return true; // Face touches air

             const tex1 = v1.tex || '';
             const tex2 = v2.tex || '';

             const isFluid1 = ['water', 'water_flow', 'lava', 'lava_flow', 'acid'].includes(tex1);
             const isFluid2 = ['water', 'water_flow', 'lava', 'lava_flow', 'acid'].includes(tex2);
             if (isFluid1 && isFluid2) return false;

             if (tex1 === tex2 && (tex1.startsWith('glass') || tex1.startsWith('clear_stained'))) return false;

             const isV2SolidCube = (v2.shape || 'cube') === 'cube' &&
                                   !tex2.startsWith('glass') &&
                                   !tex2.startsWith('clear_stained') &&
                                   tex2 !== 'light_block' &&
                                   !isFluid2;

             return !isV2SolidCube;
          };

          const isTrans = (v) => {
            if (!v) return false;
            if (v.shape === 'decal' || v.shape === 'fence') return true;
            const tex = v.tex || '';
            if (['water', 'water_flow', 'lava', 'lava_flow', 'acid', 'light_block'].includes(tex)) return true;
            if (tex.startsWith('glass') || tex.startsWith('clear_stained')) return true;
            if (v.shape) {
                const cleanShape = v.shape.replace('_open', '');
                if (FURNITURE_REGISTRY[cleanShape] && FURNITURE_REGISTRY[cleanShape].transparent) return true;
            }
            return false;
          };

          const isOpaque = (lx, ly, lz) => {
            const v = getLocalVoxel(lx, ly, lz);
            if (!v) return false;
            if ((v.shape || 'cube') !== 'cube') return false;
            const tex = v.tex || '';
            if (tex.startsWith('glass') || tex.startsWith('clear_stained')) return false;
            if (['water', 'water_flow', 'lava', 'lava_flow', 'acid', 'light_block'].includes(tex)) return false;
            return true;
          };

          const vertexAO = (s1, s2, c) => {
            if (s1 && s2) return 0;
            return 3 - (s1 + s2 + c);
          };

          const getAOValues = (pos, axis, dir, u, v) => {
            const p = [...pos];
            p[axis] += dir;

            const check = (du, dv) => {
                const cp = [...p];
                cp[u] += du; cp[v] += dv;
                return isOpaque(cp[0], cp[1], cp[2]) ? 1 : 0;
            };

            const ao0 = vertexAO(check(-1, 0), check(0, -1), check(-1, -1));
            const ao1 = vertexAO(check(1, 0), check(0, -1), check(1, -1));
            const ao2 = vertexAO(check(1, 0), check(0, 1), check(1, 1));
            const ao3 = vertexAO(check(-1, 0), check(0, 1), check(-1, 1));

            return [ao0, ao1, ao2, ao3];
          };

          const canMerge = (v1, v2, ao1, ao2) => {
             if (!v1 || !v2) return false;
             return v1.tex === v2.tex && v1.color === v2.color && v1.shape === v2.shape && ao1 === ao2;
          };

          const emitQuad = (axis, dir, u, v, k, j, i, w, h, voxel, aoVals) => {
            const base = [0, 0, 0];
            base[axis] = i + (dir > 0 ? 1 : 0);
            base[u] = k;
            base[v] = j;

            const p0 = [...base];
            const p1 = [...base]; p1[u] += w;
            const p2 = [...base]; p2[u] += w; p2[v] += h;
            const p3 = [...base]; p3[v] += h;

            const toWorld = (p) => [(p[0] * 32) - 16, (p[1] * 32) - 16, (p[2] * 32) - 16];

            const wp0 = toWorld(p0);
            const wp1 = toWorld(p1);
            const wp2 = toWorld(p2);
            const wp3 = toWorld(p3);

            const norm = [0, 0, 0];
            norm[axis] = dir;

            const vecSub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
            const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
            const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

            const cp = cross(vecSub(wp1, wp0), vecSub(wp3, wp0));
            const isCCW = dot(cp, norm) > 0;

            const tr = isTrans(voxel);

            if (tr) {
                if (trVertexCount + 4 > this.MAX_VERTICES) return;
            } else {
                if (opVertexCount + 4 > this.MAX_VERTICES) return;
            }

            const pColor = getPackedColor(voxel.color, voxel.tex);
            const pUv = getPackedUV(voxel.tex, voxel.shape, axis, dir);

            let fluidType = 0.0;
            if (voxel.tex === 'water' || voxel.tex === 'water_flow') fluidType = 1.0;
            else if (voxel.tex === 'lava' || voxel.tex === 'lava_flow') fluidType = 2.0;
            else if (voxel.tex === 'acid') fluidType = 3.0;
            else if (voxel.tex && voxel.tex.startsWith('block-lamp-on')) fluidType = 4.0;
            else if (voxel.shape && voxel.shape.startsWith('arcade-box')) fluidType = 5.0;

            const addVertex = (pos, u, v, ao) => {
                const pData = ((fluidType & 7) << 6) | (ao & 3);
                if (tr) {
                    const idx3 = trVertexCount * 3;
                    const idx2 = trVertexCount * 2;
                    this.t_positions[idx3] = pos[0]; this.t_positions[idx3 + 1] = pos[1]; this.t_positions[idx3 + 2] = pos[2];
                    this.t_normals[idx3] = norm[0];  this.t_normals[idx3 + 1] = norm[1];  this.t_normals[idx3 + 2] = norm[2];
                    this.t_uvs[idx2] = u;            this.t_uvs[idx2 + 1] = v;
                    this.t_packedColors[trVertexCount] = pColor;
                    this.t_packedUVs[trVertexCount] = pUv;
                    this.t_packedData[trVertexCount] = pData;
                    trVertexCount++;
                } else {
                    const idx3 = opVertexCount * 3;
                    const idx2 = opVertexCount * 2;
                    this.positions[idx3] = pos[0]; this.positions[idx3 + 1] = pos[1]; this.positions[idx3 + 2] = pos[2];
                    this.normals[idx3] = norm[0];  this.normals[idx3 + 1] = norm[1];  this.normals[idx3 + 2] = norm[2];
                    this.uvs[idx2] = u;            this.uvs[idx2 + 1] = v;
                    this.packedColors[opVertexCount] = pColor;
                    this.packedUVs[opVertexCount] = pUv;
                    this.packedData[opVertexCount] = pData;
                    opVertexCount++;
                }
            };

            const vBase = tr ? trVertexCount : opVertexCount;

            if (isCCW) {
              addVertex(wp0, 0, 0, aoVals[0]);
              addVertex(wp1, w, 0, aoVals[1]);
              addVertex(wp2, w, h, aoVals[2]);
              addVertex(wp3, 0, h, aoVals[3]);
            } else {
              addVertex(wp0, 0, 0, aoVals[0]);
              addVertex(wp3, 0, h, aoVals[3]);
              addVertex(wp2, w, h, aoVals[2]);
              addVertex(wp1, w, 0, aoVals[1]);
            }

            const pushIndices = (i0, i1, i2, i3, i4, i5) => {
                if (tr) {
                    this.t_indices[trIndexCount++] = i0;
                    this.t_indices[trIndexCount++] = i1;
                    this.t_indices[trIndexCount++] = i2;
                    this.t_indices[trIndexCount++] = i3;
                    this.t_indices[trIndexCount++] = i4;
                    this.t_indices[trIndexCount++] = i5;
                } else {
                    this.indices[opIndexCount++] = i0;
                    this.indices[opIndexCount++] = i1;
                    this.indices[opIndexCount++] = i2;
                    this.indices[opIndexCount++] = i3;
                    this.indices[opIndexCount++] = i4;
                    this.indices[opIndexCount++] = i5;
                }
            };

            const flipAO = (aoVals[0] + aoVals[2]) < (aoVals[1] + aoVals[3]);
            if (flipAO) {
                pushIndices(vBase + 1, vBase + 2, vBase + 3, vBase + 1, vBase + 3, vBase + 0);
            } else {
                pushIndices(vBase, vBase + 1, vBase + 2, vBase, vBase + 2, vBase + 3);
            }
          };

          const axes = [
            { axis: 2, dir: 1, u: 0, v: 1 },  // Top (+Z)
            { axis: 2, dir: -1, u: 0, v: 1 }, // Bottom (-Z)
            { axis: 1, dir: 1, u: 0, v: 2 },  // South (+Y)
            { axis: 1, dir: -1, u: 0, v: 2 }, // North (-Y)
            { axis: 0, dir: 1, u: 1, v: 2 },  // East (+X)
            { axis: 0, dir: -1, u: 1, v: 2 }  // West (-X)
          ];

          for (const { axis, dir, u, v } of axes) {
            for (let i = 0; i < 16; i++) {
              const worldI = i;
              const visited = new Uint8Array(16 * 16);

              for (let j = 0; j < 16; j++) {
                for (let k = 0; k < 16; k++) {
                  if (visited[j * 16 + k]) continue;

                  const pos = [0, 0, 0];
                  pos[axis] = worldI;
                  pos[u] = k;
                  pos[v] = j;

                  const v1 = getLocalVoxel(pos[0], pos[1], pos[2]);
                  const pos2 = [...pos];
                  pos2[axis] += dir;
                  const v2 = getLocalVoxel(pos2[0], pos2[1], pos2[2]);

                  if (!isFaceVisible(v1, v2)) continue;

                  const aoVals = getAOValues(pos, axis, dir, u, v);
                  const aoHash = aoVals[0] | (aoVals[1] << 2) | (aoVals[2] << 4) | (aoVals[3] << 6);

                  let w = 1;
                  let h = 1;

                  while (k + w < 16 && !visited[j * 16 + (k + w)]) {
                    const nextPos = [...pos];
                    nextPos[u] += w;
                    const nextV1 = getLocalVoxel(nextPos[0], nextPos[1], nextPos[2]);
                    const nextPos2 = [...nextPos];
                    nextPos2[axis] += dir;
                    const nextV2 = getLocalVoxel(nextPos2[0], nextPos2[1], nextPos2[2]);

                    if (isFaceVisible(nextV1, nextV2)) {
                       const nextAO = getAOValues(nextPos, axis, dir, u, v);
                       const nextAOHash = nextAO[0] | (nextAO[1] << 2) | (nextAO[2] << 4) | (nextAO[3] << 6);
                       if (canMerge(v1, nextV1, aoHash, nextAOHash)) {
                           w++;
                           continue;
                       }
                    }
                    break;
                  }

                  let canExpandHeight = true;
                  while (j + h < 16 && canExpandHeight) {
                    for (let stepW = 0; stepW < w; stepW++) {
                      if (visited[(j + h) * 16 + (k + stepW)]) {
                        canExpandHeight = false;
                        break;
                      }
                      const nextPos = [...pos];
                      nextPos[u] += stepW;
                      nextPos[v] += h;
                      const nextV1 = getLocalVoxel(nextPos[0], nextPos[1], nextPos[2]);
                      const nextPos2 = [...nextPos];
                      nextPos2[axis] += dir;
                      const nextV2 = getLocalVoxel(nextPos2[0], nextPos2[1], nextPos2[2]);

                      if (!isFaceVisible(nextV1, nextV2)) {
                        canExpandHeight = false;
                        break;
                      }

                      const nextAO = getAOValues(nextPos, axis, dir, u, v);
                      const nextAOHash = nextAO[0] | (nextAO[1] << 2) | (nextAO[2] << 4) | (nextAO[3] << 6);
                      if (!canMerge(v1, nextV1, aoHash, nextAOHash)) {
                        canExpandHeight = false;
                        break;
                      }
                    }
                    if (canExpandHeight) h++;
                  }

                  for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                      visited[(j + y) * 16 + (k + x)] = 1;
                    }
                  }

                  emitQuad(axis, dir, u, v, pos[u], pos[v], worldI, w, h, v1, aoVals);
                }
              }
            }
          }
      } // End of Web Worker vs Local processing

      const renderer = this.engine.renderer;
      const getRotated = (x, y, z, rot) => {
        if (rot === 0) return [x, y, z];
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        return [x * cos - y * sin, x * sin + y * cos, z];
      };

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          for (let z = 0; z < 16; z++) {
            const voxel = getLocalVoxel(x, y, z);
            if (!voxel || !voxel.shape || voxel.shape === 'cube') continue;

            const shape = voxel.shape;
            if (shape.includes('door')) continue;
            let geo = null;
            let rot = 0;

            if (shape === 'slab') geo = renderer.blockGeometries.slab;
            else if (shape.startsWith('ramp')) {
              geo = renderer.blockGeometries.ramp;
              if (shape === 'ramp_e') rot = -Math.PI / 2;
              else if (shape === 'ramp_n') rot = Math.PI;
              else if (shape === 'ramp_w') rot = Math.PI / 2;
            } else if (shape.startsWith('stair')) {
              geo = renderer.blockGeometries.stair;
              if (shape === 'stair_e') rot = -Math.PI / 2;
              else if (shape === 'stair_n') rot = Math.PI;
              else if (shape === 'stair_w') rot = Math.PI / 2;
            } else if (shape === 'decor') {
              geo = renderer.blockGeometries.decor;
            } else if (shape === 'decal') {
              geo = renderer.blockGeometries.decal;
              if (voxel.dir === 'e') rot = -Math.PI / 2;
              else if (voxel.dir === 'n') rot = Math.PI;
              else if (voxel.dir === 'w') rot = Math.PI / 2;
            } else if (shape === 'fence') {
              const checkConn = (dx, dy) => {
                  const adj = getLocalVoxel(x + dx, y + dy, z);
                  if (!adj) return false;
                  if (adj.shape === 'fence') return true;
                  if ((adj.shape || 'cube') === 'cube') return !isTrans(adj);
                  return false;
              };
              const connectN = checkConn(0, -1); const connectS = checkConn(0, 1);
              const connectE = checkConn(1, 0);  const connectW = checkConn(-1, 0);
              const mask = (connectN ? 1 : 0) | (connectS ? 2 : 0) | (connectE ? 4 : 0) | (connectW ? 8 : 0);
              geo = renderer.blockGeometries.fence[mask];
            } else if (renderer.assetManager.modelMeshes && renderer.assetManager.modelMeshes[shape.replace('_open', '')]) {
              const baseShape = shape.replace('_open', '');
              geo = renderer.assetManager.modelMeshes[baseShape].geometry;
              if (voxel.dir === 'e') rot = -Math.PI / 2;
              else if (voxel.dir === 'n') rot = Math.PI;
              else if (voxel.dir === 'w') rot = Math.PI / 2;
              if (shape.includes('_open')) rot += shape.includes('_flip') ? -Math.PI / 2 : Math.PI / 2;
            }

            if (!geo) continue;

            const posAttr = geo.attributes.position.array;
            const normAttr = geo.attributes.normal.array;
            const uvAttr = geo.attributes.uv.array;
            const idxAttr = geo.index ? geo.index.array : null;

            let activeIndices = [];
            if (idxAttr) {
                let cullMap = { '1,0,0': false, '-1,0,0': false, '0,1,0': false, '0,-1,0': false, '0,0,1': false, '0,0,-1': false };

                if (shape === 'slab') {
                    const checkCull = (dx, dy, dz) => {
                        if (dz === 1) return false;
                        const adjVoxel = getLocalVoxel(x + dx, y + dy, z + dz);
                        if (!adjVoxel) return false;

                        const adjShape = adjVoxel.shape || 'cube';
                        let physicallyTouches = false;
                        if (dz === -1 && adjShape === 'cube') physicallyTouches = true;
                        else if (dz === 0 && (adjShape === 'cube' || adjShape === 'slab')) physicallyTouches = true;

                        if (physicallyTouches) {
                            const tex1 = voxel.tex || '';
                            const tex2 = adjVoxel.tex || '';
                            const isFluid1 = ['water', 'water_flow', 'lava', 'lava_flow', 'acid'].includes(tex1);
                            const isFluid2 = ['water', 'water_flow', 'lava', 'lava_flow', 'acid'].includes(tex2);
                            if (isFluid1 && isFluid2) return true;
                            if (tex1 === tex2 && (tex1.startsWith('glass') || tex1.startsWith('clear_stained'))) return true;
                            const isTrans2 = isFluid2 || tex2.startsWith('glass') || tex2.startsWith('clear_stained') || tex2 === 'light_block';
                            if (!isTrans2) return true;
                        }
                        return false;
                    };

                    const dirs = [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]];
                    for (const [nx, ny, nz] of dirs) {
                        let wnx = nx, wny = ny, wnz = nz;
                        if (rot !== 0) {
                            const rNorm = getRotated(nx, ny, nz, rot);
                            wnx = Math.round(rNorm[0]); wny = Math.round(rNorm[1]); wnz = Math.round(rNorm[2]);
                        }
                        cullMap[`${nx},${ny},${nz}`] = checkCull(wnx, wny, wnz);
                    }
                }

                for (let i = 0; i < idxAttr.length; i += 3) {
                    const i0 = idxAttr[i];
                    const nx = Math.round(normAttr[i0 * 3]); const ny = Math.round(normAttr[i0 * 3 + 1]); const nz = Math.round(normAttr[i0 * 3 + 2]);
                    if (!cullMap[`${nx},${ny},${nz}`]) activeIndices.push(i0, idxAttr[i+1], idxAttr[i+2]);
                }
            }

            const vCount = posAttr.length / 3;
            const incomingIndices = idxAttr ? activeIndices.length : vCount;

            const useMeshUVArray = geo.attributes.useMeshUV ? geo.attributes.useMeshUV.array : null;
            let useMeshUV = useMeshUVArray ? useMeshUVArray[0] > 0.5 : false;
            if (voxel.useMeshUV !== undefined) useMeshUV = voxel.useMeshUV;

            const tr = isTrans(voxel);
            if (tr) {
                if (trVertexCount + vCount > this.MAX_VERTICES || trIndexCount + incomingIndices > this.t_indices.length) continue;
            } else {
                if (opVertexCount + vCount > this.MAX_VERTICES || opIndexCount + incomingIndices > this.indices.length) continue;
            }

            const pColor = getPackedColor(voxel.color, voxel.tex);
            let fluidType = 0.0;
            if (voxel.tex === 'water' || voxel.tex === 'water_flow') fluidType = 1.0;
            else if (voxel.tex === 'lava' || voxel.tex === 'lava_flow') fluidType = 2.0;
            else if (voxel.tex === 'acid') fluidType = 3.0;
            else if (voxel.tex && voxel.tex.startsWith('block-lamp-on')) fluidType = 4.0;
            else if (voxel.shape && voxel.shape.startsWith('arcade-box')) fluidType = 5.0;
            const pData = ((fluidType & 7) << 6) | 3;

            const vBase = tr ? trVertexCount : opVertexCount;
            const worldOffsetX = x * 32;
            const worldOffsetY = y * 32;
            const worldOffsetZ = z * 32;

            for (let i = 0; i < vCount; i++) {
              const ix = i * 3; const iu = i * 2;
              let vx = posAttr[ix], vy = posAttr[ix+1], vz = posAttr[ix+2];
              let nx = normAttr[ix], ny = normAttr[ix+1], nz = normAttr[ix+2];

              if (rot !== 0) {
                const rPos = getRotated(vx, vy, vz, rot);
                vx = rPos[0]; vy = rPos[1]; vz = rPos[2];
                const rNorm = getRotated(nx, ny, nz, rot);
                nx = rNorm[0]; ny = rNorm[1]; nz = rNorm[2];
              }

              let faceAxis = 1; let faceDir = 1;
              if (nz > 0.5) { faceAxis = 2; faceDir = 1; }
              else if (nz < -0.5) { faceAxis = 2; faceDir = -1; }
              else if (Math.abs(nx) > Math.abs(ny)) { faceAxis = 0; faceDir = nx > 0 ? 1 : -1; }
              else { faceAxis = 1; faceDir = ny > 0 ? 1 : -1; }

              let finalU = uvAttr[iu];
              let finalV = uvAttr[iu+1];

              if (!useMeshUV) {
                  if (Math.abs(nz) > 0.5) {
                      finalU = vx / 32.0;
                      finalV = -vy / 32.0;
                  } else if (Math.abs(nx) > 0.5) {
                      finalU = nx > 0.0 ? -vy / 32.0 : vy / 32.0;
                      finalV = -vz / 32.0;
                  } else {
                      finalU = ny > 0.0 ? vx / 32.0 : -vx / 32.0;
                      finalV = -vz / 32.0;
                  }
              }

              if (tr) {
                  this.t_positions[trVertexCount * 3] = vx + worldOffsetX;
                  this.t_positions[trVertexCount * 3 + 1] = vy + worldOffsetY;
                  this.t_positions[trVertexCount * 3 + 2] = vz + worldOffsetZ;
                  this.t_normals[trVertexCount * 3] = nx;
                  this.t_normals[trVertexCount * 3 + 1] = ny;
                  this.t_normals[trVertexCount * 3 + 2] = nz;
                  this.t_uvs[trVertexCount * 2] = finalU;
                  this.t_uvs[trVertexCount * 2 + 1] = finalV;
                  this.t_packedUVs[trVertexCount] = getPackedUV(voxel.tex, voxel.shape, faceAxis, faceDir);
                  this.t_packedColors[trVertexCount] = pColor;
                  this.t_packedData[trVertexCount] = pData;
                  trVertexCount++;
              } else {
                  this.positions[opVertexCount * 3] = vx + worldOffsetX;
                  this.positions[opVertexCount * 3 + 1] = vy + worldOffsetY;
                  this.positions[opVertexCount * 3 + 2] = vz + worldOffsetZ;
                  this.normals[opVertexCount * 3] = nx;
                  this.normals[opVertexCount * 3 + 1] = ny;
                  this.normals[opVertexCount * 3 + 2] = nz;
                  this.uvs[opVertexCount * 2] = finalU;
                  this.uvs[opVertexCount * 2 + 1] = finalV;
                  this.packedUVs[opVertexCount] = getPackedUV(voxel.tex, voxel.shape, faceAxis, faceDir);
                  this.packedColors[opVertexCount] = pColor;
                  this.packedData[opVertexCount] = pData;
                  opVertexCount++;
              }
            }

            if (idxAttr) {
              for (let i = 0; i < activeIndices.length; i++) {
                  if (tr) this.t_indices[trIndexCount++] = vBase + activeIndices[i];
                  else this.indices[opIndexCount++] = vBase + activeIndices[i];
              }
            } else {
              for (let i = 0; i < vCount; i++) {
                  if (tr) this.t_indices[trIndexCount++] = vBase + i;
                  else this.indices[opIndexCount++] = vBase + i;
              }
            }
          }
        }
      }
    }

    let opData = null;
    if (opVertexCount > 0) {
        opData = {
            positions: this.positions.slice(0, opVertexCount * 3),
            normals: this.normals.slice(0, opVertexCount * 3),
            uvs: this.uvs.slice(0, opVertexCount * 2),
            packedUVs: this.packedUVs.slice(0, opVertexCount),
            packedColors: this.packedColors.slice(0, opVertexCount),
            packedData: this.packedData.slice(0, opVertexCount),
            indices: this.indices.slice(0, opIndexCount)
        };
    }

    let trData = null;
    if (trVertexCount > 0) {
        trData = {
            positions: this.t_positions.slice(0, trVertexCount * 3),
            normals: this.t_normals.slice(0, trVertexCount * 3),
            uvs: this.t_uvs.slice(0, trVertexCount * 2),
            packedUVs: this.t_packedUVs.slice(0, trVertexCount),
            packedColors: this.t_packedColors.slice(0, trVertexCount),
            packedData: this.t_packedData.slice(0, trVertexCount),
            indices: this.t_indices.slice(0, trIndexCount)
        };
    }

    // Asynchronously save to cache without blocking the main thread
    if (this.engine.renderer.assetManager.assetsPending <= 0) {
        this.meshCache.put(cacheKey, { hash: chunkHash, opaque: opData, transparent: trData }).catch(e => console.warn("[MeshCache] Write failed:", e));
    }

    return this.reconstructGeometries({ opaque: opData, transparent: trData });
  }

  reconstructGeometries(cached) {
    const buildGeo = (data) => {
        if (!data) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
        geo.setAttribute('packedUV', new THREE.Uint32BufferAttribute(data.packedUVs, 1));
        geo.setAttribute('packedColor', new THREE.Uint32BufferAttribute(data.packedColors, 1));
        geo.setAttribute('packedData', new THREE.Uint32BufferAttribute(data.packedData, 1));
        geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
        return geo;
    };

    return {
        opaque: buildGeo(cached.opaque),
        transparent: buildGeo(cached.transparent)
    };
  }
}
