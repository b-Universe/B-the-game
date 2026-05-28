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

    let panel = document.getElementById('player-list-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'player-list-panel';
      panel.style.cssText = 'position: absolute; top: 80px; right: 300px; width: 220px; background: rgba(5, 7, 10, 0.9); border: 2px solid #3498db; border-radius: 6px; display: none; flex-direction: column; z-index: 1000; font-family: var(--font-mono); box-shadow: 0 4px 15px rgba(0,0,0,0.8); pointer-events: auto;';

      panel.innerHTML = `
        <div class="dev-panel-header" style="background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
          <span style="color: #fff; font-weight: bold; font-size: 0.9rem;">Players Online (<span id="player-list-count">0</span>)</span>
          <button id="btn-close-player-list" style="background: transparent; border: none; color: #fff; cursor: pointer; font-weight: bold; padding: 0 5px;">X</button>
        </div>
        <div id="player-list-content" style="padding: 10px; display: flex; flex-direction: column; gap: 5px; max-height: 300px; overflow-y: auto;">
        </div>
      `;

      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) {
        gameScreen.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }

      document.getElementById('btn-close-player-list').onclick = () => this.togglePanel();

      this.ui.makeDraggable('player-list-panel', '.dev-panel-header');
    }
  }

  togglePanel() {
    const panel = document.getElementById('player-list-panel');
    if (panel) {
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        this.updateList();
      } else {
        panel.style.display = 'none';
      }
    }
  }

  updateList() {
    const panel = document.getElementById('player-list-panel');
    if (!panel || panel.style.display === 'none') return;

    const content = document.getElementById('player-list-content');
    const countEl = document.getElementById('player-list-count');
    if (!content) return;

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

    if (countEl) countEl.innerText = players.length;
    players.sort((a, b) => a.name.localeCompare(b.name));

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

    players.forEach(p => {
      const row = document.createElement('div');
      const afkTag = p.isAFK ? '<span style="color: #95a5a6; font-size: 0.8rem; margin-right: 5px;">[AFK]</span>' : '';
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.9rem; cursor: context-menu;';
      row.innerHTML = `
        <div>${afkTag}<span style="color: ${p.isSelf ? '#2ecc71' : '#3498db'}; font-weight: ${p.isSelf ? 'bold' : 'normal'};">${p.name}</span></div>
        <span style="color: #aaa; font-size: 0.8rem;">Lv.${p.level}</span>
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
          this.engine.chat.addMessage('system', 'System', 'Trade request sent to ' + p.name + '.');
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
