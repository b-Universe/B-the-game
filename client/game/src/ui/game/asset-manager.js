import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { ROBOTICS_SPRITES } from './entities/robotics.js?v=cache-bust-005';

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

        if (this.engine.mapManager) {
            this.engine.mapManager.generatedChunks.clear();
            this.engine.mapManager.mapCacheDirty = true;
            for (const mesh of this.renderer.chunkMeshes.values()) {
                this.renderer.scene.remove(mesh);
                mesh.geometry.dispose();
            }
            this.renderer.chunkMeshes.clear();
            for (const mesh of this.renderer.chunkTransparentMeshes.values()) {
                this.renderer.scene.remove(mesh);
                mesh.geometry.dispose();
            }
            this.renderer.chunkTransparentMeshes.clear();
        }
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
        if (this.renderer && this.renderer.webgl) {
            this.renderer.webgl.initTexture(tex);
        }
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
    if (this.renderer.chunkMaterial) this.renderer.chunkMaterial.map = this.atlasTexture;
    if (this.renderer.chunkTransparentMaterial) this.renderer.chunkTransparentMaterial.map = this.atlasTexture;
    if (this.renderer.previewModelMaterial) this.renderer.previewModelMaterial.map = this.atlasTexture;
    if (this.renderer.neonModelMaterial) this.renderer.neonModelMaterial.map = this.atlasTexture;
    if (this.renderer.previewNeonModelMaterial) this.renderer.previewNeonModelMaterial.map = this.atlasTexture;
    if (this.renderer.chunkDepthMaterial) this.renderer.chunkDepthMaterial.map = this.atlasTexture;
    if (this.renderer.chunkDistanceMaterial) this.renderer.chunkDistanceMaterial.map = this.atlasTexture;
    if (this.renderer.modelDepthMaterial) this.renderer.modelDepthMaterial.map = this.atlasTexture;
    if (this.renderer.modelDistanceMaterial) this.renderer.modelDistanceMaterial.map = this.atlasTexture;

    const gltfManager = new THREE.LoadingManager();
    gltfManager.setURLModifier((url) => {
      if (url.match(/\.(png|jpg|jpeg|webp|bmp)$/i) && !url.startsWith('data:')) {
        // Intercept dangling texture paths from Blockbench and return a 1x1 blank pixel.
        // The engine discards GLTF materials anyway in favor of the master atlas!
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      }
      return url;
    });
    const gltfLoader = new GLTFLoader(gltfManager);
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

          for (let i = 0; i < uvArray.length; i += 2) {
             uvArray[i + 1] = 1.0 - uvArray[i + 1]; // Align GLTF origin to Canvas origin

             // Apply Epsilon to prevent shader fract(1.0) rolling back to 0.0!
             if (uvArray[i] >= 1.0) uvArray[i] -= 0.0001;
             else if (uvArray[i] <= 0.0) uvArray[i] += 0.0001;
             if (uvArray[i + 1] >= 1.0) uvArray[i + 1] -= 0.0001;
             else if (uvArray[i + 1] <= 0.0) uvArray[i + 1] += 0.0001;
          }
          geo.attributes.uv.needsUpdate = true;
          geo.scale(2, 2, 2);
          geo.rotateX(Math.PI / 2);
          geo.rotateZ(-Math.PI / 2);
          geo.center();
          geo.computeBoundingBox();
          geo.translate(0, 0, -16 - geo.boundingBox.min.z);
          geo.computeBoundingBox();
          geo.computeBoundingSphere();

          const useMeshUVArray = new Float32Array(geo.attributes.position.count).fill(data.useMeshUV ? 1 : 0);
          geo.setAttribute('useMeshUV', new THREE.BufferAttribute(useMeshUVArray, 1));

          const meshGeo = geo.clone();
          meshGeo.setAttribute('packedUVs', new THREE.InstancedBufferAttribute(new Uint32Array(10000 * 3), 3));
          meshGeo.setAttribute('packedColor', new THREE.InstancedBufferAttribute(new Uint32Array(10000), 1));

          const isNeon = id.startsWith('neon-sign');
          let prevMat = isNeon ? this.renderer.previewNeonModelMaterial : this.renderer.previewModelMaterial;

          this.modelMeshes[id] = { geometry: meshGeo };
          this.renderer.needsVoxelUpdate = true;

          const previewGeo = geo.clone();
          previewGeo.setAttribute('packedUVs', new THREE.InstancedBufferAttribute(new Uint32Array(4096 * 3), 3));
          previewGeo.setAttribute('packedColor', new THREE.InstancedBufferAttribute(new Uint32Array(4096), 1));

          const previewMesh = new THREE.InstancedMesh(previewGeo, prevMat, 4096);
          previewMesh.castShadow = this.engine.clientSettings.enableShadows !== false;
          previewMesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
          previewMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          previewMesh.customDepthMaterial = this.renderer.modelDepthMaterial;
          previewMesh.customDistanceMaterial = this.renderer.modelDistanceMaterial;
          previewMesh.frustumCulled = false; previewMesh.count = 0; previewMesh.renderOrder = 998;
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
        if (this.renderer && this.renderer.webgl) {
            this.renderer.webgl.initTexture(tex);
        }
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

    loadTex(`assets/sprites/fx/fx5.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/6, 1);
      this.textures['fx_heal'] = tex;
      this.sequenceLibrary['fx_heal'] = { name: 'FX Heal', path: 'assets/sprites/fx/fx5.png', frames: 6, speed: 100, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx6.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/5, 1);
      this.textures['fx_drone_explode'] = tex;
      this.sequenceLibrary['fx_drone_explode'] = { name: 'FX Drone Explode', path: 'assets/sprites/fx/fx6.png', frames: 5, speed: 100, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx7.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/5, 1);
      this.textures['fx_drone_circuit'] = tex;
      this.sequenceLibrary['fx_drone_circuit'] = { name: 'FX Drone Circuit', path: 'assets/sprites/fx/fx7.png', frames: 5, speed: 100, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx8.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/4, 1);
      this.textures['fx_stun'] = tex;
      this.sequenceLibrary['fx_stun'] = { name: 'FX Stun', path: 'assets/sprites/fx/fx8.png', frames: 4, speed: 100, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx10.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/8, 1);
      this.textures['fx_sparks'] = tex;
      this.sequenceLibrary['fx_sparks'] = { name: 'FX Sparks', path: 'assets/sprites/fx/fx10.png', frames: 8, speed: 60, texture: tex };
    });

    loadTex(`assets/sprites/fx/fx11.png${cb}`, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/9, 1);
      this.textures['fx_electric_zap'] = tex;
      this.sequenceLibrary['fx_electric_zap'] = { name: 'FX Electric Zap', path: 'assets/sprites/fx/fx11.png', frames: 9, speed: 50, texture: tex };
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

    const roboticsPath = 'assets/sprites/entities/robotics';
    ROBOTICS_SPRITES.forEach(config => {
        loadTex(`${roboticsPath}/${config.file}.png${cb}`, (tex) => {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.colorSpace = THREE.SRGBColorSpace;
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
      'stone-bricks6': { x: 5, y: 4 },
      'line-dashed': { x: 0, y: 6 },
      'line-solid': { x: 1, y: 6 },
      'line-double-solid': { x: 2, y: 6 },
      'line-sidewalk-2': { x: 3, y: 6 },
      'line-sidewalk-4': { x: 4, y: 6 },
      'line-edge-1-dashed': { x: 5, y: 6 },
      'line-edge-2-dashed': { x: 6, y: 6 },
      'line-double-dashed-solid': { x: 7, y: 6 },
      'line-corner-3-dashed': { x: 8, y: 6 },
      'line-t-dashed': { x: 9, y: 6 },
      'line-split-1': { x: 10, y: 6 },
      'line-split-2': { x: 11, y: 6 },
      'line-t-1': { x: 12, y: 6 },
      'line-t-2': { x: 13, y: 6 },
      'line-x': { x: 14, y: 6 },
      'line-corner-1': { x: 15, y: 6 },
      'line-corner-2': { x: 16, y: 6 },
      'line-corner-3': { x: 17, y: 6 },
      'line-corner-4': { x: 18, y: 6 },
      'line-corner-5': { x: 19, y: 6 },
      'line-edge-1': { x: 20, y: 6 },
      'line-edge-2': { x: 21, y: 6 },
      'line-edge-end-1': { x: 22, y: 6 },
      'line-edge-end-2': { x: 23, y: 6 }
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

    // Automated Custom Texture Loader (Dynamically from Registry)
    let nextAtlasX = 0;
    let nextAtlasY = 8; // Start at row 8 to safely bypass all base block textures!

    for (const [id, data] of Object.entries(FURNITURE_REGISTRY)) {
       if (data.customTexture) {
           this.atlasMap[id] = { x: nextAtlasX, y: nextAtlasY };
           loadTile(id, data.customTexture);
           nextAtlasX++;
           if (nextAtlasX >= 32) { nextAtlasX = 0; nextAtlasY++; }
       }
    }

    for (let i = 1; i <= 6; i++) {
      loadTile(`stone-bricks${i}`, `assets/tiles/base/all-facing/stone-bricks${i}.png`);
    }

    loadTile('wood-planks', 'assets/tiles/base/all-facing/wood-planks.png');
    loadTile('wood-stripped', 'assets/tiles/base/all-facing/wood-stripped.png');
    loadTile('bark-log', 'assets/tiles/base/all-facing/bark-log.png');
    loadTile('bark-birch', 'assets/tiles/base/all-facing/bark-birch.png');

    loadTile('arcade-carpet', 'assets/tiles/base/all-facing/arcade-carpet.png');

    // Dynamically split arcade-carpet into 4 sub-textures for seamless 2x2 placement
    this.assetsPending++;
    const acImg = new Image();
    acImg.src = 'assets/tiles/base/all-facing/arcade-carpet.png?v=' + Date.now();
    acImg.onload = () => {
      for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
          const subId = `arcade-carpet-${x}-${y}`;
          if (!this.atlasMap[subId]) {
             this.atlasMap[subId] = { x: nextAtlasX, y: nextAtlasY };
             nextAtlasX++;
             if (nextAtlasX >= 32) { nextAtlasX = 0; nextAtlasY++; }
          }
          const pos = this.atlasMap[subId];
          if (pos) {
            this.atlasCtx.drawImage(acImg, x * (acImg.width / 2), y * (acImg.height / 2), acImg.width / 2, acImg.height / 2, pos.x * 64, pos.y * 64, 64, 64);
          }
        }
      }
      atlasTexture.needsUpdate = true;
      this.assetsPending--;
      this.checkComplete();
    };
    acImg.onerror = () => {
      console.warn(`[Texture Atlas] Missing texture: assets/tiles/base/all-facing/arcade-carpet.png`);
      this.assetsPending--;
      this.checkComplete();
    };

    loadTile('carpet', 'assets/tiles/base/all-facing/carpet.png');
    loadTile('concrete', 'assets/tiles/base/all-facing/concrete.png');
    loadTile('paint', 'assets/tiles/base/side/rough-paint.png');
    loadTile('line-dashed', 'assets/tiles/base/all-facing/line-dashed.png');
    loadTile('line-solid', 'assets/tiles/base/all-facing/line-solid.png');
    loadTile('line-double-solid', 'assets/tiles/base/all-facing/line-double-solid.png');
    loadTile('line-sidewalk-2', 'assets/tiles/base/all-facing/line-sidewalk-2.png');
    loadTile('line-sidewalk-4', 'assets/tiles/base/all-facing/line-sidewalk-4.png');
    loadTile('line-edge-1-dashed', 'assets/tiles/base/all-facing/line-edge-1-dashed.png');
    loadTile('line-edge-2-dashed', 'assets/tiles/base/all-facing/line-edge-2-dashed.png');
    loadTile('line-double-dashed-solid', 'assets/tiles/base/all-facing/line-double-dashed-solid.png');
    loadTile('line-corner-3-dashed', 'assets/tiles/base/all-facing/line-corner-3-dashed.png');
    loadTile('line-t-dashed', 'assets/tiles/base/all-facing/line-t-dashed.png');
    loadTile('line-split-1', 'assets/tiles/base/all-facing/line-split-1.png');
    loadTile('line-split-2', 'assets/tiles/base/all-facing/line-split-2.png');
    loadTile('line-t-1', 'assets/tiles/base/all-facing/line-t-1.png');
    loadTile('line-t-2', 'assets/tiles/base/all-facing/line-t-2.png');
    loadTile('line-x', 'assets/tiles/base/all-facing/line-x.png');
    loadTile('line-corner-1', 'assets/tiles/base/all-facing/line-corner-1.png');
    loadTile('line-corner-2', 'assets/tiles/base/all-facing/line-corner-2.png');
    loadTile('line-corner-3', 'assets/tiles/base/all-facing/line-corner-3.png');
    loadTile('line-corner-4', 'assets/tiles/base/all-facing/line-corner-4.png');
    loadTile('line-corner-5', 'assets/tiles/base/all-facing/line-corner-5.png');
    loadTile('line-edge-1', 'assets/tiles/base/all-facing/line-edge-1.png');
    loadTile('line-edge-2', 'assets/tiles/base/all-facing/line-edge-2.png');
    loadTile('line-edge-end-1', 'assets/tiles/base/all-facing/line-edge-end-1.png');
    loadTile('line-edge-end-2', 'assets/tiles/base/all-facing/line-edge-end-2.png');

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
