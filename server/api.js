const fs = require('fs');
const path = require('path');
const { logSystem } = require('./logger.js');
const state = require('./state.js');

module.exports = function(app, helpers) {
  const { CLIENT_DIR, POWERS_REGISTRY_FILE, PATCH_NOTES_FILE, loadServerPowersets } = helpers;
  const { serverPowersetsData, serverPowersetsById, SERVER_POWER_REGISTRY, SERVER_EFFECT_REGISTRY } = state;

  app.get('/api/powersets', (req, res) => {
    res.json(serverPowersetsData);
  });

  app.get('/api/registry/powers', (req, res) => {
    res.json(SERVER_POWER_REGISTRY);
  });

  app.get('/api/powers', (req, res) => {
    const powersList = [];
    for (const [id, def] of Object.entries(SERVER_POWER_REGISTRY)) {
      const assigned = def.assignedPowersets ? [...def.assignedPowersets] : [];
      for (const [psId, psDef] of Object.entries(serverPowersetsById)) {
        const pList = psDef.Powers || psDef.powers || [];
        if (pList.some(p => (p.Id || p.id) === id)) {
          if (!assigned.includes(psId)) assigned.push(psId);
        }
      }
      powersList.push({
        id: id, name: def.name || id, type: def.type || 'Click', description: def.description || '', engineScript: def.engineScript || '', assignedPowersets: assigned,
        stats: def.stats || { tier: 1, rechargeRate: 1.0, activationTime: 0.5, energyCost: 10, energyCostPerSecond: 0, batteryCost: 0, batteryCostPerSecond: 0, recoveryRatePerSecond: 0, batteryRecoveryRatePerSecond: 0, range: 200, aoeRadius: 0, coneRadius: 45, accuracy: 85, critChance: 5, critMult: 1.5 },
        effects: def.effects || [],
        visuals: def.visuals || { icon: '', tint: '#ffffff', animation: 'throw-attack1', casterVisuals: [], projectileVisuals: [], targetVisuals: [], projectileSpeed: 400, projectileArc: 0 }
      });
    }
    res.json(powersList);
  });

  app.post('/api/powers/save', (req, res) => {
    const powerData = req.body;
    if (!powerData || !powerData.id) return res.status(400).json({ error: "Invalid power data." });
    const powerId = powerData.id;
    SERVER_POWER_REGISTRY[powerId] = { name: powerData.name, type: powerData.type, engineScript: powerData.engineScript, description: powerData.description, assignedPowersets: powerData.assignedPowersets || [], stats: powerData.stats || {}, effects: powerData.effects || [], visuals: powerData.visuals || {} };
    fs.writeFileSync(POWERS_REGISTRY_FILE, JSON.stringify(SERVER_POWER_REGISTRY, null, 2));
    loadServerPowersets();
    logSystem(`POWER CUSTOMIZER: Saved & hot-reloaded power '${powerId}'`);
    res.json({ success: true, message: "Power saved successfully." });
  });

  app.get('/api/assets/sprites/powers', (req, res) => {
    const dirPath = path.join(CLIENT_DIR, 'assets/sprites/powers');
    if (fs.existsSync(dirPath)) {
      res.json(fs.readdirSync(dirPath).filter(f => f.endsWith('.png')));
    } else {
      res.json([]);
    }
  });

  app.get('/api/registry/effects', (req, res) => res.json(SERVER_EFFECT_REGISTRY));

  app.get('/api/patch-notes', (req, res) => {
    if (fs.existsSync(PATCH_NOTES_FILE)) {
      try { res.setHeader('Content-Type', 'application/json'); return res.send(fs.readFileSync(PATCH_NOTES_FILE, 'utf8')); } catch (e) { console.error("Error reading patch notes:", e.message); }
    }
    res.json([]);
  });
};
