module.exports = function registerSocialSockets(socket, io, state, deps) {
  const { activePlayers } = state;
  const { logSystem, fs, path, PLAYER_DATA_DIR, getIndex } = deps;

  socket.on('chat_message', (data) => {
    const player = activePlayers[socket.id];
    if (player) {
      const payload = { type: data.type, name: player.name, text: data.text };
      if (data.type === 'pm') logSystem(`CHAT [PM to ${data.target}] ${payload.name}: ${payload.text}`);
      else logSystem(`CHAT [${payload.type.toUpperCase()}] ${payload.name}: ${payload.text}`);

      if (data.type !== 'pm' && data.text) {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
        if (webhookUrl) {
          const safeText = data.text.replace(/@/g, '');
          const message = {
            username: player.name,
            content: safeText
          };
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          }).catch(err => logSystem(`Discord Chat Relay Error: ${err.message}`, 'WARN'));
        }
      }

      if (data.type === 'local') {
        const radius = 1000;
        for (let id in activePlayers) { if (id !== socket.id) { const p2 = activePlayers[id]; if (Math.hypot(player.x - p2.x, player.y - p2.y) <= radius) { io.to(id).emit('chat_message', payload); } } }
      } else if (data.type === 'pm') {
        let targetId = null; let targetPlayer = null;
        for (let id in activePlayers) { if (activePlayers[id].name.toLowerCase() === data.target.toLowerCase()) { targetId = id; targetPlayer = activePlayers[id]; break; } }
        if (targetId) { io.to(targetId).emit('chat_message', { type: 'pm', name: `From [${player.name}]`, text: data.text }); if (targetPlayer.isAFK) { const afkReply = targetPlayer.afkMessage || `Away from keyboard.`; socket.emit('system_dialog', `${targetPlayer.name} is AFK: ${afkReply}`); } } else { socket.emit('system_dialog', `Player ${data.target} not found.`); }
      } else {
        socket.to(player.zone || 'untitled').emit('chat_message', payload);
      }
    }
  });

  socket.on('player_typing', (data) => {
    if (activePlayers[socket.id]) { activePlayers[socket.id].isTyping = data.isTyping; socket.broadcast.emit('player_typing', { id: socket.id, isTyping: data.isTyping }); }
  });

  socket.on('trade_request', (targetId) => {
    const target = activePlayers[targetId]; const sender = activePlayers[socket.id];
    if (target && sender) { io.to(targetId).emit('trade_request_received', { senderId: socket.id, senderName: sender.name }); }
  });

  socket.on('trade_accept', (requesterId) => {
    io.to(requesterId).emit('trade_started', { partnerId: socket.id, partnerName: activePlayers[socket.id].name }); socket.emit('trade_started', { partnerId: requesterId, partnerName: activePlayers[requesterId].name });
  });

  socket.on('friend_request', (data) => {
    const sender = activePlayers[socket.id]; if (!sender || !data.targetName) return;
    const targetId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === data.targetName.toLowerCase());
    if (targetId) { io.to(targetId).emit('friend_request_received', { senderName: sender.name }); } else { socket.emit('system_dialog', `${data.targetName} is not currently online.`); }
  });

  socket.on('accept_friend_request', (data) => {
    const accepter = activePlayers[socket.id]; if (!accepter || !data.senderName) return;
    const index = getIndex(); const senderInfo = Object.values(index).find(acc => acc.username === data.senderName.toLowerCase()); const accepterInfo = Object.values(index).find(acc => acc.username === accepter.name.toLowerCase());
    if (!senderInfo || !accepterInfo) return;
    const accepterFile = path.join(PLAYER_DATA_DIR, `${accepterInfo.uuid}.json`);
    try { const accepterData = JSON.parse(fs.readFileSync(accepterFile, 'utf8')); if (!accepterData.friends.includes(data.senderName)) { accepterData.friends.push(data.senderName); fs.writeFileSync(accepterFile, JSON.stringify(accepterData, null, 2)); accepter.friends = accepterData.friends; const friendsWithStatus = accepter.friends.map(f => ({ name: f, online: Object.values(activePlayers).some(p => p.name.toLowerCase() === f.toLowerCase()) })); socket.emit('friend_list_updated', friendsWithStatus); } } catch (e) { }
    const senderFile = path.join(PLAYER_DATA_DIR, `${senderInfo.uuid}.json`);
    try { const senderData = JSON.parse(fs.readFileSync(senderFile, 'utf8')); if (!senderData.friends.includes(accepter.name)) { senderData.friends.push(accepter.name); fs.writeFileSync(senderFile, JSON.stringify(senderData, null, 2)); const senderId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === data.senderName.toLowerCase()); if (senderId) { const senderPlayer = activePlayers[senderId]; senderPlayer.friends = senderData.friends; const friendsWithStatus = senderPlayer.friends.map(f => ({ name: f, online: Object.values(activePlayers).some(p => p.name.toLowerCase() === f.toLowerCase()) })); io.to(senderId).emit('friend_list_updated', friendsWithStatus); } } } catch (e) { }
  });

  socket.on('remove_friend', (data) => {
    const remover = activePlayers[socket.id]; if (!remover || !data.friendName) return;
    const removerInfo = Object.values(getIndex()).find(acc => acc.username === remover.name.toLowerCase()); if (!removerInfo) return;
    const removerFile = path.join(PLAYER_DATA_DIR, `${removerInfo.uuid}.json`);
    try { const removerData = JSON.parse(fs.readFileSync(removerFile, 'utf8')); removerData.friends = (removerData.friends || []).filter(f => f.toLowerCase() !== data.friendName.toLowerCase()); fs.writeFileSync(removerFile, JSON.stringify(removerData, null, 2)); remover.friends = removerData.friends; const friendsWithStatus = remover.friends.map(f => ({ name: f, online: Object.values(activePlayers).some(p => p.name.toLowerCase() === f.toLowerCase()) })); socket.emit('friend_list_updated', friendsWithStatus); } catch (e) { }
  });

  socket.on('request_online_players', () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const onlineList = [];
    for (let id in activePlayers) {
      const p = activePlayers[id];
      onlineList.push({ id: id, name: p.name, level: p.level || 1, zone: p.zone || 'untitled', isAFK: p.isAFK });
    }
    socket.emit('online_players_received', onlineList);
  });

  socket.on('discord_invite', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      socket.emit('system_dialog', 'Discord integration is not configured on the server.');
      return;
    }

    if (player.lastDiscordInvite && Date.now() - player.lastDiscordInvite < 3600000) {
      socket.emit('system_dialog', 'You have already sent a Discord invite recently. Please wait before sending another to prevent spam.');
      return;
    }
    player.lastDiscordInvite = Date.now();

    let zoneDisplay = player.zone || 'untitled';
    if (zoneDisplay.startsWith('apt_')) {
      const aptName = zoneDisplay.substring(4);
      zoneDisplay = aptName.charAt(0).toUpperCase() + aptName.slice(1) + "'s Apartment";
    }

    const message = {
      username: "B",
      avatar_url: "https://play.behr.dev/assets/images/logo.png",
      content: `**${player.name}** is looking for players!`,
      embeds: [{
        title: "🎮 Game Invite",
        description: `**${player.name}** (Level ${player.level || 1}) is currently in **${zoneDisplay}** and wants you to join them!\n\nHop into the game to play together at https://play.behr.dev/!`,
        color: 10181046, // Purple-ish (#9b59b6)
        footer: { text: "B-the-game Server" },
        timestamp: new Date().toISOString()
      }]
    };

    try {
      const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      socket.emit('system_dialog', 'Invite successfully sent to Discord!');
    } catch (err) {
      logSystem(`Discord Webhook Error: ${err.message}`, 'WARN');
      socket.emit('system_dialog', 'Failed to send Discord invite. Check server logs.');
    }
  });

  socket.on('apartment_invite', (data) => {
    const sender = activePlayers[socket.id];
    if (!sender || !data.targetName) return;
    const myAptZone = `apt_${sender.name.toLowerCase()}`;

    const targetId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === data.targetName.toLowerCase());
    if (targetId) {
      if (!state.apartmentInvites) state.apartmentInvites = {};
      if (!state.apartmentInvites[myAptZone]) state.apartmentInvites[myAptZone] = [];
      if (!state.apartmentInvites[myAptZone].includes(data.targetName.toLowerCase())) {
        state.apartmentInvites[myAptZone].push(data.targetName.toLowerCase());
      }

      if (!state.zonesConfig[myAptZone]) state.zonesConfig[myAptZone] = {};
      const zc = state.zonesConfig[myAptZone];
      if (zc.isLocked) {
        if (!zc.visitors) zc.visitors = [];
        if (!zc.visitors.includes(data.targetName.toLowerCase())) {
          zc.visitors.push(data.targetName.toLowerCase());
          fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
          io.emit('zones_config_data', state.zonesConfig);
          socket.emit('system_dialog', `Granted temporary visitor access to ${data.targetName} to bypass lock.`);
        }
      }

      io.to(targetId).emit('apartment_invite_received', { senderName: sender.name, senderZone: myAptZone });
      socket.emit('system_dialog', `Apartment invite sent to ${data.targetName}.`);
    } else {
      socket.emit('system_dialog', `${data.targetName} is not currently online.`);
    }
  });

  socket.on('apartment_toggle_builder', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !data.targetName) return;
    const myAptZone = `apt_${player.name.toLowerCase()}`;
    if (player.zone !== myAptZone) return;

    const targetLower = data.targetName.toLowerCase();
    if (!state.zonesConfig[myAptZone]) state.zonesConfig[myAptZone] = {};
    const zc = state.zonesConfig[myAptZone];
    if (!zc.builders) zc.builders = [];

    if (zc.builders.includes(targetLower)) {
      zc.builders = zc.builders.filter(b => b !== targetLower);
      socket.emit('system_dialog', `Revoked build permissions for ${data.targetName}.`);
      const targetId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === targetLower);
      if (targetId) io.to(targetId).emit('system_dialog', `Your build permissions in ${player.name}'s apartment have been revoked.`);
    } else {
      zc.builders.push(targetLower);
      socket.emit('system_dialog', `Granted build permissions to ${data.targetName}.`);
      const targetId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === targetLower);
      if (targetId) io.to(targetId).emit('system_dialog', `You have been granted build permissions in ${player.name}'s apartment! Type /editmode to start.`);
    }
    fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
    io.emit('zones_config_data', state.zonesConfig);
  });

  socket.on('apartment_toggle_lock', () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const myAptZone = `apt_${player.name.toLowerCase()}`;
    if (player.zone !== myAptZone) return;

    if (!state.zonesConfig[myAptZone]) state.zonesConfig[myAptZone] = {};
    const zc = state.zonesConfig[myAptZone];
    zc.isLocked = !zc.isLocked;

    socket.emit('system_dialog', `Apartment is now ${zc.isLocked ? 'Invite Only' : 'Open to Public'}.`);
    fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
    io.emit('zones_config_data', state.zonesConfig);
  });

  socket.on('apartment_toggle_visitor', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !data.targetName) return;
    const myAptZone = `apt_${player.name.toLowerCase()}`;
    if (player.zone !== myAptZone) return;

    const targetLower = data.targetName.toLowerCase();
    if (!state.zonesConfig[myAptZone]) state.zonesConfig[myAptZone] = {};
    const zc = state.zonesConfig[myAptZone];
    if (!zc.visitors) zc.visitors = [];

    if (zc.visitors.includes(targetLower)) {
      zc.visitors = zc.visitors.filter(b => b !== targetLower);
      socket.emit('system_dialog', `Revoked visitor permissions for ${data.targetName}.`);
    } else {
      zc.visitors.push(targetLower);
      socket.emit('system_dialog', `Granted permanent visitor access to ${data.targetName}.`);
    }
    fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
    io.emit('zones_config_data', state.zonesConfig);
  });

  socket.on('apartment_expand', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !player.accountUuid) return;

    const pName = player.name.toLowerCase();
    let myAptZone = `apt_${pName}`;
    let isAdmin = false;
    if (state.permissionsCatalog) {
      isAdmin = ['dev', 'admin'].some(role => {
        const p = state.permissionsCatalog[role] || [];
        return p.includes('*') || p.includes(pName);
      });
    }

    if (isAdmin && player.zone && player.zone.startsWith('apt_')) {
      myAptZone = player.zone;
    }

    const chunkToUnlock = data ? data.chunk : null;
    if (!chunkToUnlock) return; // Discard legacy calls without specific chunk targets

    const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    let accData;
    try {
      accData = JSON.parse(fs.readFileSync(accFile, 'utf8'));
    } catch (e) {
      socket.emit('system_dialog', 'Error reading account data.');
      return;
    }

    const isEditingOwnApt = myAptZone === `apt_${pName}`;
    const actualCost = isEditingOwnApt ? 5000 : 0;

    if ((accData.currency || 0) < actualCost) {
      socket.emit('system_dialog', `You need $${actualCost.toLocaleString()} to expand your apartment.`);
      return;
    }

    if (!state.zonesConfig[myAptZone]) state.zonesConfig[myAptZone] = {};
    const zc = state.zonesConfig[myAptZone];
    if (!zc.ownedChunks) zc.ownedChunks = ['1_1'];

    if (zc.ownedChunks.includes(chunkToUnlock)) {
      socket.emit('system_dialog', 'You already own this chunk!');
      socket.emit('zones_config_data', state.zonesConfig);
      return;
    }

    if (actualCost > 0) {
      accData.currency = (accData.currency || 0) - actualCost;
      player.currency = accData.currency;
      fs.writeFileSync(accFile, JSON.stringify(accData, null, 2));
      socket.emit('currency_updated', { currency: accData.currency });
    }

    zc.ownedChunks.push(chunkToUnlock);
    fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
    io.emit('zones_config_data', state.zonesConfig);

    socket.emit('apartment_expanded');
    socket.emit('system_dialog', isEditingOwnApt ? 'Apartment expanded successfully!' : `Apartment chunk ${chunkToUnlock} granted (Admin).`);
    logSystem(`APARTMENT EXPAND: ${player.name} spent ${actualCost} to unlock chunk ${chunkToUnlock} in ${myAptZone}`);
  });

  socket.on('apartment_unexpand', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !player.accountUuid) return;

    const pName = player.name.toLowerCase();
    let myAptZone = `apt_${pName}`;
    let isAdmin = false;
    if (state.permissionsCatalog) {
      isAdmin = ['dev', 'admin'].some(role => {
        const p = state.permissionsCatalog[role] || [];
        return p.includes('*') || p.includes(pName);
      });
    }

    if (isAdmin && player.zone && player.zone.startsWith('apt_')) {
      myAptZone = player.zone;
    }

    const chunkToLock = data ? data.chunk : null;
    if (!chunkToLock || chunkToLock === '1_1') return;

    const accFile = path.join(PLAYER_DATA_DIR, `${player.accountUuid}.json`);
    let accData;
    try { accData = JSON.parse(fs.readFileSync(accFile, 'utf8')); } catch (e) { return; }

    if (!state.zonesConfig[myAptZone]) return;
    const zc = state.zonesConfig[myAptZone];
    if (!zc.ownedChunks || !zc.ownedChunks.includes(chunkToLock)) return;

    const isEditingOwnApt = myAptZone === `apt_${pName}`;
    const refund = isEditingOwnApt ? 5000 : 0;

    if (refund > 0) {
      accData.currency = (accData.currency || 0) + refund;
      player.currency = accData.currency;
      fs.writeFileSync(accFile, JSON.stringify(accData, null, 2));
      socket.emit('currency_updated', { currency: accData.currency });
    }

    zc.ownedChunks = zc.ownedChunks.filter(c => c !== chunkToLock);
    if (zc.chunkStyles && zc.chunkStyles[chunkToLock]) delete zc.chunkStyles[chunkToLock];

    fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
    io.emit('zones_config_data', state.zonesConfig);

    if (player.zone === myAptZone) {
      const pChunkX = Math.floor((player.x / 32) / 32);
      const pChunkY = Math.floor((player.y / 32) / 32);
      if (`${pChunkX}_${pChunkY}` === chunkToLock) {
        player.x = 48 * 32;
        player.y = 48 * 32;
        player.z = 64;
        socket.emit('force_teleport', { x: player.x, y: player.y, z: player.z, zone: player.zone });
      }
    }

    socket.emit('apartment_expanded');
    socket.emit('system_dialog', isEditingOwnApt ? 'Apartment un-expanded. $5,000 refunded.' : `Apartment chunk ${chunkToLock} removed (Admin).`);
    logSystem(`APARTMENT UN-EXPAND: ${player.name} locked chunk ${chunkToLock} in ${myAptZone} for ${refund} refund`);

    if (state.mapChunks[myAptZone]) {
      const parts = chunkToLock.split('_');
      const cx1 = parseInt(parts[0], 10) * 2, cx2 = cx1 + 1, cy1 = parseInt(parts[1], 10) * 2, cy2 = cy1 + 1;

      ['chunk_' + cx1 + '_' + cy1, 'chunk_' + cx2 + '_' + cy1, 'chunk_' + cx1 + '_' + cy2, 'chunk_' + cx2 + '_' + cy2].forEach(cid => {
        delete state.mapChunks[myAptZone][cid];
        try { fs.unlinkSync(path.join(deps.CHUNKS_DIR, myAptZone, `${cid}.json`)); } catch (e) { }
      });
    }
  });

  socket.on('save_apartment_style', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !player.zone || !player.zone.startsWith('apt_')) return;

    const pName = player.name.toLowerCase();
    let myAptZone = `apt_${pName}`;

    let isAdmin = false;
    if (state.permissionsCatalog) {
      isAdmin = ['dev', 'admin'].some(role => {
        const p = state.permissionsCatalog[role] || [];
        return p.includes('*') || p.includes(pName);
      });
    }

    if (player.zone !== myAptZone && !isAdmin) return;

    const targetZone = player.zone;

    if (!state.zonesConfig[targetZone]) state.zonesConfig[targetZone] = {};
    const zc = state.zonesConfig[targetZone];

    if (data.baseStyle) zc.baseStyle = data.baseStyle;
    if (data.chunkStyles) zc.chunkStyles = data.chunkStyles;

    fs.writeFileSync(deps.ZONES_CONFIG_FILE, JSON.stringify(state.zonesConfig, null, 2));
    io.emit('zones_config_data', state.zonesConfig);
  });

  socket.on('apartment_kick', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !data.targetName) return;
    const myAptZone = `apt_${player.name.toLowerCase()}`;
    if (player.zone !== myAptZone) return;

    const targetId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === data.targetName.toLowerCase());
    if (targetId) {
      const targetPlayer = activePlayers[targetId];
      if (targetPlayer.zone === myAptZone) {
        const pNameLower = targetPlayer.name.toLowerCase();
        const adminPerms = state.permissionsCatalog['admin'] || [];
        if (adminPerms.includes('*') || adminPerms.includes(pNameLower)) {
          socket.emit('system_dialog', `You cannot kick an Administrator.`);
          return;
        }
        io.to(targetId).emit('force_teleport', { zone: 'atlas-city', x: 8192, y: 8192, z: 0 });
        socket.emit('system_dialog', `Kicked ${data.targetName} from your apartment.`);
        io.to(targetId).emit('system_dialog', `You were kicked from ${player.name}'s apartment.`);
      }
    }
  });

  socket.on('apartment_kick_all', () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const myAptZone = `apt_${player.name.toLowerCase()}`;
    if (player.zone !== myAptZone) return;

    let kickedCount = 0;
    const adminPerms = state.permissionsCatalog['admin'] || [];

    for (let id in activePlayers) {
      if (id === socket.id) continue;
      const targetPlayer = activePlayers[id];
      if (targetPlayer.zone === myAptZone) {
        const pNameLower = targetPlayer.name.toLowerCase();
        if (adminPerms.includes('*') || adminPerms.includes(pNameLower)) {
          continue; // Skip kicking administrators
        }
        io.to(id).emit('force_teleport', { zone: 'atlas-city', x: 8192, y: 8192, z: 0 });
        io.to(id).emit('system_dialog', `You were kicked from ${player.name}'s apartment.`);
        kickedCount++;
      }
    }
    if (kickedCount > 0) {
      socket.emit('system_dialog', `Kicked ${kickedCount} guest(s) from your apartment.`);
    } else {
      socket.emit('system_dialog', `No eligible guests to kick.`);
    }
  });

  socket.on('leave_apartment', () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!player.zone || !player.zone.startsWith('apt_')) return;

    const targetZone = player.preAptZone && !player.preAptZone.startsWith('apt_') ? player.preAptZone : 'atlas-city';
    const targetX = player.preAptX !== undefined ? player.preAptX : 8192;
    const targetY = player.preAptY !== undefined ? player.preAptY : 8192;
    const targetZ = player.preAptZ !== undefined ? player.preAptZ : 0;

    io.to(socket.id).emit('force_teleport', { zone: targetZone, x: targetX, y: targetY, z: targetZ });
    socket.emit('system_dialog', `Returning to ${targetZone}...`);
  });
};
