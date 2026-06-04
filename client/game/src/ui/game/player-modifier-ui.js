import { PlayerModifierWindow, AccountManagerWindow } from '../windows/player-windows.js?v=cache-bust-005';

export class PlayerModifierUIManager {
    constructor(engine, mainUIManager) {
      this.engine = engine;
      this.ui = mainUIManager;
      this.targetName = null;
      this.currentAccountUuid = null;

      this.playerWindow = new PlayerModifierWindow();
      this.accountWindow = new AccountManagerWindow();

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
          const op = Object.values(this.engine.otherPlayers).find(p => p.name === this.targetName);
          if (op) {
             this.engine.network.sendAdminTeleport({ targetName: this.engine.playerData.name, x: op.x, y: op.y, z: op.z });
          }
      };
      document.getElementById('btn-pm-tp-me').onclick = () => {
          this.engine.network.sendAdminTeleport({ targetName: this.targetName, x: this.engine.player.x, y: this.engine.player.y, z: this.engine.player.z });
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

      document.getElementById('btn-am-search').onclick = () => {
          const searchVal = document.getElementById('am-search-input').value.trim();
          if (searchVal) {
              this.engine.network.sendAdminRequestAccountByUsername(searchVal);
          }
      };
      document.getElementById('row-am-ban').onclick = () => {
          this.currentAccountIsBanned = !this.currentAccountIsBanned;
          const btn = document.getElementById('btn-am-ban-toggle');
          btn.innerText = this.currentAccountIsBanned ? 'Yes' : 'No';
          btn.classList.toggle('b-btn-danger', this.currentAccountIsBanned);
      };
      document.getElementById('btn-am-save').onclick = () => {
          const uuid = document.getElementById('am-uuid').value;
          const reason = document.getElementById('am-ban-reason').value;
          this.engine.network.sendAdminUpdateAccount(uuid, { isBanned: this.currentAccountIsBanned, banReason: reason });
          this.accountWindow.close();
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

    openEmptyAccountManager() {
      document.getElementById('am-search-input').value = '';
      document.getElementById('am-uuid').value = '';
      document.getElementById('am-username').value = '';
      document.getElementById('am-email').value = '';
      document.getElementById('am-ban-reason').value = '';
      document.getElementById('am-char-list').innerHTML = '';

      this.currentAccountIsBanned = false;
      const btn = document.getElementById('btn-am-ban-toggle');
      btn.innerText = 'No';
      btn.classList.remove('b-btn-danger');

      this.accountWindow.open();
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

        document.getElementById('am-ban-reason').value = accData.banReason || '';

        const charList = document.getElementById('am-char-list');
        charList.innerHTML = '';
        (accData.characters || []).forEach(c => {
            const name = typeof c === 'object' ? c.name : c;
            const el = document.createElement('div');
            el.innerText = name;
            charList.appendChild(el);
        });

        this.accountWindow.open();
    }
  }
