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
  }
}
