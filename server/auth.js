const fs = require('fs');
const path = require('path');
const { randomUUID, createHash } = require('crypto');
const { logSystem } = require('./logger.js');
const { transporter } = require('./mailer.js');
const state = require('./state.js');

module.exports = function(app, helpers) {
  const { PLAYER_DATA_DIR, CHAR_DATA_DIR, CHAMPAGNE_IMG, getIndex, saveIndex, populateAccountCharacters } = helpers;
  const { SERVER_POWER_REGISTRY, serverPowersetsById, permissionsCatalog } = state;

  app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const index = getIndex();
    const lowerUser = username.toLowerCase();

    if (index[lowerUser]) {
        logSystem(`REGISTRATION REJECTED: ${lowerUser} (Taken)`, "WARN");
        return res.status(400).json({ error: 'This username is already taken.' });
    }
    if (!password) return res.status(400).json({ error: 'Password is required.' });
    const passwordHash = createHash('sha256').update(password).digest('hex');

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        logSystem(`REGISTRATION REJECTED: Invalid email format`, "WARN");
        return res.status(400).json({ error: 'Please provide a valid email address, or skip it.' });
    }

    try {
        const uuid = randomUUID();
        const mailOptions = {
            from: '"Champagne" <Champagne@behr.dev>',
            to: email,
            subject: "A heckin' warm welcome to B! ✨",
            text: `Hi there, ${username}! ✨\n\nI just saw your account was successfully created, and we're absolutely ecstatic you're here!\n\nEverything worked automagically on my end, so you can go ahead and jump right in using your username, along with your email or password. If anything is borked or you get confused, don't even worry, I'm very patient and I can help, I've always got your back!\n\nYou can usually find me hanging around Atlas, just socializing with the public and helping out the community. Please come say Hi when you're around, I'd absolutely love to show you around!\n\nStay bubbly,\nChampagne 💖`,
            html: `
              <div style="background-color: #0b0e14; color: #e1e1e1; padding: 40px; border: 2px solid #f1c40f; border-radius: 12px; font-family: sans-serif; max-width: 800px; margin: auto;">
                <h1 style="color: #f1c40f; margin-top: 0; text-align: center;">🥂 Welcome to B, bestie!</h1>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                  <tr>
                    <td width="30%" valign="top" style="padding-right: 25px;">
                      <img src="cid:champagneToast" alt="Champagne Toasting" style="width: 100%; border: 1px solid #f1c40f; border-radius: 8px; display: block;">
                      <p style="font-size: 0.9rem; color: #f1c40f; text-align: center; font-style: italic; margin-top: 10px;">"Tink!"</p>
                    </td>
                    <td width="70%" valign="top" style="line-height: 1.6;">
                      <p style="font-size: 1.1rem; margin-top: 0;">Hi there, <strong>${username}</strong>! ✨</p>
                      <p style="font-size: 1.1rem; line-height: 1.5;">I just saw your account was successfully created, and we're absolutely ecstatic you're here!</p>
                      <p style="font-size: 1.1rem; line-height: 1.5;">Everything worked automagically on my end, so you can go ahead and jump right in using your username, along with your email or password. If anything is borked or you get confused, don't even worry, I'm very patient and I can help, I've always got your back!</p>
                      <p style="font-size: 1.1rem; line-height: 1.5;">You can usually find me hanging around Atlas, just socializing with the public and helping out the community. Please come say Hi when you're around, I'd absolutely love to show you around!</p>
                      <p style="margin-bottom: 5px;">Stay bubbly,</p>
                      <p style="font-size: 1.2rem; margin-top: 0; color: #f1c40f;"><strong>Champagne</strong> 💖</p>
                    </td>
                  </tr>
                </table>
                <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0 20px 0;">
                <p style="font-size: 0.85rem; color: #7f8c8d; text-align: center;">I'm constantly tweaking things to be the best person I can be for you and the rest of B. See you in Atlas!</p>
              </div>
            `,
            attachments: [{ filename: 'champagne-email.png', path: CHAMPAGNE_IMG, cid: 'champagneToast' }]
        };

        if (email) {
            const info = await transporter.sendMail(mailOptions);
            logSystem(`WELCOME EMAIL SENT. MessageId: ${info.messageId} | Accepted: ${info.accepted}`);
        }

        index[lowerUser] = { username: lowerUser, email: email ? email.toLowerCase() : null, passwordHash: passwordHash, uuid: uuid };
        saveIndex(index);

        const playerData = { uuid: uuid, username: lowerUser, friends: [], characters: [], clientSettings: {}, created: Date.now() };
        fs.writeFileSync(path.join(PLAYER_DATA_DIR, `${uuid}.json`), JSON.stringify(playerData, null, 2));
        logSystem(`ACCOUNT CREATED: ${lowerUser} [${uuid}]`);
        res.status(201).json(playerData);
    } catch (error) {
        logSystem(`REGISTRATION/EMAIL ERROR for ${lowerUser}: ${error.message}`, "ERROR");
        return res.status(500).json({ error: `Failed to send email. Error: ${error.message}` });
    }
  });

  app.post('/login', (req, res) => {
    const { identifier, password } = req.body;
    const index = getIndex();
    const lowerId = identifier.toLowerCase();
    const indexEntry = Object.values(index).find(acc => acc.username === lowerId || acc.email === lowerId);
    const passwordHash = password ? createHash('sha256').update(password).digest('hex') : null;

    if (indexEntry && indexEntry.passwordHash === passwordHash) {
      const playerFile = path.join(PLAYER_DATA_DIR, `${indexEntry.uuid}.json`);
      const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));

      if (playerData.isBanned) {
          logSystem(`LOGIN REJECTED (BANNED): ${playerData.username}`);
          return res.status(403).json({ error: `This account has been banned. Reason: ${playerData.banReason || 'No reason specified.'}` });
      }

      if (!playerData.friends) { playerData.friends = []; fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2)); }

      let accountNeedsSave = false;
      let migratedNames = [];
      if (playerData.characters) {
        playerData.characters.forEach(char => {
          const charNameStr = (typeof char === 'object') ? char.name : char;
          const charFile = path.join(CHAR_DATA_DIR, `${charNameStr.toLowerCase()}.json`);
          let charObj;
          if (typeof char === 'object') { charObj = char; fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2)); accountNeedsSave = true; }
          else if (fs.existsSync(charFile)) { charObj = JSON.parse(fs.readFileSync(charFile, 'utf8')); }

          if (charObj) {
            let needsSave = false;
            if (charObj.stats && charObj.stats.hp <= 10) { charObj.stats.hp = 1000; charObj.stats.energy = 1000; delete charObj.stats.mp; needsSave = true; }
            if (!charObj.inventory) { charObj.inventory = [ { id: 'rubber_chicken', name: 'Rubber Chicken', qty: 1, icon: '🍗' }, { id: 'buttons', name: 'Buttons', qty: 5, icon: '🔘' }, { id: 'slinky', name: 'Slinky', qty: 1, icon: '🌀' } ]; needsSave = true; }
            if (charObj.currency === undefined) { charObj.currency = charObj.name.toLowerCase() === 'tim' ? 50000 : 0; needsSave = true; }
            if (!charObj.position) { charObj.position = { x: 0, y: 0 }; needsSave = true; }
            if (!charObj.powers) { charObj.powers = []; needsSave = true; }
            if (!charObj.powers.includes('brawl')) { charObj.powers.unshift('brawl'); needsSave = true; }
            if (!charObj.powers.includes('throw-airplane')) { charObj.powers.push('throw-airplane'); needsSave = true; }
            if (!charObj.powers.includes('flashlight')) { charObj.powers.push('flashlight'); needsSave = true; }
            if (!charObj.powers.includes('teleport')) { charObj.powers.push('teleport'); needsSave = true; }
            if (!charObj.powersets) { charObj.powersets = []; needsSave = true; }
            if (charObj.stats && charObj.stats.synthEnergy === undefined) { charObj.stats.synthEnergy = 1000; needsSave = true; }
            if (!charObj.powersets.includes('inherited')) { charObj.powersets.unshift('inherited'); needsSave = true; }
            if (!charObj.activePowers) { charObj.activePowers = []; needsSave = true; }
            if (charObj.unspentPowerPicks === undefined) { charObj.unspentPowerPicks = charObj.unspentSlots || 0; delete charObj.unspentSlots; needsSave = true; }
            if (charObj.unspentPowersetPicks === undefined) { charObj.unspentPowersetPicks = 0; needsSave = true; }

            // Auto-correct any display names stored in powers back to their proper internal IDs
            if (charObj.powers) {
              charObj.powers = charObj.powers.map(p => {
                const asName = Object.entries(SERVER_POWER_REGISTRY).find(([k, v]) => v.name === p);
                if (asName) {
                   needsSave = true;
                   return asName[0];
                }
                return p;
              });
            }

            if (!charObj.powerTray && charObj.powers) {
              charObj.powerTray = charObj.powers.filter(powId => {
                const pDef = SERVER_POWER_REGISTRY[powId];
                return pDef ? pDef.type !== 'Passive' : true;
              });
              needsSave = true;
            }

            if (charObj.powers) {
              charObj.powers.forEach(powId => {
                const pDef = SERVER_POWER_REGISTRY[powId];
                if (pDef && pDef.type === 'Passive' && !charObj.activePowers.includes(powId)) { charObj.activePowers.push(powId); needsSave = true; }
              });
            }

            let maxHp = 1000; let maxEnergy = 1000; let maxSynthEnergy = 1000;
            if (charObj.powers) {
              charObj.powers.forEach(powId => {
                const pDef = SERVER_POWER_REGISTRY[powId];
                if (pDef && pDef.type === 'Passive' && pDef.effects) {
                  pDef.effects.forEach(eff => {
                    if (eff.type === 'MaxHP') maxHp += (eff.magnitude || 0);
                    if (eff.type === 'MaxEnergy') maxEnergy += (eff.magnitude || 0);
                    if (eff.type === 'MaxSynth') maxSynthEnergy += (eff.magnitude || 0);
                  });
                }
              });
            }
            if (!charObj.stats) charObj.stats = {};
            if (charObj.stats.maxHp !== maxHp || charObj.stats.maxEnergy !== maxEnergy || charObj.stats.maxSynthEnergy !== maxSynthEnergy) {
              charObj.stats.maxHp = maxHp; charObj.stats.maxEnergy = maxEnergy; charObj.stats.maxSynthEnergy = maxSynthEnergy; needsSave = true;
            }
            if (charObj.stats.hp > maxHp) { charObj.stats.hp = maxHp; needsSave = true; }
            if (charObj.stats.energy > maxEnergy) { charObj.stats.energy = maxEnergy; needsSave = true; }
            if (charObj.stats.synthEnergy > maxSynthEnergy) { charObj.stats.synthEnergy = maxSynthEnergy; needsSave = true; }

            if (needsSave) fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2));
            migratedNames.push(charNameStr.toLowerCase());
          }
        });
      }
      if (accountNeedsSave) {
        playerData.characters = migratedNames;
        fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2));
      }

      logSystem(`LOGIN SUCCESS: ${playerData.username}`);
      return res.status(200).json(populateAccountCharacters(playerData));
    }
    logSystem(`LOGIN FAILURE: ${lowerId}`, "WARN");
    res.status(401).json({ error: 'Invalid username or password.' });
  });

  app.post('/create-character', (req, res) => {
    const { uuid, charData } = req.body;
    const playerFile = path.join(PLAYER_DATA_DIR, `${uuid}.json`);
    if (!fs.existsSync(playerFile)) return res.status(404).send('Account data not found.');

    const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
    const lowerName = charData.name.toLowerCase();
    const charFile = path.join(CHAR_DATA_DIR, `${lowerName}.json`);
    if (fs.existsSync(charFile)) return res.status(400).send('Character name already exists.');

    let requestedPowersets = charData.powersets || [];
    let requestedPowers = charData.powers || [];
    const validatedPowersets = ['inherited'];
    const validatedPowers = ['brawl', 'throw-airplane', 'flashlight', 'teleport'];
    const isDev = permissionsCatalog['dev'] && (permissionsCatalog['dev'].includes('*') || permissionsCatalog['dev'].includes(lowerName));
    const bypassLimits = isDev && requestedPowersets.includes('developer');

    let unspentPowersetPicks = charData.unspentPowersetPicks || [];
    if (!bypassLimits && (Array.isArray(unspentPowersetPicks) ? unspentPowersetPicks.length : (parseInt(unspentPowersetPicks, 10) || 0)) + (requestedPowersets.length - 1) > 2) {
        unspentPowersetPicks = []; requestedPowersets = ['inherited'];
    }
    let unspentPowerPicks = charData.unspentPowerPicks !== undefined ? parseInt(charData.unspentPowerPicks, 10) : (parseInt(charData.unspentSlots, 10) || 0);
    if (!bypassLimits && unspentPowerPicks + (requestedPowers.length - 4) > 4) {
        unspentPowerPicks = 0; requestedPowers = ['brawl', 'throw-airplane', 'flashlight', 'teleport'];
    }

    const integrity = parseInt(charData.integrity, 10) || 0;
    requestedPowersets.forEach(psId => {
        if (psId === 'inherited' || validatedPowersets.includes(psId)) return;
        const psDef = serverPowersetsById[psId];
        if (psDef) {
            let isValid = true;
            if (psId === 'developer') { if (!isDev) isValid = false; }
            else {
                if (psDef.minIntegrity !== undefined && integrity < psDef.minIntegrity) isValid = false;
                if (psDef.maxIntegrity !== undefined && integrity > psDef.maxIntegrity) isValid = false;
            }
            if (isValid) validatedPowersets.push(psId);
        }
    });

    requestedPowers.forEach(powerName => {
        if (validatedPowers.includes(powerName)) return;
        let found = false;
        for (const psId of validatedPowersets) {
            const psDef = serverPowersetsById[psId];
            if (psDef && (psDef.Powers || psDef.powers || []).some(p => (p.Id || p.id) === powerName || (p.Name || p.name) === powerName)) { found = true; break; }
        }
        if (found) validatedPowers.push(powerName);
    });

    const newChar = { name: charData.name, race: charData.race || 'Human', alignment: charData.alignment || 'Neutral', city: charData.city || 'Atlas', bio: charData.bio || '', integrity: integrity, archetype: charData.archetype || 'Civilian', powers: validatedPowers, powerTray: validatedPowers.filter(p => SERVER_POWER_REGISTRY[p] ? SERVER_POWER_REGISTRY[p].type !== 'Passive' : true), powersets: validatedPowersets, unspentPowerPicks: unspentPowerPicks, unspentPowersetPicks: unspentPowersetPicks, level: 1, created: Date.now(), stats: { hp: 1000, energy: 1000, synthEnergy: 1000 }, position: { x: 0, y: 0 }, zone: 'untitled', inventory: charData.inventory || [{ id: 'rubber_chicken', name: 'Rubber Chicken', qty: 1, icon: '🍗' }, { id: 'buttons', name: 'Buttons', qty: 5, icon: '🔘' }, { id: 'slinky', name: 'Slinky', qty: 1, icon: '🌀' }], currency: charData.name.toLowerCase() === 'tim' ? 50000 : 0 };
    fs.writeFileSync(charFile, JSON.stringify(newChar, null, 2));
    playerData.characters = playerData.characters.map(c => typeof c === 'object' ? c.name.toLowerCase() : c);
    playerData.characters.push(lowerName);
    fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2));
    logSystem(`CHARACTER CREATED: ${charData.name} on account ${uuid}`);
    res.status(201).json(populateAccountCharacters(playerData));
  });

  app.post('/update-character', (req, res) => {
    const { uuid, charData } = req.body;
    const playerFile = path.join(PLAYER_DATA_DIR, `${uuid}.json`);
    if (!fs.existsSync(playerFile)) return res.status(404).send('Account data not found.');
    const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
    const charFile = path.join(CHAR_DATA_DIR, `${charData.name.toLowerCase()}.json`);
    if (!fs.existsSync(charFile)) return res.status(404).send('Character not found.');
    const charObj = JSON.parse(fs.readFileSync(charFile, 'utf8'));
    charObj.bio = charData.bio;
    fs.writeFileSync(charFile, JSON.stringify(charObj, null, 2));
    logSystem(`CHARACTER UPDATED: ${charData.name} on account ${uuid}`);
    res.status(200).json(populateAccountCharacters(playerData));
  });

  app.post('/delete-character', (req, res) => {
    const { uuid, charName } = req.body;
    const playerFile = path.join(PLAYER_DATA_DIR, `${uuid}.json`);
    if (!fs.existsSync(playerFile)) return res.status(404).send('Account data not found.');
    const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
    const charFile = path.join(CHAR_DATA_DIR, `${charName.toLowerCase()}.json`);
    if (fs.existsSync(charFile)) fs.unlinkSync(charFile);
    playerData.characters = playerData.characters.map(c => typeof c === 'object' ? c.name.toLowerCase() : c).filter(c => c !== charName.toLowerCase());
    fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2));
    logSystem(`CHARACTER DELETED: ${charName} on account ${uuid}`);
    res.status(200).json(populateAccountCharacters(playerData));
  });

  app.post('/check-char-name', async (req, res) => {
    const lowerCharName = req.body.charName?.toLowerCase();
    if (!lowerCharName) return res.status(400).json({ message: 'Character name is required.' });
    try {
      if (fs.existsSync(path.join(CHAR_DATA_DIR, `${lowerCharName}.json`))) return res.json({ available: false });
      let nameTaken = false;
      for (const file of fs.readdirSync(PLAYER_DATA_DIR)) {
        if (file.endsWith('.json')) {
          const playerData = JSON.parse(fs.readFileSync(path.join(PLAYER_DATA_DIR, file), 'utf8'));
          if (playerData.characters && playerData.characters.some(char => (typeof char === 'object' ? char.name : char).toLowerCase() === lowerCharName)) { nameTaken = true; break; }
        }
      }
      return res.json({ available: !nameTaken });
    } catch (error) {
      logSystem(`ERROR checking name availability: ${error.message}`, "ERROR");
      return res.status(500).json({ message: 'Server error when checking name availability.' });
    }
  });
};
