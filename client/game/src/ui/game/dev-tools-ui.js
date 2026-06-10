import { FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { NPCManagerWindow, NPCEditWindow, EntityGroupManagerWindow, SpawnerManagerWindow, SpawnerEditWindow, MobPackManagerWindow, NPCTemplateManagerWindow, EntityTypeManagerWindow, PowerSelectorWindow } from '../windows/npc-windows.js?v=cache-bust-005';
import { PlayerManagerWindow } from '../windows/player-windows.js?v=cache-bust-005';
import { ZoneManagerWindow, NeighborhoodManagerWindow } from '../windows/zone-windows.js?v=cache-bust-005';
import { ArcadeManagerWindow, ArcadeEditWindow } from '../windows/arcade-windows.js?v=cache-bust-005';
import { DevToolsWindow, BuilderToolsWindow, ObjectLibraryWindow, TexturePaletteWindow, LosEditWindow } from '../windows/dev-windows.js?v=cache-bust-005';

const NPC_ROW_STYLE = 'display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px;';
const PLAYER_ROW_STYLE = 'display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 8px; border-radius: 4px; font-size: 0.8rem;';
const TOOLTIP_STYLE = 'position: fixed; background: rgba(0,0,0,0.9); border: 1px solid #3498db; color: #fff; padding: 5px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; pointer-events: none; z-index: 1000000; display: none; white-space: nowrap; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.8);';
const SHAPE_CONTAINER_STYLE = 'display: flex; gap: 5px; align-items: center; flex-wrap: wrap; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; border: 1px solid #333; justify-content: center;';
const SHAPE_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; min-width: 100px;';
const DIR_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #f39c12; color: #f39c12; display: none; min-width: 40px;';
const REL_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #9b59b6; color: #9b59b6; display: none; min-width: 40px;';
const FLUID_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; display: none; width: 100%;';

export class DevToolsUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.engine.buildColor = '#ffffff';
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

    this.setupDevTools();
    this.setupBuilderTools();
    this.setupEntityGroupManager();
    this.setupObjectLibrary();
    this.setupSideHudButtons();
    this.setupPlayerManager();
    this.setupZoneManager();
    this.setupArcadeManager();
    this.setupNeighborhoodManager();
    this.setupMobPacks();
    this.setupNpcTemplates();
    this.setupEntityTypes();
    this.updateBuildingMode();

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
            overlay.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(5,7,10,0.9); border: 2px solid #e056fd; padding: 10px; border-radius: 8px; z-index: 100000; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); pointer-events: auto;';

            overlay.innerHTML = `
                        <span style="color: #fff; font-family: var(--font-mono); font-size: 0.9rem;"><b>Path Editor:</b> Right-Click map to add nodes.</span>
                        <label style="color: #f1c40f; font-family: var(--font-mono); font-size: 0.8rem; margin-left: 10px;">Wait (s):</label>
                        <input type="number" id="path-edit-wait" value="2" style="width: 50px; background: #000; color: #fff; border: 1px solid #333; border-radius: 4px; padding: 2px 5px; outline: none;">
                        <button id="btn-path-edit-undo" class="b-btn btn-secondary" style="padding: 4px 10px; margin-left: 10px; border-color: #e74c3c; color: #e74c3c;">Undo Last</button>
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
      btn.style.cssText = 'width: auto; height: 45px; padding: 0 10px; font-weight: bold; background: rgba(0,0,0,0.8); border-color: #f39c12; color: #f39c12; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;';
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

    setupDevBtn('btn-dev-player', 'showPlayerPos', '#ff4757');
    setupDevBtn('btn-dev-entity', 'showEntityPos', '#ff4757');
    setupDevBtn('btn-dev-dist-player-mouse', 'showDistPlayerToMouse', '#f1c40f');
    setupDevBtn('btn-dev-dist-mouse', 'showDistNpcToMouse', '#f1c40f');
    setupDevBtn('btn-dev-dist-npc', 'showDistToNPC', '#f1c40f');
    setupDevBtn('btn-dev-aggro', 'showAggro', '#e67e22');
    setupDevBtn('btn-dev-melee', 'showMelee', '#ff4757');
    setupDevBtn('btn-dev-los', 'showLoS', '#f1c40f');
    setupDevBtn('btn-dev-hitbox', 'showHitboxes', '#ff4757');
    setupDevBtn('btn-dev-npc-paths', 'showNpcPaths', '#9b59b6');
    setupDevBtn('btn-dev-spawners', 'showSpawners', '#2ecc71');
    setupDevBtn('btn-dev-arcade-hover', 'showArcadeHover', '#3498db');
    setupDevBtn('btn-dev-neighborhoods', 'showNeighborhoods', '#e056fd');

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
      btnEditTarget.style.borderColor = '#e056fd';
      btnEditTarget.style.color = '#e056fd';
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
      btnNpcManager.style.borderColor = '#e056fd';
      btnNpcManager.style.color = '#e056fd';
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
      if (this.selectedMobPack === k) btn.style.borderColor = '#3498db';
      btn.innerText = k;
      btn.onclick = () => { this.selectedMobPack = k; this.renderMobPacks(); };

      const editBtn = document.createElement('button');
      editBtn.className = 'b-btn btn-secondary';
      editBtn.style.cssText = 'padding: 0 8px; font-size: 0.8rem; border-color: #f1c40f; color: #f1c40f;';
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
      ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'].forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
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
                <span style="color: #f1c40f; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem;">Encounter Spawns</span>
                <button id="btn-mp-add-spawn" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem; border-color: #2ecc71; color: #2ecc71;">+ Add NPC</button>
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
        this.openPowerSelector((pId) => {
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
      this.openPowerSelector((pId) => {
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

  renderNpcTemplates() {
    const list = document.getElementById('npct-list');
    if (!list) return;
    list.innerHTML = '';
    const keys = Object.keys(this.engine.npcTemplates || {});
    if (!this.selectedNpcTemplate && keys.length > 0) this.selectedNpcTemplate = keys[0];

    let groupOptions = '';
    const groups = Object.keys(this.entityGroupsData || {}).sort();
    if (groups.length === 0) {
      ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'].forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
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
      if (this.selectedNpcTemplate === k) btn.style.borderColor = '#3498db';
      btn.innerText = k;
      btn.onclick = () => { this.selectedNpcTemplate = k; this.renderNpcTemplates(); };
      const dupBtn = document.createElement('button');
      dupBtn.className = 'b-btn btn-secondary';
      dupBtn.style.cssText = 'padding: 0 8px; font-size: 0.8rem; border-color: #3498db; color: #3498db;';
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
      if (this.npcTemplateManagerWindow.setTitle) {
          this.npcTemplateManagerWindow.setTitle(`NPC Template: ${t.name || this.selectedNpcTemplate}`);
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
      if (this.selectedEntityType === k) btn.style.borderColor = '#3498db';
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
      if (this.selectedEntityGroup === g) btn.style.borderColor = '#3498db';
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
                <button class="b-btn btn-secondary btn-dup-npc" style="padding: 2px 8px; font-size: 0.7rem; border-color: #f1c40f; color: #f1c40f;">⧉</button>
                <button class="b-btn btn-secondary btn-edit-npc" style="padding: 2px 8px; font-size: 0.7rem; border-color: #3498db; color: #3498db;">Edit</button>
                <button class="b-btn b-btn-danger btn-del-npc" style="padding: 2px 8px; font-size: 0.7rem;">X</button>
              </div>`;
            row.querySelector('.btn-edit-npc').onclick = () => {
              this.npcTemplateManagerWindow.open();
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
          this.npcTemplateManagerWindow.open();
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
    const groups = Object.keys(this.entityGroupsData || {}).sort();
    if (groups.length === 0) {
      ['Civilian', 'APD', 'Cyber-Syndicate', 'Corporate Extractors', 'Astro-Enforcers', 'Prism Zealots', 'Swarm', 'Rodent', 'Maple Gang'].forEach(g => { groupOptions += `<option value="${g}">${g}</option>`; });
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
          totalSpan.style.color = newTotal === 100 ? '#2ecc71' : '#e74c3c';
        }
      };
          row.querySelector('.btn-nh-fw-del').onclick = () => { this.currentNeighborhoodFactions.splice(idx, 1); this.renderNeighborhoodFactions(); };
      list.appendChild(row);
    });
    totalSpan.innerText = total;
    totalSpan.style.color = total === 100 ? '#2ecc71' : '#e74c3c';
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
                  <button class="b-btn btn-secondary btn-dup-nh" style="padding: 2px 8px; font-size: 0.7rem; border-color: #3498db; color: #3498db;" title="Duplicate">⧉ Dup</button>
                  <button class="b-btn btn-secondary btn-edit-nh" style="padding: 2px 8px; font-size: 0.7rem; border-color: #e056fd; color: #e056fd;">✎ Edit</button>
                  <button class="b-btn btn-danger btn-del-nh" style="padding: 2px 8px; font-size: 0.7rem; border-color: #e74c3c; color: #e74c3c;">X</button>
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
          row.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid ${isActive ? '#2ecc71' : 'var(--text-dim)'}; border-radius: 4px;`;

          row.innerHTML = `
            <span style="color: ${isActive ? '#2ecc71' : '#fff'}; font-weight: ${isActive ? 'bold' : 'normal'}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${zone} ${isActive ? '(Active)' : ''}</span>
            <button class="b-btn btn-apply-zone" data-zone="${zone}" style="padding: 4px 8px; font-size: 0.8rem; border-color: #f1c40f; color: #f1c40f;">Load</button>
          `;

          row.querySelector('.btn-apply-zone').onclick = () => {
            this.engine.chat.commandHandler.processCommand('/applymap ' + zone);
            this.zoneManagerWindow.close();
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
      if (!this.currentEditCabinet) return;
      const nameEl = document.getElementById('edit-arcade-name');
      const xEl = document.getElementById('edit-arcade-x');
      const yEl = document.getElementById('edit-arcade-y');
      const zEl = document.getElementById('edit-arcade-z');
      if (!nameEl || !xEl || !yEl || !zEl) return; // Prevent crashes if elements aren't rendered!

      const updatedVoxel = {
        ...this.currentEditCabinet.voxel,
        customName: nameEl.value.trim(),
        gameId: document.getElementById('edit-arcade-game')?.value || 'pixel',
        powerState: document.getElementById('edit-arcade-power')?.value || 'on'
      };
      const nX = parseInt(xEl.value, 10), nY = parseInt(yEl.value, 10), nZ = parseInt(zEl.value, 10);
      if (nX !== this.currentEditCabinet.wx || nY !== this.currentEditCabinet.wy || nZ !== this.currentEditCabinet.wz) {
        this.engine.mapManager.setVoxelAt(this.currentEditCabinet.wx, this.currentEditCabinet.wy, this.currentEditCabinet.wz, null, true);
      }
      this.engine.mapManager.setVoxelAt(nX, nY, nZ, updatedVoxel, true);
      this.arcadeEditWindow.close();
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
            row.innerHTML = `<span style="color: #fff;">${g.name}</span> <span style="color: #f1c40f;">${s.score} <span style="color: #7f8c8d; font-size: 0.7rem;">by ${s.player}</span></span>`;
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
                  <button class="btn-tp-arcade b-btn" style="padding: 4px 8px; font-size: 0.8rem; border-color: #f39c12; color: #f39c12;" title="Teleport to Cabinet">TP</button>
                  <button class="btn-edit-arcade b-btn" style="padding: 4px 8px; font-size: 0.8rem; border-color: #e056fd; color: #e056fd;" title="Edit Cabinet">✎</button>
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
        this.currentEditCabinet = cab;
        document.getElementById('edit-arcade-name').value = cab.voxel.customName || '';
        document.getElementById('edit-arcade-game').value = currentGame;
        document.getElementById('edit-arcade-power').value = currentPower;
        document.getElementById('edit-arcade-x').value = cab.wx;
        document.getElementById('edit-arcade-y').value = cab.wy;
        document.getElementById('edit-arcade-z').value = cab.wz;
        document.getElementById('edit-arcade-zone').value = this.engine.currentZone || 'untitled';
        this.arcadeEditWindow.open();
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
        <button class="btn-edit btn-secondary" style="width: auto; height: auto; padding: 5px; border-color: #f39c12; color: #f39c12; font-weight: bold; margin-right: 5px; font-size: 0.9rem;" title="Edit NPC">✎</button>
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
        <button class="btn-del btn-secondary" style="width: auto; height: auto; padding: 5px 10px; border-color: #ff4757; color: #ff4757; font-weight: bold;">X</button>
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

        this.npcEditWindow.open();
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
        <button class="btn-edit btn-secondary" style="width: auto; height: auto; padding: 5px; border-color: #f39c12; color: #f39c12; font-weight: bold; margin-right: 5px; font-size: 0.9rem;">✎</button>
        <div style="flex: 1.5; font-weight: bold; color: #2ecc71;">${s.name}</div>
        <div style="flex: 1.5; display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 0.85rem;">
          <span>X:${Math.round(s.x)} Y:${Math.round(s.y)} Z:${Math.round(s.z || 0)}</span>
          <button class="btn-tp btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; width: auto; height: auto;">TP</button>
        </div>
        <div style="flex: 1.5; font-family: var(--font-mono); font-size: 0.85rem; color: #aaa;">Radius: ${s.radius}m</div>
        <button class="btn-del btn-secondary" style="width: auto; height: auto; padding: 5px 10px; border-color: #ff4757; color: #ff4757; font-weight: bold;">X</button>
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

        this.spawnerEditWindow.open();
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
                             <button class="b-btn btn-secondary btn-edit-spawner-npc" style="padding: 2px 8px; font-size: 0.7rem; border-color: #e056fd; color: #e056fd;">✎ Edit</button>`;
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

  setupBuilderTools() {
    const eng = this.engine;
    const builderPanel = this.builderToolsWindow.element;
    if (builderPanel) {
      builderPanel.style.display = eng.editMode ? 'flex' : 'none';

      if (eng.clientSettings.lockBuilderPanel) {
        const savedPos = localStorage.getItem('b_builder_pos');
        if (savedPos) {
          try { const pos = JSON.parse(savedPos); builderPanel.style.left = pos.left; builderPanel.style.top = pos.top; } catch (e) { }
        }
      } else {
        builderPanel.style.top = '70px';
        builderPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
        builderPanel.style.left = 'auto';
      }

      const toggleBuilderOpt = (id, prop) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.borderColor = eng.devOptions[prop] ? '#3498db' : '';
          btn.style.color = eng.devOptions[prop] ? '#3498db' : '';
          btn.onclick = () => {
            eng.devOptions[prop] = !eng.devOptions[prop];
            btn.style.borderColor = eng.devOptions[prop] ? '#3498db' : '';
            btn.style.color = eng.devOptions[prop] ? '#3498db' : '';
            localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
          };
        }
      };

      toggleBuilderOpt('btn-build-chunk', 'showChunk');
      toggleBuilderOpt('btn-build-preview', 'useBlockPreview');

      const btnToggleGrid = document.getElementById('btn-toggle-grid');
      if (btnToggleGrid) {
        btnToggleGrid.className = eng.devOptions.showGrid ? 'b-btn btn-primary' : 'b-btn btn-secondary';
        btnToggleGrid.innerText = eng.devOptions.showGrid ? 'Builder Grid: ON' : 'Builder Grid: OFF';
        btnToggleGrid.onclick = () => {
          eng.devOptions.showGrid = !eng.devOptions.showGrid;
          btnToggleGrid.className = eng.devOptions.showGrid ? 'b-btn btn-primary' : 'b-btn btn-secondary';
          btnToggleGrid.innerText = eng.devOptions.showGrid ? 'Builder Grid: ON' : 'Builder Grid: OFF';
          localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
        };
      }

      const btnToggleHotbar = document.getElementById('btn-toggle-hotbar');
      if (btnToggleHotbar) {
        btnToggleHotbar.onclick = () => {
          const hb = this.texturePaletteWindow.element;
          const ol = this.objectLibraryWindow.element;
          const isHidden = hb.style.display === 'none';
          if (isHidden) this.texturePaletteWindow.open(); else this.texturePaletteWindow.close();
          if (isHidden && ol) this.objectLibraryWindow.close();
          this.updateBuildingMode();
        };
      }

      const btnToggleObjLib = document.getElementById('btn-toggle-objlib');
      if (btnToggleObjLib) {
        btnToggleObjLib.onclick = () => {
          const hb = this.texturePaletteWindow.element;
          const ol = this.objectLibraryWindow.element;
          const isHidden = ol.style.display === 'none';
          if (isHidden) this.objectLibraryWindow.open(); else this.objectLibraryWindow.close();
          if (isHidden && hb) this.texturePaletteWindow.close();
          this.updateBuildingMode();
        };
      }
    }

    this.setupBuilderHotbar();
  }

  updateBuildingMode() {
    const eng = this.engine;
    const hb = document.getElementById('builder-hotbar');
    const ol = document.getElementById('object-library-panel');
    const hbVisible = hb && hb.style.display !== 'none';
    const olVisible = ol && ol.style.display !== 'none';

    if (hbVisible) {
      const activeSlot = document.querySelector('.hotbar-slot.active') || document.querySelector('.hotbar-slot[data-tex="stone"]');
      let base = 'cube';
      if (activeSlot && (activeSlot.dataset.tex === 'wood-door-bottom' || activeSlot.dataset.tex === 'wood-door-top')) base = 'door';

      eng.editShapeBase = base;
      eng.editShape = base;

      if (this.updateShapeUI) {
        this.updateShapeUI();
      } else {
        const shapeBtn = document.getElementById('build-shape-btn');
        if (shapeBtn) {
          if (shapeBtn.tagName === 'SELECT') {
            let hasOpt = Array.from(shapeBtn.options).some(o => o.value === base);
            if (!hasOpt) {
              shapeBtn.innerHTML = `<option value="${base}">SHAPE: ${base.toUpperCase()}</option>`;
            }
            shapeBtn.value = base;
          } else {
            shapeBtn.innerText = 'Shape: ' + base.toUpperCase();
          }
        }
      }
      if (activeSlot && !activeSlot.classList.contains('active')) activeSlot.click();
    } else if (olVisible) {
      if (!FURNITURE_REGISTRY[eng.editShapeBase]) {
        const firstObjId = Object.keys(FURNITURE_REGISTRY)[0];
        const objBtn = document.getElementById(`btn-obj-${firstObjId}`);
        if (objBtn) objBtn.click();
      }
    } else {
      eng.editShapeBase = 'none';
      eng.editShape = 'none';
      const shapeBtn = document.getElementById('build-shape-btn');
      if (shapeBtn) {
        if (shapeBtn.tagName === 'SELECT') shapeBtn.innerHTML = '<option value="none">SHAPE: NONE</option>';
        else shapeBtn.innerText = 'Shape: NONE';
      }
    }
  }

  setupObjectLibrary() {
    const eng = this.engine;
    const objLibPanel = this.objectLibraryWindow.element;

    if (eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
      const savedPos = localStorage.getItem('b_objlib_pos');
      if (savedPos) {
        try { const pos = JSON.parse(savedPos); objLibPanel.style.left = pos.left; objLibPanel.style.top = pos.top; } catch (e) { }
      } else {
        objLibPanel.style.top = '70px';
        objLibPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '570px' : '310px';
      }
    } else {
      objLibPanel.style.top = '70px';
      objLibPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '570px' : '310px';
    }

    const objLibGrid = document.getElementById('obj-lib-grid');
    if (objLibGrid) {

      for (const [id, data] of Object.entries(FURNITURE_REGISTRY)) {
        const btnObj = document.createElement('button');
        btnObj.id = `btn-obj-${id}`;
        btnObj.className = 'b-btn btn-secondary';
        btnObj.innerHTML = `
          <img src="models/icons/${id}.png" style="width: 24px; height: 24px; object-fit: contain; image-rendering: pixelated;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <span style="display:none; font-size: 0.9rem; font-weight: bold; color: #fff;">${data.name.substring(0, 2).toUpperCase()}</span>
        `;
        btnObj.style.cssText = 'font-size: 1.2rem; padding: 5px; border-radius: 4px; border: 1px solid #444; background: rgba(0,0,0,0.5); cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.2s;';

        btnObj.onmouseenter = (e) => {
          btnObj.style.background = 'rgba(52, 152, 219, 0.3)';
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            builderTooltip.innerHTML = `
              <div style="display: flex; align-items: center; gap: 15px; padding: 2px;">
                <div style="width: 32px; height: 32px; margin: 5px; display: flex; justify-content: center; align-items: center; font-size: 18px;">
                  <img src="models/icons/${id}.png" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                  <span style="display:none; font-weight: bold; color: #fff;">${data.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <span>${data.name}</span>
              </div>
            `;
            builderTooltip.style.display = 'block';
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        btnObj.onmousemove = (e) => {
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        btnObj.onmouseleave = () => {
          btnObj.style.background = 'rgba(0,0,0,0.5)';
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) builderTooltip.style.display = 'none';
        };

        btnObj.onclick = () => {
          eng.editShapeBase = id;
          eng.editShape = id;

          eng.editShapeBase = id;
          eng.editShape = id;

          const shapeBtn = document.getElementById('build-shape-btn');
          const dirBtn = document.getElementById('build-dir-btn');
          const relBtn = document.getElementById('build-rel-btn');
          const flipBtn = document.getElementById('build-flip-btn');

          if (shapeBtn) {
            if (shapeBtn.tagName === 'SELECT') {
              if (!Array.from(shapeBtn.options).some(o => o.value === id)) {
                shapeBtn.innerHTML = `<option value="${id}">SHAPE: ${data.name.toUpperCase()}</option>`;
              }
              shapeBtn.value = id;
            } else {
              shapeBtn.innerText = `Shape: ${data.name.toUpperCase()}`;
            }
          }
          if (dirBtn) { dirBtn.style.display = 'block'; dirBtn.innerText = eng.editShapeDir.toUpperCase(); }
          if (relBtn) relBtn.style.display = 'none';
          if (flipBtn) flipBtn.style.display = 'none';
        };
        objLibGrid.appendChild(btnObj);
      }
    }

    const colorPickerContainer = document.getElementById('obj-lib-color-picker');
    if (colorPickerContainer) {
      this.appendColorPicker(colorPickerContainer);
    }
  }

  setupBuilderHotbar() {
    const eng = this.engine;
    const builderHotbar = this.texturePaletteWindow.element;

    if (eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
      const savedPos = localStorage.getItem('b_hotbar_pos');
      if (savedPos) {
        try {
          const pos = JSON.parse(savedPos);
          builderHotbar.style.left = pos.left; builderHotbar.style.top = pos.top;
        } catch (e) { }
      } else {
        builderHotbar.style.top = '280px';
        builderHotbar.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
      }
    } else {
      builderHotbar.style.top = '280px';
      builderHotbar.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
    }

    let builderTooltip = document.getElementById('builder-tooltip');
    if (!builderTooltip) {
      builderTooltip = document.createElement('div');
      builderTooltip.id = 'builder-tooltip';
      builderTooltip.style.cssText = TOOLTIP_STYLE;
      document.body.appendChild(builderTooltip);
    }

    if (!document.getElementById('tooltip-spin-style')) {
      const style = document.createElement('style');
      style.id = 'tooltip-spin-style';
      style.innerHTML = `
          @keyframes tooltipSpin {
            0% { transform: rotateX(-35.264deg) rotateY(-45deg) scale(0.85); }
            100% { transform: rotateX(-35.264deg) rotateY(315deg) scale(0.85); }
          }
        `;
      document.head.appendChild(style);
    }

    const generateTooltipHTML = (text, isBlock, bgStyle, tColor) => {
      if (!isBlock) return text;
      const safeBg = bgStyle.replace(/"/g, "'");
      const makeFace = (transform, brightness, border) => `
          <div style="position: absolute; width: 32px; height: 32px; background: ${safeBg}; transform: ${transform}; border: 1px solid ${border}; filter: brightness(${brightness}); overflow: hidden;">
            <div style="position: absolute; inset: 0; background: ${tColor}; mix-blend-mode: multiply;"></div>
          </div>
        `;
      return `
          <div style="display: flex; align-items: center; gap: 15px; padding: 2px;">
            <div style="width: 32px; height: 32px; transform-style: preserve-3d; animation: tooltipSpin 4s infinite linear; margin: 5px;">
              ${makeFace('translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateY(180deg) translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateY(90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateY(-90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateX(90deg) translateZ(16px)', 1.0, 'rgba(0,0,0,0.15)')}
              ${makeFace('rotateX(-90deg) translateZ(16px)', 0.5, 'rgba(0,0,0,0.4)')}
            </div>
            <span>${text}</span>
          </div>
        `;
    };

    const setupTooltip = (el, text, isBlock = false, bgStyle = '') => {
      el.onmouseenter = (e) => {
        if (isBlock) {
          const tColor = eng.buildColor || '#ffffff';
          builderTooltip.innerHTML = generateTooltipHTML(text, isBlock, bgStyle, tColor);
        } else {
          builderTooltip.innerText = text;
        }
        builderTooltip.style.display = 'block';
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      el.onmousemove = (e) => {
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      el.onmouseleave = () => {
        builderTooltip.style.display = 'none';
      };
    };

    const showColorPreviewTooltip = (e, targetColor, label) => {
      const activeSlot = document.querySelector('.hotbar-slot.active');
      let isBlock = false;
      let bgStyle = '';
      let blockName = '';
      if (activeSlot && activeSlot.dataset.tex !== 'picker' && activeSlot.dataset.tex !== 'erase') {
        isBlock = true;
        bgStyle = activeSlot.dataset.bg || '';
        blockName = activeSlot.dataset.name || activeSlot.dataset.tex;
      }
      const tooltipText = isBlock ? `${blockName} (${label})` : label;
      if (isBlock) {
        builderTooltip.innerHTML = generateTooltipHTML(tooltipText, isBlock, bgStyle, targetColor);
      } else {
        builderTooltip.innerText = tooltipText;
      }
      builderTooltip.style.display = 'block';
      builderTooltip.style.left = (e.clientX + 15) + 'px';
      builderTooltip.style.top = (e.clientY + 15) + 'px';
    };

    const controlsContainer = document.getElementById('hotbar-controls-container');
    const tabsContainer = document.getElementById('builder-tabs-container');
    const gridsWrapper = document.getElementById('hotbar-grids-wrapper');

    this.appendColorPicker(controlsContainer);

    const shapeContainer = document.createElement('div');
    shapeContainer.id = 'build-shape-container';
    shapeContainer.style.cssText = SHAPE_CONTAINER_STYLE;

    const shapeBtn = document.createElement('select');
    shapeBtn.id = 'build-shape-btn';
    shapeBtn.className = 'btn-secondary';
    shapeBtn.style.cssText = SHAPE_BTN_STYLE + ' text-transform: uppercase; cursor: pointer; border: 1px solid #3498db; outline: none; background: rgba(0,0,0,0.8);';

    shapeBtn.onchange = (e) => {
      eng.editShapeBase = e.target.value;
      updateShapeUI();
    };

    const dirBtn = document.createElement('button');
    dirBtn.id = 'build-dir-btn';
    dirBtn.className = 'btn-secondary';
    dirBtn.style.cssText = DIR_BTN_STYLE;
    dirBtn.innerText = 'N';

    const relBtn = document.createElement('button');
    relBtn.id = 'build-rel-btn';
    relBtn.className = 'btn-secondary';
    relBtn.style.cssText = REL_BTN_STYLE;
    relBtn.innerText = 'P';
    relBtn.title = 'Toggle Player Perspective';

    const flipBtn = document.createElement('button');
    flipBtn.id = 'build-flip-btn';
    flipBtn.className = 'btn-secondary';
    flipBtn.style.cssText = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #2ecc71; color: #2ecc71; display: none; min-width: 40px;';
    flipBtn.innerText = 'L-Hinge';
    flipBtn.title = 'Toggle Hinge Side (Left/Right)';

    const uvBtn = document.createElement('button');
    uvBtn.id = 'build-uv-btn';
    uvBtn.className = 'btn-secondary';
    uvBtn.style.cssText = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #e67e22; color: #e67e22; display: none; min-width: 40px;';
    uvBtn.innerText = 'Auto UV';
    uvBtn.title = 'Toggle Texture Mapping (Seamless Box UV / Blockbench Mesh UV)';

    shapeContainer.appendChild(shapeBtn);
    shapeContainer.appendChild(relBtn);
    shapeContainer.appendChild(dirBtn);
    shapeContainer.appendChild(flipBtn);
    shapeContainer.appendChild(uvBtn);
    controlsContainer.appendChild(shapeContainer);

    const fluidBtn = document.createElement('button');
    fluidBtn.id = 'build-fluid-btn';
    fluidBtn.className = 'btn-secondary';
    fluidBtn.style.cssText = FLUID_BTN_STYLE;
    fluidBtn.innerText = 'Fluid State: STILL';
    controlsContainer.appendChild(fluidBtn);

    setupTooltip(shapeBtn, 'Select Block Shape');
    setupTooltip(dirBtn, 'Cycle Block Direction (N, E, S, W)');
    setupTooltip(relBtn, 'Toggle Player-Relative Rotation');
    setupTooltip(fluidBtn, 'Toggle Fluid State (Still / Flow)');

    eng.editShapeBase = 'cube';
    eng.editShapeDir = 'n';
    eng.editShapeRelative = false;
    eng.editShapeFlip = false;
    eng.editShapeUV = 'auto'; // 'auto', 'mesh', 'box'
    eng.editFluid = 'still';

    fluidBtn.onclick = () => {
      eng.editFluid = eng.editFluid === 'still' ? 'flow' : 'still';
      fluidBtn.innerText = 'Fluid State: ' + eng.editFluid.toUpperCase();
    };

    flipBtn.onclick = () => {
      eng.editShapeFlip = !eng.editShapeFlip;
      updateShapeUI();
    };

    uvBtn.onclick = () => {
      if (eng.editShapeUV === 'auto') eng.editShapeUV = 'mesh';
      else if (eng.editShapeUV === 'mesh') eng.editShapeUV = 'box';
      else eng.editShapeUV = 'auto';
      updateShapeUI();
    };

    const updateShapeUI = () => {
      if (eng.editShapeBase === 'none') {
        if (shapeBtn) {
          if (shapeBtn.tagName === 'SELECT') shapeBtn.innerHTML = '<option value="none">SHAPE: NONE</option>';
          else shapeBtn.innerText = 'Shape: NONE';
        }
        if (dirBtn) dirBtn.style.display = 'none';
        if (relBtn) relBtn.style.display = 'none';
        if (flipBtn) flipBtn.style.display = 'none';
        if (uvBtn) uvBtn.style.display = 'none';
        return;
      }

      const activeSlot = document.querySelector('.hotbar-slot.active');
      const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
      let bases = ['cube', 'slab', 'top_slab', 'ramp', 'half_ramp', 'top_half_ramp', 'stair', 'decal', 'fence'];
      if (tex && tex.includes('door')) bases = ['door'];
      else if (tex && tex.startsWith('line-')) bases = ['decal'];
      else if (FURNITURE_REGISTRY[eng.editShapeBase]) bases = [eng.editShapeBase, ...bases];

      if (shapeBtn && shapeBtn.tagName === 'SELECT') {
        const currentOptions = Array.from(shapeBtn.options).map(o => o.value).join(',');
        if (currentOptions !== bases.join(',')) {
          shapeBtn.innerHTML = '';
          bases.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            let displayName = b;
            if (FURNITURE_REGISTRY[b]) displayName = FURNITURE_REGISTRY[b].name;
            else displayName = b.replace(/_/g, ' ');
            opt.innerText = 'SHAPE: ' + displayName.toUpperCase();
            shapeBtn.appendChild(opt);
          });
        }
        if (bases.includes(eng.editShapeBase)) {
          shapeBtn.value = eng.editShapeBase;
        } else {
          eng.editShapeBase = bases[0];
          shapeBtn.value = bases[0];
        }
      }

      if (eng.editShapeBase === 'door') {
        dirBtn.style.display = 'block';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'block';
        uvBtn.style.display = 'none';
      } else if (FURNITURE_REGISTRY[eng.editShapeBase]) {
        dirBtn.style.display = 'block';
        relBtn.style.display = 'none';
        flipBtn.style.display = eng.editShapeBase.includes('door') ? 'block' : 'none';
        uvBtn.style.display = 'block';
        if (eng.editShapeUV === 'auto') {
          uvBtn.innerText = 'Auto UV';
          uvBtn.style.background = 'transparent';
        } else if (eng.editShapeUV === 'mesh') {
          uvBtn.innerText = 'Mesh UV';
          uvBtn.style.background = 'rgba(230, 126, 34, 0.2)';
        } else {
          uvBtn.innerText = 'Box UV';
          uvBtn.style.background = 'rgba(230, 126, 34, 0.2)';
        }
      } else if (eng.editShapeBase === 'ramp' || eng.editShapeBase === 'half_ramp' || eng.editShapeBase === 'top_half_ramp' || eng.editShapeBase === 'stair' || eng.editShapeBase === 'decal') {
        dirBtn.style.display = eng.editShapeRelative ? 'none' : 'block';
        relBtn.style.display = 'block';
        flipBtn.style.display = 'none';
        uvBtn.style.display = 'none';
      } else {
        dirBtn.style.display = 'none';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'none';
        uvBtn.style.display = 'none';
      }

      dirBtn.innerText = eng.editShapeDir.toUpperCase();
      relBtn.style.background = eng.editShapeRelative ? 'rgba(155, 89, 182, 0.2)' : 'transparent';
      flipBtn.innerText = eng.editShapeFlip ? 'R-Hinge' : 'L-Hinge';
      flipBtn.style.background = eng.editShapeFlip ? 'rgba(46, 204, 113, 0.2)' : 'transparent';

      let finalShape = eng.editShapeBase;
      if (finalShape === 'ramp' || finalShape === 'half_ramp' || finalShape === 'top_half_ramp' || finalShape === 'stair' || finalShape === 'door') {
        if (eng.editShapeRelative && finalShape !== 'door') {
          eng.editShape = finalShape + '_player';
        } else {
          eng.editShape = finalShape + '_' + eng.editShapeDir + (finalShape === 'door' && eng.editShapeFlip ? '_flip' : '');
        }
      } else if (FURNITURE_REGISTRY[finalShape]) {
        eng.editShape = finalShape + (finalShape.includes('door') && eng.editShapeFlip ? '_flip' : '');
      } else {
        eng.editShape = finalShape;
      }
    };

    dirBtn.onclick = () => {
      const dirs = ['n', 'e', 's', 'w'];
      eng.editShapeDir = dirs[(dirs.indexOf(eng.editShapeDir) + 1) % dirs.length];
      updateShapeUI();
    };

    relBtn.onclick = () => {
      eng.editShapeRelative = !eng.editShapeRelative;
      updateShapeUI();
    };
    this.updateShapeUI = updateShapeUI;
    updateShapeUI();

    const categories = {};
    const addCategory = (id, name) => {
      const btn = document.createElement('button');
      btn.className = 'btn-secondary';
      btn.style.cssText = 'padding: 4px 8px; font-size: 0.75rem; white-space: nowrap; border-color: #3498db; color: #3498db; flex-shrink: 0; background: rgba(0,0,0,0.8); border-radius: 4px; cursor: pointer; transition: all 0.2s;';
      btn.innerText = name;

      const grid = document.createElement('div');
      grid.style.cssText = 'display: none; grid-template-columns: repeat(5, 36px); gap: 8px; justify-content: center; align-content: start;';
      grid.className = 'cat-grid';

      btn.onclick = () => {
        tabsContainer.querySelectorAll('button').forEach(b => {
          b.style.background = 'rgba(0,0,0,0.8)';
          b.style.color = '#3498db';
        });
        btn.style.background = 'rgba(52, 152, 219, 0.4)';
        btn.style.color = '#fff';

        gridsWrapper.querySelectorAll('.cat-grid').forEach(g => g.style.display = 'none');
        grid.style.display = 'grid';

        this.renderColorPresets(id === 'industrial' ? 'industrial' : (id === 'lines' ? 'lines' : 'naturals'));
      };

      categories[id] = { btn, grid, name };

      tabsContainer.appendChild(btn);
      gridsWrapper.appendChild(grid);
    };

    addCategory('tools', 'Tools');
    addCategory('naturals', 'Naturals');
    addCategory('wood', 'Wood');
    addCategory('glass', 'Glass');
    addCategory('liquid', 'Liquid');
    addCategory('light', 'Light');
    addCategory('industrial', 'Industrial');
    addCategory('lines', 'Street Lines');

    const ensureActionSlot = (catId, id, text, title, action) => {
      const cat = categories[catId];
      if (!cat) return;
      const grid = cat.grid;

      const slot = document.createElement('div');
      slot.className = 'hotbar-action-slot';
      slot.style.cssText = 'background: rgba(52, 152, 219, 0.2); border-radius: 4px; border: 2px solid #3498db; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; color: #fff; font-size: 1rem; transition: background 0.2s;';
      slot.innerHTML = text;

      slot.onmouseenter = (e) => {
        slot.style.background = 'rgba(52, 152, 219, 0.4)';
        builderTooltip.innerText = title;
        builderTooltip.style.display = 'block';
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      slot.onmousemove = (e) => {
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      slot.onmouseleave = () => {
        slot.style.background = 'rgba(52, 152, 219, 0.2)';
        builderTooltip.style.display = 'none';
      };

      slot.onclick = action;
      grid.appendChild(slot);
    };

    const ensureSlot = (catId, tex, bgStyle, text = '', title = '') => {
      const cat = categories[catId];
      if (!cat) return;
      const grid = cat.grid;

      if (!grid.querySelector(`[data-tex="${tex}"]`)) {
        const slot = document.createElement('div');
        slot.className = 'hotbar-slot';
        slot.dataset.tex = tex;
        slot.dataset.bg = bgStyle;
        slot.dataset.name = title || tex.toUpperCase();
        slot.dataset.cat = cat.name;
        slot.style.background = bgStyle;
        slot.style.borderRadius = '4px';
        slot.style.border = '2px solid #444';
        slot.style.cursor = 'pointer';
        slot.style.display = 'flex';
        slot.style.alignItems = 'center';
        slot.style.justifyContent = 'center';
        slot.style.width = '36px';
        slot.style.height = '36px';
        slot.innerHTML = text;
        const isBlock = tex !== 'picker' && tex !== 'erase';
        setupTooltip(slot, title || tex.toUpperCase(), isBlock, bgStyle);
        grid.appendChild(slot);

        slot.addEventListener('click', () => {
          gridsWrapper.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
          slot.classList.add('active');

          const ol = document.getElementById('object-library-panel');
          const olVisible = ol && ol.style.display !== 'none';

          if (tex === 'wood-door-bottom' || tex === 'wood-door-top') {
            eng.editShapeBase = 'door';
            eng.editShapeFlip = false;
            updateShapeUI();
          } else if (FURNITURE_REGISTRY[tex]) {
            eng.editShapeBase = tex;
            eng.editShapeFlip = false;
            updateShapeUI();
          } else if (tex.startsWith('line-')) {
            eng.editShapeBase = 'decal';
            eng.editShapeFlip = false;
            updateShapeUI();
          } else if (eng.editShapeBase === 'door' || (!olVisible && eng.editShapeBase !== 'cube' && eng.editShapeBase !== 'slab' && eng.editShapeBase !== 'top_slab' && eng.editShapeBase !== 'ramp' && eng.editShapeBase !== 'half_ramp' && eng.editShapeBase !== 'top_half_ramp' && eng.editShapeBase !== 'stair' && eng.editShapeBase !== 'decal' && eng.editShapeBase !== 'fence')) {
            eng.editShapeBase = 'cube';
            eng.editShapeFlip = false;
            updateShapeUI();
          } else {
            if (!olVisible && eng.editShapeBase !== 'cube' && eng.editShapeBase !== 'slab' && eng.editShapeBase !== 'top_slab' && eng.editShapeBase !== 'ramp' && eng.editShapeBase !== 'half_ramp' && eng.editShapeBase !== 'top_half_ramp' && eng.editShapeBase !== 'stair' && eng.editShapeBase !== 'decal' && eng.editShapeBase !== 'fence') {
              eng.editShapeBase = 'cube';
              eng.editShapeFlip = false;
              updateShapeUI();
            }
          }

          if (slot.dataset.tex === 'picker') {
            eng.selectedTiles = [];
            eng.isDraggingSelection = false;
            eng.renderer.needsVoxelUpdate = true;
            return;
          }

          const isFluid = ['water', 'lava', 'acid'].includes(slot.dataset.tex);
          fluidBtn.style.display = isFluid ? 'block' : 'none';
          if (isFluid) {
            eng.editFluid = 'still';
            fluidBtn.innerText = 'Fluid State: STILL';
          }

          if (eng.selectedTiles.length > 0) {
            const isErase = slot.dataset.tex === 'erase' || eng.input.isActionDown('buildDelete');
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

            let baseTex = slot.dataset.tex;
            if (baseTex === 'water' && eng.editFluid === 'flow') baseTex = 'water_flow';

            const finalUVMode = eng.editShapeUV === 'auto' ? undefined : (eng.editShapeUV === 'mesh');
            const updates = [];
            const previousStates = [];
            eng.selectedTiles.forEach(tile => {
              const clickedVoxelOld = eng.mapManager.getVoxelAt(tile.x, tile.y, tile.z);
              previousStates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: clickedVoxelOld ? { ...clickedVoxelOld } : null });

              let finalTex = baseTex;
              if (slot.dataset.tex === 'arcade-carpet') {
                const wx = Math.round(tile.x / 32);
                const wy = Math.round(tile.y / 32);
                const rx = ((wx % 2) + 2) % 2;
                const ry = ((wy % 2) + 2) % 2;
                finalTex = `arcade-carpet-${rx}-${ry}`;
              }

              if (isErase) {
                eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, null, false);
                updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: null });
                for (let i = 0; i < 5; i++) {
                  eng.spawnParticle({
                    x: tile.x, y: tile.y, z: tile.z,
                    vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100, vz: (Math.random() - 0.5) * 100,
                    life: 0.3 + Math.random() * 0.3, maxLife: 0.6, color: 'rgba(200, 200, 200, 0.7)', size: 1 + Math.random()
                  });
                }
              } else {
                eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir, useMeshUV: finalUVMode }, false);
                updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir, useMeshUV: finalUVMode } });
                for (let i = 0; i < 3; i++) {
                  eng.spawnParticle({
                    x: tile.x + (Math.random() - 0.5) * 32, y: tile.y + (Math.random() - 0.5) * 32, z: tile.z + (Math.random() - 0.5) * 32,
                    life: 0.2 + Math.random() * 0.2, maxLife: 0.4, color: eng.buildColor, size: 1 + Math.random()
                  });
                }
              }
            });

            eng.history = eng.history || [];
            if (previousStates.length > 0) eng.history.push(previousStates);
            if (eng.history.length > 30) eng.history.shift();
            eng.redoHistory = [];

            eng.selectedTiles = [];
            eng.isDraggingSelection = false;
            eng.renderer.needsVoxelUpdate = true;
            updates.forEach(u => eng.network.sendUpdateBlock(u));
          }
        });
      }
    };

    ensureSlot('tools', 'picker', 'rgba(155, 89, 182, 0.5)', '🔍', 'Picker Tool');
    ensureSlot('tools', 'erase', 'rgba(231, 76, 60, 0.5)', 'X', 'Erase Tool');
    ensureActionSlot('tools', 'undo', '↶', 'Undo (Ctrl+Z)', () => { if (eng.undo) eng.undo(); });
    ensureActionSlot('tools', 'redo', '↷', 'Redo (Ctrl+Y)', () => { if (eng.redo) eng.redo(); });

    ensureSlot('naturals', 'grass', '#51852E', '', 'Grass');
    ensureSlot('naturals', 'dirt', 'url("assets/tiles/base/all-facing/dirt.png") center/cover', '', 'Dirt');
    ensureSlot('naturals', 'stone', 'url("assets/tiles/base/all-facing/stone.png") center/cover', '', 'Stone');
    ensureSlot('naturals', 'stone-bricks', 'url("assets/tiles/base/all-facing/stone-bricks1.png") center/cover', '', 'Stone Bricks');
    ensureSlot('naturals', 'cobblestone', 'url("assets/tiles/base/all-facing/cobblestone.png") center/cover', '', 'Cobblestone');
    ensureSlot('naturals', 'cobbled_deepslate', 'url("assets/tiles/base/all-facing/cobbled_deepslate.png") center/cover', '', 'Cobbled Deepslate');
    ensureSlot('naturals', 'gravel', 'url("assets/tiles/base/all-facing/gravel.png") center/cover', '', 'Gravel');
    ensureSlot('naturals', 'sand', 'url("assets/tiles/base/all-facing/sand.png") center/cover', '', 'Sand');
    ensureSlot('naturals', 'clay', 'url("assets/tiles/base/all-facing/clay.png") center/cover', '', 'Clay');
    ensureSlot('naturals', 'mud', 'url("assets/tiles/base/all-facing/packed_mud1.png") center/cover', '', 'Mud');
    ensureSlot('naturals', 'ice', 'url("assets/tiles/base/all-facing/ice.png") center/cover', '', 'Ice');

    ensureSlot('glass', 'glass', 'url("assets/tiles/base/all-facing/glass.png") center/cover', '', 'Glass');
    ensureSlot('glass', 'glass-stained', 'url("assets/tiles/base/all-facing/glass-stained.png") center/cover', '', 'Stained Glass');
    ensureSlot('glass', 'clear_stained_glass_edges', 'url("assets/tiles/base/all-facing/clear_stained_glass_edges.png") center/cover', '', 'Clear Stained Glass (Edges)');
    ensureSlot('glass', 'clear_stained_glass_edgeless', 'url("assets/tiles/base/all-facing/clear_stained_glass_edgeless.png") center/cover', '', 'Clear Stained Glass (Edgeless)');

    const cb = '?v=' + Date.now();
    ensureSlot('liquid', 'water', `url("assets/tiles/base/fluid/water_still.png${cb}") center/cover`, '', 'Water');
    ensureSlot('liquid', 'lava', `linear-gradient(rgba(255, 93, 0, 0.6), rgba(255, 93, 0, 0.6)), url("assets/tiles/base/fluid/lava_still.png${cb}") center/cover`, '', 'Lava');
    ensureSlot('liquid', 'acid', `linear-gradient(rgba(46, 204, 113, 0.6), rgba(46, 204, 113, 0.6)), url("assets/tiles/base/fluid/water_still.png${cb}") center/cover`, '', 'Acid');

    ensureSlot('light', 'block-lamp-on-0', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/8 Spread)');
    ensureSlot('light', 'block-lamp-on-1', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/4 Spread)');
    ensureSlot('light', 'block-lamp-on-2', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/2 Spread)');
    ensureSlot('light', 'block-lamp-on-3', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (3/4 Spread)');
    ensureSlot('light', 'block-lamp-on', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (Max Spread)');
    ensureSlot('light', 'light_block', 'rgba(241, 196, 15, 0.4)', '', 'Light Block (Invisible)');

    ensureSlot('wood', 'wood-planks', '#8B5A2B url("assets/tiles/base/all-facing/wood-planks.png") center/cover', '', 'Wood Planks');
    ensureSlot('wood', 'wood-stripped', '#A0522D url("assets/tiles/base/all-facing/wood-stripped.png") center/cover', '', 'Stripped Wood');
    ensureSlot('wood', 'bark-log', '#5c4033 url("assets/tiles/base/all-facing/bark-log.png") center/cover', '', 'Bark Log');
    ensureSlot('wood', 'bark-birch', '#d4b79b url("assets/tiles/base/all-facing/bark-birch.png") center/cover', '', 'Birch Bark');
    ensureSlot('wood', 'wooden-door-1', '#6b4c3a url("assets/tiles/base/interactable/wooden-door-1.png") center/cover', '', 'Custom Door 1');
    ensureSlot('wood', 'wooden-door-2', '#6b4c3a url("assets/tiles/base/interactable/wooden-door-2.png") center/cover', '', 'Custom Door 2');

    ensureSlot('industrial', 'concrete', 'url("assets/tiles/base/all-facing/concrete.png") center/cover', '', 'Concrete');
    ensureSlot('industrial', 'paint', 'url("assets/tiles/base/side/rough-paint.png") center/cover', '', 'Paint');
    ensureSlot('industrial', 'carpet', 'url("assets/tiles/base/all-facing/carpet.png") center/cover', '', 'Carpet');
    ensureSlot('industrial', 'arcade-carpet', 'url("assets/tiles/base/all-facing/arcade-carpet.png") center/cover', '', 'Arcade Carpet');

    ensureSlot('lines', 'line-dashed', 'url("assets/tiles/base/all-facing/line-dashed.png") center/cover', '', 'Line (Dashed)');
    ensureSlot('lines', 'line-solid', 'url("assets/tiles/base/all-facing/line-solid.png") center/cover', '', 'Line (Solid)');
    ensureSlot('lines', 'line-double-solid', 'url("assets/tiles/base/all-facing/line-double-solid.png") center/cover', '', 'Line (Double Solid)');
    ensureSlot('lines', 'line-sidewalk-2', 'url("assets/tiles/base/all-facing/line-sidewalk-2.png") center/cover', '', 'Sidewalk Lines (2)');
    ensureSlot('lines', 'line-sidewalk-4', 'url("assets/tiles/base/all-facing/line-sidewalk-4.png") center/cover', '', 'Sidewalk Lines (4)');

    ensureSlot('lines', 'line-edge-1-dashed', 'url("assets/tiles/base/all-facing/line-edge-1-dashed.png") center/cover', '', 'Line (Edge 1 Dashed)');
    ensureSlot('lines', 'line-edge-2-dashed', 'url("assets/tiles/base/all-facing/line-edge-2-dashed.png") center/cover', '', 'Line (Edge 2 Dashed)');
    ensureSlot('lines', 'line-double-dashed-solid', 'url("assets/tiles/base/all-facing/line-double-dashed-solid.png") center/cover', '', 'Line (Dashed & Solid)');
    ensureSlot('lines', 'line-corner-3-dashed', 'url("assets/tiles/base/all-facing/line-corner-3-dashed.png") center/cover', '', 'Line (Corner 3 Dashed)');
    ensureSlot('lines', 'line-t-dashed', 'url("assets/tiles/base/all-facing/line-t-dashed.png") center/cover', '', 'Line (T Dashed)');

    ensureSlot('lines', 'line-split-1', 'url("assets/tiles/base/all-facing/line-split-1.png") center/cover', '', 'Line (Split 1)');
    ensureSlot('lines', 'line-split-2', 'url("assets/tiles/base/all-facing/line-split-2.png") center/cover', '', 'Line (Split 2)');
    ensureSlot('lines', 'line-t-1', 'url("assets/tiles/base/all-facing/line-t-1.png") center/cover', '', 'Line (T 1)');
    ensureSlot('lines', 'line-t-2', 'url("assets/tiles/base/all-facing/line-t-2.png") center/cover', '', 'Line (T 2)');
    ensureSlot('lines', 'line-x', 'url("assets/tiles/base/all-facing/line-x.png") center/cover', '', 'Line (X)');

    ensureSlot('lines', 'line-corner-1', 'url("assets/tiles/base/all-facing/line-corner-1.png") center/cover', '', 'Line (Corner 1)');
    ensureSlot('lines', 'line-corner-2', 'url("assets/tiles/base/all-facing/line-corner-2.png") center/cover', '', 'Line (Corner 2)');
    ensureSlot('lines', 'line-corner-3', 'url("assets/tiles/base/all-facing/line-corner-3.png") center/cover', '', 'Line (Corner 3)');
    ensureSlot('lines', 'line-corner-4', 'url("assets/tiles/base/all-facing/line-corner-4.png") center/cover', '', 'Line (Corner 4)');
    ensureSlot('lines', 'line-corner-5', 'url("assets/tiles/base/all-facing/line-corner-5.png") center/cover', '', 'Line (Corner 5)');

    ensureSlot('lines', 'line-edge-1', 'url("assets/tiles/base/all-facing/line-edge-1.png") center/cover', '', 'Line (Edge 1)');
    ensureSlot('lines', 'line-edge-2', 'url("assets/tiles/base/all-facing/line-edge-2.png") center/cover', '', 'Line (Edge 2)');
    ensureSlot('lines', 'line-edge-end-1', 'url("assets/tiles/base/all-facing/line-edge-end-1.png") center/cover', '', 'Line (Edge End 1)');
    ensureSlot('lines', 'line-edge-end-2', 'url("assets/tiles/base/all-facing/line-edge-end-2.png") center/cover', '', 'Line (Edge End 2)');

    if (categories['naturals']) categories['naturals'].btn.click();
    const firstSlot = gridsWrapper.querySelector('.hotbar-slot[data-tex="stone"]');
    if (firstSlot) firstSlot.click();
  }

  setupPlayerManager() {
    const eng = this.engine;
    document.getElementById('pm-search-input').addEventListener('input', () => this.renderPlayerManager());

    let pmCtx = document.getElementById('player-manager-ctx');
    if (!pmCtx) {
      pmCtx = document.createElement('div');
      pmCtx.id = 'player-manager-ctx';
      pmCtx.style.cssText = 'position: fixed; background: rgba(5,7,10,0.95); border: 1px solid #3498db; border-radius: 4px; padding: 5px; display: none; flex-direction: column; gap: 5px; z-index: 100000; font-family: var(--font-mono); font-size: 0.9rem; min-width: 120px;';
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
      const color = p.online ? (isSelf ? '#2ecc71' : '#3498db') : '#7f8c8d';
      const statusIcon = p.online ? '🟢' : '⚫';

      const row = document.createElement('div');
      row.style.cssText = PLAYER_ROW_STYLE;

      row.innerHTML = `
          <div style="flex: 1.2; font-weight: bold; color: ${color};" title="${p.name}">
              <span style="font-size: 0.6rem; margin-right: 4px;">${statusIcon}</span>
              ${p.name} <span style="color: #aaa; font-size: 0.75rem;">(Lv.${p.level || 1})</span>
          </div>
          <div style="flex: 1.5; display: flex; flex-direction: column; justify-content: center; gap: 2px;">
              <span style="color: #f1c40f; font-size: 0.75rem;">Zone: ${p.zone || 'untitled'}</span>
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
      kickBtn.style.cssText = 'padding: 2px 8px; font-size: 0.7rem; margin-right: 5px; border-color: #e74c3c; color: #e74c3c;';
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

  appendColorPicker(container) {
    const eng = this.engine;
    if (!eng.buildColor) eng.buildColor = '#ffffff';

    const colorContainer = document.createElement('div');
    colorContainer.style.display = 'flex';
    colorContainer.style.flexDirection = 'column';
    colorContainer.style.gap = '5px';
    colorContainer.style.marginTop = '10px';

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'shared-color-picker';
    colorPicker.value = eng.buildColor;
    colorPicker.style.width = '100%';
    colorPicker.style.height = '24px';
    colorPicker.style.padding = '0';
    colorPicker.style.border = '1px solid #333';
    colorPicker.style.borderRadius = '4px';
    colorPicker.style.cursor = 'pointer';

    colorPicker.addEventListener('input', (e) => {
      eng.buildColor = e.target.value;
      document.querySelectorAll('.shared-color-picker').forEach(cp => {
        if (cp !== colorPicker) cp.value = e.target.value;
      });
    });

    const presetsWrapper = document.createElement('div');
    presetsWrapper.style.cssText = 'background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center;';

    const presetsHeader = document.createElement('div');
    presetsHeader.style.cssText = 'color: #aaa; font-size: 0.65rem; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;';
    presetsHeader.innerText = 'Color Presets';
    presetsWrapper.appendChild(presetsHeader);

    const presetsContainer = document.createElement('div');
    presetsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(8, 22px); gap: 4px; justify-content: center;';

    this.presetContainers = this.presetContainers || [];
    this.presetContainers.push(presetsContainer);
    this.renderColorPresets('naturals');

    presetsWrapper.appendChild(presetsContainer);
    colorContainer.appendChild(colorPicker);
    colorContainer.appendChild(presetsWrapper);
    container.appendChild(colorContainer);
  }

  renderColorPresets(category) {
    if (!this.presetContainers) return;
    const eng = this.engine;
    let presets = [];
    if (category === 'industrial') {
      presets = [
        { name: 'Asphalt Dark', hex: '#222222' }, { name: 'Asphalt', hex: '#333333' }, { name: 'Road Grey', hex: '#444444' }, { name: 'Faded Road', hex: '#555555' },
        { name: 'Dark Concrete', hex: '#7f8c8d' }, { name: 'Concrete', hex: '#95a5a6' }, { name: 'Sidewalk', hex: '#bdc3c7' }, { name: 'Light Concrete', hex: '#d0d3d4' },
        { name: 'Plaster White', hex: '#ecf0f1' }, { name: 'Office White', hex: '#fdfefe' }, { name: 'Eggshell', hex: '#f4f6f6' }, { name: 'Putty', hex: '#eaeded' },
        { name: 'Dark Brick', hex: '#922b21' }, { name: 'Industrial Red', hex: '#a93226' }, { name: 'Cinder', hex: '#c0392b' }, { name: 'Rust', hex: '#e74c3c' },
        { name: 'Hazard Yellow', hex: '#f1c40f' }, { name: 'Warning Orange', hex: '#f39c12' }, { name: 'Safety Gold', hex: '#d4ac0d' }, { name: 'Mustard', hex: '#b7950b' },
        { name: 'Steel', hex: '#34495e' }, { name: 'Dark Metal', hex: '#2c3e50' }, { name: 'Gunmetal', hex: '#273746' }, { name: 'Iron', hex: '#1c2833' }
      ];
    } else if (category === 'lines') {
      presets = [
        { name: 'Standard White', hex: '#ffffff' }, { name: 'Warning Yellow', hex: '#f1c40f' }, { name: 'Handicap Blue', hex: '#3498db' }, { name: 'Fire Lane Red', hex: '#e74c3c' },
        { name: 'Faded White', hex: '#bdc3c7' }, { name: 'Faded Yellow', hex: '#f39c12' }, { name: 'Faded Blue', hex: '#2980b9' }, { name: 'Faded Red', hex: '#c0392b' }
      ];
    } else {
      presets = [
        { name: 'Default', hex: '#ffffff' }, { name: 'Birch', hex: '#e1d4b6' }, { name: 'Pine', hex: '#d9c593' }, { name: 'Bamboo', hex: '#d5d48c' },
        { name: 'Alder', hex: '#d4b79b' }, { name: 'Ash', hex: '#c2bba8' }, { name: 'Driftwood', hex: '#8c8c83' }, { name: 'Maple', hex: '#c58d55' },
        { name: 'Oak', hex: '#a08153' }, { name: 'Teak', hex: '#9d6736' }, { name: 'Jungle', hex: '#b07c57' }, { name: 'Acacia', hex: '#ba643b' },
        { name: 'Cherry', hex: '#c9786a' }, { name: 'Red Cedar', hex: '#8c3c2f' }, { name: 'Mangrove', hex: '#77353b' }, { name: 'Chestnut', hex: '#7d492e' },
        { name: 'Spruce', hex: '#7a5840' }, { name: 'Hickory', hex: '#8a5c3a' }, { name: 'Mahogany', hex: '#5a2523' }, { name: 'Rosewood', hex: '#63251c' },
        { name: 'Walnut', hex: '#5c4033' }, { name: 'Dark Oak', hex: '#452c16' }, { name: 'Ironwood', hex: '#3e342b' }, { name: 'Ebony', hex: '#26221f' }
      ];
    }

    this.presetContainers.forEach(container => {
      container.innerHTML = '';
      presets.forEach(p => {
        const pBtn = document.createElement('button');
        pBtn.style.cssText = `width: 22px; height: 22px; background: ${p.hex}; border: 1px solid #000; border-radius: 2px; cursor: pointer; padding: 0; box-sizing: border-box;`;

        pBtn.onmouseenter = (e) => {
          const activeSlot = document.querySelector('.hotbar-slot.active') || document.querySelector('.hotbar-slot[data-tex="stone"]');
          let isBlock = false;
          let bgStyle = '';
          let blockName = '';
          if (activeSlot && activeSlot.dataset.tex !== 'picker' && activeSlot.dataset.tex !== 'erase') {
            isBlock = true;
            bgStyle = activeSlot.dataset.bg || '';
            blockName = activeSlot.dataset.name || activeSlot.dataset.tex;
          }
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            const tooltipText = isBlock ? `${blockName} (${p.name})` : p.name;
            if (isBlock) {
              const safeBg = bgStyle.replace(/"/g, "'");
              const makeFace = (transform, brightness, border) => `
                       <div style="position: absolute; width: 32px; height: 32px; background: ${safeBg}; transform: ${transform}; border: 1px solid ${border}; filter: brightness(${brightness}); overflow: hidden;">
                         <div style="position: absolute; inset: 0; background: ${p.hex}; mix-blend-mode: multiply;"></div>
                       </div>
                     `;
              builderTooltip.innerHTML = `
                       <div style="display: flex; align-items: center; gap: 15px; padding: 2px;">
                         <div style="width: 32px; height: 32px; transform-style: preserve-3d; animation: tooltipSpin 4s infinite linear; margin: 5px;">
                           ${makeFace('translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateY(180deg) translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateY(90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateY(-90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateX(90deg) translateZ(16px)', 1.0, 'rgba(0,0,0,0.15)')}
                           ${makeFace('rotateX(-90deg) translateZ(16px)', 0.5, 'rgba(0,0,0,0.4)')}
                         </div>
                         <span>${tooltipText}</span>
                       </div>
                     `;
            } else {
              builderTooltip.innerText = tooltipText;
            }
            builderTooltip.style.display = 'block';
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        pBtn.onmousemove = (e) => {
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        pBtn.onmouseleave = () => {
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) builderTooltip.style.display = 'none';
        };

        pBtn.onclick = () => {
          eng.buildColor = p.hex;
          document.querySelectorAll('.shared-color-picker').forEach(cp => cp.value = p.hex);
        };
        container.appendChild(pBtn);
      });
    });
  }
}
