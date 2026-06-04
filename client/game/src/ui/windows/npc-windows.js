import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class NPCManagerWindow extends BaseWindow {
  constructor() {
    // Options: width 850, center screen, y=100
    super('npc-manager-panel', 'NPC Manager', { width: 850, height: 500, x: window.innerWidth / 2 - 425, y: 100 });

    // Retaining the original ID so your list population scripts don't break
    this.listContainer = document.createElement('div');
    this.listContainer.id = 'npc-manager-list';
    this.listContainer.style.display = 'flex';
    this.listContainer.style.flexDirection = 'column';
    this.listContainer.style.gap = 'var(--spacing-1)';

    this.setContent(this.listContainer);
  }
}

export class NPCEditWindow extends BaseWindow {
  constructor() {
    // Options: width 400, center screen, y=150
    super('npc-edit-modal', 'Edit NPC', { width: 400, x: window.innerWidth / 2 - 200, y: 150 });

    // Programmatically rebuild the form utilizing our new standardized CSS classes
    this.setContent(`
      <input type="hidden" id="edit-npc-uuid">

      <div class="b-input-group">
        <label class="b-label">Name</label>
        <input type="text" id="edit-npc-name" class="b-input">
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">HP (Cur / Max)</label>
          <div class="b-input-row">
            <input type="number" id="edit-npc-hp" class="b-input">
            <input type="number" id="edit-npc-maxhp" class="b-input">
          </div>
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Energy</label>
          <input type="number" id="edit-npc-energy" class="b-input">
        </div>
      </div>

      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="b-label">Location (X, Y, Z)</label>
          <button id="btn-edit-npc-tp-me" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem;">TP to Me</button>
        </div>
        <div class="b-input-row">
          <input type="number" id="edit-npc-x" class="b-input">
          <input type="number" id="edit-npc-y" class="b-input">
          <input type="number" id="edit-npc-z" class="b-input">
        </div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Type</label>
          <select id="edit-npc-type" class="b-select"><option value="idle">Idle</option><option value="trainer">Trainer</option></select>
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Direction</label>
          <select id="edit-npc-dir" class="b-select"><option value="down">Down</option><option value="up">Up</option><option value="left">Left</option><option value="right">Right</option></select>
        </div>
      </div>

      <button id="btn-save-npc-edit" class="b-btn" style="margin-top: 10px;">Save & Close</button>
    `);
  }
}
