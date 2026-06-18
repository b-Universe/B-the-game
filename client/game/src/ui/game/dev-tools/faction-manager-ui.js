import { UI_COLORS } from '../constants.js?v=cache-bust-005';

export class FactionUIManager {
  constructor(engine, devToolsUI) {
    this.engine = engine;
    this.devTools = devToolsUI;
    this.selectedFaction = null;
    this.selectedNpc = null;
    this.selectedPack = null;
    this.setupComplete = false;
  }

  setup() {
    // Setup listeners for Factions
    const selFac = document.getElementById('fac-select');
    if (selFac) {
      selFac.onchange = () => {
        this.selectedFaction = selFac.value;
        this.selectedNpc = null;
        this.selectedPack = null;
        this.render();
      };
    }

    const btnNew = document.getElementById('btn-fac-new');
    if (btnNew) {
      btnNew.onclick = () => {
        const id = prompt('Enter new Faction ID:');
        if (id && !this.engine.entityGroups[id]) {
          this.engine.entityGroups[id] = { hostileTo: [], powers: [], description: "", genericNames: {} };
          this.selectedFaction = id;
          this.saveFaction(id);
          this.render();
        }
      };
    }

    const btnRename = document.getElementById('btn-fac-rename');
    if (btnRename) {
      btnRename.onclick = () => {
        if (!this.selectedFaction) return;
        const newId = prompt('Enter new Faction ID for ' + this.selectedFaction + ':');
        if (newId && newId !== this.selectedFaction && !this.engine.entityGroups[newId]) {
          this.engine.entityGroups[newId] = this.engine.entityGroups[this.selectedFaction];
          
          // Reassign NPCs
          for (let k in this.engine.npcTemplates) {
             if (this.engine.npcTemplates[k].group === this.selectedFaction) {
                 this.engine.npcTemplates[k].group = newId;
                 this.saveNpcTemplate(k);
             }
          }
          // Reassign Mob Packs
          for (let k in this.engine.mobPacks) {
             if (this.engine.mobPacks[k].group === this.selectedFaction) {
                 this.engine.mobPacks[k].group = newId;
                 this.saveMobPack(k);
             }
          }

          delete this.engine.entityGroups[this.selectedFaction];
          this.engine.network.socket.emit('delete_entity_group', this.selectedFaction);
          this.selectedFaction = newId;
          this.saveFaction(newId);
          this.render();
        }
      };
    }

    const btnDel = document.getElementById('btn-fac-delete');
    if (btnDel) {
      btnDel.onclick = () => {
        if (!this.selectedFaction) return;
        if (confirm('Delete Faction ' + this.selectedFaction + '? This will not delete its NPCs or Mob Packs automatically.')) {
          delete this.engine.entityGroups[this.selectedFaction];
          this.engine.network.socket.emit('delete_entity_group', this.selectedFaction);
          this.selectedFaction = null;
          this.selectedNpc = null;
          this.selectedPack = null;
          this.render();
        }
      };
    }

    const btnSaveFac = document.getElementById('btn-fac-save');
    if (btnSaveFac) {
      btnSaveFac.onclick = () => {
        if (!this.selectedFaction) return;
        const grp = this.engine.entityGroups[this.selectedFaction];
        grp.description = document.getElementById('fac-desc').value;
        this.saveFaction(this.selectedFaction);
        this.engine.ui.showSystemMessage('Faction settings saved.');
      };
    }

    const btnAddName = document.getElementById('btn-fac-names-add');
    if (btnAddName) {
      btnAddName.onclick = () => {
        if (!this.selectedFaction) return;
        const val = document.getElementById('fac-names-add-input').value.trim();
        const selectEl = document.getElementById('fac-names-add-strength');
        const selectedStrs = Array.from(selectEl.selectedOptions).map(opt => opt.value);
        if (val && selectedStrs.length > 0) {
          const grp = this.engine.entityGroups[this.selectedFaction];
          if (!grp.genericNames) grp.genericNames = {};
          let added = false;
          selectedStrs.forEach(str => {
             if (!grp.genericNames[str]) grp.genericNames[str] = [];
             if (!grp.genericNames[str].includes(val)) {
                grp.genericNames[str].push(val);
                added = true;
             }
          });
          if (added) {
            this.renderNamePools();
            const inputEl = document.getElementById('fac-names-add-input');
            inputEl.value = '';
            inputEl.focus();
          }
        }
      };
      
      const inputAddName = document.getElementById('fac-names-add-input');
      if (inputAddName) {
         inputAddName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnAddName.click();
         });
      }
    }

    const btnAddPower = document.getElementById('btn-fac-add-power');
    if (btnAddPower) {
      btnAddPower.onclick = () => {
        if (!this.selectedFaction) return;
        if (this.devTools.openPowerSelector) {
          this.devTools.openPowerSelector((powId) => {
             const grp = this.engine.entityGroups[this.selectedFaction];
             if (!grp.powers) grp.powers = [];
             if (!grp.powers.includes(powId)) {
                grp.powers.push(powId);
                this.renderPowers();
             }
          });
        }
      };
    }

    // NPC Panel Setup
    const chkGeneric = document.getElementById('fac-npc-use-generic-name');
    const inputName = document.getElementById('fac-npc-name');
    if (chkGeneric && inputName) {
      chkGeneric.onchange = () => {
        inputName.disabled = chkGeneric.checked;
        if (chkGeneric.checked) {
          inputName.value = '';
          inputName.style.opacity = '0.5';
        } else {
          inputName.style.opacity = '1';
        }
      };
    }

    const selNpc = document.getElementById('fac-npc-select');
    if (selNpc) {
      selNpc.onchange = () => {
         this.selectedNpc = selNpc.value;
         this.renderNpcEditor();
      };
    }

    const btnNewNpc = document.getElementById('btn-fac-npc-new');
    if (btnNewNpc) {
      btnNewNpc.onclick = () => {
        if (!this.selectedFaction) return this.engine.ui.showSystemMessage("Select a Faction first.");
        const id = prompt('Enter new NPC Template ID:');
        if (id && !this.engine.npcTemplates[id]) {
          this.engine.npcTemplates[id] = {
            name: "New " + this.selectedFaction + " NPC",
            description: "",
            group: this.selectedFaction,
            strength: 0,
            type: "generic",
            speedVariant: 1.0,
            aggroRadius: 500,
            baseExp: 20,
            powers: []
          };
          this.selectedNpc = id;
          this.saveNpcTemplate(id);
          this.renderNpcList();
        }
      };
    }

    const btnDupNpc = document.getElementById('btn-fac-npc-duplicate');
    if (btnDupNpc) {
      btnDupNpc.onclick = () => {
        if (!this.selectedNpc) return;
        const id = prompt('Enter Template ID for duplicate:', this.selectedNpc + '-copy');
        if (id && !this.engine.npcTemplates[id]) {
          this.engine.npcTemplates[id] = JSON.parse(JSON.stringify(this.engine.npcTemplates[this.selectedNpc]));
          this.selectedNpc = id;
          this.saveNpcTemplate(id);
          this.renderNpcList();
        }
      };
    }

    const btnDelNpc = document.getElementById('btn-fac-npc-delete');
    if (btnDelNpc) {
      btnDelNpc.onclick = () => {
        if (!this.selectedNpc) return;
        if (confirm("Delete NPC Template: " + this.selectedNpc + "?")) {
          delete this.engine.npcTemplates[this.selectedNpc];
          this.engine.network.socket.emit('delete_npc_template', this.selectedNpc);
          this.selectedNpc = null;
          this.renderNpcList();
        }
      };
    }

    const btnSaveNpc = document.getElementById('btn-fac-npc-save');
    if (btnSaveNpc) {
      btnSaveNpc.onclick = () => {
        if (!this.selectedNpc) return;
        const newId = document.getElementById('fac-npc-id').value.trim();
        let t = this.engine.npcTemplates[this.selectedNpc];
        
        if (newId && newId !== this.selectedNpc) {
          if (this.engine.npcTemplates[newId]) return this.engine.ui.showSystemMessage('Template ID already exists!');
          this.engine.npcTemplates[newId] = t;
          delete this.engine.npcTemplates[this.selectedNpc];
          this.engine.network.socket.emit('delete_npc_template', this.selectedNpc);
          
          for (let packId in this.engine.mobPacks) {
            let pack = this.engine.mobPacks[packId];
            if (pack.spawns) {
               let changed = false;
               pack.spawns.forEach(s => { if (s.templateId === this.selectedNpc) { s.templateId = newId; changed = true; } });
               if (changed) this.saveMobPack(packId);
            }
          }
          this.selectedNpc = newId;
        }
        
        t.useGenericName = document.getElementById('fac-npc-use-generic-name').checked;
        t.name = t.useGenericName ? "" : document.getElementById('fac-npc-name').value;
        t.description = document.getElementById('fac-npc-desc').value;
        t.strength = parseInt(document.getElementById('fac-npc-strength').value) || 0;
        t.type = document.getElementById('fac-npc-type').value;
        t.speedVariant = parseFloat(document.getElementById('fac-npc-speed').value) || 1.0;
        t.aggroRadius = parseFloat(document.getElementById('fac-npc-aggro').value) || 500;
        t.baseExp = parseInt(document.getElementById('fac-npc-exp').value) || 20;
        this.saveNpcTemplate(this.selectedNpc);
        this.engine.ui.showSystemMessage('NPC Template saved.');
        this.renderNpcList(); // refresh names in dropdown
      };
    }

    const btnAddNpcPower = document.getElementById('btn-fac-npc-add-power');
    if (btnAddNpcPower) {
      btnAddNpcPower.onclick = () => {
        if (!this.selectedNpc) return;
        if (this.devTools.openPowerSelector) {
          this.devTools.openPowerSelector((powId) => {
             const t = this.engine.npcTemplates[this.selectedNpc];
             if (!t.powers) t.powers = [];
             if (!t.powers.includes(powId)) {
                t.powers.push(powId);
                this.renderNpcPowers();
             }
          });
        }
      };
    }

    // Mob Packs Panel Setup
    const selPack = document.getElementById('fac-pack-select');
    if (selPack) {
      selPack.onchange = () => {
        this.selectedPack = selPack.value;
        this.renderPackEditor();
      };
    }

    const btnNewPack = document.getElementById('btn-fac-pack-new');
    if (btnNewPack) {
      btnNewPack.onclick = () => {
        if (!this.selectedFaction) return this.engine.ui.showSystemMessage("Select a Faction first.");
        const id = prompt('Enter new Pack ID:');
        if (id && !this.engine.mobPacks[id]) {
          this.engine.mobPacks[id] = {
            group: this.selectedFaction,
            intensityMin: 1,
            intensityMax: 5,
            weight: 10,
            spawns: []
          };
          this.selectedPack = id;
          this.saveMobPack(id);
          this.renderPackList();
        }
      };
    }

    const btnDelPack = document.getElementById('btn-fac-pack-delete');
    if (btnDelPack) {
      btnDelPack.onclick = () => {
        if (!this.selectedPack) return;
        if (confirm("Delete Pack: " + this.selectedPack + "?")) {
          delete this.engine.mobPacks[this.selectedPack];
          this.engine.network.socket.emit('delete_mob_pack', this.selectedPack);
          this.selectedPack = null;
          this.renderPackList();
        }
      };
    }

    const btnSavePack = document.getElementById('btn-fac-pack-save');
    if (btnSavePack) {
      btnSavePack.onclick = () => {
        if (!this.selectedPack) return;
        const newId = document.getElementById('fac-pack-id').value.trim();
        let p = this.engine.mobPacks[this.selectedPack];
        
        if (newId && newId !== this.selectedPack) {
          if (this.engine.mobPacks[newId]) return this.engine.ui.showSystemMessage('Pack ID already exists!');
          this.engine.mobPacks[newId] = p;
          delete this.engine.mobPacks[this.selectedPack];
          this.engine.network.socket.emit('delete_mob_pack', this.selectedPack);
          this.selectedPack = newId;
        }

        p.intensityMin = parseInt(document.getElementById('fac-pack-intmin').value) || 1;
        p.intensityMax = parseInt(document.getElementById('fac-pack-intmax').value) || 5;
        p.weight = parseInt(document.getElementById('fac-pack-weight').value) || 10;
        this.saveMobPack(this.selectedPack);
        this.engine.ui.showSystemMessage('Pack saved.');
        this.renderPackList();
      };
    }

    const btnAddEntry = document.getElementById('btn-fac-pack-add-entry');
    if (btnAddEntry) {
      btnAddEntry.onclick = () => {
        if (!this.selectedPack) return;
        if (!this.selectedNpc) return this.engine.ui.showSystemMessage('Select an NPC from the Faction NPCs list first.');
        this.engine.mobPacks[this.selectedPack].spawns.push({
          templateId: this.selectedNpc,
          minCount: 1,
          maxCount: 3
        });
        this.renderPackEditor();
      };
    }

    this.setupComplete = true;
  }

  saveFaction(id) {
    if (this.engine.entityGroups[id]) {
      this.engine.network.socket.emit('save_entity_group', { group: id, settings: this.engine.entityGroups[id] });
    }
  }

  saveNpcTemplate(id) {
    if (this.engine.npcTemplates[id]) {
      this.engine.network.socket.emit('save_npc_template', { id: id, data: this.engine.npcTemplates[id] });
    }
  }

  saveMobPack(id) {
    if (this.engine.mobPacks[id]) {
      this.engine.network.socket.emit('save_mob_pack', { id: id, data: this.engine.mobPacks[id] });
    }
  }

  render() {
    if (!this.setupComplete) this.setup();
    if (!this.engine.entityGroups) return;

    const selFac = document.getElementById('fac-select');
    if (!selFac) return;

    selFac.innerHTML = '<option value="">-- Select Faction --</option>';
    Object.keys(this.engine.entityGroups).sort().forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.innerText = k;
      if (this.selectedFaction === k) opt.selected = true;
      selFac.appendChild(opt);
    });

    if (this.selectedFaction && this.engine.entityGroups[this.selectedFaction]) {
      const grp = this.engine.entityGroups[this.selectedFaction];
      document.getElementById('fac-desc').value = grp.description || '';
      
      if (!grp.genericNames) grp.genericNames = {};
      
      // Migrate old string arrays if present
      if (grp.genericNames.minion && Array.isArray(grp.genericNames.minion)) { grp.genericNames["-2"] = grp.genericNames.minion; delete grp.genericNames.minion; }
      if (grp.genericNames.standard && Array.isArray(grp.genericNames.standard)) { grp.genericNames["0"] = grp.genericNames.standard; delete grp.genericNames.standard; }
      if (grp.genericNames.boss && Array.isArray(grp.genericNames.boss)) { grp.genericNames["3"] = grp.genericNames.boss; delete grp.genericNames.boss; }
      this.renderNamePools();
      
      this.renderHostileList();
      this.renderPowers();
      this.renderNpcList();
      this.renderPackList();
    } else {
      document.getElementById('fac-desc').value = '';
      this.renderNamePools();
      document.getElementById('fac-hostile-list').innerHTML = '';
      document.getElementById('fac-powers-list').innerHTML = '';
      this.renderNpcList();
      this.renderPackList();
    }
  }

  renderNamePools() {
    const list = document.getElementById('fac-names-list');
    if (!list) return;
    list.innerHTML = '';
    const grp = this.selectedFaction ? this.engine.entityGroups[this.selectedFaction] : null;
    if (!grp || !grp.genericNames) return;
    
    // Sort keys from -2 to 5
    const keys = Object.keys(grp.genericNames).sort((a, b) => parseInt(a) - parseInt(b));
    keys.forEach(str => {
      if (!grp.genericNames[str] || grp.genericNames[str].length === 0) return;
      const header = document.createElement('div');
      header.style.cssText = 'color: #3498db; font-size: 0.75rem; border-bottom: 1px solid var(--text-dim); margin-top: 5px;';
      header.innerText = `Strength ${str > 0 ? '+' + str : str}`;
      list.appendChild(header);
      
      grp.genericNames[str].forEach((name, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; padding: 2px 5px; background: rgba(0,0,0,0.5); font-size: 0.8rem; border-radius: 2px; align-items: center;';
        row.innerHTML = `<span>${name}</span><button class="b-btn" style="padding: 0 4px; border-color: #e74c3c; color: #e74c3c;">X</button>`;
        row.querySelector('button').onclick = () => {
          grp.genericNames[str].splice(i, 1);
          this.renderNamePools();
        };
        list.appendChild(row);
      });
    });
  }

  renderHostileList() {
    const list = document.getElementById('fac-hostile-list');
    if (!list) return;
    list.innerHTML = '';
    const grp = this.engine.entityGroups[this.selectedFaction];
    if (!grp) return;
    if (!grp.hostileTo) grp.hostileTo = [];

    const allGroups = Object.keys(this.engine.entityGroups);
    ['hero', 'villain', 'vigilante'].forEach(a => { if (!allGroups.includes(a)) allGroups.push(a); });

    allGroups.sort().forEach(targetGroup => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; padding: 2px 5px; cursor: pointer; border-radius: 2px;';
      const isHostile = grp.hostileTo.includes(targetGroup);
      row.style.background = isHostile ? 'rgba(231, 76, 60, 0.3)' : 'transparent';
      row.innerHTML = `<span style="color: ${isHostile ? '#e74c3c' : '#aaa'};">${targetGroup}</span>`;
      row.onclick = () => {
        if (isHostile) {
          grp.hostileTo = grp.hostileTo.filter(x => x !== targetGroup);
        } else {
          grp.hostileTo.push(targetGroup);
        }
        this.renderHostileList();
      };
      list.appendChild(row);
    });
  }

  renderPowers() {
    const list = document.getElementById('fac-powers-list');
    if (!list) return;
    list.innerHTML = '';
    const grp = this.engine.entityGroups[this.selectedFaction];
    if (!grp || !grp.powers) return;

    grp.powers.forEach((p, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; padding: 2px 5px; background: rgba(0,0,0,0.5); font-size: 0.8rem; border-radius: 2px;';
      row.innerHTML = `<span>${p}</span><button class="b-btn" style="padding: 0 4px; border-color: #e74c3c; color: #e74c3c;">X</button>`;
      row.querySelector('button').onclick = () => {
        grp.powers.splice(i, 1);
        this.renderPowers();
      };
      list.appendChild(row);
    });
  }

  renderNpcList() {
    const sel = document.getElementById('fac-npc-select');
    const editor = document.getElementById('fac-npc-editor');
    if (!sel || !editor) return;

    sel.innerHTML = '<option value="">-- Select NPC --</option>';
    if (!this.selectedFaction) {
      editor.style.opacity = '0.5';
      editor.style.pointerEvents = 'none';
      return;
    }

    const factionNpcs = Object.keys(this.engine.npcTemplates || {}).filter(k => this.engine.npcTemplates[k].group === this.selectedFaction);
    
    factionNpcs.sort().forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.innerText = `${this.engine.npcTemplates[k].name || k} (${k})`;
      if (this.selectedNpc === k) opt.selected = true;
      sel.appendChild(opt);
    });

    this.renderNpcEditor();
  }

  renderNpcEditor() {
    const editor = document.getElementById('fac-npc-editor');
    if (!editor) return;

    if (!this.selectedNpc || !this.engine.npcTemplates[this.selectedNpc]) {
      editor.style.opacity = '0.5';
      editor.style.pointerEvents = 'none';
      return;
    }

    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';

    const t = this.engine.npcTemplates[this.selectedNpc];
    document.getElementById('fac-npc-id').value = this.selectedNpc;
    const chkGeneric = document.getElementById('fac-npc-use-generic-name');
    const inputName = document.getElementById('fac-npc-name');
    chkGeneric.checked = !!t.useGenericName;
    inputName.disabled = chkGeneric.checked;
    inputName.style.opacity = chkGeneric.checked ? '0.5' : '1';
    inputName.value = t.name || '';
    document.getElementById('fac-npc-desc').value = t.description || '';
    document.getElementById('fac-npc-strength').value = t.strength || 0;
    document.getElementById('fac-npc-type').value = t.type || 'generic';
    document.getElementById('fac-npc-speed').value = t.speedVariant || 1.0;
    document.getElementById('fac-npc-aggro').value = t.aggroRadius || 500;
    document.getElementById('fac-npc-exp').value = t.baseExp || 20;

    this.renderNpcPowers();
  }

  renderNpcPowers() {
    const list = document.getElementById('fac-npc-powers-list');
    if (!list) return;
    list.innerHTML = '';
    const t = this.engine.npcTemplates[this.selectedNpc];
    if (!t || !t.powers) return;

    t.powers.forEach((p, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; padding: 2px 5px; background: rgba(0,0,0,0.5); font-size: 0.8rem; border-radius: 2px;';
      row.innerHTML = `<span>${p}</span><button class="b-btn" style="padding: 0 4px; border-color: #e74c3c; color: #e74c3c;">X</button>`;
      row.querySelector('button').onclick = () => {
        t.powers.splice(i, 1);
        this.renderNpcPowers();
      };
      list.appendChild(row);
    });
  }

  renderPackList() {
    const sel = document.getElementById('fac-pack-select');
    const editor = document.getElementById('fac-pack-editor');
    if (!sel || !editor) return;

    sel.innerHTML = '<option value="">-- Select Pack --</option>';
    if (!this.selectedFaction) {
      editor.style.opacity = '0.5';
      editor.style.pointerEvents = 'none';
      return;
    }

    const factionPacks = Object.keys(this.engine.mobPacks || {}).filter(k => this.engine.mobPacks[k].group === this.selectedFaction);
    
    factionPacks.sort().forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.innerText = k;
      if (this.selectedPack === k) opt.selected = true;
      sel.appendChild(opt);
    });

    this.renderPackEditor();
  }

  renderPackEditor() {
    const editor = document.getElementById('fac-pack-editor');
    const entryList = document.getElementById('fac-pack-entries');
    if (!editor || !entryList) return;

    if (!this.selectedPack || !this.engine.mobPacks[this.selectedPack]) {
      editor.style.opacity = '0.5';
      editor.style.pointerEvents = 'none';
      entryList.innerHTML = '';
      return;
    }

    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';

    const p = this.engine.mobPacks[this.selectedPack];
    document.getElementById('fac-pack-id').value = this.selectedPack;
    document.getElementById('fac-pack-intmin').value = p.intensityMin || 1;
    document.getElementById('fac-pack-intmax').value = p.intensityMax || 5;
    document.getElementById('fac-pack-weight').value = p.weight || 10;

    entryList.innerHTML = '';
    if (!p.spawns) p.spawns = [];
    
    if (p.spawns.length > 0) {
      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display: flex; gap: 5px; align-items: center; padding: 0 5px; margin-bottom: 2px; font-weight: bold; font-size: 0.75rem; color: #aaa;';
      headerRow.innerHTML = `
        <div style="flex: 2;">Template ID</div>
        <div style="width: 40px; text-align: center;">Min</div>
        <div style="width: 40px; text-align: center;">Max</div>
        <div style="width: 25px;"></div>
      `;
      entryList.appendChild(headerRow);
    }

    p.spawns.forEach((spawn, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 5px; align-items: center; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px;';
      row.innerHTML = `
        <input type="text" class="b-input mp-spawn-id" style="flex: 2; font-size: 0.75rem;" value="${spawn.templateId}" title="Template ID">
        <input type="number" class="b-input mp-spawn-min" style="width: 40px; font-size: 0.75rem;" value="${spawn.minCount || 1}" title="Min Count">
        <input type="number" class="b-input mp-spawn-max" style="width: 40px; font-size: 0.75rem;" value="${spawn.maxCount || 1}" title="Max Count">
        <button class="b-btn mp-spawn-del" style="padding: 2px 5px; border-color: #e74c3c; color: #e74c3c;">X</button>
      `;
      
      row.querySelector('.mp-spawn-id').onchange = (e) => spawn.templateId = e.target.value;
      row.querySelector('.mp-spawn-min').onchange = (e) => spawn.minCount = parseInt(e.target.value);
      row.querySelector('.mp-spawn-max').onchange = (e) => spawn.maxCount = parseInt(e.target.value);
      row.querySelector('.mp-spawn-del').onclick = () => { p.spawns.splice(idx, 1); this.renderPackEditor(); };
      
      entryList.appendChild(row);
    });
  }
}
