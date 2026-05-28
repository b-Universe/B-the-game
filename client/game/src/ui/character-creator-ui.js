export class CharacterCreatorUIManager {
  constructor(app) {
    this.app = app;
    this.setupUI();
  }

  setupUI() {
    const classItems = document.querySelectorAll('#class-list .list-item');
    const playerPreviews = [
      document.getElementById('player-preview'),
      document.getElementById('costume-player-preview'),
      document.getElementById('style-player-preview'),
      document.getElementById('archetype-player-preview'),
      document.getElementById('finalize-player-preview')
    ];
    const heritageSplash = document.getElementById('heritage-splash');
    const affinityList = document.getElementById('affinity-list');
    const heritageDescBox = document.getElementById('heritage-description');
    const heightSlider = document.getElementById('height-slider');
    const heightDisplay = document.getElementById('height-display');
    const integrityScrollbar = document.getElementById('integrity-scrollbar');
    const synthPercent = document.getElementById('synthetic-percentage');
    const mutPercent = document.getElementById('mutated-percentage');
    const footerIntegrity = document.getElementById('footer-integrity-display');
    const footerArchetype = document.getElementById('footer-archetype-display');

    // Dynamically create integrity warning element if it doesn't exist
    let integrityWarning = document.getElementById('integrity-warning');
    if (!integrityWarning) {
      integrityWarning = document.createElement('div');
      integrityWarning.id = 'integrity-warning';
      integrityWarning.style.cssText = 'display: none; color: #ff4757; font-size: 0.85rem; text-align: center; margin-top: 10px;';

      // Append it to the description box. We'll ensure it's not overwritten.
      if (heritageDescBox) {
        heritageDescBox.appendChild(integrityWarning);
      }
    }

    const heritageData = {
      standard: {
        name: 'Standard',
        description: 'As the adaptive baseline, your potential is limitless. You specialize in versatility, allowing you to bridge the gap between machine and monster without losing your core identity. Your strength lies in synergy—balancing metabolic stability with technical complexity to thrive in any environment.',
        splash: 'assets/images/ui/creator/splashes/standard.png',
        affinities: [
          { id: 'human', name: 'Human', desc: 'The neutral baseline for multi-pathing.', spriteDir: 'standard', check: v => v >= -85 && v <= 85 },
          { id: 'cyborg', name: 'Cyborg', desc: 'A fusion of organic adaptability and synthetic hardware enhancements.', spriteDir: 'cyborg', check: v => v < 0 && v > -100 },
          { id: 'automaton', name: 'Automaton', desc: 'Fully synthetic chassis offering hardware durability and complexity slots.', spriteDir: 'automaton', check: v => v === -100 }
        ]
      },
      primal: {
        name: 'Primal',
        description: 'Ancient entities from dimensional or mythic origins. As a Primal, you are naturally attuned to Arcane and biological energies, possessing high energy pools and an innate resistance to psychological debuffs. Your path lies in harnessing these raw, unbridled forces to endure and outlast your opposition.',
        splash: 'assets/images/ui/creator/splashes/primal.png',
        affinities: [
          { id: 'elven', name: 'Elven', desc: 'High energy pools and resistance to psychological debuffs.', spriteDir: 'primal', check: v => v >= -70 && v <= 70 },
          { id: 'fae', name: 'Fae', desc: 'Innate mystical resonance and enhanced agility.', spriteDir: 'primal', check: v => v >= -70 && v <= 70 },
          { id: 'gnome', name: 'Gnome', desc: 'Compact frame with high energy recovery and mystical assist compatibility.', spriteDir: 'primal', check: v => v >= -70 && v <= 70 },
          { id: 'djinn', name: 'Djinn', desc: 'Ancient elemental entity. Innate environmental manipulation and thermal resistance.', spriteDir: 'primal', check: v => v > 70 },
          { id: 'celestial', name: 'Celestial', desc: 'Entities forged from astral essence and starlight. High arcane capacity.', spriteDir: 'primal', check: v => v > 70 }
        ]
      },
      mutated: {
        name: 'Mutated',
        description: 'Species forged by extreme environmental toxins or biological instability. You possess immense Biomorphic growth potential, allowing for rapid natural regeneration and specialized organic mutations. Your unpredictable, volatile nature makes you an absolute force of devastation.',
        splash: 'assets/images/ui/creator/splashes/mutated.png',
        affinities: [
          { id: 'goblins', name: 'Goblins', desc: 'High scavenging and craft speed.', spriteDir: 'mutated', check: v => v >= -70 && v <= 70 },
          { id: 'giant', name: 'Giant', desc: 'Humans mutated by environmental toxins. High physical power.', spriteDir: 'mutated', check: v => v >= -50 && v <= 50 },
          { id: 'minotaur', name: 'Minotaur', desc: 'Beast-humanoid mutation. High momentum combat and unyielding stance.', spriteDir: 'mutated', check: v => v >= 25 && v <= 75 },
          { id: 'ogre', name: 'Ogre', desc: 'Absolute mutation. Massive health pools and metabolic damage.', spriteDir: 'mutated', check: v => v > 70 },
          { id: 'troll', name: 'Troll', desc: 'Absolute mutation. Massive health pools and metabolic damage.', spriteDir: 'mutated', check: v => v > 70 }
        ]
      },
      hybrid: {
        name: 'Hybrid',
        description: 'Currently Locked: Requires Creation Discovery via Ptouille or The Neon Girl. Hybrids achieve true multi-path mastery, fusing conflicting integrities—such as synthetic hardware and biomorphic flesh—into a single, dominant vessel.',
        splash: 'assets/images/ui/creator/splashes/standard.png',
        affinities: []
      }
    };

    const updateIntegrityWarning = () => {
      const integrityVal = parseInt(integrityScrollbar.value, 10);
      const currentClassItem = document.querySelector('#class-list .active');
      const classKey = currentClassItem ? currentClassItem.dataset.class : 'standard';

      if (integrityVal === -100 && (classKey === 'primal' || classKey === 'mutated')) {
        integrityWarning.innerText = 'Warning: 100% Synthetic Integrity is restricted to Automaton under Standard heritages.';
        integrityWarning.style.display = 'block';
      } else if (integrityVal === 100 && classKey === 'standard') {
        integrityWarning.innerText = 'Warning: 100% Mutation Integrity is restricted to specific affinities only selectable from the Heritage buttons.';
        integrityWarning.style.display = 'block';
      } else {
        integrityWarning.style.display = 'none';
      }
    };

    const updateAffinityLocks = () => {
      const currentClassItem = document.querySelector('#class-list .active');
      if (!currentClassItem) return;

      const classKey = currentClassItem.dataset.class;
      const data = heritageData[classKey];
      if (!data) return;

      const integrityVal = parseInt(integrityScrollbar.value);
      const affinityElements = document.querySelectorAll('#affinity-list .list-item');

      let hasValidActive = false;
      let firstValidItem = null;

      affinityElements.forEach(item => {
        const affinityId = item.dataset.id;
        const affinityConfig = data.affinities.find(a => a.id === affinityId);

        if (affinityConfig && affinityConfig.check(integrityVal)) {
          item.classList.remove('locked');
          if (!firstValidItem) firstValidItem = item;
          if (item.classList.contains('active')) hasValidActive = true;
        } else {
          item.classList.add('locked');
          item.classList.remove('active');
        }
      });

      if (!hasValidActive) {
        if (firstValidItem) {
          firstValidItem.click();
        } else {
          playerPreviews.forEach(p => {
            if (p) p.style.backgroundImage = 'none';
          });
        }
      }
    };

    const renderAffinities = (classKey) => {
      if (affinityList) affinityList.innerHTML = '';
      const data = heritageData[classKey];
      if (!data) return;

      if (heritageSplash) heritageSplash.src = data.splash;
      if (heritageDescBox) {
        let p = heritageDescBox.querySelector('p');
        if (!p) {
          p = document.createElement('p');
          heritageDescBox.prepend(p);
        }
        p.innerHTML = data.description;
      }

      data.affinities.forEach((affinity, index) => {
        const item = document.createElement('div');
        item.className = `list-item`;
        item.dataset.id = affinity.id;
        item.innerHTML = `
          <h4>${affinity.name}</h4>
          <p>${affinity.desc}</p>
        `;

        item.addEventListener('click', () => {
          if (item.classList.contains('locked')) {
            return this.app.showModal("Integrity Restriction", "Your current Integrity level cannot support this Affinity.");
          }
          document.querySelectorAll('#affinity-list .list-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          playerPreviews.forEach(p => {
            if (p) {
              p.style.backgroundImage = `url('assets/sprites/characters/idle-template.png')`;
              p.style.backgroundSize = '800% 1200%';
              p.style.backgroundPosition = '42.857% 0%';
              p.style.imageRendering = 'pixelated';
              p.style.animation = 'none';
            }
          });

          const activeArchItem = document.querySelector('#archetype-list .active');
          if (activeArchItem && typeof archetypesData !== 'undefined') {
            const arch = archetypesData.find(a => a.id === activeArchItem.dataset.id);
            if (arch) renderPowersetColumns(arch);
          }
        });

        affinityList.appendChild(item);
      });

      updateAffinityLocks();
      updateIntegrityWarning(); // Update warning when affinities are rendered (class changes)
    };

    classItems.forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('locked')) {
          return this.app.showModal("Feature Locked", "This Heritage Class Is Currently Unavailable.");
        }

        classItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const selectedClass = item.dataset.class;
        renderAffinities(selectedClass);
        updateIntegrityWarning(); // Update warning when class changes
      });
    });

    if (heightSlider) {
        heightSlider.addEventListener('input', () => {
        const scaleY = parseFloat(heightSlider.value);

        const widthRatio = 0.4;
        const scaleX = 1.0 + ((scaleY - 1.0) * widthRatio);

        playerPreviews.forEach(p => {
                if (p) {
                p.style.transform = `translateY(380px) scale(9) scaleX(${scaleX}) scaleY(${scaleY})`;
                }
        });

        const totalInches = Math.round(50 * scaleY + 20);
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        heightDisplay.innerText = `${feet}'${inches}"`;
        });

        heightSlider.dispatchEvent(new Event('input'));
    }

    const idCardName = document.getElementById('id-card-name');
    const finalizeNameInput = document.getElementById('char-name');
    if (finalizeNameInput && idCardName) {
      idCardName.value = finalizeNameInput.value.trim();

      finalizeNameInput.addEventListener('input', (e) => {
        idCardName.value = e.target.value;
      });
      idCardName.addEventListener('input', (e) => {
        finalizeNameInput.value = e.target.value;
      });
    }

    const idCardAlignment = document.getElementById('id-card-alignment');
    const idCardCity = document.getElementById('id-card-city');
    const deploymentWarning = document.getElementById('deployment-warning');

    const updateDeploymentWarning = () => {
      if (!idCardAlignment || !idCardCity || !deploymentWarning) return;
      const align = idCardAlignment.value;
      const city = idCardCity.value;

      if (align === 'hero' && city === 'lemon') {
        deploymentWarning.className = 'deployment-warning high-risk';
        deploymentWarning.innerHTML = `<strong class="deployment-title">High Risk Deployment</strong><br><br>You are a Hero deploying into Lemon City. The civilians do not take kindly to your presence here, and villains will have free reign to attack you.`;
      } else if ((align === 'vigilante' || align === 'villain') && city === 'atlas') {
        deploymentWarning.className = 'deployment-warning high-risk';
        deploymentWarning.innerHTML = `<strong class="deployment-title">High Risk Deployment</strong><br><br>You are deploying into Atlas City outside the bounds of the law. The Atlas police force will be actively hostile and heavily patrol the area.`;
      } else {
        deploymentWarning.className = 'deployment-warning standard';
        deploymentWarning.innerHTML = `<strong class="deployment-title">Standard Deployment</strong><br><br>Your alignment and city choice are stable. You will blend in reasonably well with the local forces.`;
      }
    };

    if (idCardAlignment && idCardCity) {
      idCardAlignment.addEventListener('change', updateDeploymentWarning);
      idCardCity.addEventListener('change', updateDeploymentWarning);
      updateDeploymentWarning();
    }

    const genderItems = document.querySelectorAll('#gender-list .list-item');
    genderItems.forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('locked')) {
          return this.app.showModal("Feature Locked", "This Gender Option Is Currently Unavailable.");
        }
        genderItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });

    if (integrityScrollbar && synthPercent && mutPercent) {
      integrityScrollbar.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val < 0) {
          synthPercent.innerText = Math.abs(val) + '%';
          mutPercent.innerText = '0%';
        } else if (val > 0) {
          synthPercent.innerText = '0%';
          mutPercent.innerText = val + '%';
        } else {
          synthPercent.innerText = '0%';
          mutPercent.innerText = '0%';
        }

        if (footerIntegrity) {
          footerIntegrity.innerText = `Integrity: ${val > 0 ? '+' : ''}${val}%`;
        }

        updateAffinityLocks();
        updateIntegrityWarning(); // Update warning when integrity changes

        const activeArchItem = document.querySelector('#archetype-list .active');
        if (activeArchItem && typeof archetypesData !== 'undefined') {
          const arch = archetypesData.find(a => a.id === activeArchItem.dataset.id);
          if (arch) renderPowersetColumns(arch);
        }
      });
    }

    const styleItems = document.querySelectorAll('#style-list .list-item');
    const styleSplash = document.getElementById('style-splash');
    const styleDescBox = document.getElementById('style-description');
    const styleSkillsList = document.getElementById('style-skills-list');
    const equipDetailsBox = document.getElementById('equip-details-box');
    const defaultEquipText = `<p>Hover over an item to view its details. This area can now hold significantly more text about the item's stats, history, and Integrity requirements without breaking your UI layout. If it gets too long, it will simply scroll!</p>`;

    const styleData = {
      standard: {
        description: 'Recommended for new players. The baseline experience where players function as independent entities. You can team up with others or run solo without penalties. Standard players typically originate as Manifested, are created synthetically, or are brought to the city by normal means.',
        splash: 'assets/images/ui/creator/splashes/standard.png',
        skills: [
          { name: 'Diversity Synergy', desc: 'Gains Efficiency and Recovery boosts for every standard player in your party.' },
          { name: 'Integrity Versatility', desc: 'Can maintain moderate levels of both Synthetic and Mutation Integrity simultaneously.' },
          { name: 'Adaptive Link', desc: 'Efficiency scales with the proximity of other players in the party.' }
        ],
        equipment: {
          'chest': { name: 'Standard Issue Vest', desc: 'Basic Kevlar weave for street-level protection. Reliable and easy to repair.' },
          'left-hand': { name: 'Vibro-Knife', desc: 'Standard close-quarters blade. Emits a low-frequency hum.' },
          'feet': { name: 'Tactical Boots', desc: 'Durable footwear with excellent grip for urban environments.' }
        }
      },
      ironman: {
        description: 'Reject the collective to maximize your Sovereign potential. You become the raid boss of your own story, gaining massive stat multipliers but losing strength when other players interfere with your proximity. You can be affected by other players but cannot aid or trade with others.',
        splash: 'assets/images/ui/creator/splashes/standard.png',
        skills: [
          { name: 'Tactical Advantage', desc: 'High base defense and damage that increases when enemies surround you.' },
          { name: 'Self Sustain', desc: 'High Max HP and Energy; regenerative abilities are most effective when solo.' },
          { name: 'Unyielding Mind', desc: 'Immune to signal interference and status effects because there is no network link to exploit.' }
        ],
        equipment: {
          'helmet': { name: 'Sovereign Visor', desc: 'Heavily armored headgear with an integrated lone-wolf HUD.' },
          'chest': { name: 'Heavy Plating', desc: 'Thick armor plating designed to withstand blows from multiple attackers.' },
          'right-hand': { name: 'Assault Gauntlet', desc: 'Hydraulic-powered gauntlet for devastating melee strikes.' }
        }
      },
      neural: {
        description: 'The Neural or Pet type players - operators controlling multiple entities like a hivemind pathogen or a coordinated robotic network. You multiply your efficiency through shared systems, mirroring the command structure of The Galactic Federation of B.',
        splash: 'assets/images/ui/creator/splashes/standard.png',
        skills: [
          { name: 'Shared Vision', desc: 'If one unit sees an enemy, the entire group detects it regardless of individual line-of-sight.' },
          { name: 'Distributed Efficiency', desc: 'Efficiency and critical multipliers scale exponentially when units are in close proximity.' },
          { name: 'Distributed Trauma', desc: 'The ability to share incoming damage across the group to prevent unit loss.' }
        ],
        equipment: {
          'helmet': { name: 'Neural Uplink Band', desc: 'High-bandwidth neural transmitter for commanding networked units.' },
          'backpack': { name: 'Signal Amplifier', desc: 'Boosts command range and minimizes signal degradation.' },
          'amulet': { name: 'Processing Core', desc: 'External co-processor to handle simultaneous unit commands.' }
        }
      }
    };

    const renderStyle = (styleKey) => {
      if (styleSkillsList) styleSkillsList.innerHTML = '';
      const data = styleData[styleKey];
      if (!data) return;

      if (styleSplash) styleSplash.src = data.splash;
      if (styleDescBox) styleDescBox.innerHTML = `<p>${data.description}</p>`;

      data.skills.forEach(skill => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.cursor = 'default';
        item.innerHTML = `
          <h4>${skill.name}</h4>
          <p>${skill.desc}</p>
        `;
        if (styleSkillsList) styleSkillsList.appendChild(item);
      });

      const equipSlots = document.querySelectorAll('.equip-slot');
      equipSlots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const equipItem = data.equipment && data.equipment[slotType];

        if (equipItem) {
          slot.style.backgroundColor = 'rgba(0, 210, 255, 0.2)';
          slot.style.borderColor = 'var(--accent-neon)';
          slot.style.cursor = 'pointer';

          slot.onmouseenter = () => {
            if (equipDetailsBox) equipDetailsBox.innerHTML = `<p><strong style="color: var(--accent-neon);">${equipItem.name}</strong><br><br>${equipItem.desc}</p>`;
          };
          slot.onmouseleave = () => {
            if (equipDetailsBox) equipDetailsBox.innerHTML = defaultEquipText;
          };
        } else {
          slot.style.backgroundColor = 'rgba(116, 185, 255, 0.1)';
          slot.style.borderColor = 'var(--text-dim)';
          slot.style.cursor = 'default';
          slot.onmouseenter = null;
          slot.onmouseleave = null;
        }
      });
    };

    styleItems.forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('locked')) return;
        styleItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        renderStyle(item.dataset.style);
      });
    });

    const customizerNavItems = Array.from(document.querySelectorAll('.customizer-nav .nav-item'));
    const stepPanels = document.querySelectorAll('.step-panel');
    const btnNextStep = document.getElementById('btn-next-step');
    const btnSaveChar = document.getElementById('btn-save-char');
    const btnCancelCreate = document.getElementById('btn-cancel-create');
    let currentStepIndex = 0;

    const navigateToStep = (index) => {
      if (index < 0 || index >= customizerNavItems.length) return;
      currentStepIndex = index;
      const stepName = customizerNavItems[currentStepIndex].dataset.step;

      customizerNavItems.forEach((item, i) => {
        item.classList.toggle('active', i === currentStepIndex);
      });

      stepPanels.forEach(panel => {
        if (panel.id === `step-${stepName}`) {
          panel.style.display = 'flex';
          panel.classList.add('active');
        } else {
          panel.style.display = 'none';
          panel.classList.remove('active');
        }
      });

      if (currentStepIndex === customizerNavItems.length - 1) {
        btnNextStep.style.display = 'none';
        btnSaveChar.style.display = 'block';
      } else {
        btnNextStep.style.display = 'block';
        btnSaveChar.style.display = 'none';
      }
    };

    customizerNavItems.forEach((item, index) => {
      item.addEventListener('click', () => navigateToStep(index));
    });

    if (btnNextStep) {
      btnNextStep.addEventListener('click', () => navigateToStep(currentStepIndex + 1));
    }

    if (btnCancelCreate) {
      btnCancelCreate.addEventListener('click', () => {
        if (currentStepIndex > 0) {
          navigateToStep(currentStepIndex - 1);
        } else {
          document.getElementById('character-creator-screen').style.display = 'none';
          document.getElementById('selection-screen').style.display = 'block';
        }
      });
    }

    const archetypesData = [
        { id: 'civilian', name: 'Civilian', desc: 'No Archetype, choose later. Pick 3 powers from a single powerset, or not.', cols: [{ label: 'Primary Powerset', picks: 3 }] },
        { id: 'brute', name: 'Brute', desc: 'Melee Focus. High melee damage.', cols: [{ label: 'Primary (Melee)', picks: 2 }, { label: 'Secondary', picks: 1 }] },
        { id: 'blaster', name: 'Blaster', desc: 'Ranged Focus. High ranged damage.', cols: [{ label: 'Primary (Ranged)', picks: 2 }, { label: 'Secondary', picks: 1 }] },
        { id: 'tank', name: 'Tank', desc: 'Defense Focus. Avoidance and survival.', cols: [{ label: 'Primary (Defense)', picks: 2 }, { label: 'Secondary', picks: 1 }] },
        { id: 'team_support', name: 'Team Support', desc: 'Support Focus. Team buffs.', cols: [{ label: 'Primary (Support)', picks: 2 }, { label: 'Secondary', picks: 1 }] },
        { id: 'controller', name: 'Controller', desc: 'Control Focus. Crowd control and status effect dominance.', cols: [{ label: 'Primary (Control)', picks: 2 }, { label: 'Secondary', picks: 1 }] },
        { id: 'hivemind_simple', name: 'Hivemind', desc: 'Neural Focus. Multitasking via summoned or linked units.', cols: [{ label: 'Primary (Neural)', picks: 2 }, { label: 'Secondary', picks: 1 }] },
        { id: 'super_tank', name: 'Super Tank', desc: 'Pure mitigation followed by avoidance.', cols: [{ label: 'Primary (Resistance)', picks: 2 }, { label: 'Secondary (Defense)', picks: 2 }] },
        { id: 'scrapper', name: 'Scrapper', desc: 'Balanced melee survival and output.', cols: [{ label: 'Primary (Melee)', picks: 2 }, { label: 'Secondary (Defense)', picks: 2 }] },
        { id: 'sentinel', name: 'Sentinel', desc: 'Durable ranged combatant.', cols: [{ label: 'Primary (Ranged)', picks: 2 }, { label: 'Secondary (Defense)', picks: 2 }] },
        { id: 'dominator', name: 'Dominator', desc: 'Direct control with aggressive melee backup.', cols: [{ label: 'Primary (Control)', picks: 2 }, { label: 'Secondary (Melee/Ranged)', picks: 2 }] },
        { id: 'archon', name: 'Archon', desc: 'Disrupting enemies while bolstering allies.', cols: [{ label: 'Primary (Control)', picks: 2 }, { label: 'Secondary (Support)', picks: 2 }] },
        { id: 'defender', name: 'Defender', desc: 'Team buffs and healing with ranged utility.', cols: [{ label: 'Primary (Support)', picks: 2 }, { label: 'Secondary (Melee/Ranged)', picks: 2 }] },
        { id: 'hardline', name: 'Hardline', desc: 'Team buffs mixed with defensive focus.', cols: [{ label: 'Primary (Support)', picks: 2 }, { label: 'Secondary (Defense)', picks: 2 }] },
        { id: 'catalyst', name: 'Catalyst', desc: 'Multi-unit management with support focus.', cols: [{ label: 'Primary (Neural)', picks: 2 }, { label: 'Secondary (Support)', picks: 2 }] },
        { id: 'tactician', name: 'Tactician', desc: 'Unit management mixed with field control.', cols: [{ label: 'Primary (Neural)', picks: 2 }, { label: 'Secondary (Control)', picks: 2 }] },
        { id: 'enforcer', name: 'Enforcer', desc: 'Melee damage that debuffs or heals.', cols: [{ label: 'Primary (Melee)', picks: 2 }, { label: 'Secondary (Support/Control)', picks: 2 }] },
        { id: 'paladin', name: 'Paladin', desc: 'Close quarters combat that buffs the party.', cols: [{ label: 'Primary (Melee)', picks: 2 }, { label: 'Secondary (Support)', picks: 2 }] },
        { id: 'glass_cannon', name: 'Glass Cannon', desc: 'Absolute high-damage glass cannon.', cols: [{ label: 'Primary (Ranged/Melee)', picks: 2 }, { label: 'Secondary (Melee/Ranged)', picks: 2 }] }
    ];

    let rawPowersetsData = { Melee: [], Ranged: [], Defense: [], Resistance: [], Support: [], Control: [], Neural: [], Travel: [], Innate: [] };

    const loadPowersets = async () => {
      try {
        const res = await fetch('/api/powersets');
        if (!res.ok) throw new Error("Failed to fetch powersets API");
        const json = await res.json();

        for (const [catKey, powersetsList] of Object.entries(json)) {
          if (!rawPowersetsData[catKey]) rawPowersetsData[catKey] = [];

          powersetsList.forEach(ps => {
            if (!ps.Id && !ps.id) return;

            let reqCheck = () => true;

            if (ps.minIntegrity !== undefined && ps.maxIntegrity !== undefined) {
              reqCheck = (v) => v >= ps.minIntegrity && v <= ps.maxIntegrity;
            } else if (ps.requiresAffinity) {
              reqCheck = (v, heritageClass, affinity) => affinity === ps.requiresAffinity;
            } else if (ps.requiresHeritage) {
              reqCheck = (v, heritageClass) => heritageClass === ps.requiresHeritage;
            } else {
              const reqStr = (ps.Requirement || ps.requirement || ps.IntegrityRequirement || ps.integrityRequirement || '').toLowerCase();

              if (reqStr.includes('hidden')) {
                reqCheck = () => false;
              } else if (reqStr.includes('0% integrity') || reqStr.includes('purity') || reqStr.includes('baseline') || reqStr.includes('pure')) {
                reqCheck = (v) => v >= -70 && v <= 70;
              } else if (reqStr.includes('synthetic exclusive') || reqStr.includes('synthetic')) {
                reqCheck = (v) => v < 0;
              } else if (reqStr.includes('mutated exclusive') || reqStr.includes('mutation') || reqStr.includes('mutated')) {
                reqCheck = (v) => v > 0;
              } else if (reqStr.includes('fae exclusive') || reqStr.includes('fae only')) {
                reqCheck = (v, heritageClass, affinity) => affinity === 'fae';
              } else if (reqStr.includes('gnome exclusive') || reqStr.includes('gnome only')) {
                reqCheck = (v, heritageClass, affinity) => affinity === 'gnome';
              } else if (reqStr.includes('hybrid') || reqStr.includes('mixed')) {
                reqCheck = (v, heritageClass) => heritageClass === 'hybrid';
              } else if (reqStr !== '') {
                reqCheck = () => false;
              }
            }

              let powers = [];
              if (ps.Powers && Array.isArray(ps.Powers)) {
                powers = ps.Powers.map((p, i) => ({ id: p.Id || p.id || `${ps.Id || ps.id}-p${i+1}`, name: p.Name || p.name || `Power ${i+1}`, desc: p.Description || p.desc || p.Focus || '' }));
              } else if (ps.powers && Array.isArray(ps.powers)) {
                powers = ps.powers.map((p, i) => ({ id: p.id || p.Id || `${ps.id || ps.Id}-p${i+1}`, name: p.name || p.Name || `Power ${i+1}`, desc: p.desc || p.description || p.Description || p.Focus || '' }));
              } else {
                powers = Array.from({ length: 6 }, (_, i) => ({ id: `${ps.Id || ps.id}-p${i+1}`, name: `${ps.Name || ps.name} Rank ${i+1}`, desc: `Unlocks Rank ${i+1} capabilities of the ${ps.Name || ps.name} skillset.` }));
              }

            rawPowersetsData[catKey].push({
              id: ps.Id || ps.id,
              name: ps.Name || ps.name || 'Unnamed',
              desc: ps.Focus || ps.Theme || ps.desc || ps.description || '',
              check: reqCheck,
              powers: powers
            });
          });
        }
      } catch (err) {
        console.error("Error loading powersets:", err);
      }

      if (Object.values(rawPowersetsData).flat().length === 0) {
        rawPowersetsData['Melee'].push({ id: 'fallback', name: 'Fallback Powerset', desc: 'No JSON loaded.', check: () => true, powers: Array.from({ length: 6 }, (_, i) => ({ id: `fb${i}`, name: `Power ${i+1}`, desc: 'Fallback' })) });
      }

      renderArchetypes();
    };

    const powersetColumnsContainer = document.getElementById('powerset-columns-container');
    const powerDescriptionBox = document.getElementById('power-description');

    const getAvailablePowersets = (label) => {
      const integrityVal = parseInt(document.getElementById('integrity-scrollbar').value, 10);
      const activeClassItem = document.querySelector('#class-list .active');
      const activeClass = activeClassItem ? activeClassItem.dataset.class : 'standard';
      const activeAffinityItem = document.querySelector('#affinity-list .active');
      const activeAffinity = activeAffinityItem ? activeAffinityItem.dataset.id : null;

      const match = label.match(/\(([^)]+)\)/);

      let combined = [];
      if (!match) {
        combined = Object.values(rawPowersetsData).flat();
      } else {
        const types = match[1].split('/');
        types.forEach(t => {
          if (rawPowersetsData[t]) combined = combined.concat(rawPowersetsData[t]);
        });
        if (combined.length === 0) combined = Object.values(rawPowersetsData).flat();
      }

      return combined.filter(ps => ps.check ? ps.check(integrityVal, activeClass, activeAffinity) : true);
    };

    const renderPowersetColumns = (arch) => {
      const currentSelections = {};
      const existingCols = powersetColumnsContainer.querySelectorAll('.powerset-col');
      existingCols.forEach((colDiv, idx) => {
        const select = colDiv.querySelector('.powerset-dropdown');
        const activePowers = Array.from(colDiv.querySelectorAll('.power-item.active')).map(item => item.innerText);
        if (select) {
          currentSelections[idx] = { value: select.value, activePowers };
        }
      });

      powersetColumnsContainer.innerHTML = '';

      arch.cols.forEach((col, colIndex) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'powerset-col';

        let availableSets = getAvailablePowersets(col.label);

        let prevSelection = currentSelections[colIndex];
        let selectedValue = prevSelection ? prevSelection.value : undefined;
        let activePowerNames = prevSelection ? prevSelection.activePowers : [];

        if (selectedValue === undefined || (selectedValue !== '' && !availableSets.find(ps => ps.id === selectedValue))) {
          selectedValue = availableSets.length > 0 ? availableSets[0].id : '';
          activePowerNames = [];
        }

        let optionsHtml = `<option value="">-- None --</option>` + availableSets
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(ps => `<option value="${ps.id}" ${ps.id === selectedValue ? 'selected' : ''}>${ps.name}</option>`)
          .join('');

        colDiv.innerHTML = `
          <div class="powerset-header">
            <h4>${col.label}</h4>
            <span class="picks-display" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim);">Picks Remaining: ${col.picks}</span>
            <select class="powerset-dropdown">${optionsHtml}</select>
          </div>
          <div class="power-list"></div>
        `;

        const listDiv = colDiv.querySelector('.power-list');
        const picksDisplay = colDiv.querySelector('.picks-display');
        const selectEl = colDiv.querySelector('.powerset-dropdown');

        const renderPowers = (set, preservedPicks = []) => {
          listDiv.innerHTML = '';
          let currentPicks = col.picks - preservedPicks.length;
          picksDisplay.innerText = `Picks Remaining: ${currentPicks}`;
          powerDescriptionBox.innerHTML = `<p>Select A Power To View Its Details.</p>`;

          if (!set) {
            listDiv.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px; font-family: var(--font-mono); font-size: 0.85rem;">No Powerset Selected.<br><br>You will retain this powerset pick for later.</div>`;
            return;
          }

          const powerItems = [];

          set.powers.forEach((p, i) => {
            const isLocked = i >= 2;
            const item = document.createElement('div');
            item.className = `list-item power-item ${isLocked ? 'locked' : ''}`;
            item.dataset.id = p.id;
            item.style.marginBottom = '0';
            item.style.padding = '10px';
            item.style.fontSize = '0.85rem';
            item.style.textAlign = 'center';
            item.innerText = p.name;

            if (preservedPicks.includes(p.name)) {
              item.classList.add('active');
            }

            item.addEventListener('click', () => {
              if (item.classList.contains('locked')) {
                this.app.showModal("Power Locked", "You must select earlier powers in this tree before unlocking this one.");
                return;
              }

              const isActive = item.classList.contains('active');

              if (!isActive) {
                if (currentPicks <= 0) {
                  return this.app.showModal("Max Powers Reached", "You have no more power picks remaining for this column.");
                }
                item.classList.add('active');
                currentPicks--;
              } else {
                item.classList.remove('active');
                currentPicks++;
              }

              powerItems.forEach((pItem, idx) => {
                let isUnlocked = false;
                if (idx <= 1) {
                  isUnlocked = true;
                } else {
                  const prev1Active = powerItems[idx - 1].classList.contains('active');
                  const prev2Active = powerItems[idx - 2].classList.contains('active');
                  isUnlocked = prev1Active || prev2Active;
                }

                if (isUnlocked) {
                  pItem.classList.remove('locked');
                } else {
                  pItem.classList.add('locked');
                  if (pItem.classList.contains('active')) {
                    pItem.classList.remove('active');
                    currentPicks++;
                  }
                }
              });

              picksDisplay.innerText = `Picks Remaining: ${currentPicks}`;
              powerDescriptionBox.innerHTML = `<p><strong style="color: var(--accent-neon);">${p.name}</strong><br><br>${p.desc}</p>`;
            });

            powerItems.push(item);
            listDiv.appendChild(item);
          });

          if (preservedPicks.length > 0) {
            powerItems.forEach((pItem, idx) => {
              if (idx > 1) {
                const prev1Active = powerItems[idx - 1].classList.contains('active');
                const prev2Active = powerItems[idx - 2].classList.contains('active');
                if (prev1Active || prev2Active) pItem.classList.remove('locked');
              }
            });
          }
        };

        selectEl.addEventListener('change', (e) => {
          const selectedSet = availableSets.find(ps => ps.id === e.target.value);
          renderPowers(selectedSet || null, []);
        });

        const initialSet = availableSets.find(ps => ps.id === selectedValue);
        if (initialSet) {
          renderPowers(initialSet, activePowerNames);
        }

        powersetColumnsContainer.appendChild(colDiv);
      });
    };

    const archetypeListEl = document.getElementById('archetype-list');
    const renderArchetypes = () => {
      if (!archetypeListEl) return;
      archetypeListEl.innerHTML = '';
      archetypesData.forEach((arch, index) => {
        const item = document.createElement('div');
            item.className = `list-item ${index === 0 ? 'active' : ''}`;
            item.dataset.id = arch.id;
        item.innerHTML = `<h4>${arch.name}</h4><p style="font-size: 0.8rem; margin-top: 5px;">${arch.desc}</p>`;
        item.addEventListener('click', () => {
          document.querySelectorAll('#archetype-list .list-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          if (footerArchetype) footerArchetype.innerText = arch.name;
          renderPowersetColumns(arch);
        });
        archetypeListEl.appendChild(item);
      });
      renderPowersetColumns(archetypesData[0]);
      if (footerArchetype && archetypesData.length > 0) footerArchetype.innerText = archetypesData[0].name;
    };

    const btnSkipArchetype = document.getElementById('btn-skip-archetype');
    if (btnSkipArchetype) {
      btnSkipArchetype.addEventListener('click', () => {
        const civilianItem = Array.from(document.querySelectorAll('#archetype-list .list-item')).find(i => i.querySelector('h4').innerText === 'Civilian');
        if (civilianItem) civilianItem.click();

        navigateToStep(currentStepIndex + 1);
      });
    }

    const charNameInput = document.getElementById('char-name');
    const nameCheckIcon = document.querySelector('.name-check');

    if (nameCheckIcon) {
        nameCheckIcon.addEventListener('click', async () => {
        const charName = charNameInput.value.trim();

        if (!charName) {
            return this.app.showModal("Input Error", "Character name cannot be empty.");
        }

        try {
            const response = await fetch('/check-char-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ charName })
            });

            const result = await response.json();

            if (result.available) {
            this.app.showModal("Name Available", `The name "${charName}" is available!`);
            } else {
            this.app.showModal("Name Unavailable", `The name "${charName}" is already taken.`);
            }
        } catch (error) {
            this.app.showModal("Error", "Could not check name availability. Please try again later.");
            console.error("Error checking name availability:", error);
        }
        });
    }

    if (btnSaveChar) {
      let pendingCharData = null;
      const confirmModal = document.getElementById('confirm-modal');

      btnSaveChar.addEventListener('click', async () => {
        const charName = document.getElementById('char-name').value.trim();
        if (!charName) return this.app.showModal("Input Error", "Character name cannot be empty.");

        const activeHeritageItem = document.querySelector('#class-list .active');
        const activeAffinityItem = document.querySelector('#affinity-list .active');

        if (!activeHeritageItem) {
          return this.app.showModal("Selection Incomplete", "You must select a Heritage before finalizing your character.");
        }
        if (!activeAffinityItem) {
          return this.app.showModal("Selection Incomplete", "You must select an Affinity within your chosen Heritage before finalizing.");
        }

        try {
          const response = await fetch('/check-char-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ charName })
          });
          const result = await response.json();
          if (!result.available) return this.app.showModal("Name Unavailable", `The name "${charName}" is already taken.`);
        } catch (error) {
          return this.app.showModal("Error", "Could not check name availability with the server.");
        }

        const activeArchItem = document.querySelector('#archetype-list .active');
        const activePowers = [];
        const activePowersets = [];
        document.querySelectorAll('.powerset-col').forEach(col => {
          const select = col.querySelector('.powerset-dropdown');
          const activeItems = col.querySelectorAll('.power-item.active');
          if (select && select.value !== '' && activeItems.length > 0) activePowersets.push(select.value);
          activeItems.forEach(item => activePowers.push(item.dataset.id || item.innerText));
        });

        let unspentPowerPicks = 0;
        document.querySelectorAll('.picks-display').forEach(display => {
          const match = display.innerText.match(/\d+/);
          if (match) unspentPowerPicks += parseInt(match[0], 10);
        });

        let unspentPowersetPicks = [];
        if (activeArchItem && typeof archetypesData !== 'undefined') {
          const arch = archetypesData.find(a => a.id === activeArchItem.dataset.id);
          document.querySelectorAll('.powerset-col').forEach((col, index) => {
            const select = col.querySelector('.powerset-dropdown');
            const activeItems = col.querySelectorAll('.power-item.active');
            if (select && (select.value === '' || activeItems.length === 0)) {
                if (arch && arch.cols && arch.cols[index]) {
                    const label = arch.cols[index].label;
                    const match = label.match(/\(([^)]+)\)/);
                    if (match) {
                        let types = match[1].toLowerCase().split('/');
                        types = types.map(t => t.trim() === 'neural' ? 'neural-minion' : t.trim());
                        unspentPowersetPicks.push(types.join('/'));
                    } else {
                        unspentPowersetPicks.push("any");
                    }
                } else {
                    unspentPowersetPicks.push("any");
                }
            }
          });
        }

        const heritage = activeHeritageItem.dataset.class;
        const affinityData = heritageData[heritage].affinities.find(a => a.id === activeAffinityItem.dataset.id);

        pendingCharData = {
          name: charName,
          heritage: heritage,
          race: affinityData ? affinityData.name : 'Human',
          alignment: document.getElementById('id-card-alignment').value,
          city: document.getElementById('id-card-city').value,
          bio: document.getElementById('char-bio').value.trim(),
          integrity: parseInt(document.getElementById('integrity-scrollbar').value, 10),
          archetype: activeArchItem ? activeArchItem.querySelector('h4').innerText : 'Civilian',
          powers: activePowers,
          powersets: activePowersets,
          unspentPowerPicks: unspentPowerPicks,
          unspentPowersetPicks: unspentPowersetPicks
        };

        confirmModal.style.display = 'flex';
      });

      document.getElementById('confirm-no').onclick = () => confirmModal.style.display = 'none';
      document.getElementById('confirm-yes').onclick = async () => {
        confirmModal.style.display = 'none';
        try {
          const updatedAccount = await this.app.auth.createCharacter(this.app.currentAccount.uuid, pendingCharData);
          this.app.currentAccount = updatedAccount;
          localStorage.setItem('b_current_account', JSON.stringify(updatedAccount));

          const newChar = this.app.currentAccount.characters.find(c => c.name === pendingCharData.name);

          document.getElementById('character-creator-screen').style.display = 'none';
          document.getElementById('game-screen').style.display = 'block';

          import(`./game/engine.js?v=${Date.now()}`).then(module => {
            if (window.currentGameEngine) window.currentGameEngine.stop();
            window.currentGameEngine = new module.GameEngine('game-canvas', newChar, this.app.currentAccount.uuid);
          }).catch(err => {
            console.error("Engine Import Error:", err);
            this.app.showModal("Engine Error", "Failed to load engine.js. Open your browser console (F12) to see the exact file path error.");
          });
        } catch (err) {
          this.app.showModal("System Error", err.message);
        }
      };
    }

    renderAffinities('standard');
    renderStyle('standard');
    updateIntegrityWarning(); // Initial update for the warning
    loadPowersets();
  }
}
