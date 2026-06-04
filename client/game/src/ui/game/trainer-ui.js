import { TrainerWindow } from '../windows/trainer-windows.js?v=cache-bust-005';

export class TrainerUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.trainerWindow = new TrainerWindow();
  }

  openTrainerUI(npc) {
    const dist = Math.hypot(this.engine.player.x - npc.x, this.engine.player.y - npc.y);
    if (dist > 150) {
        this.engine.chat.addMessage('system', 'System', 'You are too far away to interact.');
        return;
    }
    this.engine.activeTrainer = npc;
    this.trainerWindow.setTrainerName(npc.name);
    this.trainerWindow.open();

    const viewDialog = document.getElementById('trainer-dialog-view');
    const viewTraining = document.getElementById('trainer-training-view');
    if (viewDialog) viewDialog.style.display = 'block';
    if (viewTraining) viewTraining.style.display = 'none';

    const powerPicks = this.engine.playerData.unspentPowerPicks || 0;
    const setPicksRaw = this.engine.playerData.unspentPowersetPicks;
    let setPicksCount = Array.isArray(setPicksRaw) ? setPicksRaw.length : (typeof setPicksRaw === 'number' ? setPicksRaw : 0);

    if (viewDialog) {
        viewDialog.innerHTML = `
            <div style="padding: var(--spacing-2); color: var(--text-primary); font-size: 1.1rem; line-height: 1.5; font-family: var(--font-mono);" id="trainer-dialog-text">
              "Hello, recruit. Ready to improve your skills?"
            </div>
            <div id="trainer-actions-container" style="display: flex; flex-direction: column; gap: var(--spacing-1); padding: var(--spacing-2); background: rgba(0,0,0,0.5); border-top: 1px solid var(--text-dim); margin: 0 calc(var(--spacing-2) * -1) calc(var(--spacing-2) * -1) calc(var(--spacing-2) * -1);"></div>
        `;

        const actionsBox = viewDialog.querySelector('#trainer-actions-container');

        const btnUnlock = document.createElement('button');
        btnUnlock.id = 'btn-trainer-unlock';
        btnUnlock.innerText = 'Select New Powerset';
        btnUnlock.className = 'b-btn b-btn-success';
        btnUnlock.style.cssText = 'width: 100%; text-align: left; display: block;';

        if (setPicksCount <= 0) {
            btnUnlock.disabled = true;
            btnUnlock.style.opacity = '0.5';
            btnUnlock.style.cursor = 'not-allowed';
        } else {
            btnUnlock.disabled = false;
            btnUnlock.style.opacity = '1';
            btnUnlock.style.cursor = 'pointer';
        }
        btnUnlock.onclick = () => {
            if (setPicksCount <= 0) return;
            if (viewDialog) viewDialog.style.display = 'none';
            if (viewTraining) {
                viewTraining.style.display = 'flex';
                this.renderPowersetUnlockUI(viewTraining, powerPicks, setPicksRaw, () => {
                    viewTraining.style.display = 'none';
                    if (viewDialog) viewDialog.style.display = 'block';
                });
            }
        };

        const btnTrain = document.createElement('button');
        btnTrain.id = 'btn-trainer-train';
        btnTrain.innerText = 'Select New Abilities';
        btnTrain.className = 'b-btn';
        btnTrain.style.cssText = 'width: 100%; text-align: left; display: block;';

        if (powerPicks <= 0) {
            btnTrain.disabled = true;
            btnTrain.style.opacity = '0.5';
            btnTrain.style.cursor = 'not-allowed';
        } else {
            btnTrain.disabled = false;
            btnTrain.style.opacity = '1';
            btnTrain.style.cursor = 'pointer';
        }
        btnTrain.onclick = () => {
            if (powerPicks <= 0) {
              this.engine.chat.addMessage('system', 'System', 'You have no unspent power picks.');
              return;
            }
            if (viewDialog) viewDialog.style.display = 'none';
            if (viewTraining) {
                viewTraining.style.display = 'flex';
                this.renderTrainingUI(viewTraining);
            }
        };

        const btnEnhance = document.createElement('button');
        btnEnhance.id = 'btn-trainer-enhance';
        btnEnhance.innerText = 'Select New Enhancement Slots';
        btnEnhance.className = 'b-btn';
        btnEnhance.style.cssText = 'width: 100%; text-align: left; display: block;';
        btnEnhance.disabled = true;
        btnEnhance.style.opacity = '0.5';
        btnEnhance.style.cursor = 'not-allowed';

        const btnLeave = document.createElement('button');
        btnLeave.id = 'btn-trainer-leave';
        btnLeave.innerText = 'Leave (close)';
        btnLeave.className = 'b-btn';
        btnLeave.style.cssText = 'width: 100%; text-align: left; display: block; color: var(--text-dim); border-color: var(--text-dim); font-family: var(--font-mono); letter-spacing: 0;';
        btnLeave.onclick = () => {
            this.engine.activeTrainer = null;
            this.trainerWindow.close();
        };

        actionsBox.appendChild(btnUnlock);
        actionsBox.appendChild(btnTrain);
        actionsBox.appendChild(btnEnhance);
        actionsBox.appendChild(btnLeave);
    }
  }

  renderTrainingUI(container) {
      let pd = this.engine.playerData;
      let powersets = pd.powersets || [];
      let powerPicks = pd.unspentPowerPicks || 0;
      let setPicksRaw = pd.unspentPowersetPicks;
      let setPicksCount = Array.isArray(setPicksRaw) ? setPicksRaw.length : (typeof setPicksRaw === 'number' ? setPicksRaw : 0);

      const renderList = () => {
        const hasPicks = powerPicks > 0 || setPicksCount > 0;
        container.innerHTML = `
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--text-dim); padding-bottom: 10px; font-family: var(--font-mono);">
             <span style="color: #f39c12; font-weight: bold;">Power Picks: ${powerPicks}</span>
             <span style="color: #f39c12; font-weight: bold;">Powerset Picks: ${setPicksCount}</span>
          </div>
          <div style="font-size: 0.9rem; color: #ccc; font-family: var(--font-mono); margin-top: 5px;">
            ${hasPicks ? 'Select a learned Powerset to train abilities:' : 'You have no unspent picks.'}
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--spacing-1); max-height: 350px; overflow-y: auto; margin-top: 5px; padding-right: 5px;">
             ${powersets.map((ps, i) => `<button class="btn-ps-select b-btn" data-index="${i}" style="text-align: left;">${ps.toUpperCase()}</button>`).join('')}
          </div>
          <button id="btn-training-back" class="b-btn" style="margin-top: var(--spacing-1);">Back</button>
        `;

        document.getElementById('btn-training-back').onclick = () => {
            document.getElementById('trainer-training-view').style.display = 'none';
            document.getElementById('trainer-dialog-view').style.display = 'block';
        };

        container.querySelectorAll('.btn-ps-select').forEach(btn => {
          btn.onclick = () => {
            const psName = powersets[parseInt(btn.dataset.index)];
            this.renderPowerSelectionUI(container, psName, powerPicks, setPicksRaw, renderList);
          };
        });
      };

      renderList();
  }

  renderPowerSelectionUI(container, psName, powerPicks, setPicksRaw, goBackCb) {
      let psData = this.engine.powersetsData[psName];
      let knownPowers = this.engine.playerData.powers || [];
      let currentPowerPicks = this.engine.playerData.unspentPowerPicks || 0;
      let setPicksCount = Array.isArray(setPicksRaw) ? setPicksRaw.length : (typeof setPicksRaw === 'number' ? setPicksRaw : 0);

      const renderPowerList = () => {
        container.innerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--text-dim); padding-bottom: 10px; font-family: var(--font-mono);">
           <span style="color: #f39c12; font-weight: bold;">Power Picks: ${powerPicks}</span>
           <span style="color: #f39c12; font-weight: bold;">Powerset Picks: ${setPicksCount}</span>
        </div>
        <div style="font-size: 0.9rem; color: #ccc; font-family: var(--font-mono); margin-top: 5px;">Abilities in <strong style="color: var(--accent-neon);">${psName.toUpperCase()}</strong>:</div>
        <div id="power-select-list" style="display: flex; flex-direction: column; gap: var(--spacing-1); max-height: 350px; overflow-y: auto; margin-top: 5px; padding-right: 5px;">
        </div>
        <button id="btn-power-back" class="b-btn" style="margin-top: var(--spacing-1);">Back</button>
      `;
        document.getElementById('btn-power-back').onclick = goBackCb;

        const powerListContainer = document.getElementById('power-select-list');
        if (!psData || !psData.powers) {
          powerListContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">Could not load power details.</div>`;
          return;
        }

        const powerItems = [];

        const updateLocks = () => {
          powerItems.forEach((pItem, idx) => {
            if (idx > 1 && psName !== 'inherited') {
              const prev1Active = powerItems[idx - 1].classList.contains('learned');
              const prev2Active = powerItems[idx - 2].classList.contains('learned');
              if (prev1Active || prev2Active) {
                pItem.classList.remove('locked');
                pItem.style.opacity = pItem.disabled ? '0.6' : '1';
                pItem.style.cursor = pItem.disabled ? 'not-allowed' : 'pointer';
              } else {
                pItem.classList.add('locked');
                pItem.style.opacity = '0.3';
                pItem.style.cursor = 'not-allowed';
              }
            } else {
              pItem.classList.remove('locked');
              pItem.style.opacity = pItem.disabled ? '0.6' : '1';
              pItem.style.cursor = pItem.disabled ? 'not-allowed' : 'pointer';
            }
          });
        };

        psData.powers.forEach((power, i) => {
          const alreadyLearned = knownPowers.includes(power.id) || knownPowers.includes(power.name);
          const canAfford = currentPowerPicks > 0;
          const isLocked = i >= 2 && psName !== 'inherited';

          const pButton = document.createElement('button');
          pButton.className = `b-btn power-select-item ${alreadyLearned ? 'learned' : ''} ${isLocked ? 'locked' : ''}`;
          pButton.style.textAlign = 'left';
          pButton.innerHTML = `<span style="color: ${alreadyLearned ? '#aaa' : '#fff'};">${power.name}</span>`;

          if (alreadyLearned) {
            pButton.disabled = true;
            pButton.style.cursor = 'not-allowed';
            pButton.style.opacity = 0.6;
          } else if (!canAfford) {
            pButton.disabled = true;
            pButton.style.cursor = 'not-allowed';
            pButton.style.opacity = 0.6;
          } else if (isLocked) {
            pButton.style.cursor = 'not-allowed';
            pButton.style.opacity = 0.3;
          }

          pButton.onclick = () => {
            if (pButton.classList.contains('locked')) {
              this.engine.chat.addMessage('system', 'System', 'You must learn earlier powers in this set first.');
            } else if (!alreadyLearned && canAfford) {
               this.engine.network.sendLearnPower({ powerId: power.id, powerset: psName });
            }
          };
          powerItems.push(pButton);
          powerListContainer.appendChild(pButton);
        });

        updateLocks();
      };

      renderPowerList();
  }

  renderPowersetUnlockUI(container, powerPicks, setPicksRaw, goBackCb) {
      let setPicksCount = 0;
      let pickType = 'any';
      if (Array.isArray(setPicksRaw) && setPicksRaw.length > 0) {
          setPicksCount = setPicksRaw.length;
          pickType = setPicksRaw[0];
      } else if (typeof setPicksRaw === 'number') {
          setPicksCount = setPicksRaw;
      }

    const allSets = Object.values(this.engine.powersetsData);
    const knownSets = this.engine.playerData.powersets || [];
      let availableSets = allSets.filter(ps => !knownSets.includes(ps.id));

      if (pickType !== 'any') {
          const allowedTypes = pickType.split('/');
          availableSets = availableSets.filter(ps => {
              const psCat = ps.category ? ps.category.toLowerCase() : '';
              const psId = ps.id.toLowerCase();
              return allowedTypes.some(t =>
                  (psCat && (psCat.includes(t) || t.includes(psCat))) ||
                  (!psCat && (psId.includes(t) || t.includes('melee') && psId.includes('fu') || t.includes('ranged') && psId.includes('blast')))
              );
          });
      }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--text-dim); padding-bottom: 10px; font-family: var(--font-mono);">
         <span style="color: #f39c12; font-weight: bold;">Power Picks: ${powerPicks}</span>
             <span style="color: #f39c12; font-weight: bold;">Powerset Picks: ${setPicksCount}</span>
      </div>
          <div style="font-size: 0.9rem; color: #ccc; font-family: var(--font-mono); margin-top: 5px;">Available Powersets ${pickType !== 'any' ? `(${pickType.toUpperCase()})` : ''}:</div>
      <div id="powerset-unlock-list" style="display: flex; flex-direction: column; gap: var(--spacing-1); max-height: 350px; overflow-y: auto; margin-top: 5px; padding-right: 5px;">
      </div>
      <button id="btn-power-back" class="b-btn" style="margin-top: var(--spacing-1);">Back</button>
    `;
    document.getElementById('btn-power-back').onclick = goBackCb;

    const setListContainer = document.getElementById('powerset-unlock-list');

    if (availableSets.length === 0) {
        setListContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">No powersets match this requirement.</div>`;
    } else {
        const groupedSets = {};
        availableSets.forEach(set => {
            const cat = set.category || 'Uncategorized';
            if (!groupedSets[cat]) groupedSets[cat] = [];
            groupedSets[cat].push(set);
        });

        const sortedCategories = Object.keys(groupedSets).sort();

        sortedCategories.forEach(cat => {
            groupedSets[cat].sort((a, b) => (a.name || a.id || '').localeCompare(b.name || b.id || ''));

            const header = document.createElement('div');
            header.style.cssText = 'color: #3498db; font-size: 0.9rem; margin-top: 10px; border-bottom: 1px solid #333; padding-bottom: 3px; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;';
            header.innerText = cat;
            setListContainer.appendChild(header);

            const integrity = this.engine.playerData.integrity || 0;

            groupedSets[cat].forEach(set => {
                const meetsMin = set.minIntegrity === undefined || integrity >= set.minIntegrity;
                const meetsMax = set.maxIntegrity === undefined || integrity <= set.maxIntegrity;
                const isLocked = !meetsMin || !meetsMax;

                const sButton = document.createElement('button');
                sButton.className = 'b-btn';
                sButton.style.cssText = 'text-align: left; margin-left: 10px; width: calc(100% - 10px);';
                sButton.innerText = (set.name || set.id || 'Unnamed').toUpperCase();

                if (isLocked) {
                    sButton.style.opacity = '0.4';
                    sButton.style.cursor = 'not-allowed';
                    let reason = '';
                    if (!meetsMin) reason = `Req ${set.minIntegrity}%+ Integrity`;
                    else if (!meetsMax) reason = `Req ${set.maxIntegrity}% or less Integrity`;
                    sButton.innerText += ` (LOCKED: ${reason})`;
                } else {
                    sButton.onclick = () => {
                        this.engine.network.sendLearnPowerset({ powerset: set.id });
                    };
                }
                setListContainer.appendChild(sButton);
            });
        });
    }
  }
}
