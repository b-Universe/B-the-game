let enterKeyListener = null;

export function initSelection(accountData) {
  const listContainer = document.getElementById('character-list');
  const btnPlay = document.getElementById('btn-play');
  const selectionScreen = document.getElementById('selection-screen');
  const creationScreen = document.getElementById('creation-screen');
  const btnDelete = document.getElementById('btn-delete');

  listContainer.innerHTML = '';
  selectionScreen.style.display = 'flex';
  creationScreen.style.display = 'none';

  let presetContainer = document.getElementById('selection-preset-container');
  if (!presetContainer) {
    presetContainer = document.createElement('div');
    presetContainer.id = 'selection-preset-container';
    presetContainer.style.cssText = 'position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 1000;';

    const applyPreset = (preset) => {
      let settings = {};
      const savedSettingsStr = localStorage.getItem('b_client_settings');
      if (savedSettingsStr) {
        try { settings = JSON.parse(savedSettingsStr); } catch (e) {}
      }

      if (preset === 'potato') {
        settings.renderDistance = 800;
        settings.renderScale = 0.5;
        settings.enableShadows = false;
        settings.softShadows = false;
        settings.maxDynamicLights = 0;
      } else if (preset === 'normal') {
        settings.renderDistance = 2000;
        settings.renderScale = 1.0;
        settings.enableShadows = true;
        settings.softShadows = true;
        settings.maxDynamicLights = 48;
      } else if (preset === 'ultra') {
        settings.renderDistance = 4000;
        settings.renderScale = 1.0;
        settings.enableShadows = true;
        settings.softShadows = true;
        settings.maxDynamicLights = 100;
      }
      localStorage.setItem('b_client_settings', JSON.stringify(settings));

        ['potato', 'normal', 'ultra'].forEach(p => {
          const btn = document.getElementById(`btn-sel-preset-${p}`);
          if (btn) {
            if (p === preset) {
              btn.style.borderColor = '#3498db';
              btn.style.color = '#3498db';
            } else {
              btn.style.borderColor = 'var(--text-dim)';
              btn.style.color = 'var(--text-primary)';
            }
          }
      });
    };

    ['potato', 'normal', 'ultra'].forEach(preset => {
        const btn = document.createElement('button');
        btn.id = `btn-sel-preset-${preset}`;
        btn.className = 'btn-secondary';
        btn.innerText = `Preset: ${preset.charAt(0).toUpperCase() + preset.slice(1)}`;
        btn.onclick = () => applyPreset(preset);
        presetContainer.appendChild(btn);
    });

    selectionScreen.appendChild(presetContainer);
  }

  const maxChars = accountData.maxCharacters || 3;
  const existingChars = accountData.characters.length;

  if (existingChars > 0) {
    accountData.characters.forEach((char, index) => {
      const slot = document.createElement('div');
      slot.className = 'char-slot';
      slot.innerHTML = `
        <div class="char-name">${char.name.toUpperCase()}</div>
        <div class="char-meta">Level ${char.level} - ${char.race}</div>
      `;

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.char-slot').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        btnPlay.disabled = false;
        btnPlay.style.opacity = "1";
        if (btnDelete) {
          btnDelete.disabled = false;
          btnDelete.style.opacity = "1";
        }
      });

      listContainer.appendChild(slot);
    });
  }

  if (existingChars < maxChars) {
    for (let i = existingChars; i < maxChars; i++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'char-slot empty-slot';
      emptySlot.innerHTML = `
          <div class="char-name" style="color: var(--text-dim); font-style: italic;">[ EMPTY SLOT ]</div>
          <button class="btn-secondary btn-create-in-slot" style="margin-top: 10px;">Create Character</button>
      `;
      emptySlot.querySelector('.btn-create-in-slot').onclick = () => {
        openCharacterCreator(accountData.uuid);
      };
      listContainer.appendChild(emptySlot);
    }
  }

  if (existingChars === 0) {
    btnPlay.disabled = true;
    btnPlay.style.opacity = "0.5";
    if (btnDelete) btnDelete.disabled = true;
    if (btnDelete) btnDelete.style.opacity = "0.5";
  } else {
    // Auto-select the first character slot
    const firstSlot = listContainer.querySelector('.char-slot:not(.empty-slot)');
    if (firstSlot) firstSlot.click();
  }

  selectionScreen.onclick = (e) => {
    if (!e.target.closest('.char-slot') && !e.target.closest('.selection-controls')) {
      document.querySelectorAll('.char-slot').forEach(s => s.classList.remove('active'));
      btnPlay.disabled = true;
      btnPlay.style.opacity = "0.5";
      if (btnDelete) {
        btnDelete.disabled = true;
        btnDelete.style.opacity = "0.5";
      }
    }
  };

  if (enterKeyListener) document.removeEventListener('keydown', enterKeyListener);
  enterKeyListener = (e) => {
    if (selectionScreen.style.display === 'flex' && e.key === 'Enter') {
      const activeSlot = document.querySelector('.char-slot.active');
      if (activeSlot && !btnPlay.disabled) btnPlay.click();
    }
  };
  document.addEventListener('keydown', enterKeyListener);

  document.getElementById('btn-back').onclick = () => {
    selectionScreen.style.display = 'none';
    creationScreen.style.display = 'flex';
  };

  if (btnDelete) {
    btnDelete.onclick = () => {
      const activeSlot = document.querySelector('.char-slot.active');
      if (!activeSlot) return alert("Please select a character to delete.");

      const nameEl = activeSlot.querySelector('.char-name');
      const charName = nameEl ? nameEl.innerText.trim() : '';

      const deleteModal = document.getElementById('delete-modal');
      const inputField = document.getElementById('delete-confirm-input');
      inputField.value = '';
      deleteModal.style.display = 'flex';

      document.getElementById('confirm-delete-no').onclick = () => {
        deleteModal.style.display = 'none';
      };

      document.getElementById('confirm-delete-yes').onclick = async () => {
        if (inputField.value.trim().toLowerCase() !== charName.toLowerCase()) {
          alert("Name does not match. Deletion cancelled.");
          return;
        }

        const res = await fetch('/delete-character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: accountData.uuid, charName: charName })
        });

        if (res.ok) {
          const updatedAccount = await res.json();
          deleteModal.style.display = 'none';
          Object.assign(accountData, updatedAccount);
          localStorage.setItem('b_current_account', JSON.stringify(accountData));
          initSelection(accountData);
        } else {
          const errText = await res.text();
          alert(errText || "Failed to delete character.");
        }
      };
    };
  }
}

function openCharacterCreator(uuid) {
  const selectionScreen = document.getElementById('selection-screen');
  const creatorScreen = document.getElementById('character-creator-screen');

  selectionScreen.style.display = 'none';
  creatorScreen.style.display = 'flex';
}
