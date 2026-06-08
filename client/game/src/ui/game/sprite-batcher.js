import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class SpriteBatcher {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = renderer.scene;
    this.camera = renderer.camera;
    this.maxInstances = 50000;
    this.instanceCount = 0;
    this.initMaterial();
    this.initMesh();
  }

  initMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.imageSmoothingEnabled = false;

    const chars = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;':\",./<>?\\";
    this.charMap = {};

    const cols = 10;
    const rows = 10;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = col * cellW + cellW / 2;
      const y = row * cellH + cellH / 2 + 4;

      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(char, x, y);
      ctx.fillText(char, x, y);

      this.charMap[char] = {
        u: col / cols,
        v: 1.0 - ((row + 1) / rows),
        w: 1 / cols,
        h: 1 / rows
      };
    }

    // Add solid block for health bars
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9 * cellW + 2, 9 * cellH + 2, cellW - 4, cellH - 4);
    this.charMap['solid'] = {
        u: 9 / cols,
        v: 1.0 - ((9 + 1) / rows),
        w: 1 / cols,
        h: 1 / rows
    };

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute vec4 instanceUV;
        attribute vec4 instanceColor;
        varying vec4 vInstanceColor;
        varying vec4 vInstanceUV;
      ` + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vInstanceColor = instanceColor;
        vInstanceUV = instanceUV;
        `
      );

      shader.fragmentShader = `
        varying vec4 vInstanceColor;
        varying vec4 vInstanceUV;
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 modifiedUV = vMapUv * vInstanceUV.zw + vInstanceUV.xy;
          vec4 sampledDiffuseColor = texture2D( map, modifiedUV );
          diffuseColor *= sampledDiffuseColor;
          diffuseColor *= vInstanceColor;
        #endif
        `
      );
    };
  }

  initMesh() {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.InstancedMesh(geo, this.material, this.maxInstances);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.colors = new Float32Array(this.maxInstances * 4);
    this.mesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(this.colors, 4));

    this.uvs = new Float32Array(this.maxInstances * 4);
    this.mesh.geometry.setAttribute('instanceUV', new THREE.InstancedBufferAttribute(this.uvs, 4));

    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9999;
    this.scene.add(this.mesh);

    this.tempColor = new THREE.Color();
    this.matrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.scale = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
  }

  begin() {
    this.instanceCount = 0;
    this.right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
  }

  drawText(text, x, y, z, size, colorHex, opacity = 1.0, align = 'center') {
      let offsetX = 0;
      const charWidth = size * 0.55;
      if (align === 'center') offsetX = -(text.length * charWidth) / 2;
      else if (align === 'right') offsetX = -(text.length * charWidth);

      this.tempColor.set(colorHex);
      const r = this.tempColor.r;
      const g = this.tempColor.g;
      const b = this.tempColor.b;

      this.scale.set(size, size, 1);

      for (let i = 0; i < text.length; i++) {
          if (this.instanceCount >= this.maxInstances) return;
          const uv = this.charMap[text[i]] || this.charMap[' '];

          const charOffset = offsetX + i * charWidth + charWidth / 2;
          this.position.set(x, y, z).addScaledVector(this.right, charOffset);

          this.matrix.compose(this.position, this.camera.quaternion, this.scale);
          this.mesh.setMatrixAt(this.instanceCount, this.matrix);

          const cIdx = this.instanceCount * 4;
          this.colors[cIdx] = r;
          this.colors[cIdx + 1] = g;
          this.colors[cIdx + 2] = b;
          this.colors[cIdx + 3] = opacity;

          this.uvs[cIdx] = uv.u;
          this.uvs[cIdx + 1] = uv.v;
          this.uvs[cIdx + 2] = uv.w;
          this.uvs[cIdx + 3] = uv.h;

          this.instanceCount++;
      }
  }

  drawBar(x, y, z, width, height, colorHex, opacity = 1.0, offsetX = 0, offsetY = 0) {
      if (this.instanceCount >= this.maxInstances) return;

      const uv = this.charMap['solid'];
      this.scale.set(width, height, 1);

      this.position.set(x, y, z)
          .addScaledVector(this.right, offsetX)
          .addScaledVector(this.up, offsetY);

      this.matrix.compose(this.position, this.camera.quaternion, this.scale);
      this.mesh.setMatrixAt(this.instanceCount, this.matrix);

      this.tempColor.set(colorHex);
      const cIdx = this.instanceCount * 4;
      this.colors[cIdx] = this.tempColor.r;
      this.colors[cIdx + 1] = this.tempColor.g;
      this.colors[cIdx + 2] = this.tempColor.b;
      this.colors[cIdx + 3] = opacity;

      this.uvs[cIdx] = uv.u;
      this.uvs[cIdx + 1] = uv.v;
      this.uvs[cIdx + 2] = uv.w;
      this.uvs[cIdx + 3] = uv.h;

      this.instanceCount++;
  }

  end() {
    this.mesh.count = this.instanceCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.geometry.attributes.instanceColor.needsUpdate = true;
    this.mesh.geometry.attributes.instanceUV.needsUpdate = true;
  }
}
