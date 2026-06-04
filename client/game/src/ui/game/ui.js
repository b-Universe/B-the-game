import { DevToolsUIManager } from './dev-tools-ui.js?v=cache-bust-005';
import { InventoryUIManager } from './inventory-ui.js?v=cache-bust-005';
import { PowerbarUIManager } from './powerbar-ui.js?v=cache-bust-005';
import { TrainerUIManager } from './trainer-ui.js?v=cache-bust-005';
import { PlayerListUIManager } from './player-list-ui.js?v=cache-bust-005';
import { FriendsUIManager } from './friends-ui.js?v=cache-bust-005';
import { GAME_TIPS } from './tips.js?v=cache-bust-005';
import { PowerEditorUIManager } from '../power-editor-ui.js?v=cache-bust-005';
import { PlayerModifierUIManager } from './player-modifier-ui.js?v=cache-bust-005';

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
    };

    const trackSelectors = '.dev-panel, .modal-overlay, #trainer-dialog-modal, .builder-hotbar';
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
      zoneDisplay: document.getElementById('zone-display-container')
    };
  }

  formatGameText(text) {
    if (!text) return '';
    return text
      // Highlight Commands (e.g. /editmode, /tpz <zoneName>)
      .replace(/(\/[a-z_]+(?:\s<[^>]+>)?)/gi, '<span style="color: #e056fd; font-weight: bold;">$1</span>')
      // Highlight Keybinds (e.g. 'M', 'N', Shift, Ctrl, Right-Click)
      .replace(/(Shift|Ctrl|Left Click|Right-Click|ESC|'M'|'N'|'P'|'C'|'K')/gi, '<span style="color: #f1c40f; font-weight: bold;">$1</span>')
      // Highlight specific game terms
      .replace(/(Potato Mode|Blockbench|Bepis|Operius|Arcade Cabinet|Battery Charge|Energy|Solar Power)/gi, '<span style="color: #2ecc71; font-weight: bold;">$1</span>');
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
      document.getElementById('zone-display-container')
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
            tipEl.innerHTML = this.formatGameText(newTip);
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
      overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(11, 14, 20, 0.8); z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ff4757; font-family: var(--font-mono); font-size: 2rem; text-shadow: 0 0 10px #ff4757; pointer-events: auto;';
      overlay.innerHTML = 'CONNECTION LOST<br><span style="font-size: 1.2rem; color: #ccc; margin-top: 10px;">Attempting to reconnect...</span>';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(overlay);
      else document.body.appendChild(overlay);
    }
    overlay.style.display = isReconnecting ? 'flex' : 'none';
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

      const rect = panel.getBoundingClientRect();

      if (panel.style.transform) {
        panel.style.transform = 'none';
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
      }

      initialLeft = panel.offsetLeft;
      initialTop = panel.offsetTop;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;

        let scale = 1;
        if (panel.style.zoom) {
            scale = parseFloat(panel.style.zoom) || 1;
        }

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
            } else {
              this.engine.chat.addMessage('system', 'System', 'This NPC has nothing to say.');
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

    if (this.els.zoneDisplay && eng.currentZone) {
      const zoneText = `ZONE: ${eng.currentZone}`;
      if (this.els.zoneDisplay.innerText !== zoneText) {
         this.els.zoneDisplay.innerText = zoneText;
      }
    }

    if (this.els.hpFill) this.els.hpFill.style.width = `${(eng.player.hp / eng.player.maxHp) * 100}%`;
    if (this.els.hpText) this.els.hpText.innerText = `${Math.floor(eng.player.hp)} / ${eng.player.maxHp}`;

    if (this.els.epFill) this.els.epFill.style.width = `${(eng.player.energy / eng.player.maxEnergy) * 100}%`;
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
        this.els.targetName.innerText = tName;

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

    if (eng.activeTrainer) {
      const dist = Math.hypot(eng.player.x - eng.activeTrainer.x, eng.player.y - eng.activeTrainer.y);
      if (dist > 150) {
        eng.activeTrainer = null;
        if (this.trainer && this.trainer.trainerWindow) this.trainer.trainerWindow.close();
      }
    }
  }
}
