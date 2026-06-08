module.exports = function registerSocialSockets(socket, io, state, deps) {
    const { activePlayers } = state;
    const { logSystem, fs, path, PLAYER_DATA_DIR, getIndex } = deps;

    socket.on('chat_message', (data) => {
      const player = activePlayers[socket.id];
      if (player) {
        const payload = { type: data.type, name: player.name, text: data.text };
        if (data.type === 'pm') logSystem(`CHAT [PM to ${data.target}] ${payload.name}: ${payload.text}`);
        else logSystem(`CHAT [${payload.type.toUpperCase()}] ${payload.name}: ${payload.text}`);
        if (data.type === 'local') {
          const radius = 1000;
          for (let id in activePlayers) { if (id !== socket.id) { const p2 = activePlayers[id]; if (Math.hypot(player.x - p2.x, player.y - p2.y) <= radius) { io.to(id).emit('chat_message', payload); } } }
        } else if (data.type === 'pm') {
          let targetId = null; let targetPlayer = null;
          for (let id in activePlayers) { if (activePlayers[id].name.toLowerCase() === data.target.toLowerCase()) { targetId = id; targetPlayer = activePlayers[id]; break; } }
          if (targetId) { io.to(targetId).emit('chat_message', { type: 'pm', name: `From [${player.name}]`, text: data.text }); if (targetPlayer.isAFK) { const afkReply = targetPlayer.afkMessage || `Away from keyboard.`; socket.emit('chat_message', { type: 'system', name: 'System', text: `${targetPlayer.name} is AFK: ${afkReply}` }); } } else { socket.emit('chat_message', { type: 'system', name: 'System', text: `Player ${data.target} not found.` }); }
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
      try { const accepterData = JSON.parse(fs.readFileSync(accepterFile, 'utf8')); if (!accepterData.friends.includes(data.senderName)) { accepterData.friends.push(data.senderName); fs.writeFileSync(accepterFile, JSON.stringify(accepterData, null, 2)); accepter.friends = accepterData.friends; const friendsWithStatus = accepter.friends.map(f => ({ name: f, online: Object.values(activePlayers).some(p => p.name.toLowerCase() === f.toLowerCase()) })); socket.emit('friend_list_updated', friendsWithStatus); } } catch(e) {}
      const senderFile = path.join(PLAYER_DATA_DIR, `${senderInfo.uuid}.json`);
      try { const senderData = JSON.parse(fs.readFileSync(senderFile, 'utf8')); if (!senderData.friends.includes(accepter.name)) { senderData.friends.push(accepter.name); fs.writeFileSync(senderFile, JSON.stringify(senderData, null, 2)); const senderId = Object.keys(activePlayers).find(id => activePlayers[id].name.toLowerCase() === data.senderName.toLowerCase()); if (senderId) { const senderPlayer = activePlayers[senderId]; senderPlayer.friends = senderData.friends; const friendsWithStatus = senderPlayer.friends.map(f => ({ name: f, online: Object.values(activePlayers).some(p => p.name.toLowerCase() === f.toLowerCase()) })); io.to(senderId).emit('friend_list_updated', friendsWithStatus); } } } catch(e) {}
    });

    socket.on('remove_friend', (data) => {
      const remover = activePlayers[socket.id]; if (!remover || !data.friendName) return;
      const removerInfo = Object.values(getIndex()).find(acc => acc.username === remover.name.toLowerCase()); if (!removerInfo) return;
      const removerFile = path.join(PLAYER_DATA_DIR, `${removerInfo.uuid}.json`);
      try { const removerData = JSON.parse(fs.readFileSync(removerFile, 'utf8')); removerData.friends = (removerData.friends || []).filter(f => f.toLowerCase() !== data.friendName.toLowerCase()); fs.writeFileSync(removerFile, JSON.stringify(removerData, null, 2)); remover.friends = removerData.friends; const friendsWithStatus = remover.friends.map(f => ({ name: f, online: Object.values(activePlayers).some(p => p.name.toLowerCase() === f.toLowerCase()) })); socket.emit('friend_list_updated', friendsWithStatus); } catch(e) {}
    });
  };
