import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { AssetManager } from './asset-manager.js?v=new-engine-330';
import { DebugRenderer } from './debug-renderer.js?v=new-engine-330';
import { VoxelManager } from './voxel-manager.js?v=new-engine-330';
import { ParticleManager } from './particle-manager.js?v=new-engine-330';
import { LightingManager } from './lighting-manager.js?v=new-engine-330';
import { BlockRegistry, FURNITURE_REGISTRY } from './registry.js?v=new-engine-330';

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

    this.voxelManager = new VoxelManager(this);
    this.particleManager = new ParticleManager(this);
    this.lightingManager = new LightingManager(this);
    this.assetManager = new AssetManager(this);
    this.assetManager.loadAssets();
  }

  get doorMap() { return this.voxelManager.doorMap; }
  get doorPhysics() { return this.voxelManager.doorPhysics; }

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
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
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

    this.modelMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0 });
    this.modelMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute vec4 instanceUVTop;
        varying vec4 vInstanceUVTop;
        varying vec3 vWorldNormal;
        varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vInstanceUVTop = instanceUVTop;
        vLocalNormal = normal;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        vLocalPosition = position;
        `
      );
      shader.fragmentShader = `
        varying vec4 vInstanceUVTop;
        varying vec3 vWorldNormal;
        varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 baseUV = vec2(0.0);
          if (abs(vLocalNormal.z) > 0.5) {
             baseUV = vec2(vLocalPosition.x, -vLocalPosition.y) / 32.0;
          } else if (abs(vLocalNormal.x) > 0.5) {
             baseUV = vec2(vLocalNormal.x > 0.0 ? -vLocalPosition.y : vLocalPosition.y, -vLocalPosition.z) / 32.0;
          } else {
             baseUV = vec2(vLocalNormal.y > 0.0 ? vLocalPosition.x : -vLocalPosition.x, -vLocalPosition.z) / 32.0;
          }
          vec2 modifiedUV = fract(baseUV) * vInstanceUVTop.zw + vInstanceUVTop.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      );
    };

    this.previewModelMaterial = this.modelMaterial.clone();
    this.previewModelMaterial.onBeforeCompile = this.modelMaterial.onBeforeCompile;
    this.previewModelMaterial.transparent = true;
    this.previewModelMaterial.opacity = 0.6;
    this.previewModelMaterial.depthTest = true;
    this.previewModelMaterial.polygonOffset = true;
    this.previewModelMaterial.polygonOffsetFactor = -2;
    this.previewModelMaterial.polygonOffsetUnits = -2;

    this.neonModelMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0 });
    this.neonModelMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute vec4 instanceUVTop;
        varying vec4 vInstanceUVTop;
        varying vec3 vWorldNormal;
        varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vInstanceUVTop = instanceUVTop;
        vLocalNormal = normal;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        vLocalPosition = position;
        `
      );
      shader.fragmentShader = `
        varying vec4 vInstanceUVTop;
        varying vec3 vWorldNormal;
        varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 baseUV = vec2(0.0);
          if (abs(vLocalNormal.z) > 0.5) {
             baseUV = vec2(vLocalPosition.x, -vLocalPosition.y) / 32.0;
          } else if (abs(vLocalNormal.x) > 0.5) {
             baseUV = vec2(vLocalNormal.x > 0.0 ? -vLocalPosition.y : vLocalPosition.y, -vLocalPosition.z) / 32.0;
          } else {
             baseUV = vec2(vLocalNormal.y > 0.0 ? vLocalPosition.x : -vLocalPosition.x, -vLocalPosition.z) / 32.0;
          }
          vec2 modifiedUV = fract(baseUV) * vInstanceUVTop.zw + vInstanceUVTop.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
        #endif
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
        attribute float isFluid;
        attribute vec4 instanceUVTop;
        attribute vec4 instanceUVSide;
        attribute vec4 instanceUVBottom;
        attribute vec4 instanceNeighbors1;
        attribute vec2 instanceNeighbors2;
        varying float vIsFluid;
        varying vec4 vInstanceUVTop;
        varying vec4 vInstanceUVSide;
        varying vec4 vInstanceUVBottom;
        varying vec4 vInstanceNeighbors1;
        varying vec2 vInstanceNeighbors2;
        varying vec3 vWorldNormal;
        varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        varying vec3 vInstancePosition;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vIsFluid = isFluid;
        vInstanceUVTop = instanceUVTop;
        vInstanceUVSide = instanceUVSide;
        vInstanceUVBottom = instanceUVBottom;
        vInstanceNeighbors1 = instanceNeighbors1;
        vInstanceNeighbors2 = instanceNeighbors2;
        vLocalNormal = normal;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        vLocalPosition = position;
        vInstancePosition = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        `
      );
      shader.fragmentShader = `
        uniform float uTime;
        varying float vIsFluid;
        varying vec4 vInstanceUVTop;
        varying vec4 vInstanceUVSide;
        varying vec4 vInstanceUVBottom;
        varying vec4 vInstanceNeighbors1;
        varying vec2 vInstanceNeighbors2;
        varying vec3 vWorldNormal;
        varying vec3 vLocalNormal;
        varying vec3 vLocalPosition;
        varying vec3 vInstancePosition;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 baseUV = vMapUv;

          vec4 iuv;
          if (vLocalNormal.z > 0.5) { // Top
            iuv = vInstanceUVTop;
          } else if (vLocalNormal.z < -0.5) { // Bottom
            iuv = vInstanceUVBottom;
          } else { // Sides
            iuv = vInstanceUVSide;
            // Force ALL side faces to mathematically orient V directly downwards (-Z)
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
          if (vLocalNormal.z > 0.5) faceVis = vInstanceNeighbors2.x;
          else if (vLocalNormal.z < -0.5) faceVis = vInstanceNeighbors2.y;
          else if (vLocalNormal.x > 0.5) faceVis = vInstanceNeighbors1.x; // East
          else if (vLocalNormal.x < -0.5) faceVis = vInstanceNeighbors1.y; // West
          else if (vLocalNormal.y > 0.5) faceVis = vInstanceNeighbors1.z; // South
          else if (vLocalNormal.y < -0.5) faceVis = vInstanceNeighbors1.w; // North

          if (faceVis < 0.5) discard;

          diffuseColor *= sampledDiffuseColor;

          if (vIsFluid == 2.0) {
             totalEmissiveRadiance += sampledDiffuseColor.rgb * 0.8;
          } else if (vIsFluid == 3.0) {
             totalEmissiveRadiance += sampledDiffuseColor.rgb * 0.3;
          } else if (vIsFluid == 4.0) {
             totalEmissiveRadiance += sampledDiffuseColor.rgb * 1.0;
          }
        #endif
        `
      );
    };

    this.instancedMaterial.onBeforeCompile = (shader) => setupShader(shader, this.instancedMaterial.userData);
    this.glassMaterial.onBeforeCompile = (shader) => setupShader(shader, this.glassMaterial.userData);

    const createMesh = (geometry, material = this.instancedMaterial, instCount = 400000) => {
      const uvsTop = new Float32Array(instCount * 4);
      geometry.setAttribute('instanceUVTop', new THREE.InstancedBufferAttribute(uvsTop, 4));
      const uvsSide = new Float32Array(instCount * 4);
      geometry.setAttribute('instanceUVSide', new THREE.InstancedBufferAttribute(uvsSide, 4));
      const uvsBottom = new Float32Array(instCount * 4);
      geometry.setAttribute('instanceUVBottom', new THREE.InstancedBufferAttribute(uvsBottom, 4));
      geometry.setAttribute('isFluid', new THREE.InstancedBufferAttribute(new Float32Array(instCount), 1));

      const neighbors1 = new Float32Array(instCount * 4);
      geometry.setAttribute('instanceNeighbors1', new THREE.InstancedBufferAttribute(neighbors1, 4));
      const neighbors2 = new Float32Array(instCount * 2);
      geometry.setAttribute('instanceNeighbors2', new THREE.InstancedBufferAttribute(neighbors2, 2));

      const mesh = new THREE.InstancedMesh(geometry, material, instCount);
      mesh.castShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;

      mesh.frustumCulled = false;
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000000);
      geometry.boundingSphere = mesh.boundingSphere;

      const colors = new Float32Array(instCount * 3);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

      this.scene.add(mesh);
      return mesh;
    };

    const cubeGeo = new THREE.BoxGeometry(32, 32, 32);
    cubeGeo.computeBoundingBox();
    cubeGeo.computeBoundingSphere();
    this.voxelMesh = createMesh(cubeGeo, this.instancedMaterial, 400000);
    this.glassMesh = createMesh(cubeGeo.clone(), this.glassMaterial, 50000);
    this.glassMesh.renderOrder = 1;

    const slabGeo = new THREE.BoxGeometry(32, 32, 16);
    slabGeo.translate(0, 0, -8);
    slabGeo.computeBoundingBox();
    slabGeo.computeBoundingSphere();
    this.slabMesh = createMesh(slabGeo, this.instancedMaterial, 50000);
    this.glassSlabMesh = createMesh(slabGeo.clone(), this.glassMaterial, 20000);
    this.glassSlabMesh.renderOrder = 1;

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
    this.rampMesh = createMesh(rampGeo, this.instancedMaterial, 50000);
    this.glassRampMesh = createMesh(rampGeo.clone(), this.glassMaterial, 20000);
    this.glassRampMesh.renderOrder = 1;

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
    this.stairMesh = createMesh(stairGeo, this.instancedMaterial, 50000);
    this.glassStairMesh = createMesh(stairGeo.clone(), this.glassMaterial, 20000);
    this.glassStairMesh.renderOrder = 1;

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
    this.doorMesh = createMesh(doorGeo, this.instancedMaterial, 20000);
    this.glassDoorMesh = createMesh(doorGeo.clone(), this.glassMaterial, 20000);
    this.glassDoorMesh.renderOrder = 1;

    const lightBlockGeo = new THREE.BoxGeometry(32, 32, 32);
    lightBlockGeo.computeBoundingBox();
    lightBlockGeo.computeBoundingSphere();
    const lightBlockMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false });
    this.lightBlockMesh = new THREE.InstancedMesh(lightBlockGeo, lightBlockMat, 10000);
    this.lightBlockMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lightBlockMesh.frustumCulled = false;
    this.lightBlockMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000000);
    lightBlockGeo.boundingSphere = this.lightBlockMesh.boundingSphere;
    this.lightBlockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(10000 * 3), 3);
    this.scene.add(this.lightBlockMesh);

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
      geometry.setAttribute('instanceUVTop', new THREE.InstancedBufferAttribute(new Float32Array(maxPreview * 4), 4));
      geometry.setAttribute('instanceUVSide', new THREE.InstancedBufferAttribute(new Float32Array(maxPreview * 4), 4));
      geometry.setAttribute('instanceUVBottom', new THREE.InstancedBufferAttribute(new Float32Array(maxPreview * 4), 4));
      geometry.setAttribute('isFluid', new THREE.InstancedBufferAttribute(new Float32Array(maxPreview), 1));
      const n1 = new Float32Array(maxPreview * 4); n1.fill(1);
      geometry.setAttribute('instanceNeighbors1', new THREE.InstancedBufferAttribute(n1, 4));
      const n2 = new Float32Array(maxPreview * 2); n2.fill(1);
      geometry.setAttribute('instanceNeighbors2', new THREE.InstancedBufferAttribute(n2, 2));
      const mesh = new THREE.InstancedMesh(geometry, this.previewMaterial, maxPreview);
      mesh.castShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.receiveShadow = this.engine.clientSettings.enableShadows !== false;
      mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 998;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxPreview * 3), 3);
      this.scene.add(mesh); return mesh;
    };

    this.previewCubeMesh = createPreviewMesh(cubeGeo.clone());
    this.previewSlabMesh = createPreviewMesh(slabGeo.clone());
    this.previewRampMesh = createPreviewMesh(rampGeo.clone());
    this.previewStairMesh = createPreviewMesh(stairGeo.clone());
    this.previewDoorMesh = createPreviewMesh(doorGeo.clone());

    this.decorMaterial = this.instancedMaterial.clone();
    this.decorMaterial.side = THREE.DoubleSide;
    this.decorMaterial.depthWrite = true;
    this.decorMaterial.alphaTest = 0.5;
    this.decorMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute vec4 instanceUVTop;
        attribute vec4 instanceNeighbors1;
        attribute vec2 instanceNeighbors2;
        varying vec4 vInstanceUVTop;
        varying vec3 vWorldNormal;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vInstanceUVTop = instanceUVTop;
        vWorldNormal = normalize( ( modelMatrix * vec4( mat3( instanceMatrix ) * normal, 0.0 ) ).xyz );
        `
      );
      shader.fragmentShader = `
        varying vec4 vInstanceUVTop;
        varying vec3 vWorldNormal;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 modifiedUV = vMapUv * vInstanceUVTop.zw + vInstanceUVTop.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
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
    this.decorMesh = createMesh(decorGeo, this.decorMaterial, 50000);
    this.decorMesh.castShadow = false;
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
    // Force a matrix update so the Raycaster perfectly aligns with the new camera position!
    this.camera.updateMatrixWorld();

    if (this.sunLight) {
      this.sunLight.position.set(cx + (this.sunOffsetX || 0), cy + (this.sunOffsetY || 500), cz + (this.sunOffsetZ || 1500));
      this.sunLight.target.position.set(cx, cy, cz);
      this.sunLight.target.updateMatrixWorld();
    }
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
      this.voxelMesh, this.slabMesh, this.rampMesh, this.stairMesh, this.decorMesh,
      this.glassMesh, this.glassSlabMesh, this.glassRampMesh, this.glassStairMesh,
      this.doorMesh, this.glassDoorMesh, ...Object.values(this.assetManager.modelMeshes || {}),
      ...Object.values(this.assetManager.previewModelMeshes || {}), this.lightBlockMesh,
      this.previewCubeMesh, this.previewSlabMesh, this.previewRampMesh, this.previewStairMesh, this.previewDoorMesh
    ].filter(Boolean);

    meshes.forEach(mesh => {
      mesh.castShadow = isEnabled;
      mesh.receiveShadow = isEnabled;
      if (mesh.material) mesh.material.needsUpdate = true;
    });

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
    this.engine.entityManager.updateDebris();
    this.debugRenderer.updateArrowHelper();
    this.debugRenderer.update3DDebug();
    this.debugRenderer.updateTeleportVisuals();

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

    if (this.voxelManager.doorMap) {
      this.voxelManager.doorPhysics = this.voxelManager.doorPhysics || {};
      let doorsUpdated = false;
      const spring = 0.15;
      const friction = 0.80;

      const rootObj = new THREE.Object3D();
      const pivotObj = new THREE.Object3D();
      const doorObj = new THREE.Object3D();
      rootObj.add(pivotObj);
      pivotObj.add(doorObj);

      for (const [key, data] of Object.entries(this.voxelManager.doorMap)) {
        let phys = this.voxelManager.doorPhysics[key];
        if (!phys) { phys = { rot: data.targetRot, vel: 0 }; this.voxelManager.doorPhysics[key] = phys; }

        phys.vel += (data.targetRot - phys.rot) * spring;
        phys.vel *= friction;
        phys.rot += phys.vel;

        if (Math.abs(phys.vel) > 0.001 || Math.abs(data.targetRot - phys.rot) > 0.001 || !phys.initialized) {
          phys.initialized = true;

          rootObj.position.set(data.cx, data.cy, data.cz);
          rootObj.rotation.set(0, 0, data.baseRot);

          pivotObj.position.set(data.flip ? 16 : -16, -14, 0);
          pivotObj.rotation.set(0, 0, phys.rot - data.baseRot);

          doorObj.position.set(data.flip ? -16 : 16, 0, 0);
          doorObj.rotation.set(0, 0, data.flip ? Math.PI : 0);

          rootObj.updateMatrixWorld(true);

          if (data.isGlass) this.glassDoorMesh.setMatrixAt(data.id, doorObj.matrixWorld);
          else this.doorMesh.setMatrixAt(data.id, doorObj.matrixWorld);
          doorsUpdated = true;
        }
      }
      if (doorsUpdated) {
        this.doorMesh.instanceMatrix.needsUpdate = true;
        if (this.glassDoorMesh) this.glassDoorMesh.instanceMatrix.needsUpdate = true;
      }
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
