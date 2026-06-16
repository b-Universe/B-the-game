import { BaseWindow } from '../base-window.js?v=cache-bust-005';

class PlayerSearchWindow extends BaseWindow {
  constructor() {
    super('player-search-window', 'Player Search', { width: 350, height: 450, x: 100, y: 100 });
    this.setContent(`
      <div style="display: flex; flex-direction: column; height: 100%; gap: 10px; padding: 5px;">
        <div style="display: flex; gap: 10px;">
           <input type="text" id="pl-search-input" class="b-input" placeholder="Search by name..." style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); color: #fff; padding: 5px; border-radius: 4px; font-family: var(--font-mono);">
           <button id="btn-pl-discord-invite" class="b-btn btn-secondary" style="border-color: #9b59b6; color: #9b59b6; padding: 0 10px;" title="Send Discord Invite">Discord</button>
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

    const btnDiscord = document.getElementById('btn-pl-discord-invite');
    if (btnDiscord) {
      btnDiscord.addEventListener('click', () => {
         if (this.engine.network) this.engine.network.sendDiscordInvite();
      });
    }
  }

  togglePanel() {
    if (this.searchWindow.element.style.display === 'none') {
      this.searchWindow.open();
      if (this.engine.network) this.engine.network.socket.emit('request_online_players');
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

    let players = [];
    if (this.onlinePlayersList) {
        players = this.onlinePlayersList.map(p => ({
            ...p,
            isSelf: p.name.toLowerCase() === this.engine.playerData.name.toLowerCase()
        }));
    } else {
        players = [{
          id: this.engine.socket.id,
          name: this.engine.playerData.name || 'You',
          isSelf: true,
          level: this.engine.playerData.level || 1,
          zone: this.engine.currentZone || 'untitled',
          isAFK: this.engine.player.isAFK
        }];
        for (const id in this.engine.otherPlayers) {
          const op = this.engine.otherPlayers[id];
          players.push({ id, name: op.name, isSelf: false, level: op.level || 1, zone: op.zone || 'untitled', isAFK: op.isAFK });
        }
    }

    const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchTerm));
    if (countEl) countEl.innerText = players.length;
    filteredPlayers.sort((a, b) => a.name.localeCompare(b.name));

    let pCtx = document.getElementById('player-list-ctx');
    if (!pCtx) {
      pCtx = document.createElement('div');
      pCtx.id = 'player-list-ctx';
      pCtx.style.cssText = 'position: fixed; background: rgba(5,7,10,0.95); border: 1px solid #3498db; border-radius: 4px; padding: 5px; display: none; flex-direction: column; gap: 5px; z-index: 100000; font-family: var(--font-mono); font-size: 0.9rem; min-width: 180px;';
      document.body.appendChild(pCtx);

      document.addEventListener('click', () => {
        if (pCtx.style.display === 'flex') pCtx.style.display = 'none';
      });
    }

    filteredPlayers.forEach(p => {
      const row = document.createElement('div');
      const afkTag = p.isAFK ? '<span style="color: #95a5a6; font-size: 0.8rem; margin-right: 5px;">[AFK]</span>' : '';
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.9rem; cursor: pointer;';

      row.onclick = () => {
          document.querySelectorAll('#player-list-content > div').forEach(r => r.style.background = 'transparent');
          row.style.background = 'rgba(52, 152, 219, 0.2)';
      };

      row.innerHTML = `
        <div style="flex: 2;">${afkTag}<span style="color: ${p.isSelf ? '#2ecc71' : '#3498db'}; font-weight: ${p.isSelf ? 'bold' : 'normal'};">${p.name}</span></div>
        <span style="flex: 1; text-align: center; color: #aaa; font-size: 0.85rem;">${p.level}</span>
        <span style="flex: 1; text-align: right; color: ${p.isSelf ? '#2ecc71' : '#3498db'}; font-size: 0.8rem;">${p.isSelf ? 'You' : 'Online'}</span>
      `;

      row.oncontextmenu = (e) => {
        e.preventDefault();
        if (p.isSelf) return;

        row.click();

        const myName = this.engine.playerData.name.toLowerCase();
        const myAptZone = `apt_${myName}`;
        const inMyApt = this.engine.currentZone === myAptZone;
        const theyInMyApt = p.zone === myAptZone;

        const isFriend = this.engine.playerData.friends && this.engine.playerData.friends.some(f => f.toLowerCase() === p.name.toLowerCase());
        const friendText = isFriend ? 'Remove Friend' : 'Add Friend';

        let isBuilder = false;
        if (this.engine.zonesConfig && this.engine.zonesConfig[myAptZone] && this.engine.zonesConfig[myAptZone].builders) {
            isBuilder = this.engine.zonesConfig[myAptZone].builders.includes(p.name.toLowerCase());
        }
        const builderText = isBuilder ? 'Revoke Apt Build' : 'Grant Apt Build';

        let isVisitor = false;
        if (this.engine.zonesConfig && this.engine.zonesConfig[myAptZone] && this.engine.zonesConfig[myAptZone].visitors) {
            isVisitor = this.engine.zonesConfig[myAptZone].visitors.includes(p.name.toLowerCase());
        }
        const visitorText = isVisitor ? 'Revoke Apt Visitor' : 'Grant Apt Visitor';

        const isAdmin = this.engine.permissions && this.engine.permissions['admin'] && (this.engine.permissions['admin'].includes('*') || this.engine.permissions['admin'].includes(p.name.toLowerCase()));
        const canKick = inMyApt && theyInMyApt && !isAdmin;

         pCtx.innerHTML = `
          <button class="btn-secondary" id="pl-ctx-trade" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">Trade Request</button>
          <button class="btn-secondary" id="pl-ctx-pm" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">Chat (PM)</button>
          <button class="btn-secondary" id="pl-ctx-party-chat" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: not-allowed; opacity: 0.5;" disabled title="Not in a party">Chat to Party Leader</button>
          <button class="btn-secondary" id="pl-ctx-party-invite" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: not-allowed; opacity: 0.5;" disabled title="Parties not implemented">Invite to Party</button>
          <button class="btn-secondary" id="pl-ctx-apt-invite" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: ${inMyApt && !theyInMyApt ? 'pointer' : 'not-allowed'}; opacity: ${inMyApt && !theyInMyApt ? '1' : '0.5'};" ${inMyApt && !theyInMyApt ? '' : 'disabled'} title="${!inMyApt ? 'You must be in your apartment' : (theyInMyApt ? 'They are already in your apartment' : 'Invite')}">Invite to Apartment</button>
          <button class="btn-secondary" id="pl-ctx-apt-visitor" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">${visitorText}</button>
          <button class="btn-secondary" id="pl-ctx-apt-build" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">${builderText}</button>
          <button class="btn-secondary" id="pl-ctx-apt-kick" style="text-align: left; padding: 5px; border: none; background: transparent; color: #e74c3c; cursor: ${canKick ? 'pointer' : 'not-allowed'}; opacity: ${canKick ? '1' : '0.5'};" ${canKick ? '' : 'disabled'} title="${!inMyApt ? 'You must be in your apartment' : (!theyInMyApt ? 'They are not in your apartment' : (isAdmin ? 'Cannot kick Administrators' : 'Kick from Apartment'))}">Kick from Apartment</button>
          <button class="btn-secondary" id="pl-ctx-friend" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">${friendText}</button>
          <button class="btn-secondary" id="pl-ctx-id" style="text-align: left; padding: 5px; border: none; background: transparent; color: #fff; cursor: pointer;">View ID & Notes</button>
        `;

        pCtx.style.left = e.clientX + 'px';
        pCtx.style.top = e.clientY + 'px';
        pCtx.style.display = 'flex';

        document.getElementById('pl-ctx-trade').onclick = () => {
          this.engine.network.sendTradeRequest(p.id);
          pCtx.style.display = 'none';
        };

        document.getElementById('pl-ctx-pm').onclick = () => {
          if (this.engine.ui && this.engine.ui.pmUI) {
             this.engine.ui.pmUI.openConversation(p.name);
          } else {
             const chatInput = document.getElementById('chat-input');
             if (chatInput) {
               chatInput.value = '/pm ' + p.name + ' ';
               chatInput.focus();
             }
          }
          pCtx.style.display = 'none';
        };

        const aptInviteBtn = document.getElementById('pl-ctx-apt-invite');
        if (aptInviteBtn) {
            aptInviteBtn.onclick = () => {
                if (this.engine.network) this.engine.network.sendApartmentInvite(p.name);
                pCtx.style.display = 'none';
            };
        }

        const aptVisitorBtn = document.getElementById('pl-ctx-apt-visitor');
        if (aptVisitorBtn) {
            aptVisitorBtn.onclick = () => {
                if (this.engine.network) this.engine.network.sendApartmentToggleVisitor(p.name);
                pCtx.style.display = 'none';
            };
        }

        const aptBuildBtn = document.getElementById('pl-ctx-apt-build');
        if (aptBuildBtn) {
            aptBuildBtn.onclick = () => {
                if (this.engine.network) this.engine.network.sendApartmentToggleBuilder(p.name);
                pCtx.style.display = 'none';
            };
        }

        const aptKickBtn = document.getElementById('pl-ctx-apt-kick');
        if (aptKickBtn) {
            aptKickBtn.onclick = () => {
                if (this.engine.network) this.engine.network.sendApartmentKick(p.name);
                pCtx.style.display = 'none';
            };
        }

        document.getElementById('pl-ctx-friend').onclick = () => {
            if (isFriend) {
                if (confirm(`Remove ${p.name} from friends?`)) this.engine.network.sendRemoveFriend(p.name);
            } else {
                this.engine.network.sendFriendRequest(p.name);
            }
            pCtx.style.display = 'none';
        };

        document.getElementById('pl-ctx-id').onclick = () => {
            this.openPlayerIDNotes(p.name);
            pCtx.style.display = 'none';
        };
      };

      content.appendChild(row);
    });
  }

  openPlayerIDNotes(targetName) {
      let modal = document.getElementById('player-id-notes-modal');
      if (!modal) {
          modal = document.createElement('div');
          modal.id = 'player-id-notes-modal';
          modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(11, 14, 20, 0.85); z-index: 2147483647; display: none; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(4px); pointer-events: auto;';
          modal.innerHTML = `
            <div style="background: rgba(5, 7, 10, 0.95); border: 2px solid #3498db; border-radius: 8px; padding: 20px; width: 400px; max-width: 90vw; display: flex; flex-direction: column; gap: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3498db; padding-bottom: 10px;">
                  <h2 style="color: #3498db; font-family: var(--font-header); margin: 0; font-size: 1.5rem; text-shadow: 1px 1px 0 #000;">Player ID & Notes</h2>
                  <button id="btn-close-id-notes" class="b-btn btn-secondary" style="padding: 2px 8px;">X</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                  <span style="color: #aaa; font-size: 0.85rem; font-family: var(--font-mono);">Name:</span>
                  <strong id="id-notes-name" style="color: #fff; font-size: 1.1rem;">Unknown</strong>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                  <span style="color: #aaa; font-size: 0.85rem; font-family: var(--font-mono);">Personal Notes (Only you see this):</span>
                  <textarea id="id-notes-text" class="b-input" style="height: 100px; resize: none;"></textarea>
              </div>
              <button id="btn-save-id-notes" class="b-btn btn-primary">Save Notes</button>
            </div>
          `;
          document.body.appendChild(modal);

          document.getElementById('btn-close-id-notes').onclick = () => { modal.style.display = 'none'; };
          document.getElementById('btn-save-id-notes').onclick = () => {
              const name = document.getElementById('id-notes-name').innerText;
              const text = document.getElementById('id-notes-text').value;
              let notes = {};
              try { notes = JSON.parse(localStorage.getItem('b_player_notes') || '{}'); } catch(e){}
              notes[name.toLowerCase()] = text;
              localStorage.setItem('b_player_notes', JSON.stringify(notes));
              modal.style.display = 'none';
              this.engine.ui.showSystemMessage(`Saved personal notes for ${name}.`);
          };
      }

      document.getElementById('id-notes-name').innerText = targetName;
      let notes = {};
      try { notes = JSON.parse(localStorage.getItem('b_player_notes') || '{}'); } catch(e){}
      document.getElementById('id-notes-text').value = notes[targetName.toLowerCase()] || '';

      modal.style.display = 'flex';
  }
}
