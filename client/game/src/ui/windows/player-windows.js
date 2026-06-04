import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class PlayerModifierWindow extends BaseWindow {
  constructor() {
    super('player-modifier-panel', 'Player Modifier', { width: 450, x: window.innerWidth / 2 - 225, y: 100 });

    this.setContent(`
      <div class="b-input-group">
          <label class="b-label">Account Username</label>
          <input type="text" id="pm-account-username" class="b-input" readonly>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Level</label>
          <input type="number" id="pm-level" class="b-input" min="1">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Currency</label>
          <input type="number" id="pm-currency" class="b-input">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Integrity (%)</label>
          <input type="number" id="pm-integrity" class="b-input" min="-100" max="100">
        </div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Max HP</label>
          <input type="number" id="pm-maxhp" class="b-input">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Max Energy</label>
          <input type="number" id="pm-maxenergy" class="b-input">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Max Synth</label>
          <input type="number" id="pm-maxsynth" class="b-input">
        </div>
      </div>

      <div class="b-input-row" style="margin-bottom: var(--spacing-1);">
          <button id="btn-pm-tp-to" class="b-btn" style="flex: 1;">TP To Player</button>
          <button id="btn-pm-tp-me" class="b-btn" style="flex: 1;">TP To Me</button>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Unspent Power Picks</label>
          <input type="number" id="pm-power-picks" class="b-input" min="0">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Unspent Powerset Picks</label>
          <input type="number" id="pm-powerset-picks" class="b-input" min="0">
        </div>
      </div>

      <div class="b-input-group">
        <label class="b-label">Known Powersets (Comma Separated IDs)</label>
        <textarea id="pm-powersets" class="b-input" style="height: 50px; resize: vertical;"></textarea>
      </div>

      <div class="b-input-group">
        <label class="b-label">Known Powers (Comma Separated IDs)</label>
        <textarea id="pm-powers" class="b-input" style="height: 50px; resize: vertical;"></textarea>
      </div>

      <div class="b-input-row" style="margin-top: 10px; border-top: 1px solid var(--text-dim); padding-top: 15px;">
          <button id="btn-pm-kick" class="b-btn b-btn-danger" style="flex: 1;">Kick Player</button>
          <button id="btn-pm-manage-account" class="b-btn" style="flex: 1; border-color: var(--rainbow-purple); color: var(--rainbow-purple);">Manage Account</button>
      </div>

      <div style="margin-top: 10px; background: rgba(52, 152, 219, 0.1); padding: 10px; border: 1px solid #3498db; border-radius: var(--border-radius);">
        <label class="b-label" style="font-weight: bold;">Global Permissions</label>
        <div id="pm-permissions-list" style="margin-top: 5px; margin-bottom: 10px; font-size: 0.85rem; color: #f1c40f; word-wrap: break-word; min-height: 18px;">None</div>
        <div class="b-input-row">
            <input type="text" id="pm-permission-input" placeholder="e.g., dev, tp, npc" class="b-input" style="flex: 1; border-color: #3498db;">
            <button id="btn-pm-grant" class="b-btn b-btn-success" style="padding: 5px 10px;">Grant</button>
            <button id="btn-pm-revoke" class="b-btn b-btn-danger" style="padding: 5px 10px;">Revoke</button>
        </div>
      </div>

      <button id="btn-pm-save" class="b-btn" style="margin-top: 10px; width: 100%;">Save Changes</button>
    `);
  }

  setTitle(newTitle) {
    const titleEl = this.element.querySelector('.b-window-title');
    if (titleEl) titleEl.innerText = newTitle;
  }
}

export class AccountManagerWindow extends BaseWindow {
  constructor() {
    super('account-manager-modal', 'Account Manager', { width: 500, x: window.innerWidth / 2 - 250, y: 120 });

    this.setContent(`
      <div class="b-input-row" style="margin-bottom: var(--spacing-2);">
        <input type="text" id="am-search-input" class="b-input" placeholder="Search by Account Username..." style="flex: 1;">
        <button id="btn-am-search" class="b-btn">Search</button>
      </div>

      <div style="border-top: 1px solid var(--text-dim); margin-bottom: var(--spacing-1);"></div>

      <input type="hidden" id="am-uuid">

      <div class="b-input-row">
          <div class="b-input-group" style="flex: 1;"><label class="b-label">Username</label><input type="text" id="am-username" class="b-input" readonly></div>
          <div class="b-input-group" style="flex: 1;"><label class="b-label">Email</label><input type="text" id="am-email" class="b-input" readonly></div>
      </div>

      <div style="background: rgba(231, 76, 60, 0.1); padding: var(--spacing-2); border: 1px solid var(--rainbow-red); border-radius: var(--border-radius); margin-bottom: var(--spacing-1);">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" id="row-am-ban">
          <span style="color: #fff; font-family: var(--font-header);">Account Banned</span>
          <button id="btn-am-ban-toggle" class="b-btn" style="width: 60px;">No</button>
        </div>
        <div class="b-input-group" style="margin-top: var(--spacing-1);">
          <label class="b-label">Ban Reason</label>
          <textarea id="am-ban-reason" class="b-input" style="height: 50px; resize: vertical;"></textarea>
        </div>
      </div>

      <div class="b-input-group" style="flex: 1;">
        <label class="b-label">Characters on Account</label>
        <div id="am-char-list" style="flex: 1; max-height: 100px; overflow-y: auto; background: var(--bg-input); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 5px; color: var(--text-dim); font-size: 0.85rem; font-family: var(--font-mono);"></div>
      </div>

      <button id="btn-am-save" class="b-btn" style="border-color: var(--rainbow-purple); color: var(--rainbow-purple); margin-top: auto;">Save Account Changes</button>
    `);
  }
}

export class PlayerManagerWindow extends BaseWindow {
  constructor() {
    super('player-manager-panel', 'Player Manager', { width: 850, height: 600, x: window.innerWidth / 2 - 425, y: 100 });

    this.setContent(`
        <div class="b-input-group" style="margin-bottom: 0; flex-shrink: 0;">
            <input type="text" id="pm-search-input" class="b-input" placeholder="Search characters...">
        </div>
        <div id="player-manager-list" style="flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; padding-right: 5px;"></div>
    `);
  }
}
