import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class InventoryWindow extends BaseWindow {
  constructor() {
    super('inventory-panel', 'Inventory', { width: 260, x: window.innerWidth - 300, y: 350 });

    this.setContent(`
      <div id="inventory-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding-bottom: var(--spacing-1);">
        <!-- Slots populated by JS -->
      </div>
      <div style="padding-top: var(--spacing-1); border-top: 1px solid var(--text-dim); text-align: right; color: var(--rainbow-green); font-family: var(--font-mono); font-weight: bold; font-size: 1.1rem;">
        $<span id="inv-currency">0</span>
      </div>
    `);
  }
}

export class TradeWindow extends BaseWindow {
  constructor() {
    super('trade-panel', 'Trade', { width: 450, x: window.innerWidth / 2 - 225, y: 150 });

    this.setContent(`
      <div style="display: flex; gap: var(--spacing-1); margin-bottom: var(--spacing-1);">
        <div style="flex: 1; border: 1px solid var(--text-dim); padding: var(--spacing-1); border-radius: var(--border-radius); background: rgba(0,0,0,0.5);">
          <h4 style="margin: 0 0 var(--spacing-1) 0; text-align: center; color: var(--accent-neon); font-family: var(--font-header); letter-spacing: 1px;">Your Offer</h4>
          <div id="trade-grid-self" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;"></div>
          <div style="margin-top: var(--spacing-1); text-align: center;">
            <input type="number" id="trade-offer-currency" class="b-input" min="0" value="0" style="text-align: right; color: var(--rainbow-green); font-weight: bold; font-size: 1rem;">
          </div>
        </div>
        <div style="flex: 1; border: 1px solid var(--text-dim); padding: var(--spacing-1); border-radius: var(--border-radius); background: rgba(0,0,0,0.5);">
          <h4 style="margin: 0 0 var(--spacing-1) 0; text-align: center; color: var(--rainbow-red); font-family: var(--font-header); letter-spacing: 1px;">Their Offer</h4>
          <div id="trade-grid-partner" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;"></div>
          <div style="margin-top: var(--spacing-1); text-align: right; color: var(--rainbow-green); font-family: var(--font-mono); font-weight: bold; font-size: 1rem; padding: 4px;">
            $<span id="trade-partner-currency">0</span>
          </div>
        </div>
      </div>
      <div style="display: flex; border-top: 1px solid var(--text-dim); padding-top: var(--spacing-1);">
        <button id="btn-trade-accept" class="b-btn" style="flex: 1; height: 40px; font-size: 1.1rem;">Accept Trade</button>
      </div>
    `);
  }

  setPartnerName(name) {
    const titleEl = this.element.querySelector('.b-window-title');
    if (titleEl) titleEl.innerText = `Trade: ${name}`;
  }
}
