import { FURNITURE_REGISTRY } from '../registry.js?v=cache-bust-005';
import { UI_COLORS } from '../constants.js?v=cache-bust-005';

const DEFAULT_FACTIONS = ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'];

export class WorldManagerUI {
  constructor(engine, devToolsUI) {
    this.engine = engine;
    this.devTools = devToolsUI;
  }

  setupZoneManager() {
    const eng = this.engine;
    document.getElementById('btn-zm-create').onclick = async () => {
      const input = document.getElementById('zm-new-zone-input');
      const newZone = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (!newZone) return;

      try {
        const res = await fetch('/api/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zone: newZone })
        });
        if (res.ok) {
          input.value = '';
          this.renderZoneManager();
        } else {
          eng.ui.showSystemMessage('Failed to create zone.');
        }
      } catch (e) {
        console.error(e);
      }
    };
  }

  setupNeighborhoodManager() {
    const eng = this.engine;

    document.getElementById('btn-new-nh').onclick = () => {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal('edit-nh-id', '');
      setVal('edit-nh-name', '');
      setVal('edit-nh-level', 1);
      setVal('edit-nh-intensity', 1);
      ['minx', 'miny', 'minz', 'maxx', 'maxy', 'maxz'].forEach(k => setVal(`edit-nh-${k}`, ''));
      this.currentNeighborhoodFactions = [];
      this.renderNeighborhoodFactions();
    };

    const btnAddFw = document.getElementById('btn-nh-add-faction');
    if (btnAddFw) btnAddFw.onclick = () => {
      this.currentNeighborhoodFactions = this.currentNeighborhoodFactions || [];
      this.currentNeighborhoodFactions.push({ faction: 'Civilian', weight: 0 });
      this.renderNeighborhoodFactions();
    };

    document.getElementById('btn-nh-set-min').onclick = () => {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal('edit-nh-minx', Math.round(eng.player.x));
      setVal('edit-nh-miny', Math.round(eng.player.y));
      setVal('edit-nh-minz', Math.round(eng.player.z || 0));
    };

    document.getElementById('btn-nh-set-max').onclick = () => {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal('edit-nh-maxx', Math.round(eng.player.x));
      setVal('edit-nh-maxy', Math.round(eng.player.y));
      setVal('edit-nh-maxz', Math.round(eng.player.z || 0));
    };

    const btnSaveNh = document.getElementById('btn-save-nh');
    if (btnSaveNh) {
      btnSaveNh.onclick = () => {
        const idEl = document.getElementById('edit-nh-id');
        if (!idEl) return;

        const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : null; };

        const payload = {
          id: idEl.value || ('nh_' + Math.random().toString(36).substr(2, 9)),
          zone: eng.currentZone || 'untitled',
          name: getVal('edit-nh-name')?.trim() || 'Unnamed Neighborhood',
          baseLevel: parseInt(getVal('edit-nh-level'), 10) || 1,
          intensity: parseInt(getVal('edit-nh-intensity'), 10) || 1,
          factionWeights: this.currentNeighborhoodFactions ? JSON.parse(JSON.stringify(this.currentNeighborhoodFactions)) : [],
          bounds: {
            minX: parseFloat(getVal('edit-nh-minx')) || 0,
            minY: parseFloat(getVal('edit-nh-miny')) || 0,
            minZ: parseFloat(getVal('edit-nh-minz')) || 0,
            maxX: parseFloat(getVal('edit-nh-maxx')) || 0,
            maxY: parseFloat(getVal('edit-nh-maxy')) || 0,
            maxZ: parseFloat(getVal('edit-nh-maxz')) || 0
          }
        };
        eng.network.socket.emit('save_neighborhood', payload);

        if (!eng.neighborhoods) eng.neighborhoods = [];
        if (Array.isArray(eng.neighborhoods)) {
          const idx = eng.neighborhoods.findIndex(n => n.id === payload.id);
          if (idx !== -1) eng.neighborhoods[idx] = payload;
          else eng.neighborhoods.push(payload);
        } else {
          eng.neighborhoods[payload.id] = payload;
        }
        this.renderNeighborhoodManager();
        eng.ui.showSystemMessage('Neighborhood saved.');
      };
    }
  }

  renderNeighborhoodFactions() {
    const list = document.getElementById('nh-factions-list');
    const totalSpan = document.getElementById('nh-faction-total');
    if (!list || !totalSpan) return;
    list.innerHTML = '';
    let total = 0;
    let groupOptions = '';
    const groups = Object.keys(this.devTools.entityGroupsData || {}).sort();
    if (groups.length === 0) {
      DEFAULT_FACTIONS.forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
    } else {
      groups.forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
    }
    (this.currentNeighborhoodFactions || []).forEach((fw, idx) => {
      total += (fw.weight || 0);
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 5px; align-items: center;';
      row.innerHTML = `
              <select class="b-select nh-fw-faction" style="flex: 2; font-size: 0.8rem; padding: 2px;">${groupOptions}</select>
              <input type="number" class="b-input nh-fw-weight" value="${fw.weight}" style="flex: 1; font-size: 0.8rem; padding: 2px;" min="0" max="100">
              <span style="color: var(--text-dim); font-size: 0.8rem;">%</span>
              <button class="b-btn b-btn-danger btn-nh-fw-del" style="padding: 2px 8px; font-size: 0.8rem;">X</button>
          `;
      row.querySelector('.nh-fw-faction').value = fw.faction || '';
      row.querySelector('.nh-fw-faction').onchange = (e) => { fw.faction = e.target.value; };
      row.querySelector('.nh-fw-weight').oninput = (e) => {
        e.stopPropagation(); // Prevent external handlers from breaking focus!
        fw.weight = parseInt(e.target.value, 10) || 0;
        let newTotal = 0;
        (this.currentNeighborhoodFactions || []).forEach(f => newTotal += (f.weight || 0));
        if (totalSpan) {
          totalSpan.innerText = newTotal;
          totalSpan.style.color = newTotal === 100 ? UI_COLORS.success : UI_COLORS.error;
        }
      };
          row.querySelector('.btn-nh-fw-del').onclick = () => { this.currentNeighborhoodFactions.splice(idx, 1); this.renderNeighborhoodFactions(); };
      list.appendChild(row);
    });
    totalSpan.innerText = total;
    totalSpan.style.color = total === 100 ? UI_COLORS.success : UI_COLORS.error;
  }

  renderNeighborhoodManager() {
    const list = document.getElementById('nh-manager-list');
    if (!list) return;
    list.innerHTML = '';

    let nhList = this.engine.neighborhoods;
    if (nhList && !Array.isArray(nhList)) nhList = Object.values(nhList);

    if (!nhList || nhList.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-dim); font-style: italic;">No neighborhoods in this zone.</div>';
      return;
    }

    nhList.forEach(nh => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 3px; font-size: 0.85rem;';
      row.innerHTML = `
              <span style="color: #fff; font-weight: bold;">${nh.name} <span style="color:#aaa; font-size:0.75rem;">(Lv.${nh.baseLevel} / Int.${nh.intensity})</span></span>
              <div>
              <button class="b-btn btn-secondary btn-dup-nh" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary};" title="Duplicate">⧉ Dup</button>
              <button class="b-btn btn-secondary btn-edit-nh" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.pink}; color: ${UI_COLORS.pink};">✎ Edit</button>
              <button class="b-btn btn-danger btn-del-nh" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.error}; color: ${UI_COLORS.error};">X</button>
              </div>
          `;
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      row.querySelector('.btn-dup-nh').onclick = () => {
        this.currentNeighborhoodFactions = nh.factionWeights ? JSON.parse(JSON.stringify(nh.factionWeights)) : [];
        this.renderNeighborhoodFactions();
        setVal('edit-nh-id', '');
        setVal('edit-nh-name', nh.name + ' (Copy)');
        setVal('edit-nh-level', nh.baseLevel);
        setVal('edit-nh-intensity', nh.intensity);
        if (nh.bounds) { ['minX', 'minY', 'minZ', 'maxX', 'maxY', 'maxZ'].forEach(k => setVal(`edit-nh-${k.toLowerCase()}`, nh.bounds[k])); }
        this.engine.ui.showSystemMessage('Neighborhood duplicated in editor. Click Save to commit as a new record.');
      };
      row.querySelector('.btn-edit-nh').onclick = () => {
        this.currentNeighborhoodFactions = nh.factionWeights ? JSON.parse(JSON.stringify(nh.factionWeights)) : [];
        this.renderNeighborhoodFactions();
        setVal('edit-nh-id', nh.id);
        setVal('edit-nh-name', nh.name);
        setVal('edit-nh-level', nh.baseLevel);
        setVal('edit-nh-intensity', nh.intensity);
        if (nh.bounds) { ['minX', 'minY', 'minZ', 'maxX', 'maxY', 'maxZ'].forEach(k => setVal(`edit-nh-${k.toLowerCase()}`, nh.bounds[k])); }
      };
      row.querySelector('.btn-del-nh').onclick = () => {
        if (confirm(`Delete Neighborhood: ${nh.name}?`)) {
          this.engine.network.socket.emit('delete_neighborhood', nh.id);
          if (Array.isArray(this.engine.neighborhoods)) {
            this.engine.neighborhoods = this.engine.neighborhoods.filter(n => n.id !== nh.id);
          } else {
            delete this.engine.neighborhoods[nh.id];
          }
          this.renderNeighborhoodManager();
        }
      };
      list.appendChild(row);
    });
  }

  async renderZoneManager() {
    const list = document.getElementById('zone-manager-list');
    if (!list) return;

    try {
      const res = await fetch('/api/zones');
      if (res.ok) {
        const data = await res.json();
        list.innerHTML = '';

        if (!data.zones || data.zones.length === 0) {
          list.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 10px;">No zones available.</div>';
          return;
        }

        data.zones.forEach(zone => {
          const isActive = this.engine.currentZone === zone;
          const row = document.createElement('div');
        row.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid ${isActive ? UI_COLORS.success : 'var(--text-dim)'}; border-radius: 4px;`;

          row.innerHTML = `
          <span style="color: ${isActive ? UI_COLORS.success : '#fff'}; font-weight: ${isActive ? 'bold' : 'normal'}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${zone} ${isActive ? '(Active)' : ''}</span>
          <button class="b-btn btn-apply-zone" data-zone="${zone}" style="padding: 4px 8px; font-size: 0.8rem; border-color: ${UI_COLORS.warning}; color: ${UI_COLORS.warning};">Load</button>
          `;

          row.querySelector('.btn-apply-zone').onclick = () => {
            this.engine.chat.commandHandler.processCommand('/applymap ' + zone);
            this.devTools.zoneManagerWindow.close();
          };

          list.appendChild(row);
        });
      }
    } catch (e) {
      console.error('Failed to load zones:', e);
      list.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 10px;">Error loading zones.</div>';
    }
  }

  setupArcadeManager() {
    document.getElementById('btn-save-arcade-edit').onclick = () => {
      if (!this.devTools.currentEditCabinet) return;
      const nameEl = document.getElementById('edit-arcade-name');
      const xEl = document.getElementById('edit-arcade-x');
      const yEl = document.getElementById('edit-arcade-y');
      const zEl = document.getElementById('edit-arcade-z');
      if (!nameEl || !xEl || !yEl || !zEl) return; // Prevent crashes if elements aren't rendered!

      const updatedVoxel = {
        ...this.devTools.currentEditCabinet.voxel,
        customName: nameEl.value.trim(),
        gameId: document.getElementById('edit-arcade-game')?.value || 'pixel',
        powerState: document.getElementById('edit-arcade-power')?.value || 'on'
      };
      const nX = parseInt(xEl.value, 10), nY = parseInt(yEl.value, 10), nZ = parseInt(zEl.value, 10);
      if (nX !== this.devTools.currentEditCabinet.wx || nY !== this.devTools.currentEditCabinet.wy || nZ !== this.devTools.currentEditCabinet.wz) {
        this.engine.mapManager.setVoxelAt(this.devTools.currentEditCabinet.wx, this.devTools.currentEditCabinet.wy, this.devTools.currentEditCabinet.wz, null, true);
      }
      this.engine.mapManager.setVoxelAt(nX, nY, nZ, updatedVoxel, true);
      this.devTools.arcadeEditWindow.close();
      this.renderArcadeManager();
      this.engine.ui.showSystemMessage('Arcade Cabinet updated.');
    };
  }

  renderArcadeManager() {
    const list = document.getElementById('arcade-manager-list');
    if (!list) return;
    list.innerHTML = '';

    const cabinets = [];
    if (this.engine.mapManager && this.engine.mapManager.chunks) {
      for (const [chunkKey, chunk] of this.engine.mapManager.chunks) {
        for (const [voxelKey, voxel] of chunk) {
          if (voxel && voxel.shape === 'arcade-box-1') {
            const parts = voxelKey.split('_').map(Number);
            const wx = parts[0] * 32;
            const wy = parts[1] * 32;
            const wz = parts[2] * 32;
            cabinets.push({ wx, wy, wz, voxel });
          }
        }
      }
    }

    if (cabinets.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 10px;">No arcade cabinets found in this zone.</div>';
      return;
    }

    const availableGames = [
      { id: 'pixel', name: 'Pixel (Platformer)' },
      { id: 'pong', name: 'Bonk (Retro)' },
      { id: 'invaders', name: 'Space Invaders' },
      { id: 'b-man', name: 'B-Man' },
      { id: 'flappy-bee', name: 'Flappy Bee' },
      { id: 'pixel-cross', name: 'Pixel-Cross' },
      { id: 'bepis', name: 'Bepis' },
      { id: 'operius', name: 'Operius' },
      { id: 'number-munchers', name: 'Num Munchers' }
    ];

    const lbContainer = document.getElementById('arcade-manager-leaderboard');
    if (lbContainer) {
      lbContainer.innerHTML = '';
      const scores = this.engine.arcadeScores || {};
      if (Object.keys(scores).length === 0) {
        lbContainer.innerHTML = '<span style="color: var(--text-dim);">No high scores recorded yet.</span>';
      } else {
        availableGames.forEach(g => {
          const s = scores[g.id];
          if (s) {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 2px;';
          row.innerHTML = `<span style="color: #fff;">${g.name}</span> <span style="color: ${UI_COLORS.warning};">${s.score} <span style="color: #7f8c8d; font-size: 0.7rem;">by ${s.player}</span></span>`;
            lbContainer.appendChild(row);
          }
        });
      }
    }

    cabinets.forEach((cab, index) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: 4px; gap: 10px;';

      const currentGame = cab.voxel.gameId || 'pixel';
      const currentPower = cab.voxel.powerState || 'on';
      const gameName = availableGames.find(g => g.id === currentGame)?.name || currentGame;
      const statusDot = currentPower === 'on' ? '🟢' : '🔴';
      const displayName = cab.voxel.customName ? `"${cab.voxel.customName}"` : `Cabinet #${index + 1}`;

      row.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
                  <span style="color: #fff; font-weight: bold; font-size: 0.85rem;">${displayName} <span style="font-size: 0.7rem; color: #aaa;">${statusDot} ${gameName}</span></span>
                  <span style="color: #aaa; font-family: var(--font-mono); font-size: 0.75rem;">X:${cab.wx} Y:${cab.wy} Z:${cab.wz}</span>
              </div>
              <div style="display: flex; gap: 5px;">
              <button class="btn-tp-arcade b-btn" style="padding: 4px 8px; font-size: 0.8rem; border-color: ${UI_COLORS.orange}; color: ${UI_COLORS.orange};" title="Teleport to Cabinet">TP</button>
              <button class="btn-edit-arcade b-btn" style="padding: 4px 8px; font-size: 0.8rem; border-color: ${UI_COLORS.pink}; color: ${UI_COLORS.pink};" title="Edit Cabinet">✎</button>
                  <button class="btn-del-arcade b-btn b-btn-danger" style="padding: 4px 8px; font-size: 0.8rem;" title="Delete Cabinet">X</button>
              </div>
          `;

      row.querySelector('.btn-tp-arcade').onclick = () => {
        let offsetX = 0, offsetY = 0;
        if (cab.voxel.dir === 'n') offsetY = -32;
        else if (cab.voxel.dir === 's') offsetY = 32;
        else if (cab.voxel.dir === 'e') offsetX = 32;
        else if (cab.voxel.dir === 'w') offsetX = -32;
        else { offsetY = 32; }
        this.engine.player.x = cab.wx + offsetX;
        this.engine.player.y = cab.wy + offsetY;
        this.engine.player.z = this.engine.physics ? this.engine.physics.getTerrainZ(this.engine.player.x, this.engine.player.y) : cab.wz;
        this.engine.camera.x = this.engine.player.x;
        this.engine.camera.y = this.engine.player.y;
      };

      row.querySelector('.btn-edit-arcade').onclick = () => {
        this.devTools.currentEditCabinet = cab;
        document.getElementById('edit-arcade-name').value = cab.voxel.customName || '';
        document.getElementById('edit-arcade-game').value = currentGame;
        document.getElementById('edit-arcade-power').value = currentPower;
        document.getElementById('edit-arcade-x').value = cab.wx;
        document.getElementById('edit-arcade-y').value = cab.wy;
        document.getElementById('edit-arcade-z').value = cab.wz;
        document.getElementById('edit-arcade-zone').value = this.engine.currentZone || 'untitled';
        this.devTools.arcadeEditWindow.open();
      };

      row.querySelector('.btn-del-arcade').onclick = () => {
        if (confirm(`Are you sure you want to permanently delete Arcade Cabinet #${index + 1}?`)) {
          this.engine.mapManager.setVoxelAt(cab.wx, cab.wy, cab.wz, null, true);
          this.renderArcadeManager();
          this.engine.ui.showSystemMessage(`Arcade Cabinet #${index + 1} deleted.`);
        }
      };

      list.appendChild(row);
    });
  }
}
