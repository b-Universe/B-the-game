const COLORS = [
    null,
    '#00d2ff', // 1: I (Cyan)
    '#3498db', // 2: J (Blue)
    '#e67e22', // 3: L (Orange)
    '#f1c40f', // 4: O (Yellow)
    '#2ecc71', // 5: S (Green)
    '#9b59b6', // 6: T (Purple)
    '#e74c3c'  // 7: Z (Red)
];

const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[2,0,0], [2,2,2], [0,0,0]], // J
    [[0,0,3], [3,3,3], [0,0,0]], // L
    [[4,4], [4,4]], // O
    [[0,5,5], [5,5,0], [0,0,0]], // S
    [[0,6,0], [6,6,6], [0,0,0]], // T
    [[7,7,0], [0,7,7], [0,0,0]]  // Z
];

export class BepisVM {
    constructor(virtualScreen, audio, engine) {
        this.screen = virtualScreen;
        this.ctx = virtualScreen.ctx;
        this.audio = audio;
        this.engine = engine;
        this.width = virtualScreen.canvas.width;
        this.height = virtualScreen.canvas.height;

        this.tileSize = 16;
        this.cols = 10;
        this.rows = 16;

        this.isRunning = false;
        this.keys = new Set();

        this.dasTimers = { left: 0, right: 0, down: 0 };
        this.dasDelay = 0.15;
        this.dasRepeat = 0.05;

        this.reset();
    }

    reset() {
        this.gameState = 'title';
        this.stateTimer = 0;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.scoreSubmitted = false;

        this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.bag = [];
        this.nextPiece = this.getNewPiece();
        this.currentPiece = null;
        this.dropTimer = 0;
        this.clearingRows = [];
    }

    getNewPiece() {
        if (this.bag.length === 0) {
            this.bag = [1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
        }
        const id = this.bag.pop();
        const matrix = SHAPES[id].map(row => [...row]);
        return { id, matrix, x: Math.floor(this.cols / 2) - Math.floor(matrix[0].length / 2), y: 0 };
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getNewPiece();

        // Check top-out (Game Over)
        if (this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
            this.die();
        }
    }

    startGame() {
        this.scoreSubmitted = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.bag = [];
        this.nextPiece = this.getNewPiece();
        this.currentPiece = null;

        this.gameState = 'ready';
        this.stateTimer = 1.0;
    }

    start() {
        this.isRunning = true;
        this.reset();
        this.stateTimer = 0.5; // Input lock for title
    }

    stop() {
        this.isRunning = false;
        this.keys.clear();
    }

    handleInput(key, isDown) {
        const k = key.toLowerCase();
        if (isDown) {
            if (!this.keys.has(k)) {
                this.keys.add(k);
                this.onKeyPress(k);
            }
        } else {
            this.keys.delete(k);
            if (k === 'arrowleft' || k === 'a') this.dasTimers.left = 0;
            if (k === 'arrowright' || k === 'd') this.dasTimers.right = 0;
            if (k === 'arrowdown' || k === 's') this.dasTimers.down = 0;
        }
    }

    onKeyPress(key) {
        if (this.gameState === 'title' && this.stateTimer <= 0) {
            if (key === ' ') {
                this.audio.coin();
                this.startGame();
            }
        } else if (this.gameState === 'gameover' && this.stateTimer <= 0) {
            if (key === ' ') {
                this.reset();
                this.stateTimer = 0.5;
            }
        } else if (this.gameState === 'playing' && this.currentPiece) {
            if (key === 'arrowleft' || key === 'a') {
                this.move(-1, 0);
                this.dasTimers.left = this.dasDelay;
            } else if (key === 'arrowright' || key === 'd') {
                this.move(1, 0);
                this.dasTimers.right = this.dasDelay;
            } else if (key === 'arrowdown' || key === 's') {
                this.move(0, 1);
                this.dasTimers.down = this.dasDelay;
                this.score += 1; // Soft drop point
            } else if (key === 'arrowup' || key === 'w') {
                this.rotate();
            } else if (key === ' ') {
                this.hardDrop();
            }
        }
    }

    checkCollision(matrix, px, py) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    const nx = px + c;
                    const ny = py + r;
                    if (nx < 0 || nx >= this.cols || ny >= this.rows || (ny >= 0 && this.grid[ny][nx] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    move(dx, dy) {
        if (!this.checkCollision(this.currentPiece.matrix, this.currentPiece.x + dx, this.currentPiece.y + dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            if (dx !== 0) this.audio.blip(false);
            return true;
        }
        return false;
    }

    rotate() {
        const m = this.currentPiece.matrix;
        const N = m.length;
        const rotated = m.map((row, i) => row.map((val, j) => m[N - 1 - j][i]));

        // Wall Kicks (Center, Left 1, Right 1)
        const kicks = [0, -1, 1];
        for (const kick of kicks) {
            if (!this.checkCollision(rotated, this.currentPiece.x + kick, this.currentPiece.y)) {
                this.currentPiece.matrix = rotated;
                this.currentPiece.x += kick;
                this.audio.jump();
                return;
            }
        }
    }

    hardDrop() {
        let cellsDropped = 0;
        while (!this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y += 1;
            cellsDropped++;
        }
        this.score += cellsDropped * 2;
        this.lockPiece();
    }

    lockPiece() {
        this.audio.stomp();
        const m = this.currentPiece.matrix;
        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (m[r][c] !== 0) {
                    const ny = this.currentPiece.y + r;
                    if (ny >= 0 && ny < this.rows) {
                        this.grid[ny][this.currentPiece.x + c] = m[r][c];
                    }
                }
            }
        }

        this.currentPiece = null;
        this.checkLines();
    }

    checkLines() {
        let linesToClear = [];
        for (let r = 0; r < this.rows; r++) {
            if (this.grid[r].every(cell => cell !== 0)) {
                linesToClear.push(r);
            }
        }

        if (linesToClear.length > 0) {
            this.clearingRows = linesToClear;
            this.gameState = 'clearing';
            this.stateTimer = 0.3; // Animation delay

            // Tetris scoring logic
            const lineScores = [0, 100, 300, 500, 800];
            this.score += lineScores[linesToClear.length] * this.level;
            this.lines += linesToClear.length;

            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.audio.playTone('sine', 800, 1200, 0.2, 0.1);
            } else {
                this.audio.playTone('square', 600, 1200, 0.1, 0.05);
            }
        } else {
            this.spawnPiece();
        }
    }

    die() {
        this.gameState = 'gameover';
        this.stateTimer = 1.0;
        this.audio.explosion();
        if (!this.scoreSubmitted && this.score > 0) {
            this.engine.network.sendArcadeScore('bepis', this.score);
            this.scoreSubmitted = true;
        }
    }

    getDropSpeed() {
        return Math.max(0.05, 0.8 * Math.pow(0.85, this.level - 1));
    }

    update(dt) {
        if (this.keys.has('c')) {
            this.keys.delete('c');
            this.engine.clientSettings.enableArcadeCRT = this.engine.clientSettings.enableArcadeCRT === false ? true : false;
            localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
        }

        if (this.keys.has('q') && this.gameState !== 'title') {
            this.keys.delete('q');
            if (!this.scoreSubmitted && this.score > 0) {
                this.engine.network.sendArcadeScore('bepis', this.score);
                this.scoreSubmitted = true;
            }
            this.start();
            return;
        }

        if (this.stateTimer > 0) this.stateTimer -= dt;

        if (this.gameState === 'ready' && this.stateTimer <= 0) {
            this.gameState = 'playing';
            this.spawnPiece();
        } else if (this.gameState === 'clearing' && this.stateTimer <= 0) {
            // Remove rows and shift down
            this.clearingRows.forEach(r => {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(this.cols).fill(0));
            });
            this.clearingRows = [];
            this.gameState = 'playing';
            this.spawnPiece();
        }

        if (this.gameState === 'playing' && this.currentPiece) {
            // Handle DAS
            const handleDas = (key, dirX, dirY) => {
                if (this.keys.has(key)) {
                    this.dasTimers[key === 'arrowdown' || key === 's' ? 'down' : (key === 'arrowleft' || key === 'a' ? 'left' : 'right')] -= dt;
                    if (this.dasTimers[key === 'arrowdown' || key === 's' ? 'down' : (key === 'arrowleft' || key === 'a' ? 'left' : 'right')] <= 0) {
                        this.move(dirX, dirY);
                        if (dirY > 0) this.score += 1;
                        this.dasTimers[key === 'arrowdown' || key === 's' ? 'down' : (key === 'arrowleft' || key === 'a' ? 'left' : 'right')] = this.dasRepeat;
                    }
                }
            };

            handleDas('arrowleft', -1, 0); handleDas('a', -1, 0);
            handleDas('arrowright', 1, 0); handleDas('d', 1, 0);
            handleDas('arrowdown', 0, 1);  handleDas('s', 0, 1);

            // Gravity drop
            this.dropTimer += dt;
            const currentSpeed = this.getDropSpeed();
            if (this.dropTimer >= currentSpeed) {
                this.dropTimer -= currentSpeed;
                if (!this.move(0, 1)) {
                    this.lockPiece();
                }
            }
        }
    }

    drawBlock(ctx, x, y, colorId, alpha = 1.0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS[colorId];
        ctx.fillRect(px, py, this.tileSize, this.tileSize);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(px, py, this.tileSize, 2);
        ctx.fillRect(px, py, 2, this.tileSize);
        ctx.globalAlpha = 1.0;
    }

    draw() {
        this.ctx.fillStyle = '#0b0e14';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.gameState === 'title') {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 40px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('BEPIS', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px monospace';
            if (Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillText('PRESS SPACE TO START', this.width / 2, this.height / 2 + 50);
            }

            const hs = this.engine.arcadeScores?.['bepis'];
            if (hs && hs.score > 0) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText(`HIGH SCORE: ${hs.score}`, this.width / 2, 30);
                this.ctx.fillStyle = '#aaa';
                this.ctx.fillText(`BY ${hs.player}`, this.width / 2, 45);
            }
            return;
        }

        // Draw Playfield Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.cols * this.tileSize, this.height);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.cols * this.tileSize, this.height);

        // Draw Grid
        for (let r = 0; r < this.rows; r++) {
            // Animation for clearing lines
            if (this.gameState === 'clearing' && this.clearingRows.includes(r)) {
                if (Math.floor(performance.now() / 50) % 2 === 0) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(0, r * this.tileSize, this.cols * this.tileSize, this.tileSize);
                }
                continue;
            }

            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== 0) {
                    this.drawBlock(this.ctx, c, r, this.grid[r][c]);
                }
            }
        }

        // Draw Ghost Piece & Current Piece
        if (this.gameState === 'playing' && this.currentPiece) {
            const m = this.currentPiece.matrix;

            // Ghost
            let ghostY = this.currentPiece.y;
            while (!this.checkCollision(m, this.currentPiece.x, ghostY + 1)) {
                ghostY++;
            }
            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c] !== 0 && (ghostY + r) >= 0) {
                        this.drawBlock(this.ctx, this.currentPiece.x + c, ghostY + r, m[r][c], 0.2);
                    }
                }
            }

            // Active
            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c] !== 0 && (this.currentPiece.y + r) >= 0) {
                        this.drawBlock(this.ctx, this.currentPiece.x + c, this.currentPiece.y + r, m[r][c]);
                    }
                }
            }
        }

        // UI Sidebar (Right 96 pixels)
        const sidebarX = this.cols * this.tileSize;
        this.ctx.fillStyle = '#0b0e14';
        this.ctx.fillRect(sidebarX, 0, this.width - sidebarX, this.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';

        const centerX = sidebarX + (this.width - sidebarX) / 2;

        this.ctx.fillText('NEXT', centerX, 20);
        // Draw Next Piece
        if (this.nextPiece) {
            const m = this.nextPiece.matrix;
            const pW = m[0].length * this.tileSize;
            const pH = m.length * this.tileSize;
            const pX = centerX - pW / 2;
            const pY = 35;

            this.ctx.save();
            this.ctx.translate(pX, pY);
            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c] !== 0) {
                        this.drawBlock(this.ctx, c, r, m[r][c]);
                    }
                }
            }
            this.ctx.restore();
        }

        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText('SCORE', centerX, 110);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(this.score, centerX, 125);

        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillText('LEVEL', centerX, 160);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(this.level, centerX, 175);

        this.ctx.fillStyle = '#3498db';
        this.ctx.fillText('LINES', centerX, 210);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(this.lines, centerX, 225);

        // Overlays
        if (this.gameState === 'ready') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, this.cols * this.tileSize, this.height);
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('READY', (this.cols * this.tileSize) / 2, this.height / 2);
        } else if (this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 10);
            if (this.stateTimer <= 0 && Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 20);
            }
        }
    }
}
