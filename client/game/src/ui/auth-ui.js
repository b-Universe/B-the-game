export class AuthUIManager {
  constructor(app) {
    this.app = app;
    this.isSignUpMode = false;
    this.hardwareChecked = false;
    this.setupUI();
    this.loadPatchNotes();
  }

  checkHardwareConstraints(callback) {
    if (this.hardwareChecked) return callback();
    this.hardwareChecked = true;

    if (localStorage.getItem('b_client_settings')) return callback();
    if (localStorage.getItem('b_skip_hardware_warning') === 'true') return callback();

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
    } catch (e) { }

    if (!isMobile && !isLowEnd && !isSoftwareRenderer) return callback();

    const hwModal = document.getElementById('hardware-warning-modal');
    const hwInstructions = document.getElementById('hardware-warning-instructions');
    const btnPotato = document.getElementById('btn-hardware-potato');
    const btnNormal = document.getElementById('btn-hardware-normal');
    const chkSkip = document.getElementById('skip-hardware-warning');

    if (hwModal && hwInstructions && btnPotato) {
      let instructions = '';
      if (isMobile) {
        instructions = "Your device may lack a dedicated GPU or your mobile browser does not support full hardware acceleration. We strongly recommend continuing in Potato Mode for a stable experience.";
      } else if (isSoftwareRenderer) {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('firefox')) {
          instructions = "<strong style='color: #fff;'>Firefox Users:</strong><br>Go to Settings &gt; General &gt; Performance &gt; uncheck 'Use recommended performance settings' and enable 'Use hardware acceleration when available', then restart your browser.";
        } else if (ua.includes('chrome') || ua.includes('edg')) {
          instructions = "<strong style='color: #fff;'>Chrome/Edge Users:</strong><br>Go to Settings &gt; System &gt; enable 'Use graphics acceleration when available', then restart your browser.";
        } else {
          instructions = "<strong style='color: #fff;'>Fixing this:</strong><br>Please enable 'Hardware Acceleration' or 'Use Graphics Acceleration' in your browser's settings and restart it.";
        }
      } else if (isLowEnd) {
        instructions = "Your system appears to have limited memory or CPU cores available. We recommend using Potato Mode to prevent crashes.";
      }

      hwInstructions.innerHTML = instructions;
      hwModal.style.display = 'flex';

      const handleClose = () => {
        if (chkSkip && chkSkip.checked) localStorage.setItem('b_skip_hardware_warning', 'true');
        hwModal.style.display = 'none';
      };

      btnPotato.onclick = () => {
        handleClose();
        const defaultSettings = { uiMode: 'classic', snapPowerTray: true, snapActivePowers: true, snapIndicators: true, combatStyle: 'hybrid', powerbarOrientation: 'horizontal', mergeSynthBar: false, showPowerRaytrace: true, renderDistance: 2000, renderScale: 1.0, uiScale: 1.0, minimapScale: 1.0, minimapZoom: 8, showCoords: false, showYawPitch: false, showFPS: false, showPing: false, showBaseplates: false, cameraFollowsJump: true, showMinimap: true, rotateMinimap: true, clickToMove: false, showClickMovePath: true, alwaysSprint: false, showPlayerNames: true, showPlayerHealth: true, showEntityNames: true, showEntityHealth: true, invertCameraX: false, invertCameraY: false, disableAFKTimer: false, middleMouseRotation: true, dragRotationSensitivity: 0.25, lockBuilderPanel: false, cameraAngle: 0, enableShadows: true, enableDayNightCycle: true, enableWeatherParticles: true, enableCameraShake: true, maxDynamicLights: 48, chunkGenSpeed: 3, actionBinds: { moveForward: { primary: 'w', alt: 'arrowup' }, moveBackward: { primary: 's', alt: 'arrowdown' }, moveLeft: { primary: 'a', alt: 'arrowleft' }, moveRight: { primary: 'd', alt: 'arrowright' }, jump: { primary: 'space', alt: '' }, sprint: { primary: 'shift', alt: '' }, flyDown: { primary: 'x', alt: '' }, camUp: { primary: 'pageup', alt: '' }, camDown: { primary: 'pagedown', alt: '' }, camLeft: { primary: 'q', alt: '' }, camRight: { primary: 'e', alt: '' }, undo: { primary: 'ctrl+z', alt: '' }, redo: { primary: 'ctrl+y', alt: '' }, picker: { primary: 'alt', alt: '' }, buildDelete: { primary: 'shift', alt: '' }, buildDragSelect: { primary: 'ctrl', alt: '' }, power1: { primary: '1', alt: '' }, power2: { primary: '2', alt: '' }, power3: { primary: '3', alt: '' }, power4: { primary: '4', alt: '' }, power5: { primary: '5', alt: '' }, power6: { primary: '6', alt: '' }, power7: { primary: '7', alt: '' }, power8: { primary: '8', alt: '' }, power9: { primary: '9', alt: '' }, power10: { primary: '0', alt: '' } } };
        const potatoSettings = Object.assign({}, defaultSettings, { enableShadows: false, enableDayNightCycle: false, enableWeatherParticles: false, renderDistance: 800, renderScale: 0.5, maxDynamicLights: 0, chunkGenSpeed: 1 });
        localStorage.setItem('b_client_settings', JSON.stringify(potatoSettings));
        callback();
      };

      if (btnNormal) {
        btnNormal.onclick = () => {
          handleClose();
          callback();
        };
      }
    } else {
      callback();
    }
  }

  setupUI() {
    // --- Pre-Game Settings Modal Logic ---
    const btnSettings = document.getElementById('btn-main-settings');
    const modalSettings = document.getElementById('main-settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-main-settings');
    const rowPerfMode = document.getElementById('row-toggle-perf-mode');
    const btnPerfMode = document.getElementById('btn-toggle-perf-mode');
    const rowPreWeather = document.getElementById('row-toggle-pre-weather');
    const btnPreWeather = document.getElementById('btn-toggle-pre-weather');
    const sliderPreRenderDist = document.getElementById('slider-pre-render-distance');
    const sliderPreRenderScale = document.getElementById('slider-pre-render-scale');
    const sliderPreDynamicLights = document.getElementById('slider-pre-dynamic-lights');
    const sliderPreMenuVolume = document.getElementById('slider-pre-menu-volume');

    const updatePerfButtonUI = (isPerfMode) => {
      if (isPerfMode) {
        btnPerfMode.innerText = 'On';
        btnPerfMode.className = 'btn-primary';
        btnPerfMode.style.borderColor = '#2ecc71';
        btnPerfMode.style.color = '#2ecc71';
      } else {
        btnPerfMode.innerText = 'Off';
        btnPerfMode.className = 'btn-secondary';
        btnPerfMode.style.borderColor = 'var(--text-dim)';
        btnPerfMode.style.color = 'var(--text-primary)';
      }
    };

    const updateWeatherButtonUI = (isWeatherOn) => {
      if (isWeatherOn) {
        btnPreWeather.innerText = 'On';
        btnPreWeather.className = 'btn-primary';
        btnPreWeather.style.borderColor = '#2ecc71';
        btnPreWeather.style.color = '#2ecc71';
      } else {
        btnPreWeather.innerText = 'Off';
        btnPreWeather.className = 'btn-secondary';
        btnPreWeather.style.borderColor = 'var(--text-dim)';
        btnPreWeather.style.color = 'var(--text-primary)';
      }
    };

    if (btnSettings && modalSettings) {
      btnSettings.addEventListener('click', () => {
        modalSettings.style.display = 'block';
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : {};
        updatePerfButtonUI(settings.enableShadows === false && settings.enableDayNightCycle === false);
        updateWeatherButtonUI(settings.enableWeatherParticles !== false);

        if (sliderPreRenderDist) {
          sliderPreRenderDist.value = settings.renderDistance !== undefined ? settings.renderDistance : 2000;
          if (document.getElementById('val-pre-render-distance')) document.getElementById('val-pre-render-distance').innerText = sliderPreRenderDist.value;
        }
        if (sliderPreRenderScale) {
          sliderPreRenderScale.value = settings.renderScale !== undefined ? settings.renderScale * 100 : 100;
          if (document.getElementById('val-pre-render-scale')) document.getElementById('val-pre-render-scale').innerText = `${sliderPreRenderScale.value}%`;
        }
        if (sliderPreDynamicLights) {
          sliderPreDynamicLights.value = settings.maxDynamicLights !== undefined ? settings.maxDynamicLights : 48;
          if (document.getElementById('val-pre-dynamic-lights')) document.getElementById('val-pre-dynamic-lights').innerText = sliderPreDynamicLights.value;
        }
        if (sliderPreMenuVolume) {
          const vol = localStorage.getItem('b_login_volume');
          const displayVol = vol !== null ? parseFloat(vol) * 100 : 50;
          sliderPreMenuVolume.value = displayVol;
          if (document.getElementById('val-pre-menu-volume')) {
            document.getElementById('val-pre-menu-volume').innerText = `${displayVol}%`;
          }
        }
      });
      btnCloseSettings.addEventListener('click', () => modalSettings.style.display = 'none');
      rowPerfMode.addEventListener('click', () => {
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : { enableShadows: true, enableDayNightCycle: true };
        const newPerfState = !(settings.enableShadows === false && settings.enableDayNightCycle === false);
        settings.enableShadows = !newPerfState;
        settings.enableDayNightCycle = !newPerfState;
        localStorage.setItem('b_client_settings', JSON.stringify(settings));
        updatePerfButtonUI(newPerfState);
      });
      rowPreWeather.addEventListener('click', () => {
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : { enableWeatherParticles: true };
        const newWeatherState = settings.enableWeatherParticles === false;
        settings.enableWeatherParticles = newWeatherState;
        localStorage.setItem('b_client_settings', JSON.stringify(settings));
        updateWeatherButtonUI(newWeatherState);
      });

      if (sliderPreRenderDist) sliderPreRenderDist.addEventListener('input', (e) => {
        if (document.getElementById('val-pre-render-distance')) document.getElementById('val-pre-render-distance').innerText = e.target.value;
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : {};
        settings.renderDistance = parseInt(e.target.value, 10);
        localStorage.setItem('b_client_settings', JSON.stringify(settings));
      });
      if (sliderPreRenderScale) {
        sliderPreRenderScale.addEventListener('input', (e) => { if (document.getElementById('val-pre-render-scale')) document.getElementById('val-pre-render-scale').innerText = `${e.target.value}%`; });
        sliderPreRenderScale.addEventListener('change', (e) => {
          const saved = localStorage.getItem('b_client_settings');
          const settings = saved ? JSON.parse(saved) : {};
          settings.renderScale = parseInt(e.target.value, 10) / 100;
          localStorage.setItem('b_client_settings', JSON.stringify(settings));
        });
      }
      if (sliderPreDynamicLights) sliderPreDynamicLights.addEventListener('input', (e) => {
        if (document.getElementById('val-pre-dynamic-lights')) document.getElementById('val-pre-dynamic-lights').innerText = e.target.value;
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : {};
        settings.maxDynamicLights = parseInt(e.target.value, 10);
        localStorage.setItem('b_client_settings', JSON.stringify(settings));
      });
      if (sliderPreMenuVolume) sliderPreMenuVolume.addEventListener('input', (e) => {
        const val = e.target.value;
        if (document.getElementById('val-pre-menu-volume')) document.getElementById('val-pre-menu-volume').innerText = `${val}%`;
        const normalized = val / 100;
        localStorage.setItem('b_login_volume', normalized);
        if (this.app && this.app.menuAudio && typeof this.app.menuAudio.setVolume === 'function') {
          this.app.menuAudio.setVolume(normalized);
        }
        const btnMusic = document.getElementById('btn-login-music');
        if (btnMusic) {
          if (normalized === 0) btnMusic.innerText = '🔇';
          else if (normalized <= 0.25) btnMusic.innerText = '🔈';
          else if (normalized <= 0.5) btnMusic.innerText = '🔉';
          else btnMusic.innerText = '🔊';
        }
      });
    }

    // --- Menu Music Button Cycling Logic ---
    const btnMusic = document.getElementById('btn-login-music');
    if (btnMusic) {
      const volSequence = [0, 0.25, 0.5, 0.75];
      const iconSequence = ['🔇', '🔈', '🔉', '🔊'];
      let currentVolIndex = 2; // Default to 50%
      let isFirstClick = true;

      const savedVol = localStorage.getItem('b_login_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        currentVolIndex = volSequence.indexOf(parsed);
        if (currentVolIndex === -1) currentVolIndex = 2;
        isFirstClick = false;
      }

      btnMusic.innerText = iconSequence[currentVolIndex];

      const updateAudio = () => {
        btnMusic.innerText = iconSequence[currentVolIndex];
        localStorage.setItem('b_login_volume', volSequence[currentVolIndex]);
        if (this.app && this.app.menuAudio && typeof this.app.menuAudio.setVolume === 'function') {
          this.app.menuAudio.setVolume(volSequence[currentVolIndex]);
        }
      };

      btnMusic.onclick = () => {
        if (isFirstClick) { currentVolIndex = 0; isFirstClick = false; }
        else { currentVolIndex = (currentVolIndex + 1) % volSequence.length; }
        updateAudio();
      };
    }

    const btnMain = document.getElementById('btn-main');
    const togglePrompt = document.querySelector('.toggle-text');
    const emailGroup = document.getElementById('email-group');
    const btnPlay = document.getElementById('btn-play');
    const noEmailCheckbox = document.getElementById('no-email');
    const emailInput = document.getElementById('email');

    const handleToggle = () => {
      this.isSignUpMode = !this.isSignUpMode;
      if (emailGroup) emailGroup.style.display = this.isSignUpMode ? 'flex' : 'none';
      if (btnMain) btnMain.innerText = this.isSignUpMode ? 'Create Account' : 'Login';

      if (togglePrompt) {
        if (this.isSignUpMode) {
          togglePrompt.innerHTML = `Already Have An Account? <span id="toggle-auth">Log in!</span>`;
        } else {
          togglePrompt.innerHTML = `Don't Have An Account? <span id="toggle-auth">Sign Up!</span>`;
        }
        document.getElementById('toggle-auth').onclick = handleToggle;
      }
    };

    const toggleAuthBtn = document.getElementById('toggle-auth');
    if (toggleAuthBtn) toggleAuthBtn.onclick = handleToggle;

    const savedUsername = localStorage.getItem('b_saved_username');
    if (savedUsername) {
      const uInput = document.getElementById('username');
      if (uInput) uInput.value = savedUsername;
      const remUser = document.getElementById('remember-user');
      if (remUser) remUser.checked = true;
    }

    if (noEmailCheckbox && emailInput) {
      noEmailCheckbox.addEventListener('change', (e) => {
        emailInput.disabled = e.target.checked;
        if (e.target.checked) emailInput.value = '';
      });
    }

    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        const modal = document.getElementById('custom-modal');
        if (!modal || modal.style.display !== 'flex') {
          e.preventDefault();
          if (btnMain) btnMain.click();
        }
      }
    };
    document.getElementById('username')?.addEventListener('keydown', handleEnter);
    document.getElementById('password')?.addEventListener('keydown', handleEnter);
    document.getElementById('email')?.addEventListener('keydown', handleEnter);

    if (btnMain) {
      btnMain.addEventListener('click', () => {
        this.checkHardwareConstraints(async () => {
          const user = document.getElementById('username').value.trim();
          const pass = document.getElementById('password').value;
          let email = document.getElementById('email') ? document.getElementById('email').value.trim() : '';
          const noEmailCheckboxEl = document.getElementById('no-email');
          const noEmail = noEmailCheckboxEl ? noEmailCheckboxEl.checked : false;

          if (!user || !pass) return this.app.showModal("Input Error", "Username and Password are required.");

          try {
            if (this.isSignUpMode) {
              if (!email || noEmail) email = '';
              const newAcc = await this.app.auth.register(user, email, pass);

              this.app.currentAccount = newAcc;
              localStorage.setItem('b_current_account', JSON.stringify(newAcc));
              this.app.showModal("Success", "Account created successfully! You can now log in.");
              this.app.initSelection(newAcc);
            } else {
              const result = await this.app.auth.verify(user, pass);
              if (result.success) {
                this.app.currentAccount = result.account;
                if (result.account.clientSettings) {
                  localStorage.setItem('b_client_settings', JSON.stringify(result.account.clientSettings));
                }
                localStorage.setItem('b_current_account', JSON.stringify(result.account));
                const remUser = document.getElementById('remember-user');
                if (remUser && remUser.checked) {
                  localStorage.setItem('b_saved_username', user);
                } else {
                  localStorage.removeItem('b_saved_username');
                }

                this.app.initSelection(result.account);
              } else {
                this.app.showModal("Auth Failure", "Invalid login information.");
              }
            }
          } catch (err) {
            console.error("Auth Error:", err);
            this.app.showModal("System Error", err.message || "An Unexpected Error Occurred. Check The Console.");
          }
        });
      });
    }

    const btnGuest = document.getElementById('btn-guest');
    const guestModal = document.getElementById('guest-modal');
    const guestInput = document.getElementById('guest-name-input');
    const btnGuestPlay = document.getElementById('confirm-guest-login');
    const btnGuestCancel = document.getElementById('cancel-guest-login');

    if (btnGuest && guestModal) {
      btnGuest.addEventListener('click', () => {
        this.checkHardwareConstraints(() => {
          guestInput.value = '';
          guestModal.style.display = 'flex';
          guestInput.focus();
        });
      });

      btnGuestCancel.addEventListener('click', () => {
        guestModal.style.display = 'none';
      });

      btnGuestPlay.addEventListener('click', async () => {
        const name = guestInput.value.trim();
        if (name.length < 2 || name.length > 16) {
          return this.app.showModal("Input Error", "Name must be between 2 and 16 characters.");
        }
        guestModal.style.display = 'none';

        try {
          const res = await fetch('/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ charName: name })
          });
          const data = await res.json();

          if (!res.ok) {
            return this.app.showModal("Guest Error", data.error || "Failed to create guest account.");
          }

          this.app.currentAccount = data;
          localStorage.setItem('b_current_account', JSON.stringify(data));

          document.getElementById('creation-screen').style.display = 'none';
          this.app.initSelection(data);

          setTimeout(() => {
            const playBtn = document.getElementById('btn-play');
            if (playBtn) playBtn.click();
          }, 100);

        } catch (err) {
          console.error(err);
          this.app.showModal("System Error", "Could not connect to the server.");
        }
      });
    }

    const autoRelogChar = localStorage.getItem('b_auto_relog_char');
    const savedAccount = localStorage.getItem('b_current_account');

    if (autoRelogChar && savedAccount) {
      localStorage.removeItem('b_auto_relog_char');
      this.checkHardwareConstraints(() => {
        try {
          const account = JSON.parse(savedAccount);
          this.app.currentAccount = account;

          let selectedChar = (account.characters || []).find(c => {
            const cName = typeof c === 'object' ? c.name : c;
            return cName && cName.trim().toLowerCase() === autoRelogChar.trim().toLowerCase();
          });

          if (!selectedChar && account.characters && account.characters.length > 0) {
            selectedChar = typeof account.characters[0] === 'object' ? account.characters[0] : { name: account.characters[0] };
          }

          if (typeof selectedChar === 'string') {
            selectedChar = { name: selectedChar };
          }

          if (selectedChar) {
            document.getElementById('creation-screen').style.display = 'none';
            document.getElementById('selection-screen').style.display = 'none';

            let loader = document.getElementById('loading-screen');
            if (!loader) {
              loader = document.createElement('div');
              loader.id = 'loading-screen';
              loader.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0b0e14; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: monospace; pointer-events: auto;';
              loader.innerHTML = '<h1 style="font-size: 3rem; text-shadow: 0 0 10px #f1c40f;">INITIALIZING ZONE</h1><p style="font-size: 1.2rem; color: #fff; margin-bottom: 30px;">Loading Engine...</p>';
              document.body.appendChild(loader);
            } else {
              loader.style.display = 'flex';
            }
            document.getElementById('game-screen').style.display = 'block';
            const btnMusic = document.getElementById('btn-login-music');
            if (btnMusic) btnMusic.style.display = 'none';

            import(`./game/engine.js?v=${Date.now()}`).then(module => {
              if (window.currentGameEngine) window.currentGameEngine.stop();
              window.currentGameEngine = new module.GameEngine('game-canvas', selectedChar, account.uuid);
            }).catch(err => {
              console.error("Engine Import Error:", err);
              this.app.showModal("Engine Error", "Failed to load engine.js.");
            });
          }
        } catch (e) {
          console.error("Failed to parse auto-relog data", e);
        }
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        const activeSlot = document.querySelector('.char-slot.active');
        if (!activeSlot) {
          return this.app.showModal("Selection Error", "Please select a character to play.");
        }

        const nameEl = activeSlot.querySelector('h1, h2, h3, h4, h5, h6, strong, .char-name');
        let charName = activeSlot.dataset.name;
        if (!charName) {
          if (nameEl) {
            charName = nameEl.innerText.trim();
          } else {
            charName = activeSlot.innerText.trim().split('\n')[0].trim();
          }
        }

        if (!this.app.currentAccount) return this.app.showModal("Data Error", "No account loaded.");

        const selectedChar = this.app.currentAccount.characters.find(c => c.name.toLowerCase() === charName.toLowerCase());

        if (!selectedChar) {
          return this.app.showModal("Data Error", "Could not load character data.");
        }

        document.getElementById('selection-screen').style.display = 'none';

        let loader = document.getElementById('loading-screen');
        if (!loader) {
          loader = document.createElement('div');
          loader.id = 'loading-screen';
          loader.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0b0e14; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: monospace; pointer-events: auto;';
          loader.innerHTML = '<h1 style="font-size: 3rem; text-shadow: 0 0 10px #f1c40f;">INITIALIZING ZONE</h1><p style="font-size: 1.2rem; color: #fff; margin-bottom: 30px;">Loading Engine...</p>';
          document.body.appendChild(loader);
        } else {
          loader.style.display = 'flex';
        }

        document.getElementById('game-screen').style.display = 'block';
        const btnMusic = document.getElementById('btn-login-music');
        if (btnMusic) btnMusic.style.display = 'none';

        import(`./game/engine.js?v=${Date.now()}`).then(module => {
          if (window.currentGameEngine) window.currentGameEngine.stop();
          window.currentGameEngine = new module.GameEngine('game-canvas', selectedChar, this.app.currentAccount.uuid);
        }).catch(err => {
          console.error("Engine Import Error:", err);
          this.app.showModal("Engine Error", "Failed to load engine.js. Open your browser console (F12) to see the exact file path error.");
        });
      });
    }
  }

  async loadPatchNotes() {
    const list = document.getElementById('patch-notes-list');
    if (!list) return;

    try {
      const res = await fetch('/api/patch-notes?v=' + Date.now());
      if (res.ok) {
        const notes = await res.json();
        list.innerHTML = '';
        notes.forEach(note => {
          const div = document.createElement('div');
          let content = `<strong style="color: ${note.color || '#3498db'};">${note.version}</strong>`;
          if (note.text) {
            content += ` - ${note.text}`;
          }
          if (note.changes && note.changes.length > 0) {
            content += `<ul style="margin: 5px 0 10px 15px; padding: 0; font-size: 0.9em; color: #ccc;">`;
            note.changes.forEach(c => {
              const typeColor = c.type === 'Engine' ? '#3498db' : c.type === 'Gameplay' ? '#2ecc71' : c.type === 'Fix' ? '#e74c3c' : '#f1c40f';
              content += `<li><strong style="color: ${typeColor};">[${c.type}]</strong> ${c.text}</li>`;
            });
            content += `</ul>`;
          }
          div.innerHTML = content;
          list.appendChild(div);
        });
      } else {
        list.innerHTML = '<div style="text-align: center; color: #ff4757;">Failed to load patch notes.</div>';
      }
    } catch (e) {
      list.innerHTML = '<div style="text-align: center; color: #ff4757;">Error loading patch notes.</div>';
    }
  }
}
