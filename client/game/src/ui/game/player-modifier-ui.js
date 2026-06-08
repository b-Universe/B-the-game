import { PlayerModifierWindow, AccountManagerWindow, AccountEditWindow } from '../windows/player-windows.js?v=cache-bust-005';

export class PlayerModifierUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.targetName = null;
    this.currentAccountUuid = null;

    this.playerWindow = new PlayerModifierWindow();
    this.accountWindow = new AccountManagerWindow();
    this.accountEditWindow = new AccountEditWindow();

    this.setupUI();
  }

  setupUI() {
    document.getElementById('btn-pm-save').onclick = () => this.save();

    document.getElementById('btn-pm-kick').onclick = () => {
      if (confirm(`Kick ${this.targetName}?`)) {
        this.engine.network.sendAdminKickPlayer(this.targetName);
      }
    };
    document.getElementById('btn-pm-tp-to').onclick = () => {
      const pData = this.allPlayersList?.find(p => p.name === this.targetName);
      if (pData) {
        this.engine.network.sendAdminTeleport({ targetName: this.engine.playerData.name, x: pData.x, y: pData.y, z: pData.z, zone: pData.zone || 'untitled' });
      }
    };
    document.getElementById('btn-pm-tp-me').onclick = () => {
      this.engine.network.sendAdminTeleport({ targetName: this.targetName, x: this.engine.player.x, y: this.engine.player.y, z: this.engine.player.z, zone: this.engine.currentZone || 'untitled' });
    };
    document.getElementById('btn-pm-manage-account').onclick = () => {
      if (this.currentAccountUuid) {
        this.engine.network.sendAdminRequestAccount(this.currentAccountUuid);
      } else {
        this.ui.showSystemMessage('Cannot find account UUID for this player.');
      }
    };

    document.getElementById('btn-pm-grant').onclick = () => {
      const perm = document.getElementById('pm-permission-input').value.trim();
      if (perm && this.targetName) {
        this.engine.network.socket.emit('admin_grant_permission', { targetName: this.targetName, permission: perm, revoke: false });
        document.getElementById('pm-permission-input').value = '';
        setTimeout(() => this.updatePermissionsDisplay(), 250);
      }
    };
    document.getElementById('btn-pm-revoke').onclick = () => {
      const perm = document.getElementById('pm-permission-input').value.trim();
      if (perm && this.targetName) {
        this.engine.network.socket.emit('admin_grant_permission', { targetName: this.targetName, permission: perm, revoke: true });
        document.getElementById('pm-permission-input').value = '';
        setTimeout(() => this.updatePermissionsDisplay(), 250);
      }
    };

    document.getElementById('am-search-input').addEventListener('input', () => this.renderAccountManagerList());

    document.getElementById('btn-am-ban-toggle').onclick = () => {
      this.currentAccountIsBanned = !this.currentAccountIsBanned;
      const btn = document.getElementById('btn-am-ban-toggle');
      btn.innerText = this.currentAccountIsBanned ? 'Yes' : 'No';
      btn.classList.toggle('b-btn-danger', this.currentAccountIsBanned);
    };
    document.getElementById('btn-am-unban').onclick = () => {
      const uuid = document.getElementById('am-uuid').value;
      this.engine.network.sendAdminUpdateAccount(uuid, { isBanned: false });
      this.currentAccountIsBanned = false;
      const btnToggle = document.getElementById('btn-am-ban-toggle');
      btnToggle.innerText = 'No';
      btnToggle.classList.remove('b-btn-danger');
      document.getElementById('btn-am-unban').style.display = 'none';
      this.engine.network.sendAdminRequestAllAccounts();
      this.ui.showSystemMessage('Account unbanned instantly. (Reason preserved)');
    };
    document.getElementById('btn-am-save').onclick = () => {
      const uuid = document.getElementById('am-uuid').value;
      const reason = document.getElementById('am-ban-reason').value;
      this.engine.network.sendAdminUpdateAccount(uuid, { isBanned: this.currentAccountIsBanned, banReason: reason });
      this.accountEditWindow.close();
      this.engine.network.sendAdminRequestAllAccounts();
    };
  }

  updatePermissionsDisplay() {
    if (!this.targetName || !this.engine.permissions) return;
    const targetLower = this.targetName.toLowerCase();
    const perms = [];
    for (const [node, users] of Object.entries(this.engine.permissions)) {
      if (users.includes(targetLower)) perms.push(node);
    }
    document.getElementById('pm-permissions-list').innerText = perms.length > 0 ? perms.join(', ') : 'None';
  }

  open(charData) {
    if (!charData) return;
    this.targetName = charData.name;
    this.currentAccountUuid = charData.accountUuid;
    this.playerWindow.setTitle(`Player Modifier - ${charData.name}`);

    document.getElementById('pm-account-username').value = charData.accountUsername || 'N/A';
    document.getElementById('pm-level').value = charData.level || 1;
    document.getElementById('pm-currency').value = charData.currency || 0;
    document.getElementById('pm-integrity').value = charData.integrity || 0;
    document.getElementById('pm-maxhp').value = charData.stats?.maxHp || 1000;
    document.getElementById('pm-maxenergy').value = charData.stats?.maxEnergy || 1000;
    document.getElementById('pm-maxsynth').value = charData.stats?.maxSynthEnergy || 1000;
    document.getElementById('pm-power-picks').value = charData.unspentPowerPicks || 0;
    const psPicksRaw = charData.unspentPowersetPicks;
    document.getElementById('pm-powerset-picks').value = Array.isArray(psPicksRaw) ? psPicksRaw.length : (typeof psPicksRaw === 'number' ? psPicksRaw : 0);
    document.getElementById('pm-powersets').value = (charData.powersets || []).join(', ');
    document.getElementById('pm-powers').value = (charData.powers || []).join(', ');
    this.updatePermissionsDisplay();
    this.playerWindow.open();
  }

  openAccountManagerList() {
    if (this.accountWindow.element.style.display === 'none') {
      this.accountWindow.open();
      this.engine.network.sendAdminRequestAllAccounts();
    } else {
      this.accountWindow.close();
    }
  }

  renderAccountManagerList() {
    if (!this.allAccountsList) return;
    const list = document.getElementById('account-manager-list');
    if (!list) return;
    list.innerHTML = '';

    const searchVal = document.getElementById('am-search-input')?.value.toLowerCase() || '';
    const filtered = this.allAccountsList.filter(a => a.username.toLowerCase().includes(searchVal) || (a.email && a.email.toLowerCase().includes(searchVal)));
    filtered.sort((a, b) => a.username.localeCompare(b.username));

    filtered.forEach(acc => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 8px; border-radius: 4px; font-size: 0.8rem;';
      const isBannedStr = acc.isBanned ? '<span style="color: #e74c3c; font-weight: bold;">[BANNED]</span>' : '';
      const creationDate = acc.created ? new Date(acc.created).toLocaleDateString() : 'Unknown';
      row.innerHTML = `
            <div style="flex: 1.5; font-weight: bold; color: #fff;" title="${acc.uuid}">${acc.username} ${isBannedStr}</div>
            <div style="flex: 1.5; color: #aaa;" title="Email">${acc.email || 'N/A'}</div>
            <div style="flex: 1; color: #aaa;" title="Last IP">${acc.lastIp || 'Unknown'}</div>
            <div style="flex: 1.2; color: #aaa;" title="Account Age">${creationDate}</div>
            <div style="flex: 0.8; color: #aaa;" title="Total Characters">${(acc.characters || []).length}</div>
            <button class="btn-edit btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;">Edit</button>
        `;
      row.querySelector('.btn-edit').onclick = () => {
        this.engine.network.sendAdminRequestAccount(acc.uuid);
      };
      list.appendChild(row);
    });
  }

  save() {
    if (!this.targetName) return;
    const updates = {
      level: parseInt(document.getElementById('pm-level').value, 10) || 1,
      currency: parseInt(document.getElementById('pm-currency').value, 10) || 0,
      integrity: parseInt(document.getElementById('pm-integrity').value, 10) || 0,
      maxHp: parseInt(document.getElementById('pm-maxhp').value, 10) || 1000,
      maxEnergy: parseInt(document.getElementById('pm-maxenergy').value, 10) || 1000,
      maxSynthEnergy: parseInt(document.getElementById('pm-maxsynth').value, 10) || 1000,
      unspentPowerPicks: parseInt(document.getElementById('pm-power-picks').value, 10) || 0,
      unspentPowersetPicks: parseInt(document.getElementById('pm-powerset-picks').value, 10) || 0,
      powersets: document.getElementById('pm-powersets').value.split(',').map(s => s.trim()).filter(Boolean),
      powers: document.getElementById('pm-powers').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    this.engine.network.sendAdminUpdatePlayer(this.targetName, updates);
  }

  openAccountManager(accData) {
    document.getElementById('am-uuid').value = accData.uuid;
    document.getElementById('am-username').value = accData.username;
    document.getElementById('am-email').value = accData.email || 'N/A';
    this.currentAccountIsBanned = !!accData.isBanned;

    const btn = document.getElementById('btn-am-ban-toggle');
    btn.innerText = this.currentAccountIsBanned ? 'Yes' : 'No';
    if (this.currentAccountIsBanned) btn.classList.add('b-btn-danger');
    else btn.classList.remove('b-btn-danger');

    document.getElementById('btn-am-unban').style.display = this.currentAccountIsBanned ? 'block' : 'none';
    document.getElementById('am-ban-reason').value = accData.banReason || '';

    const charList = document.getElementById('am-char-list');
    charList.innerHTML = '';
    if (accData.characters && accData.characters.length > 0) {
      accData.characters.forEach(c => {
        const name = typeof c === 'object' ? c.name : c;
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); border-radius: 3px;';
        row.innerHTML = `
                    <span style="color: #fff; font-weight: bold;">${name}</span>
                    <button class="b-btn btn-secondary btn-edit-char" style="padding: 2px 8px; font-size: 0.7rem; border-color: #e056fd; color: #e056fd;" title="Edit Character">✎</button>
                `;
        row.querySelector('.btn-edit-char').onclick = () => {
          this.engine.network.sendRequestPlayerData(name);
        };
        charList.appendChild(row);
      });
    } else {
      charList.innerHTML = '<div style="text-align: center; color: #888; font-style: italic;">No characters found.</div>';
    }

    this.accountEditWindow.open();
  }
}
