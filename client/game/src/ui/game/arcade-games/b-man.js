export class BmanVM {
    constructor(virtualScreen, audio, engine) {
        this.screen = virtualScreen;
        this.ctx = virtualScreen.ctx;
        this.audio = audio;
        this.engine = engine;
        this.width = virtualScreen.canvas.width;
        this.height = virtualScreen.canvas.height;
        this.tileSize = 16;

        this.isRunning = false;
        this.keys = new Set();
        this.inputLockTimer = 0;

        this.reset();
    }

    reset() {
        this.gameState = 'title';
        this.menuSelection = 0;
        this.difficulty = 1;
        this.score = 0;
        this.lives = 3;
        this.scoreSubmitted = false;
        this.currentLevel = 1;
        this.ghostCombo = 0;
        this.floatingScores = [];
        this.fruit = null;
        this.fruitTimer = 15.0;
        this.buildLevel();
    }

    buildLevel() {
        // 1 = Wall, 2 = Coin, 3 = Power Pellet, 4 = Mystery Candy, 5 = 1-UP, 0 = Empty
        const layouts = [
            [ // Original
                "1111111111111111", "1222222112222221", "1311112112111131", "1222222222222221",
                "1211211111121121", "1222211001122221", "1111211001121111", "0000200000020000",
                "1111211111121111", "1222222112222221", "1211112112111121", "1222112222112221",
                "1112112112112111", "1322222112222231", "1111111111111111", "1111111111111111"
            ],
            [ // More open
                "1111111111111111", "1322222222222231", "1211121111211121", "1211121111211121",
                "1222222222222221", "1211111001111121", "1222221001222221", "0001121111211000",
                "1222221111222221", "1211111221111121", "1222222222222221", "1211121221211121",
                "1211121221211121", "1322222222222231", "1111111111111111", "1111111111111111"
            ],
            [ // Maze-like
                "1111111111111111", "1322222222222231", "1211111111111121", "1222222222222221",
                "1211111111111121", "1211000000111121", "1211011110111121", "1222011110222221",
                "1112011110111211", "1112000000111211", "1112111111111211", "1112222222222211",
                "1112111111111211", "1322222222222231", "1111111111111111", "1111111111111111"
            ]
        ];

        const layout = layouts[(this.currentLevel - 1) % layouts.length];

        this.grid = [];
        this.dotsCount = 0;
        let spawnedLife = false;

        for (let y = 0; y < 16; y++) {
            let row = [];
            for (let x = 0; x < 16; x++) {
                let val = parseInt(layout[y][x], 10);
                if (val === 2 && Math.random() < 0.05) val = 4;

                if (val === 2 && this.currentLevel % 3 === 0 && !spawnedLife && Math.random() < 0.1) {
                    val = 5;
                    spawnedLife = true;
                }

                if (this.currentLevel > layouts.length && val === 1 && Math.random() < 0.1) {
                    val = 2;
                }

                if (val === 2 || val === 3 || val === 4 || val === 5) this.dotsCount++;
                row.push(val);
            }
            this.grid.push(row);
        }
    }

    spawnEntities() {
        let speedMult = this.difficulty === 0 ? 0.8 : (this.difficulty === 2 ? 1.3 : 1.0);
        speedMult += (this.currentLevel - 1) * 0.1;

        this.player = {
            gx: 8, gy: 11,
            px: 8 * this.tileSize, py: 11 * this.tileSize,
            tx: 8, ty: 11,
            dir: 'a', nextDir: 'a',
            moving: false, wrapX: 0, speed: 80,
            scaredMode: 0
        };

        const enemyColors = ['#e74c3c', '#e056fd', '#00d2ff', '#e67e22']; // Red, Pink, Cyan, Orange
        this.enemies = [];

        for (let i = 0; i < 4; i++) {
            this.enemies.push({
                gx: 7 + (i % 2), gy: 5 + Math.floor(i / 2),
                px: (7 + (i % 2)) * this.tileSize, py: (5 + Math.floor(i / 2)) * this.tileSize,
                tx: 7 + (i % 2), ty: 5 + Math.floor(i / 2),
                dir: 'w', nextDir: 'w',
                moving: false, wrapX: 0, speed: 70 * speedMult, color: enemyColors[i],
                respawning: 0,
                huntTimer: 0
            });
        }
    }

    startGame() {
        this.scoreSubmitted = false;
        this.currentLevel = 1;
        this.buildLevel();
        this.spawnEntities();
        this.fruit = null;
        this.fruitTimer = 10.0 + Math.random() * 10.0;
        this.gameState = 'ready';
        this.readyTimer = 1.0;
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
        if (isDown) {
            this.keys.add(k);
            if (k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow')) {
                let d = k;
                if (k === 'arrowup') d = 'w';
                if (k === 'arrowdown') d = 's';
                if (k === 'arrowleft') d = 'a';
                if (k === 'arrowright') d = 'd';
                this.player.nextDir = d;
            }
        } else {
            this.keys.delete(k);
        }
    }

    updateEntity(ent, dt, isPlayer) {
        if (!ent.moving) {
            if (isPlayer) {
                let nx = ent.gx, ny = ent.gy;
                if (ent.nextDir === 'w') ny--;
                else if (ent.nextDir === 's') ny++;
                else if (ent.nextDir === 'a') nx--;
                else if (ent.nextDir === 'd') nx++;

                if (nx < 0) nx = 15; if (nx > 15) nx = 0; // Wrap test

                // Change direction if the desired tile is valid
                if (this.grid[ny] && this.grid[ny][nx] !== 1) {
                    ent.dir = ent.nextDir;
                }
            } else { // AI intersection/wall handling logic
                let valids = [];
                const dirs = ['w', 's', 'a', 'd'];
                const opposites = { 'w': 's', 's': 'w', 'a': 'd', 'd': 'a' };

                dirs.forEach(d => {
                    let tx = ent.gx, ty = ent.gy;
                    if (d === 'w') ty--; else if (d === 's') ty++; else if (d === 'a') tx--; else if (d === 'd') tx++;
                    if (tx < 0) tx = 15; if (tx > 15) tx = 0;
                    if (this.grid[ty] && this.grid[ty][tx] !== 1) {
                        if (d !== opposites[ent.dir]) valids.push(d); // Prefer not backtracking
                    }
                });

                if (valids.length === 0) valids.push(opposites[ent.dir]); // Force backtracking if trapped
                if (valids.length > 0) {
                    let chosenDir = null;
                    if (ent.huntTimer > 0) {
                        let bestDist = Infinity;
                        let worstDist = -1;
                        valids.forEach(d => {
                            let tx = ent.gx, ty = ent.gy;
                            if (d === 'w') ty--; else if (d === 's') ty++; else if (d === 'a') tx--; else if (d === 'd') tx++;
                            let dist = Math.hypot(this.player.gx - tx, this.player.gy - ty);
                            if (this.player.scaredMode > 0) {
                                if (dist > worstDist) { worstDist = dist; chosenDir = d; }
                            } else {
                                if (dist < bestDist) { bestDist = dist; chosenDir = d; }
                            }
                        });
                    }

                    if (!chosenDir) {
                        // Regular roaming - prioritize going straight, occasionally turn randomly
                        if (valids.includes(ent.dir) && Math.random() < 0.6) {
                            chosenDir = ent.dir;
                        } else {
                            chosenDir = valids[Math.floor(Math.random() * valids.length)];
                        }
                    }
                    ent.dir = chosenDir;
                    ent.nextDir = ent.dir;
                }
            }

            // Set target grid positions
            ent.tx = ent.gx; ent.ty = ent.gy;
            if (ent.dir === 'w') ent.ty--;
            else if (ent.dir === 's') ent.ty++;
            else if (ent.dir === 'a') ent.tx--;
            else if (ent.dir === 'd') ent.tx++;

            if (ent.tx < 0) { ent.tx = 15; ent.wrapX = -1; }
            else if (ent.tx > 15) { ent.tx = 0; ent.wrapX = 1; }
            else ent.wrapX = 0;

            if (this.grid[ent.ty] && this.grid[ent.ty][ent.tx] !== 1) {
                ent.moving = true;
            } else {
                ent.tx = ent.gx; ent.ty = ent.gy;
            }
        }

        if (ent.moving) {
            let speed = ent.speed * dt;
            if (isPlayer && this.player.scaredMode > 0) speed = ent.speed * 1.15 * dt;
            if (!isPlayer && this.player.scaredMode > 0) speed = ent.speed * 0.5 * dt;

            let targetPx = ent.tx * this.tileSize;
            let targetPy = ent.ty * this.tileSize;

            if (ent.wrapX !== 0) {
                ent.px = targetPx;
                ent.gx = ent.tx;
                ent.moving = false;
                ent.wrapX = 0;
            } else {
                let dx = targetPx - ent.px;
                let dy = targetPy - ent.py;
                let dist = Math.hypot(dx, dy);

                if (dist <= speed) {
                    ent.px = targetPx;
                    ent.py = targetPy;
                    ent.gx = ent.tx;
                    ent.gy = ent.ty;
                    ent.moving = false;
                } else {
                    ent.px += (dx / dist) * speed;
                    ent.py += (dy / dist) * speed;
                }
            }
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
                this.engine.network.sendArcadeScore('b-man', this.score);
                this.scoreSubmitted = true;
            }
            this.start();
            return;
        }

        if (this.inputLockTimer > 0) this.inputLockTimer -= dt;

        if (this.gameState === 'title') {
            if (this.inputLockTimer <= 0) {
                if (this.keys.has('w') || this.keys.has('arrowup')) { this.menuSelection = (this.menuSelection - 1 + 3) % 3; this.keys.delete('w'); this.keys.delete('arrowup'); this.audio.blip(true); }
                if (this.keys.has('s') || this.keys.has('arrowdown')) { this.menuSelection = (this.menuSelection + 1) % 3; this.keys.delete('s'); this.keys.delete('arrowdown'); this.audio.blip(true); }
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
        }

        if (this.gameState === 'ready') {
            this.readyTimer -= dt;
            if (this.readyTimer <= 0) {
                this.gameState = 'playing';
            }
            return;
        }

        if (this.gameState === 'playing') {
            if (!this.fruit) {
                this.fruitTimer -= dt;
                if (this.fruitTimer <= 0) {
                    this.fruit = { gx: 7, gy: 7, life: 10.0, type: Math.floor(Math.random() * 4) };
                }
            } else {
                this.fruit.life -= dt;
                if (this.fruit.life <= 0) {
                    this.fruit = null;
                    this.fruitTimer = 15.0 + Math.random() * 15.0;
                } else if (this.player.gx === this.fruit.gx && this.player.gy === this.fruit.gy) {
                    const pts = 500 + this.fruit.type * 500;
                    this.score += pts;
                    this.audio.playTone('sine', 1000, 2000, 0.1, 0.05);
                    this.floatingScores.push({ x: this.fruit.gx * this.tileSize, y: this.fruit.gy * this.tileSize, text: pts.toString(), life: 1.5 });
                    this.fruit = null;
                    this.fruitTimer = 15.0 + Math.random() * 15.0;
                }
            }
        }

        // Update floating scores
        for (let i = this.floatingScores.length - 1; i >= 0; i--) {
            const fs = this.floatingScores[i];
            fs.y -= 15 * dt; // Move up
            fs.life -= dt;
            if (fs.life <= 0) {
                this.floatingScores.splice(i, 1);
            }
        }

        if (this.gameState === 'dying') {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.lives--;
                if (this.lives <= 0) {
                    this.gameState = 'gameover';
                    this.inputLockTimer = 1.0;
                    if (!this.scoreSubmitted && this.score > 0) {
                        this.engine.network.sendArcadeScore('b-man', this.score);
                        this.scoreSubmitted = true;
                    }
                } else {
                    this.spawnEntities();
                    this.gameState = 'ready';
                    this.readyTimer = 1.0;
                }
            }
            return; // Freeze the rest of the game world
        }

        if (this.player.scaredMode > 0) {
            this.player.scaredMode -= dt;
            if (this.player.scaredMode <= 0) this.audio.blip(false);
        }

        this.updateEntity(this.player, dt, true);

        // Handle grid cell interaction (Coins / Pellets)
        if (!this.player.moving) {
            let cell = this.grid[this.player.gy][this.player.gx];
            if (cell === 2 || cell === 3 || cell === 4 || cell === 5) {
                this.grid[this.player.gy][this.player.gx] = 0;
                this.dotsCount--;
                if (cell === 2) {
                    this.score += 10;
                    this.audio.playTone('sine', 800, 1200, 0.05, 0.05);
                } else if (cell === 3) {
                    this.score += 50;
                    this.player.scaredMode = 8.0;
                    this.ghostCombo = 0;
                    this.audio.playTone('square', 600, 1200, 0.5, 0.05);
                } else if (cell === 4) {
                    this.score += 150;
                    this.audio.playTone('sine', 1200, 1600, 0.1, 0.05);
                } else if (cell === 5) {
                    this.score += 500;
                    this.lives = Math.min(5, this.lives + 1); // Cap lives at 5
                    this.audio.playTone('sine', 400, 800, 0.5, 0.1);
                    this.floatingScores.push({ x: this.player.px, y: this.player.py, text: '1-UP', life: 1.5 });
                }

                if (this.dotsCount === 0) {
                    this.currentLevel++;
                    this.inputLockTimer = 1.0;
                    this.audio.coin();
                    this.buildLevel();
                    this.spawnEntities();
                    this.fruit = null;
                    this.fruitTimer = 10.0 + Math.random() * 10.0;
                    this.gameState = 'ready';
                    this.readyTimer = 1.0;
                }
            }
        }

        // Process Ghost AI
        this.enemies.forEach(e => {
            if (e.respawning > 0) {
                e.respawning -= dt;
                if (e.respawning <= 0) {
                    e.px = 7 * this.tileSize; e.py = 5 * this.tileSize;
                    e.gx = 7; e.gy = 5;
                    e.tx = 7; e.ty = 5;
                    e.moving = false;
                    e.respawning = 0;
                }
                return;
            }

            if (e.huntTimer > 0) e.huntTimer -= dt;
            else {
                const huntChance = (0.2 + this.difficulty * 0.3) * dt;
                if (Math.random() < huntChance) {
                    e.huntTimer = 1.0 + Math.random() * (1.0 + this.difficulty);
                }
            }

            this.updateEntity(e, dt, false);

            // Hit detection with player
            let dist = Math.hypot(this.player.px - e.px, this.player.py - e.py);
            if (dist < this.tileSize * 0.8) {
                if (this.player.scaredMode > 0 && e.respawning <= 0) {
                    this.ghostCombo++;
                const points = this.ghostCombo <= 4 ? 100 * Math.pow(2, this.ghostCombo) : 800;
                    this.score += points;
                    this.audio.stomp();
                    this.floatingScores.push({ x: e.px, y: e.py, text: points.toString(), life: 1.0 });
                e.respawning = 3.0;
            } else if (this.gameState !== 'dying') {
                    this.gameState = 'dying';
                    this.deathTimer = 1.5;
                    this.audio.death();
                }
        }
        });
    }

    draw() {
        this.ctx.fillStyle = '#0b0e14';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.gameState === 'title') {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 40px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('B-MAN', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px monospace';
            const options = ['EASY', 'NORMAL', 'HARD'];
            options.forEach((opt, idx) => {
                this.ctx.fillStyle = this.menuSelection === idx ? '#f1c40f' : '#fff';
                this.ctx.fillText(opt, this.width / 2, this.height / 2 + 10 + idx * 25);
            });

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px monospace';
            if (Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillText('PRESS SPACE TO SELECT', this.width / 2, this.height / 2 + 100);
            }

            const hs = this.engine.arcadeScores?.['b-man'];
            if (hs && hs.score > 0) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText(`HIGH SCORE: ${hs.score} BY ${hs.player}`, this.width / 2, 20);
            }
            return;
        }

        // Draw Map
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                let val = this.grid[y][x];
                let px = x * this.tileSize;
                let py = y * this.tileSize;
                if (val === 1) {
                    this.ctx.fillStyle = '#3498db';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#0b0e14';
                    this.ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
                } else if (val === 2) {
                    this.ctx.fillStyle = '#f1c40f';
                    this.ctx.fillRect(px + 6, py + 6, 4, 4);
                } else if (val === 3) {
                    if (Math.floor(performance.now() / 200) % 2 === 0) {
                        this.ctx.fillStyle = '#f1c40f';
                        this.ctx.beginPath();
                        this.ctx.arc(px + 8, py + 8, 5, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                } else if (val === 4) {
                    this.ctx.fillStyle = ['#e74c3c', '#2ecc71', '#3498db', '#9b59b6'][Math.floor(performance.now() / 200) % 4];
                    this.ctx.fillRect(px + 4, py + 4, 8, 8);
                } else if (val === 5) {
                    const offset = Math.sin(performance.now() / 150) * 2;
                    this.ctx.fillStyle = '#1dd1a1';
                    this.ctx.fillRect(px + 4, py + 4 + offset, 8, 8);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(px + 6, py + 6 + offset, 4, 4);
                }
            }
        }

        // Draw Fruit
        if (this.fruit && this.gameState !== 'dying') {
            let fx = this.fruit.gx * this.tileSize;
            let fy = this.fruit.gy * this.tileSize;
            if (this.fruit.life > 2.0 || Math.floor(performance.now() / 150) % 2 === 0) {
                const fColors = ['#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6'];
                this.ctx.fillStyle = fColors[this.fruit.type];
                this.ctx.beginPath();
                this.ctx.arc(fx + 8, fy + 9, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(fx + 7, fy + 2, 2, 4);
            }
        }

        // Draw Player
        const bmanColors = ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#1dd1a1', '#f368e0', '#ff9f43', '#0abde3'];
        this.ctx.fillStyle = bmanColors[(this.currentLevel - 1) % bmanColors.length];

        if (this.gameState === 'dying') {
            const shrink = Math.max(0, this.deathTimer / 1.5);
            const size = 12 * shrink;
            this.ctx.save();
            this.ctx.translate(this.player.px + 8, this.player.py + 8);
            this.ctx.rotate((1.5 - this.deathTimer) * Math.PI * 4);
            this.ctx.fillRect(-size/2, -size/2, size, size);
            this.ctx.restore();
        } else {
            let mouthOpen = (Math.floor(performance.now() / 150) % 2 === 0) ? 0.3 : 0;
            this.ctx.fillRect(this.player.px + 2, this.player.py + 2, 12, 12);
            if (mouthOpen) {
                this.ctx.fillStyle = '#0b0e14';
                if (this.player.dir === 'a') this.ctx.fillRect(this.player.px + 2, this.player.py + 6, 6, 4);
                else if (this.player.dir === 'd') this.ctx.fillRect(this.player.px + 8, this.player.py + 6, 6, 4);
                else if (this.player.dir === 'w') this.ctx.fillRect(this.player.px + 6, this.player.py + 2, 4, 6);
                else if (this.player.dir === 's') this.ctx.fillRect(this.player.px + 6, this.player.py + 8, 4, 6);
            }
        }

        // Draw Enemies
        if (this.gameState !== 'dying') {
            this.enemies.forEach(e => {
                if (e.respawning > 0) return;

                this.ctx.fillStyle = this.player.scaredMode > 0 ? ((this.player.scaredMode < 2 && Math.floor(performance.now() / 200) % 2 === 0) ? '#fff' : '#2980b9') : e.color;
                this.ctx.fillRect(e.px + 2, e.py + 2, 12, 12);

                // Draw ghost eyes
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(e.px + 4, e.py + 4, 3, 3);
                this.ctx.fillRect(e.px + 9, e.py + 4, 3, 3);

                // Draw pupils if not scared
                if (this.player.scaredMode <= 0) {
                    this.ctx.fillStyle = '#000';
                    let pupilX = 0, pupilY = 0;
                    if (e.dir === 'a') pupilX = -1; else if (e.dir === 'd') pupilX = 1;
                    if (e.dir === 'w') pupilY = -1; else if (e.dir === 's') pupilY = 1;

                    this.ctx.fillRect(e.px + 5 + pupilX, e.py + 5 + pupilY, 1, 1);
                    this.ctx.fillRect(e.px + 10 + pupilX, e.py + 5 + pupilY, 1, 1);
                }
            });
        }

        // Draw floating scores
        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        for (const fs of this.floatingScores) {
            this.ctx.globalAlpha = Math.max(0, fs.life);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(fs.text, fs.x + this.tileSize / 2, fs.y + this.tileSize / 2);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw UI Top/Bottom Banners
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 5, 12);
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LVL: ${this.currentLevel}`, this.width / 2, 12);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`LIVES: ${this.lives}`, this.width - 5, 12);

        if (this.gameState === 'ready') {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('READY!', this.width / 2, this.height / 2 + 30);
        }

        if (this.gameState === 'gameover' || this.gameState === 'win') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = this.gameState === 'win' ? '#2ecc71' : '#e74c3c';
            this.ctx.font = 'bold 32px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.gameState === 'win' ? 'VICTORY' : 'GAME OVER', this.width / 2, this.height / 2 - 10);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 20);
            if (Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 40);
            }
        }
    }
}
