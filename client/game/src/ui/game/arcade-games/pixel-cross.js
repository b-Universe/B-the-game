export class PixelCrossVM {
    constructor(virtualScreen, audio, engine) {
        this.screen = virtualScreen;
        this.ctx = virtualScreen.ctx;
        this.audio = audio;
        this.engine = engine;
        this.width = virtualScreen.canvas.width;
        this.height = virtualScreen.canvas.height;

        this.isRunning = false;
        this.keys = new Set();
        this.inputLockTimer = 0;

        this.reset();
    }

    reset() {
        this.gameState = 'title';
        this.menuSelection = 0;
        this.difficulty = 0; // 0: Normal, 1: Hard
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.scoreSubmitted = false;

        this.jumpTimer = 0;
        this.wasJumpPressed = false;
        this.deathTimer = 0;

        this.buildLevel();
    }

    resetPlayer() {
        this.player = { x: 120, y: 224, w: 12, h: 12 };
    }

    buildLevel() {
        this.goals = [false, false, false, false, false];
        this.rows = [];

        const speedMod = this.difficulty === 0 ? 0.6 : 1.2;
        const lvlSpeed = (this.level - 1) * 8;

        // Road Lanes (y=128 to y=192, rows 8 to 12)
        for (let r = 8; r <= 12; r++) {
            let dir = (r % 2 === 0) ? 1 : -1;
            let speed = (25 + Math.random() * 15 + lvlSpeed) * speedMod * dir;
            let items = [];
            const numCars = this.difficulty === 0 ? 2 : 3;
            for (let i = 0; i < numCars; i++) {
                items.push({
                    x: i * (this.width / numCars) + Math.random() * 20,
                    w: 24,
                    type: 'car',
                    color: ['#e74c3c', '#f1c40f', '#9b59b6', '#3498db'][Math.floor(Math.random() * 4)]
                });
            }
            this.rows.push({ y: r * 16, type: 'road', speed, items });
        }

        // Water Lanes (y=32 to y=96, rows 2 to 6)
        for (let r = 2; r <= 6; r++) {
            let dir = (r % 2 === 0) ? -1 : 1;
            let speed = (20 + Math.random() * 10 + lvlSpeed) * speedMod * dir;
            let items = [];
            const numLogs = this.difficulty === 0 ? 4 : 3;
            for (let i = 0; i < numLogs; i++) {
                items.push({ x: i * (this.width / numLogs) + Math.random() * 20, w: this.difficulty === 0 ? 48 : 32, type: 'log' });
            }
            this.rows.push({ y: r * 16, type: 'water', speed, items });
        }

        this.resetPlayer();
    }

    startGame() {
        this.scoreSubmitted = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.buildLevel();
        this.gameState = 'playing';
        this.inputLockTimer = 0.2;
    }

    start() {
        this.isRunning = true;
        this.reset();
        this.inputLockTimer = 0.5;
    }

    stop() {
        this.isRunning = false;
        this.keys.clear();
    }

    handleInput(key, isDown) {
        const k = key.toLowerCase();
        if (isDown) this.keys.add(k);
        else this.keys.delete(k);
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.w &&
               rect1.x + rect1.w > rect2.x &&
               rect1.y < rect2.y + rect2.h &&
               rect1.y + rect1.h > rect2.y;
    }

    die() {
        this.gameState = 'dead';
        this.deathTimer = 1.0;
        this.audio.death();
        this.lives--;

        if (this.lives <= 0 && !this.scoreSubmitted && this.score > 0) {
            this.engine.network.sendArcadeScore('pixel-cross', this.score);
            this.scoreSubmitted = true;
        }
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
                this.engine.network.sendArcadeScore('pixel-cross', this.score);
                this.scoreSubmitted = true;
            }
            this.start();
            return;
        }

        if (this.inputLockTimer > 0) this.inputLockTimer -= dt;

        if (this.gameState === 'title') {
            if (this.inputLockTimer <= 0) {
                if (this.keys.has('w') || this.keys.has('arrowup')) { this.menuSelection = (this.menuSelection - 1 + 2) % 2; this.keys.delete('w'); this.keys.delete('arrowup'); this.audio.blip(true); }
                if (this.keys.has('s') || this.keys.has('arrowdown')) { this.menuSelection = (this.menuSelection + 1) % 2; this.keys.delete('s'); this.keys.delete('arrowdown'); this.audio.blip(true); }
                if (this.keys.has(' ')) {
                    this.difficulty = this.menuSelection;
                    this.keys.delete(' ');
                    this.inputLockTimer = 0.5;
                    this.audio.coin();
                    this.startGame();
                }
            }
            return;
        } else if (this.gameState === 'gameover' || this.gameState === 'win') {
             if (this.keys.has(' ') && this.inputLockTimer <= 0) {
                 this.reset();
                 this.keys.delete(' ');
                 this.inputLockTimer = 0.5;
             }
            return;
        } else if (this.gameState === 'dead') {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                if (this.lives <= 0) {
                    this.gameState = 'gameover';
                    this.inputLockTimer = 1.0;
                } else {
                    this.resetPlayer();
                    this.gameState = 'playing';
                }
            }
            return;
        }

        // Process Obstacles
        this.rows.forEach(row => {
            row.items.forEach(item => {
                item.x += row.speed * dt;
                if (row.speed > 0 && item.x > this.width) item.x = -item.w;
                if (row.speed < 0 && item.x < -item.w) item.x = this.width;
            });
        });

        // Process Input
        if (this.jumpTimer > 0) this.jumpTimer -= dt;

        const anyDirKey = this.keys.has('w') || this.keys.has('a') || this.keys.has('s') || this.keys.has('d') ||
                          this.keys.has('arrowup') || this.keys.has('arrowdown') || this.keys.has('arrowleft') || this.keys.has('arrowright');

        if (anyDirKey) {
            if (!this.wasJumpPressed && this.jumpTimer <= 0) {
                const prevY = this.player.y;
                if (this.keys.has('w') || this.keys.has('arrowup')) { this.player.y -= 16; this.score += 10; }
                else if (this.keys.has('s') || this.keys.has('arrowdown')) this.player.y += 16;
                else if (this.keys.has('a') || this.keys.has('arrowleft')) this.player.x -= 16;
                else if (this.keys.has('d') || this.keys.has('arrowright')) this.player.x += 16;

                this.player.x = Math.max(0, Math.min(this.width - 16, this.player.x));
                this.player.y = Math.max(16, Math.min(224, this.player.y));

                if (this.player.y !== prevY || this.keys.has('a') || this.keys.has('d') || this.keys.has('arrowleft') || this.keys.has('arrowright')) {
                    this.audio.blip(true);
                    this.jumpTimer = 0.15;
                }
                this.wasJumpPressed = true;
            }
        } else {
            this.wasJumpPressed = false;
        }

        // Physics / Hit Detection
        let onLog = false;
        let inWater = false;
        let hitCar = false;
        let pRect = { x: this.player.x + 2, y: this.player.y + 2, w: 12, h: 12 };

        this.rows.forEach(row => {
            if (Math.abs(this.player.y - row.y) < 8) {
                if (row.type === 'water') inWater = true;
                row.items.forEach(item => {
                    let iRect = {
                        x: row.type === 'water' ? item.x + 4 : item.x + 2,
                        y: row.y + 2,
                        w: row.type === 'water' ? item.w - 8 : item.w - 4,
                        h: 12
                    };
                    if (this.checkCollision(pRect, iRect)) {
                        if (row.type === 'road') hitCar = true;
                        if (row.type === 'water') {
                            onLog = true;
                            this.player.x += row.speed * dt;
                        }
                    }
                });
            }
        });

        // Check Goals
        if (this.player.y === 16) {
            let inSlot = false;
            let playerCenter = this.player.x + 8;
            for (let i = 0; i < 5; i++) {
                let slotCenter = 16 + (i * 48) + 8;
                if (Math.abs(playerCenter - slotCenter) <= 12) {
                    inSlot = true;
                    if (this.goals[i]) {
                        this.die(); // Already filled
                    } else {
                        this.goals[i] = true;
                        this.score += 200;
                        this.audio.coin();
                        this.resetPlayer();

                        // Check if all goals are filled
                        if (this.goals.every(g => g)) {
                            this.level++;
                            this.score += 1000;
                            this.buildLevel();
                        }
                    }
                    break;
                }
            }
            if (!inSlot) this.die(); // Hit the wall between slots
        }

        if (hitCar || (inWater && !onLog) || this.player.x < -16 || this.player.x > this.width + 16) {
            this.die();
        }
    }

    draw() {
        this.ctx.fillStyle = '#0b0e14';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.gameState === 'title') {
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.font = 'bold 36px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PIXEL-CROSS', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px monospace';
            const options = ['NORMAL', 'HARD'];
            options.forEach((opt, idx) => {
                this.ctx.fillStyle = this.menuSelection === idx ? '#2ecc71' : '#fff';
                this.ctx.fillText(opt, this.width / 2, this.height / 2 + 10 + idx * 25);
            });

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px monospace';
            if (Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillText('PRESS SPACE TO SELECT', this.width / 2, this.height / 2 + 100);
            }

            const hs = this.engine.arcadeScores?.['pixel-cross'];
            if (hs && hs.score > 0) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText(`HIGH SCORE: ${hs.score}`, this.width / 2, 20);
            }
            return;
        }

        // Backgrounds
        this.ctx.fillStyle = '#333'; // Road
        this.ctx.fillRect(0, 128, this.width, 16 * 5);
        this.ctx.fillStyle = '#2980b9'; // Water
        this.ctx.fillRect(0, 32, this.width, 16 * 5);
        this.ctx.fillStyle = '#8e44ad'; // Safe zones
        this.ctx.fillRect(0, 112, this.width, 16);
        this.ctx.fillRect(0, 208, this.width, 32);

        // Goal area
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(0, 16, this.width, 16);
        for (let i = 0; i < 5; i++) {
            let slotX = 16 + (i * 48);
            this.ctx.fillStyle = this.goals[i] ? '#3498db' : '#0b0e14';
            this.ctx.fillRect(slotX, 16, 16, 16);
            if (this.goals[i]) {
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.fillRect(slotX + 2, 18, 12, 12);
            }
        }

        // Obstacles
        this.rows.forEach(row => {
            row.items.forEach(item => {
                if (row.type === 'water') {
                    this.ctx.fillStyle = '#d35400'; // Log
                    this.ctx.fillRect(Math.round(item.x), Math.round(row.y + 2), item.w, 12);
                } else {
                    this.ctx.fillStyle = item.color || '#e74c3c'; // Car
                    this.ctx.fillRect(Math.round(item.x), Math.round(row.y + 3), item.w, 10);
                    this.ctx.fillStyle = '#f1c40f'; // Headlights
                    if (row.speed > 0) this.ctx.fillRect(Math.round(item.x + item.w - 3), Math.round(row.y + 4), 3, 2);
                    else this.ctx.fillRect(Math.round(item.x), Math.round(row.y + 4), 3, 2);
                }
            });
        });

        // Player
        if (this.gameState !== 'dead' || Math.floor(performance.now() / 150) % 2 === 0) {
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fillRect(Math.round(this.player.x + 2), Math.round(this.player.y + 2), 12, 12);
            // Eyes
            this.ctx.fillStyle = '#0b0e14';
            this.ctx.fillRect(Math.round(this.player.x + 4), Math.round(this.player.y + 4), 2, 2);
            this.ctx.fillRect(Math.round(this.player.x + 10), Math.round(this.player.y + 4), 2, 2);
        }

        // UI Banners
        this.ctx.fillStyle = '#0b0e14';
        this.ctx.fillRect(0, 0, this.width, 16);
        this.ctx.fillRect(0, 240, this.width, 16);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 5, 11);
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LVL: ${this.level}`, this.width / 2, 11);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`LIVES: ${this.lives}`, this.width - 5, 11);

        if (this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 32px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 10);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 20);
            if (Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 40);
            }
        }
    }
}
