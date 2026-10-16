// Procedural 3D Pelican Cyclist + Road Bicycle + Real-time Verlet Cloth Scarf Simulation

function createKnitScarfTexture(THREE) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#c81922';
  ctx.fillRect(0, 0, 256, 128);

  // Cable-knit wool rib pattern
  for (let x = 0; x < 256; x += 8) {
    for (let y = 0; y < 128; y += 8) {
      ctx.fillStyle = (x + y) % 16 === 0 ? 'rgba(255, 255, 255, 0.14)' : 'rgba(60, 0, 8, 0.18)';
      ctx.fillRect(x, y, 6, 4);
    }
  }

  // Gold & cream trim stripes near the scarf tail
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(212, 0, 14, 128);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(230, 0, 8, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

class VerletClothBand {
  constructor(THREE, {
    cols = 18,
    rows = 6,
    length = 1.65,
    width = 0.34,
    offsetZ = 0,
    offsetY = 0,
    offsetX = 0,
    yawBias = 0,
    knitTexture = null
  } = {}) {
    this.THREE = THREE;
    this.cols = cols;
    this.rows = rows;
    this.length = length;
    this.width = width;
    this.restDx = length / (cols - 1);
    this.restDy = width / (rows - 1);
    this.offsetZ = offsetZ;
    this.offsetY = offsetY;
    this.offsetX = offsetX;
    this.yawBias = yawBias;

    const count = cols * rows;
    this.pos = new Float32Array(count * 3);
    this.prev = new Float32Array(count * 3);
    this.pinned = new Uint8Array(count);
    const uvs = new Float32Array(count * 2);

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      for (let r = 0; r < rows; r++) {
        const v = r / (rows - 1) - 0.5;
        const i = c * rows + r;
        const idx = i * 3;
        const x = offsetX - u * length;
        const y = offsetY - u * 0.08;
        const z = offsetZ + v * width * (0.65 + 0.55 * u);
        this.pos[idx] = x;
        this.pos[idx + 1] = y;
        this.pos[idx + 2] = z;
        this.prev[idx] = x;
        this.prev[idx + 1] = y;
        this.prev[idx + 2] = z;
        uvs[i * 2] = u;
        uvs[i * 2 + 1] = r / (rows - 1);
        if (c === 0) {
          this.pinned[i] = 1;
        }
      }
    }

    // Build distance constraints: structural + shear + bend
    this.constraints = [];
    const addConstraint = (i1, i2, stiffness = 1.0) => {
      const dx = this.pos[i1 * 3] - this.pos[i2 * 3];
      const dy = this.pos[i1 * 3 + 1] - this.pos[i2 * 3 + 1];
      const dz = this.pos[i1 * 3 + 2] - this.pos[i2 * 3 + 2];
      const rest = Math.hypot(dx, dy, dz);
      this.constraints.push({ i1, i2, rest, stiffness });
    };

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const i = c * rows + r;
        if (c + 1 < cols) addConstraint(i, (c + 1) * rows + r, 1.0);
        if (r + 1 < rows) addConstraint(i, c * rows + (r + 1), 0.95);
        if (c + 1 < cols && r + 1 < rows) {
          addConstraint(i, (c + 1) * rows + (r + 1), 0.75);
          addConstraint((c + 1) * rows + r, c * rows + (r + 1), 0.75);
        }
        if (c + 2 < cols) addConstraint(i, (c + 2) * rows + r, 0.55);
      }
    }

    // Build indexed BufferGeometry with knitted red & gold stripe vertex colors
    this.geometry = new THREE.BufferGeometry();
    const indices = [];
    for (let c = 0; c < cols - 1; c++) {
      for (let r = 0; r < rows - 1; r++) {
        const a = c * rows + r;
        const b = (c + 1) * rows + r;
        const d = c * rows + (r + 1);
        const e = (c + 1) * rows + (r + 1);
        indices.push(a, b, d, b, e, d);
      }
    }

    const colors = new Float32Array(count * 3);
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      for (let r = 0; r < rows; r++) {
        const idx = (c * rows + r) * 3;
        const isGoldStripe = (c === cols - 3 || c === cols - 2);
        const isFringeTip = (c === cols - 1);
        const ribShade = 0.94 + 0.06 * Math.sin(c * 1.9 + r * 1.4);
        if (isGoldStripe) {
          colors[idx] = 0.99 * ribShade;
          colors[idx + 1] = 0.82 * ribShade;
          colors[idx + 2] = 0.25 * ribShade;
        } else if (isFringeTip) {
          colors[idx] = 0.95 * ribShade;
          colors[idx + 1] = 0.22 * ribShade;
          colors[idx + 2] = 0.18 * ribShade;
        } else {
          const edgeHighlight = (r === 0 || r === rows - 1) ? 1.08 : 1.0;
          colors[idx] = Math.min(1, (0.92 + 0.06 * (1 - u)) * ribShade * edgeHighlight);
          colors[idx + 1] = 0.14 * ribShade;
          colors[idx + 2] = 0.16 * ribShade;
        }
      }
    }

    this.posAttr = new THREE.BufferAttribute(this.pos, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: knitTexture || null,
      roughness: 0.58,
      metalness: 0.06,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x45060a),
      emissiveIntensity: 0.26
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.lastStretch = 1.0;
  }

  step(dt, {
    anchorX = 0,
    anchorY = 0,
    anchorZ = 0,
    speedKmh = 30,
    lateralVel = 0,
    verticalVel = 0,
    wheelieFactor = 0,
    time = 0,
    bodyCollider = { x: -0.35, y: -0.32, z: 0, r: 0.42 }
  }) {
    const clampedDt = Math.min(dt, 0.033);
    const damping = 0.026;
    const speedRatio = Math.min(1.6, Math.max(0.15, speedKmh / 42));
    const windBack = 14.5 * speedRatio + 4.5 * wheelieFactor;
    const gravity = -9.2 * (1.0 - 0.52 * Math.min(1, speedRatio));

    for (let r = 0; r < this.rows; r++) {
      const v = r / (this.rows - 1) - 0.5;
      const i = r;
      const idx = i * 3;
      this.pos[idx] = anchorX + this.offsetX;
      this.pos[idx + 1] = anchorY + this.offsetY + Math.abs(v) * 0.02;
      this.pos[idx + 2] = anchorZ + this.offsetZ + v * this.width * 0.58;
      this.prev[idx] = this.pos[idx];
      this.prev[idx + 1] = this.pos[idx + 1];
      this.prev[idx + 2] = this.pos[idx + 2];
    }

    const count = this.cols * this.rows;
    for (let c = 1; c < this.cols; c++) {
      const u = c / (this.cols - 1);
      const flutterFreq = 7.5 + speedRatio * 9.5;
      const wavePhase = time * flutterFreq - u * 5.2 + this.yawBias * 3.0;
      const waveY = Math.sin(wavePhase) * (3.4 + 4.8 * speedRatio) * u;
      const waveZ = Math.cos(wavePhase * 0.85 + 1.1) * (2.6 + 3.8 * speedRatio) * u;

      for (let r = 0; r < this.rows; r++) {
        const i = c * this.rows + r;
        if (this.pinned[i]) continue;
        const idx = i * 3;

        const x = this.pos[idx];
        const y = this.pos[idx + 1];
        const z = this.pos[idx + 2];

        const vx = (x - this.prev[idx]) * (1 - damping);
        const vy = (y - this.prev[idx + 1]) * (1 - damping);
        const vz = (z - this.prev[idx + 2]) * (1 - damping);

        this.prev[idx] = x;
        this.prev[idx + 1] = y;
        this.prev[idx + 2] = z;

        const ax = -windBack * (0.85 + 0.35 * u);
        const ay = gravity + waveY - verticalVel * 1.8 + wheelieFactor * 3.2 * u;
        const az = waveZ - lateralVel * 2.8 + this.yawBias * 2.2 * u;

        this.pos[idx] = x + vx + ax * clampedDt * clampedDt;
        this.pos[idx + 1] = y + vy + ay * clampedDt * clampedDt;
        this.pos[idx + 2] = z + vz + az * clampedDt * clampedDt;
      }
    }

    const iterations = 5;
    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < this.constraints.length; k++) {
        const { i1, i2, rest, stiffness } = this.constraints[k];
        const idx1 = i1 * 3;
        const idx2 = i2 * 3;
        const dx = this.pos[idx2] - this.pos[idx1];
        const dy = this.pos[idx2 + 1] - this.pos[idx1 + 1];
        const dz = this.pos[idx2 + 2] - this.pos[idx1 + 2];
        const dist = Math.hypot(dx, dy, dz) || 0.0001;
        const diff = ((dist - rest) / dist) * 0.5 * stiffness;

        const pin1 = this.pinned[i1];
        const pin2 = this.pinned[i2];
        if (!pin1 && !pin2) {
          this.pos[idx1] += dx * diff;
          this.pos[idx1 + 1] += dy * diff;
          this.pos[idx1 + 2] += dz * diff;
          this.pos[idx2] -= dx * diff;
          this.pos[idx2 + 1] -= dy * diff;
          this.pos[idx2 + 2] -= dz * diff;
        } else if (pin1 && !pin2) {
          this.pos[idx2] -= dx * diff * 2;
          this.pos[idx2 + 1] -= dy * diff * 2;
          this.pos[idx2 + 2] -= dz * diff * 2;
        } else if (!pin1 && pin2) {
          this.pos[idx1] += dx * diff * 2;
          this.pos[idx1 + 1] += dy * diff * 2;
          this.pos[idx1 + 2] += dz * diff * 2;
        }
      }

      for (let i = 0; i < count; i++) {
        if (this.pinned[i]) continue;
        const idx = i * 3;
        const dx = this.pos[idx] - bodyCollider.x;
        const dy = this.pos[idx + 1] - bodyCollider.y;
        const dz = this.pos[idx + 2] - bodyCollider.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < bodyCollider.r && dist > 0.0001) {
          const push = (bodyCollider.r - dist) / dist;
          this.pos[idx] += dx * push;
          this.pos[idx + 1] += dy * push;
          this.pos[idx + 2] += dz * push;
        }
      }
    }

    const tipIdx = ((this.cols - 1) * this.rows + Math.floor(this.rows / 2)) * 3;
    const tipDist = Math.hypot(
      this.pos[tipIdx] - anchorX,
      this.pos[tipIdx + 1] - anchorY,
      this.pos[tipIdx + 2] - anchorZ
    );
    this.lastStretch = Math.min(1.25, tipDist / this.length);

    this.posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

export function createPelicanCyclist(THREE) {
  const root = new THREE.Group();
  const modelPivot = new THREE.Group();
  modelPivot.rotation.y = Math.PI / 2;
  root.add(modelPivot);

  const rearAxlePos = new THREE.Vector3(-0.72, 0.42, 0);
  const wheeliePivot = new THREE.Group();
  wheeliePivot.position.copy(rearAxlePos);
  modelPivot.add(wheeliePivot);

  const bikeGroup = new THREE.Group();
  bikeGroup.position.set(0.72, -0.42, 0);
  wheeliePivot.add(bikeGroup);

  const knitTexture = createKnitScarfTexture(THREE);

  // Materials
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e88e5,
    roughness: 0.25,
    metalness: 0.72
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.16,
    metalness: 0.88
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.85,
    metalness: 0.08
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x6d4024,
    roughness: 0.58,
    metalness: 0.1
  });
  const featherMat = new THREE.MeshStandardMaterial({
    color: 0xfafcff,
    roughness: 0.48,
    metalness: 0.04
  });
  const wingTipMat = new THREE.MeshStandardMaterial({
    color: 0x283546,
    roughness: 0.52,
    metalness: 0.06
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    roughness: 0.35,
    metalness: 0.08
  });
  const pouchMat = new THREE.MeshStandardMaterial({
    color: 0xffbf46,
    roughness: 0.45,
    metalness: 0.04
  });
  const orangeFootMat = new THREE.MeshStandardMaterial({
    color: 0xf77f00,
    roughness: 0.44,
    metalness: 0.05
  });
  const scarfRedMat = new THREE.MeshStandardMaterial({
    color: 0xd91b24,
    map: knitTexture || null,
    roughness: 0.55,
    metalness: 0.06,
    emissive: 0x350408,
    emissiveIntensity: 0.22
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.2,
    metalness: 0.35
  });
  const helmetStripeMat = new THREE.MeshStandardMaterial({
    color: 0xe63946,
    roughness: 0.25,
    metalness: 0.4
  });
  const sunglassLensMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.06,
    metalness: 0.94,
    emissive: 0x1e293b,
    emissiveIntensity: 0.25
  });
  const sunglassFrameMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.88
  });
  const wickerMat = new THREE.MeshStandardMaterial({
    color: 0xc48b45,
    roughness: 0.78,
    metalness: 0.05
  });

  function makeTube(p1, p2, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geom = new THREE.CylinderGeometry(radius, radius, len, 12);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.addVectors(p1, p2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    return mesh;
  }

  function createSpokedWheel(radius = 0.42) {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.046, 14, 36), tireMat);
    tire.castShadow = true;
    wg.add(tire);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.032, 0.018, 10, 36), chromeMat);
    wg.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.11, 12), chromeMat);
    hub.rotation.x = Math.PI / 2;
    wg.add(hub);

    const spokeCount = 14;
    for (let i = 0; i < spokeCount; i++) {
      const ang = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0045, 0.0045, (radius - 0.04) * 2, 6),
        chromeMat
      );
      spoke.rotation.z = ang;
      spoke.position.z = (i % 2 === 0 ? 1 : -1) * 0.012;
      wg.add(spoke);
    }
    return wg;
  }

  // 1. Wheels
  const rearWheel = createSpokedWheel(0.42);
  rearWheel.position.set(-0.72, 0.42, 0);
  bikeGroup.add(rearWheel);

  const frontWheel = createSpokedWheel(0.42);
  frontWheel.position.set(0.76, 0.42, 0);
  bikeGroup.add(frontWheel);

  // 2. Bicycle Frame Geometry
  const bbPos = new THREE.Vector3(-0.08, 0.40, 0);
  const seatCluster = new THREE.Vector3(-0.34, 0.96, 0);
  const headTop = new THREE.Vector3(0.54, 1.02, 0);
  const headBottom = new THREE.Vector3(0.60, 0.80, 0);
  const rearDropL = new THREE.Vector3(-0.72, 0.42, -0.075);
  const rearDropR = new THREE.Vector3(-0.72, 0.42, 0.075);

  bikeGroup.add(makeTube(bbPos, seatCluster, 0.028, frameMat));
  bikeGroup.add(makeTube(seatCluster, headTop, 0.026, frameMat));
  bikeGroup.add(makeTube(bbPos, headBottom, 0.030, frameMat));
  bikeGroup.add(makeTube(headBottom, headTop, 0.032, frameMat));
  bikeGroup.add(makeTube(rearDropL, new THREE.Vector3(-0.08, 0.40, -0.04), 0.018, frameMat));
  bikeGroup.add(makeTube(rearDropR, new THREE.Vector3(-0.08, 0.40, 0.04), 0.018, frameMat));
  bikeGroup.add(makeTube(rearDropL, new THREE.Vector3(-0.34, 0.93, -0.035), 0.016, frameMat));
  bikeGroup.add(makeTube(rearDropR, new THREE.Vector3(-0.34, 0.93, 0.035), 0.016, frameMat));

  const forkCrown = new THREE.Vector3(0.61, 0.77, 0);
  bikeGroup.add(makeTube(forkCrown, new THREE.Vector3(0.76, 0.42, -0.065), 0.019, frameMat));
  bikeGroup.add(makeTube(forkCrown, new THREE.Vector3(0.76, 0.42, 0.065), 0.019, frameMat));

  const stemTop = new THREE.Vector3(0.52, 1.20, 0);
  bikeGroup.add(makeTube(headTop, stemTop, 0.022, chromeMat));
  const handlebarCenter = new THREE.Vector3(0.57, 1.22, 0);
  bikeGroup.add(makeTube(stemTop, handlebarCenter, 0.021, chromeMat));
  bikeGroup.add(makeTube(
    new THREE.Vector3(0.57, 1.22, -0.34),
    new THREE.Vector3(0.57, 1.22, 0.34),
    0.018,
    chromeMat
  ));
  const gripL = makeTube(new THREE.Vector3(0.57, 1.22, -0.34), new THREE.Vector3(0.45, 1.19, -0.37), 0.023, leatherMat);
  const gripR = makeTube(new THREE.Vector3(0.57, 1.22, 0.34), new THREE.Vector3(0.45, 1.19, 0.37), 0.023, leatherMat);
  bikeGroup.add(gripL, gripR);

  // Water bottle on down tube
  const bottleGroup = new THREE.Group();
  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.19, 12), helmetMat);
  const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.04, 10), frameMat);
  bottleCap.position.y = 0.11;
  bottleGroup.add(bottleBody, bottleCap);
  bottleGroup.position.set(0.24, 0.65, 0);
  bottleGroup.rotation.z = -0.82;
  bikeGroup.add(bottleGroup);

  const saddlePos = new THREE.Vector3(-0.37, 1.07, 0);
  bikeGroup.add(makeTube(seatCluster, saddlePos, 0.02, chromeMat));
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.055, 0.16), leatherMat);
  saddle.position.copy(saddlePos);
  saddle.rotation.z = 0.06;
  bikeGroup.add(saddle);

  // Front Wicker Fish Basket
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0.73, 1.08, 0);
  const basketOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.24, 14), wickerMat);
  basketOuter.scale.set(0.85, 1, 1.25);
  basketOuter.castShadow = true;
  basketGroup.add(basketOuter);
  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.018, 8, 18), leatherMat);
  basketRim.rotation.x = Math.PI / 2;
  basketRim.scale.set(0.85, 1.25, 1);
  basketRim.position.y = 0.12;
  basketGroup.add(basketRim);

  const basketFishMeshes = [];
  for (let i = 0; i < 6; i++) {
    const fGroup = new THREE.Group();
    const isGold = i === 2 || i === 5;
    const fMat = new THREE.MeshStandardMaterial({
      color: isGold ? 0xfbbf24 : 0x94a3b8,
      metalness: 0.72,
      roughness: 0.22
    });
    const fBody = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 8), fMat);
    fBody.rotation.z = (i % 2 === 0 ? -0.35 : 0.35);
    fBody.rotation.x = (i - 2.5) * 0.15;
    const fTail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.07, 3), fMat);
    fTail.position.y = 0.10;
    fBody.add(fTail);
    fGroup.add(fBody);
    fGroup.position.set(
      (i % 2 === 0 ? 0.03 : -0.03),
      0.13 + (i % 3) * 0.015,
      (i - 2.5) * 0.055
    );
    fGroup.visible = false;
    basketGroup.add(fGroup);
    basketFishMeshes.push(fGroup);
  }
  bikeGroup.add(basketGroup);

  const rearRack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.18), leatherMat);
  rearRack.position.set(-0.68, 0.90, 0);
  bikeGroup.add(rearRack);
  bikeGroup.add(makeTube(new THREE.Vector3(-0.68, 0.85, -0.07), rearDropL, 0.012, chromeMat));
  bikeGroup.add(makeTube(new THREE.Vector3(-0.68, 0.85, 0.07), rearDropR, 0.012, chromeMat));

  // Headlight + Volumetric Night Beam + Taillight
  const headlightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.07, 12), chromeMat);
  headlightHousing.rotation.z = Math.PI / 2;
  headlightHousing.position.set(0.66, 0.92, 0);
  bikeGroup.add(headlightHousing);

  const headlightBulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
  const headlightBulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), headlightBulbMat);
  headlightBulb.position.set(0.69, 0.92, 0);
  bikeGroup.add(headlightBulb);

  const beamGeom = new THREE.ConeGeometry(1.15, 5.2, 20, 1, true);
  beamGeom.translate(0, -2.6, 0);
  beamGeom.rotateZ(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe89e,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const headlightBeam = new THREE.Mesh(beamGeom, beamMat);
  headlightBeam.position.set(0.71, 0.91, 0);
  headlightBeam.rotation.z = -0.14;
  bikeGroup.add(headlightBeam);

  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.07), taillightMat);
  taillight.position.set(-0.83, 0.88, 0);
  bikeGroup.add(taillight);

  // 3. Crankset & Pedals
  const crankPivot = new THREE.Group();
  crankPivot.position.copy(bbPos);
  bikeGroup.add(crankPivot);

  const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 20), chromeMat);
  chainring.rotation.x = Math.PI / 2;
  chainring.position.z = 0.045;
  crankPivot.add(chainring);

  const crankLen = 0.16;
  const crankArmL = makeTube(new THREE.Vector3(0, 0, -0.05), new THREE.Vector3(crankLen, 0, -0.07), 0.014, chromeMat);
  const crankArmR = makeTube(new THREE.Vector3(0, 0, 0.05), new THREE.Vector3(-crankLen, 0, 0.07), 0.014, chromeMat);
  crankPivot.add(crankArmL, crankArmR);

  const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.09), tireMat);
  pedalL.position.set(crankLen, 0, -0.11);
  const pedalR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.09), tireMat);
  pedalR.position.set(-crankLen, 0, 0.11);
  crankPivot.add(pedalL, pedalR);

  // 4. Pelican Character Hierarchy
  const pelicanGroup = new THREE.Group();
  pelicanGroup.position.set(-0.24, 1.32, 0);
  bikeGroup.add(pelicanGroup);

  const torsoGroup = new THREE.Group();
  torsoGroup.rotation.z = -0.24;
  pelicanGroup.add(torsoGroup);

  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 18), featherMat);
  bodyMesh.scale.set(1.22, 1.05, 0.94);
  bodyMesh.castShadow = true;
  torsoGroup.add(bodyMesh);

  const jerseyBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.34, 0.24, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 })
  );
  jerseyBand.position.set(0.04, 0.04, 0);
  jerseyBand.rotation.z = 0.18;
  torsoGroup.add(jerseyBand);

  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.38, 0.04, 0);
  for (let i = -2; i <= 2; i++) {
    const tf = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.22, 6), featherMat);
    tf.rotation.z = Math.PI * 0.62 + Math.abs(i) * 0.05;
    tf.rotation.y = i * 0.18;
    tf.position.z = i * 0.035;
    tailGroup.add(tf);
  }
  torsoGroup.add(tailGroup);

  const neckGroup = new THREE.Group();
  neckGroup.position.set(0.22, 0.26, 0);
  pelicanGroup.add(neckGroup);

  const neckLower = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.145, 0.36, 16), featherMat);
  neckLower.position.set(0.04, 0.14, 0);
  neckLower.rotation.z = -0.18;
  neckLower.castShadow = true;
  neckGroup.add(neckLower);

  const neckUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.26, 16), featherMat);
  neckUpper.position.set(0.08, 0.36, 0);
  neckUpper.rotation.z = 0.05;
  neckUpper.castShadow = true;
  neckGroup.add(neckUpper);

  const scarfCollarGroup = new THREE.Group();
  scarfCollarGroup.position.set(0.03, 0.12, 0);
  scarfCollarGroup.rotation.z = -0.15;
  scarfCollarGroup.rotation.x = Math.PI / 2;
  const collarRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.048, 12, 24), scarfRedMat);
  const collarRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.042, 12, 24), scarfRedMat);
  collarRing2.position.z = -0.045;
  const scarfKnot = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), scarfRedMat);
  scarfKnot.position.set(-0.14, 0, -0.02);
  scarfCollarGroup.add(collarRing1, collarRing2, scarfKnot);
  neckGroup.add(scarfCollarGroup);

  // 5. Pelican Head + Big Orange Beak & Throat Pouch + Helmet + Sunglasses
  const headGroup = new THREE.Group();
  headGroup.position.set(0.11, 0.52, 0);
  neckGroup.add(headGroup);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.175, 20, 16), featherMat);
  skull.scale.set(1.12, 0.98, 0.95);
  skull.castShadow = true;
  headGroup.add(skull);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.15 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), eyeMat);
  eyeL.position.set(0.11, 0.03, -0.12);
  const eyeR = eyeL.clone();
  eyeR.position.z = 0.12;
  headGroup.add(eyeL, eyeR);

  const upperBeakGroup = new THREE.Group();
  upperBeakGroup.position.set(0.15, 0.0, 0);
  headGroup.add(upperBeakGroup);

  const upperMandible = new THREE.Mesh(new THREE.ConeGeometry(0.082, 0.68, 14), beakMat);
  upperMandible.rotation.z = -Math.PI / 2;
  upperMandible.position.set(0.32, 0.01, 0);
  upperMandible.scale.set(0.55, 1.0, 1.12);
  upperMandible.castShadow = true;
  upperBeakGroup.add(upperMandible);

  const beakHook = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 8), orangeFootMat);
  beakHook.position.set(0.65, -0.025, 0);
  beakHook.rotation.z = Math.PI * 0.92;
  upperBeakGroup.add(beakHook);

  const lowerJawGroup = new THREE.Group();
  lowerJawGroup.position.set(0.12, -0.04, 0);
  headGroup.add(lowerJawGroup);

  const lowerMandible = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.62, 12), beakMat);
  lowerMandible.rotation.z = -Math.PI / 2;
  lowerMandible.position.set(0.30, -0.01, 0);
  lowerMandible.scale.set(0.35, 1.0, 1.05);
  lowerJawGroup.add(lowerMandible);

  const throatPouch = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), pouchMat);
  throatPouch.position.set(0.24, -0.10, 0);
  throatPouch.scale.set(1.55, 0.58, 0.72);
  throatPouch.castShadow = true;
  lowerJawGroup.add(throatPouch);

  // Aerodynamic Cycling Helmet (戴头盔)
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(-0.02, 0.08, 0);
  helmetGroup.rotation.z = 0.08;
  headGroup.add(helmetGroup);

  const helmetShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    helmetMat
  );
  helmetShell.scale.set(1.28, 0.92, 1.06);
  helmetShell.castShadow = true;
  helmetGroup.add(helmetShell);

  const helmetStripe = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    helmetStripeMat
  );
  helmetStripe.scale.set(1.29, 0.93, 0.28);
  helmetGroup.add(helmetStripe);

  const ventMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  for (let side of [-1, 1]) {
    for (let v = 0; v < 2; v++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.03), ventMat);
      vent.position.set(0.04 - v * 0.11, 0.11 - v * 0.02, side * 0.14);
      vent.rotation.y = side * 0.25;
      vent.rotation.z = -0.15;
      helmetGroup.add(vent);
    }
  }

  const helmetVisor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.21, 0.045, 16, 1, true, -Math.PI * 0.35, Math.PI * 0.7),
    ventMat
  );
  helmetVisor.rotation.y = Math.PI / 2;
  helmetVisor.position.set(0.08, 0.02, 0);
  helmetGroup.add(helmetVisor);

  const strapL = makeTube(new THREE.Vector3(0.02, 0.02, -0.18), new THREE.Vector3(0.08, -0.16, -0.09), 0.008, tireMat);
  const strapR = makeTube(new THREE.Vector3(0.02, 0.02, 0.18), new THREE.Vector3(0.08, -0.16, 0.09), 0.008, tireMat);
  helmetGroup.add(strapL, strapR);

  // Aviator / Cycling Sunglasses (戴墨镜)
  const sunglassesGroup = new THREE.Group();
  sunglassesGroup.position.set(0.185, 0.045, 0);
  headGroup.add(sunglassesGroup);

  for (let side of [-1, 1]) {
    const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 8, 18), sunglassFrameMat);
    lensRim.rotation.y = Math.PI / 2 - side * 0.22;
    lensRim.position.set(0, 0, side * 0.088);
    lensRim.scale.set(1.15, 0.88, 1);
    sunglassesGroup.add(lensRim);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.066, 18), sunglassLensMat);
    lens.rotation.y = Math.PI / 2 - side * 0.22;
    lens.position.set(0.004, 0, side * 0.088);
    lens.scale.set(1.15, 0.88, 1);
    sunglassesGroup.add(lens);

    const temple = makeTube(
      new THREE.Vector3(-0.01, 0.015, side * 0.155),
      new THREE.Vector3(-0.18, 0.03, side * 0.165),
      0.006,
      sunglassFrameMat
    );
    sunglassesGroup.add(temple);
  }
  const noseBridge = makeTube(
    new THREE.Vector3(0.01, 0.025, -0.03),
    new THREE.Vector3(0.01, 0.025, 0.03),
    0.006,
    sunglassFrameMat
  );
  sunglassesGroup.add(noseBridge);

  // 6. Articulated Multi-Segment Wings
  function createWing(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.06, 0.16, side * 0.26);

    const innerWing = new THREE.Group();
    shoulder.add(innerWing);

    const humerusMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.065, 0.48), featherMat);
    humerusMesh.position.set(-0.06, 0, side * 0.22);
    humerusMesh.castShadow = true;
    innerWing.add(humerusMesh);

    const outerWing = new THREE.Group();
    outerWing.position.set(-0.06, 0, side * 0.44);
    innerWing.add(outerWing);

    const forearmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.048, 0.52), featherMat);
    forearmMesh.position.set(-0.04, 0, side * 0.24);
    forearmMesh.castShadow = true;
    outerWing.add(forearmMesh);

    for (let f = 0; f < 5; f++) {
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.34, 6), wingTipMat);
      feather.rotation.x = side * (Math.PI / 2);
      feather.rotation.z = f * 0.14;
      feather.position.set(-0.02 - f * 0.065, -0.01, side * (0.48 + (4 - f) * 0.03));
      outerWing.add(feather);
    }

    return { shoulder, innerWing, outerWing, side };
  }

  const wingL = createWing(-1);
  const wingR = createWing(1);
  pelicanGroup.add(wingL.shoulder, wingR.shoulder);

  // 7. Two-Bone Inverse Kinematics Webbed Legs following Pedals
  function createLeg(side) {
    const hipPos = new THREE.Vector3(-0.10, -0.22, side * 0.14);
    const thighLen = 0.36;
    const shinLen = 0.38;

    const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.026, thighLen, 10), featherMat);
    const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, shinLen, 10), orangeFootMat);

    const footGroup = new THREE.Group();
    const webFoot = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.18, 5), orangeFootMat);
    webFoot.rotation.z = -Math.PI / 2;
    webFoot.scale.set(0.35, 1.0, 1.35);
    webFoot.position.set(0.05, 0.01, 0);
    footGroup.add(webFoot);

    pelicanGroup.add(thighMesh, shinMesh, footGroup);
    return { hipPos, thighLen, shinLen, thighMesh, shinMesh, footGroup, side };
  }

  const legL = createLeg(-1);
  const legR = createLeg(1);

  function updateLegIK(leg, pedalLocalToPelican) {
    const hip = leg.hipPos;
    const target = pedalLocalToPelican.clone();
    target.y += 0.025;

    const dx = target.x - hip.x;
    const dy = target.y - hip.y;
    const dist = Math.min(leg.thighLen + leg.shinLen - 0.01, Math.max(0.12, Math.hypot(dx, dy)));

    const cosKnee = (leg.thighLen * leg.thighLen + dist * dist - leg.shinLen * leg.shinLen) / (2 * leg.thighLen * dist);
    const clampedCos = Math.max(-0.99, Math.min(0.99, cosKnee));
    const baseAngle = Math.atan2(dy, dx);
    const thighAngle = baseAngle + Math.acos(clampedCos);

    const knee = new THREE.Vector3(
      hip.x + Math.cos(thighAngle) * leg.thighLen,
      hip.y + Math.sin(thighAngle) * leg.thighLen,
      (hip.z + target.z) * 0.5
    );

    const thighDir = new THREE.Vector3().subVectors(knee, hip);
    leg.thighMesh.position.addVectors(hip, knee).multiplyScalar(0.5);
    leg.thighMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), thighDir.normalize());

    const shinDir = new THREE.Vector3().subVectors(target, knee);
    leg.shinMesh.position.addVectors(knee, target).multiplyScalar(0.5);
    leg.shinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shinDir.normalize());

    leg.footGroup.position.copy(target);
  }

  // 8. Dual-Tailed Verlet Cloth Physics Red Scarf (围巾是布料物理模拟)
  const clothContainer = new THREE.Group();
  bikeGroup.add(clothContainer);

  const mainScarfBand = new VerletClothBand(THREE, {
    cols: 18,
    rows: 6,
    length: 1.72,
    width: 0.34,
    offsetX: -0.08,
    offsetY: 0.02,
    offsetZ: -0.03,
    yawBias: -0.22,
    knitTexture
  });
  const subScarfBand = new VerletClothBand(THREE, {
    cols: 15,
    rows: 5,
    length: 1.38,
    width: 0.26,
    offsetX: -0.08,
    offsetY: -0.05,
    offsetZ: 0.05,
    yawBias: 0.28,
    knitTexture
  });
  clothContainer.add(mainScarfBand.mesh, subScarfBand.mesh);

  // First-person Pelican POV camera anchor: positioned high at eye-line so the road ahead is 100% clear!
  const povAnchor = new THREE.Object3D();
  povAnchor.position.set(0.36, 0.24, 0);
  headGroup.add(povAnchor);

  let crankAngle = 0;
  let wheelAngle = 0;
  let wheelieBlend = 0;
  let wingSpreadBlend = 0;
  let mouthOpenBlend = 0;
  let gulpPulse = 0;
  let timeAccum = 0;
  let isFirstPersonMode = false;

  return {
    root,
    povAnchor,
    setFirstPersonMode(enabled) {
      if (isFirstPersonMode === enabled) return;
      isFirstPersonMode = enabled;
      // In Pelican POV, tuck head/helmet out of camera near-plane and angle beak lower at bottom of screen
      skull.visible = !enabled;
      helmetGroup.visible = !enabled;
      sunglassesGroup.visible = !enabled;
      eyeL.visible = !enabled;
      eyeR.visible = !enabled;
      upperBeakGroup.position.set(enabled ? 0.28 : 0.15, enabled ? -0.18 : 0.0, 0);
      upperBeakGroup.scale.set(enabled ? 0.62 : 1.0, enabled ? 0.55 : 1.0, enabled ? 0.68 : 1.0);
      lowerJawGroup.position.set(enabled ? 0.25 : 0.12, enabled ? -0.22 : -0.04, 0);
      lowerJawGroup.scale.set(enabled ? 0.62 : 1.0, enabled ? 0.55 : 1.0, enabled ? 0.68 : 1.0);
    },
    triggerGulp() {
      gulpPulse = 1.0;
      mouthOpenBlend = 1.0;
    },
    update(dt, {
      speedKmh = 32,
      cadenceRpm = 78,
      steerAmount = 0,
      lateralVel = 0,
      verticalVel = 0,
      jumpHeight = 0,
      isAirborne = false,
      isWheelie = false,
      nearFishFactor = 0,
      dayNightPhase = 0,
      caughtFishCount = 0
    } = {}) {
      timeAccum += dt;
      const speedMps = speedKmh / 3.6;

      wheelAngle -= (speedMps / 0.42) * dt;
      frontWheel.rotation.z = wheelAngle;
      rearWheel.rotation.z = wheelAngle;

      const prevCrank = crankAngle;
      crankAngle -= (cadenceRpm / 60) * Math.PI * 2 * dt;
      crankPivot.rotation.z = crankAngle;
      pedalL.rotation.z = -crankAngle;
      pedalR.rotation.z = -crankAngle;

      const pedalClicked = Math.floor(Math.abs(crankAngle) / Math.PI) !== Math.floor(Math.abs(prevCrank) / Math.PI);

      for (let i = 0; i < basketFishMeshes.length; i++) {
        basketFishMeshes[i].visible = caughtFishCount > i * 2;
      }

      const nightFactor = Math.max(0, Math.min(1, (dayNightPhase - 0.32) / 0.38));
      beamMat.opacity = nightFactor * 0.22;

      const targetWheelie = isWheelie ? 1.0 : 0.0;
      wheelieBlend += (targetWheelie - wheelieBlend) * Math.min(1, dt * 8.5);
      wheeliePivot.rotation.z = wheelieBlend * 0.46 + (isAirborne ? Math.max(-0.18, Math.min(0.28, verticalVel * 0.032)) : 0);

      const targetRoll = -steerAmount * 0.24;
      root.rotation.z += (targetRoll - root.rotation.z) * Math.min(1, dt * 10);
      root.rotation.y = -steerAmount * 0.14;
      root.position.y = jumpHeight;

      const cadenceBob = Math.sin(crankAngle * 2) * 0.032;
      pelicanGroup.position.y = 1.32 + cadenceBob + wheelieBlend * 0.05;
      headGroup.rotation.z = 0.06 + Math.sin(crankAngle * 2 - 0.5) * 0.05 - wheelieBlend * 0.22;
      headGroup.rotation.y = -steerAmount * 0.28;

      gulpPulse = Math.max(0, gulpPulse - dt * 2.2);
      const targetMouth = Math.max(nearFishFactor, gulpPulse > 0.5 ? 0.85 : 0.08);
      mouthOpenBlend += (targetMouth - mouthOpenBlend) * Math.min(1, dt * 12);
      upperBeakGroup.rotation.z = isFirstPersonMode ? (-0.22 + mouthOpenBlend * 0.12) : (mouthOpenBlend * 0.08);
      lowerJawGroup.rotation.z = (isFirstPersonMode ? -0.22 : 0) - mouthOpenBlend * 0.48;

      const pouchInflate = 1.0 + gulpPulse * 0.65 * (0.7 + 0.3 * Math.sin(timeAccum * 26));
      throatPouch.scale.set(1.55, (0.58 + mouthOpenBlend * 0.32) * pouchInflate, 0.72 * pouchInflate);

      const targetWingSpread = (isWheelie || isAirborne) ? 1.0 : 0.0;
      wingSpreadBlend += (targetWingSpread - wingSpreadBlend) * Math.min(1, dt * 9.0);

      const flapFreq = isWheelie ? 11.5 : (isAirborne ? 13.0 : 4.5);
      const flapAmp = isWheelie ? 0.52 : (isAirborne ? 0.62 : 0.04);
      const flapWave = Math.sin(timeAccum * flapFreq) * flapAmp;

      for (const w of [wingL, wingR]) {
        const s = w.side;
        const foldRoll = (1 - wingSpreadBlend) * (-s * 1.15);
        const spreadFlap = wingSpreadBlend * (-s * (0.18 + flapWave));
        w.shoulder.rotation.x = foldRoll + spreadFlap;
        w.shoulder.rotation.y = (1 - wingSpreadBlend) * (s * 0.28) + wingSpreadBlend * (-s * 0.08);
        w.shoulder.rotation.z = (1 - wingSpreadBlend) * (-0.18) + wingSpreadBlend * (0.12 + Math.cos(timeAccum * flapFreq) * 0.14);
        w.outerWing.rotation.x = (1 - wingSpreadBlend) * (-s * 0.35) + wingSpreadBlend * (-s * Math.sin(timeAccum * flapFreq - 0.8) * 0.38);
      }

      const pL = new THREE.Vector3(crankLen * Math.cos(crankAngle), crankLen * Math.sin(crankAngle), -0.13);
      const pR = new THREE.Vector3(-crankLen * Math.cos(crankAngle), -crankLen * Math.sin(crankAngle), 0.13);
      pL.add(bbPos).sub(pelicanGroup.position);
      pR.add(bbPos).sub(pelicanGroup.position);
      updateLegIK(legL, pL);
      updateLegIK(legR, pR);

      const neckAnchorX = pelicanGroup.position.x + neckGroup.position.x + 0.01;
      const neckAnchorY = pelicanGroup.position.y + neckGroup.position.y + 0.12;
      const neckAnchorZ = 0;
      const clothParams = {
        anchorX: neckAnchorX,
        anchorY: neckAnchorY,
        anchorZ: neckAnchorZ,
        speedKmh,
        lateralVel,
        verticalVel,
        wheelieFactor: wheelieBlend,
        time: timeAccum,
        bodyCollider: {
          x: pelicanGroup.position.x - 0.08,
          y: pelicanGroup.position.y - 0.02,
          z: 0,
          r: 0.39
        }
      };
      mainScarfBand.step(dt, clothParams);
      subScarfBand.step(dt, clothParams);

      return {
        pedalClicked,
        scarfStretch: mainScarfBand.lastStretch,
        wheelieBlend,
        wingSpreadBlend
      };
    }
  };
}
