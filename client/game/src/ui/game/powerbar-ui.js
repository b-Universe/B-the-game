import { POWER_REGISTRY } from './registry.js?v=cache-bust-005';
export class PowerbarUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.powerSlots = [];
    this.numTrays = parseInt(localStorage.getItem('b_powerbar_trays'), 10) || 1;

    this.ui.makeDraggable('powers-panel', '.dev-panel-header');

    if (!document.getElementById('powerbar-styles')) {
        const style = document.createElement('style');
        style.id = 'powerbar-styles';
        style.innerHTML = `
            @keyframes casting-pulse {
                0% { box-shadow: inset 0 0 10px rgba(241, 196, 15, 0.2), 0 0 5px rgba(241, 196, 15, 0.5); border-color: #f1c40f; }
                50% { box-shadow: inset 0 0 20px rgba(241, 196, 15, 0.6), 0 0 15px rgba(241, 196, 15, 1); border-color: #fff; }
                100% { box-shadow: inset 0 0 10px rgba(241, 196, 15, 0.2), 0 0 5px rgba(241, 196, 15, 0.5); border-color: #f1c40f; }
            }
            .casting-pulse { animation: casting-pulse 1s infinite; }

            @keyframes ready-flash {
                0% { box-shadow: inset 0 0 30px rgba(52, 152, 219, 1), 0 0 20px rgba(52, 152, 219, 1); border-color: #fff; transform: scale(1.1); }
                100% { box-shadow: inset 0 0 10px rgba(0,0,0,0.8); border-color: var(--accent-neon, #3498db); transform: scale(1); }
            }
            .ready-flash { animation: ready-flash 0.5s ease-out; }
        `;
        document.head.appendChild(style);
    }

    this.setupPowerbar();
    this.setupPowersUI();
  }

  setupPowerbar() {
    let container = document.getElementById('powerbar-container');
    const isNew = !container;
    if (!container) {
      container = document.createElement('div');
      container.id = 'powerbar-container';

      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) {
        const scaler = gameScreen.querySelector('.screen-scaler');
        if (scaler) scaler.appendChild(container);
        else gameScreen.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }

    const orient = (this.engine.clientSettings && this.engine.clientSettings.powerbarOrientation) || 'horizontal';

    if (isNew) {
      const savedPowerbarPos = localStorage.getItem('b_powerbar_pos');
      if (savedPowerbarPos) {
        container.style.cssText = `position: absolute; display: flex; z-index: 999999; padding: 10px; background: rgba(5, 7, 10, 0.85); border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.8); pointer-events: auto;`;
      } else {
        container.style.cssText = `position: absolute; bottom: 85px; right: 0; display: flex; z-index: 999999; padding: 10px; background: rgba(5, 7, 10, 0.85); border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.8); pointer-events: auto;`;
      }
    }

    const flexDirContainer = orient === 'horizontal' ? 'row' : 'column';
    const controlsFlexDir = orient === 'horizontal' ? 'column' : 'row';
    const gridCols = orient === 'horizontal' ? `repeat(10, 44px)` : `repeat(${this.numTrays}, 44px)`;
    const gridRows = orient === 'horizontal' ? `repeat(${this.numTrays}, 44px)` : `repeat(10, 44px)`;
    const gridFlow = orient === 'horizontal' ? 'row' : 'column';

    container.style.flexDirection = flexDirContainer;
    container.style.alignItems = 'center';

    container.innerHTML = `
      <div style="display: flex; flex-direction: ${controlsFlexDir}; gap: 5px; align-items: center; justify-content: center;">
        <div id="powerbar-drag-handle" style="width: 20px; height: 20px; background: rgba(255,255,255,0.1); border: 1px solid var(--text-dim); border-radius: 4px; cursor: move; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #aaa;" title="Drag Powerbar">⋮</div>
        <button id="btn-add-tray" class="btn-secondary" style="width: 20px; height: 20px; padding: 0; font-size: 16px; line-height: 1; border-color: #2ecc71; color: #2ecc71; display: flex; align-items: center; justify-content: center;" title="Add Power Tray">+</button>
        <button id="btn-remove-tray" class="btn-secondary" style="width: 20px; height: 20px; padding: 0; font-size: 16px; line-height: 1; border-color: #e74c3c; color: #e74c3c; display: flex; align-items: center; justify-content: center;" title="Remove Power Tray">-</button>
      </div>
      <div id="powerbar-slots" style="display: grid; grid-template-columns: ${gridCols}; grid-template-rows: ${gridRows}; grid-auto-flow: ${gridFlow}; gap: 6px;"></div>
    `;

    document.getElementById('btn-add-tray').onclick = () => {
      if (this.numTrays < 3) {
        this.numTrays++;
        localStorage.setItem('b_powerbar_trays', this.numTrays);
        this.setupPowerbar();
      }
    };

    document.getElementById('btn-remove-tray').onclick = () => {
      if (this.numTrays > 1) {
        this.numTrays--;
        localStorage.setItem('b_powerbar_trays', this.numTrays);
        this.setupPowerbar();
      }
    };

    this.powerSlots = [];
    const slotsContainer = document.getElementById('powerbar-slots');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    for (let i = 0; i < this.numTrays * 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'powerbar-slot';
      slot.style.cssText = 'width: 44px; height: 44px; background: rgba(0, 0, 0, 0.7); border: 2px solid #444; border-radius: 4px; position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);';

      const keyLabel = document.createElement('span');
      keyLabel.innerText = i < 10 ? keys[i] : '';
      keyLabel.style.cssText = 'position: absolute; top: 2px; left: 4px; font-size: 0.75rem; font-weight: bold; color: #888; font-family: var(--font-mono, monospace); text-shadow: 1px 1px 0 #000;';

      const iconOrName = document.createElement('div');
      iconOrName.style.cssText = 'color: #fff; font-size: 0.7rem; font-family: var(--font-header, sans-serif); text-align: center; line-height: 1.1; pointer-events: none; padding: 0 2px; word-wrap: break-word; overflow: hidden; max-height: 30px; text-shadow: 1px 1px 0 #000; z-index: 3;';

      const overlay = document.createElement('div');
      overlay.className = 'cooldown-overlay';
      overlay.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 100%; height: 0%; background: rgba(0, 0, 0, 0.75); pointer-events: none; z-index: 2;';

      slot.appendChild(overlay);
      slot.appendChild(keyLabel);
      slot.appendChild(iconOrName);
      slotsContainer.appendChild(slot);

      slot.onmouseenter = () => {
        const tray = this.engine.playerData.powerTray || [];
        const powerName = tray[i];
        if (powerName) slot.style.background = 'rgba(52, 152, 219, 0.4)';
      };
      slot.onmouseleave = () => slot.style.background = 'rgba(0, 0, 0, 0.7)';

      slot.draggable = true;
      slot.ondragstart = (e) => {
        const tray = this.engine.playerData.powerTray || [];
        if (tray[i]) {
          e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'tray', index: i }));
        } else {
          e.preventDefault(); // Prevent dragging completely empty slots
        }
      };
      slot.ondragover = (e) => e.preventDefault();
      slot.ondragend = (e) => {
        if (e.dataTransfer.dropEffect === 'none') {
          const tray = this.engine.playerData.powerTray || [];
          tray[i] = null;
          while (tray.length > 0 && tray[tray.length - 1] === null) tray.pop();
          this.engine.playerData.powerTray = tray;
          this.updatePowerbar();
        }
      };
      slot.ondrop = (e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          const tray = this.engine.playerData.powerTray || [];
          if (data.source === 'tray') {
            const fromIdx = data.index;
            const toIdx = i;
            if (fromIdx !== toIdx) {
              while (tray.length <= Math.max(fromIdx, toIdx)) tray.push(null);

              const temp = tray[fromIdx];
              tray[fromIdx] = tray[toIdx];
              tray[toIdx] = temp;

              while (tray.length > 0 && tray[tray.length - 1] === null) tray.pop();

              this.engine.playerData.powerTray = tray;
              this.updatePowerbar();
            }
          } else if (data.source === 'powersList') {
            const pDef = window.POWER_REGISTRY[data.powerId];
            if (pDef && pDef.type?.toLowerCase() === 'passive') {
              if (this.engine.ui) this.engine.ui.showSystemMessage("Passive powers cannot be placed on the hotbar.");
              return;
            }
            while (tray.length <= i) tray.push(null);
            tray[i] = data.powerId;
            this.engine.playerData.powerTray = tray;
            this.updatePowerbar();
          }
        } catch (err) { }
      };

      slot.onclick = () => {
        const tray = this.engine.playerData.powerTray || [];
        const powerName = tray[i];
        if (powerName) {
          this.engine.combat?.usePower(powerName);
        }
      };

      this.powerSlots.push({ element: slot, iconEl: iconOrName, overlayEl: overlay, keyLabel: keyLabel });
    }
    this.updatePowerbar();
    if (this.ui && this.ui.makeDraggable) {
      this.ui.makeDraggable('powerbar-container', '#powerbar-drag-handle');
    }
  }

  updatePowerbar() {
    if (!this.powerSlots) return;
    const tray = this.engine.playerData.powerTray || [];
    const binds = this.engine.clientSettings?.actionBinds || {};

    for (let i = 0; i < this.powerSlots.length; i++) {
      const slotData = this.powerSlots[i];

      let keyText = '';
      if (i < 10) {
        const pBind = binds[`power${i + 1}`];
        if (pBind) {
          keyText = (pBind.primary || pBind.alt || '').toUpperCase().replace(/CONTROL/g, 'CTRL').replace(/\+/g, ' + ');
        }
      }
      slotData.keyLabel.innerText = keyText;

      const powerId = tray[i];
      if (powerId) {
        const powerName = POWER_REGISTRY[powerId] ? POWER_REGISTRY[powerId].name : powerId;
        const words = powerName.split(' ');
        let displayTxt = powerName;
        if (displayTxt.length > 8) {
          displayTxt = words.map(w => w[0]).join('').toUpperCase();
          if (words.length === 1) displayTxt = displayTxt.substring(0, 6) + '..';
        }
        slotData.iconEl.innerText = displayTxt;
        const isActive = this.engine.player && this.engine.player.activePowers && this.engine.player.activePowers.includes(powerId);
        if (isActive) {
          slotData.element.style.borderColor = '#2ecc71';
          slotData.element.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.6), inset 0 0 10px rgba(0,0,0,0.8)';
        } else {
          slotData.element.style.borderColor = 'var(--accent-neon, #3498db)';
          slotData.element.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.8)';
        }
        slotData.element.title = powerName + (isActive ? ' (Active)' : '');
      } else {
        slotData.iconEl.innerText = '';
        slotData.element.style.borderColor = '#444';
        slotData.element.title = 'Empty Slot';
      }
    }
  }

  updateCooldowns() {
    if (!this.powerSlots) return;
    const tray = this.engine.playerData.powerTray || [];
    const now = Date.now();
    const lastAttackTimes = this.engine.player.lastAttackTimes || {};

    for (let i = 0; i < this.powerSlots.length; i++) {
      const slotData = this.powerSlots[i];
      const powerId = tray[i];
      if (powerId && POWER_REGISTRY[powerId]) {
        const cooldownMs = (POWER_REGISTRY[powerId].stats?.rechargeRate || 0) * 1000;
        const lastTime = lastAttackTimes[powerId] || 0;
        const elapsed = now - lastTime;
        const isCasting = this.engine.player && this.engine.player.castingPower === powerId && this.engine.player.actionTimer > 0;

        if (isCasting) {
          const powerDef = POWER_REGISTRY[powerId];
          const activationMs = (powerDef.stats?.activationTime || 0.5) * 1000;
          const castElapsed = activationMs - this.engine.player.actionTimer;
          const percent = Math.max(0, Math.min(100, (castElapsed / activationMs) * 100));
          slotData.overlayEl.style.height = `${100 - percent}%`;
          slotData.overlayEl.style.background = 'rgba(241, 196, 15, 0.6)';
          slotData.element.classList.add('casting-pulse');
        } else if (elapsed < cooldownMs) {
          const percent = 100 - ((elapsed / cooldownMs) * 100);
          slotData.overlayEl.style.height = `${percent}%`;
          slotData.overlayEl.style.background = 'rgba(0, 0, 0, 0.75)';
          slotData.element.classList.remove('casting-pulse');
          slotData.wasOnCooldown = true;
        } else {
          slotData.overlayEl.style.height = '0%';
          slotData.element.classList.remove('casting-pulse');
          if (slotData.wasOnCooldown) {
            slotData.wasOnCooldown = false;
            slotData.element.classList.remove('ready-flash');
            void slotData.element.offsetWidth; // trigger reflow
            slotData.element.classList.add('ready-flash');
          }
        }
      } else if (slotData.overlayEl) {
        slotData.overlayEl.style.height = '0%';
        slotData.element.classList.remove('casting-pulse');
      }
    }
  }

  setupPowersUI() {
    const btnPowers = document.getElementById('btn-powers');
    const powersPanel = document.getElementById('powers-panel');
    if (btnPowers && powersPanel) {
      btnPowers.onclick = (e) => {
        e.stopPropagation();
        powersPanel.style.display = powersPanel.style.display === 'none' ? 'flex' : 'none';
        if (powersPanel.style.display === 'flex') this.renderPowersUI();
      };
      const btnClose = document.getElementById('btn-close-powers');
      if (btnClose) btnClose.onclick = () => powersPanel.style.display = 'none';
    }
  }

  renderPowersUI() {
    const pd = this.engine.playerData;
    const level = pd.level || 1;

    const elLevel = document.getElementById('powers-level-text');
    const elLearned = document.getElementById('powersets-learned-text');
    const elPicks = document.getElementById('powers-picks-text');
    const elSets = document.getElementById('powersets-picks-text');
    const elSlots = document.getElementById('powers-slots-text');
    const listContainer = document.getElementById('powers-list-container');

    if (!listContainer) return;

    const totalPowerPicks = pd.unspentPowerPicks !== undefined ? pd.unspentPowerPicks : 0;
    const totalPowersetPicks = pd.unspentPowersetPicks !== undefined ? pd.unspentPowersetPicks : 0;
    const learnedSetsCount = pd.powersets ? pd.powersets.length : 0;
    const totalEnhancementSlots = Math.ceil(level / 2) * 2;

    if (elLevel) elLevel.innerText = level;
    if (elPicks) elPicks.innerText = totalPowerPicks;
    if (elSets) elSets.innerText = totalPowersetPicks;
    if (elSlots) elSlots.innerText = totalEnhancementSlots;
    if (elLearned) elLearned.innerText = learnedSetsCount;

    listContainer.innerHTML = '';
    const powers = pd.powers || [];

    if (powers.filter(Boolean).length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px; font-family: var(--font-mono); font-size: 0.9rem;">No powers selected.</div>`;
    } else {
      powers.forEach((pId, idx) => {
        if (!pId) return;
        const pName = POWER_REGISTRY[pId] ? POWER_REGISTRY[pId].name : pId;
        const pDiv = document.createElement('div');
        pDiv.style.cssText = 'background: rgba(0,0,0,0.4); border: 1px solid var(--text-dim); padding: 10px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; font-family: var(--font-mono); cursor: grab;';
        pDiv.draggable = true;
        pDiv.ondragstart = (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'powersList', powerId: pId }));
        };
        pDiv.innerHTML = `
          <span style="color: var(--accent-neon); font-weight: bold; font-size: 0.95rem;">${pName}</span>
          <div style="display: flex; gap: 5px;">
            <div style="width: 14px; height: 14px; background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; border-radius: 50%;" title="Enhancement Slot (Empty)"></div>
            <div style="width: 14px; height: 14px; background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; border-radius: 50%;" title="Enhancement Slot (Empty)"></div>
          </div>
        `;
        listContainer.appendChild(pDiv);
      });
    }
  }
}
