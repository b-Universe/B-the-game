import { BaseWindow } from '../components/base-window.js?v=cache-bust-005';

export class SettingsWindow extends BaseWindow {
  constructor(app) {
    super('settings-window-panel', 'Client Settings', { width: 550, height: 600, x: window.innerWidth / 2 - 275, y: 100 });
    this.app = app;

    this.setContent(`
      <style>
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: default; }
        .settings-row:hover { background: rgba(255,255,255,0.05); }
      </style>
      <div style="display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid var(--text-dim); padding-bottom: 10px;">
        <button class="settings-tab-btn b-btn btn-primary active" data-tab="tab-graphics" style="flex: 1;">Graphics</button>
        <button class="settings-tab-btn b-btn btn-secondary" data-tab="tab-interface" style="flex: 1;">Interface</button>
        <button class="settings-tab-btn b-btn btn-secondary" data-tab="tab-gameplay" style="flex: 1;">Gameplay</button>
        <button class="settings-tab-btn b-btn btn-secondary" data-tab="tab-keybinds" style="flex: 1;">Keybinds</button>
      </div>

      <div id="tab-graphics" class="settings-tab-panel" style="display: flex; flex-direction: column; gap: 5px; max-height: 450px; overflow-y: auto; padding-right: 5px;">
        <div style="display: flex; gap: 10px; margin-bottom: 5px;">
            <button id="btn-preset-potato" class="b-btn btn-secondary" style="flex: 1; padding: 5px; font-size: 0.8rem;">Preset: Potato</button>
            <button id="btn-preset-normal" class="b-btn btn-secondary" style="flex: 1; padding: 5px; font-size: 0.8rem;">Preset: Normal</button>
            <button id="btn-preset-ultra" class="b-btn btn-secondary" style="flex: 1; padding: 5px; font-size: 0.8rem;">Preset: Ultra</button>
        </div>

        <div class="settings-row"><span class="b-label">Field of View</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-fov" class="b-label" style="color: var(--accent-neon); margin:0;">1000</span><input type="range" id="slider-fov" min="500" max="2500" step="50" value="1000" style="width: 150px;" class="b-input"></div></div>
        <div class="settings-row"><span class="b-label">Render Distance</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-render-distance" class="b-label" style="color: var(--accent-neon); margin:0;">2000</span><input type="range" id="slider-render-distance" min="800" max="4000" step="100" value="2000" style="width: 150px;" class="b-input"></div></div>
        <div class="settings-row"><span class="b-label">Render Scale (Resolution)</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-render-scale" class="b-label" style="color: var(--accent-neon); margin:0;">100%</span><input type="range" id="slider-render-scale" min="50" max="100" step="10" value="100" style="width: 150px;" class="b-input"></div></div>
        <div class="settings-row"><span class="b-label">Max Dynamic Lights</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-dynamic-lights" class="b-label" style="color: var(--accent-neon); margin:0;">48</span><input type="range" id="slider-dynamic-lights" min="0" max="100" step="4" value="48" style="width: 150px;" class="b-input"></div></div>
        <div class="settings-row"><span class="b-label">Chunk Generation Speed</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-chunk-gen-speed" class="b-label" style="color: var(--accent-neon); margin:0;">3</span><input type="range" id="slider-chunk-gen-speed" min="1" max="10" step="1" value="3" style="width: 150px;" class="b-input"></div></div>

        <div id="row-toggle-day-night" class="settings-row"><span class="b-label">Enable Day/Night Cycle</span><button id="btn-toggle-day-night" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-shadows" class="settings-row"><span class="b-label">Enable Shadows</span><button id="btn-toggle-shadows" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-soft-shadows" class="settings-row"><span class="b-label">Enable Soft Shadows</span><button id="btn-toggle-soft-shadows" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-arcade-crt" class="settings-row"><span class="b-label">Enable Arcade CRT Effect</span><button id="btn-toggle-arcade-crt" class="b-btn" style="width: 115px;">Enabled</button></div>
      </div>

      <div id="tab-interface" class="settings-tab-panel" style="display: none; flex-direction: column; gap: 5px; max-height: 450px; overflow-y: auto; padding-right: 5px;">
        <div class="settings-row"><span class="b-label">UI Scale</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-ui-scale" class="b-label" style="color: var(--accent-neon); margin:0;">100%</span><input type="range" id="slider-ui-scale" min="50" max="200" step="10" value="100" style="width: 150px;" class="b-input"></div></div>
        <div class="settings-row"><span class="b-label">Minimap Scale</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-minimap-scale" class="b-label" style="color: var(--accent-neon); margin:0;">100%</span><input type="range" id="slider-minimap-scale" min="50" max="200" step="10" value="100" style="width: 150px;" class="b-input"></div></div>
        <div id="ui-mode-row" class="settings-row"><span class="b-label">Interface Mode</span><select id="select-ui-mode" class="b-select" style="width: 115px;"><option value="classic">Classic</option><option value="alternative">Alternative</option></select></div>
        <div id="row-toggle-snap-power-tray" class="settings-row"><span class="b-label">Snap Power Tray to HUD</span><button id="btn-toggle-snap-power-tray" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-snap-active-powers" class="settings-row"><span class="b-label">Snap Buffs to HUD</span><button id="btn-toggle-snap-active-powers" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-snap-indicators" class="settings-row"><span class="b-label">Snap Indicators to HUD</span><button id="btn-toggle-snap-indicators" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="powerbar-orient-row" class="settings-row"><span class="b-label">Powerbar Orientation</span><select id="select-powerbar-orient" class="b-select" style="width: 115px;"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></div>
        <div id="row-toggle-merge-synth" class="settings-row"><span class="b-label">Merge Synthetic Energy Bar</span><button id="btn-toggle-merge-synth" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-player-names" class="settings-row"><span class="b-label">Show Player Names (N)</span><button id="btn-toggle-player-names" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-player-health" class="settings-row"><span class="b-label">Show Player Health (N)</span><button id="btn-toggle-player-health" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-entity-names" class="settings-row"><span class="b-label">Show Entity Names (N)</span><button id="btn-toggle-entity-names" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-entity-health" class="settings-row"><span class="b-label">Show Entity Health (N)</span><button id="btn-toggle-entity-health" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-minimap" class="settings-row"><span class="b-label">Show Minimap</span><button id="btn-toggle-minimap" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-minimap-rotate" class="settings-row"><span class="b-label">Rotate Minimap</span><button id="btn-toggle-minimap-rotate" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-coords" class="settings-row"><span class="b-label">Show Coordinates</span><button id="btn-toggle-coords" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-yaw-pitch" class="settings-row"><span class="b-label">Show Camera Yaw/Pitch</span><button id="btn-toggle-yaw-pitch" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-fps" class="settings-row"><span class="b-label">Show FPS</span><button id="btn-toggle-fps" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-ping" class="settings-row"><span class="b-label">Show Ping</span><button id="btn-toggle-ping" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-baseplates" class="settings-row"><span class="b-label">Show Baseplates</span><button id="btn-toggle-baseplates" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-power-raytrace" class="settings-row"><span class="b-label">Show Power Raytrace</span><button id="btn-toggle-power-raytrace" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-combat-chat" class="settings-row"><span class="b-label">Show Combat Chat</span><button id="btn-toggle-combat-chat" class="b-btn" style="width: 115px;">Enabled</button></div>
      </div>

      <div id="tab-gameplay" class="settings-tab-panel" style="display: none; flex-direction: column; gap: 5px; max-height: 450px; overflow-y: auto; padding-right: 5px;">
        <div id="combat-style-row" class="settings-row"><span class="b-label">Combat Targeting Style</span><select id="select-combat-style" class="b-select" style="width: 115px;"><option value="hybrid">Hybrid</option><option value="target">Target Only</option><option value="mouse">Mouse Only</option></select></div>
        <div id="camera-snap-row" class="settings-row"><span class="b-label">Compass Snap Angle</span><select id="select-camera-snap" class="b-select" style="width: 115px;"><option value="0">North-West</option><option value="90">North-East</option><option value="180">South-East</option><option value="270">South-West</option></select></div>
        <div class="settings-row"><span class="b-label">Camera Rotation Speed</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-camera-sensitivity" class="b-label" style="color: var(--accent-neon); margin:0;">120</span><input type="range" id="slider-camera-sensitivity" min="30" max="360" value="120" style="width: 150px;" class="b-input"></div></div>
        <div class="settings-row"><span class="b-label">Mouse Drag Sensitivity</span><div style="display: flex; align-items: center; gap: 10px;"><span id="val-drag-sensitivity" class="b-label" style="color: var(--accent-neon); margin:0;">25%</span><input type="range" id="slider-drag-sensitivity" min="5" max="100" value="25" style="width: 150px;" class="b-input"></div></div>

        <div id="row-toggle-invert-cam-x" class="settings-row"><span class="b-label">Invert Left/Right Rotation</span><button id="btn-toggle-invert-cam-x" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-invert-cam-y" class="settings-row"><span class="b-label">Invert Up/Down Rotation</span><button id="btn-toggle-invert-cam-y" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-middle-mouse" class="settings-row"><span class="b-label">Middle Mouse Rotation</span><button id="btn-toggle-middle-mouse" class="b-btn" style="width: 115px;">Enabled</button></div>

        <div id="row-toggle-cam-jump" class="settings-row"><span class="b-label">Camera Follows Jump</span><button id="btn-toggle-cam-jump" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-camera-shake" class="settings-row"><span class="b-label">Enable Camera Shake</span><button id="btn-toggle-camera-shake" class="b-btn" style="width: 115px;">Enabled</button></div>

        <div id="row-toggle-click-move" class="settings-row"><span class="b-label">Click-to-Move</span><button id="btn-toggle-click-move" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-click-move-path" class="settings-row"><span class="b-label">Show Click-to-Move Path</span><button id="btn-toggle-click-move-path" class="b-btn" style="width: 115px;">Enabled</button></div>
        <div id="row-toggle-always-sprint" class="settings-row"><span class="b-label">Always Sprint</span><button id="btn-toggle-always-sprint" class="b-btn" style="width: 115px;">Disabled</button></div>

        <div id="row-toggle-mute-arcade" class="settings-row"><span class="b-label">Mute Arcade Sounds</span><button id="btn-toggle-mute-arcade" class="b-btn" style="width: 115px;">Disabled</button></div>
        <div id="row-toggle-lock-builder" class="settings-row"><span class="b-label">Lock Builder Panels</span><button id="btn-toggle-lock-builder" class="b-btn" style="width: 115px;">Disabled</button></div>
      </div>

      <div id="tab-keybinds" class="settings-tab-panel" style="display: none; flex-direction: column; gap: 5px; max-height: 450px; overflow-y: auto; padding-right: 5px;">
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button id="btn-preset-default" class="b-btn btn-secondary" style="flex: 1; padding: 5px; font-size: 0.8rem;">Reset to Defaults</button>
        </div>
        <div class="settings-row" style="font-weight: bold; color: var(--accent-neon); border-bottom: 1px solid var(--text-dim); padding-bottom: 5px;">
            <span style="flex: 1.5; padding-left: 5px;">Action</span>
            <span style="flex: 1; text-align: center;">Primary</span>
            <span style="flex: 1; text-align: center;">Alternate</span>
        </div>
        <div id="action-binds-list" style="display: flex; flex-direction: column; gap: 2px;"></div>
      </div>
    `);

    this.bindEvents();
  }

  getSettings() {
    const defaultSettings = { uiMode: 'classic', snapPowerTray: true, snapActivePowers: true, snapIndicators: true, combatStyle: 'hybrid', powerbarOrientation: 'horizontal', mergeSynthBar: false, showPowerRaytrace: true, fov: 1000, renderDistance: 2000, renderScale: 1.0, uiScale: 1.0, minimapScale: 1.0, minimapZoom: 8, showCoords: false, showYawPitch: false, showFPS: false, showPing: false, showBaseplates: false, cameraFollowsJump: true, showMinimap: true, rotateMinimap: true, clickToMove: false, showClickMovePath: true, alwaysSprint: false, showPlayerNames: true, showPlayerHealth: true, showEntityNames: true, showEntityHealth: true, cameraSensitivity: 120, cameraAngleSnap: 0, invertCameraX: false, invertCameraY: false, middleMouseRotation: true, dragRotationSensitivity: 0.25, lockBuilderPanel: false, enableShadows: true, softShadows: true, enableDayNightCycle: true, enableCameraShake: true, enableWeatherParticles: true, maxDynamicLights: 48, chunkGenSpeed: 3, enableArcadeCRT: true, actionBinds: { moveForward: { primary: 'w', alt: 'arrowup' }, moveBackward: { primary: 's', alt: 'arrowdown' }, moveLeft: { primary: 'a', alt: 'arrowleft' }, moveRight: { primary: 'd', alt: 'arrowright' }, jump: { primary: 'space', alt: '' }, sprint: { primary: 'shift', alt: '' }, flyDown: { primary: 'x', alt: '' }, camUp: { primary: 'pageup', alt: '' }, camDown: { primary: 'pagedown', alt: '' }, camLeft: { primary: 'q', alt: '' }, camRight: { primary: 'e', alt: '' }, undo: { primary: 'ctrl+z', alt: '' }, redo: { primary: 'ctrl+y', alt: '' }, picker: { primary: 'alt', alt: '' }, buildDelete: { primary: 'shift', alt: '' }, buildDragSelect: { primary: 'ctrl', alt: '' }, power1: { primary: '1', alt: '' }, power2: { primary: '2', alt: '' }, power3: { primary: '3', alt: '' }, power4: { primary: '4', alt: '' }, power5: { primary: '5', alt: '' }, power6: { primary: '6', alt: '' }, power7: { primary: '7', alt: '' }, power8: { primary: '8', alt: '' }, power9: { primary: '9', alt: '' }, power10: { primary: '0', alt: '' } } };
    const savedSettingsStr = localStorage.getItem('b_client_settings');
    const settings = savedSettingsStr ? Object.assign({}, defaultSettings, JSON.parse(savedSettingsStr)) : defaultSettings;
    if (!settings.actionBinds) settings.actionBinds = defaultSettings.actionBinds;
    for (let key in defaultSettings.actionBinds) {
      if (!settings.actionBinds[key]) settings.actionBinds[key] = defaultSettings.actionBinds[key];
    }
    return settings;
  }

  saveSettings(settingsObj) {
    localStorage.setItem('b_client_settings', JSON.stringify(settingsObj));
    if (window.currentGameEngine && window.currentGameEngine.network) {
        window.currentGameEngine.network.sendClientSettings(settingsObj);
    }
  }

  onOpen() {
    this.syncUI();
  }

  syncUI() {
    const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();

    const syncToggle = (btnId, key, defVal = false) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        let val = settings[key];
        if (val === undefined) val = defVal;
        btn.innerText = val ? 'Enabled' : 'Disabled';
        btn.className = val ? 'b-btn btn-primary' : 'b-btn btn-secondary';
      }
    };

    syncToggle('btn-toggle-snap-power-tray', 'snapPowerTray', true);
    syncToggle('btn-toggle-snap-active-powers', 'snapActivePowers', true);
    syncToggle('btn-toggle-snap-indicators', 'snapIndicators', true);
    syncToggle('btn-toggle-coords', 'showCoords');
    syncToggle('btn-toggle-yaw-pitch', 'showYawPitch');
    syncToggle('btn-toggle-fps', 'showFPS');
    syncToggle('btn-toggle-ping', 'showPing');
    syncToggle('btn-toggle-baseplates', 'showBaseplates');
    syncToggle('btn-toggle-power-raytrace', 'showPowerRaytrace', true);
    syncToggle('btn-toggle-day-night', 'enableDayNightCycle', true);
    syncToggle('btn-toggle-shadows', 'enableShadows', true);
    syncToggle('btn-toggle-soft-shadows', 'softShadows', true);
    syncToggle('btn-toggle-arcade-crt', 'enableArcadeCRT', true);
    syncToggle('btn-toggle-merge-synth', 'mergeSynthBar');
    syncToggle('btn-toggle-player-names', 'showPlayerNames', true);
    syncToggle('btn-toggle-player-health', 'showPlayerHealth', true);
    syncToggle('btn-toggle-entity-names', 'showEntityNames', true);
    syncToggle('btn-toggle-entity-health', 'showEntityHealth', true);
    syncToggle('btn-toggle-minimap', 'showMinimap', true);
    syncToggle('btn-toggle-minimap-rotate', 'rotateMinimap', true);
    syncToggle('btn-toggle-click-move', 'clickToMove');
    syncToggle('btn-toggle-click-move-path', 'showClickMovePath', true);
    syncToggle('btn-toggle-always-sprint', 'alwaysSprint');
    syncToggle('btn-toggle-cam-jump', 'cameraFollowsJump', true);
    syncToggle('btn-toggle-camera-shake', 'enableCameraShake', true);
    syncToggle('btn-toggle-invert-cam-x', 'invertCameraX');
    syncToggle('btn-toggle-invert-cam-y', 'invertCameraY');
    syncToggle('btn-toggle-middle-mouse', 'middleMouseRotation', true);
    syncToggle('btn-toggle-lock-builder', 'lockBuilderPanel');
    syncToggle('btn-toggle-mute-arcade', 'muteArcadeSounds');

    const btnCombatChat = document.getElementById('btn-toggle-combat-chat');
    if (btnCombatChat) {
      const showCombat = localStorage.getItem('b_show_combat_chat') !== 'false';
      btnCombatChat.innerText = showCombat ? 'Enabled' : 'Disabled';
      btnCombatChat.className = showCombat ? 'b-btn btn-primary' : 'b-btn btn-secondary';
    }

    if (document.getElementById('select-powerbar-orient')) document.getElementById('select-powerbar-orient').value = settings.powerbarOrientation || 'horizontal';
    if (document.getElementById('select-ui-mode')) document.getElementById('select-ui-mode').value = settings.uiMode || 'classic';
    if (document.getElementById('select-combat-style')) document.getElementById('select-combat-style').value = settings.combatStyle || 'hybrid';
    if (document.getElementById('select-camera-snap')) document.getElementById('select-camera-snap').value = settings.cameraAngleSnap !== undefined ? settings.cameraAngleSnap : 0;

    const setSlider = (id, valId, value, suffix = '') => {
      const slider = document.getElementById(id);
      const vSpan = document.getElementById(valId);
      if (slider) slider.value = value;
      if (vSpan) vSpan.innerText = value + suffix;
    };

    setSlider('slider-ui-scale', 'val-ui-scale', (settings.uiScale || 1.0) * 100, '%');
    setSlider('slider-minimap-scale', 'val-minimap-scale', (settings.minimapScale || 1.0) * 100, '%');
    setSlider('slider-camera-sensitivity', 'val-camera-sensitivity', settings.cameraSensitivity || 120);
    setSlider('slider-drag-sensitivity', 'val-drag-sensitivity', (settings.dragRotationSensitivity !== undefined ? settings.dragRotationSensitivity : 0.25) * 100, '%');
    setSlider('slider-fov', 'val-fov', settings.fov || 1000);
    setSlider('slider-render-distance', 'val-render-distance', settings.renderDistance || 2000);
    setSlider('slider-render-scale', 'val-render-scale', (settings.renderScale || 1.0) * 100, '%');
    setSlider('slider-dynamic-lights', 'val-dynamic-lights', settings.maxDynamicLights !== undefined ? settings.maxDynamicLights : 48);
    setSlider('slider-chunk-gen-speed', 'val-chunk-gen-speed', settings.chunkGenSpeed || 3);

    const listEl = document.getElementById('action-binds-list');
    if (listEl) {
      listEl.innerHTML = '';
      const categories = [
        {
          name: 'Movement',
          actions: { moveForward: 'Move Forward', moveBackward: 'Move Backward', moveLeft: 'Move Left', moveRight: 'Move Right', jump: 'Jump', sprint: 'Sprint', flyDown: 'Fly Down' }
        },
        {
          name: 'Camera',
          actions: { camUp: 'Camera Up', camDown: 'Camera Down', camLeft: 'Camera Left', camRight: 'Camera Right' }
        },
        {
          name: 'Action Bar',
          actions: { power1: 'Slot 1', power2: 'Slot 2', power3: 'Slot 3', power4: 'Slot 4', power5: 'Slot 5', power6: 'Slot 6', power7: 'Slot 7', power8: 'Slot 8', power9: 'Slot 9', power10: 'Slot 10' }
        },
        {
          name: 'Builder Tools',
          actions: { undo: 'Undo', redo: 'Redo', picker: 'Picker Tool', buildDelete: 'Delete Block(s)', buildDragSelect: 'Multi-Block Select' }
        }
      ];
      for (const cat of categories) {
         const header = document.createElement('div');
         header.style.cssText = 'color: #3498db; font-size: 0.8rem; font-weight: bold; margin-top: 10px; border-bottom: 1px solid #333; padding-bottom: 3px; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;';
         header.innerText = cat.name;
         listEl.appendChild(header);

         for (const [actionId, label] of Object.entries(cat.actions)) {
            const binds = settings.actionBinds[actionId] || { primary: '', alt: '' };
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.style.padding = '2px 0';
            const primText = binds.primary ? binds.primary.replace(/control/gi, 'ctrl').replace(/\+/g, ' + ').toUpperCase() : '---';
            const altText = binds.alt ? binds.alt.replace(/control/gi, 'ctrl').replace(/\+/g, ' + ').toUpperCase() : '---';
            row.innerHTML = `
               <span class="b-label" style="flex: 1.5; margin: 0; padding-left: 5px;">${label}</span>
               <div style="flex: 1; padding: 0 5px;"><button class="b-btn btn-secondary bind-btn" data-action="${actionId}" data-slot="primary" style="width: 100%; font-size: 0.75rem; padding: 4px;">${primText}</button></div>
               <div style="flex: 1; padding: 0 5px;"><button class="b-btn btn-secondary bind-btn" data-action="${actionId}" data-slot="alt" style="width: 100%; font-size: 0.75rem; padding: 4px;">${altText}</button></div>
            `;
            listEl.appendChild(row);
         }
      }
    }
  }

  bindEvents() {
    const tabBtns = this.element.querySelectorAll('.settings-tab-btn');
    const tabPanels = this.element.querySelectorAll('.settings-tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
          b.classList.remove('active', 'btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-secondary');

        const tabId = btn.dataset.tab;
        tabPanels.forEach(panel => {
          panel.style.display = panel.id === tabId ? 'flex' : 'none';
        });
      });
    });

    const bindToggle = (btnId, key, callback = null) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();
        let val = settings[key];
        if ((key === 'enableShadows' || key === 'softShadows' || key === 'enableDayNightCycle' || key === 'enableCameraShake') && val === undefined) val = true;

        const newVal = !val;
        settings[key] = newVal;
        this.saveSettings(settings);

        btn.innerText = newVal ? 'Enabled' : 'Disabled';
        btn.className = newVal ? 'b-btn btn-primary' : 'b-btn btn-secondary';

        if (callback) callback(newVal);
        if (window.currentGameEngine && window.currentGameEngine.ui) window.currentGameEngine.ui.update();
      });
    };

    bindToggle('btn-toggle-snap-power-tray', 'snapPowerTray');
    bindToggle('btn-toggle-snap-active-powers', 'snapActivePowers');
    bindToggle('btn-toggle-snap-indicators', 'snapIndicators');
    bindToggle('btn-toggle-coords', 'showCoords');
    bindToggle('btn-toggle-yaw-pitch', 'showYawPitch');
    bindToggle('btn-toggle-fps', 'showFPS');
    bindToggle('btn-toggle-ping', 'showPing');
    bindToggle('btn-toggle-baseplates', 'showBaseplates');
    bindToggle('btn-toggle-power-raytrace', 'showPowerRaytrace');
    bindToggle('btn-toggle-day-night', 'enableDayNightCycle');
    bindToggle('btn-toggle-shadows', 'enableShadows', (val) => { if (window.currentGameEngine?.renderer) window.currentGameEngine.renderer.toggleShadows(val); });
    bindToggle('btn-toggle-soft-shadows', 'softShadows', (val) => { if (window.currentGameEngine?.renderer?.toggleSoftShadows) window.currentGameEngine.renderer.toggleSoftShadows(val); });
    bindToggle('btn-toggle-arcade-crt', 'enableArcadeCRT');
    bindToggle('btn-toggle-merge-synth', 'mergeSynthBar');
    bindToggle('btn-toggle-player-names', 'showPlayerNames');
    bindToggle('btn-toggle-player-health', 'showPlayerHealth');
    bindToggle('btn-toggle-entity-names', 'showEntityNames');
    bindToggle('btn-toggle-entity-health', 'showEntityHealth');
    bindToggle('btn-toggle-minimap', 'showMinimap');
    bindToggle('btn-toggle-minimap-rotate', 'rotateMinimap');
    bindToggle('btn-toggle-click-move', 'clickToMove');
    bindToggle('btn-toggle-click-move-path', 'showClickMovePath');
    bindToggle('btn-toggle-always-sprint', 'alwaysSprint');
    bindToggle('btn-toggle-cam-jump', 'cameraFollowsJump');
    bindToggle('btn-toggle-camera-shake', 'enableCameraShake');
    bindToggle('btn-toggle-invert-cam-x', 'invertCameraX');
    bindToggle('btn-toggle-invert-cam-y', 'invertCameraY');
    bindToggle('btn-toggle-middle-mouse', 'middleMouseRotation');
    bindToggle('btn-toggle-lock-builder', 'lockBuilderPanel');
    bindToggle('btn-toggle-mute-arcade', 'muteArcadeSounds');

    const btnCombatChat = document.getElementById('btn-toggle-combat-chat');
    if (btnCombatChat) {
      btnCombatChat.addEventListener('click', () => {
        const chatContainer = document.getElementById('game-chat-container');
        if (chatContainer.classList.contains('hide-combat')) {
          chatContainer.classList.remove('hide-combat');
          btnCombatChat.innerText = 'Enabled';
          btnCombatChat.className = 'b-btn btn-primary';
          localStorage.setItem('b_show_combat_chat', 'true');
        } else {
          chatContainer.classList.add('hide-combat');
          btnCombatChat.innerText = 'Disabled';
          btnCombatChat.className = 'b-btn btn-secondary';
          localStorage.setItem('b_show_combat_chat', 'false');
        }
      });
    }

    const bindSlider = (id, valId, key, transformOut, transformIn, suffix = '', callback = null) => {
      const slider = document.getElementById(id);
      const vSpan = document.getElementById(valId);
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        if (vSpan) vSpan.innerText = e.target.value + suffix;
        const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();
        settings[key] = transformIn(e.target.value);
        this.saveSettings(settings);
        if (callback) callback(settings[key]);
      });
    };

    bindSlider('slider-ui-scale', 'val-ui-scale', 'uiScale', v => v * 100, v => parseInt(v, 10) / 100, '%', (v) => { if (window.currentGameEngine?.ui?.updateUIScale) window.currentGameEngine.ui.updateUIScale(); });
    bindSlider('slider-minimap-scale', 'val-minimap-scale', 'minimapScale', v => v * 100, v => parseInt(v, 10) / 100, '%');
    bindSlider('slider-camera-sensitivity', 'val-camera-sensitivity', 'cameraSensitivity', v => v, v => parseInt(v, 10));
    bindSlider('slider-drag-sensitivity', 'val-drag-sensitivity', 'dragRotationSensitivity', v => v * 100, v => parseInt(v, 10) / 100, '%');
    bindSlider('slider-fov', 'val-fov', 'fov', v => v, v => parseInt(v, 10), '', (v) => { if (window.currentGameEngine?.renderer?.updateFOV) window.currentGameEngine.renderer.updateFOV(v); });
    bindSlider('slider-render-distance', 'val-render-distance', 'renderDistance', v => v, v => parseInt(v, 10), '', () => { if (window.currentGameEngine?.renderer) window.currentGameEngine.renderer.needsVoxelUpdate = true; });
    bindSlider('slider-render-scale', 'val-render-scale', 'renderScale', v => v * 100, v => parseInt(v, 10) / 100, '%', (v) => { if (window.currentGameEngine?.renderer?.updateRenderScale) window.currentGameEngine.renderer.updateRenderScale(v); });
    bindSlider('slider-dynamic-lights', 'val-dynamic-lights', 'maxDynamicLights', v => v, v => parseInt(v, 10));
    bindSlider('slider-chunk-gen-speed', 'val-chunk-gen-speed', 'chunkGenSpeed', v => v, v => parseInt(v, 10));

    const bindSelect = (id, key, callback = null) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.addEventListener('change', (e) => {
        const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();
        settings[key] = isNaN(e.target.value) ? e.target.value : parseInt(e.target.value, 10);
        this.saveSettings(settings);
        if (callback) callback(settings[key]);
      });
    };

    bindSelect('select-ui-mode', 'uiMode', (val) => {
      const gameContainer = document.getElementById('game-screen') || document.body;
      if (val === 'alternative') {
        gameContainer.classList.add('alternative-ui-mode');
        gameContainer.classList.remove('classic-ui-mode');
      } else {
        gameContainer.classList.add('classic-ui-mode');
        gameContainer.classList.remove('alternative-ui-mode');
      }
      if (window.currentGameEngine && window.currentGameEngine.ui) window.currentGameEngine.ui.update();
    });
    bindSelect('select-powerbar-orient', 'powerbarOrientation', () => { if (window.currentGameEngine?.ui?.powerbar) window.currentGameEngine.ui.powerbar.setupPowerbar(); });
    bindSelect('select-combat-style', 'combatStyle');
    bindSelect('select-camera-snap', 'cameraAngleSnap');

    const applyGraphicsPreset = (preset) => {
      const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();
      if (preset === 'potato') {
          Object.assign(settings, { renderDistance: 800, renderScale: 0.5, enableShadows: false, softShadows: false, maxDynamicLights: 0, chunkGenSpeed: 1 });
      } else if (preset === 'normal') {
          Object.assign(settings, { renderDistance: 2000, renderScale: 1.0, enableShadows: true, softShadows: true, maxDynamicLights: 48, chunkGenSpeed: 3 });
      } else if (preset === 'ultra') {
          Object.assign(settings, { renderDistance: 4000, renderScale: 1.0, enableShadows: true, softShadows: true, maxDynamicLights: 100, chunkGenSpeed: 8 });
      }
      this.saveSettings(settings);
      this.syncUI();
      if (window.currentGameEngine?.renderer) {
          window.currentGameEngine.renderer.needsVoxelUpdate = true;
          if (window.currentGameEngine.renderer.updateRenderScale) window.currentGameEngine.renderer.updateRenderScale(settings.renderScale);
          window.currentGameEngine.renderer.toggleShadows(settings.enableShadows);
          if (window.currentGameEngine.renderer.toggleSoftShadows) window.currentGameEngine.renderer.toggleSoftShadows(settings.softShadows);
      }
    };

    document.getElementById('btn-preset-potato')?.addEventListener('click', () => applyGraphicsPreset('potato'));
    document.getElementById('btn-preset-normal')?.addEventListener('click', () => applyGraphicsPreset('normal'));
    document.getElementById('btn-preset-ultra')?.addEventListener('click', () => applyGraphicsPreset('ultra'));

    let listeningBtn = null;
    let listeningAction = null;
    let listeningSlot = null;
    let heldModifiers = new Set();

    const handleKeyBind = (e) => {
    }; // Deprecated previous handler

    const handleKeyDown = (e) => {
       if (!listeningBtn) return;
       e.preventDefault();
       e.stopPropagation();

       let key = e.key.toLowerCase();
       if (key === 'altgraph') key = 'alt'; // Catch international keyboard layouts

       if (['shift', 'control', 'alt', 'meta'].includes(key)) {
           heldModifiers.add(key === 'control' ? 'ctrl' : key);

           // Fallback timer: if they press a modifier and the browser swallows the keyup event,
           // we automatically bind it after a brief moment of no other keys being pressed.
           if (this.modifierTimeout) clearTimeout(this.modifierTimeout);
           this.modifierTimeout = setTimeout(() => {
               if (listeningBtn && heldModifiers.size > 0) {
                   finalizeBind(Array.from(heldModifiers)[0], e);
               }
           }, 800);
           return;
       }

       if (this.modifierTimeout) clearTimeout(this.modifierTimeout);
       finalizeBind(key, e);
    };

    const handleKeyUp = (e) => {
       if (!listeningBtn) return;
       e.preventDefault();
       e.stopPropagation();
       if (this.modifierTimeout) clearTimeout(this.modifierTimeout);

       let key = e.key.toLowerCase();
       if (key === 'altgraph') key = 'alt';

       if (['shift', 'control', 'alt', 'meta'].includes(key)) {
           key = key === 'control' ? 'ctrl' : key;
           heldModifiers.delete(key);
           if (heldModifiers.size === 0) {
               finalizeBind(key, e);
           }
       }
    };

    const finalizeBind = (key, e) => {
       if (key === 'escape' || key === 'backspace' || key === 'delete') key = '';
       else if (key === ' ') key = 'space';

       let bindStr = key;
       if (key) {
          const mods = Array.from(heldModifiers);
          if (mods.length > 0 && !mods.includes(key)) {
             bindStr = mods.join('+') + '+' + key;
          }
       }

       const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();
       settings.actionBinds[listeningAction][listeningSlot] = bindStr;

       this.saveSettings(settings);
       this.syncUI();

       listeningBtn.classList.remove('btn-primary');
       listeningBtn.classList.add('btn-secondary');
       listeningBtn = null;
       heldModifiers.clear();
       if (this.modifierTimeout) clearTimeout(this.modifierTimeout);
       document.removeEventListener('keydown', handleKeyDown, true);
       document.removeEventListener('keyup', handleKeyUp, true);
    };

    this.element.addEventListener('click', (e) => {
       if (e.target.classList.contains('bind-btn')) {
          if (listeningBtn) {
             listeningBtn.classList.remove('btn-primary');
             listeningBtn.classList.add('btn-secondary');
             this.syncUI();
          }
          listeningBtn = e.target;
          listeningAction = listeningBtn.dataset.action;
          listeningSlot = listeningBtn.dataset.slot;

          listeningBtn.innerText = 'PRESS KEY...';
          listeningBtn.classList.remove('btn-secondary');
          listeningBtn.classList.add('btn-primary');
          heldModifiers.clear();
          document.addEventListener('keydown', handleKeyDown, true);
          document.addEventListener('keyup', handleKeyUp, true);
       }
    });

    document.getElementById('btn-preset-default')?.addEventListener('click', () => {
        const settings = window.currentGameEngine ? window.currentGameEngine.clientSettings : this.getSettings();
        settings.actionBinds = { moveForward: { primary: 'w', alt: 'arrowup' }, moveBackward: { primary: 's', alt: 'arrowdown' }, moveLeft: { primary: 'a', alt: 'arrowleft' }, moveRight: { primary: 'd', alt: 'arrowright' }, jump: { primary: 'space', alt: '' }, sprint: { primary: 'shift', alt: '' }, flyDown: { primary: 'x', alt: '' }, camUp: { primary: 'pageup', alt: '' }, camDown: { primary: 'pagedown', alt: '' }, camLeft: { primary: 'q', alt: '' }, camRight: { primary: 'e', alt: '' }, undo: { primary: 'ctrl+z', alt: '' }, redo: { primary: 'ctrl+y', alt: '' }, picker: { primary: 'alt', alt: '' }, buildDelete: { primary: 'shift', alt: '' }, buildDragSelect: { primary: 'ctrl', alt: '' }, power1: { primary: '1', alt: '' }, power2: { primary: '2', alt: '' }, power3: { primary: '3', alt: '' }, power4: { primary: '4', alt: '' }, power5: { primary: '5', alt: '' }, power6: { primary: '6', alt: '' }, power7: { primary: '7', alt: '' }, power8: { primary: '8', alt: '' }, power9: { primary: '9', alt: '' }, power10: { primary: '0', alt: '' } };
        delete settings.keybinds;
        this.saveSettings(settings);
        this.syncUI();
    });
  }
}
