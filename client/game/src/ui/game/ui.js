import { DevToolsUIManager } from './dev-tools-ui.js?v=cache-bust-005';
import { InventoryUIManager } from './inventory-ui.js?v=cache-bust-005';
import { PowerbarUIManager } from './powerbar-ui.js?v=cache-bust-005';
import { TrainerUIManager } from './trainer-ui.js?v=cache-bust-005';
import { PlayerListUIManager } from './player-list-ui.js?v=cache-bust-005';
import { FriendsUIManager } from './friends-ui.js?v=cache-bust-005';
import { GAME_TIPS } from './tips.js?v=cache-bust-005';
import { PowerEditorUIManager } from '../power-editor-ui.js?v=cache-bust-005';
import { PlayerModifierUIManager } from './player-modifier-ui.js?v=cache-bust-005';
import { ProgressionSystem } from '../windows/progression.js?v=cache-bust-005';
import { CombatStatsUIManager } from './combat-stats-ui.js?v=cache-bust-005';

export class UIManager {
  constructor(engine) {
    this.engine = engine;

    this.devTools = new DevToolsUIManager(engine, this);
    this.inventory = new InventoryUIManager(engine, this);
    this.powerbar = new PowerbarUIManager(engine, this);
    this.trainer = new TrainerUIManager(engine, this);
    this.playerList = new PlayerListUIManager(engine, this);
    this.friendsList = new FriendsUIManager(engine, this);
    this.powerEditor = new PowerEditorUIManager(engine);
    this.playerModifier = new PlayerModifierUIManager(engine, this);
    this.combatStats = new CombatStatsUIManager(engine, this);

    this.setupContextMenu();
    this.setupLoadingScreen();
    this.makeDraggable('game-chat-container', '#chat-drag-handle');
    this.makeDraggable('system-message-dialog', '.dev-panel-header');

    this.panelStack = [];
    this.panelObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const t = mutation.target;
          const isVisible = t.style.display !== 'none' && t.style.display !== '';
          const idx = this.panelStack.indexOf(t);
          if (isVisible && idx === -1) {
            this.panelStack.push(t);
          } else if (!isVisible && idx !== -1) {
            this.panelStack.splice(idx, 1);
          }
        }
      });
    });

    this.trackPanel = (el) => {
      if (!el || el.dataset.tracked) return;
      el.dataset.tracked = 'true';
      this.panelObserver.observe(el, { attributes: true, attributeFilter: ['style'] });
      if (el.style.display !== 'none' && el.style.display !== '') this.panelStack.push(el);

      // Dynamically inject UI Mode setting into the Settings window
      if (el.id === 'settings-window' || el.classList.contains('settings-window')) {
        if (!document.getElementById('ui-mode-select')) {
          const contentArea = el.querySelector('.window-content') || el.querySelector('.settings-content') || el;
          const uiModeDiv = document.createElement('div');
          uiModeDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.4); border: 1px solid #333; border-radius: 4px;';
          uiModeDiv.innerHTML = `
            <span style="color: #fff; font-family: var(--font-mono); font-size: 0.9rem;">Interface Mode</span>
            <select id="ui-mode-select" class="btn-secondary" style="color: #3498db; border: 1px solid #3498db; background: rgba(5,7,10,0.8); padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); outline: none; cursor: pointer;">
              <option value="classic">Classic</option>
              <option value="alternative">Alternative</option>
            </select>
          `;
          if (contentArea) {
             contentArea.insertBefore(uiModeDiv, contentArea.firstChild);
             const selectEl = document.getElementById('ui-mode-select');
             if (selectEl) {
               selectEl.value = this.engine.clientSettings.uiMode || 'classic';
               selectEl.onchange = (e) => {
                 this.engine.clientSettings.uiMode = e.target.value;
                 localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
                 this.update();
               };
             }
          }
        }
      }
    };

    const trackSelectors = '.dev-panel, .modal-overlay, #trainer-dialog-modal, .builder-hotbar, .b-window';
    document.querySelectorAll(trackSelectors).forEach(el => this.trackPanel(el));

    const domObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
             if (node.matches && node.matches(trackSelectors)) this.trackPanel(node);
             if (node.querySelectorAll) node.querySelectorAll(trackSelectors).forEach(el => this.trackPanel(el));
          }
        });
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    const closeSysMsg = () => { document.getElementById('system-message-dialog').style.display = 'none'; };
    const btnCloseSys = document.getElementById('btn-close-sys-msg');
    const btnOkSys = document.getElementById('btn-ok-sys-msg');
    if (btnCloseSys) btnCloseSys.onclick = closeSysMsg;
    if (btnOkSys) btnOkSys.onclick = closeSysMsg;

    const applySavedPos = (id, storageKey) => {
      const saved = localStorage.getItem(storageKey);
      const el = document.getElementById(id);
      if (saved && el) {
        try {
          const pos = JSON.parse(saved);
          if (pos.left !== undefined) el.style.left = pos.left;
          if (pos.top !== undefined) el.style.top = pos.top;
          if (pos.right !== undefined) el.style.right = pos.right;
          if (pos.bottom !== undefined) el.style.bottom = pos.bottom;
          el.style.transform = 'none';
        } catch(e) {}
      }
    };

    applySavedPos('game-chat-container', 'b_chat_pos');
    applySavedPos('powerbar-container', 'b_powerbar_pos');

    // Setup Alt UI
    let altUiContainer = document.getElementById('alt-ui-container');
    if (!altUiContainer) {
      altUiContainer = document.createElement('div');
      altUiContainer.id = 'alt-ui-container';
      altUiContainer.style.cssText = 'position: absolute; top: 10px; right: 10px; width: 280px; background: rgba(5, 7, 10, 0.85); border: 2px solid #3498db; border-radius: 6px; padding: 10px; display: none; flex-direction: column; gap: 6px; z-index: 1000; pointer-events: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5);';

      altUiContainer.innerHTML = `
        <div id="alt-ui-drag-handle" style="display: flex; justify-content: space-between; align-items: center; cursor: move; padding-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px; gap: 10px;">
          <div id="alt-ui-level" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #9b59b6; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-family: 'Arial Black', Impact, sans-serif; background: linear-gradient(135deg, #111, #333); font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.8);">1</div>
          <div id="alt-ui-name" style="flex-grow: 1; text-align: left; color: #fff; font-weight: bold; font-family: 'Arial Black', Impact, sans-serif; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8); font-size: 1.1rem; letter-spacing: 0.5px;">Player Name</div>
          <button id="alt-ui-menu-btn" style="background: linear-gradient(to bottom, #34495e, #2c3e50); color: #fff; border: 1px solid #1abc9c; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-family: 'Arial Black', Impact, sans-serif; font-size: 0.8rem; text-transform: uppercase; box-shadow: 0 2px 5px rgba(0,0,0,0.5); transition: all 0.2s;">Menu</button>
          <div id="alt-ui-dropdown" style="position: absolute; top: 100%; right: 0; background: rgba(5, 7, 10, 0.95); border: 2px solid #3498db; border-radius: 6px; display: none; flex-direction: column; gap: 5px; padding: 10px; z-index: 1001; min-width: 200px; box-shadow: 0 4px 10px rgba(0,0,0,0.8); cursor: default; margin-top: 10px;">
          <p style="text-align: center; margin: 0; color: #1abc9c">Game</p>
            <hr style="border: 0; border-top: 1px solid #1abc9c; margin: 2px 0;">
            <button class="btn-secondary alt-menu-btn" id="alt-btn-player-search" style="text-align: left; padding: 6px 10px;">Player Search</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-fullscreen-map" style="text-align: left; padding: 6px 10px;">Fullscreen Map</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-inventory" style="text-align: left; padding: 6px 10px;">Inventory</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-editmode" style="text-align: left; padding: 6px 10px;">Builder Mode (/edit)</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-dev-tools" style="text-align: left; padding: 6px 10px; display: none; border-color: #1abc9c; color: #1abc9c;">Developer Tools</button>
            <p style="text-align: center; margin: 0; color: #1abc9c">Combat</p>
            <hr style="border: 0; border-top: 1px solid #1abc9c; margin: 2px 0;">
            <button class="btn-secondary alt-menu-btn" id="alt-btn-combat-stats" style="text-align: left; padding: 6px 10px;">Combat Statistics</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-powers" style="text-align: left; padding: 6px 10px;">Powers and Abilities</button>
            <p style="text-align: center; margin: 0; color: #1abc9c">Account</p>
            <hr style="border: 0; border-top: 1px solid #1abc9c; margin: 2px 0;">
            <button class="btn-secondary alt-menu-btn" id="alt-btn-settings" style="text-align: left; padding: 6px 10px;">Settings</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-char-select" style="text-align: left; padding: 6px 10px;">Change Character</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-logout" style="text-align: left; padding: 6px 10px; color: #e74c3c; border-color: #e74c3c;">Logout</button>
          </div>
        </div>
        <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
          <div id="alt-ui-hp-fill" style="height: 100%; width: 100%; background: linear-gradient(to right, #27ae60, #2ecc71); transition: width 0.2s;"></div>
          <div id="alt-ui-hp-text" style="position: absolute; width: 100%; text-align: center; top: 1px; font-size: 0.75rem; color: #fff; font-weight: bold; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">100 / 100</div>
        </div>
        <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
          <div id="alt-ui-ep-fill" style="height: 100%; width: 100%; background: linear-gradient(to right, #0984e3, #74b9ff); transition: width 0.2s;"></div>
          <div id="alt-ui-ep-text" style="position: absolute; width: 100%; text-align: center; top: 1px; font-size: 0.75rem; color: #fff; font-weight: bold; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">100 / 100</div>
        </div>
        <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px;" id="alt-ui-bp-container">
          <div id="alt-ui-bp-fill" style="height: 100%; width: 100%; background: linear-gradient(to right, #0097e6, #00d2ff); transition: width 0.2s;"></div>
          <div id="alt-ui-bp-text" style="position: absolute; width: 100%; text-align: center; top: 1px; font-size: 0.75rem; color: #fff; font-weight: bold; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">100 / 100</div>
        </div>
        <div id="alt-ui-xp-container" style="position: relative; height: 12px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; display: flex;" title="Experience">
          <div id="alt-ui-xp-fill" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: linear-gradient(to right, #8e44ad, #9b59b6); transition: width 0.2s; z-index: 1;"></div>
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; z-index: 2; pointer-events: none;">
             ${Array.from({length: 10}).map((_, i) => `<div style="flex: 1; border-right: ${i < 9 ? '1px solid rgba(0,0,0,0.8)' : 'none'}; box-sizing: border-box; background: rgba(255,255,255,0.05);"></div>`).join('')}
          </div>
        </div>
        <div id="alt-ui-buffs" style="margin-top: 8px; min-height: 24px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
      `;
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(altUiContainer);
      else document.body.appendChild(altUiContainer);

      this.makeDraggable('alt-ui-container', '#alt-ui-drag-handle');
      applySavedPos('alt-ui-container', 'b_alt_ui_pos');

      const altMenuBtn = document.getElementById('alt-ui-menu-btn');
      const altDropdown = document.getElementById('alt-ui-dropdown');
      if (altMenuBtn && altDropdown) {
        altMenuBtn.onclick = (e) => {
          e.stopPropagation();
          altDropdown.style.display = altDropdown.style.display === 'none' ? 'flex' : 'none';
        };

        document.addEventListener('click', (e) => {
           if (altDropdown.style.display === 'flex' && !altDropdown.contains(e.target) && e.target !== altMenuBtn) {
               altDropdown.style.display = 'none';
           }
        });

        const closeDropdown = () => { altDropdown.style.display = 'none'; };

        document.getElementById('alt-btn-combat-stats').onclick = () => {
           this.combatStats.toggle();
           closeDropdown();
        };
        document.getElementById('alt-btn-powers').onclick = () => {
           document.getElementById('btn-powers')?.click();
           closeDropdown();
        };
        document.getElementById('alt-btn-inventory').onclick = () => {
           document.getElementById('btn-inventory')?.click();
           closeDropdown();
        };
        document.getElementById('alt-btn-fullscreen-map').onclick = () => {
           document.getElementById('btn-fullscreen-map')?.click();
           closeDropdown();
        };
        document.getElementById('alt-btn-player-search').onclick = () => {
           document.getElementById('btn-player-list')?.click();
           closeDropdown();
        };
        document.getElementById('alt-btn-editmode').onclick = () => {
           const chatInput = document.getElementById('chat-input');
           if (chatInput) {
               chatInput.value = '/editmode';
               chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
           }
           closeDropdown();
        };
        document.getElementById('alt-btn-dev-tools').onclick = () => {
           const chatInput = document.getElementById('chat-input');
           if (chatInput) {
               chatInput.value = '/dev';
               chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
           }
           closeDropdown();
        };
        document.getElementById('alt-btn-settings').onclick = () => {
           document.getElementById('btn-settings')?.click();
           closeDropdown();
        };
        document.getElementById('alt-btn-char-select').onclick = () => {
           document.getElementById('btn-char-select')?.click();
           closeDropdown();
        };
        document.getElementById('alt-btn-logout').onclick = () => {
           document.getElementById('btn-logout')?.click();
           closeDropdown();
        };
      }
    }

    let classicXpContainer = document.getElementById('classic-xp-container');
    if (!classicXpContainer) {
      classicXpContainer = document.createElement('div');
      classicXpContainer.id = 'classic-xp-container';
      classicXpContainer.style.cssText = 'width: 100%; height: 10px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; position: relative; margin-top: 8px; display: none;';
      classicXpContainer.innerHTML = `
        <div id="classic-xp-fill" style="height: 100%; width: 0%; background: #9b59b6; transition: width 0.2s;"></div>
        <div id="classic-xp-text" style="position: absolute; width: 100%; text-align: center; top: -2px; font-size: 0.65rem; color: #fff; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">Level 1 | 0 / 1000 XP</div>
      `;

      const bottomHud = document.querySelector('.game-bottom-hud');
      if (bottomHud) {
         bottomHud.appendChild(classicXpContainer);
      }
    }

    const reconnectOverlay = document.getElementById('reconnecting-overlay');
    if (reconnectOverlay) reconnectOverlay.style.display = 'none';

    let buffContainer = document.getElementById('buff-indicator-container');
    if (!buffContainer) {
      buffContainer = document.createElement('div');
      buffContainer.id = 'buff-indicator-container';
      buffContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 10px; z-index: 9999; background: rgba(5, 7, 10, 0.85); border: 2px solid #333; border-radius: 8px; padding: 10px; pointer-events: auto; align-items: center; min-height: 48px;';

      const header = document.createElement('div');
      header.id = 'buff-drag-handle';
      header.style.cssText = 'width: 15px; height: 100%; min-height: 24px; background: rgba(255,255,255,0.1); border-radius: 4px; cursor: move; align-self: stretch;';
      buffContainer.appendChild(header);

      let list = document.getElementById('buff-indicator-list');
      if (list) {
        list.style.display = 'flex';
        list.style.gap = '5px';
        buffContainer.appendChild(list);
      } else {
        list = document.createElement('div');
        list.id = 'buff-indicator-list';
        list.style.display = 'flex';
        list.style.gap = '5px';
        buffContainer.appendChild(list);
      }

      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(buffContainer);
      else document.body.appendChild(buffContainer);
    }

    applySavedPos('buff-indicator-container', 'b_buff_pos');
    this.makeDraggable('buff-indicator-container', '#buff-drag-handle');

    let zoneContainer = document.getElementById('zone-display-container');
    if (!zoneContainer) {
      zoneContainer = document.createElement('div');
      zoneContainer.id = 'zone-display-container';
      zoneContainer.style.cssText = 'position: absolute; top: 15px; left: 50%; transform: translateX(-50%); background: rgba(5, 7, 10, 0.85); border: 2px solid #3498db; border-radius: 6px; padding: 5px 15px; color: #f1c40f; font-family: var(--font-mono); font-size: 0.9rem; font-weight: bold; z-index: 1000; text-transform: uppercase; letter-spacing: 2px; pointer-events: none; text-shadow: 1px 1px 0 #000, 0 0 5px rgba(241, 196, 15, 0.5); box-shadow: 0 4px 10px rgba(0,0,0,0.5);';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(zoneContainer);
      else document.body.appendChild(zoneContainer);
    }

    let petContainer = document.getElementById('pet-window');
    if (!petContainer) {
      petContainer = document.createElement('div');
      petContainer.id = 'pet-window';
      petContainer.style.cssText = 'position: absolute; top: 15px; left: 15px; background: rgba(5, 7, 10, 0.85); border: 2px solid #00d2ff; border-radius: 6px; padding: 10px; display: none; flex-direction: column; z-index: 1000; min-width: 200px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); pointer-events: auto; transition: top 0.2s ease-out; cursor: pointer;';
      petContainer.onclick = (e) => {
          const item = e.target.closest('.pet-item');
          if (item) {
              const droneId = item.dataset.id;
              const eng = window.currentGameEngine;
              if (eng && eng.drones && eng.drones[droneId]) {
                  eng.selectedTarget = { type: 'drone', id: droneId };
                  eng.ui.update();
              }
          }
      };
      petContainer.innerHTML = `
        <div id="pet-window-header" style="background: rgba(0, 210, 255, 0.2); padding: 5px 10px; border-bottom: 1px solid #00d2ff; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; margin: -10px -10px 10px -10px;">
           <span style="color: #fff; font-weight: bold; font-size: 0.85rem; font-family: var(--font-mono); text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Robotics</span>
        </div>
        <div id="pet-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
      `;
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(petContainer);
      else document.body.appendChild(petContainer);
    }

    // Ensure panels stay on screen during window resize
    window.addEventListener('resize', () => {
      const draggablePanels = [
        'dev-panel', 'builder-panel', 'npc-manager-panel', 'npc-edit-modal',
        'power-editor-panel', 'player-modifier-panel',
        'player-list-panel', 'game-chat-container', 'powerbar-container', 'buff-indicator-container',
        'builder-hotbar', 'object-library-panel',
        'player-manager-panel', 'player-modifier-modal', 'account-manager-modal'
      ];

      draggablePanels.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none' && el.offsetParent) {
          let scale = 1;
          if (el.style.zoom) scale = parseFloat(el.style.zoom) || 1;
          const maxLeft = (window.innerWidth / scale) - el.offsetWidth;
          const maxTop = (window.innerHeight / scale) - el.offsetHeight;
          if (el.style.left && el.style.left !== 'auto') {
            let left = parseFloat(el.style.left);
            if (left > maxLeft) el.style.left = `${Math.max(0, maxLeft)}px`;
          }
          if (el.style.top && el.style.top !== 'auto') {
            let top = parseFloat(el.style.top);
            if (top > maxTop) el.style.top = `${Math.max(0, maxTop)}px`;
          }
        }
      });
    });

    // Cache frequently accessed elements to avoid DOM lookups in high-frequency update()
    this.els = {
      synthContainer: document.getElementById('synth-bar-container'),
      synthFill: document.getElementById('synth-bar-fill'),
      synthText: document.getElementById('synth-bar-text'),
      hpFill: document.getElementById('health-bar-fill'),
      hpText: document.getElementById('health-bar-text'),
      epFill: document.getElementById('energy-bar-fill'),
      epText: document.getElementById('energy-bar-text'),
      buffList: document.getElementById('buff-indicator-list'),
      btnEditTarget: document.getElementById('btn-dev-edit-target'),
      npcEditModal: document.getElementById('npc-edit-modal'),
      targetWindow: document.getElementById('target-window'),
      targetName: document.getElementById('target-name'),
      targetHealthFill: document.getElementById('target-health-fill'),
      targetHealthText: document.getElementById('target-health-text'),
      targetEnergyFill: document.getElementById('target-energy-fill'),
      targetEnergyText: document.getElementById('target-energy-text'),
      targetActions: document.getElementById('target-actions'),
      btnTargetTalk: document.getElementById('btn-target-talk'),
      zoneDisplay: document.getElementById('zone-display-container'),
      petWindow: document.getElementById('pet-window'),
      petName: document.getElementById('pet-name'),
      petHealthFill: document.getElementById('pet-health-fill'),
      petHealthText: document.getElementById('pet-health-text'),
      altUiContainer: document.getElementById('alt-ui-container'),
      altUiHpFill: document.getElementById('alt-ui-hp-fill'),
      altUiHpText: document.getElementById('alt-ui-hp-text'),
      altUiEpFill: document.getElementById('alt-ui-ep-fill'),
      altUiEpText: document.getElementById('alt-ui-ep-text'),
      altUiBpContainer: document.getElementById('alt-ui-bp-container'),
      altUiBpFill: document.getElementById('alt-ui-bp-fill'),
      altUiBpText: document.getElementById('alt-ui-bp-text'),
      altUiXpContainer: document.getElementById('alt-ui-xp-container'),
      altUiXpFill: document.getElementById('alt-ui-xp-fill'),
      altUiLevel: document.getElementById('alt-ui-level'),
      altUiName: document.getElementById('alt-ui-name'),
      classicXpContainer: document.getElementById('classic-xp-container'),
      classicXpFill: document.getElementById('classic-xp-fill'),
      classicXpText: document.getElementById('classic-xp-text')
    };
  }

  formatGameText(text) {
    if (!text) return '';
    return text
      // Highlight Commands (e.g. /editmode, /tpz <zoneName>)
      .replace(/(\/[a-z_]+(?:\s<[^>]+>)?)/gi, '<span style="color: #1abc9c; font-weight: bold;">$1</span>')
      // Highlight Keybinds (e.g. 'M', 'N', Shift, Ctrl, Right-Click)
      .replace(/(Shift|Ctrl|Left Click|Right-Click|ESC|'M'|'N'|'P'|'C'|'K')/gi, '<span style="color: #f1c40f; font-weight: bold;">$1</span>')
      // Highlight specific game terms
      .replace(/(Potato Mode|Blockbench|Bepis|Operius|Arcade Cabinet|Battery Charge|Energy|Solar Power)/gi, '<span style="color: #2ecc71; font-weight: bold;">$1</span>');
  }

  parseTip(text) {
    if (!this.engine.clientSettings) return text;
    const binds = this.engine.clientSettings.actionBinds || {};
    return text.replace(/\{([^}]+)\}/g, (match, actionId) => {
      if (binds[actionId]) {
        const bind = binds[actionId].primary || binds[actionId].alt || 'Unbound';
        return `<span style="color: #f1c40f; font-weight: bold;">[${bind.toUpperCase().replace(/CONTROL/g, 'CTRL')}]</span>`;
      }
      return match;
    });
  }

  showSystemMessage(text) {
    const dialog = document.getElementById('system-message-dialog');
    const msgText = document.getElementById('sys-msg-text');
    if (dialog && msgText) {
      msgText.innerHTML = this.formatGameText(text);
      dialog.style.display = 'flex';
      const idx = this.panelStack.indexOf(dialog);
      if (idx !== -1) { this.panelStack.splice(idx, 1); this.panelStack.push(dialog); }
    }
  }

  updateUIScale() {
    const scale = this.engine.clientSettings.uiScale !== undefined ? this.engine.clientSettings.uiScale : 1.0;
    const elements = [
      document.querySelector('.game-side-hud'),
      document.querySelector('.game-top-bar'),
      document.getElementById('powerbar-container'),
      document.getElementById('target-window'),
      document.getElementById('game-chat-container'),
      document.getElementById('map-controls'),
      document.getElementById('zone-display-container'),
      document.getElementById('buff-indicator-container'),
      document.getElementById('pet-window')
    ];
    elements.forEach(el => {
      if (el) el.style.zoom = scale;
    });

    const bottomHud = document.querySelector('.game-bottom-hud');
    if (bottomHud) {
      bottomHud.style.zoom = scale;
      bottomHud.style.width = `calc(100vw / ${scale})`;
      bottomHud.style.left = '0';
      bottomHud.style.transform = 'none';
    }
  }

  showPatchNotes(notes, forceShow = false) {
    if (!notes || notes.length === 0) return;

    const latestVersion = notes[0].version;
    const lastSeen = localStorage.getItem('b_last_seen_patch');

    if (lastSeen === latestVersion && !forceShow) return;

    const modal = document.getElementById('patch-notes-modal');
    const content = document.getElementById('in-game-patch-notes-list');
    const closeBtn = document.getElementById('btn-close-patch-notes');

    if (!modal || !content) return;

    content.innerHTML = '';
    notes.forEach(note => {
      const div = document.createElement('div');
      let html = `<strong style="color: ${note.color || '#3498db'}; font-size: 1.1em; letter-spacing: 1px;">${note.version}</strong>`;

      if (note.changes && note.changes.length > 0) {
        html += `<ul style="margin: 8px 0 15px 0; padding-left: 0; list-style-type: none; display: flex; flex-direction: column; gap: 6px;">`;
        const typeColors = {
          'Engine': '#3498db',
          'Gameplay': '#2ecc71',
          'Design': '#f1c40f',
          'Fix': '#e74c3c',
          'Content': '#9b59b6'
        };
        note.changes.forEach(c => {
          const badgeColor = typeColors[c.type] || '#aaa';
          const formattedText = this.formatGameText ? this.formatGameText(c.text) : c.text;
          html += `
            <li style="display: flex; gap: 10px; align-items: baseline;">
              <span style="color: ${badgeColor}; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; width: 75px; flex-shrink: 0; text-align: right;">[${c.type}]</span>
              <span style="color: #ccc; font-size: 0.95rem; line-height: 1.4;">${formattedText}</span>
            </li>
          `;
        });
        html += `</ul>`;
      } else if (note.text) {
        const formattedText = this.formatGameText ? this.formatGameText(note.text) : note.text;
        html += `<div style="color: #ccc; margin: 5px 0 15px 0; padding-left: 10px; font-size: 0.95rem;">${formattedText}</div>`;
      }

      div.innerHTML = html;
      content.appendChild(div);
    });

    modal.style.display = 'flex';

    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = 'none';
        localStorage.setItem('b_last_seen_patch', latestVersion);
      };
    }
  }

  showAnnouncement(message) {
    const modal = document.getElementById('announcement-modal');
    const content = document.getElementById('announcement-text');
    const closeBtn = document.getElementById('btn-close-announcement');

    if (!modal || !content) return;

    const formattedMessage = this.formatGameText ? this.formatGameText(message.replace(/\n/g, '<br>')) : message.replace(/\n/g, '<br>');
    content.innerHTML = formattedMessage;
    modal.style.display = 'flex';

    if (closeBtn) {
      closeBtn.onclick = () => modal.style.display = 'none';
    }
  }

  showHelpModal() {
    const modal = document.getElementById('help-modal');
    const list = document.getElementById('help-command-list');
    const closeBtn = document.getElementById('btn-close-help');

    if (!modal || !list) return;

    const pName = this.engine.playerData.name ? this.engine.playerData.name.toLowerCase() : '';
    const perms = this.engine.permissions || {};

    const checkPerm = (perm) => {
      if (!perm) return true; // No permission required
      const allowed = perms[perm];
      if (perm === 'playermanager' && perms['dev'] && (perms['dev'].includes('*') || perms['dev'].includes(pName))) return true;
      if (!allowed) return false;
      if (allowed.includes('*')) return true;
      return allowed.includes(pName);
    };

    const commands = [
      // General / Player Commands
      { cmd: '/stuck', syntax: '/stuck', desc: 'Nudges your character back to a safe location if you are trapped in walls or blocked terrain.', perm: null, color: '#3498db' },
      { cmd: '/pm, /w, /whisper', syntax: '/pm &lt;name&gt; &lt;message&gt;', desc: 'Sends a private direct message to a specific player.', perm: null, color: '#3498db' },
      { cmd: '/patchnotes, /news', syntax: '/patchnotes', desc: 'Pulls up the latest patch notes and news.', perm: null, color: '#3498db' },
      { cmd: '/teleport_zone, /tpz', syntax: '/tpz &lt;zoneName&gt;', desc: 'Instantly warp your character to another dimension/zone.', perm: null, color: '#3498db' },

      // Builder & Developer Tools
      { cmd: '/editmode', syntax: '/editmode', desc: 'Toggles the builder interface and block placing tools.', perm: 'editmode', color: '#f1c40f' },
      { cmd: '/dev', syntax: '/dev', desc: 'Toggles the developer tool panel for inspecting hitboxes, LoS, and coordinates.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/applymap', syntax: '/applymap &lt;zoneName&gt; [x] [y] [z]', desc: 'Saves current zone and loads the target zone.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/time', syntax: '/time &lt;0-24&gt;', desc: 'Overrides the time of day locally. E.g., "/time 12" sets it to High Noon.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/givemoney', syntax: '/givemoney &lt;amount&gt;', desc: 'Grants yourself currency. Account will permanently be removed from Hi-Scores.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/integrity', syntax: '/integrity &lt;value&gt;', desc: 'Sets your Integrity from -100 (Synthetic) to 100 (Mutated).', perm: 'dev', color: '#f1c40f' },

      // Moderation & Admin
      { cmd: '/players', syntax: '/players', desc: 'Opens the Player Manager to view and moderate online players.', perm: 'playermanager', color: '#9b59b6' },
      { cmd: '/npc create', syntax: '/npc create &lt;Name&gt; &lt;Health&gt;', desc: 'Spawns an NPC at your current mouse pointer location.', perm: 'npc', color: '#9b59b6' },
      { cmd: '/tp, /teleport', syntax: '/tp &lt;x&gt; &lt;y&gt; [z]', desc: 'Teleports you to the specified coordinates.', perm: 'tp', color: '#e74c3c' },
      { cmd: '/tpo, /teleport-other', syntax: '/tpo &lt;player&gt; &lt;x&gt; &lt;y&gt; [z]', desc: 'Teleports another player to the specified coordinates.', perm: 'tp', color: '#e74c3c' },
      { cmd: '/speed', syntax: '/speed &lt;value&gt;', desc: 'Sets your base movement speed.', perm: 'speed', color: '#e74c3c' },
      { cmd: '/announce', syntax: '/announce &lt;message&gt;', desc: 'Broadcasts a high-priority server-wide modal announcement.', perm: 'dev', color: '#e74c3c' },
      { cmd: '/grant, /revoke', syntax: '/grant &lt;player&gt; &lt;perm&gt;', desc: 'Dynamically grant or revoke a global permission node.', perm: 'dev', color: '#e74c3c' },
      { cmd: '/reload, /forceupdate', syntax: '/reload', desc: 'Forces all clients and the server to reload assets and code.', perm: 'reload', color: '#e74c3c' }
    ];

    list.innerHTML = '';

    commands.forEach(c => {
      if (checkPerm(c.perm)) {
        const formattedDesc = this.formatGameText ? this.formatGameText(c.desc) : c.desc;
        const el = document.createElement('div');
        el.style.cssText = `background: rgba(0,0,0,0.6); border: 1px solid ${c.color}; border-left: 4px solid ${c.color}; padding: 12px; border-radius: 4px; display: flex; flex-direction: column; gap: 5px;`;
        el.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="color: ${c.color}; font-family: var(--font-header); font-size: 1.2rem; letter-spacing: 1px;">${c.cmd}</strong>
            <span style="background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; color: #ccc; user-select: all;">${c.syntax}</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.95rem; color: #e1e1e1; line-height: 1.4; margin-top: 4px;">${formattedDesc}</div>
        `;
        list.appendChild(el);
      }
    });

    modal.style.display = 'flex';
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
  }

  setupLoadingScreen() {
    this.loadingStartTime = performance.now();
    this.loadingScreen = document.getElementById('loading-screen');
    if (!this.loadingScreen) {
      this.loadingScreen = document.createElement('div');
      this.loadingScreen.id = 'loading-screen';
      this.loadingScreen.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0b0e14; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: var(--font-mono); pointer-events: auto;';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(this.loadingScreen);
      else document.body.appendChild(this.loadingScreen);
    } else {
      this.loadingScreen.style.display = 'flex';
    }

    const randomTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];

    this.loadingScreen.innerHTML = `
      <h1 style="font-size: 3rem; text-shadow: 0 0 10px #f1c40f;">INITIALIZING ZONE</h1>
      <p style="font-size: 1.2rem; color: #fff; margin-bottom: 30px;">Building Geometry...</p>
      <div style="background: rgba(243, 156, 18, 0.2); border: 1px solid #f39c12; padding: 15px; border-radius: 6px; width: 600px; max-width: 90vw; text-align: center; min-height: 48px; display: flex; flex-direction: column; justify-content: center;">
        <div><span style="color: #f39c12; font-weight: bold; margin-right: 5px;">TIP:</span> <span id="loading-tip-text" style="color: #fff; transition: opacity 0.5s; line-height: 1.4;">${this.formatGameText(randomTip)}</span></div>
      </div>
      <button id="btn-potato-mode" style="position: absolute; bottom: 20px; right: 20px; background: rgba(5, 7, 10, 0.8); border: 1px solid var(--text-dim); color: var(--text-dim); padding: 8px 15px; border-radius: 4px; cursor: pointer; font-family: var(--font-mono); font-size: 0.85rem; transition: all 0.3s; opacity: 0; pointer-events: none;">Taking too long to load? Try Potato Mode!</button>
    `;

    const potatoBtn = document.getElementById('btn-potato-mode');
    if (potatoBtn) {
      potatoBtn.onmouseenter = () => {
        potatoBtn.style.borderColor = '#f1c40f';
        potatoBtn.style.color = '#f1c40f';
      };
      potatoBtn.onmouseleave = () => {
        potatoBtn.style.borderColor = 'var(--text-dim)';
        potatoBtn.style.color = 'var(--text-dim)';
      };
      potatoBtn.onclick = () => {
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : {};
        Object.assign(settings, { enableShadows: false, enableDayNightCycle: false, enableWeatherParticles: false, renderDistance: 800, renderScale: 0.5, maxDynamicLights: 0 });
        localStorage.setItem('b_client_settings', JSON.stringify(settings));
        window.location.reload();
      };

      if (this.potatoTimeout) clearTimeout(this.potatoTimeout);
      this.potatoTimeout = setTimeout(() => {
        if (this.loadingScreen && this.loadingScreen.style.display !== 'none') {
          potatoBtn.style.opacity = '1';
          potatoBtn.style.pointerEvents = 'auto';
        }
      }, 10000);
    }

      // Cycle through tips every 6 seconds
      if (this.tipInterval) clearInterval(this.tipInterval);
      this.tipInterval = setInterval(() => {
        const tipEl = document.getElementById('loading-tip-text');
        if (tipEl) {
          tipEl.style.opacity = '0'; // Trigger CSS transition
          setTimeout(() => {
            const newTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
            tipEl.innerHTML = this.formatGameText(this.parseTip(newTip));
            tipEl.style.opacity = '1';
          }, 500); // Wait for the fade-out before swapping text
        } else {
          clearInterval(this.tipInterval);
        }
      }, 6000);
  }

  hideLoadingScreen() {
    if (this.loadingScreen && this.loadingScreen.style.display !== 'none') {
      const elapsed = performance.now() - this.loadingStartTime;
      const remaining = Math.max(0, 3000 - elapsed);

      if (window.app && window.app.menuAudio && window.app.menuAudio.isPlaying) {
        window.app.menuAudio.fadeOutAndStop();
      }

      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
            if (this.tipInterval) {
              clearInterval(this.tipInterval);
              this.tipInterval = null;
            }
      }, remaining);
    }
  }

  showReconnecting(isReconnecting) {
    let overlay = document.getElementById('reconnecting-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'reconnecting-overlay';
      overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(11, 14, 20, 0.8); z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: var(--font-mono); font-size: 2rem; text-shadow: 0 0 10px #f1c40f; pointer-events: auto; text-align: center; opacity: 0; transition: opacity 0.5s ease-in-out;';
      overlay.innerHTML = 'SERVER UNDERGOING MAINTENANCE<br><div style="font-size: 1.2rem; color: #ccc; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">Attempting to reconnect... <div style="border: 3px solid rgba(204, 204, 204, 0.3); border-radius: 50%; border-top: 3px solid #f1c40f; width: 18px; height: 18px; animation: reconnect-spin 1s linear infinite;"></div></div><div style="background: rgba(243, 156, 18, 0.2); border: 1px solid #f39c12; padding: 15px; border-radius: 6px; width: 600px; max-width: 90vw; text-align: center; min-height: 48px; display: flex; flex-direction: column; justify-content: center; margin-top: 30px; font-size: 1.1rem; text-shadow: none; font-family: sans-serif;"><div><span style="color: #f39c12; font-weight: bold; margin-right: 5px;">TIP:</span> <span id="reconnect-tip-text" style="color: #fff; transition: opacity 0.5s; line-height: 1.4;"></span></div></div><style>@keyframes reconnect-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(overlay);
      else document.body.appendChild(overlay);
    }

    if (isReconnecting) {
      overlay.style.display = 'flex';
      void overlay.offsetWidth; // Trigger reflow so the transition fires
      overlay.style.opacity = '1';

      const updateTip = () => {
        const tipEl = document.getElementById('reconnect-tip-text');
        if (tipEl) {
          tipEl.style.opacity = '0';
          setTimeout(() => {
            const randomTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
            tipEl.innerHTML = this.formatGameText ? this.formatGameText(this.parseTip(randomTip)) : randomTip;
            tipEl.style.opacity = '1';
          }, 500);
        }
      };

      if (!this.reconnectTipInterval) {
        updateTip();
        this.reconnectTipInterval = setInterval(updateTip, 6000);
      }
    } else {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.style.opacity === '0') {
          overlay.style.display = 'none';
          if (this.reconnectTipInterval) {
            clearInterval(this.reconnectTipInterval);
            this.reconnectTipInterval = null;
          }
        }
      }, 500);
    }
  }

  makeDraggable(panelId, headerSelector) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const header = panel.querySelector(headerSelector);
    if (!header) return;

    header.style.cursor = 'move';
    header.style.userSelect = 'none';

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      if (panelId === 'powerbar-container' && window.currentGameEngine && window.currentGameEngine.clientSettings.snapPowerTray) {
          window.currentGameEngine.clientSettings.snapPowerTray = false;
          localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine.clientSettings));
      }
      if (panelId === 'buff-indicator-container' && window.currentGameEngine && window.currentGameEngine.clientSettings.snapActivePowers) {
          window.currentGameEngine.clientSettings.snapActivePowers = false;
          localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine.clientSettings));
      }

      let scale = 1;
      if (panel.style.zoom) {
          scale = parseFloat(panel.style.zoom) || 1;
      }

      const rect = panel.getBoundingClientRect();

      panel.style.left = (rect.left / scale) + 'px';
      panel.style.top = (rect.top / scale) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';

      initialLeft = parseFloat(panel.style.left);
      initialTop = parseFloat(panel.style.top);

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;

        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;

        const SNAP_DIST = 20 / scale;
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = (window.innerWidth / scale) - panel.offsetWidth;
        const maxTop = (window.innerHeight / scale) - panel.offsetHeight;

        let snappedLeft = false;
        let snappedRight = false;
        let snappedTop = false;
        let snappedBottom = false;

        // Snapping logic
        if (newLeft < SNAP_DIST) {
          newLeft = 0;
          snappedLeft = true;
        } else if (newLeft > maxLeft - SNAP_DIST) {
          newLeft = maxLeft;
          snappedRight = true;
        }

        if (newTop < SNAP_DIST) {
          newTop = 0;
          snappedTop = true;
        } else if (newTop > maxTop - SNAP_DIST) {
          newTop = maxTop;
          snappedBottom = true;
        }

        if (snappedRight) {
          panel.style.left = 'auto';
          panel.style.right = '0px';
        } else {
          panel.style.left = `${newLeft}px`;
          panel.style.right = 'auto';
        }

        if (panelId === 'game-chat-container') {
          const newBottom = (window.innerHeight / scale) - (newTop + panel.offsetHeight);
          panel.style.bottom = `${Math.max(0, newBottom)}px`;
          panel.style.top = 'auto';
        } else {
          if (snappedBottom) {
            panel.style.top = 'auto';
            panel.style.bottom = '0px';
          } else {
            panel.style.top = `${newTop}px`;
            panel.style.bottom = 'auto';
          }
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const posObj = { left: panel.style.left, top: panel.style.top, right: panel.style.right, bottom: panel.style.bottom };

        if (panelId === 'builder-panel') {
          const eng = window.currentGameEngine;
          if (eng && eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
            localStorage.setItem('b_builder_pos', JSON.stringify(posObj));
          }
        } else if (panelId === 'builder-hotbar') {
          const eng = window.currentGameEngine;
          if (eng && eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
            localStorage.setItem('b_hotbar_pos', JSON.stringify(posObj));
          }
        } else if (panelId === 'object-library-panel') {
          const eng = window.currentGameEngine;
          if (eng && eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
            localStorage.setItem('b_objlib_pos', JSON.stringify(posObj));
          }
        } else if (panelId === 'game-chat-container') {
          localStorage.setItem('b_chat_pos', JSON.stringify(posObj));
        } else if (panelId === 'powerbar-container') {
          localStorage.setItem('b_powerbar_pos', JSON.stringify(posObj));
        } else if (panelId === 'buff-indicator-container') {
          localStorage.setItem('b_buff_pos', JSON.stringify(posObj));
        } else if (panelId === 'alt-ui-container') {
          localStorage.setItem('b_alt_ui_pos', JSON.stringify(posObj));
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  setupContextMenu() {
    const btnTrade = document.getElementById('ctx-btn-trade');
    if (btnTrade) {
      btnTrade.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'player') {
          this.engine.network.sendTradeRequest(this.engine.contextTarget.id);
          this.engine.chat.addMessage('system', 'System', `Trade request sent to ${this.engine.otherPlayers[this.engine.contextTarget.id]?.name || 'Player'}.`);
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnTalk = document.getElementById('ctx-btn-talk');
    if (btnTalk) {
      btnTalk.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'npc') {
          const npc = this.engine.npcs.find(n => n.uuid === this.engine.contextTarget.id);
          if (npc) {
            if (npc.type === 'trainer') {
              this.trainer.openTrainerUI(npc);
            }
          }
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnArcadePlay = document.getElementById('ctx-btn-arcade-play');
    if (btnArcadePlay) {
      btnArcadePlay.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'arcade') {
          const target = this.engine.contextTarget;
          if (this.engine.arcadeSystem) {
             this.engine.arcadeSystem.interact(target.x, target.y, target.z, target.voxel.dir, target.voxel.gameId);
          }
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnArcadeEdit = document.getElementById('ctx-btn-arcade-edit');
    if (btnArcadeEdit) {
      btnArcadeEdit.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'arcade') {
          const target = this.engine.contextTarget;
          if (this.devTools) {
             const dt = this.devTools;
             dt.currentEditCabinet = { wx: target.x, wy: target.y, wz: target.z, voxel: target.voxel };
             document.getElementById('edit-arcade-name').value = target.voxel.customName || '';
             document.getElementById('edit-arcade-game').value = target.voxel.gameId || 'pixel';
             document.getElementById('edit-arcade-power').value = target.voxel.powerState || 'on';
             document.getElementById('edit-arcade-x').value = target.x;
             document.getElementById('edit-arcade-y').value = target.y;
             document.getElementById('edit-arcade-z').value = target.z;
             document.getElementById('edit-arcade-zone').value = this.engine.currentZone || 'untitled';
             dt.arcadeEditWindow.open();
             document.getElementById('edit-arcade-highlight').checked = true;
          }
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnArcadePower = document.getElementById('ctx-btn-arcade-power');
    if (btnArcadePower) {
      btnArcadePower.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'arcade') {
          const target = this.engine.contextTarget;
          const newPower = target.voxel.powerState === 'off' ? 'on' : 'off';
          const updatedVoxel = { ...target.voxel, powerState: newPower };
          this.engine.mapManager.setVoxelAt(target.x, target.y, target.z, updatedVoxel, true);
          this.showSystemMessage(`Arcade cabinet powered ${newPower}.`);
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
  }

  update() {
    const eng = this.engine;

    const isAltMode = eng.clientSettings.uiMode === 'alternative';
    const bottomHud = document.querySelector('.game-bottom-hud');
    if (bottomHud) bottomHud.style.display = isAltMode ? 'none' : 'flex';
    const sideHud = document.querySelector('.game-side-hud');
    if (sideHud) sideHud.style.display = isAltMode ? 'none' : 'flex';

    const pName = eng.playerData && eng.playerData.name ? eng.playerData.name.toLowerCase() : '';
    const perms = eng.permissions || {};
    const hasEdit = ['editmode', 'builder', 'dev', 'admin'].some(role =>
        perms[role] && (perms[role].includes('*') || perms[role].includes(pName))
    );

    const hudEditBtn = document.getElementById('btn-hud-edit');
    if (hudEditBtn) {
        hudEditBtn.disabled = !hasEdit;
        hudEditBtn.style.opacity = hasEdit ? '1' : '0.5';
        hudEditBtn.style.cursor = hasEdit ? 'pointer' : 'not-allowed';
    }

    if (isAltMode) {
       const devBtn = document.getElementById('alt-btn-dev-tools');
       const editBtn = document.getElementById('alt-btn-editmode');
       if (devBtn) {
          const isDev = perms['dev'] && (perms['dev'].includes('*') || perms['dev'].includes(pName));
          devBtn.style.display = isDev ? 'block' : 'none';
       }
       if (editBtn) {
          editBtn.disabled = !hasEdit;
          editBtn.style.opacity = hasEdit ? '1' : '0.5';
          editBtn.style.cursor = hasEdit ? 'pointer' : 'not-allowed';
       }
    }
    if (this.els.altUiContainer) this.els.altUiContainer.style.display = isAltMode ? 'flex' : 'none';
    if (this.els.classicXpContainer) this.els.classicXpContainer.style.display = isAltMode ? 'none' : 'block';

    if (this.combatStats && this.combatStats.window.element.style.display !== 'none') {
        this.combatStats.updateStats();
    }

    const topBarMenuBtn = document.getElementById('btn-game-menu');
    if (topBarMenuBtn) topBarMenuBtn.style.display = isAltMode ? 'none' : 'block';

    const buffContainer = document.getElementById('buff-indicator-container');
    const altBuffSlot = document.getElementById('alt-ui-buffs');

    if (isAltMode) {
      if (altBuffSlot && this.els.buffList && this.els.buffList.parentNode !== altBuffSlot) {
        altBuffSlot.appendChild(this.els.buffList);
      }
      if (buffContainer) buffContainer.style.display = 'none';
    } else {
      if (buffContainer && this.els.buffList && this.els.buffList.parentNode !== buffContainer) {
        buffContainer.appendChild(this.els.buffList);
      }
      if (buffContainer) buffContainer.style.display = 'flex';
    }

    if (this.els.zoneDisplay && eng.currentZone) {
      const zoneText = `ZONE: ${eng.currentZone}`;
      if (this.els.zoneDisplay.innerText !== zoneText) {
         this.els.zoneDisplay.innerText = zoneText;
      }
    }

    const hpPercent = Math.max(0, eng.player.hp / eng.player.maxHp);
    const epPercent = Math.max(0, eng.player.energy / eng.player.maxEnergy);

    if (this.els.hpFill) this.els.hpFill.style.width = `${hpPercent * 100}%`;
    if (this.els.hpText) this.els.hpText.innerText = `${Math.floor(eng.player.hp)} / ${eng.player.maxHp}`;

    if (this.els.epFill) this.els.epFill.style.width = `${epPercent * 100}%`;
    if (this.els.epText) this.els.epText.innerText = `${Math.floor(eng.player.energy)} / ${eng.player.maxEnergy}`;

    const addLabel = (fillEl, className, text, color) => {
      if (fillEl && fillEl.parentNode) {
        const container = fillEl.parentNode;
        container.style.position = 'relative';
        if (!container.querySelector('.' + className)) {
           const label = document.createElement('div');
           label.className = className;
           label.innerText = text;
           label.style.cssText = `position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.65rem; color: ${color}; font-weight: bold; pointer-events: none; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); letter-spacing: 1px; z-index: 2;`;
           container.appendChild(label);
        }
      }
    };

    addLabel(this.els.hpFill, 'hp-label', 'Health', '#2ecc71');
    addLabel(this.els.epFill, 'ep-label', 'Energy', '#0984e3');

    if (eng.player.synthEnergy === undefined) eng.player.synthEnergy = 1000;
    if (!eng.player.maxSynthEnergy) eng.player.maxSynthEnergy = 1000;
    const synthPercent = Math.max(0, eng.player.synthEnergy / eng.player.maxSynthEnergy);

    const level = eng.playerData.level || 1;
    const xp = eng.playerData.experience || 0;
    const nextXp = ProgressionSystem.getExpRequiredForNextLevel(level);
    const xpPercent = Math.max(0, Math.min(100, (xp / nextXp) * 100));

    if (this.els.altUiContainer && isAltMode) {
      if (this.els.altUiLevel) this.els.altUiLevel.innerText = level;
      if (this.els.altUiName) this.els.altUiName.innerText = eng.playerData.name || 'Player';
      if (this.els.altUiHpFill) this.els.altUiHpFill.style.width = `${hpPercent * 100}%`;
      if (this.els.altUiHpText) this.els.altUiHpText.innerText = `${Math.floor(eng.player.hp)} / ${eng.player.maxHp}`;
      if (this.els.altUiEpFill) this.els.altUiEpFill.style.width = `${epPercent * 100}%`;
      if (this.els.altUiEpText) this.els.altUiEpText.innerText = `${Math.floor(eng.player.energy)} / ${eng.player.maxEnergy}`;
      if (this.els.altUiBpFill) this.els.altUiBpFill.style.width = `${synthPercent * 100}%`;
      if (this.els.altUiBpText) this.els.altUiBpText.innerText = `${Math.floor(eng.player.synthEnergy)} / ${eng.player.maxSynthEnergy}`;
      if (this.els.altUiXpFill) this.els.altUiXpFill.style.width = `${xpPercent}%`;
      if (this.els.altUiXpContainer) this.els.altUiXpContainer.title = `XP: ${Math.floor(xp)} / ${nextXp}`;

      if (eng.clientSettings.mergeSynthBar && this.els.altUiBpContainer) {
        this.els.altUiBpContainer.style.display = 'none';
        if (this.els.altUiEpText) this.els.altUiEpText.innerText = `${Math.floor(eng.player.energy)} E / ${Math.floor(eng.player.synthEnergy)} S`;
      } else if (this.els.altUiBpContainer) {
        this.els.altUiBpContainer.style.display = 'block';
      }
    } else {
      if (this.els.classicXpFill) this.els.classicXpFill.style.width = `${xpPercent}%`;
      if (this.els.classicXpText) this.els.classicXpText.innerText = `Level ${level} | ${xp} / ${nextXp} XP`;
    }

    if (eng.clientSettings.mergeSynthBar) {
      if (this.els.synthContainer) this.els.synthContainer.style.display = 'none';
      if (this.els.epText) this.els.epText.innerText = `${Math.floor(eng.player.energy)} E / ${Math.floor(eng.player.synthEnergy)} S`;
      if (this.els.epFill) {
        const epPercent = Math.max(0, eng.player.energy / eng.player.maxEnergy) * 100;
        const synthPercent = Math.max(0, eng.player.synthEnergy / (eng.player.maxSynthEnergy || 1000)) * 100;
        this.els.epFill.style.width = '100%';
        this.els.epFill.style.background = `
          linear-gradient(to right, #0984e3 ${epPercent}%, transparent ${epPercent}%),
          linear-gradient(to right, #00d2ff ${synthPercent}%, transparent ${synthPercent}%)
        `;
        this.els.epFill.style.backgroundSize = `100% 50%, 100% 50%`;
        this.els.epFill.style.backgroundRepeat = `no-repeat, no-repeat`;
        this.els.epFill.style.backgroundPosition = `top left, bottom left`;
      }
    } else {
      if (this.els.synthContainer) {
        this.els.synthContainer.style.display = 'flex';
        this.els.synthContainer.style.position = 'relative';
        if (!this.els.synthContainer.querySelector('.synth-label')) {
           const label = document.createElement('div');
           label.className = 'synth-label';
           label.innerText = 'Battery Charge';
           label.style.cssText = 'position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.65rem; color: #aaddff; font-weight: bold; pointer-events: none; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); letter-spacing: 1px; z-index: 2;';
           this.els.synthContainer.appendChild(label);
        }
      }
      if (this.els.synthFill) this.els.synthFill.style.width = `${synthPercent * 100}%`;
      if (this.els.synthText) this.els.synthText.innerText = `${Math.floor(eng.player.synthEnergy)} / ${eng.player.maxSynthEnergy}`;
      if (this.els.epFill)
        this.els.epFill.style.background = '';
        this.els.epFill.style.backgroundSize = '';
        this.els.epFill.style.backgroundRepeat = '';
        this.els.epFill.style.backgroundPosition = '';
    }

    if (this.els.buffList) {
      this.els.buffList.style.flexWrap = 'wrap';

      const effects = eng.player.activeEffects || [];
      // Filter out passives in case they were accidentally clicked and added to activePowers
      const activeToggles = (eng.player.activePowers || []).filter(pId => {
          const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
          return !pDef || pDef.type?.toLowerCase() !== 'passive';
      });
      // Passives are learned powers, so they reside on playerData.powers, not the physical player entity state
      const passives = (eng.playerData.powers || []).filter(pId => {
          const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
          return pDef && pDef.type && pDef.type.toLowerCase() === 'passive';
      });

      const currentEffIds = [
        ...effects.map(e => e.id),
        ...activeToggles.map(p => `toggle_${p}`),
        ...passives.map(p => `passive_${p}`)
      ].join(',');

      if (this.els.buffList.dataset.effIds !== currentEffIds) {
        this.els.buffList.dataset.effIds = currentEffIds;
        this.els.buffList.innerHTML = '';

        passives.forEach(pId => {
          const pDef = window.POWER_REGISTRY[pId];
          const icon = document.createElement('div');
          icon.style.cssText = 'width: 24px; height: 24px; border-radius: 4px; border: 1px solid #3498db; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; background: rgba(0,0,0,0.6); position: relative; overflow: hidden; color: #3498db;';
          icon.innerText = pDef && pDef.name ? pDef.name.substring(0, 1).toUpperCase() : 'P';
          icon.title = `${pDef ? pDef.name : pId} (Passive)`;
          this.els.buffList.appendChild(icon);
        });

        activeToggles.forEach(pId => {
          const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
          const name = pDef && pDef.name ? pDef.name : pId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const icon = document.createElement('div');
          icon.style.cssText = 'width: 24px; height: 24px; border-radius: 4px; border: 1px solid #2ecc71; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; background: rgba(0,0,0,0.6); position: relative; overflow: hidden; color: #2ecc71;';
          icon.innerText = name.substring(0, 1).toUpperCase();
          icon.title = `${name} (Active Toggle)`;
          this.els.buffList.appendChild(icon);
        });

        effects.forEach((eff, i) => {
          const icon = document.createElement('div');
          icon.style.cssText = 'width: 24px; height: 24px; border-radius: 4px; border: 1px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; background: rgba(0,0,0,0.6); position: relative; overflow: hidden;';

          let color = '#fff'; let letter = 'B';
          if (eff.type === 'DoT') { color = '#e67e22'; letter = 'D'; }
          else if (eff.type === 'Heal') { color = '#2ecc71'; letter = 'H'; }
          else if (eff.type === 'MaxHP' || eff.type === 'MaxEnergy' || eff.type === 'MaxSynth') { color = '#3498db'; letter = 'M'; }
          else if (eff.type === 'Status') { color = '#9b59b6'; letter = 'S'; }
          else if (eff.type === 'Proc') { color = '#f1c40f'; letter = 'P'; }

          icon.style.borderColor = color; icon.style.color = color; icon.innerText = letter;
          icon.title = `${eff.type} (${eff.magnitude || 0})`;

          const sweep = document.createElement('div');
          sweep.id = `buff-sweep-${i}`;
          sweep.style.cssText = `position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.5); pointer-events: none; height: 0%;`;
          icon.appendChild(sweep);
          this.els.buffList.appendChild(icon);
        });
      }
      effects.forEach((eff, i) => {
        const sweep = document.getElementById(`buff-sweep-${i}`);
        if (sweep) {
          const pct = Math.max(0, Math.min(100, ((eff.endTime - Date.now()) / (eff.endTime - eff.startTime)) * 100));
          sweep.style.height = `${100 - pct}%`;
        }
      });
    }

    if (this.els.btnEditTarget) {
      if (eng.selectedTarget && eng.selectedTarget.type === 'npc') {
        this.els.btnEditTarget.disabled = false;
        this.els.btnEditTarget.style.opacity = '1';
        this.els.btnEditTarget.style.cursor = 'pointer';
      } else {
        this.els.btnEditTarget.disabled = true;
        this.els.btnEditTarget.style.opacity = '0.5';
        this.els.btnEditTarget.style.cursor = 'not-allowed';
      }
    }

    if (this.els.npcEditModal && this.els.npcEditModal.style.display !== 'none' && eng.selectedTarget && eng.selectedTarget.type === 'npc') {
      const uuidField = document.getElementById('edit-npc-uuid');
      if (uuidField && uuidField.value !== eng.selectedTarget.id) {
        const npc = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
        if (npc) {
          uuidField.value = npc.uuid;
          document.getElementById('edit-npc-name').value = npc.name;
          document.getElementById('edit-npc-hp').value = Math.floor(npc.hp);
          document.getElementById('edit-npc-maxhp').value = npc.maxHp;
          document.getElementById('edit-npc-energy').value = Math.floor(npc.energy || 1000);
          document.getElementById('edit-npc-x').value = Math.round(npc.x);
          document.getElementById('edit-npc-y').value = Math.round(npc.y);
          document.getElementById('edit-npc-z').value = Math.round(npc.z || 0);
          document.getElementById('edit-npc-type').value = npc.type || 'idle';
          document.getElementById('edit-npc-dir').value = npc.dir || 'down';
        }
      }
    }

    if (eng.selectedTarget && this.els.targetWindow) {
      let targetObj = eng.selectedTarget.entity;
      let tName = '';
      if (!targetObj) {
        if (eng.selectedTarget.type === 'npc') {
          targetObj = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
        } else if (eng.selectedTarget.type === 'player') {
          targetObj = eng.otherPlayers[eng.selectedTarget.id];
        } else if (eng.selectedTarget.type === 'self') {
          targetObj = eng.player;
        } else if (eng.selectedTarget.type === 'drone') {
          targetObj = eng.drones[eng.selectedTarget.id];
        }
        if (targetObj) eng.selectedTarget.entity = targetObj;
      }

      if (targetObj) {
        if (eng.selectedTarget.type === 'npc' || eng.selectedTarget.type === 'player') tName = targetObj.name;
        else if (eng.selectedTarget.type === 'self') tName = eng.playerData.name;
        else if (eng.selectedTarget.type === 'drone') tName = `${targetObj.ownerName}'s Drone`;
      }

      if (targetObj && targetObj.state !== 'dead' && targetObj.state !== 'death') {
        this.els.targetWindow.style.display = 'flex';

        let tColor = '#ffffff';
        let tFaction = '';
        if (eng.selectedTarget.type === 'npc') tFaction = targetObj.group || 'Civilian';
        else if (eng.selectedTarget.type === 'player' || eng.selectedTarget.type === 'self') tFaction = targetObj.alignment || 'Neutral';
        else if (eng.selectedTarget.type === 'drone') {
            const owner = eng.otherPlayers[targetObj.ownerSocketId] || (targetObj.ownerSocketId === eng.socket?.id ? eng.playerData : null);
            tFaction = owner ? (owner.alignment || 'Neutral') : 'Neutral';
        }
        tFaction = tFaction.charAt(0).toUpperCase() + tFaction.slice(1);

        const targetLvl = targetObj.level || eng.playerData.level || 1;

        if (eng.selectedTarget.type === 'npc' && targetObj.type !== 'trainer' && targetObj.type !== 'civilian') {
            const playerLvl = eng.playerData.level || 1;
            const diff = targetLvl - playerLvl;
            if (diff >= 4) tColor = '#ff4757';
            else if (diff === 3) tColor = '#e67e22';
            else if (diff === 2) tColor = '#f39c12';
            else if (diff === 1) tColor = '#f1c40f';
            else if (diff === 0) tColor = '#ffffff';
            else if (diff === -1) tColor = '#bdc3c7';
            else if (diff === -2) tColor = '#7f8c8d';
            else tColor = '#444444';
        } else if (eng.selectedTarget.type === 'npc' && targetObj.type === 'civilian') {
            tColor = '#bdc3c7';
        } else if (eng.selectedTarget.type === 'npc' && targetObj.type === 'trainer') {
            tColor = '#3498db';
        } else {
            tColor = '#ffffff';
        }

        this.els.targetName.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${tColor}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-family: 'Arial Black', Impact, sans-serif; background: linear-gradient(135deg, #111, #333); font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.8); flex-shrink: 0; text-shadow: 1px 1px 0 #000;">${targetLvl}</div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color: ${tColor}; font-weight: bold; text-shadow: 1px 1px 0 #000; font-size: 1.1rem; line-height: 1;">${tName}</span>
                    <span style="font-size: 0.75rem; color: #aaa; font-family: var(--font-mono); line-height: 1.2;">[${tFaction}]</span>
                </div>
            </div>
        `;

        const hpPercent = Math.max(0, targetObj.hp / targetObj.maxHp);
        this.els.targetHealthFill.style.width = `${hpPercent * 100}%`;
        if (this.els.targetHealthText) this.els.targetHealthText.innerText = `${Math.floor(targetObj.hp)} / ${targetObj.maxHp}`;

        const maxEp = targetObj.maxEnergy || 1000;
        const epPercent = Math.max(0, (targetObj.energy || maxEp) / maxEp);
        this.els.targetEnergyFill.style.width = `${epPercent * 100}%`;
        if (this.els.targetEnergyText) this.els.targetEnergyText.innerText = `${Math.floor(targetObj.energy || maxEp)} / ${maxEp}`;

        if (targetObj.type === 'trainer' && this.els.targetActions) {
            this.els.targetActions.style.display = 'block';
            if (this.els.btnTargetTalk) this.els.btnTargetTalk.onclick = () => this.trainer.openTrainerUI(targetObj);
        } else if (this.els.targetActions) {
            this.els.targetActions.style.display = 'none';
        }
      } else {
        this.els.targetWindow.style.display = 'none';
        eng.selectedTarget = null;
      }
    } else if (this.els.targetWindow) {
      this.els.targetWindow.style.display = 'none';
    }

    const myDrones = eng.drones ? Object.values(eng.drones).filter(d => d.ownerSocketId === eng.socket?.id && d.state !== 'dead') : [];
    if (myDrones.length > 0) {
      if (this.els.petWindow) {
        this.els.petWindow.style.display = 'flex';

        let petListHtml = '';
        myDrones.sort((a, b) => (a.orbitIndex || 0) - (b.orbitIndex || 0)).forEach(drone => {
            let dName = 'Satellite Drone';
            if (drone.isAssaultDrone) dName = 'Assault Drone';
            else if (drone.isCombatDrone) dName = 'Combat Drone';

            const dLevel = drone.level || eng.playerData.level || 1;
            const hpPercent = Math.max(0, drone.hp / drone.maxHp);
            petListHtml += `<div class="pet-item" data-id="${drone.uuid}" style="margin-bottom: 4px; padding: 4px; border: 1px solid transparent; border-radius: 4px; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)'" onmouseleave="this.style.background='transparent'">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;"><span style="color: #00d2ff; font-family: var(--font-header); font-weight: bold; font-size: 0.9rem; text-shadow: 1px 1px 0 #000; pointer-events: none;">${dName} <span style="font-size: 0.75em; color: #aaa;">(Lv.${dLevel})</span></span><span style="color: #fff; font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;">${Math.floor(drone.hp)} / ${drone.maxHp}</span></div>
                <div style="width: 100%; height: 6px; background: #111; border-radius: 3px; overflow: hidden; border: 1px solid #333;"><div style="height: 100%; background: #2ecc71; width: ${hpPercent * 100}%; transition: width 0.2s;"></div></div>
            </div>`;
        });

        const listContainer = document.getElementById('pet-list-container');
        if (listContainer) listContainer.innerHTML = petListHtml;

        let petTop = 15;
        if (this.els.targetWindow && this.els.targetWindow.style.display !== 'none') {
            petTop += this.els.targetWindow.offsetHeight + 10;
        }
        this.els.petWindow.style.top = `${petTop}px`;
      }
    } else if (this.els.petWindow) {
      this.els.petWindow.style.display = 'none';
    }

    if (eng.activeTrainer) {
      const dist = Math.hypot(eng.player.x - eng.activeTrainer.x, eng.player.y - eng.activeTrainer.y);
      if (dist > 150) {
        eng.activeTrainer = null;
        if (this.trainer && this.trainer.trainerWindow) this.trainer.trainerWindow.close();
      }
    }

    let currentBottomOffset = 85;
    const pb = document.getElementById('powerbar-container');
    if (eng.clientSettings.snapPowerTray && pb) {
        pb.style.bottom = `${currentBottomOffset}px`;
        pb.style.right = '20px';
        pb.style.left = 'auto';
        pb.style.top = 'auto';
        pb.style.transform = 'none';
        if (pb.style.display !== 'none') currentBottomOffset += pb.offsetHeight + 10;
    }

    if (eng.clientSettings.snapActivePowers && buffContainer) {
        buffContainer.style.bottom = `${currentBottomOffset}px`;
        buffContainer.style.right = '20px';
        buffContainer.style.left = 'auto';
        buffContainer.style.top = 'auto';
        buffContainer.style.transform = 'none';
        if (buffContainer.style.display !== 'none') currentBottomOffset += buffContainer.offsetHeight + 10;
    }

    eng.hudIndicatorBottomOffset = currentBottomOffset;
  }
}
