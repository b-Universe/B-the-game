import { POWER_REGISTRY } from './game/registry.js?v=cache-bust-005';
import { PowerEditorWindow } from './windows/power-windows.js?v=cache-bust-005';

export class PowerEditorUIManager {
  constructor(engine) {
    this.engine = engine;
    this.powers = [];
    this.powersets = [];
    this.currentPowerId = null;
    this.currentEffects = [];
    this.currentCasterVisuals = [];
    this.currentProjectileVisuals = [];
    this.currentTargetVisuals = [];
    this.els = {}; // Cache DOM elements

    this.sequenceLibrary = {};

    this.window = new PowerEditorWindow();
    this.setupUI();
  }

  setupUI() {
    this.els.panel = this.window.element;
    this.els.btnOpen = document.getElementById('btn-dev-power-editor');
    this.els.rosterList = document.getElementById('pe-power-list');
    this.els.filterPowerset = document.getElementById('pe-filter-powerset');
    this.els.searchInput = document.getElementById('pe-search');
    this.els.assignedContainer = document.getElementById('pe-assigned-powersets');
    this.els.btnSave = document.getElementById('btn-pe-save');
    this.els.btnCreate = document.getElementById('btn-pe-create-new');

    if (this.els.btnOpen && this.els.panel) {
      this.els.btnOpen.style.borderColor = '#e056fd';
      this.els.btnOpen.style.color = '#e056fd';
      this.els.btnOpen.addEventListener('click', () => {
        if (this.window.element.style.display === 'none') {
          this.window.open();
          this.loadData();
        } else {
          this.window.close();
        }
      });
    }

    if (this.els.btnSave) {
      this.els.btnSave.addEventListener('click', () => this.savePower());
    }

    this.els.btnAddEffect = document.getElementById('btn-pe-add-effect');
    this.els.effectsList = document.getElementById('pe-effects-list');

    if (this.els.btnAddEffect) {
      this.els.btnAddEffect.addEventListener('click', () => {
        this.currentEffects.push({ type: 'Damage', magnitude: 10, chance: 100, duration: 5, tickRate: 1 });
        this.renderEffectsList();
      });
    }

    this.els.btnAddCasterVisual = document.getElementById('btn-pe-add-caster-visual');
    this.els.casterVisualsList = document.getElementById('pe-caster-visuals-list');
    this.els.btnAddCasterVisual?.addEventListener('click', () => { this.currentCasterVisuals.push({ sequence: 'None' }); this.renderSpriteEventList('caster'); });
    this.els.btnAddProjectileVisual = document.getElementById('btn-pe-add-projectile-visual');
    this.els.projectileVisualsList = document.getElementById('pe-projectile-visuals-list');
    this.els.btnAddProjectileVisual?.addEventListener('click', () => { this.currentProjectileVisuals.push({ sequence: 'None' }); this.renderSpriteEventList('projectile'); });
    this.els.btnAddTargetVisual = document.getElementById('btn-pe-add-target-visual');
    this.els.targetVisualsList = document.getElementById('pe-target-visuals-list');
    this.els.btnAddTargetVisual?.addEventListener('click', () => { this.currentTargetVisuals.push({ sequence: 'None' }); this.renderSpriteEventList('target'); });

    if (this.els.btnCreate) {
      this.els.btnCreate.addEventListener('click', () => this.createNewPower());
    }

    if (this.els.searchInput) {
      this.els.searchInput.addEventListener('input', () => this.renderRoster());
    }

    if (this.els.filterPowerset) {
      this.els.filterPowerset.addEventListener('change', () => this.renderRoster());
    }

    const toggleDisabled = (id, isDisabled) => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = isDisabled;
        el.style.opacity = isDisabled ? '0.3' : '1';
        el.style.cursor = isDisabled ? 'not-allowed' : 'text';
      }
    };

    const updateDisabledFields = () => {
      const type = document.getElementById('pe-power-type')?.value || 'Click';
      const isToggle = type === 'Toggle';
      const isPassive = type === 'Passive';

      toggleDisabled('pe-stat-ener-cost', !isToggle);
      toggleDisabled('pe-stat-battery-cost', !isToggle);
      toggleDisabled('pe-stat-ener-cast', isPassive);
      toggleDisabled('pe-stat-battery-cast', isPassive);
      toggleDisabled('pe-stat-recovery', !isPassive);
      toggleDisabled('pe-stat-battery-recovery', !isPassive);

      toggleDisabled('pe-stat-aoe', type !== 'Targeted AoE' && type !== 'PBAoE');
      toggleDisabled('pe-stat-cone', type !== 'Click' && type !== 'Targeted');

      const disableCombatStats = isToggle || type === 'Passive' || type === 'Summon' || type === 'Targeted Summon';

      toggleDisabled('pe-stat-range', isToggle || type === 'Passive' || type === 'Summon');
      toggleDisabled('pe-stat-accuracy', disableCombatStats);
      toggleDisabled('pe-stat-crit-chance', disableCombatStats);
      toggleDisabled('pe-stat-crit-mult', disableCombatStats);
    };

    const powerTypeSelect = document.getElementById('pe-power-type');
    if (powerTypeSelect) powerTypeSelect.addEventListener('change', updateDisabledFields);
  }

  updateSequenceDetails(seqId) {
    const details = document.getElementById('pe-sprite-details');
    const seq = this.sequenceLibrary[seqId];
    if (!details || !seq) return;

    if (seqId === 'None') {
      details.innerHTML = 'Select a sequence to view payload details.';
      return;
    }

    details.innerHTML = `
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 5px;">
        <strong style="color: var(--accent);">ID:</strong> <span>${seqId}</span>
        <strong style="color: var(--accent);">Frames:</strong> <span style="color: #3498db;">${seq.frames}</span>
        <strong style="color: var(--accent);">Speed:</strong> <span style="color: #e67e22;">${seq.speed}ms</span>
        <strong style="color: var(--accent);">Path:</strong> <span style="color: #2ecc71; font-size: 0.75rem;">${seq.path}</span>
      </div>
    `;
  }


  async loadData() {
    try {
      let powersJson, powersetsJson;
      const cachedPowers = localStorage.getItem('b_cache_powers');
      if (cachedPowers) {
        powersJson = JSON.parse(cachedPowers);
        fetch('/api/powers').then(r => r.json()).then(d => localStorage.setItem('b_cache_powers', JSON.stringify(d))).catch(()=>{});
      } else {
        const powersRes = await fetch('/api/powers');
        if (powersRes.ok) {
          powersJson = await powersRes.json();
          localStorage.setItem('b_cache_powers', JSON.stringify(powersJson));
        }
      }

      const cachedPowersets = localStorage.getItem('b_cache_powersets');
      if (cachedPowersets) {
        powersetsJson = JSON.parse(cachedPowersets);
        fetch('/api/powersets').then(r => r.json()).then(d => localStorage.setItem('b_cache_powersets', JSON.stringify(d))).catch(()=>{});
      } else {
        const powersetsRes = await fetch('/api/powersets');
        if (powersetsRes.ok) {
          powersetsJson = await powersetsRes.json();
          localStorage.setItem('b_cache_powersets', JSON.stringify(powersetsJson));
        }
      }

      if (powersJson) this.powers = powersJson;

      if (powersetsJson) {
        const rawPowersets = powersetsJson;
        this.powersets = [];
        // Flatten categories into a single searchable array
        for (const cat in rawPowersets) {
          rawPowersets[cat].forEach(ps => {
            const id = ps.Id || ps.id;
            const name = ps.Name || ps.name || id;
            if (name && id) this.powersets.push({ id, name });
          });
        }
        // Sort alphabetically for sanity
        this.powersets.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Get sprite data from the AssetManager which is now the source of truth
      this.sequenceLibrary = this.engine.renderer.assetManager.sequenceLibrary;

      this.populatePowersetFilters();
      this.renderRoster();
    } catch (e) {
      console.error("Failed to load power customizer data:", e);
    }
  }

  populatePowersetFilters() {
    if (this.els.filterPowerset) {
      const currentFilter = this.els.filterPowerset.value;
      this.els.filterPowerset.innerHTML = '<option value="all">All Powersets</option>';
      this.powersets.forEach(ps => {
        this.els.filterPowerset.innerHTML += `<option value="${ps.id}">${ps.name}</option>`;
      });
      this.els.filterPowerset.value = currentFilter;
    }

    if (this.els.assignedContainer) {
      this.els.assignedContainer.innerHTML = '';
      this.powersets.forEach(ps => {
        this.els.assignedContainer.innerHTML += `
          <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <input type="checkbox" value="${ps.id}" class="pe-powerset-cb"> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ps.name}</span>
          </label>
        `;
      });
    }
  }

  renderRoster() {
    if (!this.els.rosterList) return;
    this.els.rosterList.innerHTML = '';

    const filterVal = this.els.filterPowerset ? this.els.filterPowerset.value : 'all';
    const searchVal = this.els.searchInput ? this.els.searchInput.value.toLowerCase() : '';

    this.powers.forEach(p => {
      // Filters
      if (filterVal !== 'all' && (!p.assignedPowersets || !p.assignedPowersets.includes(filterVal))) return;

      if (searchVal) {
        const nameMatch = p.name.toLowerCase().includes(searchVal);
        const idMatch = p.id.toLowerCase().includes(searchVal);
        let psMatch = false;

        if (p.assignedPowersets) {
          psMatch = p.assignedPowersets.some(psId => {
            const psData = this.powersets.find(ps => ps.id === psId);
            return psData && psData.name.toLowerCase().includes(searchVal);
          });
        }
        if (!nameMatch && !idMatch && !psMatch) return;
      }

      const item = document.createElement('div');
      item.className = 'list-item' + (this.currentPowerId === p.id ? ' active' : '');

      let assignedNames = [];
      if (p.assignedPowersets && p.assignedPowersets.length > 0) {
        assignedNames = p.assignedPowersets.map(psId => {
          const psData = this.powersets.find(ps => ps.id === psId);
          return psData ? psData.name : psId;
        });
      }
      item.title = assignedNames.length > 0 ? `Powersets:\n• ${assignedNames.join('\n• ')}` : 'Not assigned to any powerset';

      item.innerHTML = `<strong>${p.name}</strong><br><span style="font-size: 0.75rem; color: #888;">${p.id}</span>`;
      item.addEventListener('click', () => this.loadPowerIntoEditor(p.id));
      this.els.rosterList.appendChild(item);
    });
  }

  renderEffectsList() {
    if (!this.els.effectsList) return;
    this.els.effectsList.innerHTML = '';

    if (this.currentEffects.length === 0) {
      this.els.effectsList.innerHTML = '<div style="color: var(--text-dim); font-family: var(--font-mono); font-size: 0.85rem; text-align: center;">No effects assigned.</div>';
      return;
    }

    this.currentEffects.forEach((effect, index) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 10px; background: rgba(0,0,0,0.3); padding: 10px; border: 1px solid var(--text-dim); border-radius: 4px; align-items: flex-end;';

      row.innerHTML = `
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Type</label>
          <select class="b-select effect-type" data-index="${index}">
            <option value="Damage" ${effect.type === 'Damage' ? 'selected' : ''}>Damage</option>
            <option value="Heal" ${effect.type === 'Heal' ? 'selected' : ''}>Heal</option>
            <option value="DoT" ${effect.type === 'DoT' ? 'selected' : ''}>DoT</option>
            <option value="Proc" ${effect.type === 'Proc' ? 'selected' : ''}>Proc</option>
            <option value="Status" ${effect.type === 'Status' ? 'selected' : ''}>Status</option>
            <option value="MaxHP" ${effect.type === 'MaxHP' ? 'selected' : ''}>Max HP Bonus</option>
            <option value="MaxEnergy" ${effect.type === 'MaxEnergy' ? 'selected' : ''}>Max Energy Bonus</option>
            <option value="MaxSynth" ${effect.type === 'MaxSynth' ? 'selected' : ''}>Max Battery Bonus</option>
          </select>
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0; display: ${effect.type === 'Status' ? 'flex' : 'none'}; flex-direction: column;">
          <label style="font-size: 0.75rem;">Status Type</label>
          <select class="b-select effect-status-type" data-index="${index}">
            <option value="stun" ${effect.statusType === 'stun' ? 'selected' : ''}>Stun</option>
            <option value="slow" ${effect.statusType === 'slow' ? 'selected' : ''}>Slow</option>
            <option value="hold" ${effect.statusType === 'hold' ? 'selected' : ''}>Hold</option>
            <option value="snare" ${effect.statusType === 'snare' || effect.statusType === 'root' ? 'selected' : ''}>Snare</option>
            <option value="blind" ${effect.statusType === 'blind' ? 'selected' : ''}>Blind</option>
          </select>
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Magnitude</label>
          <input type="number" class="b-input effect-mag" data-index="${index}" value="${effect.magnitude}">
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Chance (%)</label>
          <input type="number" class="b-input effect-chance" data-index="${index}" min="0" max="100" value="${effect.chance}">
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Dur (s)</label>
          <input type="number" class="b-input effect-dur" data-index="${index}" min="0" step="0.5" value="${effect.duration !== undefined ? effect.duration : 5}">
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Tick (s)</label>
          <input type="number" class="b-input effect-tick" data-index="${index}" min="0.1" step="0.1" value="${effect.tickRate !== undefined ? effect.tickRate : 1}">
        </div>
        <button class="b-btn b-btn-danger btn-remove-effect" data-index="${index}" style="padding: 0 10px; height: 35px;">X</button>
      `;

      this.els.effectsList.appendChild(row);
    });

    this.els.effectsList.querySelectorAll('.effect-type').forEach(el => {
      el.addEventListener('change', (e) => {
        this.currentEffects[e.target.dataset.index].type = e.target.value;
        this.renderEffectsList(); // Re-render to show/hide the status column dynamically
      });
    });
    this.els.effectsList.querySelectorAll('.effect-status-type').forEach(el => {
      el.addEventListener('change', (e) => { this.currentEffects[e.target.dataset.index].statusType = e.target.value; });
    });
    this.els.effectsList.querySelectorAll('.effect-mag').forEach(el => {
      el.addEventListener('input', (e) => { this.currentEffects[e.target.dataset.index].magnitude = parseFloat(e.target.value) || 0; });
    });
    this.els.effectsList.querySelectorAll('.effect-chance').forEach(el => {
      el.addEventListener('input', (e) => { this.currentEffects[e.target.dataset.index].chance = parseFloat(e.target.value) || 0; });
    });
    this.els.effectsList.querySelectorAll('.effect-dur').forEach(el => {
      el.addEventListener('input', (e) => { this.currentEffects[e.target.dataset.index].duration = parseFloat(e.target.value) || 0; });
    });
    this.els.effectsList.querySelectorAll('.effect-tick').forEach(el => {
      el.addEventListener('input', (e) => { this.currentEffects[e.target.dataset.index].tickRate = parseFloat(e.target.value) || 0; });
    });
    this.els.effectsList.querySelectorAll('.btn-remove-effect').forEach(el => {
      el.addEventListener('click', (e) => {
        this.currentEffects.splice(e.target.dataset.index, 1);
        this.renderEffectsList();
      });
    });
  }

  renderSpriteEventList(type) {
    const listEl = this.els[`${type}VisualsList`];
    const dataArray = this[`current${type.charAt(0).toUpperCase() + type.slice(1)}Visuals`];
    if (!listEl || !dataArray) return;

    listEl.innerHTML = '';
    if (dataArray.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-family: var(--font-mono); font-size: 0.85rem; text-align: center;">No sprite events.</div>';
      return;
    }

    dataArray.forEach((event, index) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 10px; background: rgba(0,0,0,0.3); padding: 10px; border: 1px solid var(--text-dim); border-radius: 4px; align-items: center;';

      let optionsHtml = '';
      for (const [key, seq] of Object.entries(this.sequenceLibrary)) {
        optionsHtml += `<option value="${key}" ${event.sequence === key ? 'selected' : ''}>${seq.name}</option>`;
      }

      row.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <button class="b-btn btn-move-up-sprite" data-index="${index}" style="padding: 2px 5px; font-size: 0.6rem; height: 16px;" title="Move Up">▲</button>
          <button class="b-btn btn-move-down-sprite" data-index="${index}" style="padding: 2px 5px; font-size: 0.6rem; height: 16px;" title="Move Down">▼</button>
        </div>
        <div style="flex: 2; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Sequence</label>
           <select class="b-select sprite-event-select" data-index="${index}">${optionsHtml}</select>
        </div>
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Particle</label>
           <select class="b-select sprite-event-particle" data-index="${index}">
             <option value="none" ${event.particle === 'none' ? 'selected' : ''}>None</option>
             <option value="sparks" ${event.particle === 'sparks' ? 'selected' : ''}>Sparks</option>
             <option value="smoke" ${event.particle === 'smoke' ? 'selected' : ''}>Smoke</option>
             <option value="aura" ${event.particle === 'aura' ? 'selected' : ''}>Glow Aura</option>
             <option value="explosion" ${event.particle === 'explosion' ? 'selected' : ''}>Explosion</option>
           </select>
        </div>
        <div style="flex: 0.8; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Color</label>
           <input type="color" class="b-input sprite-event-color" data-index="${index}" value="${event.color || '#ffffff'}" style="padding: 0; height: 24px; cursor: pointer;">
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Height Offset</label>
           <input type="number" class="b-input sprite-event-offset" data-index="${index}" value="${event.offsetZ || 0}">
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Delay (s)</label>
           <input type="number" class="b-input sprite-event-delay" data-index="${index}" min="0" step="0.1" value="${event.delay || 0}">
        </div>
        <button class="b-btn b-btn-danger btn-remove-sprite-event" data-index="${index}" style="padding: 0 10px; height: 35px; margin-top: auto;">X</button>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll('.sprite-event-particle').forEach(el => {
      el.addEventListener('change', (e) => {
        dataArray[e.target.dataset.index].particle = e.target.value;
      });
    });
    listEl.querySelectorAll('.sprite-event-color').forEach(el => {
      el.addEventListener('input', (e) => {
        dataArray[e.target.dataset.index].color = e.target.value;
      });
    });

    listEl.querySelectorAll('.sprite-event-select').forEach(el => {
      el.addEventListener('change', (e) => {
        const index = e.target.dataset.index;
        dataArray[index].sequence = e.target.value;
        this.updateSequenceDetails(e.target.value);
      });
    });

    listEl.querySelectorAll('.sprite-event-offset').forEach(el => {
      el.addEventListener('input', (e) => {
        dataArray[e.target.dataset.index].offsetZ = parseFloat(e.target.value) || 0;
      });
    });
    listEl.querySelectorAll('.sprite-event-delay').forEach(el => {
      el.addEventListener('input', (e) => {
        dataArray[e.target.dataset.index].delay = parseFloat(e.target.value) || 0;
      });
    });
    listEl.querySelectorAll('.btn-move-up-sprite').forEach(el => {
      el.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        if (index > 0) {
          const temp = dataArray[index];
          dataArray[index] = dataArray[index - 1];
          dataArray[index - 1] = temp;
          this.renderSpriteEventList(type);
        }
      });
    });
    listEl.querySelectorAll('.btn-move-down-sprite').forEach(el => {
      el.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        if (index < dataArray.length - 1) {
          const temp = dataArray[index];
          dataArray[index] = dataArray[index + 1];
          dataArray[index + 1] = temp;
          this.renderSpriteEventList(type);
        }
      });
    });

    listEl.querySelectorAll('.btn-remove-sprite-event').forEach(el => {
      el.addEventListener('click', (e) => {
        dataArray.splice(e.target.dataset.index, 1);
        this.renderSpriteEventList(type);
      });
    });
  }

  createNewPower() {
    const newId = prompt("Enter a unique internal ID for this power (e.g., plasma_burst):");
    if (!newId || newId.trim() === '') return;

    const safeId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (this.powers.find(p => p.id === safeId)) {
      alert("A power with that ID already exists.");
      return;
    }

    const newPower = {
      id: safeId, name: "New Power", type: 'Click', description: "", assignedPowersets: [],
      engineScript: '',
      stats: {
        tier: 1,
        rechargeRate: 1.0,
        activationTime: 0.5,
        energyCost: 10,
        energyCostPerSecond: 5,
        batteryCost: 0,
        batteryCostPerSecond: 0,
        recoveryRatePerSecond: 0,
        batteryRecoveryRatePerSecond: 0,
        range: 200,
        aoeRadius: 0,
        coneRadius: 45,
        accuracy: 85,
        critChance: 5,
        critMult: 1.5
      },
      effects: [],
      visuals: {
        icon: '', tint: '#ffffff', animation: 'throw-attack1',
        casterVisuals: [],
        projectileVisuals: [],
        targetVisuals: [],
        projectileSpeed: 400, projectileArc: 0
      }
    };

    this.powers.unshift(newPower);
    this.loadPowerIntoEditor(safeId);
  }

  loadPowerIntoEditor(id) {
    this.currentPowerId = id;
    const power = this.powers.find(p => p.id === id);
    if (!power) return;

    this.renderRoster(); // Refresh to highlight the active power in the roster

    document.getElementById('pe-id').value = power.id;
    document.getElementById('pe-id').disabled = true; // Lock ID to prevent reference breaks
    document.getElementById('pe-name').value = power.name || '';
    document.getElementById('pe-power-type').value = power.type || 'Click';
    document.getElementById('pe-desc').value = power.description || '';
    document.getElementById('pe-engine-script').value = power.engineScript || '';

    const checkboxes = document.querySelectorAll('.pe-powerset-cb');
    checkboxes.forEach(cb => { cb.checked = power.assignedPowersets && power.assignedPowersets.includes(cb.value); });

    const stats = power.stats || {};
    const tierInput = document.getElementById('pe-stat-tier');
    const rechInput = document.getElementById('pe-stat-rech');
    const activInput = document.getElementById('pe-stat-activation');
    const enerCastInput = document.getElementById('pe-stat-ener-cast');
    const enerCostInput = document.getElementById('pe-stat-ener-cost');
    const batteryCastInput = document.getElementById('pe-stat-battery-cast');
    const batteryCostInput = document.getElementById('pe-stat-battery-cost');
    const recoveryInput = document.getElementById('pe-stat-recovery');
    const batteryRecoveryInput = document.getElementById('pe-stat-battery-recovery');
    const rangeInput = document.getElementById('pe-stat-range');
    const aoeInput = document.getElementById('pe-stat-aoe');
    const coneInput = document.getElementById('pe-stat-cone');
    const accuracyInput = document.getElementById('pe-stat-accuracy');
    const critChanceInput = document.getElementById('pe-stat-crit-chance');
    const critMultInput = document.getElementById('pe-stat-crit-mult');

    if (tierInput) tierInput.value = stats.tier !== undefined ? stats.tier : 1;
    if (rechInput) rechInput.value = stats.rechargeRate !== undefined ? stats.rechargeRate : 1.0;
    if (activInput) activInput.value = stats.activationTime !== undefined ? stats.activationTime : 0.5;
    if (enerCastInput) enerCastInput.value = stats.energyCost !== undefined ? stats.energyCost : 10;
    if (enerCostInput) enerCostInput.value = stats.energyCostPerSecond !== undefined ? stats.energyCostPerSecond : 0;
    if (batteryCastInput) batteryCastInput.value = stats.batteryCost !== undefined ? stats.batteryCost : 0;
    if (batteryCostInput) batteryCostInput.value = stats.batteryCostPerSecond !== undefined ? stats.batteryCostPerSecond : 0;
    if (recoveryInput) recoveryInput.value = stats.recoveryRatePerSecond !== undefined ? stats.recoveryRatePerSecond : 0;
    if (batteryRecoveryInput) batteryRecoveryInput.value = stats.batteryRecoveryRatePerSecond !== undefined ? stats.batteryRecoveryRatePerSecond : 0;
    if (rangeInput) rangeInput.value = stats.range !== undefined ? stats.range : 200;
    if (aoeInput) aoeInput.value = stats.aoeRadius !== undefined ? stats.aoeRadius : 0;
    if (coneInput) coneInput.value = stats.coneRadius !== undefined ? stats.coneRadius : 45;
    if (accuracyInput) accuracyInput.value = stats.accuracy !== undefined ? stats.accuracy : 85;
    if (critChanceInput) critChanceInput.value = stats.critChance !== undefined ? stats.critChance : 5;
    if (critMultInput) critMultInput.value = stats.critMult !== undefined ? stats.critMult : 1.5;

    this.currentEffects = power.effects ? JSON.parse(JSON.stringify(power.effects)) : [];
    this.renderEffectsList();

    const vis = power.visuals || { casterVisuals: [], projectileVisuals: [], targetVisuals: [] };

    // Cache advanced/hidden visual properties so we don't delete them when saving!
    this.cachedVisualsData = JSON.parse(JSON.stringify(vis));
    delete this.cachedVisualsData.tint;
    delete this.cachedVisualsData.icon;
    delete this.cachedVisualsData.animation;
    delete this.cachedVisualsData.casterVisuals;
    delete this.cachedVisualsData.projectileVisuals;
    delete this.cachedVisualsData.targetVisuals;
    delete this.cachedVisualsData.projectileSpeed;
    delete this.cachedVisualsData.projectileArc;
    delete this.cachedVisualsData.projectileStyle;
    delete this.cachedVisualsData.trailColor;
    delete this.cachedVisualsData.trailSize;

    document.getElementById('pe-visual-tint').value = vis.tint || '#ffffff';
    document.getElementById('pe-visual-icon').value = vis.icon || '';
    document.getElementById('pe-visual-anim').value = vis.animation || 'idle';
    document.getElementById('pe-proj-speed').value = vis.projectileSpeed !== undefined ? vis.projectileSpeed : 400;
    document.getElementById('pe-proj-arc').value = vis.projectileArc !== undefined ? vis.projectileArc : 0;

    const speedInput = document.getElementById('pe-proj-speed');
    if (speedInput && !document.getElementById('pe-projectile-style')) {
      const row = speedInput.parentNode.parentNode;

      const oldLaserRow = document.getElementById('pe-is-laser')?.closest('.pe-input-row')?.parentNode;
      if (oldLaserRow) oldLaserRow.remove();

      const styleRow = document.createElement('div');
      styleRow.style.cssText = 'display: flex; gap: 10px; margin-top: 5px;';
      styleRow.innerHTML = `
            <div class="pe-input-row" style="flex: 1.5; margin: 0; display: flex; align-items: center; gap: 10px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); border-radius: 4px;">
                <label style="font-size: 0.75rem;">Projectile Style</label>
                <select id="pe-projectile-style" class="b-select">
                    <option value="sprite">Sprite (Default)</option>
                    <option value="laser">Fast Laser/Tracer</option>
                    <option value="bullet">Speeding Bullet</option>
                    <option value="lightning">Instant Lightning/Beam</option>
                </select>
            </div>
            <div class="pe-input-row" style="flex: 1; margin: 0; background: rgba(0,0,0,0.3); padding: 5px; border: 1px solid var(--text-dim); border-radius: 4px;">
                <label style="font-size: 0.75rem;">Tracer Color</label>
                <input type="color" id="pe-trail-color" class="b-input" style="padding: 0; height: 24px; cursor: pointer;">
            </div>
            <div class="pe-input-row" style="flex: 1; margin: 0; background: rgba(0,0,0,0.3); padding: 5px; border: 1px solid var(--text-dim); border-radius: 4px;">
                <label style="font-size: 0.75rem;">Trail Size</label>
                <input type="number" id="pe-trail-size" class="b-input" style="padding: 0 5px; height: 24px;" min="1" max="10" step="0.5">
            </div>
        `;
      row.parentNode.insertBefore(styleRow, row.nextSibling);
    }

    const styleEl = document.getElementById('pe-projectile-style');
    const trailColorEl = document.getElementById('pe-trail-color');
    const trailSizeEl = document.getElementById('pe-trail-size');
    if (styleEl) styleEl.value = vis.projectileStyle || (vis.isLaser ? 'laser' : 'sprite');
    if (trailColorEl) trailColorEl.value = vis.trailColor || '#f1c40f';
    if (trailSizeEl) trailSizeEl.value = vis.trailSize !== undefined ? vis.trailSize : 2.5;

    this.currentCasterVisuals = vis.casterVisuals ? JSON.parse(JSON.stringify(vis.casterVisuals)) : [];
    this.currentProjectileVisuals = vis.projectileVisuals ? JSON.parse(JSON.stringify(vis.projectileVisuals)) : [];
    this.currentTargetVisuals = vis.targetVisuals ? JSON.parse(JSON.stringify(vis.targetVisuals)) : [];
    this.renderSpriteEventList('caster');
    this.renderSpriteEventList('projectile');
    this.renderSpriteEventList('target');

    const firstCastSeq = this.currentCasterVisuals.length > 0 ? this.currentCasterVisuals[0].sequence : 'None';
    this.updateSequenceDetails(firstCastSeq);

    const powerTypeEl = document.getElementById('pe-power-type');
    if (powerTypeEl) powerTypeEl.dispatchEvent(new Event('change'));
  }

  async savePower() {
    if (!this.currentPowerId) return;

    const type = document.getElementById('pe-power-type').value;

    const tierVal = parseInt(document.getElementById('pe-stat-tier').value, 10);
    const rechVal = parseFloat(document.getElementById('pe-stat-rech').value);
    const activVal = parseFloat(document.getElementById('pe-stat-activation').value);
    const enerCastVal = parseInt(document.getElementById('pe-stat-ener-cast').value, 10);
    const enerCostVal = parseInt(document.getElementById('pe-stat-ener-cost').value, 10);
    const battCastVal = parseInt(document.getElementById('pe-stat-battery-cast')?.value, 10);
    const battCostVal = parseInt(document.getElementById('pe-stat-battery-cost')?.value, 10);
    const recoveryVal = parseFloat(document.getElementById('pe-stat-recovery').value);
    const battRecVal = parseFloat(document.getElementById('pe-stat-battery-recovery')?.value);
    const rangeVal = parseInt(document.getElementById('pe-stat-range').value, 10);
    const aoeVal = parseInt(document.getElementById('pe-stat-aoe').value, 10);
    const coneVal = parseInt(document.getElementById('pe-stat-cone').value, 10);
    const accVal = parseFloat(document.getElementById('pe-stat-accuracy').value);
    const critCVal = parseFloat(document.getElementById('pe-stat-crit-chance').value);
    const critMVal = parseFloat(document.getElementById('pe-stat-crit-mult').value);
    const projSVal = parseFloat(document.getElementById('pe-proj-speed').value);
    const projAVal = parseFloat(document.getElementById('pe-proj-arc').value);

    const payload = {
      id: document.getElementById('pe-id').value,
      name: document.getElementById('pe-name').value,
      type: document.getElementById('pe-power-type').value,
      description: document.getElementById('pe-desc').value,
      engineScript: document.getElementById('pe-engine-script').value,
      assignedPowersets: Array.from(document.querySelectorAll('.pe-powerset-cb:checked')).map(cb => cb.value),
      stats: {
        tier: isNaN(tierVal) ? 1 : tierVal,
        rechargeRate: isNaN(rechVal) ? 1.0 : rechVal,
        activationTime: isNaN(activVal) ? 0.5 : activVal,
        energyCost: isNaN(enerCastVal) ? 10 : enerCastVal,
        energyCostPerSecond: type !== 'Toggle' ? 0 : (isNaN(enerCostVal) ? 0 : enerCostVal),
        batteryCost: isNaN(battCastVal) ? 0 : battCastVal,
        batteryCostPerSecond: type !== 'Toggle' ? 0 : (isNaN(battCostVal) ? 0 : battCostVal),
        recoveryRatePerSecond: (type !== 'Passive') ? 0 : (isNaN(recoveryVal) ? 0 : recoveryVal),
        batteryRecoveryRatePerSecond: (type !== 'Passive') ? 0 : (isNaN(battRecVal) ? 0 : battRecVal),
        range: isNaN(rangeVal) ? 200 : rangeVal,
        aoeRadius: (type !== 'Targeted AoE' && type !== 'PBAoE') ? 0 : (isNaN(aoeVal) ? 0 : aoeVal),
        coneRadius: (type !== 'Click' && type !== 'Targeted') ? 0 : (isNaN(coneVal) ? 45 : coneVal),
        critChance: isNaN(critCVal) ? 5 : critCVal,
        critMult: isNaN(critMVal) ? 1.5 : critMVal
      },
      effects: this.currentEffects,
      visuals: {
        ...this.cachedVisualsData,
        tint: document.getElementById('pe-visual-tint').value,
        icon: document.getElementById('pe-visual-icon').value,
        animation: document.getElementById('pe-visual-anim').value,
        casterVisuals: this.currentCasterVisuals,
        projectileVisuals: this.currentProjectileVisuals,
        targetVisuals: this.currentTargetVisuals,
        projectileSpeed: isNaN(projSVal) ? 400 : projSVal,
        projectileArc: isNaN(projAVal) ? 0 : projAVal,
        projectileStyle: document.getElementById('pe-projectile-style')?.value || 'sprite',
        trailColor: document.getElementById('pe-trail-color')?.value || '#f1c40f',
        trailSize: parseFloat(document.getElementById('pe-trail-size')?.value) || 2.5
      }
    };

    // Update local cache and UI
    const idx = this.powers.findIndex(p => p.id === payload.id);
    if (idx !== -1) this.powers[idx] = payload;
    POWER_REGISTRY[payload.id] = payload;
    if (window.POWER_REGISTRY) window.POWER_REGISTRY[payload.id] = payload;
    this.renderRoster();

    const btn = this.els.btnSave;
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.style.opacity = "0.5";

    fetch('/api/powers/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        btn.innerText = "Saved!";
        if (this.engine && this.engine.loadPowersets) {
          this.engine.loadPowersets().then(() => {
            const tModal = document.getElementById('trainer-dialog-modal');
            if (tModal && tModal.style.display === 'flex' && this.engine.activeTrainer) {
              this.engine.ui.trainer.openTrainerUI(this.engine.activeTrainer);
            }
          });
        }
      } else {
        btn.innerText = "Error Saving!";
        btn.style.borderColor = "#e74c3c";
        btn.style.color = "#e74c3c";
      }
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.style.borderColor = "#2ecc71";
        btn.style.color = "#2ecc71";
      }, 2000);
    }).catch(e => {
      console.error("Error saving power:", e);
      btn.innerText = "Network Error!";
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.style.borderColor = "#2ecc71";
        btn.style.color = "#2ecc71";
      }, 2000);
    });
  }
}
