export class BaseWindow {
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

    this.build();
  }

  build() {
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'b-window';
    this.element.style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    this.element.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.display = 'none'; // Hidden by default

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

    this.element.appendChild(header);
    this.element.appendChild(this.body);

    // Append to game screen if available, otherwise document body
    const container = document.getElementById('game-screen') || document.body;
    container.appendChild(this.element);

    if (this.isDraggable) {
      this.makeDraggable(header);
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

  open() {
    this.element.style.display = 'flex';
    this.onOpen();
  }

  close() {
    this.element.style.display = 'none';
    this.onClose();
  }

  toggleMinimize() {
    if (this.body.style.display === 'none') {
      this.body.style.display = 'flex';
      this.element.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    } else {
      this.body.style.display = 'none';
      this.element.style.height = '32px'; // Snap to header height
    }
  }

  // Lifecycle hooks for subclasses to implement
  onOpen() {}
  onClose() {}

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
        this.element.style.left = `${initialLeft + dx}px`;
        this.element.style.top = `${initialTop + dy}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
}
