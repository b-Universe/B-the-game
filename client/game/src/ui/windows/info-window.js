import { BaseWindow } from '../components/base-window.js';

export class InfoWindow extends BaseWindow {
  constructor(engine, ui) {
    super('info-window', 'Info', { width: 400, height: 500, minWidth: 350, minHeight: 400 });
    this.engine = engine;
    this.ui = ui;
    this.target = null;
    this.buildUI();
  }

  buildUI() {
    this.body.innerHTML = `
      <div id="info-window-header" style="display: flex; gap: 10px; border-bottom: 2px solid #00d2ff; padding-bottom: 10px; margin-bottom: 10px;">
        <div id="info-thumb" style="width: 64px; height: 64px; border: 1px solid var(--text-dim); background: rgba(0,0,0,0.5); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff;">?</div>
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <div id="info-name" style="font-family: var(--font-header); font-size: 1.2rem; font-weight: bold; color: #00d2ff; text-shadow: 1px 1px 0 #000;">Unknown</div>
          <div id="info-level" style="font-family: var(--font-mono); font-size: 0.9rem; color: #aaa;">Level ?? <span id="info-faction" style="color: #fff;"></span></div>
        </div>
      </div>
      
      <div id="info-tabs" style="display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid var(--text-dim); padding-bottom: 5px;">
      </div>
      
      <div id="info-body" style="flex: 1; overflow-y: auto; font-family: var(--font-main); font-size: 0.9rem; color: #eee; padding-right: 5px;">
        Loading...
      </div>
    `;

    this.els = {
      thumb: this.body.querySelector('#info-thumb'),
      name: this.body.querySelector('#info-name'),
      level: this.body.querySelector('#info-level'),
      faction: this.body.querySelector('#info-faction'),
      tabs: this.body.querySelector('#info-tabs'),
      body: this.body.querySelector('#info-body')
    };
  }

  createTab(label, id, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn-secondary info-tab-btn';
    btn.dataset.tab = id;
    btn.style.cssText = 'flex: 1; font-size: 0.75rem; padding: 4px; border-color: var(--text-dim); color: #fff; border-bottom: none; border-radius: 4px 4px 0 0; background: rgba(0,0,0,0.5); cursor: pointer;';
    btn.innerText = label;
    btn.onclick = () => {
      this.els.tabs.querySelectorAll('.info-tab-btn').forEach(b => {
        b.style.background = 'rgba(0,0,0,0.5)';
        b.style.borderColor = 'var(--text-dim)';
        b.style.color = '#fff';
      });
      btn.style.background = 'rgba(5,7,10,0.9)';
      btn.style.borderColor = '#00d2ff';
      btn.style.color = '#00d2ff';
      onClick();
    };
    this.els.tabs.appendChild(btn);
    return btn;
  }

  async openWithTarget(targetObj) {
    this.target = targetObj;
    this.els.tabs.innerHTML = '';
    this.els.body.innerHTML = 'Loading...';
    this.open();

    if (targetObj.type === 'npc') {
      const npc = this.engine.npcs.find(n => n.uuid === targetObj.id);
      if (!npc) { this.els.body.innerHTML = 'NPC not found.'; return; }
      
      this.els.thumb.innerHTML = '🤖'; // Placeholder
      this.els.name.innerText = npc.name || 'NPC';
      this.els.level.innerHTML = `Level ${npc.level || 1} <span style="color: #f39c12;">${npc.type || 'Mob'}</span>`;
      
      this.els.tabs.style.display = 'none'; // No tabs for NPC yet
      
      let factionLore = '';
      if (npc.group && this.engine.entityGroups && this.engine.entityGroups[npc.group] && this.engine.entityGroups[npc.group].description) {
        factionLore = `<div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--text-dim); color: #3498db; font-style: italic;">${this.engine.entityGroups[npc.group].description}</div>`;
      }
      
      this.els.body.innerHTML = `<div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--text-dim);">${factionLore}${npc.bio || 'A mysterious entity wandering the streets.'}</div>`;
      
    } else if (targetObj.type === 'drone') {
      const drone = this.engine.drones[targetObj.id];
      if (!drone) { this.els.body.innerHTML = 'Drone not found.'; return; }
      
      this.els.thumb.innerHTML = '🛸';
      this.els.name.innerText = drone.customName || 'Satellite Drone';
      this.els.level.innerHTML = `Level ${drone.level || 1} <span style="color: #9b59b6;">Robotics</span>`;
      
      this.els.tabs.style.display = 'none';
      this.els.body.innerHTML = `
        <div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--text-dim);">
          <div style="margin-bottom: 5px;"><strong>Owner:</strong> ${drone.ownerName || 'Unknown'}</div>
          <div style="margin-bottom: 5px;"><strong>HP:</strong> ${Math.floor(drone.hp)} / ${drone.maxHp}</div>
          <div><strong>Mode:</strong> <span style="color: #e056fd; text-transform: capitalize;">${drone.mode || 'defensive'}</span></div>
        </div>
      `;
      
    } else if (targetObj.type === 'player') {
      const pName = this.engine.otherPlayers[targetObj.id]?.name || (this.engine.player.id === targetObj.id ? this.engine.player.name : null);
      if (!pName) { this.els.body.innerHTML = 'Player not found.'; return; }
      
      this.els.thumb.innerHTML = '👤';
      this.els.name.innerText = pName;
      this.els.level.innerHTML = `Loading...`;
      this.els.tabs.style.display = 'flex';
      
      try {
        const res = await fetch(`/api/player/info/${encodeURIComponent(pName)}`);
        if (!res.ok) throw new Error('Failed to fetch player info');
        const pData = await res.json();
        
        let factionColor = '#fff';
        if (pData.faction === 'Hero') factionColor = '#3498db';
        if (pData.faction === 'Villain') factionColor = '#e74c3c';
        if (pData.faction === 'Vigilante') factionColor = '#9b59b6';
        
        this.els.level.innerHTML = `Level ${pData.level || 1} <span style="color: ${factionColor}; font-weight: bold;">${pData.faction || 'Neutral'}</span>`;
        
        const renderBio = () => {
          this.els.body.innerHTML = `<div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--text-dim); white-space: pre-wrap; font-family: var(--font-main);">${pData.bio || 'This player has not written a bio yet.'}</div>`;
        };
        
        const renderAbilities = () => {
          let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
          if (!pData.powersets || pData.powersets.length === 0) {
             html += '<div style="color: #aaa; text-align: center; padding: 10px;">No powersets learned.</div>';
          } else {
             pData.powersets.forEach(ps => {
               html += `<div style="border: 1px solid #9b59b6; background: rgba(155,89,182,0.1); padding: 8px; border-radius: 4px;">
                 <div style="color: #e056fd; font-weight: bold; font-family: var(--font-header); margin-bottom: 5px;">${ps}</div>
                 <div style="font-size: 0.8rem; color: #ccc;">${pData.powers ? pData.powers.filter(p => p.includes(ps.toLowerCase().replace(/ /g, '-'))).length : 0} Powers Unlocked</div>
               </div>`;
             });
          }
          html += '</div>';
          this.els.body.innerHTML = html;
        };

        const renderBadges = () => {
          let html = '<div style="display: flex; flex-wrap: wrap; gap: 5px;">';
          if (!pData.badges || pData.badges.length === 0) {
             html += '<div style="color: #aaa; text-align: center; padding: 10px; width: 100%;">No badges earned.</div>';
          } else {
             pData.badges.forEach(b => {
               html += `<div style="background: rgba(241, 196, 15, 0.2); border: 1px solid #f1c40f; color: #f1c40f; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">${b}</div>`;
             });
          }
          html += '</div>';
          this.els.body.innerHTML = html;
        };
        
        const renderPvP = () => {
           this.els.body.innerHTML = `
             <div style="display: flex; flex-direction: column; gap: 10px;">
               <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; padding: 10px; border-radius: 4px; text-align: center;">
                 <div style="font-size: 2rem; color: #e74c3c; font-weight: bold; font-family: var(--font-header);">${pData.pvp.kills}</div>
                 <div style="color: #ff7675; font-size: 0.8rem; text-transform: uppercase;">Players Defeated</div>
               </div>
               <div style="background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; padding: 10px; border-radius: 4px; text-align: center;">
                 <div style="font-size: 2rem; color: #3498db; font-weight: bold; font-family: var(--font-header);">${pData.pvp.rep || 0}</div>
                 <div style="color: #74b9ff; font-size: 0.8rem; text-transform: uppercase;">Reputation</div>
               </div>
             </div>
           `;
        };

        const renderAlignment = () => {
          this.els.body.innerHTML = `<div style="text-align: center; color: #aaa; padding: 20px; font-style: italic;">- Available in Issue 2 -</div>`;
        };

        const tBio = this.createTab('Description', 'bio', renderBio);
        const tAbil = this.createTab('Abilities', 'abilities', renderAbilities);
        const tBadge = this.createTab('Badges', 'badges', renderBadges);
        const tAlign = this.createTab('Alignment', 'alignment', renderAlignment);
        const tPvP = this.createTab('PvP', 'pvp', renderPvP);
        const tArena = this.createTab('Arena', 'arena', renderAlignment);
        
        tBio.click();
        
      } catch (err) {
        this.els.body.innerHTML = '<div style="color: #e74c3c; padding: 10px; text-align: center;">Failed to load player data.</div>';
      }
    }
  }
}
