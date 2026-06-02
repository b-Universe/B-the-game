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
    this.dummy = new THREE.Object3D();
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
  }

  begin() {
    this.instanceCount = 0;
  }

  drawText(text, x, y, z, size, colorHex, opacity = 1.0, align = 'center') {
      let offsetX = 0;
      const charWidth = size * 0.55;
      if (align === 'center') offsetX = -(text.length * charWidth) / 2;
      else if (align === 'right') offsetX = -(text.length * charWidth);

      this.tempColor.set(colorHex);

      for (let i = 0; i < text.length; i++) {
          const uv = this.charMap[text[i]] || this.charMap[' '];

          this.dummy.position.set(x, y, z);
          this.dummy.quaternion.copy(this.camera.quaternion);
          this.dummy.translateX(offsetX + i * charWidth + charWidth/2);
          this.dummy.scale.set(size, size, 1);
          this.dummy.updateMatrix();

          if (this.instanceCount >= this.maxInstances) return;
          this.mesh.setMatrixAt(this.instanceCount, this.dummy.matrix);

          this.colors[this.instanceCount * 4] = this.tempColor.r;
          this.colors[this.instanceCount * 4 + 1] = this.tempColor.g;
          this.colors[this.instanceCount * 4 + 2] = this.tempColor.b;
          this.colors[this.instanceCount * 4 + 3] = opacity;

          this.uvs[this.instanceCount * 4] = uv.u;
          this.uvs[this.instanceCount * 4 + 1] = uv.v;
          this.uvs[this.instanceCount * 4 + 2] = uv.w;
          this.uvs[this.instanceCount * 4 + 3] = uv.h;

          this.instanceCount++;
      }
  }

  drawBar(x, y, z, width, height, colorHex, opacity = 1.0, offsetX = 0, offsetY = 0) {
      if (this.instanceCount >= this.maxInstances) return;

      const uv = this.charMap['solid'];
      this.dummy.position.set(x, y, z);
      this.dummy.quaternion.copy(this.camera.quaternion);
      this.dummy.translateX(offsetX);
      this.dummy.translateY(offsetY);
      this.dummy.scale.set(width, height, 1);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(this.instanceCount, this.dummy.matrix);

      this.tempColor.set(colorHex);
      this.colors[this.instanceCount * 4] = this.tempColor.r;
      this.colors[this.instanceCount * 4 + 1] = this.tempColor.g;
      this.colors[this.instanceCount * 4 + 2] = this.tempColor.b;
      this.colors[this.instanceCount * 4 + 3] = opacity;

      this.uvs[this.instanceCount * 4] = uv.u;
      this.uvs[this.instanceCount * 4 + 1] = uv.v;
      this.uvs[this.instanceCount * 4 + 2] = uv.w;
      this.uvs[this.instanceCount * 4 + 3] = uv.h;

      this.instanceCount++;
  }

  end() {
    this.mesh.count = this.instanceCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.geometry.attributes.instanceColor.needsUpdate = true;
    this.mesh.geometry.attributes.instanceUV.needsUpdate = true;
  }
}
