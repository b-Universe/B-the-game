export class SystemModalsUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
  }

  showConfirmModal(title, message, onConfirm, countdown = 0) {
    let modal = document.getElementById('game-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'game-confirm-modal';
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(11, 14, 20, 0.85); z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(4px); pointer-events: auto;';
      modal.innerHTML = `
        <div style="background: rgba(5, 7, 10, 0.95); border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; max-width: 400px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">
          <h2 id="game-confirm-title" style="color: #e74c3c; font-family: var(--font-header); margin-top: 0; margin-bottom: 15px; font-size: 1.5rem; text-shadow: 1px 1px 0 #000;">Confirm</h2>
          <p id="game-confirm-message" style="color: #fff; font-family: var(--font-mono); font-size: 1rem; margin-bottom: 20px; line-height: 1.4;"></p>
          <div style="display: flex; justify-content: center; gap: 15px;">
            <button id="game-confirm-yes" class="b-btn b-btn-danger" style="padding: 8px 20px; font-size: 1rem; cursor: pointer;">Yes</button>
            <button id="game-confirm-no" class="b-btn btn-secondary" style="padding: 8px 20px; font-size: 1rem; cursor: pointer;">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('game-confirm-title').innerText = title;
    document.getElementById('game-confirm-message').innerHTML = message;

    const btnYes = document.getElementById('game-confirm-yes');
    const btnNo = document.getElementById('game-confirm-no');

    // Remove old listeners by cloning
    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    const newBtnNo = btnNo.cloneNode(true);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);

    newBtnYes.onclick = () => {
      modal.style.display = 'none';
      if (onConfirm) onConfirm();
    };

    newBtnNo.onclick = () => {
      modal.style.display = 'none';
    };

    modal.style.display = 'flex';
  }

  showSystemMessage(text) {
    const dialog = document.getElementById('system-message-dialog');
    const msgText = document.getElementById('sys-msg-text');
    if (dialog && msgText) {
      msgText.innerHTML = this.ui.formatGameText(text);
      dialog.style.display = 'flex';
      const idx = this.ui.panelStack.indexOf(dialog);
      if (idx !== -1) { this.ui.panelStack.splice(idx, 1); }
      this.ui.panelStack.push(dialog);
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
          const formattedText = this.ui.formatGameText ? this.ui.formatGameText(c.text) : c.text;
          html += `
            <li style="display: flex; gap: 10px; align-items: baseline;">
              <span style="color: ${badgeColor}; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; width: 75px; flex-shrink: 0; text-align: right;">[${c.type}]</span>
              <span style="color: #ccc; font-size: 0.95rem; line-height: 1.4;">${formattedText}</span>
            </li>
          `;
        });
        html += `</ul>`;
      } else if (note.text) {
        const formattedText = this.ui.formatGameText ? this.ui.formatGameText(note.text) : note.text;
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

    const formattedMessage = this.ui.formatGameText ? this.ui.formatGameText(message.replace(/\n/g, '<br>')) : message.replace(/\n/g, '<br>');
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
        const formattedDesc = this.ui.formatGameText ? this.ui.formatGameText(c.desc) : c.desc;
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
}
