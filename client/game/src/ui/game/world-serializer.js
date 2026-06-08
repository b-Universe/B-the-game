export class WorldSerializer {
  constructor(engine) {
    this.engine = engine;
  }

  serialize() {
    const flatWorld = {};
    for (const chunk of this.engine.mapManager.chunks.values()) {
      if (chunk.isModified) {
        for (const [key, voxel] of chunk.entries()) {
          flatWorld[key] = voxel;
        }
      }
    }
    return flatWorld;
  }

  async save(filename = this.engine.currentZone || 'untitled') {
    const data = this.serialize();
    try {
      await fetch(`/api/world/save?file=${filename}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error("Error saving world:", e);
    }
  }

  async load(filename = this.engine.currentZone || 'untitled') {
    try {
      const res = await fetch(`/api/world/load?file=${filename}&v=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        await this.deserialize(data);

        const payload = { data: data, filename: filename };
        if (this.engine.network) this.engine.network.socket.emit('dev_load_world', payload);
      } else {
        await this.deserialize({});
        const payload = { data: {}, filename: filename };
        if (this.engine.network) this.engine.network.socket.emit('dev_load_world', payload);
      }
    } catch (e) {
      console.error("Error loading world:", e);
    }
  }

  async deserialize(payload) {
    this.engine.mapManager.chunks.clear();
    this.engine.mapManager.generatedChunks.clear();
    this.engine.mapManager.chunkQueue.clear();

    if (this.engine.mapManager.mapCacheCtx) {
      this.engine.mapManager.mapCacheCtx.clearRect(0, 0, this.engine.mapManager.mapWidth, this.engine.mapManager.mapHeight);
    }

    if (this.engine.renderer) {
      this.engine.renderer.initialLoadComplete = false;

      for (const key of this.engine.renderer.chunkMeshes.keys()) {
        const mesh = this.engine.renderer.chunkMeshes.get(key);
        this.engine.renderer.scene.remove(mesh);
        mesh.geometry.dispose();
      }
      this.engine.renderer.chunkMeshes.clear();
      for (const key of this.engine.renderer.chunkTransparentMeshes.keys()) {
        const mesh = this.engine.renderer.chunkTransparentMeshes.get(key);
        this.engine.renderer.scene.remove(mesh);
        mesh.geometry.dispose();
      }
      this.engine.renderer.chunkTransparentMeshes.clear();
    }

    let voxelCount = 0;
    const processVoxel = (key, voxel) => {
      if (voxel === undefined) return;

      const parts = key.split('_');
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      const cx = Math.floor(x / 16);
      const cy = Math.floor(y / 16);
      const chunkKey = `${cx}_${cy}`;

      let chunk = this.engine.mapManager.chunks.get(chunkKey);
      if (!chunk) {
          chunk = new Map();
          chunk.isModified = true;
          this.engine.mapManager.chunks.set(chunkKey, chunk);
      }
      chunk.set(key, voxel);
      voxelCount++;
    };

    const data = payload.data ? payload.data : payload;

    if (payload.compressed) {
      for (const valStr in data) {
        const voxel = JSON.parse(valStr);
        data[valStr].forEach(key => processVoxel(key, voxel));
      }
    } else if (Array.isArray(data)) {
      data.forEach(entry => processVoxel(entry[0], entry[1]));
    } else {
      for (const key in data) {
        processVoxel(key, data[key]);
      }
    }

    console.log(`[WorldSerializer] Switched zone to ${this.engine.currentZone}. Loaded ${voxelCount} voxels.`);

    if (this.engine.renderer) {
      for (const [chunkKey, chunkMap] of this.engine.mapManager.chunks.entries()) {
        const parts = chunkKey.split('_');
        this.engine.mapManager.updateChunkMinimap(parseInt(parts[0], 10), parseInt(parts[1], 10), chunkMap);
      }
      this.engine.renderer.needsVoxelUpdate = true;
    }
    this.engine.mapManager.mapCacheDirty = true;
  }
}
