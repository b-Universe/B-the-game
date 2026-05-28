export class InGameMenuUIManager {
  constructor(app) {
    this.app = app;
    this.setupUI();
  }

  setupUI() {
    const btnGameMenu = document.getElementById('btn-game-menu');
    const gameDropdown = document.getElementById('game-dropdown');

    if (btnGameMenu && gameDropdown) {
      btnGameMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        gameDropdown.style.display = gameDropdown.style.display === 'none' ? 'flex' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (gameDropdown.style.display === 'flex' && !e.target.closest('.game-top-bar')) {
          gameDropdown.style.display = 'none';
        }
      });

      document.getElementById('btn-char-select').addEventListener('click', () => {
        if (window.currentGameEngine) window.currentGameEngine.stop();
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('selection-screen').style.display = 'flex';
        gameDropdown.style.display = 'none';

        const trainerModal = document.getElementById('trainer-dialog-modal');
        if (trainerModal) trainerModal.style.display = 'none';

        const powerbar = document.getElementById('powerbar-container');
        if (powerbar) powerbar.style.display = 'none';
      });

      document.getElementById('btn-logout').addEventListener('click', () => {
        if (window.currentGameEngine) window.currentGameEngine.stop();
        this.app.currentAccount = null;
        localStorage.removeItem('b_current_account');
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('creation-screen').style.display = 'block';
        gameDropdown.style.display = 'none';

        const trainerModal = document.getElementById('trainer-dialog-modal');
        if (trainerModal) trainerModal.style.display = 'none';

        const powerbar = document.getElementById('powerbar-container');
        if (powerbar) powerbar.style.display = 'none';
      });

      document.getElementById('btn-edit-id').addEventListener('click', () => {
        gameDropdown.style.display = 'none';
        if (!window.currentGameEngine) return;

        const char = window.currentGameEngine.playerData;
        document.getElementById('ig-id-name').value = char.name;
        document.getElementById('ig-id-alignment').value = char.alignment || 'hero';
        document.getElementById('ig-id-city').value = char.city || 'atlas';
        document.getElementById('ig-char-bio').value = char.bio || '';

        document.getElementById('in-game-id-modal').style.display = 'flex';
      });

      const kbTab = document.getElementById('settings-keybinds');
      if (kbTab && kbTab.children.length === 0) {
        kbTab.innerHTML = `
          <div style="display: flex; gap: 10px; margin-bottom: 5px;">
              <button id="btn-preset-default" class="btn-secondary" style="flex: 1; padding: 5px; font-size: 0.8rem;">Preset: Default</button>
              <button id="btn-preset-arrows" class="btn-secondary" style="flex: 1; padding: 5px; font-size: 0.8rem;">Preset: Arrows</button>
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Camera Up</span>
              <input type="text" id="kb-camup" style="width: 80px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;">
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Camera Down</span>
              <input type="text" id="kb-camdown" style="width: 80px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;">
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Camera Left</span>
              <input type="text" id="kb-camleft" style="width: 80px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;">
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Camera Right</span>
              <input type="text" id="kb-camright" style="width: 80px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;">
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Undo</span>
              <div style="display: flex; align-items: center; gap: 5px;"><span style="color: #aaa;">Ctrl + </span><input type="text" id="kb-undo" style="width: 40px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;"></div>
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Redo</span>
              <div style="display: flex; align-items: center; gap: 5px;"><span style="color: #aaa;">Ctrl + </span><input type="text" id="kb-redo" style="width: 40px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;"></div>
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #ccc;">Picker Tool</span>
              <div style="display: flex; align-items: center; gap: 5px;"><input type="text" id="kb-picker" style="width: 60px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;" placeholder="-"></div>
          </div>
          <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
              <span style="color: #ccc;">Fly Down</span>
              <div style="display: flex; align-items: center; gap: 5px;"><input type="text" id="kb-flydown" style="width: 60px; text-align: center; background: #111; color: #fff; border: 1px solid #444; padding: 5px; text-transform: lowercase;" placeholder="x"></div>
          </div>
        `;

        const saveClientSettings = (settingsObj) => {
            localStorage.setItem('b_client_settings', JSON.stringify(settingsObj));
            if (window.currentGameEngine && window.currentGameEngine.network) {
                window.currentGameEngine.network.sendClientSettings(settingsObj);
            }
        };

        const saveKeybinds = () => {
            const targetSettings = window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings;
            targetSettings.keybinds = {
                undo: document.getElementById('kb-undo').value.toLowerCase() || 'z',
                redo: document.getElementById('kb-redo').value.toLowerCase() || 'y',
                picker: document.getElementById('kb-picker').value.toLowerCase() || '',
                flyDown: document.getElementById('kb-flydown').value.toLowerCase() || 'x',
                camUp: document.getElementById('kb-camup').value.toLowerCase() || 'pageup',
                camDown: document.getElementById('kb-camdown').value.toLowerCase() || 'pagedown',
                camLeft: document.getElementById('kb-camleft').value.toLowerCase() || 'q',
                camRight: document.getElementById('kb-camright').value.toLowerCase() || 'e'
            };
            saveClientSettings(targetSettings);
        };

        const captureKey = (e) => {
            e.preventDefault();
            let key = e.key.toLowerCase();
            if (key === ' ') key = 'space';
            e.target.value = key;
            saveKeybinds();
        };

        ['kb-camup', 'kb-camdown', 'kb-camleft', 'kb-camright', 'kb-undo', 'kb-redo', 'kb-picker', 'kb-flydown'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onkeydown = captureKey;
        });

        document.getElementById('btn-preset-default').onclick = () => {
            document.getElementById('kb-camup').value = 'pageup';
            document.getElementById('kb-camdown').value = 'pagedown';
            document.getElementById('kb-camleft').value = 'q';
            document.getElementById('kb-camright').value = 'e';
            saveKeybinds();
        };

        document.getElementById('btn-preset-arrows').onclick = () => {
            document.getElementById('kb-camup').value = 'arrowup';
            document.getElementById('kb-camdown').value = 'arrowdown';
            document.getElementById('kb-camleft').value = 'arrowleft';
            document.getElementById('kb-camright').value = 'arrowright';
            saveKeybinds();
        };
      }

      const btnSettings = document.getElementById('btn-settings');
      if (btnSettings) {
        btnSettings.addEventListener('click', () => {
          gameDropdown.style.display = 'none';

          const targetSettings = window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings;
          const kbs = targetSettings.keybinds || { undo: 'z', redo: 'y', picker: '', flyDown: 'x', camUp: 'pageup', camDown: 'pagedown', camLeft: 'q', camRight: 'e' };
          if (document.getElementById('kb-undo')) {
              document.getElementById('kb-undo').value = kbs.undo || 'z';
              document.getElementById('kb-redo').value = kbs.redo || 'y';
              document.getElementById('kb-picker').value = kbs.picker || '';
              document.getElementById('kb-flydown').value = kbs.flyDown || 'x';
              document.getElementById('kb-camup').value = kbs.camUp || 'pageup';
              document.getElementById('kb-camdown').value = kbs.camDown || 'pagedown';
              document.getElementById('kb-camleft').value = kbs.camLeft || 'q';
              document.getElementById('kb-camright').value = kbs.camRight || 'e';
          }

          document.getElementById('settings-modal').style.display = 'flex';
        });
      }

      document.getElementById('btn-close-id').addEventListener('click', () => {
        document.getElementById('in-game-id-modal').style.display = 'none';
      });

      document.getElementById('btn-save-ig-id').addEventListener('click', async () => {
        if (!window.currentGameEngine) return;
        const char = window.currentGameEngine.playerData;

        char.bio = document.getElementById('ig-char-bio').value.trim();

        try {
          const updatedAccount = await this.app.auth.updateCharacter(this.app.currentAccount.uuid, char);
          this.app.currentAccount = updatedAccount;
          localStorage.setItem('b_current_account', JSON.stringify(updatedAccount));
          document.getElementById('in-game-id-modal').style.display = 'none';
          this.app.showModal("Success", "Citizen Identification Updated!");
        } catch (err) {
          this.app.showModal("Update Failed", err.message);
        }
      });

      document.getElementById('btn-friends').addEventListener('click', () => {
        gameDropdown.style.display = 'none';
        const modal = document.getElementById('friends-modal');
        if (modal) modal.style.display = 'flex';
        if (window.currentGameEngine?.ui?.friendsList) window.currentGameEngine.ui.friendsList.renderFriendsList();
      });

      document.getElementById('btn-help').addEventListener('click', () => {
        gameDropdown.style.display = 'none';
        if (!window.currentGameEngine || !window.currentGameEngine.ui) return;
        window.currentGameEngine.ui.showHelpModal();
      });

      document.getElementById('btn-close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').style.display = 'none';
      });

      const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
      const settingsTabPanels = document.querySelectorAll('.settings-tab-panel');

      settingsTabPanels.forEach(panel => {
        panel.style.maxHeight = '60vh';
        panel.style.overflowY = 'auto';
        panel.style.paddingRight = '10px';
      });

      settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          settingsTabBtns.forEach(b => {
            b.classList.remove('active');
            b.style.borderColor = 'var(--text-dim)';
            b.style.color = 'var(--text-primary)';
            b.style.background = 'transparent';
          });
          btn.classList.add('active');
          btn.style.borderColor = 'var(--accent-neon)';
          btn.style.color = 'var(--accent-neon)';
          btn.style.background = 'rgba(116, 185, 255, 0.1)';

          const tabId = btn.dataset.tab;
          settingsTabPanels.forEach(panel => {
            panel.style.display = panel.id === tabId ? 'flex' : 'none';
          });
        });
      });

      const rowToggleCombatChat = document.getElementById('row-toggle-combat-chat');
      const btnToggleCombatChat = document.getElementById('btn-toggle-combat-chat');
      const chatContainer = document.getElementById('game-chat-container');
      if (rowToggleCombatChat) {
        const savedCombatChat = localStorage.getItem('b_show_combat_chat');
        if (savedCombatChat === 'false') {
          chatContainer.classList.add('hide-combat');
          btnToggleCombatChat.innerText = 'Disabled';
          btnToggleCombatChat.className = 'btn-secondary';
        }

        rowToggleCombatChat.addEventListener('click', () => {
          if (chatContainer.classList.contains('hide-combat')) {
            chatContainer.classList.remove('hide-combat');
            btnToggleCombatChat.innerText = 'Enabled';
            btnToggleCombatChat.className = 'btn-primary';
            localStorage.setItem('b_show_combat_chat', 'true');
          } else {
            chatContainer.classList.add('hide-combat');
            btnToggleCombatChat.innerText = 'Disabled';
            btnToggleCombatChat.className = 'btn-secondary';
            localStorage.setItem('b_show_combat_chat', 'false');
          }
        });
      }

      const defaultSettings = { combatStyle: 'hybrid', mergeSynthBar: false, showPowerRaytrace: true, renderDistance: 2000, renderScale: 1.0, uiScale: 1.0, minimapScale: 1.0, minimapZoom: 8, timezoneOffset: 0, showCoords: false, showYawPitch: false, showFPS: false, showPing: false, showBaseplates: false, cameraFollowsJump: true, showMinimap: true, rotateMinimap: true, clickToMove: false, alwaysSprint: false, showPlayerNames: true, showPlayerHealth: true, showEntityNames: true, showEntityHealth: true, cameraSensitivity: 120, cameraAngleSnap: 0, invertCameraX: false, invertCameraY: false, middleMouseRotation: true, dragRotationSensitivity: 0.25, lockBuilderPanel: false, enableShadows: true, enableDayNightCycle: true, keybinds: { undo: 'z', redo: 'y', picker: '', flyDown: 'x', camUp: 'pageup', camDown: 'pagedown', camLeft: 'q', camRight: 'e' } };
      const savedSettingsStr = localStorage.getItem('b_client_settings');
      const savedSettings = savedSettingsStr ? Object.assign({}, defaultSettings, JSON.parse(savedSettingsStr)) : defaultSettings;

      const uiScaleSlider = document.getElementById('slider-ui-scale');
      const uiScaleVal = document.getElementById('val-ui-scale');
      if (uiScaleSlider) {
        uiScaleSlider.value = (savedSettings.uiScale !== undefined ? savedSettings.uiScale : 1.0) * 100;
        if (uiScaleVal) uiScaleVal.innerText = `${uiScaleSlider.value}%`;
        uiScaleSlider.addEventListener('input', (e) => {
          if (uiScaleVal) uiScaleVal.innerText = `${e.target.value}%`;
          const scale = parseInt(e.target.value, 10) / 100;
          savedSettings.uiScale = scale;
          if (window.currentGameEngine) {
            window.currentGameEngine.clientSettings.uiScale = scale;
            if (window.currentGameEngine.ui && window.currentGameEngine.ui.updateUIScale) window.currentGameEngine.ui.updateUIScale();
          }
          saveClientSettings(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings);
        });
      }

      const minimapScaleSlider = document.getElementById('slider-minimap-scale');
      const minimapScaleVal = document.getElementById('val-minimap-scale');
      if (minimapScaleSlider) {
        minimapScaleSlider.value = (savedSettings.minimapScale !== undefined ? savedSettings.minimapScale : 1.0) * 100;
        if (minimapScaleVal) minimapScaleVal.innerText = `${minimapScaleSlider.value}%`;
        minimapScaleSlider.addEventListener('input', (e) => {
          if (minimapScaleVal) minimapScaleVal.innerText = `${e.target.value}%`;
          const scale = parseInt(e.target.value, 10) / 100;
          savedSettings.minimapScale = scale;
          if (window.currentGameEngine) window.currentGameEngine.clientSettings.minimapScale = scale;
          saveClientSettings(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings);
        });
      }

      const tzSlider = document.getElementById('slider-timezone');
      const tzDisplay = document.getElementById('timezone-display');
      if (tzSlider && tzDisplay) {
        tzSlider.value = savedSettings.timezoneOffset || 0;
        const updateTzDisplay = (val) => {
          tzDisplay.innerText = val === 0 ? 'Server Time (+0h)' : `Local Time (${val > 0 ? '+' : ''}${val}h)`;
        };
        updateTzDisplay(parseInt(tzSlider.value, 10));
        tzSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          savedSettings.timezoneOffset = val;
          if (window.currentGameEngine) window.currentGameEngine.clientSettings.timezoneOffset = val;
          saveClientSettings(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings);
          updateTzDisplay(val);
        });
      }

      const setupSettingToggle = (rowId, btnId, settingKey) => {
        const row = document.getElementById(rowId);
        const btn = document.getElementById(btnId);
        if (!row || !btn) return;

        let isEnabled = savedSettings[settingKey];
        if ((settingKey === 'enableShadows' || settingKey === 'enableDayNightCycle') && isEnabled === undefined) isEnabled = true;

        if (isEnabled) {
          btn.innerText = 'Enabled';
          btn.className = 'btn-primary';
          btn.style.width = 'auto';
        } else {
          btn.innerText = 'Disabled';
          btn.className = 'btn-secondary';
        }

        row.addEventListener('click', () => {
          const targetSettings = window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings;
          let currentVal = targetSettings[settingKey];
          if ((settingKey === 'enableShadows' || settingKey === 'enableDayNightCycle') && currentVal === undefined) currentVal = true;

          const newVal = !currentVal;
          targetSettings[settingKey] = newVal;
          saveClientSettings(targetSettings);

          btn.innerText = newVal ? 'Enabled' : 'Disabled';
          btn.className = newVal ? 'btn-primary' : 'btn-secondary';
          btn.style.width = 'auto';

          if (settingKey === 'enableShadows' && window.currentGameEngine.renderer) {
            window.currentGameEngine.renderer.toggleShadows(newVal);
          }
        });
      };

      setupSettingToggle('row-toggle-coords', 'btn-toggle-coords', 'showCoords');
      setupSettingToggle('row-toggle-yaw-pitch', 'btn-toggle-yaw-pitch', 'showYawPitch');
      setupSettingToggle('row-toggle-fps', 'btn-toggle-fps', 'showFPS');
      setupSettingToggle('row-toggle-ping', 'btn-toggle-ping', 'showPing');
      setupSettingToggle('row-toggle-baseplates', 'btn-toggle-baseplates', 'showBaseplates');
      setupSettingToggle('row-toggle-merge-synth', 'btn-toggle-merge-synth', 'mergeSynthBar');
      setupSettingToggle('row-toggle-power-raytrace', 'btn-toggle-power-raytrace', 'showPowerRaytrace');
      setupSettingToggle('row-toggle-day-night', 'btn-toggle-day-night', 'enableDayNightCycle');
      setupSettingToggle('row-toggle-shadows', 'btn-toggle-shadows', 'enableShadows');

      setupSettingToggle('row-toggle-lock-builder', 'btn-toggle-lock-builder', 'lockBuilderPanel');
      setupSettingToggle('row-toggle-cam-jump', 'btn-toggle-cam-jump', 'cameraFollowsJump');
      setupSettingToggle('row-toggle-minimap', 'btn-toggle-minimap', 'showMinimap');
      setupSettingToggle('row-toggle-minimap-rotate', 'btn-toggle-minimap-rotate', 'rotateMinimap');
      setupSettingToggle('row-toggle-click-move', 'btn-toggle-click-move', 'clickToMove');
      setupSettingToggle('row-toggle-always-sprint', 'btn-toggle-always-sprint', 'alwaysSprint');
      setupSettingToggle('row-toggle-player-names', 'btn-toggle-player-names', 'showPlayerNames');
      setupSettingToggle('row-toggle-player-health', 'btn-toggle-player-health', 'showPlayerHealth');
      setupSettingToggle('row-toggle-entity-names', 'btn-toggle-entity-names', 'showEntityNames');
      setupSettingToggle('row-toggle-entity-health', 'btn-toggle-entity-health', 'showEntityHealth');

      // Wire up the camera rotation and drag settings
      const oldInvertRows = ['row-toggle-invert-rot', 'row-toggle-invert-camera', 'row-toggle-invert', 'row-toggle-invert-qe', 'row-toggle-invert-q-e', 'row-toggle-drag-rot'];
      let insertAnchor = null;
      oldInvertRows.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (!insertAnchor) insertAnchor = el;
          el.style.display = 'none';
        }
      });

      if (insertAnchor) {
        if (!document.getElementById('row-toggle-invert-cam-x')) {
          const xRow = document.createElement('div');
          xRow.id = 'row-toggle-invert-cam-x';
          xRow.className = 'settings-row';
          xRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer;';
          xRow.innerHTML = `<span style="color: #ccc;">Invert Left/Right Rotation</span><button id="btn-toggle-invert-cam-x" class="${savedSettings.invertCameraX ? 'btn-primary' : 'btn-secondary'}">${savedSettings.invertCameraX ? 'Enabled' : 'Disabled'}</button>`;
          insertAnchor.parentNode.insertBefore(xRow, insertAnchor);
        }
        if (!document.getElementById('row-toggle-invert-cam-y')) {
          const yRow = document.createElement('div');
          yRow.id = 'row-toggle-invert-cam-y';
          yRow.className = 'settings-row';
          yRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer;';
          yRow.innerHTML = `<span style="color: #ccc;">Invert Up/Down Rotation</span><button id="btn-toggle-invert-cam-y" class="${savedSettings.invertCameraY ? 'btn-primary' : 'btn-secondary'}">${savedSettings.invertCameraY ? 'Enabled' : 'Disabled'}</button>`;
          insertAnchor.parentNode.insertBefore(yRow, insertAnchor);
        }
        setupSettingToggle('row-toggle-invert-cam-x', 'btn-toggle-invert-cam-x', 'invertCameraX');
        setupSettingToggle('row-toggle-invert-cam-y', 'btn-toggle-invert-cam-y', 'invertCameraY');
      }

      setupSettingToggle('row-toggle-middle-mouse', 'btn-toggle-middle-mouse', 'middleMouseRotation');

      const camJumpRow = document.getElementById('row-toggle-cam-jump');
      if (camJumpRow && !document.getElementById('camera-sensitivity-row')) {
        const container = camJumpRow.parentNode;

        const graphicsRow = document.createElement('div');
        graphicsRow.id = 'graphics-settings-row';
        graphicsRow.style.cssText = 'display: flex; flex-direction: column; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
        graphicsRow.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #ccc;">Render Distance</span>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="val-render-distance" style="color: #3498db; font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${savedSettings.renderDistance || 2000}</span>
              <input type="range" id="slider-render-distance" min="800" max="4000" step="100" value="${savedSettings.renderDistance || 2000}" style="width: 150px; cursor: pointer;">
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #ccc;">Render Scale (Resolution)</span>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="val-render-scale" style="color: #3498db; font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${(savedSettings.renderScale || 1.0) * 100}%</span>
              <input type="range" id="slider-render-scale" min="50" max="100" step="10" value="${(savedSettings.renderScale || 1.0) * 100}" style="width: 150px; cursor: pointer;">
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #ccc;">Max Dynamic Lights</span>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="val-dynamic-lights" style="color: #3498db; font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${savedSettings.maxDynamicLights !== undefined ? savedSettings.maxDynamicLights : 48}</span>
              <input type="range" id="slider-dynamic-lights" min="0" max="100" step="4" value="${savedSettings.maxDynamicLights !== undefined ? savedSettings.maxDynamicLights : 48}" style="width: 150px; cursor: pointer;">
            </div>
          </div>
        `;
        container.insertBefore(graphicsRow, camJumpRow);

        if (!document.getElementById('combat-style-row')) {
          const combatStyleRow = document.createElement('div');
          combatStyleRow.id = 'combat-style-row';
          combatStyleRow.className = 'settings-row';
          combatStyleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: default;';
          combatStyleRow.innerHTML = `
            <span style="color: #ccc;">Combat Targeting Style</span>
            <select id="select-combat-style" style="background: rgba(0,0,0,0.5); color: #3498db; border: 1px solid #3498db; padding: 5px; font-weight: bold; cursor: pointer; border-radius: 4px;">
              <option value="hybrid" style="background: #111; color: #3498db;">Hybrid</option>
              <option value="target" style="background: #111; color: #3498db;">Target Only</option>
              <option value="mouse" style="background: #111; color: #3498db;">Mouse Only</option>
            </select>
          `;
          container.insertBefore(combatStyleRow, camJumpRow);

          const selectCombatStyle = document.getElementById('select-combat-style');
          selectCombatStyle.value = savedSettings.combatStyle || 'hybrid';
          selectCombatStyle.onchange = (e) => {
            const val = e.target.value;
            savedSettings.combatStyle = val;
            if (window.currentGameEngine) window.currentGameEngine.clientSettings.combatStyle = val;
            saveClientSettings(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings);
          };
        }

        const snapRow = document.createElement('div');
        snapRow.id = 'camera-snap-row';
        snapRow.className = 'settings-row';
        snapRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: default;';
        snapRow.innerHTML = `
          <span style="color: #ccc;">Compass Snap Angle</span>
          <select id="select-camera-snap" style="background: rgba(0,0,0,0.5); color: #3498db; border: 1px solid #3498db; padding: 5px; font-weight: bold; cursor: pointer; border-radius: 4px;">
            <option value="0" style="background: #111; color: #3498db;">North-West</option>
            <option value="90" style="background: #111; color: #3498db;">North-East</option>
            <option value="180" style="background: #111; color: #3498db;">South-East</option>
            <option value="270" style="background: #111; color: #3498db;">South-West</option>
          </select>
        `;
        container.insertBefore(snapRow, camJumpRow.nextSibling);

        const sensRow = document.createElement('div');
        sensRow.id = 'camera-sensitivity-row';
        sensRow.className = 'settings-row';
        sensRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: default;';
        sensRow.innerHTML = `
          <span style="color: #ccc;">Camera Rotation Speed</span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span id="val-camera-sensitivity" style="color: #3498db; font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${savedSettings.cameraSensitivity || 120}</span>
            <input type="range" id="slider-camera-sensitivity" min="30" max="360" value="${savedSettings.cameraSensitivity || 120}" style="width: 150px; cursor: pointer;">
          </div>
        `;
        container.insertBefore(sensRow, snapRow.nextSibling);

        const dragSensRow = document.createElement('div');
        dragSensRow.id = 'camera-drag-sens-row';
        dragSensRow.className = 'settings-row';
        dragSensRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: default;';
        dragSensRow.innerHTML = `
          <span style="color: #ccc;">Mouse Drag Sensitivity</span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span id="val-drag-sensitivity" style="color: #3498db; font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${(savedSettings.dragRotationSensitivity !== undefined ? savedSettings.dragRotationSensitivity : 0.25) * 100}%</span>
            <input type="range" id="slider-drag-sensitivity" min="5" max="100" value="${(savedSettings.dragRotationSensitivity !== undefined ? savedSettings.dragRotationSensitivity : 0.25) * 100}" style="width: 150px; cursor: pointer;">
          </div>
        `;
        container.insertBefore(dragSensRow, sensRow.nextSibling);

        const selectSnap = document.getElementById('select-camera-snap');
        selectSnap.value = savedSettings.cameraAngleSnap !== undefined ? savedSettings.cameraAngleSnap : 0;
        selectSnap.onchange = (e) => {
          const val = parseInt(e.target.value, 10);
          savedSettings.cameraAngleSnap = val;
          if (window.currentGameEngine) window.currentGameEngine.clientSettings.cameraAngleSnap = val;
          localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings));
        };

        const sliderSens = document.getElementById('slider-camera-sensitivity');
        sliderSens.oninput = (e) => {
          const val = parseInt(e.target.value, 10);
          savedSettings.cameraSensitivity = val;
          if (window.currentGameEngine) window.currentGameEngine.clientSettings.cameraSensitivity = val;
          localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings));
        };

        const sliderDragSens = document.getElementById('slider-drag-sensitivity');
        sliderDragSens.oninput = (e) => {
          const val = parseInt(e.target.value, 10) / 100;
          savedSettings.dragRotationSensitivity = val;
          if (window.currentGameEngine) window.currentGameEngine.clientSettings.dragRotationSensitivity = val;
          localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings));
        };

        const sliderRenderDist = document.getElementById('slider-render-distance');
        if (sliderRenderDist) {
          sliderRenderDist.oninput = (e) => {
            const val = parseInt(e.target.value, 10);
            savedSettings.renderDistance = val;
            if (window.currentGameEngine) {
              window.currentGameEngine.clientSettings.renderDistance = val;
              if (window.currentGameEngine.renderer) window.currentGameEngine.renderer.needsVoxelUpdate = true;
            }
            localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings));
          };
        }

        const sliderRenderScale = document.getElementById('slider-render-scale');
        if (sliderRenderScale) {
          sliderRenderScale.onchange = (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            savedSettings.renderScale = val;
            if (window.currentGameEngine) {
              window.currentGameEngine.clientSettings.renderScale = val;
              if (window.currentGameEngine.renderer && window.currentGameEngine.renderer.updateRenderScale) {
                window.currentGameEngine.renderer.updateRenderScale(val);
              }
            }
            localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings));
          };
        }

        const sliderDynamicLights = document.getElementById('slider-dynamic-lights');
        if (sliderDynamicLights) {
          sliderDynamicLights.oninput = (e) => {
            const val = parseInt(e.target.value, 10);
            savedSettings.maxDynamicLights = val;
            if (window.currentGameEngine) window.currentGameEngine.clientSettings.maxDynamicLights = val;
            localStorage.setItem('b_client_settings', JSON.stringify(window.currentGameEngine ? window.currentGameEngine.clientSettings : savedSettings));
          };
        }
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const settingsModal = document.getElementById('settings-modal');
          if (settingsModal && settingsModal.style.display === 'flex') {
            settingsModal.style.display = 'none';
            if (document.activeElement) document.activeElement.blur();
          }
        }

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === '\\' || e.key === '|') {
          e.preventDefault();
          btnGameMenu.click();
        }

        if (gameDropdown.style.display === 'flex') {
          const key = e.key.toLowerCase();
          if (key === 'i') { e.preventDefault(); document.getElementById('btn-edit-id').click(); }
          if (key === 'k') {
             e.preventDefault();
             document.getElementById('btn-settings').click();
             const kbTabBtn = document.querySelector('.settings-tab-btn[data-tab="tab-keybinds"]');
             if (kbTabBtn) kbTabBtn.click();
          }
          if (key === 's') { e.preventDefault(); document.getElementById('btn-settings').click(); }
          if (key === 'f') { e.preventDefault(); document.getElementById('btn-friends').click(); }
          if (key === 'h') { e.preventDefault(); document.getElementById('btn-help').click(); }
          if (key === 'c') { e.preventDefault(); document.getElementById('btn-char-select').click(); }
          if (key === 'q') { e.preventDefault(); document.getElementById('btn-logout').click(); }
        }
      });
    }
  }
}
