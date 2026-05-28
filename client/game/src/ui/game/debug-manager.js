import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';

export class DebugManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.engine = renderer.engine;
  }

  setupDebugMeshes() {
    this.renderer.debugMeshes = new THREE.Group();
    this.renderer.scene.add(this.renderer.debugMeshes);

    const ringGeo = new THREE.RingGeometry(25, 30, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.targetRing = new THREE.Mesh(ringGeo, ringMat);
    this.renderer.targetRing.add(new THREE.LineSegments(new THREE.EdgesGeometry(ringGeo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false })));
    this.renderer.targetRing.visible = false;
    this.renderer.debugMeshes.add(this.renderer.targetRing);

    const circleGeo = new THREE.CircleGeometry(200, 32);
    const meleeMat = new THREE.MeshBasicMaterial({ color: 0xf39c12, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.meleeCircle = new THREE.Mesh(circleGeo, meleeMat);
    this.renderer.meleeCircle.add(new THREE.LineSegments(new THREE.EdgesGeometry(circleGeo), new THREE.LineBasicMaterial({ color: 0xf39c12, transparent: true, opacity: 0.8, depthTest: false })));
    this.renderer.meleeCircle.visible = false;
    this.renderer.debugMeshes.add(this.renderer.meleeCircle);

    const fov = Math.PI / 3;
    const coneGeo = new THREE.CircleGeometry(200, 32, -fov, fov * 2);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.meleeCone = new THREE.Mesh(coneGeo, coneMat);
    this.renderer.meleeCone.add(new THREE.LineSegments(new THREE.EdgesGeometry(coneGeo), new THREE.LineBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.8, depthTest: false })));
    this.renderer.meleeCone.visible = false;
    this.renderer.debugMeshes.add(this.renderer.meleeCone);

    const meleeHitGeo = new THREE.CircleGeometry(35, 32);
    const meleeHitMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.meleeHitMesh = new THREE.InstancedMesh(meleeHitGeo, meleeHitMat, 100);
    this.renderer.meleeHitMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.renderer.meleeHitMesh.frustumCulled = false;
    this.renderer.meleeHitMesh.visible = false;
    this.renderer.debugMeshes.add(this.renderer.meleeHitMesh);

    const meleeHitEdgeGeo = new THREE.RingGeometry(34, 35, 32);
    const meleeHitEdgeMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.meleeHitLineMesh = new THREE.InstancedMesh(meleeHitEdgeGeo, meleeHitEdgeMat, 100);
    this.renderer.meleeHitLineMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.renderer.meleeHitLineMesh.frustumCulled = false;
    this.renderer.meleeHitLineMesh.visible = false;
    this.renderer.debugMeshes.add(this.renderer.meleeHitLineMesh);

    const losGeo = new THREE.CircleGeometry(35, 32);
    const losMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.losMesh = new THREE.InstancedMesh(losGeo, losMat, 100);
    this.renderer.losMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.renderer.losMesh.frustumCulled = false;
    this.renderer.losMesh.visible = false;
    this.renderer.debugMeshes.add(this.renderer.losMesh);

    const losEdgeGeo = new THREE.RingGeometry(34, 35, 32);
    const losEdgeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.losLineMesh = new THREE.InstancedMesh(losEdgeGeo, losEdgeMat, 100);
    this.renderer.losLineMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.renderer.losLineMesh.frustumCulled = false;
    this.renderer.losLineMesh.visible = false;
    this.renderer.debugMeshes.add(this.renderer.losLineMesh);

    const losConeGeo = new THREE.CircleGeometry(400, 32, -Math.PI/3, (Math.PI/3)*2);
    const losConeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.losCone = new THREE.Mesh(losConeGeo, losConeMat);
    this.renderer.losCone.add(new THREE.LineSegments(new THREE.EdgesGeometry(losConeGeo), new THREE.LineBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.8, depthTest: false })));
    this.renderer.losCone.visible = false;
    this.renderer.debugMeshes.add(this.renderer.losCone);

    this.renderer.debugTileMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(32, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff4757, wireframe: true, depthTest: false }), 100);
    this.renderer.debugTileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.renderer.debugTileMesh.frustumCulled = false;
    this.renderer.debugTileMesh.visible = false;
    this.renderer.debugMeshes.add(this.renderer.debugTileMesh);

    const chunkBoxGeo = new THREE.BoxGeometry(1024, 1024, 2048);
    const chunkBoxMat = new THREE.LineBasicMaterial({ color: 0x9b59b6, depthTest: false, transparent: true, opacity: 0.5, linewidth: 2 });
    this.renderer.chunkBox = new THREE.LineSegments(new THREE.EdgesGeometry(chunkBoxGeo), chunkBoxMat);
    this.renderer.chunkBox.visible = false;
    this.renderer.debugMeshes.add(this.renderer.chunkBox);

    this.renderer.arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      100,
      0xff0000
    );
    this.renderer.arrowHelper.line.material.depthTest = false;
    this.renderer.arrowHelper.line.material.depthWrite = false;
    this.renderer.arrowHelper.line.renderOrder = 999;
    this.renderer.arrowHelper.cone.material.depthTest = false;
    this.renderer.arrowHelper.cone.material.depthWrite = false;
    this.renderer.arrowHelper.cone.renderOrder = 999;
    this.renderer.arrowHelper.visible = true;
    this.renderer.scene.add(this.renderer.arrowHelper);

    const highlightBoxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(32.5, 32.5, 32.5));
    const highlightBoxMat = new THREE.LineBasicMaterial({ color: 0xf1c40f, depthTest: false, linewidth: 2 });
    this.renderer.highlightBox = new THREE.LineSegments(highlightBoxGeo, highlightBoxMat);
    this.renderer.highlightBox.renderOrder = 999;
    this.renderer.highlightBox.visible = false;
    this.renderer.scene.add(this.renderer.highlightBox);

    const selBoxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const selBoxMat = new THREE.LineBasicMaterial({ color: 0x3498db, depthTest: false, linewidth: 2 });
    this.renderer.selectionBox = new THREE.LineSegments(selBoxGeo, selBoxMat);
    this.renderer.selectionBox.renderOrder = 999;
    this.renderer.selectionBox.visible = false;
    this.renderer.scene.add(this.renderer.selectionBox);

    const tpRingGeo = new THREE.RingGeometry(12, 16, 32);
    const tpRingMat = new THREE.MeshBasicMaterial({ color: 0x9b59b6, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    this.renderer.tpRing = new THREE.Mesh(tpRingGeo, tpRingMat);
    this.renderer.tpRing.add(new THREE.LineSegments(new THREE.EdgesGeometry(tpRingGeo), new THREE.LineBasicMaterial({ color: 0x9b59b6, transparent: true, opacity: 0.9, depthTest: false })));
    this.renderer.tpRing.visible = false;
    this.renderer.scene.add(this.renderer.tpRing);
  }

  setupDebugOverlay() {
    let overlay = document.getElementById('3d-debug-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '3d-debug-overlay';
      overlay.style.cssText = 'position: absolute; pointer-events: none; background: rgba(0,0,0,0.8); border: 1px solid #f1c40f; color: #fff; font-family: var(--font-mono); font-size: 12px; padding: 10px; border-radius: 4px; z-index: 1000; display: none; white-space: nowrap; box-shadow: 0 0 10px rgba(0,0,0,0.8);';
      document.body.appendChild(overlay);
    }
    this.renderer.debugOverlay = overlay;

    let dCanvas = document.getElementById('debug-canvas');
    if (!dCanvas) {
      dCanvas = document.createElement('canvas');
      dCanvas.id = 'debug-canvas';
      dCanvas.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none; z-index: 10;';
      document.body.appendChild(dCanvas);
    }
    this.renderer.debugCanvas = dCanvas;
    this.renderer.debugCtx = dCanvas.getContext('2d');
  }

  update3DDebug() {
    const eng = this.engine;
    if (!eng.player || eng.player.state === 'death') {
      this.renderer.targetRing.visible = false;
      this.renderer.meleeCircle.visible = false;
      this.renderer.meleeCone.visible = false;
      this.renderer.losCone.visible = false;
      this.renderer.losMesh.visible = false;
      this.renderer.losLineMesh.visible = false;
      this.renderer.meleeHitMesh.visible = false;
      this.renderer.meleeHitLineMesh.visible = false;
      this.renderer.debugTileMesh.visible = false;
      this.renderer.chunkBox.visible = false;
      return;
    }

    if (eng.selectedTarget) {
      let tx, ty, tz;
      if (eng.selectedTarget.type === 'npc') {
        const npc = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
        if (npc && npc.state !== 'dead') { tx = npc.x; ty = npc.y; tz = npc.z; }
      } else if (eng.selectedTarget.type === 'player') {
        const op = eng.otherPlayers[eng.selectedTarget.id];
        if (op && op.state !== 'death') { tx = op.x; ty = op.y; tz = op.z; }
      } else if (eng.selectedTarget.type === 'self' && eng.player.state !== 'death') {
        tx = eng.player.x; ty = eng.player.y; tz = eng.player.z;
      }
      if (tx !== undefined) {
        this.renderer.targetRing.position.set(tx, ty, (tz || 0) + 1);
        this.renderer.targetRing.visible = true;
      } else {
        this.renderer.targetRing.visible = false;
      }
    } else {
      this.renderer.targetRing.visible = false;
    }

    if (eng.devOptions.showMelee) {
      this.renderer.meleeCircle.visible = true;

      const dirAngleMap = {
        'down-left': 0, 'down': Math.PI / 4, 'down-right': Math.PI / 2, 'right': Math.PI * 0.75,
        'up-right': Math.PI, 'up': -Math.PI * 0.75, 'up-left': -Math.PI / 2, 'left': -Math.PI / 4
      };
      this.renderer.meleeCone.position.set(eng.player.x, eng.player.y, (eng.player.z || 0) + 1.1);
      this.renderer.meleeCone.rotation.z = dirAngleMap[eng.player.dir] || 0;
      this.renderer.meleeCone.visible = true;

      let hitCount = 0;
      const dummy = new THREE.Object3D();
      const checkMeleeHit = (tx, ty, tz) => {
        const pz = eng.player.z || 0;
        if (Math.abs(pz - (tz || 0)) > 48) return false;
        const dist = Math.hypot(tx - eng.player.x, ty - eng.player.y);
        if (dist > 200) return false;
        let angleDiff = Math.atan2(ty - eng.player.y, tx - eng.player.x) - this.renderer.meleeCone.rotation.z;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) > Math.PI / 3) return false;
        return true;
      }
      const addMeleeBaseplate = (entity) => {
        if (hitCount >= 100) return;
        if (checkMeleeHit(entity.x, entity.y, entity.z)) {
          dummy.position.set(entity.x, entity.y, (entity.z || 0) + 1);
          dummy.updateMatrix();
          this.renderer.meleeHitMesh.setMatrixAt(hitCount, dummy.matrix);
          this.renderer.meleeHitLineMesh.setMatrixAt(hitCount++, dummy.matrix);
        }
      };
      Object.values(eng.otherPlayers).forEach(op => { if (op.state !== 'death') addMeleeBaseplate(op); });
      eng.npcs.forEach(npc => { if (npc.state !== 'dead') addMeleeBaseplate(npc); });

      this.renderer.meleeHitMesh.count = hitCount; this.renderer.meleeHitLineMesh.count = hitCount;
      this.renderer.meleeHitMesh.instanceMatrix.needsUpdate = true; this.renderer.meleeHitLineMesh.instanceMatrix.needsUpdate = true;
      this.renderer.meleeHitMesh.visible = true; this.renderer.meleeHitLineMesh.visible = true;
    } else {
      this.renderer.meleeCircle.visible = false;
      this.renderer.meleeCone.visible = false;
      this.renderer.meleeHitMesh.visible = false;
      this.renderer.meleeHitLineMesh.visible = false;
    }

    if (eng.devOptions.showLoS) {
      const maxDist = eng.devOptions.losDistance !== undefined ? eng.devOptions.losDistance : 400;
      const losAngle = eng.devOptions.losAngle !== undefined ? eng.devOptions.losAngle : 60;
      const fov = (losAngle / 2) * (Math.PI / 180);

      if (this.renderer.losCone.userData.fov !== fov || this.renderer.losCone.userData.maxDist !== maxDist) {
        this.renderer.losCone.geometry.dispose();
        this.renderer.losCone.geometry = new THREE.CircleGeometry(maxDist, 32, -fov, fov * 2);
        this.renderer.losCone.children[0].geometry.dispose();
        this.renderer.losCone.children[0].geometry = new THREE.EdgesGeometry(this.renderer.losCone.geometry);
        this.renderer.losCone.userData.fov = fov;
        this.renderer.losCone.userData.maxDist = maxDist;
      }

      const dirAngleMap = {
        'down-left': 0, 'down': Math.PI / 4, 'down-right': Math.PI / 2, 'right': Math.PI * 0.75,
        'up-right': Math.PI, 'up': -Math.PI * 0.75, 'up-left': -Math.PI / 2, 'left': -Math.PI / 4
      };
      let facingAngle = dirAngleMap[eng.player.dir] || 0;

      this.renderer.losCone.position.set(eng.player.x, eng.player.y, (eng.player.z || 0) + 1.1);
      this.renderer.losCone.rotation.z = facingAngle;
      this.renderer.losCone.visible = true;

      const checkHitLoS = (tx, ty, tz) => {
        const pz = eng.player.z || 0;
        tz = tz || 0;
        if (Math.abs(pz - tz) > 48) return false;
        const dist = Math.hypot(tx - eng.player.x, ty - eng.player.y);
        if (dist > maxDist) return false;
        const angleToTarget = Math.atan2(ty - eng.player.y, tx - eng.player.x);
        let angleDiff = angleToTarget - facingAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) > fov) return false;
        const steps = Math.ceil(dist / 16);
        for (let i = 1; i <= steps; i++) {
          const sampleX = eng.player.x + ((tx - eng.player.x) * (i / steps));
          const sampleY = eng.player.y + ((ty - eng.player.y) * (i / steps));
          const terrainZ = eng.getTerrainZ(sampleX, sampleY, pz, true);
          if (terrainZ > pz + 16 && terrainZ > tz + 16) return false;
        }
        return true;
      };

      const dummy = new THREE.Object3D();
      let hitCount = 0;
      const addLoSBaseplate = (entity) => {
        if (hitCount >= 100) return;
        if (checkHitLoS(entity.x, entity.y, entity.z)) {
          dummy.position.set(entity.x, entity.y, (entity.z || 0) + 1);
          dummy.updateMatrix();
            this.renderer.losMesh.setMatrixAt(hitCount, dummy.matrix);
            this.renderer.losLineMesh.setMatrixAt(hitCount++, dummy.matrix);
        }
      };

      Object.values(eng.otherPlayers).forEach(op => { if (op.state !== 'death') addLoSBaseplate(op); });
      eng.npcs.forEach(npc => { if (npc.state !== 'dead') addLoSBaseplate(npc); });

      this.renderer.losMesh.count = hitCount;
      this.renderer.losMesh.instanceMatrix.needsUpdate = true;
      this.renderer.losMesh.visible = true;
    } else {
      this.renderer.losCone.visible = false;
      this.renderer.losMesh.visible = false;
    }

    let tileHitCount = 0;
    const dummy = new THREE.Object3D();
    const addTileBox = (entity) => {
      if (tileHitCount >= 100) return;
      const tx = Math.round(entity.x / 32) * 32;
      const ty = Math.round(entity.y / 32) * 32;
      const tz = Math.round((entity.z || 0) / 32) * 32;
      dummy.position.set(tx, ty, tz);
      dummy.updateMatrix();
      this.renderer.debugTileMesh.setMatrixAt(tileHitCount++, dummy.matrix);
    };

    if (eng.devOptions.showPlayerTile && eng.player) addTileBox(eng.player);
    if (eng.devOptions.showEntityTile) {
      eng.npcs.forEach(npc => { if (npc.state !== 'dead') addTileBox(npc); });
      Object.values(eng.otherPlayers).forEach(op => { if (op.state !== 'death') addTileBox(op); });
    }

    this.renderer.debugTileMesh.count = tileHitCount;
    this.renderer.debugTileMesh.instanceMatrix.needsUpdate = true;
    this.renderer.debugTileMesh.visible = tileHitCount > 0;
  }

  update2DOverlay() {
    if (!this.renderer.debugCtx) return;
    const ctx = this.renderer.debugCtx;
    const eng = this.engine;

    const drawEntityBubbles = (entity) => {
        const p3d = new THREE.Vector3(entity.x, entity.y, (entity.z || 0) + 145).project(this.renderer.camera);
        const sx = (p3d.x + 1) / 2 * window.innerWidth;
        const sy = -(p3d.y - 1) / 2 * window.innerHeight;
        eng.chat.drawBubbles(ctx, sx, sy, entity.chatBubbles);
    };

    eng.npcs.forEach(npc => drawEntityBubbles(npc));
    Object.values(eng.otherPlayers).forEach(op => drawEntityBubbles(op));
    if (eng.player) drawEntityBubbles(eng.player);

    const drawNameplate = (entity, isPlayer) => {
      const showName = (isPlayer && eng.clientSettings.showPlayerNames) || (!isPlayer && eng.clientSettings.showEntityNames);
      const showHealth = (isPlayer && eng.clientSettings.showPlayerHealth) || (!isPlayer && eng.clientSettings.showEntityHealth);

      if (!showName && !showHealth && !entity.isTyping) return;

      const p3d = new THREE.Vector3(entity.x, entity.y, (entity.z || 0) + 120).project(this.renderer.camera);
      const sx = (p3d.x + 1) / 2 * window.innerWidth;
      const sy = -(p3d.y - 1) / 2 * window.innerHeight;

      if (showName || entity.isTyping) {
        const name = isPlayer ? (entity === eng.player ? eng.playerData.name : entity.name) : (entity.name || '');
        const afkTag = entity.isAFK ? '[AFK] ' : '';
        const dots = entity.isTyping ? '.'.repeat(Math.floor(performance.now() / 400) % 4) : '';
        const textToShow = showName ? afkTag + name + dots : dots;
        if (textToShow) {
          ctx.fillStyle = isPlayer ? (entity.isAFK ? '#95a5a6' : '#2ecc71') : (entity.uuid ? '#ff4757' : '#3498db');
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(textToShow, sx, sy - 10);
          ctx.fillText(textToShow, sx, sy - 10);
        }
      }

      if (showHealth) {
        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(sx - 15, sy, 30, 4);
        ctx.fillStyle = isPlayer ? '#2ecc71' : (entity.uuid ? '#ff4757' : '#3498db');
        ctx.fillRect(sx - 15, sy, 30 * hpPercent, 4);

        if (entity.energy !== undefined && entity.maxEnergy) {
           const epPercent = Math.max(0, entity.energy / entity.maxEnergy);
           ctx.fillStyle = '#0984e3';
           ctx.fillRect(sx - 15, sy + 4, 30 * epPercent, 4);
        }
      }

      if (entity.isAFK && entity.afkMessage) {
        let msgY = sy + 8;
        if (showHealth) {
          msgY = sy + 12;
          if (entity.energy !== undefined && entity.maxEnergy) msgY = sy + 16;
        }
        ctx.fillStyle = '#95a5a6';
        ctx.font = 'italic 10px monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(`"${entity.afkMessage}"`, sx, msgY, 150);
        ctx.fillText(`"${entity.afkMessage}"`, sx, msgY, 150);
      }
    };

    eng.npcs.forEach(npc => drawNameplate(npc, false));
    Object.values(eng.otherPlayers).forEach(op => drawNameplate(op, true));
    drawNameplate(eng.player, true);

    // --- Toggle Player / Entity POS ---
    const drawPosDot = (entity, z, colorHex) => {
      const p3d = new THREE.Vector3(entity.x, entity.y, z).project(this.renderer.camera);
      const sx = (p3d.x + 1) / 2 * window.innerWidth;
      const sy = -(p3d.y - 1) / 2 * window.innerHeight;
      ctx.fillStyle = colorHex;
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(`X:${Math.round(entity.x)} Y:${Math.round(entity.y)} Z:${Math.round(z)}`, sx + 10, sy);
      ctx.fillText(`X:${Math.round(entity.x)} Y:${Math.round(entity.y)} Z:${Math.round(z)}`, sx + 10, sy);
    };

    if (eng.devOptions.showPlayerPos && eng.player) {
      drawPosDot(eng.player, eng.player.z || 0, '#2ecc71');
    }

    if (eng.devOptions.showEntityPos) {
      eng.npcs.forEach(npc => {
        if (npc.state !== 'dead') {
          drawPosDot(npc, npc.z || 0, '#ff4757');
        }
      });
      Object.values(eng.otherPlayers).forEach(op => {
        if (op.state !== 'death') {
          drawPosDot(op, op.z || 0, '#3498db');
        }
      });
    }

    // --- Toggle Chunk Boundaries ---
    if (eng.devOptions.showChunk) {
      const chunkSize = 1024;
      const cx = Math.floor(eng.player.x / chunkSize);
      const cy = Math.floor(eng.player.y / chunkSize);

      const minX = cx * chunkSize;
      const minY = cy * chunkSize;
      const maxX = minX + chunkSize;
      const maxY = minY + chunkSize;
      const pZ = eng.player.z || 0;

      const toScreen = (vx, vy, vz) => {
        const p = new THREE.Vector3(vx, vy, vz).project(this.renderer.camera);
        return {
          x: (p.x + 1) / 2 * window.innerWidth,
          y: -(p.y - 1) / 2 * window.innerHeight
        };
      };

      const pNW = toScreen(minX, minY, pZ);
      const pNE = toScreen(maxX, minY, pZ);
      const pSE = toScreen(maxX, maxY, pZ);
      const pSW = toScreen(minX, maxY, pZ);
      const pNW_top = toScreen(minX, minY, pZ + 512); // Upwards line (Z+)

      ctx.save();
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(pNW.x, pNW.y); ctx.lineTo(pNE.x, pNE.y);
      ctx.lineTo(pSE.x, pSE.y); ctx.lineTo(pSW.x, pSW.y);
      ctx.closePath(); ctx.stroke();

      ctx.beginPath(); ctx.moveTo(pNW.x, pNW.y); ctx.lineTo(pNW_top.x, pNW_top.y); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#9b59b6'; ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 4;
      ctx.strokeText(`Chunk [${cx}, ${cy}] NW`, pNW_top.x, pNW_top.y - 20);
      ctx.fillText(`Chunk [${cx}, ${cy}] NW`, pNW_top.x, pNW_top.y - 20);
      ctx.restore();
    }

    if (eng.devOptions.showHitboxes) {
      ctx.lineWidth = 2;
      const drawRect = (entity, color) => {
        const p3d = new THREE.Vector3(entity.x, entity.y, entity.z || 0).project(this.renderer.camera);
        const sx = (p3d.x + 1) / 2 * window.innerWidth;
        const sy = -(p3d.y - 1) / 2 * window.innerHeight;

            const zoom = this.renderer.camera.zoom;
            const width = 60 * zoom;
        const height = 130 * zoom;

        ctx.strokeStyle = color;
        ctx.strokeRect(sx - (width / 2), sy - height, width, height);
      };

      drawRect(eng.player, '#2ecc71');
      Object.values(eng.otherPlayers).forEach(op => { if (op.state !== 'death') drawRect(op, '#3498db'); });
      eng.npcs.forEach(npc => { if (npc.state !== 'dead') drawRect(npc, '#ff4757'); });
    }

    // --- Drag Selection Indicators ---
    if (eng.editMode && eng.input.keys['control'] && eng.cursorGridPos) {
      const activeSlot = document.querySelector('.hotbar-slot.active');
      const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
      const isDeleting = eng.input.keys['shift'] || tex === 'erase';
      const color = isDeleting ? 'rgba(255, 71, 87, 0.6)' : 'rgba(52, 152, 219, 0.6)';

      ctx.save();
      const drawIsoArrow = (ox, oy, oz, dx, dy) => {
        const p1 = new THREE.Vector3(ox + dx*16, oy + dy*16, oz).project(this.renderer.camera);
        const p2 = new THREE.Vector3(ox + dx*48, oy + dy*48, oz).project(this.renderer.camera);

        const sx1 = (p1.x + 1) / 2 * window.innerWidth;
        const sy1 = -(p1.y - 1) / 2 * window.innerHeight;
        const sx2 = (p2.x + 1) / 2 * window.innerWidth;
        const sy2 = -(p2.y - 1) / 2 * window.innerHeight;

        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
        ctx.beginPath();
        ctx.moveTo(sx2, sy2);
        ctx.lineTo(sx2 - 12 * Math.cos(angle - Math.PI/6), sy2 - 12 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(sx2 - 12 * Math.cos(angle + Math.PI/6), sy2 - 12 * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };

      if (eng.isDraggingSelection && eng.selectionStart && eng.selectionEnd) {
        const minX = Math.min(eng.selectionStart.x, eng.selectionEnd.x);
        const maxX = Math.max(eng.selectionStart.x, eng.selectionEnd.x);
        const minY = Math.min(eng.selectionStart.y, eng.selectionEnd.y);
        const maxY = Math.max(eng.selectionStart.y, eng.selectionEnd.y);
        const cz = eng.selectionStart.z + 16;
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        drawIsoArrow(maxX, midY, cz, 1, 0); drawIsoArrow(minX, midY, cz, -1, 0);
        drawIsoArrow(midX, maxY, cz, 0, 1); drawIsoArrow(midX, minY, cz, 0, -1);
      } else {
        const cz = eng.cursorGridPos.z + 16;
        drawIsoArrow(eng.cursorGridPos.x, eng.cursorGridPos.y, cz, 1, 0); drawIsoArrow(eng.cursorGridPos.x, eng.cursorGridPos.y, cz, -1, 0);
        drawIsoArrow(eng.cursorGridPos.x, eng.cursorGridPos.y, cz, 0, 1); drawIsoArrow(eng.cursorGridPos.x, eng.cursorGridPos.y, cz, 0, -1);
      }
      ctx.restore();
    }

    // Render Combat Floating Texts
    eng.floatingTexts.forEach(ft => {
      const p3d = new THREE.Vector3(ft.x, ft.y, ft.z || 0).project(this.renderer.camera);
      const sx = (p3d.x + 1) / 2 * window.innerWidth;
      const sy = -(p3d.y - 1) / 2 * window.innerHeight;

      const zoom = this.renderer.camera.zoom;
      const zScale = Math.pow(zoom, 0.6); // Scale text gently to prevent it from getting massively bloated
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);

      let fontFamily = 'monospace';
      let baseFontSize = ft.isDoT ? 14 : 18;

      if (ft.isCrit) {
        fontFamily = 'Impact, sans-serif';
        baseFontSize = 28; // Give critical hits a much larger baseline size
      }

      ctx.font = `bold ${Math.max(10, baseFontSize * zScale)}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(2, 3 * zScale);
      const drawX = sx + ((ft.rndX || 0) * zScale);
      const drawY = sy - (ft.offsetY * zScale) + ((ft.rndY || 0) * zScale);
      ctx.strokeText(ft.text, drawX, drawY);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, drawX, drawY);
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.strokeStyle = '#000';
    let textY = window.innerHeight - 80;

    if ((eng.clientSettings.showCoords || eng.clientSettings.showYawPitch) && eng.player) {
      let text = "";
      if (eng.clientSettings.showCoords) {
        text += `XYZ: ${Math.round(eng.player.x)}, ${Math.round(eng.player.y)}, ${Math.round(eng.player.z || 0)}`;
      }
      if (eng.clientSettings.showYawPitch) {
        const yaw = Math.round(this.renderer.cameraAngle || 0);
        const pitch = Math.round((this.renderer.cameraPitch || 0) * (180 / Math.PI));
        if (text.length > 0) text += " | ";
        text += `Yaw: ${yaw}° Pitch: ${pitch}°`;
      }
      if (text.length > 0) {
        ctx.strokeText(text, window.innerWidth - 20, textY);
        ctx.fillText(text, window.innerWidth - 20, textY);
        textY -= 20;
      }
    }

    if (eng.clientSettings.showPing) {
      const text = `Ping: ${eng.ping}ms`;
      ctx.strokeText(text, window.innerWidth - 20, textY);
      ctx.fillText(text, window.innerWidth - 20, textY);
      textY -= 20;
    }
    if (eng.clientSettings.showFPS) {
      const text = `FPS: ${eng.fps}`;
      ctx.strokeText(text, window.innerWidth - 20, textY);
      ctx.fillText(text, window.innerWidth - 20, textY);
      textY -= 20;
    }
    ctx.restore();
  }

  updateArrowHelper() {
    const eng = this.engine;
    if (!eng.player || eng.player.state === 'death' || !this.renderer.camera || !this.renderer.arrowHelper) {
      if (this.renderer.arrowHelper) this.renderer.arrowHelper.visible = false;
      if (this.renderer.debugOverlay) this.renderer.debugOverlay.style.display = 'none';
      return;
    }

    const mouse = new THREE.Vector2();
    mouse.x = (eng.input.mousePos.x / window.innerWidth) * 2 - 1;
    mouse.y = -(eng.input.mousePos.y / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.renderer.camera);

    const mapPos = eng.getMapWorldPosFromScreen(eng.input.mousePos.x, eng.input.mousePos.y);

    let hoveredEntity = null;
    if (!eng.editMode && this.renderer.entityMeshes && !mapPos) {
      const groups = Array.from(this.renderer.entityMeshes.values());
      const entityHits = raycaster.intersectObjects(groups, true);
      for (const hit of entityHits) {
        let hitId = null;
        for (const [id, group] of this.renderer.entityMeshes.entries()) {
          if (group === hit.object || group.children.includes(hit.object)) {
            hitId = id; break;
          }
        }
        if (hitId && hitId !== 'player_self' && !hitId.startsWith('proj_')) {
          if (hitId.startsWith('npc_')) hoveredEntity = { type: 'npc', id: hitId.substring(4) };
          else if (hitId.startsWith('player_')) hoveredEntity = { type: 'player', id: hitId.substring(7) };
          break;
        }
      }
    }
    eng.hoveredEntity = hoveredEntity;

    let targetPoint = null;
    let blockHit = null;

    if (this.renderer.previewCubeMesh) this.renderer.previewCubeMesh.count = 0;
    if (this.renderer.previewSlabMesh) this.renderer.previewSlabMesh.count = 0;
    if (this.renderer.previewRampMesh) this.renderer.previewRampMesh.count = 0;
    if (this.renderer.previewStairMesh) this.renderer.previewStairMesh.count = 0;
    if (this.renderer.previewDoorMesh) this.renderer.previewDoorMesh.count = 0;
    for (const id in this.renderer.assetManager.previewModelMeshes) this.renderer.assetManager.previewModelMeshes[id].count = 0;

    eng.cursorGridPos = null;

    if (mapPos) {
      targetPoint = new THREE.Vector3(mapPos.x, mapPos.y, eng.getTerrainZ(mapPos.x, mapPos.y));
    } else {
      const modelMeshArr = this.renderer.assetManager.modelMeshes ? Object.values(this.renderer.assetManager.modelMeshes) : [];
      const buildMeshes = [this.renderer.voxelMesh, this.renderer.slabMesh, this.renderer.rampMesh, this.renderer.stairMesh, this.renderer.glassMesh, this.renderer.glassSlabMesh, this.renderer.glassRampMesh, this.renderer.glassStairMesh, this.renderer.doorMesh, this.renderer.glassDoorMesh, this.renderer.lightBlockMesh, ...modelMeshArr].filter(Boolean);
      if (buildMeshes.length > 0) {
        const hits = raycaster.intersectObjects(buildMeshes);
        if (hits.length > 0) {
          targetPoint = hits[0].point;
          blockHit = hits[0];
        }
      }

      if (!targetPoint) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(eng.player.z || 0));
        targetPoint = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, targetPoint)) targetPoint = null;
      }
    }

    this.renderer.highlightBox.visible = false;
    if (this.renderer.selectionBox) this.renderer.selectionBox.visible = false;

    if (eng.editMode && targetPoint && (eng.devOptions.showTile || eng.devOptions.useBlockPreview)) {
      let hitPos = new THREE.Vector3();
      let normal = new THREE.Vector3(0, 0, 1);

      if (blockHit) {
        let isDoor = false;
        if (this.renderer.doorMap && (blockHit.object === this.renderer.doorMesh || (this.renderer.glassDoorMesh && blockHit.object === this.renderer.glassDoorMesh))) {
          for (const [key, data] of Object.entries(this.renderer.doorMap)) {
            if (data.id === blockHit.instanceId && ((data.isGlass && blockHit.object === this.renderer.glassDoorMesh) || (!data.isGlass && blockHit.object === this.renderer.doorMesh))) {
              hitPos.set(data.cx, data.cy, data.cz);
              isDoor = true;
              break;
            }
          }
        }

        if (!isDoor) {
          const matrix = new THREE.Matrix4();
          blockHit.object.getMatrixAt(blockHit.instanceId, matrix);
          hitPos.setFromMatrixPosition(matrix);
        }
        const rawNormal = blockHit.face ? blockHit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
        const absX = Math.abs(rawNormal.x); const absY = Math.abs(rawNormal.y); const absZ = Math.abs(rawNormal.z);
        if (absZ >= absX && absZ >= absY) normal.set(0, 0, Math.sign(rawNormal.z));
        else if (absX > absY) normal.set(Math.sign(rawNormal.x), 0, 0);
        else normal.set(0, Math.sign(rawNormal.y), 0);
      } else {
        hitPos.copy(targetPoint);
      }

      let targetX = Math.round(hitPos.x / 32) * 32;
      let targetY = Math.round(hitPos.y / 32) * 32;
      let targetZ = Math.round(hitPos.z / 32) * 32;
      eng.cursorGridPos = { x: targetX, y: targetY, z: targetZ, normal: normal.clone(), hitExisting: !!blockHit };

      if (eng.isDraggingSelection && eng.selectionStart && eng.selectionEnd) {
        const minX = Math.min(eng.selectionStart.x, eng.selectionEnd.x);
        const maxX = Math.max(eng.selectionStart.x, eng.selectionEnd.x);
        const minY = Math.min(eng.selectionStart.y, eng.selectionEnd.y);
        const maxY = Math.max(eng.selectionStart.y, eng.selectionEnd.y);
        const minZ = Math.min(eng.selectionStart.z, eng.selectionEnd.z);
        const maxZ = Math.max(eng.selectionStart.z, eng.selectionEnd.z);

        const width = maxX - minX + 32;
        const height = maxY - minY + 32;
        const depth = maxZ - minZ + 32;

        const centerX = minX + (width / 2) - 16;
        const centerY = minY + (height / 2) - 16;
        const centerZ = minZ + (depth / 2) - 16;

        this.renderer.selectionBox.scale.set(width + 0.5, height + 0.5, depth + 0.5);
        this.renderer.selectionBox.position.set(centerX, centerY, centerZ);

        const activeSlot = document.querySelector('.hotbar-slot.active');
        const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
        const isDeleting = eng.input.keys['shift'] || tex === 'erase';
        const isPicker = tex === 'picker' || eng.input.keys['alt'];

        if (isDeleting) {
          this.renderer.selectionBox.material.color.setHex(0xff4757); // Red for deleting
          this.renderer.selectionBox.visible = true;
        } else if (isPicker) {
          this.renderer.selectionBox.material.color.setHex(0x9b59b6); // Purple for picker
          this.renderer.selectionBox.visible = true;
        } else {
          this.renderer.selectionBox.material.color.setHex(0x3498db); // Blue for building
          this.renderer.selectionBox.visible = true;
        }
      }

      if (eng.devOptions.showTile && !eng.devOptions.useBlockPreview) {
        this.renderer.highlightBox.scale.set(1, 1, 1);
        this.renderer.highlightBox.position.set(targetX, targetY, targetZ);
        this.renderer.highlightBox.material.color.setHex(0xf1c40f);
        this.renderer.highlightBox.visible = true;
      }

      if (eng.devOptions.useBlockPreview) {
        const activeSlot = document.querySelector('.hotbar-slot.active');
        const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
        const isDeleting = eng.input.keys['shift'] || tex === 'erase';
        const isPicker = tex === 'picker' || eng.input.keys['alt'];

        if (isPicker) {
           this.renderer.highlightBox.scale.set(1, 1, 1);
           this.renderer.highlightBox.position.set(targetX, targetY, targetZ);
           this.renderer.highlightBox.material.color.setHex(0x9b59b6); // Purple for picker
           this.renderer.highlightBox.visible = !eng.isDraggingSelection;
        } else if (isDeleting) {
           const clickedVoxel = eng.mapManager.getVoxelAt(targetX, targetY, targetZ);
           if (clickedVoxel && clickedVoxel.shape && clickedVoxel.shape.startsWith('door')) {
             this.renderer.highlightBox.scale.set(1, 1, 2);
             if (clickedVoxel.tex && clickedVoxel.tex.includes('door-bottom')) {
               this.renderer.highlightBox.position.set(targetX, targetY, targetZ + 16);
             } else {
               this.renderer.highlightBox.position.set(targetX, targetY, targetZ - 16);
             }
           } else {
             this.renderer.highlightBox.scale.set(1, 1, 1);
             this.renderer.highlightBox.position.set(targetX, targetY, targetZ);
           }
           this.renderer.highlightBox.material.color.setHex(0xff4757); // Red for delete
           this.renderer.highlightBox.visible = !eng.isDraggingSelection;
        } else {
           this.renderer.highlightBox.scale.set(1, 1, 1);
           let placeShape = eng.editShape || 'cube';
           if (placeShape === 'none') {
             this.renderer.highlightBox.visible = false;
           } else {
             if (placeShape.endsWith('_player')) {
                const base = placeShape.split('_')[0];
                const pDir = eng.player.dir;
                if (pDir.includes('up')) placeShape = base + '_n';
                else if (pDir.includes('down')) placeShape = base + '_s';
                else if (pDir.includes('right')) placeShape = base + '_e';
                else if (pDir.includes('left')) placeShape = base + '_w';
                else placeShape = base + '_s';
             }
             const colorHex = eng.buildColor || '#ffffff';

             let tilesToPreview = [];
             if (eng.isDraggingSelection && eng.selectedTiles && eng.selectedTiles.length > 0) {
               tilesToPreview = [...eng.selectedTiles];
             } else {
               const clickedVoxel = eng.mapManager.getVoxelAt(targetX, targetY, targetZ);
               if (clickedVoxel && clickedVoxel.shape === 'slab' && normal.z === 1 && clickedVoxel.tex === tex && clickedVoxel.color === colorHex) {
                 placeShape = 'cube';
               } else {
                 targetX += normal.x * 32; targetY += normal.y * 32; targetZ += normal.z * 32;
               }
               tilesToPreview = [{ x: targetX, y: targetY, z: targetZ }];
             }

             if (placeShape.startsWith('door')) {
               const extraTiles = [];
               const isTopTex = tex.includes('door-top');
               tilesToPreview.forEach(t => {
                 if (isTopTex) {
                   extraTiles.push({ x: t.x, y: t.y, z: t.z - 32, isBottomDoor: true });
                 } else {
                   extraTiles.push({ x: t.x, y: t.y, z: t.z + 32, isTopDoor: true });
                 }
               });
               tilesToPreview = tilesToPreview.concat(extraTiles);
             }

             let currentMesh; const dummy = new THREE.Object3D();
             if (placeShape === 'slab') { currentMesh = this.renderer.previewSlabMesh; }
             else if (placeShape.startsWith('ramp')) {
               currentMesh = this.renderer.previewRampMesh;
               if (placeShape === 'ramp_e') dummy.rotation.set(0, 0, -Math.PI / 2);
               else if (placeShape === 'ramp_n') dummy.rotation.set(0, 0, Math.PI);
               else if (placeShape === 'ramp_w') dummy.rotation.set(0, 0, Math.PI / 2);
             } else if (placeShape.startsWith('stair')) {
               currentMesh = this.renderer.previewStairMesh;
               if (placeShape === 'stair_e') dummy.rotation.set(0, 0, -Math.PI / 2);
               else if (placeShape === 'stair_n') dummy.rotation.set(0, 0, Math.PI);
               else if (placeShape === 'stair_w') dummy.rotation.set(0, 0, Math.PI / 2);
             } else if (placeShape.startsWith('door')) {
               currentMesh = this.renderer.previewDoorMesh;
               let rot = 0;
               const isOp = placeShape.includes('_open');
               const isFlip = placeShape.includes('_flip');
               if (placeShape.includes('door_e')) rot = -Math.PI / 2;
               else if (placeShape.includes('door_n')) rot = Math.PI;
               else if (placeShape.includes('door_w')) rot = Math.PI / 2;
               else if (placeShape.includes('door_s')) rot = 0;

               if (isOp) {
                 rot += isFlip ? -Math.PI / 2 : Math.PI / 2;
               }
               dummy.rotation.set(0, 0, rot);
             } else if (this.renderer.assetManager.previewModelMeshes && this.renderer.assetManager.previewModelMeshes[placeShape]) {
               currentMesh = this.renderer.assetManager.previewModelMeshes[placeShape];
               let rot = 0;
               if (eng.editShapeDir === 'e') rot = -Math.PI / 2;
               else if (eng.editShapeDir === 'n') rot = Math.PI;
               else if (eng.editShapeDir === 'w') rot = Math.PI / 2;
               dummy.rotation.set(0, 0, rot);
             } else { currentMesh = this.renderer.previewCubeMesh; }

             const nameToId = {};
             for (const id in BlockRegistry) {
               nameToId[BlockRegistry[id].name] = id;
             }

             const blockId = nameToId[tex];
             const voxelDef = blockId ? BlockRegistry[blockId] : null;
             let mainAtlasPos, sidesAtlasPos, bottomAtlasPos;
             if (voxelDef && voxelDef.faces) {
               mainAtlasPos = { x: voxelDef.faces.top[0], y: voxelDef.faces.top[1] };
               sidesAtlasPos = { x: voxelDef.faces.sides[0], y: voxelDef.faces.sides[1] };
               bottomAtlasPos = { x: voxelDef.faces.bottom[0], y: voxelDef.faces.bottom[1] };
             } else {
               mainAtlasPos = this.renderer.assetManager.atlasMap[tex] || this.renderer.assetManager.atlasMap['stone'];
               sidesAtlasPos = mainAtlasPos;
               bottomAtlasPos = mainAtlasPos;
             }

             let fluidType = 0.0;
             if (tex === 'water' || tex === 'water_flow') fluidType = 1.0;
             else if (tex === 'lava' || tex === 'lava_flow') fluidType = 2.0;
             else if (tex === 'acid') fluidType = 3.0;
             else if (tex && tex.startsWith('block-lamp-on')) fluidType = 4.0;
             const isFluid = fluidType > 0.0 && fluidType < 4.0;
             const isGlassBlock = tex.startsWith('glass') || tex.startsWith('clear_stained_glass');
             const parsedColor = new THREE.Color(colorHex);

             const maxPreview = Math.min(tilesToPreview.length, 4096);

             const previewSet = new Set();
             for (let i = 0; i < maxPreview; i++) {
               previewSet.add(`${tilesToPreview[i].x}_${tilesToPreview[i].y}_${tilesToPreview[i].z}`);
             }

             for (let i = 0; i < maxPreview; i++) {
               const t = tilesToPreview[i];
               dummy.position.set(t.x, t.y, t.z);
               dummy.updateMatrix();
               currentMesh.setMatrixAt(i, dummy.matrix);
               currentMesh.setColorAt(i, parsedColor);

               let tMainAtlasPos = mainAtlasPos;
               let tSidesAtlasPos = sidesAtlasPos;
               let tBottomAtlasPos = bottomAtlasPos;

               if (t.isTopDoor) {
                 const topTex = tex.replace('bottom', 'top');
                 tMainAtlasPos = this.renderer.assetManager.atlasMap[topTex] || mainAtlasPos;
                 tSidesAtlasPos = tMainAtlasPos; tBottomAtlasPos = tMainAtlasPos;
               } else if (t.isBottomDoor) {
                 const botTex = tex.replace('top', 'bottom');
                 tMainAtlasPos = this.renderer.assetManager.atlasMap[botTex] || mainAtlasPos;
                 tSidesAtlasPos = tMainAtlasPos; tBottomAtlasPos = tMainAtlasPos;
               }

               const setUVs = (uvAttr, atlasPos, idx) => {
                 if (!uvAttr) return;
                 let tw = 64/2048; let to = atlasPos.x * (64/2048);
                 if (placeShape.includes('_flip')) { tw = -tw; to += (64/2048); }
                 uvAttr.setXYZW(idx, to, 1.0 - ((atlasPos.y + 1) * (64/2048)), tw, 64/2048);
               };
               setUVs(currentMesh.geometry.attributes.instanceUVTop, tMainAtlasPos, i);
               setUVs(currentMesh.geometry.attributes.instanceUVSide, tSidesAtlasPos, i);
               setUVs(currentMesh.geometry.attributes.instanceUVBottom, tBottomAtlasPos, i);
               if (currentMesh.geometry.attributes.isFluid) currentMesh.geometry.attributes.isFluid.setX(i, fluidType);

               let visE = 1, visW = 1, visS = 1, visN = 1, visT = 1, visB = 1;

               const checkCull = (nx, ny, nz) => {
                 if (previewSet.has(`${nx}_${ny}_${nz}`)) return true;
                 if (isGlassBlock || isFluid) {
                   const v = eng.mapManager.getVoxelAt(nx, ny, nz);
                   if (v && v.tex === tex && (v.shape || 'cube') === placeShape) return true;
                 }
                 return false;
               };

               if (checkCull(t.x + 32, t.y, t.z)) visE = 0;
               if (checkCull(t.x - 32, t.y, t.z)) visW = 0;
               if (checkCull(t.x, t.y + 32, t.z)) visS = 0;
               if (checkCull(t.x, t.y - 32, t.z)) visN = 0;
               if (checkCull(t.x, t.y, t.z + 32)) visT = 0;
               if (checkCull(t.x, t.y, t.z - 32)) visB = 0;

               if (currentMesh.geometry.attributes.instanceNeighbors1) currentMesh.geometry.attributes.instanceNeighbors1.setXYZW(i, visE, visW, visS, visN);
               if (currentMesh.geometry.attributes.instanceNeighbors2) currentMesh.geometry.attributes.instanceNeighbors2.setXY(i, visT, visB);
             }

             currentMesh.count = maxPreview;
             currentMesh.instanceMatrix.needsUpdate = true;
             if (currentMesh.instanceColor) currentMesh.instanceColor.needsUpdate = true;
             if (currentMesh.geometry.attributes.instanceUVTop) currentMesh.geometry.attributes.instanceUVTop.needsUpdate = true;
             if (currentMesh.geometry.attributes.instanceUVSide) currentMesh.geometry.attributes.instanceUVSide.needsUpdate = true;
             if (currentMesh.geometry.attributes.instanceUVBottom) currentMesh.geometry.attributes.instanceUVBottom.needsUpdate = true;
             if (currentMesh.geometry.attributes.isFluid) currentMesh.geometry.attributes.isFluid.needsUpdate = true;
             if (currentMesh.geometry.attributes.instanceNeighbors1) currentMesh.geometry.attributes.instanceNeighbors1.needsUpdate = true;
             if (currentMesh.geometry.attributes.instanceNeighbors2) currentMesh.geometry.attributes.instanceNeighbors2.needsUpdate = true;
           }
        }
      }
    }

    if (targetPoint) {
      const feetPos = new THREE.Vector3(eng.player.x, eng.player.y, eng.player.z || 0);
      const chestPos = new THREE.Vector3(eng.player.x, eng.player.y, (eng.player.z || 0) + 20);

      this.renderer.arrowHelper.visible = false;
      if (this.renderer.debugOverlay) this.renderer.debugOverlay.style.display = 'none';

      let tooltipHTML = '';

      if (eng.devOptions.showDistPlayerToMouse && eng.devOptions.useDebugTooltip) {
        const mathDir = new THREE.Vector3().copy(targetPoint).sub(feetPos);
        const dist = mathDir.length();

        this.renderer.arrowHelper.visible = true;

        if (dist > 0.001) {
          const visualDir = new THREE.Vector3().copy(targetPoint).sub(chestPos);
          const visualDist = visualDir.length();
          visualDir.normalize();
          this.renderer.arrowHelper.setDirection(visualDir);
          this.renderer.arrowHelper.setLength(visualDist, Math.min(visualDist * 0.2, 20), Math.min(visualDist * 0.05, 10));
          this.renderer.arrowHelper.position.copy(chestPos);
        }

        let vx = Math.round(targetPoint.x / 32) * 32;
        let vy = Math.round(targetPoint.y / 32) * 32;
        let vz = Math.round(targetPoint.z / 32) * 32;

        if (blockHit) {
            let isDoor = false;
            if (this.renderer.doorMap && (blockHit.object === this.renderer.doorMesh || (this.renderer.glassDoorMesh && blockHit.object === this.renderer.glassDoorMesh))) {
              for (const [key, data] of Object.entries(this.renderer.doorMap)) {
                if (data.id === blockHit.instanceId && ((data.isGlass && blockHit.object === this.renderer.glassDoorMesh) || (!data.isGlass && blockHit.object === this.renderer.doorMesh))) {
                  vx = data.cx; vy = data.cy; vz = data.cz;
                  isDoor = true; break;
                }
              }
            }
            if (!isDoor) {
                const matrix = new THREE.Matrix4();
                blockHit.object.getMatrixAt(blockHit.instanceId, matrix);
                const blockPos = new THREE.Vector3();
                blockPos.setFromMatrixPosition(matrix);
                vx = Math.round(blockPos.x); vy = Math.round(blockPos.y); vz = Math.round(blockPos.z);
            }
        } else if (eng.cursorGridPos && eng.cursorGridPos.hitExisting) {
           vx = eng.cursorGridPos.x;
           vy = eng.cursorGridPos.y;
           vz = eng.cursorGridPos.z;
        }

        const voxel = eng.mapManager.getVoxelAt(vx, vy, vz);
        let voxelInfo = '<span style="color: #aaa;">Empty Space (Air)</span>';
        if (voxel) {
           let baseShape = voxel.shape || 'cube';
           let shapeDisplay = baseShape;

           let isStandard = baseShape === 'cube' || baseShape === 'slab' || baseShape === 'decor' || baseShape.startsWith('ramp') || baseShape.startsWith('stair') || baseShape.startsWith('door');

           if (FURNITURE_REGISTRY && FURNITURE_REGISTRY[baseShape]) {
               shapeDisplay = `Model (${FURNITURE_REGISTRY[baseShape].name})`;
           } else if (isStandard) {
               shapeDisplay = `Block (${baseShape})`;
           } else {
               shapeDisplay = `<span style="color: #ff4757;">Orphaned Data (${baseShape} &rarr; Cube)</span>`;
           }

           const dirNames = { 'n': 'North', 'e': 'East', 's': 'South', 'w': 'West' };
           const dirDisplay = dirNames[voxel.dir || 'n'] || (voxel.dir || 'North');

           voxelInfo = `Material: <span style="color: #f1c40f;">${voxel.tex}</span><br>Shape: <span style="color: #9b59b6;">${shapeDisplay}</span><br>Direction: <span style="color: #e67e22;">${dirDisplay}</span>`;
        }

        tooltipHTML += `
            <strong style="color: #3498db; border-bottom: 1px solid #3498db; padding-bottom: 3px; display: inline-block; margin-bottom: 5px;">Voxel Inspector</strong><br>
            XYZ: <span style="color: #2ecc71;">${vx}, ${vy}, ${vz}</span><br>
            Distance: <span style="color: #f39c12;">${Math.round(dist)}</span><br>
            ${voxelInfo}
        `;
      }

      if (tooltipHTML !== '' && this.renderer.debugOverlay) {
         this.renderer.debugOverlay.style.display = 'block';
         this.renderer.debugOverlay.style.left = (eng.input.mousePos.x + 20) + 'px';
         this.renderer.debugOverlay.style.top = (eng.input.mousePos.y + 20) + 'px';
         this.renderer.debugOverlay.innerHTML = tooltipHTML;
      }

      if (this.renderer.debugCtx && !eng.devOptions.useDebugTooltip) {
        const ctx = this.renderer.debugCtx;

        const drawDashedTrace = (origin, target, originLabel, targetLabel, color) => {
          const p1 = origin.clone().project(this.renderer.camera);
          const p2 = target.clone().project(this.renderer.camera);
          const sx1 = (p1.x + 1) / 2 * window.innerWidth;
          const sy1 = -(p1.y - 1) / 2 * window.innerHeight;
          const sx2 = (p2.x + 1) / 2 * window.innerWidth;
          const sy2 = -(p2.y - 1) / 2 * window.innerHeight;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.stroke();
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(sx1 - 2, sy1 - 2, 4, 4);
            ctx.fillRect(sx2 - 2, sy2 - 2, 4, 4);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'left';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(`${originLabel} X:${Math.round(origin.x)} Y:${Math.round(origin.y)} Z:${Math.round(origin.z)}`, sx1 + 10, sy1);
            ctx.fillText(`${originLabel} X:${Math.round(origin.x)} Y:${Math.round(origin.y)} Z:${Math.round(origin.z)}`, sx1 + 10, sy1);
            ctx.strokeText(`${targetLabel} X:${Math.round(target.x)} Y:${Math.round(target.y)} Z:${Math.round(target.z)}`, sx2 + 10, sy2);
            ctx.fillText(`${targetLabel} X:${Math.round(target.x)} Y:${Math.round(target.y)} Z:${Math.round(target.z)}`, sx2 + 10, sy2);
            ctx.textAlign = 'center';
            const midX = (sx1 + sx2) / 2;
            const midY = (sy1 + sy2) / 2;
            const dx = target.x - origin.x;
            const dy = target.y - origin.y;
            const dz = target.z - origin.z;
            const dist = Math.hypot(Math.hypot(dx, dy), dz);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const text = `Dist: ${Math.round(dist)} | XYZ: ${Math.round(dx)}, ${Math.round(dy)}, ${Math.round(dz)} | Ang: ${Math.round(angle)}°`;

            let screenAngle = Math.atan2(sy2 - sy1, sx2 - sx1);
            if (sx1 > sx2) screenAngle += Math.PI;
            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(screenAngle);
            ctx.strokeText(text, 0, -10);
            ctx.fillText(text, 0, -10);
            ctx.restore();
            ctx.restore();
        };

        if (eng.devOptions.showDistPlayerToMouse && eng.mouseWorldPos) {
          const feetPos = new THREE.Vector3(eng.player.x, eng.player.y, eng.player.z || 0);
          drawDashedTrace(feetPos, eng.mouseWorldPos, "Player", "Mouse", "#2ecc71");
        }

        if (eng.selectedTarget && eng.selectedTarget.type === 'npc') {
          const npc = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
          if (npc) {
            const npcPos = new THREE.Vector3(npc.x, npc.y, npc.z || 0);
            const feetPos = new THREE.Vector3(eng.player.x, eng.player.y, eng.player.z || 0);
            if (eng.devOptions.showDistToNPC) drawDashedTrace(feetPos, npcPos, "Player", "NPC", "#f1c40f");
            if (eng.devOptions.showDistNpcToMouse && eng.mouseWorldPos) drawDashedTrace(npcPos, eng.mouseWorldPos, "NPC", "Mouse", "#e74c3c");
          }
        }
      }
    }

      if (eng.targetingPower && targetPoint) {
      const maxMapSize = 511 * 32;
      targetPoint.x = Math.max(0, Math.min(targetPoint.x, maxMapSize));
      targetPoint.y = Math.max(0, Math.min(targetPoint.y, maxMapSize));
      targetPoint.z = eng.getTerrainZ(targetPoint.x, targetPoint.y);
    }

    eng.mouseWorldPos = targetPoint;
  }

  updateTeleportVisuals() {
    const eng = this.engine;
    let drawRing = false;
    let targetX, targetY, targetZ;

    if (eng.player && eng.player.teleportTarget) {
      targetX = eng.player.teleportTarget.x;
      targetY = eng.player.teleportTarget.y;
      targetZ = eng.getTerrainZ(targetX, targetY);
      drawRing = true;
    } else if (eng.targetingPower && eng.mouseWorldPos) {
      targetX = eng.mouseWorldPos.x;
      targetY = eng.mouseWorldPos.y;
      targetZ = eng.getTerrainZ(targetX, targetY);
      drawRing = true;
    }

    if (drawRing) {
      this.renderer.tpRing.position.set(targetX, targetY, targetZ + 2);

      this.renderer.tpRing.rotation.z += 0.05;
      const scale = 1.0 + Math.sin(performance.now() / 100) * 0.2;
      this.renderer.tpRing.scale.set(scale, scale, 1);
      this.renderer.tpRing.visible = true;

      if (this.renderer.debugCtx) {
        const ctx = this.renderer.debugCtx;
        const p1 = new THREE.Vector3(eng.player.x, eng.player.y, (eng.player.z || 0) + 24).project(this.renderer.camera);
        const p2 = new THREE.Vector3(targetX, targetY, targetZ + 2).project(this.renderer.camera);

        const sx1 = (p1.x + 1) / 2 * window.innerWidth;
        const sy1 = -(p1.y - 1) / 2 * window.innerHeight;
        const sx2 = (p2.x + 1) / 2 * window.innerWidth;
        const sy2 = -(p2.y - 1) / 2 * window.innerHeight;

        ctx.save();
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 15]);
        ctx.lineDashOffset = -(performance.now() / 20);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sx2 - 10, sy2); ctx.lineTo(sx2 + 10, sy2);
        ctx.moveTo(sx2, sy2 - 10); ctx.lineTo(sx2, sy2 + 10);
        ctx.stroke();
        ctx.restore();
      }
    } else if (this.renderer.tpRing) {
      this.renderer.tpRing.visible = false;
    }
  }
}
