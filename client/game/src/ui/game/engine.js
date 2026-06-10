
import { ChatManager } from './chat.js?v=cache-bust-005';
import { NetworkManager } from './network.js?v=cache-bust-005';
import { UIManager } from './ui.js?v=cache-bust-005';
import { InputManager } from './input.js?v=cache-bust-005';
import { MinimapManager } from './minimap.js?v=cache-bust-005';
import { Renderer } from './renderer.js?v=cache-bust-005';
import { CombatManager } from './combat.js?v=cache-bust-005';
import { EntityManager } from './entity-manager.js?v=cache-bust-005';
import { MapOverlayManager } from './map_overlay.js?v=cache-bust-005';
import { MapManager } from './chunk_manager.js?v=cache-bust-005';
import { getBlockProps } from './blocks.js?v=cache-bust-005';
import { FURNITURE_REGISTRY, POWERSET_REGISTRY, POWER_REGISTRY, EFFECT_REGISTRY } from './registry.js?v=cache-bust-005';
import { PhysicsManager } from './physics-manager.js?v=cache-bust-005';
import { BuilderManager } from './builder-manager.js?v=cache-bust-005';
import { WorldSerializer } from './world-serializer.js?v=cache-bust-005';
import { ArcadeSystem } from './arcade-system.js?v=cache-bust-005';

export class GameEngine {
  constructor(canvasId, playerData, accountUuid) {
    this.canvas = document.getElementById(canvasId);
    this.playerData = playerData;
    this.accountUuid = accountUuid;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    if (!this.playerData.powersets) this.playerData.powersets = [];
    const psIdx = this.playerData.powersets.indexOf('Inherited');
    if (psIdx !== -1) this.playerData.powersets[psIdx] = 'inherited';
    if (!this.playerData.powersets.includes('inherited')) {
      this.playerData.powersets.push('Inherited');
    }

    if (!this.playerData.powers) this.playerData.powers = [];
    const brIdx = this.playerData.powers.indexOf('Brawl');
    if (brIdx !== -1) this.playerData.powers[brIdx] = 'brawl';
    const taIdx = this.playerData.powers.indexOf('Throw Airplane');
    if (taIdx !== -1) this.playerData.powers[taIdx] = 'throw-airplane';

    if (!this.playerData.powerTray && this.playerData.powers) {
      this.playerData.powerTray = this.playerData.powers.filter(p => window.POWER_REGISTRY && window.POWER_REGISTRY[p] && window.POWER_REGISTRY[p].type?.toLowerCase() !== 'passive');
    }

    const defaultSettings = { uiMode: 'classic', snapPowerTray: true, snapActivePowers: true, snapIndicators: true, combatStyle: 'hybrid', powerbarOrientation: 'horizontal', mergeSynthBar: false, showPowerRaytrace: true, fov: 1000, renderDistance: 2000, renderScale: 1.0, uiScale: 1.0, minimapScale: 1.0, minimapZoom: 8, showCoords: false, showYawPitch: false, showFPS: false, showPing: false, showBaseplates: false, cameraFollowsJump: true, showMinimap: true, rotateMinimap: true, clickToMove: false, showClickMovePath: true, alwaysSprint: false, showPlayerNames: true, showPlayerHealth: true, showEntityNames: true, showEntityHealth: true, invertCameraX: false, invertCameraY: false, middleMouseRotation: true, dragRotationSensitivity: 0.25, lockBuilderPanel: false, cameraAngle: 0, enableShadows: true, enableDayNightCycle: true, enableWeatherParticles: true, enableCameraShake: true, maxDynamicLights: 48, chunkGenSpeed: 3, actionBinds: { moveForward: { primary: 'w', alt: 'arrowup' }, moveBackward: { primary: 's', alt: 'arrowdown' }, moveLeft: { primary: 'a', alt: 'arrowleft' }, moveRight: { primary: 'd', alt: 'arrowright' }, jump: { primary: 'space', alt: '' }, sprint: { primary: 'shift', alt: '' }, flyDown: { primary: 'x', alt: '' }, camUp: { primary: 'pageup', alt: '' }, camDown: { primary: 'pagedown', alt: '' }, camLeft: { primary: 'q', alt: '' }, camRight: { primary: 'e', alt: '' }, undo: { primary: 'ctrl+z', alt: '' }, redo: { primary: 'ctrl+y', alt: '' }, picker: { primary: 'alt', alt: '' }, buildDelete: { primary: 'shift', alt: '' }, buildDragSelect: { primary: 'ctrl', alt: '' }, power1: { primary: '1', alt: '' }, power2: { primary: '2', alt: '' }, power3: { primary: '3', alt: '' }, power4: { primary: '4', alt: '' }, power5: { primary: '5', alt: '' }, power6: { primary: '6', alt: '' }, power7: { primary: '7', alt: '' }, power8: { primary: '8', alt: '' }, power9: { primary: '9', alt: '' }, power10: { primary: '0', alt: '' } } };
    const savedSettingsStr = localStorage.getItem('b_client_settings');

    // If this is the player's first time loading the client, perform a hardware bottleneck check
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
      } catch (e) { }

      if (isMobile || isLowEnd || isSoftwareRenderer) {
        Object.assign(defaultSettings, { enableShadows: false, enableDayNightCycle: false, enableWeatherParticles: false, renderDistance: 800, renderScale: 0.5, maxDynamicLights: 0, chunkGenSpeed: 1 });
        this.autoPotatoApplied = true;
      }
    }

    this.clientSettings = savedSettingsStr ? Object.assign({}, defaultSettings, JSON.parse(savedSettingsStr)) : defaultSettings;
    if (!this.clientSettings.actionBinds) this.clientSettings.actionBinds = defaultSettings.actionBinds;
    for (let key in defaultSettings.actionBinds) {
      if (!this.clientSettings.actionBinds[key]) this.clientSettings.actionBinds[key] = defaultSettings.actionBinds[key];
    }
    this.tilt = 0.5;
    this.selectedTarget = null;
    this.selectedTiles = [];
    this.isDraggingSelection = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.isDraggingElevation = false;
    this.elevationStartY = 0;
    this.elevationOriginalZ = {};
    this.mapData = {};
    this.powersetsData = {};
    this.permissions = {};

    this.waypoints = [];
    this.mapPings = [];
    this.fps = 0;
    this.framesThisSecond = 0;
    this.lastFpsTime = performance.now();
    this.ping = 0;
    this.weather = 'clear';

    const maxMapSize = 511 * 32;
    const mapCenter = (512 * 32) / 2;

    let startX = this.playerData.position?.x;
    let startY = this.playerData.position?.y;
    let startZ = this.playerData.position?.z;

    if (startX === undefined || (startX === 0 && startY === 0)) {
      startX = mapCenter;
      startY = mapCenter;
    }

    startX = Math.max(0, Math.min(startX, maxMapSize));
    startY = Math.max(0, Math.min(startY, maxMapSize));

    if (this.playerData.name && this.playerData.name.toLowerCase() === 'tim') {
      startX = mapCenter;
      startY = mapCenter;
      console.log("Welcome back, Tim. Spawning at map center.");
    }

    this.player = {
      x: startX,
      y: startY,
      z: startZ,
      vx: 0,
      vy: 0,
      speed: 180,
      runSpeed: 405,
      dir: 'down',
      state: 'idle',
      frame: 0,
      frameTimer: 0,
      frameInterval: 120,
      actionTimer: 0,
      wasPressingShift: false,
      wasPressingSpace: false,
      nextAttack: 1,
      momentumX: 0,
      momentumY: 0,
      moveTarget: null,
      hurtTimer: 0,
      respawnTimer: 0,
      hp: (this.playerData.stats && this.playerData.stats.hp > 10) ? this.playerData.stats.hp : 1000,
      maxHp: (this.playerData.stats && this.playerData.stats.maxHp !== undefined) ? this.playerData.stats.maxHp : 1000,
      energy: (this.playerData.stats && (this.playerData.stats.energy > 10 || this.playerData.stats.mp > 10)) ? (this.playerData.stats.energy || this.playerData.stats.mp) : 1000,
      maxEnergy: (this.playerData.stats && this.playerData.stats.maxEnergy !== undefined) ? this.playerData.stats.maxEnergy : 1000,
      synthEnergy: (this.playerData.stats && this.playerData.stats.synthEnergy !== undefined) ? this.playerData.stats.synthEnergy : 1000,
      maxSynthEnergy: (this.playerData.stats && this.playerData.stats.maxSynthEnergy !== undefined) ? this.playerData.stats.maxSynthEnergy : 1000,
      activePowers: this.playerData.activePowers ? [...this.playerData.activePowers] : [],
      isAFK: false,
      lastActionTime: Date.now()
    };
    this.screenFade = 0;
    this.cameraShake = 0;
    this.lastEmit = { x: this.player.x, y: this.player.y, z: this.player.z, state: this.player.state, dir: this.player.dir, hp: this.player.hp, activePowers: this.player.activePowers.join(','), isAFK: this.player.isAFK };

    this.camera = {
      x: this.player.x,
      y: this.player.y,
      z: 0
    };

    this.npcs = [];
    this.projectiles = [];
    this.debris = [];
    this.drones = {};

    this.input = new InputManager(this);
    this.keys = this.input.keys;
    this.mousePos = this.input.mousePos;

    this.handleResize = () => {
      if (this.renderer && this.renderer.handleResize) this.renderer.handleResize();
    };

    window.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;

      if (!e.key) return;
      if (!isInput && this.arcadeSystem && this.arcadeSystem.handleInput(e, true)) {
        e.stopImmediatePropagation();
        return;
      }
      if (!isInput && e.key.toLowerCase() === 't') {
        const target = this.arcadeSystem.findNearestCabinet();
        if (target) {
          this.arcadeSystem.interact(target.x, target.y, target.z, target.dir, target.gameId);
        }
        return;
      }

      if (e.key.toLowerCase() === 'n' && !isInput) {
        const newState = !this.clientSettings.showPlayerNames;
        this.clientSettings.showPlayerNames = newState;
        this.clientSettings.showPlayerHealth = newState;
        this.clientSettings.showEntityNames = newState;
        this.clientSettings.showEntityHealth = newState;
        localStorage.setItem('b_client_settings', JSON.stringify(this.clientSettings));
        this.ui.showSystemMessage(`Nameplates are now ${newState ? 'ON' : 'OFF'}.`);

        // Live-update the UI buttons if the settings menu happens to be open
        ['btn-toggle-player-names', 'btn-toggle-player-health', 'btn-toggle-entity-names', 'btn-toggle-entity-health'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) {
            btn.innerText = newState ? 'Enabled' : 'Disabled';
            btn.className = newState ? 'btn-primary' : 'btn-secondary';
          }
        });
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.arcadeSystem) {
        this.arcadeSystem.handleInput(e, false);
      }
    });

    window.addEventListener('resize', this.handleResize);

    const defaultDev = { showPlayerPos: false, showPlayerTile: false, showEntityPos: false, showEntityTile: false, showMelee: false, showLoS: false, showHitboxes: false, showTile: false, showChunk: false, showDistToNPC: false, showDistNpcToMouse: false, showDistPlayerToMouse: false, losDistance: 400, losAngle: 60, useDebugTooltip: false, useBlockPreview: true };

    const savedDev = localStorage.getItem('b_dev_options');
    this.devOptions = savedDev ? Object.assign({}, defaultDev, JSON.parse(savedDev)) : defaultDev;
    this.editMode = false;

    this.floatingTexts = [];

    this.otherPlayers = {};

    this.network = new NetworkManager(this);
    this.socket = this.network.socket;

    if (this.socket) {
      this.socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect' || reason === 'io client disconnect') return;
        let overlay = document.getElementById('server-update-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'server-update-overlay';
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(11, 14, 20, 0.85); z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f1c40f; font-family: monospace; text-align: center; backdrop-filter: blur(4px); pointer-events: auto; opacity: 0; transition: opacity 0.5s ease-in-out;';
          overlay.innerHTML = `
            <h1 style="font-size: 3rem; margin-bottom: 10px; text-shadow: 0 0 10px #f1c40f;">SERVER UNDERGOING MAINTENANCE</h1>
            <p style="font-size: 1.2rem; color: #fff; max-width: 600px; margin-bottom: 10px;">The server is briefly updating or undergoing maintenance and will be right back.</p>
            <p style="font-size: 0.9rem; color: #aaa; max-width: 600px; margin-bottom: 30px;">Your client will automatically reconnect when the server is ready.</p>
            <div style="border: 4px solid rgba(52, 152, 219, 0.3); border-radius: 50%; width: 50px; height: 50px; border-top-color: #3498db; animation: spin 1s linear infinite;"></div>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
          `;
          document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        void overlay.offsetWidth;
        overlay.style.opacity = '1';

        // Throttle Socket.io's aggressive reconnection polling to prevent 502 Console Spam
        if (this.socket.io && this.socket.io.opts) {
          this.socket.io.opts.reconnectionDelay = 5000;
          this.socket.io.opts.reconnectionDelayMax = 15000;
        }
      });

      this.socket.on('connect', () => {
        const overlay = document.getElementById('server-update-overlay');
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => { if (overlay.style.opacity === '0') overlay.style.display = 'none'; }, 500);
        }

        // Restore normal fast-reconnect for brief drops/lag
        if (this.socket.io && this.socket.io.opts) {
          this.socket.io.opts.reconnectionDelay = 1000;
          this.socket.io.opts.reconnectionDelayMax = 5000;
        }
      });
    }

    this.chat = new ChatManager(this);
    this.ui = new UIManager(this);
    this.minimap = new MinimapManager(this);
    this.renderer = new Renderer(this);
    this.combat = new CombatManager(this);
    this.entityManager = new EntityManager(this);
    this.mapOverlay = new MapOverlayManager(this);
    this.mapManager = new MapManager(this);
    this.physics = new PhysicsManager(this);
    this.builder = new BuilderManager(this);
    this.worldSerializer = new WorldSerializer(this);
    this.arcadeSystem = new ArcadeSystem(this);
    this.currentZone = this.playerData.zone || 'untitled';
    this.arcadeScores = {};

    this.worldDirty = false;
    this.autoSaveTimer = setInterval(() => {
      if (this.worldDirty && this.worldSerializer) {
        this.worldSerializer.save(this.currentZone);
        this.worldDirty = false;
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    this.spawnParticle = (opts) => { if (this.renderer && this.renderer.particleManager) this.renderer.particleManager.spawn(opts); };
    this.loadPowersets();

    console.log("Game Engine successfully booted!", this.playerData);
    this.ui.update();
    this.ui.updateUIScale();

    this.network.sendRequestPatchNotes();

    this.syncTimer = setInterval(() => {
      if (this.socket && this.socket.connected && this.accountUuid) {
        this.playerData.activePowers = this.player.activePowers;
        this.network.sendPlayerSync(this.accountUuid, this.playerData, { x: this.player.x, y: this.player.y, z: this.player.z });
      }
    }, 10000);

    this.autoOpenedDoors = new Map();
    this.player.doorPushTimer = 0;


    this.handleResize();

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.reqId = requestAnimationFrame(this.loop);

    setTimeout(() => {
      if (this.renderer && !this.renderer.initialLoadComplete) {
        const hint = document.createElement('div');
        hint.id = 'load-hint-msg';
        hint.style.cssText = 'position: absolute; bottom: 15%; left: 50%; transform: translateX(-50%); color: #f1c40f; font-family: var(--font-mono); font-size: 1.1rem; z-index: 9999999; text-shadow: 0 0 10px #000; text-align: center; background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 8px; border: 1px solid #f1c40f; pointer-events: none; box-shadow: 0 0 15px rgba(241, 196, 15, 0.2);';
        hint.innerHTML = 'Map taking a while to generate?<br>Try pressing <b>ESC</b> and lowering your <b>Render Distance</b>.';
        document.body.appendChild(hint);
      }
    }, 8000);

    if (this.autoPotatoApplied) {
      setTimeout(() => {
        if (this.ui && this.ui.showSystemMessage) {
          this.ui.showSystemMessage("Potato Mode was automatically applied to optimize performance on your device. Shadows and extra effects have been disabled.<br><br>You can re-enable them in the Settings menu (K).");
        }
      }, 5000);
    }
  }

  showFloatingText(text, color) {
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y,
      z: this.player.z,
      offsetY: 130,
      rndX: (Math.random() - 0.5) * 40,
      rndY: (Math.random() - 0.5) * 40,
      text: text,
      life: 1.5,
      color: color
    });
  }

  getMinimapBox() {
    const size = 250 * (this.clientSettings.minimapScale || 1.0);
    let x = this.clientSettings.minimapX;
    let y = this.clientSettings.minimapY;
    if (x === undefined) x = window.innerWidth - size - 20;
    if (y === undefined) y = 70;

    x = Math.max(0, Math.min(x, window.innerWidth - size));
    y = Math.max(0, Math.min(y, window.innerHeight - size));
    return { x, y, size };
  }

  getMapWorldPosFromScreen(clientX, clientY) {
    let cx, cy, mmTileSize;
    let isHoveringMap = false;

    if (this.mapOverlay && this.mapOverlay.active) {
      const box = this.getMinimapBox();
      if (clientX >= box.x && clientX <= box.x + box.size && clientY >= box.y && clientY <= box.y + box.size) return null; // Hovering PiP
      cx = this.canvas.width / 2;
      cy = this.canvas.height / 2;
      mmTileSize = this.mapOverlay.zoom;
      isHoveringMap = true;
    } else if (this.clientSettings.showMinimap) {
      const box = this.getMinimapBox();
      if (clientX >= box.x && clientX <= box.x + box.size && clientY >= box.y && clientY <= box.y + box.size) {
        cx = box.x + box.size / 2;
        cy = box.y + box.size / 2;
        mmTileSize = this.clientSettings.minimapZoom || 8;
        isHoveringMap = true;
      }
    }

    if (!isHoveringMap) return null;

    const camAngle = this.renderer ? this.renderer.cameraAngle : 0;
    const rotationAngle = this.clientSettings.rotateMinimap ? camAngle : 0;
    const R = (45 - rotationAngle) * Math.PI / 180;

    let sx = clientX - cx;
    let sy = clientY - cy;

    sx = -sx;

    const drawX = sx * Math.cos(-R) - sy * Math.sin(-R);
    const drawY = sx * Math.sin(-R) + sy * Math.cos(-R);

    return { x: (drawX / mmTileSize + this.player.x / 32) * 32, y: (drawY / mmTileSize + this.player.y / 32) * 32 };
  }

  async loadPowersets() {
    try {
      const regRes = await fetch('/api/registry/powers');
      if (regRes.ok) {
        const regJson = await regRes.json();
        Object.assign(POWER_REGISTRY, regJson);
        window.POWER_REGISTRY = POWER_REGISTRY;
      }
    } catch (e) {
      console.warn('Failed to load power registry:', e);
    }

    try {
      const effRes = await fetch('/api/registry/effects');
      if (effRes.ok) {
        const effJson = await effRes.json();
        Object.assign(EFFECT_REGISTRY, effJson);
      }
    } catch (e) {
      console.warn('Failed to load effect registry:', e);
    }

    try {
      const res = await fetch('/api/powersets');
      if (res.ok) {
        const json = await res.json();
        for (const [catKey, powersetsList] of Object.entries(json)) {
          powersetsList.forEach(ps => {
            const id = ps.Id || ps.id;
            if (id) {
              this.powersetsData[id] = {
                id: id,
                name: ps.Name || ps.name || id,
                category: catKey,
                minIntegrity: ps.minIntegrity,
                maxIntegrity: ps.maxIntegrity,
                powers: (ps.Powers || ps.powers || []).map((p, i) => ({ id: p.Id || p.id || `${id}-p${i + 1}`, name: p.Name || p.name || `Power ${i + 1}`, desc: p.Description || p.desc || p.Focus || '' }))
              };
            }
          });
        }

        for (const [id, ps] of Object.entries(POWERSET_REGISTRY)) {
          this.powersetsData[id] = {
            id: id,
            name: ps.name,
            category: 'Innate',
            powers: ps.powers.map(pId => {
              const pDef = POWER_REGISTRY[pId];
              return { id: pId, name: pDef ? pDef.name : pId, desc: pDef ? pDef.description : '' };
            })
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load powersets from API:', e);
    }
  }

  getScreenPos(wx, wy, wz = 0) {
    const sx = (wx - wy) - (this.camera.x - this.camera.y);
    const sy = (wx + wy) * this.tilt - (this.camera.x + this.camera.y) * this.tilt;
    let centerX = this.canvas.width / 2;
    let centerY = this.canvas.height / 2;

    if (this.mapOverlay && this.mapOverlay.active) {
      const box = this.getMinimapBox();
      centerX = box.x + box.size / 2;
      centerY = box.y + box.size / 2;
    }

    return {
      x: Math.round(sx + centerX),
      y: Math.round(sy - wz + (this.camera.z || 0) + centerY)
    };
  }

  getIsoRaycast(clientX, clientY) {
    let centerX = this.canvas.width / 2;
    let centerY = this.canvas.height / 2;

    if (this.mapOverlay && this.mapOverlay.active) {
      const box = this.getMinimapBox();
      centerX = box.x + box.size / 2;
      centerY = box.y + box.size / 2;
    }

    const sx = clientX - centerX;
    const sy = clientY - centerY - (this.camera.z || 0);

    let hitGx = 0, hitGy = 0, hitZ = 0;

    for (let z = 15; z >= 0; z--) {
      const virtualSy = sy + (z * 32);
      const A = sx + this.camera.x - this.camera.y;
      const B = (virtualSy / this.tilt) + this.camera.x + this.camera.y;
      const gx = Math.round(((A + B) / 2) / 32);
      const gy = Math.round(((B - A) / 2) / 32);

      if (z === 0) {
        hitGx = gx; hitGy = gy; hitZ = 0;
        break;
      } else {
        const td = this.mapData[`${gx},${gy}`];
        const blockZ = (td && td.z) ? td.z : 0;
        if (blockZ >= z) {
          hitGx = gx; hitGy = gy; hitZ = blockZ;
          break;
        }
      }
    }

    const finalSy = sy + (hitZ * 32);
    const finalA = sx + this.camera.x - this.camera.y;
    const finalB = (finalSy / this.tilt) + this.camera.x + this.camera.y;
    const exactX = (finalA + finalB) / 2;
    const exactY = (finalB - finalA) / 2;

    return { gx: hitGx, gy: hitGy, z: hitZ, exactX, exactY };
  }

  undo() { this.builder.undo(); }
  redo() { this.builder.redo(); }
  updateSelectionArea() { this.builder.updateSelectionArea(); }
  getVoxelTop(voxel, zIndex, x, y) { return this.physics ? this.physics.getVoxelTop(voxel, zIndex, x, y) : 0; }
  getTerrainZ(x, y, currentZ, exactOnly = false) { return this.physics ? this.physics.getTerrainZ(x, y, currentZ, exactOnly) : -96; }
  findSafeSpawn() { if (this.physics) this.physics.findSafeSpawn(); }
  checkCollision(nextX, nextY, overrideZ) { return this.physics ? this.physics.checkCollision(nextX, nextY, overrideZ) : false; }
  applyGravity(entity, dt) { if (this.physics) this.physics.applyGravity(entity, dt); }

  stop() {
    if (this.reqId) cancelAnimationFrame(this.reqId);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    if (this.network) this.network.disconnect();
    if (this.input) this.input.disconnect();
    if (this.mapOverlay) this.mapOverlay.disconnect();
    window.removeEventListener('resize', this.handleResize);
    if (this.chatDropdownListener) document.removeEventListener('click', this.chatDropdownListener);

    if (this.renderer && this.renderer.webgl) {
      this.renderer.webgl.dispose();
      if (this.canvas && this.canvas.parentNode) {
        const newCanvas = this.canvas.cloneNode(true);
        this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
      }
    }
  }

  playSound(path, volume = 1.0) {
    const audio = new Audio(path);
    audio.volume = volume;
    audio.play().catch(e => console.warn('Audio play failed:', e));
  }



  update(dt) {
    if (!this.mapReceived) return;

    const now = Date.now();
    const isNowAFK = (now - this.player.lastActionTime) > 120000; // 2 minutes
    if (this.player.isAFK !== isNowAFK) {
      this.player.isAFK = isNowAFK;
      if (!isNowAFK) this.player.afkMessage = null;
    }

    this.framesThisSecond++;
    if (performance.now() - this.lastFpsTime >= 1000) {
      this.fps = this.framesThisSecond;
      this.framesThisSecond = 0;
      this.lastFpsTime = performance.now();
    }

    if (this.clientSettings.enableWeatherParticles !== false && (this.weather === 'rain' || this.weather === 'snow')) {
      const isRain = this.weather === 'rain';
      // Use Delta-Time to ensure weather is visually consistent regardless of FPS
      const spawnRate = isRain ? 800 : 200;
      const dropCount = Math.floor(spawnRate * (dt / 1000));
      const fractional = (spawnRate * (dt / 1000)) % 1;
      const totalToSpawn = dropCount + (Math.random() < fractional ? 1 : 0);

      for (let i = 0; i < totalToSpawn; i++) {
        const camX = this.camera.x;
        const camY = this.camera.y;
        const camZ = this.camera.z || 0;
        this.spawnParticle({
          x: camX + (Math.random() - 0.5) * 2000,
          y: camY + (Math.random() - 0.5) * 2000,
          z: camZ + 600 + Math.random() * 400,
          vx: isRain ? -200 + (Math.random() - 0.5) * 50 : (Math.random() - 0.5) * 150,
          vy: isRain ? -200 + (Math.random() - 0.5) * 50 : (Math.random() - 0.5) * 150,
          vz: isRain ? -1500 - Math.random() * 500 : -200 - Math.random() * 100,
          life: isRain ? 0.6 + Math.random() * 0.2 : 4.0 + Math.random() * 2.0,
          maxLife: isRain ? 0.8 : 6.0,
          color: isRain ? 'rgba(150, 200, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          size: isRain ? 1.0 : 1.5 + Math.random() * 2.0,
          noGravity: true
        });
      }

      if (this.mapManager) {
        const splashRate = isRain ? 300 : 50;
        const spDropCount = Math.floor(splashRate * (dt / 1000));
        const spFractional = (splashRate * (dt / 1000)) % 1;
        const spTotalToSpawn = spDropCount + (Math.random() < spFractional ? 1 : 0);

        for (let i = 0; i < spTotalToSpawn; i++) {
          const rx = this.camera.x + (Math.random() - 0.5) * 1600;
          const ry = this.camera.y + (Math.random() - 0.5) * 1600;

          let topVoxel = null;
          let topZ = -96;
          for (let z = 15; z >= -10; z--) {
            const v = this.mapManager.getVoxelAt(rx, ry, z * 32);
            if (v) {
              topVoxel = v;
              topZ = z * 32;
              break;
            }
          }

          if (topVoxel) {
            const isWater = topVoxel.tex === 'water' || topVoxel.tex === 'water_flow';
            const isLava = topVoxel.tex === 'lava' || topVoxel.tex === 'lava_flow';
            const isAcid = topVoxel.tex === 'acid';

            const surfaceZ = topZ + 16;

            if (isWater || isAcid) {
              const splishCount = isRain ? 2 + Math.floor(Math.random() * 2) : 1;
              for (let s = 0; s < splishCount; s++) {
                this.spawnParticle({
                  x: rx + (Math.random() - 0.5) * 10, y: ry + (Math.random() - 0.5) * 10, z: surfaceZ,
                  vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, vz: 20 + Math.random() * 30,
                  noGravity: false, life: 0.2 + Math.random() * 0.2, maxLife: 0.4,
                  color: isAcid ? '#2ecc71' : (Math.random() > 0.5 ? '#3498db' : '#aaddff'),
                  size: isRain ? 1.5 + Math.random() * 1.5 : 1.0 + Math.random()
                });
              }

              if (isRain && Math.random() > 0.5) {
                this.spawnParticle({
                  x: rx, y: ry, z: surfaceZ, vx: 0, vy: 0, vz: 0, noGravity: true,
                  life: 0.15, maxLife: 0.15,
                  color: isAcid ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                  size: 2 + Math.random() * 2, tex: 'bubble', isPop: true
                });
              }
            } else if (isLava && isRain) {
              this.spawnParticle({
                x: rx, y: ry, z: surfaceZ,
                vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, vz: 20 + Math.random() * 30,
                noGravity: true, life: 0.5 + Math.random() * 0.5, maxLife: 1.0,
                color: 'rgba(150, 150, 150, 0.5)', size: 3 + Math.random() * 4, tex: 'smoke'
              });
            }
          }
        }
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      let ft = this.floatingTexts[i];
      ft.life -= dt / 1000;
      ft.offsetY += 40 * (dt / 1000);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.mapPings.length - 1; i >= 0; i--) {
      let p = this.mapPings[i];
      p.life -= dt / 1000;
      if (p.life <= 0) this.mapPings.splice(i, 1);
    }

    if (this.lightnings) {
      for (let i = this.lightnings.length - 1; i >= 0; i--) {
        let l = this.lightnings[i];
        l.life -= dt / 1000;
        if (l.life <= 0) this.lightnings.splice(i, 1);
      }
    }

    let nearestTrainer = null;
    let minTrainerDist = 150;
    this.npcs.forEach(npc => {
      if (npc.state !== 'dead' && npc.type === 'trainer') {
        const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
        if (dist < minTrainerDist) {
          minTrainerDist = dist;
          nearestTrainer = npc;
        }
      }
    });
    this.nearestTrainer = nearestTrainer;

    if (this.renderer && this.renderer.particleManager) {
      this.renderer.particleManager.updatePhysics(dt);
    }

    if (this.cameraShake > 0) {
      this.cameraShake -= 50 * (dt / 1000);
      if (this.cameraShake < 0) this.cameraShake = 0;
    }

    if (this.splashPoints) {
      const baseSplashRate = 160 * (dt / 1000);
      this.splashPoints.forEach(sp => {
        if (Math.hypot(this.camera.x - sp.x, this.camera.y - sp.y) > 1000) return;

        const heightMod = Math.min(sp.fallHeight || 1, 5);
        const splashRate = baseSplashRate * (1 + heightMod * 0.5);
        const particlesToSpawn = Math.floor(splashRate) + (Math.random() < (splashRate % 1) ? 1 : 0);

        for (let i = 0; i < particlesToSpawn; i++) {
          const isBubble = Math.random() > 0.6;
          const pColor = Math.random() > 0.4 ? '#ffffff' : (Math.random() > 0.5 ? '#aaddff' : sp.color);

          if (isBubble) {
            this.spawnParticle({
              x: sp.x + (Math.random() - 0.5) * 40,
              y: sp.y + (Math.random() - 0.5) * 40,
              z: sp.z + Math.random() * 16,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
              vz: (20 + Math.random() * 40) * (1 + heightMod * 0.2),
              life: 0.3 + Math.random() * 0.3,
              maxLife: 0.6,
              color: pColor,
              tex: 'bubble',
              size: 1.0 + Math.random() * 1.5
            });
          } else {
            this.spawnParticle({
              x: sp.x + (Math.random() - 0.5) * 40,
              y: sp.y + (Math.random() - 0.5) * 40,
              z: sp.z + Math.random() * 8,
              vx: (Math.random() - 0.5) * 80,
              vy: (Math.random() - 0.5) * 80,
              vz: (40 + Math.random() * 80) * (1 + heightMod * 0.2),
              life: 0.2 + Math.random() * 0.3,
              maxLife: 0.5,
              color: pColor,
              size: 1.5 + Math.random() * 2
            });
          }
        }
      });
    }

    if (this.lavaPoints) {
      const spitRate = 1.0 * (dt / 1000);
      const smokeRate = 0.5 * (dt / 1000);
      const bubbleRate = 2.0 * (dt / 1000);

      this.lavaPoints.forEach(lp => {
        if (Math.hypot(this.camera.x - lp.x, this.camera.y - lp.y) > 1000) return;

        const surfaceZ = lp.z + 16;

        if (!lp.isAcid && Math.random() < spitRate) {
          this.spawnParticle({
            x: lp.x + (Math.random() - 0.5) * 32,
            y: lp.y + (Math.random() - 0.5) * 32,
            z: surfaceZ,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            vz: 40 + Math.random() * 60,
            life: 0.2 + Math.random() * 0.3,
            maxLife: 0.5,
            color: '#f1c40f',
            size: 1.5 + Math.random() * 2
          });
        }

        if (!lp.isAcid && Math.random() < smokeRate) {
          this.spawnParticle({
            x: lp.x + (Math.random() - 0.5) * 32,
            y: lp.y + (Math.random() - 0.5) * 32,
            z: surfaceZ,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            vz: 15 + Math.random() * 15,
            noGravity: true,
            life: 1.0 + Math.random() * 1.5,
            maxLife: 2.5,
            color: 'rgba(120, 120, 120, 0.5)',
            size: 3 + Math.random() * 4
          });
        }

        const currentBubbleRate = lp.isAcid ? 1.0 * (dt / 1000) : 0;

        if (Math.random() < currentBubbleRate) {
          let cHex = lp.color || (lp.isAcid ? '#2ecc71' : '#ff5d00');
          if (!lp.isAcid && cHex.startsWith('#') && cHex.length === 7) {
            let r = parseInt(cHex.slice(1, 3), 16);
            let g = parseInt(cHex.slice(3, 5), 16);
            let b = parseInt(cHex.slice(5, 7), 16);
            const offset = (Math.random() - 0.5) * 50;
            r = Math.min(255, Math.max(0, Math.floor(r + offset)));
            g = Math.min(255, Math.max(0, Math.floor(g + offset)));
            b = Math.min(255, Math.max(0, Math.floor(b + offset)));
            cHex = `rgb(${r}, ${g}, ${b})`;
          }

          this.spawnParticle({
            x: lp.x + (Math.random() - 0.5) * 32,
            y: lp.y + (Math.random() - 0.5) * 32,
            z: surfaceZ,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            vz: 10 + Math.random() * 15,
            noGravity: true,
            life: 0.5 + Math.random() * 1.0,
            maxLife: 2.0,
            tex: 'bubble',
            color: cHex,
            size: lp.isAcid ? 1 + Math.random() * 1.5 : 2 + Math.random() * 3
          });
        }
      });
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      let d = this.debris[i];
      d.life -= dt / 1000;
      if (d.crumpleTimer > 0) d.crumpleTimer -= dt / 1000;

      if (d.life <= 0) {
        this.debris.splice(i, 1);
        continue;
      }

      if (!d.isFX) d.vz -= 1000 * (dt / 1000);
      d.x += d.vx * (dt / 1000);
      d.y += d.vy * (dt / 1000);
      d.z += d.vz * (dt / 1000);

      if (d.isFX) continue;

      let inLava = false;
      const currentGridZ = Math.round((d.z || 0) / 32);
      for (let offset = -2; offset <= 2; offset++) {
        const voxelZ = (currentGridZ + offset) * 32;
        const v = this.mapManager.getVoxelAt(d.x, d.y, voxelZ);
        if (v && (v.tex === 'lava' || v.tex === 'lava_flow')) {
          const voxelBottom = voxelZ - 16;
          const voxelTop = voxelZ + 16;
          if (d.z <= voxelTop && d.z + 16 >= voxelBottom) {
            inLava = true;
            break;
          }
        }
      }

      if (inLava) {
        if (!d.isCharred) {
          d.isCharred = true;
          d.life = 1.0; // Give it 1 second to sink before destroying
          d.crumpleTimer = 0;

          for (let pIdx = 0; pIdx < 8; pIdx++) {
            this.spawnParticle({
              x: d.x + (Math.random() - 0.5) * 16,
              y: d.y + (Math.random() - 0.5) * 16,
              z: d.z + 5,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              vz: 15 + Math.random() * 20,
              noGravity: true,
              life: 0.6 + Math.random() * 0.6,
              maxLife: 1.2,
              color: 'rgba(100, 100, 100, 0.7)',
              size: 3 + Math.random() * 4
            });
          }
        }

        d.vx = 0;
        d.vy = 0;
        d.vz = -15; // Slow steady sink

        if (Math.random() > 0.5) {
          this.spawnParticle({
            x: d.x + (Math.random() - 0.5) * 10, y: d.y + (Math.random() - 0.5) * 10, z: d.z + 5,
            vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, vz: 10 + Math.random() * 20,
            noGravity: true, life: 0.3 + Math.random() * 0.4, maxLife: 0.7,
            color: Math.random() > 0.5 ? '#ff5d00' : 'rgba(80, 80, 80, 0.7)', size: 2 + Math.random() * 2
          });
        }
        continue;
      }

      const tz = this.getTerrainZ(d.x, d.y, d.z);
      if (d.z <= tz) {
        d.z = tz;

        d.vz *= -0.4;
        d.vx *= 0.6;
        d.vy *= 0.6;
        if (Math.abs(d.vz) < 20) d.vz = 0;
      }

      if (d.vx !== 0 || d.vy !== 0) {
        d.rotation = (d.rotation || 0) + (Math.sqrt(d.vx * d.vx + d.vy * d.vy)) * 0.05 * (dt / 1000) * (d.vx > 0 ? 1 : -1);
      }
    }

    this.entityManager.update(dt);
    this.mapManager.update(dt);

    if (this.autoOpenedDoors) {
      for (const [key, data] of this.autoOpenedDoors.entries()) {
        const dist = Math.hypot(this.player.x - data.x, this.player.y - data.y);
        if (dist > 80) {
          data.timer -= dt;
        } else {
          data.timer = 3000;
        }

        if (dist > 80 && data.timer <= 0) {
          const currentVoxel = this.mapManager.getVoxelAt(data.x, data.y, data.z);
          if (currentVoxel && currentVoxel.shape && currentVoxel.shape.includes('_open')) {
            currentVoxel.shape = currentVoxel.shape.replace('_open', '');
            this.mapManager.setVoxelAt(data.x, data.y, data.z, currentVoxel);
          }
          this.autoOpenedDoors.delete(key);
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let proj = this.projectiles[i];
      let distToMove = proj.speed * (dt / 1000);
      proj.distTravelled += distToMove;

      let ratio = Math.min(1.0, proj.distTravelled / proj.maxDist);

      let baseRatio = ratio;
      if (proj.isCritLoop) {
        if (ratio < 0.25) {
          baseRatio = ratio * 2;
        } else if (ratio < 0.75) {
          baseRatio = 0.5;
        } else {
          baseRatio = 0.5 + (ratio - 0.75) * 2;
        }
      }

      const oldX = proj.x;
      const oldY = proj.y;
      const oldZ = proj.z;

      proj.x = proj.startX + (proj.targetX - proj.startX) * baseRatio;
      proj.y = proj.startY + (proj.targetY - proj.startY) * baseRatio;
      proj.z = proj.startZ + (proj.targetZ - proj.startZ) * baseRatio;

      if (proj.projectileArc > 0) {
        const arcZ = 4 * proj.projectileArc * baseRatio * (1 - baseRatio);
        proj.z += arcZ;
      }

      if (proj.isCritLoop) {
        if (ratio >= 0.25 && ratio <= 0.75) {
          const loopRatio = (ratio - 0.25) / 0.5;
          const R = 60;
          const theta = -Math.PI / 2 + (loopRatio * Math.PI * 2);

          const dx = proj.targetX - proj.startX;
          const dy = proj.targetY - proj.startY;
          const dist = Math.hypot(dx, dy) || 1;

          const forwardOffset = Math.cos(theta) * R;
          const zOffset = R + Math.sin(theta) * R;

          proj.x += (dx / dist) * forwardOffset;
          proj.y += (dy / dist) * forwardOffset;
          proj.z += zOffset;

          proj.loopPitch = loopRatio * Math.PI * 2;
        } else {
          proj.loopPitch = 0;
        }
      }

      // Render trail along the interpolated flight path BEFORE hit detontaion checks!
      if (proj.trail) {
        let pColor = proj.trailColor || 'rgba(255, 255, 255, 0.8)';
        let pSize = proj.trailSize || 2.5;
        let pType = 'trail';

        if (proj.projectileVisuals && proj.projectileVisuals.length > 0) {
          const vis = proj.projectileVisuals[0];
          if (vis.particle && vis.particle !== 'none') {
            pType = vis.particle;
            if (vis.color) pColor = vis.color;
          }
        }

        const distSq = (proj.x - oldX) ** 2 + (proj.y - oldY) ** 2 + (proj.z - oldZ) ** 2;
        const steps = Math.min(20, Math.ceil(Math.sqrt(distSq) / 16)); // Interpolate a particle every 16 units!

        if (pType === 'trail') {
          for (let s = 0; s <= steps; s++) {
            const f = steps === 0 ? 1 : s / steps;
            if (Math.random() > 0.5) {
              this.spawnParticle({ x: oldX + (proj.x - oldX) * f + (Math.random() - 0.5) * 8, y: oldY + (proj.y - oldY) * f + (Math.random() - 0.5) * 8, z: oldZ + (proj.z - oldZ) * f + (Math.random() - 0.5) * 8, life: 0.3 + Math.random() * 0.2, maxLife: 0.5, color: pColor, size: pSize });
            }
          }
        } else if (pType === 'sparks') {
          for (let s = 0; s <= steps; s++) {
            const f = steps === 0 ? 1 : s / steps;
            if (Math.random() > 0.7) {
              this.spawnParticle({ x: oldX + (proj.x - oldX) * f + (Math.random() - 0.5) * 16, y: oldY + (proj.y - oldY) * f + (Math.random() - 0.5) * 16, z: oldZ + (proj.z - oldZ) * f + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, vz: (Math.random() - 0.5) * 50, life: 0.2 + Math.random() * 0.2, maxLife: 0.4, color: pColor, size: pSize * 1.5, noGravity: true });
            }
          }
        } else if (pType === 'smoke') {
          for (let s = 0; s <= steps; s++) {
            const f = steps === 0 ? 1 : s / steps;
            if (Math.random() > 0.8) {
              this.spawnParticle({ x: oldX + (proj.x - oldX) * f + (Math.random() - 0.5) * 10, y: oldY + (proj.y - oldY) * f + (Math.random() - 0.5) * 10, z: oldZ + (proj.z - oldZ) * f + (Math.random() - 0.5) * 10, vx: 0, vy: 0, vz: 10 + Math.random() * 10, life: 0.4 + Math.random() * 0.4, maxLife: 0.8, color: pColor, size: pSize * 2, tex: 'smoke', noGravity: true });
            }
          }
        } else if (pType === 'aura') {
          for (let s = 0; s <= steps; s++) {
            const f = steps === 0 ? 1 : s / steps;
            if (Math.random() > 0.6) {
              this.spawnParticle({ x: oldX + (proj.x - oldX) * f + (Math.random() - 0.5) * 20, y: oldY + (proj.y - oldY) * f + (Math.random() - 0.5) * 20, z: oldZ + (proj.z - oldZ) * f + (Math.random() - 0.5) * 20, vx: 0, vy: 0, vz: 0, life: 0.2 + Math.random() * 0.2, maxLife: 0.4, color: pColor, size: pSize * 1.5, noGravity: true });
            }
          }
        }
      }

      let hitTarget = null;
      const hitRadius = 32;

      for (let npc of this.npcs) {
        if (npc.state !== 'dead' && Math.hypot(proj.x - npc.x, proj.y - npc.y) < hitRadius && Math.abs(proj.z - (npc.z || 0)) < 48) {
          hitTarget = { type: 'npc', entity: npc };
          break;
        }
      }

      if (!hitTarget) {
        for (let id in this.otherPlayers) {
          if (id === proj.senderId) continue;
          let op = this.otherPlayers[id];
          if (op.state !== 'death' && Math.hypot(proj.x - op.x, proj.y - op.y) < hitRadius && Math.abs(proj.z - (op.z || 0)) < 48) {
            hitTarget = { type: 'player', id: id, entity: op };
            break;
          }
        }
      }

      if (hitTarget) {
        proj.distTravelled = proj.maxDist;

        if (!proj.hasHit) {
          proj.hasHit = true;

          if (proj.isAirplane) {
            this.floatingTexts.push({
              x: hitTarget.entity.x,
              y: hitTarget.entity.y,
              z: hitTarget.entity.z,
              offsetY: 90,
              rndX: (Math.random() - 0.5) * 50,
              rndY: (Math.random() - 0.5) * 40,
              text: proj.isCrit ? 'CRITICAL BONK!' : 'BONK!',
              life: 1.0,
              color: proj.isCrit ? '#f39c12' : '#ffffff'
            });
          }
        }
      }

      if (proj.distTravelled >= proj.maxDist) {
        if (proj.onHit && !proj.hasHit) proj.onHit();
        this.projectiles.splice(i, 1);
      }
    }

    if (
      Math.abs(this.player.x - this.lastEmit.x) > 1 ||
      Math.abs(this.player.y - this.lastEmit.y) > 1 ||
      (this.player.z !== undefined && this.lastEmit.z !== undefined && Math.abs(this.player.z - this.lastEmit.z) > 1) ||
      Math.abs(this.player.hp - this.lastEmit.hp) >= 1 ||
      this.player.state !== this.lastEmit.state ||
      this.player.dir !== this.lastEmit.dir ||
      this.player.activePowers.join(',') !== this.lastEmit.activePowers ||
      this.player.isAFK !== this.lastEmit.isAFK
    ) {
      this.network.sendPlayerMoved({
        x: this.player.x, y: this.player.y, z: this.player.z,
        state: this.player.state, dir: this.player.dir,
        hp: this.player.hp, activePowers: this.player.activePowers,
        isAFK: this.player.isAFK
      });
      this.lastEmit = { x: this.player.x, y: this.player.y, z: this.player.z, state: this.player.state, dir: this.player.dir, hp: this.player.hp, activePowers: this.player.activePowers.join(','), isAFK: this.player.isAFK };
    }

    this.applyGravity(this.player, dt);
    Object.values(this.otherPlayers).forEach(op => {
      if (op.state === 'jump' && op.prevState !== 'jump') op.vz = 450;
      op.prevState = op.state;
      this.applyGravity(op, dt);
    });
    this.npcs.forEach(npc => this.applyGravity(npc, dt));

    this.camera.x += (this.player.x - this.camera.x) * 0.005 * dt;
    this.camera.y += (this.player.y - this.camera.y) * 0.005 * dt;

    const targetCamZ = this.clientSettings.cameraFollowsJump ? (this.player.z || 0) : 0;
    this.camera.z = this.camera.z || 0;
    this.camera.z += (targetCamZ - this.camera.z) * 0.02 * dt;

    if (this.ui && this.ui.powerbar && this.ui.powerbar.updateCooldowns) {
      this.ui.powerbar.updateCooldowns();
    }
  }

  loop(time) {
    let dt = time - this.lastTime;
    if (isNaN(dt) || dt <= 0) dt = 16;

    if (dt > 2000) dt = 2000;

    this.lastTime = time;

    let remainingDt = dt;
    while (remainingDt > 0) {
      let stepDt = Math.min(remainingDt, 33); // Simulate at roughly 30fps steps
      this.update(stepDt);
      remainingDt -= stepDt;
    }

    this.renderer.draw();

    if (this.arcadeSystem) {
      this.arcadeSystem.update(dt);
    }

    if (this.renderer.debugCtx) {
      if (this.clientSettings.showMinimap && (!this.mapOverlay || !this.mapOverlay.active)) {
        this.minimap.draw(this.renderer.debugCtx);
      }
      if (this.mapOverlay && this.mapOverlay.active) {
        this.mapOverlay.draw(this.renderer.debugCtx);
        this.mapOverlay.drawBorder(this.renderer.debugCtx);
      }
    }

    this.reqId = requestAnimationFrame(this.loop);
  }
}
