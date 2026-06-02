import * as THREE from 'three';
import { POWER_REGISTRY } from './game/registry.js?v=new-engine-330';

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

    this.previewState = {
      playing: true,
      currentSequence: 'None',
      frameIdx: 0,
      lastTick: 0,
      images: {}
    };

    this.previewSim = {
      playing: false,
      time: 0,
      duration: 3.0,
      events: []
    };

    this.setupUI();
  }

  setupUI() {
    this.els.panel = document.getElementById('power-editor-panel');
    this.els.btnOpen = document.getElementById('btn-dev-power-editor');
    this.els.btnClose = document.getElementById('btn-close-power-editor');
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
        this.els.panel.style.display = 'block';
        this.loadData();
      });
    }

    if (this.els.btnClose) {
      this.els.btnClose.addEventListener('click', () => {
        this.els.panel.style.display = 'none';
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

    this.setupVisualsEngine();
  }

  setupVisualsEngine() {

    // Re-render tint instantly when dragging the color picker
    const tintInput = document.getElementById('pe-visual-tint');
    if (tintInput) {
      tintInput.addEventListener('input', () => { /* Render loop picks this up automatically */ });
    }

    this.initPreviewScene();
  }

  initPreviewScene() {
    const container = document.getElementById('pe-preview-container');
    if (!container) return;

    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.previewRenderer = new THREE.WebGLRenderer({ alpha: true });

    this.previewRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.previewRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.previewScene.add(ambientLight);

    const casterGeo = new THREE.BoxGeometry(20, 20, 20);
    const casterMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const casterMesh = new THREE.Mesh(casterGeo, casterMat);
    casterMesh.position.set(0, 0, 0);
    this.previewScene.add(casterMesh);

    const targetGeo = new THREE.BoxGeometry(20, 20, 20);
    const targetMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.set(200, 0, 0);
    this.previewScene.add(targetMesh);

    this.previewCamera.position.set(100, 100, 200);
    this.previewCamera.lookAt(100, 0, 0);

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      if (!this.els.panel || this.els.panel.style.display === 'none') return;

      const dt = clock.getDelta();
      const scrubber = document.getElementById('pe-preview-scrubber');
      const timeLabel = document.getElementById('pe-preview-time');
      const playBtn = document.getElementById('btn-pe-play-anim');

      if (this.previewSim.playing) {
        this.previewSim.time += dt;
        if (this.previewSim.time > this.previewSim.duration) {
          this.previewSim.playing = false;
          this.previewSim.time = this.previewSim.duration;
          if (playBtn) playBtn.innerText = '▶';
        }
        if (scrubber) scrubber.value = this.previewSim.time;
      } else if (scrubber) {
        this.previewSim.time = parseFloat(scrubber.value) || 0;
      }

      if (timeLabel) timeLabel.innerText = this.previewSim.time.toFixed(2) + 's';

      this.previewSim.events.forEach(ev => {
        if (this.previewSim.time >= ev.startTime && this.previewSim.time <= ev.endTime) {
          ev.sprite.visible = true;
          const localTime = this.previewSim.time - ev.startTime;

          if (ev.type === 'projectile') {
             ev.sprite.position.x = 200 * (localTime / (ev.endTime - ev.startTime));
             const frame = Math.floor(localTime / (ev.speed / 1000)) % ev.maxFrames;
             if (ev.sprite.material.map) ev.sprite.material.map.offset.set(frame / ev.maxFrames, 0);
          } else {
             const frame = Math.floor(localTime / (ev.speed / 1000));
             if (frame < ev.maxFrames) {
               if (ev.sprite.material.map) ev.sprite.material.map.offset.set(frame / ev.maxFrames, 0);
             } else {
               ev.sprite.visible = false;
             }
          }
        } else {
          ev.sprite.visible = false;
        }
      });

      this.previewRenderer.render(this.previewScene, this.previewCamera);
    };
    animate();

    const btnPlay = document.getElementById('btn-pe-play-anim');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (this.previewSim.playing) {
          this.previewSim.playing = false;
          btnPlay.innerText = '▶';
        } else {
          if (this.previewSim.time >= this.previewSim.duration) this.previewSim.time = 0;
          this.buildPreviewSimulation();
          this.previewSim.playing = true;
          btnPlay.innerText = '⏸';
        }
      });
    }

    const scrubber = document.getElementById('pe-preview-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', () => {
        this.previewSim.playing = false;
        if (btnPlay) btnPlay.innerText = '▶';
        if (this.previewSim.events.length === 0) this.buildPreviewSimulation();
      });
    }
  }

  buildPreviewSimulation() {
    if (!this.previewScene) {
      this.initPreviewScene();
      if (!this.previewScene) return;
    }

    this.previewSim.events.forEach(ev => {
      this.previewScene.remove(ev.sprite);
      if (ev.sprite.material.map) ev.sprite.material.map.dispose();
      ev.sprite.material.dispose();
    });
    this.previewSim.events = [];
    this.previewSim.duration = 0;

    const speedInput = document.getElementById('pe-proj-speed');
    const projSpeed = speedInput ? parseFloat(speedInput.value) || 400 : 400;
    const projDuration = 200 / Math.max(1, projSpeed);

    const addEvent = (sequenceId, type, startTime, offsetZ, delay) => {
      if (sequenceId === 'None' || !this.sequenceLibrary[sequenceId]) return;
      const seq = this.sequenceLibrary[sequenceId];
      const originalTex = this.engine.renderer.assetManager.textures[sequenceId] || this.sequenceLibrary[sequenceId].texture;
      if (!originalTex) return;

      const tex = originalTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1 / seq.frames, 1);
      tex.offset.set(0, 0);

      const tintInput = document.getElementById('pe-visual-tint');
      const tintColor = tintInput ? tintInput.value : '#ffffff';

      const mat = new THREE.SpriteMaterial({ map: tex, color: tintColor, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(64, 64, 1);

      if (type === 'caster' || type === 'projectile') sprite.position.set(0, 0, offsetZ || 0);
      else if (type === 'target') sprite.position.set(200, 0, offsetZ || 0);

      sprite.visible = false;
      this.previewScene.add(sprite);

      const duration = type === 'projectile' ? projDuration : (seq.frames * (seq.speed / 1000));
      const actualStart = startTime + (delay || 0);

      this.previewSim.events.push({
        sprite, type, startTime: actualStart, endTime: actualStart + duration, maxFrames: seq.frames, speed: seq.speed, offsetZ
      });

      if (actualStart + duration > this.previewSim.duration) {
        this.previewSim.duration = actualStart + duration;
      }
    };

    let maxCasterTime = 0;
    this.currentCasterVisuals.forEach(ev => {
      const seq = this.sequenceLibrary[ev.sequence];
      if (seq) {
        const dur = seq.frames * (seq.speed / 1000);
        if (dur > maxCasterTime) maxCasterTime = dur;
      }
      addEvent(ev.sequence, 'caster', 0, ev.offsetZ, ev.delay);
    });

    let projStart = maxCasterTime;
    this.currentProjectileVisuals.forEach(ev => addEvent(ev.sequence, 'projectile', projStart, ev.offsetZ, ev.delay));

    let targetStart = this.currentProjectileVisuals.length > 0 ? projStart + projDuration : maxCasterTime;
    this.currentTargetVisuals.forEach(ev => addEvent(ev.sequence, 'target', targetStart, ev.offsetZ, ev.delay));

    this.previewSim.duration += 0.2; // Small end padding

    const scrubber = document.getElementById('pe-preview-scrubber');
    if (scrubber) {
      scrubber.max = this.previewSim.duration;
      if (this.previewSim.time > this.previewSim.duration) this.previewSim.time = 0;
    }
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
      const [powersRes, powersetsRes] = await Promise.all([
        fetch('/api/powers'),
        fetch('/api/powersets')
      ]);

      if (powersRes.ok) this.powers = await powersRes.json();

      if (powersetsRes.ok) {
        const rawPowersets = await powersetsRes.json();
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
          <select class="pe-select effect-type" data-index="${index}">
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
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Magnitude</label>
          <input type="number" class="pe-text-input effect-mag" data-index="${index}" value="${effect.magnitude}">
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Chance (%)</label>
          <input type="number" class="pe-text-input effect-chance" data-index="${index}" min="0" max="100" value="${effect.chance}">
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Dur (s)</label>
          <input type="number" class="pe-text-input effect-dur" data-index="${index}" min="0" step="0.5" value="${effect.duration !== undefined ? effect.duration : 5}">
        </div>
        <div class="pe-input-row" style="flex: 1; margin: 0;">
          <label style="font-size: 0.75rem;">Tick (s)</label>
          <input type="number" class="pe-text-input effect-tick" data-index="${index}" min="0.1" step="0.1" value="${effect.tickRate !== undefined ? effect.tickRate : 1}">
        </div>
        <button class="btn-secondary btn-remove-effect" data-index="${index}" style="border-color: #e74c3c; color: #e74c3c; padding: 0 10px; height: 35px;">X</button>
      `;

      this.els.effectsList.appendChild(row);
    });

    this.els.effectsList.querySelectorAll('.effect-type').forEach(el => {
      el.addEventListener('change', (e) => { this.currentEffects[e.target.dataset.index].type = e.target.value; });
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
          <button class="btn-secondary btn-move-up-sprite" data-index="${index}" style="padding: 2px 5px; font-size: 0.6rem; height: 16px;" title="Move Up">▲</button>
          <button class="btn-secondary btn-move-down-sprite" data-index="${index}" style="padding: 2px 5px; font-size: 0.6rem; height: 16px;" title="Move Down">▼</button>
        </div>
        <div style="flex: 2; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Sequence</label>
           <select class="pe-select sprite-event-select" data-index="${index}">${optionsHtml}</select>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Height Offset</label>
           <input type="number" class="pe-text-input sprite-event-offset" data-index="${index}" value="${event.offsetZ || 0}">
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
           <label style="font-size: 0.75rem; color: var(--accent);">Delay (s)</label>
           <input type="number" class="pe-text-input sprite-event-delay" data-index="${index}" min="0" step="0.1" value="${event.delay || 0}">
        </div>
        <button class="btn-secondary btn-remove-sprite-event" data-index="${index}" style="border-color: #e74c3c; color: #e74c3c; padding: 0 10px; height: 35px; margin-top: auto;">X</button>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll('.sprite-event-select').forEach(el => {
      el.addEventListener('change', (e) => {
        const index = e.target.dataset.index;
        dataArray[index].sequence = e.target.value;
        this.previewState.currentSequence = e.target.value;
        this.previewState.frameIdx = 0;
        this.updateSequenceDetails(e.target.value);
        this.buildPreviewSimulation();
      });
    });

    listEl.querySelectorAll('.sprite-event-offset').forEach(el => {
      el.addEventListener('input', (e) => {
        dataArray[e.target.dataset.index].offsetZ = parseFloat(e.target.value) || 0;
        this.buildPreviewSimulation();
      });
    });
    listEl.querySelectorAll('.sprite-event-delay').forEach(el => {
      el.addEventListener('input', (e) => {
        dataArray[e.target.dataset.index].delay = parseFloat(e.target.value) || 0;
        this.buildPreviewSimulation();
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
          this.buildPreviewSimulation();
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
          this.buildPreviewSimulation();
        }
      });
    });

    listEl.querySelectorAll('.btn-remove-sprite-event').forEach(el => {
      el.addEventListener('click', (e) => {
        dataArray.splice(e.target.dataset.index, 1);
        this.renderSpriteEventList(type);
        this.buildPreviewSimulation();
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
    document.getElementById('pe-visual-tint').value = vis.tint || '#ffffff';
    document.getElementById('pe-visual-icon').value = vis.icon || '';
    document.getElementById('pe-visual-anim').value = vis.animation || 'idle';
    document.getElementById('pe-proj-speed').value = vis.projectileSpeed !== undefined ? vis.projectileSpeed : 400;
    document.getElementById('pe-proj-arc').value = vis.projectileArc !== undefined ? vis.projectileArc : 0;

    this.currentCasterVisuals = vis.casterVisuals ? JSON.parse(JSON.stringify(vis.casterVisuals)) : [];
    this.currentProjectileVisuals = vis.projectileVisuals ? JSON.parse(JSON.stringify(vis.projectileVisuals)) : [];
    this.currentTargetVisuals = vis.targetVisuals ? JSON.parse(JSON.stringify(vis.targetVisuals)) : [];
    this.renderSpriteEventList('caster');
    this.renderSpriteEventList('projectile');
    this.renderSpriteEventList('target');

    // Automatically display the cast animation in the preview window
    const firstCastSeq = this.currentCasterVisuals.length > 0 ? this.currentCasterVisuals[0].sequence : 'None';
    this.previewState.currentSequence = firstCastSeq;
    this.previewState.frameIdx = 0;
    this.updateSequenceDetails(this.previewState.currentSequence);
    this.buildPreviewSimulation();

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
        tint: document.getElementById('pe-visual-tint').value,
        icon: document.getElementById('pe-visual-icon').value,
        animation: document.getElementById('pe-visual-anim').value,
        casterVisuals: this.currentCasterVisuals,
        projectileVisuals: this.currentProjectileVisuals,
        targetVisuals: this.currentTargetVisuals,
        projectileSpeed: isNaN(projSVal) ? 400 : projSVal,
        projectileArc: isNaN(projAVal) ? 0 : projAVal
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
