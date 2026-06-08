export class InvadersVM {
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

    this.frameImg = new Image();
    this.frameImg.src = 'assets/images/ui/arcade-cabinets/invaders-frame.png';

    this.isRunning = false;
    this.keys = new Set();
    this.inputLockTimer = 0;
    this.reset();
  }

  reset() {
    this.gameState = 'title';
    this.menuSelection = 0;
    this.difficulty = 1;
    this.player = { x: this.width / 2 - 8, y: this.height - 20, w: 16, h: 8, speed: 120 };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.barricades = [];
    this.ufo = null;
    this.ufoTimer = 10 + Math.random() * 10;
    this.score = 0;
    this.lives = 3;
    this.enemyDir = 1;
    this.enemySpeed = 15;
    this.fireCooldown = 0;
    this.enemyFireTimer = 1.0;
    this.scoreSubmitted = false;
  }

  buildEnemies() {
    this.enemies = [];
    const rows = 4;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.enemies.push({
          x: 20 + c * 24,
          y: 30 + r * 20,
          w: 12,
          h: 8,
          type: r // Type dictates color and score value
        });
      }
    }
  }

  buildBarricades() {
    this.barricades = [];
    const numBarricades = this.difficulty === 2 ? 3 : 4;
    const hp = this.difficulty === 0 ? 8 : (this.difficulty === 1 ? 4 : 2);
    const spacing = this.width / (numBarricades + 1);

    for (let i = 0; i < numBarricades; i++) {
      const bx = Math.round(spacing * (i + 1) - 16);
      const by = this.height - 60;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          if (r === 0 && (c === 0 || c === 7)) continue; // Top arched corners
          if (r === 3 && c >= 3 && c <= 4) continue;     // Bottom archway gap
          this.barricades.push({ x: bx + c * 4, y: by + r * 4, w: 4, h: 4, hp: hp, maxHp: hp });
        }
      }
    }
  }

  startGame() {
    this.enemySpeed = this.difficulty === 0 ? 8 : (this.difficulty === 1 ? 15 : 25);
    this.enemyFireTimer = this.difficulty === 0 ? 1.5 : (this.difficulty === 1 ? 1.0 : 0.6);
    this.scoreSubmitted = false;
    this.buildEnemies();
    this.buildBarricades();
    this.gameState = 'playing';
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
        this.engine.network.sendArcadeScore('invaders', this.score);
        this.scoreSubmitted = true;
      }
      this.start();
      return;
    }

    if (this.inputLockTimer > 0) this.inputLockTimer -= dt;

    if (this.gameState === 'title') {
      if (this.inputLockTimer <= 0) {
        if (this.keys.has('w') || this.keys.has('arrowup')) {
          this.menuSelection = (this.menuSelection - 1 + 3) % 3;
          this.keys.delete('w'); this.keys.delete('arrowup');
          this.audio.blip(true);
        }
        if (this.keys.has('s') || this.keys.has('arrowdown')) {
          this.menuSelection = (this.menuSelection + 1) % 3;
          this.keys.delete('s'); this.keys.delete('arrowdown');
          this.audio.blip(true);
        }
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

    // Player Movement
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.player.x -= this.player.speed * dt;
    if (this.keys.has('d') || this.keys.has('arrowright')) this.player.x += this.player.speed * dt;
    this.player.x = Math.max(0, Math.min(this.width - this.player.w, this.player.x));

    // Player Shooting
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.keys.has(' ') && this.fireCooldown <= 0) {
      this.bullets.push({ x: this.player.x + this.player.w / 2 - 1, y: this.player.y, w: 2, h: 6, speed: -250 });
      this.fireCooldown = 0.4;
      this.audio.shoot();
    }

    // Move UFO
    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      if (this.ufo.x < -30 || this.ufo.x > this.width + 30) {
        this.ufo = null;
        this.ufoTimer = 10 + Math.random() * 10;
      }
    } else {
      this.ufoTimer -= dt;
      if (this.ufoTimer <= 0) {
        const fromLeft = Math.random() > 0.5;
        this.ufo = { x: fromLeft ? -24 : this.width, y: 10, w: 24, h: 10, vx: fromLeft ? 50 : -50 };
        this.audio.playTone('sine', 600, 300, 1.0, 0.05); // Spooky UFO arrival sweep
      }
    }

    // Move Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.speed * dt;
      if (b.y < 0) this.bullets.splice(i, 1);
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.y += b.speed * dt;
      if (b.y > this.height) this.enemyBullets.splice(i, 1);
    }

    // Move Enemies
    let hitEdge = false;
    let lowestY = 0;
    this.enemies.forEach(e => {
      e.x += this.enemySpeed * this.enemyDir * dt;
      if (e.x <= 5 || e.x + e.w >= this.width - 5) hitEdge = true;
      if (e.y > lowestY) lowestY = e.y;
    });

    if (hitEdge) {
      this.audio.blip(false);
      this.enemyDir *= -1;
      const speedBump = this.difficulty === 0 ? 2 : (this.difficulty === 1 ? 5 : 10);
      this.enemies.forEach(e => {
        e.y += 10;
        e.x += this.enemySpeed * this.enemyDir * dt * 2; // Bump them away from the edge to prevent getting stuck
      });
      this.enemySpeed += speedBump; // Speed up the horde as they descend!
    }

    if (lowestY + 8 >= this.player.y) {
      this.gameState = 'gameover';
      this.inputLockTimer = 1.0;
      this.audio.explosion();
      if (!this.scoreSubmitted && this.score > 0) {
        this.engine.network.sendArcadeScore('invaders', this.score);
        this.scoreSubmitted = true;
      }
    }

    // Enemy Shooting
    this.enemyFireTimer -= dt;
    if (this.enemyFireTimer <= 0 && this.enemies.length > 0) {
      const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      const bulletSpeed = this.difficulty === 0 ? 100 : (this.difficulty === 1 ? 150 : 220);
      this.enemyBullets.push({ x: shooter.x + shooter.w / 2 - 1, y: shooter.y + shooter.h, w: 2, h: 6, speed: bulletSpeed });
      const baseTimer = this.difficulty === 0 ? 1.0 : (this.difficulty === 1 ? 0.5 : 0.2);
      this.enemyFireTimer = baseTimer + Math.random() * 1.0;
      this.audio.playTone('sawtooth', 200, 100, 0.1, 0.02);
    }

    // Collisions
    const checkAABB = (r1, r2) => {
      return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    };

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let hit = false;
      if (this.ufo && checkAABB(this.bullets[i], this.ufo)) {
        this.score += 300;
        this.ufo = null;
        this.ufoTimer = 10 + Math.random() * 10;
        hit = true;
        this.audio.explosion();
      }
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (checkAABB(this.bullets[i], this.enemies[j])) {
          this.score += (4 - this.enemies[j].type) * 10; // Top rows are worth more
          this.enemies.splice(j, 1);
          hit = true;
          this.audio.stomp();
          break;
        }
      }
      if (!hit) {
        for (let j = this.barricades.length - 1; j >= 0; j--) {
          if (checkAABB(this.bullets[i], this.barricades[j])) {
            this.barricades[j].hp--;
            if (this.barricades[j].hp <= 0) this.barricades.splice(j, 1);
            hit = true;
            this.audio.stomp();
            break;
          }
        }
      }
      if (hit) this.bullets.splice(i, 1);
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      let hit = false;
      for (let j = this.barricades.length - 1; j >= 0; j--) {
        if (checkAABB(this.enemyBullets[i], this.barricades[j])) {
          this.barricades[j].hp--;
          if (this.barricades[j].hp <= 0) this.barricades.splice(j, 1);
          hit = true;
          this.audio.stomp();
          break;
        }
      }
      if (hit) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      if (checkAABB(this.enemyBullets[i], this.player)) {
        this.gameState = 'gameover';
        this.inputLockTimer = 1.0;
        this.audio.explosion();
        if (!this.scoreSubmitted && this.score > 0) {
          this.engine.network.sendArcadeScore('invaders', this.score);
          this.scoreSubmitted = true;
        }
      }
    }

    for (let j = this.barricades.length - 1; j >= 0; j--) {
      let crushed = false;
      for (let e of this.enemies) {
        if (checkAABB(e, this.barricades[j])) {
          crushed = true;
          break;
        }
      }
      if (crushed) this.barricades.splice(j, 1);
    }

    if (this.enemies.length === 0) {
      this.gameState = 'win';
      this.inputLockTimer = 1.0;
      this.audio.coin();
      setTimeout(() => this.audio.coin(), 200);
      if (!this.scoreSubmitted && this.score > 0) {
        this.engine.network.sendArcadeScore('invaders', this.score);
        this.scoreSubmitted = true;
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

    this.ctx.fillStyle = '#0b0e14';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameState === 'title') {
      this.ctx.fillStyle = '#3498db';
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('INVADERS', this.width / 2, this.height / 2 - 40);

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

      const hs = this.engine.arcadeScores?.['invaders'];
      if (hs && hs.score > 0) {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillText(`HIGH SCORE: ${hs.score} BY ${hs.player}`, this.width / 2, 20);
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

    // Player (Ship + Turret nub)
    this.ctx.fillStyle = this.gameState === 'gameover' ? '#e74c3c' : '#2ecc71';
    this.ctx.fillRect(Math.round(this.player.x), Math.round(this.player.y), this.player.w, this.player.h);
    this.ctx.fillRect(Math.round(this.player.x + this.player.w / 2 - 2), Math.round(this.player.y - 4), 4, 4);

    // Enemies
    const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#3498db'];
    this.enemies.forEach(e => {
      this.ctx.fillStyle = colors[e.type % colors.length];
      this.ctx.fillRect(Math.round(e.x), Math.round(e.y), e.w, e.h);
    });

    // UFO
    if (this.ufo) {
      this.ctx.fillStyle = '#9b59b6'; // Purple UFO
      this.ctx.fillRect(Math.round(this.ufo.x), Math.round(this.ufo.y) + 4, this.ufo.w, this.ufo.h - 4);
      this.ctx.fillStyle = '#8e44ad'; // Cockpit
      this.ctx.fillRect(Math.round(this.ufo.x) + 6, Math.round(this.ufo.y), 12, 4);
    }

    // Barricades
    this.barricades.forEach(b => {
      const opacity = Math.max(0.3, b.hp / b.maxHp);
      this.ctx.fillStyle = `rgba(46, 204, 113, ${opacity})`;
      this.ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    });

    // Bullets
    this.ctx.fillStyle = '#2ecc71';
    this.bullets.forEach(b => this.ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h));
    this.ctx.fillStyle = '#ff4757';
    this.enemyBullets.forEach(b => this.ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h));

    // UI
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 10, 20);

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

    this.ctx.restore();

    if (this.engine.clientSettings.enableArcadeCRT !== false) {
      this.screen.drawCRTEffect();
    }
    if (this.frameImg && this.frameImg.complete) {
      this.ctx.drawImage(this.frameImg, 0, 0, this.canvasWidth, this.canvasHeight);
    }
  }
}
