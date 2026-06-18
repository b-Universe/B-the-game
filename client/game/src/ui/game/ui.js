import { DevToolsUIManager } from './dev-tools-ui.js?v=cache-bust-005';
import { InventoryUIManager } from './inventory-ui.js?v=cache-bust-005';
import { PowerbarUIManager } from './powerbar-ui.js?v=cache-bust-005';
import { TrainerUIManager } from './trainer-ui.js?v=cache-bust-005';
import { PlayerListUIManager } from './player-list-ui.js?v=cache-bust-005';
import { FriendsUIManager } from './friends-ui.js?v=cache-bust-005';
import { GAME_TIPS } from './tips.js?v=cache-bust-005';
import { PowerEditorUIManager } from '../power-editor-ui.js?v=cache-bust-005';
import { PowersetEditorUIManager } from '../powerset-editor-ui.js?v=cache-bust-005';
import { PlayerModifierUIManager } from './player-modifier-ui.js?v=cache-bust-005';
import { ProgressionSystem } from '../windows/progression.js?v=cache-bust-005';
import { CombatStatsUIManager } from './combat-stats-ui.js?v=cache-bust-005';
import { BadgesUIManager } from './badges-ui.js?v=cache-bust-005';
import { PrivateMessageUIManager } from './pm-ui.js?v=cache-bust-005';
import { SystemModalsUIManager } from './system-modals-ui.js?v=cache-bust-005';
import { LoadingUIManager } from './loading-ui.js?v=cache-bust-005';
import { HomeEditorUIManager } from './home-editor-ui.js?v=cache-bust-005';
import { HudAltUIManager } from './hud-alt-ui.js?v=cache-bust-005';
import { PetUIManager } from './pet-ui.js?v=cache-bust-005';
import { ContextMenuUIManager } from './context-menu-ui.js?v=cache-bust-005';
import { InfoWindow } from '../windows/info-window.js?v=cache-bust-005';

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
    this.powersetEditor = new PowersetEditorUIManager(engine);
    this.playerModifier = new PlayerModifierUIManager(engine, this);
    this.combatStats = new CombatStatsUIManager(engine, this);
    this.badges = new BadgesUIManager(engine, this);
    this.pmUI = new PrivateMessageUIManager(engine, this);

    this.systemModals = new SystemModalsUIManager(engine, this);
    this.loadingUI = new LoadingUIManager(engine, this);
    this.homeEditor = new HomeEditorUIManager(engine, this);
    this.hudAlt = new HudAltUIManager(engine, this);
    this.petUI = new PetUIManager(engine, this);
    this.contextMenu = new ContextMenuUIManager(engine, this);
    this.infoWindow = new InfoWindow(engine, this);

    this.loadingUI.setupLoadingScreen();
    this.makeDraggable('game-chat-container', '#chat-drag-handle');
    this.makeDraggable('system-message-dialog', '.dev-panel-header');

    // Global capture listener for safe logout confirmation
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('#btn-logout');
      if (target && !target.dataset.confirmed) {
        e.preventDefault();
        e.stopPropagation();
        this.showConfirmModal("Logout", "Are you sure you want to safely log out of the game and return to the main menu?", () => {
          target.dataset.confirmed = 'true';
          target.click(); // Re-trigger the click now that it's confirmed
          target.dataset.confirmed = '';
        });
      }
    }, true);

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

    this.applySavedPos('game-chat-container', 'b_chat_pos');
    this.applySavedPos('powerbar-container', 'b_powerbar_pos');
    this.applySavedPos('home-editor-container', 'b_home_editor_pos');

    // Ensure panels stay on screen during window resize
    window.addEventListener('resize', () => {
      const draggablePanels = [
        'dev-panel', 'builder-panel', 'npc-manager-panel', 'npc-edit-modal',
        'power-editor-panel', 'player-modifier-panel',
        'player-list-panel', 'game-chat-container', 'powerbar-container', 'buff-indicator-container',
        'builder-hotbar', 'object-library-panel',
        'player-manager-panel', 'player-modifier-modal', 'account-manager-modal',
        'home-editor-container', 'base-styles-modal'
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
      btnTargetInfo: document.getElementById('btn-target-info'),
      btnTargetRename: document.getElementById('btn-target-rename'),
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
      classicXpText: document.getElementById('classic-xp-text'),
      homeEditorContainer: document.getElementById('home-editor-container'),
      btnHomeEditMode: document.getElementById('btn-home-edit-mode'),
      btnHomeLock: document.getElementById('btn-home-lock')
    };

    this.applyWindowColors();

    let uiDebugBox = document.getElementById('ui-pos-debug');
    if (!uiDebugBox) {
      uiDebugBox = document.createElement('div');
      uiDebugBox.id = 'ui-pos-debug';
      uiDebugBox.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); border: 1px solid #e056fd; color: #fff; padding: 10px; z-index: 2147483647; font-family: var(--font-mono); font-size: 12px; pointer-events: none; display: none; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.8); border-radius: 4px;';
      document.body.appendChild(uiDebugBox);
    }

    document.addEventListener('mousemove', (e) => {
      if (!this.engine || !this.engine.devOptions || !this.engine.devOptions.showUiPos) {
        if (uiDebugBox.style.display !== 'none') uiDebugBox.style.display = 'none';
        return;
      }
      const target = e.target.closest('.b-window, .dev-panel, #home-editor-container, #powerbar-container, #alt-ui-container, #game-chat-container, #buff-indicator-container');
      if (target) {
        uiDebugBox.style.display = 'block';
        const left = Math.round(target.offsetLeft);
        const top = Math.round(target.offsetTop);
        const xOffset = left - window.innerWidth;

        uiDebugBox.innerHTML = `
          <strong style="color: #e056fd; font-size: 14px; text-transform: uppercase;">${target.id || 'Unnamed GUI'}</strong><br>
          <div style="text-align: left; margin-top: 5px;">
          <span style="color: #ccc;">Current Pixel Pos:</span> top: ${top}px | left: ${left}px<br>
          <span style="color: #f1c40f; margin-top: 5px; display: inline-block;">GUI_DEFAULT_POSITIONS Formats:</span><br>
          <span style="color: #2ecc71;">{ xOffset: ${xOffset}, y: ${top} }</span><br>
          <span style="color: #3498db;">{ top: '${top}px', left: '${left}px', right: 'auto' }</span>
          </div>
        `;
      } else {
        uiDebugBox.style.display = 'none';
      }
    });
  }

  applySavedPos(id, storageKey) {
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
        
        requestAnimationFrame(() => {
          if (el.style.display === 'none') return; // don't calc if hidden
          let rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          let newLeft = rect.left;
          let newTop = rect.top;
          let snapped = false;

          if (rect.right > window.innerWidth) { newLeft = window.innerWidth - rect.width; snapped = true; }
          if (rect.bottom > window.innerHeight) { newTop = window.innerHeight - rect.height; snapped = true; }
          if (rect.left < 0) { newLeft = 0; snapped = true; }
          if (rect.top < 0) { newTop = 0; snapped = true; }

          if (snapped) {
            el.style.left = `${newLeft}px`;
            el.style.top = `${newTop}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
          }
        });
      } catch (e) { }
    }
  }

  applyWindowColors() {
    const c1 = this.engine.clientSettings.windowColor1 || '#34495e';
    const c2 = this.engine.clientSettings.windowColor2 || '#2c3e50';
    const accent = this.engine.clientSettings.windowAccentColor || '#3498db';
    let styleTag = document.getElementById('custom-window-colors');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'custom-window-colors';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      :root {
        --accent: ${accent};
        --accent-neon: ${accent};
      }
      .b-window-header { background: linear-gradient(to bottom, ${c1}, ${c2}) !important; }
      #alt-ui-menu-btn { background: linear-gradient(to bottom, ${c1}, ${c2}) !important; }
    `;
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

  showSystemMessage(text) { this.systemModals.showSystemMessage(text); }
  showConfirmModal(title, msg, onC, cnt) { this.systemModals.showConfirmModal(title, msg, onC, cnt); }
  showPatchNotes(notes, forceShow) { this.systemModals.showPatchNotes(notes, forceShow); }
  showAnnouncement(msg) { this.systemModals.showAnnouncement(msg); }
  showHelpModal() { this.systemModals.showHelpModal(); }

  setupLoadingScreen() { this.loadingUI.setupLoadingScreen(); }
  hideLoadingScreen() { this.loadingUI.hideLoadingScreen(); }
  showReconnecting(is) { this.loadingUI.showReconnecting(is); }

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
          localStorage.setItem('b_builder_pos', JSON.stringify(posObj));
        } else if (panelId === 'builder-hotbar') {
          localStorage.setItem('b_hotbar_pos', JSON.stringify(posObj));
        } else if (panelId === 'object-library-panel') {
          localStorage.setItem('b_objlib_pos', JSON.stringify(posObj));
        } else if (panelId === 'game-chat-container') {
          localStorage.setItem('b_chat_pos', JSON.stringify(posObj));
        } else if (panelId === 'powerbar-container') {
          localStorage.setItem('b_powerbar_pos', JSON.stringify(posObj));
        } else if (panelId === 'buff-indicator-container') {
          localStorage.setItem('b_buff_pos', JSON.stringify(posObj));
        } else if (panelId === 'alt-ui-container') {
          localStorage.setItem('b_alt_ui_pos', JSON.stringify(posObj));
        } else if (panelId === 'home-editor-container') {
          localStorage.setItem('b_home_editor_pos', JSON.stringify(posObj));
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  renderBuffs() {
    if (!this.engine.player) return;
    const active = this.engine.player.activePowers || [];
    const allPowers = this.engine.playerData?.powers || [];
    const passives = allPowers.filter(pId => {
      const pDef = this.engine.powers && this.engine.powers[pId];
      return pDef && (pDef.type === 'Passive' || pDef.type === 'passive');
    });
    
    const combined = [...new Set([...active, ...passives])];
    const buffList = this.els.buffList || document.getElementById('buff-indicator-list');
    
    if (combined.length === 0) {
      if (buffList) buffList.innerHTML = '';
      return;
    }

    if (!buffList) return;

    const activeStr = combined.join(',');
    if (this._lastBuffsStr === activeStr) return;
    this._lastBuffsStr = activeStr;

    buffList.innerHTML = '';
    combined.forEach(pId => {
      const pDef = this.engine.powers && this.engine.powers[pId];
      const icon = pDef && pDef.icon ? pDef.icon : '✨';
      const name = pDef && pDef.name ? pDef.name : pId;
      
      const el = document.createElement('div');
      el.style.cssText = 'width: 28px; height: 28px; border-radius: 4px; background: rgba(52, 152, 219, 0.2); border: 1px solid #3498db; display: flex; justify-content: center; align-items: center; font-size: 16px; position: relative; cursor: help; box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);';
      el.title = name;
      el.innerHTML = icon;
      buffList.appendChild(el);
    });
  }

  update() {
    const eng = this.engine;

    const isAltMode = (eng.clientSettings.uiMode || 'alternative') === 'alternative';
    const sideHud = document.querySelector('.game-side-hud');
    if (sideHud) sideHud.style.display = isAltMode ? 'none' : 'flex';
    const bottomHud = document.querySelector('.game-bottom-hud');
    if (bottomHud) bottomHud.style.display = isAltMode ? 'none' : 'flex';

    const pName = eng.playerData && eng.playerData.name ? eng.playerData.name.toLowerCase() : '';
    const perms = eng.permissions || {};
    const hasEdit = ['editmode', 'builder', 'dev', 'admin'].some(role =>
      perms[role] && (perms[role].includes('*') || perms[role].includes(pName))
    );
    const isDev = ['dev', 'admin'].some(role =>
      perms[role] && (perms[role].includes('*') || perms[role].includes(pName))
    );
    const isOwnApartment = eng.currentZone && eng.currentZone.startsWith('apt_' + pName);
    const isApartmentZone = eng.currentZone && eng.currentZone.startsWith('apt_');

    let isAptGuestBuilder = false;
    if (isApartmentZone && eng.zonesConfig && eng.zonesConfig[eng.currentZone]) {
      const zc = eng.zonesConfig[eng.currentZone];
      if (zc.builders && zc.builders.includes(pName)) {
        isAptGuestBuilder = true;
      }
    }

    const canEditHere = hasEdit && (isDev || isOwnApartment || isAptGuestBuilder);

    const inApartment = isOwnApartment || isAptGuestBuilder || (isDev && isApartmentZone);
    const heUI = this.els.homeEditorContainer;
    if (heUI) {
      if (inApartment) {
        if (heUI.style.display === 'none') heUI.style.display = 'flex';
        const btnHomeEditMode = document.getElementById('btn-home-edit-mode');
        if (btnHomeEditMode) {
          btnHomeEditMode.innerText = eng.editMode ? 'Exit Build Mode' : 'Build Mode';
          btnHomeEditMode.className = eng.editMode ? 'b-btn btn-primary' : 'b-btn btn-secondary';
          btnHomeEditMode.style.color = '#fff';
        }
        const btnHomeLock = document.getElementById('btn-home-lock');
        if (btnHomeLock) {
          if (isOwnApartment || (isDev && isApartmentZone)) {
            btnHomeLock.style.display = 'block';
            const zc = (eng.zonesConfig && eng.zonesConfig[eng.currentZone]) ? eng.zonesConfig[eng.currentZone] : {};
            btnHomeLock.innerText = zc.isLocked ? 'Lock: Invite Only' : 'Lock: Open to Public';
            btnHomeLock.style.color = '#ffffff';
          } else {
            btnHomeLock.style.display = 'none';
          }
        }
      } else {
        heUI.style.display = 'none';
      }
    }

    const hudEditBtn = document.getElementById('btn-hud-edit');
    if (hudEditBtn) {
      hudEditBtn.disabled = !canEditHere;
      hudEditBtn.style.opacity = canEditHere ? '1' : '0.5';
      hudEditBtn.style.cursor = canEditHere ? 'pointer' : 'not-allowed';
    }

    if (isAltMode) {
      const devBtn = document.getElementById('alt-btn-dev-tools');
      const editBtn = document.getElementById('alt-btn-editmode');
      if (devBtn) {
        devBtn.style.display = isDev ? 'block' : 'none';
      }
      if (editBtn) {
        editBtn.disabled = !canEditHere;
        editBtn.style.opacity = canEditHere ? '1' : '0.5';
        editBtn.style.cursor = canEditHere ? 'pointer' : 'not-allowed';
      }
    }

    if (this.combatStats && this.combatStats.window.element.style.display !== 'none') {
      this.combatStats.updateStats();
    }

    const topBarMenuBtn = document.getElementById('btn-game-menu');
    if (topBarMenuBtn) topBarMenuBtn.style.display = isAltMode ? 'none' : 'block';

    this.hudAlt.update();
    if (this.homeEditor) this.homeEditor.update();

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

        if (eng.selectedTarget.type === 'npc' && targetObj.type !== 'trainer' && targetObj.type !== 'civilian' && targetObj.type !== 'banker') {
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
        } else if (eng.selectedTarget.type === 'npc' && targetObj.type === 'banker') {
          tColor = '#2ecc71';
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

        if ((targetObj.type === 'trainer' || targetObj.type === 'banker') && this.els.targetActions) {
          this.els.targetActions.style.display = 'block';
          if (this.els.btnTargetTalk) {
            this.els.btnTargetTalk.innerText = targetObj.type === 'banker' ? 'Bank' : 'Talk';
            this.els.btnTargetTalk.onclick = () => {
              if (targetObj.type === 'trainer') this.trainer.openTrainerUI(targetObj);
              else if (targetObj.type === 'banker') { if (this.inventory) this.inventory.toggleBank(); }
              else alert(targetObj.name + " says: " + (targetObj.dialogue || "Hello there."));
            };
          }
          
          if (this.els.btnTargetInfo) {
            this.els.btnTargetInfo.onclick = () => {
               if (this.devTools && this.devTools.infoWindow) {
                 this.devTools.infoWindow.openWithTarget({ type: eng.selectedTarget.type, id: targetObj.uuid || targetObj.id });
               }
            };
          }

          if (this.els.btnTargetRename) {
            if (eng.selectedTarget.type === 'drone' && targetObj.ownerSocketId === eng.socket.id) {
               this.els.btnTargetRename.style.display = 'block';
               this.els.btnTargetRename.onclick = () => {
                  const newName = prompt('Enter new name for ' + (targetObj.customName || targetObj.name) + ':');
                  if (newName && newName.trim().length > 0) {
                     eng.network.socket.emit('pet_command', { command: 'rename', targetId: targetObj.uuid || targetObj.id, newName: newName.trim() });
                  }
               };
            } else {
               this.els.btnTargetRename.style.display = 'none';
            }
          }

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

    this.petUI.update();
    this.renderBuffs();

    if (eng.activeTrainer) {
      const dist = Math.hypot(eng.player.x - eng.activeTrainer.x, eng.player.y - eng.activeTrainer.y);
      if (dist > 150) {
        eng.activeTrainer = null;
        if (this.trainer && this.trainer.trainerWindow) this.trainer.trainerWindow.close();
      }
    }

    const buffContainer = document.getElementById('buff-indicator-container');
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
