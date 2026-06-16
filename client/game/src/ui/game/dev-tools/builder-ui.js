import { FURNITURE_REGISTRY } from '../registry.js?v=cache-bust-005';
import { UI_COLORS } from '../constants.js?v=cache-bust-005';

const TOOLTIP_STYLE = 'position: absolute; background: rgba(5, 7, 10, 0.9); border: 1px solid #3498db; color: #fff; padding: 5px; border-radius: 4px; pointer-events: none; z-index: 10000; font-family: var(--font-mono); font-size: 0.8rem; display: none;';
const SHAPE_CONTAINER_STYLE = 'display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; align-items: center;';
const SHAPE_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem; border-radius: 4px;';
const DIR_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #3498db; color: #3498db; min-width: 40px; display: none;';
const REL_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #9b59b6; color: #9b59b6; min-width: 40px; display: none;';
const FLUID_BTN_STYLE = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); font-size: 0.85rem; border-color: #e67e22; color: #e67e22; border-radius: 4px; display: none; background: rgba(0,0,0,0.8); cursor: pointer; outline: none; margin-bottom: 10px;';

export class BuilderUIManager {
  constructor(engine, devToolsUI) {
    this.engine = engine;
    this.devTools = devToolsUI;

    this.presetContainers = [];
  }

  setupBuilderTools() {
      const eng = this.engine;
      const builderPanel = this.devTools.builderToolsWindow.element;
      if (builderPanel) {
        builderPanel.style.display = eng.editMode ? 'flex' : 'none';

        if (eng.clientSettings.lockBuilderPanel) {
          const savedPos = localStorage.getItem('b_builder_pos');
          if (savedPos) {
            try { const pos = JSON.parse(savedPos); builderPanel.style.left = pos.left; builderPanel.style.top = pos.top; } catch (e) { }
          }
        } else {
          builderPanel.style.top = '70px';
          builderPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
          builderPanel.style.left = 'auto';
        }

        const toggleBuilderOpt = (id, prop) => {
          const btn = document.getElementById(id);
          if (btn) {
            btn.style.borderColor = eng.devOptions[prop] ? UI_COLORS.primary : '';
            btn.style.color = eng.devOptions[prop] ? UI_COLORS.primary : '';
            btn.onclick = () => {
              eng.devOptions[prop] = !eng.devOptions[prop];
              btn.style.borderColor = eng.devOptions[prop] ? UI_COLORS.primary : '';
              btn.style.color = eng.devOptions[prop] ? UI_COLORS.primary : '';
              localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
            };
          }
        };

        toggleBuilderOpt('btn-build-chunk', 'showChunk');
        toggleBuilderOpt('btn-build-preview', 'useBlockPreview');

        const btnToggleGrid = document.getElementById('btn-toggle-grid');
        if (btnToggleGrid) {
          btnToggleGrid.className = eng.devOptions.showGrid ? 'b-btn btn-primary' : 'b-btn btn-secondary';
          btnToggleGrid.innerText = eng.devOptions.showGrid ? 'Builder Grid: ON' : 'Builder Grid: OFF';
          btnToggleGrid.onclick = () => {
            eng.devOptions.showGrid = !eng.devOptions.showGrid;
            btnToggleGrid.className = eng.devOptions.showGrid ? 'b-btn btn-primary' : 'b-btn btn-secondary';
            btnToggleGrid.innerText = eng.devOptions.showGrid ? 'Builder Grid: ON' : 'Builder Grid: OFF';
            localStorage.setItem('b_dev_options', JSON.stringify(eng.devOptions));
          };
        }

        const btnToggleHotbar = document.getElementById('btn-toggle-hotbar');
        if (btnToggleHotbar) {
          btnToggleHotbar.onclick = () => {
            const hb = this.devTools.texturePaletteWindow.element;
            const ol = this.devTools.objectLibraryWindow.element;
            const isHidden = hb.style.display === 'none';
            if (isHidden) this.devTools.texturePaletteWindow.open(); else this.devTools.texturePaletteWindow.close();
            if (isHidden && ol) this.devTools.objectLibraryWindow.close();
            this.updateBuildingMode();
          };
        }

        const btnToggleObjLib = document.getElementById('btn-toggle-objlib');
        if (btnToggleObjLib) {
          btnToggleObjLib.onclick = () => {
            const hb = this.devTools.texturePaletteWindow.element;
            const ol = this.devTools.objectLibraryWindow.element;
            const isHidden = ol.style.display === 'none';
            if (isHidden) this.devTools.objectLibraryWindow.open(); else this.devTools.objectLibraryWindow.close();
            if (isHidden && hb) this.devTools.texturePaletteWindow.close();
            this.updateBuildingMode();
          };
        }
      }

      this.setupBuilderHotbar();
  }

  updateBuildingMode() {
    const eng = this.engine;
    const hb = document.getElementById('builder-hotbar');
    const ol = document.getElementById('object-library-panel');
    const hbVisible = hb && hb.style.display !== 'none';
    const olVisible = ol && ol.style.display !== 'none';

    if (hbVisible) {
      const activeSlot = document.querySelector('.hotbar-slot.active') || document.querySelector('.hotbar-slot[data-tex="stone"]');
      let base = 'cube';
      if (activeSlot && (activeSlot.dataset.tex === 'wood-door-bottom' || activeSlot.dataset.tex === 'wood-door-top')) base = 'door';

      eng.editShapeBase = base;
      eng.editShape = base;

      if (this.updateShapeUI) {
        this.updateShapeUI();
      } else {
        const shapeBtn = document.getElementById('build-shape-btn');
        if (shapeBtn) {
          if (shapeBtn.tagName === 'SELECT') {
            let hasOpt = Array.from(shapeBtn.options).some(o => o.value === base);
            if (!hasOpt) {
              shapeBtn.innerHTML = `<option value="${base}">SHAPE: ${base.toUpperCase()}</option>`;
            }
            shapeBtn.value = base;
          } else {
            shapeBtn.innerText = 'Shape: ' + base.toUpperCase();
          }
        }
      }
      if (activeSlot && !activeSlot.classList.contains('active')) activeSlot.click();
    } else if (olVisible) {
      if (!FURNITURE_REGISTRY[eng.editShapeBase]) {
        const firstObjId = Object.keys(FURNITURE_REGISTRY)[0];
        const objBtn = document.getElementById(`btn-obj-${firstObjId}`);
        if (objBtn) objBtn.click();
      }
    } else {
      eng.editShapeBase = 'none';
      eng.editShape = 'none';
      const shapeBtn = document.getElementById('build-shape-btn');
      if (shapeBtn) {
        if (shapeBtn.tagName === 'SELECT') shapeBtn.innerHTML = '<option value="none">SHAPE: NONE</option>';
        else shapeBtn.innerText = 'Shape: NONE';
      }
    }
  }

  setupObjectLibrary() {
    const eng = this.engine;
    const objLibPanel = this.devTools.objectLibraryWindow.element;

    if (eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
      const savedPos = localStorage.getItem('b_objlib_pos');
      if (savedPos) {
        try { const pos = JSON.parse(savedPos); objLibPanel.style.left = pos.left; objLibPanel.style.top = pos.top; } catch (e) { }
      } else {
        objLibPanel.style.top = '70px';
        objLibPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '570px' : '310px';
      }
    } else {
      objLibPanel.style.top = '70px';
      objLibPanel.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '570px' : '310px';
    }

    const objLibGrid = document.getElementById('obj-lib-grid');
    const tabsContainer = document.getElementById('obj-lib-tabs-container');

    if (objLibGrid && tabsContainer) {
      const categories = new Set();
      for (const data of Object.values(FURNITURE_REGISTRY)) {
        categories.add(data.category || 'misc');
      }

      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'b-btn btn-secondary obj-lib-tab-btn';
        btn.style.cssText = `padding: 4px 8px; font-size: 0.75rem; white-space: nowrap; border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary}; flex-shrink: 0; background: rgba(0,0,0,0.8); border-radius: 4px; cursor: pointer; transition: all 0.2s;`;
        btn.innerText = cat.charAt(0).toUpperCase() + cat.slice(1);
        btn.dataset.cat = cat;
        btn.onclick = () => {
          tabsContainer.querySelectorAll('.obj-lib-tab-btn').forEach(b => {
            b.style.background = 'rgba(0,0,0,0.8)';
            b.style.color = UI_COLORS.primary;
          });
          btn.style.background = 'rgba(52, 152, 219, 0.4)';
          btn.style.color = UI_COLORS.textBright;

          objLibGrid.querySelectorAll('.obj-lib-item').forEach(item => {
            item.style.display = item.dataset.cat === cat ? 'flex' : 'none';
          });
        };
        tabsContainer.appendChild(btn);
      });

      for (const [id, data] of Object.entries(FURNITURE_REGISTRY)) {
        const btnObj = document.createElement('button');
        btnObj.id = `btn-obj-${id}`;
        btnObj.className = 'b-btn btn-secondary obj-lib-item';
        btnObj.dataset.cat = data.category || 'misc';
        btnObj.innerHTML = `
          <img src="models/icons/${id}.png" style="width: 24px; height: 24px; object-fit: contain; image-rendering: pixelated;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <span style="display:none; font-size: 0.9rem; font-weight: bold; color: #fff;">${data.name.substring(0, 2).toUpperCase()}</span>
        `;
        btnObj.style.cssText = 'font-size: 1.2rem; padding: 5px; border-radius: 4px; border: 1px solid #444; background: rgba(0,0,0,0.5); cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.2s;';

        btnObj.onmouseenter = (e) => {
          btnObj.style.background = 'rgba(52, 152, 219, 0.3)';
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            builderTooltip.innerHTML = `
              <div style="display: flex; align-items: center; gap: 15px; padding: 2px;">
                <div style="width: 32px; height: 32px; margin: 5px; display: flex; justify-content: center; align-items: center; font-size: 18px;">
                  <img src="models/icons/${id}.png" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                  <span style="display:none; font-weight: bold; color: #fff;">${data.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <span>${data.name}</span>
              </div>
            `;
            builderTooltip.style.display = 'block';
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        btnObj.onmousemove = (e) => {
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        btnObj.onmouseleave = () => {
          btnObj.style.background = 'rgba(0,0,0,0.5)';
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) builderTooltip.style.display = 'none';
        };

        btnObj.onclick = () => {
          eng.editShapeBase = id;
          eng.editShape = id;

          eng.editShapeBase = id;
          eng.editShape = id;

          const shapeBtn = document.getElementById('build-shape-btn');
          const dirBtn = document.getElementById('build-dir-btn');
          const relBtn = document.getElementById('build-rel-btn');
          const flipBtn = document.getElementById('build-flip-btn');

          if (shapeBtn) {
            if (shapeBtn.tagName === 'SELECT') {
              if (!Array.from(shapeBtn.options).some(o => o.value === id)) {
                shapeBtn.innerHTML = `<option value="${id}">SHAPE: ${data.name.toUpperCase()}</option>`;
              }
              shapeBtn.value = id;
            } else {
              shapeBtn.innerText = `Shape: ${data.name.toUpperCase()}`;
            }
          }
          if (dirBtn) { dirBtn.style.display = 'block'; dirBtn.innerText = eng.editShapeDir.toUpperCase(); }
          if (relBtn) relBtn.style.display = 'none';
          if (flipBtn) flipBtn.style.display = 'none';
        };
        objLibGrid.appendChild(btnObj);
      }

      const firstTab = tabsContainer.querySelector('.obj-lib-tab-btn');
      if (firstTab) firstTab.click();
    }

    const colorPickerContainer = document.getElementById('obj-lib-color-picker');
    if (colorPickerContainer) {
      this.appendColorPicker(colorPickerContainer);
    }
  }

  setupBuilderHotbar() {
    const eng = this.engine;
    const builderHotbar = this.devTools.texturePaletteWindow.element;

    if (eng.clientSettings && eng.clientSettings.lockBuilderPanel) {
      const savedPos = localStorage.getItem('b_hotbar_pos');
      if (savedPos) {
        try {
          const pos = JSON.parse(savedPos);
          builderHotbar.style.left = pos.left; builderHotbar.style.top = pos.top;
        } catch (e) { }
      } else {
        builderHotbar.style.top = '280px';
        builderHotbar.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
      }
    } else {
      builderHotbar.style.top = '280px';
      builderHotbar.style.right = (eng.clientSettings && eng.clientSettings.showMinimap) ? '290px' : '30px';
    }

    let builderTooltip = document.getElementById('builder-tooltip');
    if (!builderTooltip) {
      builderTooltip = document.createElement('div');
      builderTooltip.id = 'builder-tooltip';
      builderTooltip.style.cssText = TOOLTIP_STYLE;
      document.body.appendChild(builderTooltip);
    }

    if (!document.getElementById('tooltip-spin-style')) {
      const style = document.createElement('style');
      style.id = 'tooltip-spin-style';
      style.innerHTML = `
          @keyframes tooltipSpin {
            0% { transform: rotateX(-35.264deg) rotateY(-45deg) scale(0.85); }
            100% { transform: rotateX(-35.264deg) rotateY(315deg) scale(0.85); }
          }
        `;
      document.head.appendChild(style);
    }

    const generateTooltipHTML = (text, isBlock, bgStyle, tColor) => {
      if (!isBlock) return text;
      const safeBg = bgStyle.replace(/"/g, "'");
      const makeFace = (transform, brightness, border) => `
          <div style="position: absolute; width: 32px; height: 32px; background: ${safeBg}; transform: ${transform}; border: 1px solid ${border}; filter: brightness(${brightness}); overflow: hidden;">
            <div style="position: absolute; inset: 0; background: ${tColor}; mix-blend-mode: multiply;"></div>
          </div>
        `;
      return `
          <div style="display: flex; align-items: center; gap: 15px; padding: 2px;">
            <div style="width: 32px; height: 32px; transform-style: preserve-3d; animation: tooltipSpin 4s infinite linear; margin: 5px;">
              ${makeFace('translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateY(180deg) translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateY(90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateY(-90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
              ${makeFace('rotateX(90deg) translateZ(16px)', 1.0, 'rgba(0,0,0,0.15)')}
              ${makeFace('rotateX(-90deg) translateZ(16px)', 0.5, 'rgba(0,0,0,0.4)')}
            </div>
            <span>${text}</span>
          </div>
        `;
    };

    const setupTooltip = (el, text, isBlock = false, bgStyle = '') => {
      el.onmouseenter = (e) => {
        if (isBlock) {
          const tColor = eng.buildColor || '#ffffff';
          builderTooltip.innerHTML = generateTooltipHTML(text, isBlock, bgStyle, tColor);
        } else {
          builderTooltip.innerText = text;
        }
        builderTooltip.style.display = 'block';
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      el.onmousemove = (e) => {
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      el.onmouseleave = () => {
        builderTooltip.style.display = 'none';
      };
    };

    const showColorPreviewTooltip = (e, targetColor, label) => {
      const activeSlot = document.querySelector('.hotbar-slot.active');
      let isBlock = false;
      let bgStyle = '';
      let blockName = '';
      if (activeSlot && activeSlot.dataset.tex !== 'picker' && activeSlot.dataset.tex !== 'erase') {
        isBlock = true;
        bgStyle = activeSlot.dataset.bg || '';
        blockName = activeSlot.dataset.name || activeSlot.dataset.tex;
      }
      const tooltipText = isBlock ? `${blockName} (${label})` : label;
      if (isBlock) {
        builderTooltip.innerHTML = generateTooltipHTML(tooltipText, isBlock, bgStyle, targetColor);
      } else {
        builderTooltip.innerText = tooltipText;
      }
      builderTooltip.style.display = 'block';
      builderTooltip.style.left = (e.clientX + 15) + 'px';
      builderTooltip.style.top = (e.clientY + 15) + 'px';
    };

    const controlsContainer = document.getElementById('hotbar-controls-container');
    const tabsContainer = document.getElementById('builder-tabs-container');
    const gridsWrapper = document.getElementById('hotbar-grids-wrapper');

    this.appendColorPicker(controlsContainer);

    const shapeContainer = document.createElement('div');
    shapeContainer.id = 'build-shape-container';
    shapeContainer.style.cssText = SHAPE_CONTAINER_STYLE;

    const shapeBtn = document.createElement('select');
    shapeBtn.id = 'build-shape-btn';
    shapeBtn.className = 'btn-secondary';
    shapeBtn.style.cssText = SHAPE_BTN_STYLE + ` text-transform: uppercase; cursor: pointer; border: 1px solid ${UI_COLORS.primary}; outline: none; background: rgba(0,0,0,0.8);`;

    shapeBtn.onchange = (e) => {
      eng.editShapeBase = e.target.value;
      updateShapeUI();
    };

    const dirBtn = document.createElement('button');
    dirBtn.id = 'build-dir-btn';
    dirBtn.className = 'btn-secondary';
    dirBtn.style.cssText = DIR_BTN_STYLE;
    dirBtn.innerText = 'N';

    const relBtn = document.createElement('button');
    relBtn.id = 'build-rel-btn';
    relBtn.className = 'btn-secondary';
    relBtn.style.cssText = REL_BTN_STYLE;
    relBtn.innerText = 'P';
    relBtn.title = 'Toggle Player Perspective';

    const flipBtn = document.createElement('button');
    flipBtn.id = 'build-flip-btn';
    flipBtn.className = 'btn-secondary';
    flipBtn.style.cssText = `padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: ${UI_COLORS.success}; color: ${UI_COLORS.success}; display: none; min-width: 40px;`;
    flipBtn.innerText = 'L-Hinge';
    flipBtn.title = 'Toggle Hinge Side (Left/Right)';

    const uvBtn = document.createElement('button');
    uvBtn.id = 'build-uv-btn';
    uvBtn.className = 'btn-secondary';
    uvBtn.style.cssText = 'padding: 5px 10px; font-weight: bold; font-family: var(--font-mono); border-color: #e67e22; color: #e67e22; display: none; min-width: 40px;';
    uvBtn.innerText = 'Auto UV';
    uvBtn.title = 'Toggle Texture Mapping (Seamless Box UV / Blockbench Mesh UV)';

    shapeContainer.appendChild(shapeBtn);
    shapeContainer.appendChild(relBtn);
    shapeContainer.appendChild(dirBtn);
    shapeContainer.appendChild(flipBtn);
    shapeContainer.appendChild(uvBtn);
    controlsContainer.appendChild(shapeContainer);

    const fluidBtn = document.createElement('button');
    fluidBtn.id = 'build-fluid-btn';
    fluidBtn.className = 'btn-secondary';
    fluidBtn.style.cssText = FLUID_BTN_STYLE;
    fluidBtn.innerText = 'Fluid State: STILL';
    controlsContainer.appendChild(fluidBtn);

    setupTooltip(shapeBtn, 'Select Block Shape');
    setupTooltip(dirBtn, 'Cycle Block Direction (N, E, S, W)');
    setupTooltip(relBtn, 'Toggle Player-Relative Rotation');
    setupTooltip(fluidBtn, 'Toggle Fluid State (Still / Flow)');

    eng.editShapeBase = 'cube';
    eng.editShapeDir = 'n';
    eng.editShapeRelative = false;
    eng.editShapeFlip = false;
    eng.editShapeUV = 'auto'; // 'auto', 'mesh', 'box'
    eng.editFluid = 'still';

    fluidBtn.onclick = () => {
      eng.editFluid = eng.editFluid === 'still' ? 'flow' : 'still';
      fluidBtn.innerText = 'Fluid State: ' + eng.editFluid.toUpperCase();
    };

    flipBtn.onclick = () => {
      eng.editShapeFlip = !eng.editShapeFlip;
      updateShapeUI();
    };

    uvBtn.onclick = () => {
      if (eng.editShapeUV === 'auto') eng.editShapeUV = 'mesh';
      else if (eng.editShapeUV === 'mesh') eng.editShapeUV = 'box';
      else eng.editShapeUV = 'auto';
      updateShapeUI();
    };

    const updateShapeUI = () => {
      if (eng.editShapeBase === 'none') {
        if (shapeBtn) {
          if (shapeBtn.tagName === 'SELECT') shapeBtn.innerHTML = '<option value="none">SHAPE: NONE</option>';
          else shapeBtn.innerText = 'Shape: NONE';
        }
        if (dirBtn) dirBtn.style.display = 'none';
        if (relBtn) relBtn.style.display = 'none';
        if (flipBtn) flipBtn.style.display = 'none';
        if (uvBtn) uvBtn.style.display = 'none';
        return;
      }

      const activeSlot = document.querySelector('.hotbar-slot.active');
      const tex = activeSlot ? activeSlot.dataset.tex : 'stone';
      let bases = ['cube', 'slab', 'top_slab', 'ramp', 'half_ramp', 'top_half_ramp', 'stair', 'decal', 'fence'];
      if (tex && tex.includes('door')) bases = ['door'];
      else if (tex && tex.startsWith('line-')) bases = ['decal'];
      else if (FURNITURE_REGISTRY[eng.editShapeBase]) bases = [eng.editShapeBase, ...bases];

      if (shapeBtn && shapeBtn.tagName === 'SELECT') {
        const currentOptions = Array.from(shapeBtn.options).map(o => o.value).join(',');
        if (currentOptions !== bases.join(',')) {
          shapeBtn.innerHTML = '';
          bases.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            let displayName = b;
            if (FURNITURE_REGISTRY[b]) displayName = FURNITURE_REGISTRY[b].name;
            else displayName = b.replace(/_/g, ' ');
            opt.innerText = 'SHAPE: ' + displayName.toUpperCase();
            shapeBtn.appendChild(opt);
          });
        }
        if (bases.includes(eng.editShapeBase)) {
          shapeBtn.value = eng.editShapeBase;
        } else {
          eng.editShapeBase = bases[0];
          shapeBtn.value = bases[0];
        }
      }

      if (eng.editShapeBase === 'door') {
        dirBtn.style.display = 'block';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'block';
        uvBtn.style.display = 'none';
      } else if (FURNITURE_REGISTRY[eng.editShapeBase]) {
        dirBtn.style.display = 'block';
        relBtn.style.display = 'none';
        flipBtn.style.display = eng.editShapeBase.includes('door') ? 'block' : 'none';
        uvBtn.style.display = 'block';
        if (eng.editShapeUV === 'auto') {
          uvBtn.innerText = 'Auto UV';
          uvBtn.style.background = 'transparent';
        } else if (eng.editShapeUV === 'mesh') {
          uvBtn.innerText = 'Mesh UV';
          uvBtn.style.background = 'rgba(230, 126, 34, 0.2)';
        } else {
          uvBtn.innerText = 'Box UV';
          uvBtn.style.background = 'rgba(230, 126, 34, 0.2)';
        }
      } else if (eng.editShapeBase === 'ramp' || eng.editShapeBase === 'half_ramp' || eng.editShapeBase === 'top_half_ramp' || eng.editShapeBase === 'stair' || eng.editShapeBase === 'decal') {
        dirBtn.style.display = eng.editShapeRelative ? 'none' : 'block';
        relBtn.style.display = 'block';
        flipBtn.style.display = 'none';
        uvBtn.style.display = 'none';
      } else {
        dirBtn.style.display = 'none';
        relBtn.style.display = 'none';
        flipBtn.style.display = 'none';
        uvBtn.style.display = 'none';
      }

      dirBtn.innerText = eng.editShapeDir.toUpperCase();
      relBtn.style.background = eng.editShapeRelative ? 'rgba(155, 89, 182, 0.2)' : 'transparent';
      flipBtn.innerText = eng.editShapeFlip ? 'R-Hinge' : 'L-Hinge';
      flipBtn.style.background = eng.editShapeFlip ? 'rgba(46, 204, 113, 0.2)' : 'transparent';

      let finalShape = eng.editShapeBase;
      if (finalShape === 'ramp' || finalShape === 'half_ramp' || finalShape === 'top_half_ramp' || finalShape === 'stair' || finalShape === 'door') {
        if (eng.editShapeRelative && finalShape !== 'door') {
          eng.editShape = finalShape + '_player';
        } else {
          eng.editShape = finalShape + '_' + eng.editShapeDir + (finalShape === 'door' && eng.editShapeFlip ? '_flip' : '');
        }
      } else if (FURNITURE_REGISTRY[finalShape]) {
        eng.editShape = finalShape + (finalShape.includes('door') && eng.editShapeFlip ? '_flip' : '');
      } else {
        eng.editShape = finalShape;
      }
    };

    dirBtn.onclick = () => {
      const dirs = ['n', 'e', 's', 'w'];
      eng.editShapeDir = dirs[(dirs.indexOf(eng.editShapeDir) + 1) % dirs.length];
      updateShapeUI();
    };

    relBtn.onclick = () => {
      eng.editShapeRelative = !eng.editShapeRelative;
      updateShapeUI();
    };
    this.updateShapeUI = updateShapeUI;
    updateShapeUI();

    const categories = {};
    const addCategory = (id, name) => {
      const btn = document.createElement('button');
      btn.className = 'btn-secondary';
      btn.style.cssText = `padding: 4px 8px; font-size: 0.75rem; white-space: nowrap; border-color: ${UI_COLORS.primary}; color: ${UI_COLORS.primary}; flex-shrink: 0; background: rgba(0,0,0,0.8); border-radius: 4px; cursor: pointer; transition: all 0.2s;`;
      btn.innerText = name;

      const grid = document.createElement('div');
      grid.style.cssText = 'display: none; grid-template-columns: repeat(5, 36px); gap: 8px; justify-content: center; align-content: start;';
      grid.className = 'cat-grid';

      btn.onclick = () => {
        tabsContainer.querySelectorAll('button').forEach(b => {
          b.style.background = 'rgba(0,0,0,0.8)';
          b.style.color = UI_COLORS.primary;
        });
        btn.style.background = 'rgba(52, 152, 219, 0.4)';
        btn.style.color = UI_COLORS.textBright;

        gridsWrapper.querySelectorAll('.cat-grid').forEach(g => g.style.display = 'none');
        grid.style.display = 'grid';

        this.renderColorPresets(id === 'industrial' ? 'industrial' : (id === 'lines' ? 'lines' : 'naturals'));
      };

      categories[id] = { btn, grid, name };

      tabsContainer.appendChild(btn);
      gridsWrapper.appendChild(grid);
    };

    addCategory('tools', 'Tools');
    addCategory('naturals', 'Naturals');
    addCategory('wood', 'Wood');
    addCategory('glass', 'Glass');
    addCategory('liquid', 'Liquid');
    addCategory('light', 'Light');
    addCategory('industrial', 'Industrial');
    addCategory('lines', 'Street Lines');

    const ensureActionSlot = (catId, id, text, title, action) => {
      const cat = categories[catId];
      if (!cat) return;
      const grid = cat.grid;

      const slot = document.createElement('div');
      slot.className = 'hotbar-action-slot';
      slot.style.cssText = `background: rgba(52, 152, 219, 0.2); border-radius: 4px; border: 2px solid ${UI_COLORS.primary}; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; color: #fff; font-size: 1rem; transition: background 0.2s;`;
      slot.innerHTML = text;

      slot.onmouseenter = (e) => {
        slot.style.background = 'rgba(52, 152, 219, 0.4)';
        builderTooltip.innerText = title;
        builderTooltip.style.display = 'block';
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      slot.onmousemove = (e) => {
        builderTooltip.style.left = (e.clientX + 15) + 'px';
        builderTooltip.style.top = (e.clientY + 15) + 'px';
      };
      slot.onmouseleave = () => {
        slot.style.background = 'rgba(52, 152, 219, 0.2)';
        builderTooltip.style.display = 'none';
      };

      slot.onclick = action;
      grid.appendChild(slot);
    };

    const ensureSlot = (catId, tex, bgStyle, text = '', title = '') => {
      const cat = categories[catId];
      if (!cat) return;
      const grid = cat.grid;

      if (!grid.querySelector(`[data-tex="${tex}"]`)) {
        const slot = document.createElement('div');
        slot.className = 'hotbar-slot';
        slot.dataset.tex = tex;
        slot.dataset.bg = bgStyle;
        slot.dataset.name = title || tex.toUpperCase();
        slot.dataset.cat = cat.name;
        slot.style.background = bgStyle;
        slot.style.borderRadius = '4px';
        slot.style.border = '2px solid #444';
        slot.style.cursor = 'pointer';
        slot.style.display = 'flex';
        slot.style.alignItems = 'center';
        slot.style.justifyContent = 'center';
        slot.style.width = '36px';
        slot.style.height = '36px';
        slot.innerHTML = text;
        const isBlock = tex !== 'picker' && tex !== 'erase';
        setupTooltip(slot, title || tex.toUpperCase(), isBlock, bgStyle);
        grid.appendChild(slot);

        slot.addEventListener('click', () => {
          gridsWrapper.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
          slot.classList.add('active');

          const ol = document.getElementById('object-library-panel');
          const olVisible = ol && ol.style.display !== 'none';

          if (tex === 'wood-door-bottom' || tex === 'wood-door-top') {
            eng.editShapeBase = 'door';
            eng.editShapeFlip = false;
            updateShapeUI();
          } else if (FURNITURE_REGISTRY[tex]) {
            eng.editShapeBase = tex;
            eng.editShapeFlip = false;
            updateShapeUI();
          } else if (tex.startsWith('line-')) {
            eng.editShapeBase = 'decal';
            eng.editShapeFlip = false;
            updateShapeUI();
          } else if (eng.editShapeBase === 'door' || (!olVisible && eng.editShapeBase !== 'cube' && eng.editShapeBase !== 'slab' && eng.editShapeBase !== 'top_slab' && eng.editShapeBase !== 'ramp' && eng.editShapeBase !== 'half_ramp' && eng.editShapeBase !== 'top_half_ramp' && eng.editShapeBase !== 'stair' && eng.editShapeBase !== 'decal' && eng.editShapeBase !== 'fence')) {
            eng.editShapeBase = 'cube';
            eng.editShapeFlip = false;
            updateShapeUI();
          } else {
            if (!olVisible && eng.editShapeBase !== 'cube' && eng.editShapeBase !== 'slab' && eng.editShapeBase !== 'top_slab' && eng.editShapeBase !== 'ramp' && eng.editShapeBase !== 'half_ramp' && eng.editShapeBase !== 'top_half_ramp' && eng.editShapeBase !== 'stair' && eng.editShapeBase !== 'decal' && eng.editShapeBase !== 'fence') {
              eng.editShapeBase = 'cube';
              eng.editShapeFlip = false;
              updateShapeUI();
            }
          }

          if (slot.dataset.tex === 'picker') {
            eng.selectedTiles = [];
            eng.isDraggingSelection = false;
            eng.renderer.needsVoxelUpdate = true;
            return;
          }

          const isFluid = ['water', 'lava', 'acid'].includes(slot.dataset.tex);
          fluidBtn.style.display = isFluid ? 'block' : 'none';
          if (isFluid) {
            eng.editFluid = 'still';
            fluidBtn.innerText = 'Fluid State: STILL';
          }

          if (eng.selectedTiles.length > 0) {
            const isErase = slot.dataset.tex === 'erase' || eng.input.isActionDown('buildDelete');
            let placeShape = eng.editShape || 'cube';
            if (placeShape.endsWith('_player')) {
              const base = placeShape.split('_')[0];
              const pDir = eng.player.dir;
              if (pDir.includes('up')) placeShape = base + '_n';
              else if (pDir.includes('down')) placeShape = base + '_s';
              else if (pDir.includes('right')) placeShape = base + '_e';
              else if (pDir.includes('left')) placeShape = base + '_w';
              else placeShape = base + '_s';
            }

            let baseTex = slot.dataset.tex;
            if (baseTex === 'water' && eng.editFluid === 'flow') baseTex = 'water_flow';

            const finalUVMode = eng.editShapeUV === 'auto' ? undefined : (eng.editShapeUV === 'mesh');
            const updates = [];
            const previousStates = [];
            eng.selectedTiles.forEach(tile => {
              const clickedVoxelOld = eng.mapManager.getVoxelAt(tile.x, tile.y, tile.z);
              previousStates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: clickedVoxelOld ? { ...clickedVoxelOld } : null });

              let finalTex = baseTex;
              if (slot.dataset.tex === 'arcade-carpet') {
                const wx = Math.round(tile.x / 32);
                const wy = Math.round(tile.y / 32);
                const rx = ((wx % 2) + 2) % 2;
                const ry = ((wy % 2) + 2) % 2;
                finalTex = `arcade-carpet-${rx}-${ry}`;
              }

              if (isErase) {
                eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, null, false);
                updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: null });
                for (let i = 0; i < 5; i++) {
                  eng.spawnParticle({
                    x: tile.x, y: tile.y, z: tile.z,
                    vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100, vz: (Math.random() - 0.5) * 100,
                    life: 0.3 + Math.random() * 0.3, maxLife: 0.6, color: 'rgba(200, 200, 200, 0.7)', size: 1 + Math.random()
                  });
                }
              } else {
                eng.mapManager.setVoxelAt(tile.x, tile.y, tile.z, { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir, useMeshUV: finalUVMode }, false);
                updates.push({ worldX: tile.x, worldY: tile.y, worldZ: tile.z, voxelData: { tex: finalTex, color: eng.buildColor, shape: placeShape, dir: eng.editShapeDir, useMeshUV: finalUVMode } });
                for (let i = 0; i < 3; i++) {
                  eng.spawnParticle({
                    x: tile.x + (Math.random() - 0.5) * 32, y: tile.y + (Math.random() - 0.5) * 32, z: tile.z + (Math.random() - 0.5) * 32,
                    life: 0.2 + Math.random() * 0.2, maxLife: 0.4, color: eng.buildColor, size: 1 + Math.random()
                  });
                }
              }
            });

            eng.history = eng.history || [];
            if (previousStates.length > 0) eng.history.push(previousStates);
            if (eng.history.length > 30) eng.history.shift();
            eng.redoHistory = [];

            eng.selectedTiles = [];
            eng.isDraggingSelection = false;
            eng.renderer.needsVoxelUpdate = true;
            updates.forEach(u => eng.network.sendUpdateBlock(u));
          }
        });
      }
    };

    ensureSlot('tools', 'picker', 'rgba(155, 89, 182, 0.5)', '🔍', 'Picker Tool');
    ensureSlot('tools', 'erase', 'rgba(231, 76, 60, 0.5)', 'X', 'Erase Tool');
    ensureActionSlot('tools', 'undo', '↶', 'Undo (Ctrl+Z)', () => { if (eng.undo) eng.undo(); });
    ensureActionSlot('tools', 'redo', '↷', 'Redo (Ctrl+Y)', () => { if (eng.redo) eng.redo(); });

    ensureSlot('naturals', 'grass', '#51852E', '', 'Grass');
    ensureSlot('naturals', 'dirt', 'url("assets/tiles/base/all-facing/dirt.png") center/cover', '', 'Dirt');
    ensureSlot('naturals', 'stone', 'url("assets/tiles/base/all-facing/stone.png") center/cover', '', 'Stone');
    ensureSlot('naturals', 'stone-bricks', 'url("assets/tiles/base/all-facing/stone-bricks1.png") center/cover', '', 'Stone Bricks');
    ensureSlot('naturals', 'cobblestone', 'url("assets/tiles/base/all-facing/cobblestone.png") center/cover', '', 'Cobblestone');
    ensureSlot('naturals', 'cobbled_deepslate', 'url("assets/tiles/base/all-facing/cobbled_deepslate.png") center/cover', '', 'Cobbled Deepslate');
    ensureSlot('naturals', 'gravel', 'url("assets/tiles/base/all-facing/gravel.png") center/cover', '', 'Gravel');
    ensureSlot('naturals', 'sand', 'url("assets/tiles/base/all-facing/sand.png") center/cover', '', 'Sand');
    ensureSlot('naturals', 'clay', 'url("assets/tiles/base/all-facing/clay.png") center/cover', '', 'Clay');
    ensureSlot('naturals', 'mud', 'url("assets/tiles/base/all-facing/packed_mud1.png") center/cover', '', 'Mud');
    ensureSlot('naturals', 'ice', 'url("assets/tiles/base/all-facing/ice.png") center/cover', '', 'Ice');

    ensureSlot('glass', 'glass', 'url("assets/tiles/base/all-facing/glass.png") center/cover', '', 'Glass');
    ensureSlot('glass', 'glass-stained', 'url("assets/tiles/base/all-facing/glass-stained.png") center/cover', '', 'Stained Glass');
    ensureSlot('glass', 'clear_stained_glass_edges', 'url("assets/tiles/base/all-facing/clear_stained_glass_edges.png") center/cover', '', 'Clear Stained Glass (Edges)');
    ensureSlot('glass', 'clear_stained_glass_edgeless', 'url("assets/tiles/base/all-facing/clear_stained_glass_edgeless.png") center/cover', '', 'Clear Stained Glass (Edgeless)');

    const cb = '?v=' + Date.now();
    ensureSlot('liquid', 'water', `url("assets/tiles/base/fluid/water_still.png${cb}") center/cover`, '', 'Water');
    ensureSlot('liquid', 'lava', `linear-gradient(rgba(255, 93, 0, 0.6), rgba(255, 93, 0, 0.6)), url("assets/tiles/base/fluid/lava_still.png${cb}") center/cover`, '', 'Lava');
    ensureSlot('liquid', 'acid', `linear-gradient(rgba(46, 204, 113, 0.6), rgba(46, 204, 113, 0.6)), url("assets/tiles/base/fluid/water_still.png${cb}") center/cover`, '', 'Acid');

    ensureSlot('light', 'block-lamp-on-0', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/8 Spread)');
    ensureSlot('light', 'block-lamp-on-1', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/4 Spread)');
    ensureSlot('light', 'block-lamp-on-2', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (1/2 Spread)');
    ensureSlot('light', 'block-lamp-on-3', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (3/4 Spread)');
    ensureSlot('light', 'block-lamp-on', `url("assets/tiles/base/all-facing/block-lamp-on.png${cb}") center/cover`, '', 'Lantern (Max Spread)');
    ensureSlot('light', 'light_block', 'rgba(241, 196, 15, 0.4)', '', 'Light Block (Invisible)');

    ensureSlot('wood', 'wood-planks', '#8B5A2B url("assets/tiles/base/all-facing/wood-planks.png") center/cover', '', 'Wood Planks');
    ensureSlot('wood', 'wood-stripped', '#A0522D url("assets/tiles/base/all-facing/wood-stripped.png") center/cover', '', 'Stripped Wood');
    ensureSlot('wood', 'bark-log', '#5c4033 url("assets/tiles/base/all-facing/bark-log.png") center/cover', '', 'Bark Log');
    ensureSlot('wood', 'bark-birch', '#d4b79b url("assets/tiles/base/all-facing/bark-birch.png") center/cover', '', 'Birch Bark');
    ensureSlot('wood', 'wooden-door-1', '#6b4c3a url("assets/tiles/base/interactable/wooden-door-1.png") center/cover', '', 'Custom Door 1');
    ensureSlot('wood', 'wooden-door-2', '#6b4c3a url("assets/tiles/base/interactable/wooden-door-2.png") center/cover', '', 'Custom Door 2');

    ensureSlot('industrial', 'concrete', 'url("assets/tiles/base/all-facing/concrete.png") center/cover', '', 'Concrete');
    ensureSlot('industrial', 'paint', 'url("assets/tiles/base/side/rough-paint.png") center/cover', '', 'Paint');
    ensureSlot('industrial', 'carpet', 'url("assets/tiles/base/all-facing/carpet.png") center/cover', '', 'Carpet');
    ensureSlot('industrial', 'arcade-carpet', 'url("assets/tiles/base/all-facing/arcade-carpet.png") center/cover', '', 'Arcade Carpet');

    ensureSlot('lines', 'line-dashed', 'url("assets/tiles/base/all-facing/line-dashed.png") center/cover', '', 'Line (Dashed)');
    ensureSlot('lines', 'line-solid', 'url("assets/tiles/base/all-facing/line-solid.png") center/cover', '', 'Line (Solid)');
    ensureSlot('lines', 'line-double-solid', 'url("assets/tiles/base/all-facing/line-double-solid.png") center/cover', '', 'Line (Double Solid)');
    ensureSlot('lines', 'line-sidewalk-2', 'url("assets/tiles/base/all-facing/line-sidewalk-2.png") center/cover', '', 'Sidewalk Lines (2)');
    ensureSlot('lines', 'line-sidewalk-4', 'url("assets/tiles/base/all-facing/line-sidewalk-4.png") center/cover', '', 'Sidewalk Lines (4)');

    ensureSlot('lines', 'line-edge-1-dashed', 'url("assets/tiles/base/all-facing/line-edge-1-dashed.png") center/cover', '', 'Line (Edge 1 Dashed)');
    ensureSlot('lines', 'line-edge-2-dashed', 'url("assets/tiles/base/all-facing/line-edge-2-dashed.png") center/cover', '', 'Line (Edge 2 Dashed)');
    ensureSlot('lines', 'line-double-dashed-solid', 'url("assets/tiles/base/all-facing/line-double-dashed-solid.png") center/cover', '', 'Line (Dashed & Solid)');
    ensureSlot('lines', 'line-corner-3-dashed', 'url("assets/tiles/base/all-facing/line-corner-3-dashed.png") center/cover', '', 'Line (Corner 3 Dashed)');
    ensureSlot('lines', 'line-t-dashed', 'url("assets/tiles/base/all-facing/line-t-dashed.png") center/cover', '', 'Line (T Dashed)');

    ensureSlot('lines', 'line-split-1', 'url("assets/tiles/base/all-facing/line-split-1.png") center/cover', '', 'Line (Split 1)');
    ensureSlot('lines', 'line-split-2', 'url("assets/tiles/base/all-facing/line-split-2.png") center/cover', '', 'Line (Split 2)');
    ensureSlot('lines', 'line-t-1', 'url("assets/tiles/base/all-facing/line-t-1.png") center/cover', '', 'Line (T 1)');
    ensureSlot('lines', 'line-t-2', 'url("assets/tiles/base/all-facing/line-t-2.png") center/cover', '', 'Line (T 2)');
    ensureSlot('lines', 'line-x', 'url("assets/tiles/base/all-facing/line-x.png") center/cover', '', 'Line (X)');

    ensureSlot('lines', 'line-corner-1', 'url("assets/tiles/base/all-facing/line-corner-1.png") center/cover', '', 'Line (Corner 1)');
    ensureSlot('lines', 'line-corner-2', 'url("assets/tiles/base/all-facing/line-corner-2.png") center/cover', '', 'Line (Corner 2)');
    ensureSlot('lines', 'line-corner-3', 'url("assets/tiles/base/all-facing/line-corner-3.png") center/cover', '', 'Line (Corner 3)');
    ensureSlot('lines', 'line-corner-4', 'url("assets/tiles/base/all-facing/line-corner-4.png") center/cover', '', 'Line (Corner 4)');
    ensureSlot('lines', 'line-corner-5', 'url("assets/tiles/base/all-facing/line-corner-5.png") center/cover', '', 'Line (Corner 5)');

    ensureSlot('lines', 'line-edge-1', 'url("assets/tiles/base/all-facing/line-edge-1.png") center/cover', '', 'Line (Edge 1)');
    ensureSlot('lines', 'line-edge-2', 'url("assets/tiles/base/all-facing/line-edge-2.png") center/cover', '', 'Line (Edge 2)');
    ensureSlot('lines', 'line-edge-end-1', 'url("assets/tiles/base/all-facing/line-edge-end-1.png") center/cover', '', 'Line (Edge End 1)');
    ensureSlot('lines', 'line-edge-end-2', 'url("assets/tiles/base/all-facing/line-edge-end-2.png") center/cover', '', 'Line (Edge End 2)');

    if (categories['naturals']) categories['naturals'].btn.click();
    const firstSlot = gridsWrapper.querySelector('.hotbar-slot[data-tex="stone"]');
    if (firstSlot) firstSlot.click();
  }

  appendColorPicker(container) {
    const eng = this.engine;
    if (!eng.buildColor) eng.buildColor = '#ffffff';

    const colorContainer = document.createElement('div');
    colorContainer.style.display = 'flex';
    colorContainer.style.flexDirection = 'column';
    colorContainer.style.gap = '5px';
    colorContainer.style.marginTop = '10px';

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'shared-color-picker';
    colorPicker.value = eng.buildColor;
    colorPicker.style.width = '100%';
    colorPicker.style.height = '24px';
    colorPicker.style.padding = '0';
    colorPicker.style.border = '1px solid #333';
    colorPicker.style.borderRadius = '4px';
    colorPicker.style.cursor = 'pointer';

    colorPicker.addEventListener('input', (e) => {
      eng.buildColor = e.target.value;
      document.querySelectorAll('.shared-color-picker').forEach(cp => {
        if (cp !== colorPicker) cp.value = e.target.value;
      });
    });

    const presetsWrapper = document.createElement('div');
    presetsWrapper.style.cssText = 'background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center;';

    const presetsHeader = document.createElement('div');
    presetsHeader.style.cssText = 'color: #aaa; font-size: 0.65rem; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;';
    presetsHeader.innerText = 'Color Presets';
    presetsWrapper.appendChild(presetsHeader);

    const presetsContainer = document.createElement('div');
    presetsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(8, 22px); gap: 4px; justify-content: center;';

    this.presetContainers = this.presetContainers || [];
    this.presetContainers.push(presetsContainer);
    this.renderColorPresets('naturals');

    presetsWrapper.appendChild(presetsContainer);
    colorContainer.appendChild(colorPicker);
    colorContainer.appendChild(presetsWrapper);
    container.appendChild(colorContainer);
  }

  renderColorPresets(category) {
    if (!this.presetContainers) return;
    const eng = this.engine;
    let presets = [];
    if (category === 'industrial') {
      presets = [
        { name: 'Asphalt Dark', hex: '#222222' }, { name: 'Asphalt', hex: '#333333' }, { name: 'Road Grey', hex: '#444444' }, { name: 'Faded Road', hex: '#555555' },
        { name: 'Dark Concrete', hex: '#7f8c8d' }, { name: 'Concrete', hex: '#95a5a6' }, { name: 'Sidewalk', hex: '#bdc3c7' }, { name: 'Light Concrete', hex: '#d0d3d4' },
        { name: 'Plaster White', hex: '#ecf0f1' }, { name: 'Office White', hex: '#fdfefe' }, { name: 'Eggshell', hex: '#f4f6f6' }, { name: 'Putty', hex: '#eaeded' },
        { name: 'Dark Brick', hex: '#922b21' }, { name: 'Industrial Red', hex: '#a93226' }, { name: 'Cinder', hex: '#c0392b' }, { name: 'Rust', hex: '#e74c3c' },
        { name: 'Hazard Yellow', hex: '#f1c40f' }, { name: 'Warning Orange', hex: '#f39c12' }, { name: 'Safety Gold', hex: '#d4ac0d' }, { name: 'Mustard', hex: '#b7950b' },
        { name: 'Steel', hex: '#34495e' }, { name: 'Dark Metal', hex: '#2c3e50' }, { name: 'Gunmetal', hex: '#273746' }, { name: 'Iron', hex: '#1c2833' }
      ];
    } else if (category === 'naturals') {
      presets = [
        { name: 'Fern Leaf', hex: '#27ae60' }, { name: 'Moss Green', hex: '#219653' }, { name: 'Jungle Vine', hex: '#1e8449' }, { name: 'Deep Forest', hex: '#145a32' },
        { name: 'Sprout', hex: '#2ecc71' }, { name: 'Succulent', hex: '#26c6da' }, { name: 'Sage', hex: '#a2d9ce' }, { name: 'Cactus', hex: '#7dcea0' },
        { name: 'Rose Red', hex: '#e91e63' }, { name: 'Petal Pink', hex: '#f8bbd0' }, { name: 'Lavender', hex: '#bb8fce' }, { name: 'Orchid Purple', hex: '#8e44ad' },
        { name: 'Sunflower', hex: '#f1c40f' }, { name: 'Marigold', hex: '#e67e22' }, { name: 'Autumn Leaf', hex: '#d35400' }, { name: 'Dried Bark', hex: '#6e2c00' }
      ];
    } else if (category === 'liquids') {
      presets = [
        { name: 'Clear Water', hex: '#3498db' }, { name: 'Deep Ocean', hex: '#2980b9' }, { name: 'Abyssal Blue', hex: '#1b4f72' }, { name: 'Tropical Teal', hex: '#1abc9c' },
        { name: 'Bio Acid', hex: '#39ff14' }, { name: 'Toxic Sludge', hex: '#27ae60' }, { name: 'Caustic Waste', hex: '#76d7c4' }, { name: 'Radioactive Gloop', hex: '#ccff00' },
        { name: 'Fresh Lava', hex: '#ff4500' }, { name: 'Magma Flow', hex: '#e65100' }, { name: 'Molten Core', hex: '#ff8c00' }, { name: 'Cooling Crust', hex: '#5c2518' },
        { name: 'Muddy Swamp', hex: '#4d5656' }, { name: 'Murky Depths', hex: '#16a085' }, { name: 'Vile Bile', hex: '#b7950b' }, { name: 'Pure Ether', hex: '#85c1e9' }
      ];
    } else if (category === 'lines') {
      presets = [
        { name: 'Standard White', hex: '#ffffff' }, { name: 'Faded White', hex: '#bdc3c7' }, { name: 'Handicap Blue', hex: '#3498db' }, { name: 'Faded Blue', hex: '#2980b9' },
        { name: 'Warning Yellow', hex: '#f1c40f' }, { name: 'Faded Yellow', hex: '#f39c12' }, { name: 'Fire Lane Red', hex: '#e74c3c' }, { name: 'Faded Red', hex: '#c0392b' }
      ];
    } else {
      presets = [
        { name: 'Default', hex: '#ffffff' }, { name: 'Birch', hex: '#e1d4b6' }, { name: 'Pine', hex: '#d9c593' }, { name: 'Bamboo', hex: '#d5d48c' },
        { name: 'Alder', hex: '#d4b79b' }, { name: 'Ash', hex: '#c2bba8' }, { name: 'Driftwood', hex: '#8c8c83' }, { name: 'Maple', hex: '#c58d55' },
        { name: 'Oak', hex: '#a08153' }, { name: 'Teak', hex: '#9d6736' }, { name: 'Jungle', hex: '#b07c57' }, { name: 'Acacia', hex: '#ba643b' },
        { name: 'Cherry', hex: '#c9786a' }, { name: 'Red Cedar', hex: '#8c3c2f' }, { name: 'Mangrove', hex: '#77353b' }, { name: 'Chestnut', hex: '#7d492e' },
        { name: 'Spruce', hex: '#7a5840' }, { name: 'Hickory', hex: '#8a5c3a' }, { name: 'Mahogany', hex: '#5a2523' }, { name: 'Rosewood', hex: '#63251c' },
        { name: 'Walnut', hex: '#5c4033' }, { name: 'Dark Oak', hex: '#452c16' }, { name: 'Ironwood', hex: '#3e342b' }, { name: 'Ebony', hex: '#26221f' }
      ];
    }

    this.presetContainers.forEach(container => {
      container.innerHTML = '';
      presets.forEach(p => {
        const pBtn = document.createElement('button');
        pBtn.style.cssText = `width: 22px; height: 22px; background: ${p.hex}; border: 1px solid #000; border-radius: 2px; cursor: pointer; padding: 0; box-sizing: border-box;`;

        pBtn.onmouseenter = (e) => {
          const activeSlot = document.querySelector('.hotbar-slot.active') || document.querySelector('.hotbar-slot[data-tex="stone"]');
          let isBlock = false;
          let bgStyle = '';
          let blockName = '';
          if (activeSlot && activeSlot.dataset.tex !== 'picker' && activeSlot.dataset.tex !== 'erase') {
            isBlock = true;
            bgStyle = activeSlot.dataset.bg || '';
            blockName = activeSlot.dataset.name || activeSlot.dataset.tex;
          }
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            const tooltipText = isBlock ? `${blockName} (${p.name})` : p.name;
            if (isBlock) {
              const safeBg = bgStyle.replace(/"/g, "'");
              const makeFace = (transform, brightness, border) => `
                       <div style="position: absolute; width: 32px; height: 32px; background: ${safeBg}; transform: ${transform}; border: 1px solid ${border}; filter: brightness(${brightness}); overflow: hidden;">
                         <div style="position: absolute; inset: 0; background: ${p.hex}; mix-blend-mode: multiply;"></div>
                       </div>
                     `;
              builderTooltip.innerHTML = `
                       <div style="display: flex; align-items: center; gap: 15px; padding: 2px;">
                         <div style="width: 32px; height: 32px; transform-style: preserve-3d; animation: tooltipSpin 4s infinite linear; margin: 5px;">
                           ${makeFace('translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateY(180deg) translateZ(16px)', 0.85, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateY(90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateY(-90deg) translateZ(16px)', 0.7, 'rgba(0,0,0,0.4)')}
                           ${makeFace('rotateX(90deg) translateZ(16px)', 1.0, 'rgba(0,0,0,0.15)')}
                           ${makeFace('rotateX(-90deg) translateZ(16px)', 0.5, 'rgba(0,0,0,0.4)')}
                         </div>
                         <span>${tooltipText}</span>
                       </div>
                     `;
            } else {
              builderTooltip.innerText = tooltipText;
            }
            builderTooltip.style.display = 'block';
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        pBtn.onmousemove = (e) => {
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) {
            builderTooltip.style.left = (e.clientX + 15) + 'px';
            builderTooltip.style.top = (e.clientY + 15) + 'px';
          }
        };
        pBtn.onmouseleave = () => {
          const builderTooltip = document.getElementById('builder-tooltip');
          if (builderTooltip) builderTooltip.style.display = 'none';
        };

        pBtn.onclick = () => {
          eng.buildColor = p.hex;
          document.querySelectorAll('.shared-color-picker').forEach(cp => cp.value = p.hex);
        };
        container.appendChild(pBtn);
      });
    });
  }
}
