import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';
import { InputRouter } from './input-router.js?v=new-engine-330';

export class InputManager {
  constructor(engine) {
    this.engine = engine;
    this.keys = {};
    this.mousePos = { x: 0, y: 0 };
    this.isDraggingCamera = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.router = new InputRouter(engine, this);

    this.setupListeners();
  }

  setupListeners() {
    const eng = this.engine;

    this.handleKeyDown = (e) => {
      eng.player.lastActionTime = Date.now();
      this.router.handleKeyDown(e);
    };

    this.handleKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    };

     this.handleBlur = () => {
      for (const key in this.keys) {
        this.keys[key] = false;
      }
    };

    this.handleContextMenu = (e) => e.preventDefault();

    this.handleBeforeUnload = (e) => {
          };

    this.handleWheel = (e) => {
      if (e.target !== eng.canvas) return; // Ignore scrolling over UI elements

      if (eng.mapOverlay && eng.mapOverlay.active) {
        const box = eng.getMinimapBox();
        const isHoveringPiP = e.clientX >= box.x && e.clientX <= box.x + box.size && e.clientY >= box.y && e.clientY <= box.y + box.size;
        if (!isHoveringPiP) return; // Prevent zooming the 3D camera while the map is open unless hovering PiP
      } else if (eng.clientSettings.showMinimap) {
        const box = eng.getMinimapBox();
        const isHoveringMinimap = e.clientX >= box.x && e.clientX <= box.x + box.size && e.clientY >= box.y && e.clientY <= box.y + box.size;
        if (isHoveringMinimap) {
          let zoom = eng.clientSettings.minimapZoom || 8;
          if (e.deltaY < 0) {
            zoom = Math.min(zoom + 1, 32);
          } else {
            zoom = Math.max(zoom - 1, 2);
          }
          eng.clientSettings.minimapZoom = zoom;
          localStorage.setItem('b_client_settings', JSON.stringify(eng.clientSettings));
          if (eng.network) eng.network.sendClientSettings(eng.clientSettings);
          return; // Stop here, don't zoom the 3D camera
        }
      }

      if (!eng.renderer || !eng.renderer.camera) return;
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      const camera = eng.renderer.camera;
      camera.zoom = Math.max(1.0, Math.min(camera.zoom + zoomDelta, 3.0));
      camera.updateProjectionMatrix();
    };

    this.handleMouseDown = (e) => {
      eng.player.lastActionTime = Date.now();
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;

      if (e.button === 1 && eng.clientSettings.middleMouseRotation !== false) {
        e.preventDefault();
        this.isDraggingCamera = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        document.body.style.cursor = 'grabbing';
        if (eng.canvas) eng.canvas.style.cursor = 'grabbing';
        return;
      }

      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        document.activeElement.blur();
      }

      const ctxMenu = document.getElementById('player-context-menu');
      if (ctxMenu) ctxMenu.style.display = 'none';

      if (!eng.renderer || !eng.renderer.camera) return;

      const mouse = new THREE.Vector2();
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, eng.renderer.camera);

      let clickedTarget = null;

      if (!eng.editMode && eng.renderer.entityMeshes) {
        const groups = Array.from(eng.renderer.entityMeshes.values());
        const entityHits = raycaster.intersectObjects(groups, true);

        for (const hit of entityHits) {
          let hitId = null;
          for (const [id, group] of eng.renderer.entityMeshes.entries()) {
            if (group === hit.object || group.children.includes(hit.object)) {
              hitId = id; break;
            }
          }
          if (hitId && hitId !== 'player_self' && !hitId.startsWith('proj_')) {
            if (hitId.startsWith('npc_')) clickedTarget = { type: 'npc', id: hitId.substring(4) };
            else if (hitId.startsWith('player_')) clickedTarget = { type: 'player', id: hitId.substring(7) };
            break;
          }
        }
      }

      if (e.button === 0) {
        if (eng.clientSettings.showMinimap && e.target === eng.canvas && !eng.targetingPower) {
          const mmBox = eng.getMinimapBox();
          if (e.clientX >= mmBox.x && e.clientX <= mmBox.x + mmBox.size && e.clientY >= mmBox.y && e.clientY <= mmBox.y + mmBox.size) {
              eng.isDraggingMinimap = true;
              eng.minimapDragOffset = { x: e.clientX - mmBox.x, y: e.clientY - mmBox.y };
              return;
          }
        }

        if (eng.targetingPower) {
            if (eng.mouseWorldPos && eng.combat) {
               eng.combat.executePowerLocation(eng.targetingPower, eng.mouseWorldPos.x, eng.mouseWorldPos.y);
            }
            eng.targetingPower = null;
            document.body.style.cursor = '';
            if (eng.canvas) eng.canvas.style.cursor = '';
            return;
        }

        eng.selectedTarget = clickedTarget;
        eng.ui.update();

        if (eng.editMode && e.ctrlKey && eng.cursorGridPos) {
          if (eng.editShape === 'none') return;
          eng.isDraggingSelection = true;

          const activeSlot = document.querySelector('.hotbar-slot.active');
          const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
          const isDeleting = this.keys['shift'] || tex === 'erase';
          const isPicker = tex === 'picker' || this.keys['alt'];

          let startPos = { x: eng.cursorGridPos.x, y: eng.cursorGridPos.y, z: eng.cursorGridPos.z };
          if (!isDeleting && !isPicker && eng.cursorGridPos.hitExisting && eng.cursorGridPos.normal) {
             startPos.x += eng.cursorGridPos.normal.x * 32;
             startPos.y += eng.cursorGridPos.normal.y * 32;
             startPos.z += eng.cursorGridPos.normal.z * 32;
          }

          eng.selectionStart = startPos;
          eng.selectionEnd = { ...startPos };
          eng.updateSelectionArea();
          return;
        }

        if (!clickedTarget && eng.editMode) {
          if (eng.cursorGridPos) {
            if (eng.editShape === 'none') return;
            const position = new THREE.Vector3(eng.cursorGridPos.x, eng.cursorGridPos.y, eng.cursorGridPos.z);
            const normal = eng.cursorGridPos.normal.clone();
            const hitExistingBlock = eng.cursorGridPos.hitExisting;

            const activeSlot = document.querySelector('.hotbar-slot.active');
            const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
            const isDeleting = this.keys['shift'] || tex === 'erase';
            const isPicker = tex === 'picker' || this.keys['alt'];

            let targetX = position.x;
            let targetY = position.y;
            let targetZ = position.z;

            if (isPicker) {
              const clickedVoxel = eng.mapManager.getVoxelAt(targetX, targetY, targetZ);
              if (clickedVoxel) {
                let matchTex = clickedVoxel.tex;
                if (matchTex === 'water_flow') {
                   matchTex = 'water';
                   eng.editFluid = 'flow';
                   const fBtn = document.getElementById('build-fluid-btn');
                   if (fBtn) fBtn.innerText = 'Fluid State: FLOW';
                } else if (matchTex === 'water') {
                   eng.editFluid = 'still';
                   const fBtn = document.getElementById('build-fluid-btn');
                   if (fBtn) fBtn.innerText = 'Fluid State: STILL';
                }
                const slots = document.querySelectorAll('#builder-hotbar .hotbar-slot');
                slots.forEach(s => {
                  if (s.dataset.tex === matchTex) {
                    slots.forEach(ss => ss.classList.remove('active'));
                    s.classList.add('active');
                    document.getElementById('build-fluid-btn').style.display = ['water', 'lava', 'acid'].includes(matchTex) ? 'block' : 'none';
                    const tabs = document.querySelectorAll('#builder-tabs-container button');
                    tabs.forEach(t => { if (t.innerText === s.dataset.cat) t.click(); });
                  }
                });
                const pickedColor = clickedVoxel.color || '#ffffff';
                eng.buildColor = pickedColor;
                document.querySelectorAll('.shared-color-picker').forEach(cp => { cp.value = pickedColor; });

                let matchShape = clickedVoxel.shape || 'cube';
                let matchDir = 'n';
                let matchFlip = false;
                if (matchShape.startsWith('ramp_') || matchShape.startsWith('stair_')) {
                  const parts = matchShape.split('_');
                  matchShape = parts[0];
                  matchDir = parts[1] || 'n';
                } else if (matchShape.startsWith('door_')) {
                  const parts = matchShape.split('_');
                  matchShape = 'door';
                  matchDir = parts[1] || 'n';
                  matchFlip = matchShape.includes('_flip') || clickedVoxel.shape.includes('_flip');
                } else if (FURNITURE_REGISTRY[matchShape]) {
                  matchDir = clickedVoxel.dir || 'n';
                } else if (matchShape.endsWith('_player')) {
                  const parts = matchShape.split('_');
                  matchShape = parts[0];
                }
                eng.editShapeBase = matchShape;
                eng.editShapeDir = matchDir;
                eng.editShapeRelative = false;
                eng.editShapeFlip = matchFlip;
                eng.editShape = clickedVoxel.shape || 'cube';
                if (eng.editShape.includes('_open')) eng.editShape = eng.editShape.replace('_open', '');

                const shapeBtn = document.getElementById('build-shape-btn');
                const dirBtn = document.getElementById('build-dir-btn');
                const relBtn = document.getElementById('build-rel-btn');
                const flipBtn = document.getElementById('build-flip-btn');
                if (shapeBtn) shapeBtn.innerText = 'Shape: ' + matchShape.toUpperCase();
                if (matchShape === 'door') {
                    if (dirBtn) dirBtn.style.display = 'block';
                    if (relBtn) relBtn.style.display = 'none';
                    if (flipBtn) {
                        flipBtn.style.display = 'block';
                        flipBtn.style.background = matchFlip ? 'rgba(46, 204, 113, 0.2)' : 'transparent';
                    }
                } else if (FURNITURE_REGISTRY[matchShape]) {
                    if (dirBtn) dirBtn.style.display = 'block';
                    if (relBtn) relBtn.style.display = 'none';
                    if (flipBtn) flipBtn.style.display = 'none';
                } else if (matchShape === 'ramp' || matchShape === 'stair') {
                    if (dirBtn) dirBtn.style.display = 'block';
                    if (relBtn) relBtn.style.display = 'block';
                    if (flipBtn) flipBtn.style.display = 'none';
                } else {
                    if (dirBtn) dirBtn.style.display = 'none';
                    if (relBtn) relBtn.style.display = 'none';
                    if (flipBtn) flipBtn.style.display = 'none';
                }
                if (dirBtn) dirBtn.innerText = matchDir.toUpperCase();
                if (relBtn) relBtn.style.background = 'transparent';
              }
            } else if (isDeleting) {
              const clickedVoxelOld = eng.mapManager.getVoxelAt(targetX, targetY, targetZ);
              if (clickedVoxelOld) {
                eng.history = eng.history || [];
                eng.history.push([{ worldX: targetX, worldY: targetY, worldZ: targetZ, voxelData: { ...clickedVoxelOld } }]);
                if (eng.history.length > 30) eng.history.shift();
                eng.redoHistory = [];
              }
              const pTex = clickedVoxelOld ? clickedVoxelOld.tex : 'stone';
              const pCol = clickedVoxelOld ? (clickedVoxelOld.color || '#ffffff') : '#ffffff';
              eng.mapManager.setVoxelAt(targetX, targetY, targetZ, null);
              eng.network.sendUpdateBlock({ worldX: targetX, worldY: targetY, worldZ: targetZ, voxelData: null });

              if (clickedVoxelOld && clickedVoxelOld.tex === 'wood-door-bottom') {
                eng.mapManager.setVoxelAt(targetX, targetY, targetZ + 32, null);
                eng.network.sendUpdateBlock({ worldX: targetX, worldY: targetY, worldZ: targetZ + 32, voxelData: null });
              } else if (clickedVoxelOld && clickedVoxelOld.tex === 'wood-door-top') {
                eng.mapManager.setVoxelAt(targetX, targetY, targetZ - 32, null);
                eng.network.sendUpdateBlock({ worldX: targetX, worldY: targetY, worldZ: targetZ - 32, voxelData: null });
              }

              eng.renderer.needsVoxelUpdate = true;
              // Deletion particle effect
              for (let i = 0; i < 25; i++) {
                eng.spawnParticle({
                  x: targetX + (Math.random() - 0.5) * 16, y: targetY + (Math.random() - 0.5) * 16, z: targetZ + (Math.random() - 0.5) * 16,
                  vx: (Math.random() - 0.5) * 200,
                  vy: (Math.random() - 0.5) * 200,
                  vz: 50 + Math.random() * 150,
                  vr: (Math.random() - 0.5) * 15,
                  rot: Math.random() * Math.PI * 2,
                  life: 0.2 + Math.random() * 0.2,
                  maxLife: 0.4,
                  tex: pTex,
                  color: pCol,
                  size: 2 + Math.random() * 4,
                  uvOffsetX: Math.random() * 0.75, // Random 25% quadrant
                  uvOffsetY: Math.random() * 0.75,
                  uvScale: 0.25
                });
              }
            } else {
              const clickedVoxel = eng.mapManager.getVoxelAt(targetX, targetY, targetZ);
              let placeShape = eng.editShape || 'cube';
              if (placeShape.endsWith('_player')) {
                const base = placeShape.split('_')[0];
                const pDir = eng.player.dir;
                if (pDir.includes('up')) placeShape = base + '_n';
                else if (pDir.includes('down')) placeShape = base + '_s';
                else if (pDir.includes('right')) placeShape = base + '_e';
                else if (pDir.includes('left')) placeShape = base + '_w';
                else placeShape = base + '_s';
              }

              if (hitExistingBlock) {
                if (clickedVoxel && clickedVoxel.shape === 'slab' && normal.z === 1) {
                  placeShape = 'cube';
                } else {
                  targetX += normal.x * 32;
                  targetY += normal.y * 32;
                  targetZ += normal.z * 32;
                }
              }

              const color = eng.buildColor || '#ffffff';

              const clickedVoxelOld = eng.mapManager.getVoxelAt(targetX, targetY, targetZ);
              eng.history = eng.history || [];
              eng.history.push([{ worldX: targetX, worldY: targetY, worldZ: targetZ, voxelData: clickedVoxelOld ? { ...clickedVoxelOld } : null }]);
              if (eng.history.length > 30) eng.history.shift();
              eng.redoHistory = [];

              let finalTex = tex;
              if (finalTex === 'water' && eng.editFluid === 'flow') finalTex = 'water_flow';

              if (finalTex.includes('door') && !placeShape.startsWith('door')) {
                placeShape = 'door_' + eng.editShapeDir + (eng.editShapeFlip ? '_flip' : '');
              } else if (!finalTex.includes('door') && placeShape.startsWith('door')) {
                placeShape = 'cube';
              }

              eng.mapManager.setVoxelAt(targetX, targetY, targetZ, { tex: finalTex, color, shape: placeShape, dir: eng.editShapeDir });
              eng.network.sendUpdateBlock({ worldX: targetX, worldY: targetY, worldZ: targetZ, voxelData: { tex: finalTex, color, shape: placeShape, dir: eng.editShapeDir } });

              if (finalTex === 'wood-door-bottom') {
                eng.mapManager.setVoxelAt(targetX, targetY, targetZ + 32, { tex: 'wood-door-top', color, shape: placeShape, dir: eng.editShapeDir });
                eng.network.sendUpdateBlock({ worldX: targetX, worldY: targetY, worldZ: targetZ + 32, voxelData: { tex: 'wood-door-top', color, shape: placeShape, dir: eng.editShapeDir } });
              }

              eng.renderer.needsVoxelUpdate = true;
              // Todo: Creation particle effect
              for (let i = 0; i < 15; i++) {
                eng.spawnParticle({
                  x: targetX + (Math.random() - 0.5) * 32,
                  y: targetY + (Math.random() - 0.5) * 32,
                  z: targetZ + (Math.random() - 0.5) * 32,
                  vx: (Math.random() - 0.5) * 50,
                  vy: (Math.random() - 0.5) * 50,
                  vz: (Math.random() - 0.5) * 50,
                  life: 0.15 + Math.random() * 0.15,
                  maxLife: 0.3,
                  tex: tex,
                  color: color,
                  size: 2 + Math.random() * 3,
                  uvOffsetX: Math.random() * 0.75,
                  uvOffsetY: Math.random() * 0.75,
                  uvScale: 0.25
                });
              }
            }
          }
        } else if (!eng.mapOverlay || !eng.mapOverlay.active) {
          if ((this.keys['v'] || (eng.clientSettings.clickToMove && !clickedTarget && !eng.editMode)) && eng.mouseWorldPos) {
            // Use the pre-calculated world position from the renderer's raycast
            eng.player.moveTarget = { x: eng.mouseWorldPos.x, y: eng.mouseWorldPos.y, sprint: !!this.keys['shift'], timer: 15 };
          }
        }
      } else if (e.button === 2) {
        e.preventDefault();

        const mapPos = eng.getMapWorldPosFromScreen(e.clientX, e.clientY);
        if (mapPos) {
          const activeZoom = (eng.mapOverlay && eng.mapOverlay.active) ? eng.mapOverlay.zoom : (eng.clientSettings.minimapZoom || 8);
          const hitRadius = (15 * 32) / activeZoom; // Translates to ~15 screen pixels of tolerance

          const hitIndex = eng.waypoints.findIndex(wp => Math.hypot(wp.x - mapPos.x, wp.y - mapPos.y) < hitRadius);
          if (hitIndex !== -1) {
            eng.waypoints.splice(hitIndex, 1);
          } else {
            eng.waypoints.push({ x: mapPos.x, y: mapPos.y });
          }
          return;
        }

        if (eng.targetingPower) {
           eng.targetingPower = null;
           document.body.style.cursor = '';
           if (eng.canvas) eng.canvas.style.cursor = '';
           return;
        }

        let clickedVoxel = null;
        let rootX, rootY, rootZ;

        if (eng.cursorGridPos && eng.cursorGridPos.hitExisting) {
          rootX = eng.cursorGridPos.x;
          rootY = eng.cursorGridPos.y;
          rootZ = eng.cursorGridPos.z;
          let v = eng.mapManager.getVoxelAt(rootX, rootY, rootZ);
          if (v && v.shape && (v.shape.startsWith('door') || FURNITURE_REGISTRY[v.shape])) {
            clickedVoxel = v;
          }
        }

        if (!clickedVoxel) {
          const rc = eng.getIsoRaycast(e.clientX, e.clientY);
          for (let dx = -32; dx <= 32; dx += 32) {
            for (let dy = -32; dy <= 32; dy += 32) {
              for (let dz = -96; dz <= 32; dz += 32) {
                let v = eng.mapManager.getVoxelAt(rc.gx * 32 + dx, rc.gy * 32 + dy, rc.z * 32 + dz);
                if (v && v.shape && (v.shape.startsWith('door') || FURNITURE_REGISTRY[v.shape])) {
                  clickedVoxel = v;
                  rootX = rc.gx * 32 + dx; rootY = rc.gy * 32 + dy; rootZ = rc.z * 32 + dz;
                  break;
                }
              }
              if (clickedVoxel) break;
            }
            if (clickedVoxel) break;
          }
        }

        if (clickedVoxel && !eng.editMode) {
          const dist = Math.hypot(eng.player.x - rootX, eng.player.y - rootY);
          if (dist <= 160) {
            if (clickedVoxel.shape.startsWith('door')) {
              let entityInWay = false;
              [...eng.npcs, ...Object.values(eng.otherPlayers), eng.player].forEach(ent => {
                if (ent.state !== 'dead' && ent.state !== 'death') {
                  if (Math.hypot(ent.x - rootX, ent.y - rootY) < 64) entityInWay = true;
                }
              });

              if (entityInWay) {
                eng.chat.addMessage('system', 'System', 'Something is blocking the door!');
                return;
              }

              const isOp = clickedVoxel.shape.includes('_open');
              const toggleDoor = (tx, ty, tz) => {
                const v = eng.mapManager.getVoxelAt(tx, ty, tz);
                if (v && v.shape && v.shape.startsWith('door')) {
                  v.shape = isOp ? v.shape.replace('_open', '') : v.shape + '_open';
                  eng.mapManager.setVoxelAt(tx, ty, tz, v);
                }
              };
              toggleDoor(rootX, rootY, rootZ);
              toggleDoor(rootX, rootY, rootZ + 32);
              toggleDoor(rootX, rootY, rootZ - 32);
              return;
            } else if (FURNITURE_REGISTRY[clickedVoxel.shape]) {
              let otherEntityInWay = false;
              [...eng.npcs, ...Object.values(eng.otherPlayers)].forEach(ent => {
                if (ent.state !== 'dead' && ent.state !== 'death') {
                  if (Math.hypot(ent.x - rootX, ent.y - rootY) < 16) otherEntityInWay = true;
                }
              });

              if (otherEntityInWay) {
                eng.chat.addMessage('system', 'System', 'Someone is already sitting there!');
                return;
              }

              if (!eng.player.isSitting) {
                 eng.player.preSitPos = { x: eng.player.x, y: eng.player.y, z: eng.player.z };
                 eng.player.isSitting = true;
                 eng.player.x = rootX;
                 eng.player.y = rootY;
                 eng.player.z = rootZ;

                 const dirMap = { 'n': 'up-right', 'e': 'down-right', 's': 'down-left', 'w': 'up-left' };
                 eng.player.dir = dirMap[clickedVoxel.dir] || 'down';
              }
              return;
            }
          } else {
             eng.chat.addMessage('system', 'System', 'You are too far away to interact with that.');
          }
        }

        if (eng.editMode && !clickedTarget) {
          const dirBtn = document.getElementById('build-dir-btn');
          if (dirBtn && dirBtn.style.display !== 'none') {
            dirBtn.click();
            return;
          }
        }

        if (clickedTarget) {
          eng.contextTarget = clickedTarget;

          let menuX = e.clientX;
          let menuY = e.clientY;
          if (menuX + 150 > window.innerWidth) menuX = window.innerWidth - 150;
          if (menuY + 60 > window.innerHeight) menuY = window.innerHeight - 60;

          if (ctxMenu) {
            const btnTrade = document.getElementById('ctx-btn-trade');
            const btnTalk = document.getElementById('ctx-btn-talk');

            if (btnTrade) btnTrade.style.display = clickedTarget.type === 'player' ? 'block' : 'none';
            if (btnTalk) btnTalk.style.display = clickedTarget.type === 'npc' ? 'block' : 'none';

            ctxMenu.style.left = `${menuX}px`;
            ctxMenu.style.top = `${menuY}px`;
            ctxMenu.style.display = 'flex';
          }
        }
      }
    };

    this.handleMouseMove = (e) => {
      eng.player.lastActionTime = Date.now();
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;

      if (eng.isDraggingMinimap) {
        eng.clientSettings.minimapX = e.clientX - eng.minimapDragOffset.x;
        eng.clientSettings.minimapY = e.clientY - eng.minimapDragOffset.y;
      }

      if (eng.isDraggingSelection && eng.cursorGridPos) {
        const activeSlot = document.querySelector('.hotbar-slot.active');
        const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
        const isDeleting = this.keys['shift'] || tex === 'erase';
        const isPicker = tex === 'picker' || this.keys['alt'];

        let endPos = { x: eng.cursorGridPos.x, y: eng.cursorGridPos.y, z: eng.cursorGridPos.z };
        if (!isDeleting && !isPicker && eng.cursorGridPos.hitExisting && eng.cursorGridPos.normal) {
           endPos.x += eng.cursorGridPos.normal.x * 32;
           endPos.y += eng.cursorGridPos.normal.y * 32;
           endPos.z += eng.cursorGridPos.normal.z * 32;
        }

        // Lock the Z-axis during the drag to prevent the selection volume from
        // chaotically expanding into a massive 3D cube if the mouse brushes against walls or empty space
        if (eng.selectionStart) {
          endPos.z = eng.selectionStart.z;
        }

        if (!eng.selectionEnd || eng.selectionEnd.x !== endPos.x || eng.selectionEnd.y !== endPos.y || eng.selectionEnd.z !== endPos.z) {
          eng.selectionEnd = endPos;
          eng.updateSelectionArea();
        }
      }

      if (this.isDraggingCamera && eng.renderer && eng.renderer.rotateCamera) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        const invertX = eng.clientSettings.invertCameraX ? -1 : 1;
        const invertY = eng.clientSettings.invertCameraY ? -1 : 1;
        const sensitivity = eng.clientSettings.dragRotationSensitivity !== undefined ? eng.clientSettings.dragRotationSensitivity : 0.25;
        eng.renderer.rotateCamera(deltaX * sensitivity * invertX, deltaY * sensitivity * invertY);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    };

    this.handleMouseUp = (e) => {
      if (e.button === 0 && eng.isDraggingSelection) {
        eng.isDraggingSelection = false;
        if (eng.selectedTiles && eng.selectedTiles.length > 0) {
          const activeSlot = document.querySelector('#builder-hotbar .hotbar-slot.active');
          if (activeSlot) activeSlot.click();
        }
      }
      if (e.button === 0 && eng.isDraggingMinimap) {
        eng.isDraggingMinimap = false;
        localStorage.setItem('b_client_settings', JSON.stringify(eng.clientSettings));
        if (eng.network) eng.network.sendClientSettings(eng.clientSettings);
      }
      if (e.button === 1) {
        this.isDraggingCamera = false;
        document.body.style.cursor = '';
        if (eng.canvas) eng.canvas.style.cursor = '';
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('contextmenu', this.handleContextMenu);
    eng.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  disconnect() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    this.engine.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('wheel', this.handleWheel);
  }
}
