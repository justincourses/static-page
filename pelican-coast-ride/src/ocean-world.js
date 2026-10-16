// 3D Coastal Highway, Gerstner Ocean Shader, Shoreline Breakers, Day-Night Sky, Leaping Fish & Interactive Road Props

export const LANE_X = [-2.35, 0.0, 2.35];

export const FISH_TYPES = {
  sardine: {
    id: 'sardine',
    name: '银沙丁鱼',
    points: 50,
    color: 0xcbd5e1,
    finColor: 0x38bdf8,
    emissive: 0x1e3a8a,
    scale: 1.85,
    highArc: false,
    rare: false
  },
  salmon: {
    id: 'salmon',
    name: '海岸红鲑',
    points: 80,
    color: 0xfb7185,
    finColor: 0xfbbf24,
    emissive: 0x881337,
    scale: 2.05,
    highArc: false,
    rare: false
  },
  flying: {
    id: 'flying',
    name: '高空飞鱼',
    points: 130,
    color: 0x38bdf8,
    finColor: 0xe0f2fe,
    emissive: 0x0284c7,
    scale: 2.1,
    highArc: true,
    rare: false
  },
  golden: {
    id: 'golden',
    name: '黄金鬼头刀',
    points: 220,
    color: 0xfacc15,
    finColor: 0xfef08a,
    emissive: 0xd97706,
    scale: 2.25,
    highArc: false,
    rare: true
  },
  moonfish: {
    id: 'moonfish',
    name: '夜光月鱼',
    points: 250,
    color: 0x67e8f9,
    finColor: 0xf472b6,
    emissive: 0x06b6d4,
    scale: 2.3,
    highArc: true,
    rare: true
  }
};

export const ROAD_ITEM_TYPES = {
  starfish: {
    id: 'starfish',
    name: '黄金海星',
    points: 35,
    color: 0xfbbf24
  },
  boost_ring: {
    id: 'boost_ring',
    name: '顺风加速环',
    points: 90,
    color: 0x38bdf8
  },
  surf_ramp: {
    id: 'surf_ramp',
    name: '冲浪跳台',
    points: 60,
    color: 0xf59e0b
  },
  crab: {
    id: 'crab',
    name: '飞跃海岸巨蟹',
    points: 110,
    color: 0xef4444
  }
};

function createProceduralWorldTextures(THREE) {
  if (typeof document === 'undefined') {
    return { roadTex: null, softCircleTex: null, fishScaleTex: null, signTex: null };
  }

  // 1. Soft radial circle texture for seafoam droplets & twinkling stars (eliminates square points!)
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 64;
  cCanvas.height = 64;
  const cCtx = cCanvas.getContext('2d');
  if (cCtx) {
    const grad = cCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.45, 'rgba(224, 247, 255, 0.85)');
    grad.addColorStop(1, 'rgba(224, 247, 255, 0.0)');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, 64, 64);
  }
  const softCircleTex = new THREE.CanvasTexture(cCanvas);

  // 2. Coastal Asphalt Road Texture with aggregate grain & lane markings
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 512;
  rCanvas.height = 512;
  const rCtx = rCanvas.getContext('2d');
  if (rCtx) {
    rCtx.fillStyle = '#242c38';
    rCtx.fillRect(0, 0, 512, 512);
    // Asphalt grain
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      rCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)';
      rCtx.fillRect(x, y, 2, 2);
    }
    // Subtle lighter wheel tracks down the 3 lanes
    for (const lx of [105, 256, 407]) {
      const g = rCtx.createLinearGradient(lx - 45, 0, lx + 45, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.045)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      rCtx.fillStyle = g;
      rCtx.fillRect(lx - 45, 0, 90, 512);
    }
    // Seaward double gold edge stripe + cliffside white shoulder stripe
    rCtx.fillStyle = '#fbbf24';
    rCtx.fillRect(18, 0, 10, 512);
    rCtx.fillRect(32, 0, 6, 512);
    rCtx.fillStyle = '#f8fafc';
    rCtx.fillRect(480, 0, 12, 512);

    // Bright dashed lane dividers between the 3 lanes
    rCtx.fillStyle = '#f8fafc';
    for (let y = 24; y < 512; y += 128) {
      rCtx.fillRect(178, y, 10, 68);
      rCtx.fillRect(324, y, 10, 68);
    }
  }
  const roadTex = new THREE.CanvasTexture(rCanvas);
  roadTex.wrapS = THREE.ClampToEdgeWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 14);

  // 3. Shimmering Fish Scale Texture
  const fCanvas = document.createElement('canvas');
  fCanvas.width = 128;
  fCanvas.height = 128;
  const fCtx = fCanvas.getContext('2d');
  if (fCtx) {
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, 0, 128, 128);
    fCtx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
    fCtx.lineWidth = 2;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cx = col * 16 + (row % 2 ? 8 : 0);
        const cy = row * 16;
        fCtx.beginPath();
        fCtx.arc(cx, cy, 9, 0, Math.PI);
        fCtx.stroke();
      }
    }
  }
  const fishScaleTex = new THREE.CanvasTexture(fCanvas);

  // 4. Highway Overhead Signboard Texture
  const sCanvas = document.createElement('canvas');
  sCanvas.width = 512;
  sCanvas.height = 128;
  const sCtx = sCanvas.getContext('2d');
  if (sCtx) {
    sCtx.fillStyle = '#065f46';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = '#fbbf24';
    sCtx.lineWidth = 8;
    sCtx.strokeRect(8, 8, 496, 112);
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 34px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('COAST HWY 101 · 鹈鹕渔港', 256, 56);
    sCtx.fillStyle = '#fde68a';
    sCtx.font = 'bold 24px sans-serif';
    sCtx.fillText('◀ 靠海碎浪道     中间巡航道     靠山飞鱼道 ▶', 256, 98);
  }
  const signTex = new THREE.CanvasTexture(sCanvas);

  return { roadTex, softCircleTex, fishScaleTex, signTex };
}

export function createOceanWorld(THREE, scene) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const { roadTex, softCircleTex, fishScaleTex, signTex } = createProceduralWorldTextures(THREE);

  // 1. Lighting Setup (Dusk -> Twilight -> Starry Moonlit Night)
  const ambientLight = new THREE.AmbientLight(0xffb482, 0.85);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffa875, 0x1e293b, 0.95);
  scene.add(hemiLight);

  const mainDirLight = new THREE.DirectionalLight(0xff8c42, 2.3);
  mainDirLight.position.set(-48, 24, -65);
  mainDirLight.castShadow = true;
  mainDirLight.shadow.mapSize.set(1024, 1024);
  mainDirLight.shadow.camera.near = 5;
  mainDirLight.shadow.camera.far = 140;
  const d = 16;
  mainDirLight.shadow.camera.left = -d;
  mainDirLight.shadow.camera.right = d;
  mainDirLight.shadow.camera.top = d;
  mainDirLight.shadow.camera.bottom = -d;
  scene.add(mainDirLight);

  // 2. Sky Dome Shader (Smooth Dusk Sunset -> Twilight -> Starry Moonlit Night)
  const skyGeo = new THREE.SphereGeometry(260, 36, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uPhase: { value: 0.0 },
      uSunDir: { value: new THREE.Vector3(-0.62, 0.14, -0.76).normalize() },
      uMoonDir: { value: new THREE.Vector3(-0.48, 0.42, -0.76).normalize() }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform float uPhase;
      uniform vec3 uSunDir;
      uniform vec3 uMoonDir;

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, 0.0, 1.0);

        vec3 duskTop = vec3(0.16, 0.11, 0.34);
        vec3 duskMid = vec3(0.76, 0.27, 0.36);
        vec3 duskHor = vec3(1.00, 0.62, 0.24);
        vec3 duskCol = mix(duskHor, duskMid, pow(h, 0.45));
        duskCol = mix(duskCol, duskTop, pow(h, 1.15));

        vec3 twiTop = vec3(0.05, 0.07, 0.20);
        vec3 twiMid = vec3(0.24, 0.16, 0.38);
        vec3 twiHor = vec3(0.68, 0.32, 0.38);
        vec3 twiCol = mix(twiHor, twiMid, pow(h, 0.5));
        twiCol = mix(twiCol, twiTop, pow(h, 1.2));

        vec3 nightTop = vec3(0.015, 0.025, 0.075);
        vec3 nightMid = vec3(0.04, 0.07, 0.16);
        vec3 nightHor = vec3(0.08, 0.15, 0.28);
        vec3 nightCol = mix(nightHor, nightMid, pow(h, 0.55));
        nightCol = mix(nightCol, nightTop, pow(h, 1.25));

        vec3 sky = uPhase < 0.5
          ? mix(duskCol, twiCol, uPhase * 2.0)
          : mix(twiCol, nightCol, (uPhase - 0.5) * 2.0);

        float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
        float sunVis = clamp(1.0 - uPhase * 1.45, 0.0, 1.0);
        sky += vec3(1.0, 0.55, 0.18) * pow(sunAmt, 8.0) * 0.65 * sunVis;
        sky += vec3(1.0, 0.88, 0.62) * smoothstep(0.996, 0.9992, sunAmt) * 1.4 * sunVis;

        float moonAmt = max(dot(dir, normalize(uMoonDir)), 0.0);
        float moonVis = clamp((uPhase - 0.25) / 0.6, 0.0, 1.0);
        sky += vec3(0.45, 0.68, 0.98) * pow(moonAmt, 14.0) * 0.45 * moonVis;

        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  worldGroup.add(skyDome);

  const moonGroup = new THREE.Group();
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xeef6ff,
    transparent: true,
    opacity: 0.0
  });
  const moonDisk = new THREE.Mesh(new THREE.SphereGeometry(7.2, 24, 24), moonMat);
  moonGroup.add(moonDisk);
  worldGroup.add(moonGroup);

  // Twinkling Starfield Dome (1,600 soft circular stars)
  const maxStars = 1600;
  const starPositions = new Float32Array(maxStars * 3);
  const starColors = new Float32Array(maxStars * 3);
  for (let i = 0; i < maxStars; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.08 + Math.random() * 0.92);
    const r = 235;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const tint = Math.random();
    starColors[i * 3] = tint > 0.7 ? 0.85 : 1.0;
    starColors[i * 3 + 1] = tint > 0.4 ? 0.94 : 0.88;
    starColors[i * 3 + 2] = 1.0;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.4,
    map: softCircleTex || null,
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const starField = new THREE.Points(starGeo, starMat);
  worldGroup.add(starField);

  // 3. Coastal Highway Road, Lane Dashes, Reflective Studs, Beach Slope & Cliffside
  const roadLength = 220;
  const roadGeo = new THREE.PlaneGeometry(8.2, roadLength, 1, 1);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: roadTex || null,
    roughness: 0.72,
    metalness: 0.08
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.position.set(0, -0.01, -45);
  roadMesh.receiveShadow = true;
  worldGroup.add(roadMesh);

  // Raised 3D Lane Divider Dashes & Glowing Reflective Cat's-Eye Road Studs
  const dashMeshes = [];
  const dashGeo = new THREE.BoxGeometry(0.16, 0.025, 3.0);
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const studMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const studGeo = new THREE.BoxGeometry(0.18, 0.055, 0.22);

  const dashCount = 28;
  const dashSpacing = 7.0;
  for (let i = 0; i < dashCount; i++) {
    const z = 25 - i * dashSpacing;
    const dGroup = new THREE.Group();
    dGroup.position.set(0, 0.015, z);

    const d1 = new THREE.Mesh(dashGeo, whiteLineMat);
    d1.position.x = -1.18;
    const d2 = new THREE.Mesh(dashGeo, whiteLineMat);
    d2.position.x = 1.18;

    const stud1 = new THREE.Mesh(studGeo, studMat);
    stud1.position.set(-1.18, 0.02, 2.2);
    const stud2 = new THREE.Mesh(studGeo, studMat);
    stud2.position.set(1.18, 0.02, 2.2);

    dGroup.add(d1, d2, stud1, stud2);
    worldGroup.add(dGroup);
    dashMeshes.push(dGroup);
  }

  // Seaward Guardrail beam
  const railBeamGeo = new THREE.BoxGeometry(0.12, 0.18, roadLength);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.72
  });
  const railBeam = new THREE.Mesh(railBeamGeo, railMat);
  railBeam.position.set(-4.08, 0.52, -45);
  railBeam.castShadow = true;
  worldGroup.add(railBeam);

  // Sloped Sandy Beach
  const beachGeo = new THREE.PlaneGeometry(14, roadLength, 16, 48);
  beachGeo.rotateX(-Math.PI / 2);
  const bPos = beachGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const lx = bPos.getX(i);
    const lz = bPos.getZ(i);
    const t = (lx + 7) / 14;
    const height = -2.2 * (1 - t) + 0.12 * Math.sin(lz * 0.14 + lx * 0.5);
    bPos.setY(i, height);
  }
  beachGeo.computeVertexNormals();
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.88,
    metalness: 0.04
  });
  const beachMesh = new THREE.Mesh(beachGeo, beachMat);
  beachMesh.position.set(-11.0, -0.05, -45);
  beachMesh.receiveShadow = true;
  worldGroup.add(beachMesh);

  // Right-hand Coastal Cliff Embankment
  const cliffGeo = new THREE.PlaneGeometry(24, roadLength, 14, 40);
  cliffGeo.rotateX(-Math.PI / 2);
  const cPos = cliffGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    const lx = cPos.getX(i);
    const lz = cPos.getZ(i);
    const t = (lx + 12) / 24;
    const crag = Math.sin(lz * 0.12) * Math.cos(lx * 0.45) * 1.4 * t;
    cPos.setY(i, Math.pow(t, 1.35) * 18.0 + crag);
  }
  cliffGeo.computeVertexNormals();
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    roughness: 0.9,
    metalness: 0.05
  });
  const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
  cliffMesh.position.set(16.0, -0.1, -45);
  cliffMesh.receiveShadow = true;
  worldGroup.add(cliffMesh);

  // Scrolling Roadside Props: Guardrail Posts, Lifebuoys, Curved Coconut Palms, Highway Gantry Signs & Streetlamps
  const propsPool = [];
  const postMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.4 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.85 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.55, side: THREE.DoubleSide });
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.82 });
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const lifebuoyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const lampHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffb703,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const gantrySignMat = new THREE.MeshBasicMaterial({
    map: signTex || null,
    color: 0xffffff
  });

  const propSlices = 18;
  const sliceSpacing = 11.0;

  for (let i = 0; i < propSlices; i++) {
    const slice = new THREE.Group();
    slice.position.z = 22 - i * sliceSpacing;

    // Seaward guardrail post
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), postMat);
    post.position.set(-4.08, 0.32, 0);
    slice.add(post);

    // Every 3rd post has a red coastal lifebuoy ring mounted on the guardrail!
    if (i % 3 === 0) {
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.065, 10, 20), lifebuoyMat);
      buoy.rotation.y = Math.PI / 2;
      buoy.position.set(-3.96, 0.55, 0);
      slice.add(buoy);
    }

    // Smooth coastal boulder cluster where shore waves crash
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85 + (i % 3) * 0.35, 2), rockMat);
    rock.position.set(-6.8 - (i % 4) * 1.1, -0.65, (i % 2) * 1.8);
    rock.scale.set(1.35, 0.68, 1.15);
    slice.add(rock);

    // Every 6th slice: Overhead Highway Gantry Arch Sign spanning the road!
    if (i % 6 === 2) {
      const gantry = new THREE.Group();
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 5.4, 10), lampPoleMat);
      legL.position.set(-4.15, 2.7, 0);
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 5.4, 10), lampPoleMat);
      legR.position.set(4.15, 2.7, 0);
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8.5, 10), lampPoleMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, 5.2, 0);
      const board = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 0.14), gantrySignMat);
      board.position.set(0, 5.15, 0);
      gantry.add(legL, legR, crossbar, board);
      slice.add(gantry);
    }

    // Every other slice: Curved Coconut Palm Tree + Coastal Streetlamp
    if (i % 2 === 0) {
      const palm = new THREE.Group();
      palm.position.set(5.1 + (i % 3) * 0.55, 0, -1.5);

      // Multi-segment curved palm trunk
      let tx = 0;
      let ty = 0;
      for (let seg = 0; seg < 5; seg++) {
        const segMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14 - seg * 0.012, 0.17 - seg * 0.012, 0.98, 10),
          trunkMat
        );
        const tilt = 0.06 + seg * 0.04;
        segMesh.position.set(tx - Math.sin(tilt) * 0.45, ty + 0.46, 0);
        segMesh.rotation.z = tilt;
        segMesh.castShadow = true;
        palm.add(segMesh);
        tx -= Math.sin(tilt) * 0.9;
        ty += Math.cos(tilt) * 0.92;
      }

      const crown = new THREE.Group();
      crown.position.set(tx, ty, 0);
      // Coconuts under the fronds
      for (let c = 0; c < 3; c++) {
        const coco = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), coconutMat);
        const a = (c / 3) * Math.PI * 2;
        coco.position.set(Math.cos(a) * 0.16, -0.08, Math.sin(a) * 0.16);
        crown.add(coco);
      }
      // Curved palm fronds
      for (let f = 0; f < 7; f++) {
        const ang = (f / 7) * Math.PI * 2;
        const frondGroup = new THREE.Group();
        frondGroup.rotation.y = ang;
        const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.36), frondMat);
        leaf1.position.set(0.58, 0.12, 0);
        leaf1.rotation.z = -0.22;
        const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.025, 0.28), frondMat);
        leaf2.position.set(1.52, -0.26, 0);
        leaf2.rotation.z = -0.68;
        frondGroup.add(leaf1, leaf2);
        crown.add(frondGroup);
      }
      palm.add(crown);
      slice.add(palm);

      // Streetlamp
      const lamp = new THREE.Group();
      lamp.position.set(4.15, 0, 2.0);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 8), lampPoleMat);
      pole.position.y = 2.1;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), lampPoleMat);
      arm.position.set(-0.5, 4.1, 0);
      arm.rotation.z = Math.PI / 2 - 0.15;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), lampBulbMat);
      bulb.position.set(-1.02, 4.02, 0);
      const halo = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.1, 14, 1, true), lampHaloMat);
      halo.position.set(-1.02, 2.0, 0);
      lamp.add(pole, arm, bulb, halo);
      slice.add(lamp);
    }

    worldGroup.add(slice);
    propsPool.push(slice);
  }

  // Distant Headland Lighthouse with gallery deck & rotating night beam
  const lighthouseGroup = new THREE.Group();
  lighthouseGroup.position.set(-34, 0, -135);
  const lhRock = new THREE.Mesh(new THREE.DodecahedronGeometry(13, 2), rockMat);
  lhRock.scale.set(1.2, 0.55, 1.1);
  lhRock.position.y = 1.5;
  const lhTower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 2.2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
  );
  lhTower.position.y = 11;
  const lhRedBand = new THREE.Mesh(
    new THREE.CylinderGeometry(1.58, 1.82, 4.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 })
  );
  lhRedBand.position.y = 11.5;
  const lhDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.5, 0.7, 16), lampPoleMat);
  lhDeck.position.y = 19.0;
  const lhLantern = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.4, 14), lampBulbMat);
  lhLantern.position.y = 20.4;
  const lhRoof = new THREE.Mesh(
    new THREE.ConeGeometry(1.45, 1.8, 14),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 })
  );
  lhRoof.position.y = 22.3;

  const lhBeamGeo = new THREE.ConeGeometry(9.0, 68, 16, 1, true);
  lhBeamGeo.translate(0, -34, 0);
  lhBeamGeo.rotateZ(-Math.PI / 2);
  const lhBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffe899,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const lhBeam = new THREE.Mesh(lhBeamGeo, lhBeamMat);
  lhBeam.position.y = 20.4;
  lighthouseGroup.add(lhRock, lhTower, lhRedBand, lhDeck, lhLantern, lhRoof, lhBeam);
  worldGroup.add(lighthouseGroup);

  // 4. Dynamic Ocean Surface with Multi-Wave Gerstner Shader (海面波浪)
  const oceanGeo = new THREE.PlaneGeometry(165, 230, 88, 110);
  oceanGeo.rotateX(-Math.PI / 2);

  const oceanMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uLightDir: { value: new THREE.Vector3(-0.62, 0.22, -0.75).normalize() },
      uSunColor: { value: new THREE.Color(0xff9e44) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vFoam;

      void main() {
        vec3 p = position;
        vec4 wp0 = modelMatrix * vec4(p, 1.0);
        float wx = wp0.x;
        float wz = wp0.z;

        float w1 = sin(wx * 0.24 + uTime * 2.1 + wz * 0.08) * 0.58;
        float w2 = cos(wx * 0.42 - uTime * 1.65 - wz * 0.19) * 0.32;
        float w3 = sin((wx + wz) * 0.65 + uTime * 3.1) * 0.16;

        float shoreBoost = smoothstep(-32.0, -7.0, wx) * 0.55;
        float dispY = (w1 + w2 + w3) * (1.0 + shoreBoost);
        p.y += dispY;
        p.x += cos(wx * 0.24 + uTime * 2.1) * 0.28 * (1.0 + shoreBoost);

        float dHx = 0.24 * cos(wx * 0.24 + uTime * 2.1 + wz * 0.08) * 0.58
                  - 0.42 * sin(wx * 0.42 - uTime * 1.65 - wz * 0.19) * 0.32;
        float dHz = 0.08 * cos(wx * 0.24 + uTime * 2.1 + wz * 0.08) * 0.58
                  + 0.19 * sin(wx * 0.42 - uTime * 1.65 - wz * 0.19) * 0.32;
        vNormal = normalize(vec3(-dHx, 1.0, -dHz));

        float shoreZone = smoothstep(-15.5, -6.2, wx);
        float shoreWave = 0.5 + 0.5 * sin(wx * 0.95 + uTime * 3.4 + sin(wz * 0.18) * 1.6);
        vFoam = clamp(smoothstep(0.45, 0.98, dispY) * 0.75 + shoreZone * pow(shoreWave, 2.2) * 0.95, 0.0, 1.0);

        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uPhase;
      uniform vec3 uLightDir;
      uniform vec3 uSunColor;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vFoam;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);

        vec3 duskDeep = vec3(0.04, 0.22, 0.36);
        vec3 duskShallow = vec3(0.09, 0.48, 0.56);
        vec3 nightDeep = vec3(0.015, 0.06, 0.15);
        vec3 nightShallow = vec3(0.04, 0.22, 0.34);

        vec3 deepCol = mix(duskDeep, nightDeep, uPhase);
        vec3 shallowCol = mix(duskShallow, nightShallow, uPhase);

        float shoreFactor = smoothstep(-28.0, -6.5, vWorldPos.x);
        vec3 waterCol = mix(deepCol, shallowCol, shoreFactor * 0.75 + fresnel * 0.35);

        vec3 H = normalize(uLightDir + V);
        float spec = pow(max(dot(N, H), 0.0), 42.0);
        waterCol += uSunColor * spec * 1.35;

        vec3 duskFoam = vec3(0.96, 0.95, 0.98);
        vec3 nightFoam = vec3(0.68, 0.95, 1.0);
        vec3 foamCol = mix(duskFoam, nightFoam, uPhase * 0.75);

        vec3 finalCol = mix(waterCol, foamCol, vFoam);
        gl_FragColor = vec4(finalCol, 1.0);
      }
    `
  });

  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(-88, -0.85, -45);
  worldGroup.add(oceanMesh);

  // 5. Shoreline Breakers & Surf Rollers (岸边碎浪)
  const breakerGroup = new THREE.Group();
  worldGroup.add(breakerGroup);

  const breakerRibbons = [];
  const breakerMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.18,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85
  });

  for (let b = 0; b < 4; b++) {
    const surfGeo = new THREE.CylinderGeometry(0.28, 0.45, 52, 12, 24, false);
    surfGeo.rotateX(Math.PI / 2);
    const surfMesh = new THREE.Mesh(surfGeo, breakerMat.clone());
    breakerGroup.add(surfMesh);
    breakerRibbons.push({
      mesh: surfMesh,
      phaseOffset: b * 1.57,
      baseZ: 10 - b * 36
    });
  }

  // Soft Circular Seafoam Spray Particles (碎浪飞沫圆粒子)
  const maxFoamParticles = 180;
  const foamPositions = new Float32Array(maxFoamParticles * 3);
  const foamVelocities = [];
  for (let i = 0; i < maxFoamParticles; i++) {
    foamPositions[i * 3] = -6.2 - Math.random() * 4.5;
    foamPositions[i * 3 + 1] = -0.3 + Math.random() * 1.4;
    foamPositions[i * 3 + 2] = 20 - Math.random() * 120;
    foamVelocities.push({
      vx: 1.2 + Math.random() * 2.2,
      vy: 2.2 + Math.random() * 3.4,
      vz: -1.0 + Math.random() * 2.0,
      life: Math.random()
    });
  }
  const foamGeo = new THREE.BufferGeometry();
  const foamPosAttr = new THREE.BufferAttribute(foamPositions, 3);
  foamPosAttr.setUsage(THREE.DynamicDrawUsage);
  foamGeo.setAttribute('position', foamPosAttr);
  const foamMat = new THREE.PointsMaterial({
    color: 0xe0f7ff,
    map: softCircleTex || null,
    size: 0.52,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const foamParticles = new THREE.Points(foamGeo, foamMat);
  worldGroup.add(foamParticles);

  // 6. Detailed 3D Leaping Fish & Interactive Road Items directly on the 3 Highway Lanes!
  const activeFish = [];
  const activeRoadItems = [];
  const catchBursts = [];
  const fishContainer = new THREE.Group();
  worldGroup.add(fishContainer);

  function buildFishMesh(spec) {
    const fg = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: spec.color,
      map: fishScaleTex || null,
      roughness: 0.18,
      metalness: 0.65,
      emissive: spec.emissive,
      emissiveIntensity: spec.rare ? 0.65 : 0.28
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: spec.finColor,
      roughness: 0.25,
      metalness: 0.4,
      emissive: spec.emissive,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
    });

    // Plump sculpted fish body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), bodyMat);
    body.scale.set(1.85, 0.92, 0.58);
    fg.add(body);

    // Dorsal fin on top
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 4), finMat);
    dorsal.position.set(-0.04, 0.24, 0);
    dorsal.rotation.z = 0.45;
    dorsal.scale.set(1.2, 1.0, 0.25);
    fg.add(dorsal);

    // Wagging forked tail fin
    const tail = new THREE.Group();
    tail.position.set(-0.42, 0, 0);
    const tailUpper = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 4), finMat);
    tailUpper.position.set(-0.12, 0.10, 0);
    tailUpper.rotation.z = Math.PI * 0.36;
    tailUpper.scale.set(0.3, 1, 1);
    const tailLower = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), finMat);
    tailLower.position.set(-0.10, -0.09, 0);
    tailLower.rotation.z = Math.PI * 0.64;
    tailLower.scale.set(0.3, 1, 1);
    tail.add(tailUpper, tailLower);
    fg.add(tail);

    // Expressive 3D Fish Eyes (white sclera + black pupil on both sides)
    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    for (const s of [-1, 1]) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), scleraMat);
      eyeW.position.set(0.24, 0.05, s * 0.11);
      const eyeP = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), pupilMat);
      eyeP.position.set(0.26, 0.05, s * 0.14);
      fg.add(eyeW, eyeP);
    }

    // Gliding wing-fins for Flying Fish / Moonfish, or side pectoral fins for standard fish
    const wingSpan = spec.highArc ? 0.68 : 0.26;
    const wingFinGeo = new THREE.ConeGeometry(0.15, wingSpan, 4);
    const finL = new THREE.Mesh(wingFinGeo, finMat);
    finL.position.set(0.08, -0.02, -0.18 - (spec.highArc ? 0.14 : 0));
    finL.rotation.x = -Math.PI / 2 + 0.2;
    const finR = new THREE.Mesh(wingFinGeo, finMat);
    finR.position.set(0.08, -0.02, 0.18 + (spec.highArc ? 0.14 : 0));
    finR.rotation.x = Math.PI / 2 - 0.2;
    fg.add(finL, finR);

    fg.scale.setScalar(spec.scale);
    return { group: fg, tail };
  }

  function spawnFish(dayNightPhase = 0, forceLane = null, forceType = null, customZ = null) {
    const laneIndex = forceLane !== null ? forceLane : Math.floor(Math.random() * 3);
    const targetX = LANE_X[laneIndex];

    let spec = FISH_TYPES.sardine;
    if (forceType && FISH_TYPES[forceType]) {
      spec = FISH_TYPES[forceType];
    } else {
      const r = Math.random();
      if (dayNightPhase > 0.55 && r < 0.22) {
        spec = FISH_TYPES.moonfish;
      } else if (r < 0.18) {
        spec = FISH_TYPES.golden;
      } else if (r < 0.42) {
        spec = FISH_TYPES.flying;
      } else if (r < 0.72) {
        spec = FISH_TYPES.salmon;
      }
    }

    const { group, tail } = buildFishMesh(spec);

    // Bright glowing lane target pad + vertical light beacon column so fish are clearly visible on the road from 90m away!
    const ringColor = spec.rare ? 0xfbbf24 : (spec.highArc ? 0x38bdf8 : 0x34d399);
    const markerGroup = new THREE.Group();

    const ringGeo = new THREE.RingGeometry(0.52, 0.78, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const outerRing = new THREE.Mesh(ringGeo, ringMat);

    const innerPadGeo = new THREE.CircleGeometry(0.48, 24);
    innerPadGeo.rotateX(-Math.PI / 2);
    const innerPadMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.28
    });
    const innerPad = new THREE.Mesh(innerPadGeo, innerPadMat);

    // Vertical light pillar connecting the road pad up to the floating/arcing fish
    const beaconHeight = spec.highArc ? 2.6 : 1.5;
    const beaconGeo = new THREE.CylinderGeometry(0.18, 0.45, beaconHeight, 14, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = beaconHeight * 0.5;

    markerGroup.add(outerRing, innerPad, beacon);

    const startZ = customZ !== null ? customZ : (-72 - Math.random() * 24);
    const peakY = spec.highArc ? 2.48 : 1.48;
    const startX = -7.6;

    markerGroup.position.set(targetX, 0.03, startZ);
    fishContainer.add(group, markerGroup);

    const fishEntry = {
      spec,
      laneIndex,
      targetX,
      startX,
      z: startZ,
      peakY,
      y: peakY,
      x: targetX,
      group,
      tail,
      markerRing: markerGroup,
      wobbleSeed: Math.random() * 10,
      caught: false
    };
    activeFish.push(fishEntry);
    return fishEntry;
  }

  // Build 3D Interactive Road Props (黄金海星, 顺风加速拱门, 海岸冲浪跳台, 横行大红蟹)
  function buildRoadItemMesh(typeId) {
    const g = new THREE.Group();

    if (typeId === 'starfish') {
      // 5-Pointed 3D Golden Starfish + glowing base ring
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.22,
        metalness: 0.78,
        emissive: 0xd97706,
        emissiveIntensity: 0.45
      });
      const starSpin = new THREE.Group();
      starSpin.position.y = 0.92;
      for (let arm = 0; arm < 5; arm++) {
        const a = (arm / 5) * Math.PI * 2;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), starMat);
        cone.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
        cone.rotation.z = a - Math.PI / 2;
        cone.scale.set(1, 1, 0.45);
        starSpin.add(cone);
      }
      const centerGem = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), starMat);
      centerGem.scale.set(1, 1, 0.55);
      starSpin.add(centerGem);

      const baseRingGeo = new THREE.RingGeometry(0.35, 0.50, 20);
      baseRingGeo.rotateX(-Math.PI / 2);
      const baseRing = new THREE.Mesh(
        baseRingGeo,
        new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
      );
      baseRing.position.y = 0.03;

      g.add(starSpin, baseRing);
      return { group: g, spinner: starSpin };
    }

    if (typeId === 'boost_ring') {
      // Giant Glowing Cyan & Gold Wind Boost Arch Gate across the lane
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.65
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.2,
        metalness: 0.85,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.5
      });

      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.09, 12, 32, Math.PI), frameMat);
      arch.position.y = 0.1;
      g.add(arch);

      const innerSpin = new THREE.Group();
      innerSpin.position.y = 1.15;
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 10, 28), goldMat);
      innerSpin.add(innerRing);

      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.12), frameMat);
        fin.position.set(Math.cos(ang) * 0.95, Math.sin(ang) * 0.95, 0);
        fin.rotation.z = ang + 0.4;
        innerSpin.add(fin);
      }
      g.add(innerSpin);

      // Base pillars on left/right of lane
      for (const s of [-1, 1]) {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.45, 10), goldMat);
        base.position.set(s * 1.28, 0.22, 0);
        g.add(base);
      }

      return { group: g, spinner: innerSpin };
    }

    if (typeId === 'surf_ramp') {
      // Bright Wooden & Surfboard Launch Ramp on the lane
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.35,
        metalness: 0.25,
        emissive: 0xb45309,
        emissiveIntensity: 0.3
      });
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });

      const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 2.5), rampMat);
      wedge.position.set(0, 0.35, 0);
      wedge.rotation.x = 0.28;
      g.add(wedge);

      for (let s = -1; s <= 1; s++) {
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), stripeMat);
        arrow.rotation.x = -Math.PI / 2 + 0.28;
        arrow.position.set(s * 0.42, 0.46, 0);
        g.add(arrow);
      }

      return { group: g, spinner: null };
    }

    // Default: 'crab' — Sculpted 3D Red Coastal Crab with Traffic Cones
    const crabRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.32,
      metalness: 0.18,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.32
    });
    const coneOrange = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.4,
      emissive: 0x9a3412,
      emissiveIntensity: 0.25
    });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const crabBody = new THREE.Group();
    crabBody.position.y = 0.36;

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), crabRed);
    shell.scale.set(1.35, 0.58, 1.0);
    crabBody.add(shell);

    // Stalked eyes
    for (const s of [-1, 1]) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), crabRed);
      stalk.position.set(s * 0.2, 0.25, 0.26);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), whiteMat);
      eye.position.set(s * 0.2, 0.36, 0.28);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), blackMat);
      pupil.position.set(s * 0.2, 0.36, 0.33);
      crabBody.add(stalk, eye, pupil);

      // Big raised pincer claws
      const clawArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8), crabRed);
      clawArm.position.set(s * 0.58, 0.18, 0.24);
      clawArm.rotation.z = -s * 0.65;
      const pincer = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), crabRed);
      pincer.position.set(s * 0.72, 0.36, 0.32);
      pincer.scale.set(0.85, 1.35, 0.6);
      crabBody.add(clawArm, pincer);

      // 3 walking legs per side
      for (let l = 0; l < 3; l++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.45, 6), crabRed);
        leg.position.set(s * 0.56, -0.08, -0.18 + l * 0.18);
        leg.rotation.z = s * 0.85;
        crabBody.add(leg);
      }
    }
    g.add(crabBody);

    // Flanking orange-and-white highway warning cones
    for (const s of [-1, 1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 12), coneOrange);
      cone.position.set(s * 0.92, 0.32, 0);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.16, 12), whiteMat);
      band.position.set(s * 0.92, 0.36, 0);
      g.add(cone, band);
    }

    return { group: g, spinner: crabBody };
  }

  function spawnRoadItem(forceLane = null, forceType = null, customZ = null) {
    const laneIndex = forceLane !== null ? forceLane : Math.floor(Math.random() * 3);
    const x = LANE_X[laneIndex];

    let typeId = forceType;
    if (!typeId) {
      const r = Math.random();
      if (r < 0.45) typeId = 'starfish';
      else if (r < 0.70) typeId = 'boost_ring';
      else if (r < 0.86) typeId = 'surf_ramp';
      else typeId = 'crab';
    }

    const spec = ROAD_ITEM_TYPES[typeId] || ROAD_ITEM_TYPES.starfish;
    const { group, spinner } = buildRoadItemMesh(spec.id);
    const z = customZ !== null ? customZ : (-78 - Math.random() * 25);
    group.position.set(x, 0, z);
    fishContainer.add(group);

    const item = {
      spec,
      typeId: spec.id,
      laneIndex,
      x,
      z,
      group,
      spinner,
      seed: Math.random() * 10,
      collected: false
    };
    activeRoadItems.push(item);
    return item;
  }

  // Pre-seed visible fish and road items along the entire highway (`z = -14` to `-90`) so the road is immediately full of action!
  const initialFishLanes = [1, 0, 2, 1, 0, 2];
  const initialFishTypes = ['sardine', 'salmon', 'flying', 'golden', 'sardine', 'salmon'];
  for (let i = 0; i < initialFishLanes.length; i++) {
    spawnFish(0, initialFishLanes[i], initialFishTypes[i], -16 - i * 13);
  }

  const initialRoadPattern = [
    { lane: 1, type: 'starfish', z: -10 },
    { lane: 1, type: 'starfish', z: -14 },
    { lane: 1, type: 'boost_ring', z: -22 },
    { lane: 0, type: 'starfish', z: -30 },
    { lane: 2, type: 'surf_ramp', z: -38 },
    { lane: 1, type: 'crab', z: -47 },
    { lane: 0, type: 'boost_ring', z: -56 },
    { lane: 2, type: 'starfish', z: -64 },
    { lane: 2, type: 'starfish', z: -68 },
    { lane: 1, type: 'surf_ramp', z: -78 }
  ];
  for (const p of initialRoadPattern) {
    spawnRoadItem(p.lane, p.type, p.z);
  }

  function createCatchBurst(pos, colorHex = 0xfbbf24) {
    const burstGroup = new THREE.Group();
    burstGroup.position.copy(pos);
    const droplets = [];
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), mat);
      const ang = (i / 12) * Math.PI * 2;
      const spd = 2.4 + Math.random() * 2.2;
      droplets.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 1.5 + Math.random() * 2.8,
        vz: Math.sin(ang) * spd
      });
      burstGroup.add(m);
    }
    fishContainer.add(burstGroup);
    catchBursts.push({ group: burstGroup, mat, droplets, age: 0 });
  }

  let elapsed = 0;
  let spawnCooldown = 0.5;
  let itemSpawnCooldown = 0.45;
  let currentQuality = 'high';

  return {
    activeFish,
    activeRoadItems,
    spawnFish,
    spawnRoadItem,
    createCatchBurst,
    setQualityPreset(tier) {
      if (tier === currentQuality) return;
      currentQuality = tier;
      mainDirLight.castShadow = tier !== 'low';
      foamParticles.visible = tier !== 'low';
    },
    update(dt, {
      speedKmh = 32,
      dayNightPhase = 0,
      pelicanX = 0,
      pelicanY = 0
    } = {}) {
      elapsed += dt;
      const speedMps = speedKmh / 3.6;

      // Scroll procedural road texture UV
      if (roadTex) {
        roadTex.offset.y -= (speedMps / roadLength) * 14 * dt;
      }

      // 1. Update Day-Night Sky, Sun/Moon, Starfield & Streetlamps
      skyMat.uniforms.uPhase.value = dayNightPhase;
      oceanMat.uniforms.uTime.value = elapsed;
      oceanMat.uniforms.uPhase.value = dayNightPhase;

      const sunElevation = 0.24 - dayNightPhase * 0.52;
      const moonElevation = -0.15 + dayNightPhase * 0.58;
      skyMat.uniforms.uSunDir.value.set(-0.65, sunElevation, -0.72).normalize();
      skyMat.uniforms.uMoonDir.value.set(-0.52, moonElevation, -0.78).normalize();

      moonGroup.position.copy(skyMat.uniforms.uMoonDir.value).multiplyScalar(215);
      moonMat.opacity = Math.max(0, Math.min(0.96, (dayNightPhase - 0.28) / 0.42));

      const starOpacity = Math.max(0, Math.min(0.95, (dayNightPhase - 0.25) / 0.55));
      starMat.opacity = starOpacity * (0.86 + 0.14 * Math.sin(elapsed * 3.2));

      const sunsetColor = new THREE.Color(0xff8c42);
      const twilightColor = new THREE.Color(0x818cf8);
      const moonlightColor = new THREE.Color(0x60a5fa);

      const activeLightCol = dayNightPhase < 0.5
        ? sunsetColor.clone().lerp(twilightColor, dayNightPhase * 2)
        : twilightColor.clone().lerp(moonlightColor, (dayNightPhase - 0.5) * 2);

      mainDirLight.color.copy(activeLightCol);
      mainDirLight.intensity = 2.3 - dayNightPhase * 0.8;
      oceanMat.uniforms.uSunColor.value.copy(activeLightCol);

      ambientLight.color.lerpColors(new THREE.Color(0xffb482), new THREE.Color(0x1e3a5f), dayNightPhase);
      ambientLight.intensity = 0.85 - dayNightPhase * 0.2;

      const nightGlow = Math.max(0, Math.min(1, (dayNightPhase - 0.30) / 0.40));
      lampHaloMat.opacity = nightGlow * 0.18;
      lhBeamMat.opacity = nightGlow * 0.24;
      lhBeam.rotation.y = elapsed * 0.65;

      // 2. Scroll Highway Lane Dashes & Roadside Props
      const totalDashSpan = dashCount * dashSpacing;
      for (const dash of dashMeshes) {
        dash.position.z += speedMps * dt;
        if (dash.position.z > 25) {
          dash.position.z -= totalDashSpan;
        }
      }

      const totalPropSpan = propSlices * sliceSpacing;
      for (const slice of propsPool) {
        slice.position.z += speedMps * dt;
        if (slice.position.z > 24) {
          slice.position.z -= totalPropSpan;
        }
      }

      // 3. Animate Shoreline Breakers & Spray Particles
      let breakerPeak = 0;
      for (let i = 0; i < breakerRibbons.length; i++) {
        const br = breakerRibbons[i];
        br.baseZ += speedMps * dt;
        if (br.baseZ > 36) br.baseZ -= 144;

        const cycle = (elapsed * 0.72 + br.phaseOffset) % (Math.PI * 2);
        const surge = Math.sin(cycle);
        const crash = Math.max(0, Math.sin(cycle - 0.4));
        breakerPeak = Math.max(breakerPeak, crash);

        br.mesh.position.set(-8.8 + surge * 2.6, -0.52 + surge * 0.35, br.baseZ);
        br.mesh.scale.set(0.65 + crash * 1.15, 0.45 + crash * 0.55, 1.0);
        br.mesh.rotation.z = elapsed * 2.4;
        br.mesh.material.opacity = (0.35 + crash * 0.58) * (1 - Math.max(0, surge - 0.75) * 2.5);
        br.mesh.material.emissiveIntensity = 0.15 + dayNightPhase * 0.55 * crash;
      }

      if (foamParticles.visible) {
        for (let i = 0; i < maxFoamParticles; i++) {
          const p = foamVelocities[i];
          p.life += dt * (0.85 + breakerPeak * 0.6);
          const idx = i * 3;
          foamPositions[idx] += p.vx * dt;
          foamPositions[idx + 1] += p.vy * dt;
          foamPositions[idx + 2] += (p.vz + speedMps) * dt;
          p.vy -= 6.8 * dt;

          if (p.life > 1.0 || foamPositions[idx + 1] < -0.9 || foamPositions[idx + 2] > 22) {
            p.life = 0;
            foamPositions[idx] = -6.2 - Math.random() * 4.2;
            foamPositions[idx + 1] = -0.35 + Math.random() * 0.3;
            foamPositions[idx + 2] = -95 + Math.random() * 110;
            p.vx = 1.4 + Math.random() * 2.5;
            p.vy = 2.0 + Math.random() * 3.2 * (0.5 + breakerPeak * 0.8);
          }
        }
        foamPosAttr.needsUpdate = true;
      }

      // 4. Spawn & Update Fish directly above the 3 Highway Lanes
      spawnCooldown -= dt;
      if (spawnCooldown <= 0 && activeFish.length < 7) {
        spawnFish(dayNightPhase);
        spawnCooldown = Math.max(0.6, 1.25 - (speedKmh / 60) * 0.45);
      }

      let nearestFishDist = 999;
      for (let i = activeFish.length - 1; i >= 0; i--) {
        const f = activeFish[i];
        f.z += speedMps * dt;

        // Fish leaps from ocean onto its lane early (between z = -88 and z = -62),
        // then swims/arcs clearly right above the highway lane all the way to z = 0!
        const entryBlend = Math.max(0, Math.min(1, (f.z + 88) / 24));
        f.x = f.startX + (f.targetX - f.startX) * entryBlend;

        const bob = Math.sin(elapsed * 5.2 + f.wobbleSeed) * 0.22;
        f.y = f.peakY + bob;

        f.group.position.set(f.x, f.y, f.z);
        // Face toward the oncoming pelican (+Z direction) with lively swimming yaw
        f.group.rotation.y = -Math.PI / 2 + Math.sin(elapsed * 8 + f.wobbleSeed) * 0.18;
        f.group.rotation.z = Math.cos(elapsed * 5.2 + f.wobbleSeed) * 0.16;
        f.tail.rotation.y = Math.sin(elapsed * 22 + f.wobbleSeed) * 0.48;

        f.markerRing.position.set(f.targetX, 0.03, f.z);
        const pulse = 0.88 + 0.16 * Math.sin(elapsed * 9 + f.wobbleSeed);
        f.markerRing.scale.set(pulse, 1, pulse);

        const distToPelican = Math.hypot(f.x - pelicanX, f.z);
        if (f.z < 2.5 && distToPelican < nearestFishDist) {
          nearestFishDist = distToPelican;
        }

        if (f.z > 10) {
          fishContainer.remove(f.group, f.markerRing);
          activeFish.splice(i, 1);
        }
      }

      // 5. Spawn & Update Interactive 3D Road Items (黄金海星, 顺风加速拱门, 冲浪跳台, 横行大红蟹)
      itemSpawnCooldown -= dt;
      if (itemSpawnCooldown <= 0 && activeRoadItems.length < 12) {
        spawnRoadItem();
        itemSpawnCooldown = 0.72;
      }

      for (let i = activeRoadItems.length - 1; i >= 0; i--) {
        const item = activeRoadItems[i];
        item.z += speedMps * dt;

        if (item.typeId === 'starfish') {
          if (item.spinner) {
            item.spinner.rotation.y = elapsed * 3.4 + item.seed;
            item.spinner.position.y = 0.92 + Math.sin(elapsed * 5 + item.seed) * 0.12;
          }
        } else if (item.typeId === 'boost_ring') {
          if (item.spinner) {
            item.spinner.rotation.z = elapsed * 2.8;
          }
        } else if (item.typeId === 'crab') {
          // Scuttle sideways within its lane
          item.x = LANE_X[item.laneIndex] + Math.sin(elapsed * 3.6 + item.seed) * 0.48;
          if (item.spinner) {
            item.spinner.rotation.z = Math.sin(elapsed * 14 + item.seed) * 0.08;
          }
        }

        item.group.position.set(item.x, 0, item.z);

        if (item.z > 10) {
          fishContainer.remove(item.group);
          activeRoadItems.splice(i, 1);
        }
      }

      // Update catch celebration bursts
      for (let i = catchBursts.length - 1; i >= 0; i--) {
        const b = catchBursts[i];
        b.age += dt;
        b.mat.opacity = Math.max(0, 1 - b.age * 1.8);
        for (const d of b.droplets) {
          d.mesh.position.x += d.vx * dt;
          d.mesh.position.y += d.vy * dt;
          d.mesh.position.z += d.vz * dt;
          d.vy -= 7.5 * dt;
        }
        if (b.age > 0.6) {
          fishContainer.remove(b.group);
          catchBursts.splice(i, 1);
        }
      }

      return {
        waveBreakerIntensity: breakerPeak,
        nearFishFactor: nearestFishDist < 8.5 ? Math.max(0, 1 - nearestFishDist / 8.5) : 0
      };
    },
    removeFish(index) {
      const f = activeFish[index];
      if (!f) return;
      fishContainer.remove(f.group, f.markerRing);
      activeFish.splice(index, 1);
    },
    removeRoadItem(index) {
      const item = activeRoadItems[index];
      if (!item) return;
      fishContainer.remove(item.group);
      activeRoadItems.splice(index, 1);
    }
  };
}
