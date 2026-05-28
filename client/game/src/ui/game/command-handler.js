export class CommandHandler {
  constructor(engine, chatManager) {
    this.engine = engine;
    this.chat = chatManager;
  }

  handleTabComplete(val) {
    let matches = [];
    if (val.startsWith('/') && !val.includes(' ')) {
      const cmds = ['/teleport', '/tp', '/tpo', '/teleport-other', '/speed', '/stuck', '/editmode', '/reload', '/dev', '/npc', '/players', '/pm', '/time', '/patchnotes', '/news', '/announce', '/weather', '/afk', '/givemoney', '/level'];
      matches = cmds.filter(c => c.startsWith(val.toLowerCase()));
    } else if (val.toLowerCase().startsWith('/tp ') || val.toLowerCase().startsWith('/teleport ')) {
    } else if (val.toLowerCase().startsWith('/tpo ') || val.toLowerCase().startsWith('/teleport-other ') || val.toLowerCase().startsWith('/pm ') || val.toLowerCase().startsWith('/w ') || val.toLowerCase().startsWith('/whisper ')) {
      const spaceIdx = val.indexOf(' ');
      const prefix = val.substring(spaceIdx + 1).toLowerCase();
      const cmdPrefix = val.substring(0, spaceIdx + 1);
      const names = Object.values(this.engine.otherPlayers).map(p => p.name);
      matches = names.filter(n => n.toLowerCase().startsWith(prefix)).map(n => cmdPrefix + n);
    }
    return matches;
  }

  processCommand(msg) {
    const args = msg.split(' ');
    const cmd = args[0].toLowerCase();
    const eng = this.engine;
    const pName = eng.playerData.name ? eng.playerData.name.toLowerCase() : '';

    eng.network.sendLogCommand(msg);

    const checkPerm = (commandName) => {
      const perms = eng.permissions || {};
      const allowed = perms[commandName];
      if (!allowed) return false;
      if (allowed.includes('*')) return true;
      return allowed.includes(pName);
    };

    if (cmd === '/tp' || cmd === '/teleport') {
      if (!checkPerm('tp')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /tp.');
      if (args.length >= 3) {
        const x = parseFloat(args[1]);
        const y = parseFloat(args[2]);
        const z = args.length >= 4 ? parseFloat(args[3]) : undefined;
        eng.network.sendAdminTeleport({ targetName: eng.playerData.name, x, y, z });
        this.chat.addMessage('system', 'System', `Teleport request sent to server.`);
      } else {
        this.chat.addMessage('system', 'System', 'Usage: /tp <x> <y> [z]');
      }
    } else if (cmd === '/tpo' || cmd === '/teleport-other') {
      if (!checkPerm('tp')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /tpo.');
      if (args.length >= 4) {
        const targetName = args[1];
        const x = parseFloat(args[2]);
        const y = parseFloat(args[3]);
        const z = args.length >= 5 ? parseFloat(args[4]) : undefined;
        eng.network.sendAdminTeleport({ targetName, x, y, z });
        this.chat.addMessage('system', 'System', `Requested teleport for ${targetName}.`);
      } else {
        this.chat.addMessage('system', 'System', 'Usage: /tpo <player> <x> <y> [z]');
      }
    } else if (cmd === '/speed') {
      if (!checkPerm('speed')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /speed.');
      eng.player.speed = parseFloat(args[1]) || eng.player.speed;
      eng.player.runSpeed = eng.player.speed * 2.25;
      this.chat.addMessage('system', 'System', `Speed set to ${eng.player.speed}`);
    } else if (cmd === '/stuck') {
      let found = false;
      const maxMapSize = 511 * 32;
      let startX = Math.max(0, Math.min(eng.player.x, maxMapSize));
      let startY = Math.max(0, Math.min(eng.player.y, maxMapSize));

      for (let r = 0; r <= 15; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            let checkX = startX + dx * 32;
            let checkY = startY + dy * 32;

            if (checkX < 0 || checkX > maxMapSize || checkY < 0 || checkY > maxMapSize) continue;

            let checkZ = eng.getTerrainZ(checkX, checkY);
            if (checkZ > -96 && !eng.checkCollision(checkX, checkY, checkZ)) {
              eng.player.x = checkX; eng.player.y = checkY; eng.player.z = checkZ;
              eng.camera.x = checkX; eng.camera.y = checkY;
              found = true; break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      if (!found) {
        eng.player.x = startX; eng.player.y = startY;
        eng.player.z = eng.getTerrainZ(startX, startY) + 32;
        eng.camera.x = startX; eng.camera.y = startY;
      }

      this.chat.addMessage('system', 'System', 'Nudged out of stuck position.');
    } else if (cmd === '/editmode') {
      if (!checkPerm('editmode')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /editmode.');
      eng.editMode = !eng.editMode;
      if (eng.renderer) eng.renderer.needsVoxelUpdate = true;
      const bPanel = document.getElementById('builder-panel');
      const bHotbar = document.getElementById('builder-hotbar');
      const bObjLib = document.getElementById('object-library-panel');
      if (bPanel) {
        bPanel.style.display = eng.editMode ? 'flex' : 'none';
        if (eng.editMode) {
          if (eng.clientSettings.lockBuilderPanel) {
            const savedPos = localStorage.getItem('b_builder_pos');
            if (savedPos) {
              try {
                const pos = JSON.parse(savedPos);
                bPanel.style.left = pos.left; bPanel.style.top = pos.top; bPanel.style.right = 'auto';
              } catch(e) {}
            }
          } else {
            bPanel.style.top = '70px';
            bPanel.style.left = 'auto';
            bPanel.style.right = eng.clientSettings.showMinimap ? '290px' : '30px';
          }
        }
      }
      if (bHotbar) {
        if (!eng.editMode) bHotbar.style.display = 'none';
        if (eng.editMode) {
          bHotbar.style.bottom = 'auto';
          if (eng.clientSettings.lockBuilderPanel) {
            const savedHotbarPos = localStorage.getItem('b_hotbar_pos');
            if (savedHotbarPos) {
              try {
                const pos = JSON.parse(savedHotbarPos);
                bHotbar.style.left = pos.left; bHotbar.style.top = pos.top; bHotbar.style.right = 'auto';
              } catch(e) {}
            } else {
              bHotbar.style.top = '280px'; bHotbar.style.left = 'auto'; bHotbar.style.right = eng.clientSettings.showMinimap ? '290px' : '30px';
            }
          } else {
            bHotbar.style.top = '280px'; bHotbar.style.left = 'auto'; bHotbar.style.right = eng.clientSettings.showMinimap ? '290px' : '30px';
          }
        }
      }
      if (bObjLib) {
        if (!eng.editMode) bObjLib.style.display = 'none';
        if (eng.editMode) {
          if (eng.clientSettings.lockBuilderPanel) {
            const savedPos = localStorage.getItem('b_objlib_pos');
            if (savedPos) {
              try {
                const pos = JSON.parse(savedPos);
                bObjLib.style.left = pos.left; bObjLib.style.top = pos.top; bObjLib.style.right = 'auto';
              } catch(e) {}
            } else {
              bObjLib.style.top = '70px'; bObjLib.style.left = 'auto'; bObjLib.style.right = eng.clientSettings.showMinimap ? '570px' : '310px';
            }
          } else {
            bObjLib.style.top = '70px'; bObjLib.style.left = 'auto'; bObjLib.style.right = eng.clientSettings.showMinimap ? '570px' : '310px';
          }
        }
      }
      if (!eng.editMode) {
        eng.selectedTiles = [];
        eng.isDraggingSelection = false;
      }
    } else if (cmd === '/reload' || cmd === '/forceupdate') {
      // Handled by the 'force_refresh' network event
    } else if (cmd === '/dev') {
      if (!checkPerm('dev')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /dev.');
      const devPanel = document.getElementById('dev-panel');
      if (devPanel) devPanel.style.display = devPanel.style.display === 'none' ? 'flex' : 'none';
    } else if (cmd === '/npc') {
      if (!checkPerm('npc')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /npc commands.');
      if (args.length >= 4 && args[1] === 'create') {
        const npcName = args.slice(2, args.length - 1).join(' ');
        const health = parseInt(args[args.length - 1], 10);
        const sx = eng.mousePos.x - (eng.canvas.width / 2);
        const sy = eng.mousePos.y - (eng.canvas.height / 2) - (eng.camera.z || 0);
        const A = sx + eng.camera.x - eng.camera.y;
        const B = (sy / eng.tilt) + eng.camera.x + eng.camera.y;
        eng.network.sendCreateNpc({ name: npcName, maxHp: health, x: (A + B) / 2, y: (B - A) / 2 });
      } else {
        this.chat.addMessage('system', 'System', `Usage: /npc create <Name> <Health>`);
      }
    } else if (cmd === '/players') {
      if (!checkPerm('playermanager')) return this.chat.addMessage('system', 'System', 'You do not have permission to use this command.');
      const pnl = document.getElementById('player-manager-panel');
      if (pnl) pnl.style.display = pnl.style.display === 'none' ? 'flex' : 'none';
      if (pnl.style.display === 'flex') eng.ui.devTools.renderPlayerManager();
    } else if (cmd === '/time') {
      if (!checkPerm('dev')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /time.');
      if (args.length < 2) {
        eng.timeOverride = undefined;
        return this.chat.addMessage('system', 'System', 'Time resumed to normal cycle. Usage: /time <0-24>');
      }
      const hour = parseFloat(args[1]);
      if (isNaN(hour) || hour < 0 || hour > 24) {
        return this.chat.addMessage('system', 'System', 'Please specify an hour between 0 and 24.');
      }
      let angle = ((hour - 6 + 24) % 24) / 24 * Math.PI * 2;
      let t;
      if (angle <= Math.PI) {
        t = (angle / Math.PI) * (2/3);
      } else {
        t = (2/3) + ((angle - Math.PI) / Math.PI) * (1/3);
      }
      eng.timeOverride = t;
      this.chat.addMessage('system', 'System', `Time frozen to ${hour}:00.`);
    } else if (cmd === '/givemoney') {
      if (!checkPerm('dev')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /givemoney.');
      const amount = parseInt(args[1], 10);
      if (isNaN(amount)) return this.chat.addMessage('system', 'System', 'Usage: /givemoney <amount>');
      eng.network.socket.emit('dev_give_money', { amount });
    } else if (cmd === '/level') {
      if (!checkPerm('dev')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /level.');
      const targetLevel = parseInt(args[1], 10);
      if (isNaN(targetLevel) || targetLevel < 1) return this.chat.addMessage('system', 'System', 'Usage: /level <number>');
      eng.network.socket.emit('dev_set_level', { level: targetLevel });
      this.chat.addMessage('system', 'System', `Granting level ${targetLevel}...`);
    } else if (cmd === '/patchnotes' || cmd === '/news') {
      eng.network.sendRequestPatchNotes(true);
    } else if (cmd === '/announce') {
      if (!checkPerm('dev')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /announce.');
      const msgBody = args.slice(1).join(' ');
      if (!msgBody) return this.chat.addMessage('system', 'System', 'Usage: /announce <message>');
    } else if (cmd === '/weather') {
      if (!checkPerm('dev')) return this.chat.addMessage('system', 'System', 'You do not have permission to use /weather.');
      const wType = args[1]?.toLowerCase();
      if (!['clear', 'rain', 'snow'].includes(wType)) return this.chat.addMessage('system', 'System', 'Usage: /weather <clear|rain|snow>');
    } else if (cmd === '/pm' || cmd === '/whisper' || cmd === '/w') {
      const targetName = args[1];
      const pmMsg = args.slice(2).join(' ');
      if (!targetName || !pmMsg) return this.chat.addMessage('system', 'System', 'Usage: /pm <name> <message>');

      this.chat.addMessage('pm', `To [${targetName}]`, pmMsg);
      eng.network.sendChatMessage({ type: 'pm', target: targetName, text: pmMsg });
    } else if (cmd === '/afk') {
      const msgBody = args.slice(1).join(' ');
      eng.player.isAFK = true;
      eng.player.afkMessage = msgBody || 'Away from keyboard.';
      eng.player.lastActionTime = 0; // Force AFK state locally to prevent immediate overwrite
      eng.network.sendLogCommand(msg); // Send to server to store the custom afkMessage
      this.chat.addMessage('system', 'System', `You are now AFK${msgBody ? ': ' + msgBody : '.'}`);
    } else if (cmd.startsWith('/')) {
      const emoteText = `*${msg.substring(1)}*`;
      this.chat.addMessage('local', eng.playerData.name, emoteText);
      eng.network.sendChatMessage({ type: 'local', text: emoteText });
      if (!eng.player.chatBubbles) eng.player.chatBubbles = [];
      eng.player.chatBubbles.push({ text: emoteText, timer: 4000, opacity: 0 });
    }
  }
}
