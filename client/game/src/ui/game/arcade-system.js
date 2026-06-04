import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { PixelVM } from './arcade-games/pixel.js?v=cache-bust-005';
import { BonkVM } from './arcade-games/pong.js?v=cache-bust-005';
import { InvadersVM } from './arcade-games/invaders.js?v=cache-bust-005';
import { BmanVM } from './arcade-games/b-man.js?v=cache-bust-005';
import { FlappyBeeVM } from './arcade-games/flappy-bee.js?v=cache-bust-005';
import { PixelCrossVM } from './arcade-games/pixel-cross.js?v=cache-bust-005';
import { BepisVM } from './arcade-games/bepis.js?v=cache-bust-005';
import { OperiusVM } from './arcade-games/operius.js?v=cache-bust-005';
import { NumberMunchersVM } from './arcade-games/number-munchers.js?v=cache-bust-005';

export class CameraManager {
    constructor(engine) {
        this.engine = engine;
        this.mode = 'world';
        this.transitionProgress = 0;
        this.savedCameraPos = new THREE.Vector3();
        this.targetFocus = new THREE.Vector3();
        this.targetDir = 's';
        this.savedCameraZoom = 1;
        this.savedCameraQuat = new THREE.Quaternion();
        this.targetCamPos = new THREE.Vector3();
        this.targetCameraQuat = new THREE.Quaternion();
    }

    startTransition(targetX, targetY, targetZ, dir) {
        this.targetFocus.set(targetX, targetY, targetZ + 16);
        this.targetDir = dir || 's';
        this.mode = 'transition_in';
        this.transitionProgress = 0;

        const cam = this.engine.renderer.camera;
        this.savedCameraPos.copy(cam.position);
        this.savedCameraQuat.copy(cam.quaternion);
        this.savedCameraZoom = cam.zoom;

        let offsetX = 0, offsetY = 0;
        if (this.targetDir === 'n') offsetY = -32;
        else if (this.targetDir === 's') offsetY = 32;
        else if (this.targetDir === 'e') offsetX = 32;
        else if (this.targetDir === 'w') offsetX = -32;
        else { offsetY = 32; }

        this.targetCamPos.set(this.targetFocus.x + offsetX, this.targetFocus.y + offsetY, this.targetFocus.z);

        const dummyObj = new THREE.Object3D();
        dummyObj.position.copy(this.targetCamPos);
        dummyObj.lookAt(this.targetFocus.x, this.targetFocus.y, this.targetFocus.z + 8);
        this.targetCameraQuat.copy(dummyObj.quaternion);
    }

    exitTransition() {
        this.mode = 'transition_out';
        this.transitionProgress = 0;
    }

    update(dt) {
        if (this.mode === 'transition_in' || this.mode === 'transition_out') {
            this.transitionProgress += dt / 1000;
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.mode = this.mode === 'transition_in' ? 'arcade' : 'world';
            }
        }
    }

    applyOverride(camera) {
        if (this.mode === 'world') return false;

        let t = this.transitionProgress;
        t = t * t * (3 - 2 * t);

        if (this.mode === 'transition_in') {
            camera.position.lerpVectors(this.savedCameraPos, this.targetCamPos, t);
            camera.quaternion.slerpQuaternions(this.savedCameraQuat, this.targetCameraQuat, t);
            camera.zoom = THREE.MathUtils.lerp(this.savedCameraZoom, 8.0, t);
        } else if (this.mode === 'transition_out') {
            camera.position.lerpVectors(this.targetCamPos, this.savedCameraPos, t);
            camera.quaternion.slerpQuaternions(this.targetCameraQuat, this.savedCameraQuat, t);
            camera.zoom = THREE.MathUtils.lerp(8.0, this.savedCameraZoom, t);
        } else if (this.mode === 'arcade') {
            camera.position.copy(this.targetCamPos);
            camera.quaternion.copy(this.targetCameraQuat);
            camera.zoom = 8.0;
        }

        camera.updateProjectionMatrix();
        return true;
    }
}

export class VirtualScreen {
    constructor(width = 256, height = 256) {
        this.canvas = new OffscreenCanvas(width, height);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.ctx.imageSmoothingEnabled = false;

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.magFilter = THREE.NearestFilter;

        this.material = new THREE.MeshBasicMaterial({ map: this.texture });
    }

    drawCRTEffect() {
        this.ctx.save();
        // Scanlines
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let i = 0; i < this.canvas.height; i += 3) {
            this.ctx.fillRect(0, i, this.canvas.width, 1);
        }
        // Vignette
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 4,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    refresh() {
        this.texture.needsUpdate = true;
    }
}

export class ArcadeAudio {
    constructor(engine) {
        this.engine = engine;
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(type, startFreq, endFreq, duration, vol = 0.1) {

      if (this.engine && this.engine.clientSettings && this.engine.clientSettings.muteArcadeSounds) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        if (endFreq && endFreq !== startFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    jump() { this.playTone('square', 150, 300, 0.15, 0.05); }
    coin() { this.playTone('square', 800, 800, 0.1, 0.05); setTimeout(() => this.playTone('square', 1200, 1200, 0.1, 0.05), 100); }
    stomp() { this.playTone('square', 150, 50, 0.15, 0.05); }
    explosion() { this.playTone('sawtooth', 100, 10, 0.3, 0.1); }
    shoot() { this.playTone('square', 600, 200, 0.1, 0.05); }
    blip(high) { this.playTone('square', high ? 400 : 200, high ? 400 : 200, 0.1, 0.05); }
    levelClear() {
        if (this.engine && this.engine.clientSettings && this.engine.clientSettings.muteArcadeSounds) return;
        this.playTone('square', 440, 440, 0.1, 0.05); // Da
        setTimeout(() => this.playTone('square', 440, 440, 0.1, 0.05), 120); // da
        setTimeout(() => this.playTone('square', 440, 440, 0.1, 0.05), 240); // da
        setTimeout(() => this.playTone('square', 587.33, 587.33, 0.4, 0.05), 360); // DAA!
    }
    death() { if (this.engine && this.engine.clientSettings && this.engine.clientSettings.muteArcadeSounds) return; if (this.engine) { this.engine.playSound('assets/audio/sfx/death.wav', 0.5); } else { this.explosion(); } }
}

export class ArcadeVMFactory {
    static create(gameId, virtualScreen, audio, engine) {
        switch (gameId) {
            case 'pong': return new BonkVM(virtualScreen, audio, engine);
            case 'invaders': return new InvadersVM(virtualScreen, audio, engine);
            case 'b-man': return new BmanVM(virtualScreen, audio, engine);
            case 'flappy-bee': return new FlappyBeeVM(virtualScreen, audio, engine);
            case 'pixel-cross': return new PixelCrossVM(virtualScreen, audio, engine);
            case 'bepis': return new BepisVM(virtualScreen, audio, engine);
            case 'operius': return new OperiusVM(virtualScreen, audio, engine);
            case 'number-munchers': return new NumberMunchersVM(virtualScreen, audio, engine);
            case 'pixel': default: return new PixelVM(virtualScreen, audio, engine);
        }
    }
}

export class ArcadeSystem {
    constructor(engine) {
        this.engine = engine;
        this.cameraManager = new CameraManager(engine);
        this.virtualScreen = new VirtualScreen(256, 256);
        this.audio = new ArcadeAudio(engine);
        this.vm = null;
        this.originalBg = null;
        this.bgPos = null;
        this.isActive = false;
        this.nearestCabinet = null;

        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = 512;
        this.overlayCanvas.height = 512;
        this.overlayCanvas.style.cssText = 'position: absolute; top: 50%; left: 50%; width: 100vmin; height: 80vmin; transform: translate(-50%, -50%); z-index: 1000000; display: none; border: 4px solid #3498db; border-radius: 8px; box-shadow: 0 0 40px rgba(0,0,0,0.9); image-rendering: pixelated;';
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) gameScreen.appendChild(this.overlayCanvas);
        else document.body.appendChild(this.overlayCanvas);
        this.overlayCtx = this.overlayCanvas.getContext('2d', { alpha: false });
        this.overlayCtx.imageSmoothingEnabled = false;
    }

    findNearestCabinet() {
        const eng = this.engine;
        const px = eng.player.x;
        const py = eng.player.y;
        const pz = eng.player.z || 0;
        let nearest = null;
        let minDist = 150;

        for (let dx = -128; dx <= 128; dx += 32) {
            for (let dy = -128; dy <= 128; dy += 32) {
                for (let dz = -64; dz <= 64; dz += 32) {
                    const vx = Math.round((px + dx) / 32) * 32;
                    const vy = Math.round((py + dy) / 32) * 32;
                    const vz = Math.round((pz + dz) / 32) * 32;

                    const voxel = eng.mapManager.getVoxelAt(vx, vy, vz);
                    if (voxel && voxel.shape === 'arcade-box-1') {
                        const dist = Math.hypot(vx - px, vy - py);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = { x: vx, y: vy, z: vz, dir: voxel.dir, gameId: voxel.gameId || 'pixel', powerState: voxel.powerState || 'on', customName: voxel.customName };
                        }
                    }
                }
            }
        }
        return nearest;
    }

    interact(x, y, z, dir, gameId = 'pixel') {
        if (this.isActive) return;

        const voxel = this.engine.mapManager.getVoxelAt(x, y, z);
        if (voxel && voxel.powerState === 'off') {
            this.engine.chat.addMessage('system', 'System', 'This arcade cabinet is currently powered off.');
            return;
        }

        this.isActive = true;
        this.cameraManager.startTransition(x, y, z, dir);

        this.vm = ArcadeVMFactory.create(gameId, this.virtualScreen, this.audio, this.engine);
        this.vm.start();

        if (this.engine.renderer.createArcadeScreen) {
            this.physicalScreen = this.engine.renderer.createArcadeScreen(x, y, z, dir, this.virtualScreen.canvas);
        }
    }

    exit() {
        if (!this.isActive) return;
        this.isActive = false;
        this.cameraManager.exitTransition();
        if (this.vm) this.vm.stop();
        this.overlayCanvas.style.display = 'none';

        if (this.physicalScreen) {
            this.engine.renderer.scene.remove(this.physicalScreen.group);
            this.physicalScreen = null;
        }
    }

    update(dt) {
        this.cameraManager.update(dt);

        if (!this.isActive) {
            this.nearestCabinet = this.findNearestCabinet();
        } else {
            this.nearestCabinet = null;
        }

        if (this.vm && this.vm.isRunning) {
            try {
                this.vm.update(dt / 1000);
                this.vm.draw();

                if (this.engine.clientSettings.enableArcadeCRT !== false && !this.vm.handlesCRT) {
                    this.virtualScreen.drawCRTEffect();
                }

                if (this.cameraManager.mode === 'arcade') {
                    this.overlayCanvas.style.display = 'block';
                    this.overlayCtx.drawImage(this.virtualScreen.canvas, 0, 0, 512, 512);

                    // Draw crisp, high-res UI text directly on the 512x512 overlay!
                    this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    this.overlayCtx.fillRect(0, 512 - 24, 512, 24);
                    this.overlayCtx.fillStyle = '#ccc';
                    this.overlayCtx.font = 'bold 12px monospace';
                    this.overlayCtx.textAlign = 'left';
                    const showQ = this.vm.gameState && this.vm.gameState !== 'title' && this.vm.gameState !== 'queueing';
                    this.overlayCtx.fillText(showQ ? '[ESC] LEAVE  [Q] MENU' : '[ESC] LEAVE', 10, 512 - 8);
                    this.overlayCtx.textAlign = 'right';
                    this.overlayCtx.fillText(`[C] CRT: ${this.engine.clientSettings.enableArcadeCRT !== false ? 'ON' : 'OFF'}`, 512 - 10, 512 - 8);

                    if (this.physicalScreen) {
                        this.physicalScreen.group.visible = false;
                    }
                } else {
                    this.overlayCanvas.style.display = 'none';

                    if (this.physicalScreen) {
                        this.physicalScreen.group.visible = true;
                        this.physicalScreen.texture.needsUpdate = true;
                    }
                }
            } catch (err) {
                console.error(`[ArcadeSystem] ${this.vm.constructor.name} crashed! Safely isolating...`, err);
                this.exit();
                return;
            }
        }
    }

    handleInput(e, isDown) {
        if (this.cameraManager.mode !== 'world') {
            if (!isDown && e.key === 'Escape') {
                this.exit();
                return true;
            }
            if (this.vm) {
                this.vm.handleInput(e.key, isDown);
            }
            return true;
        }
        return false;
    }
}
