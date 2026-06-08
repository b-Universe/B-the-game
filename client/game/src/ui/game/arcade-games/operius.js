export class OperiusVM {
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

    this.fov = 120;
    this.radius = 60;
    this.sides = 8; // Classic Operius Octagon!
    this.ringSpacing = 30;
    this.drawDist = 40; // Number of rings

    this.reset();
  }

  reset() {
    this.gameState = 'title';
    this.menuSelection = 0;
    this.difficulty = 0; // 0: Normal, 1: Hard, 2: Insane

    this.score = 0;
    this.lives = 3;
    this.scoreSubmitted = false;
    this.shake = 0;
    this.sector = 1;
    this.gateFlash = 0;
    this.boostTimer = 0;
    this.currentBoost = 1.0;

    this.time = 0;
    this.cameraZ = 0;
    this.baseSpeed = 200;
    this.speedMult = 1.0;
    this.playerAngle = Math.PI / 2; // Bottom of the screen

    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.floatingScores = [];
    this.fov = 120;

    this.fireCooldown = 0;
    this.enemySpawnTimer = 2.0;
  }

  startGame() {
    this.scoreSubmitted = false;
    this.score = 0;
    this.lives = 3;
    this.time = 0;
    this.cameraZ = 0;
    this.speedMult = this.difficulty === 0 ? 1.0 : (this.difficulty === 1 ? 2.0 : 3.5);
    this.currentBoost = 1.0;

    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.floatingScores = [];

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

  spawnEnemy() {
    const spawnZ = this.cameraZ + this.drawDist * this.ringSpacing;
    const segment = Math.floor(Math.random() * this.sides);
    const segmentAngle = (Math.PI * 2) / this.sides;
    const angle = segment * segmentAngle + (segmentAngle / 2); // Center of the segment

    let type = 'barrier'; // Default for Sector 1
    const rand = Math.random();

    if (this.sector >= 20) {
      if (rand > 0.8) type = 'gate';
      else if (rand > 0.6) type = 'barrier';
      else if (rand > 0.45) type = 'ramp';
      else if (rand > 0.25) type = 'tank';
      else type = 'shooter'; // 3D Pyramids that shoot
    } else if (this.sector >= 6) {
      if (rand > 0.8) type = 'barrier';
      else if (rand > 0.6) type = 'ramp';
      else if (rand > 0.3) type = 'tank';
      else type = 'shooter'; // 3D Pyramids that shoot
    } else if (this.sector >= 2) {
      if (rand > 0.8) type = 'barrier';
      else if (rand > 0.6) type = 'ramp';
      else type = 'pyramid'; // 3D Pyramids that don't shoot
    } else {
      if (rand > 0.7) type = 'ramp';
    }

    this.enemies.push({
      z: spawnZ,
      angle: angle,
      segment: segment,
      type: type,
      hp: this.difficulty === 0 ? 1 : 2,
      lastFire: 0,
      passed: false
    });
  }

  project(angle, zDepth, radiusOffset = 0) {
    // Calculate how much the tube bends at this depth, escalating per Sector
    const bendMult = Math.max(0, (this.sector - 1) * 0.01);
    const bendX = Math.sin(zDepth * 0.005 + this.time * 2) * (zDepth * bendMult);
    const bendY = Math.cos(zDepth * 0.003 + this.time * 1.5) * (zDepth * bendMult);

    // Apply the camera rotation (so the player stays anchored at the bottom)
    const effectiveAngle = angle - this.playerAngle + (Math.PI / 2);
    const r = this.radius + radiusOffset;

    const x = Math.cos(effectiveAngle) * r + bendX;
    const y = Math.sin(effectiveAngle) * r + bendY;

    // Ensure we don't divide by zero or negative
    const safeZ = Math.max(1, zDepth);
    const scale = this.fov / safeZ;

    return {
      x: this.width / 2 + x * scale,
      y: this.height / 2 + y * scale,
      scale: scale
    };
  }

  die() {
    this.audio.explosion();
    this.lives--;
    this.shake = 15;

    for (let i = 0; i < 20; i++) {
      this.particles.push({
        z: this.cameraZ + 20, angle: this.playerAngle + (Math.random() - 0.5),
        vz: -50, vAngle: (Math.random() - 0.5) * 2, life: 1.0, color: '#e74c3c'
      });
    }

    if (this.lives <= 0) {
      this.gameState = 'gameover';
      this.inputLockTimer = 1.0;
      if (!this.scoreSubmitted && this.score > 0) {
        this.engine.network.sendArcadeScore('operius', this.score);
        this.scoreSubmitted = true;
      }
    } else {
      // Clear immediate threats
      this.enemies = this.enemies.filter(e => e.z > this.cameraZ + 200);
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
        this.engine.network.sendArcadeScore('operius', this.score);
        this.scoreSubmitted = true;
      }
      this.reset();
      this.inputLockTimer = 0.5;
      return;
    }

    if (this.inputLockTimer > 0) this.inputLockTimer -= dt;
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.gateFlash > 0) this.gateFlash = Math.max(0, this.gateFlash - dt * 2);
    if (this.boostTimer > 0) this.boostTimer -= dt;
    this.sector = Math.floor(this.cameraZ / 8000) + 1; // Increase Sector length

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
      this.cameraZ += this.baseSpeed * dt * 0.5; // Slow movement for title screen
      return;
    } else if (this.gameState === 'gameover') {
      if (this.keys.has(' ') && this.inputLockTimer <= 0) {
        this.reset();
        this.keys.delete(' ');
        this.inputLockTimer = 0.5;
      }
      this.cameraZ += this.baseSpeed * dt * 0.1; // Crawl to a halt
      return;
    }

    // -- Playing State --

    let targetBoost = 1.0;
    if (this.keys.has('shift')) targetBoost *= 2.0;
    if (this.boostTimer > 0) targetBoost *= 2.0;

    // Smoothly interpolate currentBoost towards targetBoost for a "hyper-drive" feel
    this.currentBoost += (targetBoost - this.currentBoost) * 5 * dt;

    // Dynamic FOV for speed sensation
    const targetFov = 120 + (this.currentBoost - 1.0) * 20;
    this.fov += (targetFov - this.fov) * 10 * dt;

    const currentSpeed = this.baseSpeed * this.speedMult * this.currentBoost;
    this.cameraZ += currentSpeed * dt;
    this.speedMult += dt * 0.005; // Slowly increase difficulty over time
    this.score += currentSpeed * dt * 0.1;

    // Player Movement
    const moveSpeed = 3.0 * dt;
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.playerAngle += moveSpeed;
    if (this.keys.has('d') || this.keys.has('arrowright')) this.playerAngle -= moveSpeed;

    // Normalize angle
    if (this.playerAngle < 0) this.playerAngle += Math.PI * 2;
    if (this.playerAngle >= Math.PI * 2) this.playerAngle -= Math.PI * 2;

    // Shooting
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.keys.has(' ') && this.fireCooldown <= 0) {
      this.bullets.push({ z: this.cameraZ + 70, angle: this.playerAngle, isPlayer: true });
      this.fireCooldown = 0.15;
      this.audio.shoot();
    }

    // Spawning
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer = (1.5 + Math.random()) / this.speedMult;
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.isPlayer) {
        b.z += (currentSpeed + 800) * dt; // Scale bullet speed with camera to prevent outrunning them
        if (b.z > this.cameraZ + this.drawDist * this.ringSpacing) this.bullets.splice(i, 1);
      } else {
        b.z -= 400 * dt; // Enemy bullet flies at camera
        if (b.z < this.cameraZ) {
          // Check hit player
          const angleDiff = Math.abs(b.angle - this.playerAngle);
          if (angleDiff < 0.2 || angleDiff > Math.PI * 2 - 0.2) {
            this.die();
          }
          this.bullets.splice(i, 1);
        }
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const relZ = e.z - this.cameraZ;

      // Collision with player (Widened slightly to catch high-speed misses)
      if (relZ < 20 && relZ > -20) {
        const angleDiff = Math.abs(e.angle - this.playerAngle);
        if (e.type === 'gate') {
          // Must pass cleanly through the hole in the gate
          if (angleDiff > 0.35 && angleDiff < Math.PI * 2 - 0.35) {
            this.die();
          } else if (!e.passed) {
            e.passed = true;
            this.score += 500;
            this.audio.coin();
            this.gateFlash = 1.0;

            const projPt = this.project(e.angle, Math.max(1, relZ));
            this.floatingScores.push({ x: projPt.x, y: projPt.y - 20, text: '+500', life: 1.0 });
          }
        } else if (e.type === 'ramp') {
          if (angleDiff < 0.45 || angleDiff > Math.PI * 2 - 0.45) {
            if (!e.passed) {
              e.passed = true;
              this.boostTimer = 1.0;
              this.score += 200;
              this.audio.playTone('square', 800, 1200, 0.2, 0.1);

              const projPt = this.project(e.angle, Math.max(1, relZ));
              this.floatingScores.push({ x: projPt.x, y: projPt.y - 20, text: 'BOOST!', life: 1.0 });

              for (let p = 0; p < 10; p++) {
                this.particles.push({
                  z: this.cameraZ + 20, angle: this.playerAngle + (Math.random() - 0.5) * 0.5,
                  vz: 100, vAngle: (Math.random() - 0.5), life: 0.5, color: '#3498db'
                });
              }
            }
          }
        } else if (e.type === 'barrier') {
          if (angleDiff < 0.45 || angleDiff > Math.PI * 2 - 0.45) {
            this.die();
          }
        } else {
          // Crashing into a block/shooter
          if (angleDiff < 0.3 || angleDiff > Math.PI * 2 - 0.3) {
            this.die();
          }
        }
      }

      // Despawn passed enemies
      if (relZ < -50) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Hit by bullet
      let hit = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (b.isPlayer && Math.abs(b.z - e.z) < 30) {
          if (e.type === 'gate' || e.type === 'ramp') continue; // Bullets pass through gates and ramps harmlessly

          const angleDiff = Math.abs(b.angle - e.angle);
          const hitThreshold = e.type === 'barrier' ? 0.4 : 0.2;

          if (angleDiff < hitThreshold || angleDiff > Math.PI * 2 - hitThreshold) {
            if (e.type === 'barrier') {
              this.bullets.splice(j, 1);
              this.audio.blip(true);
              break;
            } else {
              e.hp--;
              this.bullets.splice(j, 1);
              if (e.hp <= 0) {
                hit = true;
                const pts = (e.type === 'shooter' || e.type === 'tank') ? 500 : 200;
                this.score += pts;
                this.audio.stomp();

                const projPt = this.project(e.angle, Math.max(1, relZ));
                this.floatingScores.push({ x: projPt.x, y: projPt.y, text: `+${pts}`, life: 1.0 });

                for (let p = 0; p < 8; p++) {
                  this.particles.push({
                    z: e.z, angle: e.angle,
                    vz: (Math.random() - 0.5) * 100, vAngle: (Math.random() - 0.5) * 2,
                    life: 0.5, color: '#f1c40f'
                  });
                }
              } else {
                this.audio.blip(true); // Hit sound
              }
              break;
            }
          }
        }
      }

      if (hit) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Enemy logic
      if ((e.type === 'shooter' || e.type === 'tank') && relZ < 300) {
        e.lastFire += dt;
        if (e.lastFire > 1.0) {
          e.lastFire = 0;
          this.bullets.push({ z: e.z, angle: e.angle, isPlayer: false });
          this.audio.playTone('square', 300, 100, 0.1, 0.05);
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.z += p.vz * dt;
      p.angle += p.vAngle * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Floating scores
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.y -= 15 * dt; // Move up
      fs.life -= dt;
      if (fs.life <= 0) this.floatingScores.splice(i, 1);
    }
  }

  draw() {
    // Continuous rainbow color generation based on camera depth
    const hue = ((this.cameraZ / 40000) + 0.5) % 1.0;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = 0.6 < 0.5 ? 0.6 * (1 + 0.8) : 0.6 + 0.8 - 0.6 * 0.8;
    const p = 2 * 0.6 - q;
    const cR = Math.round(hue2rgb(p, q, hue + 1 / 3) * 255);
    const cG = Math.round(hue2rgb(p, q, hue) * 255);
    const cB = Math.round(hue2rgb(p, q, hue - 1 / 3) * 255);

    const palette = {
      core: [cR, cG, cB],
      lines: `rgba(${cR}, ${cG}, ${cB}, 0.5)`,
      bg: `rgb(${Math.floor(cR * 0.05)}, ${Math.floor(cG * 0.05)}, ${Math.floor(cB * 0.05)})`
    };

    this.ctx.fillStyle = palette.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    if (this.shake > 0 && this.gameState !== 'title') {
      this.ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // Pre-calculate the geometry for the tube
    const rings = [];
    const startRing = Math.floor(this.cameraZ / this.ringSpacing);

    for (let i = this.drawDist; i >= 0; i--) {
      const ringZ = (startRing + i) * this.ringSpacing;
      const relZ = ringZ - this.cameraZ;
      if (relZ <= 0) continue;

      const ringPoints = [];
      for (let s = 0; s < this.sides; s++) {
        const angle = s * ((Math.PI * 2) / this.sides);
        ringPoints.push(this.project(angle, relZ));
      }
      rings.push(ringPoints);
    }

    // Draw infinite center void to cover particles and draw vanishing web
    if (rings.length > 0) {
      const farRing = rings[0];
      const farZ = (startRing + this.drawDist) * this.ringSpacing - this.cameraZ;
      const centerPt = this.project(0, farZ, -this.radius);

      this.ctx.fillStyle = palette.bg;
      this.ctx.beginPath();
      this.ctx.moveTo(farRing[0].x, farRing[0].y);
      for (let s = 1; s < this.sides; s++) {
        this.ctx.lineTo(farRing[s].x, farRing[s].y);
      }
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = palette.lines;
      this.ctx.beginPath();
      for (let s = 0; s < this.sides; s++) {
        this.ctx.moveTo(farRing[s].x, farRing[s].y);
        this.ctx.lineTo(centerPt.x, centerPt.y);
      }
      this.ctx.stroke();
    }

    this.ctx.lineWidth = 1.5;

    // Draw longitudinal connecting lines
    if (rings.length > 1) {
      this.ctx.strokeStyle = palette.lines;
      const firstRing = rings[0];
      const lastRing = rings[rings.length - 1];

      for (let s = 0; s < this.sides; s++) {
        this.ctx.beginPath();
        this.ctx.moveTo(firstRing[s].x, firstRing[s].y);

        // Draw segment by segment to follow the curve accurately
        for (let r = 1; r < rings.length; r++) {
          this.ctx.lineTo(rings[r][s].x, rings[r][s].y);
        }
        this.ctx.stroke();
      }
    }

    // Draw depth rings (Draw back-to-front for pseudo depth-sorting)
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      const depthPerc = r / rings.length; // 0 is far, 1 is close

      this.ctx.strokeStyle = `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${depthPerc})`;
      this.ctx.beginPath();
      this.ctx.moveTo(ring[0].x, ring[0].y);
      for (let s = 1; s < this.sides; s++) {
        this.ctx.lineTo(ring[s].x, ring[s].y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    // Depth-sort and draw entities
    const entities = [];
    this.enemies.forEach(e => entities.push({ ...e, kind: 'enemy' }));
    this.bullets.forEach(b => entities.push({ ...b, kind: 'bullet' }));
    this.particles.forEach(p => entities.push({ ...p, kind: 'particle' }));

    entities.sort((a, b) => b.z - a.z); // Far to near

    entities.forEach(ent => {
      const relZ = ent.z - this.cameraZ;
      if (relZ <= 0) return;

      const p = this.project(ent.angle, relZ);
      const size = Math.max(1, 20 * p.scale);

      if (ent.kind === 'enemy') {
        if (ent.type === 'gate') {
          this.ctx.fillStyle = `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, 0.4)`;
          this.ctx.strokeStyle = `rgb(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]})`;
          this.ctx.lineWidth = Math.max(1, 2 * p.scale);

          for (let s = 0; s < this.sides; s++) {
            const a1 = s * ((Math.PI * 2) / this.sides);
            const a2 = (s + 1) * ((Math.PI * 2) / this.sides);

            if (s === ent.segment) {
              const p1 = this.project(a1, relZ);
              const p2 = this.project(a2, relZ);
              this.ctx.strokeStyle = '#2ecc71';
              this.ctx.beginPath();
              this.ctx.moveTo(p1.x, p1.y);
              this.ctx.lineTo(p2.x, p2.y);
              this.ctx.stroke();
              this.ctx.strokeStyle = `rgb(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]})`;
              continue;
            }

            const p1_out = this.project(a1, relZ);
            const p2_out = this.project(a2, relZ);
            const p1_in = this.project(a1, relZ, -24);
            const p2_in = this.project(a2, relZ, -24);

            this.ctx.beginPath();
            this.ctx.moveTo(p1_out.x, p1_out.y);
            this.ctx.lineTo(p2_out.x, p2_out.y);
            this.ctx.lineTo(p2_in.x, p2_in.y);
            this.ctx.lineTo(p1_in.x, p1_in.y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          }
          this.ctx.lineWidth = 1.5;
        } else if (ent.type === 'barrier') {
          const a1 = ent.segment * ((Math.PI * 2) / this.sides);
          const a2 = (ent.segment + 1) * ((Math.PI * 2) / this.sides);
          const zFront = relZ;
          const zBack = relZ + 20;
          const innerR = -20;

          const f_out1 = this.project(a1, zFront);
          const f_out2 = this.project(a2, zFront);
          const f_in1 = this.project(a1, zFront, innerR);
          const f_in2 = this.project(a2, zFront, innerR);
          const b_in1 = this.project(a1, zBack, innerR);
          const b_in2 = this.project(a2, zBack, innerR);

          this.ctx.fillStyle = `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, 0.8)`;
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = Math.max(1, 1.5 * p.scale);

          this.ctx.beginPath();
          this.ctx.moveTo(f_in1.x, f_in1.y);
          this.ctx.lineTo(f_in2.x, f_in2.y);
          this.ctx.lineTo(b_in2.x, b_in2.y);
          this.ctx.lineTo(b_in1.x, b_in1.y);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.fillStyle = `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, 1.0)`;
          this.ctx.beginPath();
          this.ctx.moveTo(f_out1.x, f_out1.y);
          this.ctx.lineTo(f_out2.x, f_out2.y);
          this.ctx.lineTo(f_in2.x, f_in2.y);
          this.ctx.lineTo(f_in1.x, f_in1.y);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.lineWidth = 1.5;
        } else if (ent.type === 'ramp') {
          const a1 = ent.segment * ((Math.PI * 2) / this.sides);
          const a2 = (ent.segment + 1) * ((Math.PI * 2) / this.sides);
          const aMid = (a1 + a2) / 2;
          const zFront = relZ;
          const zBack = relZ + 20;

          const f1 = this.project(a1, zFront);
          const f2 = this.project(a2, zFront);
          const b1 = this.project(a1, zBack);
          const b2 = this.project(a2, zBack);

          this.ctx.fillStyle = `rgba(52, 152, 219, 0.4)`;
          this.ctx.strokeStyle = '#3498db';
          this.ctx.lineWidth = Math.max(1, 1.5 * p.scale);

          this.ctx.beginPath();
          this.ctx.moveTo(f1.x, f1.y); this.ctx.lineTo(f2.x, f2.y);
          this.ctx.lineTo(b2.x, b2.y); this.ctx.lineTo(b1.x, b1.y);
          this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();

          const tip = this.project(aMid, zBack);
          const lb = this.project(a1 + (aMid - a1) * 0.2, zFront + 2);
          const rb = this.project(a2 - (a2 - aMid) * 0.2, zFront + 2);
          const iv = this.project(aMid, zFront + 8);

          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.moveTo(tip.x, tip.y); this.ctx.lineTo(rb.x, rb.y);
          this.ctx.lineTo(iv.x, iv.y); this.ctx.lineTo(lb.x, lb.y);
          this.ctx.closePath(); this.ctx.fill();
          this.ctx.lineWidth = 1.5;
        } else if (ent.type === 'pyramid' || ent.type === 'shooter') {
          const angleWidth = 0.15;
          const a1 = ent.angle - angleWidth;
          const a2 = ent.angle + angleWidth;
          const zFront = relZ - 10;
          const zBack = relZ + 10;

          const b1 = this.project(a1, zFront);
          const b2 = this.project(a2, zFront);
          const b3 = this.project(a2, zBack);
          const b4 = this.project(a1, zBack);
          const peak = this.project(ent.angle, relZ, -20);

          this.ctx.fillStyle = ent.type === 'shooter' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(230, 126, 34, 0.4)';
          this.ctx.strokeStyle = ent.type === 'shooter' ? '#e74c3c' : '#e67e22';
          this.ctx.lineWidth = Math.max(1, 2 * p.scale);

          const faces = [[b1, b2, peak], [b2, b3, peak], [b3, b4, peak], [b4, b1, peak]];
          faces.forEach(face => {
            this.ctx.beginPath();
            this.ctx.moveTo(face[0].x, face[0].y);
            this.ctx.lineTo(face[1].x, face[1].y);
            this.ctx.lineTo(face[2].x, face[2].y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          });
          this.ctx.lineWidth = 1.5;
        } else if (ent.type === 'tank') {
          const draw3DBox = (ang1, ang2, zF, zB, rOut, rIn, fill, stroke) => {
            const f_out1 = this.project(ang1, zF, rOut);
            const f_out2 = this.project(ang2, zF, rOut);
            const f_in1 = this.project(ang1, zF, rIn);
            const f_in2 = this.project(ang2, zF, rIn);
            const b_out1 = this.project(ang1, zB, rOut);
            const b_out2 = this.project(ang2, zB, rOut);
            const b_in1 = this.project(ang1, zB, rIn);
            const b_in2 = this.project(ang2, zB, rIn);

            this.ctx.fillStyle = fill;
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = Math.max(1, 1.5 * p.scale);

            this.ctx.beginPath();
            this.ctx.moveTo(f_out1.x, f_out1.y); this.ctx.lineTo(f_out2.x, f_out2.y);
            this.ctx.lineTo(f_in2.x, f_in2.y); this.ctx.lineTo(f_in1.x, f_in1.y);
            this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(b_out1.x, b_out1.y); this.ctx.lineTo(b_out2.x, b_out2.y);
            this.ctx.lineTo(b_in2.x, b_in2.y); this.ctx.lineTo(b_in1.x, b_in1.y);
            this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();

            const sides = [
              [f_out1, f_out2, b_out2, b_out1],
              [f_in1, f_in2, b_in2, b_in1],
              [f_out1, f_in1, b_in1, b_out1],
              [f_out2, f_in2, b_in2, b_out2]
            ];
            sides.forEach(s => {
              this.ctx.beginPath();
              this.ctx.moveTo(s[0].x, s[0].y); this.ctx.lineTo(s[1].x, s[1].y);
              this.ctx.lineTo(s[2].x, s[2].y); this.ctx.lineTo(s[3].x, s[3].y);
              this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
            });
          };

          const angleWidthBase = 0.15;
          const angleWidthTop = 0.08;

          draw3DBox(
            ent.angle - angleWidthBase, ent.angle + angleWidthBase,
            relZ - 12, relZ + 12,
            0, -8,
            'rgba(231, 76, 60, 0.4)', '#e74c3c'
          );
          draw3DBox(
            ent.angle - angleWidthTop, ent.angle + angleWidthTop,
            relZ - 6, relZ + 6,
            -8, -16,
            'rgba(231, 76, 60, 0.6)', '#e74c3c'
          );
          this.ctx.lineWidth = 1.5;
        }
      } else if (ent.kind === 'bullet') {
        const bFront = this.project(ent.angle, relZ - 5);
        const bBack = this.project(ent.angle, relZ + 5);

        this.ctx.fillStyle = ent.isPlayer ? '#2ecc71' : '#f1c40f';
        this.ctx.strokeStyle = ent.isPlayer ? '#2ecc71' : '#f1c40f';
        this.ctx.lineWidth = Math.max(2, 4 * p.scale);
        this.ctx.beginPath();
        this.ctx.moveTo(bFront.x, bFront.y);
        this.ctx.lineTo(bBack.x, bBack.y);
        this.ctx.stroke();
      } else if (ent.kind === 'particle') {
        this.ctx.fillStyle = ent.color;
        this.ctx.globalAlpha = ent.life;
        this.ctx.fillRect(p.x - size / 4, p.y - size / 4, size / 2, size / 2);
        this.ctx.globalAlpha = 1.0;
      }
    });

    // Draw Player Ship (Anchored bottom center)
    if (this.gameState !== 'gameover' || this.inputLockTimer > 0) {
      const px = this.width / 2;
      const py = this.height - 30;

      this.ctx.fillStyle = '#2ecc71';
      this.ctx.beginPath();
      this.ctx.moveTo(px, py - 10);
      this.ctx.lineTo(px + 15, py + 10);
      this.ctx.lineTo(px, py + 5);
      this.ctx.lineTo(px - 15, py + 10);
      this.ctx.closePath();
      this.ctx.fill();

      // Thruster
      if (Math.floor(performance.now() / 50) % 2 === 0) {
        this.ctx.fillStyle = '#f39c12';
        this.ctx.beginPath();
        this.ctx.moveTo(px - 4, py + 6);
        this.ctx.lineTo(px + 4, py + 6);
        this.ctx.lineTo(px, py + 16);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    // Draw floating scores
    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'center';
    for (const fs of this.floatingScores) {
      this.ctx.globalAlpha = Math.max(0, fs.life);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(fs.text, fs.x, fs.y);
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();

    if (this.gateFlash > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${this.gateFlash * 0.3})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    // UI Overlays
    if (this.gameState === 'title') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.fillStyle = `rgb(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]})`;
      this.ctx.font = 'bold 36px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('OPERIUS', this.width / 2, this.height / 2 - 40);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px monospace';
      const options = ['NORMAL', 'HARD', 'INSANE'];
      options.forEach((opt, idx) => {
        this.ctx.fillStyle = this.menuSelection === idx ? '#f1c40f' : '#fff';
        this.ctx.fillText(opt, this.width / 2, this.height / 2 + 10 + idx * 25);
      });

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE TO START', this.width / 2, this.height / 2 + 90);
      }

      const hs = this.engine.arcadeScores?.['operius'];
      if (hs && hs.score > 0) {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`HIGH SCORE: ${Math.floor(hs.score)}`, this.width / 2, 20);
      }
    } else if (this.gameState === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 10);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.fillText(`FINAL SCORE: ${Math.floor(this.score)}`, this.width / 2, this.height / 2 + 20);

      if (this.inputLockTimer <= 0 && Math.floor(performance.now() / 500) % 2 === 0) {
        this.ctx.fillText('PRESS SPACE', this.width / 2, this.height / 2 + 60);
      }
    }

    if (this.gameState !== 'title') {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`SCORE: ${Math.floor(this.score)}`, 5, 12);
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`SECTOR: ${this.sector}`, this.width / 2, 12);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`LIVES: ${this.lives}`, this.width - 5, 12);

      const totalSpeed = this.speedMult * this.currentBoost;
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = this.currentBoost > 1.1 ? '#3498db' : '#aaa';
      this.ctx.fillText(`SPEED: x${totalSpeed.toFixed(2)}`, 5, this.height - 12);

      const barW = 50;
      const boostPct = Math.max(0, (this.currentBoost - 1.0));
      this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
      this.ctx.fillRect(5, this.height - 8, barW, 3);
      this.ctx.fillStyle = this.currentBoost > 1.9 ? '#e74c3c' : '#3498db';
      this.ctx.fillRect(5, this.height - 8, barW * boostPct, 3);
    }
  }
}
