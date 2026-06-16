import { GAME_TIPS } from './tips.js?v=cache-bust-005';

export class LoadingUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
  }

  setupLoadingScreen() {
    this.loadingStartTime = performance.now();
    this.loadingScreen = document.getElementById('loading-screen');
    if (!this.loadingScreen) {
      this.loadingScreen = document.createElement('div');
      this.loadingScreen.id = 'loading-screen';
      this.loadingScreen.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0b0e14; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: var(--font-mono); pointer-events: auto;';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(this.loadingScreen);
      else document.body.appendChild(this.loadingScreen);
    } else {
      this.loadingScreen.style.display = 'flex';
    }

    const randomTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];

    this.loadingScreen.innerHTML = `
      <h1 style="font-size: 3rem; text-shadow: 0 0 10px #f1c40f;">INITIALIZING ZONE</h1>
      <p style="font-size: 1.2rem; color: #fff; margin-bottom: 30px;">Building Geometry...</p>
      <div style="background: rgba(243, 156, 18, 0.2); border: 1px solid #f39c12; padding: 15px; border-radius: 6px; width: 600px; max-width: 90vw; text-align: center; min-height: 48px; display: flex; flex-direction: column; justify-content: center;">
        <div><span style="color: #f39c12; font-weight: bold; margin-right: 5px;">TIP:</span> <span id="loading-tip-text" style="color: #fff; transition: opacity 0.5s; line-height: 1.4;">${this.ui.formatGameText(randomTip)}</span></div>
      </div>
      <button id="btn-potato-mode" style="position: absolute; bottom: 20px; right: 20px; background: rgba(5, 7, 10, 0.8); border: 1px solid var(--text-dim); color: var(--text-dim); padding: 8px 15px; border-radius: 4px; cursor: pointer; font-family: var(--font-mono); font-size: 0.85rem; transition: all 0.3s; opacity: 0; pointer-events: none;">Taking too long to load? Try Potato Mode!</button>
    `;

    const potatoBtn = document.getElementById('btn-potato-mode');
    if (potatoBtn) {
      potatoBtn.onmouseenter = () => {
        potatoBtn.style.borderColor = '#f1c40f';
        potatoBtn.style.color = '#f1c40f';
      };
      potatoBtn.onmouseleave = () => {
        potatoBtn.style.borderColor = 'var(--text-dim)';
        potatoBtn.style.color = 'var(--text-dim)';
      };
      potatoBtn.onclick = () => {
        const saved = localStorage.getItem('b_client_settings');
        const settings = saved ? JSON.parse(saved) : {};
        Object.assign(settings, { enableShadows: false, enableDayNightCycle: false, enableWeatherParticles: false, renderDistance: 800, renderScale: 0.5, maxDynamicLights: 0 });
        localStorage.setItem('b_client_settings', JSON.stringify(settings));
        window.location.reload();
      };

      if (this.potatoTimeout) clearTimeout(this.potatoTimeout);
      this.potatoTimeout = setTimeout(() => {
        if (this.loadingScreen && this.loadingScreen.style.display !== 'none') {
          potatoBtn.style.opacity = '1';
          potatoBtn.style.pointerEvents = 'auto';
        }
      }, 10000);
    }

    // Cycle through tips every 6 seconds
    if (this.tipInterval) clearInterval(this.tipInterval);
    this.tipInterval = setInterval(() => {
      const tipEl = document.getElementById('loading-tip-text');
      if (tipEl) {
        tipEl.style.opacity = '0'; // Trigger CSS transition
        setTimeout(() => {
          const newTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
          tipEl.innerHTML = this.ui.formatGameText(this.ui.parseTip(newTip));
          tipEl.style.opacity = '1';
        }, 500); // Wait for the fade-out before swapping text
      } else {
        clearInterval(this.tipInterval);
      }
    }, 6000);
  }


  hideLoadingScreen() {
    if (this.loadingScreen && this.loadingScreen.style.display !== 'none') {
      const elapsed = performance.now() - this.loadingStartTime;
      const remaining = Math.max(0, 3000 - elapsed);

      if (window.app && window.app.menuAudio && window.app.menuAudio.isPlaying) {
        window.app.menuAudio.fadeOutAndStop();
      }

      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
        if (this.tipInterval) {
          clearInterval(this.tipInterval);
          this.tipInterval = null;
        }
      }, remaining);
    }
  }

  showReconnecting(isReconnecting) {
    let overlay = document.getElementById('reconnecting-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'reconnecting-overlay';
      overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(11, 14, 20, 0.8); z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: var(--font-mono); font-size: 2rem; text-shadow: 0 0 10px #f1c40f; pointer-events: auto; text-align: center; opacity: 0; transition: opacity 0.5s ease-in-out;';
      overlay.innerHTML = 'SERVER UNDERGOING MAINTENANCE<br><div style="font-size: 1.2rem; color: #ccc; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">Attempting to reconnect... <div style="border: 3px solid rgba(204, 204, 204, 0.3); border-radius: 50%; border-top: 3px solid #f1c40f; width: 18px; height: 18px; animation: reconnect-spin 1s linear infinite;"></div></div><div style="background: rgba(243, 156, 18, 0.2); border: 1px solid #f39c12; padding: 15px; border-radius: 6px; width: 600px; max-width: 90vw; text-align: center; min-height: 48px; display: flex; flex-direction: column; justify-content: center; margin-top: 30px; font-size: 1.1rem; text-shadow: none; font-family: sans-serif;"><div><span style="color: #f39c12; font-weight: bold; margin-right: 5px;">TIP:</span> <span id="reconnect-tip-text" style="color: #fff; transition: opacity 0.5s; line-height: 1.4;"></span></div></div><style>@keyframes reconnect-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen) gameScreen.appendChild(overlay);
      else document.body.appendChild(overlay);
    }

    if (isReconnecting) {
      overlay.style.display = 'flex';
      void overlay.offsetWidth; // Trigger reflow so the transition fires
      overlay.style.opacity = '1';

      const updateTip = () => {
        const tipEl = document.getElementById('reconnect-tip-text');
        if (tipEl) {
          tipEl.style.opacity = '0';
          setTimeout(() => {
            const randomTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
            tipEl.innerHTML = this.ui.formatGameText ? this.ui.formatGameText(this.ui.parseTip(randomTip)) : randomTip;
            tipEl.style.opacity = '1';
          }, 500);
        }
      };

      if (!this.reconnectTipInterval) {
        updateTip();
        this.reconnectTipInterval = setInterval(updateTip, 6000);
      }
    } else {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.style.opacity === '0') {
          overlay.style.display = 'none';
          if (this.reconnectTipInterval) {
            clearInterval(this.reconnectTipInterval);
            this.reconnectTipInterval = null;
          }
        }
      }, 500);
    }
  }
}
