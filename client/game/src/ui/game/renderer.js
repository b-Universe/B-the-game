import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { mergeGeometries } from 'https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js';
import { AssetManager } from './asset-manager.js?v=cache-bust-005';
import { DebugRenderer } from './debug-renderer.js?v=cache-bust-005';
import { VoxelManager } from './voxel-manager.js?v=cache-bust-005';
import { ParticleManager } from './particle-manager.js?v=cache-bust-005';
import { ChunkMesher } from './chunk-mesher.js?v=cache-bust-005';
import { LightingManager } from './lighting-manager.js?v=cache-bust-005';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=cache-bust-005';
import { SpriteBatcher } from './sprite-batcher.js?v=cache-bust-005';

export class Renderer {
  constructor(engine) {
    this.engine = engine;

    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    this.cameraAngle = this.engine.clientSettings.cameraAngle !== undefined ? this.engine.clientSettings.cameraAngle : 0;
    this.cameraPitch = Math.atan(1 / Math.sqrt(2));
    this.needsVoxelUpdate = true;
    this.initialLoadComplete = false;
    this.voxelIterator = null;

    this.setupWebGL();
    this.setupCamera();

    this.debugRenderer = new DebugRenderer(this);

    this.setupScene();
    this.setupInstancedMesh();
    this.setupCompass();
    this.debugRenderer.setupDebugOverlay();

    this.entityMeshes = new Map();
    this.projectileMeshes = new Map();
    this.debrisMeshes = new Map();
    this.otherPlayerLights = new Map();
    this.chunkMeshes = new Map();
    this.chunkTransparentMeshes = new Map();

    this.voxelManager = new VoxelManager(this);
    this.chunkMesher = new ChunkMesher(this.engine);
    this.particleManager = new ParticleManager(this);
    this.lightingManager = new LightingManager(this);
    this.assetManager = new AssetManager(this);
    this.assetManager.loadAssets();
  }

  setupWebGL() {
    this.webgl = new THREE.WebGLRenderer({
      canvas: this.engine.canvas,
      antialias: false,
      alpha: false
    });
    this.webgl.setPixelRatio(this.engine.clientSettings.renderScale !== undefined ? this.engine.clientSettings.renderScale : 1.0);
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    this.webgl.setClearColor(0x0b0e14, 1);

    this.webgl.shadowMap.enabled = this.engine.clientSettings.enableShadows !== false;
    this.webgl.shadowMap.type = this.engine.clientSettings.softShadows !== false ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  }

  updateRenderScale(scale) {
    if (this.webgl) {
      this.webgl.setPixelRatio(scale);
    }
  }

  setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 1000;

    this.camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      -50000,
      50000
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.layers.enableAll();
    this.updateCameraRotation();
  }

  updateCameraRotation() {
    // Strict Isometric Locking Logic
    const baseIsoAngle = Math.PI / 4;
    const zRotOffset = -this.cameraAngle * (Math.PI / 180);

    this.camera.rotation.x = this.cameraPitch;
    this.camera.rotation.y = 0; // Handled by Z up
    this.camera.rotation.z = baseIsoAngle + zRotOffset;
    this.updateCompass();
  }

  rotateCamera(direction, deltaY = 0) {
    this.cameraAngle = (this.cameraAngle + direction + 360) % 360;

    if (deltaY !== 0) {
      this.cameraPitch += deltaY * 0.01;
      this.cameraPitch = Math.max(0.1, Math.min(this.cameraPitch, 80 * (Math.PI / 180)));
    }

    this.engine.clientSettings.cameraAngle = this.cameraAngle;
    localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
    if (this.engine.network) this.engine.network.sendClientSettings(this.engine.clientSettings);
    this.updateCameraRotation();
  }

  setupScene() {
    this.scene = new THREE.Scene();

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.hemiLight.layers.enableAll();
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.castShadow = this.engine.clientSettings.enableShadows !== false;
    this.sunLight.layers.enableAll();

    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 1000;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 5000;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.spriteBatcher = new SpriteBatcher(this);

    this.debugRenderer.setupDebugMeshes();

    this.blockLights = [];
    const maxLights = this.engine.clientSettings.maxDynamicLights !== undefined ? this.engine.clientSettings.maxDynamicLights : 48;
    for (let i = 0; i < maxLights; i++) {
      const light = new THREE.PointLight(0xff5d00, 0, 400, 1.5);
      light.layers.enableAll();
      this.scene.add(light);
      this.blockLights.push(light);
    }

    this.playerLight = new THREE.SpotLight(0xaaccff, 0, 2000, Math.PI / 4, 0.5, 1.5);
    this.playerLight.castShadow = this.engine.clientSettings.enableShadows !== false;
    this.playerLight.shadow.mapSize.width = 1024;
    this.playerLight.shadow.mapSize.height = 1024;
    this.playerLight.shadow.camera.near = 10;
    this.playerLight.shadow.camera.far = 2000;
    this.playerLight.shadow.bias = -0.001; // Prevents ugly shadow striping on flat walls
    this.scene.add(this.playerLight);
    this.scene.add(this.playerLight.target);
  }

  updateChunkColumn(cx, cy, chunkMap, forceRebuild = false) {
    if (!this.chunkMesher) return;
    const activeCZs = new Set();
    if (chunkMap) {
        for (const key of chunkMap.keys()) {
            const z = parseInt(key.substring(key.lastIndexOf('_') + 1), 10);
            activeCZs.add(Math.floor(z / 16));
        }
    }
    const prefix = `${cx}_${cy}_`;
    for (const meshKey of this.chunkMeshes.keys()) {
        if (meshKey.startsWith(prefix)) activeCZs.add(parseInt(meshKey.substring(prefix.length), 10));
    }
    for (const meshKey of this.chunkTransparentMeshes.keys()) {
        if (meshKey.startsWith(prefix)) activeCZs.add(parseInt(meshKey.substring(prefix.length), 10));
    }
    for (const cz of activeCZs) {
        this.updateChunkMesh(cx, cy, cz, chunkMap, forceRebuild);
    }
  }

  async updateChunkMesh(cx, cy, cz, chunkMap, forceRebuild = false) {
    if (!this.chunkMesher) return;
    const key = `${cx}_${cy}_${cz}`;

    this.pendingChunkUpdates = this.pendingChunkUpdates || new Map();
    const updateId = Date.now() + Math.random();
    this.pendingChunkUpdates.set(key, updateId);

    this.pendingMeshes = (this.pendingMeshes || 0) + 1;

    try {
      const geos = await this.chunkMesher.buildChunkMesh(cx, cy, cz, chunkMap, forceRebuild);

      // Ensure this is still the most recent mesh generation request for this chunk!
      if (this.pendingChunkUpdates.get(key) !== updateId) {
          return;
      }
      this.pendingChunkUpdates.delete(key);

      if (geos.opaque) {
        geos.opaque.computeBoundingBox();
        geos.opaque.computeBoundingSphere();
        let mesh = this.chunkMeshes.get(key);
        if (!mesh) {
          mesh = new THREE.Mesh(geos.opaque, this.chunkMaterial);
          mesh.position.set(cx * 512, cy * 512, cz * 512);
          mesh.castShadow = this.engine.clientSettings.enableShadows !== false;
          mesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
          mesh.customDepthMaterial = this.chunkDepthMaterial;
          mesh.customDistanceMaterial = this.chunkDistanceMaterial;
          this.scene.add(mesh);
          this.chunkMeshes.set(key, mesh);
        } else {
          mesh.geometry.dispose();
          mesh.geometry = geos.opaque;
          mesh.position.set(cx * 512, cy * 512, cz * 512);
        }
      } else {
        let mesh = this.chunkMeshes.get(key);
        if (mesh) { this.scene.remove(mesh); mesh.geometry.dispose(); this.chunkMeshes.delete(key); }
      }

      if (geos.transparent) {
        geos.transparent.computeBoundingBox();
        geos.transparent.computeBoundingSphere();
        let tMesh = this.chunkTransparentMeshes.get(key);
        if (!tMesh) {
          tMesh = new THREE.Mesh(geos.transparent, this.chunkTransparentMaterial);
          tMesh.position.set(cx * 512, cy * 512, cz * 512);
          tMesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
          this.scene.add(tMesh);
          this.chunkTransparentMeshes.set(key, tMesh);
        } else {
          tMesh.geometry.dispose();
          tMesh.geometry = geos.transparent;
          tMesh.position.set(cx * 512, cy * 512, cz * 512);
        }
      } else {
        let tMesh = this.chunkTransparentMeshes.get(key);
        if (tMesh) { this.scene.remove(tMesh); tMesh.geometry.dispose(); this.chunkTransparentMeshes.delete(key); }
      }
    } catch (e) {
      console.error("[Renderer] Failed to update chunk mesh:", key, e);
    } finally {
      this.pendingMeshes--;
      this.checkInitialLoad();
    }
  }

  checkInitialLoad() {
    if (this.engine.mapReceived && (this.pendingMeshes || 0) === 0 && !this.initialLoadComplete) {
      this.initialLoadComplete = true;
      if (this.engine.ui) this.engine.ui.hideLoadingScreen();
      const hint = document.getElementById('load-hint-msg');
      if (hint) hint.remove();
    }
  }

  removeChunkColumn(cx, cy) {
    const prefix = `${cx}_${cy}_`;
    const toRemove = [];
    for (const key of this.chunkMeshes.keys()) { if (key.startsWith(prefix)) toRemove.push(key); }
    for (const key of toRemove) {
      const mesh = this.chunkMeshes.get(key);
      this.scene.remove(mesh); mesh.geometry.dispose(); this.chunkMeshes.delete(key);
    }
    const toRemoveT = [];
    for (const key of this.chunkTransparentMeshes.keys()) { if (key.startsWith(prefix)) toRemoveT.push(key); }
    for (const key of toRemoveT) {
      const mesh = this.chunkTransparentMeshes.get(key);
      this.scene.remove(mesh); mesh.geometry.dispose(); this.chunkTransparentMeshes.delete(key);
    }
  }

  setupInstancedMesh() {
    this.instancedMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 0
    });
    this.instancedMaterial.userData = { time: { value: 0 } };

    this.glassMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      shininess: 40
    });
    this.glassMaterial.userData = { time: { value: 0 } };

    this.modelMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0, alphaTest: 0.5 });
    this.modelMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute uvec3 packedUVs;
        attribute uint packedColor;
        attribute float useMeshUV;
        flat varying uint vPackedUVTop;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        flat varying vec3 vInstanceColor;
        varying float vUseMeshUV;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vPackedUVTop = packedUVs.x;
        vLocalNormal = normal;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        vLocalPosition = position;
        vUseMeshUV = useMeshUV;

        float r = float(packedColor & 255u) / 255.0;
        float g = float((packedColor >> 8u) & 255u) / 255.0;
        float b = float((packedColor >> 16u) & 255u) / 255.0;
        vInstanceColor = vec3(r, g, b);
        `
      );
      shader.fragmentShader = `
        flat varying uint vPackedUVTop;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        flat varying vec3 vInstanceColor;
        varying float vUseMeshUV;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 baseUV = vec2(0.0);
          if (vUseMeshUV > 0.5) {
             baseUV = vMapUv;
          } else {
             if (abs(vLocalNormal.z) > 0.5) {
                baseUV = vec2(vLocalPosition.x, -vLocalPosition.y) / 32.0;
             } else if (abs(vLocalNormal.x) > 0.5) {
                baseUV = vec2(vLocalNormal.x > 0.0 ? -vLocalPosition.y : vLocalPosition.y, -vLocalPosition.z) / 32.0;
             } else {
                baseUV = vec2(vLocalNormal.y > 0.0 ? vLocalPosition.x : -vLocalPosition.x, -vLocalPosition.z) / 32.0;
             }
          }

          uint faceUVData = vPackedUVTop;
          float ux = float(faceUVData & 255u);
          float uy = float((faceUVData >> 8u) & 255u);
          uint scaleLevel = (faceUVData >> 16u) & 7u;
          float isFlipped = float((faceUVData >> 19u) & 1u);
          float size = 64.0;
          if (scaleLevel == 1u) size = 32.0;
          else if (scaleLevel == 2u) size = 16.0;
          else if (scaleLevel == 3u) size = 8.0;
          float uvScale = size / 2048.0;
          vec4 iuv;
          iuv.xy = vec2(ux * 8.0 / 2048.0, 1.0 - ((uy * 8.0 + size) / 2048.0));
          iuv.zw = vec2(uvScale, uvScale);
          if (isFlipped > 0.5) {
              iuv.z = -iuv.z;
              iuv.x += abs(iuv.z);
          }

          vec2 modifiedUV = fract(baseUV) * iuv.zw + iuv.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        diffuseColor.rgb *= vInstanceColor;
        `
      );
    };

    this.chunkMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 0,
      alphaTest: 0.5
    });
    this.chunkMaterial.userData = { time: { value: 0 } };
    this.chunkMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.chunkMaterial.userData.time;
      shader.vertexShader = `
        attribute uint packedUV;
        attribute uint packedColor;
        attribute uint packedData;

        flat varying uint vPackedUV;
        flat varying vec3 vColor;
        flat varying float vIsFluid;
        varying vec3 vWorldPos;
        flat varying vec3 vWorldNormal;
        varying float vAO;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vPackedUV = packedUV;

        uint pData = uint(packedData);
        vIsFluid = float((pData >> 6u) & 7u);

        float aoLevel = float(pData & 3u);
        vAO = 0.4 + (aoLevel * 0.2); // Maps 0, 1, 2, 3 to 0.4, 0.6, 0.8, 1.0

        float r = float(packedColor & 255u) / 255.0;
        float g = float((packedColor >> 8u) & 255u) / 255.0;
        float b = float((packedColor >> 16u) & 255u) / 255.0;
        vColor = vec3(r, g, b);

        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        `
      );
      shader.fragmentShader = `
        uniform float uTime;
        flat varying uint vPackedUV;
        flat varying vec3 vColor;
        flat varying float vIsFluid;
        varying vec3 vWorldPos;
        flat varying vec3 vWorldNormal;
        varying float vAO;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          uint faceUVData = vPackedUV;
          float ux = float(faceUVData & 255u);
          float uy = float((faceUVData >> 8u) & 255u);
          uint scaleLevel = (faceUVData >> 16u) & 7u;
          float isFlipped = float((faceUVData >> 19u) & 1u);

          float size = scaleLevel == 1u ? 32.0 : (scaleLevel == 2u ? 16.0 : (scaleLevel == 3u ? 8.0 : 64.0));
          float uvScale = size / 2048.0;
          vec4 iuv = vec4(ux * 8.0 / 2048.0, 1.0 - ((uy * 8.0 + size) / 2048.0), uvScale, uvScale);
          if (isFlipped > 0.5) { iuv.z = -iuv.z; iuv.x += abs(iuv.z); }

          vec2 baseUV = vMapUv; // Use the standard UVs provided by the BufferGeometry

          // --- Fluid Animation Override ---
          if (vIsFluid > 0.5 && vIsFluid < 3.5) {
              if (vWorldNormal.z > 0.9) { // Flat Top face ONLY
                  // Seamless world-aligned mapping, NO time sliding
                  baseUV = fract(vec2(vWorldPos.x, -vWorldPos.y) / 32.0);
              }
          }

          vec2 modifiedUV = fract(baseUV) * iuv.zw + iuv.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );

          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        diffuseColor.rgb *= vColor * vAO;

        if (vIsFluid == 2.0) {
           totalEmissiveRadiance += diffuseColor.rgb * 0.8;
        } else if (vIsFluid == 3.0) {
           totalEmissiveRadiance += diffuseColor.rgb * 0.3;
        } else if (vIsFluid == 4.0) {
           totalEmissiveRadiance += diffuseColor.rgb * 1.0;
        } else if (vIsFluid == 5.0) {
           float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
           if (luma > 0.6) {
               totalEmissiveRadiance += diffuseColor.rgb * 0.5;
           }
        }
        `
      );
    };

    this.chunkDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.5
    });
    this.chunkDepthMaterial.userData = this.chunkMaterial.userData;
    this.chunkDepthMaterial.onBeforeCompile = this.chunkMaterial.onBeforeCompile;

    this.chunkDistanceMaterial = new THREE.MeshDistanceMaterial({
      alphaTest: 0.5
    });
    this.chunkDistanceMaterial.userData = this.chunkMaterial.userData;
    this.chunkDistanceMaterial.onBeforeCompile = this.chunkMaterial.onBeforeCompile;

    this.modelDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.5
    });
    this.modelDepthMaterial.onBeforeCompile = this.modelMaterial.onBeforeCompile;

    this.modelDistanceMaterial = new THREE.MeshDistanceMaterial({
      alphaTest: 0.5
    });
    this.modelDistanceMaterial.onBeforeCompile = this.modelMaterial.onBeforeCompile;


    this.chunkTransparentMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 40,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false
    });
    this.chunkTransparentMaterial.userData = this.chunkMaterial.userData;
    this.chunkTransparentMaterial.onBeforeCompile = this.chunkMaterial.onBeforeCompile;

    this.previewModelMaterial = this.modelMaterial.clone();
    this.previewModelMaterial.onBeforeCompile = this.modelMaterial.onBeforeCompile;
    this.previewModelMaterial.transparent = true;
    this.previewModelMaterial.opacity = 0.6;
    this.previewModelMaterial.depthTest = true;
    this.previewModelMaterial.polygonOffset = true;
    this.previewModelMaterial.polygonOffsetFactor = -2;
    this.previewModelMaterial.polygonOffsetUnits = -2;

    this.neonModelMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0, alphaTest: 0.5 });
    this.neonModelMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute uvec3 packedUVs;
        attribute uint packedColor;
        attribute float useMeshUV;
        flat varying uint vPackedUVTop;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        flat varying vec3 vInstanceColor;
        varying float vUseMeshUV;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vPackedUVTop = packedUVs.x;
        vLocalNormal = normal;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        vLocalPosition = position;
        vUseMeshUV = useMeshUV;

        float r = float(packedColor & 255u) / 255.0;
        float g = float((packedColor >> 8u) & 255u) / 255.0;
        float b = float((packedColor >> 16u) & 255u) / 255.0;
        vInstanceColor = vec3(r, g, b);
        `
      );
      shader.fragmentShader = `
        flat varying uint vPackedUVTop;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        flat varying vec3 vInstanceColor;
        varying float vUseMeshUV;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 baseUV = vec2(0.0);
          if (vUseMeshUV > 0.5) {
             baseUV = vMapUv;
          } else {
             if (abs(vLocalNormal.z) > 0.5) {
                baseUV = vec2(vLocalPosition.x, -vLocalPosition.y) / 32.0;
             } else if (abs(vLocalNormal.x) > 0.5) {
                baseUV = vec2(vLocalNormal.x > 0.0 ? -vLocalPosition.y : vLocalPosition.y, -vLocalPosition.z) / 32.0;
             } else {
                baseUV = vec2(vLocalNormal.y > 0.0 ? vLocalPosition.x : -vLocalPosition.x, -vLocalPosition.z) / 32.0;
             }
          }

          uint faceUVData = vPackedUVTop;
          float ux = float(faceUVData & 255u);
          float uy = float((faceUVData >> 8u) & 255u);
          uint scaleLevel = (faceUVData >> 16u) & 7u;
          float isFlipped = float((faceUVData >> 19u) & 1u);
          float size = 64.0;
          if (scaleLevel == 1u) size = 32.0;
          else if (scaleLevel == 2u) size = 16.0;
          else if (scaleLevel == 3u) size = 8.0;
          float uvScale = size / 2048.0;
          vec4 iuv;
          iuv.xy = vec2(ux * 8.0 / 2048.0, 1.0 - ((uy * 8.0 + size) / 2048.0));
          iuv.zw = vec2(uvScale, uvScale);
          if (isFlipped > 0.5) {
              iuv.z = -iuv.z;
              iuv.x += abs(iuv.z);
          }

          vec2 modifiedUV = fract(baseUV) * iuv.zw + iuv.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        diffuseColor.rgb *= vInstanceColor;
        `
      ).replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * 0.8;
        `
      );
    };

    this.previewNeonModelMaterial = this.neonModelMaterial.clone();
    this.previewNeonModelMaterial.onBeforeCompile = this.neonModelMaterial.onBeforeCompile;
    this.previewNeonModelMaterial.transparent = true;
    this.previewNeonModelMaterial.opacity = 0.6;
    this.previewNeonModelMaterial.depthTest = true;
    this.previewNeonModelMaterial.polygonOffset = true;
    this.previewNeonModelMaterial.polygonOffsetFactor = -2;
    this.previewNeonModelMaterial.polygonOffsetUnits = -2;

    const setupShader = (shader, userData) => {
      shader.uniforms.uTime = userData.time;
      shader.vertexShader = `
        attribute uint packedData;
        attribute uvec3 packedUVs;
        attribute uint packedColor;
        flat varying float vIsFluid;
        flat varying uvec3 vPackedUVs;
        flat varying vec3 vInstanceColor;
        flat varying float vFaceVisE;
        flat varying float vFaceVisW;
        flat varying float vFaceVisS;
        flat varying float vFaceVisN;
        flat varying float vFaceVisT;
        flat varying float vFaceVisB;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        flat varying vec3 vInstancePosition;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        uint pData = uint(packedData);
        vFaceVisE = float(pData & 1u);
        vFaceVisW = float((pData >> 1u) & 1u);
        vFaceVisS = float((pData >> 2u) & 1u);
        vFaceVisN = float((pData >> 3u) & 1u);
        vFaceVisT = float((pData >> 4u) & 1u);
        vFaceVisB = float((pData >> 5u) & 1u);
        vIsFluid  = float((pData >> 6u) & 7u);
        vPackedUVs = packedUVs;
        vLocalNormal = normal;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        vLocalPosition = position;
        vInstancePosition = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

        float r = float(packedColor & 255u) / 255.0;
        float g = float((packedColor >> 8u) & 255u) / 255.0;
        float b = float((packedColor >> 16u) & 255u) / 255.0;
        vInstanceColor = vec3(r, g, b);
        `
      );
      shader.fragmentShader = `
        uniform float uTime;
        flat varying float vIsFluid;
        flat varying uvec3 vPackedUVs;
        flat varying vec3 vInstanceColor;
        flat varying float vFaceVisE;
        flat varying float vFaceVisW;
        flat varying float vFaceVisS;
        flat varying float vFaceVisN;
        flat varying float vFaceVisT;
        flat varying float vFaceVisB;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        flat varying vec3 vInstancePosition;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          uint faceUVData = vPackedUVs.y; // Side Default
          if (vLocalNormal.z > 0.5) { faceUVData = vPackedUVs.x; } // Top
          else if (vLocalNormal.z < -0.5) { faceUVData = vPackedUVs.z; } // Bottom

          float ux = float(faceUVData & 255u);
          float uy = float((faceUVData >> 8u) & 255u);
          uint scaleLevel = (faceUVData >> 16u) & 7u;
          float isFlipped = float((faceUVData >> 19u) & 1u);
          float size = 64.0;
          if (scaleLevel == 1u) size = 32.0;
          else if (scaleLevel == 2u) size = 16.0;
          else if (scaleLevel == 3u) size = 8.0;
          float uvScale = size / 2048.0;
          vec4 iuv;
          iuv.xy = vec2(ux * 8.0 / 2048.0, 1.0 - ((uy * 8.0 + size) / 2048.0));
          iuv.zw = vec2(uvScale, uvScale);
          if (isFlipped > 0.5) { iuv.z = -iuv.z; iuv.x += abs(iuv.z); }

          vec2 baseUV = vMapUv;
            // Force ALL side faces to mathematically orient V directly downwards (-Z)
          if (abs(vLocalNormal.z) <= 0.5) {
            if (abs(vLocalNormal.x) > 0.5) {
                baseUV.x = vLocalNormal.x > 0.0 ? fract(0.5 - vLocalPosition.y / 32.0) : fract(vLocalPosition.y / 32.0 + 0.5);
            } else {
                baseUV.x = vLocalNormal.y > 0.0 ? fract(vLocalPosition.x / 32.0 + 0.5) : fract(0.5 - vLocalPosition.x / 32.0);
            }
            baseUV.y = fract(vLocalPosition.z / 32.0 + 0.5);
          }

          // --- Fluid Animation Override ---
          if (vIsFluid > 0.5 && vIsFluid < 3.5) {
              vec3 worldPos = vInstancePosition + vLocalPosition;
              if (vLocalNormal.z > 0.9) { // Flat Top face ONLY
                  // Seamless world-aligned mapping, NO time sliding
                  baseUV = fract(vec2(worldPos.x, -worldPos.y) / 32.0);
              }
          }

          vec2 modifiedUV = baseUV * iuv.zw + iuv.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );

          // --- Interior Face Culling ---
          float faceVis = 1.0;
          if (vLocalNormal.z > 0.5) faceVis = vFaceVisT;
          else if (vLocalNormal.z < -0.5) faceVis = vFaceVisB;
          else if (vLocalNormal.x > 0.5) faceVis = vFaceVisE; // East
          else if (vLocalNormal.x < -0.5) faceVis = vFaceVisW; // West
          else if (vLocalNormal.y > 0.5) faceVis = vFaceVisS; // South
          else if (vLocalNormal.y < -0.5) faceVis = vFaceVisN; // North

          if (faceVis < 0.5) discard;

          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb *= vInstanceColor;

          if (vIsFluid == 2.0) {
             totalEmissiveRadiance += diffuseColor.rgb * 0.8;
          } else if (vIsFluid == 3.0) {
             totalEmissiveRadiance += diffuseColor.rgb * 0.3;
          } else if (vIsFluid == 4.0) {
             totalEmissiveRadiance += diffuseColor.rgb * 1.0;
          } else if (vIsFluid == 5.0) {
             float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
             if (luma > 0.6) {
                 totalEmissiveRadiance += diffuseColor.rgb * 0.5;
             }
          }
        #endif
        `
      );
    };

    this.instancedMaterial.onBeforeCompile = (shader) => setupShader(shader, this.instancedMaterial.userData);
    this.glassMaterial.onBeforeCompile = (shader) => setupShader(shader, this.glassMaterial.userData);

    const cubeGeo = new THREE.BoxGeometry(32, 32, 32);
    cubeGeo.computeBoundingBox();
    cubeGeo.computeBoundingSphere();

    const slabGeo = new THREE.BoxGeometry(32, 32, 16);
    slabGeo.translate(0, 0, -8);
    slabGeo.computeBoundingBox();
    slabGeo.computeBoundingSphere();

    const topSlabGeo = new THREE.BoxGeometry(32, 32, 16);
    topSlabGeo.translate(0, 0, 8);
    topSlabGeo.computeBoundingBox();
    topSlabGeo.computeBoundingSphere();

    const halfRampGeo = new THREE.BoxGeometry(32, 32, 16);
    halfRampGeo.translate(0, 0, -8);
    let hrPos = halfRampGeo.attributes.position;
    for (let i = 0; i < hrPos.count; i++) {
      if (hrPos.getY(i) < 0 && hrPos.getZ(i) === 0) hrPos.setZ(i, -16);
    }
    let hrUv = halfRampGeo.attributes.uv;
    for (let i = 0; i < hrUv.count; i++) {
      if (i < 12) hrUv.setY(i, 1.0 - hrUv.getY(i));
    }
    halfRampGeo.computeVertexNormals();
    halfRampGeo.computeBoundingBox();
    halfRampGeo.computeBoundingSphere();

    const topHalfRampGeo = new THREE.BoxGeometry(32, 32, 16);
    topHalfRampGeo.translate(0, 0, 8);
    let thrPos = topHalfRampGeo.attributes.position;
    for (let i = 0; i < thrPos.count; i++) {
      if (thrPos.getY(i) < 0 && thrPos.getZ(i) === 16) thrPos.setZ(i, 0);
    }
    let thrUv = topHalfRampGeo.attributes.uv;
    for (let i = 0; i < thrUv.count; i++) {
      if (i < 12) thrUv.setY(i, 1.0 - thrUv.getY(i));
    }
    topHalfRampGeo.computeVertexNormals();
    topHalfRampGeo.computeBoundingBox();
    topHalfRampGeo.computeBoundingSphere();

    const rampGeo = new THREE.BoxGeometry(32, 32, 32);
    let pos = rampGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0 && pos.getZ(i) > 0) {
        pos.setZ(i, -16);
      }
    }
    let rampUv = rampGeo.attributes.uv;
    for (let i = 0; i < rampUv.count; i++) {
      if (i < 12) {
        rampUv.setY(i, 1.0 - rampUv.getY(i));
      }
    }
    rampGeo.computeVertexNormals();
    rampGeo.computeBoundingBox();
    rampGeo.computeBoundingSphere();

    // Merge two boxes manually to form a stair block
    const stairGeo = new THREE.BufferGeometry();
    const bottomBox = new THREE.BoxGeometry(32, 32, 16);
    bottomBox.translate(0, 0, -8);
    const topBox = new THREE.BoxGeometry(32, 16, 16);
    topBox.translate(0, 8, 8);

    const pos1 = bottomBox.attributes.position.array;
    const pos2 = topBox.attributes.position.array;
    const mergedPos = new Float32Array(pos1.length + pos2.length);
    mergedPos.set(pos1, 0); mergedPos.set(pos2, pos1.length);
    stairGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));

    const uv1 = bottomBox.attributes.uv.array;
    const uv2 = topBox.attributes.uv.array;
    const mergedUv = new Float32Array(uv1.length + uv2.length);
    mergedUv.set(uv1, 0); mergedUv.set(uv2, uv1.length);
    stairGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));

    const norm1 = bottomBox.attributes.normal.array;
    const norm2 = topBox.attributes.normal.array;
    const mergedNorm = new Float32Array(norm1.length + norm2.length);
    mergedNorm.set(norm1, 0); mergedNorm.set(norm2, norm1.length);
    stairGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));

    const idx1 = bottomBox.index.array;
    const idx2 = topBox.index.array;
    const mergedIdx = new Uint16Array(idx1.length + idx2.length);
    mergedIdx.set(idx1, 0);
    const offset = pos1.length / 3;
    for(let i = 0; i < idx2.length; i++) mergedIdx[idx1.length + i] = idx2[i] + offset;
    stairGeo.setIndex(new THREE.BufferAttribute(mergedIdx, 1));

    stairGeo.computeBoundingBox();
    stairGeo.computeBoundingSphere();

    const doorGeo = new THREE.BufferGeometry();
    const doorBaseBox = new THREE.BoxGeometry(32, 4, 32);
    const handleBox = new THREE.BoxGeometry(2, 6, 4);
    handleBox.translate(12, 0, 0);

    const p1 = doorBaseBox.attributes.position.array;
    const p2 = handleBox.attributes.position.array;
    const mPos = new Float32Array(p1.length + p2.length);
    mPos.set(p1, 0); mPos.set(p2, p1.length);
    doorGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));

    const u1 = doorBaseBox.attributes.uv.array;
    const u2 = handleBox.attributes.uv.array;
    const mUv = new Float32Array(u1.length + u2.length);
    mUv.set(u1, 0); mUv.set(u2, u1.length);
    doorGeo.setAttribute('uv', new THREE.BufferAttribute(mUv, 2));

    const n1 = doorBaseBox.attributes.normal.array;
    const n2 = handleBox.attributes.normal.array;
    const mNorm = new Float32Array(n1.length + n2.length);
    mNorm.set(n1, 0); mNorm.set(n2, n1.length);
    doorGeo.setAttribute('normal', new THREE.BufferAttribute(mNorm, 3));

    const i1 = doorBaseBox.index.array;
    const i2 = handleBox.index.array;
    const mIdx = new Uint16Array(i1.length + i2.length);
    mIdx.set(i1, 0);
    const off = p1.length / 3;
    for(let i = 0; i < i2.length; i++) mIdx[i1.length + i] = i2[i] + off;
    doorGeo.setIndex(new THREE.BufferAttribute(mIdx, 1));

    doorGeo.computeBoundingBox();
    doorGeo.computeBoundingSphere();

    const decalGeo = new THREE.PlaneGeometry(32, 32);
    decalGeo.translate(0, 0, -15.9);
    decalGeo.computeBoundingBox();
    decalGeo.computeBoundingSphere();
    const decalUseMeshUVArray = new Float32Array(decalGeo.attributes.position.count).fill(1);
    decalGeo.setAttribute('useMeshUV', new THREE.BufferAttribute(decalUseMeshUVArray, 1));

    this.blockGeometries = { fence: [] };
    const postGeo = new THREE.BoxGeometry(8, 8, 32);
    const railN = new THREE.BoxGeometry(4, 12, 24); railN.translate(0, -10, 0);
    const railS = new THREE.BoxGeometry(4, 12, 24); railS.translate(0, 10, 0);
    const railE = new THREE.BoxGeometry(12, 4, 24); railE.translate(10, 0, 0);
    const railW = new THREE.BoxGeometry(12, 4, 24); railW.translate(-10, 0, 0);
    for (let i = 0; i < 16; i++) {
        const parts = [postGeo.clone()];
        if (i & 1) parts.push(railN.clone());
        if (i & 2) parts.push(railS.clone());
        if (i & 4) parts.push(railE.clone());
        if (i & 8) parts.push(railW.clone());
        const merged = mergeGeometries(parts, false);
        merged.computeBoundingBox();
        merged.computeBoundingSphere();
        this.blockGeometries.fence[i] = merged;
    }

    this.previewMaterial = this.instancedMaterial.clone();
    this.previewMaterial.onBeforeCompile = this.instancedMaterial.onBeforeCompile;
    this.previewMaterial.transparent = true;
    this.previewMaterial.opacity = 0.6;
    this.previewMaterial.depthTest = true;
    this.previewMaterial.polygonOffset = true;
    this.previewMaterial.polygonOffsetFactor = -2;
    this.previewMaterial.polygonOffsetUnits = -2;

    const createPreviewMesh = (geometry) => {
      const maxPreview = 4096;
      geometry.setAttribute('packedUVs', new THREE.InstancedBufferAttribute(new Uint32Array(maxPreview * 3), 3));
      geometry.setAttribute('packedData', new THREE.InstancedBufferAttribute(new Uint32Array(maxPreview), 1));
      geometry.setAttribute('packedColor', new THREE.InstancedBufferAttribute(new Uint32Array(maxPreview), 1));
      const mesh = new THREE.InstancedMesh(geometry, this.previewMaterial, maxPreview);
      mesh.castShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 998;
      this.scene.add(mesh); return mesh;
    };

    this.previewCubeMesh = createPreviewMesh(cubeGeo.clone());
    this.previewSlabMesh = createPreviewMesh(slabGeo.clone());
    this.previewTopSlabMesh = createPreviewMesh(topSlabGeo.clone());
    this.previewRampMesh = createPreviewMesh(rampGeo.clone());
    this.previewHalfRampMesh = createPreviewMesh(halfRampGeo.clone());
    this.previewTopHalfRampMesh = createPreviewMesh(topHalfRampGeo.clone());
    this.previewStairMesh = createPreviewMesh(stairGeo.clone());
    this.previewDecalMesh = createPreviewMesh(decalGeo.clone());
    this.previewDoorMesh = createPreviewMesh(doorGeo.clone());
    this.previewFenceMesh = createPreviewMesh(this.blockGeometries.fence[15].clone());

    this.decorMaterial = this.instancedMaterial.clone();
    this.decorMaterial.side = THREE.DoubleSide;
    this.decorMaterial.depthWrite = true;
    this.decorMaterial.alphaTest = 0.5;
    this.decorMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute uvec3 packedUVs;
        attribute uint packedColor;
        flat varying uint vPackedUVTop;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vInstanceColor;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vPackedUVTop = packedUVs.x;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );

        float r = float(packedColor & 255u) / 255.0;
        float g = float((packedColor >> 8u) & 255u) / 255.0;
        float b = float((packedColor >> 16u) & 255u) / 255.0;
        vInstanceColor = vec3(r, g, b);
        `
      );
      shader.fragmentShader = `
        flat varying uint vPackedUVTop;
        flat varying vec3 vWorldNormal;
        flat varying vec3 vInstanceColor;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          uint faceUVData = vPackedUVTop;
          float ux = float(faceUVData & 255u);
          float uy = float((faceUVData >> 8u) & 255u);
          uint scaleLevel = (faceUVData >> 16u) & 7u;
          float isFlipped = float((faceUVData >> 19u) & 1u);
          float size = scaleLevel == 1u ? 32.0 : (scaleLevel == 2u ? 16.0 : (scaleLevel == 3u ? 8.0 : 64.0));
          float uvScale = size / 2048.0;
          vec4 iuv = vec4(ux * 8.0 / 2048.0, 1.0 - ((uy * 8.0 + size) / 2048.0), uvScale, uvScale);
          if (isFlipped > 0.5) { iuv.z = -iuv.z; iuv.x += abs(iuv.z); }

          vec2 modifiedUV = vMapUv * iuv.zw + iuv.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb *= vInstanceColor;
        #endif
        `
      );
    };

    const decorGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -16, 0, 32,  16, 0, 32,  -16, 0, 0,   16, 0, 32,  16, 0, 0,  -16, 0, 0,
       0, -16, 32,  0, 16, 32,  0, -16, 0,   0, 16, 32,  0, 16, 0,  0, -16, 0
    ]);
    const uvsGeo = new Float32Array([
      0, 1,  1, 1,  0, 0,   1, 1,  1, 0,  0, 0,
      0, 1,  1, 1,  0, 0,   1, 1,  1, 0,  0, 0
    ]);
    decorGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    decorGeo.setAttribute('uv', new THREE.BufferAttribute(uvsGeo, 2));
    decorGeo.computeVertexNormals();

    Object.assign(this.blockGeometries, {
        cube: cubeGeo,
        slab: slabGeo,
        top_slab: topSlabGeo,
        ramp: rampGeo,
        half_ramp: halfRampGeo,
        top_half_ramp: topHalfRampGeo,
        stair: stairGeo,
        door: doorGeo,
        decor: decorGeo,
        decal: decalGeo
    });
  }

  getOrCreateDoorMesh(baseShape) {
      if (!this.dynamicDoorMeshes) this.dynamicDoorMeshes = new Map();
      if (this.dynamicDoorMeshes.has(baseShape)) return this.dynamicDoorMeshes.get(baseShape);

      let geo;
      let useMeshUVDefault = 0;
      if (this.assetManager.modelMeshes[baseShape]) {
          geo = this.assetManager.modelMeshes[baseShape].geometry.clone();
          if (FURNITURE_REGISTRY[baseShape] && FURNITURE_REGISTRY[baseShape].useMeshUV) {
              useMeshUVDefault = 1;
          }
      } else {
          // Fallback legacy mapping for 'door' to wooden-door-1
          if (baseShape === 'door' && this.assetManager.modelMeshes['wooden-door-1']) {
             geo = this.assetManager.modelMeshes['wooden-door-1'].geometry.clone();
             useMeshUVDefault = 1;
          } else {
             return null;
          }
      }

      geo.setAttribute('packedUVs', new THREE.InstancedBufferAttribute(new Uint32Array(4000 * 3), 3));
      geo.setAttribute('packedColor', new THREE.InstancedBufferAttribute(new Uint32Array(4000), 1));

      if (!geo.attributes.useMeshUV) {
          const useMeshUVDummy = new Float32Array(geo.attributes.position.count).fill(useMeshUVDefault);
          geo.setAttribute('useMeshUV', new THREE.BufferAttribute(useMeshUVDummy, 1));
      }

      const mesh = new THREE.InstancedMesh(geo, this.modelMaterial, 4000);
      mesh.castShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.customDepthMaterial = this.modelDepthMaterial;
      mesh.customDistanceMaterial = this.modelDistanceMaterial;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.userData.doorMap = {};
      this.scene.add(mesh);

      this.dynamicDoorMeshes.set(baseShape, mesh);
      return mesh;
  }

  updateDoors() {
    if (!this.engine.doors) return;
    const doors = this.engine.doors;

    if (this.dynamicDoorMeshes) {
        for (const mesh of this.dynamicDoorMeshes.values()) {
            mesh.count = 0;
            mesh.userData.doorMap = {};
        }
    }

    if (!this.doorStates) this.doorStates = new Map();

    const now = performance.now();

    const doorsByShape = new Map();
    for (let i = 0; i < doors.length; i++) {
        const d = doors[i];
        let actualBaseShape = 'door';
        if (d.shape.startsWith('door_')) {
            actualBaseShape = 'door';
        } else {
            actualBaseShape = d.shape.replace('_open', '').replace('_flip', '');
        }

        if (!doorsByShape.has(actualBaseShape)) doorsByShape.set(actualBaseShape, []);
        doorsByShape.get(actualBaseShape).push(d);
    }

    for (const [baseShape, shapeDoors] of doorsByShape.entries()) {
        const mesh = this.getOrCreateDoorMesh(baseShape);
        if (!mesh) continue;

        const maxDoors = 4000;
        const count = Math.min(shapeDoors.length, maxDoors);

        for (let i = 0; i < count; i++) {
            const d = shapeDoors[i];
            let rot = 0;
            const isOp = d.shape.includes('_open');
            const isFlip = d.shape.includes('_flip');

            if (baseShape === 'door') {
                if (d.shape.includes('door_e')) rot = -Math.PI / 2;
                else if (d.shape.includes('door_n')) rot = Math.PI;
                else if (d.shape.includes('door_w')) rot = Math.PI / 2;
                else if (d.shape.includes('door_s')) rot = 0;
            } else {
                if (d.dir === 'e') rot = -Math.PI / 2;
                else if (d.dir === 'n') rot = Math.PI;
                else if (d.dir === 'w') rot = Math.PI / 2;
                else if (d.dir === 's') rot = 0;
            }

            let targetRot = rot;
            if (isOp) {
                targetRot += isFlip ? -Math.PI / 2 : Math.PI / 2;
            }

            const doorKey = `${d.x}_${d.y}_${d.z}`;
            let state = this.doorStates.get(doorKey);
            if (!state) {
                state = {
                    currentRot: targetRot,
                    targetRot: targetRot,
                    startRot: targetRot,
                    animStartTime: 0,
                    tex: d.tex,
                    color: d.color
                };
                this.doorStates.set(doorKey, state);
            }

            if (state.targetRot !== targetRot) {
                state.startRot = state.currentRot;
                state.targetRot = targetRot;
                state.animStartTime = now;
            }

            if (state.currentRot !== state.targetRot) {
                const animDuration = 250; // 250ms fast smooth swing
                const elapsed = now - state.animStartTime;
                let progress = Math.min(1.0, elapsed / animDuration);
                progress = -(Math.cos(Math.PI * progress) - 1) / 2;

                let diff = state.targetRot - state.startRot;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                state.currentRot = state.startRot + (diff * progress);

                if (progress >= 1.0) {
                    state.currentRot = state.targetRot;
                }
            }

            const m = new THREE.Matrix4();
            m.makeTranslation(d.x, d.y, d.z);

            let hingeOffset = new THREE.Vector3(-16, 0, 0);
            if (isFlip) hingeOffset.set(16, 0, 0);
            hingeOffset.applyAxisAngle(new THREE.Vector3(0, 0, 1), rot);

            m.multiply(new THREE.Matrix4().makeTranslation(hingeOffset.x, hingeOffset.y, 0));
            m.multiply(new THREE.Matrix4().makeRotationZ(state.currentRot));
            if (isFlip) {
                 m.multiply(new THREE.Matrix4().makeTranslation(-16, 0, 0));
                 m.multiply(new THREE.Matrix4().makeRotationZ(Math.PI));
            } else {
                 m.multiply(new THREE.Matrix4().makeTranslation(16, 0, 0));
            }

            mesh.setMatrixAt(i, m);

            const color = new THREE.Color();
            let cHex = d.color;
            if (!cHex || typeof cHex !== 'string' || !cHex.startsWith('#') || cHex.includes('NaN')) cHex = '#ffffff';
            color.setStyle(cHex);
            const pr = Math.max(0, Math.min(255, color.r * 255)) | 0;
            const pg = Math.max(0, Math.min(255, color.g * 255)) | 0;
            const pb = Math.max(0, Math.min(255, color.b * 255)) | 0;

            mesh.geometry.attributes.packedColor.setX(i, pr | (pg << 8) | (pb << 16));

            let texName = d.tex;
            const furn = FURNITURE_REGISTRY[baseShape];
            if (furn && furn.customTexture) texName = baseShape;
            else if (baseShape === 'door') texName = 'wooden-door-1'; // Legacy Fallback

            let atlasPos = this.assetManager.atlasMap[texName] || this.assetManager.atlasMap['wooden-door-1'];
            const ux = Math.round(atlasPos.x * 8);
            const uy = Math.round(atlasPos.y * 8);
            const scaleLevel = 0;
            const flipVal = isFlip ? 1 : 0;
            const packedUV = (ux & 255) | ((uy & 255) << 8) | (scaleLevel << 16) | (flipVal << 19);
            mesh.geometry.attributes.packedUVs.setXYZ(i, packedUV, packedUV, packedUV);

            mesh.userData.doorMap[i] = { cx: d.x, cy: d.y, cz: d.z };
        }

        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.geometry.attributes.packedColor.needsUpdate = true;
        mesh.geometry.attributes.packedUVs.needsUpdate = true;
    }
  }

  setupCompass() {
    let compassWrapper = document.getElementById('compass-wrapper');
    if (!compassWrapper) {
      compassWrapper = document.createElement('div');
      compassWrapper.id = 'compass-wrapper';
      compassWrapper.style.cssText = 'position: absolute; display: none; flex-direction: column; align-items: center; gap: 8px; z-index: 1000;';

      let compass = document.createElement('div');
      compass.id = 'compass-ui';
      compass.style.cssText = 'position: relative; width: 40px; height: 40px; background: rgba(5, 7, 10, 0.8); border: 2px solid #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer; font-family: var(--font-mono); font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.8); transition: background 0.2s;';

      compass.onmouseenter = () => compass.style.background = 'rgba(52, 152, 219, 0.3)';
      compass.onmouseleave = () => compass.style.background = 'rgba(5, 7, 10, 0.8)';
      compass.onclick = () => {
        const snapAngle = this.engine.clientSettings.cameraAngleSnap !== undefined ? this.engine.clientSettings.cameraAngleSnap : 0;
        this.cameraAngle = parseInt(snapAngle, 10);
        this.cameraPitch = Math.atan(1 / Math.sqrt(2));
        this.engine.clientSettings.cameraAngle = this.cameraAngle;
        localStorage.setItem('b_client_settings', JSON.stringify(this.engine.clientSettings));
        if (this.engine.network) this.engine.network.sendClientSettings(this.engine.clientSettings);
        this.updateCameraRotation();
      };

      const needle = document.createElement('div');
      needle.id = 'compass-needle';
      needle.style.cssText = 'position: relative; width: 4px; height: 32px; background: linear-gradient(to bottom, #e74c3c 50%, #bdc3c7 50%); border-radius: 2px; z-index: 2;';

      const nLabel = document.createElement('div');
      nLabel.innerText = 'N';
      nLabel.style.cssText = 'position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #e74c3c; text-shadow: 1px 1px 0 #000;';
      needle.appendChild(nLabel);

      compass.appendChild(needle);

      const sunIcon = document.createElement('div');
      sunIcon.id = 'compass-sun';
      sunIcon.style.cssText = 'position: absolute; width: 10px; height: 10px; background: #f1c40f; border-radius: 50%; box-shadow: 0 0 8px #f1c40f; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: background 0.5s, box-shadow 0.5s; pointer-events: none; z-index: 1;';
      compass.appendChild(sunIcon);

      compassWrapper.appendChild(compass);

      const clockDisplay = document.createElement('div');
      clockDisplay.id = 'in-game-clock';
      clockDisplay.style.cssText = 'background: rgba(5, 7, 10, 0.8); border: 1px solid #3498db; color: #fff; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: auto; cursor: default; white-space: nowrap;';
      clockDisplay.innerText = '06:00 AM';
      compassWrapper.appendChild(clockDisplay);

      document.body.appendChild(compassWrapper);
    }
  }

  updateCompass() {
    const needle = document.getElementById('compass-needle');
    if (needle) {
      needle.style.transform = `rotate(${-this.cameraAngle}deg)`;
    }
  }

  isBlockOccluded(x, y, z, shape) {
    return this.voxelManager.isBlockOccluded(x, y, z, shape);
  }

  cacheOcclusion() {
    this.voxelManager.cacheOcclusion();
  }

  updateBlockOcclusion(localX, localY, localZ) {
    this.voxelManager.updateBlockOcclusion(localX, localY, localZ);
  }

  getRelativeSpriteDirection(absoluteDir) {
    const dirs = ['down-left', 'down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left'];
    let dirIdx = dirs.indexOf(absoluteDir);
    if (dirIdx === -1) dirIdx = 0;

    const shift = Math.round((-this.cameraAngle || 0) / 45);

    let relativeIdx = (dirIdx + shift) % 8;
    if (relativeIdx < 0) relativeIdx += 8;

    return dirs[relativeIdx];
  }

  updateCameraTracking() {
    const p = this.engine.player;
    if (!p) return;

    // The camera stays fixed at an isometric angle, but its physical location
    // must orbit the player based on the current cameraAngle.
    const camOffsetDist = 500;
    const zRotOffset = -this.cameraAngle * (Math.PI / 180);
    // Calculate the orbit angle relative to the player
    const orbitAngle = (Math.PI / 4) + zRotOffset;

    const cx = this.engine.camera.x ?? 0;
    const cy = this.engine.camera.y ?? 0;
    const cz = this.engine.camera.z ?? 0;

    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    if (this.engine.clientSettings.enableCameraShake !== false && this.engine.cameraShake > 0) {
      shakeX = (Math.random() - 0.5) * this.engine.cameraShake;
      shakeY = (Math.random() - 0.5) * this.engine.cameraShake;
      shakeZ = (Math.random() - 0.5) * this.engine.cameraShake;
    }

    this.camera.position.x = cx + (Math.sin(orbitAngle) * camOffsetDist) + shakeX;
    this.camera.position.y = cy + (Math.cos(orbitAngle) * camOffsetDist) + shakeY;
    this.camera.position.z = cz + (camOffsetDist * Math.tan(this.cameraPitch)) + shakeZ;

    this.camera.lookAt(cx + shakeX, cy + shakeY, cz + shakeZ);

    if (this.engine.arcadeSystem) {
      this.engine.arcadeSystem.cameraManager.applyOverride(this.camera);
    }

    this.camera.updateMatrixWorld();

    if (this.sunLight) {
      this.sunLight.position.set(cx + (this.sunOffsetX || 0), cy + (this.sunOffsetY || 500), cz + (this.sunOffsetZ || 1500));
      this.sunLight.target.position.set(cx, cy, cz);
      this.sunLight.target.updateMatrixWorld();
    }
  }

  // Instantiates a physical 3D screen overlay for an Arcade Cabinet using exact Blockbench coordinates
  createArcadeScreen(cabinetX, cabinetY, cabinetZ, dir, canvas) {
    const screenGroup = new THREE.Group();
    screenGroup.position.set(cabinetX, cabinetY, cabinetZ);

    // Orient the screen group to match the cabinet's facing direction
    if (dir === 'e') screenGroup.rotation.z = -Math.PI / 2;
    else if (dir === 'n') screenGroup.rotation.z = Math.PI;
    else if (dir === 'w') screenGroup.rotation.z = Math.PI / 2;

    // Pivot Point: -14.0168, 16.0338, -0.0104
    const pivot = new THREE.Group();
    // Map Blockbench (X,Y,Z) to Engine (X,-Y,Z) relative to the 32x32 voxel center
    pivot.position.set(-14.0168, 0.0104, 16.0338);

    // Rotation: 0.033, 0, -67.5 (Blockbench uses X for pitch)
    pivot.rotation.x = -67.5 * (Math.PI / 180);
    pivot.rotation.y = 0;
    pivot.rotation.z = 0.033 * (Math.PI / 180);

    // Size: 10.5, 5, 15.8
    // (We only need width/height for a PlaneGeometry)
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;

    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(10.5, 15.8);
    const screenMesh = new THREE.Mesh(geo, mat);

    // Position: -23.5168, 29.0338, -7.9104
    // Offset mesh back from pivot
    screenMesh.position.set(-9.5, -7.9, 13.0);

    pivot.add(screenMesh);
    screenGroup.add(pivot);

    // Add screen glow lighting!
    const screenLight = new THREE.PointLight(0x00d2ff, 1.5, 150, 1.5);
    screenLight.position.set(-14, -10, 16);
    screenGroup.add(screenLight);

    this.scene.add(screenGroup);

    return {
        group: screenGroup,
        light: screenLight,
        texture: tex
    };
  }

  handleResize() {
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 1000;
    this.camera.left = frustumSize * aspect / -2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.updateProjectionMatrix();
    this.camera.userData.aspect = aspect;

    if (this.debugCanvas) {
      this.debugCanvas.width = window.innerWidth;
      this.debugCanvas.height = window.innerHeight;
    }
  }

  toggleSoftShadows(isEnabled) {
    this.webgl.shadowMap.type = isEnabled ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.scene.traverse((child) => {
        if (child.material) {
            child.material.needsUpdate = true;
        }
    });
  }

  toggleShadows(isEnabled) {
    this.webgl.shadowMap.enabled = isEnabled;
    if (this.sunLight) this.sunLight.castShadow = isEnabled;
    if (this.playerLight) this.playerLight.castShadow = isEnabled;
    if (this.otherPlayerLights) {
      for (const light of this.otherPlayerLights.values()) {
        light.castShadow = isEnabled;
      }
    }

    const meshes = [
      this.previewCubeMesh, this.previewSlabMesh, this.previewTopSlabMesh,
      this.previewRampMesh, this.previewHalfRampMesh, this.previewTopHalfRampMesh,
      this.previewStairMesh, this.previewDecalMesh, this.previewFenceMesh, this.previewDoorMesh
    ].filter(Boolean);

    meshes.forEach(mesh => {
      mesh.castShadow = isEnabled;
      mesh.receiveShadow = isEnabled;
      if (mesh.material) mesh.material.needsUpdate = true;
    });

    this.chunkMeshes.forEach(mesh => {
      mesh.castShadow = isEnabled;
      mesh.receiveShadow = isEnabled;
    });

    this.chunkTransparentMeshes.forEach(mesh => {
      mesh.receiveShadow = isEnabled;
    });

    if (this.dynamicDoorMeshes) {
      for (const mesh of this.dynamicDoorMeshes.values()) {
        mesh.castShadow = isEnabled;
        mesh.receiveShadow = isEnabled;
      }
    }

    const updateSpriteShadows = (map) => {
      if (map) {
        for (const [id, group] of map.entries()) {
          if (group.userData.shadowProxy) {
            group.userData.shadowProxy.castShadow = isEnabled;
          }
          if (group.userData.sprite && group.userData.sprite.isMesh) {
            group.userData.sprite.receiveShadow = isEnabled;
            if (group.userData.sprite.material) group.userData.sprite.material.needsUpdate = true;
          }
        }
      }
    };

    updateSpriteShadows(this.entityMeshes);
    updateSpriteShadows(this.projectileMeshes);
    updateSpriteShadows(this.debrisMeshes);
  }

  draw() {
    const eng = this.engine;

    if (this.playerLight && eng.player) {
      const isFlashlightOn = eng.player.activePowers && eng.player.activePowers.includes('flashlight');

      if (isFlashlightOn) {
        this.playerLight.angle = Math.PI / 4;
        this.playerLight.penumbra = 0.5;
        const dirAngleMap = {
          'down-left': 0, 'down': Math.PI / 4, 'down-right': Math.PI / 2, 'right': Math.PI * 0.75,
          'up-right': Math.PI, 'up': -Math.PI * 0.75, 'up-left': -Math.PI / 2, 'left': -Math.PI / 4
        };
        const targetAngle = dirAngleMap[eng.player.dir] || 0;

        if (this.playerLight.userData.currentAngle === undefined) {
          this.playerLight.userData.currentAngle = targetAngle;
        }

        let diff = targetAngle - this.playerLight.userData.currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.playerLight.userData.currentAngle += diff * 0.15; // The smoothing speed (lower = slower sweep)
        const smoothAngle = this.playerLight.userData.currentAngle;

        this.playerLight.position.set(eng.player.x + Math.cos(smoothAngle) * 15, eng.player.y + Math.sin(smoothAngle) * 15, (eng.player.z || 0) + 36);
        this.playerLight.target.position.set(eng.player.x + Math.cos(smoothAngle) * 300, eng.player.y + Math.sin(smoothAngle) * 300, (eng.player.z || 0) + 16);
        this.playerLight.target.updateMatrixWorld();
      } else {
        this.playerLight.position.set(eng.player.x, eng.player.y, (eng.player.z || 0) + 48);
        this.playerLight.angle = Math.PI / 2; // Widened to act as ambient glow
        this.playerLight.penumbra = 1.0;
        this.playerLight.target.position.set(eng.player.x, eng.player.y, (eng.player.z || 0) - 100);
        this.playerLight.target.updateMatrixWorld();
      }
    }

    if (!this.otherPlayerLights) this.otherPlayerLights = new Map();
    const activeLightIds = new Set();
    for (const [id, op] of Object.entries(eng.otherPlayers)) {
      if (op.state === 'death' || op.state === 'dead') continue;
      const isFlashlightOn = op.activePowers && op.activePowers.includes('flashlight');
      if (!isFlashlightOn) continue;

      activeLightIds.add(id);
      let opLight = this.otherPlayerLights.get(id);
      if (!opLight) {
        opLight = new THREE.SpotLight(0xeef4ff, 20000, 2000, Math.PI / 4, 0.5, 1.5);
        opLight.castShadow = this.engine.clientSettings.enableShadows !== false;
        opLight.shadow.mapSize.width = 1024;
        opLight.shadow.mapSize.height = 1024;
        opLight.shadow.camera.near = 10;
        opLight.shadow.camera.far = 2000;
        opLight.shadow.bias = -0.001;
        this.scene.add(opLight);
        this.scene.add(opLight.target);
        this.otherPlayerLights.set(id, opLight);
      }

      let flickerMult = 1.0;
      if (op.hurtTimer > 0) {
        flickerMult = Math.random() > 0.3 ? 0.2 : 1.2;
      } else if (op.synthEnergy !== undefined && op.synthEnergy < (op.maxSynthEnergy || 1000) * 0.1) {
        if (Math.random() > 0.75) flickerMult = 0.1 + Math.random() * 0.4;
      }
      opLight.intensity = 20000 * flickerMult;

      const dirAngleMap = {
        'down-left': 0, 'down': Math.PI / 4, 'down-right': Math.PI / 2, 'right': Math.PI * 0.75,
        'up-right': Math.PI, 'up': -Math.PI * 0.75, 'up-left': -Math.PI / 2, 'left': -Math.PI / 4
      };
      const targetAngle = dirAngleMap[op.dir] || 0;

      if (opLight.userData.currentAngle === undefined) opLight.userData.currentAngle = targetAngle;
      let diff = targetAngle - opLight.userData.currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      opLight.userData.currentAngle += diff * 0.15;
      const smoothAngle = opLight.userData.currentAngle;

      opLight.position.set(op.x + Math.cos(smoothAngle) * 15, op.y + Math.sin(smoothAngle) * 15, (op.z || 0) + 36);
      opLight.target.position.set(op.x + Math.cos(smoothAngle) * 300, op.y + Math.sin(smoothAngle) * 300, (op.z || 0) + 16);
      opLight.target.updateMatrixWorld();
    }

    for (const [id, opLight] of this.otherPlayerLights.entries()) {
      if (!activeLightIds.has(id)) {
        this.scene.remove(opLight.target);
        this.scene.remove(opLight);
        if (opLight.dispose) opLight.dispose();
        this.otherPlayerLights.delete(id);
      }
    }

    if (this.instancedMaterial && this.instancedMaterial.userData.time) {
        this.instancedMaterial.userData.time.value = performance.now() / 1000;
    }
    if (this.chunkMaterial && this.chunkMaterial.userData.time) {
        this.chunkMaterial.userData.time.value = performance.now() / 1000;
    }

    const compassWrapper = document.getElementById('compass-wrapper');
    if (compassWrapper && eng.clientSettings.showMinimap) {
      const mmBox = eng.getMinimapBox();
      const uiScale = eng.clientSettings.uiScale !== undefined ? eng.clientSettings.uiScale : 1.0;
      compassWrapper.style.zoom = uiScale;
      compassWrapper.style.left = ((mmBox.x + mmBox.size - 55) / uiScale) + 'px';
      compassWrapper.style.top = ((mmBox.y + 15) / uiScale) + 'px';
      compassWrapper.style.right = 'auto';
      compassWrapper.style.bottom = 'auto';
      compassWrapper.style.display = 'flex';
    } else if (compassWrapper) {
      compassWrapper.style.display = 'none';
    }

    if (this.debugCanvas) {
      this.debugCtx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
    }

    this.lightingManager.updateTimeOfDay();
    this.lightingManager.updateDynamicLights();
    this.updateCameraTracking();
    this.assetManager.updateAnimatedTiles();
    this.voxelManager.checkChunkUpdate();
    if (this.voxelIterator) {
      const result = this.voxelIterator.next();
      if (result.done) this.voxelIterator = null;
    } else if (this.needsVoxelUpdate) {
      this.needsVoxelUpdate = false;
      this.voxelIterator = this.voxelManager.updateVoxelsGenerator();
    }
    this.engine.entityManager.updateEntities();
    this.particleManager.updateProjectiles();
    this.particleManager.updateParticles();
    this.updateDoors();
    this.engine.entityManager.updateDebris();
    this.debugRenderer.updateArrowHelper();
    this.debugRenderer.update3DDebug();
    this.debugRenderer.updateTeleportVisuals();

    if (this.spriteBatcher) {
       this.spriteBatcher.begin();
       this.debugRenderer.updateWebGLUI();
       this.spriteBatcher.end();
    }

    if (this.debugCtx) {
      const ctx = this.debugCtx;

      ctx.save();
      if (eng.mapOverlay && eng.mapOverlay.active) {
        const box = eng.getMinimapBox();
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.size, box.size);
        ctx.clip();
      }
      this.debugRenderer.update2DOverlay();
      ctx.restore();
    }

    let frustumSize = 1000;
    if (eng.mapOverlay && eng.mapOverlay.active) {
      const box = eng.getMinimapBox();
      const glY = window.innerHeight - box.y - box.size;

      this.webgl.setViewport(box.x, glY, box.size, box.size);
      this.webgl.setScissor(box.x, glY, box.size, box.size);
      this.webgl.setScissorTest(true);

      const aspect = 1.0;
      if (this.camera.userData.aspect !== aspect) {
        this.camera.userData.aspect = aspect;
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.updateProjectionMatrix();
      }
    } else {
      this.webgl.setViewport(0, 0, window.innerWidth, window.innerHeight);
      this.webgl.setScissorTest(false);

      const aspect = window.innerWidth / window.innerHeight;
      if (this.camera.userData.aspect !== aspect) {
        this.camera.userData.aspect = aspect;
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.updateProjectionMatrix();
      }
    }

    this.webgl.render(this.scene, this.camera);
  }
}
