import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class DevToolsWindow extends BaseWindow {
  constructor() {
    super('dev-panel', 'Developer Tools', { width: 320, height: 450, x: window.innerWidth - 340, y: 70 });

    this.setContent(`
      <div style="display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid var(--text-dim); padding-bottom: 10px;">
        <button class="dev-tab-btn b-btn btn-primary active" data-tab="dev-tab-visual" style="flex: 1; padding: 4px; font-size: 0.8rem;">Visual Debug</button>
        <button class="dev-tab-btn b-btn btn-secondary" data-tab="dev-tab-entities" style="flex: 1; padding: 4px; font-size: 0.8rem;">Entities</button>
        <button class="dev-tab-btn b-btn btn-secondary" data-tab="dev-tab-systems" style="flex: 1; padding: 4px; font-size: 0.8rem;">Systems</button>
      </div>

      <div id="dev-tab-visual" class="dev-tab-panel" style="display: flex; flex-direction: column; gap: 5px; overflow-y: auto; padding-right: 5px;">
        <button id="btn-dev-player" class="b-btn btn-secondary" style="width: 100%;">Toggle Player Pos</button>
        <button id="btn-dev-entity" class="b-btn btn-secondary" style="width: 100%;">Toggle Entity Pos</button>
        <div id="wrapper-dev-dist-player-mouse" style="display: flex; gap: 5px; width: 100%;">
          <button id="btn-dev-dist-player-mouse" class="b-btn btn-secondary" style="flex: 1;">Dist: Player to Mouse</button>
          <button id="btn-dev-tooltip-toggle" class="b-btn btn-secondary" title="Toggle Tooltip Mode" style="padding: 0 10px;">T</button>
        </div>
        <button id="btn-dev-dist-mouse" class="b-btn btn-secondary" style="width: 100%;">Dist: NPC to Mouse</button>
        <button id="btn-dev-dist-npc" class="b-btn btn-secondary" style="width: 100%;">Dist: Player to NPC</button>
        <button id="btn-dev-aggro" class="b-btn btn-secondary" style="width: 100%;">Toggle Aggro Range</button>
        <button id="btn-dev-melee" class="b-btn btn-secondary" style="width: 100%;">Toggle Melee Range</button>
        <div id="wrapper-dev-los" style="display: flex; gap: 5px; width: 100%;">
          <button id="btn-dev-los" class="b-btn btn-secondary" style="flex: 1;">Toggle Line of Sight</button>
          <button id="btn-dev-los-edit" class="b-btn btn-secondary" style="padding: 0 10px;">✎</button>
        </div>
        <button id="btn-dev-hitbox" class="b-btn btn-secondary" style="width: 100%;">Toggle Hitboxes</button>
        <button id="btn-dev-npc-paths" class="b-btn btn-secondary" style="width: 100%;">Toggle NPC Paths</button>
        <button id="btn-dev-spawners" class="b-btn btn-secondary" style="width: 100%;">Toggle Spawner Bounds</button>
        <button id="btn-dev-arcade-hover" class="b-btn btn-secondary" style="width: 100%;">Toggle Arcade Hover</button>
        <button id="btn-dev-neighborhoods" class="b-btn btn-secondary" style="width: 100%;">Toggle Neighborhood Bounds</button>
      </div>

      <div id="dev-tab-entities" class="dev-tab-panel" style="display: none; flex-direction: column; gap: 5px; overflow-y: auto; padding-right: 5px;">
          <button id="btn-dev-account-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Account Manager</button>
          <button id="btn-dev-player-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Player Manager</button>
          <button id="btn-dev-npc-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">NPC Manager</button>
          <button id="btn-dev-spawner-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Spawner Manager</button>
          <button id="btn-dev-mobpack-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Mob Pack Presets</button>
          <button id="btn-dev-group-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Entity Group Manager</button>
          <button id="btn-dev-npc-template-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">NPC Templates</button>
          <button id="btn-dev-entity-type-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Entity Types</button>
          <button id="btn-dev-edit-target" class="b-btn btn-secondary" style="width: 100%; border-color: #e056fd; color: #e056fd;">Edit Selected Target</button>
      </div>

      <div id="dev-tab-systems" class="dev-tab-panel" style="display: none; flex-direction: column; gap: 5px; overflow-y: auto; padding-right: 5px;">
          <button id="btn-dev-power-editor" class="b-btn btn-secondary" style="width: 100%; border-color: #f1c40f; color: #f1c40f;">Power Customizer</button>
          <button id="btn-dev-arcade-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #f1c40f; color: #f1c40f;">Arcade Manager</button>
          <button id="btn-dev-neighborhood-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #f1c40f; color: #f1c40f;">Neighborhood Manager</button>
          <button id="btn-dev-zone-manager" class="b-btn btn-secondary" style="width: 100%; border-color: #f1c40f; color: #f1c40f;">Zone Manager</button>
          <button id="btn-dev-edit-mode" class="b-btn btn-secondary" style="width: 100%; border-color: #f1c40f; color: #f1c40f;">Toggle Edit Mode (/edit)</button>
      </div>
    `);
  }
}

export class BuilderToolsWindow extends BaseWindow {
  constructor() {
    super('builder-panel', 'Builder Tools', { width: 260, x: window.innerWidth - 290, y: 70 });
    this.setContent(`
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <button id="btn-build-chunk" class="b-btn btn-secondary" style="width: 100%;">Toggle Chunk Bounds</button>
        <button id="btn-build-preview" class="b-btn btn-secondary" style="width: 100%;">Toggle Block Preview</button>
        <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;">
          <button id="btn-toggle-grid" class="b-btn btn-secondary" style="width: 100%; border-color: #2ecc71; color: #2ecc71;">Builder Grid: OFF</button>
          <button id="btn-toggle-hotbar" class="b-btn btn-secondary" style="width: 100%; border-color: #3498db; color: #3498db;">Toggle Texture Palette</button>
          <button id="btn-toggle-objlib" class="b-btn btn-secondary" style="width: 100%; border-color: #9b59b6; color: #9b59b6;">Toggle Object Library</button>
        </div>
      </div>
    `);
  }
}

export class LosEditWindow extends BaseWindow {
  constructor() {
    super('los-edit-modal', 'Edit Line of Sight', { width: 250, x: window.innerWidth / 2 - 125, y: window.innerHeight / 2 - 100 });
    this.setContent(`
      <div style="margin-bottom: 10px;"><label class="b-label">Distance (px)</label><input type="number" id="edit-los-dist" class="b-input" value="400"></div>
      <div style="margin-bottom: 15px;"><label class="b-label">FOV Angle (degrees)</label><input type="number" id="edit-los-angle" class="b-input" value="60"></div>
      <div style="display: flex; gap: 10px;"><button id="btn-save-los" class="b-btn btn-primary" style="flex: 1;">Save</button><button id="btn-close-los" class="b-btn btn-secondary" style="flex: 1;">Cancel</button></div>
    `);
  }
}

export class ObjectLibraryWindow extends BaseWindow {
  constructor() {
    super('object-library-panel', 'Object Library', { width: 260, x: window.innerWidth - 310, y: 70 });
    this.setContent(`<div id="obj-lib-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding-top: 5px; overflow-y: auto; flex-grow: 1; min-height: 168px; padding-right: 5px; align-content: start;"></div><div id="obj-lib-color-picker" style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;"></div>`);
  }
}

export class TexturePaletteWindow extends BaseWindow {
  constructor() {
    super('builder-hotbar', 'Texture Palette', { width: 260, x: window.innerWidth - 300, y: 280 });
    this.setContent(`<div id="hotbar-controls-container" style="display: flex; flex-direction: column; gap: 5px;"></div><div id="builder-tabs-container" style="display: flex; gap: 5px; flex-wrap: wrap; padding-bottom: 5px; margin-bottom: 5px;"></div><div id="hotbar-grids-wrapper" style="position: relative; overflow-y: auto; flex-grow: 1; min-height: 168px; padding-right: 5px;"></div>`);
  }
}
