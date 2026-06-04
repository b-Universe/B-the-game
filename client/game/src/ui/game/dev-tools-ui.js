import { FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { NPCManagerWindow, NPCEditWindow } from '../windows/npc-windows.js?v=cache-bust-005';
import { PlayerManagerWindow } from '../windows/player-windows.js?v=cache-bust-005';
import { ZoneManagerWindow } from '../windows/zone-windows.js?v=cache-bust-005';
import { ArcadeManagerWindow, ArcadeEditWindow } from '../windows/arcade-windows.js?v=cache-bust-005';
const HUD_BTN_STYLE = 'width: auto; height: 45px; padding: 0 10px; font-weight: bold; background: rgba(0,0,0,0.8); border-color: #f39c12; color: #f39c12; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;';
const DEV_BTN_STYLE = 'width: 100%; margin-top: 5px;';
const HEADER_STYLE = 'background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; margin-bottom: 10px;';
const TOOL_BTN_STYLE = 'padding: 0 10px; border-color: #f1c40f; color: #f1c40f;';
const MODAL_BG_STYLE = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 1000000;';
const NPC_ROW_STYLE = 'display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px;';
const HOTBAR_HEADER_STYLE = 'background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: center; align-items: center; cursor: move; user-select: none; margin: -10px -10px 10px -10px; border-radius: 6px 6px 0 0;';
const TOOLTIP_STYLE = 'position: fixed; background: rgba(0,0,0,0.9); border: 1px solid #3498db; color: #fff; padding: 5px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; pointer-events: none; z-index: 1000000; display: none; white-space: nowrap; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.8);';
const SHAPE_CONTAINER_STYLE = 'display: flex; gap: 5px; align-items: center; flex-wrap: wrap; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; border: 1px solid #333; justify-content: center;';
const SHAPE_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; min-width: 100px;';
const DIR_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #f39c12; color: #f39c12; display: none; min-width: 40px;';
const REL_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #9b59b6; color: #9b59b6; display: none; min-width: 40px;';
const FLUID_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; display: none; width: 100%;';
const PLAYER_ROW_STYLE = 'display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 8px; border-radius: 4px; font-size: 0.8rem;';

export class DevToolsUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.engine.buildColor = '#ffffff';
    this.ui = mainUIManager;

    this.npcManagerWindow = new NPCManagerWindow();
    this.npcEditWindow = new NPCEditWindow();
    this.playerManagerWindow = new PlayerManagerWindow();
    this.zoneManagerWindow = new ZoneManagerWindow();
    this.arcadeManagerWindow = new ArcadeManagerWindow();
    this.arcadeEditWindow = new ArcadeEditWindow();

    this.ui.makeDraggable('dev-panel', '.dev-panel-header');
    this.ui.makeDraggable('builder-panel', '.dev-panel-header');

    this.setupDevTools();
    this.setupBuilderTools();
    this.setupObjectLibrary();
    this.setupSideHudButtons();
    this.setupPlayerManager();
    this.setupZoneManager();
    this.setupArcadeManager();
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
      ['btn-dev-player-tile', 'btn-dev-mouse', 'btn-dev-entity-tile', 'btn-dev-tile', 'btn-dev-chunk'].forEach(id => {
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
      setupDevBtn('btn-dev-arcade-hover', 'showArcadeHover', '#e056fd', 'Toggle Arcade Hover');

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
        editBtn.style.cssText = TOOL_BTN_STYLE + ' border-color: #e056fd; color: #e056fd;';
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
              document.getElementById('edit-npc-x').value = Math.round(npc.x);
              document.getElementById('edit-npc-y').value = Math.round(npc.y);
              document.getElementById('edit-npc-z').value = Math.round(npc.z || 0);
              document.getElementById('edit-npc-type').value = npc.type || 'idle';
              document.getElementById('edit-npc-dir').value = npc.dir || 'down';

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
          this.npcManagerWindow.open();
          this.renderNpcManager();
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

        document.getElementById('btn-save-npc-edit').onclick = () => this.npcEditWindow.close();

        eng.socket.on('npc_deleted', (uuid) => {
          const idx = eng.npcs.findIndex(n => n.uuid === uuid);
          if (idx !== -1) eng.npcs.splice(idx, 1);
          if (this.npcManagerWindow.element.style.display === 'flex') this.renderNpcManager();
        });
        eng.socket.on('npc_spawned', () => {
          if (this.npcManagerWindow.element.style.display === 'flex') this.renderNpcManager();
        });
        eng.socket.on('npc_updated', (updatedNpc) => {
          const idx = eng.npcs.findIndex(n => n.uuid === updatedNpc.uuid);
          if (idx !== -1) {
            Object.assign(eng.npcs[idx], updatedNpc);
          }
          if (this.npcManagerWindow.element.style.display === 'flex') this.renderNpcManager();
        });
      }

      // Add the Management Group
      let mgmtGroup = document.getElementById('dev-mgmt-group');
      if (!mgmtGroup && devPanel) {
        mgmtGroup = document.createElement('div');
        mgmtGroup.id = 'dev-mgmt-group';
        mgmtGroup.style.cssText = 'display: flex; flex-direction: column; gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(52, 152, 219, 0.5);';

        const title = document.createElement('div');
        title.innerText = 'World & Entity Management';
        title.style.cssText = 'color: #3498db; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; text-align: center;';
        mgmtGroup.appendChild(title);

        devPanel.appendChild(mgmtGroup);
      }

      let btnPlayerManager = document.getElementById('btn-dev-player-manager');
      if (!btnPlayerManager && devPanel) {
        btnPlayerManager = document.createElement('button');
        btnPlayerManager.id = 'btn-dev-player-manager';
        btnPlayerManager.className = 'btn-secondary';
        btnPlayerManager.innerText = 'Player Manager';
        btnPlayerManager.style.cssText = DEV_BTN_STYLE + ' border-color: #e056fd; color: #e056fd;';
        btnPlayerManager.onclick = () => eng.chat.commandHandler.processCommand('/players');
      } else if (btnPlayerManager) {
        btnPlayerManager.style.borderColor = '#e056fd';
        btnPlayerManager.style.color = '#e056fd';
        btnPlayerManager.onclick = () => eng.chat.commandHandler.processCommand('/players');
      }

      let btnAccountManager = document.getElementById('btn-dev-account-manager');
      if (!btnAccountManager && devPanel) {
        btnAccountManager = document.createElement('button');
        btnAccountManager.id = 'btn-dev-account-manager';
        btnAccountManager.className = 'btn-secondary';
        btnAccountManager.innerText = 'Account Manager';
        btnAccountManager.style.cssText = DEV_BTN_STYLE + ' border-color: #9b59b6; color: #9b59b6;';
        btnAccountManager.onclick = () => eng.ui.playerModifier.openEmptyAccountManager();
      } else if (btnAccountManager) {
        btnAccountManager.onclick = () => eng.ui.playerModifier.openEmptyAccountManager();
      }

      let btnEditMode = document.getElementById('btn-dev-edit-mode');
      if (!btnEditMode && devPanel) {
        btnEditMode = document.createElement('button');
        btnEditMode.id = 'btn-dev-edit-mode';
        btnEditMode.className = 'btn-secondary';
        btnEditMode.innerText = 'Toggle Edit Mode (/edit)';
        btnEditMode.style.cssText = DEV_BTN_STYLE;
        btnEditMode.onclick = () => eng.chat.commandHandler.processCommand('/editmode');
      }

      let btnZoneManager = document.getElementById('btn-dev-zone-manager');
      if (!btnZoneManager && devPanel) {
        btnZoneManager = document.createElement('button');
        btnZoneManager.id = 'btn-dev-zone-manager';
        btnZoneManager.className = 'btn-secondary';
        btnZoneManager.innerText = 'Zone Manager';
        btnZoneManager.style.cssText = DEV_BTN_STYLE + ' border-color: #e056fd; color: #e056fd;';
        btnZoneManager.onclick = () => {
           if (this.zoneManagerWindow.element.style.display === 'none') {
              this.zoneManagerWindow.open();
              this.renderZoneManager();
           } else {
              this.zoneManagerWindow.close();
           }
        };
      } else if (btnZoneManager) {
        btnZoneManager.style.borderColor = '#e056fd';
        btnZoneManager.style.color = '#e056fd';
        btnZoneManager.onclick = () => {
           if (this.zoneManagerWindow.element.style.display === 'none') {
              this.zoneManagerWindow.open();
              this.renderZoneManager();
           } else {
              this.zoneManagerWindow.close();
           }
        };
      }

      let btnArcadeManager = document.getElementById('btn-dev-arcade-manager');
      if (!btnArcadeManager && devPanel) {
        btnArcadeManager = document.createElement('button');
        btnArcadeManager.id = 'btn-dev-arcade-manager';
        btnArcadeManager.className = 'btn-secondary';
        btnArcadeManager.innerText = 'Arcade Manager';
        btnArcadeManager.style.cssText = DEV_BTN_STYLE + ' border-color: #e056fd; color: #e056fd;';
      }
      if (btnArcadeManager) {
        btnArcadeManager.style.borderColor = '#e056fd';
        btnArcadeManager.style.color = '#e056fd';
        btnArcadeManager.onclick = () => {
           if (this.arcadeManagerWindow.element.style.display === 'none') {
              this.arcadeManagerWindow.open();
              this.renderArcadeManager();
           } else {
              this.arcadeManagerWindow.close();
           }
        };
      }

      if (mgmtGroup) {
        if (btnPlayerManager) mgmtGroup.appendChild(btnPlayerManager);
        if (btnAccountManager) mgmtGroup.appendChild(btnAccountManager);
        if (btnNpcManager) mgmtGroup.appendChild(btnNpcManager);
        if (btnZoneManager) mgmtGroup.appendChild(btnZoneManager);
        if (btnArcadeManager) mgmtGroup.appendChild(btnArcadeManager);
        if (btnEditTarget) mgmtGroup.appendChild(btnEditTarget);
        if (btnEditMode) mgmtGroup.appendChild(btnEditMode);
        const btnArcadeHover = document.getElementById('btn-dev-arcade-hover');
        if (btnArcadeHover) {
            mgmtGroup.appendChild(btnArcadeHover);
        }
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
        'btn-dev-power-editor',
        'dev-mgmt-group'
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
      const updatedVoxel = {
        ...this.currentEditCabinet.voxel,
        customName: document.getElementById('edit-arcade-name').value.trim(),
        gameId: document.getElementById('edit-arcade-game').value,
        powerState: document.getElementById('edit-arcade-power').value
      };
      const nX = parseInt(document.getElementById('edit-arcade-x').value, 10), nY = parseInt(document.getElementById('edit-arcade-y').value, 10), nZ = parseInt(document.getElementById('edit-arcade-z').value, 10);
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
        document.getElementById('edit-npc-x').value = Math.round(npc.x);
        document.getElementById('edit-npc-y').value = Math.round(npc.y);
        document.getElementById('edit-npc-z').value = Math.round(npc.z || 0);
        document.getElementById('edit-npc-type').value = npc.type || 'idle';
        document.getElementById('edit-npc-dir').value = npc.dir || 'down';

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

      const btnToggleGrid = document.createElement('button');
      btnToggleGrid.className = eng.devOptions.showGrid ? 'btn-primary' : 'btn-secondary';
      btnToggleGrid.style.cssText = 'width: 100%; border-color: #2ecc71; color: #2ecc71;';
      btnToggleGrid.innerText = eng.devOptions.showGrid ? 'Builder Grid: ON' : 'Builder Grid: OFF';
      btnToggleGrid.onclick = () => {
          eng.devOptions.showGrid = !eng.devOptions.showGrid;
          btnToggleGrid.className = eng.devOptions.showGrid ? 'btn-primary' : 'btn-secondary';
          btnToggleGrid.innerText = eng.devOptions.showGrid ? 'Builder Grid: ON' : 'Builder Grid: OFF';
          localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
      };

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

      toolsGroup.appendChild(btnToggleGrid);
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

    const shapeBtn = document.createElement('select');
    shapeBtn.id = 'build-shape-btn';
    shapeBtn.className = 'btn-secondary';
    shapeBtn.style.cssText = SHAPE_BTN_STYLE + ' text-transform: uppercase; cursor: pointer; border: 1px solid #3498db; outline: none; background: rgba(0,0,0,0.8);';

    shapeBtn.onchange = (e) => {
      eng.editShapeBase = e.target.value;
      updateShapeUI();
    };

    const axisBtn = document.createElement('button');
    axisBtn.id = 'build-axis-btn';
    axisBtn.className = 'btn-secondary';
    axisBtn.style.cssText = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #e74c3c; color: #e74c3c; min-width: 40px;';
    axisBtn.innerText = 'Axis: X/Y';

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
    shapeContainer.appendChild(axisBtn);
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

    builderHotbar.appendChild(controlsContainer);

    setupTooltip(shapeBtn, 'Select Block Shape');
    setupTooltip(axisBtn, 'Toggle Drag Selection Axis (Horizontal X/Y vs Vertical Z)');
    setupTooltip(dirBtn, 'Cycle Block Direction (N, E, S, W)');
    setupTooltip(relBtn, 'Toggle Player-Relative Rotation');
    setupTooltip(fluidBtn, 'Toggle Fluid State (Still / Flow)');

    eng.editShapeBase = 'cube';
    eng.editShapeDir = 'n';
    eng.editShapeRelative = false;
    eng.editShapeFlip = false;
    eng.editShapeUV = 'auto'; // 'auto', 'mesh', 'box'
    eng.editDragAxis = 'horizontal';
    eng.editFluid = 'still';

    axisBtn.onclick = () => {
        eng.editDragAxis = eng.editDragAxis === 'horizontal' ? 'vertical' : 'horizontal';
        axisBtn.innerText = eng.editDragAxis === 'horizontal' ? 'Axis: X/Y' : 'Axis: Z';
        axisBtn.style.background = eng.editDragAxis === 'vertical' ? 'rgba(231, 76, 60, 0.2)' : 'transparent';
    };

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


      builderHotbar.appendChild(tabsContainer);
      builderHotbar.appendChild(gridsWrapper);
      this.ui.makeDraggable('builder-hotbar', '.dev-panel-header');

      if (categories['naturals']) categories['naturals'].btn.click();
      const firstSlot = gridsWrapper.querySelector('.hotbar-slot[data-tex="stone"]');
      if (firstSlot) firstSlot.click();
  }

  setupPlayerManager() {
    const eng = this.engine;
    document.getElementById('pm-search-input').addEventListener('input', () => this.renderPlayerManager());
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
