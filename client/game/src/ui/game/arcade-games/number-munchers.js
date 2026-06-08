export class NumberMunchersVM {
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
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.scoreSubmitted = false;

    this.player = { cx: 0, cy: 0 };
    this.errorTimer = 0;
    this.moveTimer = 0;
    this.floatingScores = [];
    this.troggles = [];

    this.buildLevel();
  }

  hurtPlayer() {
    this.lives--;
    this.audio.explosion();
    this.errorTimer = 1.0;
    this.player.cx = 0;
    this.player.cy = 0;
    if (this.lives <= 0) {
      this.gameState = 'gameover';
      this.inputLockTimer = 1.0;
      if (!this.scoreSubmitted && this.score > 0) {
        this.engine.network.sendArcadeScore('number-munchers', this.score);
        this.scoreSubmitted = true;
      }
    }
  }

  buildLevel() {
    this.grid = [];
    this.validCount = 0;
    this.player.cx = 0;
    this.player.cy = 0;

    let maxNumber = 30;
    let possibleTargets = [];

    if (this.level === 1) {
      this.ruleType = 'multiples';
      possibleTargets = [2, 3, 5];
      maxNumber = 30;
    } else if (this.level === 2) {
      this.ruleType = 'multiples';
      possibleTargets = [2, 3, 4, 5, 10];
      maxNumber = 50;
    } else if (this.level === 3) {
      this.ruleType = 'multiples';
      possibleTargets = [6, 7, 8, 9];
      maxNumber = 99;
    } else if (this.level === 4) {
      this.ruleType = 'factors';
      possibleTargets = [12, 15, 20];
      maxNumber = 30;
    } else if (this.level === 5) {
      this.ruleType = 'factors';
      possibleTargets = [24, 30, 36, 42, 48];
      maxNumber = 50;
    } else if (this.level === 6) {
      this.ruleType = 'primes';
      maxNumber = 30;
    } else if (this.level === 7) {
      this.ruleType = 'primes';
      maxNumber = 99;
    } else {
      const ruleTypes = ['multiples', 'factors', 'primes'];
      this.ruleType = ruleTypes[Math.floor(Math.random() * 3)];
      if (this.ruleType === 'multiples') possibleTargets = [3, 4, 6, 7, 8, 9, 12, 15];
      else if (this.ruleType === 'factors') possibleTargets = [36, 42, 48, 60, 72, 90, 96];
      maxNumber = 99;
    }

    if (this.ruleType === 'multiples') {
      this.targetNum = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      this.prompt = `Multiples of ${this.targetNum}`;
      this.checkValid = (n) => n % this.targetNum === 0;
    } else if (this.ruleType === 'factors') {
      this.targetNum = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      this.prompt = `Factors of ${this.targetNum}`;
      this.checkValid = (n) => this.targetNum % n === 0;
    } else {
      this.prompt = `Prime Numbers`;
      this.checkValid = (n) => {
        if (n < 2) return false;
        for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
        return true;
      };
    }

    const primesList = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    const validPrimes = primesList.filter(p => p <= maxNumber);

    for (let r = 0; r < 5; r++) {
      let row = [];
      for (let c = 0; c < 6; c++) {
        let isTarget = Math.random() < 0.35;
        let num;
        if (isTarget) {
          if (this.ruleType === 'multiples') {
            let maxMult = Math.floor(maxNumber / this.targetNum);
            if (maxMult < 1) maxMult = 1;
            num = this.targetNum * (Math.floor(Math.random() * maxMult) + 1);
          }
          else if (this.ruleType === 'factors') {
            const factors = [];
            for (let i = 1; i <= this.targetNum; i++) if (this.targetNum % i === 0) factors.push(i);
            num = factors[Math.floor(Math.random() * factors.length)];
          }
          else {
            num = validPrimes[Math.floor(Math.random() * validPrimes.length)];
          }
          this.validCount++;
        } else {
          let attempts = 0;
          do {
            num = Math.floor(Math.random() * maxNumber) + 1;
            attempts++;
          } while (this.checkValid(num) && attempts < 10);
        }
        row.push({ val: num, eaten: false });
      }
      this.grid.push(row);
    }

    if (this.validCount === 0) {
      this.grid[0][0].val = this.ruleType === 'multiples' ? this.targetNum : (this.ruleType === 'factors' ? 1 : 2);
      this.validCount = 1;
    }

    this.troggles = [];
    const numTroggles = Math.min(4, Math.floor(this.level / 2));
    for (let i = 0; i < numTroggles; i++) {
      let tx, ty;
      do {
        tx = Math.floor(Math.random() * 6);
        ty = Math.floor(Math.random() * 5);
      } while (tx === 0 && ty === 0);
      this.troggles.push({ cx: tx, cy: ty, moveTimer: 0.5 + Math.random() * 0.5 });
    }
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

  update(dt) {
    if (this.keys.has('c')) {
      this.keys.delete('c');
      this.engine.clientSettings.enableArcadeCRT = this.engine.clientSettings.enableArcadeCRT === false ? true : false;
      localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
    }

    if (this.keys.has('q') && this.gameState !== 'title') {
      this.keys.delete('q');
      if (!this.scoreSubmitted && this.score > 0) {
        this.engine.network.sendArcadeScore('number-munchers', this.score);
        this.scoreSubmitted = true;
      }
      this.start();
      return;
    }

    if (this.inputLockTimer > 0) this.inputLockTimer -= dt;
    if (this.errorTimer > 0) this.errorTimer -= dt;
    if (this.moveTimer > 0) this.moveTimer -= dt;

    // Update floating scores
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.y -= 15 * dt; // Move up
      fs.life -= dt;
      if (fs.life <= 0) this.floatingScores.splice(i, 1);
    }

    if (this.gameState === 'level_clear') {
      this.levelClearTimer -= dt;
      if (this.levelClearTimer <= 0) {
        this.level++;
        this.buildLevel();
        this.gameState = 'playing';
      }
      return;
    }

    if (this.gameState === 'title') {
      if (this.inputLockTimer <= 0 && this.keys.has(' ')) {
        this.keys.delete(' ');
        this.inputLockTimer = 0.5;
        this.audio.coin();
        this.startGame();
      }
      return;
    } else if (this.gameState === 'gameover') {
      if (this.keys.has(' ') && this.inputLockTimer <= 0) {
        this.reset();
        this.keys.delete(' ');
        this.inputLockTimer = 0.5;
      }
      return;
    }

    if (this.gameState === 'playing') {
      // Troggles movement
      this.troggles.forEach(t => {
        t.moveTimer -= dt;
        if (t.moveTimer <= 0) {
          t.moveTimer = Math.max(0.4, 1.0 - (this.level * 0.05));
          const dirs = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
          ];
          const validDirs = dirs.filter(d => {
            const nx = t.cx + d.dx;
            const ny = t.cy + d.dy;
            return nx >= 0 && nx < 6 && ny >= 0 && ny < 5;
          });
          if (validDirs.length > 0) {
            const chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
            t.cx += chosen.dx;
            t.cy += chosen.dy;
          }
        }

        if (t.cx === this.player.cx && t.cy === this.player.cy && this.errorTimer <= 0) {
          this.hurtPlayer();
        }
      });

      if (this.moveTimer <= 0) {
        let moved = false;
        if (this.keys.has('w') || this.keys.has('arrowup')) { this.player.cy--; moved = true; }
        else if (this.keys.has('s') || this.keys.has('arrowdown')) { this.player.cy++; moved = true; }
        else if (this.keys.has('a') || this.keys.has('arrowleft')) { this.player.cx--; moved = true; }
        else if (this.keys.has('d') || this.keys.has('arrowright')) { this.player.cx++; moved = true; }

        if (moved) {
          this.player.cx = Math.max(0, Math.min(5, this.player.cx));
          this.player.cy = Math.max(0, Math.min(4, this.player.cy));
          this.moveTimer = 0.15; // Move delay
          this.audio.jump();

          const hitTroggle = this.troggles.some(t => t.cx === this.player.cx && t.cy === this.player.cy);
          if (hitTroggle && this.errorTimer <= 0) {
            this.hurtPlayer();
          }
        }
      }

      if (this.keys.has(' ')) {
        this.keys.delete(' ');
        const cell = this.grid[this.player.cy][this.player.cx];
        if (!cell.eaten) {
          if (this.checkValid(cell.val)) {
            cell.eaten = true;
            this.validCount--;
            this.score += 10;
            this.audio.coin();

            const px = 8 + this.player.cx * 40;
            const py = 48 + this.player.cy * 35;
            this.floatingScores.push({ x: px + 20, y: py + 17, text: '+10', life: 1.0 });

            if (this.validCount === 0) {
              this.score += 100;
              if (this.audio.levelClear) this.audio.levelClear();
              else this.audio.playTone('sine', 800, 1200, 0.2, 0.1);
              this.gameState = 'level_clear';
              this.levelClearTimer = 2.0;
            }
          } else {
            this.hurtPlayer();
          }
        }
      }
    }
  }

  draw() {
    this.ctx.fillStyle = '#0b0e14';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameState === 'title') {
      this.ctx.fillStyle = '#e056fd';
      this.ctx.font = 'bold 28px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('NUM MUNCHERS', this.width / 2, this.height / 2 - 20);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE TO START', this.width / 2, this.height / 2 + 30);
      }

      const hs = this.engine.arcadeScores?.['number-munchers'];
      if (hs && hs.score > 0) {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`HIGH SCORE: ${hs.score}`, this.width / 2, 30);
      }
      return;
    }

    this.ctx.fillStyle = '#8e44ad';
    this.ctx.fillRect(0, 16, this.width, 24);
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(this.prompt, this.width / 2, 28);

    this.ctx.strokeStyle = '#9b59b6';
    this.ctx.lineWidth = 2;
    const gridX = 8, gridY = 48, cellW = 40, cellH = 35;

    for (let r = 0; r <= 5; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(gridX, gridY + r * cellH);
      this.ctx.lineTo(gridX + 6 * cellW, gridY + r * cellH);
      this.ctx.stroke();
    }
    for (let c = 0; c <= 6; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(gridX + c * cellW, gridY);
      this.ctx.lineTo(gridX + c * cellW, gridY + 5 * cellH);
      this.ctx.stroke();
    }

    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        let cell = this.grid[r][c];
        if (!cell.eaten) {
          this.ctx.fillStyle = '#f1c40f';
          this.ctx.fillText(cell.val, gridX + c * cellW + 20, gridY + r * cellH + 17);
        }
      }
    }

    for (const t of this.troggles) {
      const tpx = gridX + t.cx * cellW;
      const tpy = gridY + t.cy * cellH;
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.fillRect(tpx + 6, tpy + 4, 28, 26);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(tpx + 10, tpy + 8, 6, 6);
      this.ctx.fillRect(tpx + 22, tpy + 8, 6, 6);
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(tpx + 12, tpy + 10, 2, 2);
      this.ctx.fillRect(tpx + 24, tpy + 10, 2, 2);
      this.ctx.fillStyle = '#c0392b';
      if (Math.floor(performance.now() / 150) % 2 === 0) {
        this.ctx.fillRect(tpx + 8, tpy + 30, 6, 4);
        this.ctx.fillRect(tpx + 26, tpy + 30, 6, 4);
      } else {
        this.ctx.fillRect(tpx + 12, tpy + 30, 6, 4);
        this.ctx.fillRect(tpx + 22, tpy + 30, 6, 4);
      }
    }

    const px = gridX + this.player.cx * cellW;
    const py = gridY + this.player.cy * cellH;

    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(px + 2, py + 2, cellW - 4, cellH - 4);

    const tex = this.engine.renderer.assetManager.textures['idle'];
    if (tex && tex.image) {
      const img = tex.image;
      const fw = img.width / 8;
      const fh = img.height / 12;
      const frame = Math.floor(performance.now() / 150) % 12;
      const col = 3; // Downwards facing column

      this.ctx.drawImage(img, col * fw, frame * fh, fw, fh, px + 4, py + 2, 32, 32);
    } else {
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillRect(px + 10, py + 8, 20, 20);
    }

    if (this.errorTimer > 0) {
      this.ctx.fillStyle = `rgba(231, 76, 60, ${this.errorTimer * 0.5})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    for (const fs of this.floatingScores) {
      this.ctx.globalAlpha = Math.max(0, fs.life);
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillText(fs.text, fs.x, fs.y);
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.fillStyle = '#0b0e14';
    this.ctx.fillRect(0, 0, this.width, 16);
    this.ctx.fillRect(0, this.height - 16, this.width, 16);

    if (this.gameState === 'level_clear') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = Math.floor(performance.now() / 100) % 2 === 0 ? '#2ecc71' : '#f1c40f';
      this.ctx.font = 'bold 24px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`LEVEL ${this.level} CLEARED!`, this.width / 2, this.height / 2 - 15);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 14px monospace';
      this.ctx.fillText('+100 POINTS', this.width / 2, this.height / 2 + 15);
    }

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`SCORE: ${this.score}`, 5, 14);
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`LVL: ${this.level}`, this.width / 2, 14);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LIVES: ${this.lives}`, this.width - 5, 14);

    if (this.gameState === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.font = 'bold 28px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 10);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 20);
      if (this.inputLockTimer <= 0 && Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 40);
      }
    }
  }
}
