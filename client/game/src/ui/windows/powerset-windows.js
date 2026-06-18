import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class PowersetEditorWindow extends BaseWindow {
  constructor() {
    super('powerset-editor-panel', 'Powerset Customization Engine', { width: 800, height: '70vh', x: window.innerWidth / 2 - 400, y: 100 });

    this.setContent(`
      <div class="power-editor-layout" style="display: flex; flex-direction: column; height: 100%; box-sizing: border-box; gap: 10px;">
        <div style="display: flex; flex: 1; gap: 15px; min-height: 0;">
          <!-- Left Panel: Library/Roster -->
          <div class="pe-col pe-roster" style="width: 250px; display: flex; flex-direction: column; height: 100%;">
            <button id="btn-pse-create-new" class="b-btn" style="margin-bottom: 10px; border-color: #e67e22; color: #e67e22; background: rgba(230, 126, 34, 0.1);">+ Create New Powerset</button>
            <input type="text" id="pse-search" placeholder="Search powersets..." class="b-input" style="margin-bottom: 10px;">
            <select id="pse-filter-category" class="b-select" style="margin-bottom: 10px;">
              <option value="all">All Categories</option>
            </select>
            <div id="pse-list" class="scroll-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; padding-right: 5px;">
            </div>
          </div>

          <!-- Right Column: Editor -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 15px; height: 100%; min-width: 0;">
            <div class="pe-col pe-editor" style="flex: 1; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column;">
              <div class="pe-editor-section">
                <h4 class="pe-section-title">Powerset Details</h4>
                <div style="display: flex; gap: 15px;">
                  <div class="pe-input-row" style="flex: 1;">
                    <label>Powerset ID (Internal)</label>
                    <input type="text" id="pse-id" placeholder="e.g. fire-blast" class="b-input">
                  </div>
                  <div class="pe-input-row" style="flex: 1;">
                    <label>Display Name</label>
                    <input type="text" id="pse-name" placeholder="Powerset Name" class="b-input">
                  </div>
                </div>
                <div class="pe-input-row">
                  <label>Description</label>
                  <textarea id="pse-desc" rows="2" class="b-input" style="resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 15px;">
                  <div class="pe-input-row" style="flex: 1;">
                    <label>Category (Folder)</label>
                    <input type="text" id="pse-category" placeholder="e.g. custom, melee" class="b-input">
                  </div>
                  <div class="pe-input-row" style="flex: 1;">
                    <label>Min / Max Integrity</label>
                    <div style="display: flex; gap: 5px;">
                      <input type="number" id="pse-min-integrity" class="b-input" placeholder="-100" style="flex: 1;">
                      <input type="number" id="pse-max-integrity" class="b-input" placeholder="100" style="flex: 1;">
                    </div>
                  </div>
                </div>
              </div>

              <div class="pe-editor-section" style="flex: 1; display: flex; flex-direction: column;">
                <h4 class="pe-section-title" style="display: flex; justify-content: space-between; align-items: center;">
                  Included Powers
                  <button id="btn-pse-add-power" class="b-btn b-btn-sm" style="border-color: #2ecc71; color: #2ecc71;">+ Add</button>
                </h4>
                <div id="pse-powers-list" class="scroll-list" style="flex: 1; border: 1px solid var(--text-dim); padding: 5px; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 5px; overflow-y: auto;">
                  <!-- Dynamic powers here -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px;">
          <button id="btn-pse-delete" class="b-btn btn-danger" style="display: none;">Delete Powerset</button>
          <button id="btn-pse-save" class="b-btn" style="border-color: #2ecc71; color: #2ecc71;">Save Powerset</button>
        </div>
      </div>
    `);
  }
}
