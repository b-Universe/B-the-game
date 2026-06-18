import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class PowerEditorWindow extends BaseWindow {
  constructor() {
    super('power-editor-panel', 'Power Customization Engine', { width: 1200, height: '85vh', x: window.innerWidth / 2 - 600, y: 50 });

    this.setContent(`
      <div class="power-editor-layout" style="display: flex; flex-direction: column; height: 100%; box-sizing: border-box; gap: 10px;">
        <div style="display: flex; flex: 1; gap: 15px; min-height: 0;">
          <!-- Left Panel: Library/Roster -->
          <div class="pe-col pe-roster" style="max-width: 300px; flex: 1; display: flex; flex-direction: column; height: 100%;">
          <button id="btn-pe-create-new" class="b-btn" style="margin-bottom: 10px; border-color: #e67e22; color: #e67e22; background: rgba(230, 126, 34, 0.1);">+ Create New Power</button>
          <input type="text" id="pe-search" placeholder="Search powers..." class="b-input" style="margin-bottom: 10px;">
          <select id="pe-filter-powerset" class="b-select" style="margin-bottom: 10px;">
            <option value="all">All Powersets</option>
          </select>
          <div id="pe-power-list" class="scroll-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; padding-right: 5px;">
          </div>
        </div>

          <!-- Right Column: Editor & Preview -->
          <div style="flex: 3; display: flex; flex-direction: column; gap: 15px; height: 100%; min-width: 0;">
            <!-- Row 1: Stats & Configuration -->
            <div class="pe-col pe-editor" style="flex: 2; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column;">
          <div class="pe-editor-section">
            <h4 class="pe-section-title">General</h4>
            <div style="display: flex; gap: 15px;">
              <div style="flex: 1;">
                <div style="display: flex; gap: 15px;">
                  <div class="pe-input-row" style="flex: 1;">
                    <label>Power ID (Internal)</label>
                    <input type="text" id="pe-id" placeholder="e.g. plasma_burst" class="b-input">
                  </div>
                  <div class="pe-input-row" style="flex: 1;">
                    <label>Display Name</label>
                    <input type="text" id="pe-name" placeholder="Power Name" class="b-input">
                  </div>
                </div>
                <div class="pe-input-row">
                  <label>Description</label>
                  <textarea id="pe-desc" rows="2" class="b-input" style="resize: vertical;"></textarea>
                </div>
                <div class="pe-input-row">
                  <label>Power Type</label>
                  <select id="pe-power-type" class="b-select">
                    <option value="Click">Click</option><option value="Targeted">Targeted</option>
                    <option value="Targeted AoE">Targeted AoE</option><option value="PBAoE">PBAoE</option><option value="Toggle">Toggle</option>
                            <option value="Passive">Passive</option>
                    <option value="Summon">Summon</option><option value="Targeted Summon">Targeted Summon</option>
                  </select>
                </div>
                <div class="pe-input-row">
                  <label>Custom Engine Script (Advanced)</label>
                  <input type="text" id="pe-engine-script" placeholder="e.g. teleport, brawl, flashlight" class="b-input">
                </div>
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                <div class="pe-input-row" style="flex: 1; display: flex; flex-direction: column; margin-bottom: 0;">
                  <label>Assigned Powersets (Multi-select)</label>
                  <div id="pe-assigned-powersets" class="scroll-list" style="flex-grow: 1; max-height: 150px; overflow-y: auto; border: 1px solid var(--text-dim); padding: 5px; background: rgba(0,0,0,0.3); display: grid; grid-template-columns: 1fr; gap: 5px; font-family: var(--font-mono); font-size: 0.8rem; color: #ccc; align-content: start; border-radius: var(--border-radius);">
                  </div>
                </div>
                <div class="pe-input-row" style="flex: 1; display: flex; flex-direction: column; margin-bottom: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <label style="margin: 0;">Inherited Powers</label>
                    <button id="btn-pe-add-inherited" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; height: auto;">+ Add</button>
                  </div>
                  <div id="pe-inherited-powers-list" class="scroll-list" style="flex-grow: 1; min-height: 80px; max-height: 150px; overflow-y: auto; border: 1px solid var(--text-dim); padding: 5px; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 5px;"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="pe-editor-section">
            <h4 class="pe-section-title">Base Properties</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="pe-input-row" style="grid-column: span 2;"><label>Unlock Tier (Order)</label><input type="number" id="pe-stat-tier" class="b-input" min="0" step="1" value="1"></div>
              <div class="pe-input-row"><label>Recharge Rate (s)</label><input type="number" id="pe-stat-rech" class="b-input" min="0" step="0.5" value="1.0"></div>
              <div class="pe-input-row"><label>Activation Time (s)</label><input type="number" id="pe-stat-activation" class="b-input" min="0" step="0.1" value="0.5"></div>
              <div class="pe-input-row"><label>Energy Cast Cost</label><input type="number" id="pe-stat-ener-cast" class="b-input" min="0" step="1" value="10"></div>
              <div class="pe-input-row"><label>Energy Cost/s (Toggle)</label><input type="number" id="pe-stat-ener-cost" class="b-input" min="0" step="1" value="5"></div>
              <div class="pe-input-row"><label>Battery Cast Cost</label><input type="number" id="pe-stat-battery-cast" class="b-input" min="0" step="1" value="0"></div>
              <div class="pe-input-row"><label>Battery Cost/s (Toggle)</label><input type="number" id="pe-stat-battery-cost" class="b-input" min="0" step="1" value="0"></div>
              <div class="pe-input-row"><label>Recovery Rate/s (Passive)</label><input type="number" id="pe-stat-recovery" class="b-input" min="0" step="0.5" value="0"></div>
              <div class="pe-input-row"><label>Battery Recovery/s (Passive)</label><input type="number" id="pe-stat-battery-recovery" class="b-input" min="0" step="0.5" value="0"></div>
              <div class="pe-input-row"><label>Range (units)</label><input type="number" id="pe-stat-range" class="b-input" min="0" step="50" value="200"></div>
              <div class="pe-input-row"><label>AoE Radius (units)</label><input type="number" id="pe-stat-aoe" class="b-input" min="0" step="10" value="0"></div>
              <div class="pe-input-row"><label>Cone Radius (degrees)</label><input type="number" id="pe-stat-cone" class="b-input" min="0" max="360" step="5" value="45"></div>
              <div class="pe-input-row"><label>Targeted Accuracy %</label><input type="number" id="pe-stat-accuracy" class="b-input" min="0" max="100" step="1" value="85"></div>
              <div class="pe-input-row"><label>Crit Chance (%)</label><input type="number" id="pe-stat-crit-chance" class="b-input" min="0" max="100" step="1" value="5"></div>
              <div class="pe-input-row"><label>Crit Multiplier (x)</label><input type="number" id="pe-stat-crit-mult" class="b-input" min="1" step="0.1" value="1.5"></div>
            </div>
          </div>

          <div class="pe-editor-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 class="pe-section-title" style="margin: 0;">Effects Engine</h4>
              <button id="btn-pe-add-effect" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; height: auto;">+ Add Effect</button>
            </div>
            <div id="pe-effects-list" class="pe-dynamic-list-container"></div>
          </div>

          <div class="pe-editor-section">
            <h4 class="pe-section-title">Visuals</h4>
            <div style="display: flex; gap: 15px; align-items: flex-end;">
              <div class="pe-input-row" style="flex: 1;"><label>Integrity Tint</label><input type="color" id="pe-visual-tint" value="#ffffff" style="width: 100%; background: transparent; border: 1px solid var(--text-dim); border-radius: var(--border-radius); cursor: pointer; height: 35px; min-height: 32px; min-width: 32px; padding: 0; box-sizing: border-box;"></div>
              <div class="pe-input-row" style="flex: 2;"><label>Icon Path</label><input type="text" id="pe-visual-icon" placeholder="assets/icons/..." class="b-input"></div>
            </div>
            <div class="pe-input-row" style="margin-top: 10px;">
              <label>Player Animation</label>
              <select id="pe-visual-anim" class="b-select">
                <option value="none">No Animation</option>
                <option value="idle">Idle (Hold)</option>
                <option value="attack1">Melee Strike (Right Hand)</option>
                <option value="attack2">Melee Strike (Left Hand)</option>
                <option value="throw-attack1">Throw / Ranged Cast</option>
              </select>
            </div>
          </div>

          <div class="pe-editor-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><h4 class="pe-section-title" style="margin: 0;">Caster Visuals</h4><button id="btn-pe-add-caster-visual" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; height: auto;">+ Add Sprite Event</button></div>
            <div id="pe-caster-visuals-list" class="pe-dynamic-list-container"></div>
          </div>

          <div class="pe-editor-section" id="pe-section-projectile">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><h4 class="pe-section-title" style="margin: 0;">Projectile Visuals</h4><button id="btn-pe-add-projectile-visual" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; height: auto;">+ Add Sprite Event</button></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;" id="pe-proj-settings-container">
              <div class="pe-input-row"><label>Speed (units/sec)</label><input type="number" id="pe-proj-speed" class="b-input" value="400"></div>
              <div class="pe-input-row"><label>Arc (0-1)</label><input type="number" id="pe-proj-arc" class="b-input" value="0" step="0.1" min="0" max="1"></div>
            </div>
            <div id="pe-projectile-visuals-list" class="pe-dynamic-list-container"></div>
          </div>

          <div class="pe-editor-section" id="pe-section-target">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><h4 class="pe-section-title" style="margin: 0;">Target Visuals</h4><button id="btn-pe-add-target-visual" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; height: auto;">+ Add Sprite Event</button></div>
            <div id="pe-target-visuals-list" class="pe-dynamic-list-container"></div>
          </div>

            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 5px; flex-shrink: 0;">
          <button id="btn-pe-save" class="b-btn" style="border-color: #2ecc71; color: #2ecc71; background: rgba(46, 204, 113, 0.1); height: 40px; font-size: 1.1rem; flex: 3;">Commit To Server</button>
          <button id="btn-pe-delete" class="b-btn" style="border-color: #e74c3c; color: #e74c3c; background: rgba(231, 76, 60, 0.1); height: 40px; font-size: 1.1rem; flex: 1; display: none;">Delete Power</button>
        </div>
      </div>
    `);
  }
}
