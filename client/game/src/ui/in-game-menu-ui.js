import { SettingsWindow } from './windows/settings-windows.js?v=cache-bust-005';

export class InGameMenuUIManager {
  constructor(app) {
    this.app = app;
    this.settingsWindow = new SettingsWindow(app);
    this.setupUI();
  }

  setupUI() {
    const defaultSettings = { snapPowerTray: true, snapActivePowers: true, snapIndicators: true, combatStyle: 'hybrid', powerbarOrientation: 'horizontal', mergeSynthBar: false, showPowerRaytrace: true, fov: 1000, renderDistance: 2000, renderScale: 1.0, uiScale: 1.0, minimapScale: 1.0, minimapZoom: 8, showCoords: false, showYawPitch: false, showFPS: false, showPing: false, showBaseplates: false, cameraFollowsJump: true, showMinimap: true, rotateMinimap: true, clickToMove: false, showClickMovePath: true, alwaysSprint: false, showPlayerNames: true, showPlayerHealth: true, showEntityNames: true, showEntityHealth: true, cameraSensitivity: 120, cameraAngleSnap: 0, invertCameraX: false, invertCameraY: false, middleMouseRotation: true, dragRotationSensitivity: 0.25, lockBuilderPanel: false, enableShadows: true, softShadows: true, enableDayNightCycle: true, enableCameraShake: true, enableWeatherParticles: true, maxDynamicLights: 48, chunkGenSpeed: 3, enableArcadeCRT: true, actionBinds: { moveForward: { primary: 'w', alt: 'arrowup' }, moveBackward: { primary: 's', alt: 'arrowdown' }, moveLeft: { primary: 'a', alt: 'arrowleft' }, moveRight: { primary: 'd', alt: 'arrowright' }, jump: { primary: 'space', alt: '' }, sprint: { primary: 'shift', alt: '' }, flyDown: { primary: 'x', alt: '' }, camUp: { primary: 'pageup', alt: '' }, camDown: { primary: 'pagedown', alt: '' }, camLeft: { primary: 'q', alt: '' }, camRight: { primary: 'e', alt: '' }, undo: { primary: 'ctrl+z', alt: '' }, redo: { primary: 'ctrl+y', alt: '' }, picker: { primary: 'alt', alt: '' }, buildDelete: { primary: 'shift', alt: '' }, buildDragSelect: { primary: 'ctrl', alt: '' }, power1: { primary: '1', alt: '' }, power2: { primary: '2', alt: '' }, power3: { primary: '3', alt: '' }, power4: { primary: '4', alt: '' }, power5: { primary: '5', alt: '' }, power6: { primary: '6', alt: '' }, power7: { primary: '7', alt: '' }, power8: { primary: '8', alt: '' }, power9: { primary: '9', alt: '' }, power10: { primary: '0', alt: '' } } };
    const savedSettingsStr = localStorage.getItem('b_client_settings');

    if (!savedSettingsStr) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia("(any-pointer: coarse)").matches);
      const isLowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
      let isSoftwareRenderer = false;
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
            if (renderer.includes('swiftshader') || renderer.includes('llvmpipe') || renderer.includes('software')) isSoftwareRenderer = true;
          }
        }
      } catch (e) {}

      if (isMobile || isLowEnd || isSoftwareRenderer) {
        Object.assign(defaultSettings, { enableShadows: false, enableDayNightCycle: false, enableWeatherParticles: false, renderDistance: 800, renderScale: 0.5, maxDynamicLights: 0, chunkGenSpeed: 1 });
      }
    }

    const savedSettings = savedSettingsStr ? Object.assign({}, defaultSettings, JSON.parse(savedSettingsStr)) : defaultSettings;

    const saveClientSettings = (settingsObj) => {
        localStorage.setItem('b_client_settings', JSON.stringify(settingsObj));
        if (window.currentGameEngine && window.currentGameEngine.network) {
            window.currentGameEngine.network.sendClientSettings(settingsObj);
        }
    };

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

        const btnMusic = document.getElementById('btn-login-music');
        if (btnMusic) btnMusic.style.display = 'block';
        if (this.app.menuAudio) this.app.menuAudio.play();

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

        const btnMusic = document.getElementById('btn-login-music');
        if (btnMusic) btnMusic.style.display = 'block';
        if (this.app.menuAudio) this.app.menuAudio.play();

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

      const btnSettings = document.getElementById('btn-settings');
      if (btnSettings) {
        btnSettings.addEventListener('click', () => {
          gameDropdown.style.display = 'none';
          this.settingsWindow.open();
        });
      }

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

      document.getElementById('btn-close-id').addEventListener('click', () => {
        document.getElementById('in-game-id-modal').style.display = 'none';
      });
      document.addEventListener('keydown', (e) => {
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
