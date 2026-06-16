import { COMMAND_LIST } from './constants.js?v=cache-bust-005';

export class CommandHandler {
  constructor(engine, chatManager) {
    this.engine = engine;
    this.chat = chatManager;
  }

  handleTabComplete(val) {
    let matches = [];
    if (val.startsWith('/') && !val.includes(' ')) {
      matches = COMMAND_LIST.filter(c => c.startsWith(val.toLowerCase()));
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
      if (!checkPerm('tp')) return eng.ui.showSystemMessage('You do not have permission to use /tp.');
      if (args.length >= 3) {
        const x = parseFloat(args[1]);
        const y = parseFloat(args[2]);
        const z = args.length >= 4 ? parseFloat(args[3]) : undefined;
        eng.network.sendAdminTeleport({ targetName: eng.playerData.name, x, y, z });
        eng.ui.showSystemMessage(`Teleport request sent to server.`);
      } else {
        eng.ui.showSystemMessage('Usage: /tp <x> <y> [z]');
      }
    } else if (cmd === '/tpo' || cmd === '/teleport-other') {
      if (!checkPerm('tp')) return eng.ui.showSystemMessage('You do not have permission to use /tpo.');
      if (args.length >= 4) {
        const targetName = args[1];
        const x = parseFloat(args[2]);
        const y = parseFloat(args[3]);
        const z = args.length >= 5 ? parseFloat(args[4]) : undefined;
        eng.network.sendAdminTeleport({ targetName, x, y, z });
        eng.ui.showSystemMessage(`Requested teleport for ${targetName}.`);
      } else {
        eng.ui.showSystemMessage('Usage: /tpo <player> <x> <y> [z]');
      }
    } else if (cmd === '/speed') {
      if (!checkPerm('speed')) return eng.ui.showSystemMessage('You do not have permission to use /speed.');
      eng.player.speed = parseFloat(args[1]) || eng.player.speed;
      eng.player.runSpeed = eng.player.speed * 2.25;
      eng.ui.showSystemMessage(`Speed set to ${eng.player.speed}`);
    } else if (cmd === '/bank') {
      if (eng.ui && eng.ui.inventory) {
         eng.ui.inventory.toggleBank();
      }
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

      eng.ui.showSystemMessage('Nudged out of stuck position.');
    } else if (cmd === '/editmode') {
      const hasEditPerm = ['editmode', 'builder', 'dev', 'admin'].some(role => checkPerm(role));
      const isDev = ['dev', 'admin'].some(role => checkPerm(role));
      const isApartment = eng.currentZone && eng.currentZone.startsWith('apt_' + pName);

      let isAptGuestBuilder = false;
      if (eng.currentZone && eng.currentZone.startsWith('apt_') && eng.zonesConfig && eng.zonesConfig[eng.currentZone]) {
          const zc = eng.zonesConfig[eng.currentZone];
          if (zc.builders && zc.builders.includes(pName)) {
              isAptGuestBuilder = true;
          }
      }

      if (!hasEditPerm) return eng.ui.showSystemMessage('You do not have permission to use /editmode.');

      if (!isDev && !isApartment && !isAptGuestBuilder) {
        return eng.ui.showSystemMessage('Builder tools are currently restricted to personal Apartments. You cannot build in public open-world zones.');
      }

      eng.editMode = !eng.editMode;
      if (eng.renderer) eng.renderer.needsVoxelUpdate = true;

      const dtUI = eng.ui?.devTools;
      const bHotbar = document.getElementById('builder-hotbar');

      if (dtUI && dtUI.builderToolsWindow) {
        if (eng.editMode) {
          dtUI.builderToolsWindow.open();
        } else {
          dtUI.builderToolsWindow.close();
        }
      } else {
        const bPanel = document.getElementById('builder-panel');
        if (bPanel) {
          bPanel.style.display = eng.editMode ? 'flex' : 'none';
          if (eng.editMode) {
            bPanel.style.opacity = '1';
            bPanel.style.transform = 'none';
            if (!eng.clientSettings.lockBuilderPanel) {
              bPanel.style.top = '70px';
              bPanel.style.left = 'auto';
              bPanel.style.right = eng.clientSettings.showMinimap ? '290px' : '30px';
            }
          }
        }
      }

      if (dtUI && dtUI.objectLibraryWindow && !eng.editMode) dtUI.objectLibraryWindow.close();
      if (dtUI && dtUI.texturePaletteWindow && !eng.editMode) dtUI.texturePaletteWindow.close();

      if (!eng.editMode) {
        eng.selectedTiles = [];
        eng.isDraggingSelection = false;
        if (eng.worldDirty) {
          if (eng.worldSerializer) eng.worldSerializer.save(eng.currentZone);
          eng.worldDirty = false;
          eng.ui.showSystemMessage('Auto-saved world changes on exiting edit mode.');
        }
      }

      if (eng.ui && eng.ui.devTools && eng.ui.devTools.updateBuildingMode) {
        eng.ui.devTools.updateBuildingMode();
      }
    } else if (cmd === '/reload' || cmd === '/forceupdate') {
      // Handled by the 'force_refresh' network event
    } else if (cmd === '/dev') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /dev.');
      const dtWindow = eng.ui?.devTools?.devToolsWindow;
      if (dtWindow) {
         if (dtWindow.element.style.display === 'none') dtWindow.open();
         else dtWindow.close();
      } else {
         const devPanel = document.getElementById('dev-panel');
         if (devPanel) devPanel.style.display = devPanel.style.display === 'none' ? 'flex' : 'none';
      }
    } else if (cmd === '/npc') {
      if (!checkPerm('npc')) return eng.ui.showSystemMessage('You do not have permission to use /npc commands.');
      if (args.length >= 4 && args[1] === 'create') {
        const npcName = args.slice(2, args.length - 1).join(' ');
        const health = parseInt(args[args.length - 1], 10);
        const sx = eng.mousePos.x - (eng.canvas.width / 2);
        const sy = eng.mousePos.y - (eng.canvas.height / 2) - (eng.camera.z || 0);
        const A = sx + eng.camera.x - eng.camera.y;
        const B = (sy / eng.tilt) + eng.camera.x + eng.camera.y;
        eng.network.sendCreateNpc({ name: npcName, maxHp: health, x: (A + B) / 2, y: (B - A) / 2 });
      } else {
        eng.ui.showSystemMessage(`Usage: /npc create <Name> <Health>`);
      }
    } else if (cmd === '/players') {
      if (!checkPerm('playermanager') && !checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use this command.');
      const pnl = document.getElementById('player-manager-panel');
      if (pnl) {
        pnl.style.display = pnl.style.display === 'none' ? 'flex' : 'none';
        if (pnl.style.display === 'flex') eng.network.sendRequestAllPlayers();
      }
    } else if (cmd === '/time') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /time.');
      if (args.length < 2) {
        eng.timeOverride = undefined;
        return eng.ui.showSystemMessage('Time resumed to normal cycle. Usage: /time <0-24>');
      }
      const hour = parseFloat(args[1]);
      if (isNaN(hour) || hour < 0 || hour > 24) {
        return eng.ui.showSystemMessage('Please specify an hour between 0 and 24.');
      }
      let angle = ((hour - 6 + 24) % 24) / 24 * Math.PI * 2;
      let t;
      if (angle <= Math.PI) {
        t = (angle / Math.PI) * (2 / 3);
      } else {
        t = (2 / 3) + ((angle - Math.PI) / Math.PI) * (1 / 3);
      }
      eng.timeOverride = t;
      eng.ui.showSystemMessage(`Time frozen to ${hour}:00.`);
    } else if (cmd === '/givemoney') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /givemoney.');
      const amount = parseInt(args[1], 10);
      if (isNaN(amount)) return eng.ui.showSystemMessage('Usage: /givemoney <amount>');
      eng.network.socket.emit('dev_give_money', { amount });
    } else if (cmd === '/level') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /level.');
      const targetLevel = parseInt(args[1], 10);
      if (isNaN(targetLevel) || targetLevel < 1) return eng.ui.showSystemMessage('Usage: /level <number>');
      eng.network.socket.emit('dev_set_level', { level: targetLevel });
      eng.ui.showSystemMessage(`Granting level ${targetLevel}...`);
    } else if (cmd === '/integrity') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /integrity.');
      const targetIntegrity = parseInt(args[1], 10);
      if (isNaN(targetIntegrity) || targetIntegrity < -100 || targetIntegrity > 100) return eng.ui.showSystemMessage('Usage: /integrity <number between -100 and 100>');
      eng.network.socket.emit('dev_set_integrity', { integrity: targetIntegrity });
      eng.ui.showSystemMessage(`Setting Integrity to ${targetIntegrity}%...`);
    } else if (cmd === '/grant' || cmd === '/revoke') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage(`You do not have permission to use ${cmd}.`);
      const targetName = args[1];
      const permission = args[2];
      if (!targetName || !permission) return eng.ui.showSystemMessage(`Usage: ${cmd} <player> <permission>`);
      eng.network.socket.emit('admin_grant_permission', { targetName, permission, revoke: cmd === '/revoke' });
    } else if (cmd === '/save') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /save.');
      const filename = args[1] || eng.currentZone || 'untitled';
      if (eng.worldSerializer) eng.worldSerializer.save(filename);
    } else if (cmd === '/load') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /load.');
      const filename = args[1] || eng.currentZone || 'untitled';
      eng.currentZone = filename;
      if (eng.worldSerializer) eng.worldSerializer.load(filename);
    } else if (cmd === '/applymap') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /applymap.');
      const targetZone = args[1] ? args[1].toLowerCase() : null;
      if (!targetZone) return eng.ui.showSystemMessage('Usage: /applymap <zoneName> [spawnX] [spawnY] [spawnZ]');

      const mapCenter = (512 * 32) / 2;
      const spawnX = args[2] !== undefined ? parseFloat(args[2]) : mapCenter;
      const spawnY = args[3] !== undefined ? parseFloat(args[3]) : mapCenter;
      const spawnZ = args[4] !== undefined ? parseFloat(args[4]) : undefined;

      if (eng.worldSerializer) {
        eng.ui.setupLoadingScreen();
        eng.worldSerializer.save(eng.currentZone || 'untitled').then(() => {
          eng.currentZone = targetZone;
          eng.worldSerializer.load(targetZone).then(() => {
            eng.network.sendPlayerTeleported();
            eng.player.x = spawnX;
            eng.player.y = spawnY;
            eng.mapManager.update(16);
            if (spawnZ !== undefined) eng.player.z = spawnZ;
            else eng.findSafeSpawn();
            eng.camera.x = eng.player.x;
            eng.camera.y = eng.player.y;

            eng.mapReceived = true;
            if (eng.renderer) {
              eng.renderer.checkInitialLoad();
            }
          });
        });
      }
    } else if (cmd === '/teleport_zone' || cmd === '/tpz') {
      const targetZone = args[1] ? args[1].toLowerCase() : null;
      if (!targetZone) return eng.ui.showSystemMessage('Usage: /tpz <zoneName>');
      eng.ui.setupLoadingScreen();
      eng.network.socket.emit('join_zone', { zone: targetZone });
      if (targetZone.startsWith('apt_')) {
          eng.player.x = 48 * 32;
          eng.player.y = 48 * 32;
          eng.player.z = 64;
          eng.camera.x = eng.player.x;
          eng.camera.y = eng.player.y;
      }
      eng.ui.showSystemMessage(`Joining zone: ${targetZone}...`);
    } else if (cmd === '/home' || cmd === '/apartment') {
      eng.ui.setupLoadingScreen();
      const targetZone = `apt_${pName}`;
      eng.network.socket.emit('join_zone', { zone: targetZone });

      eng.player.x = 48 * 32;
      eng.player.y = 48 * 32;
      eng.player.z = 64;
      eng.camera.x = eng.player.x;
      eng.camera.y = eng.player.y;

      eng.ui.showSystemMessage(`Traveling to your personal apartment...`);
    } else if (cmd === '/resetapt' || cmd === '/resetapartment') {
      const targetZone = `apt_${pName}`;
      if (eng.currentZone !== targetZone) {
        return eng.ui.showSystemMessage('You must be inside your own apartment to reset it.');
      }
      eng.ui.showConfirmModal("Reset Apartment", "WARNING: This will completely wipe all blocks, furniture, and custom changes in your apartment. This cannot be undone. Are you absolutely sure?", () => {
        eng.network.socket.emit('dev_reset_apartment');
      }, 3);
    } else if (cmd === '/invite') {
      const targetName = args[1];
      if (!targetName) return eng.ui.showSystemMessage('Usage: /invite <player>');
      const myAptZone = `apt_${pName}`;
      if (eng.currentZone !== myAptZone) {
        return eng.ui.showSystemMessage('You must be inside your apartment to invite someone.');
      }
      if (eng.network) eng.network.sendApartmentInvite(targetName);
    } else if (cmd === '/kick') {
      const targetName = args[1];
      if (!targetName) return eng.ui.showSystemMessage('Usage: /kick <player>');
      const myAptZone = `apt_${pName}`;
      if (eng.currentZone !== myAptZone) {
        return eng.ui.showSystemMessage('You must be inside your apartment to kick someone.');
      }
      if (eng.network) eng.network.sendApartmentKick(targetName);
    } else if (cmd === '/music') {
      if (args[1] === 'toggle') {
        eng.clientSettings.muteBGM = !eng.clientSettings.muteBGM;
        localStorage.setItem('b_client_settings', JSON.stringify(eng.clientSettings));
        eng.ui.showSystemMessage(`Apartment music is now ${eng.clientSettings.muteBGM ? 'MUTED' : 'UNMUTED'}.`);
        eng.updateBGM();
      } else {
        eng.ui.showSystemMessage('Usage: /music toggle');
      }
    } else if (cmd === '/patchnotes' || cmd === '/news') {
      eng.network.sendRequestPatchNotes(true);
    } else if (cmd === '/announce') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /announce.');
      const msgBody = args.slice(1).join(' ');
      if (!msgBody) return eng.ui.showSystemMessage('Usage: /announce <message>');
    } else if (cmd === '/weather') {
      if (!checkPerm('dev')) return eng.ui.showSystemMessage('You do not have permission to use /weather.');
      const wType = args[1]?.toLowerCase();
      if (!['clear', 'rain', 'snow'].includes(wType)) return eng.ui.showSystemMessage('Usage: /weather <clear|rain|snow>');
    } else if (cmd === '/pm' || cmd === '/whisper' || cmd === '/w') {
      const targetName = args[1];
      const pmMsg = args.slice(2).join(' ');
      if (!targetName || !pmMsg) return eng.ui.showSystemMessage('Usage: /pm <name> <message>');

      this.chat.addMessage('pm', `To [${targetName}]`, pmMsg);
      if (eng.ui && eng.ui.pmUI) eng.ui.pmUI.addMessage(targetName, eng.playerData.name, pmMsg);
      eng.network.sendChatMessage({ type: 'pm', target: targetName, text: pmMsg });
    } else if (cmd === '/afk') {
      const msgBody = args.slice(1).join(' ');
      eng.player.isAFK = true;
      eng.player.afkMessage = msgBody || 'Away from keyboard.';
      eng.player.isManuallyAFK = true;
      eng.network.sendLogCommand(msg); // Send to server to store the custom afkMessage
      eng.ui.showSystemMessage(`You are now AFK${msgBody ? ': ' + msgBody : '.'}`);
    } else if (cmd.startsWith('/')) {
      const emoteText = `*${msg.substring(1)}*`;
      this.chat.addMessage('local', eng.playerData.name, emoteText);
      eng.network.sendChatMessage({ type: 'local', text: emoteText });
      if (!eng.player.chatBubbles) eng.player.chatBubbles = [];
      eng.player.chatBubbles.push({ text: emoteText, timer: 4000, opacity: 0 });
    }
  }
}
