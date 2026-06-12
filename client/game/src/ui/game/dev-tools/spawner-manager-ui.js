import { FURNITURE_REGISTRY } from '../registry.js?v=cache-bust-005';
import { UI_COLORS } from '../constants.js?v=cache-bust-005';

const DEFAULT_FACTIONS = ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'];
const NPC_ROW_STYLE = 'display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px;';

export class SpawnerManagerUI {
  constructor(engine, devToolsUI) {
    this.engine = engine;
    this.devTools = devToolsUI;
  }

  setupMobPacks() {
    this.engine.mobPacks = this.engine.mobPacks || {};
    this.selectedMobPack = null;

    const btnAdd = document.getElementById('btn-mp-add');
    if (btnAdd) {
      btnAdd.onclick = () => {
        const input = document.getElementById('mp-new-input');
        if (!input) return;
        const id = input.value.trim().replace(/[^a-zA-Z0-9- ]/g, '');
        if (id && !this.engine.mobPacks[id]) {
          const defaultPreset = { group: 'Civilian', intensityMin: 1, intensityMax: 5, weight: 10, spawns: [] };
          this.engine.mobPacks[id] = defaultPreset;
          this.engine.network.socket.emit('save_mob_pack', { id, data: defaultPreset });
          input.value = '';
          this.selectedMobPack = id;
          this.renderMobPacks();
        }
      };
    }

    document.getElementById('btn-mp-save').onclick = () => {
      if (!this.selectedMobPack) return;
      this.engine.network.socket.emit('save_mob_pack', { id: this.selectedMobPack, data: this.engine.mobPacks[this.selectedMobPack] });
      this.engine.ui.showSystemMessage(`Saved Encounter Preset: ${this.selectedMobPack}.`);
    };
  }

  renderMobPacks() {
    const packList = document.getElementById('mp-list');
    const entryList = document.getElementById('mp-entries-list');
    if (!packList || !entryList) return;

    packList.innerHTML = '';
    const packKeys = Object.keys(this.engine.mobPacks || {});
    if (!this.selectedMobPack && packKeys.length > 0) this.selectedMobPack = packKeys[0];

    packKeys.forEach(k => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 2px;';
      const btn = document.createElement('button');
      btn.className = 'b-btn ' + (this.selectedMobPack === k ? 'btn-primary' : 'btn-secondary');
      btn.style.cssText = 'flex: 1; text-align: left; padding: 5px; font-size: 0.85rem; border-color: var(--text-dim);';
      if (this.selectedMobPack === k) btn.style.borderColor = UI_COLORS.primary;
      btn.innerText = k;
      btn.onclick = () => { this.selectedMobPack = k; this.renderMobPacks(); };

      const editBtn = document.createElement('button');
      editBtn.className = 'b-btn btn-secondary';
      editBtn.style.cssText = `padding: 0 8px; font-size: 0.8rem; border-color: ${UI_COLORS.warning}; color: ${UI_COLORS.warning};`;
      editBtn.innerText = '✎';
      editBtn.onclick = () => {
        const newName = prompt('Enter new Encounter Preset ID:', k);
        if (newName && newName.trim() && newName !== k) {
          const safeName = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
          if (this.engine.mobPacks[safeName]) {
            this.engine.ui.showSystemMessage('A pack with that ID already exists.');
          } else {
            this.engine.mobPacks[safeName] = this.engine.mobPacks[k];
            delete this.engine.mobPacks[k];
            this.engine.network.socket.emit('delete_mob_pack', k);
            this.engine.network.socket.emit('save_mob_pack', { id: safeName, data: this.engine.mobPacks[safeName] });
            if (this.selectedMobPack === k) this.selectedMobPack = safeName;
            this.renderMobPacks();
          }
        }
      };

      const delBtn = document.createElement('button');
      delBtn.className = 'b-btn b-btn-danger';
      delBtn.style.cssText = 'padding: 0 8px; font-size: 0.8rem;';
      delBtn.innerText = 'X';
      delBtn.onclick = () => {
        if (confirm(`Delete Encounter Preset: ${k}?`)) {
          delete this.engine.mobPacks[k];
          this.engine.network.socket.emit('delete_mob_pack', k);
          if (this.selectedMobPack === k) this.selectedMobPack = null;
          this.renderMobPacks();
        }
      };
      row.appendChild(btn); row.appendChild(editBtn); row.appendChild(delBtn); packList.appendChild(row);
    });

    entryList.innerHTML = '';

    let groupOptions = '<option value="">-- Select Group --</option>';
    const groups = Object.keys(this.devTools.entityGroupsData || {}).sort();
    if (groups.length === 0) {
      DEFAULT_FACTIONS.forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
    } else {
      groups.forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
    }

    const bulkContainer = document.getElementById('mp-bulk-edit-container');

    if (this.selectedMobPack && this.engine.mobPacks[this.selectedMobPack]) {
      if (Array.isArray(this.engine.mobPacks[this.selectedMobPack])) {
          this.engine.mobPacks[this.selectedMobPack] = { group: 'Civilian', intensityMin: 1, intensityMax: 5, weight: 10, spawns: [] };
      }
      const preset = this.engine.mobPacks[this.selectedMobPack];

      if (bulkContainer) {
        bulkContainer.style.display = 'flex';
        bulkContainer.style.flexDirection = 'column';
        bulkContainer.style.gap = '10px';
        bulkContainer.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.5); padding: 8px; border: 1px solid var(--text-dim); border-radius: 4px;">
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <label class="b-label" style="font-size: 0.75rem;">Faction</label>
                    <select id="mp-preset-group" class="b-select">${groupOptions}</select>
                </div>
                <div style="display: flex; flex-direction: column; width: 60px;">
                    <label class="b-label" style="font-size: 0.75rem;">Int Min</label>
                    <input type="number" id="mp-preset-int-min" class="b-input" value="${preset.intensityMin || 1}">
                </div>
                <div style="display: flex; flex-direction: column; width: 60px;">
                    <label class="b-label" style="font-size: 0.75rem;">Int Max</label>
                    <input type="number" id="mp-preset-int-max" class="b-input" value="${preset.intensityMax || 5}">
                </div>
                <div style="display: flex; flex-direction: column; width: 60px;">
                    <label class="b-label" style="font-size: 0.75rem;">Weight</label>
                    <input type="number" id="mp-preset-weight" class="b-input" value="${preset.weight || 10}">
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${UI_COLORS.warning}; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem;">Encounter Spawns</span>
                <button id="btn-mp-add-spawn" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem; border-color: ${UI_COLORS.success}; color: ${UI_COLORS.success};">+ Add NPC</button>
            </div>
        `;

        document.getElementById('mp-preset-group').value = preset.group || 'Civilian';
        document.getElementById('mp-preset-group').onchange = (e) => preset.group = e.target.value;
        document.getElementById('mp-preset-int-min').oninput = (e) => preset.intensityMin = parseInt(e.target.value, 10) || 1;
        document.getElementById('mp-preset-int-max').oninput = (e) => preset.intensityMax = parseInt(e.target.value, 10) || 5;
        document.getElementById('mp-preset-weight').oninput = (e) => preset.weight = parseInt(e.target.value, 10) || 10;

        document.getElementById('btn-mp-add-spawn').onclick = () => {
            if (!preset.spawns) preset.spawns = [];
            preset.spawns.push({ templateId: '', minCount: 1, maxCount: 3 });
            this.renderMobPacks();
        };
      }

      entryList.innerHTML = '';
      let templateOptions = '<option value="">-- Select NPC Template --</option>';
      Object.keys(this.engine.npcTemplates || {}).sort().forEach(t => templateOptions += `<option value="${t}">${t}</option>`);

      (preset.spawns || []).forEach((spawn, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 4px; padding: 8px; display: flex; gap: 10px; align-items: center;';
        row.innerHTML = `
            <div style="flex: 2; display: flex; flex-direction: column;">
                <label class="b-label" style="font-size: 0.7rem;">NPC Template</label>
                <select class="b-select mp-spawn-template" style="padding: 2px;">${templateOptions}</select>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column;">
                <label class="b-label" style="font-size: 0.7rem;">Min</label>
                <input type="number" class="b-input mp-spawn-min" value="${spawn.minCount}" min="0">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column;">
                <label class="b-label" style="font-size: 0.7rem;">Max</label>
                <input type="number" class="b-input mp-spawn-max" value="${spawn.maxCount}" min="1">
            </div>
            <button class="b-btn b-btn-danger mp-spawn-del" style="padding: 0 8px; margin-top: 15px;">X</button>
        `;
        row.querySelector('.mp-spawn-template').value = spawn.templateId || '';
        row.querySelector('.mp-spawn-template').onchange = (e) => spawn.templateId = e.target.value;
        row.querySelector('.mp-spawn-min').oninput = (e) => spawn.minCount = parseInt(e.target.value, 10) || 0;
        row.querySelector('.mp-spawn-max').oninput = (e) => spawn.maxCount = parseInt(e.target.value, 10) || 1;
        row.querySelector('.mp-spawn-del').onclick = () => { preset.spawns.splice(idx, 1); this.renderMobPacks(); };
        entryList.appendChild(row);
      });
    } else {
        if (bulkContainer) bulkContainer.innerHTML = '';
        entryList.innerHTML = '<div style="text-align: center; color: var(--text-dim); font-size: 0.85rem;">Select an Encounter Preset.</div>';
    }
  }

  renderSpawnerManager() {
    const list = document.getElementById('spawner-manager-list');

    ['edit-spawner-mobpack', 'edit-spawner-max', 'edit-spawner-npcname', 'edit-spawner-group', 'edit-spawner-type', 'edit-spawner-lvlmin', 'edit-spawner-lvlmax', 'edit-spawner-strength', 'edit-spawner-aggro', 'edit-spawner-powers'].forEach(id => {
       const el = document.getElementById(id);
       if (el && el.parentElement) el.parentElement.style.display = 'none';
    });

    if (!list) return;
    list.innerHTML = '';

    const btnCreate = document.createElement('button');
    btnCreate.className = 'b-btn btn-primary';
    btnCreate.style.cssText = 'width: 100%; margin-bottom: 10px; padding: 10px; font-weight: bold;';
    btnCreate.innerText = '+ Create New Spawner Here';
    btnCreate.onclick = () => {
      this.engine.network.sendCreateSpawner({ x: this.engine.player.x, y: this.engine.player.y, z: this.engine.player.z || 0 });
    };
    list.appendChild(btnCreate);

    if (!this.engine.spawners || this.engine.spawners.length === 0) return;

    this.engine.spawners.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = NPC_ROW_STYLE; // Reuse same style
      row.innerHTML = `
        <button class="btn-edit btn-secondary" style="width: auto; height: auto; padding: 5px; border-color: ${UI_COLORS.orange}; color: ${UI_COLORS.orange}; font-weight: bold; margin-right: 5px; font-size: 0.9rem;">✎</button>
        <div style="flex: 1.5; font-weight: bold; color: ${UI_COLORS.success};">${s.name}</div>
        <div style="flex: 1.5; display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 0.85rem;">
          <span>X:${Math.round(s.x)} Y:${Math.round(s.y)} Z:${Math.round(s.z || 0)}</span>
          <button class="btn-tp btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; width: auto; height: auto;">TP</button>
        </div>
        <div style="flex: 1.5; font-family: var(--font-mono); font-size: 0.85rem; color: #aaa;">Radius: ${s.radius}m</div>
        <button class="btn-del btn-secondary" style="width: auto; height: auto; padding: 5px 10px; border-color: ${UI_COLORS.critical}; color: ${UI_COLORS.critical}; font-weight: bold;">X</button>
      `;
      row.querySelector('.btn-edit').onclick = () => {
        document.getElementById('edit-spawner-uuid').value = s.uuid;
        document.getElementById('edit-spawner-name').value = s.name;
        document.getElementById('edit-spawner-x').value = Math.round(s.x);
        document.getElementById('edit-spawner-y').value = Math.round(s.y);
        document.getElementById('edit-spawner-z').value = Math.round(s.z || 0);
        document.getElementById('edit-spawner-radius').value = Math.round(s.radius);
        document.getElementById('edit-spawner-rate').value = Math.round(s.respawnRate);
        document.getElementById('edit-spawner-patrol').value = s.patrolRoute || '';

        this.updateSpawnerEditNpcList(s.uuid);

        this.devTools.spawnerEditWindow.open();
      };
      row.querySelector('.btn-tp').onclick = () => { this.engine.player.x = s.x; this.engine.player.y = s.y; this.engine.camera.x = s.x; this.engine.camera.y = s.y; };
      row.querySelector('.btn-del').onclick = () => { if (confirm(`Delete Spawner: ${s.name}?`)) this.engine.network.sendDeleteSpawner(s.uuid); };
      list.appendChild(row);
    });
  }

  updateSpawnerEditNpcList(uuid = null) {
    if (!uuid) uuid = document.getElementById('edit-spawner-uuid').value;
    const npcListEl = document.getElementById('edit-spawner-npc-list');
    if (!uuid || !npcListEl) return;

    npcListEl.innerHTML = '';
    const spawnerNpcs = this.engine.npcs.filter(n => n.spawnerUuid === uuid);
    if (spawnerNpcs.length > 0) {
      spawnerNpcs.forEach(npc => {
        const r = document.createElement('div');
        r.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 3px; margin-bottom: 2px;';
        r.innerHTML = `<span style="color: #fff; font-weight: bold;">${npc.name} <span style="color:#aaa; font-size:0.75rem;">(Lv.${npc.level || 1})</span></span>
                             <button class="b-btn btn-secondary btn-edit-spawner-npc" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.pink}; color: ${UI_COLORS.pink};">✎ Edit</button>`;
        r.querySelector('.btn-edit-spawner-npc').onclick = () => {
          this.engine.selectedTarget = { type: 'npc', id: npc.uuid };
          const editTargetBtn = document.getElementById('btn-dev-edit-target');
          if (editTargetBtn) editTargetBtn.click();
        };
        npcListEl.appendChild(r);
      });
    } else {
      npcListEl.innerHTML = '<div style="text-align: center; color: #888; font-style: italic;">No active NPCs spawned.</div>';
    }
  }
}
