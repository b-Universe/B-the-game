import { BaseWindow } from '../base-window.js?v=cache-bust-005';
import { UI_COLORS } from './constants.js?v=cache-bust-005';

export class FriendsWindow extends BaseWindow {
  constructor() {
    super('friends-window', 'Social', { width: 420, height: 500, x: 150, y: 150 });
    this.setContent(`
      <div style="display: flex; flex-direction: column; height: 100%; gap: 10px; padding: 5px;">
        <div style="display: flex; gap: 5px; border-bottom: 1px solid var(--text-dim); padding-bottom: 5px;">
          <button id="btn-tab-friends" class="b-btn btn-primary" style="flex: 1;">Friends</button>
          <button id="btn-tab-recent" class="b-btn btn-secondary" style="flex: 1;">Recent Players</button>
        </div>
        <div id="tab-content-friends" style="display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: hidden;">
          <div style="display: flex; gap: 10px;">
            <input type="text" id="add-friend-input" class="b-input" placeholder="Enter player name..." style="flex: 1; font-family: var(--font-mono);">
            <button id="btn-add-friend" class="b-btn btn-secondary" style="border-color: #2ecc71; color: #2ecc71; padding: 0 15px;">Add Friend</button>
          </div>
          <div id="friends-list-container" style="display: flex; flex-direction: column; gap: 5px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
        </div>
        <div id="tab-content-recent" style="display: none; flex-direction: column; gap: 10px; flex: 1; overflow: hidden;">
          <div style="color: var(--text-dim); font-size: 0.85rem; text-align: center; font-family: var(--font-mono);">Players you've recently encountered.</div>
          <div id="recent-list-container" style="display: flex; flex-direction: column; gap: 5px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
        </div>
      </div>
    `);
  }
}

export class FriendsUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.window = new FriendsWindow();
    this.recentPlayers = [];
    try {
      this.recentPlayers = JSON.parse(localStorage.getItem('b_recent_players') || '[]');
    } catch(e) {}
    this.setupFriendsList();
  }

  setupFriendsList() {
    const addBtn = document.getElementById('btn-add-friend');
    const addInput = document.getElementById('add-friend-input');

    if (addBtn && addInput) {
      addBtn.onclick = () => {
        const name = addInput.value.trim();
        if (name) {
          this.engine.network.sendFriendRequest(name);
          addInput.value = '';
          this.engine.chat.addMessage('system', 'System', `Friend request sent to ${name}.`);
        }
      };
      addInput.onkeydown = (e) => {
        if (e.key === 'Enter') addBtn.click();
      };
    }

    const btnTabFriends = document.getElementById('btn-tab-friends');
    const btnTabRecent = document.getElementById('btn-tab-recent');
    const contentFriends = document.getElementById('tab-content-friends');
    const contentRecent = document.getElementById('tab-content-recent');

    if (btnTabFriends && btnTabRecent) {
      btnTabFriends.onclick = () => {
        btnTabFriends.className = 'b-btn btn-primary';
        btnTabRecent.className = 'b-btn btn-secondary';
        contentFriends.style.display = 'flex';
        contentRecent.style.display = 'none';
        this.renderFriendsList();
      };
      btnTabRecent.onclick = () => {
        btnTabRecent.className = 'b-btn btn-primary';
        btnTabFriends.className = 'b-btn btn-secondary';
        contentRecent.style.display = 'flex';
        contentFriends.style.display = 'none';
        this.renderRecentList();
      };
    }
  }

  toggle() {
    if (this.window.element.style.display === 'none') {
      this.window.open();
      this.renderFriendsList();
      if (document.getElementById('tab-content-recent')?.style.display !== 'none') {
         this.renderRecentList();
      }
    } else {
      this.window.close();
    }
  }

  addRecentPlayers(names) {
    if (!names || names.length === 0) return;
    const myName = this.engine.playerData?.name?.toLowerCase();
    let changed = false;

    names.forEach(name => {
      if (!name || name.toLowerCase() === myName) return;
      const existingIdx = this.recentPlayers.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
      if (existingIdx !== -1) {
        this.recentPlayers[existingIdx].lastSeen = Date.now();
      } else {
        this.recentPlayers.unshift({ name: name, lastSeen: Date.now() });
        changed = true;
      }
    });

    this.recentPlayers.sort((a, b) => b.lastSeen - a.lastSeen);
    if (this.recentPlayers.length > 50) this.recentPlayers.length = 50;

    if (changed) {
      localStorage.setItem('b_recent_players', JSON.stringify(this.recentPlayers));
    }
    if (this.window.element.style.display !== 'none' && document.getElementById('tab-content-recent')?.style.display !== 'none') {
       this.renderRecentList();
    }
  }

  renderFriendsList() {
    const container = document.getElementById('friends-list-container');
    if (!container) return;

    const friends = this.engine.playerData.friends || [];
    container.innerHTML = '';

    if (friends.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px; font-family: var(--font-mono); font-size: 0.85rem;">You have no friends yet. Add one above!</div>`;
      return;
    }

    friends.sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return a.name.localeCompare(b.name);
    });

    friends.forEach(friend => {
      const friendDiv = document.createElement('div');
      friendDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 4px; font-family: var(--font-mono);';

      const statusIndicator = document.createElement('span');
      statusIndicator.style.cssText = `width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; background: ${friend.online ? '#2ecc71' : '#7f8c8d'}; box-shadow: 0 0 5px ${friend.online ? '#2ecc71' : 'transparent'};`;
      statusIndicator.title = friend.online ? 'Online' : 'Offline';

      const nameSpan = document.createElement('span');
      nameSpan.innerText = friend.name;
      nameSpan.style.color = friend.online ? '#fff' : '#7f8c8d';
      nameSpan.style.fontWeight = 'bold';

      const leftSide = document.createElement('div');
      leftSide.style.display = 'flex';
      leftSide.style.alignItems = 'center';
      leftSide.appendChild(statusIndicator);
      leftSide.appendChild(nameSpan);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '5px';

      if (friend.online) {
         const pmBtn = document.createElement('button');
         pmBtn.className = 'b-btn btn-secondary';
         pmBtn.style.cssText = 'padding: 2px 8px; font-size: 0.75rem; border-color: #e056fd; color: #e056fd;';
         pmBtn.innerText = 'PM';
         pmBtn.onclick = () => { if (this.engine.ui && this.engine.ui.pmUI) this.engine.ui.pmUI.openConversation(friend.name); };
         actions.appendChild(pmBtn);

         const inviteBtn = document.createElement('button');
         inviteBtn.className = 'b-btn btn-secondary';
         inviteBtn.style.cssText = 'padding: 2px 8px; font-size: 0.75rem; border-color: #3498db; color: #3498db;';
         inviteBtn.innerText = 'Invite';
         inviteBtn.onclick = () => { this.engine.network.sendApartmentInvite(friend.name); };
         actions.appendChild(inviteBtn);
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'b-btn b-btn-danger';
      removeBtn.innerText = 'X';
      removeBtn.style.cssText = 'padding: 2px 8px; font-size: 0.75rem;';
      removeBtn.title = `Remove ${friend.name}`;
      removeBtn.onclick = () => {
        if (confirm(`Are you sure you want to remove ${friend.name} from your friends list?`)) {
          this.engine.network.sendRemoveFriend(friend.name);
        }
      };
      actions.appendChild(removeBtn);

      friendDiv.appendChild(leftSide);
      friendDiv.appendChild(actions);
      container.appendChild(friendDiv);
    });
  }

  renderRecentList() {
    const container = document.getElementById('recent-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (this.recentPlayers.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px; font-family: var(--font-mono); font-size: 0.85rem;">No recent players encountered.</div>`;
      return;
    }

    const friendsList = (this.engine.playerData.friends || []).map(f => f.name.toLowerCase());

    this.recentPlayers.forEach(p => {
      const isFriend = friendsList.includes(p.name.toLowerCase());
      const isOnlineNow = this.engine.otherPlayers && Object.values(this.engine.otherPlayers).some(op => op.name.toLowerCase() === p.name.toLowerCase());

      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); border-radius: 4px; font-family: var(--font-mono);';

      const timeAgo = Math.floor((Date.now() - p.lastSeen) / 60000);
      let timeText = timeAgo < 1 ? 'Just now' : (timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo/60)}h ago`);
      if (isOnlineNow) timeText = 'Online (Here)';

      const nameSpan = document.createElement('div');
      nameSpan.innerHTML = `<strong style="color: ${isOnlineNow ? '#3498db' : '#fff'};">${p.name}</strong><br><span style="color: #aaa; font-size: 0.7rem;">${timeText}</span>`;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '5px';

      if (!isFriend) {
         const addBtn = document.createElement('button');
         addBtn.className = 'b-btn btn-secondary';
         addBtn.style.cssText = 'padding: 2px 8px; font-size: 0.75rem; border-color: #2ecc71; color: #2ecc71;';
         addBtn.innerText = 'Add Friend';
         addBtn.onclick = () => {
            this.engine.network.sendFriendRequest(p.name);
            this.engine.chat.addMessage('system', 'System', `Friend request sent to ${p.name}.`);
            addBtn.disabled = true;
            addBtn.style.opacity = '0.5';
            addBtn.innerText = 'Sent';
         };
         actions.appendChild(addBtn);
      } else {
         const friendTag = document.createElement('span');
         friendTag.style.cssText = 'color: #2ecc71; font-size: 0.75rem; padding: 2px 8px;';
         friendTag.innerText = 'Friend';
         actions.appendChild(friendTag);
      }

      if (isOnlineNow) {
         const pmBtn = document.createElement('button');
         pmBtn.className = 'b-btn btn-secondary';
         pmBtn.style.cssText = 'padding: 2px 8px; font-size: 0.75rem; border-color: #e056fd; color: #e056fd;';
         pmBtn.innerText = 'PM';
         pmBtn.onclick = () => { if (this.engine.ui && this.engine.ui.pmUI) this.engine.ui.pmUI.openConversation(p.name); };
         actions.appendChild(pmBtn);
      }

      row.appendChild(nameSpan);
      row.appendChild(actions);
      container.appendChild(row);
    });
  }
}
