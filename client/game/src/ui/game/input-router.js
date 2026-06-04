export class InputRouter {
  constructor(engine, inputManager) {
    this.engine = engine;
    this.input = inputManager;
  }

  handleKeyDown(e) {
    const eng = this.engine;
    const key = e.key.toLowerCase();
    const powerKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    if (e.repeat) {
      if (!powerKeys.includes(key) || eng.editMode) return;
    }

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

            // Specific handling so we actually exit edit mode cleanly when it closes!
            if (el.id === 'builder-panel' || el.id === 'builder-hotbar' || el.id === 'object-library-panel') {
                if (eng.editMode) {
                    eng.chat.commandHandler.processCommand('/editmode');
                }
            } else {
                el.style.display = 'none';
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

    const kbs = eng.clientSettings.keybinds || { undo: 'z', redo: 'y', picker: '', flyDown: 'x', camUp: 'pageup', camDown: 'pagedown', camLeft: 'q', camRight: 'e' };

    if (e.ctrlKey) {
      if (key === kbs.undo) {
        e.preventDefault();
        if (eng.editMode && eng.undo) eng.undo();
        return;
      }
      if (key === kbs.redo) {
        e.preventDefault();
        if (eng.editMode && eng.redo) eng.redo();
        return;
      }
    }

    if (!e.ctrlKey && !e.altKey && !e.shiftKey && kbs.picker && key === kbs.picker) {
      e.preventDefault();
      if (eng.editMode) {
        const pickerSlot = document.querySelector('#builder-hotbar .hotbar-slot[data-tex="picker"]');
        if (pickerSlot) pickerSlot.click();
      }
      return;
    }

    this.input.keys[key] = true;

    if (powerKeys.includes(key)) {
      e.preventDefault();
      if (eng.editMode) {
        const slotIndex = key === '0' ? 9 : parseInt(key) - 1;
        const slots = document.querySelectorAll('#builder-hotbar .hotbar-slot');
        if (slots[slotIndex]) {
          slots[slotIndex].click();
        }
      } else {
        const slotIndex = powerKeys.indexOf(key);
        const tray = eng.playerData.powerTray || [];
        const powerName = tray[slotIndex];
        if (powerName) {
           eng.combat?.usePower(powerName, e.repeat);
        }
      }
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
