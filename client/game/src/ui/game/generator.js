export class TerrainGenerator {
  constructor(engine) {
    this.engine = engine;
  }

  hash(x, y) {
    let val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return val - Math.floor(val);
  }

  smoothNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);

    const n00 = this.hash(ix, iy);
    const n10 = this.hash(ix + 1, iy);
    const n01 = this.hash(ix, iy + 1);
    const n11 = this.hash(ix + 1, iy + 1);

    const nx0 = n00 * (1.0 - ux) + n10 * ux;
    const nx1 = n01 * (1.0 - ux) + n11 * ux;

    return nx0 * (1.0 - uy) + nx1 * uy;
  }

  fractalNoise(x, y, octaves) {
    let val = 0;
    let amp = 1.0;
    let freq = 1.0;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      val += this.smoothNoise(x * freq, y * freq) * amp;
      max += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return val / max;
  }

  getElevation(wx, wy) {
    const noiseVal = this.fractalNoise(wx * 0.05, wy * 0.05, 4);
    let elevation = Math.floor(noiseVal * 3);
    return isNaN(elevation) ? 0 : elevation;
  }

  generateChunk(cx, cy, chunkSize, voxels = new Map()) {
    const currentZone = (this.engine.currentZone || 'untitled').toLowerCase();
    if (currentZone === 'atlas-city') {
      for (let x = 0; x < chunkSize; x++) {
        for (let y = 0; y < chunkSize; y++) {
          const worldX = (cx * chunkSize) + x;
          const worldY = (cy * chunkSize) + y;
          for (let vz = -3; vz <= 0; vz++) {
            const voxelKey = `${worldX}_${worldY}_${vz}`;
            if (!voxels.has(voxelKey)) {
              voxels.set(voxelKey, {
                tex: vz === 0 ? 'concrete' : 'stone',
                color: '#ffffff',
                shape: 'cube'
              });
            }
          }
        }
      }
      return voxels;
    }

    // 1. Precompute noise and elevation data to avoid massive redundant recalculations.
    // A standard chunk would otherwise calculate noise 5 times per tile (self + 4 neighbors).
    const stride = chunkSize + 2;
    if (!this.elevCache || this.elevCache.length < stride * stride) {
      this.elevCache = new Int8Array(stride * stride);
      this.noiseCache = new Float32Array(stride * stride);
      this.dirtCache = new Float32Array(chunkSize * chunkSize);
    }

    const elevCache = this.elevCache;
    const noiseCache = this.noiseCache;
    const dirtCache = this.dirtCache;

    for (let y = -1; y <= chunkSize; y++) {
      for (let x = -1; x <= chunkSize; x++) {
        const worldX = (cx * chunkSize) + x;
        const worldY = (cy * chunkSize) + y;

        const noiseVal = this.fractalNoise(worldX * 0.05, worldY * 0.05, 4);
        let elevation = Math.floor(noiseVal * 3);
        if (isNaN(elevation)) elevation = 0;

        const idx = (y + 1) * stride + (x + 1);
        elevCache[idx] = elevation;
        noiseCache[idx] = noiseVal;

        // Dirt noise is only needed for the actual chunk bounds, not the borders
        if (x >= 0 && x < chunkSize && y >= 0 && y < chunkSize) {
          dirtCache[y * chunkSize + x] = this.fractalNoise(worldX * 0.08, worldY * 0.08, 2);
        }
      }
    }

    // 2. Build the voxels using the cached arrays
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        const cacheIdx = (y + 1) * stride + (x + 1);
        const elevation = elevCache[cacheIdx];
        const noiseVal = noiseCache[cacheIdx];
        const worldX = (cx * chunkSize) + x;
        const worldY = (cy * chunkSize) + y;

        const shift = Math.floor((noiseVal - 0.5) * 30);
        const r = Math.max(0, Math.min(255, 81 + shift));
        const g = Math.max(0, Math.min(255, 133 + shift));
        const b = Math.max(0, Math.min(255, 46 + shift));
        let colorHex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        if (colorHex.includes('NaN')) colorHex = '#51852E';

        const innerIdx = y * chunkSize + x;
        const isDirt = dirtCache[innerIdx] > 0.65;
        const surfaceTex = isDirt ? 'dirt' : 'grass';
        const surfaceColor = isDirt ? '#ffffff' : colorHex;

        for (let vz = -3; vz <= elevation; vz++) {
          const voxelKey = `${worldX}_${worldY}_${vz}`;
          let tex = 'stone';
          let color = '#ffffff';

          if (vz === elevation) {
            tex = surfaceTex;
            color = surfaceColor;
          }

          if (!voxels.has(voxelKey)) {
            voxels.set(voxelKey, {
              tex: tex,
              color: color,
              shape: 'cube'
            });
          }
        }

        // Check cached neighbors for ramp placement instead of recalculating noise
        const elevN = elevCache[y * stride + (x + 1)];       // y - 1
        const elevS = elevCache[(y + 2) * stride + (x + 1)]; // y + 1
        const elevE = elevCache[(y + 1) * stride + (x + 2)]; // x + 1
        const elevW = elevCache[(y + 1) * stride + x];       // x - 1

        let rampShape = null;
        if (elevN === elevation + 1) rampShape = 'ramp_n';
        else if (elevS === elevation + 1) rampShape = 'ramp_s';
        else if (elevE === elevation + 1) rampShape = 'ramp_e';
        else if (elevW === elevation + 1) rampShape = 'ramp_w';

        if (rampShape) {
           const rampKey = `${worldX}_${worldY}_${elevation + 1}`;
           if (!voxels.has(rampKey)) {
             voxels.set(rampKey, {
               tex: surfaceTex,
               color: surfaceColor,
               shape: rampShape
             });
           }
        }
      }
    }

    return voxels;
  }
}
