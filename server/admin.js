module.exports = function registerAdminSockets(socket, io, state, deps) {
  const { activePlayers, permissionsCatalog, npcsCatalog, spawnersCatalog, npcTemplates } = state;
  const { logSystem, fs, path, randomUUID, PLAYER_DATA_DIR, CHAR_DATA_DIR, NPCS_INDEX, SPAWNERS_INDEX, PERMISSIONS_INDEX, ENTITY_GROUPS_FILE, reloadServerData, getIndex, ProgressionSystem } = deps;

  socket.on('admin_teleport', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const pName = player.name.toLowerCase();
    const perms = permissionsCatalog['tp'] || [];
    if (!perms.includes('*') && !perms.includes(pName)) { logSystem(`UNAUTHORIZED TELEPORT ATTEMPT: ${pName}`, "WARN"); return; }

    const targetLower = data.targetName.toLowerCase();
    let targetSocketId = null;
    for (let id in activePlayers) { if (activePlayers[id].name.toLowerCase() === targetLower) { targetSocketId = id; break; } }
    if (targetSocketId) {
      const maxMapSize = 511 * 32;
      const clampedX = Math.max(0, Math.min(data.x, maxMapSize));
      const clampedY = Math.max(0, Math.min(data.y, maxMapSize));
      io.to(targetSocketId).emit('force_teleport', { x: clampedX, y: clampedY, z: data.z });
      logSystem(`ADMIN TELEPORT: ${player.name} teleported ${data.targetName} to X:${clampedX}, Y:${clampedY}, Z:${data.z !== undefined ? data.z : 'Top Z'}`);
    }
  });

  socket.on('request_all_players', () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const pName = player.name.toLowerCase();
    const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) return;
    const allChars = []; const onlinePlayersMap = {};
    for (const id in activePlayers) onlinePlayersMap[activePlayers[id].name.toLowerCase()] = activePlayers[id];
    const charToAccountMap = {}; const index = getIndex();
    for (const username in index) {
      const entry = index[username]; const playerFile = path.join(PLAYER_DATA_DIR, `${entry.uuid}.json`);
      if (fs.existsSync(playerFile)) {
        try { const pd = JSON.parse(fs.readFileSync(playerFile, 'utf8')); if (pd.characters) { pd.characters.forEach(c => { const cName = typeof c === 'object' ? c.name : c; charToAccountMap[cName.toLowerCase()] = entry.uuid; }); } } catch (e) { }
      }
    }
    if (fs.existsSync(CHAR_DATA_DIR)) {
      const files = fs.readdirSync(CHAR_DATA_DIR);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const charObj = JSON.parse(fs.readFileSync(path.join(CHAR_DATA_DIR, file), 'utf8'));
            const activeP = onlinePlayersMap[charObj.name.toLowerCase()];
            allChars.push({ name: charObj.name, level: charObj.level || 1, alignment: charObj.alignment || 'Neutral', race: charObj.race || 'Human', integrity: charObj.integrity || 0, online: !!activeP, zone: activeP ? (activeP.zone || 'untitled') : (charObj.zone || 'untitled'), x: charObj.position ? charObj.position.x : 0, y: charObj.position ? charObj.position.y : 0, z: charObj.position ? charObj.position.z : 0, hp: charObj.stats ? charObj.stats.hp : 1000, maxHp: charObj.stats ? charObj.stats.maxHp : 1000, accountUuid: charToAccountMap[charObj.name.toLowerCase()] || null });
          } catch (e) { }
        }
      });
    }
    socket.emit('all_players_received', allChars);
  });

  socket.on('request_player_data', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const pName = player.name.toLowerCase();
    const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) { logSystem(`UNAUTHORIZED PLAYER DATA REQUEST: ${pName}`, "WARN"); return; }
    if (!data.targetName) return;
    const charFile = path.join(CHAR_DATA_DIR, `${data.targetName.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) {
      try {
        const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8'));
        const index = getIndex(); let accountUsername = 'N/A';
        for (const username in index) {
          const accountUUID = index[username].uuid; const playerFile = path.join(PLAYER_DATA_DIR, `${accountUUID}.json`);
          if (fs.existsSync(playerFile)) {
            try { const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8')); if (playerData.characters && playerData.characters.some(c => (typeof c === 'object' ? c.name : c).toLowerCase() === data.targetName.toLowerCase())) { accountUsername = username; charObj.accountUuid = accountUUID; break; } } catch (e) { }
          }
        }
        charObj.accountUsername = accountUsername;
        socket.emit('player_data_received', charObj);
      } catch (e) { socket.emit('system_dialog', `Character ${data.targetName} file is corrupted.`); }
    } else { socket.emit('system_dialog', `Character ${data.targetName} not found.`); }
  });

  socket.on('admin_update_player', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const pName = player.name.toLowerCase();
    const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) { logSystem(`UNAUTHORIZED ADMIN PLAYER UPDATE: ${pName}`, "WARN"); return; }
    if (!data.targetName || !data.updates) return;
    const targetNameLower = data.targetName.toLowerCase();
    const charFile = path.join(CHAR_DATA_DIR, `${targetNameLower}.json`);
    if (fs.existsSync(charFile)) {
      try {
        const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8'));
        if (data.updates.level !== undefined) charObj.level = data.updates.level;
        if (data.updates.integrity !== undefined) charObj.integrity = data.updates.integrity;
        if (data.updates.currency !== undefined) charObj.currency = data.updates.currency;
        if (data.updates.unspentPowerPicks !== undefined) charObj.unspentPowerPicks = data.updates.unspentPowerPicks;
        if (data.updates.unspentPowersetPicks !== undefined) charObj.unspentPowersetPicks = data.updates.unspentPowersetPicks;
        if (data.updates.powers) charObj.powers = data.updates.powers;
        if (data.updates.powersets) charObj.powersets = data.updates.powersets;
        if (!charObj.stats) charObj.stats = {};
        if (data.updates.maxHp !== undefined) charObj.stats.maxHp = data.updates.maxHp;
        if (data.updates.maxEnergy !== undefined) charObj.stats.maxEnergy = data.updates.maxEnergy;
        if (data.updates.maxSynthEnergy !== undefined) charObj.stats.maxSynthEnergy = data.updates.maxSynthEnergy;

        const index = getIndex();
        for (const username in index) {
          const playerFile = path.join(PLAYER_DATA_DIR, `${index[username].uuid}.json`);
          if (fs.existsSync(playerFile)) {
            const accData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
            if (accData.characters && accData.characters.some(c => (typeof c === 'object' ? c.name : c).toLowerCase() === targetNameLower)) {
              accData.characters.forEach(c => { if (typeof c === 'object' && c.name.toLowerCase() === targetNameLower) c.level = charObj.level; });
              ProgressionSystem.recalculateAccountTotalLevel(accData); fs.writeFileSync(playerFile, JSON.stringify(accData, null, 2)); break;
            }
          }
        }
        fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); logSystem(`ADMIN UPDATED PLAYER: ${pName} modified ${targetNameLower}`); socket.emit('system_dialog', `Successfully updated ${data.targetName}.`);
        let targetSocketId = null; for (let id in activePlayers) { if (activePlayers[id].name.toLowerCase() === targetNameLower) { targetSocketId = id; break; } }
        if (targetSocketId) { io.to(targetSocketId).emit('player_data_updated', charObj); }
      } catch (e) { socket.emit('system_dialog', `Character ${data.targetName} file is corrupted.`); }
    }
  });

  socket.on('admin_grant_permission', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const devPerms = permissionsCatalog['dev'] || [];
    if (!devPerms.includes('*') && !devPerms.includes(pName)) { logSystem(`UNAUTHORIZED PERMISSION EDIT: ${pName}`, "WARN"); return; }
    const targetName = data.targetName.toLowerCase(); const permNode = data.permission.toLowerCase();
    if (!permissionsCatalog[permNode]) permissionsCatalog[permNode] = [];
    if (data.revoke) { permissionsCatalog[permNode] = permissionsCatalog[permNode].filter(n => n !== targetName); logSystem(`PERMISSION REVOKED: ${player.name} revoked '${permNode}' from ${data.targetName}`); socket.emit('system_dialog', `Revoked '${permNode}' from ${data.targetName}.`); }
    else { if (!permissionsCatalog[permNode].includes(targetName)) { permissionsCatalog[permNode].push(targetName); } logSystem(`PERMISSION GRANTED: ${player.name} granted '${permNode}' to ${data.targetName}`); socket.emit('system_dialog', `Granted '${permNode}' to ${data.targetName}.`); }
    fs.writeFileSync(PERMISSIONS_INDEX, JSON.stringify(permissionsCatalog, null, 2)); io.emit('server_permissions', permissionsCatalog);
  });

  socket.on('admin_request_all_accounts', () => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) return;
    const allAccounts = []; const index = getIndex();
    for (const username in index) {
      const entry = index[username]; const accountFile = path.join(PLAYER_DATA_DIR, `${entry.uuid}.json`);
      if (fs.existsSync(accountFile)) { try { const accData = JSON.parse(fs.readFileSync(accountFile, 'utf8')); allAccounts.push({ uuid: entry.uuid, username: entry.username, email: entry.email, lastIp: accData.lastIp || 'Unknown', created: accData.created || 0, isBanned: !!accData.isBanned, banReason: accData.banReason, characters: accData.characters || [] }); } catch (e) { } }
    }
    socket.emit('all_accounts_received', allAccounts);
  });

  socket.on('admin_request_account', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) return;
    let uuid = data.uuid; const index = getIndex();
    if (data.username) { const lowerUser = data.username.toLowerCase(); const entry = Object.values(index).find(a => a.username === lowerUser); if (entry) { uuid = entry.uuid; } else { socket.emit('system_dialog', `Account '${data.username}' not found.`); return; } }
    if (!uuid) return;
    const accountFile = path.join(PLAYER_DATA_DIR, `${uuid}.json`);
    if (fs.existsSync(accountFile)) { try { const accData = JSON.parse(fs.readFileSync(accountFile, 'utf8')); const indexEntry = Object.values(index).find(a => a.uuid === data.uuid); accData.email = indexEntry ? indexEntry.email : 'N/A'; socket.emit('admin_account_data_received', accData); } catch (e) { } }
  });

  socket.on('admin_update_account', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) return;
    const accountFile = path.join(PLAYER_DATA_DIR, `${data.uuid}.json`);
    if (fs.existsSync(accountFile)) {
      try {
        const accData = JSON.parse(fs.readFileSync(accountFile, 'utf8')); if (data.isBanned !== undefined) accData.isBanned = data.isBanned; if (data.banReason !== undefined) accData.banReason = data.banReason; fs.writeFileSync(accountFile, JSON.stringify(accData, null, 2)); logSystem(`ADMIN UPDATED ACCOUNT: ${player.name} modified ${data.uuid} (Banned: ${accData.isBanned})`); socket.emit('system_dialog', `Successfully updated account.`);
        if (accData.isBanned) { for (let id in activePlayers) { if (activePlayers[id].accountUuid === data.uuid) { const targetSocket = io.sockets.sockets.get(id); if (targetSocket) targetSocket.disconnect(true); } } }
      } catch (e) { }
    }
  });

  socket.on('admin_kick_player', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['playermanager'] || []; const devPerms = permissionsCatalog['dev'] || [];
    if (!perms.includes('*') && !perms.includes(pName) && !devPerms.includes('*') && !devPerms.includes(pName)) return;
    const targetNameLower = data.targetName.toLowerCase();
    for (let id in activePlayers) { if (activePlayers[id].name.toLowerCase() === targetNameLower) { const targetSocket = io.sockets.sockets.get(id); if (targetSocket) targetSocket.disconnect(true); logSystem(`ADMIN KICKED PLAYER: ${player.name} kicked ${data.targetName}`); socket.emit('system_dialog', `Kicked ${data.targetName}.`); break; } }
  });

  socket.on('log_command', (data) => {
    const player = activePlayers[socket.id];
    if (player && data.command) {
      logSystem(`COMMAND [${player.name}]: ${data.command}`);
      const cmdLower = data.command.trim().toLowerCase();
      if (cmdLower === '/forceupdate' || cmdLower.startsWith('/reload')) {
        const pName = player.name.toLowerCase(); const perms = permissionsCatalog['reload'] || ["*"];
        if (perms.includes('*') || perms.includes(pName)) { logSystem(`GLOBAL RELOAD TRIGGERED BY ${player.name}`, "SYSTEM"); reloadServerData(); io.emit('force_refresh'); } else { logSystem(`UNAUTHORIZED RELOAD ATTEMPT: ${player.name}`, "WARN"); }
      } else if (cmdLower.startsWith('/announce ')) {
        const pName = player.name.toLowerCase(); const perms = permissionsCatalog['dev'] || [];
        if (perms.includes('*') || perms.includes(pName)) { const announcement = data.command.substring(10).trim(); logSystem(`ANNOUNCEMENT BY ${player.name}: ${announcement}`, "SYSTEM"); io.emit('server_announcement', announcement); } else { logSystem(`UNAUTHORIZED ANNOUNCE ATTEMPT: ${player.name}`, "WARN"); }
      } else if (cmdLower.startsWith('/weather ')) {
        const pName = player.name.toLowerCase(); const perms = permissionsCatalog['dev'] || [];
        if (perms.includes('*') || perms.includes(pName)) { const wType = data.command.substring(9).trim().toLowerCase(); if (['clear', 'rain', 'snow'].includes(wType)) { state.globalWeather = wType; io.emit('weather_update', state.globalWeather); logSystem(`WEATHER CHANGED TO ${wType.toUpperCase()} BY ${player.name}`, "SYSTEM"); } } else { logSystem(`UNAUTHORIZED WEATHER ATTEMPT: ${player.name}`, "WARN"); }
      } else if (cmdLower === '/afk' || cmdLower.startsWith('/afk ')) {
        const msgBody = data.command.substring(4).trim(); player.isAFK = true; player.afkMessage = msgBody || 'Away from keyboard.'; logSystem(`${player.name} went AFK: ${player.afkMessage}`);
      }
    }
  });

  socket.on('dev_give_money', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['dev'] || []; if (!perms.includes('*') && !perms.includes(pName)) return;
    const amount = parseInt(data.amount, 10); if (isNaN(amount)) return;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) { try { const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); charObj.currency = (charObj.currency || 0) + amount; fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); socket.emit('currency_updated', { currency: charObj.currency }); } catch (e) { } }
  });

  socket.on('dev_set_level', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['dev'] || []; if (!perms.includes('*') && !perms.includes(pName)) return;
    const newLevel = parseInt(data.level, 10); if (isNaN(newLevel) || newLevel < 1) return;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) {
      try {
        const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); const oldLevel = charObj.level || 1;
        if (newLevel > oldLevel) { for (let l = oldLevel + 1; l <= newLevel; l++) { if (l % 2 === 0) { charObj.unspentPowerPicks = (charObj.unspentPowerPicks || 0) + 1; } if (l % 10 === 0) { if (Array.isArray(charObj.unspentPowersetPicks)) { charObj.unspentPowersetPicks.push("any"); } else { charObj.unspentPowersetPicks = (charObj.unspentPowersetPicks || 0) + 1; } } } }
        charObj.level = newLevel; player.level = newLevel;
        if (player.accountUuid) { const playerFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`); if (fs.existsSync(playerFile)) { const accData = JSON.parse(fs.readFileSync(playerFile, 'utf8')); accData.characters.forEach(c => { if (typeof c === 'object' && c.name === player.name) c.level = newLevel; }); ProgressionSystem.recalculateAccountTotalLevel(accData); fs.writeFileSync(playerFile, JSON.stringify(accData, null, 2)); } }
        fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); socket.emit('player_data_updated', charObj);
      } catch (e) { }
    }
  });

  socket.on('dev_set_integrity', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['dev'] || []; if (!perms.includes('*') && !perms.includes(pName)) return;
    const newIntegrity = parseInt(data.integrity, 10); if (isNaN(newIntegrity) || newIntegrity < -100 || newIntegrity > 100) return;
    const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) { try { const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); charObj.integrity = newIntegrity; player.integrity = newIntegrity; fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); socket.emit('player_data_updated', charObj); } catch (e) { } }
  });

  socket.on('create_npc', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const newNpc = { uuid: randomUUID(), name: data.name, x: data.x, y: data.y, maxHp: data.maxHp, hp: data.maxHp, state: 'idle', type: data.type || 'generic', group: data.group || 'Civilian', aggroRadius: data.aggroRadius !== undefined ? data.aggroRadius : 500, patrolRoute: data.patrolRoute || '', notes: data.notes || '', dir: data.dir || 'down', zone: player.zone || 'untitled', speedVariant: 0.9 + Math.random() * 0.2 };
    npcsCatalog.push(newNpc); fs.writeFileSync(NPCS_INDEX, JSON.stringify(npcsCatalog, null, 2)); io.to(player.zone || 'untitled').emit('npc_spawned', newNpc); logSystem(`NPC CREATED: ${newNpc.name} [${newNpc.uuid}] at ${newNpc.x}, ${newNpc.y}`);
  });

  socket.on('delete_npc', (uuid) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['npc'] || []; if (!perms.includes('*') && !perms.includes(pName)) { logSystem(`UNAUTHORIZED DELETE NPC ATTEMPT: ${pName}`, "WARN"); return; }
    const idx = npcsCatalog.findIndex(n => n.uuid === uuid);
    if (idx !== -1) { const deletedName = npcsCatalog[idx].name; const zone = npcsCatalog[idx].zone || 'untitled'; npcsCatalog.splice(idx, 1); fs.writeFileSync(NPCS_INDEX, JSON.stringify(npcsCatalog, null, 2)); io.to(zone).emit('npc_deleted', uuid); logSystem(`NPC DELETED: ${deletedName} [${uuid}] by ${player.name}`); }
  });

  socket.on('edit_npc', (data) => {
    const { uuid, updates } = data; const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const perms = permissionsCatalog['npc'] || []; if (!perms.includes('*') && !perms.includes(pName)) { logSystem(`UNAUTHORIZED EDIT NPC ATTEMPT: ${pName}`, "WARN"); return; }
    const idx = npcsCatalog.findIndex(n => n.uuid === uuid);
    if (idx !== -1) { const zone = npcsCatalog[idx].zone || 'untitled'; Object.assign(npcsCatalog[idx], updates); fs.writeFileSync(NPCS_INDEX, JSON.stringify(npcsCatalog, null, 2)); io.to(zone).emit('npc_updated', npcsCatalog[idx]); logSystem(`NPC UPDATED: ${npcsCatalog[idx].name} [${uuid}] by ${player.name}`); }
  });

  socket.on('create_spawner', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const newSpawner = { uuid: randomUUID(), name: data.name || 'New Spawner', x: data.x, y: data.y, z: data.z || 0, zone: player.zone || 'untitled', radius: data.radius || 300, maxActive: data.maxActive !== undefined ? data.maxActive : 0, respawnRate: data.respawnRate || 10, npcName: data.npcName || 'New NPC', npcGroup: data.npcGroup || 'Civilian', npcType: data.npcType || 'none', levelMin: data.levelMin || 1, levelMax: data.levelMax || 1, strength: data.strength || 0, aggroRadius: data.aggroRadius || 500, patrolRoute: data.patrolRoute || '' };
    spawnersCatalog.push(newSpawner); fs.writeFileSync(SPAWNERS_INDEX, JSON.stringify(spawnersCatalog, null, 2)); io.to(player.zone || 'untitled').emit('spawner_spawned', newSpawner); logSystem(`SPAWNER CREATED: ${newSpawner.name} by ${player.name}`);
  });

  socket.on('delete_spawner', (uuid) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const idx = spawnersCatalog.findIndex(s => s.uuid === uuid);
    if (idx !== -1) { const zone = spawnersCatalog[idx].zone || 'untitled'; spawnersCatalog.splice(idx, 1); fs.writeFileSync(SPAWNERS_INDEX, JSON.stringify(spawnersCatalog, null, 2)); io.to(zone).emit('spawner_deleted', uuid); logSystem(`SPAWNER DELETED: [${uuid}] by ${player.name}`); }
  });

  socket.on('edit_spawner', (data) => {
    const { uuid, updates } = data; const player = activePlayers[socket.id]; if (!player) return;
    const idx = spawnersCatalog.findIndex(s => s.uuid === uuid);
    if (idx !== -1) { const zone = spawnersCatalog[idx].zone || 'untitled'; Object.assign(spawnersCatalog[idx], updates); fs.writeFileSync(SPAWNERS_INDEX, JSON.stringify(spawnersCatalog, null, 2)); io.to(zone).emit('spawner_updated', spawnersCatalog[idx]); logSystem(`SPAWNER UPDATED: [${uuid}] by ${player.name}`); }
  });

  socket.on('request_entity_groups', () => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const devPerms = permissionsCatalog['dev'] || [];
    if (devPerms.includes('*') || devPerms.includes(pName)) { socket.emit('entity_groups_data', state.entityGroups); }
  });

  socket.on('save_entity_group', (data) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const devPerms = permissionsCatalog['dev'] || [];
    if (devPerms.includes('*') || devPerms.includes(pName)) {
      state.entityGroups[data.group] = data.settings; fs.writeFileSync(ENTITY_GROUPS_FILE, JSON.stringify(state.entityGroups, null, 2)); io.emit('entity_groups_data', state.entityGroups); logSystem(`ENTITY GROUP UPDATED: ${player.name} modified ${data.group}`);
    }
  });

  socket.on('request_neighborhoods', () => {
    const player = activePlayers[socket.id]; if (!player) return;
    socket.emit('current_neighborhoods', state.neighborhoods);
  });

  socket.on('save_neighborhood', (payload) => {
    const player = activePlayers[socket.id]; if (!player) return;
    state.neighborhoods[payload.id] = payload;
    fs.writeFileSync(deps.NEIGHBORHOODS_FILE, JSON.stringify(state.neighborhoods, null, 2));
    io.emit('current_neighborhoods', state.neighborhoods);
  });

  socket.on('delete_neighborhood', (id) => {
    const player = activePlayers[socket.id]; if (!player) return;
    delete state.neighborhoods[id];
    fs.writeFileSync(deps.NEIGHBORHOODS_FILE, JSON.stringify(state.neighborhoods, null, 2));
    io.emit('current_neighborhoods', state.neighborhoods);
  });

  socket.on('request_mob_packs', () => {
    socket.emit('current_mob_packs', state.mobPacks);
  });

  socket.on('save_mob_pack', (payload) => {
    state.mobPacks[payload.id] = payload.data;
    fs.writeFileSync(deps.MOB_PACKS_FILE, JSON.stringify(state.mobPacks, null, 2));
  });

  socket.on('delete_mob_pack', (id) => {
    delete state.mobPacks[id];
    fs.writeFileSync(deps.MOB_PACKS_FILE, JSON.stringify(state.mobPacks, null, 2));
  });

  socket.on('request_npc_templates', () => {
    socket.emit('current_npc_templates', state.npcTemplates);
  });

  socket.on('save_npc_template', (payload) => {
    state.npcTemplates[payload.id] = payload.data;
    fs.writeFileSync(deps.NPC_TEMPLATES_FILE, JSON.stringify(state.npcTemplates, null, 2));
    io.emit('current_npc_templates', state.npcTemplates);
  });

  socket.on('delete_npc_template', (id) => {
    delete state.npcTemplates[id];
    fs.writeFileSync(deps.NPC_TEMPLATES_FILE, JSON.stringify(state.npcTemplates, null, 2));
    io.emit('current_npc_templates', state.npcTemplates);
  });

  socket.on('request_entity_types', () => {
    socket.emit('current_entity_types', state.entityTypes);
  });

  socket.on('save_entity_type', (payload) => {
    state.entityTypes[payload.id] = payload.data;
    fs.writeFileSync(deps.ENTITY_TYPES_FILE, JSON.stringify(state.entityTypes, null, 2));
    io.emit('current_entity_types', state.entityTypes);
  });

  socket.on('delete_entity_type', (id) => {
    delete state.entityTypes[id];
    fs.writeFileSync(deps.ENTITY_TYPES_FILE, JSON.stringify(state.entityTypes, null, 2));
    io.emit('current_entity_types', state.entityTypes);
  });

  socket.on('wipe_spawner_npcs', (spawnerUuid) => {
    const player = activePlayers[socket.id]; if (!player) return;
    const pName = player.name.toLowerCase(); const devPerms = permissionsCatalog['dev'] || [];
    if (!devPerms.includes('*') && !devPerms.includes(pName)) return;
    for (let i = npcsCatalog.length - 1; i >= 0; i--) {
      if (npcsCatalog[i].spawnerUuid === spawnerUuid) {
        const uuid = npcsCatalog[i].uuid;
        const zone = npcsCatalog[i].zone || 'untitled';
        npcsCatalog.splice(i, 1);
        io.to(zone).emit('npc_deleted', uuid);
      }
    }
  });
};
