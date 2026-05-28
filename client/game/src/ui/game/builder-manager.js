export class BuilderManager {
  constructor(engine) {
    this.engine = engine;
  }

  undo() {
    const eng = this.engine;
    if (eng.history && eng.history.length > 0) {
      const lastAction = eng.history.pop();
      const redoAction = [];
      const updates = [];
      lastAction.forEach(u => {
        const currentVoxel = eng.mapManager.getVoxelAt(u.worldX, u.worldY, u.worldZ);
        redoAction.push({ worldX: u.worldX, worldY: u.worldY, worldZ: u.worldZ, voxelData: currentVoxel ? { ...currentVoxel } : null });
        eng.mapManager.setVoxelAt(u.worldX, u.worldY, u.worldZ, u.voxelData, false);
        updates.push(u);
      });
      eng.redoHistory = eng.redoHistory || [];
      eng.redoHistory.push(redoAction);
      if (eng.redoHistory.length > 30) eng.redoHistory.shift();
      eng.renderer.needsVoxelUpdate = true;
      updates.forEach(u => eng.network.sendUpdateBlock(u));
    }
  }

  redo() {
    const eng = this.engine;
    if (eng.redoHistory && eng.redoHistory.length > 0) {
      const redoAction = eng.redoHistory.pop();
      const undoAction = [];
      const updates = [];
      redoAction.forEach(u => {
        const currentVoxel = eng.mapManager.getVoxelAt(u.worldX, u.worldY, u.worldZ);
        undoAction.push({ worldX: u.worldX, worldY: u.worldY, worldZ: u.worldZ, voxelData: currentVoxel ? { ...currentVoxel } : null });
        eng.mapManager.setVoxelAt(u.worldX, u.worldY, u.worldZ, u.voxelData, false);
        updates.push(u);
      });
      eng.history = eng.history || [];
      eng.history.push(undoAction);
      if (eng.history.length > 30) eng.history.shift();
      eng.renderer.needsVoxelUpdate = true;
      updates.forEach(u => eng.network.sendUpdateBlock(u));
    }
  }

  updateSelectionArea() {
    const eng = this.engine;
    eng.selectedTiles = [];
    if (!eng.selectionStart || !eng.selectionEnd) return;

    const minX = Math.min(eng.selectionStart.x, eng.selectionEnd.x);
    const maxX = Math.max(eng.selectionStart.x, eng.selectionEnd.x);
    const minY = Math.min(eng.selectionStart.y, eng.selectionEnd.y);
    const maxY = Math.max(eng.selectionStart.y, eng.selectionEnd.y);
    const minZ = Math.min(eng.selectionStart.z, eng.selectionEnd.z);
    const maxZ = Math.max(eng.selectionStart.z, eng.selectionEnd.z);

    const volume = ((maxX - minX) / 32 + 1) * ((maxY - minY) / 32 + 1) * ((maxZ - minZ) / 32 + 1);
    if (volume > 4000) return;

    for (let x = minX; x <= maxX; x += 32) {
      for (let y = minY; y <= maxY; y += 32) {
        for (let z = minZ; z <= maxZ; z += 32) {
          eng.selectedTiles.push({ x, y, z });
        }
      }
    }
  }
}
