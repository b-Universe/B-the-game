import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';

export class AssetManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.engine = renderer.engine;

    this.textures = {};
    this.atlasMap = {};
    this.modelMeshes = {};
    this.previewModelMeshes = {};
    this.modelCounts = {};
    this.animatedTiles = [];
    this.atlasCtx = null;
    this.atlasTexture = null;
    this.assetsPending = 0;
    this.assetsInitialized = false;

    this.knownSpriteMeta = {
      'cast_energy': { frames: 4, speed: 100 },
      'proj_plasma': { frames: 2, speed: 50 },
      'impact_plasma': { frames: 3, speed: 80 },
      'cast_fire': { frames: 5, speed: 100 },
      'proj_fireball': { frames: 3, speed: 60 },
      'impact_explosion': { frames: 6, speed: 80 },
      'buff_heal': { frames: 6, speed: 120 }
    };
    this.sequenceLibrary = { 'None': { name: 'None', path: '', frames: 1, speed: 0 } };
  }

  checkComplete() {
    if (!this.assetsInitialized) return;
    if (this.assetsPending <= 0) {
      this.assetsPending = 0;
      if (this.engine.mapReceived && this.engine.ui) {
        this.renderer.needsVoxelUpdate = true;
      }
    }
  }

  async loadPowerSprites() {
    const loader = new THREE.TextureLoader();
    const cb = '?v=new-engine-330';

    const loadTex = (url, key, callback) => {
      this.assetsPending++;
      loader.load(url, (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        this.textures[key] = tex;
        if (callback) callback(tex);
        this.assetsPending--;
        this.checkComplete();
      }, undefined, () => {
        console.warn(`[AssetManager] Failed to load power sprite: ${url}`);
        this.assetsPending--;
        this.checkComplete();
      });
    };

    try {
      const res = await fetch('/api/assets/sprites/powers');
      if (res.ok) {
        const files = await res.json();
        files.forEach(file => {
          const key = file.replace('.png', '');
          const meta = this.knownSpriteMeta[key] || { frames: 4, speed: 100 };
          this.sequenceLibrary[key] = { name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), path: `assets/sprites/powers/${file}`, frames: meta.frames, speed: meta.speed };
          loadTex(`assets/sprites/powers/${file}${cb}`, key);
        });
      }
    } catch (e) {
      console.error("Failed to load power sprites list:", e);
    }
  }

  loadAssets() {
    this.assetsInitialized = false;
    this.buildTextureAtlas();

    this.renderer.modelMaterial.map = this.atlasTexture;
    if (this.renderer.previewModelMaterial) this.renderer.previewModelMaterial.map = this.atlasTexture;
    if (this.renderer.neonModelMaterial) this.renderer.neonModelMaterial.map = this.atlasTexture;
    if (this.renderer.previewNeonModelMaterial) this.renderer.previewNeonModelMaterial.map = this.atlasTexture;

    const gltfLoader = new GLTFLoader();
    for (const [id, data] of Object.entries(FURNITURE_REGISTRY)) {
      this.assetsPending++;
      gltfLoader.load(`models/${id}.glb`, (gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const geometries = [];
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            const geo = child.geometry.clone();
            geo.applyMatrix4(child.matrixWorld);
            for (const key in geo.attributes) {
              if (key !== 'position' && key !== 'normal' && key !== 'uv') geo.deleteAttribute(key);
            }
            geometries.push(geo);
          }
        });

        if (geometries.length > 0) {
          let geo = mergeGeometries(geometries, false);
          geo.computeVertexNormals();
          if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
          const uvArray = geo.attributes.uv.array;
          for (let i = 1; i < uvArray.length; i += 2) uvArray[i] = 1.0 - uvArray[i];
          geo.attributes.uv.needsUpdate = true;
          geo.scale(2, 2, 2);
          geo.rotateX(Math.PI / 2);
          geo.center();
          geo.computeBoundingBox();
          geo.translate(0, 0, -16 - geo.boundingBox.min.z);
          geo.computeBoundingBox();
          geo.computeBoundingSphere();

          const meshGeo = geo.clone();
          meshGeo.setAttribute('instanceUVTop', new THREE.InstancedBufferAttribute(new Float32Array(10000 * 4), 4));

          const isNeon = id.startsWith('neon-sign');
          const mesh = new THREE.InstancedMesh(meshGeo, isNeon ? this.renderer.neonModelMaterial : this.renderer.modelMaterial, 10000);
          mesh.castShadow = this.engine.clientSettings.enableShadows !== false;
          mesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.frustumCulled = false;
          mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000000);
          meshGeo.boundingSphere = mesh.boundingSphere;
          mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(10000 * 3), 3);
          this.renderer.scene.add(mesh);
          this.modelMeshes[id] = mesh;
          this.renderer.needsVoxelUpdate = true;

          const previewGeo = geo.clone();
          previewGeo.setAttribute('instanceUVTop', new THREE.InstancedBufferAttribute(new Float32Array(4096 * 4), 4));

          const previewMesh = new THREE.InstancedMesh(previewGeo, isNeon ? this.renderer.previewNeonModelMaterial : this.renderer.previewModelMaterial, 4096);
          previewMesh.castShadow = this.engine.clientSettings.enableShadows !== false;
          previewMesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
          previewMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          previewMesh.frustumCulled = false; previewMesh.count = 0; previewMesh.renderOrder = 998;
          previewMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(4096 * 3), 3);
          this.renderer.scene.add(previewMesh);
          this.previewModelMeshes[id] = previewMesh;
        }
        this.assetsPending--;
        this.checkComplete();
      }, undefined, (error) => {
        console.error(`[GLTFLoader] Critical Error: Failed to load ${id}.glb!`);
        this.assetsPending--;
        this.checkComplete();
      });
    }

    const loader = new THREE.TextureLoader();
    const cb = '?v=phase2-3d';

    const loadTex = (url, callback) => {
      this.assetsPending++;
      loader.load(url, (tex) => {
        callback(tex);
        this.assetsPending--;
        this.checkComplete();
      }, undefined, () => {
        this.assetsPending--;
        this.checkComplete();
      });
    };

    loadTex(`assets/sprites/projectiles/paper-airplane-right.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/4, 1);
      this.textures['proj_airplane'] = tex;
      this.sequenceLibrary['proj_airplane'] = { name: 'Paper Airplane', path: 'assets/sprites/projectiles/paper-airplane-right.png', frames: 4, speed: 80, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx1.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/8, 1);
      this.textures['fx_teleport'] = tex;
      this.sequenceLibrary['fx_teleport'] = { name: 'FX Teleport', path: 'assets/sprites/fx/fx1.png', frames: 8, speed: 80, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx2.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/8, 1);
      this.textures['fx_teleport_2'] = tex;
      this.sequenceLibrary['fx_teleport_2'] = { name: 'FX Teleport 2', path: 'assets/sprites/fx/fx2.png', frames: 8, speed: 80, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx3.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/9, 1);
      this.textures['fx_speed_start'] = tex;
      this.sequenceLibrary['fx_speed_start'] = { name: 'FX Speed Start', path: 'assets/sprites/fx/fx3.png', frames: 9, speed: 80, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx4.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/8, 1);
      this.textures['fx_speed_step'] = tex;
      this.sequenceLibrary['fx_speed_step'] = { name: 'FX Speed Step', path: 'assets/sprites/fx/fx4.png', frames: 8, speed: 80, texture: tex };
    });

    ['crumpled-cronched-paper-1', 'crumpled-cronched-paper-2', 'crumpled-cronched-paper-3'].forEach((name, i) => {
      loadTex(`assets/sprites/projectiles/${name}.png${cb}`, (tex) => {
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
        this.textures[`cronched_${i+1}`] = tex;
        this.sequenceLibrary[`cronched_${i+1}`] = { name: `Cronched Paper ${i+1}`, path: `assets/sprites/projectiles/${name}.png`, frames: 1, speed: 0, texture: tex };
      });
    });

    ['crumpled-paper-1', 'crumpled-paper-2'].forEach((name, i) => {
      loadTex(`assets/sprites/projectiles/${name}.png${cb}`, (tex) => {
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
        this.textures[`waste_${i+1}`] = tex;
        this.sequenceLibrary[`waste_${i+1}`] = { name: `Waste Paper ${i+1}`, path: `assets/sprites/projectiles/${name}.png`, frames: 1, speed: 0, texture: tex };
      });
    });

    loadTex(`assets/sprites/projectiles/crumpled-cronched-charred-paper-1.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
      this.textures['charred_1'] = tex;
      this.sequenceLibrary['charred_1'] = { name: `Charred Paper`, path: `assets/sprites/projectiles/crumpled-cronched-charred-paper-1.png`, frames: 1, speed: 0, texture: tex };
    });

    const spriteConfigs = [
      { state: 'idle', file: 'idle-template', rows: 12 },
      { state: 'walk', file: 'walk-template', rows: 8 },
      { state: 'run', file: 'run-template', rows: 8 },
      { state: 'dash', file: 'dash-template', rows: 8 },
      { state: 'jump', file: 'jump-template', rows: 8 },
      { state: 'attack1', file: 'attack-template', rows: 7 },
      { state: 'attack2', file: 'attack-template', rows: 7 },
      { state: 'throw-attack1', file: 'attack-ranged', rows: 7 },
      { state: 'hurt', file: 'idle-template', rows: 12 },
      { state: 'death', file: 'idle-template', rows: 12 },
      { state: 'fly', file: 'fly-template', rows: 8 },
      { state: 'fly-idle', file: 'fly-idle-template', rows: 8 }
    ];

    const path = 'assets/sprites/characters';

    spriteConfigs.forEach(config => {
      loadTex(`${path}/${config.file}.png${cb}`, (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(1/8, 1/config.rows);
        tex.userData = { rows: config.rows };
        this.textures[config.state] = tex;
      });
    });

    this.loadPowerSprites();

    this.assetsInitialized = true;
    this.checkComplete();
  }

  buildTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    this.atlasMap = {
      'white': { x: 0, y: 1 },
      'mud1': { x: 2, y: 1 },
      'mud2': { x: 3, y: 1 },
      'mud3': { x: 0, y: 2 },
      'bubble': { x: 2, y: 2 },
      'glass': { x: 1, y: 1 },
      'glass-stained': { x: 0, y: 3 },
      'clear_stained_glass_edges': { x: 5, y: 0 },
      'clear_stained_glass_edgeless': { x: 5, y: 1 },
      'smoke': { x: 0, y: 1 }, // Maps directly to the white square fallback
      'water_flow': { x: 1, y: 3 },
      'lava_flow': { x: 3, y: 3 },
      'stone-bricks1': { x: 0, y: 4 },
      'stone-bricks2': { x: 1, y: 4 },
      'stone-bricks3': { x: 2, y: 4 },
      'stone-bricks4': { x: 3, y: 4 },
      'stone-bricks5': { x: 4, y: 4 },
      'stone-bricks6': { x: 5, y: 4 }
    };

    for (const id in BlockRegistry) {
      const block = BlockRegistry[id];
      if (block.faces) {
        if (block.faces.top && !this.atlasMap[block.name]) this.atlasMap[block.name] = { x: block.faces.top[0], y: block.faces.top[1] };
        if (block.faces.sides && !this.atlasMap[block.name + '_flow']) this.atlasMap[block.name + '_flow'] = { x: block.faces.sides[0], y: block.faces.sides[1] };
        if (block.faces.bottom && !this.atlasMap[block.name + '_bottom']) this.atlasMap[block.name + '_bottom'] = { x: block.faces.bottom[0], y: block.faces.bottom[1] };
      }
    }

    const atlasTexture = new THREE.CanvasTexture(canvas);
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.minFilter = THREE.NearestFilter;
    atlasTexture.generateMipmaps = false;
    atlasTexture.colorSpace = THREE.SRGBColorSpace;

    this.renderer.instancedMaterial.map = atlasTexture;
    this.renderer.instancedMaterial.needsUpdate = true;
    if (this.renderer.glassMaterial) {
      this.renderer.glassMaterial.map = atlasTexture;
      this.renderer.glassMaterial.needsUpdate = true;
    }

    this.atlasCtx = ctx;
    this.atlasTexture = atlasTexture;
    this.animatedTiles = [];

    const loadTile = (id, src, isAnimated = false) => {
      this.assetsPending++;
      const img = new Image();
      img.src = src + '?v=' + Date.now();
      img.onload = () => {
        const pos = this.atlasMap[id];
        let sequence = null;
        let frametime = 150;

        const baseName = id.replace('_flow', '');
        for (const key in BlockRegistry) {
          if (BlockRegistry[key].name === baseName) {
            if (BlockRegistry[key].animated) {
              isAnimated = true;
              sequence = BlockRegistry[key].sequence;
              frametime = BlockRegistry[key].frametime || 150;
            }
            break;
          }
        }

        if (isAnimated) {
          this.animatedTiles.push({ id, img, pos, frames: img.height / img.width, lastFrame: -1, sequence, frametime });
        } else {
          if (pos) {
            this.atlasCtx.drawImage(img, 0, 0, img.width, img.height, pos.x * 64, pos.y * 64, 64, 64);
            atlasTexture.needsUpdate = true;
          }
        }
        this.assetsPending--;
        this.checkComplete();
      };
      img.onerror = () => {
        console.warn(`[Texture Atlas] Missing texture: ${src}`);
        const pos = this.atlasMap[id];
        if (pos) {
          this.atlasCtx.fillStyle = '#ff00ff';
          this.atlasCtx.fillRect(pos.x * 64, pos.y * 64, 64, 64);
          this.atlasCtx.fillStyle = '#000000';
          this.atlasCtx.fillRect(pos.x * 64 + 32, pos.y * 64, 32, 32);
          this.atlasCtx.fillRect(pos.x * 64, pos.y * 64 + 32, 32, 32);
          atlasTexture.needsUpdate = true;
        }
        this.assetsPending--;
        this.checkComplete();
      };
    };

    loadTile('grass', 'assets/tiles/base/floor/grass_block_top.png');
    loadTile('dirt', 'assets/tiles/base/all-facing/dirt.png');
    loadTile('stone', 'assets/tiles/base/all-facing/stone.png');
    loadTile('clay', 'assets/tiles/base/all-facing/clay.png');
    loadTile('cobblestone', 'assets/tiles/base/all-facing/cobblestone.png');
    loadTile('cobbled_deepslate', 'assets/tiles/base/all-facing/cobbled_deepslate.png');
    loadTile('gravel', 'assets/tiles/base/all-facing/gravel.png');
    loadTile('sand', 'assets/tiles/base/all-facing/sand.png');
    loadTile('water', 'assets/tiles/base/fluid/water_still.png', true);
    loadTile('water_flow', 'assets/tiles/base/fluid/water_flow.png', true);
    loadTile('mud1', 'assets/tiles/base/all-facing/packed_mud1.png');
    loadTile('mud2', 'assets/tiles/base/all-facing/packed_mud2.png');
    loadTile('mud3', 'assets/tiles/base/all-facing/packed_mud3.png');
    loadTile('ice', 'assets/tiles/base/all-facing/ice.png');
    loadTile('acid', 'assets/tiles/base/fluid/water_still.png');
    loadTile('lava', 'assets/tiles/base/fluid/lava_still.png');
    loadTile('lava_flow', 'assets/tiles/base/fluid/lava_flow.png');
    loadTile('glass', 'assets/tiles/base/all-facing/glass.png');
    loadTile('glass-stained', 'assets/tiles/base/all-facing/glass-stained.png');
    loadTile('clear_stained_glass_edges', 'assets/tiles/base/all-facing/clear_stained_glass_edges.png');
    loadTile('clear_stained_glass_edgeless', 'assets/tiles/base/all-facing/clear_stained_glass_edgeless.png');
    loadTile('bubble', 'assets/sprites/fx/bubble-grayscale.png');
    loadTile('block-lamp-on', 'assets/tiles/base/all-facing/block-lamp-on.png');
    loadTile('block-lamp-on-3', 'assets/tiles/base/all-facing/block-lamp-on.png');
    loadTile('block-lamp-on-2', 'assets/tiles/base/all-facing/block-lamp-on.png');
    loadTile('block-lamp-on-1', 'assets/tiles/base/all-facing/block-lamp-on.png');
    loadTile('block-lamp-on-0', 'assets/tiles/base/all-facing/block-lamp-on.png');

    for (let i = 1; i <= 6; i++) {
      loadTile(`stone-bricks${i}`, `assets/tiles/base/all-facing/stone-bricks${i}.png`);
    }

    loadTile('wood-planks', 'assets/tiles/base/all-facing/wood-planks.png');
    loadTile('wood-stripped', 'assets/tiles/base/all-facing/wood-stripped.png');
    loadTile('bark-log', 'assets/tiles/base/all-facing/bark-log.png');
    loadTile('bark-birch', 'assets/tiles/base/all-facing/bark-birch.png');

    loadTile('wood-door-bottom', 'assets/tiles/base/interactable/wood_door-bottom.png');
    loadTile('wood-door-top', 'assets/tiles/base/interactable/wood_door-top.png');

    loadTile('arcade-carpet', 'assets/tiles/base/all-facing/arcade-carpet.png');
    loadTile('carpet', 'assets/tiles/base/all-facing/carpet.png');
    loadTile('concrete', 'assets/tiles/base/all-facing/concrete.png');
    loadTile('paint', 'assets/tiles/base/side/rough-paint.png');

    this.atlasCtx.fillStyle = '#ffffff';
    this.atlasCtx.fillRect(0, 64, 64, 64);
  }

  updateAnimatedTiles() {
    if (!this.animatedTiles || this.animatedTiles.length === 0) return;
    let updated = false;

    this.animatedTiles.forEach(tile => {
      let currentFrame;
      if (tile.sequence) {
        let seqIdx = Math.floor(performance.now() / (tile.frametime || 150)) % tile.sequence.length;
        currentFrame = tile.sequence[seqIdx];
      } else {
        const frameCount = tile.frames || 1;
        currentFrame = Math.floor(performance.now() / (tile.frametime || 150)) % frameCount;
      }

      if (tile.lastFrame !== currentFrame) {
        tile.lastFrame = currentFrame;
        const sy = currentFrame * tile.img.width;
        this.atlasCtx.clearRect(tile.pos.x * 64, tile.pos.y * 64, 64, 64);
        this.atlasCtx.drawImage(tile.img, 0, sy, tile.img.width, tile.img.width, tile.pos.x * 64, tile.pos.y * 64, 64, 64);
        updated = true;
      }
    });

    if (updated) {
      this.atlasTexture.needsUpdate = true;
    }
  }
}
