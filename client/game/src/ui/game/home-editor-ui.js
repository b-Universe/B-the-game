import { GUI_DEFAULT_POSITIONS } from './constants.js?v=cache-bust-005';

export class HomeEditorUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.setupUI();
  }

  setupUI() {
    let homeEditorContainer = document.getElementById('home-editor-container');
    if (!homeEditorContainer) {
      homeEditorContainer = document.createElement('div');
      homeEditorContainer.id = 'home-editor-container';
      homeEditorContainer.style.cssText = `position: absolute; top: ${GUI_DEFAULT_POSITIONS.homeEditor.top}; right: ${GUI_DEFAULT_POSITIONS.homeEditor.right}; left: ${GUI_DEFAULT_POSITIONS.homeEditor.left}; width: 220px; background: rgba(5, 7, 10, 0.85); border: 2px solid #9b59b6; border-radius: 6px; display: none; flex-direction: column; z-index: 1000; pointer-events: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5);`;

      homeEditorContainer.innerHTML = `
        <div id="home-editor-drag-handle" class="b-window-header dev-panel-header" style="display: flex; justify-content: space-between; align-items: center; cursor: move; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ffffff; font-family: var(--font-header); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px 4px 0 0;">
          <span>Home Editor</span>
          <button id="btn-minimize-home-editor" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0;">-</button>
        </div>
        <div id="home-editor-content" style="display: flex; flex-direction: column; gap: 6px; padding: 10px;">
          <button id="btn-home-edit-mode" class="b-btn btn-secondary" style="border-color: #ffffff; color: #ffffff;">Build Mode</button>
          <button id="btn-home-base-styles" class="b-btn btn-secondary" style="border-color: #ffffff; color: #ffffff;">Base Styles</button>
          <button id="btn-home-invite" class="b-btn btn-secondary" style="border-color: #ffffff; color: #ffffff;">Invite Guests</button>
          <button id="btn-home-lock" class="b-btn btn-secondary" style="border-color: #ffffff; color: #ffffff;">Change Lock</button>
          <button id="btn-home-save" class="b-btn btn-secondary" style="margin-top: 5px;">Save Blueprint</button>
          <button id="btn-home-kick-all" class="b-btn btn-secondary" style="margin-top: 5px;">Kick All Guests</button>
          <button id="btn-home-leave" class="b-btn btn-secondary" style="margin-top: 5px;">Leave Apartment</button>
        </div>
      `;

      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(homeEditorContainer);
      else document.body.appendChild(homeEditorContainer);

      this.ui.makeDraggable('home-editor-container', '#home-editor-drag-handle');

      const btnMinimize = document.getElementById('btn-minimize-home-editor');
      const content = document.getElementById('home-editor-content');
      if (btnMinimize && content) {
        btnMinimize.onclick = () => {
          if (content.style.display === 'none') {
            content.style.display = 'flex';
            btnMinimize.innerText = '-';
          } else {
            content.style.display = 'none';
            btnMinimize.innerText = '+';
          }
        };
      }

      this.selectedAptChunk = '1_1'; // Default center 3x3 grid

      this.refreshModal = () => {
        if (document.getElementById('base-styles-modal')?.style.display !== 'none') {
          if (this.renderVisualizer) this.renderVisualizer();
          if (this.loadDropdowns) this.loadDropdowns();
        }
      };

      const btnHomeEdit = document.getElementById('btn-home-edit-mode');
      if (btnHomeEdit) btnHomeEdit.onclick = () => { if (this.engine.chat && this.engine.chat.commandHandler) this.engine.chat.commandHandler.processCommand('/editmode'); };
      const btnHomeInvite = document.getElementById('btn-home-invite');
      if (btnHomeInvite) btnHomeInvite.onclick = () => { if (this.ui.playerList && this.ui.playerList.searchWindow.element.style.display === 'none') this.ui.playerList.togglePanel(); };

      const btnHomeBaseStyles = document.getElementById('btn-home-base-styles');
      if (btnHomeBaseStyles) {
        btnHomeBaseStyles.onclick = () => {
          const modal = document.getElementById('base-styles-modal');
          if (modal) {
            fetch('/api/audio/music').then(r => r.json()).then(tracks => {
              const select = document.getElementById('playlist-track-select');
              if (select) {
                const currentVal = select.value;
                select.innerHTML = tracks.map(t => {
                  const name = t.replace(/\.[^/.]+$/, "").split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return `<option value="${t}">${name}</option>`;
                }).join('');
                if (tracks.includes(currentVal)) select.value = currentVal;
              }
            }).catch(e => console.warn("Failed to fetch tracks:", e));

            this.selectedAptChunk = '1_1';

            this.renderVisualizer = () => {
              const zc = (this.engine.zonesConfig && this.engine.zonesConfig[this.engine.currentZone]) ? this.engine.zonesConfig[this.engine.currentZone] : {};
              const ownedChunks = zc.ownedChunks || ['1_1'];

              const pChunkX = Math.floor((this.engine.player.x / 32) / 32) || 1;
              const pChunkY = Math.floor((this.engine.player.y / 32) / 32) || 1;

              if (this.selectedAptChunk === '1_1' && pChunkX !== 1 && pChunkY !== 1 && ownedChunks.includes(`${pChunkX}_${pChunkY}`)) {
                this.selectedAptChunk = `${pChunkX}_${pChunkY}`;
              }

              const visContainer = document.getElementById('apt-chunk-visualizer');
              if (visContainer) {
                visContainer.innerHTML = '';
                let maxDist = 0;
                ownedChunks.forEach(c => {
                  const [cx, cy] = c.split('_').map(Number);
                  maxDist = Math.max(maxDist, Math.abs(cx - pChunkX), Math.abs(cy - pChunkY));
                });
                const gridRadius = maxDist > 1 ? 2 : 1;
                const gridSize = gridRadius * 2 + 1;
                const cellSize = gridRadius > 1 ? 28 : 32;
                visContainer.style.transition = 'grid-template-columns 0.3s ease, gap 0.3s ease';
                visContainer.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;

                for (let y = pChunkY - gridRadius; y <= pChunkY + gridRadius; y++) {
                  for (let x = pChunkX - gridRadius; x <= pChunkX + gridRadius; x++) {
                    if (x < 0 || y < 0 || x >= 95 || y >= 95) {
                      const spacer = document.createElement('div');
                      spacer.style.cssText = `width: 32px; height: 32px; background: transparent;`;
                      visContainer.appendChild(spacer);
                      continue;
                    }

                    const chunkKey = `${x}_${y}`;
                    const isOwned = ownedChunks.includes(chunkKey);
                    const btn = document.createElement('button');
                    btn.style.cssText = `width: ${cellSize}px; height: ${cellSize}px; border: 2px solid #333; cursor: pointer; transition: all 0.2s; border-radius: 2px; position: relative;`;

                    if (this.selectedAptChunk === chunkKey) btn.style.borderColor = '#f1c40f';

                    if (isOwned) {
                      btn.style.background = (this.selectedAptChunk === chunkKey || this.selectedAptChunk === 'all') ? 'rgba(52, 152, 219, 0.8)' : 'rgba(52, 152, 219, 0.3)';
                    } else {
                      btn.style.background = 'rgba(255, 255, 255, 0.05)';
                      if (this.selectedAptChunk === chunkKey) btn.style.background = 'rgba(255, 255, 255, 0.2)';
                    }

                    if (x === pChunkX && y === pChunkY) {
                      const dot = document.createElement('div');
                      dot.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: #2ecc71; border-radius: 50%; border: 1px solid #000; pointer-events: none;';
                      btn.appendChild(dot);
                    }

                    btn.onclick = () => { this.selectedAptChunk = chunkKey; this.renderVisualizer(); this.loadDropdowns(); };
                    visContainer.appendChild(btn);
                  }
                }
              }

              const btnAll = document.getElementById('btn-apt-select-all');
              if (btnAll) {
                btnAll.className = this.selectedAptChunk === 'all' ? 'b-btn btn-primary' : 'b-btn btn-secondary';
                btnAll.onclick = () => { this.selectedAptChunk = 'all'; this.renderVisualizer(); this.loadDropdowns(); };
              }
            };

            this.loadDropdowns = () => {
              const zc = (this.engine.zonesConfig && this.engine.zonesConfig[this.engine.currentZone]) ? this.engine.zonesConfig[this.engine.currentZone] : {};
              const ownedChunks = zc.ownedChunks || ['1_1'];
              const isSelectedOwned = this.selectedAptChunk === 'all' || ownedChunks.includes(this.selectedAptChunk);

              const settingsContainer = document.getElementById('apt-settings-container');
              const expandContainer = document.getElementById('apt-expand-container');
              const unexpandContainer = document.getElementById('apt-unexpand-container');

              if (isSelectedOwned) {
                settingsContainer.style.display = 'flex';
                expandContainer.style.display = 'none';

                if (unexpandContainer) {
                  if (this.selectedAptChunk !== 'all' && this.selectedAptChunk !== '1_1') {
                    unexpandContainer.style.display = 'flex';
                    const btnUnexpand = document.getElementById('btn-apt-unexpand');
                    btnUnexpand.onclick = () => {
                      const isOwnApt = this.engine.currentZone === `apt_${this.engine.playerData.name.toLowerCase()}`;
                      const msg = isOwnApt
                        ? `Are you sure you want to un-expand this chunk? $5,000 will be deposited to your bank vault, but all blocks inside will be permanently deleted!`
                        : `Are you sure you want to remove this chunk from this apartment? All blocks inside will be permanently deleted!`;
                      this.ui.showConfirmModal("Un-Expand Apartment", msg, () => {
                        if (this.engine.network) this.engine.network.socket.emit('apartment_unexpand', { chunk: this.selectedAptChunk });
                      });
                    };
                  } else {
                    unexpandContainer.style.display = 'none';
                  }
                }

                const baseStyle = zc.baseStyle || {};
                const chunkStyles = zc.chunkStyles || {};
                let cStyle = baseStyle;
                if (this.selectedAptChunk !== 'all') cStyle = chunkStyles[this.selectedAptChunk] || {};
                document.getElementById('base-style-floor').value = cStyle.floorTex || baseStyle.floorTex || 'concrete';
                document.getElementById('base-style-floor-color').value = cStyle.floorColor || baseStyle.floorColor || '#ffffff';
                document.getElementById('base-style-wall').value = cStyle.wallTex || baseStyle.wallTex || 'stone-bricks1';
                document.getElementById('base-style-wall-color').value = cStyle.wallColor || baseStyle.wallColor || '#ffffff';
                const playlistContainer = document.getElementById('playlist-container');
                if (playlistContainer) {
                  playlistContainer.innerHTML = '';
                  const tracks = (baseStyle.musicTrack || '').split(',').filter(t => t.trim() !== '');
                  tracks.forEach(t => { if (this.addPlaylistTrackToUI) this.addPlaylistTrackToUI(t); });
                }
                document.getElementById('base-style-music-mode').value = baseStyle.musicMode || 'ordered';
                document.getElementById('base-style-music-delay').value = baseStyle.musicDelay || 0;
                const volEl = document.getElementById('base-style-music-volume');
                if (volEl) volEl.value = baseStyle.musicVolume !== undefined ? baseStyle.musicVolume : 0.5;
                const volTextEl = document.getElementById('base-style-music-volume-text');
                if (volTextEl && volEl) volTextEl.innerText = `${Math.round(volEl.value * 100)}%`;
              } else {
                settingsContainer.style.display = 'none';
                expandContainer.style.display = 'flex';
                if (unexpandContainer) unexpandContainer.style.display = 'none';

                const btnExpand = document.getElementById('btn-apt-expand');
                const isOwnApt = this.engine.currentZone === `apt_${this.engine.playerData.name.toLowerCase()}`;
                const cost = isOwnApt ? 5000 : 0;
                
                if (ownedChunks.length >= 9025) {
                  btnExpand.innerText = 'Max Size Reached';
                  btnExpand.disabled = true;
                } else {
                  btnExpand.innerText = isOwnApt ? `Expand Apartment ($5,000)` : `Expand Apartment (Admin)`;
                  btnExpand.disabled = false;
                  btnExpand.onclick = () => {
                    const playerCurrency = this.engine.playerData.currency || 0;
                    if (playerCurrency < cost) {
                      this.ui.showSystemMessage(`You cannot afford this. You need $${cost.toLocaleString()}, but only have $${playerCurrency.toLocaleString()}.`);
                    } else {
                      const msg = isOwnApt
                        ? `Purchase this chunk for $5,000?`
                        : `Grant this chunk to this apartment?`;
                      this.ui.showConfirmModal("Expand Apartment", msg, () => {
                        if (this.engine.network) this.engine.network.socket.emit('apartment_expand', { chunk: this.selectedAptChunk });
                      });
                    }
                  };
                }
              }
            };

            this.renderVisualizer();
            this.loadDropdowns();
            modal.style.display = 'flex';
          }
        };
      }

      const btnHomeLock = document.getElementById('btn-home-lock');
      if (btnHomeLock) btnHomeLock.onclick = () => { if (this.engine.network) this.engine.network.sendApartmentToggleLock(); };

      const btnHomeKickAll = document.getElementById('btn-home-kick-all');
      if (btnHomeKickAll) {
        btnHomeKickAll.onclick = () => {
          this.ui.showConfirmModal("Kick All Guests", "Are you sure you want to kick all guests from your apartment? Administrators will not be affected.", () => {
            if (this.engine.network) this.engine.network.sendApartmentKickAll();
          });
        };
      }
      const btnHomeSave = document.getElementById('btn-home-save');
      if (btnHomeSave) {
        btnHomeSave.onclick = () => {
          if (this.engine.worldSerializer) {
            this.engine.worldSerializer.save(this.engine.currentZone);
            this.ui.showSystemMessage("Apartment blueprint saved successfully!");
          }
        };
      }
      const btnHomeLeave = document.getElementById('btn-home-leave');
      if (btnHomeLeave) btnHomeLeave.onclick = () => { if (this.engine.network) this.engine.network.socket.emit('leave_apartment'); };

      this.addPlaylistTrackToUI = (trackName) => {
        const playlistContainer = document.getElementById('playlist-container');
        if (!playlistContainer) return;
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.dataset.track = trackName;
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; color: #fff;';
        item.innerHTML = `<span>${trackName}</span><button class="btn-remove-track" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-weight: bold;">X</button>`;
        item.querySelector('.btn-remove-track').onclick = () => { item.remove(); if (this.debouncedUpdateBaseStyle) this.debouncedUpdateBaseStyle(); };
        playlistContainer.appendChild(item);
      };
    }

    let baseStylesModal = document.getElementById('base-styles-modal');
    if (!baseStylesModal) {
      baseStylesModal = document.createElement('div');
      baseStylesModal.id = 'base-styles-modal';
      baseStylesModal.className = 'b-window dev-panel';
      baseStylesModal.style.cssText = 'position: absolute; top: 150px; left: 150px; width: 350px; background: rgba(5, 7, 10, 0.85); border: 2px solid #3498db; border-radius: 6px; display: none; flex-direction: column; z-index: 1000; pointer-events: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5);';
      baseStylesModal.innerHTML = `
        <div id="base-styles-drag-handle" class="b-window-header dev-panel-header" style="display: flex; justify-content: space-between; align-items: center; cursor: move; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ffffff; font-family: var(--font-header); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px 4px 0 0;">
          <span>Base Styles</span>
          <button id="btn-close-base-style" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; line-height: 1;">&times;</button>
        </div>
        <div class="window-content" style="padding: 15px; display: flex; flex-direction: column; gap: 15px; text-align: left; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; flex-direction: column; align-items: center; margin-top: -5px;">
                <label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Apartment Layout (32x32 Chunks):</label>
                <div id="apt-chunk-visualizer" style="display: grid; grid-template-columns: repeat(5, 32px); gap: 2px; margin-top: 5px; justify-content: center; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 4px; border: 1px solid var(--text-dim);"></div>
            </div>
            <div id="apt-expand-container" style="display: none; flex-direction: column; align-items: center; margin-top: 5px;">
                <span style="color: #aaa; font-size: 0.85rem; margin-bottom: 5px;">This chunk is unowned.</span>
                <button id="btn-apt-expand" class="b-btn btn-secondary" style="width: 100%;">Expand ($5,000)</button>
            </div>
            <div id="apt-unexpand-container" style="display: none; flex-direction: column; align-items: center; margin-top: 5px; margin-bottom: 5px;">
                <button id="btn-apt-unexpand" class="b-btn b-btn-danger" style="width: 100%;">Un-Expand (Bank $5,000)</button>
            </div>
            <div id="apt-settings-container" style="display: flex; flex-direction: column; gap: 15px;">
                <button id="btn-apt-select-all" class="b-btn btn-primary" style="margin-top: -5px; font-size: 0.75rem; width: 100%;">Apply to All Chunks</button>
                <div><label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Floor Texture & Color:</label><div style="display: flex; gap: 5px; margin-top: 5px;"><select id="base-style-floor" class="b-select" style="flex: 1;"><option value="concrete">Concrete</option><option value="stone-bricks1">Stone Bricks</option><option value="wood-planks">Wood Planks</option><option value="carpet">Carpet</option><option value="grass">Grass</option><option value="sand">Sand</option><option value="dirt">Dirt</option><option value="stone">Stone</option><option value="ice">Ice</option><option value="mud1">Mud</option></select><input type="color" id="base-style-floor-color" value="#ffffff" style="width: 32px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;"></div></div>
                <div><label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Wall Texture & Color:</label><div style="display: flex; gap: 5px; margin-top: 5px;"><select id="base-style-wall" class="b-select" style="flex: 1;"><option value="stone-bricks1">Stone Bricks</option><option value="concrete">Concrete</option><option value="wood-planks">Wood Planks</option><option value="paint">Paint</option><option value="stone">Stone</option><option value="glass">Glass</option></select><input type="color" id="base-style-wall-color" value="#ffffff" style="width: 32px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;"></div></div>
                <div><label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Music Playlist:</label><div id="playlist-container" style="background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: 4px; padding: 5px; min-height: 32px; margin-top: 5px; display: flex; flex-direction: column; gap: 5px; max-height: 100px; overflow-y: auto;"></div><div style="display: flex; gap: 5px; margin-top: 5px;"><select id="playlist-track-select" class="b-select" style="flex: 1;"><option value="metallic-crackers.mp3">Metallic Crackers</option></select><button id="btn-preview-track" class="b-btn btn-secondary" title="Preview Track">▶</button><button id="btn-add-track" class="b-btn btn-secondary">Add</button></div></div>
                <div style="display: flex; gap: 10px;"><div style="flex: 1;"><label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Playback:</label><select id="base-style-music-mode" class="b-select" style="width: 100%; margin-top: 5px;"><option value="ordered">Ordered</option><option value="random">Shuffle</option></select></div><div style="flex: 1;"><label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Delay (sec):</label><input type="number" id="base-style-music-delay" class="b-input" style="width: 100%; margin-top: 5px;" value="0" placeholder="Neg = Crossfade"></div><div style="flex: 1;"><label style="color: #ccc; font-family: var(--font-mono); font-size: 0.85rem;">Volume: <span id="base-style-music-volume-text">50%</span></label><input type="range" id="base-style-music-volume" class="b-input" style="width: 100%; margin-top: 5px;" min="0" max="1" step="0.05" value="0.5"></div></div>
            </div>
        </div>
      `;
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(baseStylesModal);
      else document.body.appendChild(baseStylesModal);

      this.ui.makeDraggable('base-styles-modal', '#base-styles-drag-handle');

      const btnCloseBaseStyle = document.getElementById('btn-close-base-style');
      if (btnCloseBaseStyle) btnCloseBaseStyle.onclick = () => baseStylesModal.style.display = 'none';

      this.updateBaseStyle = () => {
        const f = document.getElementById('base-style-floor').value; const w = document.getElementById('base-style-wall').value;
        const fc = document.getElementById('base-style-floor-color').value; const wc = document.getElementById('base-style-wall-color').value;
        const m = document.getElementById('base-style-music-mode').value; const d = parseFloat(document.getElementById('base-style-music-delay').value) || 0;
        const vEl = document.getElementById('base-style-music-volume'); const v = vEl ? parseFloat(vEl.value) : 0.5;
        const t = []; document.querySelectorAll('.playlist-item').forEach(i => t.push(i.dataset.track)); const tr = t.join(',');

        if (!this.engine.zonesConfig) this.engine.zonesConfig = {};
        if (!this.engine.zonesConfig[this.engine.currentZone]) this.engine.zonesConfig[this.engine.currentZone] = {};

        const zc = this.engine.zonesConfig[this.engine.currentZone];
        const oldBaseStyle = zc.baseStyle ? JSON.parse(JSON.stringify(zc.baseStyle)) : {};
        const oldChunkStyles = zc.chunkStyles ? JSON.parse(JSON.stringify(zc.chunkStyles)) : {};

        if (!zc.baseStyle) zc.baseStyle = {};
        if (!zc.chunkStyles) zc.chunkStyles = {};

        if (this.selectedAptChunk === 'all') {
          zc.baseStyle.floorTex = f;
          zc.baseStyle.floorColor = fc;
          zc.baseStyle.wallTex = w;
          zc.baseStyle.wallColor = wc;
          for (const key in zc.chunkStyles) { delete zc.chunkStyles[key].floorTex; delete zc.chunkStyles[key].floorColor; delete zc.chunkStyles[key].wallTex; delete zc.chunkStyles[key].wallColor; }
        } else {
          if (!zc.chunkStyles[this.selectedAptChunk]) zc.chunkStyles[this.selectedAptChunk] = {};
          zc.chunkStyles[this.selectedAptChunk].floorTex = f;
          zc.chunkStyles[this.selectedAptChunk].floorColor = fc;
          zc.chunkStyles[this.selectedAptChunk].wallTex = w;
          zc.chunkStyles[this.selectedAptChunk].wallColor = wc;
        }

        zc.baseStyle.musicTrack = tr; zc.baseStyle.musicMode = m; zc.baseStyle.musicDelay = d; zc.baseStyle.musicVolume = v;

        let chunksUpdated = false;
        for (const [chunkKey, chunkMap] of this.engine.mapManager.chunks.entries()) {
          let chunkChanged = false;
          const [vx, vy] = chunkKey.split('_').map(Number);
          const blockChX = Math.floor(vx / 2); // Map 16x16 sub-chunk to 32x32 apt chunk
          const blockChY = Math.floor(vy / 2);
          const aptChunkKey = `${blockChX}_${blockChY}`;

          if (this.selectedAptChunk !== 'all' && aptChunkKey !== this.selectedAptChunk) continue;

          const oldCStyle = oldChunkStyles[aptChunkKey] || oldBaseStyle;
          const cOldFloor = oldCStyle.floorTex || oldBaseStyle.floorTex || 'concrete';
          const cOldWall = oldCStyle.wallTex || oldBaseStyle.wallTex || 'stone-bricks1';
          const newFloor = this.selectedAptChunk === 'all' ? f : (zc.chunkStyles[aptChunkKey]?.floorTex || zc.baseStyle.floorTex || f);
          const newWall = this.selectedAptChunk === 'all' ? w : (zc.chunkStyles[aptChunkKey]?.wallTex || zc.baseStyle.wallTex || w);
          const newFloorColor = this.selectedAptChunk === 'all' ? fc : (zc.chunkStyles[aptChunkKey]?.floorColor || zc.baseStyle.floorColor || fc);
          const newWallColor = this.selectedAptChunk === 'all' ? wc : (zc.chunkStyles[aptChunkKey]?.wallColor || zc.baseStyle.wallColor || wc);

          for (const [key, voxel] of chunkMap.entries()) {
            if (voxel.tex === cOldFloor) { voxel.tex = newFloor; voxel.color = newFloorColor; chunkChanged = true; }
            else if (voxel.tex === cOldWall) { voxel.tex = newWall; voxel.color = newWallColor; chunkChanged = true; }
          }
          if (chunkChanged) { chunksUpdated = true; if (this.engine.renderer) this.engine.renderer.updateChunkColumn(vx, vy, chunkMap, true); }
        }

        if (chunksUpdated && this.engine.renderer) {
          this.engine.mapManager.mapCacheDirty = true;
          this.engine.renderer.needsVoxelUpdate = true;
        }

        if (typeof this.engine.updateBGM === 'function') this.engine.updateBGM();
        if (this.engine.network) { this.engine.network.socket.emit('save_apartment_style', { baseStyle: zc.baseStyle, chunkStyles: zc.chunkStyles }); }
      };

      let debounceTimer;
      this.debouncedUpdateBaseStyle = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(this.updateBaseStyle, 500); };

      const floorEl = document.getElementById('base-style-floor');
      if (floorEl) floorEl.addEventListener('change', this.updateBaseStyle);
      const floorColorEl = document.getElementById('base-style-floor-color');
      if (floorColorEl) floorColorEl.addEventListener('change', this.updateBaseStyle);

      const wallEl = document.getElementById('base-style-wall');
      if (wallEl) wallEl.addEventListener('change', this.updateBaseStyle);
      const wallColorEl = document.getElementById('base-style-wall-color');
      if (wallColorEl) wallColorEl.addEventListener('change', this.updateBaseStyle);

      const modeEl = document.getElementById('base-style-music-mode');
      if (modeEl) modeEl.addEventListener('change', this.updateBaseStyle);

      const delayEl = document.getElementById('base-style-music-delay');
      if (delayEl) delayEl.addEventListener('input', this.debouncedUpdateBaseStyle);

      const volElConfig = document.getElementById('base-style-music-volume');
      if (volElConfig) {
        volElConfig.addEventListener('input', (e) => {
          const textEl = document.getElementById('base-style-music-volume-text');
          if (textEl) textEl.innerText = `${Math.round(e.target.value * 100)}%`;
          this.debouncedUpdateBaseStyle();
        });
      }

      const btnPreview = document.getElementById('btn-preview-track');
      let previewAudio = null;
      if (btnPreview) btnPreview.onclick = (e) => {
        const select = document.getElementById('playlist-track-select');
        if (!select) return;
        const btn = e.target;
        if (previewAudio && !previewAudio.paused) { previewAudio.pause(); previewAudio = null; btn.innerText = '▶'; btn.style.color = ''; }
        else {
          previewAudio = new Audio(`assets/audio/music/${select.value}`);
          const targetVol = parseFloat(localStorage.getItem('b_login_volume') || '0.3');
          previewAudio.volume = targetVol;
          previewAudio.play().catch(err => console.warn('Preview prevented', err));
          btn.innerText = '■';
          btn.style.color = '#e74c3c';
          previewAudio.onended = () => { btn.innerText = '▶'; btn.style.color = ''; };
        }
      };
    }
  }

  renderAptPerms() {
    const bList = document.getElementById('apt-perms-builders');
    const vList = document.getElementById('apt-perms-visitors');
    if (!bList || !vList) return;

    const currentAptZone = this.engine.currentZone;
    const zc = (this.engine.zonesConfig && this.engine.zonesConfig[currentAptZone]) ? this.engine.zonesConfig[currentAptZone] : {};
    const builders = zc.builders || [];
    const visitors = zc.visitors || [];

    const createRow = (name, type) => `<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 2px 5px; border-radius: 3px;"><span style="color: #fff;">${name}</span><button class="b-btn b-btn-danger" style="padding: 0 5px; font-size: 0.7rem;" onclick="window.currentGameEngine.network.sendApartmentToggle${type.charAt(0).toUpperCase() + type.slice(1)}('${name}'); setTimeout(() => window.currentGameEngine.ui.homeEditor.renderAptPerms(), 200);">X</button></div>`;
    bList.innerHTML = builders.length > 0 ? builders.map(b => createRow(b, 'builder')).join('') : '<div style="color: #888; text-align: center;">None</div>';
    vList.innerHTML = visitors.length > 0 ? visitors.map(v => createRow(v, 'visitor')).join('') : '<div style="color: #888; text-align: center;">None</div>';
  }

  update() {
    if (!this.engine.player) return;
    const pChunkX = Math.floor((this.engine.player.x / 32) / 32) || 1;
    const pChunkY = Math.floor((this.engine.player.y / 32) / 32) || 1;
    if (this._lastPChunkX !== pChunkX || this._lastPChunkY !== pChunkY) {
      this._lastPChunkX = pChunkX;
      this._lastPChunkY = pChunkY;
      const modal = document.getElementById('base-styles-modal');
      if (modal && modal.style.display !== 'none' && typeof this.renderVisualizer === 'function') {
        this.renderVisualizer();
      }
    }
  }
}
