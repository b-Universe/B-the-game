export class NetworkManager {
  constructor(engine) {
    this.engine = engine;
    this.socket = io(window.location.origin);

    this.setupPing();
    this.setupListeners();
  }

  setupPing() {
    const eng = this.engine;
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.pingStart = Date.now();
        this.sendPing();
      }
    }, 2000);
    this.socket.on('pong', () => { eng.ping = Date.now() - this.pingStart; });
  }

  setupListeners() {
    const eng = this.engine;

    this.socket.on('connect', () => {
      console.log(`%c[Network] Securely connected to game server! (Session ID: ${this.socket.id})`, 'color: #2ecc71; font-weight: bold; font-size: 1.1em;');

      const sysDialog = document.getElementById('system-message-dialog');
      const sysMsgText = document.getElementById('sys-msg-text');
      if (sysDialog && sysDialog.style.display !== 'none' && sysMsgText && sysMsgText.innerText.includes('Lost connection')) {
        sysDialog.style.display = 'none';
      }

      this.sendRequestFullMap();
      if (eng.ui && eng.ui.showReconnecting) eng.ui.showReconnecting(false);

      const powerbar = document.getElementById('powerbar-container');
      if (powerbar && powerbar.style.display === 'none') powerbar.style.display = 'flex';

      if (eng.playerData && eng.accountUuid) {
        this.sendJoinGame({
          name: eng.playerData.name,
          x: eng.player.x,
          y: eng.player.y,
          z: eng.player.z,
          offsetY: 130,
          hp: eng.player.hp,
          maxHp: eng.player.maxHp,
          state: eng.player.state,
          dir: eng.player.dir,
          level: eng.playerData.level || 1,
          alignment: eng.playerData.alignment || 'hero',
          race: eng.playerData.race || 'Human',
          integrity: eng.playerData.integrity || 0,
          activePowers: eng.player.activePowers,
          accountUuid: eng.accountUuid,
          isAFK: eng.player.isAFK,
          zone: eng.currentZone
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`%c[Network] Connection to the server was lost! Reason: ${reason}`, 'color: #ff4757; font-weight: bold; font-size: 1.1em;');

      if (reason === 'io server disconnect') {
        eng.stop();
        document.getElementById('game-screen').style.display = 'none';

        const selScreen = document.getElementById('selection-screen');
        if (selScreen) selScreen.style.display = 'none';
        const creScreen = document.getElementById('creation-screen');
        if (creScreen) creScreen.style.display = 'block';

        ['username', 'password', 'email', 'btn-main', 'no-email'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.disabled = true;
            el.style.opacity = '0.5';
            el.style.cursor = 'not-allowed';
          }
        });
        const toggleAuth = document.getElementById('toggle-auth');
        if (toggleAuth) toggleAuth.style.pointerEvents = 'none';

        const trainerModal = document.getElementById('trainer-dialog-modal');
        if (trainerModal) trainerModal.style.display = 'none';

        const powerbar = document.getElementById('powerbar-container');
        if (powerbar) powerbar.style.display = 'none';

        if (eng.ui && eng.ui.showReconnecting) eng.ui.showReconnecting(false);

        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const customModal = document.getElementById('custom-modal');
        if (modalTitle && modalBody && customModal) {
          modalTitle.innerText = 'Disconnected';
          modalBody.innerText = 'You have been disconnected from the server. Please reload the page to log back in.';
          customModal.style.display = 'flex';
        }
      } else if (reason !== 'io client disconnect') {
        if (eng.ui && eng.ui.showReconnecting) eng.ui.showReconnecting(true);
      }
    });

    this.socket.on('current_players', (players) => {
      eng.otherPlayers = {};
      for (let id in players) {
        if (id !== this.socket.id) {
          eng.otherPlayers[id] = players[id];
          eng.otherPlayers[id].serverX = players[id].x;
          eng.otherPlayers[id].serverY = players[id].y;
        }
      }
      if (eng.ui && eng.ui.playerList) eng.ui.playerList.updateList();
    });

    this.socket.on('player_joined', (player) => {
      player.serverX = player.x;
      player.serverY = player.y;
      eng.otherPlayers[player.id] = player;
      if (eng.ui && eng.ui.playerList) eng.ui.playerList.updateList();
    });

    this.socket.on('player_left', (id) => {
      if (eng.otherPlayers[id]) {
        delete eng.otherPlayers[id];
        if (eng.ui && eng.ui.playerList) eng.ui.playerList.updateList();
      }
    });

    this.socket.on('player_moved', (player) => {
      if (eng.otherPlayers[player.id]) {
        eng.otherPlayers[player.id].serverX = player.x;
        eng.otherPlayers[player.id].serverY = player.y;
        if (player.z !== undefined) eng.otherPlayers[player.id].z = player.z;
        eng.otherPlayers[player.id].state = player.state;
        eng.otherPlayers[player.id].dir = player.dir;
        if (player.hp !== undefined) eng.otherPlayers[player.id].hp = player.hp;
        if (player.level !== undefined) eng.otherPlayers[player.id].level = player.level;
        if (player.activePowers !== undefined) eng.otherPlayers[player.id].activePowers = player.activePowers;
        if (player.isAFK !== undefined) eng.otherPlayers[player.id].isAFK = player.isAFK;
        if (player.afkMessage !== undefined) eng.otherPlayers[player.id].afkMessage = player.afkMessage;
      }
    });

    this.socket.on('initial_map_data', (data) => { eng.mapData = data; });
    this.socket.on('server_permissions', (perms) => { eng.permissions = perms; });

    this.socket.on('map_update', (updates) => {
      updates.forEach(u => {
        if (u.tex === null) delete eng.mapData[`${u.x},${u.y}`];
        else eng.mapData[`${u.x},${u.y}`] = { tex: u.tex, color: u.color, z: u.z || 0 };
      });
    });

    this.socket.on('dev_load_world_broadcast', async (payload) => {
      if (eng.worldSerializer) {
        if (eng.ui && eng.ui.setupLoadingScreen) eng.ui.setupLoadingScreen();
        eng.currentZone = payload.filename;
        await eng.worldSerializer.deserialize(payload.data);
        eng.mapManager.update(16);
        this.sendPlayerTeleported();
        if (typeof eng.findSafeSpawn === 'function') eng.findSafeSpawn();
      }
    });

    this.socket.on('full_map_data_received', async (payload) => {
      if (!payload) return;
      if (payload.currentZone) eng.currentZone = payload.currentZone;

      if (eng.worldSerializer) {
        await eng.worldSerializer.deserialize(payload);
      }

      if (eng.currentZone && eng.currentZone.startsWith('apt_')) {
          const zc = eng.zonesConfig && eng.zonesConfig[eng.currentZone] ? eng.zonesConfig[eng.currentZone] : {};
          const ownedChunks = zc.ownedChunks || ['1_1'];
          const pChunkX = Math.floor((eng.player.x / 32) / 32);
          const pChunkY = Math.floor((eng.player.y / 32) / 32);
          if (!ownedChunks.includes(`${pChunkX}_${pChunkY}`)) {
              eng.player.x = 48 * 32;
              eng.player.y = 48 * 32;
              eng.player.z = 64;
              eng.camera.x = eng.player.x;
              eng.camera.y = eng.player.y;
          }
      }

      if (eng.mapManager && eng.player) {
        const pxChunk = Math.floor(eng.player.x / 512);
        const pyChunk = Math.floor(eng.player.y / 512);
        const renderRadius = eng.clientSettings.renderDistance || 2000;
        const loadRadius = Math.ceil(renderRadius / 512);

        for (let cy = pyChunk - loadRadius; cy <= pyChunk + loadRadius; cy++) {
          for (let cx = pxChunk - loadRadius; cx <= pxChunk + loadRadius; cx++) {
            if (typeof eng.mapManager.forceGenerateChunk === 'function') eng.mapManager.forceGenerateChunk(cx, cy);
          }
        }
      }

      if (typeof eng.findSafeSpawn === 'function') {
        eng.findSafeSpawn();
      }
      if (eng.mapManager) {
        eng.mapManager.mapCacheDirty = true;
      }

      eng.mapReceived = true;
      if (eng.renderer && eng.renderer.assetManager) {
        eng.renderer.assetManager.checkComplete();
      }

      if (eng.renderer) eng.renderer.checkInitialLoad();

      if (typeof eng.updateBGM === 'function') eng.updateBGM();

      setTimeout(() => {
          const pName = eng.playerData?.name?.toLowerCase();
          const isMyApartment = eng.currentZone && eng.currentZone.startsWith('apt_' + pName);

          let isAptGuestBuilder = false;
          if (eng.currentZone && eng.currentZone.startsWith('apt_') && eng.zonesConfig && eng.zonesConfig[eng.currentZone]) {
              const zc = eng.zonesConfig[eng.currentZone];
              if (zc.builders && zc.builders.includes(pName)) {
                  isAptGuestBuilder = true;
              }
          }

          if (!isMyApartment && !isAptGuestBuilder) {
              if (eng.editMode) eng.chat.commandHandler.processCommand('/editmode');
          }
      }, 500); // Give the UI components a moment to settle after load
    });

    this.socket.on('block_updated', ({ worldX, worldY, worldZ, voxelData }) => {
      if (eng.mapManager) {
        eng.mapManager.setVoxelAt(worldX, worldY, worldZ, voxelData, false);
      }
    });

    this.socket.on('blocks_updated', (payloads) => {
      if (eng.mapManager && payloads && payloads.length > 0) {
        payloads.forEach(({ worldX, worldY, worldZ, voxelData }) => {
          eng.mapManager.setVoxelAt(worldX, worldY, worldZ, voxelData, false);
        });
      }
    });

    this.socket.on('force_teleport', (data) => {
      if (data.zone && data.zone !== eng.currentZone) {
        if (eng.ui && eng.ui.setupLoadingScreen) eng.ui.setupLoadingScreen();
        eng.currentZone = data.zone;
        this.socket.emit('join_zone', { zone: data.zone });
      }

      const maxMapSize = 511 * 32;
      eng.player.x = Math.max(0, Math.min(data.x, maxMapSize));
      eng.player.y = Math.max(0, Math.min(data.y, maxMapSize));
      if (data.z !== undefined) {
        eng.player.z = data.z;
      } else {
        eng.player.z = eng.getTerrainZ(data.x, data.y);
      }
      eng.camera.x = eng.player.x;
      eng.camera.y = eng.player.y;
    });

    this.socket.on('current_npcs', (npcs) => {
      eng.npcs = npcs.map(n => ({ ...n, hurtTimer: 0, frame: 0, frameTimer: 0 }));
    });

    this.socket.on('npc_spawned', (npc) => {
      eng.npcs.push({ ...npc, hurtTimer: 0, frame: 0, frameTimer: 0 });
    });

    this.socket.on('current_spawners', (spawners) => {
      eng.spawners = spawners;
    });

    this.socket.on('current_neighborhoods', (neighborhoods) => {
      eng.neighborhoods = neighborhoods;
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.neighborhoodManagerWindow.element.style.display === 'flex') {
        eng.ui.devTools.renderNeighborhoodManager();
      }
    });

    this.socket.on('current_mob_packs', (mobPacks) => {
      eng.mobPacks = mobPacks;
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.mobPackManagerWindow.element.style.display === 'flex') {
        eng.ui.devTools.renderMobPacks();
      }
    });

    this.socket.on('current_npc_templates', (templates) => {
      eng.npcTemplates = templates;
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.npcTemplateManagerWindow && eng.ui.devTools.npcTemplateManagerWindow.element.style.display === 'flex') {
        eng.ui.devTools.renderNpcTemplates();
      }
    });

    this.socket.on('current_entity_types', (types) => {
      eng.entityTypes = types;
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.entityTypeManagerWindow && eng.ui.devTools.entityTypeManagerWindow.element.style.display === 'flex') {
        eng.ui.devTools.renderEntityTypes();
      }
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.npcTemplateManagerWindow && eng.ui.devTools.npcTemplateManagerWindow.element.style.display === 'flex') {
        eng.ui.devTools.renderNpcTemplates();
      }
    });

    this.socket.on('npcs_moved', (npcsMap) => {
      for (const id in npcsMap) {
        const incoming = npcsMap[id];
        const existing = eng.npcs.find(n => n.uuid === id);
        if (existing) {
          existing.serverX = incoming.x;
          existing.serverY = incoming.y;
          existing.state = incoming.state;
          existing.dir = incoming.dir;
          existing.serverPath = incoming.path;
          if (incoming.activeEffects) existing.activeEffects = incoming.activeEffects;
        }
      }
    });

    this.socket.on('npc_took_damage', (data) => {
      const npc = eng.npcs.find(n => n.uuid === data.targetUuid);
      if (npc) {
        npc.hp = data.hp;
        if (data.activeEffects) npc.activeEffects = data.activeEffects;
        if (data.damage > 0) {
          npc.hurtTimer = 300;
          const isCrit = data.isCrit || (!data.isDoT && ((data.damage >= 6 && data.damage <= 10) || data.damage >= 300 || data.damage === 35 || data.damage === 3));
          const color = data.isDoT ? '#e67e22' : (isCrit ? '#f39c12' : '#ff4757');
          const textStr = data.damage.toString() + (isCrit ? '!' : '');
          const life = data.isDoT ? 0.6 : 1.0;
          const offsetY = data.isDoT ? 110 : 130;
          eng.floatingTexts.push({ x: npc.x, y: npc.y, z: npc.z, offsetY: offsetY, rndX: (Math.random() - 0.5) * 50, rndY: (Math.random() - 0.5) * 40, text: textStr, life: life, color: color, isDoT: data.isDoT, isCrit: isCrit });
        } else if (data.isDeflect) {
          eng.floatingTexts.push({ x: npc.x, y: npc.y, z: npc.z, offsetY: 130, rndX: (Math.random() - 0.5) * 50, rndY: -20, text: 'DEFLECT', life: 1.0, color: '#9b59b6', isCrit: true });
        }
        if (data.isDead) { npc.state = 'dead'; npc.frame = 0; }
        if (eng.ui) eng.ui.update();
      }
    });

    this.socket.on('drone_took_damage', (data) => {
      const drone = eng.drones[data.targetUuid];
      if (drone) {
        drone.hp = data.hp;
        if (data.damage > 0) {
          drone.hurtTimer = 300;
          const isCrit = data.isCrit || (!data.isDoT && ((data.damage >= 6 && data.damage <= 10) || data.damage >= 300 || data.damage === 35 || data.damage === 3));
          const color = data.isDoT ? '#e67e22' : (isCrit ? '#f39c12' : '#ff4757');
          const textStr = data.damage.toString() + (isCrit ? '!' : '');
          const life = data.isDoT ? 0.6 : 1.0;
          const offsetY = data.isDoT ? 110 : 130;
          eng.floatingTexts.push({ x: drone.x, y: drone.y, z: drone.z, offsetY: offsetY, rndX: (Math.random() - 0.5) * 50, rndY: (Math.random() - 0.5) * 40, text: textStr, life: life, color: color, isDoT: data.isDoT, isCrit: isCrit });
        }
        if (data.isDead) { drone.state = 'dead'; drone.frame = 0; }
        if (eng.ui) eng.ui.update();
      }
    });

    this.socket.on('current_drones', (drones) => {
      eng.drones = {};
      for (const id in drones) {
        eng.drones[id] = drones[id];
      }
    });

    this.socket.on('drones_moved', (drones) => {
      for (const id in drones) {
        if (eng.drones[id]) {
          const existing = eng.drones[id];
          const incoming = drones[id];
          // Preserve client-side simulated coordinates for smooth lerping
          const tempX = existing.x;
          const tempY = existing.y;
          const tempZ = existing.z;
          Object.assign(existing, incoming);
          existing.x = tempX;
          existing.y = tempY;
          existing.z = tempZ;
        }
        else eng.drones[id] = drones[id];
      }
    });

    this.socket.on('drone_spawned', (drone) => {
      drone.deployTimer = 1.5;
      if (eng.playerData.name === drone.ownerName) {
        drone.z = (eng.player.z || 0) + 1000;
      } else {
        const op = eng.otherPlayers[drone.ownerSocketId];
        if (op) drone.z = (op.z || 0) + 1000;
      }
      eng.drones[drone.uuid] = drone;
    });

    this.socket.on('drone_despawned', (data) => {
      delete eng.drones[data.uuid];
    });

    this.socket.on('npc_respawned', (uuid) => {
      const npc = eng.npcs.find(n => n.uuid === uuid);
      if (npc) {
        npc.state = 'idle'; npc.hp = npc.maxHp; npc.frame = 0;
      }
    });

    this.socket.on('chat_message', (data) => {
      if (data.type === 'pm' && data.sender) {
        if (eng.ui && eng.ui.pmUI) eng.ui.pmUI.addMessage(data.sender, data.sender, data.text);
      }
      eng.chat.addMessage(data.type, data.name, data.text);
      for (let id in eng.otherPlayers) {
        if (eng.otherPlayers[id].name === data.name) {
          eng.otherPlayers[id].chatBubbles = eng.otherPlayers[id].chatBubbles || [];
          eng.otherPlayers[id].chatBubbles.push({ text: data.text, timer: 4000, opacity: 0 });
          break;
        }
      }
    });

    this.socket.on('player_typing', (data) => {
      if (eng.otherPlayers[data.id]) {
        eng.otherPlayers[data.id].isTyping = data.isTyping;
      }
    });

    this.socket.on('trade_request_received', (data) => {
      if (eng.ui && eng.ui.showSystemMessage) {
        eng.ui.showSystemMessage(`${data.senderName} has requested a trade. <br><br><button class="b-btn btn-primary" onclick="window.currentGameEngine.network.sendTradeAccept('${data.senderId}'); this.disabled=true; this.innerText='Accepted!';">Accept Trade</button>`);
      }
    });

    this.socket.on('trade_started', (data) => {
      if (eng.ui && eng.ui.inventory) eng.ui.inventory.openTrade(data.partnerName);
    });

    this.socket.on('player_data_updated', (newCharData) => {
      const prevStats = eng.playerData.stats || {};
      Object.assign(eng.playerData, newCharData);
      if (newCharData.stats) {
        eng.playerData.stats = { ...prevStats, ...newCharData.stats };
        if (newCharData.stats.maxHp !== undefined) eng.player.maxHp = newCharData.stats.maxHp;
        if (newCharData.stats.maxEnergy !== undefined) eng.player.maxEnergy = newCharData.stats.maxEnergy;
        if (newCharData.stats.maxSynthEnergy !== undefined) eng.player.maxSynthEnergy = newCharData.stats.maxSynthEnergy;
      }

      // Keep the local cache synchronized with the server's fresh data
      const savedAccountStr = localStorage.getItem('b_current_account');
      if (savedAccountStr) {
        try {
          const acc = JSON.parse(savedAccountStr);
          const charIdx = (acc.characters || []).findIndex(c => {
            const cName = typeof c === 'object' ? c.name : c;
            return cName && cName.trim().toLowerCase() === eng.playerData.name.trim().toLowerCase();
          });
          if (charIdx !== -1) {
            acc.characters[charIdx] = eng.playerData;
            localStorage.setItem('b_current_account', JSON.stringify(acc));
          }
        } catch (e) { }
      }

      const powersPanel = document.getElementById('powers-panel');
      if (powersPanel && powersPanel.style.display === 'flex' && eng.ui && eng.ui.powerbar) {
        eng.ui.powerbar.renderPowersUI();
      }
      const trainerModal = document.getElementById('trainer-dialog-modal');
      if (trainerModal && trainerModal.style.display === 'flex' && eng.ui && eng.ui.trainer) {
        eng.ui.trainer.openTrainerUI(eng.activeTrainer);
      }
      if (eng.ui && eng.ui.powerbar && eng.ui.powerbar.updatePowerbar) eng.ui.powerbar.updatePowerbar();
    });

    this.socket.on('player_took_damage', (data) => {
      if (data.targetId === this.socket.id) {
        eng.player.hp = data.hp; eng.lastEmit.hp = data.hp;
        if (data.damage > 0) {
          eng.player.hurtTimer = 300;
          const isCrit = data.isCrit || (!data.isDoT && ((data.damage >= 6 && data.damage <= 10) || data.damage >= 300 || data.damage === 35 || data.damage === 3));

          if (isCrit && eng.clientSettings.enableCameraShake !== false) {
            const shakeIntensity = data.damage >= 500 ? 30 : 15;
            eng.cameraShake = Math.max(eng.cameraShake, shakeIntensity);
          }

          const color = data.isDoT ? '#e67e22' : (isCrit ? '#f39c12' : '#ff4757');
          const textStr = data.damage.toString() + (isCrit ? '!' : '');
          const life = data.isDoT ? 0.6 : 1.0;
          const offsetY = data.isDoT ? 110 : 130;
          eng.floatingTexts.push({ x: eng.player.x, y: eng.player.y, z: eng.player.z, offsetY: offsetY, rndX: (Math.random() - 0.5) * 50, rndY: (Math.random() - 0.5) * 40, text: textStr, life: life, color: color, isDoT: data.isDoT, isCrit: isCrit });
          if (eng.ui) eng.ui.update();
        } else if (data.isDeflect) {
          eng.floatingTexts.push({ x: eng.player.x, y: eng.player.y, z: eng.player.z, offsetY: 130, rndX: (Math.random() - 0.5) * 50, rndY: -20, text: 'DEFLECT', life: 1.0, color: '#9b59b6', isCrit: true });
        }
        if (data.isDead) {
          eng.player.state = 'death'; eng.player.frame = 0; eng.player.respawnTimer = 10000;
        }
      } else if (eng.otherPlayers[data.targetId]) {
        const op = eng.otherPlayers[data.targetId];
        op.hp = data.hp;
        if (data.damage > 0) {
          op.hurtTimer = 300;
          const isCrit = data.isCrit || (!data.isDoT && ((data.damage >= 6 && data.damage <= 10) || data.damage >= 300 || data.damage === 35 || data.damage === 3));
          const color = data.isDoT ? '#e67e22' : (isCrit ? '#f39c12' : '#ff4757');
          const textStr = data.damage.toString() + (isCrit ? '!' : '');
          const life = data.isDoT ? 0.6 : 1.0;
          const offsetY = data.isDoT ? 110 : 130;
          eng.floatingTexts.push({ x: op.x, y: op.y, z: op.z, offsetY: offsetY, rndX: (Math.random() - 0.5) * 50, rndY: (Math.random() - 0.5) * 40, text: textStr, life: life, color: color, isDoT: data.isDoT, isCrit: isCrit });
        } else if (data.isDeflect) {
          eng.floatingTexts.push({ x: op.x, y: op.y, z: op.z, offsetY: 130, rndX: (Math.random() - 0.5) * 50, rndY: -20, text: 'DEFLECT', life: 1.0, color: '#9b59b6', isCrit: true });
        }
        if (data.isDead) { op.state = 'death'; op.frame = 0; }
        if (eng.ui) eng.ui.update();
      }
    });

    this.socket.on('spawn_projectile', (data) => {
      const startX = data.startX !== undefined ? data.startX : (data.x || 0);
      const startY = data.startY !== undefined ? data.startY : (data.y || 0);
      const startZ = data.startZ !== undefined ? data.startZ : ((eng.getTerrainZ(startX, startY) || 0) + 24);
      const targetX = data.targetX !== undefined ? data.targetX : startX;
      const targetY = data.targetY !== undefined ? data.targetY : startY;
      const targetZ = data.targetZ !== undefined ? data.targetZ : ((eng.getTerrainZ(targetX, targetY) || 0) + 10);
      const speed = data.speed || 400;

      const maxDist = Math.max(1, Math.hypot(targetX - startX, targetY - startY));

      if (data.projectileStyle === 'lightning') {
        if (!eng.lightnings) eng.lightnings = [];
        eng.lightnings.push({
          startX: startX, startY: startY, startZ: startZ,
          endX: targetX, endY: targetY, endZ: targetZ,
          duration: 0.3, life: 0.3, maxLife: 0.3
        });
      }

      let isAirplane = false;
      let isCritLoop = false;
      if (data.powerId && window.POWER_REGISTRY && window.POWER_REGISTRY[data.powerId]) {
        const pDef = window.POWER_REGISTRY[data.powerId];
        if (pDef.engineScript === 'paper-airplane') {
          isAirplane = true;
          isCritLoop = data.isCrit !== undefined ? data.isCrit : false;
        }
      }

      const damage = data.damage !== undefined ? data.damage : (isAirplane ? (data.isCrit ? 3 : 1) : 1);

      eng.projectiles.push({
        uuid: data.uuid,
        isAirplane: isAirplane,
        isCritLoop: isCritLoop,
        startX: startX, startY: startY, startZ: startZ,
        x: startX, y: startY, z: startZ,
        targetX: targetX, targetY: targetY, targetZ: targetZ,
        speed: speed,
        distTravelled: 0,
        maxDist: maxDist,
        senderId: data.senderId,
        powerId: data.powerId,
        damage: damage,
        isCrit: data.isCrit !== undefined ? data.isCrit : false,
        projectileStyle: data.projectileStyle || 'sprite',
        trail: true,
        trailColor: data.trailColor || '#f1c40f',
        trailSize: data.trailSize !== undefined ? data.trailSize : 2.5,
        projectileVisuals: data.projectileVisuals || [],
        projectileArc: data.projectileArc || 0,
        onHit: () => {
          let hasCustom = false;
          let tint = '#ffffff';
          if (data.powerId && window.POWER_REGISTRY && window.POWER_REGISTRY[data.powerId]) {
            const pDef = window.POWER_REGISTRY[data.powerId];
            if (pDef.visuals?.tint) tint = pDef.visuals.tint;

            if (pDef.visuals?.targetVisuals && pDef.visuals.targetVisuals.length > 0) {
              pDef.visuals.targetVisuals.forEach(vis => {
                if ((vis.sequence && vis.sequence !== 'None') || (vis.particle && vis.particle !== 'none')) {
                  hasCustom = true;
                  setTimeout(() => {
                    const fxData = {
                      x: data.targetX, y: data.targetY, z: data.targetZ + (vis.offsetZ || 0),
                      vx: 0, vy: 0, vz: 0,
                      life: 0.5, maxLife: 0.5, crumpleTimer: 0,
                      wasteTex: vis.sequence, isFX: true, color: tint
                    };
                    if (vis.sequence && vis.sequence !== 'None') eng.debris.push(fxData);
                    if (vis.particle && vis.particle !== 'none') eng.spawnEventParticles({ ...fxData, particle: vis.particle, particleColor: vis.color || '#ffffff' });
                  }, (vis.delay || 0) * 1000);
                }
              });
            }
          }

          if (!hasCustom) {
            if (isAirplane) {
              eng.debris.push({
                x: data.targetX, y: data.targetY, z: data.targetZ,
                vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150, vz: 100 + Math.random() * 150,
                life: 5.0, maxLife: 5.0, crumpleTimer: 0.3,
                wasteTex: Math.random() > 0.5 ? 'waste_1' : 'waste_2', rotation: Math.random() * Math.PI * 2
              });
            }
          }
        }
      });
    });

    this.socket.on('spawn_fx', (data) => {
      if (data.wasteTex && data.wasteTex !== 'None') {
        if (eng.debris) eng.debris.push(data);
      }
      if (data.particle && data.particle !== 'none') {
         if (eng.spawnEventParticles) eng.spawnEventParticles(data);
      }
    });

    this.socket.on('force_refresh', () => {
      setTimeout(() => {
        localStorage.setItem('b_auto_relog_char', eng.playerData.name);
        window.location.reload();
      }, 1000);
    });

    // Listeners for Server-Authoritative changes
    this.socket.on('inventory_updated', (data) => {
      eng.playerData.inventory = data.inventory;
      if (eng.ui && eng.ui.inventory) eng.ui.inventory.renderInventory();
    });

    this.socket.on('currency_updated', (data) => {
      eng.playerData.currency = data.currency;
      if (eng.ui && eng.ui.inventory) eng.ui.inventory.renderInventory();
    });

    this.socket.on('player_stats_updated', (data) => {
      eng.player.hp = data.hp;
      eng.player.energy = data.energy;
      if (data.synthEnergy !== undefined) eng.player.synthEnergy = data.synthEnergy;
      if (data.maxHp !== undefined) eng.player.maxHp = data.maxHp;
      if (data.maxEnergy !== undefined) eng.player.maxEnergy = data.maxEnergy;
      if (data.maxSynthEnergy !== undefined) eng.player.maxSynthEnergy = data.maxSynthEnergy;
      if (data.activePowers !== undefined) {
        eng.player.activePowers = data.activePowers;
        if (eng.ui && eng.ui.powerbar) eng.ui.powerbar.updatePowerbar();
      }
      if (data.activeEffects !== undefined) eng.player.activeEffects = data.activeEffects;
      if (eng.ui) eng.ui.update();
    });

    this.socket.on('patch_notes_data', (notes) => {
      if (eng.ui && eng.ui.showPatchNotes) {
        eng.ui.showPatchNotes(notes, this.forceNextPatchNotes);
        this.forceNextPatchNotes = false;
      }
    });

    this.socket.on('server_announcement', (message) => {
      if (eng.ui && eng.ui.showAnnouncement) {
        eng.ui.showAnnouncement(message);
      }
    });

    this.socket.on('arcade_scores_updated', (scores) => {
      eng.arcadeScores = scores;
    });

    this.socket.on('weather_update', (weather) => {
      eng.weather = weather;
    });

    this.socket.on('friend_list_updated', (friends) => {
      if (eng.playerData) eng.playerData.friends = friends;
      if (eng.ui && eng.ui.friendsList) eng.ui.friendsList.renderFriendsList();
    });

    this.socket.on('friend_status_update', (data) => {
      if (eng.playerData && eng.playerData.friends) {
        const friend = eng.playerData.friends.find(f => f.name.toLowerCase() === data.name.toLowerCase());
        if (friend) {
          const wasOnline = friend.online;
          friend.online = data.status === 'online';

          if (!wasOnline && friend.online) {
            eng.chat.addMessage('system', 'System', `${friend.name} has logged in.`);
            const toast = document.createElement('div');
            toast.style.cssText = 'position: fixed; top: 15%; right: -300px; background: rgba(5,7,10,0.9); border: 2px solid #2ecc71; padding: 10px 20px; border-radius: 8px; z-index: 9999999; display: flex; align-items: center; gap: 10px; color: #fff; font-family: var(--font-header); font-size: 1.1rem; box-shadow: 0 0 15px rgba(46,204,113,0.4); transition: right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none;';
            toast.innerHTML = '<span style="font-size: 1.5rem;">👋</span><div><div style="color: #2ecc71; font-size: 0.8rem; text-transform: uppercase;">Friend Online</div><div>' + friend.name + '</div></div>';
            document.body.appendChild(toast);

            requestAnimationFrame(() => { toast.style.right = '20px'; });
            setTimeout(() => {
              toast.style.right = '-300px';
              setTimeout(() => toast.remove(), 500);
            }, 4000);
          }

          if (eng.ui && eng.ui.friendsList) eng.ui.friendsList.renderFriendsList();
        }
      }
    });

    this.socket.on('apartment_invite_received', (data) => {
      if (eng.ui && eng.ui.showSystemMessage) {
        eng.ui.showSystemMessage(`${data.senderName} has invited you to their apartment. <br><br><button class="b-btn btn-primary" onclick="window.currentGameEngine.chat.commandHandler.processCommand('/tpz ${data.senderZone}'); this.disabled=true; this.innerText='Accepted!';">Accept Invite</button>`);
      }
    });

    this.socket.on('friend_request_received', (data) => {
      if (eng.ui && eng.ui.showSystemMessage) {
        eng.ui.showSystemMessage(`${data.senderName} wants to be your friend. <br><br><button class="b-btn btn-primary" onclick="window.currentGameEngine.network.sendAcceptFriendRequest('${data.senderName}'); this.disabled=true; this.innerText='Accepted!';">Accept</button>`);
      }
    });

    this.socket.on('all_players_received', (list) => {
      if (eng.ui && eng.ui.devTools) {
        eng.ui.devTools.allPlayersList = list;
        eng.ui.devTools.renderPlayerManager();
      }
    });

    this.socket.on('all_accounts_received', (list) => {
      if (eng.ui && eng.ui.playerModifier) {
        eng.ui.playerModifier.allAccountsList = list;
        eng.ui.playerModifier.renderAccountManagerList();
      }
    });

    this.socket.on('player_data_received', (data) => {
      if (eng.ui && eng.ui.playerModifier) eng.ui.playerModifier.open(data);
    });

    this.socket.on('admin_account_data_received', (data) => {
      if (eng.ui && eng.ui.playerModifier) eng.ui.playerModifier.openAccountManager(data);
    });

    this.socket.on('entity_groups_data', (data) => {
      if (eng.ui && eng.ui.devTools) {
        eng.ui.devTools.renderEntityGroupManager(data);
      }
    });

    this.socket.on('map_ping', (data) => {
      if (eng.mapPings) {
        eng.mapPings.push({ x: data.x, y: data.y, life: 1.0, color: data.color || '#3498db' });
      }
    });

    this.socket.on('draw_lightning', (data) => {
      if (!eng.lightnings) eng.lightnings = [];
      eng.lightnings.push({ ...data, life: data.duration, maxLife: data.duration });

      if (eng.drones) {
        for (let id in eng.drones) {
          let d = eng.drones[id];
          if (d.isCombatDrone && Math.abs(d.x - data.startX) < 10 && Math.abs(d.y - data.startY) < 10) {
            d.stunAnimTimer = 960; // 8 frames * 120ms
            d.frame = 0; // Force sync to frame 1!
          }
        }
      }
    });

    this.socket.on('system_dialog', (text) => {
      if (eng.ui && eng.ui.showSystemMessage) eng.ui.showSystemMessage(text);
    });

    this.socket.on('power_drained', (data) => {
      if (eng.showFloatingText) {
        eng.showFloatingText(data.reason, data.color);
      }
    });

    this.socket.on('arcade_match_found', (data) => {
      if (eng.arcadeSystem && eng.arcadeSystem.vm && eng.arcadeSystem.vm.onMatchFound) {
        eng.arcadeSystem.vm.onMatchFound(data);
      }
    });

    this.socket.on('arcade_state_sync', (data) => {
      if (eng.arcadeSystem && eng.arcadeSystem.vm && eng.arcadeSystem.vm.onStateSync) {
        eng.arcadeSystem.vm.onStateSync(data);
      }
    });

    this.socket.on('arcade_match_ended', () => {
      if (eng.arcadeSystem && eng.arcadeSystem.vm && eng.arcadeSystem.vm.onMatchEnded) {
        eng.arcadeSystem.vm.onMatchEnded();
      }
    });

    this.socket.on('current_map_badges', (badges) => {
      eng.mapBadges = badges;
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.mapBadgeManagerWindow && eng.ui.devTools.mapBadgeManagerWindow.element.style.display === 'flex') {
        eng.ui.devTools.renderMapBadgeManager();
      }
    });
    this.socket.on('map_badge_spawned', (badge) => {
      if (!eng.mapBadges) eng.mapBadges = []; eng.mapBadges.push(badge);
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.mapBadgeManagerWindow && eng.ui.devTools.mapBadgeManagerWindow.element.style.display === 'flex') eng.ui.devTools.renderMapBadgeManager();
    });
    this.socket.on('map_badge_updated', (badge) => {
      if (!eng.mapBadges) return;
      const idx = eng.mapBadges.findIndex(b => b.uuid === badge.uuid);
      if (idx !== -1) { Object.assign(eng.mapBadges[idx], badge); if (eng.ui && eng.ui.devTools && eng.ui.devTools.mapBadgeManagerWindow && eng.ui.devTools.mapBadgeManagerWindow.element.style.display === 'flex') eng.ui.devTools.renderMapBadgeManager(); }
    });
    this.socket.on('map_badge_deleted', (uuid) => {
      if (!eng.mapBadges) return;
      const idx = eng.mapBadges.findIndex(b => b.uuid === uuid);
      if (idx !== -1) { eng.mapBadges.splice(idx, 1); if (eng.ui && eng.ui.devTools && eng.ui.devTools.mapBadgeManagerWindow && eng.ui.devTools.mapBadgeManagerWindow.element.style.display === 'flex') eng.ui.devTools.renderMapBadgeManager(); }
    });

    this.socket.on('badge_obtained', (data) => {
      if (!eng.playerData.badges) eng.playerData.badges = [];
      if (!eng.playerData.badges.includes(data.id)) eng.playerData.badges.push(data.id);

      if (!eng.playerData.unseenBadges) eng.playerData.unseenBadges = [];
      if (!eng.playerData.unseenBadges.includes(data.id)) eng.playerData.unseenBadges.push(data.id);

      eng.ui.showSystemMessage(`Badge Obtained: ${data.name}!`);

      const toast = document.createElement('div');
      toast.style.cssText = `position: fixed; top: 20%; left: 50%; transform: translateX(-50%) translateY(-20px); background: rgba(5,7,10,0.9); border: 2px solid #f1c40f; padding: 15px 25px; border-radius: 8px; z-index: 9999999; display: flex; align-items: center; gap: 15px; color: #fff; font-family: var(--font-header); font-size: 1.5rem; text-shadow: 1px 1px 0 #000; box-shadow: 0 0 20px rgba(241,196,15,0.4); opacity: 0; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none;`;
      toast.innerHTML = `<span style="font-size: 2.5rem; filter: drop-shadow(0 0 10px rgba(241,196,15,0.8));">🗺️</span><div><div style="color: #f1c40f; font-size: 1rem; text-transform: uppercase; letter-spacing: 2px;">Badge Obtained!</div><div style="font-size: 1.8rem; margin-top: 5px;">${data.name}</div></div>`;
      document.body.appendChild(toast);

      requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
      setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
      }, 4000);

      if (eng.ui && eng.ui.badges && eng.ui.badges.window && eng.ui.badges.window.element.style.display !== 'none') {
        eng.ui.badges.renderBadges();
      }
    });

    this.socket.on('zones_config_data', (data) => {
      eng.zonesConfig = data;
      if (typeof eng.updateBGM === 'function') eng.updateBGM();
      if (eng.ui && eng.ui.devTools && eng.ui.devTools.populateZoneConfig) eng.ui.devTools.populateZoneConfig();
      if (eng.ui && eng.ui.homeEditor && eng.ui.homeEditor.refreshModal) eng.ui.homeEditor.refreshModal();
    });

    this.socket.on('apartment_expanded', () => {
      if (eng.mapManager) {
        eng.mapManager.chunks.clear();
        eng.mapManager.generatedChunks.clear();
        eng.mapManager.loadFullMap();
      }
    });
  }

  disconnect() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.socket) this.socket.disconnect();
  }

  sendPing() {
    if (this.socket && this.socket.connected) this.socket.emit('ping');
  }

  sendTradeAccept(senderId) {
    if (this.socket && this.socket.connected) this.socket.emit('trade_accept', senderId);
  }

  sendClientSettings(settings) {
    if (this.socket && this.socket.connected) this.socket.emit('sync_client_settings', settings);
  }

  sendJoinGame(data) {
    if (this.socket && this.socket.connected) this.socket.emit('join_game', data);
  }

  sendPlayerSync(uuid, charData, position) {
    if (this.socket && this.socket.connected) this.socket.emit('sync_character', { uuid, charData, position });
  }

  sendPlayerMoved(data) {
    if (this.socket && this.socket.connected) this.socket.emit('player_moved', data);
  }

  sendTradeRequest(targetId) {
    if (this.socket && this.socket.connected) this.socket.emit('trade_request', targetId);
  }

  sendClientReady() {
    if (this.socket && this.socket.connected) this.socket.emit('client_ready');
  }

  sendRequestFullMap() {
    if (this.socket && this.socket.connected) this.socket.emit('request_full_map');
  }

  sendMapPing(data) {
    if (this.socket && this.socket.connected) this.socket.emit('map_ping', data);
  }

  sendRequestPatchNotes(forceShow = false) {
    if (this.socket && this.socket.connected) {
      this.forceNextPatchNotes = forceShow;
      this.socket.emit('request_patch_notes');
    }
  }

  sendUpdateBlock(data) {
    if (this.socket && this.socket.connected) this.socket.emit('update_block', data);
  }

  sendUpdateBlocks(dataArray) {
    if (this.socket && this.socket.connected && dataArray.length > 0) this.socket.emit('update_blocks', dataArray);
  }

  sendCombatHit(data) {
    if (this.socket && this.socket.connected) this.socket.emit('combat_hit', data);
  }

  sendPlayerTeleported() {
    if (this.socket && this.socket.connected) this.socket.emit('player_teleported');
  }

  sendPlayerTyping(isTyping) {
    if (this.socket && this.socket.connected) this.socket.emit('player_typing', { isTyping });
  }

  sendChatMessage(data) {
    if (this.socket && this.socket.connected) this.socket.emit('chat_message', data);
  }

  sendLogCommand(command) {
    if (this.socket && this.socket.connected) this.socket.emit('log_command', { command });
  }

  sendFriendRequest(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('friend_request', { targetName });
  }

  sendAcceptFriendRequest(senderName) {
    if (this.socket && this.socket.connected) this.socket.emit('accept_friend_request', { senderName });
  }

  sendRemoveFriend(friendName) {
    if (this.socket && this.socket.connected) this.socket.emit('remove_friend', { friendName });
  }

  sendAdminTeleport(data) {
    if (this.socket && this.socket.connected) this.socket.emit('admin_teleport', data);
  }

  sendRequestEntityGroups() {
    if (this.socket && this.socket.connected) this.socket.emit('request_entity_groups');
  }

  sendSaveEntityGroup(group, settings) {
    if (this.socket && this.socket.connected) this.socket.emit('save_entity_group', { group, settings });
  }

  sendCreateNpc(data) {
    if (this.socket && this.socket.connected) this.socket.emit('create_npc', data);
  }

  sendLearnPower(data) {
    if (this.socket && this.socket.connected) this.socket.emit('learn_power', data);
  }

  sendLearnPowerset(data) {
    if (this.socket && this.socket.connected) this.socket.emit('learn_powerset', data);
  }

  sendPetCommand(command, targetId = null, selectedTarget = null) {
    if (this.socket && this.socket.connected) this.socket.emit('pet_command', { command, targetId, selectedTarget });
  }

  sendEditNpc(uuid, updates) {
    if (this.socket && this.socket.connected) this.socket.emit('edit_npc', { uuid, updates });
  }

  sendDeleteNpc(uuid) {
    if (this.socket && this.socket.connected) this.socket.emit('delete_npc', uuid);
  }

  sendCreateSpawner(data) {
    if (this.socket && this.socket.connected) this.socket.emit('create_spawner', data);
  }

  sendEditSpawner(uuid, updates) {
    if (this.socket && this.socket.connected) this.socket.emit('edit_spawner', { uuid, updates });
  }

  sendDeleteSpawner(uuid) {
    if (this.socket && this.socket.connected) this.socket.emit('delete_spawner', uuid);
  }

  sendProjectile(data) {
    if (this.socket && this.socket.connected) this.socket.emit('spawn_projectile', data);
  }

  sendSpawnFX(data) {
    if (this.socket && this.socket.connected) this.socket.emit('spawn_fx', data);
  }

  sendInventoryMove(fromIndex, toIndex) {
    if (this.socket && this.socket.connected) this.socket.emit('inventory_move', { fromIndex, toIndex });
  }

  sendRequestAllPlayers() {
    if (this.socket && this.socket.connected) this.socket.emit('request_all_players');
  }

  sendRequestPlayerData(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('request_player_data', { targetName });
  }

  sendAdminUpdatePlayer(targetName, updates) {
    if (this.socket && this.socket.connected) this.socket.emit('admin_update_player', { targetName, updates });
  }

  sendAdminRequestAccount(uuid) {
    if (this.socket && this.socket.connected) this.socket.emit('admin_request_account', { uuid });
  }

  sendAdminRequestAccountByUsername(username) {
    if (this.socket && this.socket.connected) this.socket.emit('admin_request_account', { username });
  }

  sendAdminRequestAllAccounts() {
    if (this.socket && this.socket.connected) this.socket.emit('admin_request_all_accounts');
  }

  sendAdminUpdateAccount(uuid, updates) {
    if (this.socket && this.socket.connected) this.socket.emit('admin_update_account', { uuid, ...updates });
  }

  sendAdminKickPlayer(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('admin_kick_player', { targetName });
  }

  sendDiscordInvite() {
    if (this.socket && this.socket.connected) this.socket.emit('discord_invite');
  }

  sendArcadeScore(gameId, score) {
    if (this.socket && this.socket.connected) this.socket.emit('submit_arcade_score', { gameId, score });
  }

  sendArcadeQueueJoin(gameId) {
    if (this.socket && this.socket.connected) this.socket.emit('arcade_queue_join', { gameId });
  }

  sendArcadeQueueLeave() {
    if (this.socket && this.socket.connected) this.socket.emit('arcade_queue_leave');
  }

  sendArcadeStateSync(data) {
    if (this.socket && this.socket.connected) this.socket.emit('arcade_state_sync', data);
  }

  sendArcadeMatchLeave() {
    if (this.socket && this.socket.connected) this.socket.emit('arcade_match_leave');
  }

  sendCreateMapBadge(data) {
    if (this.socket && this.socket.connected) this.socket.emit('create_map_badge', data);
  }

  sendEditMapBadge(data) {
    if (this.socket && this.socket.connected) this.socket.emit('edit_map_badge', data);
  }

  sendDeleteMapBadge(uuid) {
    if (this.socket && this.socket.connected) this.socket.emit('delete_map_badge', uuid);
  }

  sendRequestMapBadges() {
    if (this.socket && this.socket.connected) this.socket.emit('request_map_badges');
  }

  sendApartmentInvite(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('apartment_invite', { targetName });
  }

  sendApartmentToggleLock() {
    if (this.socket && this.socket.connected) this.socket.emit('apartment_toggle_lock');
  }

  sendApartmentToggleVisitor(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('apartment_toggle_visitor', { targetName });
  }

  sendApartmentToggleBuilder(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('apartment_toggle_builder', { targetName });
  }

  sendApartmentKick(targetName) {
    if (this.socket && this.socket.connected) this.socket.emit('apartment_kick', { targetName });
  }

  sendApartmentKickAll() {
    if (this.socket && this.socket.connected) this.socket.emit('apartment_kick_all');
  }
}
