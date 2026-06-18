export class ContextMenuUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.setupContextMenu();
  }

  setupContextMenu() {
    const btnTrade = document.getElementById('ctx-btn-trade');
    if (btnTrade) {
      btnTrade.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'player') {
          this.engine.network.sendTradeRequest(this.engine.contextTarget.id);
          this.engine.chat.addMessage('system', 'System', `Trade request sent to ${this.engine.otherPlayers[this.engine.contextTarget.id]?.name || 'Player'}.`);
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnTalk = document.getElementById('ctx-btn-talk');
    if (btnTalk) {
      btnTalk.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'npc') {
          const npc = this.engine.npcs.find(n => n.uuid === this.engine.contextTarget.id);
          if (npc && npc.type === 'trainer' && this.ui.trainer) {
            this.ui.trainer.openTrainerUI(npc);
          }
          if (npc && npc.type === 'banker' && this.ui.inventory) {
            this.ui.inventory.toggleBank();
          }
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnArcadePlay = document.getElementById('ctx-btn-arcade-play');
    if (btnArcadePlay) {
      btnArcadePlay.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'arcade') {
          const target = this.engine.contextTarget;
          if (this.engine.arcadeSystem) this.engine.arcadeSystem.interact(target.x, target.y, target.z, target.voxel.dir, target.voxel.gameId);
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnArcadePower = document.getElementById('ctx-btn-arcade-power');
    if (btnArcadePower) {
      btnArcadePower.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'arcade') {
          const target = this.engine.contextTarget;
          const newPower = target.voxel.powerState === 'off' ? 'on' : 'off';
          const updatedVoxel = { ...target.voxel, powerState: newPower };
          this.engine.mapManager.setVoxelAt(target.x, target.y, target.z, updatedVoxel, true);
          this.ui.showSystemMessage(`Arcade cabinet powered ${newPower}.`);
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnInfo = document.getElementById('ctx-btn-info');
    if (btnInfo) {
      btnInfo.onclick = () => {
        if (this.engine.contextTarget && this.ui.infoWindow) {
          this.ui.infoWindow.openWithTarget(this.engine.contextTarget);
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnRename = document.getElementById('ctx-btn-pet-rename');
    if (btnRename) {
      btnRename.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'drone') {
          // Open a custom modal or just use an input prompt if custom modal is not ready
          // Actually, we'll create a clean modal prompt
          const modal = document.createElement('div');
          modal.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(5,7,10,0.95); border: 2px solid #00d2ff; border-radius: 6px; padding: 20px; z-index: 2000; box-shadow: 0 0 15px rgba(0,210,255,0.3); display: flex; flex-direction: column; gap: 10px; width: 300px;';
          modal.innerHTML = `
            <h3 style="margin: 0; color: #fff; font-family: var(--font-header); text-align: center;">Rename Pet</h3>
            <input type="text" id="pet-rename-input" placeholder="New Name" maxlength="20" style="padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); color: #fff; font-family: var(--font-main); border-radius: 4px;" />
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
              <button id="pet-rename-confirm" class="btn-primary" style="flex: 1; border-color: #00d2ff; color: #00d2ff;">Confirm</button>
              <button id="pet-rename-cancel" class="btn-secondary" style="flex: 1; border-color: #e74c3c; color: #e74c3c;">Cancel</button>
            </div>
          `;
          document.body.appendChild(modal);
          const input = modal.querySelector('#pet-rename-input');
          input.focus();
          modal.querySelector('#pet-rename-confirm').onclick = () => {
            const newName = input.value.trim();
            if (newName && newName.length <= 20) {
              this.engine.network.socket.emit('pet_command', { targetId: this.engine.contextTarget.uuid || this.engine.contextTarget.id, command: 'rename', newName });
            }
            modal.remove();
          };
          modal.querySelector('#pet-rename-cancel').onclick = () => modal.remove();
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
    const btnDismiss = document.getElementById('ctx-btn-pet-dismiss');
    if (btnDismiss) {
      btnDismiss.onclick = () => {
        if (this.engine.contextTarget && this.engine.contextTarget.type === 'drone') {
          this.engine.network.socket.emit('pet_command', { targetId: this.engine.contextTarget.id, command: 'dismiss' });
        }
        document.getElementById('player-context-menu').style.display = 'none';
      };
    }
  }
}
