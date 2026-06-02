import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';

self.onmessage = function(e) {
 try {
  const { jobId, cx, cy, cz, volume, atlasMap, buffers } = e.data;
  const MAX_VERTICES = 120000;
  const dimX = 18;
  const dimY = 18;

  const {
    opPositions, opNormals, opUvs, opPackedUVs, opPackedColors, opPackedData, opIndices,
    trPositions, trNormals, trUvs, trPackedUVs, trPackedColors, trPackedData, trIndices
  } = buffers;

  let opVertexCount = 0; let opIndexCount = 0;
  let trVertexCount = 0; let trIndexCount = 0;

  const getIndex = (x, y, z) => {
    return (x + 1) + ((y + 1) * dimX) + ((z + 1) * dimX * dimY);
  };

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

    let mainAtlasPos = atlasMap[blockType] || atlasMap['stone'];
    let sidesAtlasPos = mainAtlasPos;
    let bottomAtlasPos = mainAtlasPos;

    if (voxelDef && voxelDef.faces && blockType === tex) {
      mainAtlasPos = atlasMap[voxelDef.name];
      sidesAtlasPos = atlasMap[voxelDef.name + '_flow'] || mainAtlasPos;
      bottomAtlasPos = atlasMap[voxelDef.name + '_bottom'] || mainAtlasPos;
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

  const isFaceVisible = (v1, v2) => {
     if (!v1) return false;
     if (v1.shape && v1.shape !== 'cube') return false;
     if (!v2) return true;

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
    return [
        vertexAO(check(-1, 0), check(0, -1), check(-1, -1)),
        vertexAO(check(1, 0), check(0, -1), check(1, -1)),
        vertexAO(check(1, 0), check(0, 1), check(1, 1)),
        vertexAO(check(-1, 0), check(0, 1), check(-1, 1))
    ];
  };

  const canMerge = (v1, v2, ao1, ao2) => {
     if (!v1 || !v2) return false;
     return v1.tex === v2.tex && v1.color === v2.color && v1.shape === v2.shape && ao1 === ao2;
  };

  const emitQuad = (axis, dir, u, v, k, j, i, w, h, voxel, aoVals) => {
    const base = [0, 0, 0];
    base[axis] = i + (dir > 0 ? 1 : 0); base[u] = k; base[v] = j;

    const p0 = [...base];
    const p1 = [...base]; p1[u] += w;
    const p2 = [...base]; p2[u] += w; p2[v] += h;
    const p3 = [...base]; p3[v] += h;

    const toWorld = (p) => [(p[0] * 32) - 16, (p[1] * 32) - 16, (p[2] * 32) - 16];
    const wp0 = toWorld(p0); const wp1 = toWorld(p1);
    const wp2 = toWorld(p2); const wp3 = toWorld(p3);

    const norm = [0, 0, 0]; norm[axis] = dir;
    const vecSub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
    const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
    const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

    const cp = cross(vecSub(wp1, wp0), vecSub(wp3, wp0));
    const isCCW = dot(cp, norm) > 0;

    const tr = isTrans(voxel);
    if (tr && trVertexCount + 4 > MAX_VERTICES) return;
    if (!tr && opVertexCount + 4 > MAX_VERTICES) return;

    const pColor = getPackedColor(voxel.color, voxel.tex);
    const pUv = getPackedUV(voxel.tex, voxel.shape, axis, dir);
    let fluidType = 0.0;
    if (voxel.tex === 'water' || voxel.tex === 'water_flow') fluidType = 1.0;
    else if (voxel.tex === 'lava' || voxel.tex === 'lava_flow') fluidType = 2.0;
    else if (voxel.tex === 'acid') fluidType = 3.0;
    else if (voxel.tex && voxel.tex.startsWith('block-lamp-on')) fluidType = 4.0;
    else if (voxel.shape && voxel.shape.startsWith('arcade-box')) fluidType = 5.0;

    const addVertex = (pos, ux, uy, ao) => {
        const pData = ((fluidType & 7) << 6) | (ao & 3);
        if (tr) {
            const idx3 = trVertexCount * 3; const idx2 = trVertexCount * 2;
            trPositions[idx3] = pos[0]; trPositions[idx3 + 1] = pos[1]; trPositions[idx3 + 2] = pos[2];
            trNormals[idx3] = norm[0];  trNormals[idx3 + 1] = norm[1];  trNormals[idx3 + 2] = norm[2];
            trUvs[idx2] = ux;           trUvs[idx2 + 1] = uy;
            trPackedColors[trVertexCount] = pColor; trPackedUVs[trVertexCount] = pUv; trPackedData[trVertexCount] = pData;
            trVertexCount++;
        } else {
            const idx3 = opVertexCount * 3; const idx2 = opVertexCount * 2;
            opPositions[idx3] = pos[0]; opPositions[idx3 + 1] = pos[1]; opPositions[idx3 + 2] = pos[2];
            opNormals[idx3] = norm[0];  opNormals[idx3 + 1] = norm[1];  opNormals[idx3 + 2] = norm[2];
            opUvs[idx2] = ux;           opUvs[idx2 + 1] = uy;
            opPackedColors[opVertexCount] = pColor; opPackedUVs[opVertexCount] = pUv; opPackedData[opVertexCount] = pData;
            opVertexCount++;
        }
    };

    const vBase = tr ? trVertexCount : opVertexCount;
    if (isCCW) {
      addVertex(wp0, 0, 0, aoVals[0]); addVertex(wp1, w, 0, aoVals[1]); addVertex(wp2, w, h, aoVals[2]); addVertex(wp3, 0, h, aoVals[3]);
    } else {
      addVertex(wp0, 0, 0, aoVals[0]); addVertex(wp3, 0, h, aoVals[3]); addVertex(wp2, w, h, aoVals[2]); addVertex(wp1, w, 0, aoVals[1]);
    }

    const pushIndices = (i0, i1, i2, i3, i4, i5) => {
        if (tr) { trIndices[trIndexCount++] = i0; trIndices[trIndexCount++] = i1; trIndices[trIndexCount++] = i2; trIndices[trIndexCount++] = i3; trIndices[trIndexCount++] = i4; trIndices[trIndexCount++] = i5; }
        else { opIndices[opIndexCount++] = i0; opIndices[opIndexCount++] = i1; opIndices[opIndexCount++] = i2; opIndices[opIndexCount++] = i3; opIndices[opIndexCount++] = i4; opIndices[opIndexCount++] = i5; }
    };

    const flipAO = (aoVals[0] + aoVals[2]) < (aoVals[1] + aoVals[3]);
    if (flipAO) pushIndices(vBase + 1, vBase + 2, vBase + 3, vBase + 1, vBase + 3, vBase + 0);
    else pushIndices(vBase, vBase + 1, vBase + 2, vBase, vBase + 2, vBase + 3);
  };

  const axes = [{ axis: 2, dir: 1, u: 0, v: 1 }, { axis: 2, dir: -1, u: 0, v: 1 }, { axis: 1, dir: 1, u: 0, v: 2 }, { axis: 1, dir: -1, u: 0, v: 2 }, { axis: 0, dir: 1, u: 1, v: 2 }, { axis: 0, dir: -1, u: 1, v: 2 }];

  for (const { axis, dir, u, v } of axes) {
    for (let i = 0; i < 16; i++) {
      const worldI = i;
      const visited = new Uint8Array(16 * 16);

      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          if (visited[j * 16 + k]) continue;
          const pos = [0, 0, 0]; pos[axis] = worldI; pos[u] = k; pos[v] = j;

          const v1 = getLocalVoxel(pos[0], pos[1], pos[2]);
          const pos2 = [...pos]; pos2[axis] += dir;
          const v2 = getLocalVoxel(pos2[0], pos2[1], pos2[2]);

          if (!isFaceVisible(v1, v2)) continue;
          const aoVals = getAOValues(pos, axis, dir, u, v);
          const aoHash = aoVals[0] | (aoVals[1] << 2) | (aoVals[2] << 4) | (aoVals[3] << 6);

          let w = 1; let h = 1;
          while (k + w < 16 && !visited[j * 16 + (k + w)]) {
            const nextPos = [...pos]; nextPos[u] += w;
            const nextV1 = getLocalVoxel(nextPos[0], nextPos[1], nextPos[2]);
            const nextPos2 = [...nextPos]; nextPos2[axis] += dir;
            const nextV2 = getLocalVoxel(nextPos2[0], nextPos2[1], nextPos2[2]);

            if (isFaceVisible(nextV1, nextV2)) {
               const nextAO = getAOValues(nextPos, axis, dir, u, v);
               const nextAOHash = nextAO[0] | (nextAO[1] << 2) | (nextAO[2] << 4) | (nextAO[3] << 6);
               if (canMerge(v1, nextV1, aoHash, nextAOHash)) { w++; continue; }
            }
            break;
          }

          let canExpandHeight = true;
          while (j + h < 16 && canExpandHeight) {
            for (let stepW = 0; stepW < w; stepW++) {
              if (visited[(j + h) * 16 + (k + stepW)]) { canExpandHeight = false; break; }
              const nextPos = [...pos]; nextPos[u] += stepW; nextPos[v] += h;
              const nextV1 = getLocalVoxel(nextPos[0], nextPos[1], nextPos[2]);
              const nextPos2 = [...nextPos]; nextPos2[axis] += dir;
              const nextV2 = getLocalVoxel(nextPos2[0], nextPos2[1], nextPos2[2]);

              if (!isFaceVisible(nextV1, nextV2)) { canExpandHeight = false; break; }
              const nextAO = getAOValues(nextPos, axis, dir, u, v);
              const nextAOHash = nextAO[0] | (nextAO[1] << 2) | (nextAO[2] << 4) | (nextAO[3] << 6);
              if (!canMerge(v1, nextV1, aoHash, nextAOHash)) { canExpandHeight = false; break; }
            }
            if (canExpandHeight) h++;
          }

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) { visited[(j + y) * 16 + (k + x)] = 1; }
          }
          emitQuad(axis, dir, u, v, pos[u], pos[v], worldI, w, h, v1, aoVals);
        }
      }
    }
  }

  // Prepare Transferable Objects via slice (which copies memory natively to a fresh ArrayBuffer)

  const transferables = [
    opPositions.buffer, opNormals.buffer, opUvs.buffer,
    opPackedUVs.buffer, opPackedColors.buffer, opPackedData.buffer, opIndices.buffer,
    trPositions.buffer, trNormals.buffer, trUvs.buffer,
    trPackedUVs.buffer, trPackedColors.buffer, trPackedData.buffer, trIndices.buffer
  ];

  // Send the data back to the main thread instantly!
  self.postMessage({
    jobId, cx, cy, cz,
    opVertexCount, opIndexCount,
    trVertexCount, trIndexCount,
    buffers
  }, transferables);
 } catch (err) {
   self.postMessage({ error: err.message, jobId: e.data ? e.data.jobId : null });
 }
};
