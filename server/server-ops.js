const fs = require('fs');
const path = require('path');
const { logSystem } = require('./logger.js');
const state = require('./state.js');

function createServerOps(io, deps) {
  const {
    CHUNKS_DIR, ZONES_REGISTRY_FILE, DATA_DIR, CHAR_DATA_DIR, PLAYER_DATA_DIR, NPCS_INDEX, SPAWNERS_INDEX, PERMISSIONS_INDEX, ENTITY_GROUPS_FILE,
    loadPowerRegistry, loadServerPowersets
  } = deps;
  const { mapChunks, npcsCatalog, spawnersCatalog, permissionsCatalog, activePlayers } = state;

  function loadChunksFromDisk() {
    for (const zone in mapChunks) delete mapChunks[zone];

    const defaultZoneDir = path.join(CHUNKS_DIR, 'atlas-city');
    if (!fs.existsSync(defaultZoneDir)) fs.mkdirSync(defaultZoneDir, { recursive: true });

    if (fs.existsSync(CHUNKS_DIR)) {
      fs.readdirSync(CHUNKS_DIR).forEach(file => {
        if (file.endsWith('.json')) {
          const oldPath = path.join(CHUNKS_DIR, file);
          const newPath = path.join(defaultZoneDir, file);
          fs.renameSync(oldPath, newPath);
        }
      });
    }

    let zoneData = { zones: ['atlas-city'] };
    if (fs.existsSync(ZONES_REGISTRY_FILE)) {
      try { zoneData = JSON.parse(fs.readFileSync(ZONES_REGISTRY_FILE, 'utf8')); } catch(e){}
    }

    zoneData.zones.forEach(zone => {
      mapChunks[zone] = {};
      const zoneDir = path.join(CHUNKS_DIR, zone);
      if (fs.existsSync(zoneDir)) {
        fs.readdirSync(zoneDir).forEach(file => {
          if (file.endsWith('.json')) {
            const chunkId = file.replace('.json', '');
            try { mapChunks[zone][chunkId] = JSON.parse(fs.readFileSync(path.join(zoneDir, file), 'utf8')); } catch (e) {}
          }
        });
      }
    });
  }

  const handleNpcDeath = (npc) => {
    const isSpawned = !!npc.spawnerUuid;
    const rate = npc.respawnRate !== undefined ? npc.respawnRate : 20;

    if (rate > 0 && !isSpawned) {
      setTimeout(() => {
          if (!npc.zone) throw new Error(`CRITICAL: NPC ${npc.name} respawned without a zone!`);
          npc.hp = npc.maxHp; npc.state = 'idle'; io.to(npc.zone).emit('npc_respawned', npc.uuid);
      }, rate * 1000);
    } else {
      setTimeout(() => {
        const idx = npcsCatalog.findIndex(n => n.uuid === npc.uuid);
        if (idx !== -1) {
            if (!npc.zone) throw new Error(`CRITICAL: NPC ${npc.name} deleted without a zone!`);
            npcsCatalog.splice(idx, 1); fs.writeFileSync(NPCS_INDEX, JSON.stringify(npcsCatalog, null, 2)); io.to(npc.zone).emit('npc_deleted', npc.uuid);
        }
      }, 5000);
    }
  };

  function reloadServerData() {
    logSystem('Reloading server data from disk...', 'SYSTEM');
    loadChunksFromDisk();
    try { const d = fs.readFileSync(NPCS_INDEX, 'utf8').trim(); if (d) { const p = JSON.parse(d); npcsCatalog.length = 0; p.forEach(n => npcsCatalog.push(n)); } } catch (e) {}
    try { const d = fs.readFileSync(SPAWNERS_INDEX, 'utf8').trim(); if (d) { const p = JSON.parse(d); spawnersCatalog.length = 0; p.forEach(s => spawnersCatalog.push(s)); } } catch (e) {}
    try { const d = fs.readFileSync(PERMISSIONS_INDEX, 'utf8').trim(); if (d) { const p = JSON.parse(d); for (const k in permissionsCatalog) delete permissionsCatalog[k]; Object.assign(permissionsCatalog, p); } } catch (e) {}
    try { const d = fs.readFileSync(ENTITY_GROUPS_FILE, 'utf8').trim(); if (d) { for (const k in state.entityGroups) delete state.entityGroups[k]; Object.assign(state.entityGroups, JSON.parse(d)); } } catch (e) {}
    loadPowerRegistry();
    loadServerPowersets();
    logSystem('Server data reload complete.', 'SYSTEM');
  }

  function saveAllActivePlayers() {
    logSystem('Initiating emergency save for all active players...', 'SYSTEM');
    for (const socketId in activePlayers) {
      const player = activePlayers[socketId];
      try { const charFile = path.join(CHAR_DATA_DIR, `${player.name.toLowerCase()}.json`); if (fs.existsSync(charFile)) { const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); if (player.x !== undefined && player.y !== undefined) { charObj.position = { x: player.x, y: player.y, z: player.z }; } if (!player.zone) throw new Error(`CRITICAL: Player ${player.name} missing zone during save!`); charObj.zone = player.zone; if (player.hp !== undefined && charObj.stats) { charObj.stats.hp = player.hp; } if (player.synthEnergy !== undefined && charObj.stats) charObj.stats.synthEnergy = player.synthEnergy; if (player.level !== undefined) charObj.level = player.level; if (player.experience !== undefined) charObj.experience = player.experience; if (player.unspentPowerPicks !== undefined) charObj.unspentPowerPicks = player.unspentPowerPicks; if (player.unspentPowersetPicks !== undefined) charObj.unspentPowersetPicks = player.unspentPowersetPicks; fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); logSystem(`Saved character: ${player.name}`, 'INFO'); } } catch (err) { logSystem(err.message, 'ERROR'); }
    }
    let zoneData = { zones: ['atlas-city'] };
    if (fs.existsSync(ZONES_REGISTRY_FILE)) { try { zoneData = JSON.parse(fs.readFileSync(ZONES_REGISTRY_FILE, 'utf8')); } catch(e){} }
    for (const zone of zoneData.zones) {
      if (mapChunks[zone]) {
        const combinedData = {}; for (let chunkId in mapChunks[zone]) { Object.assign(combinedData, mapChunks[zone][chunkId]); }
        fs.writeFileSync(path.join(DATA_DIR, path.basename(zone) + '.json'), JSON.stringify(combinedData, null, 2)); logSystem(`Saved zone flat file: ${zone}`, 'INFO');
      }
    }
  }

  return { loadChunksFromDisk, handleNpcDeath, reloadServerData, saveAllActivePlayers };
}
module.exports = { createServerOps };
