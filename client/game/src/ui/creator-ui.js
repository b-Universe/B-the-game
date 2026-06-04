import { HERITAGE_MAP } from './heritage-data.js?v=cache-bust-005';

export function initHeritageUI() {
  const classList = document.getElementById('class-list');
  const heritageList = document.getElementById('heritage-list');
  const splashImg = document.getElementById('heritage-image');
  const splashTitle = document.getElementById('heritage-title');
  const splashDesc = document.getElementById('heritage-desc');

  const selectType = (type, classification) => {
    splashTitle.innerText = type.name;
    splashDesc.innerText = type.desc;

    if (type.id === 'human') {
      splashImg.src = 'https://placehold.co/800x450/0b0e14/74b9ff?text=Human,+Cyborg,+And+Automaton';
    } else {
      splashImg.src = `https://placehold.co/800x450/0b0e14/74b9ff?text=${type.name}`;
    }

    const previewSprite = document.getElementById('player-preview');
    previewSprite.style.backgroundImage = `url('assets/sprites/characters/idle-template.png')`;
    previewSprite.style.backgroundSize = '800% 1200%';
    previewSprite.style.backgroundPosition = '42.857% 0%';
    previewSprite.style.imageRendering = 'pixelated';
  };

  const updateTiers = (key) => {
    const data = HERITAGE_MAP[key];
    heritageList.innerHTML = data.types.map(t => `
      <div class="list-item" data-id="${t.id}">${t.name}</div>
    `).join('');

    const typeItems = heritageList.querySelectorAll('.list-item');
    typeItems.forEach(item => {
      item.onclick = () => {
        typeItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const selectedType = data.types.find(t => t.id === item.dataset.id);
        selectType(selectedType, key);
      };
    });

    if (typeItems[0]) typeItems[0].click();
  };

  classList.querySelectorAll('.list-item').forEach(item => {
    item.onclick = () => {
      if (item.classList.contains('locked')) return;
      classList.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      updateTiers(item.dataset.class);
    };
  });

  updateTiers('standard');
}
