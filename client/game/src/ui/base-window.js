export class BaseWindow {
  static currentZIndex = 1000;

  /**
   * @param {string} id - The DOM ID for the window wrapper
   * @param {string} title - The display text in the header
   * @param {Object} options - Configuration options (width, height, x, y, draggable)
   */
  constructor(id, title, options = {}) {
    this.id = id;
    this.title = title;
    this.width = options.width || 400;
    this.height = options.height || 'auto';
    this.x = options.x || 100;
    this.y = options.y || 100;
    this.isDraggable = options.draggable !== false;

    this.element = null;
    this.body = null;
    this.stateKey = `b_window_state_${this.id}`;

    this.build();
  }

  build() {
    const existing = document.getElementById(this.id);
    if (existing) existing.remove();

    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'b-window';
    this.element.style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    this.element.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.display = 'none'; // Hidden by default
    this.element.style.opacity = '0';
    this.element.style.transform = 'scale(0.95)';
    this.element.style.overflow = 'hidden';
    this.element.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out, height 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

    // Header (32px, Neon-rainbow theme via CSS)
    const header = document.createElement('div');
    header.className = 'b-window-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'b-window-title';
    titleSpan.innerText = this.title;

    const controls = document.createElement('div');
    controls.className = 'b-window-controls';

    const minBtn = document.createElement('button');
    minBtn.className = 'b-window-btn';
    minBtn.innerText = '_';
    minBtn.title = 'Minimize';
    minBtn.onclick = () => this.toggleMinimize();

    const closeBtn = document.createElement('button');
    closeBtn.className = 'b-window-btn';
    closeBtn.innerText = 'X';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.close();

    controls.appendChild(minBtn);
    controls.appendChild(closeBtn);

    header.appendChild(titleSpan);
    header.appendChild(controls);

    // Body (8px Grid Spacing via CSS)
    this.body = document.createElement('div');
    this.body.className = 'b-window-body';
    this.body.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out';
    this.body.style.transformOrigin = 'top center';

    this.element.appendChild(header);
    this.element.appendChild(this.body);

    this.element.addEventListener('mousedown', () => this.bringToFront());

    // Append to game screen if available, otherwise document body
    const container = document.getElementById('game-screen') || document.body;
    container.appendChild(this.element);

    if (this.isDraggable) {
      this.makeDraggable(header);
    }

    this.restoreState();
  }

  saveState() {
    const state = {
      left: this.element.style.left,
      top: this.element.style.top,
      minimized: this.element.dataset.minimized === 'true'
    };
    localStorage.setItem(this.stateKey, JSON.stringify(state));
  }

  restoreState() {
    const saved = localStorage.getItem(this.stateKey);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.left && state.left !== 'auto') {
          const leftVal = parseInt(state.left, 10);
          this.element.style.left = `${Math.max(0, Math.min(leftVal, window.innerWidth - 100))}px`;
        }
        if (state.top && state.top !== 'auto') {
          const topVal = parseInt(state.top, 10);
          this.element.style.top = `${Math.max(0, Math.min(topVal, window.innerHeight - 32))}px`;
        }

        if (this.body && this.body.style.display === 'none') {
          this.body.style.display = 'flex';
        }

        if (state.minimized) {
          this.element.dataset.minimized = 'true';
          this.element.style.overflow = 'hidden';
          this.element.style.height = '32px';
          this.body.style.transform = 'translateY(-20px)';
          this.body.style.opacity = '0';
          this.body.style.pointerEvents = 'none';
        } else {
          this.element.dataset.minimized = 'false';
          this.element.style.overflow = 'visible';
          this.body.style.transform = 'translateY(0)';
          this.body.style.opacity = '1';
          this.body.style.pointerEvents = 'auto';
        }
      } catch (e) {
        console.warn('Failed to restore window state for', this.id);
      }
    }
  }

  setContent(htmlOrElement) {
    if (typeof htmlOrElement === 'string') {
      this.body.innerHTML = htmlOrElement;
    } else {
      this.body.innerHTML = '';
      this.body.appendChild(htmlOrElement);
    }
  }

  setTitle(title) {
    this.title = title;
    const titleEl = this.element.querySelector('.b-window-title');
    if (titleEl) titleEl.innerText = title;
  }

  open() {
    this.element.style.display = 'flex';
    void this.element.offsetWidth; // Force reflow
    this.element.style.opacity = '1';
    this.element.style.transform = 'scale(1)';
    this.bringToFront();
    this.onOpen();
  }

  close() {
    this.element.style.opacity = '0';
    this.element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      if (this.element.style.opacity === '0') {
        this.element.style.display = 'none';
      }
    }, 150);
    this.onClose();
  }

  toggleMinimize() {
    const isMinimized = this.element.dataset.minimized === 'true';
    if (isMinimized) {
      this.element.dataset.minimized = 'false';
      this.element.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
      setTimeout(() => {
        if (this.element.dataset.minimized === 'false') {
           if (this.height === 'auto') this.element.style.height = 'auto';
           this.element.style.overflow = 'visible'; // Restore overflow so dropdowns aren't clipped
        }
      }, 200);
    } else {
      this.element.dataset.minimized = 'true';
      this.element.style.overflow = 'hidden'; // Hide during animation
      if (this.element.style.height === 'auto' || !this.element.style.height) {
        this.element.style.height = `${this.element.offsetHeight}px`;
        void this.element.offsetWidth; // Force reflow
      }
      this.element.style.height = '32px'; // Snap to header height
      this.body.style.transform = 'translateY(-20px)'; // Suck up effect
      this.body.style.opacity = '0';
      this.body.style.pointerEvents = 'none';
    }
    this.saveState();
  }

  bringToFront() {
    BaseWindow.currentZIndex++;
    this.element.style.zIndex = BaseWindow.currentZIndex;
  }

  // Lifecycle hooks for subclasses to implement
  onOpen() { }
  onClose() { }

  makeDraggable(header) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      // Handle zoomed/scaled UI context
      let scale = 1;
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen && gameScreen.style.zoom) {
        scale = parseFloat(gameScreen.style.zoom) || 1;
      }

      initialLeft = this.element.offsetLeft;
      initialTop = this.element.offsetTop;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;

        // Determine UI constraints based on current settings
        let isEnergyMerged = false;
        let isAlternativeUI = false;
        try {
          const settings = JSON.parse(localStorage.getItem('b_client_settings') || '{}');
          isEnergyMerged = settings.mergeSynthBar === true;
          isAlternativeUI = (settings.uiMode || 'alternative') === 'alternative';
        } catch (e) { }

        // Calculate reserved bottom space (e.g., 60px if merged, 95px if split, 0 if alt UI)
        const bottomReservedSpace = isAlternativeUI ? 0 : (isEnergyMerged ? 60 : 95);
        const maxAllowedY = window.innerHeight - this.element.offsetHeight - bottomReservedSpace;

        const clampedY = Math.max(0, Math.min(initialTop + dy, maxAllowedY));
        const clampedX = Math.max(0, Math.min(initialLeft + dx, window.innerWidth - this.element.offsetWidth));

        this.element.style.left = `${clampedX}px`;
        this.element.style.top = `${clampedY}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        this.saveState();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
}
