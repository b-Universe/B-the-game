class CombatCalculator {
  static calculate(attacker, target, powerDef, attackerStats = { critChance: 0, critDmg: 0, control: 0, dmg: 0, healOut: 0, acc: 0, tohit: 0 }, options = { skipHitCheck: false }) {
    let baseAccuracy = 75 + (powerDef.stats?.accuracy || 0) + (attackerStats.acc || 0) + (attackerStats.tohit || 0);
    let targetDefense = 0;

    const attackerLvl = attacker.level || 1;
    const targetLvl = target ? (target.level || 1) : attackerLvl;
    const levelDiff = targetLvl - attackerLvl;

    baseAccuracy -= (levelDiff * 10);

    let finalHitChance = Math.max(5, Math.min(95, baseAccuracy - targetDefense));

    const isSupport = powerDef.effects && powerDef.effects.some(e => e.type === 'Heal' || e.type === 'MaxHP');
    if (!options.skipHitCheck) {
        const hitRoll = Math.random() * 100;
        if (!isSupport && hitRoll > finalHitChance) {
          return { hit: false, totalDamage: 0, totalHeal: 0, isCrit: false, appliedEffects: [] };
        }
    }

    const finalCritChance = (powerDef.stats?.critChance || 5) + (attackerStats.critChance || 0);
    const isCrit = Math.random() * 100 <= finalCritChance;
    const critMult = isCrit ? ((powerDef.stats?.critMult || 1.5) + (attackerStats.critDmg || 0) / 100) : 1.0;

    let totalDamage = 0;
    let totalHeal = 0;
    let appliedEffects = [];

    if (powerDef.effects && powerDef.effects.length > 0) {
      powerDef.effects.forEach(eff => {
        if (Math.random() * 100 <= (eff.chance || 100)) {
          if (eff.type === 'Damage') {
            let dmg = (eff.magnitude || 0) * critMult;
            dmg *= (1 + (attackerStats.dmg || 0) / 100);
            totalDamage += dmg;
          } else if (eff.type === 'Heal') {
            let heal = (eff.magnitude || 0) * critMult;
            heal *= (1 + (attackerStats.healOut || 0) / 100);
            totalHeal += heal;
          } else {
            appliedEffects.push(eff);
          }
        }
      });
    } else {
      let dmg = (powerDef.stats?.damage || 10) * critMult;
      dmg *= (1 + (attackerStats.dmg || 0) / 100);
      totalDamage += dmg;
    }

    return { hit: true, totalDamage: Math.floor(totalDamage), totalHeal: Math.floor(totalHeal), isCrit, appliedEffects };
  }
}

module.exports = { CombatCalculator };
