import { FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { NPCManagerWindow, NPCEditWindow, EntityGroupManagerWindow, SpawnerManagerWindow, SpawnerEditWindow, MobPackManagerWindow, NPCTemplateManagerWindow, EntityTypeManagerWindow, PowerSelectorWindow } from '../windows/npc-windows.js?v=cache-bust-005';
import { PlayerManagerWindow } from '../windows/player-windows.js?v=cache-bust-005';
import { ZoneManagerWindow, NeighborhoodManagerWindow } from '../windows/zone-windows.js?v=cache-bust-005';
import { ArcadeManagerWindow, ArcadeEditWindow } from '../windows/arcade-windows.js?v=cache-bust-005';
import { DevToolsWindow, BuilderToolsWindow, ObjectLibraryWindow, TexturePaletteWindow, LosEditWindow } from '../windows/dev-windows.js?v=cache-bust-005';
import { UI_COLORS } from './constants.js?v=cache-bust-005';
import { BuilderUIManager } from './dev-tools/builder-ui.js?v=cache-bust-005';
import { NpcUIManager } from './dev-tools/npc-manager-ui.js?v=cache-bust-005';
import { SpawnerManagerUI } from './dev-tools/spawner-manager-ui.js?v=cache-bust-005';
import { WorldManagerUI } from './dev-tools/world-manager-ui.js?v=cache-bust-005';

const DEFAULT_FACTIONS = ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'];
const NPC_ROW_STYLE = 'display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px;';
const PLAYER_ROW_STYLE = 'display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 8px; border-radius: 4px; font-size: 0.8rem;';
const TOOLTIP_STYLE = `position: fixed; background: rgba(0,0,0,0.9); border: 1px solid ${UI_COLORS.primary}; color: #fff; padding: 5px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; pointer-events: none; z-index: 1000000; display: none; white-space: nowrap; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.8);`;
const SHAPE_CONTAINER_STYLE = 'display: flex; gap: 5px; align-items: center; flex-wrap: wrap; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; border: 1px solid #333; justify-content: center;';
const SHAPE_BTN_STYLE = `padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary}; min-width: 100px;`;
const DIR_BTN_STYLE = `padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: ${UI_COLORS.orange}; color: ${UI_COLORS.orange}; display: none; min-width: 40px;`;
const REL_BTN_STYLE = `padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: ${UI_COLORS.purple}; color: ${UI_COLORS.purple}; display: none; min-width: 40px;`;
const FLUID_BTN_STYLE = `padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary}; display: none; width: 100%;`;

export class DevToolsUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.engine.buildColor = UI_COLORS.textBright;
    this.ui = mainUIManager;
    this.entityGroupsData = {};
    this.selectedEntityGroup = null;

    this.npcManagerWindow = new NPCManagerWindow();
    this.npcEditWindow = new NPCEditWindow();
    this.spawnerManagerWindow = new SpawnerManagerWindow();
    this.spawnerEditWindow = new SpawnerEditWindow();
    this.entityGroupManagerWindow = new EntityGroupManagerWindow();
    this.playerManagerWindow = new PlayerManagerWindow();
    this.mobPackManagerWindow = new MobPackManagerWindow();
    this.npcTemplateManagerWindow = new NPCTemplateManagerWindow();
    this.entityTypeManagerWindow = new EntityTypeManagerWindow();
    this.powerSelectorWindow = new PowerSelectorWindow();
    this.zoneManagerWindow = new ZoneManagerWindow();
    this.neighborhoodManagerWindow = new NeighborhoodManagerWindow();
    this.arcadeManagerWindow = new ArcadeManagerWindow();
    this.arcadeEditWindow = new ArcadeEditWindow();

    this.devToolsWindow = new DevToolsWindow();
    this.builderToolsWindow = new BuilderToolsWindow();
    this.losEditWindow = new LosEditWindow();
    this.objectLibraryWindow = new ObjectLibraryWindow();
    this.texturePaletteWindow = new TexturePaletteWindow();

    this.builderUI = new BuilderUIManager(this.engine, this);
    this.npcUI = new NpcUIManager(this.engine, this);
    this.spawnerUI = new SpawnerManagerUI(this.engine, this);
    this.worldUI = new WorldManagerUI(this.engine, this);

    this.setupDevTools();
    this.setupSideHudButtons();
    this.setupPlayerManager();
    this.worldUI.setupZoneManager();
    this.worldUI.setupArcadeManager();
    this.worldUI.setupNeighborhoodManager();
    this.spawnerUI.setupMobPacks();
    this.npcUI.setupEntityGroupManager();
    this.npcUI.setupNpcTemplates();
    this.npcUI.setupEntityTypes();

    this.builderUI.setupBuilderTools();
    this.builderUI.setupObjectLibrary();
    this.builderUI.updateBuildingMode();

    const setupPathEditor = (btnId, inputId, modalRef) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.onclick = () => {
          this.engine.pathEditMode = true;
          this.engine.pathEditInputId = inputId;
          modalRef.close();

          let overlay = document.getElementById('path-edit-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'path-edit-overlay';
          overlay.style.cssText = `position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(5,7,10,0.9); border: 2px solid ${UI_COLORS.pink}; padding: 10px; border-radius: 8px; z-index: 100000; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); pointer-events: auto;`;

            overlay.innerHTML = `
                        <span style="color: #fff; font-family: var(--font-mono); font-size: 0.9rem;"><b>Path Editor:</b> Right-Click map to add nodes.</span>
                      <label style="color: ${UI_COLORS.warning}; font-family: var(--font-mono); font-size: 0.8rem; margin-left: 10px;">Wait (s):</label>
                        <input type="number" id="path-edit-wait" value="2" style="width: 50px; background: #000; color: #fff; border: 1px solid #333; border-radius: 4px; padding: 2px 5px; outline: none;">
                      <button id="btn-path-edit-undo" class="b-btn btn-secondary" style="padding: 4px 10px; margin-left: 10px; border-color: ${UI_COLORS.error}; color: ${UI_COLORS.error};">Undo Last</button>
                        <button id="btn-path-edit-done" class="b-btn btn-primary" style="padding: 4px 15px; margin-left: 5px;">Done</button>
                    `;
            document.body.appendChild(overlay);
          }
          overlay.style.display = 'flex';

          document.getElementById('btn-path-edit-undo').onclick = () => {
            const inputEl = document.getElementById(this.engine.pathEditInputId);
            if (inputEl) {
              let parts = inputEl.value.split(';').map(s => s.trim()).filter(Boolean);
              if (parts.length > 0) {
                if (parts[parts.length - 1].startsWith('wait')) parts.pop();
                parts.pop();
                inputEl.value = parts.join('; ');
                inputEl.dispatchEvent(new Event('input'));
              }
            }
          };

          document.getElementById('btn-path-edit-done').onclick = () => {
            this.engine.pathEditMode = false;
            overlay.style.display = 'none';
            if (this.engine.pathEditInputId.includes('spawner')) this.spawnerEditWindow.open();
            else this.npcEditWindow.open();
          };
        };
      }
    };

    setTimeout(() => {
      setupPathEditor('btn-edit-npc-path', 'edit-npc-patrol', this.npcEditWindow);
      setupPathEditor('btn-edit-spawner-path', 'edit-spawner-patrol', this.spawnerEditWindow);
    }, 1000);
  }

  openPowerSelector(onSelect) {
    const allPowers = Object.entries(window.POWER_REGISTRY || {}).map(([pId, pDef]) => {
      let assignedSetNames = [];
      if (this.engine.powersetsData) {
        for (const [setId, setDef] of Object.entries(this.engine.powersetsData)) {
          if (setDef.powers && setDef.powers.some(p => p.id === pId || p.name === pDef.name)) {
            assignedSetNames.push(setDef.name);
          }
        }
      }
      return { id: pId, name: pDef.name || pId, assignedSetNames };
    });

    this.powerSelectorWindow.open();

    const searchInput = document.getElementById('power-selector-search');
    const listContainer = document.getElementById('power-selector-list');

    const render = () => {
      const filter = searchInput.value.toLowerCase();
      listContainer.innerHTML = '';

      let sortedPowers = [...allPowers].sort((a, b) => a.name.localeCompare(b.name));

      sortedPowers.forEach(p => {
        const pName = p.name.toLowerCase();
        const pId = p.id.toLowerCase();
        let match = pName.includes(filter) || pId.includes(filter);

        if (p.assignedSetNames) {
          p.assignedSetNames.forEach(psName => { if (psName.toLowerCase().includes(filter)) match = true; });
        }

        if (!match) return;
        const btn = document.createElement('button');
        btn.className = 'b-btn btn-secondary';
        btn.style.cssText = 'text-align: left; padding: 5px; font-size: 0.85rem; display: flex; flex-direction: column; border-color: var(--text-dim);';
        btn.innerHTML = `<strong style="color: #fff;">${p.name}</strong><span style="color: #aaa; font-size: 0.7rem;">${p.assignedSetNames.join(', ')}</span>`;
        btn.onclick = () => { onSelect(p.id); this.powerSelectorWindow.close(); };
        listContainer.appendChild(btn);
      });
    };
    searchInput.value = ''; searchInput.oninput = render;
    document.getElementById('btn-power-selector-close').onclick = () => this.powerSelectorWindow.close();
    render();
  }

  // --- Facades for External / Network Calls ---
  renderNpcManager() { this.npcUI.renderNpcManager(); }
  renderNpcTemplates() { this.npcUI.renderNpcTemplates(); }
  renderEntityTypes() { this.npcUI.renderEntityTypes(); }
  renderEntityGroupManager(data) { this.npcUI.renderEntityGroupManager(data); }
  renderMobPacks() { this.spawnerUI.renderMobPacks(); }
  renderSpawnerManager() { this.spawnerUI.renderSpawnerManager(); }
  updateSpawnerEditNpcList(uuid) { this.spawnerUI.updateSpawnerEditNpcList(uuid); }
  renderZoneManager() { this.worldUI.renderZoneManager(); }
  renderNeighborhoodManager() { this.worldUI.renderNeighborhoodManager(); }
  renderArcadeManager() { this.worldUI.renderArcadeManager(); }

  setupSideHudButtons() {
    const sideHud = document.querySelector('.game-side-hud');
    if (!sideHud) return;

    const createBtn = (id, text, title, onClick, permission) => {
      if (permission) {
        const pName = this.engine.playerData.name.toLowerCase();
        const perms = this.engine.permissions[permission] || [];
        if (!perms.includes('*') && !perms.includes(pName)) {
          return;
        }
      }

      if (document.getElementById(id)) return;
      const btn = document.createElement('button');
      btn.id = id;
      btn.className = 'btn-secondary';
      btn.style.cssText = `width: auto; height: 45px; padding: 0 10px; font-weight: bold; background: rgba(0,0,0,0.8); border-color: ${UI_COLORS.orange}; color: ${UI_COLORS.orange}; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;`;
      btn.innerText = text;
      btn.title = title;
      btn.onclick = onClick;
      btn.onmouseenter = () => btn.style.background = 'rgba(243, 156, 18, 0.2)';
      btn.onmouseleave = () => btn.style.background = 'rgba(0,0,0,0.8)';

      const btnPowers = document.getElementById('btn-powers');
      if (btnPowers) sideHud.insertBefore(btn, btnPowers);
      else sideHud.appendChild(btn);
    };

    createBtn('btn-hud-npc', 'NPC', 'NPC Manager', () => {
      if (this.npcManagerWindow.element.style.display === 'none') {
        this.npcManagerWindow.open();
        this.renderNpcManager();
      } else {
        this.npcManagerWindow.close();
      }
    });
    createBtn('btn-hud-dev', '/dev', 'Toggle Dev Tools', () => this.engine.chat.commandHandler.processCommand('/dev'));
    createBtn('btn-hud-edit', '/edit', 'Toggle Edit Mode', () => this.engine.chat.commandHandler.processCommand('/editmode'));
  }

  setupDevTools() {
    const eng = this.engine;

    const tabBtns = this.devToolsWindow.element.querySelectorAll('.dev-tab-btn');
    const tabPanels = this.devToolsWindow.element.querySelectorAll('.dev-tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
          b.classList.remove('active', 'btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-secondary');

        const tabId = btn.dataset.tab;
        tabPanels.forEach(panel => {
          panel.style.display = panel.id === tabId ? 'flex' : 'none';
        });
      });
    });

    const setupDevBtn = (id, prop, color) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.style.borderColor = eng.devOptions[prop] ? color : '';
        btn.style.color = eng.devOptions[prop] ? color : '';
        btn.onclick = () => {
          eng.devOptions[prop] = !eng.devOptions[prop];
          btn.style.borderColor = eng.devOptions[prop] ? color : '';
          btn.style.color = eng.devOptions[prop] ? color : '';
          localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
        };
      }
    };

    setupDevBtn('btn-dev-player', 'showPlayerPos', UI_COLORS.critical);
    setupDevBtn('btn-dev-entity', 'showEntityPos', UI_COLORS.critical);
    setupDevBtn('btn-dev-dist-player-mouse', 'showDistPlayerToMouse', UI_COLORS.warning);
    setupDevBtn('btn-dev-dist-mouse', 'showDistNpcToMouse', UI_COLORS.warning);
    setupDevBtn('btn-dev-dist-npc', 'showDistToNPC', UI_COLORS.warning);
    setupDevBtn('btn-dev-aggro', 'showAggro', '#e67e22');
    setupDevBtn('btn-dev-melee', 'showMelee', UI_COLORS.critical);
    setupDevBtn('btn-dev-los', 'showLoS', UI_COLORS.warning);
    setupDevBtn('btn-dev-hitbox', 'showHitboxes', UI_COLORS.critical);
    setupDevBtn('btn-dev-npc-paths', 'showNpcPaths', UI_COLORS.purple);
    setupDevBtn('btn-dev-spawners', 'showSpawners', UI_COLORS.success);
    setupDevBtn('btn-dev-arcade-hover', 'showArcadeHover', UI_COLORS.primary);
    setupDevBtn('btn-dev-neighborhoods', 'showNeighborhoods', UI_COLORS.pink);

    const editBtn = document.getElementById('btn-dev-los-edit');
    if (editBtn) {
      editBtn.onclick = () => {
        document.getElementById('edit-los-dist').value = eng.devOptions.losDistance !== undefined ? eng.devOptions.losDistance : 400;
        document.getElementById('edit-los-angle').value = eng.devOptions.losAngle !== undefined ? eng.devOptions.losAngle : 60;
        this.losEditWindow.open();
      };
    }

    const tBtn = document.getElementById('btn-dev-tooltip-toggle');
    if (tBtn) {
      tBtn.style.background = eng.devOptions.useDebugTooltip ? 'rgba(241, 196, 15, 0.2)' : 'transparent';
      tBtn.onclick = () => {
        eng.devOptions.useDebugTooltip = !eng.devOptions.useDebugTooltip;
        tBtn.style.background = eng.devOptions.useDebugTooltip ? 'rgba(241, 196, 15, 0.2)' : 'transparent';
        localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
      };
    }

    const btnEditTarget = document.getElementById('btn-dev-edit-target');
    if (btnEditTarget) {
      btnEditTarget.style.borderColor = UI_COLORS.pink;
      btnEditTarget.style.color = UI_COLORS.pink;
      btnEditTarget.onclick = () => {
        if (eng.selectedTarget && eng.selectedTarget.type === 'npc') {
          const npc = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
          if (npc) {
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
            document.getElementById('edit-npc-aggro').value = npc.aggroRadius !== undefined ? npc.aggroRadius : 500;
            document.getElementById('edit-npc-patrol').value = npc.patrolRoute || '';
            document.getElementById('edit-npc-powers').value = (npc.powers || []).join(', ');

            this.npcEditWindow.open();
          }
        }
      };
    }

    const btnNpcManager = document.getElementById('btn-dev-npc-manager');
    if (btnNpcManager) {
      btnNpcManager.style.borderColor = UI_COLORS.pink;
      btnNpcManager.style.color = UI_COLORS.pink;
      btnNpcManager.onclick = () => {
        if (this.npcManagerWindow.element.style.display === 'none') {
          this.npcManagerWindow.open();
          this.renderNpcManager();
        } else {
          this.npcManagerWindow.close();
        }
      };

      document.getElementById('btn-edit-npc-tp-me').onclick = () => {
        document.getElementById('edit-npc-x').value = Math.round(eng.player.x);
        document.getElementById('edit-npc-y').value = Math.round(eng.player.y);
        document.getElementById('edit-npc-z').value = Math.round(eng.player.z || 0);
        emitNpcUpdate();
      };

      const emitNpcUpdate = () => {
        const uuid = document.getElementById('edit-npc-uuid').value;
        if (!uuid) return;
        const energyVal = parseFloat(document.getElementById('edit-npc-energy').value);
        const updates = {
          name: document.getElementById('edit-npc-name').value,
          hp: parseFloat(document.getElementById('edit-npc-hp').value),
          maxHp: parseFloat(document.getElementById('edit-npc-maxhp').value),
          energy: energyVal,
          maxEnergy: energyVal,
          synthEnergy: parseFloat(document.getElementById('edit-npc-battery').value) || 0,
          maxSynthEnergy: parseFloat(document.getElementById('edit-npc-battery').value) || 0,
          x: parseFloat(document.getElementById('edit-npc-x').value),
          y: parseFloat(document.getElementById('edit-npc-y').value),
          z: parseFloat(document.getElementById('edit-npc-z').value),
          type: document.getElementById('edit-npc-type').value,
          dir: document.getElementById('edit-npc-dir').value,
          group: document.getElementById('edit-npc-group').value,
          respawnRate: parseFloat(document.getElementById('edit-npc-respawn').value) || 0,
          level: parseInt(document.getElementById('edit-npc-level').value, 10) || 1,
          strength: parseInt(document.getElementById('edit-npc-strength').value, 10) || 0,
          aggroRadius: parseFloat(document.getElementById('edit-npc-aggro').value) || 500,
          patrolRoute: document.getElementById('edit-npc-patrol').value || '',
          powers: document.getElementById('edit-npc-powers').value.split(',').map(s => s.trim()).filter(Boolean)
        };
        eng.network.sendEditNpc(uuid, updates);
      };

      ['edit-npc-name', 'edit-npc-hp', 'edit-npc-maxhp', 'edit-npc-energy', 'edit-npc-battery', 'edit-npc-x', 'edit-npc-y', 'edit-npc-z', 'edit-npc-respawn', 'edit-npc-level', 'edit-npc-aggro', 'edit-npc-patrol', 'edit-npc-powers'].forEach(id => {
        document.getElementById(id).addEventListener('input', emitNpcUpdate);
      });
      ['edit-npc-type', 'edit-npc-dir', 'edit-npc-group', 'edit-npc-strength'].forEach(id => {
        document.getElementById(id).addEventListener('change', emitNpcUpdate);
      });

      document.getElementById('btn-save-npc-edit').onclick = () => this.npcEditWindow.close();

      eng.socket.on('npc_deleted', (uuid) => {
        const idx = eng.npcs.findIndex(n => n.uuid === uuid);
        if (idx !== -1) eng.npcs.splice(idx, 1);
        if (this.npcManagerWindow.element.style.display === 'flex') this.renderNpcManager();
        if (this.spawnerEditWindow.element.style.display === 'flex') this.updateSpawnerEditNpcList();
      });
      eng.socket.on('npc_spawned', () => {
        if (this.npcManagerWindow.element.style.display === 'flex') this.renderNpcManager();
        if (this.spawnerEditWindow.element.style.display === 'flex') this.updateSpawnerEditNpcList();
      });
      eng.socket.on('npc_updated', (updatedNpc) => {
        const idx = eng.npcs.findIndex(n => n.uuid === updatedNpc.uuid);
        if (idx !== -1) {
          Object.assign(eng.npcs[idx], updatedNpc);
        }
        if (this.npcManagerWindow.element.style.display === 'flex') this.renderNpcManager();
        if (this.spawnerEditWindow.element.style.display === 'flex') this.updateSpawnerEditNpcList();
      });
    }

    const btnSpawnerManager = document.getElementById('btn-dev-spawner-manager');
    if (btnSpawnerManager) {
      btnSpawnerManager.onclick = () => {
        if (this.spawnerManagerWindow.element.style.display === 'none') {
          this.spawnerManagerWindow.open();
          this.renderSpawnerManager();
        } else {
          this.spawnerManagerWindow.close();
        }
      };

      document.getElementById('btn-edit-spawner-tp-me').onclick = () => {
        document.getElementById('edit-spawner-x').value = Math.round(eng.player.x);
        document.getElementById('edit-spawner-y').value = Math.round(eng.player.y);
        document.getElementById('edit-spawner-z').value = Math.round(eng.player.z || 0);
        emitSpawnerUpdate();
      };

      const emitSpawnerUpdate = () => {
        const uuidEl = document.getElementById('edit-spawner-uuid');
        if (!uuidEl || !uuidEl.value) return;
        const uuid = uuidEl.value;
        const updates = {
          name: document.getElementById('edit-spawner-name')?.value || 'New Spawner',
          x: parseFloat(document.getElementById('edit-spawner-x').value),
          y: parseFloat(document.getElementById('edit-spawner-y').value),
          z: parseFloat(document.getElementById('edit-spawner-z').value),
          radius: parseFloat(document.getElementById('edit-spawner-radius').value) || 300,
          respawnRate: parseFloat(document.getElementById('edit-spawner-rate').value) || 10,
          patrolRoute: document.getElementById('edit-spawner-patrol').value || ''
        };
        eng.network.sendEditSpawner(uuid, updates);
      };

      ['edit-spawner-name', 'edit-spawner-x', 'edit-spawner-y', 'edit-spawner-z', 'edit-spawner-radius', 'edit-spawner-rate', 'edit-spawner-patrol'].forEach(id => {
        document.getElementById(id).addEventListener('input', emitSpawnerUpdate);
      });
      document.getElementById('btn-save-spawner-edit').onclick = () => this.spawnerEditWindow.close();
      const btnUpdateSpawner = document.getElementById('btn-update-spawner-edit');
      if (btnUpdateSpawner) btnUpdateSpawner.onclick = emitSpawnerUpdate;

      const wipeBtn = document.getElementById('btn-spawner-wipe-npcs');
      if (wipeBtn) wipeBtn.onclick = () => {
        const uuid = document.getElementById('edit-spawner-uuid').value;
        if (uuid && confirm(`Wipe all currently spawned NPCs from this spawner?`)) {
          this.engine.network.socket.emit('wipe_spawner_npcs', uuid);
        }
      };

      eng.socket.on('spawner_deleted', (uuid) => {
        const idx = eng.spawners.findIndex(s => s.uuid === uuid);
        if (idx !== -1) eng.spawners.splice(idx, 1);
        if (this.spawnerManagerWindow.element.style.display === 'flex') this.renderSpawnerManager();
      });
      eng.socket.on('spawner_spawned', (spawner) => {
        eng.spawners.push(spawner);
        if (this.spawnerManagerWindow.element.style.display === 'flex') this.renderSpawnerManager();
      });
      eng.socket.on('spawner_updated', (updated) => {
        const idx = eng.spawners.findIndex(s => s.uuid === updated.uuid);
        if (idx !== -1) Object.assign(eng.spawners[idx], updated);
        if (this.spawnerManagerWindow.element.style.display === 'flex') this.renderSpawnerManager();
      });
    }

    const btnGroupManager = document.getElementById('btn-dev-group-manager');
    if (btnGroupManager) {
      btnGroupManager.onclick = () => {
        if (this.entityGroupManagerWindow.element.style.display === 'none') {
          this.entityGroupManagerWindow.open();
          this.engine.network.sendRequestEntityGroups();
        } else {
          this.entityGroupManagerWindow.close();
        }
      };
    }

    const btnMobPack = document.getElementById('btn-dev-mobpack-manager');
    if (btnMobPack) {
      btnMobPack.onclick = () => {
        if (this.mobPackManagerWindow.element.style.display === 'none') {
          if (this.mobPackManagerWindow.setTitle) {
              this.mobPackManagerWindow.setTitle('Encounter Presets');
          }
          this.mobPackManagerWindow.open();
          this.engine.network.sendRequestEntityGroups();
          this.engine.network.socket.emit('request_mob_packs');
          this.renderMobPacks();
        } else {
          this.mobPackManagerWindow.close();
        }
      };
    }

    const btnNpcTemplate = document.getElementById('btn-dev-npc-template-manager');
    if (btnNpcTemplate) {
      btnNpcTemplate.onclick = () => {
        if (this.npcTemplateManagerWindow.element.style.display === 'none') {
          this.npcTemplateManagerWindow.open();
          this.engine.network.socket.emit('request_npc_templates');
          this.engine.network.sendRequestEntityGroups();
        } else {
          this.npcTemplateManagerWindow.close();
        }
      };
    }

    const btnEntityType = document.getElementById('btn-dev-entity-type-manager');
    if (btnEntityType) {
      btnEntityType.onclick = () => {
        if (this.entityTypeManagerWindow.element.style.display === 'none') {
          this.entityTypeManagerWindow.open();
          this.engine.network.socket.emit('request_entity_types');
        } else {
          this.entityTypeManagerWindow.close();
        }
      };
    }

    const btnPlayerManager = document.getElementById('btn-dev-player-manager');
    if (btnPlayerManager) btnPlayerManager.onclick = () => eng.chat.commandHandler.processCommand('/players');

    const btnAccountManager = document.getElementById('btn-dev-account-manager');
    if (btnAccountManager) btnAccountManager.onclick = () => eng.ui.playerModifier.openAccountManagerList();

    const btnEditMode = document.getElementById('btn-dev-edit-mode');
    if (btnEditMode) btnEditMode.onclick = () => eng.chat.commandHandler.processCommand('/editmode');

    const btnZoneManager = document.getElementById('btn-dev-zone-manager');
    if (btnZoneManager) {
      btnZoneManager.onclick = () => {
        if (this.zoneManagerWindow.element.style.display === 'none') {
          this.zoneManagerWindow.open();
          this.renderZoneManager();
        } else {
          this.zoneManagerWindow.close();
        }
      };
    }

    const btnNeighborhoodManager = document.getElementById('btn-dev-neighborhood-manager');
    if (btnNeighborhoodManager) {
      btnNeighborhoodManager.onclick = () => {
        if (this.neighborhoodManagerWindow.element.style.display === 'none') {
          this.neighborhoodManagerWindow.open();
          this.renderNeighborhoodManager();
          this.engine.network.socket.emit('request_neighborhoods');
        } else {
          this.neighborhoodManagerWindow.close();
        }
      };
    }

    const btnArcadeManager = document.getElementById('btn-dev-arcade-manager');
    if (btnArcadeManager) {
      btnArcadeManager.onclick = () => {
        if (this.arcadeManagerWindow.element.style.display === 'none') {
          this.arcadeManagerWindow.open();
          this.renderArcadeManager();
        } else {
          this.arcadeManagerWindow.close();
        }
      };
    }

    this.setupLosModal();
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
    const groups = Object.keys(this.entityGroupsData || {}).sort();
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

  setupLosModal() {
    const eng = this.engine;
    document.getElementById('btn-close-los').onclick = () => this.losEditWindow.close();
    const btnSaveLos = document.getElementById('btn-save-los');
    if (btnSaveLos) btnSaveLos.onclick = () => {
      eng.devOptions.losDistance = parseInt(document.getElementById('edit-los-dist').value, 10) || 400;
      eng.devOptions.losAngle = parseInt(document.getElementById('edit-los-angle').value, 10) || 60;
      localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
      this.losEditWindow.close();
    };
  }

  setupPlayerManager() {
    const eng = this.engine;
    document.getElementById('pm-search-input').addEventListener('input', () => this.renderPlayerManager());

    let pmCtx = document.getElementById('player-manager-ctx');
    if (!pmCtx) {
      pmCtx = document.createElement('div');
      pmCtx.id = 'player-manager-ctx';
      pmCtx.style.cssText = `position: fixed; background: rgba(5,7,10,0.95); border: 1px solid ${UI_COLORS.primary}; border-radius: 4px; padding: 5px; display: none; flex-direction: column; gap: 5px; z-index: 100000; font-family: var(--font-mono); font-size: 0.9rem; min-width: 120px;`;
      document.body.appendChild(pmCtx);
      document.addEventListener('click', () => { if (pmCtx.style.display === 'flex') pmCtx.style.display = 'none'; });
    }
  }

  renderPlayerManager() {
    if (!this.allPlayersList) return; // Waiting for server data

    const list = document.getElementById('player-manager-list');
    if (!list) return;
    list.innerHTML = '';

    const searchVal = document.getElementById('pm-search-input')?.value.toLowerCase() || '';

    // Deduplicate by name (preferring online status if there are dupes)
    const uniquePlayers = new Map();
    this.allPlayersList.forEach(p => {
      const name = p.name.toLowerCase();
      if (!uniquePlayers.has(name) || (p.online && !uniquePlayers.get(name).online)) {
        uniquePlayers.set(name, p);
      }
    });

    const filtered = Array.from(uniquePlayers.values()).filter(p => p.name.toLowerCase().includes(searchVal));

    filtered.sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return a.name.localeCompare(b.name);
    });

    filtered.forEach(p => {
      const isSelf = p.name.toLowerCase() === this.engine.playerData.name.toLowerCase();
      const color = p.online ? (isSelf ? UI_COLORS.success : UI_COLORS.primary) : '#7f8c8d';
      const statusIcon = p.online ? '🟢' : '⚫';

      const row = document.createElement('div');
      row.style.cssText = PLAYER_ROW_STYLE;

      row.innerHTML = `
          <div style="flex: 1.2; font-weight: bold; color: ${color};" title="${p.name}">
              <span style="font-size: 0.6rem; margin-right: 4px;">${statusIcon}</span>
              ${p.name} <span style="color: #aaa; font-size: 0.75rem;">(Lv.${p.level || 1})</span>
          </div>
          <div style="flex: 1.5; display: flex; flex-direction: column; justify-content: center; gap: 2px;">
              <span style="color: ${UI_COLORS.warning}; font-size: 0.75rem;">Zone: ${p.zone || 'untitled'}</span>
              <span style="color: #aaa; font-size: 0.7rem;">X:${Math.round(p.x)} Y:${Math.round(p.y)} Z:${Math.round(p.z || 0)}</span>
          </div>
          <div style="flex: 0.8;">${p.alignment || 'N/A'}</div>
          <div style="flex: 0.8;">${p.race || 'N/A'}</div>
          <div style="flex: 0.8;">${p.integrity || 0}%</div>
          <div style="flex: 1;">${Math.floor(p.hp || 0)} / ${p.maxHp || 1000}</div>
          <button class="btn-edit btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;">Edit</button>
      `;

      if (p.online) {
        const tpBtn = document.createElement('button');
        tpBtn.className = 'btn-tp btn-secondary';
        tpBtn.style.cssText = 'padding: 2px 8px; font-size: 0.7rem; margin-right: 5px;';
        tpBtn.innerText = 'TP';
        tpBtn.onclick = () => {
          this.engine.chat.commandHandler.processCommand(`/tp ${Math.round(p.x)} ${Math.round(p.y)} ${Math.round(p.z || 0)}`);
        };
        row.insertBefore(tpBtn, row.lastElementChild);
      }

      const kickBtn = document.createElement('button');
      kickBtn.className = 'btn-secondary';
      kickBtn.style.cssText = `padding: 2px 8px; font-size: 0.7rem; margin-right: 5px; border-color: ${UI_COLORS.error}; color: ${UI_COLORS.error};`;
      kickBtn.innerText = 'Kick';
      kickBtn.onclick = () => {
        if (confirm(`Kick ${p.name}?`)) this.engine.network.sendAdminKickPlayer(p.name);
      };
      row.insertBefore(kickBtn, row.lastElementChild);

      row.querySelector('.btn-edit').onclick = () => {
        this.engine.network.sendRequestPlayerData(p.name);
      };

      row.oncontextmenu = (e) => {
        e.preventDefault();
        const pmCtx = document.getElementById('player-manager-ctx');
        if (!pmCtx) return;
        pmCtx.innerHTML = `
            <button class="btn-secondary" id="pm-ctx-copy-name" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">Copy Name</button>
            <button class="btn-secondary" id="pm-ctx-copy-uuid" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">Copy Account UUID</button>
          `;
        pmCtx.style.left = e.clientX + 'px';
        pmCtx.style.top = e.clientY + 'px';
        pmCtx.style.display = 'flex';

        document.getElementById('pm-ctx-copy-name').onclick = () => {
          navigator.clipboard.writeText(p.name);
          this.engine.ui.showSystemMessage('Copied name to clipboard: ' + p.name);
        };
        document.getElementById('pm-ctx-copy-uuid').onclick = () => {
          const uuidToCopy = p.accountUuid || 'Unknown UUID';
          navigator.clipboard.writeText(uuidToCopy);
          this.engine.ui.showSystemMessage('Copied UUID to clipboard: ' + uuidToCopy);
        };
      };

      list.appendChild(row);
    });
  }
  // 2:19a
}
