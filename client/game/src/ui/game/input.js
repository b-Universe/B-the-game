import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { InputRouter } from './input-router.js?v=cache-bust-005';

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

  isActionDown(actionId) {
    const binds = this.engine.clientSettings.actionBinds;
    if (!binds || !binds[actionId]) return false;

    return this.checkCompoundKey(binds[actionId].primary) || this.checkCompoundKey(binds[actionId].alt);
  }

  checkCompoundKey(bindStr) {
    if (!bindStr) return false;
    const parts = bindStr.toLowerCase().split('+');
    let key = parts.pop().trim();

    if (key === 'space') key = ' ';
    else if (key === 'ctrl') key = 'control';

    if (parts.includes('ctrl') && !this.keys['control']) return false;
    if (parts.includes('shift') && !this.keys['shift']) return false;
    if (parts.includes('alt') && !this.keys['alt']) return false;

    return this.keys[key];
  }

  setupListeners() {
    const eng = this.engine;

    this.handleKeyDown = (e) => {
      eng.player.lastActionTime = Date.now();
      this.router.handleKeyDown(e);
    };

    this.handleKeyUp = (e) => {
      if (e.key) this.keys[e.key.toLowerCase()] = false;
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
      camera.zoom = Math.max(1.0, Math.min(camera.zoom + zoomDelta, 5.0));
      camera.updateProjectionMatrix();
    };

    this.handleMouseDown = (e) => {
      eng.player.lastActionTime = Date.now();
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      this.keys['mouse' + e.button] = true;

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
            else if (hitId.startsWith('drone_')) clickedTarget = { type: 'drone', id: hitId.substring(6) };
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

        if (eng.editMode && eng.cursorGridPos) {
          if (eng.editShape === 'none') return;
          eng.isDraggingSelection = true;

          const activeSlot = document.querySelector('.hotbar-slot.active');
          const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
          const isDeleting = eng.input.isActionDown('buildDelete') || tex === 'erase';
          const isPicker = tex === 'picker' || eng.input.isActionDown('picker');

          eng.selectionMode = isDeleting ? 'delete' : (isPicker ? 'pick' : 'build');

          let startPos = { x: eng.cursorGridPos.x, y: eng.cursorGridPos.y, z: eng.cursorGridPos.z };
          if (eng.selectionMode === 'build' && eng.cursorGridPos.hitExisting && eng.cursorGridPos.normal) {
             startPos.x += eng.cursorGridPos.normal.x * 32;
             startPos.y += eng.cursorGridPos.normal.y * 32;
             startPos.z += eng.cursorGridPos.normal.z * 32;
          }

          eng.selectionStart = startPos;
          eng.selectionEnd = { ...startPos };
          eng.updateSelectionArea();
          return;
        }

        if (!eng.mapOverlay || !eng.mapOverlay.active) {
          if ((this.keys['v'] || (eng.clientSettings.clickToMove && !clickedTarget && !eng.editMode)) && eng.mouseWorldPos) {
            eng.player.movePath = eng.physics.findPath(eng.player.x, eng.player.y, eng.player.z || 0, eng.mouseWorldPos.x, eng.mouseWorldPos.y);
            eng.player.moveTarget = { x: eng.mouseWorldPos.x, y: eng.mouseWorldPos.y, sprint: !!this.keys['shift'], timer: 15 };
            eng.lastPathCalc = Date.now();
          }
        }
      } else if (e.button === 2) {
        e.preventDefault();

        if (eng.pathEditMode) {
            let targetPoint = null;
            if (eng.mouseWorldPos) {
                targetPoint = { x: eng.mouseWorldPos.x, y: eng.mouseWorldPos.y };
            } else {
                const mapPos = eng.getMapWorldPosFromScreen(e.clientX, e.clientY);
                if (mapPos) targetPoint = { x: mapPos.x, y: mapPos.y };
            }

            if (targetPoint) {
                const waitTime = parseFloat(document.getElementById('path-edit-wait')?.value) || 0;
                const inputEl = document.getElementById(eng.pathEditInputId);
                if (inputEl) {
                    let current = inputEl.value.trim();
                    if (current && !current.endsWith(';')) current += '; ';
                    current += `${Math.round(targetPoint.x)},${Math.round(targetPoint.y)}`;
                    if (waitTime > 0) current += `; wait ${waitTime}`;
                    inputEl.value = current;

                    eng.mapPings = eng.mapPings || [];
                    eng.mapPings.push({ x: targetPoint.x, y: targetPoint.y, life: 1.0, color: '#e056fd' });
                    inputEl.dispatchEvent(new Event('input'));
                }
            }
            return;
        }

        if (eng.clientSettings.clickToMove && this.keys['mouse0'] && !eng.editMode) {
           this.keys[' '] = true;
           setTimeout(() => { this.keys[' '] = false; }, 100);
           return;
        }

        const mapPos = eng.getMapWorldPosFromScreen(e.clientX, e.clientY);
        if (mapPos) {
          const activeZoom = (eng.mapOverlay && eng.mapOverlay.active) ? eng.mapOverlay.zoom : (eng.clientSettings.minimapZoom || 8);
          const hitRadius = (15 * 32) / activeZoom; // Translates to ~15 screen pixels of tolerance

          const hitIndex = eng.waypoints.findIndex(wp => Math.hypot(wp.x - mapPos.x, wp.y - mapPos.y) < hitRadius);
          if (hitIndex !== -1) {
            eng.waypoints.splice(hitIndex, 1);
          } else {
            eng.waypoints.push({ x: mapPos.x, y: mapPos.y });
            if (!eng.mapPings) eng.mapPings = [];
            eng.mapPings.push({ x: mapPos.x, y: mapPos.y, life: 1.0, color: '#f1c40f' });
            if (eng.network) eng.network.sendMapPing({ x: mapPos.x, y: mapPos.y });
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
          let bestDist = Infinity;
          let bestRootX, bestRootY, bestRootZ;
          for (let dx = -32; dx <= 32; dx += 32) {
              for (let dy = -32; dy <= 32; dy += 32) {
                  for (let dz = 32; dz >= -96; dz -= 32) {
                      let tempX = eng.cursorGridPos.x + dx;
                      let tempY = eng.cursorGridPos.y + dy;
                      let tempZ = eng.cursorGridPos.z + dz;
                      let v = eng.mapManager.getVoxelAt(tempX, tempY, tempZ);
                      if (v && v.shape && (v.shape.includes('door') || v.shape.startsWith('arcade-box') || FURNITURE_REGISTRY[v.shape.replace('_open', '')])) {
                        let dist = Math.hypot(eng.mouseWorldPos.x - tempX, eng.mouseWorldPos.y - tempY);
                        if (dist < bestDist) {
                            bestDist = dist;
                            clickedVoxel = v;
                            bestRootX = tempX; bestRootY = tempY; bestRootZ = tempZ;
                        }
                      }
                  }
              }
          }
          if (clickedVoxel) {
              rootX = bestRootX; rootY = bestRootY; rootZ = bestRootZ;
          }
        }

        if (!clickedVoxel) {
          const rc = eng.getIsoRaycast(e.clientX, e.clientY);
          for (let dx = -32; dx <= 32; dx += 32) {
            for (let dy = -32; dy <= 32; dy += 32) {
              for (let dz = -96; dz <= 32; dz += 32) {
                let v = eng.mapManager.getVoxelAt(rc.gx * 32 + dx, rc.gy * 32 + dy, rc.z * 32 + dz);
                if (v && v.shape && (v.shape.includes('door') || v.shape.startsWith('arcade-box') || FURNITURE_REGISTRY[v.shape.replace('_open', '')])) {
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
            if (clickedVoxel.shape && clickedVoxel.shape.startsWith('arcade-box')) {
              clickedTarget = { type: 'arcade', x: rootX, y: rootY, z: rootZ, voxel: clickedVoxel };
            } else if (clickedVoxel.shape.includes('door')) {
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
                if (v && v.shape && v.shape.includes('door')) {
                  v.shape = isOp ? v.shape.replace('_open', '') : v.shape + '_open';
                  if (!isOp) v._openedAt = performance.now();
                  eng.mapManager.setVoxelAt(tx, ty, tz, v);

                  if (eng.doors) {
                      const doorObj = eng.doors.find(d => d.x === tx && d.y === ty && d.z === tz);
                      if (doorObj) {
                          doorObj.shape = v.shape;
                      } else {
                          eng.doors.push({ x: tx, y: ty, z: tz, shape: v.shape, tex: v.tex, color: v.color, dir: v.dir });
                      }
                  }

                  if (!isOp) {
                      eng.autoOpenedDoors.set(`${tx}_${ty}_${tz}`, { x: tx, y: ty, z: tz, timer: 3000 });
                  } else {
                      eng.autoOpenedDoors.delete(`${tx}_${ty}_${tz}`);
                  }
                }
              };
              toggleDoor(rootX, rootY, rootZ);
              return;
            } else if (FURNITURE_REGISTRY[clickedVoxel.shape.replace('_open', '')]) {
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
            const btnPlay = document.getElementById('ctx-btn-arcade-play');
            const btnEdit = document.getElementById('ctx-btn-arcade-edit');
            const btnPower = document.getElementById('ctx-btn-arcade-power');

            if (btnTrade) btnTrade.style.display = clickedTarget.type === 'player' ? 'block' : 'none';
            if (btnTalk) btnTalk.style.display = clickedTarget.type === 'npc' ? 'block' : 'none';
            if (btnPlay) btnPlay.style.display = clickedTarget.type === 'arcade' ? 'block' : 'none';

            const pName = eng.playerData.name ? eng.playerData.name.toLowerCase() : '';
            const isDev = eng.permissions?.dev?.includes('*') || eng.permissions?.dev?.includes(pName);

            if (btnEdit) btnEdit.style.display = (clickedTarget.type === 'arcade' && isDev) ? 'block' : 'none';
            if (btnPower) {
                btnPower.style.display = (clickedTarget.type === 'arcade' && isDev) ? 'block' : 'none';
                if (clickedTarget.type === 'arcade') {
                    btnPower.innerText = clickedTarget.voxel.powerState === 'off' ? 'Enable Power' : 'Disable Power';
                }
            }

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

      if (eng.clientSettings.clickToMove && !eng.editMode && this.keys['mouse0'] && !eng.isDraggingMinimap && !this.isDraggingCamera && !eng.targetingPower) {
         if (eng.mouseWorldPos) {
            const now = Date.now();
            if (!eng.lastPathCalc || now - eng.lastPathCalc > 250) {
                eng.lastPathCalc = now;
                eng.player.movePath = eng.physics.findPath(eng.player.x, eng.player.y, eng.player.z || 0, eng.mouseWorldPos.x, eng.mouseWorldPos.y);
            }
            eng.player.moveTarget = { x: eng.mouseWorldPos.x, y: eng.mouseWorldPos.y, sprint: !!this.keys['shift'], timer: 15 };
         }
      }

      if (eng.isDraggingMinimap) {
        eng.clientSettings.minimapX = e.clientX - eng.minimapDragOffset.x;
        eng.clientSettings.minimapY = e.clientY - eng.minimapDragOffset.y;
      }

      if (eng.isDraggingSelection && eng.cursorGridPos) {
        const isZMode = eng.input.isActionDown('buildDragSelect');

        let endPos = { x: eng.cursorGridPos.x, y: eng.cursorGridPos.y, z: eng.cursorGridPos.z };
        if (eng.selectionMode === 'build' && eng.cursorGridPos.hitExisting && eng.cursorGridPos.normal) {
           endPos.x += eng.cursorGridPos.normal.x * 32;
           endPos.y += eng.cursorGridPos.normal.y * 32;
           endPos.z += eng.cursorGridPos.normal.z * 32;
        }

        if (eng.selectionStart) {
          if (!eng.selectionEnd) eng.selectionEnd = { ...eng.selectionStart };

          if (isZMode) {
             eng.selectionEnd.z = endPos.z;
          } else {
             eng.selectionEnd.x = endPos.x;
             eng.selectionEnd.y = endPos.y;
          }
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
      this.keys['mouse' + e.button] = false;

      if (e.button === 0 && eng.isDraggingSelection) {
        if (eng.selectedTiles && eng.selectedTiles.length > 0) {
            this.performBuildSelection();
        }
        eng.isDraggingSelection = false;
        eng.selectionStart = null;
        eng.selectionEnd = null;
        eng.selectedTiles = [];
        if (eng.renderer) eng.renderer.needsVoxelUpdate = true;
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

  performBuildSelection() {
      const eng = this.engine;
      if (!eng.selectedTiles || eng.selectedTiles.length === 0) return;

      const activeSlot = document.querySelector('.hotbar-slot.active');
      const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
      const isDeleting = eng.selectionMode === 'delete';
      const isPicker = eng.selectionMode === 'pick';

      // Execute the picker logic
      if (isPicker) {
          const t = eng.selectedTiles[0];
          const clickedVoxel = eng.mapManager.getVoxelAt(t.x, t.y, t.z);
          if (clickedVoxel) {
              let matchTex = clickedVoxel.tex;
              if (matchTex === 'water_flow') { matchTex = 'water'; eng.editFluid = 'flow'; const fBtn = document.getElementById('build-fluid-btn'); if (fBtn) fBtn.innerText = 'Fluid State: FLOW'; }
              else if (matchTex === 'water') { eng.editFluid = 'still'; const fBtn = document.getElementById('build-fluid-btn'); if (fBtn) fBtn.innerText = 'Fluid State: STILL'; }
              const slots = document.querySelectorAll('#builder-hotbar .hotbar-slot');
              slots.forEach(s => {
                  if (s.dataset.tex === matchTex) {
                      slots.forEach(ss => ss.classList.remove('active'));
                      s.classList.add('active');
                      document.getElementById('build-fluid-btn').style.display = ['water', 'lava', 'acid'].includes(matchTex) ? 'block' : 'none';
                      const tabs = document.querySelectorAll('#builder-tabs-container button');
                      tabs.forEach(tab => { if (tab.innerText === s.dataset.cat) tab.click(); });
                  }
              });
              const pickedColor = clickedVoxel.color || '#ffffff';
              eng.buildColor = pickedColor;
              document.querySelectorAll('.shared-color-picker').forEach(cp => { cp.value = pickedColor; });

              let matchShape = clickedVoxel.shape || 'cube';
              let matchDir = 'n';
              let matchFlip = false;
              if (matchShape.startsWith('ramp_') || matchShape.startsWith('stair_')) { const parts = matchShape.split('_'); matchShape = parts[0]; matchDir = parts[1] || 'n'; }
              else if (matchShape.startsWith('door_') && !FURNITURE_REGISTRY[matchShape.replace('_open', '')]) { const parts = matchShape.split('_'); matchShape = 'door'; matchDir = parts[1] || 'n'; matchFlip = matchShape.includes('_flip') || clickedVoxel.shape.includes('_flip'); }
              else if (FURNITURE_REGISTRY[matchShape]) { matchDir = clickedVoxel.dir || 'n'; }
              else if (matchShape === 'decal') { matchDir = clickedVoxel.dir || 'n'; }
              else if (matchShape.endsWith('_player')) { const parts = matchShape.split('_'); matchShape = parts[0]; }

              eng.editShapeBase = matchShape; eng.editShapeDir = matchDir; eng.editShapeRelative = false; eng.editShapeFlip = matchFlip; eng.editShape = clickedVoxel.shape || 'cube';
              if (eng.editShape.includes('_open')) eng.editShape = eng.editShape.replace('_open', '');

              const shapeBtn = document.getElementById('build-shape-btn');
              const dirBtn = document.getElementById('build-dir-btn');
              const relBtn = document.getElementById('build-rel-btn');
              const flipBtn = document.getElementById('build-flip-btn');
              if (shapeBtn) {
                  if (shapeBtn.tagName === 'SELECT') {
                      if (!Array.from(shapeBtn.options).some(o => o.value === matchShape)) {
                          const opt = document.createElement('option'); opt.value = matchShape;
                          let disp = FURNITURE_REGISTRY[matchShape] ? FURNITURE_REGISTRY[matchShape].name : matchShape.replace(/_/g, ' ');
                          opt.innerText = 'SHAPE: ' + disp.toUpperCase(); shapeBtn.appendChild(opt);
                      }
                      shapeBtn.value = matchShape;
                  } else { shapeBtn.innerText = 'Shape: ' + matchShape.toUpperCase(); }
              }
              if (matchShape === 'door') {
                  if (dirBtn) dirBtn.style.display = 'block'; if (relBtn) relBtn.style.display = 'none';
                  if (flipBtn) { flipBtn.style.display = 'block'; flipBtn.style.background = matchFlip ? 'rgba(46, 204, 113, 0.2)' : 'transparent'; }
              } else if (FURNITURE_REGISTRY[matchShape]) {
                  if (dirBtn) dirBtn.style.display = 'block'; if (relBtn) relBtn.style.display = 'none'; if (flipBtn) flipBtn.style.display = 'none';
              } else if (matchShape === 'ramp' || matchShape === 'stair') {
                  if (dirBtn) dirBtn.style.display = 'block'; if (relBtn) relBtn.style.display = 'block'; if (flipBtn) flipBtn.style.display = 'none';
              } else {
                  if (dirBtn) dirBtn.style.display = 'none'; if (relBtn) relBtn.style.display = 'none'; if (flipBtn) flipBtn.style.display = 'none';
              }
              if (dirBtn) dirBtn.innerText = matchDir.toUpperCase(); if (relBtn) relBtn.style.background = 'transparent';
          }
          return;
      }

      // Execute Mass Place/Delete Logic
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

      let baseTex = tex;
      if (baseTex === 'water' && eng.editFluid === 'flow') baseTex = 'water_flow';

      const finalUVMode = eng.editShapeUV === 'auto' ? undefined : (eng.editShapeUV === 'mesh');
      const updates = [];
      const previousStates = [];

      eng.selectedTiles.forEach(tile => {
          const clickedVoxelOld = eng.mapManager.getVoxelAt(tile.x, tile.y, tile.z);
          previousStates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: clickedVoxelOld ? { ...clickedVoxelOld } : null });

          let finalTex = baseTex;
          if (tex === 'arcade-carpet') {
              const wx = Math.round(tile.x / 32); const wy = Math.round(tile.y / 32);
              const rx = ((wx % 2) + 2) % 2; const ry = ((wy % 2) + 2) % 2;
              finalTex = `arcade-carpet-${rx}-${ry}`;
          }

          if (isDeleting) {
              eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, null, false);
              updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: null });
          } else {
              eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir, useMeshUV: finalUVMode }, false);
              updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir, useMeshUV: finalUVMode } });
          }
      });

      eng.history = eng.history || [];
      if (previousStates.length > 0) eng.history.push(previousStates);
      if (eng.history.length > 30) eng.history.shift();
      eng.redoHistory = [];

      updates.forEach(u => eng.network.sendUpdateBlock(u));
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
