export class BonkVM {
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

    this.paddleW = 8;
    this.paddleH = 40;

    this.reset();
  }

  reset() {
    this.gameState = 'title';
    this.menuPhase = 0;
    this.menuSelection = 0;
    this.difficulty = 1;
    this.scoreLimit = 5;
    this.twoPlayer = false;
    this.role = 1; // 1 = Host/Left, 2 = Client/Right
    this.score = { p1: 0, p2: 0 };
    this.rally = 0;
    this.maxRally = 0;
    this.scoreSubmitted = false;
    this.p1Y = this.height / 2 - this.paddleH / 2;
    this.p2Y = this.height / 2 - this.paddleH / 2;
    this.ball = { x: this.width / 2, y: this.height / 2, vx: 0, vy: 0, size: 8 };
    this.isServing = true;
    this.serverSide = 1; // 1 = Left side serves, -1 = Right side serves
    this.serveTimer = 1.0;
    this.syncTimer = 0;
    this.afkTimer = 0;
    this.opponentName = '';
  }

  startGame() {
    this.gameState = 'playing';
    this.score = { p1: 0, p2: 0 };
    this.rally = 0;
    this.maxRally = 0;
    this.afkTimer = 0;
    this.scoreSubmitted = false;
    this.isServing = true;
    this.serverSide = 1;
    this.p1Y = this.height / 2 - this.paddleH / 2;
    this.p2Y = this.height / 2 - this.paddleH / 2;
  }

  start() {
    this.isRunning = true;
    this.inputLockTimer = 0.5;
    this.reset();
  }

  stop() {
    this.isRunning = false;
    this.keys.clear();
    if (this.twoPlayer || this.gameState === 'queueing') {
      this.engine.network.sendArcadeMatchLeave();
      this.engine.network.sendArcadeQueueLeave();
    }
  }

  onMatchFound(data) {
    this.role = data.role;
    this.opponentName = data.opponent;
    this.startGame();
  }

  onStateSync(data) {
    if (this.role === 2 && data.hostSync) {
      this.ball = data.ball;
      this.p1Y = data.p1Y;
      this.score = data.score;
      this.isServing = data.isServing;
      this.serverSide = data.serverSide;
      if (data.scoreLimit !== undefined) this.scoreLimit = data.scoreLimit;
      if (data.rally !== undefined) this.rally = data.rally;
      if (data.maxRally !== undefined) this.maxRally = data.maxRally;
      if (data.gameover) {
        this.gameState = 'gameover';
        this.inputLockTimer = 1.0;
      }
    } else if (this.role === 1 && data.clientSync) {
      if (data.p2Y !== undefined) this.p2Y = data.p2Y;
      if (data.action === 'serve' && this.isServing && this.serverSide === -1) {
        this.isServing = false;
        this.resetBall(-1);
      }
      if (data.resign) {
        this.score.p1 = this.scoreLimit === Infinity ? this.score.p2 + 1 : this.scoreLimit;
        this.endGame();
      }
    }
  }

  onMatchEnded() {
    if (this.gameState === 'playing' || this.gameState === 'queueing' || this.gameState === 'gameover') {
      this.reset();
    }
  }

  endGame() {
    this.gameState = 'gameover';
    this.inputLockTimer = 1.0;
    if (!this.scoreSubmitted && !this.twoPlayer && this.score.p1 > 0) {
      this.engine.network.sendArcadeScore('bonk', this.score.p1);
      this.scoreSubmitted = true;
    }
  }

  handleInput(key, isDown) {
    const k = key.toLowerCase();
    if (isDown) {
      this.keys.add(k);
      this.afkTimer = 0; // Reset AFK timer on ANY key down
    }
    else this.keys.delete(k);
  }

  update(dt) {
    if (this.keys.has('c')) {
      this.keys.delete('c');
      this.engine.clientSettings.enableArcadeCRT = this.engine.clientSettings.enableArcadeCRT === false ? true : false;
      localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
    }

    if (this.keys.has('q') && this.gameState !== 'title' && this.gameState !== 'queueing') {
      this.keys.delete('q');
      if (!this.scoreSubmitted && !this.twoPlayer && this.score.p1 > 0) {
        this.engine.network.sendArcadeScore('bonk', this.score.p1);
        this.scoreSubmitted = true;
      }
      this.stop();
      this.start();
      return;
    }

    if (this.inputLockTimer > 0) this.inputLockTimer -= dt;

    if (this.gameState === 'queueing') {
      if (this.keys.has('escape')) {
        this.engine.network.sendArcadeQueueLeave();
        this.reset();
        this.inputLockTimer = 0.5;
      }
      return;
    }

    if (this.gameState === 'title') {
      if (this.inputLockTimer <= 0) {
        if (this.keys.has('w') || this.keys.has('arrowup')) {
          this.menuSelection = (this.menuSelection - 1 + (this.menuPhase === 0 ? 4 : 3)) % (this.menuPhase === 0 ? 4 : 3);
          this.keys.delete('w'); this.keys.delete('arrowup');
          this.audio.blip(true);
        }
        if (this.keys.has('s') || this.keys.has('arrowdown')) {
          this.menuSelection = (this.menuSelection + 1) % (this.menuPhase === 0 ? 4 : 3);
          this.keys.delete('s'); this.keys.delete('arrowdown');
          this.audio.blip(true);
        }
        if (this.keys.has(' ')) {
          this.keys.delete(' ');
          this.inputLockTimer = 0.5;
          this.audio.coin();

          if (this.menuPhase === 0) {
            this.difficulty = this.menuSelection;
            this.twoPlayer = this.menuSelection === 3;
            this.menuPhase = 1;
            this.menuSelection = 0;
          } else {
            this.scoreLimit = this.menuSelection === 0 ? 3 : (this.menuSelection === 1 ? 5 : Infinity);
            if (this.twoPlayer) {
              this.gameState = 'queueing';
              this.engine.network.sendArcadeQueueJoin('bonk');
            } else {
              this.role = 1;
              this.startGame();
            }
          }
        }
        if (this.keys.has('escape') && this.menuPhase === 1) {
          this.keys.delete('escape');
          this.menuPhase = 0;
          this.menuSelection = 0;
          this.inputLockTimer = 0.5;
        }
      }
      return;
    } else if (this.gameState === 'gameover') {
      if (this.inputLockTimer <= 0 && this.keys.has(' ')) {
        if (this.twoPlayer) {
          this.engine.network.sendArcadeMatchLeave();
        }
        this.gameState = 'title';
        this.keys.delete(' ');
        this.inputLockTimer = 0.5;
      }
      return;
    }

    if (this.gameState === 'playing') {
      this.afkTimer += dt;
      if (this.afkTimer >= 60 || this.keys.has('escape')) {
        if (this.twoPlayer) {
          if (this.role === 1) {
            this.score.p2 = this.scoreLimit === Infinity ? this.score.p1 + 1 : this.scoreLimit;
            this.endGame();
          } else {
            this.engine.network.sendArcadeStateSync({ clientSync: true, resign: true });
            this.score.p1 = this.scoreLimit === Infinity ? this.score.p2 + 1 : this.scoreLimit;
            this.endGame();
          }
        } else {
          this.score.p2 = this.scoreLimit === Infinity ? this.score.p1 + 1 : this.scoreLimit;
          this.endGame();
        }
        this.keys.delete('escape');
        this.afkTimer = 0;
        return;
      }
    }

    const speed = 200;

    if (this.role === 1) {
      if (this.keys.has('w') || this.keys.has('arrowup')) this.p1Y -= speed * dt;
      if (this.keys.has('s') || this.keys.has('arrowdown')) this.p1Y += speed * dt;
      this.p1Y = Math.max(0, Math.min(this.height - this.paddleH, this.p1Y));
    } else if (this.role === 2) {
      if (this.keys.has('w') || this.keys.has('arrowup')) this.p2Y -= speed * dt;
      if (this.keys.has('s') || this.keys.has('arrowdown')) this.p2Y += speed * dt;
      this.p2Y = Math.max(0, Math.min(this.height - this.paddleH, this.p2Y));
    }

    if (!this.twoPlayer) {
      let aiSpeed = 100;
      if (this.difficulty === 1) aiSpeed = 160;
      if (this.difficulty === 2) aiSpeed = 240;

      if (this.ball.vx > 0) {
        let targetY = this.ball.y;
        if (this.difficulty === 0 && Math.random() < 0.05) targetY = this.height / 2;

        if (targetY < this.p2Y + this.paddleH / 2 - 4) this.p2Y -= aiSpeed * dt;
        if (targetY > this.p2Y + this.paddleH / 2 + 4) this.p2Y += aiSpeed * dt;
      } else {
        let targetY = this.height / 2 - this.paddleH / 2;
        if (targetY < this.p2Y) this.p2Y -= (aiSpeed * 0.5) * dt;
        if (targetY > this.p2Y) this.p2Y += (aiSpeed * 0.5) * dt;
      }
      this.p2Y = Math.max(0, Math.min(this.height - this.paddleH, this.p2Y));
    }

    if (this.role === 1) {
      if (this.isServing) {
        this.ball.vx = 0;
        this.ball.vy = 0;
        if (this.serverSide === 1) {
          this.ball.x = 10 + this.paddleW + 2;
          this.ball.y = this.p1Y + this.paddleH / 2 - this.ball.size / 2;
          if (this.keys.has(' ')) {
            this.isServing = false;
            this.resetBall(1);
            this.keys.delete(' ');
          }
        } else {
          this.ball.x = this.width - 10 - this.paddleW - this.ball.size - 2;
          this.ball.y = this.p2Y + this.paddleH / 2 - this.ball.size / 2;

          if (!this.twoPlayer) {
            this.serveTimer -= dt;
            if (this.serveTimer <= 0) {
              this.isServing = false;
              this.resetBall(-1);
            }
          }
        }
      } else {
        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;

        if (this.ball.y <= 0 || this.ball.y >= this.height - this.ball.size) {
          this.ball.vy *= -1;
          this.ball.y = Math.max(0, Math.min(this.height - this.ball.size, this.ball.y));
          this.audio.blip(false);
        }

        const checkPaddle = (px, py) => {
          return this.ball.x < px + this.paddleW && this.ball.x + this.ball.size > px &&
            this.ball.y < py + this.paddleH && this.ball.y + this.ball.size > py;
        };

        if (checkPaddle(10, this.p1Y) && this.ball.vx < 0) {
          this.ball.vx *= -1.05;
          this.ball.x = 10 + this.paddleW;
          this.audio.blip(true);
          this.rally++;
          if (this.rally > this.maxRally) this.maxRally = this.rally;
        }
        if (checkPaddle(this.width - 10 - this.paddleW, this.p2Y) && this.ball.vx > 0) {
          this.ball.vx *= -1.05;
          this.ball.x = this.width - 10 - this.paddleW - this.ball.size;
          this.audio.blip(true);
          this.rally++;
          if (this.rally > this.maxRally) this.maxRally = this.rally;
        }

        if (this.ball.x < 0) {
          this.score.p2++;
          this.audio.explosion();
          this.rally = 0;
          if (this.score.p2 >= this.scoreLimit) {
            this.endGame();
          } else {
            this.isServing = true;
            this.serverSide = 1;
          }
        }
        if (this.ball.x > this.width) {
          this.score.p1++;
          this.audio.explosion();
          this.rally = 0;
          if (this.score.p1 >= this.scoreLimit) {
            this.endGame();
          } else {
            this.isServing = true;
            this.serverSide = -1;
            this.serveTimer = 1.0;
          }
        }
      }
    } else if (this.role === 2) {
      if (this.isServing && this.serverSide === -1 && this.keys.has(' ')) {
        this.engine.network.sendArcadeStateSync({ clientSync: true, p2Y: this.p2Y, action: 'serve' });
        this.keys.delete(' ');
      }
    }

    if (this.twoPlayer) {
      this.syncTimer -= dt;
      if (this.syncTimer <= 0) {
        this.syncTimer = 0.05;
        if (this.role === 1) {
          this.engine.network.sendArcadeStateSync({
            hostSync: true,
            ball: this.ball, p1Y: this.p1Y, score: this.score,
            isServing: this.isServing, serverSide: this.serverSide,
            gameover: this.gameState === 'gameover',
            scoreLimit: this.scoreLimit,
            rally: this.rally, maxRally: this.maxRally
          });
        } else if (this.role === 2) {
          this.engine.network.sendArcadeStateSync({
            clientSync: true, p2Y: this.p2Y
          });
        }
      }
    }
  }

  resetBall(dir) {
    let baseSpeed = 150;
    if (!this.twoPlayer) {
      if (this.difficulty === 0) baseSpeed = 100;
      else if (this.difficulty === 1) baseSpeed = 150;
      else if (this.difficulty === 2) baseSpeed = 220;
    }

    this.ball.vx = baseSpeed * dir;
    this.ball.vy = (Math.random() > 0.5 ? 1 : -1) * (baseSpeed * 0.6 + Math.random() * (baseSpeed * 0.4));
  }

  draw() {
    this.ctx.fillStyle = '#0b0e14';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameState === 'title') {
      this.ctx.fillStyle = '#3498db';
      this.ctx.font = 'bold 48px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('BONK', this.width / 2, 60);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px monospace';

      if (this.menuPhase === 0) {
        const options = ['1P: EASY', '1P: NORMAL', '1P: HARD', '2P: NETWORKED'];
        options.forEach((opt, idx) => {
          this.ctx.fillStyle = this.menuSelection === idx ? '#f1c40f' : '#fff';
          this.ctx.fillText(opt, this.width / 2, 110 + idx * 25);
        });
      } else {
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillText('SCORE LIMIT', this.width / 2, 100);
        this.ctx.font = 'bold 16px monospace';
        const options = ['BEST OF 3', 'BEST OF 5', 'INFINITE'];
        options.forEach((opt, idx) => {
          this.ctx.fillStyle = this.menuSelection === idx ? '#f1c40f' : '#fff';
          this.ctx.fillText(opt, this.width / 2, 125 + idx * 25);
        });
      }

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE TO SELECT', this.width / 2, 210);
      }
      if (this.menuPhase === 1) {
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText('ESC TO GO BACK', this.width / 2, 225);
      }

      const hs = this.engine.arcadeScores?.['bonk'];
      if (hs && hs.score > 0) {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillText(`HIGH SCORE: ${hs.score} BY ${hs.player}`, this.width / 2, 230);
      }
      return;
    } else if (this.gameState === 'queueing') {
      this.ctx.fillStyle = '#3498db';
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('MATCHMAKING', this.width / 2, this.height / 2 - 20);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      const dots = '.'.repeat(Math.floor(performance.now() / 400) % 4);
      this.ctx.fillText('WAITING FOR OPPONENT' + dots, this.width / 2, this.height / 2 + 10);
      this.ctx.fillText('PRESS ESC TO CANCEL', this.width / 2, this.height / 2 + 40);
      return;
    }

    this.ctx.fillStyle = '#333';
    for (let i = 0; i < this.height; i += 20) this.ctx.fillRect(this.width / 2 - 2, i, 4, 10);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.score.p1, this.width / 4, 40);
    this.ctx.fillText(this.score.p2, (this.width / 4) * 3, 40);
    this.ctx.fillStyle = '#3498db'; this.ctx.fillRect(10, this.p1Y, this.paddleW, this.paddleH);
    this.ctx.fillStyle = '#e74c3c'; this.ctx.fillRect(this.width - 10 - this.paddleW, this.p2Y, this.paddleW, this.paddleH);

    if (this.isServing) {
      if ((this.serverSide === 1 && this.role === 1) || (this.serverSide === -1 && (this.role === 2 || !this.twoPlayer))) {
        if (Math.floor(performance.now() / 300) % 2 === 0) {
          this.ctx.fillStyle = '#f1c40f';
          this.ctx.font = 'bold 10px monospace';
          if (this.serverSide === 1) this.ctx.fillText('SPACE', 30 + this.paddleW, this.p1Y - 5);
          else this.ctx.fillText('SPACE', this.width - 30 - this.paddleW, this.p2Y - 5);
        }
      }
    }

    if (this.gameState === 'playing') {
      this.ctx.fillStyle = '#f1c40f'; this.ctx.fillRect(this.ball.x, this.ball.y, this.ball.size, this.ball.size);
    }

    if (this.gameState === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = this.score.p1 >= this.score.p2 ? '#3498db' : '#e74c3c';
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';

      let winText = '';
      if (this.twoPlayer) {
        winText = this.score.p1 > this.score.p2 ? 'P1 WINS' : 'P2 WINS';
        if (this.score.p1 === this.score.p2) winText = 'DRAW';
      } else {
        winText = this.score.p1 > this.score.p2 ? 'VICTORY' : 'DEFEAT';
      }
      this.ctx.fillText(winText, this.width / 2, this.height / 2 - 20);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText(`SCORE: ${this.score.p1} - ${this.score.p2}`, this.width / 2, this.height / 2 + 5);

      this.ctx.font = 'bold 12px monospace';
      this.ctx.fillText(`MAX RALLY: ${this.maxRally}`, this.width / 2, this.height / 2 + 25);

      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 45);
      }
    }
  }
}
