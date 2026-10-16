// Main Game Controller for Pelican Coast Ride 3D
import * as THREE from 'three';
import { createPelicanCyclist } from './pelican-model.js';
import { createOceanWorld, LANE_X } from './ocean-world.js';
import { CAMERA_MODES, CameraDirector, AdaptiveQualityGovernor, PelicanAutopilot } from './systems.js';
import { CoastalAudioEngine } from './audio-engine.js';
import { ACHIEVEMENTS, AchievementManager } from './achievements.js';

const canvas = document.getElementById('stage-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2b2548, 0.0034);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.12, 340);

// Instantiate 3D Ocean World & Pelican Cyclist
const world = createOceanWorld(THREE, scene);
const pelican = createPelicanCyclist(THREE);
scene.add(pelican.root);

// Core Systems
const cameraDirector = new CameraDirector(THREE, camera);
const qualityGovernor = new AdaptiveQualityGovernor(renderer, world);
const autopilot = new PelicanAutopilot();
const audioEngine = new CoastalAudioEngine();

// Toast Queue for Achievements
const toastQueue = [];
let activeToastTimer = 0;

function showAchievementToast(ach) {
  toastQueue.push(ach);
  audioEngine.playAchievement();
  renderAchievementDrawer();
}

const achievements = new AchievementManager({
  onUnlock: (ach) => showAchievementToast(ach)
});

// Game State
const state = {
  speedKmh: 36,
  minSpeedKmh: 16,
  maxSpeedKmh: 64,
  cadenceRpm: 82,
  currentLane: 1,
  pelicanX: 0,
  lateralVel: 0,
  jumpHeight: 0,
  verticalVel: 0,
  isAirborne: false,
  isWheelie: false,
  wheelieHoldTimer: 0,
  dayNightPhase: 0.05,
  dayNightCycleSpeed: 0.016,
  dayNightDirection: 1,
  dayNightLocked: false,
  score: 0,
  distanceMeters: 0,
  fishCaught: 0,
  combo: 0,
  maxCombo: 0,
  maxSpeedReached: 36,
  maxCadenceReached: 82,
  wheelieSecondsAccum: 0,
  airCatches: 0,
  rareFishCatches: 0,
  autopilotCatches: 0,
  wheelieCatches: 0,
  seaLaneMeters: 0,
  reachedStarryNight: 0,
  scarfStretch: 0.72
};

// Input State (Keyboard + Touch)
const input = {
  accel: false,
  brake: false,
  left: false,
  right: false,
  wheelie: false
};

function ensureAudioStarted() {
  audioEngine.init();
  audioEngine.resume?.();
  updateAudioButtonsUI();
}

function moveLane(delta, isManual = true) {
  if (isManual) {
    ensureAudioStarted();
    autopilot.notifyManualInput();
  }
  const next = Math.max(0, Math.min(2, state.currentLane + delta));
  if (next !== state.currentLane) {
    state.currentLane = next;
    audioEngine.playLaneSwitch(delta);
  }
}

function triggerJump(isManual = true, customVel = 8.6) {
  if (isManual) {
    ensureAudioStarted();
    autopilot.notifyManualInput();
  }
  if (!state.isAirborne || customVel > 9.0) {
    state.isAirborne = true;
    state.verticalVel = customVel;
    state.isWheelie = false;
    audioEngine.playJump();
  }
}

function triggerWheelieToggle(forceState = null, isManual = true) {
  if (isManual) {
    ensureAudioStarted();
    autopilot.notifyManualInput();
  }
  const next = forceState !== null ? forceState : !state.isWheelie;
  if (next && !state.isAirborne) {
    if (!state.isWheelie) {
      audioEngine.playWheelieStart();
    }
    state.isWheelie = true;
    state.wheelieHoldTimer = 2.2;
  } else if (!next) {
    state.isWheelie = false;
    state.wheelieHoldTimer = 0;
  }
}

// Keyboard Controls (W/S 加减速、A/D 变道抓鱼、空格跳跃、T 展翅抬前轮、C/1-5 切镜头)
window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const code = e.code;

  if (code === 'KeyW' || code === 'ArrowUp') {
    input.accel = true;
    ensureAudioStarted();
    autopilot.notifyManualInput();
  } else if (code === 'KeyS' || code === 'ArrowDown') {
    input.brake = true;
    ensureAudioStarted();
    autopilot.notifyManualInput();
  } else if (code === 'KeyA' || code === 'ArrowLeft') {
    if (!e.repeat) moveLane(-1, true);
    input.left = true;
  } else if (code === 'KeyD' || code === 'ArrowRight') {
    if (!e.repeat) moveLane(1, true);
    input.right = true;
  } else if (code === 'Space') {
    e.preventDefault();
    if (!e.repeat) triggerJump(true);
  } else if (code === 'KeyT') {
    e.preventDefault();
    if (!e.repeat) triggerWheelieToggle(null, true);
    input.wheelie = true;
  } else if (code === 'KeyC') {
    e.preventDefault();
    ensureAudioStarted();
    const mode = cameraDirector.nextMode();
    syncCameraButtonsUI(mode);
  } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(code)) {
    ensureAudioStarted();
    const idx = Number(code.replace('Digit', '')) - 1;
    const mode = cameraDirector.setModeByIndex(idx);
    syncCameraButtonsUI(mode);
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'KeyW' || code === 'ArrowUp') input.accel = false;
  if (code === 'KeyS' || code === 'ArrowDown') input.brake = false;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
  if (code === 'KeyT') input.wheelie = false;
});

function bindHoldButton(id, onDown, onUp) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = (e) => {
    e.preventDefault();
    el.classList.add('is-pressed');
    onDown();
  };
  const end = (e) => {
    e.preventDefault();
    el.classList.remove('is-pressed');
    if (onUp) onUp();
  };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);
}

bindHoldButton(
  'touch-accel',
  () => {
    input.accel = true;
    ensureAudioStarted();
    autopilot.notifyManualInput();
  },
  () => {
    input.accel = false;
  }
);

bindHoldButton(
  'touch-brake',
  () => {
    input.brake = true;
    ensureAudioStarted();
    autopilot.notifyManualInput();
  },
  () => {
    input.brake = false;
  }
);

bindHoldButton('touch-left', () => moveLane(-1, true));
bindHoldButton('touch-right', () => moveLane(1, true));
bindHoldButton('touch-jump', () => triggerJump(true));
bindHoldButton(
  'touch-wheelie',
  () => {
    input.wheelie = true;
    triggerWheelieToggle(true, true);
  },
  () => {
    input.wheelie = false;
  }
);

function syncCameraButtonsUI(activeMode = cameraDirector.currentMode) {
  document.querySelectorAll('[data-camera-index]').forEach((btn) => {
    const idx = Number(btn.getAttribute('data-camera-index'));
    btn.classList.toggle('is-active', idx === activeMode.index);
  });
  const camLabel = document.getElementById('hud-camera-name');
  const camSub = document.getElementById('hud-camera-desc');
  if (camLabel) camLabel.textContent = activeMode.badge;
  if (camSub) camSub.textContent = activeMode.subtitle;

  const povOverlay = document.getElementById('pelican-pov-overlay');
  if (povOverlay) {
    povOverlay.classList.toggle('is-visible', activeMode.id === 'pelican_pov');
  }
}

document.querySelectorAll('[data-camera-index]').forEach((btn) => {
  btn.addEventListener('click', () => {
    ensureAudioStarted();
    const idx = Number(btn.getAttribute('data-camera-index'));
    const mode = cameraDirector.setModeByIndex(idx);
    syncCameraButtonsUI(mode);
  });
});

const touchCamBtn = document.getElementById('touch-camera');
if (touchCamBtn) {
  touchCamBtn.addEventListener('click', () => {
    ensureAudioStarted();
    const mode = cameraDirector.nextMode();
    syncCameraButtonsUI(mode);
  });
}

const autopilotBtn = document.getElementById('btn-autopilot');
if (autopilotBtn) {
  autopilotBtn.addEventListener('click', () => {
    ensureAudioStarted();
    autopilot.toggleManualOverride();
  });
}

document.querySelectorAll('[data-sky-phase]').forEach((btn) => {
  btn.addEventListener('click', () => {
    ensureAudioStarted();
    const mode = btn.getAttribute('data-sky-phase');
    document.querySelectorAll('[data-sky-phase]').forEach((b) => b.classList.toggle('is-active', b === btn));
    if (mode === 'auto') {
      state.dayNightLocked = false;
    } else if (mode === 'dusk') {
      state.dayNightLocked = true;
      state.dayNightPhase = 0.06;
    } else if (mode === 'twilight') {
      state.dayNightLocked = true;
      state.dayNightPhase = 0.48;
    } else if (mode === 'night') {
      state.dayNightLocked = true;
      state.dayNightPhase = 0.92;
      state.reachedStarryNight = 1;
    }
  });
});

const qualitySelect = document.getElementById('quality-select');
if (qualitySelect) {
  qualitySelect.addEventListener('change', (e) => {
    qualityGovernor.setMode(e.target.value);
  });
}

function updateAudioButtonsUI() {
  const status = audioEngine.getStatus();
  const musicBtn = document.getElementById('btn-music');
  const sfxBtn = document.getElementById('btn-sfx');
  if (musicBtn) {
    musicBtn.textContent = status.musicEnabled ? `🎵 音乐 ${status.bpm} BPM` : '🔇 音乐已关';
    musicBtn.classList.toggle('is-active', status.musicEnabled);
  }
  if (sfxBtn) {
    sfxBtn.textContent = status.sfxEnabled ? '🔊 音效开' : '🔈 音效关';
    sfxBtn.classList.toggle('is-active', status.sfxEnabled);
  }
}

document.getElementById('btn-music')?.addEventListener('click', () => {
  audioEngine.init();
  audioEngine.toggleMusic();
  updateAudioButtonsUI();
});

document.getElementById('btn-sfx')?.addEventListener('click', () => {
  audioEngine.init();
  audioEngine.toggleSfx();
  updateAudioButtonsUI();
});

const achDrawer = document.getElementById('achievement-drawer');
const btnOpenAch = document.getElementById('btn-achievements');
const btnCloseAch = document.getElementById('btn-close-achievements');

function renderAchievementDrawer() {
  const summary = achievements.getSummary();
  const countBadge = document.getElementById('hud-ach-count');
  if (countBadge) {
    countBadge.textContent = `${summary.unlockedCount} / ${summary.totalCount}`;
  }
  const grid = document.getElementById('achievement-grid');
  if (!grid) return;

  grid.innerHTML = summary.list
    .map((item) => {
      const pct = Math.round(item.progressRatio * 100);
      const valText = Math.min(item.target, Math.floor(item.currentValue));
      return `
        <article class="ach-card ${item.unlocked ? 'is-unlocked' : 'is-locked'}">
          <div class="ach-icon">${item.icon}</div>
          <div class="ach-body">
            <div class="ach-head">
              <h4>${item.title}</h4>
              <span class="ach-status">${item.unlocked ? '已解锁' : `${valText}/${item.target}`}</span>
            </div>
            <p>${item.desc}</p>
            <div class="ach-bar">
              <div class="ach-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

btnOpenAch?.addEventListener('click', () => {
  ensureAudioStarted();
  renderAchievementDrawer();
  achDrawer?.classList.remove('is-hidden');
});

btnCloseAch?.addEventListener('click', () => {
  achDrawer?.classList.add('is-hidden');
});

achDrawer?.addEventListener('click', (e) => {
  if (e.target === achDrawer) achDrawer.classList.add('is-hidden');
});

const popupsLayer = document.getElementById('floating-popups');
function spawnScorePopup(text, subtext = '', isRare = false) {
  if (!popupsLayer) return;
  const el = document.createElement('div');
  el.className = `score-popup ${isRare ? 'is-rare' : ''}`;
  el.innerHTML = `<strong>${text}</strong>${subtext ? `<span>${subtext}</span>` : ''}`;
  popupsLayer.appendChild(el);
  setTimeout(() => el.remove(), 1150);
}

renderAchievementDrawer();
syncCameraButtonsUI();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();

function stepSimulation(dt) {
  // 1. Day-Night Cycle Progression
  if (!state.dayNightLocked) {
    state.dayNightPhase += state.dayNightCycleSpeed * state.dayNightDirection * dt;
    if (state.dayNightPhase >= 1.0) {
      state.dayNightPhase = 1.0;
      state.dayNightDirection = -1;
    } else if (state.dayNightPhase <= 0.0) {
      state.dayNightPhase = 0.0;
      state.dayNightDirection = 1;
    }
  }
  if (state.dayNightPhase >= 0.72) {
    state.reachedStarryNight = 1;
  }

  const duskFog = new THREE.Color(0x4a2545);
  const nightFog = new THREE.Color(0x071126);
  scene.fog.color.lerpColors(duskFog, nightFog, state.dayNightPhase);

  // 2. Autopilot Evaluation
  const autoCmd = autopilot.update(dt, {
    activeFish: world.activeFish,
    activeRoadItems: world.activeRoadItems,
    currentLane: state.currentLane,
    pelicanX: state.pelicanX,
    speedKmh: state.speedKmh,
    isAirborne: state.isAirborne,
    isWheelie: state.isWheelie
  });

  if (autoCmd.isAutopilot) {
    if (autoCmd.desiredLane !== state.currentLane) {
      state.currentLane = autoCmd.desiredLane;
    }
    if (autoCmd.wantJump && !state.isAirborne) {
      triggerJump(false);
    }
    if (autoCmd.wantWheelie && !state.isAirborne && !state.isWheelie) {
      triggerWheelieToggle(true, false);
    }
  }

  // 3. Speed & Pedaling Cadence Physics
  let accelInput = 0;
  if (input.accel) accelInput += 1;
  if (input.brake) accelInput -= 1;
  if (autoCmd.isAutopilot && accelInput === 0) {
    accelInput = autoCmd.throttle;
  }

  if (accelInput > 0) {
    state.speedKmh = Math.min(state.maxSpeedKmh, state.speedKmh + 22 * accelInput * dt);
  } else if (accelInput < 0) {
    state.speedKmh = Math.max(state.minSpeedKmh, state.speedKmh + 28 * accelInput * dt);
  } else {
    state.speedKmh += (36 - state.speedKmh) * Math.min(1, dt * 1.4);
  }

  const targetCadence = 34 + (state.speedKmh / state.maxSpeedKmh) * 86 + (input.accel ? 12 : 0);
  state.cadenceRpm += (targetCadence - state.cadenceRpm) * Math.min(1, dt * 6.5);

  state.maxSpeedReached = Math.max(state.maxSpeedReached, state.speedKmh);
  state.maxCadenceReached = Math.max(state.maxCadenceReached, state.cadenceRpm);

  // 4. Lateral Lane Steering
  const targetX = LANE_X[state.currentLane];
  const prevX = state.pelicanX;
  state.pelicanX += (targetX - state.pelicanX) * Math.min(1, dt * 9.5);
  state.lateralVel = (state.pelicanX - prevX) / Math.max(0.001, dt);
  const steerAmount = Math.max(-1, Math.min(1, (targetX - state.pelicanX) * 0.65));

  // 5. Jump & Wing-Wheelie Physics
  if (state.isAirborne) {
    state.jumpHeight += state.verticalVel * dt;
    state.verticalVel -= 21.5 * dt;
    if (state.jumpHeight <= 0) {
      state.jumpHeight = 0;
      state.verticalVel = 0;
      state.isAirborne = false;
      audioEngine.playLand();
    }
  }

  if (state.isWheelie) {
    state.wheelieSecondsAccum += dt;
    if (!input.wheelie) {
      state.wheelieHoldTimer -= dt;
      if (state.wheelieHoldTimer <= 0) {
        state.isWheelie = false;
      }
    }
  }

  const distDelta = (state.speedKmh / 3.6) * dt;
  state.distanceMeters += distDelta;
  state.score += distDelta * (state.isWheelie ? 1.8 : 1.0);
  if (state.currentLane === 0) {
    state.seaLaneMeters += distDelta;
  }

  // 6. Step Ocean World & Check Fish + Road Item Collisions
  const worldFeedback = world.update(dt, {
    speedKmh: state.speedKmh,
    dayNightPhase: state.dayNightPhase,
    pelicanX: state.pelicanX,
    pelicanY: state.jumpHeight
  });

  const beakZ = -0.35;
  const beakY = 1.55 + state.jumpHeight + (state.isWheelie ? 0.35 : 0);
  for (let i = world.activeFish.length - 1; i >= 0; i--) {
    const f = world.activeFish[i];
    if (f.caught) continue;

    const dz = Math.abs(f.z - beakZ);
    const dx = Math.abs(f.x - state.pelicanX);
    const dy = Math.abs(f.y - beakY);
    const heightOk = f.spec.highArc ? (state.jumpHeight > 0.42 || dy < 0.92) : (dy < 1.35);

    if (dz < 1.45 && dx < 1.2 && heightOk) {
      f.caught = true;
      state.fishCaught += 1;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);

      const wheelieBonus = state.isWheelie ? 1.5 : 1.0;
      const comboMult = 1 + Math.min(4, (state.combo - 1) * 0.25);
      const earned = Math.round(f.spec.points * wheelieBonus * comboMult);
      state.score += earned;

      if (state.isAirborne) state.airCatches += 1;
      if (state.isWheelie) state.wheelieCatches += 1;
      if (f.spec.rare) state.rareFishCatches += 1;
      if (autoCmd.isAutopilot) state.autopilotCatches += 1;

      pelican.triggerGulp();
      world.createCatchBurst(f.group.position, f.spec.color);
      world.removeFish(i);
      audioEngine.playCatchFish(f.spec.rare ? 'rare' : 'normal', state.combo);

      const tags = [];
      if (state.combo > 1) tags.push(`Combo ×${state.combo}`);
      if (state.isWheelie) tags.push('展翅抬轮 ×1.5');
      if (state.isAirborne) tags.push('空中掠夺');
      spawnScorePopup(`+${earned} ${f.spec.name}`, tags.join(' · '), f.spec.rare);
    } else if (f.z > 2.4 && !f.missedCounted) {
      f.missedCounted = true;
      state.combo = 0;
    }
  }

  // Check Interactive Road Items (⭐ 黄金海星, 🌀 顺风加速环, 📐 冲浪跳台, 🦀 海岸巨蟹)
  for (let i = world.activeRoadItems.length - 1; i >= 0; i--) {
    const item = world.activeRoadItems[i];
    if (item.collected) continue;

    const dz = Math.abs(item.z);
    const dx = Math.abs(item.x - state.pelicanX);

    if (dz < 1.25 && dx < 1.15) {
      item.collected = true;
      if (item.typeId === 'starfish') {
        state.score += item.spec.points;
        world.createCatchBurst(item.group.position, 0xfbbf24);
        audioEngine.playCatchFish('normal', Math.max(1, state.combo));
        spawnScorePopup(`+${item.spec.points} ⭐ 黄金海星`, '海道收集');
        world.removeRoadItem(i);
      } else if (item.typeId === 'boost_ring') {
        state.score += item.spec.points;
        state.speedKmh = Math.min(state.maxSpeedKmh, state.speedKmh + 12);
        world.createCatchBurst(item.group.position, 0x38bdf8);
        audioEngine.playWheelieStart();
        spawnScorePopup(`+${item.spec.points} 🌀 顺风加速环`, '时速飙升 +12 km/h', true);
        world.removeRoadItem(i);
      } else if (item.typeId === 'surf_ramp') {
        state.score += item.spec.points;
        triggerJump(false, 9.6);
        spawnScorePopup(`+${item.spec.points} 📐 冲浪跳台`, '超级腾空跳跃!');
        world.removeRoadItem(i);
      } else if (item.typeId === 'crab') {
        if (state.isAirborne || state.isWheelie) {
          state.score += item.spec.points;
          spawnScorePopup(`+${item.spec.points} 🦀 飞跃海岸巨蟹`, '特技闪避成功!', true);
        } else {
          triggerJump(false, 6.4);
          spawnScorePopup('🦀 蟹钳弹跳!', '按空格跳跃可获特技加分');
        }
      }
    }
  }

  // 7. Step Pelican 3D Character + Verlet Cloth Red Scarf
  pelican.root.position.x = state.pelicanX;
  const pelicanFeedback = pelican.update(dt, {
    speedKmh: state.speedKmh,
    cadenceRpm: state.cadenceRpm,
    steerAmount,
    lateralVel: state.lateralVel,
    verticalVel: state.verticalVel,
    jumpHeight: state.jumpHeight,
    isAirborne: state.isAirborne,
    isWheelie: state.isWheelie,
    nearFishFactor: worldFeedback.nearFishFactor,
    dayNightPhase: state.dayNightPhase,
    caughtFishCount: state.fishCaught
  });
  state.scarfStretch = pelicanFeedback.scarfStretch;

  if (pelicanFeedback.pedalClicked && !state.isAirborne) {
    audioEngine.playPedalClick(Math.min(1, state.speedKmh / 50));
  }

  // 8. Step Camera Director (5 Camera Modes)
  cameraDirector.update(dt, {
    pelican,
    pelicanRoot: pelican.root,
    povAnchor: pelican.povAnchor,
    pelicanX: state.pelicanX,
    jumpHeight: state.jumpHeight,
    speedKmh: state.speedKmh,
    steerAmount,
    isWheelie: state.isWheelie
  });

  // 9. Step Cadence-Synced Procedural Audio Engine
  audioEngine.update(dt, {
    cadenceRpm: state.cadenceRpm,
    speedKmh: state.speedKmh,
    dayNightPhase: state.dayNightPhase,
    isWheelie: state.isWheelie,
    isAirborne: state.isAirborne,
    waveBreakerIntensity: worldFeedback.waveBreakerIntensity
  });

  // 10. Step Frame-Rate Adaptive Quality Governor
  const perfStatus = qualityGovernor.update(dt);

  // 11. Evaluate 14 Achievements
  const legendProgress = state.distanceMeters >= 800 ? state.score : Math.min(state.score, 1400);
  achievements.updateMetrics({
    totalFish: state.fishCaught,
    maxSpeedKmh: Math.round(state.maxSpeedReached),
    wheelieSeconds: Number(state.wheelieSecondsAccum.toFixed(1)),
    airCatches: state.airCatches,
    maxCombo: state.maxCombo,
    reachedStarryNight: state.reachedStarryNight,
    camerasUsedCount: cameraDirector.getVisitedCount(),
    autopilotCatches: state.autopilotCatches,
    maxCadenceRpm: Math.round(state.maxCadenceReached),
    rareFishCatches: state.rareFishCatches,
    seaLaneMeters: Math.round(state.seaLaneMeters),
    wheelieCatches: state.wheelieCatches,
    legendProgress: Math.round(legendProgress)
  });

  updateToastUI(dt);
  updateHudDOM(perfStatus, autoCmd);
}

function updateToastUI(dt) {
  const toastEl = document.getElementById('achievement-toast');
  if (!toastEl) return;

  if (activeToastTimer > 0) {
    activeToastTimer -= dt;
    if (activeToastTimer <= 0) {
      toastEl.classList.remove('is-visible');
    }
  } else if (toastQueue.length > 0) {
    const next = toastQueue.shift();
    document.getElementById('toast-icon').textContent = next.icon;
    document.getElementById('toast-title').textContent = `成就解锁：${next.title}`;
    document.getElementById('toast-desc').textContent = next.desc;
    toastEl.classList.add('is-visible');
    activeToastTimer = 3.6;
  }
}

function getPhaseLabel(phase) {
  if (phase < 0.34) return '🌅 黄昏落日 (Dusk)';
  if (phase < 0.66) return '🌆 暮色微光 (Twilight)';
  return '🌌 星空月夜 (Starry Night)';
}

function updateHudDOM(perfStatus, autoCmd) {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(val)) el.textContent = String(val);
  };

  setTxt('hud-score', Math.floor(state.score).toLocaleString());
  setTxt('hud-fish', state.fishCaught);
  setTxt('hud-combo', state.combo > 1 ? `×${state.combo}` : '×1');
  setTxt('hud-distance', `${Math.floor(state.distanceMeters)} m`);
  setTxt('hud-speed', Math.round(state.speedKmh));
  setTxt('hud-cadence', `${Math.round(state.cadenceRpm)} RPM`);
  setTxt('hud-bpm', `${audioEngine.getStatus().bpm} BPM`);
  setTxt('hud-sky-label', getPhaseLabel(state.dayNightPhase));
  setTxt('hud-fps', `${perfStatus.fps} FPS · ${perfStatus.label}`);
  setTxt('hud-scarf', `${Math.round(state.scarfStretch * 100)}%`);

  const musicBtn = document.getElementById('btn-music');
  if (musicBtn && audioEngine.getStatus().musicEnabled) {
    musicBtn.textContent = `🎵 音乐 ${audioEngine.getStatus().bpm} BPM`;
  }

  const autoBadge = document.getElementById('hud-autopilot-status');
  if (autoBadge) {
    if (autoCmd.isAutopilot) {
      autoBadge.textContent = autoCmd.targetFishName
        ? `🤖 自动巡航追鱼中 → 锁定【${autoCmd.targetFishName}】`
        : '🤖 自动巡航中 · 按 W/A/S/D/空格/T 随时接管';
      autoBadge.classList.add('is-autopilot');
    } else {
      autoBadge.textContent = '🕹️ 手动骑行操控中 · 停止操作 3 秒后自动巡航追鱼';
      autoBadge.classList.remove('is-autopilot');
    }
  }

  const wheelieBadge = document.getElementById('touch-wheelie');
  if (wheelieBadge) {
    wheelieBadge.classList.toggle('is-active', state.isWheelie);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  stepSimulation(dt);
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.__PELICAN_GAME__ = {
  state,
  world,
  pelican,
  cameraDirector,
  qualityGovernor,
  autopilot,
  audioEngine,
  achievements,
  CAMERA_MODES,
  ACHIEVEMENTS,
  moveLane,
  triggerJump,
  triggerWheelieToggle,
  stepSimulation
};
