module.exports = function registerWorldSockets(socket, io, state, deps) {
  const { activePlayers, npcsCatalog, spawnersCatalog, activeDrones, mapChunks, permissionsCatalog, SERVER_POWER_REGISTRY, serverPowersetsById, mapBadgesCatalog } = state;
  const { logSystem, fs, path, randomUUID, PLAYER_DATA_DIR, CHAR_DATA_DIR, CHUNKS_DIR, ZONES_REGISTRY_FILE, ARCADE_SCORES_FILE, PATCH_NOTES_FILE, arcadeScores, arcadeQueues, arcadeMatches, playerMatches, getIndex, saveIndex } = deps;

  const getChunkId = (tx, ty) => { const cx = Math.floor(tx / 32); const cy = Math.floor(ty / 32); return `chunk_${cx}_${cy}`; };

  const applyBankInterest = (accData) => {
    let changed = false;
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    if (accData.lastInterestUpdate === undefined) {
      accData.lastInterestUpdate = now;
      changed = true;
    }
    if ((accData.bankCurrency || 0) > 0) {
      const timePassed = now - accData.lastInterestUpdate;
      if (timePassed >= msPerDay) {
        const days = Math.floor(timePassed / msPerDay);
        accData.bankCurrency = Math.floor(accData.bankCurrency * Math.pow(1.01, days));
        accData.lastInterestUpdate += days * msPerDay;
        changed = true;
      }
    } else {
      if (now - accData.lastInterestUpdate >= msPerDay) {
        accData.lastInterestUpdate = now;
        changed = true;
      }
    }
    return changed;
  };

  const checkZoneBadge = (p, z, sId) => {
    if (!state.zonesConfig) return;
    const zConf = state.zonesConfig[z];
    if (zConf && zConf.badgeId) {
      if (!p.badges) p.badges = [];
      if (!p.badges.includes(zConf.badgeId)) {
        p.badges.push(zConf.badgeId);
        if (!p.unseenBadges) p.unseenBadges = [];
        if (!p.unseenBadges.includes(zConf.badgeId)) p.unseenBadges.push(zConf.badgeId);
        const safeName = p.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().toLowerCase();
        const cFile = path.join(CHAR_DATA_DIR, `${safeName}.json`);
        if (fs.existsSync(cFile)) { try { const cObj = JSON.parse(fs.readFileSync(cFile, 'utf8')); cObj.badges = p.badges; cObj.unseenBadges = p.unseenBadges; fs.writeFileSync(cFile, JSON.stringify(cObj, null, 2)); } catch (e) { } }
        io.to(sId).emit('badge_obtained', { id: zConf.badgeId, name: zConf.name || z });
      }
    }
  };

  socket.on('join_game', (player) => {
    if (!player || typeof player !== 'object') return;
    if (typeof player.name !== 'string' || !player.name.trim()) return;
    if (typeof player.zone !== 'string' || !player.zone.trim()) return;

    // Sanitize strings to strictly prevent Path Traversal and Server Crashes
    player.name = player.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    player.zone = player.zone.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    if (player.accountUuid) player.accountUuid = String(player.accountUuid).replace(/[^a-zA-Z0-9-]/g, '');

    // Prevent NaN Contamination on Spawn Coordinates
    if (typeof player.x !== 'number' || isNaN(player.x)) player.x = 0;
    if (typeof player.y !== 'number' || isNaN(player.y)) player.y = 0;
    if (player.z !== undefined && (typeof player.z !== 'number' || isNaN(player.z))) delete player.z;

    const existingId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === player.name.toLowerCase() && id !== socket.id);
    if (existingId) { logSystem(`KICKING DUPLICATE CHARACTER: ${player.name}`); const oldSocket = io.sockets.sockets.get(existingId); if (oldSocket) oldSocket.disconnect(true); delete activePlayers[existingId]; }

    if (!player.zone || player.zone === 'untitled') {
      logSystem(`[Auto-Repair] Player ${player.name} joined with missing/invalid zone '${player.zone}'. Defaulting to atlas-city.`, 'WARN');
      player.zone = 'atlas-city';
    }

    activePlayers[socket.id] = player; player.id = socket.id; player.isLoading = true;
    setTimeout(() => { if (activePlayers[socket.id] && activePlayers[socket.id].isLoading) { activePlayers[socket.id].isLoading = false; logSystem(`${player.name} loading protection expired.`); } }, 15000);
    socket.join(player.zone);

    if (player.accountUuid) {
      const accountFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`); let accountData = {};
      if (fs.existsSync(accountFile)) { accountData = JSON.parse(fs.readFileSync(accountFile, 'utf8')); if (applyBankInterest(accountData)) fs.writeFileSync(accountFile, JSON.stringify(accountData, null, 2)); player.friends = accountData.friends || []; player.currency = accountData.currency || 0; } else { player.friends = []; player.currency = 0; }
      player.friends.forEach(friendName => { const friendId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === friendName.toLowerCase()); if (friendId) { io.to(friendId).emit('friend_status_update', { name: player.name, status: 'online' }); } });
      const friendsWithStatus = player.friends.map(friendName => { const isOnline = Object.values(activePlayers).some(p => p.name.toLowerCase() === friendName.toLowerCase()); return { name: friendName, online: isOnline }; });
      socket.emit('friend_list_updated', friendsWithStatus);
    }

    try {
      const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
      if (fs.existsSync(charFile)) {
        const rawData = fs.readFileSync(charFile, 'utf8');
        let freshCharData = { name: player.name, stats: { hp: 1000, maxHp: 1000, energy: 1000, maxEnergy: 1000, synthEnergy: 1000 }, powers: [], powersets: [], unspentPowerPicks: 0, unspentPowersetPicks: 0, badges: [], unseenBadges: [], dayJobProgress: {} };
        if (rawData && rawData.trim() !== '') { try { freshCharData = JSON.parse(rawData); } catch (e) { logSystem(`[Auto-Repair] Corrupted join_game data for ${player.name}, resetting to safe defaults.`, 'WARN'); } }

        player.hp = freshCharData.stats?.hp !== undefined ? freshCharData.stats.hp : 1000; player.maxHp = freshCharData.stats?.maxHp || 1000; player.energy = freshCharData.stats?.energy !== undefined ? freshCharData.stats.energy : 1000; player.maxEnergy = freshCharData.stats?.maxEnergy || 1000; player.powers = freshCharData.powers || [];
        player.experience = freshCharData.experience || 0;
        player.unspentPowerPicks = freshCharData.unspentPowerPicks || 0;
        player.unspentPowersetPicks = freshCharData.unspentPowersetPicks || 0;
        player.badges = freshCharData.badges || [];
        player.unseenBadges = freshCharData.unseenBadges || [];
        player.dayJobProgress = freshCharData.dayJobProgress || {};
        player.lastDiscordInvite = freshCharData.lastDiscordInvite || 0;
        player.preAptZone = freshCharData.preAptZone;
        player.preAptX = freshCharData.preAptX;
        player.preAptY = freshCharData.preAptY;
        player.preAptZ = freshCharData.preAptZ;
        if (!player.stats) player.stats = {};
        player.stats.pvpKills = freshCharData.stats?.pvpKills || 0; player.stats.pveKills = freshCharData.stats?.pveKills || 0;

        const now = Date.now();
        const lastOnline = freshCharData.lastOnline || now;
        const offlineTimeMs = now - lastOnline;
        let earnedCurrency = 0;
        let earnedBadge = null;
        if (offlineTimeMs > 60000) {
          for (const badge of mapBadgesCatalog) {
            if (badge.type === 'dayjob' && (badge.zone || 'untitled') === player.zone) {
              const w2 = (badge.width || 32) / 2; const d2 = (badge.depth || 32) / 2; const h2 = (badge.height || 32) / 2;
              if (Math.abs(player.x - badge.x) <= w2 && Math.abs(player.y - badge.y) <= d2 && Math.abs((player.z || 0) - (badge.z || 0)) <= h2) {
                player.dayJobProgress[badge.badgeId] = (player.dayJobProgress[badge.badgeId] || 0) + offlineTimeMs;
                const offlineHours = offlineTimeMs / (1000 * 60 * 60);
                earnedCurrency += Math.floor(offlineHours * 100);
                if (player.dayJobProgress[badge.badgeId] >= (1000 * 60 * 60 * 21) && !player.badges.includes(badge.badgeId)) {
                  player.badges.push(badge.badgeId);
                  player.unseenBadges.push(badge.badgeId);
                  earnedBadge = badge;
                }
              }
            }
          }
        }
        if (earnedCurrency > 0) {
          accountData.currency = (accountData.currency || 0) + earnedCurrency;
          player.currency = accountData.currency;
          if (player.accountUuid && fs.existsSync(path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`))) fs.writeFileSync(path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`), JSON.stringify(accountData, null, 2));
        }
        freshCharData.badges = player.badges;
        freshCharData.unseenBadges = player.unseenBadges;
        freshCharData.dayJobProgress = player.dayJobProgress;
        if (freshCharData.currency !== undefined) delete freshCharData.currency;
        fs.writeFileSync(charFile, JSON.stringify(freshCharData, null, 2));
        freshCharData.currency = player.currency;
        socket.emit('player_data_updated', freshCharData);
        if (earnedCurrency > 0) { setTimeout(() => { socket.emit('system_dialog', `You earned ${earnedCurrency} currency from your Day Job while offline!`); socket.emit('currency_updated', { currency: freshCharData.currency }); }, 3000); }
        if (earnedBadge) { setTimeout(() => { socket.emit('badge_obtained', { id: earnedBadge.badgeId, name: earnedBadge.name }); }, 4000); }
        checkZoneBadge(player, player.zone, socket.id);
      }
    } catch (e) { console.error(`Error loading fresh char data for ${player.name}:`, e.message); }

    if (player.activePowers && player.activePowers.includes('satelite-support')) {
      const existingDrones = Object.values(activeDrones).filter(d => d.ownerSocketId === socket.id);
      const hasEquipRobot = player.powers && player.powers.some(pId => pId === 'equip-robot' || (SERVER_POWER_REGISTRY[pId] && SERVER_POWER_REGISTRY[pId].name === 'Equip Robot'));
      const hasUpgradeRobot = player.powers && player.powers.some(pId => pId === 'upgrade-robot' || pId === 'upgrade-robots' || (SERVER_POWER_REGISTRY[pId] && (SERVER_POWER_REGISTRY[pId].name === 'Upgrade Robot' || SERVER_POWER_REGISTRY[pId].name === 'Upgrade Robots')));
      const numDrones = hasUpgradeRobot ? 3 : (hasEquipRobot ? 2 : 1);
      if (existingDrones.length < numDrones) {
        let delay = 0;
        for (let i = existingDrones.length; i < numDrones; i++) {
          setTimeout(() => {
            const p = activePlayers[socket.id]; if (!p || !p.zone || p.state === 'death' || !p.activePowers || !p.activePowers.includes('satelite-support')) return;
            const droneId = randomUUID();
            const newDrone = { uuid: droneId, ownerSocketId: socket.id, ownerName: p.name, x: p.x, y: p.y, z: (p.z || 0) + 220, state: 'idle', dir: 'down', orbitIndex: i, orbitOffset: (i / numDrones) * Math.PI * 2 + (Math.random() * Math.PI), hp: hasUpgradeRobot ? 150 : 100, maxHp: hasUpgradeRobot ? 150 : 100, type: 'drone', isCombatDrone: i === 1, isAssaultDrone: i === 2, isUpgraded: hasUpgradeRobot, zone: p.zone, level: p.level || 1, strength: -2, mode: 'defensive' };
            activeDrones[droneId] = newDrone; io.to(p.zone).emit('drone_spawned', newDrone);
          }, delay); delay += 500;
        }
      }
    }

    socket.to(player.zone).emit('player_joined', player);
    const playersInZone = {}; for (const id in activePlayers) { if (activePlayers[id].zone === player.zone) playersInZone[id] = activePlayers[id]; }
    socket.emit('current_players', playersInZone);
    socket.emit('current_npcs', npcsCatalog.filter(n => n.zone === player.zone));
    socket.emit('current_spawners', spawnersCatalog.filter(s => s.zone === player.zone));
    socket.emit('current_map_badges', mapBadgesCatalog.filter(b => (b.zone || 'untitled') === player.zone));
    socket.emit('server_permissions', permissionsCatalog);
    socket.emit('zones_config_data', state.zonesConfig || {});
    socket.emit('current_neighborhoods', state.neighborhoods);
    socket.emit('current_mob_packs', state.mobPacks);
    socket.emit('current_npc_templates', state.npcTemplates);
    socket.emit('current_entity_types', state.entityTypes);

    const dronesInZone = {}; for (const id in activeDrones) { if (activeDrones[id].zone === player.zone) dronesInZone[id] = activeDrones[id]; }
    socket.emit('current_drones', dronesInZone);

    const combinedData = {};
    if (mapChunks[player.zone]) { for (let chunkId in mapChunks[player.zone]) { Object.assign(combinedData, mapChunks[player.zone][chunkId]); } }
    socket.compress(true).emit('full_map_data_received', { data: combinedData, currentZone: player.zone });
    socket.emit('weather_update', state.globalWeather);
    socket.compress(true).emit('arcade_scores_updated', arcadeScores);
    checkZoneBadge(player, player.zone, socket.id);
  });

  socket.on('client_ready', () => { const player = activePlayers[socket.id]; if (player) { player.isLoading = false; } });

  socket.on('sync_client_settings', async (settings) => {
    const player = activePlayers[socket.id];
    if (player && player.accountUuid) {
      try { const accountFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`); if (fs.existsSync(accountFile)) { const accData = JSON.parse(fs.readFileSync(accountFile, 'utf8')); accData.clientSettings = settings; fs.writeFileSync(accountFile, JSON.stringify(accData, null, 2)); } } catch (e) { console.error(`Error saving client settings for ${player.name}:`, e.message); }
    }
  });

  socket.on('player_moved', (data) => {
    const player = activePlayers[socket.id];
    if (player) {
      if (typeof data.x !== 'number' || isNaN(data.x)) return;
      if (typeof data.y !== 'number' || isNaN(data.y)) return;
      if (data.z !== undefined && (typeof data.z !== 'number' || isNaN(data.z))) delete data.z;

      const isRespawning = player.state === 'death' && data.state === 'idle';
      if (!isRespawning && player.x !== undefined && player.y !== undefined) {
        const maxMapSize = 511 * 32;
        if (data.x < 0 || data.x > maxMapSize || data.y < 0 || data.y > maxMapSize) { 
          logSystem(`OUT OF BOUNDS HACK DETECTED: ${player.name}`, "WARN"); 
          socket.emit('force_teleport', { x: Math.max(0, Math.min(player.x, maxMapSize)), y: Math.max(0, Math.min(player.y, maxMapSize)), z: player.z }); 
          return; 
        }
        if (player.zone && player.zone.startsWith('apt_')) {
          const zc = state.zonesConfig && state.zonesConfig[player.zone] ? state.zonesConfig[player.zone] : {};
          const ownedChunks = zc.ownedChunks || ['1_1'];
          const pChunkX = Math.floor((data.x / 32) / 32);
          const pChunkY = Math.floor((data.y / 32) / 32);
          if (!ownedChunks.includes(`${pChunkX}_${pChunkY}`)) {
            // Function as an invisible wall, preventing movement out of bounds
            socket.emit('force_teleport', { x: player.x, y: player.y, z: player.z });
            return;
          }
        }
      }
      if (data.state === 'dash' && player.state !== 'dash') { if (player.energy >= 50) player.energy -= 50; }
      if (data.state === 'jump' && player.state !== 'jump') { if (player.energy >= 25) player.energy -= 25; }
      player.lastMoveTime = Date.now(); player.x = data.x; player.y = data.y; if (data.z !== undefined) player.z = data.z; player.state = data.state; player.dir = data.dir;
      if (data.activePowers !== undefined) {
        const incomingPowers = data.activePowers.filter(p => player.powers && player.powers.includes(p)); const currentPowers = player.activePowers || [];
        incomingPowers.forEach(pId => { if (!currentPowers.includes(pId)) { const pDef = SERVER_POWER_REGISTRY[pId]; if (pDef && pDef.type?.toLowerCase() === 'toggle') { const eCost = pDef.stats?.energyCost || 0; const bCost = pDef.stats?.batteryCost || 0; player.energy = Math.max(0, player.energy - eCost); if (player.synthEnergy !== undefined) player.synthEnergy = Math.max(0, player.synthEnergy - bCost); } } });
        player.activePowers = incomingPowers;
      }
      if (data.isAFK !== undefined) { if (player.isAFK && !data.isAFK) { player.afkMessage = null; } player.isAFK = data.isAFK; }
      socket.to(player.zone).emit('player_moved', { id: player.id, x: Math.round(player.x), y: Math.round(player.y), z: Math.round(player.z || 0), state: player.state, dir: player.dir, hp: Math.floor(player.hp), energy: Math.floor(player.energy), level: player.level, activePowers: player.activePowers, isAFK: player.isAFK, afkMessage: player.afkMessage });
    }
  });

  socket.on('map_update', (updates) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase();
    const hasPerm = ['editmode', 'builder', 'dev', 'admin'].some(role => {
      const p = permissionsCatalog[role] || [];
      return p.includes('*') || p.includes(pName);
    });
    let isAptGuestBuilder = false;
    if (player.zone && player.zone.startsWith('apt_') && state.zonesConfig && state.zonesConfig[player.zone]) {
      const zc = state.zonesConfig[player.zone];
      if (zc.builders && zc.builders.includes(pName)) {
        isAptGuestBuilder = true;
      }
    }
    if (!hasPerm && !isAptGuestBuilder) { logSystem(`UNAUTHORIZED BULK MAP UPDATE ATTEMPT: ${pName}`, "WARN"); return; }
    if (!Array.isArray(updates)) return;
    const updatedChunks = new Set(); const zone = player.zone; if (!zone) return;
    updates.forEach(u => {
      const chunkId = getChunkId(u.x, u.y);
      if (!mapChunks[zone]) mapChunks[zone] = {}; if (!mapChunks[zone][chunkId]) mapChunks[zone][chunkId] = {};
      const tileKey = `${u.x},${u.y}`;
      if (u.tex === null) { delete mapChunks[zone][chunkId][tileKey]; } else { mapChunks[zone][chunkId][tileKey] = { tex: u.tex, color: u.color || '#ffffff', z: u.z || 0 }; }
      updatedChunks.add(chunkId);
    });
    const zoneDir = path.join(CHUNKS_DIR, zone); if (!fs.existsSync(zoneDir)) fs.mkdirSync(zoneDir, { recursive: true });
    updatedChunks.forEach(chunkId => { fs.writeFileSync(path.join(zoneDir, `${chunkId}.json`), JSON.stringify(mapChunks[zone][chunkId], null, 2)); });
    socket.to(zone).emit('map_update', updates);
  });

  socket.on('request_patch_notes', () => { if (fs.existsSync(PATCH_NOTES_FILE)) { try { const data = fs.readFileSync(PATCH_NOTES_FILE, 'utf8'); socket.compress(true).emit('patch_notes_data', JSON.parse(data)); } catch (e) { console.error("Error sending patch notes over socket:", e.message); } } });
  socket.on('submit_arcade_score', (data) => { const player = activePlayers[socket.id]; if (!player) return; const { gameId, score } = data; if (typeof score !== 'number' || score <= 0) return; if (!arcadeScores[gameId] || score > arcadeScores[gameId].score) { arcadeScores[gameId] = { score, player: player.name }; fs.writeFileSync(ARCADE_SCORES_FILE, JSON.stringify(arcadeScores, null, 2)); io.compress(true).emit('arcade_scores_updated', arcadeScores); } });
  socket.on('arcade_queue_join', (data) => { if (!arcadeQueues[data.gameId]) arcadeQueues[data.gameId] = null; if (arcadeQueues[data.gameId] && arcadeQueues[data.gameId] !== socket.id) { const p1 = arcadeQueues[data.gameId]; const p2 = socket.id; arcadeQueues[data.gameId] = null; const matchId = randomUUID(); arcadeMatches[matchId] = { p1, p2, gameId: data.gameId }; playerMatches[p1] = matchId; playerMatches[p2] = matchId; const p1Name = activePlayers[p1] ? activePlayers[p1].name : 'Opponent'; const p2Name = activePlayers[p2] ? activePlayers[p2].name : 'Opponent'; io.to(p1).emit('arcade_match_found', { role: 1, opponent: p2Name }); io.to(p2).emit('arcade_match_found', { role: 2, opponent: p1Name }); } else { arcadeQueues[data.gameId] = socket.id; } });
  socket.on('arcade_queue_leave', () => { for (let gameId in arcadeQueues) { if (arcadeQueues[gameId] === socket.id) arcadeQueues[gameId] = null; } });
  socket.on('arcade_state_sync', (data) => { const matchId = playerMatches[socket.id]; if (matchId && arcadeMatches[matchId]) { const match = arcadeMatches[matchId]; const opponent = match.p1 === socket.id ? match.p2 : match.p1; io.to(opponent).emit('arcade_state_sync', data); } });
  socket.on('arcade_match_leave', () => { const matchId = playerMatches[socket.id]; if (matchId && arcadeMatches[matchId]) { const match = arcadeMatches[matchId]; const opponent = match.p1 === socket.id ? match.p2 : match.p1; io.to(opponent).emit('arcade_match_ended'); delete playerMatches[match.p1]; delete playerMatches[match.p2]; delete arcadeMatches[matchId]; } });

  socket.on('request_full_map', () => { const player = activePlayers[socket.id]; if (!player || !player.zone) return; const zone = player.zone; socket.emit('zones_config_data', state.zonesConfig || {}); const combinedData = {}; if (mapChunks[zone]) { for (let chunkId in mapChunks[zone]) { Object.assign(combinedData, mapChunks[zone][chunkId]); } } socket.compress(true).emit('full_map_data_received', { data: combinedData, currentZone: zone }); });
  socket.on('save_chunk', ({ key, data }) => { if (typeof key !== 'string') return; const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, ''); const player = activePlayers[socket.id]; if (!player || !player.zone) return; const zone = player.zone; const zoneDir = path.join(CHUNKS_DIR, zone); if (!fs.existsSync(zoneDir)) fs.mkdirSync(zoneDir, { recursive: true }); const chunkFile = path.join(zoneDir, `${safeKey}.json`); try { const chunkObj = {}; data.forEach(entry => { chunkObj[entry[0]] = entry[1]; }); if (!mapChunks[zone]) mapChunks[zone] = {}; mapChunks[zone][safeKey] = chunkObj; fs.writeFileSync(chunkFile, JSON.stringify(chunkObj, null, 2)); } catch (e) { console.error(`Error saving chunk ${safeKey}:`, e.message); } });

  socket.on('request_bank_data', () => {
    const player = activePlayers[socket.id];
    if (!player || !player.accountUuid) return;
    const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    if (fs.existsSync(accFile)) {
      try { const accData = JSON.parse(fs.readFileSync(accFile, 'utf8')); if (applyBankInterest(accData)) fs.writeFileSync(accFile, JSON.stringify(accData, null, 2)); socket.emit('bank_data_updated', { items: accData.bankItems || [], currency: accData.bankCurrency || 0 }); } catch (e) { }
    }
  });

  socket.on('bank_deposit_currency', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !player.accountUuid) return;
    const amount = parseInt(data.amount, 10);
    if (isNaN(amount) || amount <= 0) return;
    const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    if (fs.existsSync(accFile)) {
      try {
        const accData = JSON.parse(fs.readFileSync(accFile, 'utf8'));
        applyBankInterest(accData);
        if ((accData.currency || 0) >= amount) {
          accData.currency -= amount; accData.bankCurrency = (accData.bankCurrency || 0) + amount; player.currency = accData.currency;
          fs.writeFileSync(accFile, JSON.stringify(accData, null, 2)); socket.emit('currency_updated', { currency: accData.currency }); socket.emit('bank_data_updated', { items: accData.bankItems || [], currency: accData.bankCurrency });
        }
      } catch (e) { }
    }
  });

  socket.on('bank_withdraw_currency', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !player.accountUuid) return;
    const amount = parseInt(data.amount, 10);
    if (isNaN(amount) || amount <= 0) return;
    const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    if (fs.existsSync(accFile)) {
      try {
        const accData = JSON.parse(fs.readFileSync(accFile, 'utf8'));
        applyBankInterest(accData);
        if ((accData.bankCurrency || 0) >= amount) {
          accData.bankCurrency -= amount; accData.currency = (accData.currency || 0) + amount; player.currency = accData.currency;
          fs.writeFileSync(accFile, JSON.stringify(accData, null, 2)); socket.emit('currency_updated', { currency: accData.currency }); socket.emit('bank_data_updated', { items: accData.bankItems || [], currency: accData.bankCurrency });
        }
      } catch (e) { }
    }
  });

  socket.on('bank_deposit_item', (data) => {
    const player = activePlayers[socket.id]; if (!player || !player.accountUuid) return;
    const { fromInvIdx, toBankIdx } = data;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`); const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    if (fs.existsSync(charFile) && fs.existsSync(accFile)) {
      try {
        const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); const accData = JSON.parse(fs.readFileSync(accFile, 'utf8'));
        applyBankInterest(accData);
        charObj.inventory = charObj.inventory || []; accData.bankItems = accData.bankItems || [];
        if (charObj.inventory[fromInvIdx]) {
          const tempBank = accData.bankItems[toBankIdx];
          accData.bankItems[toBankIdx] = charObj.inventory[fromInvIdx]; charObj.inventory[fromInvIdx] = tempBank || null;
          fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); fs.writeFileSync(accFile, JSON.stringify(accData, null, 2));
          socket.emit('inventory_updated', { inventory: charObj.inventory }); socket.emit('bank_data_updated', { items: accData.bankItems, currency: accData.bankCurrency || 0 });
        }
      } catch (e) { }
    }
  });

  socket.on('bank_withdraw_item', (data) => {
    const player = activePlayers[socket.id]; if (!player || !player.accountUuid) return;
    const { fromBankIdx, toInvIdx } = data;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`); const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    if (fs.existsSync(charFile) && fs.existsSync(accFile)) {
      try {
        const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); const accData = JSON.parse(fs.readFileSync(accFile, 'utf8'));
        applyBankInterest(accData);
        charObj.inventory = charObj.inventory || []; accData.bankItems = accData.bankItems || [];
        if (accData.bankItems[fromBankIdx]) {
          const tempInv = charObj.inventory[toInvIdx];
          charObj.inventory[toInvIdx] = accData.bankItems[fromBankIdx]; accData.bankItems[fromBankIdx] = tempInv || null;
          fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); fs.writeFileSync(accFile, JSON.stringify(accData, null, 2));
          socket.emit('inventory_updated', { inventory: charObj.inventory }); socket.emit('bank_data_updated', { items: accData.bankItems, currency: accData.bankCurrency || 0 });
        }
      } catch (e) { }
    }
  });

  socket.on('bank_move_item', (data) => {
    const player = activePlayers[socket.id]; if (!player || !player.accountUuid) return;
    const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    if (fs.existsSync(accFile)) {
      try {
        const accData = JSON.parse(fs.readFileSync(accFile, 'utf8')); accData.bankItems = accData.bankItems || [];
        applyBankInterest(accData);
        const temp = accData.bankItems[data.toIdx]; accData.bankItems[data.toIdx] = accData.bankItems[data.fromIdx]; accData.bankItems[data.fromIdx] = temp || null;
        fs.writeFileSync(accFile, JSON.stringify(accData, null, 2)); socket.emit('bank_data_updated', { items: accData.bankItems, currency: accData.bankCurrency || 0 });
      } catch (e) { }
    }
  });

  socket.on('update_block', (payload) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase();
    const hasPerm = ['editmode', 'builder', 'dev', 'admin'].some(role => {
      const p = permissionsCatalog[role] || [];
      return p.includes('*') || p.includes(pName);
    });
    let isAptGuestBuilder = false;
    if (player.zone && player.zone.startsWith('apt_') && state.zonesConfig && state.zonesConfig[player.zone]) {
      const zc = state.zonesConfig[player.zone];
      if (zc.builders && zc.builders.includes(pName)) {
        isAptGuestBuilder = true;
      }
    }
    if (!hasPerm && !isAptGuestBuilder) { logSystem(`UNAUTHORIZED BLOCK UPDATE ATTEMPT: ${pName}`, "WARN"); return; }
    if (!player.zone) return; const zone = player.zone; const { worldX, worldY, worldZ, voxelData } = payload;
    if (isNaN(worldX) || isNaN(worldY) || isNaN(worldZ)) return;
    const localX = Math.round(worldX / 32); const localY = Math.round(worldY / 32); const localZ = Math.round(worldZ / 32);
    const cx = Math.floor(localX / 32); const cy = Math.floor(localY / 32); const chunkId = `chunk_${cx}_${cy}`; const tileKey = `${localX}_${localY}_${localZ}`;
    if (!mapChunks[zone]) mapChunks[zone] = {}; if (!mapChunks[zone][chunkId]) mapChunks[zone][chunkId] = {};
    if (voxelData === null) delete mapChunks[zone][chunkId][tileKey]; else mapChunks[zone][chunkId][tileKey] = voxelData;
    const zoneDir = path.join(CHUNKS_DIR, zone); if (!fs.existsSync(zoneDir)) fs.mkdirSync(zoneDir, { recursive: true });
    const chunkFile = path.join(zoneDir, `${chunkId}.json`); try { fs.writeFileSync(chunkFile, JSON.stringify(mapChunks[zone][chunkId], null, 2)); } catch (e) { console.error(`Error saving chunk ${chunkId}:`, e.message); }
    socket.to(zone).emit('block_updated', payload);
  });

  socket.on('update_blocks', (payloads) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase();
    const hasPerm = ['editmode', 'builder', 'dev', 'admin'].some(role => {
      const p = permissionsCatalog[role] || [];
      return p.includes('*') || p.includes(pName);
    });
    let isAptGuestBuilder = false;
    if (player.zone && player.zone.startsWith('apt_') && state.zonesConfig && state.zonesConfig[player.zone]) {
      const zc = state.zonesConfig[player.zone];
      if (zc.builders && zc.builders.includes(pName)) {
        isAptGuestBuilder = true;
      }
    }
    if (!hasPerm && !isAptGuestBuilder) { logSystem(`UNAUTHORIZED BLOCK UPDATE ATTEMPT: ${pName}`, "WARN"); return; }
    if (!player.zone || !Array.isArray(payloads) || payloads.length === 0) return;
    const zone = player.zone;
    const zoneDir = path.join(CHUNKS_DIR, zone); if (!fs.existsSync(zoneDir)) fs.mkdirSync(zoneDir, { recursive: true });
    const updatedChunks = new Set();
    payloads.forEach(payload => {
      const { worldX, worldY, worldZ, voxelData } = payload;
      if (isNaN(worldX) || isNaN(worldY) || isNaN(worldZ)) return;
      const localX = Math.round(worldX / 32); const localY = Math.round(worldY / 32); const localZ = Math.round(worldZ / 32);
      const cx = Math.floor(localX / 32); const cy = Math.floor(localY / 32); const chunkId = `chunk_${cx}_${cy}`; const tileKey = `${localX}_${localY}_${localZ}`;
      if (!mapChunks[zone]) mapChunks[zone] = {}; if (!mapChunks[zone][chunkId]) mapChunks[zone][chunkId] = {};
      if (voxelData === null) delete mapChunks[zone][chunkId][tileKey]; else mapChunks[zone][chunkId][tileKey] = voxelData;
      updatedChunks.add(chunkId);
    });
    updatedChunks.forEach(chunkId => { const chunkFile = path.join(zoneDir, `${chunkId}.json`); try { fs.writeFileSync(chunkFile, JSON.stringify(mapChunks[zone][chunkId], null, 2)); } catch (e) { console.error(`Error saving chunk ${chunkId}:`, e.message); } });
    socket.to(zone).emit('blocks_updated', payloads);
  });

  socket.on('sync_character', async (data) => {
    const player = activePlayers[socket.id]; if (!player) return; if (!data || !data.uuid || !data.charData || !data.charData.name) return;
    if (typeof data.charData.name !== 'string') return;
    if (player.name.toLowerCase() !== data.charData.name.toLowerCase()) { logSystem(`UNAUTHORIZED SYNC ATTEMPT: ${player.name} tried to overwrite ${data.charData.name}`, "WARN"); return; }
    const safeName = data.charData.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().toLowerCase();
    const charFile = path.join(CHAR_DATA_DIR, `${safeName}.json`);
    if (fs.existsSync(charFile)) {
      try {
        const rawData = fs.readFileSync(charFile, 'utf8');
        let charObj = { name: data.charData.name, stats: { hp: 1000, energy: 1000, synthEnergy: 1000 } };
        if (rawData && rawData.trim() !== '') { try { charObj = JSON.parse(rawData); } catch (e) { logSystem(`[Auto-Repair] Corrupted sync_character data for ${data.charData.name}.`, 'WARN'); } }
        if (data.position && !isNaN(data.position.x) && !isNaN(data.position.y)) charObj.position = data.position;
        if (data.charData.activePowers !== undefined) charObj.activePowers = data.charData.activePowers;
        if (data.charData.powerTray !== undefined) charObj.powerTray = data.charData.powerTray;
        if (data.charData.unseenBadges !== undefined) charObj.unseenBadges = data.charData.unseenBadges;
        if (charObj.currency !== undefined) delete charObj.currency;
        fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2));
      } catch (e) { console.error(`Error syncing character ${data.charData.name}:`, e.message); }
    }
  });

  socket.on('interact_lore', (uuid) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const badge = state.mapBadgesCatalog.find(b => b.uuid === uuid && b.type === 'lore');
    if (badge && (badge.zone || 'untitled') === (player.zone || 'untitled')) {
      const w2 = (badge.width || 32) / 2 + 64;
      const d2 = (badge.depth || 32) / 2 + 64;
      const h2 = (badge.height || 32) / 2 + 64;
      if (Math.abs(player.x - badge.x) <= w2 && Math.abs(player.y - badge.y) <= d2 && Math.abs((player.z || 0) - (badge.z || 0)) <= h2) {
        if (!player.badges) player.badges = [];
        if (!player.badges.includes(badge.badgeId)) {
          player.badges.push(badge.badgeId);
          if (!player.unseenBadges) player.unseenBadges = [];
          if (!player.unseenBadges.includes(badge.badgeId)) player.unseenBadges.push(badge.badgeId);
          io.to(socket.id).emit('badge_obtained', { id: badge.badgeId, name: badge.name }); logSystem(`BADGE: ${player.name} read lore plaque and earned ${badge.name}`);
          const safeName = player.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().toLowerCase(); const charFile = path.join(CHAR_DATA_DIR, `${safeName}.json`);
          if (fs.existsSync(charFile)) { try { const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); charObj.badges = player.badges; charObj.unseenBadges = player.unseenBadges; fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); } catch (e) { } }
        } else { socket.emit('system_dialog', `You have already read this plaque.`); }
      } else { socket.emit('system_dialog', `You are too far away to read this.`); }
    }
  });

  socket.on('dev_load_world', (payload) => {
    if (!payload || typeof payload.filename !== 'string') return;
    const player = activePlayers[socket.id]; if (!player) return; const pName = player.name.toLowerCase(); const perms = permissionsCatalog['dev'] || []; if (!perms.includes('*') && !perms.includes(pName)) return;
    const targetZone = payload.filename.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    const oldZone = player.zone; if (!oldZone || !targetZone) return;
    if (oldZone !== targetZone) { socket.leave(oldZone); socket.join(targetZone); player.zone = targetZone; socket.to(oldZone).emit('player_left', socket.id); socket.to(targetZone).emit('player_joined', player); const playersInZone = {}; for (const id in activePlayers) { if (activePlayers[id].zone === targetZone) playersInZone[id] = activePlayers[id]; } socket.emit('current_players', playersInZone); socket.emit('current_npcs', npcsCatalog.filter(n => (n.zone || 'untitled') === targetZone)); socket.emit('current_spawners', spawnersCatalog.filter(s => (s.zone || 'untitled') === targetZone)); const dronesInZone = {}; for (const id in activeDrones) { if ((activeDrones[id].zone || 'untitled') === targetZone) dronesInZone[id] = activeDrones[id]; } socket.emit('current_drones', dronesInZone); }
    socket.emit('current_map_badges', mapBadgesCatalog.filter(b => (b.zone || 'untitled') === targetZone));
    if (!mapChunks[targetZone]) mapChunks[targetZone] = {}; for (const key in mapChunks[targetZone]) delete mapChunks[targetZone][key];
    const zoneDir = path.join(CHUNKS_DIR, targetZone); if (!fs.existsSync(zoneDir)) fs.mkdirSync(zoneDir, { recursive: true });
    try { fs.readdirSync(zoneDir).forEach(file => { if (file.endsWith('.json')) fs.unlinkSync(path.join(zoneDir, file)); }); } catch (e) { }
    for (const key in payload.data) { const parts = key.split('_'); const localX = parseInt(parts[0], 10); const localY = parseInt(parts[1], 10); const cx = Math.floor(localX / 32); const cy = Math.floor(localY / 32); const chunkId = `chunk_${cx}_${cy}`; if (!mapChunks[targetZone][chunkId]) mapChunks[targetZone][chunkId] = {}; mapChunks[targetZone][chunkId][key] = payload.data[key]; }
    for (const chunkId in mapChunks[targetZone]) { fs.writeFileSync(path.join(zoneDir, `${chunkId}.json`), JSON.stringify(mapChunks[targetZone][chunkId], null, 2)); }
    try { let zoneData = { zones: ['atlas-city'] }; if (fs.existsSync(ZONES_REGISTRY_FILE)) zoneData = JSON.parse(fs.readFileSync(ZONES_REGISTRY_FILE, 'utf8')); if (!zoneData.zones.includes(targetZone)) { zoneData.zones.push(targetZone); fs.writeFileSync(ZONES_REGISTRY_FILE, JSON.stringify(zoneData, null, 2)); } } catch (e) { }
    socket.broadcast.to(targetZone).emit('dev_load_world_broadcast', payload); io.to(targetZone).emit('current_npcs', npcsCatalog.filter(n => n.zone === targetZone));
  });

  socket.on('join_zone', (data) => {
    if (!data || typeof data !== 'object' || typeof data.zone !== 'string') return;
    const targetZone = data.zone.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    const player = activePlayers[socket.id]; if (!player || !targetZone) return;
    const oldZone = player.zone; if (!oldZone) return;
    if (oldZone !== targetZone) { socket.leave(oldZone); socket.join(targetZone); player.zone = targetZone; socket.to(oldZone).emit('player_left', socket.id); socket.to(targetZone).emit('player_joined', player); }
    const playersInZone = {}; for (const id in activePlayers) { if (activePlayers[id].zone === targetZone) playersInZone[id] = activePlayers[id]; }
    socket.emit('current_players', playersInZone); socket.emit('current_npcs', npcsCatalog.filter(n => n.zone === targetZone)); socket.emit('current_spawners', spawnersCatalog.filter(s => s.zone === targetZone)); const dronesInZone = {}; for (const id in activeDrones) { if (activeDrones[id].zone === targetZone) dronesInZone[id] = activeDrones[id]; } socket.emit('current_drones', dronesInZone);
    socket.emit('current_map_badges', mapBadgesCatalog.filter(b => (b.zone || 'untitled') === targetZone));
    socket.emit('current_neighborhoods', state.neighborhoods); socket.emit('current_mob_packs', state.mobPacks); socket.emit('current_npc_templates', state.npcTemplates); socket.emit('current_entity_types', state.entityTypes);
    socket.emit('zones_config_data', state.zonesConfig || {});
    const combinedData = {}; if (mapChunks[targetZone]) { for (let chunkId in mapChunks[targetZone]) { Object.assign(combinedData, mapChunks[targetZone][chunkId]); } } socket.compress(true).emit('full_map_data_received', { data: combinedData, currentZone: targetZone });
    checkZoneBadge(player, targetZone, socket.id);
  });

  socket.on('spawn_fx', (data) => { if (!data) return; socket.broadcast.emit('spawn_fx', { x: Number(data.x) || 0, y: Number(data.y) || 0, z: Number(data.z) || 0, vx: Number(data.vx) || 0, vy: Number(data.vy) || 0, vz: Number(data.vz) || 0, life: Number(data.life) || 1, maxLife: Number(data.maxLife) || 1, crumpleTimer: Number(data.crumpleTimer) || 0, wasteTex: String(data.wasteTex).substring(0, 32), isFX: true, color: data.color ? String(data.color).substring(0, 24) : null, flipX: !!data.flipX }); });

  socket.on('learn_power', async (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) {
      try {
        const charData = JSON.parse(fs.readFileSync(charFile, 'utf8')); const psId = data.powerset; const powerId = data.powerId || data.powerName; const psDef = serverPowersetsById[psId];
        if (psId !== 'inherited' && (!charData.powersets || !charData.powersets.includes(psId))) { logSystem(`LEARN REJECTED: ${player.name} tried to learn power from unowned powerset ${psId}`, "WARN"); return; }
        if (psDef) { const powersList = psDef.Powers || psDef.powers || []; let foundIndex = powersList.findIndex(p => (p.Id || p.id) === powerId || (p.Name || p.name) === powerId); if (foundIndex === -1 && typeof powerId === 'string') { const match = powerId.match(/Rank (\d+)$/); if (match) foundIndex = parseInt(match[1], 10) - 1; } if (foundIndex > 1 && psId !== 'inherited') { const getPowerIdAt = (idx) => { if (powersList[idx]) return powersList[idx].Id || powersList[idx].id || powersList[idx].Name || powersList[idx].name; return `${psDef.Name || psDef.name} Rank ${idx + 1}`; }; const prev1 = getPowerIdAt(foundIndex - 1); const prev2 = getPowerIdAt(foundIndex - 2); if (!charData.powers.includes(prev1) && !charData.powers.includes(prev2)) { logSystem(`LEARN REJECTED: ${player.name} tried to skip sequence to learn ${powerId}`, "WARN"); return; } } }
        if (charData.unspentPowerPicks > 0) {
          if (!charData.powers.includes(powerId)) {
            charData.unspentPowerPicks--; charData.powers.push(powerId); // TODO: This should be handled by the ProgressionSystem
            if (!charData.powerTray) charData.powerTray = charData.powers.filter(p => SERVER_POWER_REGISTRY[p] ? SERVER_POWER_REGISTRY[p].type?.toLowerCase() !== 'passive' : true);
            const pDef = SERVER_POWER_REGISTRY[powerId];
            if (!pDef || pDef.type?.toLowerCase() !== 'passive') { charData.powerTray.push(powerId); } else { if (!charData.activePowers) charData.activePowers = []; if (!charData.activePowers.includes(powerId)) { charData.activePowers.push(powerId); } player.activePowers = charData.activePowers; io.to(socket.id).emit('player_stats_updated', { activePowers: player.activePowers }); const isEquipRobot = powerId === 'equip-robot' || (pDef && pDef.name === 'Equip Robot'); const isUpgradeRobot = powerId === 'upgrade-robot' || powerId === 'upgrade-robots' || (pDef && (pDef.name === 'Upgrade Robot' || pDef.name === 'Upgrade Robots')); const hasUpgradeRobot = player.powers && player.powers.some(pId => pId === 'upgrade-robot' || pId === 'upgrade-robots' || (SERVER_POWER_REGISTRY[pId] && (SERVER_POWER_REGISTRY[pId].name === 'Upgrade Robot' || SERVER_POWER_REGISTRY[pId].name === 'Upgrade Robots'))); const existingDrones = Object.values(activeDrones).filter(d => d.ownerSocketId === socket.id && d.state !== 'dead'); if (isEquipRobot && existingDrones.length === 1) { const droneId = randomUUID(); const newDrone = { uuid: droneId, ownerSocketId: socket.id, ownerName: player.name, x: player.x, y: player.y, z: (player.z || 0) + 220, state: 'idle', dir: 'down', orbitIndex: 1, orbitOffset: Math.PI + (Math.random() * Math.PI), hp: hasUpgradeRobot ? 150 : 100, maxHp: hasUpgradeRobot ? 150 : 100, type: 'drone', isCombatDrone: true, isAssaultDrone: false, isUpgraded: hasUpgradeRobot, zone: player.zone }; activeDrones[droneId] = newDrone; io.to(player.zone).emit('drone_spawned', newDrone); } if (isUpgradeRobot && existingDrones.length === 2) { const droneId = randomUUID(); const newDrone = { uuid: droneId, ownerSocketId: socket.id, ownerName: player.name, x: player.x, y: player.y, z: (player.z || 0) + 220, state: 'idle', dir: 'down', orbitIndex: 2, orbitOffset: Math.PI + (Math.random() * Math.PI), hp: 150, maxHp: 150, type: 'drone', isCombatDrone: false, isAssaultDrone: true, isUpgraded: true, zone: player.zone }; activeDrones[droneId] = newDrone; io.to(player.zone).emit('drone_spawned', newDrone); } if (isUpgradeRobot) { Object.values(activeDrones).filter(d => d.ownerSocketId === socket.id).forEach(d => { d.isUpgraded = true; d.maxHp = 150; d.hp += 50; io.to(d.zone).emit('drones_moved', { [d.uuid]: d }); }); } }
            if (charData.currency !== undefined) delete charData.currency;
            player.powers = charData.powers; fs.writeFileSync(charFile, JSON.stringify(charData, null, 2));
            charData.currency = player.currency;
            io.to(socket.id).emit('player_data_updated', charData); logSystem(`POWER LEARNED: ${player.name} learned ${powerId}`);
          }
        } else { logSystem(`LEARN REJECTED: ${player.name} has no power picks left`, "WARN"); }
      } catch (e) { }
    }
  });

  socket.on('learn_powerset', async (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) {
      try {
        const charData = JSON.parse(fs.readFileSync(charFile, 'utf8')); const psId = data.powerset; const psDef = serverPowersetsById[psId]; if (!psDef) { logSystem(`LEARN REJECTED: Powerset ${psId} does not exist`, "WARN"); return; }
        const integrity = charData.integrity || 0; if (psDef.minIntegrity !== undefined && integrity < psDef.minIntegrity) { logSystem(`LEARN REJECTED: ${player.name} does not meet min integrity for ${psId}`, "WARN"); socket.emit('system_dialog', `You do not meet the minimum Integrity requirements for ${psDef.Name || psId}.`); return; } if (psDef.maxIntegrity !== undefined && integrity > psDef.maxIntegrity) { logSystem(`LEARN REJECTED: ${player.name} does not meet max integrity for ${psId}`, "WARN"); socket.emit('system_dialog', `You exceed the maximum Integrity limits for ${psDef.Name || psId}.`); return; }
        let hasPick = false; if (Array.isArray(charData.unspentPowersetPicks) && charData.unspentPowersetPicks.length > 0) { const psCat = (psDef.category || '').toLowerCase(); const pickIdx = charData.unspentPowersetPicks.findIndex(p => { if (p === 'any') return true; const allowedTypes = p.split('/'); return allowedTypes.some(t => psCat.includes(t) || t.includes(psCat) || psId.toLowerCase().includes(t)); }); if (pickIdx !== -1) { hasPick = true; charData.unspentPowersetPicks.splice(pickIdx, 1); } } else if (typeof charData.unspentPowersetPicks === 'number' && charData.unspentPowersetPicks > 0) { hasPick = true; charData.unspentPowersetPicks--; } // TODO: This should be handled by the ProgressionSystem
        if (hasPick) {
          if (!charData.powersets) charData.powersets = [];
          if (!charData.powersets.includes(psId)) charData.powersets.push(psId);
          if (charData.currency !== undefined) delete charData.currency;
          fs.writeFileSync(charFile, JSON.stringify(charData, null, 2));
          charData.currency = player.currency;
          io.to(socket.id).emit('player_data_updated', charData); logSystem(`POWERSET LEARNED: ${player.name} unlocked ${data.powerset}`);
        } else { logSystem(`LEARN REJECTED: ${player.name} has no valid powerset picks for ${psId}`, "WARN"); }
      } catch (e) { }
    }
  });

  socket.on('inventory_move', async (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const { fromIndex, toIndex } = data; if (fromIndex === undefined || toIndex === undefined) return;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) { try { const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); if (!charObj.inventory) charObj.inventory = []; const temp = charObj.inventory[toIndex]; charObj.inventory[toIndex] = charObj.inventory[fromIndex]; charObj.inventory[fromIndex] = temp || null; fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); } catch (e) { } }
  });

  socket.on('disconnect', async () => {
    const player = activePlayers[socket.id];
    if (player) {
      if (player.friends) { player.friends.forEach(friendName => { const friendId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === friendName.toLowerCase() && id !== socket.id); if (friendId) { io.to(friendId).emit('friend_status_update', { name: player.name, status: 'offline' }); } }); }
      for (let gameId in arcadeQueues) { if (arcadeQueues[gameId] === socket.id) arcadeQueues[gameId] = null; }
      const matchId = playerMatches[socket.id]; if (matchId && arcadeMatches[matchId]) { const match = arcadeMatches[matchId]; const opponent = match.p1 === socket.id ? match.p2 : match.p1; io.to(opponent).emit('arcade_match_ended'); delete playerMatches[match.p1]; delete playerMatches[match.p2]; delete arcadeMatches[matchId]; }
      io.emit('player_left', socket.id);

      try { for (const id in activeDrones) { if (activeDrones[id].ownerSocketId === socket.id) { delete activeDrones[id]; io.emit('drone_despawned', { uuid: id }); } } } catch (err) { }

      try {
        const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
        if (fs.existsSync(charFile)) {
          const rawData = fs.readFileSync(charFile, 'utf8');
          let charObj = { name: player.name, stats: { hp: 1000, energy: 1000, synthEnergy: 1000 } };
          if (rawData && rawData.trim() !== '') { try { charObj = JSON.parse(rawData); } catch (e) { logSystem(`[Auto-Repair] Corrupted disconnect data for ${player.name}.`, 'WARN'); } }
          if (player.x !== undefined && player.y !== undefined && !isNaN(player.x) && !isNaN(player.y)) { charObj.position = { x: player.x, y: player.y, z: player.z }; }
          if (!player.zone) throw new Error("Missing Zone during disconnect save!");
          charObj.zone = player.zone;
          if (charObj.stats) {
            if (player.hp !== undefined && player.hp !== null && !isNaN(player.hp)) charObj.stats.hp = player.hp;
            if (player.energy !== undefined && player.energy !== null && !isNaN(player.energy)) charObj.stats.energy = player.energy;
            if (player.synthEnergy !== undefined && player.synthEnergy !== null && !isNaN(player.synthEnergy)) charObj.stats.synthEnergy = player.synthEnergy;
            if (player.stats && player.stats.pvpKills) charObj.stats.pvpKills = player.stats.pvpKills;
            if (player.stats && player.stats.pveKills) charObj.stats.pveKills = player.stats.pveKills;
          }
          if (player.level !== undefined && !isNaN(player.level)) charObj.level = player.level;
          if (player.experience !== undefined && !isNaN(player.experience)) charObj.experience = player.experience;
          if (player.unspentPowerPicks !== undefined) charObj.unspentPowerPicks = player.unspentPowerPicks;
          if (player.unspentPowersetPicks !== undefined) charObj.unspentPowersetPicks = player.unspentPowersetPicks;
          if (player.badges) charObj.badges = player.badges;
          charObj.lastOnline = Date.now();
          if (player.dayJobProgress) charObj.dayJobProgress = player.dayJobProgress;
          if (player.unseenBadges) charObj.unseenBadges = player.unseenBadges;
          if (player.lastDiscordInvite) charObj.lastDiscordInvite = player.lastDiscordInvite;
          if (player.preAptZone) charObj.preAptZone = player.preAptZone;
          if (player.preAptX !== undefined) charObj.preAptX = player.preAptX;
          if (player.preAptY !== undefined) charObj.preAptY = player.preAptY;
          if (player.preAptZ !== undefined) charObj.preAptZ = player.preAptZ;
          fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2));

          if (player.accountUuid) {
            const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
            if (fs.existsSync(accFile)) {
              try {
                const accData = JSON.parse(fs.readFileSync(accFile, 'utf8'));
                let tLevel = 0;
                if (accData.characters) {
                  accData.characters.forEach(c => {
                    const cName = typeof c === 'object' ? c.name : c;
                    const cF = path.join(CHAR_DATA_DIR, `${cName.toLowerCase()}.json`);
                    if (fs.existsSync(cF)) {
                      try { const co = JSON.parse(fs.readFileSync(cF, 'utf8')); tLevel += (co.level || 1); } catch (e) { }
                    }
                  });
                }
                accData.totalLevel = tLevel;
                fs.writeFileSync(accFile, JSON.stringify(accData, null, 2));
              } catch (e) { }
            }
          }
        }
      } catch (err) { }

      try {
        const index = getIndex(); let accEntry = null;
        if (player.accountUuid) { accEntry = Object.values(index).find(a => a.uuid === player.accountUuid); } else { for (let username in index) { const entry = index[username]; const accFile = path.join(PLAYER_DATA_DIR, `${entry.uuid}.json`); if (fs.existsSync(accFile)) { const accData = JSON.parse(fs.readFileSync(accFile, 'utf8')); if (accData.characters && accData.characters.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === player.name.toLowerCase())) { accEntry = entry; break; } } } }
        if (accEntry && accEntry.isGuest) { const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`); if (fs.existsSync(charFile)) fs.unlinkSync(charFile); const accFile = path.join(PLAYER_DATA_DIR, `${accEntry.uuid}.json`); if (fs.existsSync(accFile)) fs.unlinkSync(accFile); delete index[accEntry.username]; saveIndex(index); logSystem(`GUEST CLEANUP: Purged guest account and character ${player.name}`); }
      } catch (err) { }
      delete activePlayers[socket.id];
    }
  });
};
