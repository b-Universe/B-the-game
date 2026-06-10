import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

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
    super('spawner-manager-panel', 'Spawner Manager', { width: 850, height: 500, x: window.innerWidth / 2 - 425, y: 100 });

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

      <div style="border-top: 1px solid var(--text-dim); margin: 15px 0; padding-top: 10px; color: #f1c40f; font-size: 0.85rem; font-weight: bold; text-align: center;">SPAWN DEFINITION</div>

      <div class="b-input-group" style="margin-bottom: 10px; background: rgba(52, 152, 219, 0.1); padding: 5px; border-radius: 4px; border: 1px solid #3498db;">
        <label class="b-label" style="color: #3498db;">Mob Pack Preset (Overrides Custom Template)</label>
        <select id="edit-spawner-mobpack" class="b-select" style="border-color: #3498db;">
          <option value="">-- Use Custom Template Below --</option>
        </select>
      </div>

      <div style="color: var(--text-dim); font-size: 0.85rem; font-weight: bold; text-align: center; margin-bottom: 5px;">CUSTOM NPC TEMPLATE</div>

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

export class MobPackManagerWindow extends BaseWindow {
  constructor() {
    super('mobpack-manager-panel', 'Mob Pack Presets', { width: 900, height: 600, x: window.innerWidth / 2 - 450, y: 100 });

    this.setContent(`
      <div style="display: flex; gap: var(--spacing-1); height: 100%; box-sizing: border-box;">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px;">
          <h4 class="b-label" style="margin: 0;">Mob Packs</h4>
          <div id="mp-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;"></div>
          <div style="display: flex; gap: 5px;">
            <input type="text" id="mp-new-input" class="b-input" placeholder="New Pack ID..." style="flex: 1;">
            <button id="btn-mp-add" class="b-btn" style="padding: 0 10px;">Add</button>
          </div>
        </div>
        <div style="flex: 2; display: flex; flex-direction: column; gap: 5px; padding-left: 5px;">
          <h4 class="b-label" style="margin: 0;">Intensity & Mob Entries</h4>

          <div id="mp-bulk-edit-container" style="background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; padding: 5px; border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; display: none;">
            <div style="font-weight: bold; color: #3498db; display: flex; align-items: center; gap: 5px;">
                Bulk Apply Properties <span title="Apply these values to ALL entries in the current pack." style="cursor: help; color: #f1c40f; background: rgba(0,0,0,0.5); border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px;">i</span>
            </div>
            <div style="display: flex; gap: 5px; align-items: center; color: #aaa; flex-wrap: wrap;">
                Grp <select id="mp-bulk-group" class="b-select" style="width: 120px; padding: 2px;"></select>
                | Int <input type="number" id="mp-bulk-int-min" class="b-input" style="width: 35px; padding: 2px;" value="1">-<input type="number" id="mp-bulk-int-max" class="b-input" style="width: 35px; padding: 2px;" value="5">
                | Lvl <input type="number" id="mp-bulk-lvl-min" class="b-input" style="width: 35px; padding: 2px;" value="0">-<input type="number" id="mp-bulk-lvl-max" class="b-input" style="width: 35px; padding: 2px;" value="1">
                | Str <input type="number" id="mp-bulk-str" class="b-input" style="width: 35px; padding: 2px;" value="0">
                <button id="btn-mp-bulk-apply" class="b-btn btn-primary" style="padding: 2px 10px; margin-left: auto;">Apply All</button>
            </div>
          </div>

          <div id="mp-entries-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 5px; padding: 5px;"></div>
          <button id="btn-mp-add-entry" class="b-btn btn-secondary" style="border-color: #2ecc71; color: #2ecc71;">+ Add NPC Entry</button>
          <button id="btn-mp-save" class="b-btn btn-primary" style="margin-top: auto;">Save Pack to Server</button>
        </div>
      </div>
    `);
  }
}

export class EntityGroupManagerWindow extends BaseWindow {
  constructor() {
    super('entity-group-manager-panel', 'Entity Group Manager', { width: 900, height: 550, x: window.innerWidth / 2 - 450, y: 150 });

    this.setContent(`
      <div style="display: flex; gap: var(--spacing-1); height: 100%; box-sizing: border-box;">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px;">
          <h4 class="b-label" style="margin: 0;">Entity Groups</h4>
          <div id="egm-group-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;">
          </div>
          <div style="display: flex; gap: 5px;">
            <input type="text" id="egm-new-group-input" class="b-input" placeholder="New Group..." style="flex: 1;">
            <button id="btn-egm-add-group" class="b-btn" style="padding: 0 10px;">Add</button>
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; padding-left: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px;">
          <h4 class="b-label" style="margin: 0;">Hostile Towards (Aggro List)</h4>
          <div id="egm-hostile-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;">
          </div>
          <div class="b-input-group" style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;"><label class="b-label" style="margin: 0;">Group Powers</label><button id="btn-egm-add-power" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">+ Add Power</button></div>
            <div id="egm-powers-list" style="display: flex; flex-direction: column; gap: 2px; max-height: 100px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius);"></div>
          </div>
          <button id="btn-egm-save" class="b-btn" style="margin-top: auto;">Save Group Settings</button>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; padding-left: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 class="b-label" style="margin: 0;">Faction NPCs</h4>
            <button id="btn-egm-new-npc" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">+ New NPC</button>
          </div>
          <div id="egm-npc-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 5px; padding: 5px;"></div>
        </div>
      </div>
    `);
  }
}

export class NPCTemplateManagerWindow extends BaseWindow {
  constructor() {
    super('npc-template-manager-panel', 'NPC Template Manager', { width: 800, height: 500, x: window.innerWidth / 2 - 400, y: 150 });

    this.setContent(`
      <div style="display: flex; gap: var(--spacing-1); height: 100%; box-sizing: border-box;">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px; border-right: 1px solid var(--text-dim); padding-right: 10px;">
          <h4 class="b-label" style="margin: 0;">NPC Templates</h4>
          <div id="npct-list" class="scroll-list" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: var(--border-radius); display: flex; flex-direction: column; gap: 2px; padding: 5px;"></div>
          <div style="display: flex; gap: 5px;">
            <input type="text" id="npct-new-input" class="b-input" placeholder="New Template ID..." style="flex: 1;">
            <button id="btn-npct-add" class="b-btn" style="padding: 0 10px;">Add</button>
          </div>
        </div>
        <div style="flex: 2; display: flex; flex-direction: column; gap: 5px; padding-left: 5px; overflow-y: auto;">
          <h4 class="b-label" style="margin: 0;">Template Properties</h4>
          <div class="b-input-row">
            <div class="b-input-group" style="flex: 1;"><label class="b-label">Display Name</label><input type="text" id="npct-name" class="b-input"></div>
            <div class="b-input-group" style="flex: 1;">
              <label class="b-label">Group / Faction</label>
              <select id="npct-group" class="b-select">
              </select>
            </div>
          </div>
          <div class="b-input-row">
            <div class="b-input-group" style="flex: 1;">
              <label class="b-label">Strength Rating</label>
              <select id="npct-strength" class="b-select">
                <option value="-2">-2 (Minion)</option><option value="-1">-1 (Weak)</option>
                <option value="0" selected>0 (Standard)</option><option value="1">+1 (Strong)</option>
                <option value="2">+2 (Elite)</option><option value="3">+3 (Boss)</option>
                <option value="4">+4 (Arch-Villain)</option><option value="5">+5 (Raid Boss)</option>
              </select>
            </div>
            <div class="b-input-group" style="flex: 1;"><label class="b-label">NPC Type</label><select id="npct-type" class="b-select"><option value="generic">Generic</option><option value="civilian">Civilian</option><option value="trainer">Trainer</option></select></div>
          </div>
          <div class="b-input-row">
             <div class="b-input-group" style="flex: 1;"><label class="b-label">Speed Variant (Multiplier)</label><input type="number" id="npct-speed" class="b-input" value="1.0" step="0.1"></div>
             <div class="b-input-group" style="flex: 1;"><label class="b-label">Aggro Radius</label><input type="number" id="npct-aggro" class="b-input" value="500"></div>
             <div class="b-input-group" style="flex: 1;"><label class="b-label">Base EXP</label><input type="number" id="npct-exp" class="b-input" value="20"></div>
          </div>
          <div class="b-input-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;"><label class="b-label" style="margin: 0;">Assigned Powers</label><button id="btn-npct-add-power" class="b-btn btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;">+ Add Power</button></div>
            <div id="npct-powers-list" style="display: flex; flex-direction: column; gap: 2px; max-height: 100px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--text-dim); padding: 5px; border-radius: var(--border-radius);"></div>
          </div>
          <button id="btn-npct-save" class="b-btn btn-primary" style="margin-top: auto;">Save Template</button>
        </div>
      </div>
    `);
  }
}

export class EntityTypeManagerWindow extends BaseWindow {
  constructor() {
    super('entity-type-manager-panel', 'Entity Type Manager', { width: 600, height: 400, x: window.innerWidth / 2 - 300, y: 150 });

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
