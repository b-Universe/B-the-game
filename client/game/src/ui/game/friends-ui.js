export class FriendsUIManager {
    constructor(engine, mainUIManager) {
        this.engine = engine;
        this.ui = mainUIManager;
        this.setupFriendsList();
    }

    setupFriendsList() {
        const modal = document.getElementById('friends-modal');
        const closeBtn = document.getElementById('btn-close-friends');
        const addBtn = document.getElementById('btn-add-friend');
        const addInput = document.getElementById('add-friend-input');

        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
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
    }

    renderFriendsList() {
        const container = document.getElementById('friends-list-container');
        if (!container) return;

        const friends = this.engine.playerData.friends || [];
        container.innerHTML = '';

        if (friends.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">You have no friends yet. Add one below!</div>`;
            return;
        }

        friends.sort((a, b) => {
            if (a.online && !b.online) return -1;
            if (!a.online && b.online) return 1;
            return a.name.localeCompare(b.name);
        });

        friends.forEach(friend => {
            const friendDiv = document.createElement('div');
            friendDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(0,0,0,0.4); border-radius: 4px;';
            
            const statusIndicator = document.createElement('span');
            statusIndicator.style.cssText = `width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; background: ${friend.online ? '#2ecc71' : '#7f8c8d'};`;
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

            const removeBtn = document.createElement('button');
            removeBtn.innerText = 'X';
            removeBtn.style.cssText = 'background: transparent; border: 1px solid #e74c3c; color: #e74c3c; cursor: pointer; width: 24px; height: 24px; border-radius: 50%; font-weight: bold;';
            removeBtn.title = `Remove ${friend.name}`;
            removeBtn.onclick = () => {
                if (confirm(`Are you sure you want to remove ${friend.name} from your friends list?`)) {
                    this.engine.network.sendRemoveFriend(friend.name);
                }
            };

            friendDiv.appendChild(leftSide);
            friendDiv.appendChild(removeBtn);
            container.appendChild(friendDiv);
        });
    }
}
