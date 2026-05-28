export class InputRouter {
  constructor(engine, inputManager) {
    this.engine = engine;
    this.input = inputManager;
  }

  handleKeyDown(e) {
    if (e.repeat) return;

    const eng = this.engine;
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
    if (chatInput && activeEl === chatInput) return;

    const key = e.key.toLowerCase();

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

    const powerKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
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
        const powers = eng.playerData.powers || [];
        const powerName = powers[slotIndex];
        if (powerName) {
           eng.combat?.usePower(powerName);
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
        if (shapeBtn) shapeBtn.click();
      }
    }

    if (['alt', 'control', 'shift', ' ', 'pageup', 'pagedown', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) || e.ctrlKey || e.altKey) {
      e.preventDefault();
    }
  }
}
