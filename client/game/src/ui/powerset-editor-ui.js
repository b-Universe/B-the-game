import { PowersetEditorWindow } from './windows/powerset-windows.js?v=cache-bust-005';

export class PowersetEditorUIManager {
  constructor(engine) {
    this.engine = engine;
    this.powers = [];
    this.powersetsData = {};
    this.currentPowersetId = null;
    this.currentPowersList = [];
    
    this.els = {};

    this.window = new PowersetEditorWindow();
    this.setupUI();
  }

  setupUI() {
    this.els.panel = this.window.element;
    this.els.btnOpen = document.getElementById('btn-dev-powerset-editor');
    this.els.list = document.getElementById('pse-list');
    this.els.filterCategory = document.getElementById('pse-filter-category');
    this.els.searchInput = document.getElementById('pse-search');
    this.els.powersList = document.getElementById('pse-powers-list');
    this.els.btnSave = document.getElementById('btn-pse-save');
    this.els.btnCreate = document.getElementById('btn-pse-create-new');
    this.els.btnDelete = document.getElementById('btn-pse-delete');
    this.els.btnAddPower = document.getElementById('btn-pse-add-power');

    if (this.els.btnOpen && this.els.panel) {
      this.els.btnOpen.style.borderColor = '#9b59b6';
      this.els.btnOpen.style.color = '#9b59b6';
      this.els.btnOpen.addEventListener('click', () => {
        if (this.window.element.style.display === 'none') {
          this.window.open();
          this.loadData();
        } else {
          this.window.close();
        }
      });
    }

    if (this.els.btnSave) this.els.btnSave.addEventListener('click', () => this.savePowerset());
    if (this.els.btnDelete) this.els.btnDelete.addEventListener('click', () => this.deletePowerset());
    if (this.els.btnCreate) this.els.btnCreate.addEventListener('click', () => this.createNewPowerset());
    if (this.els.btnAddPower) this.els.btnAddPower.addEventListener('click', () => this.addPowerToSet());

    if (this.els.searchInput) {
      this.els.searchInput.addEventListener('input', () => this.renderList());
    }
    if (this.els.filterCategory) {
      this.els.filterCategory.addEventListener('change', () => this.renderList());
    }
  }

  async loadData() {
    try {
      const powersRes = await fetch('/api/powers');
      if (powersRes.ok) this.powers = await powersRes.json();

      const powersetsRes = await fetch('/api/powersets');
      if (powersetsRes.ok) {
        this.powersetsData = await powersetsRes.json();
      }

      this.populateCategories();
      this.renderList();
    } catch (e) {
      console.error("Failed to load powerset customizer data:", e);
    }
  }

  populateCategories() {
    if (!this.els.filterCategory) return;
    const cats = Object.keys(this.powersetsData).sort();
    this.els.filterCategory.innerHTML = '<option value="all">All Categories</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      this.els.filterCategory.appendChild(opt);
    });
  }

  renderList() {
    if (!this.els.list) return;
    this.els.list.innerHTML = '';
    
    const filterCat = this.els.filterCategory ? this.els.filterCategory.value : 'all';
    const filterText = this.els.searchInput ? this.els.searchInput.value.toLowerCase() : '';

    let allSets = [];
    for (const [catName, sets] of Object.entries(this.powersetsData)) {
      if (filterCat !== 'all' && catName !== filterCat) continue;
      sets.forEach(ps => {
        allSets.push({ ...ps, _cat: catName });
      });
    }

    allSets.sort((a, b) => {
        const nameA = (a.Name || a.name || a.Id || a.id || '').toLowerCase();
        const nameB = (b.Name || b.name || b.Id || b.id || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    allSets.forEach(ps => {
      const id = ps.Id || ps.id;
      const name = ps.Name || ps.name || id;
      if (filterText && !name.toLowerCase().includes(filterText) && !id.toLowerCase().includes(filterText)) return;

      const item = document.createElement('div');
      item.className = 'pe-roster-item';
      item.innerHTML = `
        <div style="font-weight: bold; color: var(--accent);">${name}</div>
        <div style="font-size: 0.7rem; color: #888;">${id} (${ps._cat})</div>
      `;
      if (this.currentPowersetId === id) item.style.borderColor = 'var(--accent-neon)';
      item.onclick = () => this.loadPowerset(ps, ps._cat);
      this.els.list.appendChild(item);
    });
  }

  createNewPowerset() {
    this.currentPowersetId = null;
    this.currentPowersList = [];
    if (document.getElementById('pse-id')) document.getElementById('pse-id').value = '';
    if (document.getElementById('pse-name')) document.getElementById('pse-name').value = '';
    if (document.getElementById('pse-desc')) document.getElementById('pse-desc').value = '';
    if (document.getElementById('pse-category')) document.getElementById('pse-category').value = 'custom';
    if (document.getElementById('pse-min-integrity')) document.getElementById('pse-min-integrity').value = '';
    if (document.getElementById('pse-max-integrity')) document.getElementById('pse-max-integrity').value = '';
    
    if (this.els.btnDelete) this.els.btnDelete.style.display = 'none';
    this.renderPowersList();
    this.renderList();
  }

  loadPowerset(ps, category) {
    this.currentPowersetId = ps.Id || ps.id;
    if (document.getElementById('pse-id')) document.getElementById('pse-id').value = this.currentPowersetId;
    if (document.getElementById('pse-name')) document.getElementById('pse-name').value = ps.Name || ps.name || '';
    if (document.getElementById('pse-desc')) document.getElementById('pse-desc').value = ps.Description || ps.desc || '';
    if (document.getElementById('pse-category')) document.getElementById('pse-category').value = category || 'custom';
    if (document.getElementById('pse-min-integrity')) document.getElementById('pse-min-integrity').value = ps.minIntegrity !== undefined ? ps.minIntegrity : '';
    if (document.getElementById('pse-max-integrity')) document.getElementById('pse-max-integrity').value = ps.maxIntegrity !== undefined ? ps.maxIntegrity : '';
    
    this.currentPowersList = JSON.parse(JSON.stringify(ps.Powers || ps.powers || []));
    
    if (this.els.btnDelete) this.els.btnDelete.style.display = 'block';
    this.renderPowersList();
    this.renderList();
  }

  addPowerToSet() {
    const powerId = prompt("Enter Power ID to add:");
    if (!powerId) return;
    
    let powerDef = this.powers.find(p => p.id === powerId);
    let powerName = powerDef ? powerDef.name : powerId;

    this.currentPowersList.push({ id: powerId, name: powerName, desc: '' });
    this.renderPowersList();
  }

  renderPowersList() {
    if (!this.els.powersList) return;
    this.els.powersList.innerHTML = '';
    
    this.currentPowersList.forEach((p, idx) => {
      const pId = p.Id || p.id;
      const pName = p.Name || p.name;
      const el = document.createElement('div');
      el.style.cssText = 'background: rgba(255,255,255,0.05); padding: 5px; border-radius: 4px; display: flex; flex-direction: column; gap: 5px; margin-bottom: 5px; position: relative;';
      
      el.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--accent); font-size: 0.9rem;">${pName || pId}</strong>
            <button class="b-btn b-btn-sm btn-danger delete-btn">X</button>
        </div>
        <div style="display: flex; gap: 5px;">
            <input type="text" class="b-input power-id-input" placeholder="Power ID" value="${pId}" style="flex: 1; font-size: 0.8rem;">
            <input type="text" class="b-input power-name-input" placeholder="Display Name" value="${pName || ''}" style="flex: 1; font-size: 0.8rem;">
        </div>
      `;
      
      el.querySelector('.delete-btn').addEventListener('click', () => {
          this.currentPowersList.splice(idx, 1);
          this.renderPowersList();
      });
      el.querySelector('.power-id-input').addEventListener('change', (e) => {
          this.currentPowersList[idx].id = e.target.value;
      });
      el.querySelector('.power-name-input').addEventListener('change', (e) => {
          this.currentPowersList[idx].name = e.target.value;
      });
      
      this.els.powersList.appendChild(el);
    });
  }

  async savePowerset() {
    const id = document.getElementById('pse-id')?.value;
    if (!id) {
      if (this.engine.ui) this.engine.ui.showSystemMessage('Powerset ID is required.', 'error');
      return;
    }

    const payload = {
      id: id,
      _oldId: this.currentPowersetId,
      name: document.getElementById('pse-name')?.value || id,
      desc: document.getElementById('pse-desc')?.value || '',
      category: document.getElementById('pse-category')?.value || 'custom',
      minIntegrity: parseInt(document.getElementById('pse-min-integrity')?.value),
      maxIntegrity: parseInt(document.getElementById('pse-max-integrity')?.value),
      powers: this.currentPowersList
    };

    if (isNaN(payload.minIntegrity)) delete payload.minIntegrity;
    if (isNaN(payload.maxIntegrity)) delete payload.maxIntegrity;

    try {
      const res = await fetch('/api/powersets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (this.engine.ui) this.engine.ui.showSystemMessage(data.message, 'success');
        this.currentPowersetId = id;
        await this.loadData();
      } else {
        if (this.engine.ui) this.engine.ui.showSystemMessage(data.error || 'Failed to save.', 'error');
      }
    } catch (e) {
      console.error(e);
      if (this.engine.ui) this.engine.ui.showSystemMessage('Error saving powerset.', 'error');
    }
  }

  async deletePowerset() {
    if (!this.currentPowersetId) return;
    if (!confirm(`Are you sure you want to delete powerset '${this.currentPowersetId}'?`)) return;

    try {
      const cat = document.getElementById('pse-category')?.value || 'custom';
      const res = await fetch('/api/powersets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: this.currentPowersetId, category: cat })
      });
      const data = await res.json();
      if (data.success) {
        if (this.engine.ui) this.engine.ui.showSystemMessage(data.message, 'success');
        this.createNewPowerset();
        await this.loadData();
      } else {
        if (this.engine.ui) this.engine.ui.showSystemMessage(data.error || 'Failed to delete.', 'error');
      }
    } catch (e) {
      console.error(e);
      if (this.engine.ui) this.engine.ui.showSystemMessage('Error deleting powerset.', 'error');
    }
  }
}
