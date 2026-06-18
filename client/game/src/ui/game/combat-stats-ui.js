import { BaseWindow } from '../base-window.js?v=cache-bust-005';
import { UI_COLORS } from './constants.js?v=cache-bust-005';

export class CombatStatsWindow extends BaseWindow {
  constructor() {
    super('combat-stats-window', 'Combat Statistics', { width: 400, height: 500, x: 100, y: 100 });
    this.setContent(`
      <div style="display: flex; flex-direction: column; height: 100%; gap: 10px; padding: 5px; font-family: var(--font-mono); font-size: 0.85rem; overflow-y: auto;">

        <!-- Health Section -->
        <div style="border: 1px solid ${UI_COLORS.success}; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.4);">
          <div style="color: ${UI_COLORS.success}; font-weight: bold; margin-bottom: 5px; text-transform: capitalize; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8); display: flex; justify-content: space-between;"><span>Health & Healing</span> <span style="color: ${UI_COLORS.warning}; font-size: 0.8rem;">Lv. <span id="cs-level">1</span></span></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="display: flex; justify-content: space-between;"><span>Current HP:</span> <span id="cs-hp" style="color: ${UI_COLORS.success};">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Max HP:</span> <span id="cs-max-hp" style="color: ${UI_COLORS.success};">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Regeneration:</span> <span id="cs-hp-regen">0.0 / s</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Absorption:</span> <span id="cs-absorb">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Healing Strength:</span> <span id="cs-heal-out">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Healing Res:</span> <span id="cs-heal-in">+0%</span></div>
          </div>
        </div>

        <!-- Energy & Battery Section -->
        <div style="border: 1px solid #0984e3; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.4);">
          <div style="color: #0984e3; font-weight: bold; margin-bottom: 5px; text-transform: capitalize; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Energy & Battery</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="color: #0984e3; text-align: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 2px;">Energy</div>
            <div style="color: ${UI_COLORS.cyan}; text-align: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 2px;">Battery</div>
            <div style="display: flex; justify-content: space-between;"><span>Current:</span> <span id="cs-en">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Current:</span> <span id="cs-bat">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Max:</span> <span id="cs-max-en">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Max:</span> <span id="cs-max-bat">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Recovery:</span> <span id="cs-en-rec">0.0 / s</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Recovery:</span> <span id="cs-bat-rec">0.0 / s</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Drain:</span> <span id="cs-en-drain">0.0 / s</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Drain:</span> <span id="cs-bat-drain">0.0 / s</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Discount:</span> <span id="cs-en-disc">-0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Discount:</span> <span id="cs-bat-disc">-0%</span></div>
          </div>
        </div>

        <!-- Combat Section -->
        <div style="border: 1px solid ${UI_COLORS.error}; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.4);">
          <div style="color: ${UI_COLORS.error}; font-weight: bold; margin-bottom: 5px; text-transform: capitalize; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Combat</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="display: flex; justify-content: space-between;"><span>Damage Bonus:</span> <span id="cs-dmg">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Thorns:</span> <span id="cs-thorns">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Crit Chance:</span> <span id="cs-crit-chance">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Crit Dmg:</span> <span id="cs-crit-dmg">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Accuracy:</span> <span id="cs-acc">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>ToHit Bonus:</span> <span id="cs-tohit">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Recharge:</span> <span id="cs-recharge">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Control Bonus:</span> <span id="cs-control">+0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Stealth Radius:</span> <span id="cs-stealth">0 ft</span></div>
            <div></div>
          </div>
        </div>

        <div style="border: 1px solid ${UI_COLORS.orange}; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.4);">
          <div style="color: ${UI_COLORS.orange}; font-weight: bold; margin-bottom: 5px; text-transform: capitalize; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Resistance & Defense</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="display: flex; justify-content: space-between;"><span>Smashing Res:</span> <span id="cs-res-smashing">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Smashing Def:</span> <span id="cs-def-smashing">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Lethal Res:</span> <span id="cs-res-lethal">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Lethal Def:</span> <span id="cs-def-lethal">0%</span></div>
          </div>
          <div style="margin-top: 5px; color: #aaa; font-size: 0.75rem;">Debuff Resistance</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="display: flex; justify-content: space-between;"><span>Resistance Debuff:</span> <span id="cs-res-resdebuff">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Defense Debuff:</span> <span id="cs-res-defdebuff">0%</span></div>
          </div>
        </div>

        <div style="border: 1px solid ${UI_COLORS.purple}; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.4);">
          <div style="color: ${UI_COLORS.purple}; font-weight: bold; margin-bottom: 5px; text-transform: capitalize; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Status Protection & Resistance</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="display: flex; justify-content: space-between;"><span>Hold Prot:</span> <span id="cs-prot-hold">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Hold Res:</span> <span id="cs-res-hold">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Stun Prot:</span> <span id="cs-prot-stun">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Stun Res:</span> <span id="cs-res-stun">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Sleep Prot:</span> <span id="cs-prot-sleep">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Sleep Res:</span> <span id="cs-res-sleep">0%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Snare Prot:</span> <span id="cs-prot-snare">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Snare Res:</span> <span id="cs-res-snare">0%</span></div>
          </div>
        </div>

        <!-- Target Comparison Section -->
        <div id="cs-target-section" style="border: 1px solid ${UI_COLORS.error}; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.4); display: none; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" id="cs-target-header">
            <span style="color: ${UI_COLORS.error}; font-weight: bold; text-transform: capitalize; text-shadow: 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.8);">Target Comparison</span>
            <span id="cs-target-toggle">▼</span>
          </div>
          <div id="cs-target-content" style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between;"><span>Target:</span> <span id="cs-target-name" style="color: #fff; font-weight: bold;">None</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Level Diff:</span> <span id="cs-target-level-diff">0</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Base Hit Chance:</span> <span id="cs-target-hit-chance" style="color: ${UI_COLORS.warning};">50%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Damage Mult:</span> <span id="cs-target-dmg-mult" style="color: ${UI_COLORS.error};">100%</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Damage Res (You):</span> <span id="cs-target-res-mult" style="color: ${UI_COLORS.primary};">0%</span></div>
          </div>
        </div>

      </div>
    `);

    const targetHeader = document.getElementById('cs-target-header');
    if (targetHeader) {
      targetHeader.onclick = () => {
        const content = document.getElementById('cs-target-content');
        const toggle = document.getElementById('cs-target-toggle');
        if (content.style.display === 'none') {
          content.style.display = 'flex';
          toggle.innerText = '▼';
        } else {
          content.style.display = 'none';
          toggle.innerText = '▶';
        }
      };
    }
  }
}

export class CombatStatsUIManager {
  constructor(engine, mainUIManager) {
    this.engine = engine;
    this.ui = mainUIManager;
    this.window = new CombatStatsWindow();
  }

  toggle() {
    if (this.window.element.style.display === 'none') {
      this.window.open();
      this.updateStats();
    } else {
      this.window.close();
    }
  }

  updateStats() {
    if (this.window.element.style.display === 'none') return;

    const eng = this.engine;
    const player = eng.player;
    const pd = eng.playerData;

    document.getElementById('cs-hp').innerText = `${Math.floor(player.hp)}`;
    document.getElementById('cs-max-hp').innerText = `${player.maxHp}`;
    document.getElementById('cs-en').innerText = `${Math.floor(player.energy)}`;
    document.getElementById('cs-max-en').innerText = `${player.maxEnergy}`;
    document.getElementById('cs-bat').innerText = `${Math.floor(player.synthEnergy)}`;
    document.getElementById('cs-max-bat').innerText = `${player.maxSynthEnergy || 1000}`;
    document.getElementById('cs-level').innerText = pd.level || 1;

    let hpRegen = 1;
    let enRec = 0;
    let batRec = 0;
    let enDrain = 0;
    let batDrain = 0;

    let stats = {
      tohit: 0, acc: 0, dmg: 0, thorns: 0, recharge: 0, healOut: 0, healIn: 0, absorb: 0, endDisc: 0, batDisc: 0, stealth: 0,
      critChance: 5, critDmg: 50, control: 0,
      resSmash: 0, defSmash: 0, resLethal: 0, defLethal: 0, resDefDebuff: 0, resResDebuff: 0,
      protHold: 0, resHold: 0, protStun: 0, resStun: 0, protSleep: 0, resSleep: 0, protSnare: 0, resSnare: 0
    };

    const applyStats = (pDef) => {
      if (!pDef || !pDef.stats) return;
      stats.tohit += pDef.stats.toHitBonus || 0;
      stats.acc += pDef.stats.accuracyBonus || 0;
      stats.dmg += pDef.stats.damageBonus || 0;
      stats.thorns += pDef.stats.thorns || 0;
      stats.recharge += pDef.stats.rechargeBonus || 0;
      stats.healOut += pDef.stats.healingOutBonus || 0;
      stats.healIn += pDef.stats.healingInBonus || 0;
      stats.absorb += pDef.stats.absorption || 0;
      stats.endDisc += pDef.stats.endDiscount || 0;
      stats.batDisc += pDef.stats.batteryDiscount || (pDef.stats.endDiscount || 0);
      stats.stealth += pDef.stats.stealthRadius || 0;

      stats.critChance += pDef.stats.critChanceBonus || 0;
      stats.critDmg += pDef.stats.critDamageBonus || 0;
      stats.control += pDef.stats.controlBonus || 0;

      stats.resSmash += pDef.stats.resSmashing || 0;
      stats.defSmash += pDef.stats.defSmashing || 0;
      stats.resLethal += pDef.stats.resLethal || 0;
      stats.defLethal += pDef.stats.defLethal || 0;

      stats.resDefDebuff += pDef.stats.resDefDebuff || 0;
      stats.resResDebuff += pDef.stats.resResDebuff || 0;

      stats.protHold += pDef.stats.protHold || 0;
      stats.resHold += pDef.stats.resHold || 0;
      stats.protStun += pDef.stats.protStun || 0;
      stats.resStun += pDef.stats.resStun || 0;
      stats.protSleep += pDef.stats.protSleep || 0;
      stats.resSleep += pDef.stats.resSleep || 0;
      stats.protSnare += pDef.stats.protSnare || pDef.stats.protImmob || 0;
      stats.resSnare += pDef.stats.resSnare || pDef.stats.resImmob || 0;
    };

    if (pd.powers) {
      pd.powers.forEach(pId => {
        const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
        if (pDef && pDef.type?.toLowerCase() === 'passive') {
          enRec += pDef.stats?.recoveryRatePerSecond || 0;
          batRec += pDef.stats?.batteryRecoveryRatePerSecond || 0;
          applyStats(pDef);
        }
      });
    }
    if (player.activePowers) {
      player.activePowers.forEach(pId => {
        const pDef = window.POWER_REGISTRY && window.POWER_REGISTRY[pId];
        if (pDef && pDef.type?.toLowerCase() === 'toggle') {
          enDrain += pDef.stats?.energyCostPerSecond || 0;
          batDrain += pDef.stats?.batteryCostPerSecond || 0;
          applyStats(pDef);
        }
      });
    }

    document.getElementById('cs-hp-regen').innerText = `${hpRegen.toFixed(1)} / s`;
    document.getElementById('cs-en-rec').innerText = `${enRec.toFixed(1)} / s`;
    document.getElementById('cs-bat-rec').innerText = `${batRec.toFixed(1)} / s`;
    document.getElementById('cs-en-drain').innerText = `${enDrain.toFixed(1)} / s`;
    document.getElementById('cs-bat-drain').innerText = `${batDrain.toFixed(1)} / s`;

    document.getElementById('cs-tohit').innerText = `+${Math.round(stats.tohit)}%`;
    document.getElementById('cs-acc').innerText = `+${Math.round(stats.acc)}%`;
    document.getElementById('cs-dmg').innerText = `+${Math.round(stats.dmg)}%`;
    document.getElementById('cs-thorns').innerText = `${Math.round(stats.thorns)}`;
    document.getElementById('cs-recharge').innerText = `+${Math.round(stats.recharge)}%`;
    document.getElementById('cs-heal-out').innerText = `+${Math.round(stats.healOut)}%`;
    document.getElementById('cs-heal-in').innerText = `+${Math.round(stats.healIn)}%`;
    document.getElementById('cs-absorb').innerText = `${Math.round(stats.absorb)}`;
    document.getElementById('cs-en-disc').innerText = `-${Math.round(stats.endDisc)}%`;
    document.getElementById('cs-bat-disc').innerText = `-${Math.round(stats.batDisc)}%`;
    document.getElementById('cs-crit-chance').innerText = `${Math.round(stats.critChance)}%`;
    document.getElementById('cs-crit-dmg').innerText = `+${Math.round(stats.critDmg)}%`;
    document.getElementById('cs-control').innerText = `+${Math.round(stats.control)}%`;
    document.getElementById('cs-stealth').innerText = `${Math.round(stats.stealth)} ft`;
    document.getElementById('cs-res-smashing').innerText = `${Math.round(stats.resSmash)}%`;
    document.getElementById('cs-def-smashing').innerText = `${Math.round(stats.defSmash)}%`;
    document.getElementById('cs-res-lethal').innerText = `${Math.round(stats.resLethal)}%`;
    document.getElementById('cs-def-lethal').innerText = `${Math.round(stats.defLethal)}%`;
    document.getElementById('cs-res-defdebuff').innerText = `${Math.round(stats.resDefDebuff)}%`;
    document.getElementById('cs-res-resdebuff').innerText = `${Math.round(stats.resResDebuff)}%`;
    document.getElementById('cs-prot-hold').innerText = `${stats.protHold}`;
    document.getElementById('cs-res-hold').innerText = `${Math.round(stats.resHold)}%`;
    document.getElementById('cs-prot-stun').innerText = `${stats.protStun}`;
    document.getElementById('cs-res-stun').innerText = `${Math.round(stats.resStun)}%`;
    document.getElementById('cs-prot-sleep').innerText = `${stats.protSleep}`;
    document.getElementById('cs-res-sleep').innerText = `${Math.round(stats.resSleep)}%`;
    document.getElementById('cs-prot-snare').innerText = `${stats.protSnare}`;
    document.getElementById('cs-res-snare').innerText = `${Math.round(stats.resSnare)}%`;

    const targetSection = document.getElementById('cs-target-section');
    if (eng.selectedTarget && targetSection) {
      let targetEnt = null;
      let tName = '';
      if (eng.selectedTarget.type === 'npc') {
        targetEnt = eng.npcs.find(n => n.uuid === eng.selectedTarget.id);
      } else if (eng.selectedTarget.type === 'player') {
        targetEnt = eng.otherPlayers[eng.selectedTarget.id];
      } else if (eng.selectedTarget.type === 'drone') {
        targetEnt = eng.drones[eng.selectedTarget.id];
      }

      if (targetEnt) {
        targetSection.style.display = 'flex';
        tName = targetEnt.name || 'Unknown';

        const tLevel = targetEnt.level || 1;
        const pLevel = pd.level || 1;
        const levelDiff = tLevel - pLevel;

        document.getElementById('cs-target-name').innerText = tName;
        document.getElementById('cs-target-level-diff').innerText = levelDiff > 0 ? `+${levelDiff}` : levelDiff;

        let hitChance = 75 - (levelDiff * 10) + stats.tohit + stats.acc;
        hitChance = Math.max(5, Math.min(95, hitChance));
        document.getElementById('cs-target-hit-chance').innerText = `${hitChance}%`;

        let dmgMult = 1.0 - Math.max(-1.0, Math.min(1.0, levelDiff * 0.15));
        dmgMult += (stats.dmg / 100);
        dmgMult = Math.max(0.1, dmgMult);
        document.getElementById('cs-target-dmg-mult').innerText = `${Math.round(dmgMult * 100)}%`;

        let incomingMult = 1.0 - Math.max(-1.0, Math.min(1.0, (-levelDiff) * 0.15));
        incomingMult -= (stats.resSmash / 100); // Generalized for UI preview
        incomingMult = Math.max(0.1, incomingMult);
        document.getElementById('cs-target-res-mult').innerText = `${Math.round((1.0 - incomingMult) * 100)}%`;

      } else {
        targetSection.style.display = 'none';
      }
    } else if (targetSection) {
      targetSection.style.display = 'none';
    }
  }
}
