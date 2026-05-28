export class InventoryUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.currentTrade = null;

    this.ui.makeDraggable('inventory-panel', '.dev-panel-header');
    this.ui.makeDraggable('trade-panel', '.dev-panel-header');

    this.setupInventory();
    this.setupTradeUI();
  }

  setupInventory() {
    const btnInv = document.getElementById('btn-inventory');
    const invPanel = document.getElementById('inventory-panel');
    if (btnInv && invPanel) {
      btnInv.onclick = () => {
        invPanel.style.display = invPanel.style.display === 'none' ? 'flex' : 'none';
        this.renderInventory();
      };
      document.getElementById('btn-close-inventory').onclick = () => invPanel.style.display = 'none';
    }
  }

  renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.engine.playerData.inventory = this.engine.playerData.inventory || [];
    const inv = this.engine.playerData.inventory;
    
    for (let i = 0; i < 16; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      if (inv[i]) {
        slot.innerHTML = `<span>${inv[i].icon || '📦'}</span><span class="inv-qty">${inv[i].qty}</span>`;
        slot.draggable = true;
        slot.ondragstart = (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'inventory', index: i }));
        
        slot.onmouseenter = (e) => {
          const tooltip = document.getElementById('item-tooltip');
          if (tooltip) {
            tooltip.innerHTML = `<strong style="color: var(--accent-neon);">${inv[i].name}</strong><br><span style="color: #aaa;">Quantity: ${inv[i].qty}</span>`;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        slot.onmousemove = (e) => {
          const tooltip = document.getElementById('item-tooltip');
          if (tooltip) {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        slot.onmouseleave = () => {
          const tooltip = document.getElementById('item-tooltip');
          if (tooltip) tooltip.style.display = 'none';
        };
      }
      
      slot.ondragover = (e) => e.preventDefault();
      slot.ondrop = (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.source === 'trade' && this.currentTrade) {
            const temp = inv[i];
            inv[i] = this.currentTrade.self[data.index];
            this.currentTrade.self[data.index] = temp || null;
            this.renderInventory();
            this.renderTradeGrids();
        } else if (data.source === 'inventory') {
            const temp = inv[i];
            inv[i] = inv[data.index];
            inv[data.index] = temp || null;
            this.renderInventory();
            this.engine.network.sendInventoryMove(data.index, i);
        }
      };
      
      grid.appendChild(slot);
    }

    const currencyEl = document.getElementById('inv-currency');
    if (currencyEl) currencyEl.innerText = (this.engine.playerData.currency || 0).toLocaleString();
  }

  setupTradeUI() {
    const tradePanel = document.getElementById('trade-panel');
    const btnCloseTrade = document.getElementById('btn-close-trade');
    const btnAcceptTrade = document.getElementById('btn-trade-accept');

    const tradeCurrencyInput = document.getElementById('trade-offer-currency');
    if (tradeCurrencyInput) {
      tradeCurrencyInput.oninput = (e) => {
        let val = parseInt(e.target.value, 10) || 0;
        if (val < 0) val = 0;
        if (val > (this.engine.playerData.currency || 0)) val = this.engine.playerData.currency || 0;
        e.target.value = val;
      };
    }

    if (tradePanel) {
      if (btnCloseTrade) btnCloseTrade.onclick = () => this.closeTrade();
      if (btnAcceptTrade) btnAcceptTrade.onclick = () => {
        btnAcceptTrade.innerText = "Accepted!";
        btnAcceptTrade.style.pointerEvents = 'none';
        btnAcceptTrade.style.background = 'rgba(46, 204, 113, 0.2)';
        btnAcceptTrade.style.borderColor = '#2ecc71';
        btnAcceptTrade.style.color = '#2ecc71';
      };
    }
  }

  closeTrade() {
    const tradePanel = document.getElementById('trade-panel');
    if (tradePanel) tradePanel.style.display = 'none';

    if (this.currentTrade) {
      const inv = this.engine.playerData.inventory || [];
      this.currentTrade.self.forEach(item => {
        if (item) {
          let placed = false;
          for (let i = 0; i < 16; i++) {
            if (!inv[i]) {
              inv[i] = item;
              placed = true;
              break;
            }
          }
          if (!placed) inv.push(item);
        }
      });
      this.currentTrade = null;
      this.renderInventory();
    }
  }

  renderTradeGrids() {
    const gridSelf = document.getElementById('trade-grid-self');
    const gridPartner = document.getElementById('trade-grid-partner');
    if (!gridSelf || !gridPartner || !this.currentTrade) return;

    gridSelf.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slotS = document.createElement('div'); 
      slotS.className = 'inv-slot'; 
      const item = this.currentTrade.self[i];
      if (item) {
        slotS.innerHTML = `<span>${item.icon || '📦'}</span><span class="inv-qty">${item.qty}</span>`;
        slotS.draggable = true;
        slotS.ondragstart = (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'trade', index: i }));
        
        slotS.onmouseenter = (e) => {
          const tooltip = document.getElementById('item-tooltip');
          if (tooltip) {
            tooltip.innerHTML = `<strong style="color: var(--accent-neon);">${item.name}</strong><br><span style="color: #aaa;">Quantity: ${item.qty}</span>`;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        slotS.onmousemove = (e) => {
          const tooltip = document.getElementById('item-tooltip');
          if (tooltip) { tooltip.style.left = (e.clientX + 15) + 'px'; tooltip.style.top = (e.clientY + 15) + 'px'; }
        };
        slotS.onmouseleave = () => {
          const tooltip = document.getElementById('item-tooltip');
          if (tooltip) tooltip.style.display = 'none';
        };
      }

      slotS.ondragover = (e) => e.preventDefault();
      slotS.ondrop = (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.source === 'inventory') {
            this.engine.playerData.inventory = this.engine.playerData.inventory || [];
            const inv = this.engine.playerData.inventory;
            const temp = this.currentTrade.self[i];
            this.currentTrade.self[i] = inv[data.index];
            inv[data.index] = temp || null;
            this.renderInventory();
            this.renderTradeGrids();
        } else if (data.source === 'trade') {
            const temp = this.currentTrade.self[i];
            this.currentTrade.self[i] = this.currentTrade.self[data.index];
            this.currentTrade.self[data.index] = temp || null;
            this.renderTradeGrids();
        }
      };
      gridSelf.appendChild(slotS);
    }

    gridPartner.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slotP = document.createElement('div'); 
      slotP.className = 'inv-slot'; 
      const item = this.currentTrade.partner[i];
      if (item) {
        slotP.innerHTML = `<span>${item.icon || '📦'}</span><span class="inv-qty">${item.qty}</span>`;
      }
      gridPartner.appendChild(slotP);
    }
  }

  openTrade(partnerName) {
    const tradePanel = document.getElementById('trade-panel');
    if (tradePanel) {
      document.getElementById('trade-partner-name').innerText = partnerName;
      tradePanel.style.display = 'flex';
      
      this.currentTrade = { self: new Array(9).fill(null), partner: new Array(9).fill(null) };
      
      const tradeCurrencyInput = document.getElementById('trade-offer-currency');
      if (tradeCurrencyInput) tradeCurrencyInput.value = '0';
      const tradePartnerCurrency = document.getElementById('trade-partner-currency');
      if (tradePartnerCurrency) tradePartnerCurrency.innerText = '0';

      const btnAcceptTrade = document.getElementById('btn-trade-accept');
      if (btnAcceptTrade) {
        btnAcceptTrade.innerText = "Accept Trade";
        btnAcceptTrade.style.pointerEvents = 'auto';
        btnAcceptTrade.className = 'btn-primary';
        btnAcceptTrade.style.background = '';
        btnAcceptTrade.style.borderColor = '';
        btnAcceptTrade.style.color = '';
      }

      this.renderTradeGrids();
    }
  }
}
