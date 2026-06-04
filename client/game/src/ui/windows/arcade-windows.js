import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class ArcadeManagerWindow extends BaseWindow {
  constructor() {
    super('arcade-manager-panel', 'Arcade Cabinet Manager', { width: 400, height: 500, x: window.innerWidth - 450, y: 120 });

    this.setContent(`
      <div style="color: var(--text-dim); font-size: 0.8rem; margin-bottom: var(--spacing-1);">Configure the game installed on each arcade cabinet in the current zone.</div>
      <div id="arcade-manager-list" style="display: flex; flex-direction: column; gap: var(--spacing-1); flex-grow: 1; overflow-y: auto;">
      </div>
      <div style="border-top: 1px solid var(--text-dim); padding-top: var(--spacing-1); margin-top: auto;">
        <span style="color: #f1c40f; font-family: var(--font-header); font-size: 0.9rem; letter-spacing: 1px; display: block; margin-bottom: var(--spacing-1);">Global Leaderboards</span>
        <div id="arcade-manager-leaderboard" style="display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; font-family: var(--font-mono); color: var(--text-dim);">
        </div>
      </div>
    `);
  }
}

export class ArcadeEditWindow extends BaseWindow {
  constructor() {
    super('arcade-edit-modal', 'Edit Arcade Cabinet', { width: 320, x: window.innerWidth - 350, y: 150 });

    this.setContent(`
      <div class="b-input-group">
        <label class="b-label">Cabinet Name (Optional)</label>
        <input type="text" id="edit-arcade-name" class="b-input" placeholder="e.g. Behr's High Score Machine">
      </div>
      <div class="b-input-group">
        <label class="b-label">Game Installed</label>
        <select id="edit-arcade-game" class="b-select">
          <option value="pixel">Pixel (Platformer)</option>
          <option value="pong">Bonk (Retro)</option>
          <option value="invaders">Space Invaders</option>
          <option value="b-man">B-Man</option>
          <option value="flappy-bee">Flappy Bee</option>
          <option value="pixel-cross">Pixel-Cross (Frogger)</option>
          <option value="bepis">Bepis (Tetris)</option>
          <option value="operius">Operius</option>
          <option value="number-munchers">Num Munchers (Math)</option>
        </select>
      </div>
      <div class="b-input-group">
        <label class="b-label">Power State</label>
        <select id="edit-arcade-power" class="b-select"><option value="on">Powered On</option><option value="off">Powered Off</option></select>
      </div>
      <div class="b-input-row">
        <div class="b-input-group" style="flex: 1;"><label class="b-label">X</label><input type="number" id="edit-arcade-x" class="b-input"></div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Y</label><input type="number" id="edit-arcade-y" class="b-input"></div>
        <div class="b-input-group" style="flex: 1;"><label class="b-label">Z</label><input type="number" id="edit-arcade-z" class="b-input"></div>
      </div>
      <div class="b-input-group"><label class="b-label">Zone</label><input type="text" id="edit-arcade-zone" class="b-input" disabled></div>
      <div style="display: flex; gap: 5px; align-items: center; margin-bottom: var(--spacing-1);">
        <input type="checkbox" id="edit-arcade-highlight" checked style="cursor: pointer;">
        <label for="edit-arcade-highlight" style="color: var(--text-dim); font-size: 0.8rem; cursor: pointer;">Highlight Cabinet in World</label>
      </div>
      <button id="btn-save-arcade-edit" class="b-btn">Save Cabinet</button>
    `);
  }
}
