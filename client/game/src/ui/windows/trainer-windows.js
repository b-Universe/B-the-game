import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class TrainerWindow extends BaseWindow {
  constructor() {
    super('trainer-dialog-modal', 'Trainer', { width: 500, x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 200 });

    this.setContent(`
      <div id="trainer-dialog-view">
        <div style="padding: var(--spacing-2); color: var(--text-primary); font-size: 1.1rem; line-height: 1.5; font-family: var(--font-mono);" id="trainer-dialog-text">
          "Hello, recruit. Ready to improve your skills?"
        </div>
        <div id="trainer-actions-container" style="display: flex; flex-direction: column; gap: var(--spacing-1); padding: var(--spacing-2); background: rgba(0,0,0,0.5); border-top: 1px solid var(--text-dim); margin: 0 calc(var(--spacing-2) * -1) calc(var(--spacing-2) * -1) calc(var(--spacing-2) * -1);">
        </div>
      </div>
      <div id="trainer-training-view" style="display: none; flex-direction: column; gap: var(--spacing-1);">
        <!-- Populated by JS -->
      </div>
    `);
  }

  setTrainerName(name) {
    const titleEl = this.element.querySelector('.b-window-title');
    if (titleEl) titleEl.innerText = `Trainer: ${name}`;
  }
}
