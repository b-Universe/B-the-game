export class PixelVM {
    constructor(virtualScreen, audio, engine) {
        this.screen = virtualScreen;
        this.ctx = virtualScreen.ctx;
        this.audio = audio;
        this.engine = engine;
        this.canvasWidth = virtualScreen.canvas.width;
        this.canvasHeight = virtualScreen.canvas.height;
        this.width = 256;
        this.height = 256;
        this.handlesCRT = true; // Tell the arcade system we will manually handle our own CRT overlay to protect the frame

        this.isRunning = false;
        this.keys = new Set();

        this.entity = { x: 50, y: 50, vx: 0, vy: 0, size: 16, speed: 180, isGrounded: false, color: '#e74c3c', isBig: false, invulnTimer: 0, starTimer: 0 };
        this.gravity = 1500;
        this.jumpForce = -500;
        this.cameraX = 0;
        this.gameState = 'title';
        this.score = 0;
        this.lives = 3;
        this.timeRemaining = 400;
        this.coins = [];
        this.mushrooms = [];
        this.wasSpacePressed = false;
        this.inputLockTimer = 0;
        this.scoreSubmitted = false;
        this.floatingScores = [];

        this.level = this.buildLevel();
        this.clouds = this.buildClouds();
        this.enemies = this.buildEnemies();

        this.frameImg = new Image();
        this.frameImg.src = 'assets/images/ui/arcade-cabinets/pixel-frame.png';
    }

    buildLevel() {
        const blocks = [];
        const addGround = (startX, width) => blocks.push({ x: startX, y: 224, w: width, h: 32, type: 'ground', color: '#c84c0c' });
        const addBrick = (x, y) => blocks.push({ x, y, w: 16, h: 16, type: 'brick', color: '#8c3c0c' });
        const addMystery = (x, y, item) => blocks.push({ x, y, w: 16, h: 16, type: 'mystery', color: '#cc8c3c', item: item || 'coin' });
        const addPipe = (x, y, h) => blocks.push({ x, y, w: 32, h: h, type: 'pipe', color: '#00a800' });

        // Grounds with pits
        addGround(0, 1104);       // Pit 1
        addGround(1136, 240);     // Pit 2
        addGround(1424, 1024);    // Pit 3
        addGround(2480, 800);     // End ground

        // Item Cluster 1
        addMystery(256, 160, 'coin');
        addBrick(320, 160);
        addMystery(336, 160, 'mushroom');
        addBrick(352, 160);
        addMystery(368, 160, 'coin');
        addBrick(384, 160);
        addMystery(352, 100, 'coin');

        // Pipes
        addPipe(448, 192, 32);
        addPipe(608, 176, 48);
        addPipe(736, 160, 64);
        addPipe(912, 160, 64);

        // Item Cluster 2
        addMystery(1168, 160, 'mushroom');
        addBrick(1200, 160);
        addMystery(1216, 160, 'coin');
        addBrick(1232, 160);

        // High Track
        addBrick(1456, 100); addBrick(1472, 100); addMystery(1488, 100, 'coin'); addBrick(1504, 100);
        addBrick(1472, 160); addMystery(1600, 160, 'coin'); addMystery(1648, 160, 'coin');
        addMystery(1648, 100, 'mushroom');
        addBrick(1824, 160); addBrick(1872, 160); addMystery(1888, 160, 'coin'); addBrick(1904, 160);
        addBrick(2048, 100); addBrick(2064, 100); addMystery(2080, 100, 'star');

        // Stairs
        for(let i = 0; i < 4; i++) blocks.push({ x: 2144 + i * 16, y: 208 - i * 16, w: 16, h: 16 + i * 16, type: 'block', color: '#c84c0c' });
        for(let i = 0; i < 4; i++) blocks.push({ x: 2240 + i * 16, y: 160 + i * 16, w: 16, h: 64 - i * 16, type: 'block', color: '#c84c0c' });
        for(let i = 0; i < 8; i++) blocks.push({ x: 2320 + i * 16, y: 208 - i * 16, w: 16, h: 16 + i * 16, type: 'block', color: '#c84c0c' });
        for(let i = 0; i < 8; i++) blocks.push({ x: 2700 + i * 16, y: 208 - i * 16, w: 16, h: 16 + i * 16, type: 'block', color: '#c84c0c' });

        // Goal & Castle
        blocks.push({ x: 3000, y: 48, w: 4, h: 176, type: 'flagpole', color: '#f1c40f' });
        blocks.push({ x: 2968, y: 48, w: 32, h: 24, type: 'flag', color: '#2ecc71' });
        blocks.push({ x: 3100, y: 160, w: 80, h: 64, type: 'block', color: '#c84c0c' });
        blocks.push({ x: 3132, y: 192, w: 16, h: 32, type: 'block', color: '#000000' });

        return blocks;
    }

    buildClouds() {
        const clouds = [];
        for (let i = 0; i < 40; i++) {
            clouds.push({
                x: Math.random() * 3000,
                y: 10 + Math.random() * 80,
                w: 24 + Math.random() * 32,
                h: 12 + Math.random() * 12,
                speed: 10 + Math.random() * 10
            });
        }
        return clouds;
    }

    buildEnemies() {
        return [
            { x: 380, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 650, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 680, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 1200, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 1230, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 1550, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 1580, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 2200, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 2230, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false },
            { x: 2550, y: 208, w: 16, h: 16, vx: -30, vy: 0, isGrounded: false, isDead: false }
        ];
    }

    checkAABB(ent, block) {
        const ew = ent.size !== undefined ? ent.size : ent.w;
        const eh = ent.size !== undefined ? ent.size : ent.h;
        return ent.x < block.x + block.w && ent.x + ew > block.x && ent.y < block.y + block.h && ent.y + eh > block.y;
    }

    die() {
        this.gameState = 'dead';
        this.entity.vy = -400; // Knockback bounce
        this.entity.isGrounded = false;
        this.entity.color = '#ffffff'; // Impact flash
        this.inputLockTimer = 1.0;
        this.audio.death();
        this.lives--;

        if (this.lives <= 0 && !this.scoreSubmitted && this.score > 0) {
            this.engine.network.sendArcadeScore('pixel', this.score);
            this.scoreSubmitted = true;
        }
    }

    respawn() {
        this.gameState = 'playing';
        this.entity.x = 50; this.entity.y = 50;
        this.entity.vx = 0; this.entity.vy = 0;
        this.entity.color = '#e74c3c';
        this.entity.size = 16;
        this.entity.isBig = false;
        this.entity.invulnTimer = 0;
        this.entity.starTimer = 0;
        this.cameraX = 0;
        this.timeRemaining = 400;
        this.level = this.buildLevel();
        this.enemies = this.buildEnemies();
        this.mushrooms = [];
        this.coins = [];
        this.floatingScores = [];
    }

    start() {
        this.isRunning = true;
        this.gameState = 'title';
        this.inputLockTimer = 0.5; // Slight delay before accepting inputs on boot
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

    update(dt) {
        if (this.keys.has('c')) {
            this.keys.delete('c');
            this.engine.clientSettings.enableArcadeCRT = this.engine.clientSettings.enableArcadeCRT === false ? true : false;
            localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
        }

        if (this.keys.has('q') && this.gameState !== 'title') {
            this.keys.delete('q');
            if (!this.scoreSubmitted && this.score > 0) {
                this.engine.network.sendArcadeScore('pixel', this.score);
                this.scoreSubmitted = true;
            }
            this.start();
            this.inputLockTimer = 0.5;
            return;
        }

        if (this.inputLockTimer > 0) {
            this.inputLockTimer -= dt;
        }

        for (let i = this.floatingScores.length - 1; i >= 0; i--) {
            const fs = this.floatingScores[i];
            fs.y -= 15 * dt; // Move up
            fs.life -= dt;
            if (fs.life <= 0) this.floatingScores.splice(i, 1);
        }

        for (let c of this.clouds) {
            c.x -= c.speed * dt;
            if (c.x < -100) c.x += 3000;
        }

        if (this.gameState === 'title' || this.gameState === 'win' || this.gameState === 'gameover') {
            if (this.keys.has(' ')) {
                if (this.inputLockTimer > 0) return; // Ignore spacebar if locked
                this.keys.delete(' ');
                this.score = 0;
                this.lives = 3;
                this.scoreSubmitted = false;
                this.respawn();
            }
            return;
        }

        if (this.gameState === 'dead') {
            this.entity.vy += this.gravity * dt;
            this.entity.y += this.entity.vy * dt;
            if (this.entity.vy > 0) this.entity.color = '#e74c3c'; // Fade back to red as they fall
            if (this.entity.y > this.height + 50) {
                if (this.lives > 0) {
                    this.respawn();
                } else {
                    this.gameState = 'gameover';
                }
            }
            return; // Freeze the rest of the game world while the player falls
        }

        if (this.gameState === 'playing') {
            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.die();
            }
        }

        if (this.entity.invulnTimer > 0) {
            this.entity.invulnTimer -= dt;
        }
        if (this.entity.starTimer > 0) {
            this.entity.starTimer -= dt;
        }

        let currentSpeed = this.entity.starTimer > 0 ? this.entity.speed * 1.25 : this.entity.speed;

        if (this.keys.has('a') || this.keys.has('arrowleft')) this.entity.vx = -currentSpeed;
        else if (this.keys.has('d') || this.keys.has('arrowright')) this.entity.vx = currentSpeed;
        else this.entity.vx = 0;

        if (this.keys.has(' ')) {
            if (this.entity.isGrounded && !this.wasSpacePressed) {
                this.entity.vy = this.jumpForce;
                this.entity.isGrounded = false;
                this.audio.jump();
            }
            this.wasSpacePressed = true;
        } else {
            if (this.entity.vy < -150) this.entity.vy *= 0.5; // Short hop responsiveness
            this.wasSpacePressed = false;
        }

        this.entity.vy += this.gravity * dt;
        this.entity.x += this.entity.vx * dt;
        if (this.entity.x < this.cameraX) this.entity.x = this.cameraX; // Hard left boundary

        for (let b of this.level) {
            if (this.checkAABB(this.entity, b)) {
                if (b.type === 'flagpole' || b.type === 'flag') {
                    this.gameState = 'win';
                    this.score += 5000;
                    this.inputLockTimer = 2.0; // Wait 2 seconds to admire the win
                    this.audio.coin();
                    setTimeout(() => this.audio.coin(), 200);
                    if (!this.scoreSubmitted && this.score > 0) {
                        this.engine.network.sendArcadeScore('pixel', this.score);
                        this.scoreSubmitted = true;
                    }
                    return;
                }
                if (this.entity.vx > 0) this.entity.x = b.x - this.entity.size;
                else if (this.entity.vx < 0) this.entity.x = b.x + b.w;
                this.entity.vx = 0;
            }
        }

        this.entity.y += this.entity.vy * dt;
        this.entity.isGrounded = false;

        for (let b of this.level) {
            if (this.checkAABB(this.entity, b)) {
                if (b.type === 'flagpole' || b.type === 'flag') {
                    this.gameState = 'win';
                    this.score += 5000;
                    this.inputLockTimer = 2.0;
                    this.audio.coin();
                    setTimeout(() => this.audio.coin(), 200);
                    if (!this.scoreSubmitted && this.score > 0) {
                        this.engine.network.sendArcadeScore('pixel', this.score);
                        this.scoreSubmitted = true;
                    }
                    return;
                }
                if (this.entity.vy > 0) {
                    this.entity.y = b.y - this.entity.size;
                    this.entity.isGrounded = true;
                    this.entity.vy = 0;
                }
                else if (this.entity.vy < 0) {
                    this.entity.y = b.y + b.h;
                    this.entity.vy = 0;
                    if (b.type === 'mystery' && !b.isEmpty) {
                        b.isEmpty = true;
                        b.color = '#8c3c0c'; // Turn to empty brick
                        if (b.item === 'mushroom' || b.item === 'star') {
                            this.mushrooms.push({ x: b.x, y: b.y - 16, vx: 80, vy: -100, w: 16, h: 16, type: b.item });
                            this.audio.playTone('square', 300, 600, 0.2, 0.05); // Item spawn sound
                        } else {
                            this.score += 100;
                            this.coins.push({ x: b.x + 4, y: b.y, vy: -350, life: 0.4 });
                            this.audio.coin();
                            this.floatingScores.push({ x: b.x, y: b.y - 10, text: '+100', life: 1.0 });
                        }
                    }
                }
            }
        }

        for (let i = this.mushrooms.length - 1; i >= 0; i--) {
            let m = this.mushrooms[i];
            m.vy += this.gravity * dt;
            m.x += m.vx * dt;

            for (let b of this.level) {
                if (this.checkAABB(m, b)) {
                    if (b.type === 'flagpole' || b.type === 'flag') continue;
                    if (m.vx > 0) { m.x = b.x - m.w; m.vx *= -1; }
                    else if (m.vx < 0) { m.x = b.x + b.w; m.vx *= -1; }
                }
            }

            m.y += m.vy * dt;
            for (let b of this.level) {
                if (this.checkAABB(m, b)) {
                    if (b.type === 'flagpole' || b.type === 'flag') continue;
                    if (m.vy > 0) { m.y = b.y - m.h; m.vy = 0; }
                    else if (m.vy < 0) { m.y = b.y + b.h; m.vy = 0; }
                }
            }

            if (this.checkAABB(this.entity, m)) {
                if (m.type === 'star') {
                    this.score += 1000;
                    this.entity.starTimer = 10.0; // 10 seconds of invulnerability
                    this.audio.playTone('square', 600, 1200, 0.5, 0.05); // Star powerup sound
                    this.floatingScores.push({ x: m.x, y: m.y - 10, text: '+1000', life: 1.0 });
                } else {
                    this.score += 1000;
                    if (!this.entity.isBig) {
                        this.entity.isBig = true;
                        this.entity.size = 24;
                        this.entity.y -= 8; // Adjust position so it doesn't clip into ground
                    }
                    this.audio.playTone('square', 400, 800, 0.3, 0.05); // Powerup sound
                    this.floatingScores.push({ x: m.x, y: m.y - 10, text: '+1000', life: 1.0 });
                }
                this.mushrooms.splice(i, 1);
                continue;
            }

            if (m.y > this.height + 50) this.mushrooms.splice(i, 1);
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            let c = this.coins[i];
            c.vy += this.gravity * dt;
            c.y += c.vy * dt;
            c.life -= dt;
            if (c.life <= 0) this.coins.splice(i, 1);
        }

        for (let e of this.enemies) {
            if (e.isDead) continue;
            e.vy += this.gravity * dt;
            e.x += e.vx * dt;

            for (let b of this.level) {
                if (this.checkAABB(e, b)) {
                    if (b.type === 'flagpole' || b.type === 'flag') continue;
                    if (e.vx > 0) { e.x = b.x - e.w; e.vx *= -1; }
                    else if (e.vx < 0) { e.x = b.x + b.w; e.vx *= -1; }
                }
            }

            e.y += e.vy * dt;
            e.isGrounded = false;
            for (let b of this.level) {
                if (this.checkAABB(e, b)) {
                    if (b.type === 'flagpole' || b.type === 'flag') continue;
                    if (e.vy > 0) { e.y = b.y - e.h; e.isGrounded = true; e.vy = 0; }
                    else if (e.vy < 0) { e.y = b.y + b.h; e.vy = 0; }
                }
            }

            if (this.checkAABB(this.entity, e)) {
                if (this.entity.starTimer > 0) {
                    e.isDead = true;
                    this.score += 500;
                    this.audio.stomp();
                    this.floatingScores.push({ x: e.x, y: e.y - 10, text: '+500', life: 1.0 });
                } else if (this.entity.invulnTimer > 0) {
                    continue; // Ignore if invulnerable
                } else if (this.entity.vy > 0 && this.entity.y + this.entity.size - (this.entity.vy * dt) <= e.y + 14) {
                    e.isDead = true;
                    this.entity.vy = -350;
                    this.score += 200;
                    this.audio.stomp();
                    this.floatingScores.push({ x: e.x, y: e.y - 10, text: '+200', life: 1.0 });
                } else {
                    if (this.entity.isBig) {
                        this.entity.isBig = false;
                        this.entity.size = 16;
                        this.entity.invulnTimer = 1.5;
                        this.audio.playTone('sawtooth', 200, 100, 0.2, 0.1); // Powerdown sound
                    } else {
                        this.die();
                    }
                }
            }
            if (e.y > this.height + 50) e.isDead = true;
        }

        const targetCamX = this.entity.x - 100;
        if (targetCamX > this.cameraX) this.cameraX = targetCamX; // Only ever scroll right

        if (this.entity.y > this.height + 50) {
            if (this.gameState === 'playing') {
                this.gameState = 'dead';
                this.entity.vy = 0; // Don't bounce
                this.inputLockTimer = 1.0;
                this.audio.death();
                this.lives--;
                if (this.lives <= 0 && !this.scoreSubmitted && this.score > 0) {
                    this.engine.network.sendArcadeScore('pixel', this.score);
                    this.scoreSubmitted = true;
                }
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#0b0e14';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.save();
        this.ctx.translate(44, 44);
        this.ctx.scale(168 / 256, 168 / 256);

        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.width, this.height);
        this.ctx.clip();

        this.ctx.fillStyle = '#5c94fc';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let c of this.clouds) {
            let cx = (c.x - (this.cameraX * 0.2));
            while (cx < -50) cx += 3000;
            while (cx > 2950) cx -= 3000;
            this.ctx.fillRect(Math.round(cx), Math.round(c.y), Math.round(c.w), Math.round(c.h));
        }

        if (this.gameState === 'title') {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 48px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PIXEL', this.width / 2, this.height / 2 - 10);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px monospace';
            // Blink effect using the performance timer
            if (Math.floor(performance.now() / 600) % 2 === 0) {
                this.ctx.fillText('PRESS SPACE TO START', this.width / 2, this.height / 2 + 30);
            }

            const hs = this.engine.arcadeScores?.['pixel'];
            if (hs && hs.score > 0) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText(`HIGH SCORE: ${hs.score} BY ${hs.player}`, this.width / 2, 45);
            }

            this.ctx.restore();

            if (this.engine.clientSettings.enableArcadeCRT !== false) {
                this.screen.drawCRTEffect();
            }

            if (this.frameImg && this.frameImg.complete) {
                this.ctx.drawImage(this.frameImg, 0, 0, this.canvasWidth, this.canvasHeight);
            }
            return;
        }

        this.ctx.save();
        this.ctx.translate(-Math.round(this.cameraX), 0);

        for (let b of this.level) {
            this.ctx.fillStyle = b.color;
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
            this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(b.x, b.y, b.w, b.h);
        }

        for (let m of this.mushrooms) {
            if (m.type === 'star') {
                this.ctx.fillStyle = Math.floor(performance.now() / 100) % 2 === 0 ? '#f1c40f' : '#e67e22';
                this.ctx.fillRect(Math.round(m.x), Math.round(m.y), m.w, m.h);
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(Math.round(m.x) + 4, Math.round(m.y) + 4, 2, 4);
                this.ctx.fillRect(Math.round(m.x) + 10, Math.round(m.y) + 4, 2, 4);
            } else {
                this.ctx.fillStyle = '#e67e22'; // Orange/Brown for mushroom
                this.ctx.fillRect(Math.round(m.x), Math.round(m.y), m.w, m.h);
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(Math.round(m.x) + 2, Math.round(m.y) + 2, 4, 4);
                this.ctx.fillRect(Math.round(m.x) + 10, Math.round(m.y) + 2, 4, 4);
                this.ctx.fillRect(Math.round(m.x) + 6, Math.round(m.y) + 8, 4, 4);
            }
        }

        for (let e of this.enemies) {
            if (e.isDead) continue;
            this.ctx.fillStyle = '#8c3c0c';
            this.ctx.fillRect(Math.round(e.x), Math.round(e.y), e.w, e.h);
        }

        for (let c of this.coins) {
            this.ctx.fillStyle = '#f1c40f'; // Gold
            this.ctx.fillRect(Math.round(c.x), Math.round(c.y), 8, 12);
        }

        if (this.entity.starTimer > 0) {
            this.ctx.fillStyle = Math.floor(performance.now() / 50) % 2 === 0 ? '#f1c40f' : '#3498db';
            this.ctx.fillRect(Math.round(this.entity.x), Math.round(this.entity.y), this.entity.size, this.entity.size);
        } else if (!this.entity.invulnTimer || this.entity.invulnTimer <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
            this.ctx.fillStyle = this.entity.color || '#e74c3c';
            this.ctx.fillRect(Math.round(this.entity.x), Math.round(this.entity.y), this.entity.size, this.entity.size);
        }

        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        for (const fs of this.floatingScores) {
            this.ctx.globalAlpha = Math.max(0, fs.life);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(fs.text, Math.round(fs.x) + 8, Math.round(fs.y));
        }
        this.ctx.globalAlpha = 1.0;

        this.ctx.restore();

        if (this.gameState === 'win') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 36px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CLEARED!', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 10);

            if (Math.floor(performance.now() / 600) % 2 === 0) {
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText('PRESS SPACE TO REPLAY', this.width / 2, this.height / 2 + 40);
            }
        }

        if (this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 36px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 10);

            if (Math.floor(performance.now() / 600) % 2 === 0) {
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText('PRESS SPACE TO REPLAY', this.width / 2, this.height / 2 + 40);
            }
        }

        if (this.gameState === 'playing' || this.gameState === 'win' || this.gameState === 'dead') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px monospace';

            this.ctx.textAlign = 'left';
            this.ctx.fillText(`SCORE`, 10, 45);
            this.ctx.fillText(`${this.score.toString().padStart(6, '0')}`, 10, 57);

            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.fillText(`🔴x${this.lives}`, this.width / 2 - 30, 57);

            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`WORLD`, this.width / 2 + 30, 45);
            this.ctx.fillText(`1-1`, this.width / 2 + 30, 57);

            this.ctx.textAlign = 'right';
            this.ctx.fillText(`TIME`, this.width - 10, 45);
            this.ctx.fillText(`${Math.ceil(this.timeRemaining)}`, this.width - 10, 57);
        }

        this.ctx.restore();

        if (this.engine.clientSettings.enableArcadeCRT !== false) {
            this.screen.drawCRTEffect();
        }

        if (this.frameImg && this.frameImg.complete) {
            this.ctx.drawImage(this.frameImg, 0, 0, this.canvasWidth, this.canvasHeight);
        }
    }
}
