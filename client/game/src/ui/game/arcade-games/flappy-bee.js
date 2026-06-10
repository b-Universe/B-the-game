export class FlappyBeeVM {
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
    this.frameImg.src = 'assets/images/ui/arcade-cabinets/flappy-bee-frame.png';

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
    this.scoreSubmitted = false;
    this.wasFlapPressed = false;

    this.bee = { x: 60, y: this.height / 2, vy: 0, size: 8 };
    this.pipes = [];
    this.particles = [];
    this.clouds = [];

    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: 10 + Math.random() * 100,
        speed: 10 + Math.random() * 15,
        w: 20 + Math.random() * 30,
        h: 10 + Math.random() * 15
      });
    }
  }

  startGame() {
    this.scoreSubmitted = false;
    this.score = 0;
    this.bee.y = this.height / 2;
    this.bee.vy = 0;
    this.pipes = [];
    this.particles = [];

    if (this.difficulty === 0) {
      this.gravity = 900;
      this.flapStrength = -280;
      this.pipeSpeed = 100;
      this.gapSize = 75;
      this.pipeTimerMax = 1.8;
    } else {
      this.gravity = 1200;
      this.flapStrength = -340;
      this.pipeSpeed = 140;
      this.gapSize = 55;
      this.pipeTimerMax = 1.3;
    }

    this.pipeTimer = 1.0; // Initial delay
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
    this.gameState = 'gameover';
    this.inputLockTimer = 1.0;
    this.audio.explosion();
    if (!this.scoreSubmitted && this.score > 0) {
      this.engine.network.sendArcadeScore('flappy-bee', this.score);
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
        this.engine.network.sendArcadeScore('flappy-bee', this.score);
        this.scoreSubmitted = true;
      }
      this.start();
      return;
    }

    if (this.inputLockTimer > 0) this.inputLockTimer -= dt;

    // Background clouds
    this.clouds.forEach(c => {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) {
        c.x = this.width + 10;
        c.y = 10 + Math.random() * 100;
      }
    });

    const isFlapInput = this.keys.has(' ') || this.keys.has('w') || this.keys.has('arrowup');

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
    } else if (this.gameState === 'gameover') {
      if (this.keys.has(' ') && this.inputLockTimer <= 0) {
        this.reset();
        this.keys.delete(' ');
        this.inputLockTimer = 0.5;
      }
      return;
    }

    // Playing State
    if (isFlapInput) {
      if (!this.wasFlapPressed) {
        this.bee.vy = this.flapStrength;
        this.audio.jump();
        this.wasFlapPressed = true;

        // Spawn a cute puff particle on flap
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: this.bee.x - 4, y: this.bee.y + 4,
            vx: -50 + (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
            life: 0.3 + Math.random() * 0.2
          });
        }
      }
    } else {
      this.wasFlapPressed = false;
    }

    // Physics
    this.bee.vy += this.gravity * dt;
    this.bee.y += this.bee.vy * dt;

    // Trail
    this.particleTimer = (this.particleTimer || 0) - dt;
    if (this.particleTimer <= 0) {
      this.particles.push({
        x: this.bee.x - 6, y: this.bee.y,
        vx: -this.pipeSpeed, vy: 0,
        life: 0.4
      });
      this.particleTimer = 0.05;
    }

    this.particles.forEach((p, i) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    });

    // Floor/Ceiling Collision
    if (this.bee.y > this.height - 20 || this.bee.y < -10) {
      this.die();
      return;
    }

    // Pipes
    this.pipeTimer -= dt;
    if (this.pipeTimer <= 0) {
      const minGapY = 30;
      const maxGapY = this.height - 30 - 20 - this.gapSize; // 20 is floor height
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);

      this.pipes.push({ x: this.width, gapY: gapY, passed: false });
      this.pipeTimer = this.pipeTimerMax;
    }

    const beeRect = { x: this.bee.x - 5, y: this.bee.y - 4, w: 10, h: 8 };
    const pipeW = 24;

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      let p = this.pipes[i];
      p.x -= this.pipeSpeed * dt;

      const topPipe = { x: p.x, y: 0, w: pipeW, h: p.gapY };
      const bottomPipe = { x: p.x, y: p.gapY + this.gapSize, w: pipeW, h: this.height - (p.gapY + this.gapSize) - 20 };

      if (this.checkCollision(beeRect, topPipe) || this.checkCollision(beeRect, bottomPipe)) {
        this.die();
        return;
      }

      // Score point when passing
      if (!p.passed && p.x + pipeW < this.bee.x) {
        p.passed = true;
        this.score++;
        this.audio.coin();
      }

      if (p.x + pipeW < 0) {
        this.pipes.splice(i, 1);
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

    this.ctx.fillStyle = '#74b9ff'; // Sky Blue
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.clouds.forEach(c => this.ctx.fillRect(c.x, c.y, c.w, c.h));

    if (this.gameState === 'title') {
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.font = 'bold 36px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('FLAPPY BEE', this.width / 2, this.height / 2 - 40);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px monospace';
      const options = ['NORMAL', 'HARD'];
      options.forEach((opt, idx) => {
        this.ctx.fillStyle = this.menuSelection === idx ? '#f1c40f' : '#fff';
        this.ctx.fillText(opt, this.width / 2, this.height / 2 + 10 + idx * 25);
      });

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE TO SELECT', this.width / 2, this.height / 2 + 100);
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

    // Pipes
    const pipeW = 24;
    this.pipes.forEach(p => {
      this.ctx.fillStyle = '#2ecc71';
      // Top Pipe
      this.ctx.fillRect(p.x, 0, pipeW, p.gapY);
      this.ctx.fillStyle = '#27ae60';
      this.ctx.fillRect(p.x - 2, p.gapY - 10, pipeW + 4, 10); // Cap

      // Bottom Pipe
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillRect(p.x, p.gapY + this.gapSize, pipeW, this.height - (p.gapY + this.gapSize) - 20);
      this.ctx.fillStyle = '#27ae60';
      this.ctx.fillRect(p.x - 2, p.gapY + this.gapSize, pipeW + 4, 10); // Cap
    });

    // Ground
    this.ctx.fillStyle = '#e67e22'; // Dirt
    this.ctx.fillRect(0, this.height - 20, this.width, 20);
    this.ctx.fillStyle = '#2ecc71'; // Grass
    this.ctx.fillRect(0, this.height - 20, this.width, 4);

    // Particles
    this.particles.forEach(p => {
      const op = Math.max(0, p.life / 0.4);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
      this.ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Bee
    if (this.gameState !== 'gameover' || this.inputLockTimer > 0) {
      this.ctx.save();
      this.ctx.translate(this.bee.x, this.bee.y);
      let rot = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bee.vy * 0.003));
      this.ctx.rotate(rot);

      // Body
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.fillRect(-6, -4, 12, 8);
      // Stripes
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(-2, -4, 2, 8);
      this.ctx.fillRect(2, -4, 2, 8);
      // Eye
      this.ctx.fillRect(4, -3, 2, 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(5, -3, 1, 1);
      // Stinger
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.moveTo(-6, 0); this.ctx.lineTo(-9, 0); this.ctx.lineTo(-6, 2); this.ctx.fill();

      // Wings
      this.ctx.fillStyle = '#fff';
      let wingY = (this.bee.vy < 0 || Math.floor(performance.now() / 80) % 2 === 0) ? -7 : -2;
      this.ctx.fillRect(-4, wingY, 6, 5);
      this.ctx.fillStyle = '#aaddff'; // Wing highlight
      this.ctx.fillRect(-2, wingY + 1, 4, 3);

      this.ctx.restore();
    }

    // UI
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(this.score, this.width / 2, 30);
    this.ctx.fillText(this.score, this.width / 2, 30);

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

      const hs = this.engine.arcadeScores?.['flappy-bee'];
      if (hs && hs.score > 0) {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`HIGH SCORE: ${hs.score}`, this.width / 2, this.height / 2 + 40);
      }

      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 65);
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
