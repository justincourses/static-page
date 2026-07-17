(() => {
  'use strict';

  const ROWS = 7;
  const COLS = 7;
  const TYPES = ['ember', 'mana', 'moss', 'coin'];
  const SYMBOLS = { ember: '◆', mana: '✦', moss: '⬟', coin: '●' };
  const TYPE_NAMES = { ember: '红曜石', mana: '蓝晶', moss: '绿晶', coin: '铸币' };
  const EQUIPMENT = {
    weapon: ['新兵弩', '余烬连弩', '雷鸣弩机', '星落投射器', '王城裁决者'],
    armor: ['橡木城栅', '铆铁壁垒', '符文城墙', '永恒堡垒', '不落王垒'],
    charm: ['斥候号角', '疾风徽记', '时序沙漏', '龙心军旗', '苍穹战鼓']
  };
  const ENEMY_NAMES = {
    raider: ['裂齿·格鲁', '灰旗·乌桑', '断刃·柯勒', '荒牙·莫克', '红疤·伊戈'],
    swift: ['影足·希芙', '夜鸦·涅拉', '风刃·卡西', '薄雾·洛萨', '疾影·薇恩'],
    brute: ['铁颚·巴图', '碎墙·葛恩', '铜背·沃尔', '独眼·赫山', '重槌·鲁格'],
    boss: ['焚城者·戈摩', '不屈巨兽·塔恩', '王旗终结者·穆拉']
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    board: $('#matchBoard'),
    boardLock: $('#boardLock'),
    battlefield: $('#battlefield'),
    enemiesLayer: $('#enemiesLayer'),
    projectilesLayer: $('#projectilesLayer'),
    toastLayer: $('#combatToastLayer'),
    fortress: $('#fortress'),
    battleLog: $('#battleLog'),
    waveAnnouncement: $('#waveAnnouncement'),
    introModal: $('#introModal'),
    gameOverModal: $('#gameOverModal'),
    pauseButton: $('#pauseButton'),
    soundButton: $('#soundButton'),
    boardEffects: $('#boardEffects'),
    cascadeCallout: $('#cascadeCallout'),
    targetDossier: $('#targetDossier'),
    upgradeBanner: $('#equipmentUpgradeBanner'),
    volleyButton: $('#volleyButton')
  };

  const sound = {
    muted: localStorage.getItem('runeRampart.muted') === 'true',
    context: null,
    files: {
      click: './assets/audio/ui/click1.ogg',
      denied: './assets/audio/ui/switch7.ogg',
      match: './assets/audio/impact/impactGlass_medium_002.ogg',
      hit: './assets/audio/impact/impactPunch_medium_002.ogg',
      wall: './assets/audio/impact/impactWood_heavy_001.ogg',
      forge: './assets/audio/impact/impactBell_heavy_002.ogg'
    },

    init() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.context && AudioContext) this.context = new AudioContext();
      if (this.context && this.context.state === 'suspended') this.context.resume().catch(() => {});
    },

    play(name, volume = .2, rate = 1) {
      if (this.muted || !this.files[name]) return;
      const audio = new Audio(this.files[name]);
      audio.volume = volume;
      audio.playbackRate = rate;
      audio.play().catch(() => {});
    },

    tone(frequency, duration = .12, type = 'sine', volume = .035, delay = 0) {
      if (this.muted || !this.context) return;
      const start = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .025);
    },

    match(chain, counts) {
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const base = { ember: 196, mana: 294, moss: 247, coin: 330 }[dominant];
      const lift = Math.min(chain - 1, 5) * 32;
      this.play('match', .23, Math.min(1.55, .9 + chain * .12));
      this.tone(base + lift, .18, 'triangle', .045);
      this.tone((base + lift) * 1.5, .24, 'sine', .028, .07);
    },

    cascade(chain) {
      const base = 310 + Math.min(chain, 6) * 42;
      this.tone(base, .13, 'triangle', .04);
      this.tone(base * 1.25, .16, 'triangle', .04, .1);
      this.tone(base * 1.5, .22, 'sine', .035, .2);
    },

    toggle() {
      if (this.muted) {
        this.muted = false;
        this.init();
        this.play('click', .28, 1.12);
      } else {
        this.play('click', .2, .85);
        this.muted = true;
      }
      localStorage.setItem('runeRampart.muted', String(this.muted));
      updateSoundButton();
    }
  };

  const state = {
    board: [], selected: null, locked: false, started: false, paused: true, gameOver: false,
    score: 0, kills: 0, wave: 1, might: 0, mana: 0, repaired: 0,
    forge: 0, forgeTarget: 18, equipment: { weapon: 1, armor: 1, charm: 1 },
    wall: 1120, wallMax: 1120, combo: 1, enemies: [], enemyId: 0,
    waveQueue: 0, waveTotal: 0, waveSpawned: 0, nextSpawnAt: 0, intermissionUntil: 0,
    attackReadyAt: 0, lastFrame: 0, animationId: 0
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomType = () => TYPES[Math.floor(Math.random() * TYPES.length)];
  const indexOf = (row, col) => row * COLS + col;

  function buildBoard() {
    state.board = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        let type;
        do {
          type = randomType();
        } while (
          (col >= 2 && state.board[indexOf(row, col - 1)] === type && state.board[indexOf(row, col - 2)] === type) ||
          (row >= 2 && state.board[indexOf(row - 1, col)] === type && state.board[indexOf(row - 2, col)] === type)
        );
        state.board.push(type);
      }
    }
    if (!hasPossibleMove()) buildBoard();
  }

  function renderBoard(matched = new Set(), invalidIndex = -1, phase = '') {
    const fragment = document.createDocumentFragment();
    state.board.forEach((type, index) => {
      const tile = document.createElement('button');
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      tile.type = 'button';
      tile.className = `rune-tile ${type || ''}`;
      if (state.selected === index) tile.classList.add('selected');
      if (matched.has(index)) tile.classList.add(phase === 'primed' ? 'match-primed' : 'matched');
      if (phase === 'initial') tile.classList.add('is-entering');
      if (phase === 'dropping') tile.classList.add('is-dropping');
      if (index === invalidIndex) tile.classList.add('invalid');
      tile.dataset.index = String(index);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `${row + 1} 行 ${col + 1} 列，${TYPE_NAMES[type] || '空位'}`);
      tile.style.animationDelay = phase === 'dropping'
        ? `${(ROWS - row) * 28 + col * 7}ms`
        : phase === 'initial' ? `${(row + col) * 7}ms` : '0ms';
      tile.innerHTML = `<span class="rune-symbol" aria-hidden="true">${SYMBOLS[type] || ''}</span>`;
      fragment.appendChild(tile);
    });
    els.board.replaceChildren(fragment);
  }

  function findMatches() {
    const matches = new Set();
    for (let row = 0; row < ROWS; row += 1) {
      let runStart = 0;
      for (let col = 1; col <= COLS; col += 1) {
        const current = col < COLS ? state.board[indexOf(row, col)] : null;
        const previous = state.board[indexOf(row, col - 1)];
        if (current !== previous) {
          if (previous && col - runStart >= 3) {
            for (let x = runStart; x < col; x += 1) matches.add(indexOf(row, x));
          }
          runStart = col;
        }
      }
    }
    for (let col = 0; col < COLS; col += 1) {
      let runStart = 0;
      for (let row = 1; row <= ROWS; row += 1) {
        const current = row < ROWS ? state.board[indexOf(row, col)] : null;
        const previous = state.board[indexOf(row - 1, col)];
        if (current !== previous) {
          if (previous && row - runStart >= 3) {
            for (let y = runStart; y < row; y += 1) matches.add(indexOf(y, col));
          }
          runStart = row;
        }
      }
    }
    return matches;
  }

  function hasPossibleMove() {
    for (let index = 0; index < state.board.length; index += 1) {
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      for (const next of [col < COLS - 1 ? index + 1 : -1, row < ROWS - 1 ? index + COLS : -1]) {
        if (next < 0) continue;
        [state.board[index], state.board[next]] = [state.board[next], state.board[index]];
        const valid = findMatches().size > 0;
        [state.board[index], state.board[next]] = [state.board[next], state.board[index]];
        if (valid) return true;
      }
    }
    return false;
  }

  async function handleTile(index) {
    if (!state.started || state.paused || state.locked || state.gameOver) return;
    if (state.selected === null) {
      sound.play('click', .13, 1.05);
      state.selected = index;
      renderBoard();
      return;
    }
    if (state.selected === index) {
      sound.play('click', .1, .88);
      state.selected = null;
      renderBoard();
      return;
    }

    const first = state.selected;
    const firstRow = Math.floor(first / COLS);
    const firstCol = first % COLS;
    const nextRow = Math.floor(index / COLS);
    const nextCol = index % COLS;
    if (Math.abs(firstRow - nextRow) + Math.abs(firstCol - nextCol) !== 1) {
      sound.play('click', .12, 1.08);
      state.selected = index;
      renderBoard();
      return;
    }

    state.locked = true;
    state.selected = null;
    sound.play('click', .15, 1.16);
    [state.board[first], state.board[index]] = [state.board[index], state.board[first]];
    renderBoard();
    await wait(160);
    if (findMatches().size === 0) {
      sound.play('denied', .2, .82);
      [state.board[first], state.board[index]] = [state.board[index], state.board[first]];
      renderBoard(new Set(), index);
      await wait(280);
      renderBoard();
      state.locked = false;
      return;
    }
    await resolveBoard();
    state.locked = false;
  }

  async function resolveBoard() {
    let chain = 1;
    let matches = findMatches();
    while (matches.size > 0) {
      state.combo = chain;
      updateCombo();
      const counts = { ember: 0, mana: 0, moss: 0, coin: 0 };
      matches.forEach((index) => { counts[state.board[index]] += 1; });

      if (chain > 1) await announceCascade(chain);
      renderBoard(matches, -1, 'primed');
      $('.board-frame').classList.add('is-charging');
      sound.tone(142 + chain * 24, .32, 'sine', .025);
      await wait(chain === 1 ? 430 : 520);

      createRuneBurst(matches);
      $('.board-frame').classList.remove('is-charging');
      $('.board-frame').classList.remove('is-bursting');
      void $('.board-frame').offsetWidth;
      $('.board-frame').classList.add('is-bursting');
      renderBoard(matches, -1, 'burst');
      sound.match(chain, counts);
      await wait(470);

      applyRewards(counts, chain);
      matches.forEach((index) => { state.board[index] = null; });
      collapseBoard();
      renderBoard(new Set(), -1, 'dropping');
      sound.tone(105, .09, 'triangle', .025, .19);
      await wait(560);
      matches = findMatches();
      chain += 1;
    }
    state.combo = 1;
    setTimeout(updateCombo, 450);
    if (!hasPossibleMove()) {
      addLog('符文矩阵重组，新的路径已显现');
      buildBoard();
      renderBoard(new Set(), -1, 'initial');
    }
  }

  async function announceCascade(chain) {
    const callout = els.cascadeCallout;
    callout.querySelector('strong').textContent = `×${chain}`;
    callout.querySelector('small').textContent = chain >= 4 ? '符文暴走' : chain === 3 ? '共鸣增强' : '符文共鸣';
    callout.classList.remove('is-visible');
    void callout.offsetWidth;
    callout.classList.add('is-visible');
    sound.cascade(chain);
    await wait(720);
    callout.classList.remove('is-visible');
  }

  function createRuneBurst(matches) {
    const effectsRect = els.boardEffects.getBoundingClientRect();
    matches.forEach((index) => {
      const tile = els.board.querySelector(`[data-index="${index}"]`);
      if (!tile) return;
      const rect = tile.getBoundingClientRect();
      const type = state.board[index];
      for (let particleIndex = 0; particleIndex < 4; particleIndex += 1) {
        const particle = document.createElement('i');
        const angle = (Math.PI * 2 * particleIndex / 4) + Math.random() * .65;
        const distance = 25 + Math.random() * 45;
        particle.className = `rune-spark ${type}`;
        particle.style.left = `${rect.left - effectsRect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top - effectsRect.top + rect.height / 2}px`;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        particle.style.animationDelay = `${particleIndex * 18}ms`;
        els.boardEffects.appendChild(particle);
        setTimeout(() => particle.remove(), 850);
      }
    });
  }

  function collapseBoard() {
    for (let col = 0; col < COLS; col += 1) {
      const remaining = [];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const value = state.board[indexOf(row, col)];
        if (value) remaining.push(value);
      }
      for (let row = ROWS - 1, cursor = 0; row >= 0; row -= 1, cursor += 1) {
        state.board[indexOf(row, col)] = remaining[cursor] || randomType();
      }
    }
  }

  function applyRewards(counts, chain) {
    const multiplier = 1 + (chain - 1) * 0.6;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    state.score += Math.round(total * 12 * multiplier);
    if (counts.ember) {
      const gain = Math.round(counts.ember * multiplier);
      state.might += gain;
      showCombatToast(`战力 +${gain}`, 'damage', 26, 32);
    }
    if (counts.mana) {
      const gain = Math.round(counts.mana * 2 * multiplier);
      state.mana = Math.min(99, state.mana + gain);
      showCombatToast(`奥能 +${gain}`, 'mana', 39, 24);
    }
    if (counts.moss) {
      const repair = Math.round(counts.moss * 14 * multiplier);
      state.repaired += repair;
      state.wall = Math.min(state.wallMax, state.wall + repair);
      showCombatToast(`修复 +${repair}`, 'repair', 20, 53);
    }
    if (counts.coin) {
      const gain = Math.round(counts.coin * multiplier);
      state.forge += gain;
      showCombatToast(`锻造 +${gain}`, 'forge', 73, 32);
      checkForge();
    }
    TYPES.forEach((type) => {
      if (!counts[type]) return;
      const legend = $(`.legend-item.${type}`);
      legend.classList.remove('is-gaining');
      void legend.offsetWidth;
      legend.classList.add('is-gaining');
    });
    if (chain > 1) addLog(`${chain} 连锁！符文收益提升 ${Math.round((multiplier - 1) * 100)}%`);
    updateUI();
  }

  function checkForge() {
    while (state.forge >= state.forgeTarget) {
      state.forge -= state.forgeTarget;
      const slots = ['weapon', 'armor', 'charm'];
      const minimum = Math.min(...slots.map((slot) => state.equipment[slot]));
      const candidates = slots.filter((slot) => state.equipment[slot] === minimum);
      const slot = candidates[Math.floor(Math.random() * candidates.length)];
      state.equipment[slot] += 1;
      state.forgeTarget = Math.min(52, state.forgeTarget + 5);
      if (slot === 'armor') {
        state.wallMax += 120;
        state.wall = Math.min(state.wallMax, state.wall + 120);
      }
      addLog(`${equipmentName(slot)}锻造完成，已自动装备`);
      showCombatToast('装备升级！', 'forge', 53, 48);
      celebrateEquipmentUpgrade(slot);
    }
  }

  function celebrateEquipmentUpgrade(slot) {
    const level = state.equipment[slot];
    const card = $(`#${slot}Card`);
    const banner = els.upgradeBanner;

    $(`#${slot}Level`).textContent = level;
    $(`#${slot}Name`).textContent = equipmentName(slot);
    if (slot === 'weapon') $('#weaponStat').textContent = `伤害 +${level * 7}`;
    if (slot === 'armor') $('#armorStat').textContent = `耐久 +${level * 120}`;
    if (slot === 'charm') $('#charmStat').textContent = `攻速 +${level * 6}%`;

    $('#upgradeEquipmentName').textContent = equipmentName(slot);
    $('#upgradeEquipmentLevel').textContent = `LV.${level} · 已自动装备`;
    banner.classList.remove('is-visible');
    card.classList.remove('is-upgraded');
    void banner.offsetWidth;
    void card.offsetWidth;
    banner.classList.add('is-visible');
    card.classList.add('is-upgraded');

    for (let index = 0; index < 14; index += 1) {
      const spark = document.createElement('i');
      const angle = Math.PI * 2 * index / 14 + Math.random() * .25;
      const distance = 34 + Math.random() * 48;
      spark.className = 'equipment-spark';
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.animationDelay = `${index * 18}ms`;
      card.appendChild(spark);
      setTimeout(() => spark.remove(), 1050);
    }

    sound.play('forge', .48, .96);
    sound.tone(294, .22, 'triangle', .045, .02);
    sound.tone(392, .26, 'triangle', .045, .13);
    sound.tone(587, .34, 'sine', .04, .26);
    sound.tone(784, .42, 'sine', .03, .41);
    setTimeout(() => {
      banner.classList.remove('is-visible');
      card.classList.remove('is-upgraded');
    }, 1950);
  }

  function equipmentName(slot) {
    const names = EQUIPMENT[slot];
    return names[Math.min(state.equipment[slot] - 1, names.length - 1)];
  }

  function totalPower() {
    return Math.round(17 + state.might * 1.15 + state.equipment.weapon * 7 + state.equipment.charm * 2.5);
  }

  function attackDelay() {
    return Math.max(300, 910 - state.equipment.charm * 55);
  }

  function updateCombo() {
    $('#comboValue').textContent = `×${state.combo}`;
    $('#comboBadge').classList.toggle('is-hot', state.combo > 1);
  }

  function updateSoundButton() {
    els.soundButton.classList.toggle('is-muted', sound.muted);
    els.soundButton.setAttribute('aria-label', sound.muted ? '开启音效' : '关闭音效');
    els.soundButton.setAttribute('title', sound.muted ? '开启音效' : '关闭音效');
    els.soundButton.querySelector('span').textContent = sound.muted ? '×' : '♪';
  }

  function updateUI() {
    $('#waveValue').textContent = String(state.wave).padStart(2, '0');
    $('#killValue').textContent = String(state.kills).padStart(3, '0');
    $('#scoreValue').textContent = String(state.score).padStart(5, '0');
    $('#mightValue').textContent = state.might;
    $('#manaValue').textContent = state.mana;
    $('#repairValue').textContent = state.repaired;
    $('#forgeValue').textContent = state.forge;
    $('#powerValue').textContent = totalPower();
    $('#wallValue').textContent = Math.max(0, Math.ceil(state.wall));
    $('#wallMaxValue').textContent = state.wallMax;
    $('#wallMeter').style.width = `${Math.max(0, state.wall / state.wallMax) * 100}%`;
    $('#forgeMeter').style.width = `${Math.min(100, state.forge / state.forgeTarget * 100)}%`;
    $('#forgeProgressText').textContent = `${state.forge} / ${state.forgeTarget}`;
    els.volleyButton.disabled = state.mana < 18 || state.paused || state.gameOver;

    ['weapon', 'armor', 'charm'].forEach((slot) => {
      const level = state.equipment[slot];
      $(`#${slot}Level`).textContent = level;
      $(`#${slot}Name`).textContent = equipmentName(slot);
    });
    $('#weaponStat').textContent = `伤害 +${state.equipment.weapon * 7}`;
    $('#armorStat').textContent = `耐久 +${state.equipment.armor * 120}`;
    $('#charmStat').textContent = `攻速 +${state.equipment.charm * 6}%`;

    const activeCount = state.enemies.length;
    const remaining = state.waveQueue + activeCount;
    $('#waveState').textContent = remaining > 0 ? `敌军 ${Math.max(0, state.waveTotal - remaining)} / ${state.waveTotal}` : '区域肃清';
    if (state.intermissionUntil) {
      const seconds = Math.max(0, Math.ceil((state.intermissionUntil - performance.now()) / 1000));
      $('#nextWaveValue').textContent = `${seconds} 秒`;
    } else {
      $('#nextWaveValue').textContent = '交战中';
    }
    updateTargetDossier();
  }

  function updateTargetDossier() {
    if (!state.enemies.length) {
      els.targetDossier.classList.add('is-empty');
      els.targetDossier.classList.remove('is-alert');
      $('#targetName').textContent = '前线侦察中';
      $('#targetRole').textContent = '尚未发现敌军';
      $('#targetAttack').textContent = '—';
      $('#targetDefense').textContent = '—';
      $('#targetHealth').textContent = '—';
      $('#targetHealthMeter').style.width = '0%';
      return;
    }
    const target = state.enemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest);
    els.targetDossier.classList.remove('is-empty');
    els.targetDossier.classList.toggle('is-alert', target.type === 'boss');
    $('#targetName').textContent = target.name;
    $('#targetRole').textContent = target.role;
    $('#targetAttack').textContent = target.damage;
    $('#targetDefense').textContent = target.defense;
    $('#targetHealth').textContent = Math.max(0, Math.ceil(target.hp));
    $('#targetHealthMeter').style.width = `${Math.max(0, target.hp / target.maxHp) * 100}%`;
  }

  function startWave(wave) {
    state.wave = wave;
    state.waveTotal = 6 + wave * 2 + (wave % 5 === 0 ? 1 : 0);
    state.waveQueue = state.waveTotal;
    state.waveSpawned = 0;
    state.nextSpawnAt = performance.now() + 700;
    state.intermissionUntil = 0;
    $('#threatText').textContent = wave % 5 === 0 ? `巨型攻城兽正在逼近` : `第 ${wave} 波敌军正在逼近`;
    const announcement = els.waveAnnouncement;
    announcement.querySelector('span').textContent = `WAVE ${String(wave).padStart(2, '0')}`;
    announcement.querySelector('strong').textContent = wave % 5 === 0 ? '攻城兽来袭' : wave < 3 ? '斥候来袭' : '敌军压境';
    announcement.classList.remove('is-visible');
    void announcement.offsetWidth;
    announcement.classList.add('is-visible');
    addLog(`第 ${wave} 波攻势开始，共发现 ${state.waveTotal} 个目标`);
    sound.tone(196, .22, 'triangle', .028);
    sound.tone(294, .28, 'triangle', .032, .15);
    updateUI();
  }

  function spawnEnemy() {
    const isBoss = state.wave % 5 === 0 && state.waveQueue === 1;
    const roll = Math.random();
    const type = isBoss ? 'boss' : roll < Math.min(.16 + state.wave * .012, .34) ? 'brute' : roll < .42 ? 'swift' : 'raider';
    const stats = {
      raider: { hp: 72 + state.wave * 29, speed: 3.1 + state.wave * .035, damage: 70 + state.wave * 8, defense: 4 + state.wave, role: '荒原劫掠者 · 均衡型' },
      swift: { hp: 49 + state.wave * 21, speed: 5.2 + state.wave * .04, damage: 48 + state.wave * 6, defense: 1 + Math.floor(state.wave * .6), role: '影袭斥候 · 高速型' },
      brute: { hp: 148 + state.wave * 47, speed: 2.05 + state.wave * .025, damage: 118 + state.wave * 11, defense: 12 + Math.floor(state.wave * 1.5), role: '披甲蛮兵 · 重甲型' },
      boss: { hp: 760 + state.wave * 110, speed: 1.35 + state.wave * .015, damage: 270 + state.wave * 15, defense: 24 + Math.floor(state.wave * 2.2), role: '攻城巨兽 · 首领' }
    }[type];
    const enemyId = ++state.enemyId;
    const names = ENEMY_NAMES[type];
    const name = names[(enemyId + state.wave - 2) % names.length];
    const enemy = {
      id: enemyId, type, name, role: stats.role, hp: stats.hp, maxHp: stats.hp, speed: stats.speed,
      damage: Math.round(stats.damage), defense: Math.round(stats.defense), label: name,
      x: 105 + Math.random() * 4, y: 60 + Math.random() * 23
    };
    const el = document.createElement('div');
    el.className = `enemy ${type}`;
    el.dataset.id = enemy.id;
    el.innerHTML = `<div class="enemy-hp"><span></span></div><div class="enemy-body"><i class="horns"></i></div><span class="enemy-stats-mini"><b>攻 ${enemy.damage}</b><b>防 ${enemy.defense}</b></span><span class="enemy-label">${enemy.name}</span>`;
    enemy.el = el;
    els.enemiesLayer.appendChild(el);
    state.enemies.push(enemy);
    positionEnemy(enemy);
    state.waveQueue -= 1;
    state.waveSpawned += 1;
    updateUI();
  }

  function positionEnemy(enemy) {
    enemy.el.style.left = `${enemy.x}%`;
    enemy.el.style.top = `${enemy.y}%`;
    enemy.el.querySelector('.enemy-hp span').style.width = `${Math.max(0, enemy.hp / enemy.maxHp) * 100}%`;
  }

  function fireAt(enemy, now) {
    if (!enemy || enemy.hp <= 0) return;
    state.attackReadyAt = now + attackDelay();
    const crit = Math.random() < .05 + state.equipment.charm * .012;
    const damage = Math.round(totalPower() * (crit ? 1.85 : 1));
    sound.tone(690 + Math.random() * 80, .055, 'sawtooth', .012);
    els.fortress.classList.add('is-firing');
    setTimeout(() => els.fortress.classList.remove('is-firing'), 190);

    const fieldRect = els.battlefield.getBoundingClientRect();
    const startX = fieldRect.width * .19;
    const startY = fieldRect.height * .42;
    const endX = fieldRect.width * enemy.x / 100;
    const endY = fieldRect.height * enemy.y / 100 + 25;
    const dx = endX - startX;
    const dy = endY - startY;
    const projectile = document.createElement('i');
    projectile.className = 'projectile';
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    projectile.style.setProperty('--travel', `${Math.hypot(dx, dy)}px`);
    projectile.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
    projectile.style.setProperty('--duration', `${Math.min(.46, Math.max(.16, Math.abs(dx) / 1200))}s`);
    projectile.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    els.projectilesLayer.appendChild(projectile);

    const travelTime = Math.min(460, Math.max(160, Math.abs(dx) / 1.2));
    setTimeout(() => {
      projectile.remove();
      if (!state.enemies.includes(enemy) || state.gameOver) return;
      damageEnemy(enemy, damage, crit);
    }, travelTime);
  }

  function damageEnemy(enemy, damage, crit = false) {
    const mitigatedDamage = Math.max(1, Math.round(damage * (100 / (100 + enemy.defense * 2))));
    enemy.hp -= mitigatedDamage;
    sound.play('hit', crit ? .13 : .065, crit ? 1.15 : .95 + Math.random() * .12);
    enemy.el.classList.remove('is-hit');
    void enemy.el.offsetWidth;
    enemy.el.classList.add('is-hit');
    positionEnemy(enemy);
    showCombatToast(`${crit ? '暴击 ' : ''}-${mitigatedDamage}`, 'damage', enemy.x, enemy.y);
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    const position = state.enemies.indexOf(enemy);
    if (position < 0) return;
    state.enemies.splice(position, 1);
    enemy.el.classList.add('is-dead');
    setTimeout(() => enemy.el.remove(), 360);
    state.kills += 1;
    state.score += enemy.type === 'boss' ? 800 : enemy.type === 'brute' ? 95 : 55;
    if (enemy.type === 'boss') {
      state.forge += 8;
      checkForge();
      addLog('攻城巨兽倒下，缴获大量锻造材料');
    }
    updateUI();
  }

  function enemyBreaches(enemy) {
    const position = state.enemies.indexOf(enemy);
    if (position < 0) return;
    state.enemies.splice(position, 1);
    enemy.el.remove();
    state.wall -= enemy.damage;
    sound.play('wall', .34, enemy.type === 'boss' ? .72 : .92);
    sound.tone(enemy.type === 'boss' ? 58 : 82, .32, 'sawtooth', .035);
    els.fortress.classList.remove('is-hit');
    void els.fortress.offsetWidth;
    els.fortress.classList.add('is-hit');
    showCombatToast(`城墙 -${enemy.damage}`, 'damage', 18, 48);
    addLog(`${enemy.label}撞上城墙，耐久损失 ${enemy.damage}`);
    updateUI();
    if (state.wall <= 0) endGame();
  }

  function castVolley() {
    if (state.mana < 18 || state.paused || state.gameOver) return;
    state.mana -= 18;
    sound.tone(220, .35, 'sine', .045);
    sound.tone(440, .38, 'triangle', .04, .08);
    sound.tone(660, .42, 'sine', .035, .16);
    const wave = document.createElement('div');
    wave.className = 'arcane-wave';
    els.battlefield.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
    const damage = Math.round(42 + state.might * .7 + state.equipment.weapon * 8);
    [...state.enemies].forEach((enemy) => damageEnemy(enemy, damage, false));
    addLog(`奥术齐射覆盖战场，每个目标受到 ${damage} 点伤害`);
    updateUI();
  }

  function gameLoop(now) {
    if (!state.started || state.gameOver) return;
    const delta = Math.min(40, now - (state.lastFrame || now)) / 1000;
    state.lastFrame = now;
    if (!state.paused) {
      if (state.waveQueue > 0 && now >= state.nextSpawnAt) {
        spawnEnemy();
        state.nextSpawnAt = now + Math.max(530, 1280 - state.wave * 24);
      }
      [...state.enemies].forEach((enemy) => {
        enemy.x -= enemy.speed * delta;
        if (enemy.x <= 15) enemyBreaches(enemy);
        else positionEnemy(enemy);
      });
      if (state.enemies.length && now >= state.attackReadyAt) {
        const target = state.enemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest);
        fireAt(target, now);
      }
      if (state.waveQueue === 0 && state.enemies.length === 0) {
        if (!state.intermissionUntil) {
          state.intermissionUntil = now + 4500;
          state.score += 150 * state.wave;
          addLog(`第 ${state.wave} 波肃清，防线获得短暂喘息`);
        } else if (now >= state.intermissionUntil) {
          startWave(state.wave + 1);
        }
      }
      updateUI();
    }
    state.animationId = requestAnimationFrame(gameLoop);
  }

  function showCombatToast(text, tone, x = 50, y = 50) {
    const toast = document.createElement('span');
    toast.className = `combat-toast ${tone}`;
    toast.textContent = text;
    toast.style.left = `${Math.max(5, Math.min(90, x))}%`;
    toast.style.top = `${Math.max(10, Math.min(85, y))}%`;
    els.toastLayer.appendChild(toast);
    setTimeout(() => toast.remove(), 900);
  }

  function addLog(message) {
    const line = document.createElement('p');
    line.innerHTML = `<span>军情</span> ${message}`;
    els.battleLog.prepend(line);
    while (els.battleLog.children.length > 3) els.battleLog.lastElementChild.remove();
  }

  function togglePause(force) {
    if (!state.started || state.gameOver) return;
    if (typeof force !== 'boolean') sound.play('click', .16, state.paused ? 1.12 : .88);
    state.paused = typeof force === 'boolean' ? force : !state.paused;
    els.pauseButton.querySelector('span').textContent = state.paused ? '▶' : 'Ⅱ';
    els.pauseButton.setAttribute('aria-label', state.paused ? '继续游戏' : '暂停游戏');
    els.boardLock.classList.toggle('is-visible', state.paused);
    if (!state.paused) {
      state.lastFrame = performance.now();
      state.nextSpawnAt = Math.max(state.nextSpawnAt, performance.now() + 250);
    }
    updateUI();
  }

  function resetGame() {
    cancelAnimationFrame(state.animationId);
    sound.init();
    state.selected = null; state.locked = false; state.started = true; state.paused = false; state.gameOver = false;
    state.score = 0; state.kills = 0; state.wave = 1; state.might = 0; state.mana = 0; state.repaired = 0;
    state.forge = 0; state.forgeTarget = 18; state.equipment = { weapon: 1, armor: 1, charm: 1 };
    state.wallMax = 1120; state.wall = 1120; state.combo = 1; state.enemyId = 0;
    state.waveQueue = 0; state.waveTotal = 0; state.waveSpawned = 0; state.intermissionUntil = 0;
    state.attackReadyAt = 0; state.lastFrame = performance.now();
    state.enemies.forEach((enemy) => enemy.el.remove());
    state.enemies = [];
    els.projectilesLayer.replaceChildren();
    els.toastLayer.replaceChildren();
    els.boardEffects.replaceChildren();
    buildBoard();
    renderBoard(new Set(), -1, 'initial');
    updateCombo();
    els.gameOverModal.classList.remove('is-open');
    els.introModal.classList.remove('is-open');
    els.boardLock.classList.remove('is-visible');
    els.pauseButton.querySelector('span').textContent = 'Ⅱ';
    sound.play('click', .24, 1.2);
    startWave(1);
    updateUI();
    state.animationId = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    state.gameOver = true;
    state.paused = true;
    state.wall = 0;
    $('#finalWave').textContent = state.wave;
    $('#finalKills').textContent = state.kills;
    $('#finalScore').textContent = state.score;
    els.gameOverModal.classList.add('is-open');
    sound.tone(164, .38, 'sawtooth', .04);
    sound.tone(116, .52, 'sawtooth', .035, .24);
    sound.tone(73, .7, 'sine', .04, .52);
    updateUI();
  }

  els.board.addEventListener('click', (event) => {
    const tile = event.target.closest('.rune-tile');
    if (tile) handleTile(Number(tile.dataset.index));
  });
  $('#startButton').addEventListener('click', resetGame);
  $('#restartButton').addEventListener('click', resetGame);
  $('#introClose').addEventListener('click', () => {
    els.introModal.classList.remove('is-open');
    if (!state.started) resetGame();
  });
  $('#helpButton').addEventListener('click', () => {
    togglePause(true);
    els.introModal.classList.add('is-open');
  });
  els.pauseButton.addEventListener('click', () => togglePause());
  els.soundButton.addEventListener('click', () => sound.toggle());
  els.volleyButton.addEventListener('click', castVolley);
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'q') castVolley();
    if (event.key === 'Escape' && state.started) togglePause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.started && !state.gameOver) togglePause(true);
  });

  if (new URLSearchParams(window.location.search).has('testMode')) {
    window.__runeRampartTest = {
      grantForge(amount) {
        state.forge += Number(amount) || state.forgeTarget;
        checkForge();
        updateUI();
      }
    };
  }

  buildBoard();
  renderBoard(new Set(), -1, 'initial');
  updateSoundButton();
  updateUI();
})();
