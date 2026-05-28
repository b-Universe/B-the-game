import { FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';
const HUD_BTN_STYLE = 'width: auto; height: 45px; padding: 0 10px; font-weight: bold; background: rgba(0,0,0,0.8); border-color: #f39c12; color: #f39c12; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;';
const DEV_BTN_STYLE = 'width: 100%; margin-top: 5px;';
const HEADER_STYLE = 'background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; margin-bottom: 10px;';
const TOOL_BTN_STYLE = 'padding: 0 10px; border-color: #f1c40f; color: #f1c40f;';
const MODAL_BG_STYLE = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 1000000;';
const NPC_ROW_STYLE = 'display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px;';
const HOTBAR_HEADER_STYLE = 'background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: center; align-items: center; cursor: move; user-select: none; margin: -10px -10px 10px -10px; border-radius: 6px 6px 0 0;';
const TOOLTIP_STYLE = 'position: fixed; background: rgba(0,0,0,0.9); border: 1px solid #3498db; color: #fff; padding: 5px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; pointer-events: none; z-index: 1000000; display: none; white-space: nowrap; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.8);';
const SHAPE_CONTAINER_STYLE = 'display: flex; gap: 5px; align-items: center; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; border: 1px solid #333; justify-content: center;';
const SHAPE_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; min-width: 100px;';
const DIR_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #f39c12; color: #f39c12; display: none; min-width: 40px;';
const REL_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #9b59b6; color: #9b59b6; display: none; min-width: 40px;';
const FLUID_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; display: none; width: 100%;';
const PLAYER_PANEL_STYLE = 'position: absolute; top: 150px; left: 50px; display: none; width: 800px;';
const PLAYER_ROW_STYLE = 'display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 8px; border-radius: 4px; font-size: 0.8rem;';

export class DevToolsUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.engine.buildColor = '#ffffff';
    this.ui = mainUIManager;

    this.ui.makeDraggable('dev-panel', '.dev-panel-header');
    this.ui.makeDraggable('builder-panel', '.dev-panel-header');
    this.ui.makeDraggable('npc-manager-panel', '.dev-panel-header');
    this.ui.makeDraggable('npc-edit-modal', '.dev-panel-header');

    this.setupDevTools();
    this.setupBuilderTools();
    this.setupObjectLibrary();
    this.setupSideHudButtons();
    this.setupPlayerManager();
    this.updateBuildingMode();
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
      btn.style.cssText = HUD_BTN_STYLE;
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
      const npcPanel = document.getElementById('npc-manager-panel');
      if (npcPanel) {
        npcPanel.style.display = npcPanel.style.display === 'none' ? 'flex' : 'none';
        if (npcPanel.style.display === 'flex') this.renderNpcManager();
      }
    });
    createBtn('btn-hud-dev', '/dev', 'Toggle Dev Tools', () => this.engine.chat.commandHandler.processCommand('/dev'));
    createBtn('btn-hud-edit', '/edit', 'Toggle Edit Mode', () => this.engine.chat.commandHandler.processCommand('/editmode'));
  }

  setupDevTools() {
    const eng = this.engine;
    const devPanel = document.getElementById('dev-panel');
    if (devPanel) {
      document.getElementById('btn-close-dev').onclick = () => devPanel.style.display = 'none';

      const setupDevBtn = (id, prop, color, labelText) => {
        let btn = document.getElementById(id);
        if (!btn && devPanel) {
          btn = document.createElement('button');
          btn.id = id;
          btn.className = 'btn-secondary';
          btn.innerText = labelText || id;
          btn.style.cssText = DEV_BTN_STYLE;
          devPanel.appendChild(btn);
        }
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

      // Completely remove unused buttons from the DOM
      ['btn-dev-player-tile', 'btn-dev-mouse', 'btn-dev-entity-tile', 'btn-dev-tile', 'btn-dev-chunk', 'btn-dev-player-manager'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });

      setupDevBtn('btn-dev-player', 'showPlayerPos', '#ff4757', 'Toggle Player Pos');
      setupDevBtn('btn-dev-entity', 'showEntityPos', '#ff4757', 'Toggle Entity Pos');
      setupDevBtn('btn-dev-dist-player-mouse', 'showDistPlayerToMouse', '#f1c40f', 'Dist: Player to Mouse');
      setupDevBtn('btn-dev-dist-mouse', 'showDistNpcToMouse', '#f1c40f', 'Dist: NPC to Mouse');
      setupDevBtn('btn-dev-dist-npc', 'showDistToNPC', '#f1c40f', 'Dist: Player to NPC');
      setupDevBtn('btn-dev-melee', 'showMelee', '#ff4757', 'Toggle Melee Range');
      setupDevBtn('btn-dev-los', 'showLoS', '#f1c40f', 'Toggle Line of Sight');

      const btnLos = document.getElementById('btn-dev-los');
      if (btnLos && !document.getElementById('btn-dev-los-edit')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'wrapper-dev-los';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '5px';
        wrapper.style.marginTop = '5px';
        wrapper.style.width = '100%';

        btnLos.parentNode.insertBefore(wrapper, btnLos);
        btnLos.style.marginTop = '0';
        wrapper.appendChild(btnLos);

        const editBtn = document.createElement('button');
        editBtn.id = 'btn-dev-los-edit';
        editBtn.className = 'btn-secondary';
        editBtn.innerText = '✎';
        editBtn.style.cssText = TOOL_BTN_STYLE;
        editBtn.onclick = () => {
          const modal = document.getElementById('los-edit-modal');
          if (modal) {
            document.getElementById('edit-los-dist').value = eng.devOptions.losDistance !== undefined ? eng.devOptions.losDistance : 400;
            document.getElementById('edit-los-angle').value = eng.devOptions.losAngle !== undefined ? eng.devOptions.losAngle : 60;
            modal.style.display = 'flex';
          }
        };
        wrapper.appendChild(editBtn);
      }

      setupDevBtn('btn-dev-hitbox', 'showHitboxes', '#ff4757', 'Toggle Hitboxes');

      const btnDistPlayerMouse = document.getElementById('btn-dev-dist-player-mouse');
      if (btnDistPlayerMouse && !document.getElementById('btn-dev-tooltip-toggle')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'wrapper-dev-dist-player-mouse';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '5px';
        wrapper.style.marginTop = '5px';
        wrapper.style.width = '100%';

        btnDistPlayerMouse.parentNode.insertBefore(wrapper, btnDistPlayerMouse);
        btnDistPlayerMouse.style.marginTop = '0';
        wrapper.appendChild(btnDistPlayerMouse);

        const tBtn = document.createElement('button');
        tBtn.id = 'btn-dev-tooltip-toggle';
        tBtn.className = 'btn-secondary';
        tBtn.innerText = 'T';
        tBtn.title = 'Toggle Tooltip Mode';
        tBtn.style.cssText = `${TOOL_BTN_STYLE} ${eng.devOptions.useDebugTooltip ? 'background: rgba(241, 196, 15, 0.2);' : ''}`;
        tBtn.onclick = () => {
          eng.devOptions.useDebugTooltip = !eng.devOptions.useDebugTooltip;
          tBtn.style.background = eng.devOptions.useDebugTooltip ? 'rgba(241, 196, 15, 0.2)' : 'transparent';
          localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
        };
        wrapper.appendChild(tBtn);
      }

      const btnEditTarget = document.getElementById('btn-dev-edit-target');
      if (btnEditTarget) {
        btnEditTarget.onclick = () => {
          if (eng.selectedTarget && eng.selectedTarget.type === 'npc') {
            const npc = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
            if (npc) {
              document.getElementById('edit-npc-uuid').value = npc.uuid;
              document.getElementById('edit-npc-name').value = npc.name;
              document.getElementById('edit-npc-hp').value = Math.floor(npc.hp);
              document.getElementById('edit-npc-maxhp').value = npc.maxHp;
              document.getElementById('edit-npc-energy').value = Math.floor(npc.energy || 1000);
              document.getElementById('edit-npc-x').value = Math.round(npc.x);
              document.getElementById('edit-npc-y').value = Math.round(npc.y);
              document.getElementById('edit-npc-z').value = Math.round(npc.z || 0);
              document.getElementById('edit-npc-type').value = npc.type || 'idle';
              document.getElementById('edit-npc-dir').value = npc.dir || 'down';

              document.getElementById('npc-edit-modal').style.display = 'flex';
            }
          }
        };
      }

      const btnNpcManager = document.getElementById('btn-dev-npc-manager');
      const npcPanel = document.getElementById('npc-manager-panel');
      if (btnNpcManager && npcPanel) {
        btnNpcManager.onclick = () => {
          npcPanel.style.display = 'flex';
          this.renderNpcManager();
        };
        document.getElementById('btn-close-npc-manager').onclick = () => npcPanel.style.display = 'none';

        document.getElementById('btn-close-npc-edit').onclick = () => document.getElementById('npc-edit-modal').style.display = 'none';

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
            x: parseFloat(document.getElementById('edit-npc-x').value),
            y: parseFloat(document.getElementById('edit-npc-y').value),
            z: parseFloat(document.getElementById('edit-npc-z').value),
            type: document.getElementById('edit-npc-type').value,
            dir: document.getElementById('edit-npc-dir').value
          };
          eng.network.sendEditNpc(uuid, updates);
        };

        ['edit-npc-name', 'edit-npc-hp', 'edit-npc-maxhp', 'edit-npc-energy', 'edit-npc-x', 'edit-npc-y', 'edit-npc-z'].forEach(id => {
          document.getElementById(id).addEventListener('input', emitNpcUpdate);
        });
        ['edit-npc-type', 'edit-npc-dir'].forEach(id => {
          document.getElementById(id).addEventListener('change', emitNpcUpdate);
        });

        document.getElementById('btn-save-npc-edit').onclick = () => document.getElementById('npc-edit-modal').style.display = 'none';

        eng.socket.on('npc_deleted', (uuid) => {
          const idx = eng.npcs.findIndex(n => n.uuid === uuid);
          if (idx !== -1) eng.npcs.splice(idx, 1);
          if (npcPanel.style.display === 'flex') this.renderNpcManager();
        });
        eng.socket.on('npc_spawned', () => {
          if (npcPanel.style.display === 'flex') this.renderNpcManager();
        });
        eng.socket.on('npc_updated', (updatedNpc) => {
          const idx = eng.npcs.findIndex(n => n.uuid === updatedNpc.uuid);
          if (idx !== -1) {
            Object.assign(eng.npcs[idx], updatedNpc);
          }
          if (npcPanel.style.display === 'flex') this.renderNpcManager();
        });
      }

      const orderList = [
        'btn-dev-player',
        'btn-dev-entity',
        'wrapper-dev-dist-player-mouse',
        'btn-dev-dist-mouse',
        'btn-dev-dist-npc',
        'btn-dev-melee',
        'wrapper-dev-los',
        'btn-dev-hitbox',
        'btn-dev-edit-target',
        'btn-dev-npc-manager'
      ];

      orderList.forEach(id => {
        const el = document.getElementById(id);
        if (el && devPanel) {
          devPanel.appendChild(el);
          el.style.order = '';
        }
      });
    }

    this.setupLosModal();
  }

  setupLosModal() {
    const eng = this.engine;
    if (!document.getElementById('los-edit-modal')) {
      const modal = document.createElement('div');
      modal.id = 'los-edit-modal';
      modal.style.cssText = MODAL_BG_STYLE;
      modal.innerHTML = `
        <div style="background: #0b0e14; border: 2px solid #f1c40f; padding: 20px; border-radius: 8px; font-family: var(--font-mono); width: 250px;">
          <h3 style="color: #f1c40f; margin-top: 0;">Edit Line of Sight</h3>
          <div style="margin-bottom: 10px;">
            <label style="color: #fff; display: block; margin-bottom: 5px;">Distance (px)</label>
            <input type="number" id="edit-los-dist" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;" value="400">
          </div>
          <div style="margin-bottom: 15px;">
            <label style="color: #fff; display: block; margin-bottom: 5px;">FOV Angle (degrees)</label>
            <input type="number" id="edit-los-angle" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;" value="60">
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="btn-save-los" class="btn-primary" style="flex: 1;">Save</button>
            <button id="btn-close-los" class="btn-secondary" style="flex: 1;">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('btn-close-los').onclick = () => modal.style.display = 'none';
      document.getElementById('btn-save-los').onclick = () => {
        eng.devOptions.losDistance = parseInt(document.getElementById('edit-los-dist').value, 10) || 400;
        eng.devOptions.losAngle = parseInt(document.getElementById('edit-los-angle').value, 10) || 60;
        localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
        modal.style.display = 'none';
      };
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
        document.getElementById('edit-npc-x').value = Math.round(npc.x);
        document.getElementById('edit-npc-y').value = Math.round(npc.y);
        document.getElementById('edit-npc-z').value = Math.round(npc.z || 0);
        document.getElementById('edit-npc-type').value = npc.type || 'idle';
        document.getElementById('edit-npc-dir').value = npc.dir || 'down';

        document.getElementById('npc-edit-modal').style.display = 'flex';
      };

      row.querySelector('.btn-tp').onclick = () => {
        this.engine.player.x = npc.x;
        this.engine.player.y = npc.y;
        this.engine.camera.x = npc.x;
        this.engine.camera.y = npc.y;
        this.engine.chat.addMessage('system', 'System', `Teleported to ${npc.name}.`);
      };

      row.querySelector('.btn-del').onclick = () => {
        if (confirm(`Are you absolutely sure you want to delete NPC: ${npc.name}?`)) {
          this.engine.network.sendDeleteNpc(npc.uuid);
        }
      };

      list.appendChild(row);
    });
  }

  setupBuilderTools() {
    const eng = this.engine;
    const builderPanel = document.getElementById('builder-panel');
    if (builderPanel) {
      builderPanel.style.width = '260px';
      builderPanel.style.display = eng.editMode ? 'flex' : 'none';

      if (!builderPanel.querySelector('.dev-panel-header')) {
        const header = document.createElement('div');
        header.className = 'dev-panel-header';
        header.style.cssText = HEADER_STYLE;
        header.innerHTML = `<span style="color: #fff; font-weight: bold; font-size: 0.9rem;">Builder Tools</span><button id="btn-close-builder" style="background: transparent; border: none; color: #fff; cursor: pointer; font-weight: bold; padding: 0 5px;">X</button>`;
        builderPanel.insertBefore(header, builderPanel.firstChild);
        this.ui.makeDraggable('builder-panel', '.dev-panel-header');
      }
      document.getElementById('btn-close-builder').onclick = () => {
        if (eng.editMode) {
          eng.chat.commandHandler.processCommand('/editmode');
        } else {
          builderPanel.style.display = 'none';
        }
      };

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

      ['btn-build-tile', 'btn-build-coords'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });

      toggleBuilderOpt('btn-build-chunk', 'showChunk');
      toggleBuilderOpt('btn-build-preview', 'useBlockPreview');

      const toolsGroup = document.createElement('div');
      toolsGroup.style.cssText = 'display: flex; flex-direction: column; gap: 5px; margin-top: 10px;';

      const btnToggleHotbar = document.createElement('button');
      btnToggleHotbar.className = 'btn-secondary';
      btnToggleHotbar.style.cssText = 'width: 100%; border-color: #3498db; color: #3498db;';
      btnToggleHotbar.innerText = 'Toggle Texture Palette';
      btnToggleHotbar.onclick = () => {
          const hb = document.getElementById('builder-hotbar');
          const ol = document.getElementById('object-library-panel');
          if (hb) {
              const isHidden = hb.style.display === 'none';
              hb.style.display = isHidden ? 'flex' : 'none';
              if (isHidden && ol) ol.style.display = 'none';
              this.updateBuildingMode();
          }
      };

      const btnToggleObjLib = document.createElement('button');
      btnToggleObjLib.className = 'btn-secondary';
      btnToggleObjLib.style.cssText = 'width: 100%; border-color: #9b59b6; color: #9b59b6;';
      btnToggleObjLib.innerText = 'Toggle Object Library';
      btnToggleObjLib.onclick = () => {
          const hb = document.getElementById('builder-hotbar');
          const ol = document.getElementById('object-library-panel');
          if (ol) {
              const isHidden = ol.style.display === 'none';
              ol.style.display = isHidden ? 'flex' : 'none';
              if (isHidden && hb) hb.style.display = 'none';
              this.updateBuildingMode();
          }
      };

      toolsGroup.appendChild(btnToggleHotbar);
      toolsGroup.appendChild(btnToggleObjLib);
      builderPanel.appendChild(toolsGroup);
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
          if (activeSlot && activeSlot.dataset.tex.includes('door')) base = 'door';

          eng.editShapeBase = base;
          eng.editShape = base;

          const shapeBtn = document.getElementById('build-shape-btn');
          if (shapeBtn) {
              shapeBtn.innerText = 'Shape: ' + base.toUpperCase();
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
          if (shapeBtn) shapeBtn.innerText = 'Shape: NONE';
      }
  }

  setupObjectLibrary() {
    const eng = this.engine;
    let objLibPanel = document.getElementById('object-library-panel');
    if (!objLibPanel) {
      objLibPanel = document.createElement('div');
      objLibPanel.id = 'object-library-panel';
      objLibPanel.className = 'dev-panel';
      objLibPanel.style.cssText = 'position: absolute; width: 260px; background: rgba(5, 7, 10, 0.9); border: 2px solid #3498db; border-radius: 8px; display: none; flex-direction: column; padding: 10px; z-index: 1000; pointer-events: auto; resize: vertical; overflow: hidden;';

      if (eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
          const savedPos = localStorage.getItem('b_objlib_pos');
          if (savedPos) {
              try { const pos = JSON.parse(savedPos); objLibPanel.style.left = pos.left; objLibPanel.style.top = pos.top; } catch(e) {}
          } else {
              objLibPanel.style.top = '70px';
              objLibPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '570px' : '310px';
          }
      } else {
          objLibPanel.style.top = '70px';
          objLibPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '570px' : '310px';
      }

      const header = document.createElement('div');
      header.className = 'dev-panel-header';
      header.style.cssText = 'background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; margin: -10px -10px 10px -10px; border-radius: 6px 6px 0 0;';
      header.innerHTML = `<span style="color: #fff; font-weight: bold; font-size: 0.9rem;">Object Library</span><button id="btn-close-objlib" style="background: transparent; border: none; color: #fff; cursor: pointer; font-weight: bold; padding: 0 5px;">X</button>`;
      objLibPanel.appendChild(header);

      const objLibGrid = document.createElement('div');
      objLibGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding-top: 5px; overflow-y: scroll; flex-grow: 1; min-height: 168px; padding-right: 5px; align-content: start;';

      for (const [id, data] of Object.entries(FURNITURE_REGISTRY)) {
        const btnObj = document.createElement('button');
        btnObj.id = `btn-obj-${id}`;
        btnObj.className = 'btn-secondary';
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
          const woodSlot = document.querySelector('.hotbar-slot[data-tex="wood-planks"]');
          if (woodSlot) woodSlot.click();

          eng.editShapeBase = id;
          eng.editShape = id;

          const shapeBtn = document.getElementById('build-shape-btn');
          const dirBtn = document.getElementById('build-dir-btn');
          const relBtn = document.getElementById('build-rel-btn');
          const flipBtn = document.getElementById('build-flip-btn');

          if (shapeBtn) shapeBtn.innerText = `Shape: ${data.name.toUpperCase()}`;
          if (dirBtn) { dirBtn.style.display = 'block'; dirBtn.innerText = eng.editShapeDir.toUpperCase(); }
          if (relBtn) relBtn.style.display = 'none';
          if (flipBtn) flipBtn.style.display = 'none';
        };
        objLibGrid.appendChild(btnObj);
      }

      objLibPanel.appendChild(objLibGrid);
      this.appendColorPicker(objLibPanel);
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) {
        gameScreen.appendChild(objLibPanel);
      } else {
        document.body.appendChild(objLibPanel);
      }

      document.getElementById('btn-close-objlib').onclick = () => {
          objLibPanel.style.display = 'none';
          this.updateBuildingMode();
      };
      this.ui.makeDraggable('object-library-panel', '.dev-panel-header');
    }
  }

  setupBuilderHotbar() {
    const eng = this.engine;
    const builderHotbar = document.getElementById('builder-hotbar');
    if (!builderHotbar) return;

      builderHotbar.innerHTML = '';

      builderHotbar.style.position = 'absolute';
      if (eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
        const savedPos = localStorage.getItem('b_hotbar_pos');
        if (savedPos) {
          try {
            const pos = JSON.parse(savedPos);
            builderHotbar.style.left = pos.left; builderHotbar.style.top = pos.top;
          } catch(e) {}
        } else {
          builderHotbar.style.top = '280px';
          builderHotbar.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
        }
      } else {
        builderHotbar.style.top = '280px';
        builderHotbar.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
      }
      builderHotbar.style.bottom = 'auto';
      builderHotbar.style.background = 'rgba(5, 7, 10, 0.9)';
      builderHotbar.style.border = '2px solid #3498db';
      builderHotbar.style.borderRadius = '8px';
      builderHotbar.style.pointerEvents = 'auto';
      builderHotbar.style.display = 'none';
      builderHotbar.style.flexDirection = 'column';
      builderHotbar.style.padding = '10px';
      builderHotbar.style.gap = '10px';
      builderHotbar.style.zIndex = '1000';
      builderHotbar.style.width = '260px';
      builderHotbar.style.resize = 'vertical';
      builderHotbar.style.overflow = 'hidden';

      const header = document.createElement('div');
      header.className = 'dev-panel-header';
      header.style.cssText = HOTBAR_HEADER_STYLE;
      header.innerHTML = `<span style="color: #fff; font-weight: bold; font-size: 0.9rem;">Texture Palette</span>`;
      builderHotbar.appendChild(header);

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

    const controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.flexDirection = 'column';
    controlsContainer.style.gap = '5px';

    this.appendColorPicker(controlsContainer);

    const shapeContainer = document.createElement('div');
    shapeContainer.id = 'build-shape-container';
    shapeContainer.style.cssText = SHAPE_CONTAINER_STYLE;

    const shapeBtn = document.createElement('button');
    shapeBtn.id = 'build-shape-btn';
    shapeBtn.className = 'btn-secondary';
    shapeBtn.style.cssText = SHAPE_BTN_STYLE;
    shapeBtn.innerText = 'Shape: CUBE';

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
    flipBtn.innerText = 'F';
    flipBtn.title = 'Toggle Flip (Mirror)';

    shapeContainer.appendChild(shapeBtn);
    shapeContainer.appendChild(relBtn);
    shapeContainer.appendChild(dirBtn);
    shapeContainer.appendChild(flipBtn);
    controlsContainer.appendChild(shapeContainer);

    const fluidBtn = document.createElement('button');
    fluidBtn.id = 'build-fluid-btn';
    fluidBtn.className = 'btn-secondary';
    fluidBtn.style.cssText = FLUID_BTN_STYLE;
    fluidBtn.innerText = 'Fluid State: STILL';
    controlsContainer.appendChild(fluidBtn);

    builderHotbar.appendChild(controlsContainer);

    setupTooltip(shapeBtn, 'Cycle Block Shape (Cube, Slab, Ramp, Stair)');
    setupTooltip(dirBtn, 'Cycle Block Direction (N, E, S, W)');
    setupTooltip(relBtn, 'Toggle Player-Relative Rotation');
    setupTooltip(fluidBtn, 'Toggle Fluid State (Still / Flow)');

    eng.editShapeBase = 'cube';
    eng.editShapeDir = 'n';
    eng.editShapeRelative = false;
    eng.editShapeFlip = false;
    eng.editFluid = 'still';

    fluidBtn.onclick = () => {
        eng.editFluid = eng.editFluid === 'still' ? 'flow' : 'still';
        fluidBtn.innerText = 'Fluid State: ' + eng.editFluid.toUpperCase();
    };

    flipBtn.onclick = () => {
      eng.editShapeFlip = !eng.editShapeFlip;
      updateShapeUI();
    };

    const updateShapeUI = () => {
      if (eng.editShapeBase === 'none') {
        if (shapeBtn) shapeBtn.innerText = 'Shape: NONE';
        if (dirBtn) dirBtn.style.display = 'none';
        if (relBtn) relBtn.style.display = 'none';
        if (flipBtn) flipBtn.style.display = 'none';
        return;
      }
      shapeBtn.innerText = 'Shape: ' + eng.editShapeBase.toUpperCase();

      if (eng.editShapeBase === 'door') {
        dirBtn.style.display = 'block';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'block';
      } else if (FURNITURE_REGISTRY[eng.editShapeBase]) {
        dirBtn.style.display = 'block';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'none';
      } else if (eng.editShapeBase === 'ramp' || eng.editShapeBase === 'stair') {
        dirBtn.style.display = eng.editShapeRelative ? 'none' : 'block';
        relBtn.style.display = 'block';
        flipBtn.style.display = 'none';
      } else {
        dirBtn.style.display = 'none';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'none';
      }

      dirBtn.innerText = eng.editShapeDir.toUpperCase();
      relBtn.style.background = eng.editShapeRelative ? 'rgba(155, 89, 182, 0.2)' : 'transparent';
      flipBtn.style.background = eng.editShapeFlip ? 'rgba(46, 204, 113, 0.2)' : 'transparent';

      let finalShape = eng.editShapeBase;
      if (finalShape === 'ramp' || finalShape === 'stair' || finalShape === 'door') {
          if (eng.editShapeRelative && finalShape !== 'door') {
            eng.editShape = finalShape + '_player';
          } else {
            eng.editShape = finalShape + '_' + eng.editShapeDir + (finalShape === 'door' && eng.editShapeFlip ? '_flip' : '');
          }
      } else if (FURNITURE_REGISTRY[finalShape]) {
          eng.editShape = finalShape;
      } else {
          eng.editShape = finalShape;
      }
    };

    shapeBtn.onclick = () => {
      const activeSlot = document.querySelector('.hotbar-slot.active');
      const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
      let bases = ['cube', 'slab', 'ramp', 'stair'];
      if (tex.includes('door')) bases = ['door'];
      else if (FURNITURE_REGISTRY[eng.editShapeBase]) bases = [eng.editShapeBase, 'cube', 'slab', 'ramp', 'stair'];

      let nextIdx = bases.indexOf(eng.editShapeBase) + 1;
      if (nextIdx >= bases.length) nextIdx = 0;
      eng.editShapeBase = bases[nextIdx];
      updateShapeUI();
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
    updateShapeUI();

    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'builder-tabs-container';
    tabsContainer.style.cssText = 'display: flex; gap: 5px; flex-wrap: wrap; padding-bottom: 5px; margin-bottom: 5px;';

    const gridsWrapper = document.createElement('div');
    gridsWrapper.style.cssText = 'position: relative; overflow-y: scroll; flex-grow: 1; min-height: 168px; padding-right: 5px;';

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

            if (tex.includes('door')) {
               eng.editShapeBase = 'door';
               eng.editShapeFlip = false;
               updateShapeUI();
            } else if (eng.editShapeBase === 'door') {
               eng.editShapeBase = 'cube';
               eng.editShapeFlip = false;
               updateShapeUI();
            } else {
               const ol = document.getElementById('object-library-panel');
               const olVisible = ol && ol.style.display !== 'none';
               if (!olVisible && eng.editShapeBase !== 'cube' && eng.editShapeBase !== 'slab' && eng.editShapeBase !== 'ramp' && eng.editShapeBase !== 'stair') {
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
              const isErase = slot.dataset.tex === 'erase' || eng.input.keys['shift'];
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

              let finalTex = slot.dataset.tex;
              if (finalTex === 'water' && eng.editFluid === 'flow') finalTex = 'water_flow';

              if (finalTex.includes('door') && !placeShape.startsWith('door')) {
                placeShape = 'door_' + eng.editShapeDir + (eng.editShapeFlip ? '_flip' : '');
              } else if (!finalTex.includes('door') && placeShape.startsWith('door')) {
                placeShape = 'cube';
              }

              const updates = [];
              const previousStates = [];
                eng.selectedTiles.forEach(tile => {
                  const clickedVoxelOld = eng.mapManager.getVoxelAt(tile.x, tile.y, tile.z);
                  previousStates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: clickedVoxelOld ? { ...clickedVoxelOld } : null });

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
                    eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir }, false);
                    updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir } });
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

      ensureSlot('light', 'light_block', 'rgba(241, 196, 15, 0.4)', '', 'Light Block (Invisible)');
      ensureSlot('light', 'block-lamp-on-0', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/8 Spread)');
      ensureSlot('light', 'block-lamp-on-1', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/4 Spread)');
      ensureSlot('light', 'block-lamp-on-2', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/2 Spread)');
      ensureSlot('light', 'block-lamp-on-3', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (3/4 Spread)');
      ensureSlot('light', 'block-lamp-on', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (Max Spread)');

      ensureSlot('wood', 'wood-planks', '#8B5A2B url("assets/tiles/base/all-facing/wood-planks.png") center/cover', '', 'Wood Planks');
      ensureSlot('wood', 'wood-stripped', '#A0522D url("assets/tiles/base/all-facing/wood-stripped.png") center/cover', '', 'Stripped Wood');
      ensureSlot('wood', 'bark-log', '#5c4033 url("assets/tiles/base/all-facing/bark-log.png") center/cover', '', 'Bark Log');
      ensureSlot('wood', 'bark-birch', '#d4b79b url("assets/tiles/base/all-facing/bark-birch.png") center/cover', '', 'Birch Bark');
      ensureSlot('wood', 'wood-door-bottom', '#6b4c3a url("assets/tiles/base/interactable/wood_door-bottom.png") center/cover', '', 'Wood Door');

      ensureSlot('industrial', 'concrete', 'url("assets/tiles/base/all-facing/concrete.png") center/cover', '', 'Concrete');
      ensureSlot('industrial', 'paint', 'url("assets/tiles/base/side/rough-paint.png") center/cover', '', 'Paint');
      ensureSlot('industrial', 'carpet', 'url("assets/tiles/base/all-facing/carpet.png") center/cover', '', 'Carpet');
      ensureSlot('industrial', 'arcade-carpet', 'url("assets/tiles/base/all-facing/arcade-carpet.png") center/cover', '', 'Arcade Carpet');

      builderHotbar.appendChild(tabsContainer);
      builderHotbar.appendChild(gridsWrapper);
      this.ui.makeDraggable('builder-hotbar', '.dev-panel-header');

      if (categories['naturals']) categories['naturals'].btn.click();
      const firstSlot = gridsWrapper.querySelector('.hotbar-slot[data-tex="stone"]');
      if (firstSlot) firstSlot.click();
  }

  setupPlayerManager() {
    const eng = this.engine;
    let panel = document.getElementById('player-manager-panel');
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'player-manager-panel';
    panel.className = 'dev-panel';
    panel.style.cssText = PLAYER_PANEL_STYLE;
    panel.innerHTML = `
        <div class="dev-panel-header">
            <span>Player Manager</span>
            <button id="btn-close-player-manager" class="btn-close">X</button>
        </div>
        <div id="player-manager-list" class="npc-manager-list" style="max-height: 500px;"></div>
    `;
    document.body.appendChild(panel);
    document.getElementById('btn-close-player-manager').onclick = () => panel.style.display = 'none';
    this.ui.makeDraggable('player-manager-panel', '.dev-panel-header');
  }

  renderPlayerManager() {
    const list = document.getElementById('player-manager-list');
    if (!list) return;
    list.innerHTML = '';

    const players = [this.engine.player, ...Object.values(this.engine.otherPlayers)];
    players.sort((a, b) => (a.name || this.engine.playerData.name).localeCompare(b.name));

    players.forEach(p => {
      const isSelf = p === this.engine.player;
      const name = isSelf ? this.engine.playerData.name : p.name;
      const level = isSelf ? this.engine.playerData.level : p.level;
      const alignment = isSelf ? this.engine.playerData.alignment : p.alignment;
      const race = isSelf ? this.engine.playerData.race : p.race;
      const integrity = isSelf ? this.engine.playerData.integrity : p.integrity;

      const row = document.createElement('div');
      row.style.cssText = PLAYER_ROW_STYLE;

      row.innerHTML = `
          <div style="flex: 1.2; font-weight: bold; color: ${isSelf ? '#2ecc71' : '#3498db'};" title="${name}">${name} (Lv.${level || 1})</div>
          <div style="flex: 1.5; display: flex; align-items: center; gap: 5px;">
              <span>X:${Math.round(p.x)} Y:${Math.round(p.y)} Z:${Math.round(p.z || 0)}</span>
              <button class="btn-tp btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;">TP</button>
          </div>
          <div style="flex: 0.8;">${alignment || 'N/A'}</div>
          <div style="flex: 0.8;">${race || 'N/A'}</div>
          <div style="flex: 0.8;">${integrity || 0}%</div>
          <div style="flex: 1;">${Math.floor(p.hp)} / ${p.maxHp}</div>
          <button class="btn-edit btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;">Edit</button>
      `;

      row.querySelector('.btn-tp').onclick = () => {
        this.engine.chat.commandHandler.processCommand(`/tp ${Math.round(p.x)} ${Math.round(p.y)} ${Math.round(p.z || 0)}`);
      };

      row.querySelector('.btn-edit').onclick = () => {
        this.engine.chat.addMessage('system', 'System', `Editing player ${name} is not yet implemented.`);
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

    const presets = [
      { name: 'Default', hex: '#ffffff' }, { name: 'Birch', hex: '#e1d4b6' }, { name: 'Pine', hex: '#d9c593' }, { name: 'Bamboo', hex: '#d5d48c' },
      { name: 'Alder', hex: '#d4b79b' }, { name: 'Ash', hex: '#c2bba8' }, { name: 'Driftwood', hex: '#8c8c83' }, { name: 'Maple', hex: '#c58d55' },
      { name: 'Oak', hex: '#a08153' }, { name: 'Teak', hex: '#9d6736' }, { name: 'Jungle', hex: '#b07c57' }, { name: 'Acacia', hex: '#ba643b' },
      { name: 'Cherry', hex: '#c9786a' }, { name: 'Red Cedar', hex: '#8c3c2f' }, { name: 'Mangrove', hex: '#77353b' }, { name: 'Chestnut', hex: '#7d492e' },
      { name: 'Spruce', hex: '#7a5840' }, { name: 'Hickory', hex: '#8a5c3a' }, { name: 'Mahogany', hex: '#5a2523' }, { name: 'Rosewood', hex: '#63251c' },
      { name: 'Walnut', hex: '#5c4033' }, { name: 'Dark Oak', hex: '#452c16' }, { name: 'Ironwood', hex: '#3e342b' }, { name: 'Ebony', hex: '#26221f' }
    ];

    presets.forEach(p => {
      const pBtn = document.createElement('button');
      pBtn.style.cssText = `width: 22px; height: 22px; background: ${p.hex}; border: 1px solid #000; border-radius: 2px; cursor: pointer; padding: 0; box-sizing: border-box;`;
      pBtn.title = p.name;
      pBtn.onclick = () => {
          eng.buildColor = p.hex;
          document.querySelectorAll('.shared-color-picker').forEach(cp => cp.value = p.hex);
      };
      presetsContainer.appendChild(pBtn);
    });

    presetsWrapper.appendChild(presetsContainer);
    colorContainer.appendChild(colorPicker);
    colorContainer.appendChild(presetsWrapper);
    container.appendChild(colorContainer);
  }
}
