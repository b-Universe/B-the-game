import { BaseWindow } from '../base-window.js?v=cache-bust-005';

class PlayerSearchWindow extends BaseWindow {
  constructor() {
    super('player-search-window', 'Player Search', { width: 350, height: 450, x: 100, y: 100 });
    this.setContent(`
      <div style="display: flex; flex-direction: column; height: 100%; gap: 10px; padding: 5px;">
        <div style="display: flex; gap: 10px;">
           <input type="text" id="pl-search-input" class="b-input" placeholder="Search by name..." style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); color: #fff; padding: 5px; border-radius: 4px; font-family: var(--font-mono);">
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--text-dim); padding-bottom: 5px; font-size: 0.85rem; color: var(--accent-neon, #3498db); font-weight: bold; font-family: var(--font-header);">
           <span style="flex: 2;">Name</span>
           <span style="flex: 1; text-align: center;">Level</span>
           <span style="flex: 1; text-align: right;">Status</span>
        </div>
        <div id="player-list-content" style="display: flex; flex-direction: column; gap: 5px; flex-grow: 1; overflow-y: auto; padding-right: 5px; height: 280px;">
        </div>
        <div style="border-top: 1px solid var(--text-dim); padding-top: 10px; font-size: 0.8rem; color: #aaa; text-align: right; font-family: var(--font-mono);">
           Online: <span id="player-list-count">0</span>
        </div>
      </div>
    `);
  }
}

export class PlayerListUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;

    this.setupUI();
  }

  setupUI() {
    const sideHud = document.querySelector('.game-side-hud');
    if (sideHud && !document.getElementById('btn-player-list')) {
      const btn = document.createElement('button');
      btn.id = 'btn-player-list';
      btn.className = 'btn-secondary';
      btn.style.cssText = 'width: auto; padding: 0 10px; height: 45px; font-weight: bold; background: rgba(0,0,0,0.8); border-color: #3498db; color: #3498db; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;';
      btn.innerText = 'Players';
      btn.title = 'Player List';
      btn.onclick = () => this.togglePanel();
      btn.onmouseenter = () => btn.style.background = 'rgba(52, 152, 219, 0.2)';
      btn.onmouseleave = () => btn.style.background = 'rgba(0,0,0,0.8)';

      const btnPowers = document.getElementById('btn-powers');
      if (btnPowers) {
        sideHud.insertBefore(btn, btnPowers);
      } else {
        sideHud.appendChild(btn);
      }
    }

    this.searchWindow = new PlayerSearchWindow();

    const searchInput = document.getElementById('pl-search-input');
    if (searchInput) {
       searchInput.addEventListener('input', () => this.updateList());
    }
  }

  togglePanel() {
    if (this.searchWindow.element.style.display === 'none') {
      this.searchWindow.open();
      this.updateList();
    } else {
      this.searchWindow.close();
    }
  }

  updateList() {
    if (this.searchWindow.element.style.display === 'none') return;

    const content = document.getElementById('player-list-content');
    const countEl = document.getElementById('player-list-count');
    if (!content) return;

    const searchInput = document.getElementById('pl-search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    content.innerHTML = '';

    const players = [{
      id: this.engine.socket.id,
      name: this.engine.playerData.name || 'You',
      isSelf: true,
      hp: this.engine.player.hp,
      maxHp: this.engine.player.maxHp,
      level: this.engine.playerData.level || 1,
      isAFK: this.engine.player.isAFK
    }];
    for (const id in this.engine.otherPlayers) {
      const op = this.engine.otherPlayers[id];
      players.push({
        id,
        name: op.name,
        isSelf: false,
        hp: op.hp,
        maxHp: op.maxHp,
        level: op.level || 1,
        isAFK: op.isAFK
      });
    }

    const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchTerm));
    if (countEl) countEl.innerText = players.length;
    filteredPlayers.sort((a, b) => a.name.localeCompare(b.name));

    let pCtx = document.getElementById('player-list-ctx');
    if (!pCtx) {
      pCtx = document.createElement('div');
      pCtx.id = 'player-list-ctx';
      pCtx.style.cssText = 'position: fixed; background: rgba(5,7,10,0.95); border: 1px solid #3498db; border-radius: 4px; padding: 5px; display: none; flex-direction: column; gap: 5px; z-index: 100000; font-family: var(--font-mono); font-size: 0.9rem; min-width: 120px;';
      document.body.appendChild(pCtx);

      document.addEventListener('click', () => {
        if (pCtx.style.display === 'flex') pCtx.style.display = 'none';
      });
    }

    filteredPlayers.forEach(p => {
      const row = document.createElement('div');
      const afkTag = p.isAFK ? '<span style="color: #95a5a6; font-size: 0.8rem; margin-right: 5px;">[AFK]</span>' : '';
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.9rem; cursor: context-menu;';
      row.innerHTML = `
        <div style="flex: 2;">${afkTag}<span style="color: ${p.isSelf ? '#2ecc71' : '#3498db'}; font-weight: ${p.isSelf ? 'bold' : 'normal'};">${p.name}</span></div>
        <span style="flex: 1; text-align: center; color: #aaa; font-size: 0.85rem;">${p.level}</span>
        <span style="flex: 1; text-align: right; color: ${p.isSelf ? '#2ecc71' : '#3498db'}; font-size: 0.8rem;">${p.isSelf ? 'You' : 'Online'}</span>
      `;

      row.oncontextmenu = (e) => {
        e.preventDefault();
        if (p.isSelf) return;

        pCtx.innerHTML = `
          <button class="btn-secondary" id="pl-ctx-trade" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">Trade Request</button>
          <button class="btn-secondary" id="pl-ctx-pm" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">Private Message</button>
        `;

        pCtx.style.left = e.clientX + 'px';
        pCtx.style.top = e.clientY + 'px';
        pCtx.style.display = 'flex';

        document.getElementById('pl-ctx-trade').onclick = () => {
          this.engine.network.sendTradeRequest(p.id);
        };

        document.getElementById('pl-ctx-pm').onclick = () => {
          const chatInput = document.getElementById('chat-input');
          if (chatInput) {
            chatInput.value = '/pm ' + p.name + ' ';
            chatInput.focus();
          }
        };
      };

      content.appendChild(row);
    });
  }
}
