const SCREEN_ANGLES = { 'right': 0, 'down-right': Math.PI/4, 'down': Math.PI/2, 'down-left': Math.PI*0.75, 'left': Math.PI, 'up-left': -Math.PI*0.75, 'up': -Math.PI/2, 'up-right': -Math.PI/4 };

export class MinimapManager {
  constructor(engine) {
    this.engine = engine;
  }

  draw(ctx) {
    const eng = this.engine;
    if (!eng.mapManager) return;
    const box = eng.getMinimapBox();
    const mmSize = box.size;
    const mmX = box.x;
    const mmY = box.y;
    const mmTileSize = eng.clientSettings.minimapZoom || 8;
    const mmRadius = Math.ceil(((mmSize / mmTileSize) / 2) * 1.5) + 1;

    ctx.save();
        ctx.fillStyle = 'rgba(5, 7, 10, 0.8)';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(mmX, mmY, mmSize, mmSize);

        ctx.beginPath();
    ctx.rect(mmX, mmY, mmSize, mmSize);
    ctx.clip();

        ctx.translate(mmX + mmSize / 2, mmY + mmSize / 2);

    const camAngle = eng.renderer ? eng.renderer.cameraAngle : 0;
    const rotationAngle = eng.clientSettings.rotateMinimap ? camAngle : 0;
    ctx.scale(-1, 1);
    ctx.rotate((45 - rotationAngle) * Math.PI / 180);

    const pFracX = eng.player.x / 32;
    const pFracY = eng.player.y / 32;
    const pGx = Math.floor(pFracX);
    const pGy = Math.floor(pFracY);
    const offsetX = (pFracX - pGx) * mmTileSize;
    const offsetY = (pFracY - pGy) * mmTileSize;

    if (eng.mapManager.cacheBounds) {
      const bounds = eng.mapManager.cacheBounds;
      const drawWidth = eng.mapManager.mapCacheCanvas.width * mmTileSize;
      const drawHeight = eng.mapManager.mapCacheCanvas.height * mmTileSize;
      const drawOffsetX = (bounds.minX - pFracX) * mmTileSize;
      const drawOffsetY = (bounds.minY - pFracY) * mmTileSize;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(eng.mapManager.mapCacheCanvas, drawOffsetX, drawOffsetY, drawWidth, drawHeight);
    }

    if (eng.targetingPower && eng.mouseWorldPos) {
      const tDrawX = (eng.mouseWorldPos.x / 32 - pFracX) * mmTileSize;
      const tDrawY = (eng.mouseWorldPos.y / 32 - pFracY) * mmTileSize;

      ctx.save();
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.lineDashOffset = -(performance.now() / 20);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tDrawX, tDrawY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(tDrawX - 8, tDrawY); ctx.lineTo(tDrawX + 8, tDrawY);
      ctx.moveTo(tDrawX, tDrawY - 8); ctx.lineTo(tDrawX, tDrawY + 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tDrawX, tDrawY, 6 + Math.sin(performance.now() / 100) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    eng.waypoints.forEach((wp) => {
      const wDrawX = (wp.x / 32 - pFracX) * mmTileSize;
      const wDrawY = (wp.y / 32 - pFracY) * mmTileSize;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(wDrawX, wDrawY, Math.max(3, mmTileSize/2), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    if (eng.mapPings) {
      eng.mapPings.forEach(ping => {
        const pDrawX = (ping.x / 32 - pFracX) * mmTileSize;
        const pDrawY = (ping.y / 32 - pFracY) * mmTileSize;
        const maxRadius = mmTileSize * 4;
        const currentRadius = maxRadius * (1.0 - ping.life);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pDrawX, pDrawY, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = ping.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.max(0, ping.life);
        ctx.stroke();
        if (currentRadius > mmTileSize) {
          ctx.beginPath(); ctx.arc(pDrawX, pDrawY, currentRadius - mmTileSize, 0, Math.PI * 2);
          ctx.lineWidth = 1; ctx.globalAlpha = Math.max(0, ping.life * 0.5); ctx.stroke();
        }
        ctx.restore();
      });
    }

        const drawMinimapDot = (worldX, worldY, dotColor, size) => {
      const drawX = (worldX / 32 - pFracX) * mmTileSize;
      const drawY = (worldY / 32 - pFracY) * mmTileSize;
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    eng.npcs.forEach(npc => {
      if (npc.state !== 'dead') drawMinimapDot(npc.x, npc.y, '#ff4757', 2);
    });

    Object.values(eng.otherPlayers).forEach(op => {
      if (op.state !== 'death') drawMinimapDot(op.x, op.y, '#3498db', 2.5);
    });

        ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    const pAngle = SCREEN_ANGLES[eng.player.dir] || 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(pAngle) * 8, Math.sin(pAngle) * 8);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
