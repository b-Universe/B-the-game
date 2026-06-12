import { FURNITURE_REGISTRY } from '../registry.js?v=cache-bust-005';
import { UI_COLORS } from '../constants.js?v=cache-bust-005';

const DEFAULT_FACTIONS = ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'];
const NPC_ROW_STYLE = 'display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px;';

export class NpcUIManager {
  constructor(engine, devToolsUI) {
    this.engine = engine;
    this.devTools = devToolsUI;

    this.presetContainers = [];
  }

  setupEntityTypes() {
    this.engine.entityTypes = this.engine.entityTypes || {};
    this.selectedEntityType = null;

    const btnAdd = document.getElementById('btn-et-add');
    if (btnAdd) {
      btnAdd.onclick = () => {
        const input = document.getElementById('et-new-input');
        if (!input) return;
        const id = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (id && !this.engine.entityTypes[id]) {
          const newData = { hpMult: 1.0, dmgMult: 1.0, expMult: 1.0, isTargetable: true };
          this.engine.entityTypes[id] = newData;
          this.engine.network.socket.emit('save_entity_type', { id, data: newData });
          input.value = '';
          this.selectedEntityType = id;
          this.renderEntityTypes();
        }
      };
    }

    document.getElementById('btn-et-save').onclick = () => {
      if (!this.selectedEntityType) return;
      const data = {
        hpMult: parseFloat(document.getElementById('et-hp-mult').value) || 1.0,
        dmgMult: parseFloat(document.getElementById('et-dmg-mult').value) || 1.0,
        expMult: parseFloat(document.getElementById('et-exp-mult').value) || 1.0,
        isTargetable: document.getElementById('et-targetable').value === 'true'
      };
      this.engine.entityTypes[this.selectedEntityType] = data;
      this.engine.network.socket.emit('save_entity_type', { id: this.selectedEntityType, data: data });
      this.engine.ui.showSystemMessage(`Saved Entity Type: ${this.selectedEntityType}.`);
    };
  }

  setupEntityGroupManager() {
    const btnAdd = document.getElementById('btn-egm-add-group');
    const btnSave = document.getElementById('btn-egm-save');

    if (btnAdd) {
      btnAdd.onclick = () => {
        const input = document.getElementById('egm-new-group-input');
        const group = input.value.trim();
        if (group && !this.entityGroupsData[group]) {
          this.entityGroupsData[group] = { hostileTo: [] };
          input.value = '';
          this.selectedEntityGroup = group;
          this.renderEntityGroupManager(this.entityGroupsData);
        }
      };
    }

    if (btnSave) {
      btnSave.onclick = () => {
        if (!this.selectedEntityGroup) return;
        const checkboxes = document.querySelectorAll('.egm-hostile-cb:checked');
        const hostileTo = Array.from(checkboxes).map(cb => cb.value);
        this.entityGroupsData[this.selectedEntityGroup].hostileTo = hostileTo;
        this.engine.network.sendSaveEntityGroup(this.selectedEntityGroup, this.entityGroupsData[this.selectedEntityGroup]);
        this.engine.ui.showSystemMessage(`Saved aggression list for ${this.selectedEntityGroup}`);
      };
    }

    const btnAddPower = document.getElementById('btn-egm-add-power');
    if (btnAddPower) {
      btnAddPower.onclick = () => {
        if (!this.selectedEntityGroup) return;
        this.devTools.openPowerSelector((pId) => {
          if (this.entityGroupsData[this.selectedEntityGroup]) {
            this.entityGroupsData[this.selectedEntityGroup].powers = this.entityGroupsData[this.selectedEntityGroup].powers || [];
            if (!this.entityGroupsData[this.selectedEntityGroup].powers.includes(pId)) {
              this.entityGroupsData[this.selectedEntityGroup].powers.push(pId);
              this.renderEntityGroupManager();
            }
          }
        });
      };
    }

  }

  setupNpcTemplates() {
    this.engine.npcTemplates = this.engine.npcTemplates || {};
    this.selectedNpcTemplate = null;

    const btnAdd = document.getElementById('btn-npct-add');
    if (btnAdd) {
      btnAdd.onclick = () => {
        const input = document.getElementById('npct-new-input');
        if (!input) return;
        const id = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (id && !this.engine.npcTemplates[id]) {
          const newData = {
            name: 'New NPC', group: 'Civilian', strength: 0,
            type: 'generic', speedVariant: 1.0, aggroRadius: 500,
            baseExp: 20, powers: []
          };
          this.engine.npcTemplates[id] = newData;
          this.engine.network.socket.emit('save_npc_template', { id, data: newData });
          input.value = '';
          this.selectedNpcTemplate = id;
          this.renderNpcTemplates();
        }
      };
    }

    document.getElementById('btn-npct-save').onclick = () => {
      if (!this.selectedNpcTemplate) return;
      const data = {
        name: document.getElementById('npct-name').value,
        group: document.getElementById('npct-group').value,
        strength: parseInt(document.getElementById('npct-strength').value, 10) || 0,
        type: document.getElementById('npct-type').value,
        speedVariant: parseFloat(document.getElementById('npct-speed').value) || 1.0,
        aggroRadius: parseFloat(document.getElementById('npct-aggro').value) || 500,
        baseExp: parseInt(document.getElementById('npct-exp').value, 10) || 20,
        powers: this.engine.npcTemplates[this.selectedNpcTemplate].powers || []
      };
      this.engine.npcTemplates[this.selectedNpcTemplate] = data;
      this.engine.network.socket.emit('save_npc_template', { id: this.selectedNpcTemplate, data: data });
      this.engine.ui.showSystemMessage(`Saved NPC Template: ${this.selectedNpcTemplate}.`);
    };

    document.getElementById('btn-npct-add-power').onclick = () => {
      if (!this.selectedNpcTemplate) return;
      this.devTools.openPowerSelector((pId) => {
        if (this.engine.npcTemplates[this.selectedNpcTemplate]) {
          this.engine.npcTemplates[this.selectedNpcTemplate].powers = this.engine.npcTemplates[this.selectedNpcTemplate].powers || [];
          if (!this.engine.npcTemplates[this.selectedNpcTemplate].powers.includes(pId)) {
            this.engine.npcTemplates[this.selectedNpcTemplate].powers.push(pId);
            this.renderNpcTemplates();
          }
        }
      });
    };
  }

  renderEntityTypes() {
    const list = document.getElementById('et-list');
    if (!list) return;
    list.innerHTML = '';
    const keys = Object.keys(this.engine.entityTypes || {});
    if (!this.selectedEntityType && keys.length > 0) this.selectedEntityType = keys[0];

    keys.forEach(k => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 2px;';
      const btn = document.createElement('button');
      btn.className = 'b-btn ' + (this.selectedEntityType === k ? 'btn-primary' : 'btn-secondary');
      btn.style.cssText = 'flex: 1; text-align: left; padding: 5px; font-size: 0.85rem; border-color: var(--text-dim);';
      if (this.selectedEntityType === k) btn.style.borderColor = UI_COLORS.primary;
      btn.innerText = k;
      btn.onclick = () => { this.selectedEntityType = k; this.renderEntityTypes(); };

      const delBtn = document.createElement('button');
      delBtn.className = 'b-btn b-btn-danger';
      delBtn.style.cssText = 'padding: 0 8px; font-size: 0.8rem;';
      delBtn.innerText = 'X';
      delBtn.onclick = () => {
        if (confirm(`Delete Entity Type: ${k}?`)) { delete this.engine.entityTypes[k]; this.engine.network.socket.emit('delete_entity_type', k); if (this.selectedEntityType === k) this.selectedEntityType = null; this.renderEntityTypes(); }
      };
      row.appendChild(btn); row.appendChild(delBtn); list.appendChild(row);
    });

    if (this.selectedEntityType && this.engine.entityTypes[this.selectedEntityType]) {
      const t = this.engine.entityTypes[this.selectedEntityType];
      document.getElementById('et-hp-mult').value = t.hpMult !== undefined ? t.hpMult : 1.0;
      document.getElementById('et-dmg-mult').value = t.dmgMult !== undefined ? t.dmgMult : 1.0;
      document.getElementById('et-exp-mult').value = t.expMult !== undefined ? t.expMult : 1.0;
      document.getElementById('et-targetable').value = t.isTargetable !== false ? 'true' : 'false';
    }

    const options = keys.length > 0 ? keys.map(k => `<option value="${k}">${k.charAt(0).toUpperCase() + k.slice(1)}</option>`).join('') : '<option value="generic">Generic</option><option value="civilian">Civilian</option><option value="trainer">Trainer</option>';
    ['npct-type', 'edit-spawner-type', 'edit-npc-type'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { const val = el.value; el.innerHTML = options; if (val) el.value = val; }
    });
  }

  renderEntityGroupManager(data) {
    this.entityGroupsData = data || this.entityGroupsData;
    const groupList = document.getElementById('egm-group-list');
    const hostileList = document.getElementById('egm-hostile-list');
    if (!groupList || !hostileList) return;

    groupList.innerHTML = '';
    const groups = Object.keys(this.entityGroupsData).sort();
    if (!this.selectedEntityGroup && groups.length > 0) this.selectedEntityGroup = groups[0];

    groups.forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'b-btn ' + (this.selectedEntityGroup === g ? 'btn-primary' : 'btn-secondary');
      btn.style.cssText = 'text-align: left; padding: 5px; font-size: 0.85rem; border-color: var(--text-dim);';
      if (this.selectedEntityGroup === g) btn.style.borderColor = UI_COLORS.primary;
      btn.innerText = g;
      btn.onclick = () => { this.selectedEntityGroup = g; this.renderEntityGroupManager(); };
      groupList.appendChild(btn);
    });

    hostileList.innerHTML = '';
    if (this.selectedEntityGroup && this.entityGroupsData[this.selectedEntityGroup]) {
      const currentHostiles = this.entityGroupsData[this.selectedEntityGroup].hostileTo || [];
      groups.forEach(g => {
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.85rem; cursor: pointer;';
        const isChecked = currentHostiles.includes(g) ? 'checked' : '';
        label.innerHTML = `<input type="checkbox" class="egm-hostile-cb" value="${g}" ${isChecked}> <span>${g}</span>`;
        hostileList.appendChild(label);
      });

      const powersList = document.getElementById('egm-powers-list');
      if (powersList) {
        powersList.innerHTML = '';
        const gData = this.entityGroupsData[this.selectedEntityGroup];
        (gData.powers || []).forEach((pId, idx) => {
          const pName = window.POWER_REGISTRY && window.POWER_REGISTRY[pId] ? window.POWER_REGISTRY[pId].name : pId;
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 3px; font-size: 0.8rem;';
          row.innerHTML = `<span style="color: #fff;">${pName}</span><button class="b-btn b-btn-danger" style="padding: 0 5px; font-size: 0.7rem;">X</button>`;
          row.querySelector('button').onclick = () => { gData.powers.splice(idx, 1); this.renderEntityGroupManager(); };
          powersList.appendChild(row);
        });
        if ((gData.powers || []).length === 0) powersList.innerHTML = '<span style="color: #888; font-style: italic; font-size: 0.8rem; text-align: center;">No powers assigned.</span>';
      }

      const npcList = document.getElementById('egm-npc-list');
      if (npcList) {
        npcList.innerHTML = '';
        const groupNpcs = Object.entries(this.engine.npcTemplates || {}).filter(([k, t]) => t.group === this.selectedEntityGroup);
        if (groupNpcs.length === 0) {
          npcList.innerHTML = '<div style="text-align: center; color: var(--text-dim); font-size: 0.85rem; padding-top: 10px;">No NPCs assigned to this group.<br><br>Click "+ New NPC" to create a template for this faction.</div>';
        } else {
          groupNpcs.forEach(([k, t]) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 3px; font-size: 0.8rem;';
            row.innerHTML = `<span style="color: #fff; font-weight: bold;">${t.name} <span style="color:#aaa; font-size:0.7rem;">(Str ${t.strength || 0})</span></span>
                <div style="display: flex; gap: 5px;">
                  <button class="b-btn btn-secondary btn-dup-npc" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.warning}; color: ${UI_COLORS.warning};">⧉</button>
                  <button class="b-btn btn-secondary btn-edit-npc" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary};">Edit</button>
                  <button class="b-btn b-btn-danger btn-del-npc" style="padding: 2px 8px; font-size: 0.7rem;">X</button>
                </div>`;
            row.querySelector('.btn-edit-npc').onclick = () => {
              this.devTools.npcTemplateManagerWindow.open();
              this.selectedNpcTemplate = k;
              this.renderNpcTemplates();
            };
            row.querySelector('.btn-dup-npc').onclick = () => {
              const newName = prompt('Enter ID for duplicated template:', k + '-copy');
              if (newName && newName.trim() && newName !== k) {
                const safeName = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
                if (this.engine.npcTemplates[safeName]) { this.engine.ui.showSystemMessage('A template with that ID already exists.'); }
                else {
                  this.engine.npcTemplates[safeName] = JSON.parse(JSON.stringify(this.engine.npcTemplates[k]));
                  this.engine.network.socket.emit('save_npc_template', { id: safeName, data: this.engine.npcTemplates[safeName] });
                  this.renderEntityGroupManager();
                }
              }
            };
            row.querySelector('.btn-del-npc').onclick = () => {
              if (confirm(`Delete NPC Template: ${k}?`)) {
                delete this.engine.npcTemplates[k];
                this.engine.network.socket.emit('delete_npc_template', k);
                this.renderEntityGroupManager();
              }
            };
            npcList.appendChild(row);
          });
        }
      }

      const btnNewNpc = document.getElementById('btn-egm-new-npc');
      if (btnNewNpc) {
        btnNewNpc.onclick = () => {
          if (!this.selectedEntityGroup) return this.engine.ui.showSystemMessage('Please select an Entity Group first.');
          this.devTools.npcTemplateManagerWindow.open();
          const id = 'new-' + this.selectedEntityGroup.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(36).substr(2, 4);
          const newData = { name: 'New NPC', group: this.selectedEntityGroup, strength: 0, type: 'generic', speedVariant: 1.0, aggroRadius: 500, baseExp: 20, powers: [] };
          this.engine.npcTemplates[id] = newData;
          this.engine.network.socket.emit('save_npc_template', { id, data: newData });
          this.selectedNpcTemplate = id;
          this.renderNpcTemplates();
        };
      }

      const strSelect = document.getElementById('egm-strength-select');
      if (strSelect && strSelect.onchange) strSelect.onchange();
    }
  }

  renderNpcTemplates() {
    const list = document.getElementById('npct-list');
    if (!list) return;
    list.innerHTML = '';
    const keys = Object.keys(this.engine.npcTemplates || {});
    if (!this.selectedNpcTemplate && keys.length > 0) this.selectedNpcTemplate = keys[0];

    let groupOptions = '';
    const groups = Object.keys(this.entityGroupsData || {}).sort();
    if (groups.length === 0) {
      DEFAULT_FACTIONS.forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
    } else {
      groups.forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
    }
    const groupDrop = document.getElementById('npct-group');
    if (groupDrop) {
      const val = groupDrop.value;
      groupDrop.innerHTML = groupOptions;
      if (val) groupDrop.value = val;
    }

    keys.forEach(k => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 2px;';
      const btn = document.createElement('button');
      btn.className = 'b-btn ' + (this.selectedNpcTemplate === k ? 'btn-primary' : 'btn-secondary');
      btn.style.cssText = 'flex: 1; text-align: left; padding: 5px; font-size: 0.85rem; border-color: var(--text-dim);';
      if (this.selectedNpcTemplate === k) btn.style.borderColor = UI_COLORS.primary;
      btn.innerText = k;
      btn.onclick = () => { this.selectedNpcTemplate = k; this.renderNpcTemplates(); };
      const dupBtn = document.createElement('button');
      dupBtn.className = 'b-btn btn-secondary';
      dupBtn.style.cssText = `padding: 0 8px; font-size: 0.8rem; border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary};`;
      dupBtn.innerText = '⧉';
      dupBtn.onclick = () => {
        const newName = prompt('Enter ID for duplicated template:', k + '-copy');
        if (newName && newName.trim() && newName !== k) {
          const safeName = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
          if (this.engine.npcTemplates[safeName]) { this.engine.ui.showSystemMessage('A template with that ID already exists.'); }
          else { this.engine.npcTemplates[safeName] = JSON.parse(JSON.stringify(this.engine.npcTemplates[k])); this.engine.network.socket.emit('save_npc_template', { id: safeName, data: this.engine.npcTemplates[safeName] }); this.selectedNpcTemplate = safeName; this.renderNpcTemplates(); }
        }
      };
      const delBtn = document.createElement('button');
      delBtn.className = 'b-btn b-btn-danger';
      delBtn.style.cssText = 'padding: 0 8px; font-size: 0.8rem;';
      delBtn.innerText = 'X';
      delBtn.onclick = () => {
        if (confirm(`Delete NPC Template: ${k}?`)) { delete this.engine.npcTemplates[k]; this.engine.network.socket.emit('delete_npc_template', k); if (this.selectedNpcTemplate === k) this.selectedNpcTemplate = null; this.renderNpcTemplates(); }
      };
      row.appendChild(btn); row.appendChild(dupBtn); row.appendChild(delBtn); list.appendChild(row);
    });

    if (this.selectedNpcTemplate && this.engine.npcTemplates[this.selectedNpcTemplate]) {
      const t = this.engine.npcTemplates[this.selectedNpcTemplate];
      if (this.devTools.npcTemplateManagerWindow.setTitle) {
        this.devTools.npcTemplateManagerWindow.setTitle(`NPC Template: ${t.name || this.selectedNpcTemplate}`);
      }

      document.getElementById('npct-name').value = t.name || '';
      document.getElementById('npct-group').value = t.group || 'Civilian';
      document.getElementById('npct-strength').value = t.strength || 0;
      document.getElementById('npct-type').value = t.type || 'generic';
      document.getElementById('npct-speed').value = t.speedVariant || 1.0;
      document.getElementById('npct-aggro').value = t.aggroRadius !== undefined ? t.aggroRadius : 500;
      document.getElementById('npct-exp').value = t.baseExp !== undefined ? t.baseExp : 20;

      const powersList = document.getElementById('npct-powers-list');
      if (powersList) {
        powersList.innerHTML = '';
        (t.powers || []).forEach((pId, idx) => {
          const pName = window.POWER_REGISTRY && window.POWER_REGISTRY[pId] ? window.POWER_REGISTRY[pId].name : pId;
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 3px; font-size: 0.8rem;';
          row.innerHTML = `<span style="color: #fff;">${pName}</span><button class="b-btn b-btn-danger" style="padding: 0 5px; font-size: 0.7rem;">X</button>`;
          row.querySelector('button').onclick = () => { t.powers.splice(idx, 1); this.renderNpcTemplates(); };
          powersList.appendChild(row);
        });
        if ((t.powers || []).length === 0) powersList.innerHTML = '<span style="color: #888; font-style: italic; font-size: 0.8rem; text-align: center;">No powers assigned.</span>';
      }
    }
  }

  renderNpcManager() {
    const list = document.getElementById('npc-manager-list');
    if (!list) return;
    list.innerHTML = '';

    if (this.engine.npcs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">No NPCs found in the world.</div>`;
      return;
    }

    this.engine.npcs.forEach(npc => {
      const row = document.createElement('div');
      row.style.cssText = NPC_ROW_STYLE;

      const type = npc.type || 'idle';
      const group = npc.group || 'Civilian';
      const notes = npc.notes || '';
      const z = npc.z || 0;

      row.innerHTML = `
          <button class="btn-edit btn-secondary" style="width: auto; height: auto; padding: 5px; border-color: ${UI_COLORS.orange}; color: ${UI_COLORS.orange}; font-weight: bold; margin-right: 5px; font-size: 0.9rem;" title="Edit NPC">✎</button>
          <div style="flex: 1.5; font-weight: bold; color: var(--accent-neon); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${npc.name}">${npc.name}</div>
          <div style="flex: 1.5; display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 0.85rem;">
            <span>X:${Math.round(npc.x)} Y:${Math.round(npc.y)} Z:${Math.round(z)}</span>
            <button class="btn-tp btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; width: auto; height: auto;">TP</button>
          </div>
          <div style="flex: 1.5; font-family: var(--font-mono); font-size: 0.85rem; color: #aaa;">
            <div><span style="color:#fff;">Type:</span> ${type}</div>
            <div><span style="color:#fff;">Grp:</span> ${group}</div>
          </div>
          <div style="flex: 2; font-family: var(--font-mono); font-size: 0.8rem; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${notes}">
            ${notes || '<em style="opacity: 0.5;">No notes</em>'}
          </div>
          <button class="btn-del btn-secondary" style="width: auto; height: auto; padding: 5px 10px; border-color: ${UI_COLORS.critical}; color: ${UI_COLORS.critical}; font-weight: bold;">X</button>
        `;

      row.querySelector('.btn-edit').onclick = () => {
        document.getElementById('edit-npc-uuid').value = npc.uuid;
        document.getElementById('edit-npc-name').value = npc.name;
        document.getElementById('edit-npc-hp').value = Math.floor(npc.hp);
        document.getElementById('edit-npc-maxhp').value = npc.maxHp;
        document.getElementById('edit-npc-energy').value = Math.floor(npc.energy || 1000);
        document.getElementById('edit-npc-battery').value = Math.floor(npc.synthEnergy || 1000);
        document.getElementById('edit-npc-x').value = Math.round(npc.x);
        document.getElementById('edit-npc-y').value = Math.round(npc.y);
        document.getElementById('edit-npc-z').value = Math.round(npc.z || 0);
        document.getElementById('edit-npc-type').value = npc.type || 'idle';
        document.getElementById('edit-npc-dir').value = npc.dir || 'down';
        document.getElementById('edit-npc-group').value = npc.group || 'Civilian';
        document.getElementById('edit-npc-respawn').value = npc.respawnRate || 0;
        document.getElementById('edit-npc-level').value = npc.level || 1;
        document.getElementById('edit-npc-strength').value = npc.strength || 0;
        document.getElementById('edit-npc-aggro').value = npc.aggroRadius !== undefined ? npc.aggroRadius : 200;

        this.devTools.npcEditWindow.open();
      };

      row.querySelector('.btn-tp').onclick = () => {
        this.engine.player.x = npc.x;
        this.engine.player.y = npc.y;
        this.engine.camera.x = npc.x;
        this.engine.camera.y = npc.y;
      };

      row.querySelector('.btn-del').onclick = () => {
        if (confirm(`Are you absolutely sure you want to delete NPC: ${npc.name}?`)) {
          this.engine.network.sendDeleteNpc(npc.uuid);
        }
      };

      list.appendChild(row);
    });
  }
}
