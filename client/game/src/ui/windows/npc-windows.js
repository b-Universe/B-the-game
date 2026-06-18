import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';
import { GUI_DEFAULT_POSITIONS } from '../game/constants.js?v=cache-bust-005';

export class PowerSelectorWindow extends BaseWindow {
  constructor() {
    super('power-selector-modal', 'Select Power', { width: 400, height: 500, x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 250 });

    this.setContent(`
      <input type="text" id="power-selector-search" class="b-input" placeholder="Search powers or powersets..." style="margin-bottom: 10px;">
      <div id="power-selector-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;"></div>
      <button id="btn-power-selector-close" class="b-btn btn-secondary" style="margin-top: 10px; width: 100%;">Close</button>
    `);
  }
}

export class NPCManagerWindow extends BaseWindow {
  constructor() {
    // Options: width 850, center screen, y=100
    super('npc-manager-panel', 'NPC Manager', { width: 850, height: 500, x: window.innerWidth / 2 + GUI_DEFAULT_POSITIONS.npcManager.xCenterOffset, y: GUI_DEFAULT_POSITIONS.npcManager.y });

    this.setContent(`
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-1); border-bottom: 1px solid var(--text-dim); padding-bottom: var(--spacing-1);">
        <span style="color: var(--text-dim); font-size: 0.85rem;">Manage active NPCs in the current zone.</span>
        <button id="btn-npc-manager-create" class="b-btn btn-secondary" style="padding: 4px 12px; font-size: 0.85rem; border-color: #2ecc71; color: #2ecc71;">+ Spawn Generic NPC Here</button>
      </div>
      <div id="npc-manager-list" style="display: flex; flex-direction: column; gap: var(--spacing-1); overflow-y: auto; flex: 1;"></div>
    `);
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
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Battery</label>
          <input type="number" id="edit-npc-battery" class="b-input">
        </div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Level</label>
          <input type="number" id="edit-npc-level" class="b-input" value="1">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Strength</label>
          <select id="edit-npc-strength" class="b-select">
            <option value="-2">-2 (Minion)</option>
            <option value="-1">-1 (Weak)</option>
            <option value="0" selected>0 (Standard)</option>
            <option value="1">+1 (Strong)</option>
            <option value="2">+2 (Elite)</option>
            <option value="3">+3 (Boss)</option>
            <option value="4">+4 (Arch-Villain)</option>
            <option value="5">+5 (Raid Boss)</option>
          </select>
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
          <select id="edit-npc-type" class="b-select">
            <option value="none">None (Disabled)</option>
            <option value="generic">Generic</option>
            <option value="civilian">Civilian (No Combat)</option>
            <option value="trainer">Trainer</option>
            <option value="banker">Banker</option>
          </select>
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Direction</label>
          <select id="edit-npc-dir" class="b-select"><option value="down">Down</option><option value="up">Up</option><option value="left">Left</option><option value="right">Right</option></select>
        </div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Group</label>
          <select id="edit-npc-group" class="b-select">
            <option value="hero">Hero (Player)</option>
            <option value="vigilante">Vigilante (Player)</option>
            <option value="villain">Villain (Player)</option>
            <option value="The Galactic Federation of B">The Galactic Federation of B</option>
            <option value="APD">APD</option>
            <option value="Champagne">Champagne</option>
            <option value="Cyber-Syndicate">Cyber-Syndicate</option>
            <option value="Corporate Extractors">Corporate Extractors</option>
            <option value="Astro-Enforcers">Astro-Enforcers</option>
            <option value="Prism Zealots">Prism Zealots</option>
            <option value="Swarm">Swarm</option>
            <option value="Rodent">Rodent</option>
            <option value="Maple Gang">Maple Gang</option>
            <option value="Civilian" selected>Civilian (Neutral)</option>
          </select>
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Respawn Rate (s) [0=Permadeath]</label>
          <input type="number" id="edit-npc-respawn" class="b-input" value="0">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Aggro Radius (px)</label>
          <input type="number" id="edit-npc-aggro" class="b-input" value="500">
        </div>
      </div>
      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="b-label" title="e.g. 100,200; wait 5; 300,400">Patrol Route (Actions split by semicolon)</label>
          <button id="btn-edit-npc-path" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; border-color: #e056fd; color: #e056fd;">Record on Map</button>
        </div>
        <input type="text" id="edit-npc-patrol" class="b-input" placeholder="x,y; wait 5; x,y">
      </div>

      <div class="b-input-group">
        <label class="b-label" title="Comma separated power IDs (e.g., brawl, slug)">Assigned Powers</label>
        <input type="text" id="edit-npc-powers" class="b-input" placeholder="e.g. brawl, slug, fly">
      </div>

      <button id="btn-save-npc-edit" class="b-btn" style="margin-top: 10px;">Save & Close</button>
    `);
  }
}

export class SpawnerManagerWindow extends BaseWindow {
  constructor() {
    super('spawner-manager-panel', 'Spawner Manager', { width: 850, height: 500, x: window.innerWidth / 2 + GUI_DEFAULT_POSITIONS.spawnerManager.xCenterOffset, y: GUI_DEFAULT_POSITIONS.spawnerManager.y });

    this.listContainer = document.createElement('div');
    this.listContainer.id = 'spawner-manager-list';
    this.listContainer.style.display = 'flex';
    this.listContainer.style.flexDirection = 'column';
    this.listContainer.style.gap = 'var(--spacing-1)';
    this.setContent(this.listContainer);
  }
}

export class SpawnerEditWindow extends BaseWindow {
  constructor() {
    super('spawner-edit-modal', 'Edit Spawner', { width: 450, x: window.innerWidth / 2 - 225, y: 150 });

    this.setContent(`
      <input type="hidden" id="edit-spawner-uuid">

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 2;">
          <label class="b-label">Spawner Name</label>
          <input type="text" id="edit-spawner-name" class="b-input">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Max Active NPCs</label>
          <input type="number" id="edit-spawner-max" class="b-input" value="5">
        </div>
      </div>

      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="b-label">Anchor Location (X, Y, Z)</label>
          <button id="btn-edit-spawner-tp-me" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem;">TP to Me</button>
        </div>
        <div class="b-input-row">
          <input type="number" id="edit-spawner-x" class="b-input">
          <input type="number" id="edit-spawner-y" class="b-input">
          <input type="number" id="edit-spawner-z" class="b-input">
        </div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Spawn Radius (px)</label>
          <input type="number" id="edit-spawner-radius" class="b-input" value="300">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">Respawn Rate (s)</label>
          <input type="number" id="edit-spawner-rate" class="b-input" value="10">
        </div>
      </div>

      <div style="border-top: 1px solid var(--text-dim); margin: 15px 0; padding-top: 10px; color: #f1c40f; font-size: 0.85rem; font-weight: bold; text-align: center;">Spawn Definition</div>

      <div class="b-input-group" style="margin-bottom: 10px; background: rgba(52, 152, 219, 0.1); padding: 5px; border-radius: 4px; border: 1px solid #3498db;">
        <label class="b-label" style="color: #3498db; margin-bottom: 5px;">Allowed Pack IDs (Overrides Neighborhood)</label>
        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
           <select id="edit-spawner-pack-add-select" class="b-select" style="flex: 1; border-color: #3498db;">
             <option value="">-- Select Pack ID --</option>
           </select>
           <button id="btn-edit-spawner-pack-add" class="b-btn" style="padding: 0 10px;">+</button>
        </div>
        <div id="edit-spawner-pack-list" style="display: flex; flex-direction: column; gap: 2px; max-height: 80px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 2px; border-radius: var(--border-radius);"></div>
      </div>

      <div style="color: var(--text-dim); font-size: 0.85rem; font-weight: bold; text-align: center; margin-bottom: 5px;">Custom Npc Template</div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">NPC Name</label>
          <input type="text" id="edit-spawner-npcname" class="b-input" value="New NPC">
        </div>
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">NPC Group</label>
          <select id="edit-spawner-group" class="b-select">
            <option value="Civilian" selected>Civilian (Neutral)</option>
            <option value="APD">APD</option>
            <option value="Cyber-Syndicate">Cyber-Syndicate</option>
            <option value="Corporate Extractors">Corporate Extractors</option>
            <option value="Astro-Enforcers">Astro-Enforcers</option>
            <option value="Prism Zealots">Prism Zealots</option>
            <option value="Swarm">Swarm</option>
            <option value="Rodent">Rodent</option>
            <option value="Maple Gang">Maple Gang</option>
          </select>
        </div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Level Min</label><input type="number" id="edit-spawner-lvlmin" class="b-input" value="1"></div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Level Max</label><input type="number" id="edit-spawner-lvlmax" class="b-input" value="1"></div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Strength Boost</label><input type="number" id="edit-spawner-strength" class="b-input" value="0"></div>
      </div>

      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;">
          <label class="b-label">NPC Type</label>
          <select id="edit-spawner-type" class="b-select">
            <option value="none">None (Disabled)</option>
            <option value="generic">Generic</option>
            <option value="civilian">Civilian (No Combat)</option>
            <option value="trainer">Trainer</option>
            <option value="banker">Banker</option>
          </select>
        </div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Aggro Radius (px)</label><input type="number" id="edit-spawner-aggro" class="b-input" value="500"></div>
      </div>

      <div class="b-input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="b-label">Patrol Route (e.g. 100,200; wait 5)</label>
          <button id="btn-edit-spawner-path" class="b-btn" style="padding: 2px 8px; font-size: 0.8rem; border-color: #e056fd; color: #e056fd;">Record on Map</button>
        </div>
        <input type="text" id="edit-spawner-patrol" class="b-input" placeholder="x,y; wait 5; x,y">
      </div>

      <div class="b-input-group">
        <label class="b-label">NPC Powers (Comma Separated IDs)</label>
        <input type="text" id="edit-spawner-powers" class="b-input" placeholder="e.g. brawl, slug, fly">
      </div>

      <div class="b-input-group" style="margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="b-label">Active Spawned NPCs</label>
          <button id="btn-spawner-wipe-npcs" class="b-btn b-btn-danger" style="padding: 2px 8px; font-size: 0.75rem; width: auto; height: auto;">Wipe Mobs</button>
        </div>
        <div id="edit-spawner-npc-list" style="max-height: 120px; min-height: 60px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 5px; font-size: 0.85rem; font-family: var(--font-mono);"></div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 10px;">
         <button id="btn-update-spawner-edit" class="b-btn btn-secondary" style="flex: 1; border-color: var(--rainbow-purple); color: var(--rainbow-purple);">Update</button>
         <button id="btn-save-spawner-edit" class="b-btn btn-primary" style="flex: 1;">Save and Close</button>
      </div>
    `);
  }
}

export class FactionManagerWindow extends BaseWindow {
  constructor() {
    super('faction-manager-panel', 'Faction Manager', { width: 1000, height: 600, x: window.innerWidth / 2 - 500, y: 100 });

    this.setContent(`
      <div style="display: flex; flex-direction: column; gap: 10px; height: 100%; box-sizing: border-box;">
        <!-- Header: Faction Selection -->
        <div style="display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--text-dim); padding-bottom: 10px;">
          <label class="b-label" style="margin: 0;">Faction</label>
          <select id="fac-select" class="b-select" style="flex: 1;"></select>
          <button id="btn-fac-new" class="b-btn btn-secondary" style="padding: 4px 10px;">+ New</button>
          <button id="btn-fac-rename" class="b-btn btn-secondary" style="padding: 4px 10px;">Rename</button>
          <button id="btn-fac-delete" class="b-btn btn-secondary" style="padding: 4px 10px; border-color: #e74c3c; color: #e74c3c;">Delete</button>
        </div>

        <!-- Body: 3 Columns -->
        <div style="display: flex; gap: 15px; flex: 1; overflow: hidden;">
          
          <!-- Column 1: Faction Settings -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px; overflow-y: auto;">
            <h4 class="b-label" style="margin: 0; color: #2ecc71;">Core Settings</h4>
            <div class="b-input-group">
              <label class="b-label">Lore / Description</label>
              <textarea id="fac-desc" class="b-input" style="height: 60px; resize: vertical;" placeholder="The backstory of this faction..."></textarea>
            </div>
            
            <h4 class="b-label" style="margin: 10px 0 0 0;">Hostile Towards</h4>
            <div id="fac-hostile-list" class="scroll-list" style="height: 100px; min-height: 100px; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;"></div>

            <div class="b-input-group" style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label class="b-label" style="margin: 0;">Faction-Wide Powers</label>
                <button id="btn-fac-add-power" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">+ Add Power</button>
              </div>
              <div id="fac-powers-list" style="display: flex; flex-direction: column; gap: 2px; height: 80px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius);"></div>
            </div>

            <h4 class="b-label" style="margin: 10px 0 0 0; color: #2ecc71;">Generic Name Pools</h4>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem;">
              <div class="b-input-group">
                <div style="display: flex; gap: 5px; margin-bottom: 2px;">
                   <input type="text" id="fac-names-add-input" class="b-input" placeholder="Add name..." style="flex: 2;">
                   <select id="fac-names-add-strength" class="b-select" multiple size="8" style="flex: 1; height: auto; min-height: 120px; font-size: 0.8rem; overflow-y: hidden;" title="Hold Ctrl/Cmd to select multiple">
                     <option value="-2">-2</option><option value="-1">-1</option>
                     <option value="0" selected>0</option><option value="1">+1</option>
                     <option value="2">+2</option><option value="3">+3</option>
                     <option value="4">+4</option><option value="5">+5</option>
                   </select>
                   <button id="btn-fac-names-add" class="b-btn" style="padding: 0 10px; height: 40px; align-self: flex-start;">+</button>
                </div>
                <div id="fac-names-list" class="scroll-list" style="display: flex; flex-direction: column; gap: 2px; height: 120px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius);"></div>
              </div>
            </div>
            
            <button id="btn-fac-save" class="b-btn btn-primary" style="margin-top: auto;">Save Faction Settings</button>
          </div>

          <!-- Column 2: Faction NPCs -->
          <div style="flex: 1.2; display: flex; flex-direction: column; gap: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 class="b-label" style="margin: 0; color: #2ecc71;">Faction NPCs</h4>
              <select id="fac-npc-select" class="b-select" style="max-width: 150px;"></select>
            </div>
            
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
              <button id="btn-fac-npc-new" class="b-btn btn-secondary" style="flex: 1; padding: 4px;">+ New</button>
              <button id="btn-fac-npc-duplicate" class="b-btn btn-secondary" style="flex: 1; padding: 4px; border-color: #f1c40f; color: #f1c40f;">Duplicate</button>
              <button id="btn-fac-npc-delete" class="b-btn btn-secondary" style="flex: 1; padding: 4px; border-color: #e74c3c; color: #e74c3c;">Delete</button>
            </div>

            <div id="fac-npc-editor" style="display: flex; flex-direction: column; gap: 5px; opacity: 0.5; pointer-events: none;">
              <div class="b-input-group"><label class="b-label">Template ID</label><input type="text" id="fac-npc-id" class="b-input"></div>
              <div class="b-input-group">
                 <label style="display: flex; align-items: center; gap: 5px; color: #fff; font-size: 0.8rem; cursor: pointer; margin-bottom: 2px;">
                    <input type="checkbox" id="fac-npc-use-generic-name" style="accent-color: #3498db; width: 16px; height: 16px;">
                    Use Generic Name Pools
                 </label>
                 <input type="text" id="fac-npc-name" class="b-input" placeholder="Name...">
              </div>
              <div class="b-input-group"><label class="b-label">Description</label><textarea id="fac-npc-desc" class="b-input" style="height: 50px; resize: vertical;"></textarea></div>
              
              <div class="b-input-row">
                <div class="b-input-group" style="flex: 1;">
                  <label class="b-label">Strength</label>
                  <select id="fac-npc-strength" class="b-select">
                    <option value="-2">-2 (Minion)</option><option value="-1">-1 (Weak)</option>
                    <option value="0" selected>0 (Standard)</option><option value="1">+1 (Strong)</option>
                    <option value="2">+2 (Elite)</option><option value="3">+3 (Boss)</option>
                    <option value="4">+4 (Arch-Villain)</option><option value="5">+5 (Raid Boss)</option>
                  </select>
                </div>
                <div class="b-input-group" style="flex: 1;"><label class="b-label">Type</label><select id="fac-npc-type" class="b-select"><option value="generic">Generic</option><option value="civilian">Civilian</option><option value="trainer">Trainer</option><option value="banker">Banker</option></select></div>
              </div>
              <div class="b-input-row">
                 <div class="b-input-group" style="flex: 1;"><label class="b-label">Speed Variant</label><input type="number" id="fac-npc-speed" class="b-input" value="1.0" step="0.1"></div>
                 <div class="b-input-group" style="flex: 1;"><label class="b-label">Aggro Radius</label><input type="number" id="fac-npc-aggro" class="b-input" value="500"></div>
                 <div class="b-input-group" style="flex: 1;"><label class="b-label">Base EXP</label><input type="number" id="fac-npc-exp" class="b-input" value="20"></div>
              </div>

              <div class="b-input-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;"><label class="b-label" style="margin: 0;">NPC Powers</label><button id="btn-fac-npc-add-power" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">+ Add Power</button></div>
                <div id="fac-npc-powers-list" style="display: flex; flex-direction: column; gap: 2px; height: 80px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius);"></div>
              </div>
              
              <button id="btn-fac-npc-save" class="b-btn btn-primary" style="margin-top: auto;">Save NPC Template</button>
            </div>
          </div>

          <!-- Column 3: Faction Spawns (Mob Packs) -->
          <div style="flex: 1.2; display: flex; flex-direction: column; gap: 5px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 class="b-label" style="margin: 0; color: #2ecc71;">Faction Spawns (Packs)</h4>
              <select id="fac-pack-select" class="b-select" style="max-width: 150px;"></select>
            </div>
            
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
              <button id="btn-fac-pack-new" class="b-btn btn-secondary" style="flex: 1; padding: 4px;">+ Add Pack</button>
              <button id="btn-fac-pack-delete" class="b-btn btn-secondary" style="flex: 1; padding: 4px; border-color: #e74c3c; color: #e74c3c;">Delete</button>
            </div>

            <div id="fac-pack-editor" style="display: flex; flex-direction: column; gap: 5px; opacity: 0.5; pointer-events: none;">
              <div class="b-input-group"><label class="b-label">Pack ID</label><input type="text" id="fac-pack-id" class="b-input"></div>
              <div class="b-input-row">
                 <div class="b-input-group" style="flex: 1;"><label class="b-label">Intensity Min</label><input type="number" id="fac-pack-intmin" class="b-input" value="1"></div>
                 <div class="b-input-group" style="flex: 1;"><label class="b-label">Intensity Max</label><input type="number" id="fac-pack-intmax" class="b-input" value="5"></div>
                 <div class="b-input-group" style="flex: 1;"><label class="b-label">Weight</label><input type="number" id="fac-pack-weight" class="b-input" value="10"></div>
              </div>
              
              <h4 class="b-label" style="margin: 5px 0 0 0; color: #2ecc71;">NPC Entries</h4>
              <div id="fac-pack-entries" class="scroll-list" style="flex: 1; min-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 5px; padding: 5px;"></div>
              
              <button id="btn-fac-pack-add-entry" class="b-btn btn-secondary" style="border-color: #2ecc71; color: #2ecc71;">+ Add Entry</button>
              <button id="btn-fac-pack-save" class="b-btn btn-primary" style="margin-top: auto;">Save Pack</button>
            </div>
          </div>

        </div>
      </div>
    `);
  }
}

export class EntityTypeManagerWindow extends BaseWindow {
  constructor() {
    super('entity-type-manager-panel', 'Entity Type Manager', { width: 600, height: 400, x: window.innerWidth / 2 + GUI_DEFAULT_POSITIONS.entityTypeManager.xCenterOffset, y: GUI_DEFAULT_POSITIONS.entityTypeManager.y });

    this.setContent(`
      <div style="display: flex; gap: var(--spacing-1); height: 100%; box-sizing: border-box;">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px;">
          <h4 class="b-label" style="margin: 0;">Entity Types</h4>
          <div id="et-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;"></div>
          <div style="display: flex; gap: 5px;">
            <input type="text" id="et-new-input" class="b-input" placeholder="New Type ID..." style="flex: 1;">
            <button id="btn-et-add" class="b-btn" style="padding: 0 10px;">Add</button>
          </div>
        </div>
        <div style="flex: 2; display: flex; flex-direction: column; gap: 5px; padding-left: 5px; overflow-y: auto;">
          <h4 class="b-label" style="margin: 0;">Type Modifiers</h4>
          <div class="b-input-row">
            <div class="b-input-group" style="flex: 1;"><label class="b-label">HP Multiplier</label><input type="number" id="et-hp-mult" class="b-input" value="1.0" step="0.1"></div>
            <div class="b-input-group" style="flex: 1;"><label class="b-label">Damage Multiplier</label><input type="number" id="et-dmg-mult" class="b-input" value="1.0" step="0.1"></div>
          </div>
          <div class="b-input-row">
            <div class="b-input-group" style="flex: 1;"><label class="b-label">EXP Multiplier</label><input type="number" id="et-exp-mult" class="b-input" value="1.0" step="0.1"></div>
            <div class="b-input-group" style="flex: 1;"><label class="b-label">Is Targetable?</label><select id="et-targetable" class="b-select"><option value="true">Yes</option><option value="false">No</option></select></div>
          </div>
          <button id="btn-et-save" class="b-btn btn-primary" style="margin-top: auto;">Save Type</button>
        </div>
      </div>
    `);
  }
}
