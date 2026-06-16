import { ProgressionSystem } from '../windows/progression.js?v=cache-bust-005';

export class HudAltUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.els = {};
    this.setupUI();
  }

  setupUI() {
    let altUiContainer = document.getElementById('alt-ui-container');
    if (!altUiContainer) {
      altUiContainer = document.createElement('div');
      altUiContainer.id = 'alt-ui-container';
      altUiContainer.style.cssText = 'position: absolute; top: 10px; right: 10px; width: 280px; background: rgba(5, 7, 10, 0.85); border: 2px solid #3498db; border-radius: 6px; padding: 10px; display: none; flex-direction: column; gap: 6px; z-index: 1000; pointer-events: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5);';

      altUiContainer.innerHTML = `
        <div id="alt-ui-drag-handle" style="display: flex; justify-content: space-between; align-items: center; cursor: move; padding-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px; gap: 10px;">
          <div id="alt-ui-level" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #9b59b6; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-family: 'Arial Black', Impact, sans-serif; background: linear-gradient(135deg, #111, #333); font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.8);">1</div>
          <div style="flex-grow: 1; text-align: left; display: flex; flex-direction: column;">
            <div id="alt-ui-name" style="color: #fff; font-weight: bold; font-family: 'Arial Black', Impact, sans-serif; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8); font-size: 1.1rem; letter-spacing: 0.5px; line-height: 1.2;">Player Name</div>
            <div id="alt-ui-currency" style="color: #2ecc71; font-weight: bold; font-family: var(--font-mono); font-size: 0.8rem; text-shadow: 1px 1px 0 #000; line-height: 1;">$0</div>
          </div>
          <button id="alt-ui-menu-btn" style="background: linear-gradient(to bottom, #34495e, #2c3e50); color: #fff; border: 1px solid #1abc9c; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-family: 'Arial Black', Impact, sans-serif; font-size: 0.8rem; text-transform: uppercase; box-shadow: 0 2px 5px rgba(0,0,0,0.5); transition: all 0.2s;">Menu</button>
          <div id="alt-ui-dropdown" style="position: absolute; top: 100%; right: 0; background: rgba(5, 7, 10, 0.95); border: 2px solid #3498db; border-radius: 6px; display: none; flex-direction: column; gap: 5px; padding: 10px; z-index: 1001; min-width: 200px; box-shadow: 0 4px 10px rgba(0,0,0,0.8); cursor: default; margin-top: 10px;">
          <p style="text-align: center; margin: 0; color: #1abc9c">Game</p>
            <hr style="border: 0; border-top: 1px solid #1abc9c; margin: 2px 0;">
            <button class="btn-secondary alt-menu-btn" id="alt-btn-player-search" style="text-align: left; padding: 6px 10px;">Player Search</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-fullscreen-map" style="text-align: left; padding: 6px 10px;">Fullscreen Map</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-inventory" style="text-align: left; padding: 6px 10px;">Inventory</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-bank" style="text-align: left; padding: 6px 10px;">Account Vault</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-badges" style="text-align: left; padding: 6px 10px;">Badges & Honors</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-editmode" style="text-align: left; padding: 6px 10px;">Builder Mode (/edit)</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-dev-tools" style="text-align: left; padding: 6px 10px; display: none; border-color: #1abc9c; color: #1abc9c;">Developer Tools</button>
            <p style="text-align: center; margin: 0; color: #1abc9c">Combat</p>
            <hr style="border: 0; border-top: 1px solid #1abc9c; margin: 2px 0;">
            <button class="btn-secondary alt-menu-btn" id="alt-btn-combat-stats" style="text-align: left; padding: 6px 10px;">Combat Statistics</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-powers" style="text-align: left; padding: 6px 10px;">Powers and Abilities</button>
            <p style="text-align: center; margin: 0; color: #1abc9c">Account</p>
            <hr style="border: 0; border-top: 1px solid #1abc9c; margin: 2px 0;">
            <button class="btn-secondary alt-menu-btn" id="alt-btn-settings" style="text-align: left; padding: 6px 10px;">Settings</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-char-select" style="text-align: left; padding: 6px 10px;">Change Character</button>
            <button class="btn-secondary alt-menu-btn" id="alt-btn-logout" style="text-align: left; padding: 6px 10px; color: #e74c3c; border-color: #e74c3c;">Logout</button>
          </div>
        </div>
        <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
          <div id="alt-ui-hp-fill" style="height: 100%; width: 100%; background: linear-gradient(to right, #27ae60, #2ecc71); transition: width 0.2s;"></div>
          <div id="alt-ui-hp-text" style="position: absolute; width: 100%; text-align: center; top: 1px; font-size: 0.75rem; color: #fff; font-weight: bold; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">100 / 100</div>
        </div>
        <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
          <div id="alt-ui-ep-fill" style="height: 100%; width: 100%; background: linear-gradient(to right, #0984e3, #74b9ff); transition: width 0.2s;"></div>
          <div id="alt-ui-ep-text" style="position: absolute; width: 100%; text-align: center; top: 1px; font-size: 0.75rem; color: #fff; font-weight: bold; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">100 / 100</div>
        </div>
        <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px;" id="alt-ui-bp-container">
          <div id="alt-ui-bp-fill" style="height: 100%; width: 100%; background: linear-gradient(to right, #0097e6, #00d2ff); transition: width 0.2s;"></div>
          <div id="alt-ui-bp-text" style="position: absolute; width: 100%; text-align: center; top: 1px; font-size: 0.75rem; color: #fff; font-weight: bold; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">100 / 100</div>
        </div>
        <div id="alt-ui-xp-container" style="position: relative; height: 12px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; display: flex;" title="Experience">
          <div id="alt-ui-xp-fill" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: linear-gradient(to right, #8e44ad, #9b59b6); transition: width 0.2s; z-index: 1;"></div>
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; z-index: 2; pointer-events: none;">
             ${Array.from({ length: 10 }).map((_, i) => `<div style="flex: 1; border-right: ${i < 9 ? '1px solid rgba(0,0,0,0.8)' : 'none'}; box-sizing: border-box; background: rgba(255,255,255,0.05);"></div>`).join('')}
          </div>
        </div>
        <div id="alt-ui-buffs" style="margin-top: 8px; min-height: 24px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
      `;
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(altUiContainer);
      else document.body.appendChild(altUiContainer);

      this.ui.makeDraggable('alt-ui-container', '#alt-ui-drag-handle');
      this.ui.applySavedPos('alt-ui-container', 'b_alt_ui_pos');

      const altMenuBtn = document.getElementById('alt-ui-menu-btn');
      const altDropdown = document.getElementById('alt-ui-dropdown');
      if (altMenuBtn && altDropdown) {
        altMenuBtn.onclick = (e) => {
          e.stopPropagation();
          altDropdown.style.display = altDropdown.style.display === 'none' ? 'flex' : 'none';
        };

        document.addEventListener('click', (e) => {
          if (altDropdown.style.display === 'flex' && !altDropdown.contains(e.target) && e.target !== altMenuBtn) {
            altDropdown.style.display = 'none';
          }
        });

        const closeDropdown = () => { altDropdown.style.display = 'none'; };

        document.getElementById('alt-btn-combat-stats').onclick = () => {
          if (this.ui.combatStats) this.ui.combatStats.toggle();
          closeDropdown();
        };
        document.getElementById('alt-btn-powers').onclick = () => {
          document.getElementById('btn-powers')?.click();
          closeDropdown();
        };
        document.getElementById('alt-btn-inventory').onclick = () => {
          document.getElementById('btn-inventory')?.click();
          closeDropdown();
        };
        document.getElementById('alt-btn-bank').onclick = () => {
          if (this.engine.chat) this.engine.chat.commandHandler.processCommand('/bank');
          closeDropdown();
        };
        document.getElementById('alt-btn-fullscreen-map').onclick = () => {
          document.getElementById('btn-fullscreen-map')?.click();
          closeDropdown();
        };
        document.getElementById('alt-btn-player-search').onclick = () => {
          document.getElementById('btn-player-list')?.click();
          closeDropdown();
        };
        document.getElementById('alt-btn-editmode').onclick = () => {
          if (this.engine.chat) this.engine.chat.commandHandler.processCommand('/editmode');
          closeDropdown();
        };
        document.getElementById('alt-btn-dev-tools').onclick = () => {
          if (this.engine.chat) this.engine.chat.commandHandler.processCommand('/dev');
          closeDropdown();
        };
        document.getElementById('alt-btn-settings').onclick = () => {
          document.getElementById('btn-main-settings')?.click();
          closeDropdown();
        };
        document.getElementById('alt-btn-char-select').onclick = () => {
          document.getElementById('btn-char-select')?.click();
          closeDropdown();
        };
        document.getElementById('alt-btn-badges').onclick = () => {
          if (this.ui.badges) this.ui.badges.toggle();
          closeDropdown();
        };
        document.getElementById('alt-btn-logout').onclick = () => {
          document.getElementById('btn-logout')?.click();
          closeDropdown();
        };
      }
    }

    let classicXpContainer = document.getElementById('classic-xp-container');
    if (!classicXpContainer) {
      classicXpContainer = document.createElement('div');
      classicXpContainer.id = 'classic-xp-container';
      classicXpContainer.style.cssText = 'width: 100%; height: 10px; background: #111; border: 1px solid #333; border-radius: 3px; overflow: hidden; position: relative; margin-top: 8px; display: none;';
      classicXpContainer.innerHTML = `
        <div id="classic-xp-fill" style="height: 100%; width: 0%; background: #9b59b6; transition: width 0.2s;"></div>
        <div id="classic-xp-text" style="position: absolute; width: 100%; text-align: center; top: -2px; font-size: 0.65rem; color: #fff; text-shadow: 1px 1px 0 #000; font-family: var(--font-mono);">Level 1 | 0 / 1000 XP</div>
      `;
      const bottomHud = document.querySelector('.game-bottom-hud');
      if (bottomHud) bottomHud.appendChild(classicXpContainer);
    }

    let buffContainer = document.getElementById('buff-indicator-container');
    if (!buffContainer) {
      buffContainer = document.createElement('div');
      buffContainer.id = 'buff-indicator-container';
      buffContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 10px; z-index: 9999; background: rgba(5, 7, 10, 0.85); border: 2px solid #333; border-radius: 8px; padding: 10px; pointer-events: auto; align-items: center; min-height: 48px;';
      buffContainer.innerHTML = `<div id="buff-drag-handle" style="width: 15px; height: 100%; min-height: 24px; background: rgba(255,255,255,0.1); border-radius: 4px; cursor: move; align-self: stretch;"></div><div id="buff-indicator-list" style="display: flex; gap: 5px;"></div>`;
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(buffContainer);
      else document.body.appendChild(buffContainer);
    }
    this.ui.applySavedPos('buff-indicator-container', 'b_buff_pos');
    this.ui.makeDraggable('buff-indicator-container', '#buff-drag-handle');

    let zoneContainer = document.getElementById('zone-display-container');
    if (!zoneContainer) {
      zoneContainer = document.createElement('div');
      zoneContainer.id = 'zone-display-container';
      zoneContainer.style.cssText = 'position: absolute; top: 15px; left: 50%; transform: translateX(-50%); background: rgba(5, 7, 10, 0.85); border: 2px solid #3498db; border-radius: 6px; padding: 5px 15px; color: #f1c40f; font-family: var(--font-mono); font-size: 0.9rem; font-weight: bold; z-index: 1000; text-transform: uppercase; letter-spacing: 2px; pointer-events: none; text-shadow: 1px 1px 0 #000, 0 0 5px rgba(241, 196, 15, 0.5); box-shadow: 0 4px 10px rgba(0,0,0,0.5);';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(zoneContainer);
      else document.body.appendChild(zoneContainer);
    }
  }

  update() {
    const eng = this.engine;
    const isAltMode = (eng.clientSettings.uiMode || 'alternative') === 'alternative';
    const pd = eng.playerData;

    const altUiContainer = document.getElementById('alt-ui-container');
    const classicXpContainer = document.getElementById('classic-xp-container');
    const buffContainer = document.getElementById('buff-indicator-container');
    const zoneDisplay = document.getElementById('zone-display-container');

    if (altUiContainer) altUiContainer.style.display = isAltMode ? 'flex' : 'none';
    if (classicXpContainer) classicXpContainer.style.display = isAltMode ? 'none' : 'block';
    if (buffContainer) buffContainer.style.display = isAltMode ? 'none' : 'flex';

    const hpPercent = Math.max(0, eng.player.hp / eng.player.maxHp);
    const epPercent = Math.max(0, eng.player.energy / eng.player.maxEnergy);
    const synthPercent = Math.max(0, eng.player.synthEnergy / (eng.player.maxSynthEnergy || 1000));
    const level = pd.level || 1;
    const xp = pd.experience || 0;
    const nextXp = ProgressionSystem.getExpRequiredForNextLevel(level);
    const xpPercent = Math.max(0, Math.min(100, (xp / nextXp) * 100));

    if (isAltMode) {
      const levelEl = document.getElementById('alt-ui-level');
      if (levelEl) levelEl.innerText = level;
      const nameEl = document.getElementById('alt-ui-name');
      if (nameEl) nameEl.innerText = pd.name || 'Player';
      const currencyEl = document.getElementById('alt-ui-currency');
      if (currencyEl) currencyEl.innerText = `$${(pd.currency || 0).toLocaleString()}`;

      const hpFill = document.getElementById('alt-ui-hp-fill');
      if (hpFill) hpFill.style.width = `${hpPercent * 100}%`;
      const hpText = document.getElementById('alt-ui-hp-text');
      if (hpText) hpText.innerText = `${Math.floor(eng.player.hp)} / ${eng.player.maxHp}`;

      const epFill = document.getElementById('alt-ui-ep-fill');
      if (epFill) epFill.style.width = `${epPercent * 100}%`;
      const epText = document.getElementById('alt-ui-ep-text');
      if (epText) epText.innerText = `${Math.floor(eng.player.energy)} / ${eng.player.maxEnergy}`;

      const bpFill = document.getElementById('alt-ui-bp-fill');
      if (bpFill) bpFill.style.width = `${synthPercent * 100}%`;
      const bpText = document.getElementById('alt-ui-bp-text');
      if (bpText) bpText.innerText = `${Math.floor(eng.player.synthEnergy)} / ${eng.player.maxSynthEnergy || 1000}`;

      const xpFill = document.getElementById('alt-ui-xp-fill');
      if (xpFill) xpFill.style.width = `${xpPercent}%`;
      const xpContainer = document.getElementById('alt-ui-xp-container');
      if (xpContainer) xpContainer.title = `XP: ${Math.floor(xp)} / ${nextXp}`;

      const bpContainer = document.getElementById('alt-ui-bp-container');
      if (eng.clientSettings.mergeSynthBar && bpContainer) {
        bpContainer.style.display = 'none';
        if (epText) epText.innerText = `${Math.floor(eng.player.energy)} E / ${Math.floor(eng.player.synthEnergy)} S`;
      } else if (bpContainer) {
        bpContainer.style.display = 'block';
      }

      const buffList = document.getElementById('buff-indicator-list');
      const altBuffs = document.getElementById('alt-ui-buffs');
      if (buffList && altBuffs && buffList.parentNode !== altBuffs) altBuffs.appendChild(buffList);

    } else {
      const cXpFill = document.getElementById('classic-xp-fill');
      if (cXpFill) cXpFill.style.width = `${xpPercent}%`;
      const cXpText = document.getElementById('classic-xp-text');
      if (cXpText) cXpText.innerText = `Level ${level} | ${xp} / ${nextXp} XP`;

      const buffList = document.getElementById('buff-indicator-list');
      if (buffList && buffContainer && buffList.parentNode !== buffContainer) buffContainer.appendChild(buffList);
    }

    if (zoneDisplay && eng.currentZone) {
      let displayZone = eng.currentZone;
      if (displayZone.startsWith('apt_')) {
        const aptName = displayZone.substring(4);
        displayZone = aptName.charAt(0).toUpperCase() + aptName.slice(1) + "'s Apartment";
      }
      const zoneText = `ZONE: ${displayZone}`;
      if (zoneDisplay.innerText !== zoneText) zoneDisplay.innerText = zoneText;
    }

    // Common UI (Classic HP/EP Bars) update
    const cHpFill = document.getElementById('health-bar-fill');
    if (cHpFill) cHpFill.style.width = `${hpPercent * 100}%`;
    const cHpText = document.getElementById('health-bar-text');
    if (cHpText) cHpText.innerText = `${Math.floor(eng.player.hp)} / ${eng.player.maxHp}`;

    const cEpFill = document.getElementById('energy-bar-fill');
    if (cEpFill) cEpFill.style.width = `${epPercent * 100}%`;
    const cEpText = document.getElementById('energy-bar-text');
    if (cEpText) cEpText.innerText = `${Math.floor(eng.player.energy)} / ${eng.player.maxEnergy}`;

    const cBpFill = document.getElementById('synth-bar-fill');
    if (cBpFill) cBpFill.style.width = `${synthPercent * 100}%`;
    const cBpText = document.getElementById('synth-bar-text');
    if (cBpText) cBpText.innerText = `${Math.floor(eng.player.synthEnergy)} / ${eng.player.maxSynthEnergy || 1000}`;
  }
}
