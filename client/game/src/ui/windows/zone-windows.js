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

export class NeighborhoodManagerWindow extends BaseWindow {
  constructor() {
    super('neighborhood-manager-panel', 'Neighborhood Manager', { width: 450, x: window.innerWidth / 2 - 225, y: 120 });

    this.setContent(`
      <input type="hidden" id="edit-nh-id">

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 2;"><label class="b-label">Neighborhood Name</label><input type="text" id="edit-nh-name" class="b-input" placeholder="e.g. Neon District"></div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Base Level</label><input type="number" id="edit-nh-level" class="b-input" value="1" min="1"></div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Intensity (1-5)</label><input type="number" id="edit-nh-intensity" class="b-input" min="1" max="5" value="1"></div>
      </div>

      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;"><label class="b-label">Bounds (Min X, Y, Z)</label><button id="btn-nh-set-min" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">Set To Player</button></div>
        <div class="b-input-row">
          <input type="number" id="edit-nh-minx" class="b-input"><input type="number" id="edit-nh-miny" class="b-input"><input type="number" id="edit-nh-minz" class="b-input">
        </div>
      </div>

      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;"><label class="b-label">Bounds (Max X, Y, Z)</label><button id="btn-nh-set-max" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">Set To Player</button></div>
        <div class="b-input-row">
          <input type="number" id="edit-nh-maxx" class="b-input"><input type="number" id="edit-nh-maxy" class="b-input"><input type="number" id="edit-nh-maxz" class="b-input">
        </div>
      </div>

      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label class="b-label" style="margin: 0;">Faction Weights (Total: <span id="nh-faction-total" style="color: #e74c3c;">0</span>%)</label>
            <button id="btn-nh-add-faction" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">+ Add Faction</button>
        </div>
        <div id="nh-factions-list" style="display: flex; flex-direction: column; gap: 5px; max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius);"></div>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 10px; margin-top: 10px;">
        <button id="btn-save-nh" class="b-btn btn-primary" style="flex: 1;">Save</button>
        <button id="btn-new-nh" class="b-btn btn-secondary" style="flex: 1; border-color: #2ecc71; color: #2ecc71;">Clear Form / New</button>
      </div>

      <div style="border-top: 1px solid var(--text-dim); padding-top: 10px;">
        <label class="b-label">Active Neighborhoods</label>
        <div id="nh-manager-list" style="display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto;"></div>
      </div>
    `);
  }
}
