// 5 Camera Modes (including Cinematic & Pelican POV), Frame-Rate Adaptive Quality, and Fish-Chasing Autopilot

import { LANE_X } from './ocean-world.js';

export const CAMERA_MODES = [
  {
    id: 'chase',
    index: 0,
    key: '1',
    name: '追尾视角',
    subtitle: '经典第三人称动态追随镜头',
    badge: '🎥 追尾视角'
  },
  {
    id: 'cinematic',
    index: 1,
    key: '2',
    name: '电影运镜',
    subtitle: '多机位环绕摇臂与低角度海岸大片运镜',
    badge: '🎬 电影运镜'
  },
  {
    id: 'pelican_pov',
    index: 2,
    key: '3',
    name: '鹈鹕视角',
    subtitle: '第一人称墨镜后方视角 · 可见长喙张合抓鱼与前方道具',
    badge: '🕶️ 鹈鹕视角'
  },
  {
    id: 'coastal_side',
    index: 3,
    key: '4',
    name: '海岸侧拍',
    subtitle: '海浪侧向平行跟拍 · 尽览红围巾物理与踩踏姿态',
    badge: '🌊 海岸侧拍'
  },
  {
    id: 'aerial_drone',
    index: 4,
    key: '5',
    name: '高空航拍',
    subtitle: '无人机俯瞰三车道与海鱼跃出轨迹',
    badge: '🛸 高空航拍'
  }
];

export class CameraDirector {
  constructor(THREE, camera) {
    this.THREE = THREE;
    this.camera = camera;
    this.currentIndex = 0;
    this.visitedSet = new Set(['chase']);
    this.cinematicTime = 0;
    this.currentPos = new THREE.Vector3(0, 3.2, 6.2);
    this.currentLook = new THREE.Vector3(0, 1.5, -12);
    this.povWorldPos = new THREE.Vector3();
  }

  get currentMode() {
    return CAMERA_MODES[this.currentIndex];
  }

  setModeByIndex(idx) {
    this.currentIndex = ((idx % CAMERA_MODES.length) + CAMERA_MODES.length) % CAMERA_MODES.length;
    const mode = CAMERA_MODES[this.currentIndex];
    this.visitedSet.add(mode.id);
    return mode;
  }

  nextMode() {
    return this.setModeByIndex(this.currentIndex + 1);
  }

  getVisitedCount() {
    return this.visitedSet.size;
  }

  update(dt, {
    pelican,
    pelicanRoot,
    povAnchor,
    pelicanX = 0,
    jumpHeight = 0,
    speedKmh = 32,
    steerAmount = 0,
    isWheelie = false
  }) {
    const THREE = this.THREE;
    this.cinematicTime += dt;
    const mode = this.currentMode.id;

    if (pelican && typeof pelican.setFirstPersonMode === 'function') {
      pelican.setFirstPersonMode(mode === 'pelican_pov');
    }

    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    let targetFov = 58 + Math.max(0, (speedKmh - 25) * 0.25);

    if (mode === 'chase') {
      targetPos.set(
        pelicanX * 0.78 - steerAmount * 0.55,
        3.05 + jumpHeight * 0.65 + (isWheelie ? 0.25 : 0),
        5.65
      );
      targetLook.set(
        pelicanX * 0.92,
        1.35 + jumpHeight * 0.5 + (isWheelie ? 0.35 : 0),
        -14.0
      );
      this.currentPos.lerp(targetPos, Math.min(1, dt * 8.5));
      this.currentLook.lerp(targetLook, Math.min(1, dt * 10.5));
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLook);
    } else if (mode === 'cinematic') {
      const shotPhase = Math.floor((this.cinematicTime / 6.5) % 3);
      const t = this.cinematicTime;
      if (shotPhase === 0) {
        const ang = Math.sin(t * 0.55) * 0.65;
        targetPos.set(
          pelicanX - 3.6 + Math.cos(ang) * 0.8,
          1.65 + jumpHeight * 0.4 + Math.sin(t * 0.9) * 0.25,
          -2.4 + Math.sin(ang) * 2.6
        );
        targetLook.set(pelicanX + 0.2, 1.55 + jumpHeight * 0.75, -2.5);
        targetFov = 52;
      } else if (shotPhase === 1) {
        targetPos.set(
          pelicanX + 2.4 + Math.sin(t * 0.7) * 0.6,
          1.95 + jumpHeight * 0.5,
          3.6 + Math.cos(t * 0.6) * 0.8
        );
        targetLook.set(pelicanX - 0.6, 1.45 + jumpHeight * 0.6, -8.5);
        targetFov = 54;
      } else {
        targetPos.set(
          pelicanX - 5.4,
          2.6 + Math.sin(t * 0.5) * 0.4,
          2.8 + Math.cos(t * 0.45) * 2.2
        );
        targetLook.set(pelicanX + 0.5, 1.4 + jumpHeight * 0.5, -8.0);
        targetFov = 52;
      }
      this.currentPos.lerp(targetPos, Math.min(1, dt * 4.5));
      this.currentLook.lerp(targetLook, Math.min(1, dt * 6.0));
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLook);
    } else if (mode === 'pelican_pov') {
      // Unobstructed First-Person Pelican POV looking over the handlebars and beak tip down the 3 lanes!
      pelicanRoot.updateMatrixWorld(true);
      povAnchor.getWorldPosition(this.povWorldPos);
      this.camera.position.set(
        pelicanX,
        this.povWorldPos.y + 0.16,
        this.povWorldPos.z - 0.08
      );

      targetLook.set(
        pelicanX - steerAmount * 1.8,
        this.povWorldPos.y - 0.28 + (isWheelie ? 0.55 : 0),
        -22.0
      );
      this.camera.lookAt(targetLook);
      targetFov = 68;
    } else if (mode === 'coastal_side') {
      targetPos.set(
        pelicanX - 5.2,
        1.75 + jumpHeight * 0.55,
        0.65
      );
      targetLook.set(
        pelicanX + 0.4,
        1.45 + jumpHeight * 0.65 + (isWheelie ? 0.25 : 0),
        -1.2
      );
      targetFov = 48;
      this.currentPos.lerp(targetPos, Math.min(1, dt * 8.0));
      this.currentLook.lerp(targetLook, Math.min(1, dt * 9.5));
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLook);
    } else if (mode === 'aerial_drone') {
      targetPos.set(
        pelicanX * 0.4 - 1.2,
        11.8 + jumpHeight * 0.4,
        7.5
      );
      targetLook.set(
        pelicanX * 0.5 - 0.6,
        0.5,
        -16.0
      );
      targetFov = 56;
      this.currentPos.lerp(targetPos, Math.min(1, dt * 6.5));
      this.currentLook.lerp(targetLook, Math.min(1, dt * 8.0));
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLook);
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
  }
}

export const QUALITY_TIERS = {
  ultra: { id: 'ultra', label: '极致', pixelRatioScale: 1.0 },
  high: { id: 'high', label: '高画质', pixelRatioScale: 0.88 },
  medium: { id: 'medium', label: '均衡', pixelRatioScale: 0.72 },
  low: { id: 'low', label: '流畅', pixelRatioScale: 0.56 }
};

export class AdaptiveQualityGovernor {
  constructor(renderer, world) {
    this.renderer = renderer;
    this.world = world;
    this.mode = 'auto';
    this.activeTier = 'high';
    this.fps = 60;
    this.frameCount = 0;
    this.accumTime = 0;
    this.cooldown = 0;
    this.applyTier('high');
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'auto' && QUALITY_TIERS[mode]) {
      this.applyTier(mode);
    }
  }

  applyTier(tierId) {
    const tier = QUALITY_TIERS[tierId] || QUALITY_TIERS.high;
    this.activeTier = tier.id;
    const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetDpr = Math.max(0.75, baseDpr * tier.pixelRatioScale);
    this.renderer.setPixelRatio(targetDpr);
    this.world.setQualityPreset(tier.id);
  }

  update(dt) {
    this.frameCount += 1;
    this.accumTime += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.accumTime >= 0.8) {
      const measured = this.frameCount / this.accumTime;
      this.fps = Math.round(this.fps * 0.35 + measured * 0.65);
      this.frameCount = 0;
      this.accumTime = 0;

      if (this.mode === 'auto' && this.cooldown <= 0) {
        const order = ['low', 'medium', 'high', 'ultra'];
        const idx = order.indexOf(this.activeTier);
        if (this.fps < 42 && idx > 0) {
          this.applyTier(order[idx - 1]);
          this.cooldown = 2.2;
        } else if (this.fps >= 57 && idx < order.length - 1) {
          this.applyTier(order[idx + 1]);
          this.cooldown = 3.0;
        }
      }
    }

    return {
      fps: this.fps,
      mode: this.mode,
      activeTier: this.activeTier,
      label: this.mode === 'auto'
        ? `自适应 (${QUALITY_TIERS[this.activeTier].label})`
        : QUALITY_TIERS[this.activeTier].label
    };
  }
}

export class PelicanAutopilot {
  constructor() {
    this.enabled = true;
    this.idleTimer = 4.0;
    this.idleThreshold = 3.2;
    this.wheelieBurstTimer = 0;
  }

  notifyManualInput() {
    this.idleTimer = 0;
    this.enabled = false;
  }

  toggleManualOverride() {
    this.enabled = !this.enabled;
    this.idleTimer = this.enabled ? this.idleThreshold + 1 : 0;
    return this.enabled;
  }

  update(dt, {
    activeFish = [],
    activeRoadItems = [],
    currentLane = 1,
    pelicanX = 0,
    speedKmh = 32,
    isAirborne = false
  }) {
    this.idleTimer += dt;
    if (!this.enabled && this.idleTimer >= this.idleThreshold) {
      this.enabled = true;
    }

    if (!this.enabled) {
      return {
        isAutopilot: false,
        desiredLane: currentLane,
        throttle: 0,
        wantJump: false,
        wantWheelie: false
      };
    }

    // Find best upcoming fish ahead of the bicycle
    let bestFish = null;
    let bestScore = -999;

    for (const f of activeFish) {
      if (f.caught || f.z > 0.8 || f.z < -56) continue;
      const distZ = Math.abs(f.z);
      const laneCost = Math.abs(LANE_X[f.laneIndex] - pelicanX) * 1.4;
      const rarityBonus = f.spec.rare ? 8.0 : (f.spec.highArc ? 3.5 : 0);
      const score = -distZ - laneCost + rarityBonus;
      if (score > bestScore) {
        bestScore = score;
        bestFish = f;
      }
    }

    let desiredLane = currentLane;
    let throttle = 0;
    let wantJump = false;
    let wantWheelie = false;

    if (bestFish) {
      desiredLane = bestFish.laneIndex;
      const targetSpeed = bestFish.spec.rare ? 46 : 41;
      if (speedKmh < targetSpeed - 2) throttle = 1;
      else if (speedKmh > targetSpeed + 4) throttle = -0.5;

      const alignedInLane = Math.abs(pelicanX - bestFish.targetX) < 0.85;
      if (bestFish.spec.highArc && alignedInLane && bestFish.z > -9.5 && bestFish.z < -2.0 && !isAirborne) {
        wantJump = true;
      }
    } else {
      if (speedKmh < 38) throttle = 0.8;
      else if (speedKmh > 44) throttle = -0.4;
    }

    // Also jump over any crab directly in our lane right ahead!
    for (const item of activeRoadItems) {
      if (!item.collected && item.typeId === 'crab' && item.laneIndex === currentLane && item.z > -7.5 && item.z < -1.5 && !isAirborne) {
        wantJump = true;
      }
    }

    this.wheelieBurstTimer -= dt;
    if (this.wheelieBurstTimer <= -6.5 && !isAirborne && (!bestFish || !bestFish.spec.highArc)) {
      this.wheelieBurstTimer = 2.4;
    }
    if (this.wheelieBurstTimer > 0) {
      wantWheelie = true;
    }

    return {
      isAutopilot: true,
      desiredLane,
      throttle,
      wantJump,
      wantWheelie,
      targetFishName: bestFish ? bestFish.spec.name : null
    };
  }
}
