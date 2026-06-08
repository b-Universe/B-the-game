/**
 * Manages all character progression, including experience and leveling.
 * This system should be run exclusively on the server.
 */
class ProgressionSystem {
  /**
   * Calculates the total experience required to advance from the current level to the next.
   * Uses an exponential curve to make higher levels more challenging.
   * @param {number} currentLevel The character's current level.
   * @returns {number} The experience needed to reach the next level.
   */
  static getExpRequiredForNextLevel(currentLevel) {
    const baseExp = 100; // EXP needed for level 1 -> 2
    const exponent = 1.5; // Controls the steepness of the curve

    // Formula: base * (level ^ power)
    const requiredExp = Math.floor(baseExp * Math.pow(currentLevel, exponent));
    return Math.max(baseExp, requiredExp); // Ensure there's always a requirement
  }

  /**
   * Determines the experience multiplier based on the level difference between the player and the NPC.
   * This reuses the same difficulty tiers from our target box coloring system.
   * @param {number} levelDiff The difference (NPC level - Player level).
   * @returns {number} The experience multiplier.
   */
  static getExperienceMultiplier(levelDiff) {
    if (levelDiff >= 4) return 12.5;   // ⚠️ Dangerous
    if (levelDiff === 3) return 10;  // Red
    if (levelDiff === 2) return 7.0;  // Orange
    if (levelDiff === 1) return 3.0;  // Yellow
    if (levelDiff === 0) return 1.0;   // White (base)
    if (levelDiff === -1) return 0.75; // Lighter Gray
    if (levelDiff === -2) return 0.5;  // Light Gray
    return 0.05; // Trivial mob, minimal EXP, Dark Gray
  }

  /**
   * Awards experience to a player for defeating an NPC and handles level-ups.
   * @param {object} player - The player character object (must have .level, .experience).
   * @param {object} npc - The defeated NPC object (must have .level, .strength, and a baseExp value).
   * @returns {{expGained: number, leveledUp: boolean, newLevel: number, levelsGained: number}}
   */
  static awardExperience(player, npc) {
    const effectiveNpcLevel = npc.level + (npc.strength || 0);
    const baseNpcExp = npc.baseExp || (npc.level * 20);

    const levelDiff = effectiveNpcLevel - player.level;
    const multiplier = this.getExperienceMultiplier(levelDiff);

    const finalExpGained = Math.floor(baseNpcExp * multiplier);
    if (finalExpGained <= 0) {
      return { expGained: 0, leveledUp: false, newLevel: player.level, levelsGained: 0 };
    }

    player.experience += finalExpGained;

    let leveledUp = false;
    let levelsGained = 0;
    let expForNextLevel = this.getExpRequiredForNextLevel(player.level);

    while (player.experience >= expForNextLevel) {
      player.level += 1;
      player.experience -= expForNextLevel;
      leveledUp = true;
      levelsGained++;
      expForNextLevel = this.getExpRequiredForNextLevel(player.level);
    }

    return {
      expGained: finalExpGained,
      leveledUp: leveledUp,
      newLevel: player.level,
      levelsGained: levelsGained
    };
  }

  /**
   * Recalculates the account's total level by summing the levels of all characters.
   * @param {object} account The account object containing a characters array.
   * @returns {number} The new total level.
   */
  static recalculateAccountTotalLevel(account) {
    if (!account || !Array.isArray(account.characters)) {
      return 0;
    }

    // Sum up the level of every character in the roster
    const totalLevel = account.characters.reduce((sum, char) => sum + (char.level || 1), 0);
    account.totalLevel = totalLevel;

    return totalLevel;
  }
}

module.exports = { ProgressionSystem };
