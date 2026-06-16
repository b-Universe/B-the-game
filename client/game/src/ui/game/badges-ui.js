import { BaseWindow } from '../base-window.js?v=cache-bust-005';

export class BadgesWindow extends BaseWindow {
  constructor(manager) {
    super('badges-window', 'Badge Collection', { width: 640, height: 480, x: 100, y: 100 });
    this.manager = manager;
    this.setContent(`
      <div style="display: flex; flex: 1; overflow: hidden; height: 100%;">
        <div id="badges-sidebar" style="width: 180px; background: rgba(0,0,0,0.4); border-right: 1px solid #333; overflow-y: auto; display: flex; flex-direction: column;"></div>
        <div style="flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                <h2 id="badges-category-title" style="color: #fff; margin: 0; font-family: var(--font-header); font-size: 1.4rem;">Category</h2>
                <span id="badges-category-progress" style="color: #f1c40f; font-family: var(--font-mono); font-size: 0.9rem;">0 / 0</span>
            </div>
            <div id="badges-extra-stats"></div>
            <div id="badges-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; align-content: flex-start;"></div>
        </div>
      </div>
    `);
  }
}

export class BadgesUIManager {
  constructor(engine, uiManager) {
    this.engine = engine;
    this.ui = uiManager;

    this.categories = [
      { id: 'achievements', name: 'Achievements', icon: '🏆' },
      { id: 'accolades', name: 'Accolades', icon: '🏅' },
      { id: 'exploration', name: 'Exploration', icon: '🗺️' },
      { id: 'lore', name: 'Lore (History)', icon: '📜' },
      { id: 'gladiator', name: 'Gladiator', icon: '⚔️' },
      { id: 'integrity', name: 'Integrity Path', icon: '⚖️' },
      { id: 'veteran', name: 'Veteran', icon: '⭐' },
      { id: 'efficiency', name: 'Efficiency', icon: '⚙️' },
      { id: 'neural', name: 'Neural & Pet', icon: '🤖' },
      { id: 'science', name: 'Science', icon: '🔬' },
      { id: 'magic', name: 'Magic', icon: '✨' },
      { id: 'technical', name: 'Technical', icon: '💻' },
      { id: 'dayjobs', name: 'Day Jobs', icon: '💼' }
    ];

    this.activeCategory = 'achievements';
    this.mockBadges = this.generateMockBadges();

    this.window = new BadgesWindow(this);
  }

  generateMockBadges() {
    const badges = {};
    this.categories.forEach(cat => {
        badges[cat.id] = [];
        for (let i = 1; i <= 10; i++) {
            const isUnlocked = Math.random() > 0.6;
            badges[cat.id].push({
                id: `${cat.id}_${i}`,
                name: isUnlocked ? `${cat.name} Badge ${i}` : '???',
                desc: isUnlocked ? `You completed the requirement for ${cat.name} #${i}.` : 'Requirement unknown.',
                icon: isUnlocked ? cat.icon : '🔒',
                unlocked: isUnlocked
            });
        }
    });
    badges['achievements'][0] = { id: 'ach_1', name: 'First Blood', desc: 'Defeat your first enemy.', icon: '🩸', unlocked: true };
    badges['exploration'][0] = { id: 'exp_1', name: 'Atlas Tourist', desc: 'Explore the heart of Atlas City.', icon: '🏙️', unlocked: true };
    badges['lore'][0] = { id: 'lore_1', name: 'Federation Historian', desc: 'Read the plaque at the center of the plaza.', icon: '📜', unlocked: false };
    badges['dayjobs'][0] = { id: 'dj_1', name: 'Desk Jockey', desc: 'Logged out in a corporate office for 21 hours.', icon: '🏢', unlocked: false };
    return badges;
  }

  renderSidebar() {
    const sidebar = document.getElementById('badges-sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = '';

    const unseen = this.engine.playerData.unseenBadges || [];
    const catHasUnseen = (catId) => {
        const list = this.mockBadges[catId] || [];
        return list.some(b => unseen.includes(b.id));
    };

    this.categories.forEach(cat => {
        const hasNew = catHasUnseen(cat.id);
        const btn = document.createElement('button');
        btn.className = 'b-btn ' + (this.activeCategory === cat.id ? 'btn-primary' : 'btn-secondary');
        btn.style.cssText = `text-align: left; padding: 10px; font-size: 0.9rem; border-radius: 0; border: none; border-bottom: 1px solid #222; width: 100%; display: flex; gap: 8px; align-items: center; transition: all 0.2s;`;
        if (this.activeCategory === cat.id) {
            btn.style.background = 'rgba(241, 196, 15, 0.15)';
            btn.style.borderLeft = '4px solid #f1c40f';
            btn.style.color = '#f1c40f';
        } else {
            btn.style.borderLeft = '4px solid transparent';
        }
        const newTag = hasNew ? `<span style="background: #e74c3c; color: #fff; font-size: 0.6rem; padding: 2px 4px; border-radius: 4px; margin-left: auto; font-weight: bold;">NEW</span>` : '';
        btn.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span> ${newTag}`;

        btn.onclick = () => {
            this.activeCategory = cat.id;
            if (this.engine.playerData.unseenBadges && hasNew) {
                const listIds = (this.mockBadges[cat.id] || []).map(b => b.id);
                this.engine.playerData.unseenBadges = this.engine.playerData.unseenBadges.filter(id => !listIds.includes(id));
                this.engine.network.sendPlayerSync(this.engine.accountUuid, this.engine.playerData, {x: this.engine.player.x, y: this.engine.player.y, z: this.engine.player.z});
            }
            this.renderSidebar();
            this.renderBadges();
        };
        sidebar.appendChild(btn);
    });
  }

  renderBadges() {
    const title = document.getElementById('badges-category-title');
    const progress = document.getElementById('badges-category-progress');
    const grid = document.getElementById('badges-grid');
    const extraStats = document.getElementById('badges-extra-stats');
    if (!title || !progress || !grid || !extraStats) return;

    const catData = this.categories.find(c => c.id === this.activeCategory);
    title.innerText = catData ? catData.name : 'Unknown';

    const playerBadges = (this.engine.playerData && this.engine.playerData.badges) ? this.engine.playerData.badges : [];
    let badgeList = this.mockBadges[this.activeCategory] || [];

    if (this.activeCategory === 'gladiator') {
        const pvpKills = (this.engine.playerData && this.engine.playerData.stats && this.engine.playerData.stats.pvpKills) || 0;
        const pveKills = (this.engine.playerData && this.engine.playerData.stats && this.engine.playerData.stats.pveKills) || 0;

        extraStats.innerHTML = `<div style="background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; padding: 8px 12px; border-radius: 4px; color: #e74c3c; font-family: var(--font-mono); font-size: 0.9rem; margin-top: -5px; margin-bottom: 15px; display: flex; gap: 20px;">
            <span>PvP Kills: <strong style="color: #fff;">${pvpKills}</strong></span>
            <span>NPC Kills: <strong style="color: #fff;">${pveKills}</strong></span>
        </div>`;

        badgeList = [
            { id: 'glad_1', name: 'First Blood', desc: 'Defeat your first player in PvP combat.', icon: '🩸', unlocked: pvpKills >= 1 },
            { id: 'glad_2', name: 'Slayer', desc: 'Defeat 10 players in PvP combat.', icon: '🗡️', unlocked: pvpKills >= 10 },
            { id: 'glad_3', name: 'Executioner', desc: 'Defeat 50 players in PvP combat.', icon: '🪓', unlocked: pvpKills >= 50 },
            { id: 'glad_4', name: 'Warmonger', desc: 'Defeat 100 players in PvP combat.', icon: '👹', unlocked: pvpKills >= 100 },
            { id: 'glad_5', name: 'Champion', desc: 'Defeat 500 players in PvP combat.', icon: '👑', unlocked: pvpKills >= 500 },
            { id: 'glad_6', name: 'Conqueror', desc: 'Defeat 1000 players in PvP combat.', icon: '💀', unlocked: pvpKills >= 1000 }
        ];
    } else {
        extraStats.innerHTML = '';
    }

    let unlockedCount = 0;

    grid.innerHTML = '';
    badgeList.forEach(badge => {
        const isUnlocked = playerBadges.includes(badge.id) || badge.unlocked;
        if (isUnlocked) unlockedCount++;
        const card = document.createElement('div');
        card.style.cssText = `background: rgba(0,0,0,0.5); border: 1px solid ${isUnlocked ? '#f1c40f' : '#333'}; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; opacity: ${isUnlocked ? '1' : '0.5'};`;
        card.innerHTML = `
            <div style="width: 48px; height: 48px; border-radius: 50%; background: ${isUnlocked ? 'rgba(241, 196, 15, 0.2)' : 'rgba(255,255,255,0.05)'}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid ${isUnlocked ? '#f1c40f' : '#555'}; box-shadow: ${isUnlocked ? '0 0 10px rgba(241, 196, 15, 0.5)' : 'none'};">
                ${badge.icon}
            </div>
            <strong style="color: ${isUnlocked ? '#fff' : '#888'}; font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.2;">${badge.name}</strong>
            <span style="color: ${isUnlocked ? '#ccc' : '#555'}; font-size: 0.75rem; line-height: 1.3;">${badge.desc}</span>
        `;
        grid.appendChild(card);
    });
    progress.innerText = `${unlockedCount} / ${badgeList.length}`;
  }

  open() { this.window.open(); this.renderSidebar(); this.renderBadges(); }
  close() { this.window.close(); }
  toggle() { if (this.window.element.style.display === 'none') { this.open(); } else { this.close(); } }
}
