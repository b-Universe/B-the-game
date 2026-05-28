import { DevToolsUIManager } from './dev-tools-ui.js?v=new-engine-330';
import { InventoryUIManager } from './inventory-ui.js?v=new-engine-330';
import { PowerbarUIManager } from './powerbar-ui.js?v=new-engine-330';
import { TrainerUIManager } from './trainer-ui.js?v=new-engine-330';
import { PlayerListUIManager } from './player-list-ui.js?v=new-engine-330';
import { FriendsUIManager } from './friends-ui.js?v=new-engine-330';
import { GAME_TIPS } from './tips.js?v=new-engine-330';
import { PowerEditorUIManager } from '../power-editor-ui.js?v=new-engine-330';

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

    this.setupContextMenu();
    this.setupLoadingScreen();
    this.makeDraggable('power-editor-panel', '.dev-panel-header');

    // Cache frequently accessed elements to avoid DOM lookups in high-frequency update()
    this.els = {
      synthContainer: document.getElementById('synth-bar-container'),
      synthFill: document.getElementById('synth-bar-fill'),
      synthText: document.getElementById('synth-bar-text'),
      hpFill: document.getElementById('health-bar-fill'),
      hpText: document.getElementById('health-bar-text'),
      epFill: document.getElementById('energy-bar-fill'),
      epText: document.getElementById('energy-bar-text'),
      btnEditTarget: document.getElementById('btn-dev-edit-target'),
      npcEditModal: document.getElementById('npc-edit-modal'),
      targetWindow: document.getElementById('target-window'),
      targetName: document.getElementById('target-name'),
      targetHealthFill: document.getElementById('target-health-fill'),
      targetHealthText: document.getElementById('target-health-text'),
      targetEnergyFill: document.getElementById('target-energy-fill'),
      targetEnergyText: document.getElementById('target-energy-text'),
      targetActions: document.getElementById('target-actions'),
      btnTargetTalk: document.getElementById('btn-target-talk')
    };
  }

  updateUIScale() {
    const scale = this.engine.clientSettings.uiScale !== undefined ? this.engine.clientSettings.uiScale : 1.0;
    const elements = [
      document.querySelector('.game-side-hud'),
      document.querySelector('.game-top-bar'),
      document.getElementById('powerbar-container'),
      document.getElementById('target-window'),
      document.getElementById('game-chat-container'),
      document.getElementById('map-controls')
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
          html += `
            <li style="display: flex; gap: 10px; align-items: baseline;">
              <span style="color: ${badgeColor}; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; width: 75px; flex-shrink: 0; text-align: right;">[${c.type}]</span>
              <span style="color: #ccc; font-size: 0.95rem; line-height: 1.4;">${c.text}</span>
            </li>
          `;
        });
        html += `</ul>`;
      } else if (note.text) {
        html += `<div style="color: #ccc; margin: 5px 0 15px 0; padding-left: 10px; font-size: 0.95rem;">${note.text}</div>`;
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

    content.innerHTML = message.replace(/\n/g, '<br>');
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
      if (!allowed) return false;
      if (allowed.includes('*')) return true;
      return allowed.includes(pName);
    };

    const commands = [
      { cmd: '/stuck', syntax: '/stuck', desc: 'Nudges your character back to a safe location if you are trapped in walls or blocked terrain.', perm: null, color: '#3498db' },
      { cmd: '/pm, /w, /whisper', syntax: '/pm &lt;name&gt; &lt;message&gt;', desc: 'Sends a private direct message to a specific player.', perm: null, color: '#3498db' },
      { cmd: '/patchnotes, /news', syntax: '/patchnotes', desc: 'Pulls up the latest patch notes and news.', perm: null, color: '#3498db' },
      { cmd: '/editmode', syntax: '/editmode', desc: 'Toggles the builder interface and block placing tools.', perm: 'editmode', color: '#f1c40f' },
      { cmd: '/dev', syntax: '/dev', desc: 'Toggles the developer tool panel for inspecting hitboxes, LoS, and coordinates.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/time', syntax: '/time &lt;0-24&gt;', desc: 'Overrides the time of day locally. E.g., "/time 12" sets it to High Noon.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/givemoney', syntax: '/givemoney &lt;amount&gt;', desc: 'Grants yourself currency. Account will permanently be removed from Hi-Scores.', perm: 'dev', color: '#f1c40f' },
      { cmd: '/announce', syntax: '/announce &lt;message&gt;', desc: 'Broadcasts a high-priority server-wide modal announcement.', perm: 'dev', color: '#e74c3c' },
      { cmd: '/npc create', syntax: '/npc create &lt;Name&gt; &lt;Health&gt;', desc: 'Spawns an NPC at your current mouse pointer location.', perm: 'npc', color: '#9b59b6' },
      { cmd: '/players', syntax: '/players', desc: 'Opens the Player Manager to view and moderate online players.', perm: 'playermanager', color: '#9b59b6' },
      { cmd: '/tp, /teleport', syntax: '/tp &lt;x&gt; &lt;y&gt; [z]', desc: 'Teleports you to the specified coordinates.', perm: 'tp', color: '#e74c3c' },
      { cmd: '/tpo, /teleport-other', syntax: '/tpo &lt;player&gt; &lt;x&gt; &lt;y&gt; [z]', desc: 'Teleports another player to the specified coordinates.', perm: 'tp', color: '#e74c3c' },
      { cmd: '/speed', syntax: '/speed &lt;value&gt;', desc: 'Sets your base movement speed.', perm: 'speed', color: '#e74c3c' },
      { cmd: '/reload, /forceupdate', syntax: '/reload', desc: 'Forces all clients and the server to reload assets and code.', perm: 'reload', color: '#e74c3c' },
    ];

    list.innerHTML = '';

    commands.forEach(c => {
      if (checkPerm(c.perm)) {
        const el = document.createElement('div');
        el.style.cssText = `background: rgba(0,0,0,0.6); border: 1px solid ${c.color}; border-left: 4px solid ${c.color}; padding: 12px; border-radius: 4px; display: flex; flex-direction: column; gap: 5px;`;
        el.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="color: ${c.color}; font-family: var(--font-header); font-size: 1.2rem; letter-spacing: 1px;">${c.cmd}</strong>
            <span style="background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; color: #ccc; user-select: all;">${c.syntax}</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.95rem; color: #e1e1e1; line-height: 1.4; margin-top: 4px;">${c.desc}</div>
        `;
        list.appendChild(el);
      }
    });

    modal.style.display = 'flex';
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
  }

  setupLoadingScreen() {
    this.loadingStartTime = performance.now();
    this.loadingScreen = document.createElement('div');
    this.loadingScreen.id = 'loading-screen';
    this.loadingScreen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: #0b0e14; z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: var(--font-mono);';

    const randomTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];

    this.loadingScreen.innerHTML = `
      <h1 style="font-size: 3rem; text-shadow: 0 0 10px #f1c40f;">INITIALIZING ZONE</h1>
      <p style="font-size: 1.2rem; color: #fff; margin-bottom: 30px;">Building Geometry...</p>
      <div style="background: rgba(243, 156, 18, 0.2); border: 1px solid #f39c12; padding: 15px; border-radius: 6px; max-width: 600px; text-align: center;">
        <span style="color: #f39c12; font-weight: bold;">TIP:</span> <span style="color: #fff;">${randomTip}</span>
      </div>
    `;
    document.body.appendChild(this.loadingScreen);
  }

  hideLoadingScreen() {
    if (this.loadingScreen && this.loadingScreen.style.display !== 'none') {
      const elapsed = performance.now() - this.loadingStartTime;
      const remaining = Math.max(0, 3000 - elapsed);
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
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
      document.body.appendChild(overlay);
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
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        panel.style.left = `${initialLeft + dx}px`;
        panel.style.top = `${initialTop + dy}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (panelId === 'builder-panel') {
          const eng = window.currentGameEngine;
          if (eng && eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
            localStorage.setItem('b_builder_pos', JSON.stringify({ left: panel.style.left, top: panel.style.top }));
          }
        } else if (panelId === 'builder-hotbar') {
          const eng = window.currentGameEngine;
          if (eng && eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
            localStorage.setItem('b_hotbar_pos', JSON.stringify({ left: panel.style.left, top: panel.style.top }));
          }
        } else if (panelId === 'object-library-panel') {
          const eng = window.currentGameEngine;
          if (eng && eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
            localStorage.setItem('b_objlib_pos', JSON.stringify({ left: panel.style.left, top: panel.style.top }));
          }
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
  }

  update() {
    const eng = this.engine;

    if (this.els.hpFill) this.els.hpFill.style.width = `${(eng.player.hp / eng.player.maxHp) * 100}%`;
    if (this.els.hpText) this.els.hpText.innerText = `${Math.floor(eng.player.hp)} / ${eng.player.maxHp}`;

    if (this.els.epFill) this.els.epFill.style.width = `${(eng.player.energy / eng.player.maxEnergy) * 100}%`;
    if (this.els.epText) this.els.epText.innerText = `${Math.floor(eng.player.energy)} / ${eng.player.maxEnergy}`;

    if (eng.player.synthEnergy === undefined) eng.player.synthEnergy = 1000;
    if (!eng.player.maxSynthEnergy) eng.player.maxSynthEnergy = 1000;
    const synthPercent = Math.max(0, eng.player.synthEnergy / eng.player.maxSynthEnergy);

    if (eng.clientSettings.mergeSynthBar) {
      if (this.els.synthContainer) this.els.synthContainer.style.display = 'none';
      if (this.els.epText) this.els.epText.innerText = `${Math.floor(eng.player.energy)} E / ${Math.floor(eng.player.synthEnergy)} S`;
      if (this.els.epFill) {
        this.els.epFill.style.background = `linear-gradient(to bottom, #0984e3 50%, #00d2ff 50%)`;
        this.els.epFill.style.width = `${Math.max((eng.player.energy / eng.player.maxEnergy), synthPercent) * 100}%`;
      }
    } else {
      if (this.els.synthContainer) this.els.synthContainer.style.display = 'flex';
      if (this.els.synthFill) this.els.synthFill.style.width = `${synthPercent * 100}%`;
      if (this.els.synthText) this.els.synthText.innerText = `${Math.floor(eng.player.synthEnergy)} / ${eng.player.maxSynthEnergy} (Synth)`;
      if (this.els.epFill) this.els.epFill.style.background = ''; // Allow standard CSS to apply
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
      let targetObj = null;
      let tName = '';
      if (eng.selectedTarget.type === 'npc') {
        targetObj = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
        if (targetObj) tName = targetObj.name;
      } else if (eng.selectedTarget.type === 'player') {
        targetObj = eng.otherPlayers[eng.selectedTarget.id];
        if (targetObj) tName = targetObj.name;
      } else if (eng.selectedTarget.type === 'self') {
        targetObj = eng.player;
        tName = eng.playerData.name;
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
        const tModal = document.getElementById('trainer-dialog-modal');
        if (tModal) tModal.style.display = 'none';
      }
    }
  }
}
