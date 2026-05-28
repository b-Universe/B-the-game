import { POWER_REGISTRY } from './registry.js?v=new-engine-330';
export class PowerbarUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.powerSlots = [];

    this.ui.makeDraggable('powers-panel', '.dev-panel-header');

    this.setupPowerbar();
    this.setupPowersUI();
  }

  setupPowerbar() {
    let container = document.getElementById('powerbar-container');
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
    container.style.cssText = 'position: absolute; bottom: 75px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 999999; padding: 10px; background: rgba(5, 7, 10, 0.85); border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.8); pointer-events: auto;';

    container.innerHTML = '';
    this.powerSlots = [];
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'powerbar-slot';
        slot.style.cssText = 'width: 44px; height: 44px; background: rgba(0, 0, 0, 0.7); border: 2px solid #444; border-radius: 4px; position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);';

        const keyLabel = document.createElement('span');
        keyLabel.innerText = keys[i];
        keyLabel.style.cssText = 'position: absolute; top: 2px; left: 4px; font-size: 0.75rem; font-weight: bold; color: #888; font-family: var(--font-mono, monospace); text-shadow: 1px 1px 0 #000;';

        const iconOrName = document.createElement('div');
        iconOrName.style.cssText = 'color: #fff; font-size: 0.7rem; font-family: var(--font-header, sans-serif); text-align: center; line-height: 1.1; pointer-events: none; padding: 0 2px; word-wrap: break-word; overflow: hidden; max-height: 30px; text-shadow: 1px 1px 0 #000; z-index: 3;';

        const overlay = document.createElement('div');
        overlay.className = 'cooldown-overlay';
        overlay.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 100%; height: 0%; background: rgba(0, 0, 0, 0.75); pointer-events: none; z-index: 2;';

        slot.appendChild(overlay);
        slot.appendChild(keyLabel);
        slot.appendChild(iconOrName);
        container.appendChild(slot);

        slot.onmouseenter = () => {
            const powers = this.engine.playerData.powers || [];
            const powerName = powers[i];
            if (powerName) slot.style.background = 'rgba(52, 152, 219, 0.4)';
        };
        slot.onmouseleave = () => slot.style.background = 'rgba(0, 0, 0, 0.7)';

        slot.draggable = true;
        slot.ondragstart = (e) => {
            const powers = this.engine.playerData.powers || [];
            if (powers[i]) {
                e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'powerbar', index: i }));
            } else {
                e.preventDefault(); // Prevent dragging completely empty slots
            }
        };
        slot.ondragover = (e) => e.preventDefault();
        slot.ondrop = (e) => {
            e.preventDefault();
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.source === 'powerbar') {
                    const fromIdx = data.index;
                    const toIdx = i;
                    if (fromIdx !== toIdx) {
                        const powers = this.engine.playerData.powers || [];
                        while (powers.length <= Math.max(fromIdx, toIdx)) powers.push(null);

                        const temp = powers[fromIdx];
                        powers[fromIdx] = powers[toIdx];
                        powers[toIdx] = temp;

                        while(powers.length > 0 && powers[powers.length - 1] === null) powers.pop();

                        this.engine.playerData.powers = powers;
                        this.updatePowerbar();

                        const pPanel = document.getElementById('powers-panel');
                        if (pPanel && pPanel.style.display === 'flex') this.renderPowersUI();
                    }
                }
            } catch (err) {}
        };

        slot.onclick = () => {
            const powers = this.engine.playerData.powers || [];
            const powerName = powers[i];
            if (powerName) {
                this.engine.combat?.usePower(powerName);
            }
        };

        this.powerSlots.push({ element: slot, iconEl: iconOrName, overlayEl: overlay });
    }
    this.updatePowerbar();
  }

  updatePowerbar() {
      if (!this.powerSlots) return;
      const powers = this.engine.playerData.powers || [];

      for (let i = 0; i < 10; i++) {
          const slotData = this.powerSlots[i];
          const powerId = powers[i];
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
      const powers = this.engine.playerData.powers || [];
      const now = Date.now();
      const lastAttackTimes = this.engine.player.lastAttackTimes || {};

      for (let i = 0; i < 10; i++) {
          const slotData = this.powerSlots[i];
          const powerId = powers[i];
          if (powerId && POWER_REGISTRY[powerId]) {
              const cooldownMs = POWER_REGISTRY[powerId].cooldown || 0;
              const lastTime = lastAttackTimes[powerId] || 0;
              const elapsed = now - lastTime;

              if (elapsed < cooldownMs) {
                  // Calculate the percentage remaining for the overlay height
                  const percent = 100 - ((elapsed / cooldownMs) * 100);
                  slotData.overlayEl.style.height = `${percent}%`;
              } else {
                  slotData.overlayEl.style.height = '0%';
              }
          } else if (slotData.overlayEl) {
              slotData.overlayEl.style.height = '0%';
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
           e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'powerbar', index: idx }));
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
