export class InputRouter {
  constructor(engine, inputManager) {
    this.engine = engine;
    this.input = inputManager;
  }

  handleKeyDown(e) {
    const eng = this.engine;
    if (!e.key) return;
    const key = e.key.toLowerCase();

    const chatInput = document.getElementById('chat-input');

    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.offsetParent !== null;

    if (isInputFocused && activeEl !== chatInput) {
      if (e.key === 'Enter') activeEl.blur();
      return;
    }

    if (e.key === 'Enter') {
      if (chatInput && activeEl !== chatInput) {
        chatInput.focus();
        e.preventDefault();
      }
      return;
    }

    if (e.key === '/') {
      if (chatInput && activeEl !== chatInput) {
        chatInput.focus();
        chatInput.value = '/';
        e.preventDefault();
      }
    }

    if (key === 'escape') {
      if (eng.ui && eng.ui.panelStack && eng.ui.panelStack.length > 0) {
        const el = eng.ui.panelStack.pop();

        if (el.id === 'builder-panel' || el.id === 'builder-hotbar' || el.id === 'object-library-panel') {
          if (eng.editMode) {
            eng.chat.commandHandler.processCommand('/editmode');
          }
        } else {
              el.style.opacity = '0';
              el.style.transform = 'scale(0.95)';
              setTimeout(() => { el.style.display = 'none'; }, 150);
        }
        e.preventDefault();
        return;
      }

      if (eng.targetingPower) {
        eng.targetingPower = null;
        document.body.style.cursor = '';
        if (eng.canvas) eng.canvas.style.cursor = '';
        e.preventDefault();
        return;
      }
    }
    if (chatInput && activeEl === chatInput) return;

    if (key === 'tab') {
      e.preventDefault();
      const possibleTargets = [];
      eng.npcs.forEach(npc => {
        if (npc.state !== 'dead' && npc.type !== 'civilian' && npc.type !== 'trainer') {
          const dist = Math.hypot(npc.x - eng.player.x, npc.y - eng.player.y);
          if (dist < 1500) {
            possibleTargets.push({ type: 'npc', id: npc.uuid, dist: dist });
          }
        }
      });

      if (possibleTargets.length > 0) {
        possibleTargets.sort((a, b) => a.dist - b.dist);
        let currentIndex = -1;
        if (eng.selectedTarget && eng.selectedTarget.type === 'npc') {
          currentIndex = possibleTargets.findIndex(t => t.id === eng.selectedTarget.id);
        }
        let nextIndex = (currentIndex + 1) % possibleTargets.length;
        eng.selectedTarget = { type: possibleTargets[nextIndex].type, id: possibleTargets[nextIndex].id };
        eng.ui.update();
      }
      return;
    }

    this.input.keys[key] = true;
    if (e.ctrlKey) this.input.keys['control'] = true;
    if (e.shiftKey) this.input.keys['shift'] = true;
    if (e.altKey) this.input.keys['alt'] = true;

    let powerActionFired = false;
    for (let i = 1; i <= 10; i++) {
      if (eng.input.isActionDown(`power${i}`)) {
        e.preventDefault();
        if (eng.editMode) {
          if (e.repeat) return; // Prevent spamming tool selection
          const slotIndex = i === 10 ? 9 : i - 1;
          const slots = document.querySelectorAll('#builder-hotbar .hotbar-slot');
          if (slots[slotIndex]) slots[slotIndex].click();
        } else {
          const slotIndex = i - 1;
          const tray = eng.playerData.powerTray || [];
          const powerName = tray[slotIndex];
          if (powerName) eng.combat?.usePower(powerName, e.repeat);
        }
        powerActionFired = true;
        break;
      }
    }
    if (powerActionFired) return;

    if (e.repeat) return; // Prevent rapid-fire menus and tools

    if (eng.input.isActionDown('undo')) {
      e.preventDefault();
      if (eng.editMode && eng.undo) eng.undo();
      return;
    }
    if (eng.input.isActionDown('redo')) {
      e.preventDefault();
      if (eng.editMode && eng.redo) eng.redo();
      return;
    }
    if (eng.input.isActionDown('picker')) {
      e.preventDefault();
      if (eng.editMode) {
        const pickerSlot = document.querySelector('#builder-hotbar .hotbar-slot[data-tex="picker"]');
        if (pickerSlot) pickerSlot.click();
      }
      return;
    }

    if (key === 'p') {
      e.preventDefault();
      const pPanel = document.getElementById('powers-panel');
      if (pPanel) {
        pPanel.style.display = pPanel.style.display === 'none' ? 'flex' : 'none';
        if (pPanel.style.display === 'flex') eng.ui.powerbar.renderPowersUI();
      }
    }

    if (key === 'r') {
      if (eng.editMode) {
        e.preventDefault();
        const shapeBtn = document.getElementById('build-shape-btn');
        if (shapeBtn && shapeBtn.tagName === 'SELECT') {
          const opts = Array.from(shapeBtn.options);
          const curIdx = shapeBtn.selectedIndex;
          if (opts.length > 0) {
            const nextIdx = e.shiftKey ? (curIdx - 1 + opts.length) % opts.length : (curIdx + 1) % opts.length;
            shapeBtn.selectedIndex = nextIdx;
            shapeBtn.dispatchEvent(new Event('change'));
          }
        } else if (shapeBtn) {
          shapeBtn.click();
        }
      }
    }

    if (key === 't' && !eng.editMode) {
      e.preventDefault();
      let trainerDist = eng.nearestTrainer && !eng.activeTrainer ? Math.hypot(eng.player.x - eng.nearestTrainer.x, eng.player.y - eng.nearestTrainer.y) : Infinity;
      let arcadeDist = eng.arcadeSystem && eng.arcadeSystem.nearestCabinet && !eng.arcadeSystem.isActive && eng.arcadeSystem.nearestCabinet.powerState !== 'off'
        ? Math.hypot(eng.player.x - eng.arcadeSystem.nearestCabinet.x, eng.player.y - eng.arcadeSystem.nearestCabinet.y)
        : Infinity;

      if (trainerDist < Infinity || arcadeDist < Infinity) {
        if (trainerDist < arcadeDist) {
          eng.ui.trainer.openTrainerUI(eng.nearestTrainer);
        } else {
          const cab = eng.arcadeSystem.nearestCabinet;
          eng.arcadeSystem.interact(cab.x, cab.y, cab.z, cab.dir, cab.gameId);
        }
      }
    }

    if (['alt', 'control', 'shift', ' ', 'pageup', 'pagedown', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) || e.ctrlKey || e.altKey) {
      e.preventDefault();
    }
  }
}
