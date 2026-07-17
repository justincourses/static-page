(() => {
  'use strict';

  const ROWS = 7;
  const COLS = 7;
  const MAX_WAVES = 100;
  const SECONDARY_BOLT_POWER = .45;
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
    assault: ['血斧·卡戎', '猎城·萨迦', '断誓·罗铎', '赤刃·弥沙', '战吼·赫娅'],
    brute: ['铁颚·巴图', '碎墙·葛恩', '铜背·沃尔', '独眼·赫山', '重槌·鲁格'],
    boss: ['焚城者·戈摩', '不屈巨兽·塔恩', '王旗终结者·穆拉']
  };
  const DIFFICULTIES = {
    rookie: {
      name: '新手', subtitle: '有压守城', pressure: .72, eliteOffset: -.26, statScale: .78,
      groupScale: .68, batchDivisor: 6, relicChance: .16, runeRelicChance: .045, scoreScale: 1
    },
    veteran: {
      name: '老兵', subtitle: '烽火压境', pressure: .86, eliteOffset: -.14, statScale: .9,
      groupScale: .84, batchDivisor: 4, relicChance: .1, runeRelicChance: .03, scoreScale: 1.35
    },
    master: {
      name: '大佬', subtitle: '极限登顶', pressure: 1, eliteOffset: 0, statScale: 1,
      groupScale: 1, batchDivisor: 3, relicChance: .055, runeRelicChance: .018, scoreScale: 1.75
    }
  };
  const BASE_ENEMY_STATS = {
    raider: { hp: 80, speed: 3, damage: 55, defense: 3, role: '荒原劫掠者 · 均衡型', roleIcon: '◆' },
    swift: { hp: 55, speed: 5.4, damage: 38, defense: 1, role: '影袭斥候 · 速度型', roleIcon: '»' },
    assault: { hp: 90, speed: 3.5, damage: 95, defense: 2, role: '血斧先锋 · 攻击型', roleIcon: '†' },
    brute: { hp: 160, speed: 2, damage: 65, defense: 13, role: '披甲蛮兵 · 防御型', roleIcon: '◇' },
    boss: { hp: 780, speed: 1.4, damage: 210, defense: 20, role: '攻城巨兽 · BOSS', roleIcon: '♛' }
  };
  const RELICS = {
    blast: { name: '爆裂符文', icon: '✹', description: '命中产生范围伤害', className: 'blast' },
    frost: { name: '霜缚符文', icon: '❄', description: '命中减慢敌军', className: 'frost' },
    shatter: { name: '破甲符文', icon: '⌁', description: '命中削弱防御', className: 'shatter' }
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    board: $('#matchBoard'),
    boardLock: $('#boardLock'),
    battlefield: $('#battlefield'),
    enemiesLayer: $('#enemiesLayer'),
    projectilesLayer: $('#projectilesLayer'),
    impactLayer: $('#impactEffectsLayer'),
    toastLayer: $('#combatToastLayer'),
    combatBuffs: $('#combatBuffs'),
    fortress: $('#fortress'),
    battleLog: $('#battleLog'),
    waveAnnouncement: $('#waveAnnouncement'),
    introModal: $('#introModal'),
    gameOverModal: $('#gameOverModal'),
    victoryModal: $('#victoryModal'),
    pauseButton: $('#pauseButton'),
    fullscreenButton: $('#fullscreenButton'),
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
    board: [], boardRelics: [], selected: null, locked: false, started: false, paused: true, gameOver: false,
    score: 0, kills: 0, wave: 1, might: 0, mana: 0, repaired: 0,
    forge: 0, forgeTarget: 16, equipment: { weapon: 1, armor: 1, charm: 1 },
    upgradeMode: 'auto', autoUpgradeIndex: 0, selectedDifficulty: 'rookie', difficulty: 'rookie',
    wall: 1120, wallMax: 1120, combo: 1, enemies: [], enemyId: 0,
    waveQueue: 0, waveTotal: 0, waveSpawned: 0, waveBossesRemaining: 0,
    waveMatches: 0, totalMatches: 0, waveProfile: null, nextSpawnAt: 0, intermissionUntil: 0,
    attackReadyAt: 0, lastFrame: 0, animationId: 0, lastUiAt: 0, sessionId: 0,
    combatBuff: null, combatBuffQueue: [], introWasPaused: false
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomType = () => TYPES[Math.floor(Math.random() * TYPES.length)];
  const randomRuneRelic = () => {
    const chance = DIFFICULTIES[state.difficulty]?.runeRelicChance || 0;
    if (Math.random() >= chance) return null;
    const relicTypes = Object.keys(RELICS);
    return relicTypes[Math.floor(Math.random() * relicTypes.length)];
  };
  const indexOf = (row, col) => row * COLS + col;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  function getWaveProfile(wave, difficultyKey = state.difficulty) {
    const safeWave = clamp(Math.floor(Number(wave) || 1), 1, MAX_WAVES);
    const difficulty = DIFFICULTIES[difficultyKey] || DIFFICULTIES.rookie;
    const tier = Math.floor((safeWave - 1) / 10);
    const baseGroups = 5 + Math.floor((safeWave - 1) * .065) + tier;
    const baseCount = 9 + Math.floor((safeWave - 1) * .32) + tier * 2;
    const isBossWave = safeWave % 10 === 0;
    return {
      wave: safeWave,
      tier,
      stage: tier + 1,
      requiredGroups: Math.max(3, Math.ceil(baseGroups * difficulty.groupScale)),
      enemyCount: Math.max(6, Math.round(baseCount * difficulty.pressure)),
      advancedChance: clamp(.48 + (safeWave - 1) * .0025 + tier * .035 + difficulty.eliteOffset, .18, .94),
      hpScale: (1 + (safeWave - 1) * .035) * (1 + tier * .08) * difficulty.statScale,
      damageScale: (1 + (safeWave - 1) * .032) * (1 + tier * .13) * difficulty.statScale,
      defenseScale: (1 + (safeWave - 1) * .018) * (1 + tier * .06) * difficulty.statScale,
      speedScale: 1 + (safeWave - 1) * .0015 + tier * .015,
      batchSize: 1 + Math.floor(tier / difficulty.batchDivisor),
      bossCount: isBossWave ? (safeWave === MAX_WAVES ? 3 : 1 + Math.floor(tier / 5)) : 0,
      isBossWave,
      relicChance: clamp(difficulty.relicChance + tier * .004, difficulty.relicChance, difficulty.relicChance + .04),
      runeRelicChance: difficulty.runeRelicChance,
      spawnInterval: Math.max(280, (1050 - (safeWave - 1) * 3.2 - tier * 52) / difficulty.pressure),
      intermission: Math.max(1500, 3500 - tier * 180)
    };
  }

  // Deterministic balance model used by the browser regression suite. The 1.22
  // combat factor represents ideal crit, volley and relic usage rather than free DPS.
  function simulateBalance(difficultyKey = 'master', efficiency = 1) {
    let might = 0;
    let forge = 0;
    let forgeTarget = 16;
    const equipment = { weapon: 1, armor: 1, charm: 1 };
    let firstFailure = null;
    let minimumMargin = Infinity;

    for (let wave = 1; wave <= MAX_WAVES; wave += 1) {
      const profile = getWaveProfile(wave, difficultyKey);
      might += profile.requiredGroups * .75 * efficiency;
      forge += profile.requiredGroups * .75 * efficiency;
      while (forge >= forgeTarget) {
        forge -= forgeTarget;
        const weakest = ['weapon', 'armor', 'charm'].reduce((slot, candidate) => (
          equipment[candidate] < equipment[slot] ? candidate : slot
        ), 'weapon');
        equipment[weakest] += 1;
        forgeTarget = Math.min(38, forgeTarget + 2);
      }

      const power = 17 + might * 1.15 + equipment.weapon * 8 + equipment.charm * 2;
      const rate = 1000 / Math.max(220, 1050 - equipment.charm * 80);
      const averageHp = 80 * (1 - profile.advancedChance) + 102 * profile.advancedChance;
      const averageDefense = 3 * (1 - profile.advancedChance) + 5.3 * profile.advancedChance;
      const regularCount = profile.enemyCount - profile.bossCount;
      const regularDurability = regularCount * averageHp * profile.hpScale * (1 + averageDefense * profile.defenseScale * .02);
      const bossDurability = profile.bossCount * 780 * profile.hpScale * (1 + 20 * profile.defenseScale * .02);
      const activeSeconds = Math.ceil(profile.enemyCount / profile.batchSize) * profile.spawnInterval / 1000
        + 85 / (3 * profile.speedScale);
      const idealOutput = power * rate * activeSeconds * 1.22 * efficiency;
      const margin = idealOutput / (regularDurability + bossDurability);
      minimumMargin = Math.min(minimumMargin, margin);
      if (margin < 1 && firstFailure === null) firstFailure = wave;
    }

    return { difficulty: difficultyKey, efficiency, firstFailure, minimumMargin, equipment };
  }

  function buildBoard() {
    state.board = [];
    state.boardRelics = [];
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
        state.boardRelics.push(randomRuneRelic());
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
      const relicType = state.boardRelics[index];
      const relic = relicType ? RELICS[relicType] : null;
      tile.type = 'button';
      tile.className = `rune-tile ${type || ''}${relicType ? ` has-relic relic-${relicType}` : ''}`;
      if (state.selected === index) tile.classList.add('selected');
      if (matched.has(index)) tile.classList.add(phase === 'primed' ? 'match-primed' : 'matched');
      if (phase === 'initial') tile.classList.add('is-entering');
      if (phase === 'dropping') tile.classList.add('is-dropping');
      if (index === invalidIndex) tile.classList.add('invalid');
      tile.dataset.index = String(index);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `${row + 1} 行 ${col + 1} 列，${TYPE_NAMES[type] || '空位'}${relic ? `，携带${relic.name}彩蛋` : ''}`);
      tile.style.animationDelay = phase === 'dropping'
        ? `${(ROWS - row) * 28 + col * 7}ms`
        : phase === 'initial' ? `${(row + col) * 7}ms` : '0ms';
      tile.innerHTML = `<span class="rune-symbol" aria-hidden="true">${SYMBOLS[type] || ''}</span>${relic ? `<span class="rune-relic-mark" title="消除后触发${relic.name}" aria-hidden="true">${relic.icon}</span>` : ''}`;
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

  function countMatchGroups() {
    let groups = 0;
    for (let row = 0; row < ROWS; row += 1) {
      let run = 1;
      for (let col = 1; col <= COLS; col += 1) {
        const current = col < COLS ? state.board[indexOf(row, col)] : null;
        const previous = state.board[indexOf(row, col - 1)];
        if (current && current === previous) run += 1;
        else {
          if (previous && run >= 3) groups += 1;
          run = 1;
        }
      }
    }
    for (let col = 0; col < COLS; col += 1) {
      let run = 1;
      for (let row = 1; row <= ROWS; row += 1) {
        const current = row < ROWS ? state.board[indexOf(row, col)] : null;
        const previous = state.board[indexOf(row - 1, col)];
        if (current && current === previous) run += 1;
        else {
          if (previous && run >= 3) groups += 1;
          run = 1;
        }
      }
    }
    return groups;
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
    const sessionId = state.sessionId;
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
    [state.boardRelics[first], state.boardRelics[index]] = [state.boardRelics[index], state.boardRelics[first]];
    renderBoard();
    await wait(160);
    if (sessionId !== state.sessionId) return;
    if (findMatches().size === 0) {
      sound.play('denied', .2, .82);
      [state.board[first], state.board[index]] = [state.board[index], state.board[first]];
      [state.boardRelics[first], state.boardRelics[index]] = [state.boardRelics[index], state.boardRelics[first]];
      renderBoard(new Set(), index);
      await wait(280);
      if (sessionId !== state.sessionId) return;
      renderBoard();
      state.locked = false;
      return;
    }
    await resolveBoard(sessionId);
    if (sessionId !== state.sessionId) return;
    state.locked = false;
  }

  async function resolveBoard(sessionId) {
    let chain = 1;
    let matches = findMatches();
    while (matches.size > 0) {
      state.combo = chain;
      updateCombo();
      const counts = { ember: 0, mana: 0, moss: 0, coin: 0 };
      const groupCount = countMatchGroups();
      const matchedRelics = [...matches].map((index) => state.boardRelics[index]).filter(Boolean);
      matches.forEach((index) => { counts[state.board[index]] += 1; });

      if (chain > 1) await announceCascade(chain);
      if (sessionId !== state.sessionId) return;
      renderBoard(matches, -1, 'primed');
      $('.board-frame').classList.add('is-charging');
      sound.tone(142 + chain * 24, .32, 'sine', .025);
      await wait(chain === 1 ? 430 : 520);
      if (sessionId !== state.sessionId) return;

      createRuneBurst(matches);
      $('.board-frame').classList.remove('is-charging');
      $('.board-frame').classList.remove('is-bursting');
      void $('.board-frame').offsetWidth;
      $('.board-frame').classList.add('is-bursting');
      renderBoard(matches, -1, 'burst');
      sound.match(chain, counts);
      await wait(470);
      if (sessionId !== state.sessionId) return;

      applyRewards(counts, chain, groupCount);
      matchedRelics.forEach((type) => activateRelic(type, 'board'));
      matches.forEach((index) => {
        state.board[index] = null;
        state.boardRelics[index] = null;
      });
      collapseBoard();
      renderBoard(new Set(), -1, 'dropping');
      sound.tone(105, .09, 'triangle', .025, .19);
      await wait(560);
      if (sessionId !== state.sessionId) return;
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
        const index = indexOf(row, col);
        const value = state.board[index];
        if (value) remaining.push({ type: value, relic: state.boardRelics[index] });
      }
      for (let row = ROWS - 1, cursor = 0; row >= 0; row -= 1, cursor += 1) {
        const index = indexOf(row, col);
        const tile = remaining[cursor];
        state.board[index] = tile?.type || randomType();
        state.boardRelics[index] = tile ? tile.relic : randomRuneRelic();
      }
    }
  }

  function applyRewards(counts, chain, groupCount = 1) {
    const multiplier = 1 + (chain - 1) * 0.6;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    state.waveMatches += groupCount;
    state.totalMatches += groupCount;
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
      let slot = state.upgradeMode;
      if (slot === 'auto') {
        const minimum = Math.min(...slots.map((candidate) => state.equipment[candidate]));
        const candidates = slots.filter((candidate) => state.equipment[candidate] === minimum);
        slot = candidates[state.autoUpgradeIndex % candidates.length];
        state.autoUpgradeIndex += 1;
      }
      state.equipment[slot] += 1;
      state.forgeTarget = Math.min(38, state.forgeTarget + 2);
      if (slot === 'armor') {
        state.wallMax += 90;
        state.wall = Math.min(state.wallMax, state.wall + 90);
      }
      addLog(`${equipmentName(slot)}锻造完成，已按${state.upgradeMode === 'auto' ? '自动策略' : '优先策略'}装备`);
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
    if (slot === 'weapon') $('#weaponStat').textContent = `攻击 ${totalPower()}`;
    if (slot === 'armor') $('#armorStat').textContent = `减伤 ${wallDefense()}%`;
    if (slot === 'charm') $('#charmStat').textContent = charmStatLabel();
    updateFieldHud();

    $('#upgradeEquipmentName').textContent = equipmentName(slot);
    $('#upgradeEquipmentLevel').textContent = `LV.${level} · ${state.upgradeMode === 'auto' ? '自动补强' : '优先升级'}`;
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
    return Math.round(17 + state.might * 1.15 + state.equipment.weapon * 8 + state.equipment.charm * 2);
  }

  function baseAttackDelay() {
    return Math.max(220, 1050 - state.equipment.charm * 80);
  }

  function volleySize() {
    return Math.min(4, 1 + Math.floor((state.equipment.charm - 1) / 3));
  }

  function volleyPower() {
    return 1 + (volleySize() - 1) * SECONDARY_BOLT_POWER;
  }

  function attackDelay() {
    return Math.round(baseAttackDelay() * volleyPower());
  }

  function attackRate() {
    return (volleySize() * 1000 / attackDelay()).toFixed(1);
  }

  function volleyLabel() {
    return ['单发', '双发', '三发', '四发'][volleySize() - 1];
  }

  function charmStatLabel() {
    return `${attackRate()}/秒 · ${volleyLabel()}`;
  }

  function wallDefense() {
    return Math.min(72, 6 + (state.equipment.armor - 1) * 6);
  }

  function updateFieldHud() {
    $('#hudAttack').textContent = totalPower();
    $('#hudDefense').textContent = `${wallDefense()}%`;
    $('#hudSpeed').textContent = attackRate();
  }

  function setUpgradeMode(mode, announce = true) {
    if (!['auto', 'weapon', 'armor', 'charm'].includes(mode)) return;
    state.upgradeMode = mode;
    const names = { auto: '自动 · 均衡补强', weapon: '攻击优先 · 持续生效', armor: '防御优先 · 持续生效', charm: '攻速优先 · 持续生效' };
    $('#strategyHint').textContent = names[mode];
    document.querySelectorAll('.strategy-button').forEach((button) => {
      const active = button.dataset.upgrade === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (state.started && announce) {
      sound.play('click', .14, 1.08);
      addLog(`锻造策略切换为「${names[mode].split(' · ')[0]}」`);
    }
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

  function upgradeAdvice() {
    if (state.wall / state.wallMax < .58) return '城墙告急 · 建议优先防御';
    const levels = state.equipment;
    const minimum = Math.min(levels.weapon, levels.armor, levels.charm);
    if (levels.weapon === minimum) return '火力临界 · 建议优先攻击';
    if (levels.charm === minimum) return '敌潮过密 · 建议优先攻速';
    return '突破伤害 · 建议优先防御';
  }

  function updateUI() {
    const difficulty = DIFFICULTIES[state.difficulty];
    const profile = state.waveProfile || getWaveProfile(state.wave, state.difficulty);
    $('#difficultyValue').textContent = difficulty.name;
    $('#waveValue').textContent = String(state.wave).padStart(3, '0');
    $('#killValue').textContent = String(state.kills).padStart(3, '0');
    $('#scoreValue').textContent = String(state.score).padStart(5, '0');
    $('#mightValue').textContent = state.might;
    $('#manaValue').textContent = state.mana;
    $('#repairValue').textContent = state.repaired;
    $('#forgeValue').textContent = state.forge;
    $('#pressureTierValue').textContent = `第 ${profile.stage} 阶段${profile.isBossWave ? ' · BOSS' : ''}`;
    $('#waveMatchValue').textContent = state.waveMatches;
    $('#waveMatchTarget').textContent = profile.requiredGroups;
    $('#powerDelta').textContent = state.combatBuff
      ? `${RELICS[state.combatBuff.type].name} · 剩余 ${state.combatBuff.shots} 发`
      : upgradeAdvice();
    $('.pressure-status').classList.toggle('is-met', state.waveMatches >= profile.requiredGroups);
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
    $('#weaponStat').textContent = `攻击 ${totalPower()}`;
    $('#armorStat').textContent = `减伤 ${wallDefense()}%`;
    $('#charmStat').textContent = charmStatLabel();
    updateFieldHud();

    const activeCount = state.enemies.length;
    const remaining = state.waveQueue + activeCount;
    $('#waveState').textContent = remaining > 0
      ? `敌军 ${Math.max(0, state.waveTotal - remaining)} / ${state.waveTotal} · 每批 ${profile.batchSize}`
      : '区域肃清';
    if (state.intermissionUntil) {
      const seconds = Math.max(0, Math.ceil((state.intermissionUntil - performance.now()) / 1000));
      $('#nextWaveValue').textContent = `${seconds} 秒`;
    } else {
      $('#nextWaveValue').textContent = '交战中';
    }
    updateTargetDossier();
    renderCombatBuff();
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
    const statuses = [target.slowUntil > performance.now() ? '霜缚' : '', target.armorBreakUntil > performance.now() ? '破甲' : ''].filter(Boolean);
    $('#targetRole').textContent = `${target.role}${statuses.length ? ` · ${statuses.join(' / ')}` : ''}`;
    $('#targetAttack').textContent = target.damage;
    $('#targetDefense').textContent = effectiveDefense(target);
    $('#targetHealth').textContent = Math.max(0, Math.ceil(target.hp));
    $('#targetHealthMeter').style.width = `${Math.max(0, target.hp / target.maxHp) * 100}%`;
  }

  function startWave(wave) {
    state.wave = clamp(wave, 1, MAX_WAVES);
    const profile = getWaveProfile(state.wave, state.difficulty);
    state.waveProfile = profile;
    state.waveTotal = profile.enemyCount;
    state.waveQueue = state.waveTotal;
    state.waveSpawned = 0;
    state.waveBossesRemaining = profile.bossCount;
    state.waveMatches = 0;
    state.nextSpawnAt = performance.now() + 700;
    state.intermissionUntil = 0;
    $('#threatText').textContent = profile.isBossWave
      ? `${profile.bossCount} 头 Boss 级攻城兽正在逼近`
      : `第 ${state.wave} 波敌军正在逼近`;
    const announcement = els.waveAnnouncement;
    announcement.querySelector('span').textContent = `WAVE ${String(state.wave).padStart(3, '0')} / ${MAX_WAVES}`;
    announcement.querySelector('strong').textContent = profile.isBossWave ? '十波首领战' : state.wave < 3 ? '斥候来袭' : '敌潮升级';
    announcement.classList.remove('is-visible');
    void announcement.offsetWidth;
    announcement.classList.add('is-visible');
    addLog(`第 ${state.wave} 波：${state.waveTotal} 个目标，每批 ${profile.batchSize} 个，建议完成 ${profile.requiredGroups} 组消除`);
    sound.tone(196, .22, 'triangle', .028);
    sound.tone(294, .28, 'triangle', .032, .15);
    updateUI();
  }

  function spawnEnemy(forcedType = null, forcedRelic) {
    if (state.waveQueue <= 0) return;
    const profile = state.waveProfile || getWaveProfile(state.wave, state.difficulty);
    const scheduledBoss = !forcedType && state.waveBossesRemaining > 0 && state.waveQueue <= state.waveBossesRemaining;
    const isBoss = forcedType === 'boss' || scheduledBoss;
    const roll = Math.random();
    let type = forcedType || 'raider';
    if (scheduledBoss) type = 'boss';
    else if (!forcedType && roll < profile.advancedChance) {
      const classRoll = Math.random();
      const bruteWeight = Math.min(.42, .28 + profile.tier * .014);
      type = classRoll < .34 ? 'swift' : classRoll < 1 - bruteWeight ? 'assault' : 'brute';
    }
    const stats = BASE_ENEMY_STATS[type];
    const enemyId = ++state.enemyId;
    const names = ENEMY_NAMES[type];
    const name = names[(enemyId + state.wave - 2) % names.length];
    const hp = Math.round(stats.hp * profile.hpScale);
    const relicTypes = Object.keys(RELICS);
    const relic = forcedRelic !== undefined
      ? forcedRelic
      : !isBoss && Math.random() < profile.relicChance
        ? relicTypes[(enemyId + state.wave) % relicTypes.length]
        : null;
    const enemy = {
      id: enemyId, type, name, role: stats.role, roleIcon: stats.roleIcon, hp, maxHp: hp,
      speed: stats.speed * profile.speedScale,
      damage: Math.round(stats.damage * profile.damageScale),
      defense: Math.round(stats.defense * profile.defenseScale), label: name,
      relic, slowUntil: 0, armorBreakUntil: 0,
      x: 105 + Math.random() * 4, y: 60 + Math.random() * 23
    };
    const el = document.createElement('div');
    el.className = `enemy ${type}${relic ? ` relic-carrier relic-${relic}` : ''}`;
    el.dataset.id = enemy.id;
    el.innerHTML = `<div class="enemy-hp"><span></span></div><span class="enemy-role-mark" aria-hidden="true">${stats.roleIcon}</span><div class="enemy-body"><i class="horns"></i></div>${relic ? `<span class="relic-mark" title="携带${RELICS[relic].name}">${RELICS[relic].icon}</span>` : ''}<span class="enemy-stats-mini"><b>攻 ${enemy.damage}</b><b>防 ${enemy.defense}</b></span><span class="enemy-label">${enemy.name}</span>`;
    enemy.el = el;
    els.enemiesLayer.appendChild(el);
    state.enemies.push(enemy);
    positionEnemy(enemy);
    state.waveQueue -= 1;
    if (scheduledBoss) state.waveBossesRemaining -= 1;
    state.waveSpawned += 1;
    updateUI();
  }

  function positionEnemy(enemy) {
    const now = performance.now();
    enemy.el.classList.toggle('is-slowed', enemy.slowUntil > now);
    enemy.el.classList.toggle('is-shattered', enemy.armorBreakUntil > now);
    enemy.el.style.left = `${enemy.x}%`;
    enemy.el.style.top = `${enemy.y}%`;
    enemy.el.querySelector('.enemy-hp span').style.width = `${Math.max(0, enemy.hp / enemy.maxHp) * 100}%`;
  }

  function effectiveDefense(enemy) {
    return Math.max(0, Math.round(enemy.defense * (enemy.armorBreakUntil > performance.now() ? .55 : 1)));
  }

  function aimTurret(enemy) {
    if (!enemy) {
      els.fortress.style.setProperty('--aim-angle', '-0.08rad');
      return;
    }
    const fieldRect = els.battlefield.getBoundingClientRect();
    const startX = fieldRect.width * .18;
    const startY = fieldRect.height * .42;
    const endX = fieldRect.width * enemy.x / 100;
    const endY = fieldRect.height * enemy.y / 100 + 25;
    els.fortress.style.setProperty('--aim-angle', `${Math.atan2(endY - startY, endX - startX)}rad`);
  }

  function fireAt(enemy, now) {
    if (!enemy || enemy.hp <= 0) return;
    state.attackReadyAt = now + attackDelay();
    const shots = volleySize();
    const targets = [...state.enemies].sort((first, second) => first.x - second.x);
    els.fortress.classList.add('is-firing');
    setTimeout(() => els.fortress.classList.remove('is-firing'), 190);

    for (let index = 0; index < shots; index += 1) {
      const target = targets[Math.min(index, targets.length - 1)] || enemy;
      const crit = Math.random() < .05 + state.equipment.charm * .012;
      const powerScale = index === 0 ? 1 : SECONDARY_BOLT_POWER;
      const damage = Math.round(totalPower() * powerScale * (crit ? 1.85 : 1));
      launchProjectile(target, damage, crit, now, index, shots);
    }
  }

  function launchProjectile(enemy, damage, crit, now, shotIndex = 0, shotCount = 1) {
    sound.tone(690 + shotIndex * 42 + Math.random() * 60, .055, 'sawtooth', .012);
    const fieldRect = els.battlefield.getBoundingClientRect();
    const startX = fieldRect.width * .19;
    const fanOffset = (shotIndex - (shotCount - 1) / 2) * 9;
    const startY = fieldRect.height * .42 + fanOffset;
    const initialEndX = fieldRect.width * enemy.x / 100;
    const initialDistance = Math.abs(initialEndX - startX);
    const travelTime = Math.min(460, Math.max(160, initialDistance / 1.2));
    const speedScale = enemy.slowUntil > now ? .55 : 1;
    const predictedX = Math.max(15, enemy.x - enemy.speed * speedScale * travelTime / 1000);
    const endX = fieldRect.width * predictedX / 100;
    const endY = fieldRect.height * enemy.y / 100 + 25 + fanOffset * .18;
    const dx = endX - startX;
    const dy = endY - startY;
    const projectile = document.createElement('i');
    projectile.className = `projectile${shotIndex > 0 ? ' is-volley-secondary' : ''}${state.combatBuff ? ` is-${state.combatBuff.type}` : ''}`;
    projectile.dataset.volley = `${shotIndex + 1}/${shotCount}`;
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    projectile.style.setProperty('--dx', `${dx}px`);
    projectile.style.setProperty('--dy', `${dy}px`);
    projectile.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
    projectile.style.setProperty('--duration', `${travelTime / 1000}s`);
    projectile.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    els.projectilesLayer.appendChild(projectile);

    const sessionId = state.sessionId;
    setTimeout(() => {
      projectile.remove();
      if (sessionId !== state.sessionId || !state.enemies.includes(enemy) || state.gameOver) return;
      damageEnemy(enemy, damage, crit);
    }, travelTime);
  }

  function damageEnemy(enemy, damage, crit = false, options = {}) {
    if (!state.enemies.includes(enemy)) return;
    const activeBuff = !options.secondary ? state.combatBuff : null;
    const mitigatedDamage = Math.max(1, Math.round(damage * (100 / (100 + effectiveDefense(enemy) * 2))));
    enemy.hp -= mitigatedDamage;
    sound.play('hit', crit ? .13 : .065, crit ? 1.15 : .95 + Math.random() * .12);
    enemy.el.classList.remove('is-hit');
    void enemy.el.offsetWidth;
    enemy.el.classList.add('is-hit');
    positionEnemy(enemy);
    createImpactEffect(enemy.x, enemy.y, options.effect || (crit ? 'critical' : 'basic'));
    showCombatToast(`${crit ? '暴击 ' : ''}-${mitigatedDamage}`, 'damage', enemy.x, enemy.y);
    if (enemy.hp <= 0) killEnemy(enemy);
    if (activeBuff) applyCombatBuff(activeBuff, enemy, damage);
  }

  function applyCombatBuff(buff, enemy, damage) {
    if (buff.type === 'blast') {
      createImpactEffect(enemy.x, enemy.y, 'blast');
      [...state.enemies]
        .filter((candidate) => candidate !== enemy && Math.abs(candidate.x - enemy.x) < 14 && Math.abs(candidate.y - enemy.y) < 18)
        .forEach((candidate) => damageEnemy(candidate, Math.round(damage * .48), false, { secondary: true, effect: 'blast' }));
    }
    if (buff.type === 'frost' && state.enemies.includes(enemy)) {
      enemy.slowUntil = performance.now() + 4500;
      enemy.el.classList.add('is-slowed');
      createImpactEffect(enemy.x, enemy.y, 'frost');
    }
    if (buff.type === 'shatter' && state.enemies.includes(enemy)) {
      enemy.armorBreakUntil = performance.now() + 6000;
      enemy.el.classList.add('is-shattered');
      createImpactEffect(enemy.x, enemy.y, 'shatter');
    }
    if (state.combatBuff === buff) {
      buff.shots -= 1;
      if (buff.shots <= 0) {
        const nextBuff = state.combatBuffQueue.shift() || null;
        state.combatBuff = nextBuff;
        if (nextBuff) addLog(`${RELICS[buff.type].name}效果结束，队列中的${RELICS[nextBuff.type].name}开始生效`);
        else addLog(`${RELICS[buff.type].name}能量耗尽，弩炮恢复常规射击`);
        renderCombatBuff();
      }
    }
  }

  function createImpactEffect(x, y, type = 'basic') {
    const impact = document.createElement('span');
    impact.className = `impact-flash ${type}`;
    impact.style.left = `${x}%`;
    impact.style.top = `${y}%`;
    impact.innerHTML = '<i></i><i></i><i></i><i></i>';
    els.impactLayer.appendChild(impact);
    setTimeout(() => impact.remove(), 720);
  }

  function activateRelic(type, source = 'enemy') {
    if (!RELICS[type]) return;
    const shots = { blast: 7, frost: 10, shatter: 9 }[type];
    const buff = { type, shots };
    const queued = Boolean(state.combatBuff);
    if (queued) state.combatBuffQueue.push(buff);
    else state.combatBuff = buff;
    const relic = RELICS[type];
    const sourceLabel = source === 'board' ? '彩蛋符石消除' : '彩蛋怪掉落';
    addLog(`${sourceLabel}${relic.name}：${queued ? `进入队列，前方 ${state.combatBuffQueue.length - 1} 项` : relic.description}`);
    showCombatToast(`${relic.icon} ${relic.name}`, type === 'frost' ? 'mana' : type === 'shatter' ? 'repair' : 'forge', 54, 30);
    sound.tone(type === 'frost' ? 520 : type === 'shatter' ? 260 : 148, .34, 'triangle', .045);
    renderCombatBuff();
  }

  function renderCombatBuff() {
    const signature = state.combatBuff
      ? `${state.combatBuff.type}:${state.combatBuff.shots}:${state.combatBuffQueue.map((buff) => buff.type).join(',')}`
      : 'none';
    if (els.combatBuffs.dataset.signature === signature) return;
    els.combatBuffs.dataset.signature = signature;
    if (!state.combatBuff) {
      els.combatBuffs.replaceChildren();
      return;
    }
    const relic = RELICS[state.combatBuff.type];
    const chip = document.createElement('span');
    chip.className = `combat-buff ${relic.className}`;
    chip.innerHTML = `<i>${relic.icon}</i><b>${relic.name}</b><small>${state.combatBuff.shots} 发</small><em>${state.combatBuffQueue.length ? `候命 ${state.combatBuffQueue.length}` : '生效中'}</em>`;
    els.combatBuffs.replaceChildren(chip);
  }

  function killEnemy(enemy) {
    const position = state.enemies.indexOf(enemy);
    if (position < 0) return;
    state.enemies.splice(position, 1);
    enemy.el.classList.add('is-dead');
    setTimeout(() => enemy.el.remove(), 360);
    state.kills += 1;
    const baseScore = enemy.type === 'boss' ? 800 : enemy.type === 'brute' ? 110 : enemy.type === 'assault' ? 90 : enemy.type === 'swift' ? 75 : 55;
    state.score += Math.round(baseScore * DIFFICULTIES[state.difficulty].scoreScale);
    if (enemy.relic) activateRelic(enemy.relic);
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
    const damage = Math.max(1, Math.round(enemy.damage * (1 - wallDefense() / 100)));
    state.wall -= damage;
    sound.play('wall', .34, enemy.type === 'boss' ? .72 : .92);
    sound.tone(enemy.type === 'boss' ? 58 : 82, .32, 'sawtooth', .035);
    els.fortress.classList.remove('is-hit');
    void els.fortress.offsetWidth;
    els.fortress.classList.add('is-hit');
    showCombatToast(`城墙 -${damage}`, 'damage', 18, 48);
    addLog(`${enemy.label}撞上城墙，防具减免后损失 ${damage} 耐久`);
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
    [...state.enemies].forEach((enemy) => damageEnemy(enemy, damage, false, { secondary: true, effect: 'arcane' }));
    addLog(`奥术齐射覆盖战场，每个目标受到 ${damage} 点伤害`);
    updateUI();
  }

  function gameLoop(now) {
    if (!state.started || state.gameOver) return;
    const delta = Math.min(40, now - (state.lastFrame || now)) / 1000;
    state.lastFrame = now;
    if (!state.paused) {
      if (state.waveQueue > 0 && now >= state.nextSpawnAt) {
        const profile = state.waveProfile || getWaveProfile(state.wave, state.difficulty);
        const batch = Math.min(profile.batchSize, state.waveQueue);
        for (let index = 0; index < batch; index += 1) spawnEnemy();
        state.nextSpawnAt = now + profile.spawnInterval;
      }
      [...state.enemies].forEach((enemy) => {
        const speedScale = enemy.slowUntil > now ? .55 : 1;
        enemy.x -= enemy.speed * speedScale * delta;
        if (enemy.x <= 15) enemyBreaches(enemy);
        else positionEnemy(enemy);
      });
      const target = state.enemies.length
        ? state.enemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
        : null;
      aimTurret(target);
      if (state.enemies.length && now >= state.attackReadyAt) {
        fireAt(target, now);
      }
      if (state.waveQueue === 0 && state.enemies.length === 0) {
        if (!state.intermissionUntil) {
          if (state.wave >= MAX_WAVES) {
            completeVictory();
            return;
          }
          state.intermissionUntil = now + (state.waveProfile?.intermission || 3000);
          state.score += Math.round(150 * state.wave * DIFFICULTIES[state.difficulty].scoreScale);
          const matchResult = state.waveMatches >= state.waveProfile.requiredGroups ? '补强达标' : '补强不足';
          addLog(`第 ${state.wave} 波肃清，${matchResult}（${state.waveMatches}/${state.waveProfile.requiredGroups} 组）`);
        } else if (now >= state.intermissionUntil) {
          startWave(state.wave + 1);
        }
      }
      if (now - state.lastUiAt > 100) {
        updateUI();
        state.lastUiAt = now;
      }
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
    state.sessionId += 1;
    state.selected = null; state.locked = false; state.started = true; state.paused = false; state.gameOver = false;
    state.difficulty = state.selectedDifficulty;
    state.score = 0; state.kills = 0; state.wave = 1; state.might = 0; state.mana = 0; state.repaired = 0;
    state.forge = 0; state.forgeTarget = 16; state.equipment = { weapon: 1, armor: 1, charm: 1 };
    state.upgradeMode = 'auto'; state.autoUpgradeIndex = 0; state.combatBuff = null; state.combatBuffQueue = [];
    state.wallMax = 1120; state.wall = 1120; state.combo = 1; state.enemyId = 0;
    state.waveQueue = 0; state.waveTotal = 0; state.waveSpawned = 0; state.waveBossesRemaining = 0;
    state.waveMatches = 0; state.totalMatches = 0; state.waveProfile = null; state.intermissionUntil = 0;
    state.attackReadyAt = 0; state.lastFrame = performance.now(); state.lastUiAt = 0;
    state.enemies.forEach((enemy) => enemy.el.remove());
    state.enemies = [];
    els.projectilesLayer.replaceChildren();
    els.impactLayer.replaceChildren();
    els.toastLayer.replaceChildren();
    els.combatBuffs.replaceChildren();
    els.combatBuffs.dataset.signature = '';
    els.boardEffects.replaceChildren();
    buildBoard();
    renderBoard(new Set(), -1, 'initial');
    updateCombo();
    els.gameOverModal.classList.remove('is-open');
    els.victoryModal.classList.remove('is-open');
    els.introModal.classList.remove('is-open');
    els.introModal.classList.remove('is-first-visit');
    els.boardLock.classList.remove('is-visible');
    els.pauseButton.querySelector('span').textContent = 'Ⅱ';
    setUpgradeMode('auto', false);
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

  function completeVictory() {
    state.gameOver = true;
    state.paused = true;
    state.score += Math.round(10000 * DIFFICULTIES[state.difficulty].scoreScale);
    $('#victoryKills').textContent = state.kills;
    $('#victoryScore').textContent = state.score;
    els.victoryModal.classList.add('is-open');
    sound.tone(392, .28, 'triangle', .04);
    sound.tone(587, .42, 'triangle', .045, .16);
    sound.tone(784, .7, 'sine', .04, .36);
    updateUI();
  }

  function returnToBriefing() {
    cancelAnimationFrame(state.animationId);
    state.sessionId += 1;
    state.started = false;
    state.paused = true;
    state.gameOver = false;
    els.gameOverModal.classList.remove('is-open');
    els.victoryModal.classList.remove('is-open');
    els.introModal.classList.add('is-open', 'is-first-visit');
    $('#startButton small').textContent = `部署 · ${DIFFICULTIES[state.selectedDifficulty].subtitle}`;
  }

  function selectDifficulty(key, announce = true) {
    if (!DIFFICULTIES[key]) return;
    state.selectedDifficulty = key;
    document.querySelectorAll('.difficulty-card').forEach((button) => {
      const active = button.dataset.difficulty === key;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const config = DIFFICULTIES[key];
    $('#startButton span').textContent = `以「${config.name}」出征`;
    $('#startButton small').textContent = state.started ? '确认后重开战局' : `部署 · ${config.subtitle}`;
    if (announce) sound.play('click', .12, key === 'master' ? .86 : key === 'veteran' ? 1 : 1.12);
  }

  function openCampaignOptions() {
    state.introWasPaused = state.paused;
    if (state.started && !state.gameOver) togglePause(true);
    els.introModal.classList.remove('is-first-visit');
    $('#startButton small').textContent = '确认后重开战局';
    els.introModal.classList.add('is-open');
  }

  function closeCampaignOptions() {
    if (!state.started) return;
    els.introModal.classList.remove('is-open');
    if (!state.gameOver && !state.introWasPaused) togglePause(false);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      addLog('当前浏览器未允许全屏显示');
    }
  }

  function updateFullscreenButton() {
    const active = Boolean(document.fullscreenElement);
    els.fullscreenButton.querySelector('span').textContent = active ? '⤡' : '⤢';
    els.fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '进入全屏');
    els.fullscreenButton.setAttribute('title', active ? '退出全屏' : '进入全屏');
    els.fullscreenButton.classList.toggle('is-active', active);
  }

  els.board.addEventListener('click', (event) => {
    const tile = event.target.closest('.rune-tile');
    if (tile) handleTile(Number(tile.dataset.index));
  });
  $('#startButton').addEventListener('click', resetGame);
  $('#restartButton').addEventListener('click', resetGame);
  $('#victoryRestartButton').addEventListener('click', returnToBriefing);
  $('#introClose').addEventListener('click', closeCampaignOptions);
  $('#helpButton').addEventListener('click', openCampaignOptions);
  document.querySelectorAll('.difficulty-card').forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
  });
  document.querySelectorAll('.strategy-button').forEach((button) => {
    button.addEventListener('click', () => setUpgradeMode(button.dataset.upgrade));
  });
  els.pauseButton.addEventListener('click', () => togglePause());
  els.soundButton.addEventListener('click', () => sound.toggle());
  els.fullscreenButton.addEventListener('click', toggleFullscreen);
  els.volleyButton.addEventListener('click', castVolley);
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'q') castVolley();
    if (event.key === 'Escape' && state.started && els.introModal.classList.contains('is-open')) closeCampaignOptions();
    else if (event.key === 'Escape' && state.started) togglePause();
  });
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.started && !state.gameOver) togglePause(true);
  });

  if (new URLSearchParams(window.location.search).has('testMode')) {
    window.__runeRampartTest = {
      grantForge(amount) {
        state.forge += Number(amount) || state.forgeTarget;
        checkForge();
        updateUI();
      },
      grantRelic(type = 'blast') {
        activateRelic(RELICS[type] ? type : 'blast');
        updateUI();
      },
      clearRuneRelics() {
        state.boardRelics = state.board.map(() => null);
        renderBoard();
      },
      setRuneRelic(index, type = 'frost') {
        const safeIndex = Math.max(0, Math.min(state.board.length - 1, Math.floor(Number(index) || 0)));
        state.boardRelics[safeIndex] = RELICS[type] ? type : 'frost';
        renderBoard();
      },
      setRelicShots(shots = 1) {
        if (state.combatBuff) state.combatBuff.shots = Math.max(1, Math.floor(Number(shots) || 1));
        renderCombatBuff();
      },
      clearRelics() {
        state.combatBuff = null;
        state.combatBuffQueue = [];
        renderCombatBuff();
        updateUI();
      },
      spawnEnemy(type = 'assault', relic = null) {
        if (!ENEMY_NAMES[type]) return;
        state.waveQueue += 1;
        spawnEnemy(type, RELICS[relic] ? relic : null);
      },
      waveProfile(wave, difficulty = 'master') {
        return getWaveProfile(wave, difficulty);
      },
      simulateBalance(difficulty = 'master', efficiency = 1) {
        return simulateBalance(difficulty, efficiency);
      },
      setEquipment(slot, level) {
        if (!['weapon', 'armor', 'charm'].includes(slot)) return;
        state.equipment[slot] = Math.max(1, Math.floor(Number(level) || 1));
        updateUI();
      },
      fireBurst() {
        let target = state.enemies[0];
        if (!target) {
          state.waveQueue += 1;
          spawnEnemy('boss', null);
          [target] = state.enemies;
        }
        fireAt(target, performance.now());
        return { volleySize: volleySize(), attackRate: attackRate() };
      },
      clearWave(wave = MAX_WAVES) {
        startWave(wave);
        state.waveQueue = 0;
        state.waveBossesRemaining = 0;
        state.enemies.forEach((enemy) => enemy.el.remove());
        state.enemies = [];
        updateUI();
      },
      snapshot() {
        return {
          difficulty: state.difficulty,
          selectedDifficulty: state.selectedDifficulty,
          upgradeMode: state.upgradeMode,
          wave: state.wave,
          waveMatches: state.waveMatches,
          waveProfile: state.waveProfile,
          combatBuff: state.combatBuff ? { ...state.combatBuff } : null,
          combatBuffQueue: state.combatBuffQueue.map((buff) => ({ ...buff })),
          runeRelics: [...state.boardRelics],
          enemies: state.enemies.map(({ type, role, relic }) => ({ type, role, relic }))
        };
      }
    };
  }

  buildBoard();
  renderBoard(new Set(), -1, 'initial');
  els.introModal.classList.add('is-first-visit');
  selectDifficulty('rookie', false);
  setUpgradeMode('auto', false);
  updateSoundButton();
  updateFullscreenButton();
  updateUI();
})();
