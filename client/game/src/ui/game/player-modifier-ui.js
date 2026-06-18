import { PlayerModifierWindow, AccountManagerWindow, AccountEditWindow } from '../windows/player-windows.js?v=cache-bust-005';
import { UI_COLORS } from './constants.js?v=cache-bust-005';

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
    const pwEl = this.playerWindow.element;
    const amEl = this.accountWindow.element;
    const aeEl = this.accountEditWindow.element;

    pwEl.querySelector('#btn-pm-save').onclick = () => this.save();

    pwEl.querySelector('#btn-pm-kick').onclick = () => {
      if (confirm(`Kick ${this.targetName}?`)) {
        this.engine.network.sendAdminKickPlayer(this.targetName);
      }
    };
    pwEl.querySelector('#btn-pm-tp-to').onclick = () => {
      const pData = this.allPlayersList?.find(p => p.name === this.targetName);
      if (pData) {
        this.engine.network.sendAdminTeleport({ targetName: this.engine.playerData.name, x: pData.x, y: pData.y, z: pData.z, zone: pData.zone || 'untitled' });
      }
    };
    pwEl.querySelector('#btn-pm-tp-me').onclick = () => {
      this.engine.network.sendAdminTeleport({ targetName: this.targetName, x: this.engine.player.x, y: this.engine.player.y, z: this.engine.player.z, zone: this.engine.currentZone || 'untitled' });
    };
    pwEl.querySelector('#btn-pm-manage-account').onclick = () => {
      if (this.currentAccountUuid) {
        this.engine.network.sendAdminRequestAccount(this.currentAccountUuid);
      } else {
        this.ui.showSystemMessage('Cannot find account UUID for this player.');
      }
    };

    pwEl.querySelector('#btn-pm-grant').onclick = () => {
      const perm = pwEl.querySelector('#pm-permission-input').value.trim();
      if (perm && this.targetName) {
        this.engine.network.socket.emit('admin_grant_permission', { targetName: this.targetName, permission: perm, revoke: false });
        pwEl.querySelector('#pm-permission-input').value = '';
        setTimeout(() => this.updatePermissionsDisplay(), 250);
      }
    };
    pwEl.querySelector('#btn-pm-revoke').onclick = () => {
      const perm = pwEl.querySelector('#pm-permission-input').value.trim();
      if (perm && this.targetName) {
        this.engine.network.socket.emit('admin_grant_permission', { targetName: this.targetName, permission: perm, revoke: true });
        pwEl.querySelector('#pm-permission-input').value = '';
        setTimeout(() => this.updatePermissionsDisplay(), 250);
      }
    };

      pwEl.querySelector('#btn-pm-add-powerset').onclick = () => this.showAddModal('powerset');
      pwEl.querySelector('#btn-pm-add-power').onclick = () => this.showAddModal('power');

    amEl.querySelector('#am-search-input').addEventListener('input', () => this.renderAccountManagerList());

    aeEl.querySelector('#btn-am-ban-toggle').onclick = () => {
      this.currentAccountIsBanned = !this.currentAccountIsBanned;
      const btn = aeEl.querySelector('#btn-am-ban-toggle');
      btn.innerText = this.currentAccountIsBanned ? 'Yes' : 'No';
      btn.classList.toggle('b-btn-danger', this.currentAccountIsBanned);
    };
    aeEl.querySelector('#btn-am-unban').onclick = () => {
      const uuid = aeEl.querySelector('#am-uuid').value;
      this.engine.network.sendAdminUpdateAccount(uuid, { isBanned: false });
      this.currentAccountIsBanned = false;
      const btnToggle = aeEl.querySelector('#btn-am-ban-toggle');
      btnToggle.innerText = 'No';
      btnToggle.classList.remove('b-btn-danger');
      aeEl.querySelector('#btn-am-unban').style.display = 'none';
      this.engine.network.sendAdminRequestAllAccounts();
      this.ui.showSystemMessage('Account unbanned instantly. (Reason preserved)');
    };
    aeEl.querySelector('#btn-am-save').onclick = () => {
      const uuid = aeEl.querySelector('#am-uuid').value;
      const reason = aeEl.querySelector('#am-ban-reason').value;
      const currency = parseInt(aeEl.querySelector('#am-currency').value, 10) || 0;
      this.engine.network.sendAdminUpdateAccount(uuid, { isBanned: this.currentAccountIsBanned, banReason: reason, currency: currency });
      this.accountEditWindow.close();
      this.engine.network.sendAdminRequestAllAccounts();
    };
  }

  showAddModal(type) {
    let optionsHtml = '';
    if (type === 'powerset') {
      const psets = Object.values(this.engine.powersetsData || {}).sort((a,b) => a.name.localeCompare(b.name));
      optionsHtml = psets.map(ps => `<option value="${ps.id}">${ps.name} (${ps.id})</option>`).join('');
    } else {
      let powersObj = {};
      if (window.POWER_REGISTRY) powersObj = window.POWER_REGISTRY;
      const powers = Object.keys(powersObj).map(k => ({id: k, ...powersObj[k]})).sort((a,b) => (a.name||a.id).localeCompare(b.name||b.id));
      optionsHtml = powers.map(p => `<option value="${p.id}">${p.name||p.id} (${p.id})</option>`).join('');
    }
    const title = type === 'powerset' ? 'Add Powerset' : 'Add Power';
    
    const modalHtml = `
      <div id="pm-add-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
        <div style="background: var(--bg-dark); padding: 20px; border: 1px solid var(--border-dark); border-radius: 5px; width: 400px; max-width: 90%; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
          <h3 style="margin-top: 0; margin-bottom: 15px; color: var(--text-light); font-size: 1.1rem; text-transform: uppercase;">${title}</h3>
          <select id="pm-add-select" class="b-select" style="width: 100%; margin-bottom: 15px;">
            ${optionsHtml}
          </select>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="pm-add-cancel" class="b-btn" style="flex: 1;">Cancel</button>
            <button id="pm-add-confirm" class="b-btn" style="background: rgba(46, 204, 113, 0.2); border-color: #2ecc71; color: #2ecc71; flex: 1;">Add</button>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
    
    document.getElementById('pm-add-cancel').onclick = () => div.remove();
    document.getElementById('pm-add-confirm').onclick = () => {
      const val = document.getElementById('pm-add-select').value;
      if (val) {
        if (type === 'powerset') {
          if (!this.currentPowersets.includes(val)) this.currentPowersets.push(val);
          this.renderTagList('pm-powersets-list', 'pm-powersets', this.currentPowersets);
        } else {
          if (!this.currentPowers.includes(val)) this.currentPowers.push(val);
          this.renderTagList('pm-powers-list', 'pm-powers', this.currentPowers);
        }
      }
      div.remove();
    };
  }

  renderTagList(containerId, hiddenInputId, dataArray) {
    const container = this.playerWindow.element.querySelector('#' + containerId);
    const hidden = this.playerWindow.element.querySelector('#' + hiddenInputId);
    if (!container || !hidden) return;
    
    hidden.value = dataArray.join(',');
    container.innerHTML = '';
    
    dataArray.forEach((id, idx) => {
      const tag = document.createElement('div');
      tag.style.cssText = 'background: rgba(52, 152, 219, 0.3); border: 1px solid #3498db; border-radius: 3px; padding: 2px 6px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;';
      const name = window.POWER_REGISTRY && window.POWER_REGISTRY[id] ? window.POWER_REGISTRY[id].name : (this.engine.powersetsData && this.engine.powersetsData[id] ? this.engine.powersetsData[id].name : id);
      tag.innerHTML = `<span title="${id}">${name}</span> <span class="pm-tag-remove" style="cursor: pointer; color: #e74c3c; font-weight: bold; padding: 0 4px;">&times;</span>`;
      tag.querySelector('.pm-tag-remove').onclick = () => {
        dataArray.splice(idx, 1);
        this.renderTagList(containerId, hiddenInputId, dataArray);
      };
      container.appendChild(tag);
    });
  }

  updatePermissionsDisplay() {
    if (!this.targetName || !this.engine.permissions) return;
    const targetLower = this.targetName.toLowerCase();
    const perms = [];
    for (const [node, users] of Object.entries(this.engine.permissions)) {
      if (users.includes(targetLower)) perms.push(node);
    }
    this.playerWindow.element.querySelector('#pm-permissions-list').innerText = perms.length > 0 ? perms.join(', ') : 'None';
  }

  open(charData) {
    if (!charData) return;
    this.targetName = charData.name;
    this.currentAccountUuid = charData.accountUuid;
    this.playerWindow.setTitle(`Player Modifier - ${charData.name}`);
    const pw = this.playerWindow.element;

    pw.querySelector('#pm-account-username').value = charData.accountUsername || 'N/A';
    pw.querySelector('#pm-level').value = charData.level || 1;
    pw.querySelector('#pm-integrity').value = charData.integrity || 0;
    pw.querySelector('#pm-maxhp').value = charData.stats?.maxHp || 1000;
    pw.querySelector('#pm-maxenergy').value = charData.stats?.maxEnergy || 1000;
    pw.querySelector('#pm-maxsynth').value = charData.stats?.maxSynthEnergy || 1000;
    pw.querySelector('#pm-power-picks').value = charData.unspentPowerPicks || 0;
    const psPicksRaw = charData.unspentPowersetPicks;
    pw.querySelector('#pm-powerset-picks').value = Array.isArray(psPicksRaw) ? psPicksRaw.length : (typeof psPicksRaw === 'number' ? psPicksRaw : 0);
    
    this.currentPowersets = charData.powersets ? [...charData.powersets] : [];
    this.currentPowers = charData.powers ? [...charData.powers] : [];
    this.renderTagList('pm-powersets-list', 'pm-powersets', this.currentPowersets);
    this.renderTagList('pm-powers-list', 'pm-powers', this.currentPowers);
    
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
    const list = this.accountWindow.element.querySelector('#account-manager-list');
    if (!list) return;
    list.innerHTML = '';

    const searchVal = this.accountWindow.element.querySelector('#am-search-input')?.value.toLowerCase() || '';
    const filtered = this.allAccountsList.filter(a => a.username.toLowerCase().includes(searchVal) || (a.email && a.email.toLowerCase().includes(searchVal)));
    filtered.sort((a, b) => a.username.localeCompare(b.username));

    filtered.forEach(acc => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); padding: 8px; border-radius: 4px; font-size: 0.8rem;';
      const isBannedStr = acc.isBanned ? `<span style="color: ${UI_COLORS.error}; font-weight: bold;">[BANNED]</span>` : '';
      const creationDate = acc.created ? new Date(acc.created).toLocaleDateString() : 'Unknown';
      row.innerHTML = `
            <div style="flex: 1.5; font-weight: bold; color: #fff;" title="${acc.uuid}">${acc.username} ${isBannedStr}</div>
            <div style="flex: 1.5; color: #aaa;" title="Email">${acc.email || 'N/A'}</div>
            <div style="flex: 1; color: #aaa;" title="Last IP">${acc.lastIp || 'Unknown'}</div>
            <div style="flex: 1.2; color: #aaa;" title="Account Age">${creationDate}</div>
            <div style="flex: 0.8; color: #f1c40f;" title="Account Level">${acc.totalLevel || 0}</div>
            <div style="flex: 0.8; color: #2ecc71;" title="Currency">$${(acc.currency || 0).toLocaleString()}</div>
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
    const pw = this.playerWindow.element;
    const updates = {
      level: parseInt(pw.querySelector('#pm-level').value, 10) || 1,
      integrity: parseInt(pw.querySelector('#pm-integrity').value, 10) || 0,
      maxHp: parseInt(pw.querySelector('#pm-maxhp').value, 10) || 1000,
      maxEnergy: parseInt(pw.querySelector('#pm-maxenergy').value, 10) || 1000,
      maxSynthEnergy: parseInt(pw.querySelector('#pm-maxsynth').value, 10) || 1000,
      unspentPowerPicks: parseInt(pw.querySelector('#pm-power-picks').value, 10) || 0,
      unspentPowersetPicks: parseInt(pw.querySelector('#pm-powerset-picks').value, 10) || 0,
      powersets: this.currentPowersets || [],
      powers: this.currentPowers || []
    };
    this.engine.network.sendAdminUpdatePlayer(this.targetName, updates);
  }

  openAccountManager(accData) {
    const ae = this.accountEditWindow.element;
    ae.querySelector('#am-uuid').value = accData.uuid;
    ae.querySelector('#am-username').value = accData.username;
    ae.querySelector('#am-email').value = accData.email || 'N/A';
    ae.querySelector('#am-currency').value = accData.currency || 0;
    this.currentAccountIsBanned = !!accData.isBanned;

    const btn = ae.querySelector('#btn-am-ban-toggle');
    btn.innerText = this.currentAccountIsBanned ? 'Yes' : 'No';
    if (this.currentAccountIsBanned) btn.classList.add('b-btn-danger');
    else btn.classList.remove('b-btn-danger');

    ae.querySelector('#btn-am-unban').style.display = this.currentAccountIsBanned ? 'block' : 'none';
    ae.querySelector('#am-ban-reason').value = accData.banReason || '';

    const charList = ae.querySelector('#am-char-list');
    charList.innerHTML = '';
    if (accData.characters && accData.characters.length > 0) {
      accData.characters.forEach(c => {
        const name = typeof c === 'object' ? c.name : c;
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); border-radius: 3px;';
        row.innerHTML = `
                    <span style="color: #fff; font-weight: bold;">${name}</span>
                    <button class="b-btn btn-secondary btn-edit-char" style="padding: 2px 8px; font-size: 0.7rem; border-color: ${UI_COLORS.pink}; color: ${UI_COLORS.pink};" title="Edit Character">✎</button>
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
