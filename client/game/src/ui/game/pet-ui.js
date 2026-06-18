export class PetUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.setupUI();
  }

  setupUI() {
    let petContainer = document.getElementById('pet-window');
    if (!petContainer) {
      petContainer = document.createElement('div');
      petContainer.id = 'pet-window';
      petContainer.style.cssText = 'position: absolute; top: 15px; left: 15px; background: rgba(5, 7, 10, 0.85); border: 2px solid #00d2ff; border-radius: 6px; padding: 10px; display: none; flex-direction: column; z-index: 1000; min-width: 200px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); pointer-events: auto; transition: top 0.2s ease-out; cursor: pointer;';
      petContainer.onclick = (e) => {
        const item = e.target.closest('.pet-item');
        if (item) {
          const droneId = item.dataset.id;
          const eng = this.engine;
          if (eng && eng.drones && eng.drones[droneId]) {
            eng.selectedTarget = { type: 'drone', id: droneId };
            eng.ui.update();
          }
        }
      };
      petContainer.innerHTML = `
        <div id="pet-window-header" style="background: rgba(0, 210, 255, 0.2); padding: 5px 10px; border-bottom: 1px solid #00d2ff; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; margin: -10px -10px 10px -10px;">
           <span style="color: #fff; font-weight: bold; font-size: 0.85rem; font-family: var(--font-mono); text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Robotics</span>
           <div style="display: flex; gap: 5px; align-items: center;">
               <button id="btn-pet-controls" class="btn-secondary" style="font-size: 0.7rem; padding: 2px 5px; border-color: #00d2ff; color: #00d2ff; cursor: pointer;">Controls</button>
               <button id="btn-minimize-pet" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0 4px;">-</button>
           </div>
        </div>
        <div id="pet-window-content" style="display: flex; flex-direction: column;">
          <div id="pet-controls-container" style="display: none; flex-direction: column; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; gap: 4px;">
                  <button class="btn-secondary" id="btn-pet-all-attack" style="flex: 1; font-size: 0.7rem; padding: 4px; border-color: #ff4757; color: #ff4757; cursor: pointer;">Attack</button>
                  <button class="btn-secondary" id="btn-pet-all-follow" style="flex: 1; font-size: 0.7rem; padding: 4px; border-color: #2ecc71; color: #2ecc71; cursor: pointer;">Defend</button>
                  <button class="btn-secondary" id="btn-pet-all-stay" style="flex: 1; font-size: 0.7rem; padding: 4px; border-color: #f1c40f; color: #f1c40f; cursor: pointer;">Stay</button>
                  <button class="btn-secondary" id="btn-pet-all-dismiss" style="flex: 1; font-size: 0.7rem; padding: 4px; border-color: #aaa; color: #aaa; cursor: pointer;">Dismiss</button>
              </div>
              <button class="btn-secondary" id="btn-pet-advanced" style="width: 100%; font-size: 0.7rem; padding: 2px; border-color: #9b59b6; color: #9b59b6; margin-top: 4px; cursor: pointer;">Advanced ▼</button>
          </div>
          <div id="pet-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      `;

      const btnControls = petContainer.querySelector('#btn-pet-controls');
      const controlsContainer = petContainer.querySelector('#pet-controls-container');
      const btnAdvanced = petContainer.querySelector('#btn-pet-advanced');
      const btnMinimize = petContainer.querySelector('#btn-minimize-pet');
      const content = petContainer.querySelector('#pet-window-content');

      if (btnMinimize && content) {
        btnMinimize.onclick = (e) => {
          e.stopPropagation();
          if (content.style.display === 'none') {
            content.style.display = 'flex';
            btnMinimize.innerText = '-';
          } else {
            content.style.display = 'none';
            btnMinimize.innerText = '+';
          }
        };
      }

      btnControls.onclick = (e) => { e.stopPropagation(); controlsContainer.style.display = controlsContainer.style.display === 'none' ? 'flex' : 'none'; this.engine.ui.update(); };
      btnAdvanced.onclick = (e) => { e.stopPropagation(); this.engine.petAdvancedMode = !this.engine.petAdvancedMode; btnAdvanced.innerText = this.engine.petAdvancedMode ? 'Advanced ▲' : 'Advanced ▼'; this.engine.ui.update(); };

      const sendPetCommand = (c) => { if (this.engine.network) this.engine.network.sendPetCommand(c, null, this.engine.selectedTarget); };
      petContainer.querySelector('#btn-pet-all-attack').onclick = (e) => { e.stopPropagation(); sendPetCommand('attack'); };
      petContainer.querySelector('#btn-pet-all-follow').onclick = (e) => { e.stopPropagation(); sendPetCommand('follow'); };
      petContainer.querySelector('#btn-pet-all-stay').onclick = (e) => { e.stopPropagation(); sendPetCommand('stay'); };
      petContainer.querySelector('#btn-pet-all-dismiss').onclick = (e) => { e.stopPropagation(); sendPetCommand('dismiss'); };

      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(petContainer);
      else document.body.appendChild(petContainer);
    }
  }

  update() {
    const eng = this.engine;
    const myDrones = eng.drones ? Object.values(eng.drones).filter(d => d.ownerSocketId === eng.socket?.id && d.state !== 'dead' && !d._dismissing) : [];
    const petWindow = document.getElementById('pet-window');

    if (myDrones.length > 0) {
      if (petWindow) {
        petWindow.style.display = 'flex';
        const listContainer = document.getElementById('pet-list-container');
        if (listContainer) {
          listContainer.innerHTML = '';
          myDrones.sort((a, b) => (a.orbitIndex || 0) - (b.orbitIndex || 0)).forEach(drone => {
            const dName = drone.isAssaultDrone ? 'Assault Drone' : (drone.isCombatDrone ? 'Combat Drone' : 'Satellite Drone');
            const hpPercent = Math.max(0, drone.hp / drone.maxHp);
            
            const item = document.createElement('div');
            item.className = 'pet-item';
            item.dataset.id = drone.uuid;
            const isSelected = eng.selectedTarget && eng.selectedTarget.type === 'drone' && eng.selectedTarget.id === drone.uuid;
            item.style.cssText = `margin-bottom: 4px; padding: 4px; border: 1px solid ${isSelected ? '#00d2ff' : 'transparent'}; background: ${isSelected ? 'rgba(0, 210, 255, 0.2)' : 'transparent'}; border-radius: 4px; transition: background 0.2s, border 0.2s;`;
            item.onmouseenter = () => item.style.background = isSelected ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255,255,255,0.1)';
            item.onmouseleave = () => item.style.background = isSelected ? 'rgba(0, 210, 255, 0.2)' : 'transparent';
            item.oncontextmenu = (e) => {
              e.preventDefault();
              eng.selectedTarget = { type: 'drone', id: drone.uuid };
              eng.ui.update();
              
              // Simulate a right-click on the entity to trigger the global context menu
              eng.contextTarget = eng.selectedTarget;
              const ctxMenu = document.getElementById('player-context-menu');
              if (ctxMenu) {
                let menuX = e.clientX;
                let menuY = e.clientY;
                if (menuX + 150 > window.innerWidth) menuX = window.innerWidth - 150;
                if (menuY + 60 > window.innerHeight) menuY = window.innerHeight - 60;
                
                const btnTrade = document.getElementById('ctx-btn-trade');
                const btnTalk = document.getElementById('ctx-btn-talk');
                const btnPlay = document.getElementById('ctx-btn-arcade-play');
                const btnEdit = document.getElementById('ctx-btn-arcade-edit');
                const btnPower = document.getElementById('ctx-btn-arcade-power');
                const btnInfo = document.getElementById('ctx-btn-info');
                const btnRename = document.getElementById('ctx-btn-pet-rename');
                const btnDismiss = document.getElementById('ctx-btn-pet-dismiss');

                if (btnTrade) btnTrade.style.display = 'none';
                if (btnTalk) btnTalk.style.display = 'none';
                if (btnPlay) btnPlay.style.display = 'none';
                if (btnEdit) btnEdit.style.display = 'none';
                if (btnPower) btnPower.style.display = 'none';
                if (btnInfo) btnInfo.style.display = 'block';
                if (btnRename) btnRename.style.display = 'block';
                if (btnDismiss) btnDismiss.style.display = 'block';

                ctxMenu.style.left = `${menuX}px`;
                ctxMenu.style.top = `${menuY}px`;
                ctxMenu.style.display = 'flex';
              }
            };

            item.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="color: #00d2ff; font-family: var(--font-header); font-weight: bold; font-size: 0.9rem; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8); pointer-events: none;">${drone.customName || dName} <span style="font-size: 0.75em; color: #aaa; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">(Lv.${drone.level || eng.player.level || eng.playerData?.level || 1})</span></span>
                <span style="color: #fff; font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;">${Math.floor(drone.hp)} / ${drone.maxHp}</span>
              </div>
              <div style="width: 100%; height: 6px; background: #111; border-radius: 3px; overflow: hidden; border: 1px solid #333;">
                <div style="height: 100%; background: #2ecc71; width: ${hpPercent * 100}%; transition: width 0.2s;"></div>
              </div>
            `;

            if (eng.petAdvancedMode) {
              const advancedDiv = document.createElement('div');
              advancedDiv.style.cssText = 'display: flex; justify-content: space-between; gap: 4px; margin-top: 6px;';

              const btnAttack = document.createElement('button');
              btnAttack.className = 'btn-secondary';
              btnAttack.style.cssText = 'flex: 1; font-size: 0.65rem; padding: 2px; border-color: #ff4757; color: #ff4757; cursor: pointer;';
              btnAttack.innerText = 'Attack';
              btnAttack.onclick = (e) => { e.stopPropagation(); eng.network.sendPetCommand('attack', drone.uuid, eng.selectedTarget); };

              const btnFollow = document.createElement('button');
              btnFollow.className = 'btn-secondary';
              btnFollow.style.cssText = 'flex: 1; font-size: 0.65rem; padding: 2px; border-color: #2ecc71; color: #2ecc71; cursor: pointer;';
              btnFollow.innerText = 'Follow';
              btnFollow.onclick = (e) => { e.stopPropagation(); eng.network.sendPetCommand('follow', drone.uuid); };

              const btnStay = document.createElement('button');
              btnStay.className = 'btn-secondary';
              btnStay.style.cssText = 'flex: 1; font-size: 0.65rem; padding: 2px; border-color: #f1c40f; color: #f1c40f; cursor: pointer;';
              btnStay.innerText = 'Stay';
              btnStay.onclick = (e) => { e.stopPropagation(); eng.network.sendPetCommand('stay', drone.uuid); };

              const btnDismiss = document.createElement('button');
              btnDismiss.className = 'btn-secondary';
              btnDismiss.style.cssText = 'flex: 1; font-size: 0.65rem; padding: 2px; border-color: #aaa; color: #aaa; cursor: pointer;';
              btnDismiss.innerText = 'Dismiss';
              btnDismiss.onclick = (e) => { e.stopPropagation(); eng.network.sendPetCommand('dismiss', drone.uuid); };

              advancedDiv.appendChild(btnAttack);
              advancedDiv.appendChild(btnFollow);
              advancedDiv.appendChild(btnStay);
              advancedDiv.appendChild(btnDismiss);
              item.appendChild(advancedDiv);
            }
            
            listContainer.appendChild(item);
          });
        }

        let petTop = 15;
        const tWin = document.getElementById('target-window');
        if (tWin && tWin.style.display !== 'none') petTop += tWin.offsetHeight + 10;
        petWindow.style.top = `${petTop}px`;
      }
    } else if (petWindow) {
      petWindow.style.display = 'none';
    }
  }
}
