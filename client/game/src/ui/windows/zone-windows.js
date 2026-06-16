import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class ZoneManagerWindow extends BaseWindow {
  constructor() {
    super('zone-manager-panel', 'Zone Manager', { width: 650, height: 450, x: 120, y: 120 });

    this.setContent(`
      <div style="display: flex; gap: 15px; height: 100%;">
        <!-- Left Side: List -->
        <div style="flex: 1; display: flex; flex-direction: column; border-right: 1px solid var(--text-dim); padding-right: 10px;">
          <div class="b-input-group">
            <label class="b-label">Create New Zone</label>
            <div class="b-input-row">
              <input type="text" id="zm-new-zone-input" class="b-input" placeholder="e.g., sewers" style="flex: 1;">
              <button id="btn-zm-create" class="b-btn">Create</button>
            </div>
          </div>
          <label class="b-label" style="display: block; margin-top: 10px; margin-bottom: 5px;">Available Zones</label>
          <div id="zone-manager-list" class="scroll-list" style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1; overflow-y: auto;">
          </div>
        </div>

        <!-- Right Side: Edit Config -->
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 10px;">
          <h3 style="margin: 0; color: var(--accent-neon); font-family: var(--font-header);" id="zm-edit-title">Select a Zone</h3>
          <input type="hidden" id="zm-edit-id">

          <div class="b-input-group">
            <label class="b-label">Zone Display Name</label>
            <input type="text" id="zm-edit-name" class="b-input" placeholder="e.g. The Sewers">
          </div>

          <div class="b-input-group">
            <label class="b-label" title="Awarded automatically upon entering the zone.">Discovery Badge ID (Optional)</label>
            <input type="text" id="zm-edit-badge" class="b-input" placeholder="e.g. exp_sewers">
          </div>

          <div class="b-input-row">
            <div class="b-input-group" style="flex: 1;"><label class="b-label">PvP Mode</label><select id="zm-edit-pvp" class="b-select"><option value="none">Disabled (Safe Zone)</option><option value="faction">Faction vs Faction</option><option value="free">Free for All</option></select></div>
            <div class="b-input-group" style="flex: 1;"><label class="b-label">Weather Lock</label><select id="zm-edit-weather" class="b-select"><option value="auto">Dynamic (Global)</option><option value="clear">Always Clear</option><option value="rain">Always Raining</option><option value="snow">Always Snowing</option></select></div>
          </div>

          <button id="btn-zm-save" class="b-btn btn-primary" style="margin-top: auto;">Save Zone Configuration</button>
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
