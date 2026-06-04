import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class ZoneManagerWindow extends BaseWindow {
  constructor() {
    super('zone-manager-panel', 'Zone Manager', { width: 350, x: 120, y: 120 });

    this.setContent(`
      <div class="b-input-group">
        <label class="b-label">Create New Zone</label>
        <div class="b-input-row">
          <input type="text" id="zm-new-zone-input" class="b-input" placeholder="e.g., sewers" style="flex: 1;">
          <button id="btn-zm-create" class="b-btn">Create</button>
        </div>
      </div>
      <div style="border-top: 1px solid var(--text-dim); margin-top: var(--spacing-1); padding-top: var(--spacing-1);">
        <label class="b-label" style="display: block; margin-bottom: var(--spacing-1);">Available Zones</label>
        <div id="zone-manager-list" style="display: flex; flex-direction: column; gap: var(--spacing-1); max-height: 250px; overflow-y: auto; padding-right: 5px;">
        </div>
      </div>
    `);
  }
}
