export class PlayerModifierUIManager {
    constructor(engine, mainUIManager) {
      this.engine = engine;
      this.ui = mainUIManager;
      this.targetName = null;
      this.currentAccountUuid = null;
      this.setupUI();
    }

    setupUI() {
      let panel = document.getElementById('player-modifier-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'player-modifier-panel';
        document.body.appendChild(panel);
      }
      panel.className = 'dev-panel';
      panel.style.cssText = 'position: absolute; top: 100px; left: 100px; width: 400px; background: rgba(5, 7, 10, 0.95); border: 2px solid #3498db; border-radius: 6px; display: none; flex-direction: column; z-index: 10000; font-family: var(--font-mono); box-shadow: 0 4px 15px rgba(0,0,0,0.8); pointer-events: auto;';

      panel.innerHTML = `
          <div class="dev-panel-header" style="background: rgba(52, 152, 219, 0.2); padding: 8px 10px; border-bottom: 2px solid #3498db; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
            <span style="color: #fff; font-weight: bold; font-size: 0.9rem;">Player Modifier - <span id="pm-target-name">None</span></span>
            <button id="btn-close-player-modifier" style="background: transparent; border: none; color: #fff; cursor: pointer; font-weight: bold; padding: 0 5px;">X</button>
          </div>
          <div style="padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: 500px;">

            <div style="margin-bottom: 5px;">
                <label style="color: #ccc; font-size: 0.8rem;">Account Username</label>
                <input type="text" id="pm-account-username" style="width: 100%; background: #222; color: #aaa; border: 1px solid #444; padding: 5px;" readonly>
            </div>

            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Level</label>
                <input type="number" id="pm-level" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;" min="1">
              </div>
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Currency</label>
                <input type="number" id="pm-currency" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;">
              </div>
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Integrity (%)</label>
                <input type="number" id="pm-integrity" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;" min="-100" max="100">
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Max HP</label>
                <input type="number" id="pm-maxhp" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;">
              </div>
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Max Energy</label>
                <input type="number" id="pm-maxenergy" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;">
              </div>
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Max Synth</label>
                <input type="number" id="pm-maxsynth" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;">
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button id="btn-pm-tp-to" class="btn-secondary" style="flex: 1; border-color: #3498db; color: #3498db;">TP To Player</button>
                <button id="btn-pm-tp-me" class="btn-secondary" style="flex: 1; border-color: #3498db; color: #3498db;">TP To Me</button>
            </div>

            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Unspent Power Picks</label>
                <input type="number" id="pm-power-picks" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;" min="0">
              </div>
              <div style="flex: 1;">
                <label style="color: #ccc; font-size: 0.8rem;">Unspent Powerset Picks</label>
                <input type="number" id="pm-powerset-picks" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px;" min="0">
              </div>
            </div>

            <div>
              <label style="color: #ccc; font-size: 0.8rem;">Known Powersets (Comma Separated IDs)</label>
              <textarea id="pm-powersets" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px; height: 50px; resize: vertical;"></textarea>
            </div>

            <div>
              <label style="color: #ccc; font-size: 0.8rem;">Known Powers (Comma Separated IDs)</label>
              <textarea id="pm-powers" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px; height: 50px; resize: vertical;"></textarea>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 10px; border-top: 1px solid var(--text-dim); padding-top: 15px;">
                <button id="btn-pm-kick" class="btn-secondary" style="flex: 1; border-color: #e74c3c; color: #e74c3c;">Kick Player</button>
                <button id="btn-pm-manage-account" class="btn-secondary" style="flex: 1; border-color: #9b59b6; color: #9b59b6;">Manage Account</button>
            </div>
            <button id="btn-pm-save" class="btn-primary" style="margin-top: 10px; width: 100%;">Save Changes</button>
          </div>
      `;

      this.ui.makeDraggable('player-modifier-panel', '.dev-panel-header');
      document.getElementById('btn-close-player-modifier').onclick = () => panel.style.display = 'none';
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

      // Dynamically inject the Account Manager Modal
      let accPanel = document.getElementById('account-manager-modal');
      if (!accPanel) {
          accPanel = document.createElement('div');
          accPanel.id = 'account-manager-modal';
          document.body.appendChild(accPanel);
      }
      accPanel.className = 'dev-panel';
      accPanel.style.cssText = 'position: absolute; top: 120px; left: 50%; transform: translateX(-50%); width: 500px; background: rgba(5, 7, 10, 0.95); border: 2px solid #9b59b6; border-radius: 6px; display: none; flex-direction: column; z-index: 10005; font-family: var(--font-mono); box-shadow: 0 4px 15px rgba(0,0,0,0.8); pointer-events: auto;';
      accPanel.innerHTML = `
        <div class="dev-panel-header" style="background: rgba(155, 89, 182, 0.2); padding: 8px 10px; border-bottom: 2px solid #9b59b6; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
          <span style="color: #fff; font-weight: bold; font-size: 0.9rem;">Account Manager</span>
          <button id="btn-close-account-manager" style="background: transparent; border: none; color: #fff; cursor: pointer; font-weight: bold; padding: 0 5px;">X</button>
        </div>
        <div style="padding: 15px; display: flex; flex-direction: column; gap: 15px;">
          <div style="display: flex; gap: 5px;">
            <input type="text" id="am-search-input" placeholder="Search by Account Username..." style="flex: 1; background: #111; color: #fff; border: 1px solid #444; padding: 5px; font-family: var(--font-mono); border-radius: 4px;">
            <button id="btn-am-search" class="btn-secondary" style="border-color: #3498db; color: #3498db; padding: 5px 15px;">Search</button>
          </div>
          <div style="border-top: 1px solid var(--text-dim); margin-top: -5px; padding-top: 10px;"></div>
          <input type="hidden" id="am-uuid">
          <div style="display: flex; gap: 10px;">
              <div style="flex: 1;"><label style="color: #ccc; font-size: 0.8rem;">Username</label><input type="text" id="am-username" readonly style="width: 100%; background: #222; color: #aaa; border: 1px solid #444; padding: 5px;"></div>
              <div style="flex: 1;"><label style="color: #ccc; font-size: 0.8rem;">Email</label><input type="text" id="am-email" readonly style="width: 100%; background: #222; color: #aaa; border: 1px solid #444; padding: 5px;"></div>
          </div>
          <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border: 1px solid #e74c3c; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" id="row-am-ban">
              <span style="color: #fff;">Account Banned</span>
              <button id="btn-am-ban-toggle" class="btn-secondary" style="width: 60px;">No</button>
            </div>
            <div style="margin-top: 10px;">
              <label style="color: #ccc; font-size: 0.8rem;">Ban Reason</label>
              <textarea id="am-ban-reason" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px; height: 50px; resize: vertical;"></textarea>
            </div>
          </div>
          <div>
            <label style="color: #ccc; font-size: 0.8rem;">Characters on Account</label>
            <div id="am-char-list" style="max-height: 100px; overflow-y: auto; background: #111; border: 1px solid #444; padding: 5px; border-radius: 4px; display: flex; flex-direction: column; gap: 5px; color: #aaa; font-size: 0.85rem;"></div>
          </div>
          <button id="btn-am-save" class="btn-primary" style="border-color: #9b59b6; color: #9b59b6; background: rgba(155, 89, 182, 0.1);">Save Account Changes</button>
        </div>
      `;
      this.ui.makeDraggable('account-manager-modal', '.dev-panel-header');

      document.getElementById('btn-close-account-manager').onclick = () => accPanel.style.display = 'none';

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
          btn.style.background = this.currentAccountIsBanned ? '#e74c3c' : 'transparent';
          btn.style.color = this.currentAccountIsBanned ? '#fff' : 'var(--text-primary)';
      };
      document.getElementById('btn-am-save').onclick = () => {
          const uuid = document.getElementById('am-uuid').value;
          const reason = document.getElementById('am-ban-reason').value;
          this.engine.network.sendAdminUpdateAccount(uuid, { isBanned: this.currentAccountIsBanned, banReason: reason });
          accPanel.style.display = 'none';
      };
    }

    open(charData) {
      if (!charData) return;
      this.targetName = charData.name;
      this.currentAccountUuid = charData.accountUuid;
      document.getElementById('pm-target-name').innerText = charData.name;
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
      document.getElementById('player-modifier-panel').style.display = 'flex';
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
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-primary)';
      document.getElementById('account-manager-modal').style.display = 'flex';
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
        btn.style.background = this.currentAccountIsBanned ? '#e74c3c' : 'transparent';
        btn.style.color = this.currentAccountIsBanned ? '#fff' : 'var(--text-primary)';

        document.getElementById('am-ban-reason').value = accData.banReason || '';

        const charList = document.getElementById('am-char-list');
        charList.innerHTML = '';
        (accData.characters || []).forEach(c => {
            const name = typeof c === 'object' ? c.name : c;
            const el = document.createElement('div');
            el.innerText = name;
            charList.appendChild(el);
        });

        document.getElementById('account-manager-modal').style.display = 'flex';
    }
  }
