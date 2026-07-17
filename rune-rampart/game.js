(() => {
  'use strict';

  const ROWS = 7;
  const COLS = 7;
  const MAX_WAVES = 100;
  const SECONDARY_BOLT_POWER = .45;
  const EMBER_BASE_CAP = 24;
  const EMBER_CAP_PER_WEAPON_LEVEL = 4;
  const MANA_BASE_CAP = 54;
  const MANA_CAP_PER_CHARM_LEVEL = 9;
  const MANA_CAST_COST = 18;
  const EMBER_DAMAGE_MULTIPLIER = 1.25;
  const SHIELD_MAX_RATIO = .5;
  const ARMOR_WALL_BONUS = 90;
  const ARMOR_SHIELD_BONUS = Math.round(ARMOR_WALL_BONUS * SHIELD_MAX_RATIO);
  const WAVE_INTERMISSION_MS = 3000;
  const VICTORY_SPEED_BUDGET_MS = 2 * 60 * 60 * 1000;
  const FORGE_START = 26;
  const FORGE_LEVEL_STEP = 10;
  const FORGE_LATE_STEP = 2;
  const FORGE_EARLY_LEVELS = 4;
  const UPGRADE_SLOTS = ['weapon', 'armor', 'charm'];
  const ENEMY_ENTRY_X = 98;
  const TARGET_ACQUIRE_DELAY = 220;
  const SAVE_VERSION = 1;
  const STORAGE_KEYS = {
    difficulty: 'runeRampart.difficulty',
    muted: 'runeRampart.muted',
    music: 'runeRampart.music',
    musicTrack: 'runeRampart.musicTrack',
    progress: 'runeRampart.progress.v1',
    history: 'runeRampart.history.v1'
  };
  const HISTORY_LIMIT = 30;
  const HISTORY_VISIBLE_LIMIT = 8;
  const DIFFICULTY_PRIORITY = { rookie: 1, veteran: 2, master: 3 };
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
      name: '新手', subtitle: '稳健通关', pressure: .82, eliteOffset: -.28, eliteCap: .72,
      statScale: .8, durabilityScale: 1.1, speedFactor: .94, groupScale: .62, batchDivisor: 7,
      relicChance: .2, relicGrowth: .004, runeRelicChance: .06, scoreScale: 1
    },
    veteran: {
      name: '老兵', subtitle: '胜负分水岭', pressure: 1.1, eliteOffset: -.03, eliteCap: .93,
      statScale: 1.08, durabilityScale: 1.35, speedFactor: 1.12, groupScale: .9, batchDivisor: 4,
      relicChance: .07, relicGrowth: .0025, runeRelicChance: .02, scoreScale: 1.5
    },
    master: {
      name: '大佬', subtitle: '九死一生', pressure: 1.38, eliteOffset: .16, eliteCap: .99,
      statScale: 1.28, durabilityScale: 1.55, speedFactor: 1.28, groupScale: 1.12, batchDivisor: 2,
      relicChance: .02, relicGrowth: .001, runeRelicChance: .006, scoreScale: 2
    }
  };
  const BASE_ENEMY_STATS = {
    raider: { hp: 100, speed: 3, damage: 28, defense: 3, role: '荒原劫掠者 · 均衡型', roleIcon: '◆' },
    swift: { hp: 70, speed: 5.4, damage: 18, defense: 1, role: '影袭斥候 · 速度型', roleIcon: '»' },
    assault: { hp: 120, speed: 3.5, damage: 44, defense: 2, role: '血斧先锋 · 攻击型', roleIcon: '†' },
    brute: { hp: 210, speed: 2, damage: 32, defense: 13, role: '披甲蛮兵 · 防御型', roleIcon: '◇' },
    boss: { hp: 1050, speed: 1.4, damage: 96, defense: 20, role: '攻城巨兽 · BOSS', roleIcon: '♛' }
  };
  const RELICS = {
    blast: { name: '爆裂符文', icon: '✹', description: '命中产生范围伤害', className: 'blast' },
    frost: { name: '霜缚符文', icon: '❄', description: '命中减慢敌军', className: 'frost' },
    shatter: { name: '破甲符文', icon: '⌁', description: '命中削弱防御', className: 'shatter' }
  };
  const arrangeMusicTrack = ({ title, source, bpm, melody, roots, cycles = 2 }) => ({
    title,
    source,
    bpm,
    cycles,
    melody,
    bass: melody.map((note, index) => index % 4 === 0 ? roots[Math.floor(index / 4) % roots.length] : null),
    harmony: melody.map((note, index) => note !== null && index % 2 === 0 ? note - 12 : null)
  });

  const MUSIC_TRACKS = [
    {
      title: '方块疾行 · 科罗贝尼基', source: '公版俄罗斯民谣改编', bpm: 118, cycles: 3,
      melody: [76, 71, 72, 74, 72, 71, 69, 69, 72, 76, 74, 72, 71, 71, 72, 74, 76, 72, 69, 69, null, 74, 77, 81, 79, 77, 76, 72, 76, 74, 72, 71],
      bass: [45, null, null, null, 45, null, null, null, 41, null, null, null, 41, null, null, null, 45, null, null, null, 38, null, null, null, 41, null, null, null, 40, null, 43, null],
      harmony: [64, null, null, null, 64, null, 60, null, 64, null, null, null, 62, null, 64, null, 64, null, 60, null, 62, null, 65, null, 67, null, 65, null, 64, null, 62, null]
    },
    {
      title: '山王逼近 · 山魔王宫殿', source: '格里格公版作品改编', bpm: 132, cycles: 3,
      melody: [71, 72, 74, 76, 74, 72, 71, 68, 71, 72, 74, 76, 74, 72, 71, null, 70, 71, 73, 75, 73, 71, 70, 67, 70, 71, 73, 75, 73, 71, 70, null],
      bass: [40, null, 40, null, 43, null, 40, null, 40, null, 40, null, 43, null, 40, null, 39, null, 39, null, 42, null, 39, null, 39, null, 39, null, 42, null, 39, null],
      harmony: [59, null, 60, null, 62, null, 59, null, 59, null, 60, null, 62, null, 59, null, 58, null, 59, null, 61, null, 58, null, 58, null, 59, null, 61, null, 58, null]
    },
    {
      title: '极速追击 · 康康舞曲', source: '奥芬巴赫公版作品改编', bpm: 126, cycles: 3,
      melody: [79, 79, 79, 81, 83, 81, 79, 77, 76, 76, 76, 77, 79, 77, 76, 74, 72, 72, 72, 74, 76, 74, 72, 71, 69, 69, 71, 72, 74, 76, 77, 79],
      bass: [43, null, 43, null, 47, null, 43, null, 40, null, 40, null, 43, null, 38, null, 36, null, 36, null, 40, null, 36, null, 33, null, 35, null, 38, null, 40, null],
      harmony: [67, null, 67, null, 71, null, 67, null, 64, null, 64, null, 67, null, 62, null, 60, null, 60, null, 64, null, 60, null, 57, null, 59, null, 62, null, 64, null]
    },
    {
      title: '城垣余火 · 原创战曲', source: 'Rune Rampart 原创', bpm: 104, cycles: 3,
      melody: [74, null, 77, 76, 74, null, 72, 69, 70, null, 74, 72, 69, null, 67, 65, 69, null, 72, 74, 77, null, 76, 72, 74, null, 72, 69, 67, null, 69, 72],
      bass: [38, null, null, null, 38, null, 45, null, 41, null, null, null, 36, null, 43, null, 38, null, null, null, 34, null, 41, null, 36, null, null, null, 33, null, 36, null],
      harmony: [62, null, null, null, null, null, 60, null, 58, null, null, null, 57, null, 55, null, 57, null, null, null, 62, null, 60, null, 58, null, null, null, 55, null, 57, null]
    },
    arrangeMusicTrack({
      title: '黎明颂歌 · 欢乐颂', source: '贝多芬公版作品改编', bpm: 112,
      melody: [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,null,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60,null],
      roots: [36,36,41,41,36,36,43,36]
    }),
    arrangeMusicTrack({
      title: '月下侦察 · 致爱丽丝', source: '贝多芬公版作品改编', bpm: 116,
      melody: [76,75,76,75,76,71,74,72,69,null,60,64,69,71,null,64,68,71,72,null,64,76,75,76,75,76,71,74,72,69,null,null],
      roots: [45,40,45,40,45,40,45,45]
    }),
    arrangeMusicTrack({
      title: '禁卫急行 · 土耳其进行曲', source: '莫扎特公版作品改编', bpm: 128,
      melody: [71,69,68,69,72,74,72,71,72,76,77,76,74,72,71,69,68,69,72,74,72,71,72,76,77,76,74,72,71,69,69,null],
      roots: [45,45,40,40,45,45,40,45]
    }),
    arrangeMusicTrack({
      title: '王庭舞步 · G 大调小步舞曲', source: '佩措尔德公版作品改编', bpm: 106,
      melody: [67,62,64,66,67,62,62,69,66,67,69,71,72,62,62,null,64,66,64,62,61,64,67,71,72,71,69,67,66,64,62,null],
      roots: [43,38,43,38,40,36,43,38]
    }),
    arrangeMusicTrack({
      title: '春日出征 · 四季·春', source: '维瓦尔第公版作品改编', bpm: 124,
      melody: [76,75,76,71,69,69,71,68,64,68,71,76,75,76,71,69,69,71,68,64,68,71,76,74,72,71,69,68,66,64,64,null],
      roots: [40,45,40,45,40,45,43,40]
    }),
    arrangeMusicTrack({
      title: '长河回旋 · 蓝色多瑙河', source: '小约翰·施特劳斯公版作品改编', bpm: 108,
      melody: [67,71,74,74,71,67,64,67,72,76,79,79,76,72,67,69,74,77,81,81,77,74,69,71,76,79,83,81,79,76,74,null],
      roots: [43,40,41,43,38,43,40,43]
    }),
    arrangeMusicTrack({
      title: '赤红哨站 · 哈巴涅拉', source: '比才公版作品改编', bpm: 104,
      melody: [69,69,69,68,69,71,69,68,66,66,66,65,66,68,66,65,64,69,68,66,65,64,62,64,65,66,68,66,65,64,64,null],
      roots: [45,40,45,40,45,40,43,45]
    }),
    arrangeMusicTrack({
      title: '骑兵破阵 · 威廉退尔序曲', source: '罗西尼公版作品改编', bpm: 138,
      melody: [64,64,64,64,64,64,64,64,67,67,67,67,69,69,69,69,72,72,72,72,74,72,69,65,64,67,72,76,74,72,69,null],
      roots: [36,36,43,45,48,41,36,43]
    }),
    arrangeMusicTrack({
      title: '焰火凯旋 · 皇家焰火音乐', source: '亨德尔公版作品改编', bpm: 122,
      melody: [67,69,71,72,74,72,71,69,67,71,74,79,78,76,74,72,71,69,67,66,67,69,71,72,74,76,74,72,71,69,67,null],
      roots: [43,38,43,38,40,43,38,43]
    }),
    arrangeMusicTrack({
      title: '新大陆守望 · 自新大陆', source: '德沃夏克公版作品改编', bpm: 94,
      melody: [64,67,67,64,62,60,62,64,67,64,62,null,64,67,69,67,64,62,60,62,64,67,64,62,60,null,60,62,64,67,64,null],
      roots: [36,43,36,41,36,43,41,36]
    }),
    arrangeMusicTrack({
      title: '黑旗狂舞 · 匈牙利舞曲第五号', source: '勃拉姆斯公版作品改编', bpm: 132,
      melody: [69,72,71,69,68,69,72,76,76,75,73,72,71,72,69,null,69,72,71,69,68,69,72,76,79,77,76,74,72,71,69,null],
      roots: [45,40,45,40,45,40,43,45]
    }),
    arrangeMusicTrack({
      title: '绿袖林地 · 绿袖子', source: '英格兰公版传统民谣改编', bpm: 98,
      melody: [69,72,74,76,77,76,74,71,67,69,71,72,69,69,68,69,71,68,64,66,68,69,66,66,65,66,68,65,62,64,65,null],
      roots: [45,41,43,45,40,45,41,45]
    }),
    arrangeMusicTrack({
      title: '旧日战友 · 友谊地久天长', source: '苏格兰公版传统民谣改编', bpm: 102,
      melody: [60,65,65,65,69,67,65,67,69,65,65,69,72,74,74,null,72,69,69,65,67,65,67,69,65,62,62,60,65,65,65,null],
      roots: [41,41,36,43,41,36,43,41]
    }),
    arrangeMusicTrack({
      title: '樱落城门 · 樱花', source: '日本公版传统民谣改编', bpm: 92,
      melody: [69,69,71,69,69,71,69,71,72,71,69,71,68,64,68,null,64,68,69,71,68,69,68,64,63,64,68,69,71,68,69,null],
      roots: [45,45,40,45,40,45,40,45]
    }),
    arrangeMusicTrack({
      title: '迷雾集市 · 斯卡布罗集市', source: '英格兰公版传统民谣改编', bpm: 96,
      melody: [69,69,76,76,71,72,71,69,76,79,81,79,76,77,74,76,69,72,74,72,71,69,67,69,69,67,64,67,69,69,69,null],
      roots: [45,40,45,43,45,40,43,45]
    }),
    arrangeMusicTrack({
      title: '海港夜巡 · 醉水手', source: '爱尔兰公版传统船歌改编', bpm: 126,
      melody: [69,69,69,69,69,69,69,69,72,76,76,72,69,65,67,69,67,67,67,67,67,67,67,67,71,74,74,71,67,64,66,67],
      roots: [45,45,48,45,43,43,47,43]
    })
  ];

  const $ = (selector) => document.querySelector(selector);
  const readStorage = (key, fallback = null) => {
    try { return localStorage.getItem(key) ?? fallback; } catch (error) { return fallback; }
  };
  const writeStorage = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch (error) { return false; }
  };
  const removeStorage = (key) => {
    try { localStorage.removeItem(key); } catch (error) { /* Storage can be unavailable in private contexts. */ }
  };
  const els = {
    gameViewport: $('#gameViewport'),
    gameShell: $('#gameShell'),
    orientationGuard: $('#orientationGuard'),
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
    resumeModal: $('#resumeModal'),
    rulesModal: $('#rulesModal'),
    leaderboardModal: $('#leaderboardModal'),
    gameOverModal: $('#gameOverModal'),
    victoryModal: $('#victoryModal'),
    leaderboardButton: $('#leaderboardButton'),
    pauseButton: $('#pauseButton'),
    fullscreenButton: $('#fullscreenButton'),
    musicButton: $('#musicButton'),
    nextTrackButton: $('#nextTrackButton'),
    soundButton: $('#soundButton'),
    boardEffects: $('#boardEffects'),
    cascadeCallout: $('#cascadeCallout'),
    targetDossier: $('#targetDossier'),
    upgradeBanner: $('#equipmentUpgradeBanner'),
    volleyButton: $('#volleyButton'),
    contextTooltip: $('#contextTooltip'),
    contextTooltipTitle: $('#contextTooltipTitle'),
    contextTooltipBody: $('#contextTooltipBody')
  };

  const COMPACT_LANDSCAPE_CANVAS_WIDTH = 1180;
  let gameFitFrame = 0;

  function currentGameScale() {
    const scale = Number.parseFloat(getComputedStyle(els.gameShell).getPropertyValue('--game-scale'));
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  function fitGameToViewport() {
    gameFitFrame = 0;
    const viewportWidth = Math.max(1, document.documentElement.clientWidth || window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const portraitLocked = viewportWidth <= 820 && viewportHeight > viewportWidth;
    const compactLandscape = !portraitLocked && viewportWidth < COMPACT_LANDSCAPE_CANVAS_WIDTH && viewportWidth > viewportHeight;

    document.body.classList.toggle('portrait-game-locked', portraitLocked);
    els.gameViewport.classList.toggle('is-portrait-locked', portraitLocked);
    els.orientationGuard.classList.toggle('is-visible', portraitLocked);
    els.orientationGuard.setAttribute('aria-hidden', String(!portraitLocked));
    els.gameShell.inert = portraitLocked;

    els.gameViewport.classList.toggle('is-compact-landscape', compactLandscape);
    els.gameShell.style.setProperty('--game-canvas-width', compactLandscape ? `${COMPACT_LANDSCAPE_CANVAS_WIDTH}px` : '100%');
    els.gameShell.style.setProperty('--game-scale', '1');
    els.gameViewport.classList.remove('is-scaled');
    els.gameViewport.style.removeProperty('--game-scaled-height');

    if (portraitLocked) {
      els.gameViewport.dataset.scale = '1';
      return;
    }

    const naturalWidth = Math.max(1, els.gameShell.scrollWidth, els.gameShell.offsetWidth);
    const naturalHeight = Math.max(1, els.gameShell.scrollHeight, els.gameShell.offsetHeight);
    const scale = Math.min(1, viewportWidth / naturalWidth, viewportHeight / naturalHeight);
    const normalizedScale = scale > .998 ? 1 : scale;

    els.gameShell.style.setProperty('--game-scale', normalizedScale.toFixed(4));
    els.gameViewport.dataset.scale = normalizedScale.toFixed(4);
    els.gameViewport.style.setProperty('--game-scaled-height', `${Math.ceil(naturalHeight * normalizedScale)}px`);
    els.gameViewport.classList.toggle('is-scaled', normalizedScale < 1);
  }

  function scheduleGameFit() {
    cancelAnimationFrame(gameFitFrame);
    gameFitFrame = requestAnimationFrame(fitGameToViewport);
  }

  const sound = {
    muted: readStorage(STORAGE_KEYS.muted) === 'true',
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
      writeStorage(STORAGE_KEYS.muted, String(this.muted));
      updateSoundButton();
    }
  };

  const music = {
    enabled: readStorage(STORAGE_KEYS.music, 'true') !== 'false',
    playing: false,
    timer: 0,
    master: null,
    filter: null,
    step: 0,
    trackIndex: (() => {
      const stored = Number.parseInt(readStorage(STORAGE_KEYS.musicTrack, '0'), 10);
      return Number.isFinite(stored) ? Math.max(0, stored) % MUSIC_TRACKS.length : 0;
    })(),
    trackCycle: 0,
    lastAnnouncedKey: '',
    nextNoteAt: 0,

    currentTrack() {
      return MUSIC_TRACKS[this.trackIndex % MUSIC_TRACKS.length];
    },

    announceTrack() {
      const track = this.currentTrack();
      const key = `${state.sessionId}:${this.trackIndex}`;
      if (state.started && this.lastAnnouncedKey !== key) {
        this.lastAnnouncedKey = key;
        addLog(`军乐换曲：${track.title}（${track.source}）`);
      }
      updateMusicButton();
    },

    advanceTrack(announce = true) {
      this.trackIndex = (this.trackIndex + 1) % MUSIC_TRACKS.length;
      writeStorage(STORAGE_KEYS.musicTrack, String(this.trackIndex));
      this.step = 0;
      this.trackCycle = 0;
      if (announce) this.announceTrack();
      return this.currentTrack();
    },

    skip() {
      const resumePlayback = this.playing;
      if (resumePlayback) this.stop();
      const track = this.advanceTrack(true);
      if (resumePlayback) this.start();
      sound.play('click', .16, 1.24);
      return track;
    },

    midiToFrequency(note) {
      return 440 * (2 ** ((note - 69) / 12));
    },

    playNote(note, when, duration, type, volume) {
      if (!this.master || !sound.context || note === null) return;
      const oscillator = sound.context.createOscillator();
      const gain = sound.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(this.midiToFrequency(note), when);
      gain.gain.setValueAtTime(.0001, when);
      gain.gain.exponentialRampToValueAtTime(volume, when + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(when);
      oscillator.stop(when + duration + .03);
    },

    schedule() {
      if (!this.playing || !sound.context) return;
      while (this.nextNoteAt < sound.context.currentTime + .45) {
        const track = this.currentTrack();
        const stepLength = 60 / track.bpm / 2;
        const index = this.step;
        this.playNote(track.melody[index], this.nextNoteAt, stepLength * .78, 'triangle', .018);
        this.playNote(track.bass[index], this.nextNoteAt, stepLength * 1.65, 'square', .008);
        this.playNote(track.harmony[index], this.nextNoteAt, stepLength * 1.25, 'sine', .006);
        this.nextNoteAt += stepLength;
        this.step += 1;
        if (this.step >= track.melody.length) {
          this.step = 0;
          this.trackCycle += 1;
          if (this.trackCycle >= track.cycles) this.advanceTrack(true);
        }
      }
    },

    start() {
      if (!this.enabled || this.playing || !state.started || state.paused || state.gameOver) return;
      sound.init();
      if (!sound.context) return;
      this.master = sound.context.createGain();
      this.filter = sound.context.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2400;
      this.master.gain.value = .9;
      this.master.connect(this.filter).connect(sound.context.destination);
      this.playing = true;
      this.nextNoteAt = sound.context.currentTime + .06;
      this.announceTrack();
      this.schedule();
      this.timer = window.setInterval(() => this.schedule(), 100);
      updateMusicButton();
    },

    stop() {
      window.clearInterval(this.timer);
      this.timer = 0;
      const master = this.master;
      if (master && sound.context) {
        const now = sound.context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(.0001, now, .045);
        window.setTimeout(() => {
          try { master.disconnect(); } catch (error) { /* Already disconnected. */ }
        }, 260);
      }
      this.master = null;
      this.filter = null;
      this.playing = false;
      updateMusicButton();
    },

    toggle() {
      this.enabled = !this.enabled;
      writeStorage(STORAGE_KEYS.music, String(this.enabled));
      if (this.enabled) {
        sound.init();
        this.start();
        sound.play('click', .18, 1.18);
      } else {
        sound.play('click', .16, .82);
        this.stop();
      }
      updateMusicButton();
    }
  };

  const state = {
    board: [], boardRelics: [], selected: null, locked: false, started: false, paused: true, gameOver: false,
    score: 0, kills: 0, wave: 1, emberCharges: 0, mana: 0, shield: 0, repaired: 0,
    forge: 0, forgeTarget: FORGE_START, equipment: { weapon: 1, armor: 1, charm: 1 },
    upgradeMode: 'auto', autoUpgradeIndex: 0, selectedDifficulty: 'rookie', difficulty: 'rookie',
    wall: 1120, wallMax: 1120, combo: 1, enemies: [], enemyId: 0,
    waveQueue: 0, waveTotal: 0, waveSpawned: 0, waveBossesRemaining: 0,
    waveMatches: 0, totalMatches: 0, waveProfile: null, nextSpawnAt: 0, intermissionUntil: 0,
    attackReadyAt: 0, lastFrame: 0, animationId: 0, lastUiAt: 0, sessionId: 0,
    combatBuff: null, combatBuffQueue: [], introWasPaused: false, rulesWasPaused: false, leaderboardWasPaused: false, pendingSaveReason: null,
    resolution: null, pausedAt: 0, activePlayMs: 0, playSegmentStartedAt: 0, settlementRecorded: false
  };
  let pendingResume = null;
  let settlementHistory = [];
  let currentSettlementId = null;
  let activeHistoryFilter = 'all';
  let rulesReturnFocus = null;
  let leaderboardReturnFocus = null;
  let contextTooltipTarget = null;
  const gameTasks = new Set();

  function tooltipTargetEnemy() {
    const enteredEnemies = state.enemies.filter((enemy) => enemy.entered);
    return enteredEnemies.length
      ? enteredEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
      : null;
  }

  function contextTooltipModel(target) {
    const key = target.dataset.tooltipKey;
    const difficulty = DIFFICULTIES[state.difficulty] || DIFFICULTIES.rookie;
    const profile = state.waveProfile || getWaveProfile(state.wave, state.difficulty);
    const enemy = tooltipTargetEnemy();
    const upgradeSlot = currentUpgradeSlot();
    const upgradeLabel = upgradeSlotLabel(upgradeSlot);
    const remainingEnemies = state.waveQueue + state.enemies.length;
    const models = {
      campaignOptions: {
        title: '战役选项',
        body: state.started
          ? `当前为「${difficulty.name}」难度。打开后会立即暂停并保存；确认出征才会清除本局并重开。`
          : '选择新手、老兵或大佬难度，再开始一场新的百波战役。'
      },
      rules: { title: '完整规则', body: '集中查看消除、补强、战斗、彩蛋、难度、排名与存档规则；打开时会暂停并保存。' },
      leaderboard: { title: `本机排行榜 · ${settlementHistory.length} 条`, body: '打开总榜或按新手、老兵、大佬难度查看历史战绩；游戏中打开会立即暂停并保存，关闭后恢复。' },
      fullscreen: { title: document.fullscreenElement ? '退出全屏' : '进入全屏', body: '切换显示模式，不会改变战局进度或暂停状态。' },
      sound: { title: sound.muted ? '音效已关闭' : '音效已开启', body: `点击${sound.muted ? '开启' : '关闭'}射击、命中、消除与升级音效；MIDI 军乐单独控制。` },
      pause: {
        title: state.paused ? '战局已暂停' : '立即暂停',
        body: state.paused ? '点击后从冻结点继续；刷新页面后选择继续也会直接恢复交战。' : '立即冻结敌军、射击、消除连锁和特效，并把当前状态保存到浏览器。'
      },
      difficulty: {
        title: `难度 · ${difficulty.name}`,
        body: `${difficulty.subtitle} · 军功倍率 ×${difficulty.scoreScale}。本波 ${profile.enemyCount} 敌，高阶怪约 ${Math.round(profile.advancedChance * 100)}%。`
      },
      wave: { title: `第 ${state.wave} / ${MAX_WAVES} 波`, body: `当前为第 ${profile.stage} 阶段${profile.isBossWave ? ' Boss 波' : ''}；每 10 波敌潮会发生一次跃升。` },
      kills: { title: `本局歼敌 ${state.kills}`, body: '成功击败才计入歼敌；抵达城墙并自爆的敌人不会计入。' },
      score: { title: `当前军功 ${state.score.toLocaleString('zh-CN')}`, body: '击杀、波次与难度会影响军功；失败结算还会加入守完波次和有效交战时长。' },
      wall: { title: `城墙 ${Math.max(0, Math.ceil(state.wall))} / ${state.wallMax} · 护盾 ${Math.ceil(state.shield)} / ${shieldCapacity()}`, body: `敌人伤害先经过城防减伤 ${wallDefense()}%，再优先消耗护盾；护盾耗尽后才扣除耐久。` },
      pressure: {
        title: `本波消除 ${state.waveMatches} / ${profile.requiredGroups} 组`,
        body: state.waveMatches >= profile.requiredGroups ? '本波建议目标已完成；继续消除仍会获得资源和补强。' : `还差 ${profile.requiredGroups - state.waveMatches} 组达到建议节奏；这是引导目标，不会扣除已有收益。`
      },
      combo: { title: `当前连锁 ×${state.combo}`, body: state.combo > 1 ? '连续掉落形成的新消除会提高奥能、防御能量与军功收益。' : '一次交换后若自动形成连续消除，连锁倍率会逐段提高。' },
      ember: { title: `余烬储备 ${state.emberCharges} / ${emberCapacity()}`, body: `每枚红曜石提供 1 次余烬齐射；下一轮开火消耗 1 次，使整轮伤害提高 25%。攻击每升一级，储备上限 +${EMBER_CAP_PER_WEAPON_LEVEL}。` },
      mana: { title: `奥能 ${state.mana} / ${manaCapacity()}`, body: state.mana >= MANA_CAST_COST ? `奥术齐射已经就绪：每次消耗 ${MANA_CAST_COST} 点；攻速每升一级，奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}。` : `还需 ${MANA_CAST_COST - state.mana} 点即可发动奥术齐射；当前上限 ${manaCapacity()}，攻速每升一级上限 +${MANA_CAP_PER_CHARM_LEVEL}。` },
      energy: { title: `防御能量 ${Math.ceil(state.shield)} / ${shieldCapacity()}`, body: `绿晶产生防御能量：获得时先用于修复缺失耐久，剩余能量转化为护盾；能量与护盾上限均为耐久上限的 50%。受到伤害时先扣护盾，再扣城墙耐久。` },
      forge: { title: `可用补强 ${state.forge}`, body: `当前目标：${upgradeLabel} LV.${state.equipment[upgradeSlot]}→${state.equipment[upgradeSlot] + 1}，需要 ${state.forgeTarget} 点。切换目标不会损失进度。` },
      waveState: { title: remainingEnemies ? `本波剩余 ${remainingEnemies} 敌` : '本波区域肃清', body: `总计 ${state.waveTotal} 敌，每批最多 ${profile.batchSize} 个；场外敌人进场前无法锁定。` },
      allyAttack: { title: `我方攻击 ${totalPower()} · 余烬上限 ${emberCapacity()}`, body: `主炮弹以该数值为基础，再结算敌方防御；攻击每升一级还会使余烬储备上限 +${EMBER_CAP_PER_WEAPON_LEVEL}。` },
      allyDefense: { title: `城防减伤 ${wallDefense()}% · 护盾 ${Math.ceil(state.shield)}`, body: `敌人伤害先减免 ${wallDefense()}%，再由护盾吸收；每次升级防御还会使耐久上限 +${ARMOR_WALL_BONUS}、护盾上限 +${ARMOR_SHIELD_BONUS}，并同步修复最多 ${ARMOR_WALL_BONUS} 点。` },
      allySpeed: { title: `有效射速 ${attackRate()} / 秒 · 奥能上限 ${manaCapacity()}`, body: `当前为${volleyLabel()}；攻速升级会缩短间隔、增加齐射弹数，并使奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}。` },
      targetDamage: {
        title: enemy ? `目标伤害 ${enemy.damage}` : '目标伤害 —',
        body: enemy ? (() => {
          const damage = Math.max(1, Math.round(enemy.damage * (1 - wallDefense() / 100)));
          const absorbed = Math.min(state.shield, damage);
          return `抵达终点后结算 ${damage} 点伤害；当前护盾预计吸收 ${Math.round(absorbed)}，耐久损失 ${Math.round(damage - absorbed)}。`;
        })() : '尚无已进场且可锁定的敌人。'
      },
      targetDefense: {
        title: enemy ? `目标防御 ${effectiveDefense(enemy)}` : '目标防御 —',
        body: enemy ? `当前约抵消 ${Math.round((1 - 100 / (100 + effectiveDefense(enemy) * 2)) * 100)}% 的弩炮伤害；破甲会暂时降低防御。` : '尚无已进场且可锁定的敌人。'
      },
      targetHealth: { title: enemy ? `目标生命 ${Math.max(0, Math.ceil(enemy.hp))} / ${enemy.maxHp}` : '目标生命 —', body: enemy ? '生命归零即被歼灭；若先抵达终点则自爆并从战场移除。' : '尚无已进场且可锁定的敌人。' },
      arcaneVolley: { title: state.mana >= MANA_CAST_COST ? '奥术齐射 · 就绪' : `奥术齐射 · ${state.mana} / ${MANA_CAST_COST} 奥能`, body: `消耗 ${MANA_CAST_COST} 奥能，对所有已进场敌人造成约 ${Math.round(42 + totalPower() * .65)} 点基础伤害；场外敌人不受影响。` },
      nextWave: { title: state.intermissionUntil ? `下一波还有 ${Math.max(0, Math.ceil((state.intermissionUntil - performance.now()) / 1000))} 秒` : '下一批交战中', body: `本波敌军全部肃清后固定整备 ${WAVE_INTERMISSION_MS / 1000} 秒，再自动开始下一波并保存进度。` },
      forgeProgress: { title: `${upgradeLabel}补强 ${state.forge} / ${state.forgeTarget}`, body: `升级目标为 LV.${state.equipment[upgradeSlot]}→${state.equipment[upgradeSlot] + 1}。每个消除组 +1，四连与五连、铸币组会获得额外补强。` },
      weaponLoadout: { title: `${equipmentName('weapon')} · LV.${state.equipment.weapon}`, body: `当前攻击 ${totalPower()}、余烬上限 ${emberCapacity()}；每升一级同时提高伤害，并使余烬上限 +${EMBER_CAP_PER_WEAPON_LEVEL}。` },
      armorLoadout: { title: `${equipmentName('armor')} · LV.${state.equipment.armor}`, body: `当前减伤 ${wallDefense()}%，城墙 ${Math.max(0, Math.ceil(state.wall))} / ${state.wallMax}、护盾上限 ${shieldCapacity()}；每升一级使耐久上限 +${ARMOR_WALL_BONUS}、护盾上限 +${ARMOR_SHIELD_BONUS}，并同步修复最多 ${ARMOR_WALL_BONUS} 点。` },
      charmLoadout: { title: `${equipmentName('charm')} · LV.${state.equipment.charm}`, body: `当前 ${attackRate()} 次/秒、${volleyLabel()}、奥能上限 ${manaCapacity()}；每升一级使奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}。` }
    };

    if (key === 'upgradeStrategy') {
      const mode = target.dataset.upgrade;
      const slot = mode === 'auto' ? currentUpgradeSlot('auto') : mode;
      const label = upgradeSlotLabel(slot);
      const cost = forgeCostFor(slot);
      const bonus = slot === 'armor'
        ? `耐久上限 +${ARMOR_WALL_BONUS}、护盾上限 +${ARMOR_SHIELD_BONUS}`
        : slot === 'weapon' ? `余烬上限 +${EMBER_CAP_PER_WEAPON_LEVEL}` : `奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}`;
      return mode === 'auto'
        ? { title: `自动 · 本次${label}`, body: `本次会把 ${cost} 补强用于${label} LV.${state.equipment[slot]}→${state.equipment[slot] + 1}，并获得${bonus}；完成后自动重新选择最低等级项目。` }
        : { title: `${label}优先`, body: `切换后持续补强${label}；下一级需要 ${cost} 点并获得${bonus}。当前 ${state.forge} 点会完整保留。` };
    }
    return models[key] || { title: '战场提示', body: '移动鼠标查看这个模块的规则与当前状态。' };
  }

  function renderContextTooltipContent() {
    if (!contextTooltipTarget?.isConnected) return;
    const model = contextTooltipModel(contextTooltipTarget);
    els.contextTooltipTitle.textContent = model.title;
    els.contextTooltipBody.textContent = model.body;
  }

  function positionContextTooltip() {
    if (!contextTooltipTarget?.isConnected || !els.contextTooltip.classList.contains('is-visible')) return;
    const margin = 10;
    const gap = 10;
    const targetRect = contextTooltipTarget.getBoundingClientRect();
    const tooltipRect = els.contextTooltip.getBoundingClientRect();
    const placeAbove = targetRect.top >= tooltipRect.height + gap + margin;
    const placement = placeAbove ? 'top' : 'bottom';
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tooltipRect.width - margin, left));
    let top = placeAbove ? targetRect.top - tooltipRect.height - gap : targetRect.bottom + gap;
    top = Math.max(margin, Math.min(window.innerHeight - tooltipRect.height - margin, top));
    const arrowX = Math.max(13, Math.min(tooltipRect.width - 23, targetRect.left + targetRect.width / 2 - left - 5));
    els.contextTooltip.dataset.placement = placement;
    els.contextTooltip.style.left = `${Math.round(left)}px`;
    els.contextTooltip.style.top = `${Math.round(top)}px`;
    els.contextTooltip.style.setProperty('--tip-arrow-x', `${Math.round(arrowX)}px`);
  }

  function showContextTooltip(target) {
    if (!target?.dataset.tooltipKey) return;
    if (contextTooltipTarget && contextTooltipTarget !== target && contextTooltipTarget.getAttribute('aria-describedby') === 'contextTooltip') {
      contextTooltipTarget.removeAttribute('aria-describedby');
    }
    contextTooltipTarget = target;
    contextTooltipTarget.setAttribute('aria-describedby', 'contextTooltip');
    renderContextTooltipContent();
    els.contextTooltip.classList.add('is-visible');
    els.contextTooltip.setAttribute('aria-hidden', 'false');
    positionContextTooltip();
  }

  function refreshContextTooltip() {
    if (!contextTooltipTarget || !els.contextTooltip.classList.contains('is-visible')) return;
    renderContextTooltipContent();
  }

  function hideContextTooltip() {
    if (contextTooltipTarget?.getAttribute('aria-describedby') === 'contextTooltip') contextTooltipTarget.removeAttribute('aria-describedby');
    contextTooltipTarget = null;
    els.contextTooltip.classList.remove('is-visible');
    els.contextTooltip.setAttribute('aria-hidden', 'true');
  }

  function armGameTask(task) {
    task.startedAt = performance.now();
    task.nativeId = window.setTimeout(() => {
      task.nativeId = 0;
      gameTasks.delete(task);
      task.callback();
    }, Math.max(0, task.remaining));
  }

  function scheduleGameTask(callback, delay = 0, onCancel = null) {
    const task = {
      callback,
      onCancel,
      remaining: Math.max(0, Number(delay) || 0),
      startedAt: 0,
      nativeId: 0
    };
    gameTasks.add(task);
    if (state.started && !state.paused && !state.gameOver) armGameTask(task);
    return task;
  }

  function pauseGameTasks(now = performance.now()) {
    gameTasks.forEach((task) => {
      if (!task.nativeId) return;
      window.clearTimeout(task.nativeId);
      task.nativeId = 0;
      task.remaining = Math.max(0, task.remaining - (now - task.startedAt));
    });
  }

  function resumeGameTasks() {
    gameTasks.forEach((task) => {
      if (!task.nativeId) armGameTask(task);
    });
  }

  function clearGameTasks() {
    gameTasks.forEach((task) => {
      if (task.nativeId) window.clearTimeout(task.nativeId);
      task.onCancel?.();
    });
    gameTasks.clear();
  }

  const wait = (ms) => new Promise((resolve) => scheduleGameTask(resolve, ms, resolve));
  const randomType = () => TYPES[Math.floor(Math.random() * TYPES.length)];
  const randomRuneRelic = () => {
    const chance = DIFFICULTIES[state.difficulty]?.runeRelicChance || 0;
    if (Math.random() >= chance) return null;
    const relicTypes = Object.keys(RELICS);
    return relicTypes[Math.floor(Math.random() * relicTypes.length)];
  };
  const indexOf = (row, col) => row * COLS + col;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const safeNumber = (value, fallback, minimum = -Infinity, maximum = Infinity) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? clamp(numeric, minimum, maximum) : fallback;
  };

  function currentActivePlayMs(now = performance.now()) {
    const currentSegment = state.started && !state.paused && !state.gameOver && state.playSegmentStartedAt
      ? Math.max(0, now - state.playSegmentStartedAt)
      : 0;
    return Math.max(0, state.activePlayMs + currentSegment);
  }

  function closePlaySegment(now = performance.now()) {
    state.activePlayMs = currentActivePlayMs(now);
    state.playSegmentStartedAt = 0;
  }

  function formatBattleTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function settlementTimeScore(activePlayMs, victory = false) {
    const seconds = Math.floor(Math.max(0, activePlayMs) / 1000);
    return victory
      ? Math.max(0, Math.floor((VICTORY_SPEED_BUDGET_MS / 1000 - seconds) * 2))
      : seconds * 2;
  }

  function normalizeHistoryRecord(record, index = 0) {
    if (!record || !DIFFICULTIES[record.difficulty]) return null;
    const achievedAt = Math.floor(safeNumber(record.achievedAt, Date.now(), 1));
    const activePlayMs = Math.floor(safeNumber(record.activePlayMs, 0, 0, 1000 * 60 * 60 * 48));
    const clearedWaves = Math.floor(safeNumber(record.clearedWaves, 0, 0, MAX_WAVES));
    const victory = Boolean(record.victory) || clearedWaves >= MAX_WAVES;
    const baseScore = Math.floor(safeNumber(record.baseScore, record.score, 0, 1000000000));
    const waveScore = Math.floor(safeNumber(record.waveScore, clearedWaves * 1500, 0, 1000000000));
    const timeScore = Math.floor(safeNumber(record.timeScore, settlementTimeScore(activePlayMs, victory), 0, 1000000000));
    return {
      id: String(record.id || `${achievedAt}-${index}`),
      achievedAt,
      difficulty: record.difficulty,
      victory,
      clearedWaves,
      activePlayMs,
      baseScore,
      waveScore,
      timeScore,
      settlementScore: Math.floor(safeNumber(record.settlementScore, baseScore + waveScore + timeScore, 0, 2000000000)),
      kills: Math.floor(safeNumber(record.kills, 0, 0, 100000000)),
      totalMatches: Math.floor(safeNumber(record.totalMatches, 0, 0, 100000000)),
      repaired: Math.floor(safeNumber(record.repaired, 0, 0, 100000000))
    };
  }

  function sortHistory(records) {
    return [...records].sort((first, second) => (
      DIFFICULTY_PRIORITY[second.difficulty] - DIFFICULTY_PRIORITY[first.difficulty]
      || second.clearedWaves - first.clearedWaves
      || (first.clearedWaves >= MAX_WAVES && second.clearedWaves >= MAX_WAVES ? first.activePlayMs - second.activePlayMs : 0)
      || second.settlementScore - first.settlementScore
      || second.kills - first.kills
      || second.totalMatches - first.totalMatches
      || first.achievedAt - second.achievedAt
    ));
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(readStorage(STORAGE_KEYS.history, '[]'));
      if (!Array.isArray(parsed)) return [];
      return sortHistory(parsed.map(normalizeHistoryRecord).filter(Boolean)).slice(0, HISTORY_LIMIT);
    } catch (error) {
      return [];
    }
  }

  function writeHistory(records) {
    const normalized = sortHistory((Array.isArray(records) ? records : []).map(normalizeHistoryRecord).filter(Boolean)).slice(0, HISTORY_LIMIT);
    writeStorage(STORAGE_KEYS.history, JSON.stringify(normalized));
    return normalized;
  }

  function createSettlementRecord(victory = false) {
    const activePlayMs = Math.floor(currentActivePlayMs());
    const clearedWaves = victory ? MAX_WAVES : Math.max(0, state.wave - 1);
    const waveScore = clearedWaves * 1500;
    const timeScore = settlementTimeScore(activePlayMs, victory);
    const achievedAt = Date.now();
    return normalizeHistoryRecord({
      id: `${achievedAt}-${Math.random().toString(36).slice(2, 8)}`,
      achievedAt,
      difficulty: state.difficulty,
      victory,
      clearedWaves,
      activePlayMs,
      baseScore: state.score,
      waveScore,
      timeScore,
      settlementScore: state.score + waveScore + timeScore,
      kills: state.kills,
      totalMatches: state.totalMatches,
      repaired: state.repaired
    });
  }

  function recordSettlement(victory = false) {
    if (state.settlementRecorded) return null;
    state.settlementRecorded = true;
    const record = createSettlementRecord(victory);
    const history = writeHistory([...readHistory(), record]);
    return { record, history, rank: history.findIndex((item) => item.id === record.id) + 1 };
  }

  function mountHistoryBoard(slot) {
    const board = $('#historyBoard');
    const target = typeof slot === 'string' ? $(slot) : slot;
    if (board && target && board.parentElement !== target) target.appendChild(board);
  }

  function renderHistory(history = settlementHistory, currentId = currentSettlementId) {
    const rows = $('#historyRows');
    if (!rows) return;
    const visibleHistory = activeHistoryFilter === 'all'
      ? history
      : history.filter((record) => record.difficulty === activeHistoryFilter);
    rows.replaceChildren();
    visibleHistory.slice(0, HISTORY_VISIBLE_LIMIT).forEach((record, index) => {
      const row = document.createElement('tr');
      if (record.id === currentId) row.classList.add('is-current');
      const date = new Date(record.achievedAt).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const values = [
        `#${String(index + 1).padStart(2, '0')}`,
        DIFFICULTIES[record.difficulty].name,
        `${record.clearedWaves} 波`,
        record.settlementScore.toLocaleString('zh-CN'),
        String(record.kills),
        formatBattleTime(record.activePlayMs),
        date
      ];
      values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      rows.appendChild(row);
    });
    if (!visibleHistory.length) {
      const row = document.createElement('tr');
      row.className = 'history-empty-row';
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.textContent = activeHistoryFilter === 'all' ? '还没有战报，完成一局后会自动记录。' : `还没有「${DIFFICULTIES[activeHistoryFilter].name}」难度的战报。`;
      row.appendChild(cell);
      rows.appendChild(row);
    }
    document.querySelectorAll('[data-history-filter]').forEach((button) => {
      const active = button.dataset.historyFilter === activeHistoryFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const count = $('#historyCount');
    if (count) count.textContent = `${visibleHistory.length} 条战报`;
  }

  function setHistoryFilter(filter = 'all') {
    activeHistoryFilter = filter === 'all' || DIFFICULTIES[filter] ? filter : 'all';
    renderHistory();
  }

  function renderFailureSettlement(result) {
    if (!result) return;
    const { record, history, rank } = result;
    $('#finalDifficulty').textContent = DIFFICULTIES[record.difficulty].name;
    $('#finalWave').textContent = `${record.clearedWaves} / ${MAX_WAVES}`;
    $('#finalKills').textContent = record.kills;
    $('#finalMatches').textContent = record.totalMatches;
    $('#finalTime').textContent = formatBattleTime(record.activePlayMs);
    $('#finalScore').textContent = record.settlementScore.toLocaleString('zh-CN');
    $('#finalRank').textContent = `#${String(rank).padStart(2, '0')}`;
    $('#finalScoreBreakdown').textContent = `基础军功 ${record.baseScore.toLocaleString('zh-CN')} + 波次 ${record.waveScore.toLocaleString('zh-CN')} + 坚守时间 ${record.timeScore.toLocaleString('zh-CN')}`;
    settlementHistory = history;
    currentSettlementId = record.id;
    activeHistoryFilter = 'all';
    mountHistoryBoard('#failureHistorySlot');
    renderHistory();
  }

  function renderVictorySettlement(result) {
    if (!result) return;
    const { record, history, rank } = result;
    $('#victoryDifficulty').textContent = DIFFICULTIES[record.difficulty].name;
    $('#victoryKills').textContent = record.kills;
    $('#victoryMatches').textContent = record.totalMatches;
    $('#victoryTime').textContent = formatBattleTime(record.activePlayMs);
    $('#victoryScore').textContent = record.settlementScore.toLocaleString('zh-CN');
    $('#victoryRank').textContent = `#${String(rank).padStart(2, '0')}`;
    $('#victoryScoreBreakdown').textContent = `基础军功 ${record.baseScore.toLocaleString('zh-CN')} + 波次 ${record.waveScore.toLocaleString('zh-CN')} + 速通奖励 ${record.timeScore.toLocaleString('zh-CN')}`;
    settlementHistory = history;
    currentSettlementId = record.id;
    activeHistoryFilter = 'all';
    mountHistoryBoard('#victoryHistorySlot');
    renderHistory();
  }

  function clearSavedProgress() {
    removeStorage(STORAGE_KEYS.progress);
    pendingResume = null;
  }

  function readSavedProgress() {
    const raw = readStorage(STORAGE_KEYS.progress);
    if (!raw) return null;
    try {
      const save = JSON.parse(raw);
      const validBoard = Array.isArray(save.board) && save.board.length === ROWS * COLS
        && save.board.every((type) => TYPES.includes(type));
      const validRelics = Array.isArray(save.boardRelics) && save.boardRelics.length === ROWS * COLS
        && save.boardRelics.every((type) => type === null || Boolean(RELICS[type]));
      if (save.version !== SAVE_VERSION || !DIFFICULTIES[save.difficulty] || !validBoard || !validRelics) throw new Error('Invalid checkpoint');
      return save;
    } catch (error) {
      clearSavedProgress();
      return null;
    }
  }

  function serializeEnemy(enemy, now) {
    return {
      id: enemy.id,
      type: enemy.type,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      speed: enemy.speed,
      damage: enemy.damage,
      defense: enemy.defense,
      relic: enemy.relic,
      x: enemy.x,
      y: enemy.y,
      entered: enemy.entered,
      acquireRemaining: enemy.entered ? Math.max(0, enemy.targetableAt - now) : 0,
      slowRemaining: Math.max(0, enemy.slowUntil - now),
      armorBreakRemaining: Math.max(0, enemy.armorBreakUntil - now)
    };
  }

  function saveProgress(reason = 'manual') {
    if (!state.started || state.gameOver) return false;
    if (state.board.some((type) => !TYPES.includes(type))) {
      state.pendingSaveReason = reason;
      return false;
    }
    const now = state.paused && state.pausedAt ? state.pausedAt : performance.now();
    const save = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      reason,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      board: [...state.board],
      boardRelics: [...state.boardRelics],
      score: state.score,
      kills: state.kills,
      wave: state.wave,
      emberCharges: state.emberCharges,
      mana: state.mana,
      shield: state.shield,
      repaired: state.repaired,
      forge: state.forge,
      forgeTarget: state.forgeTarget,
      equipment: { ...state.equipment },
      upgradeMode: state.upgradeMode,
      autoUpgradeIndex: state.autoUpgradeIndex,
      wall: state.wall,
      wallMax: state.wallMax,
      combo: state.combo,
      enemyId: state.enemyId,
      waveQueue: state.waveQueue,
      waveTotal: state.waveTotal,
      waveSpawned: state.waveSpawned,
      waveBossesRemaining: state.waveBossesRemaining,
      waveMatches: state.waveMatches,
      totalMatches: state.totalMatches,
      paused: state.paused,
      activePlayMs: currentActivePlayMs(now),
      resolution: state.resolution ? { ...state.resolution } : null,
      spawnDelay: Math.max(0, state.nextSpawnAt - now),
      attackDelay: Math.max(0, state.attackReadyAt - now),
      intermissionRemaining: state.intermissionUntil ? Math.max(0, state.intermissionUntil - now) : 0,
      combatBuff: state.combatBuff ? { ...state.combatBuff } : null,
      combatBuffQueue: state.combatBuffQueue.map((buff) => ({ ...buff })),
      enemies: state.enemies.map((enemy) => serializeEnemy(enemy, now))
    };
    const saved = writeStorage(STORAGE_KEYS.progress, JSON.stringify(save));
    if (saved) state.pendingSaveReason = null;
    return saved;
  }

  function flushPendingSave() {
    if (!state.pendingSaveReason) return;
    const reason = state.pendingSaveReason;
    state.pendingSaveReason = null;
    saveProgress(reason);
  }

  function clearBattleLayers() {
    state.enemies.forEach((enemy) => enemy.el?.remove());
    state.enemies = [];
    els.projectilesLayer.replaceChildren();
    els.impactLayer.replaceChildren();
    els.toastLayer.replaceChildren();
    els.combatBuffs.replaceChildren();
    els.combatBuffs.dataset.signature = '';
    els.boardEffects.replaceChildren();
    els.battleLog.replaceChildren();
  }

  function sanitizeBuff(buff) {
    if (!buff || !RELICS[buff.type]) return null;
    return { type: buff.type, shots: Math.floor(safeNumber(buff.shots, 1, 1, 99)) };
  }

  function restoreEnemy(savedEnemy, now) {
    if (!savedEnemy || !BASE_ENEMY_STATS[savedEnemy.type]) return;
    const stats = BASE_ENEMY_STATS[savedEnemy.type];
    const id = Math.floor(safeNumber(savedEnemy.id, state.enemyId + 1, 1, 1000000));
    const fallbackName = ENEMY_NAMES[savedEnemy.type][(id + state.wave - 2) % ENEMY_NAMES[savedEnemy.type].length];
    const restoredName = ENEMY_NAMES[savedEnemy.type].includes(savedEnemy.name) ? savedEnemy.name : fallbackName;
    const maxHp = safeNumber(savedEnemy.maxHp, stats.hp, 1, 100000000);
    const enemy = {
      id,
      type: savedEnemy.type,
      name: restoredName,
      role: stats.role,
      roleIcon: stats.roleIcon,
      hp: safeNumber(savedEnemy.hp, maxHp, 1, maxHp),
      maxHp,
      speed: safeNumber(savedEnemy.speed, stats.speed, .1, 100),
      damage: Math.round(safeNumber(savedEnemy.damage, stats.damage, 1, 1000000)),
      defense: Math.round(safeNumber(savedEnemy.defense, stats.defense, 0, 1000000)),
      label: restoredName,
      relic: RELICS[savedEnemy.relic] ? savedEnemy.relic : null,
      entered: Boolean(savedEnemy.entered) || safeNumber(savedEnemy.x, 90) <= ENEMY_ENTRY_X,
      targetableAt: now + safeNumber(savedEnemy.acquireRemaining, TARGET_ACQUIRE_DELAY, 0, TARGET_ACQUIRE_DELAY),
      slowUntil: now + safeNumber(savedEnemy.slowRemaining, 0, 0, 6000),
      armorBreakUntil: now + safeNumber(savedEnemy.armorBreakRemaining, 0, 0, 8000),
      x: safeNumber(savedEnemy.x, 90, 15.1, 110),
      y: safeNumber(savedEnemy.y, 70, 48, 90)
    };
    enemy.el = createEnemyElement(enemy);
    state.enemies.push(enemy);
    state.enemyId = Math.max(state.enemyId, enemy.id);
    positionEnemy(enemy);
  }

  function showResumePrompt(save) {
    pendingResume = save;
    const difficulty = DIFFICULTIES[save.difficulty] || DIFFICULTIES.rookie;
    const wave = Math.floor(safeNumber(save.wave, 1, 1, MAX_WAVES));
    $('#resumeDifficulty').textContent = difficulty.name;
    $('#resumeWave').textContent = `${String(wave).padStart(3, '0')} / ${MAX_WAVES}`;
    $('#resumeWall').textContent = `${Math.ceil(safeNumber(save.wall, 0, 0))} / ${Math.ceil(safeNumber(save.wallMax, 1120, 1))}`;
    $('#resumeScore').textContent = String(Math.floor(safeNumber(save.score, 0, 0))).padStart(5, '0');
    $('#resumeSavedAt').textContent = new Date(safeNumber(save.savedAt, Date.now())).toLocaleString('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    $('#resumeButton span').textContent = `继续第 ${wave} 波`;
    els.introModal.classList.remove('is-open');
    els.resumeModal.classList.add('is-open');
  }

  function sanitizeResolution(resolution) {
    if (!resolution || !['swap', 'resolve'].includes(resolution.kind)) return null;
    if (resolution.kind === 'resolve') {
      return { kind: 'resolve', phase: ['matching', 'primed', 'burst', 'dropping'].includes(resolution.phase) ? resolution.phase : 'matching' };
    }
    const first = Math.floor(safeNumber(resolution.first, -1, -1, ROWS * COLS - 1));
    const second = Math.floor(safeNumber(resolution.second, -1, -1, ROWS * COLS - 1));
    if (first < 0 || second < 0) return null;
    return { kind: 'swap', phase: resolution.phase === 'reverting' ? 'reverting' : 'validate', first, second };
  }

  async function resumeSavedResolution(savedResolution, sessionId) {
    if (!savedResolution || sessionId !== state.sessionId) return;
    state.locked = true;
    if (savedResolution.kind === 'swap') {
      if (savedResolution.phase === 'reverting') {
        await wait(280);
      } else {
        await wait(160);
        if (sessionId !== state.sessionId) return;
        if (findMatches().size === 0) {
          const { first, second } = savedResolution;
          [state.board[first], state.board[second]] = [state.board[second], state.board[first]];
          [state.boardRelics[first], state.boardRelics[second]] = [state.boardRelics[second], state.boardRelics[first]];
          state.resolution = { ...savedResolution, phase: 'reverting' };
          renderBoard(new Set(), second);
          await wait(280);
        } else {
          state.resolution = { kind: 'resolve', phase: 'matching' };
          await resolveBoard(sessionId);
        }
      }
    } else if (findMatches().size > 0) {
      state.resolution = { kind: 'resolve', phase: 'matching' };
      await resolveBoard(sessionId);
    }
    if (sessionId !== state.sessionId) return;
    renderBoard();
    state.locked = false;
    state.resolution = null;
    flushPendingSave();
  }

  function restoreProgress(save = pendingResume || readSavedProgress()) {
    if (!save) return false;
    const restoredFromPause = Boolean(save.paused);
    cancelAnimationFrame(state.animationId);
    music.stop();
    sound.init();
    state.sessionId += 1;
    clearGameTasks();
    const sessionId = state.sessionId;
    state.selected = null;
    state.resolution = sanitizeResolution(save.resolution);
    state.locked = Boolean(state.resolution);
    state.started = true;
    state.paused = false;
    state.gameOver = false;
    state.rulesWasPaused = false;
    state.leaderboardWasPaused = false;
    state.pendingSaveReason = null;
    state.settlementRecorded = false;
    state.difficulty = DIFFICULTIES[save.difficulty] ? save.difficulty : 'rookie';
    state.selectedDifficulty = state.difficulty;
    state.board = [...save.board];
    state.boardRelics = [...save.boardRelics];
    state.score = Math.floor(safeNumber(save.score, 0, 0));
    state.kills = Math.floor(safeNumber(save.kills, 0, 0));
    state.wave = Math.floor(safeNumber(save.wave, 1, 1, MAX_WAVES));
    state.emberCharges = Math.floor(safeNumber(save.emberCharges, 0, 0, 1000000));
    state.mana = Math.floor(safeNumber(save.mana, 0, 0, 1000000));
    state.shield = 0;
    state.repaired = Math.floor(safeNumber(save.repaired, 0, 0));
    state.forge = Math.floor(safeNumber(save.forge, 0, 0, 1000000));
    state.forgeTarget = FORGE_START;
    state.equipment = {
      weapon: Math.floor(safeNumber(save.equipment?.weapon, 1, 1, 100)),
      armor: Math.floor(safeNumber(save.equipment?.armor, 1, 1, 100)),
      charm: Math.floor(safeNumber(save.equipment?.charm, 1, 1, 100))
    };
    state.emberCharges = Math.min(state.emberCharges, emberCapacity());
    state.mana = Math.min(state.mana, manaCapacity());
    state.upgradeMode = ['auto', 'weapon', 'armor', 'charm'].includes(save.upgradeMode) ? save.upgradeMode : 'auto';
    state.autoUpgradeIndex = Math.floor(safeNumber(save.autoUpgradeIndex, 0, 0, 1000000));
    syncForgeTarget();
    state.wallMax = Math.floor(safeNumber(save.wallMax, 1120, 1, 100000000));
    state.wall = safeNumber(save.wall, state.wallMax, 1, state.wallMax);
    state.shield = safeNumber(save.shield, 0, 0, shieldCapacity());
    state.combo = Math.floor(safeNumber(save.combo, 1, 1, 999));
    state.enemyId = Math.floor(safeNumber(save.enemyId, 0, 0, 1000000));
    state.waveProfile = getWaveProfile(state.wave, state.difficulty);
    state.waveQueue = Math.floor(safeNumber(save.waveQueue, state.waveProfile.enemyCount, 0, 100000));
    state.waveTotal = Math.floor(safeNumber(save.waveTotal, state.waveProfile.enemyCount, 1, 100000));
    state.waveSpawned = Math.floor(safeNumber(save.waveSpawned, 0, 0, state.waveTotal));
    state.waveBossesRemaining = Math.floor(safeNumber(save.waveBossesRemaining, state.waveProfile.bossCount, 0, 100));
    state.waveMatches = Math.floor(safeNumber(save.waveMatches, 0, 0, 1000000));
    state.totalMatches = Math.floor(safeNumber(save.totalMatches, 0, 0, 100000000));
    state.activePlayMs = safeNumber(save.activePlayMs, 0, 0, 1000 * 60 * 60 * 48);
    state.combatBuff = sanitizeBuff(save.combatBuff);
    state.combatBuffQueue = Array.isArray(save.combatBuffQueue) ? save.combatBuffQueue.map(sanitizeBuff).filter(Boolean) : [];

    clearBattleLayers();
    const now = performance.now();
    (Array.isArray(save.enemies) ? save.enemies : []).forEach((enemy) => restoreEnemy(enemy, now));
    state.nextSpawnAt = now + safeNumber(save.spawnDelay, 450, 0, 60000);
    state.attackReadyAt = now + safeNumber(save.attackDelay, 250, 0, 10000);
    const intermissionRemaining = safeNumber(save.intermissionRemaining, 0, 0, 60000);
    state.intermissionUntil = intermissionRemaining > 0 ? now + intermissionRemaining : 0;
    state.lastFrame = now;
    state.lastUiAt = 0;
    state.pausedAt = 0;
    state.playSegmentStartedAt = now;

    renderBoard(new Set(), -1, 'initial');
    updateCombo();
    selectDifficulty(state.difficulty, false);
    setUpgradeMode(state.upgradeMode, false);
    els.resumeModal.classList.remove('is-open');
    els.introModal.classList.remove('is-open', 'is-first-visit');
    els.rulesModal.classList.remove('is-open');
    els.gameOverModal.classList.remove('is-open');
    els.victoryModal.classList.remove('is-open');
    els.boardLock.classList.toggle('is-visible', state.paused);
    els.boardLock.querySelector('span').textContent = state.paused ? '战局暂停 · 战报已保存' : '战局暂停';
    els.gameShell.classList.toggle('is-paused', state.paused);
    els.pauseButton.querySelector('span').textContent = state.paused ? '▶' : 'Ⅱ';
    els.pauseButton.setAttribute('aria-label', state.paused ? '继续游戏' : '暂停游戏');
    addLog(`已${restoredFromPause ? '从暂停点继续' : '恢复'}第 ${state.wave} 波本地战报，棋盘与前线状态同步完成`);
    const restoredTargets = state.enemies.filter((enemy) => enemy.entered);
    aimTurret(restoredTargets.length ? restoredTargets.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest) : null);
    updateUI();
    state.animationId = requestAnimationFrame(gameLoop);
    if (state.resolution) resumeSavedResolution(state.resolution, sessionId);
    if (!state.paused) {
      resumeGameTasks();
      music.start();
    }
    pendingResume = null;
    return true;
  }

  function discardSavedProgress() {
    clearSavedProgress();
    els.resumeModal.classList.remove('is-open');
    els.introModal.classList.add('is-open', 'is-first-visit');
    $('#startButton small').textContent = `部署 · ${DIFFICULTIES[state.selectedDifficulty].subtitle}`;
  }

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
      enemyCount: Math.max(7, Math.round(baseCount * difficulty.pressure)),
      advancedChance: clamp(.48 + (safeWave - 1) * .0025 + tier * .035 + difficulty.eliteOffset, .18, difficulty.eliteCap),
      hpScale: (1 + (safeWave - 1) * .035) * (1 + tier * .08) * difficulty.statScale * difficulty.durabilityScale,
      // Breach damage grows more slowly than durability so a few leaks hurt
      // without making late waves collapse the wall in two or three hits.
      damageScale: (1 + (safeWave - 1) * .018) * (1 + tier * .07) * difficulty.statScale,
      defenseScale: (1 + (safeWave - 1) * .018) * (1 + tier * .06) * difficulty.statScale,
      speedScale: (1 + (safeWave - 1) * .0015 + tier * .015) * difficulty.speedFactor,
      batchSize: 1 + Math.floor(tier / difficulty.batchDivisor),
      bossCount: isBossWave ? (safeWave === MAX_WAVES ? 3 : 1 + Math.floor(tier / 5)) : 0,
      isBossWave,
      relicChance: clamp(difficulty.relicChance + tier * difficulty.relicGrowth, difficulty.relicChance, difficulty.relicChance + difficulty.relicGrowth * 10),
      runeRelicChance: difficulty.runeRelicChance,
      spawnInterval: Math.max(280, (1050 - (safeWave - 1) * 3.2 - tier * 52) / difficulty.pressure),
      intermission: WAVE_INTERMISSION_MS
    };
  }

  function autoUpgradeSlot(equipment = state.equipment, index = state.autoUpgradeIndex) {
    const minimum = Math.min(...UPGRADE_SLOTS.map((slot) => equipment[slot]));
    const candidates = UPGRADE_SLOTS.filter((slot) => equipment[slot] === minimum);
    return candidates[index % candidates.length];
  }

  function currentUpgradeSlot(mode = state.upgradeMode, equipment = state.equipment, autoIndex = state.autoUpgradeIndex) {
    return mode === 'auto' ? autoUpgradeSlot(equipment, autoIndex) : mode;
  }

  function forgeCostFor(slot, equipment = state.equipment) {
    const level = Math.max(1, Math.floor(Number(equipment[slot]) || 1));
    const earlySteps = Math.min(level - 1, FORGE_EARLY_LEVELS - 1);
    const lateSteps = Math.max(0, level - FORGE_EARLY_LEVELS);
    return FORGE_START + earlySteps * FORGE_LEVEL_STEP + lateSteps * FORGE_LATE_STEP;
  }

  function syncForgeTarget() {
    const slot = currentUpgradeSlot();
    state.forgeTarget = forgeCostFor(slot);
    return slot;
  }

  function upgradeSlotLabel(slot) {
    return { weapon: '攻击', armor: '防御', charm: '攻速' }[slot] || '攻击';
  }

  function updateUpgradeTargetUI() {
    const slot = syncForgeTarget();
    const label = upgradeSlotLabel(slot);
    const level = state.equipment[slot];
    $('#strategyHint').textContent = state.upgradeMode === 'auto'
      ? `自动 · 本次${label}`
      : `${label}优先 · 持续生效`;
    $('#forgeTargetName').textContent = `${label} LV.${level}→${level + 1}`;
    return slot;
  }

  // Deterministic balance model used by the browser regression suite. Every
  // successful group grants base reinforcement progress; coin and long groups
  // average another 35%. Ember charges amplify a portion of normal volleys.
  function simulateBalance(difficultyKey = 'master', efficiency = 1) {
    let forge = 0;
    const equipment = { weapon: 1, armor: 1, charm: 1 };
    let autoUpgradeIndex = 0;
    let firstFailure = null;
    let minimumMargin = Infinity;

    for (let wave = 1; wave <= MAX_WAVES; wave += 1) {
      const profile = getWaveProfile(wave, difficultyKey);
      forge += profile.requiredGroups * 1.35 * efficiency;
      while (true) {
        const slot = autoUpgradeSlot(equipment, autoUpgradeIndex);
        const cost = forgeCostFor(slot, equipment);
        if (forge < cost) break;
        forge -= cost;
        equipment[slot] += 1;
        autoUpgradeIndex += 1;
      }

      const power = weaponPower(equipment.weapon);
      const rate = 1000 / Math.max(220, 1050 - equipment.charm * 80);
      const emberFactor = 1 + (EMBER_DAMAGE_MULTIPLIER - 1) * .55 * efficiency;
      const bruteWeight = Math.min(.42, .28 + profile.tier * .014);
      const assaultWeight = 1 - .34 - bruteWeight;
      const advancedHp = 70 * .34 + 120 * assaultWeight + 210 * bruteWeight;
      const advancedDefense = 1 * .34 + 2 * assaultWeight + 13 * bruteWeight;
      const averageHp = 100 * (1 - profile.advancedChance) + advancedHp * profile.advancedChance;
      const averageDefense = 3 * (1 - profile.advancedChance) + advancedDefense * profile.advancedChance;
      const regularCount = profile.enemyCount - profile.bossCount;
      const regularDurability = regularCount * averageHp * profile.hpScale * (1 + averageDefense * profile.defenseScale * .02);
      const bossDurability = profile.bossCount * 1050 * profile.hpScale * (1 + 20 * profile.defenseScale * .02);
      const activeSeconds = Math.ceil(profile.enemyCount / profile.batchSize) * profile.spawnInterval / 1000
        + 85 / (3 * profile.speedScale);
      const idealOutput = power * rate * activeSeconds * 1.22 * emberFactor * efficiency;
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

  function renderBoard(matched = new Set(), invalidIndex = -1, phase = '', dropPlan = null) {
    const fragment = document.createDocumentFragment();
    els.board.classList.toggle('is-collapsing', phase === 'dropping');
    const boardGap = phase === 'dropping' ? Number.parseFloat(getComputedStyle(els.board).rowGap) || 4 : 0;
    state.board.forEach((type, index) => {
      const tile = document.createElement('button');
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      const dropRows = dropPlan?.get(index) || 0;
      const relicType = state.boardRelics[index];
      const relic = relicType ? RELICS[relicType] : null;
      tile.type = 'button';
      tile.className = `rune-tile ${type || ''}${relicType ? ` has-relic relic-${relicType}` : ''}`;
      if (state.selected === index) tile.classList.add('selected');
      if (matched.has(index)) tile.classList.add(phase === 'primed' ? 'match-primed' : 'matched');
      if (phase === 'initial') tile.classList.add('is-entering');
      if (phase === 'dropping' && dropRows > 0) {
        tile.classList.add('is-dropping');
        tile.dataset.dropRows = String(dropRows);
        tile.style.setProperty('--drop-offset', `calc(-${dropRows * 100}% - ${dropRows * boardGap}px)`);
      }
      if (index === invalidIndex) tile.classList.add('invalid');
      tile.dataset.index = String(index);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `${row + 1} 行 ${col + 1} 列，${TYPE_NAMES[type] || '空位'}${relic ? `，携带${relic.name}彩蛋` : ''}`);
      tile.style.animationDelay = phase === 'dropping' && dropRows > 0
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

  function findMatchGroups() {
    const groups = [];
    for (let row = 0; row < ROWS; row += 1) {
      let run = 1;
      for (let col = 1; col <= COLS; col += 1) {
        const current = col < COLS ? state.board[indexOf(row, col)] : null;
        const previous = state.board[indexOf(row, col - 1)];
        if (current && current === previous) run += 1;
        else {
          if (previous && run >= 3) groups.push({ type: previous, length: run });
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
          if (previous && run >= 3) groups.push({ type: previous, length: run });
          run = 1;
        }
      }
    }
    return groups;
  }

  function countMatchGroups() {
    return findMatchGroups().length;
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
    state.resolution = { kind: 'swap', phase: 'validate', first, second: index };
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
      state.resolution.phase = 'reverting';
      renderBoard(new Set(), index);
      await wait(280);
      if (sessionId !== state.sessionId) return;
      renderBoard();
      state.locked = false;
      state.resolution = null;
      flushPendingSave();
      return;
    }
    state.resolution = { kind: 'resolve', phase: 'matching' };
    await resolveBoard(sessionId);
    if (sessionId !== state.sessionId) return;
    state.locked = false;
    state.resolution = null;
    flushPendingSave();
  }

  async function resolveBoard(sessionId) {
    let chain = 1;
    let matches = findMatches();
    while (matches.size > 0) {
      state.combo = chain;
      updateCombo();
      const counts = { ember: 0, mana: 0, moss: 0, coin: 0 };
      const matchGroups = findMatchGroups();
      const groupCount = matchGroups.length;
      const matchedRelics = [...matches].map((index) => state.boardRelics[index]).filter(Boolean);
      matches.forEach((index) => { counts[state.board[index]] += 1; });

      if (chain > 1) await announceCascade(chain);
      if (sessionId !== state.sessionId) return;
      state.resolution = { kind: 'resolve', phase: 'primed' };
      renderBoard(matches, -1, 'primed');
      $('.board-frame').classList.add('is-charging');
      sound.tone(142 + chain * 24, .32, 'sine', .025);
      await wait(chain === 1 ? 430 : 520);
      if (sessionId !== state.sessionId) return;

      createRuneBurst(matches);
      state.resolution = { kind: 'resolve', phase: 'burst' };
      $('.board-frame').classList.remove('is-charging');
      $('.board-frame').classList.remove('is-bursting');
      void $('.board-frame').offsetWidth;
      $('.board-frame').classList.add('is-bursting');
      renderBoard(matches, -1, 'burst');
      sound.match(chain, counts);
      await wait(470);
      if (sessionId !== state.sessionId) return;

      applyRewards(counts, chain, matchGroups);
      matchedRelics.forEach((type) => activateRelic(type, 'board'));
      matches.forEach((index) => {
        state.board[index] = null;
        state.boardRelics[index] = null;
      });
      const dropPlan = collapseBoard();
      state.resolution = { kind: 'resolve', phase: 'dropping' };
      renderBoard(new Set(), -1, 'dropping', dropPlan);
      sound.tone(105, .09, 'triangle', .025, .19);
      await wait(560);
      if (sessionId !== state.sessionId) return;
      els.board.classList.remove('is-collapsing');
      matches = findMatches();
      chain += 1;
    }
    state.combo = 1;
    scheduleGameTask(updateCombo, 450);
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
    const scale = currentGameScale();
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
        particle.style.left = `${(rect.left - effectsRect.left + rect.width / 2) / scale}px`;
        particle.style.top = `${(rect.top - effectsRect.top + rect.height / 2) / scale}px`;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        particle.style.animationDelay = `${particleIndex * 18}ms`;
        els.boardEffects.appendChild(particle);
        scheduleGameTask(() => particle.remove(), 850);
      }
    });
  }

  function collapseBoard() {
    const dropPlan = new Map();
    for (let col = 0; col < COLS; col += 1) {
      const remaining = [];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const index = indexOf(row, col);
        const value = state.board[index];
        if (value) remaining.push({ type: value, relic: state.boardRelics[index], sourceRow: row });
      }
      const spawnedRows = ROWS - remaining.length;
      for (let row = ROWS - 1, cursor = 0; row >= 0; row -= 1, cursor += 1) {
        const index = indexOf(row, col);
        const tile = remaining[cursor];
        state.board[index] = tile?.type || randomType();
        state.boardRelics[index] = tile ? tile.relic : randomRuneRelic();
        const dropRows = tile ? row - tile.sourceRow : spawnedRows;
        if (dropRows > 0) dropPlan.set(index, dropRows);
      }
    }
    return dropPlan;
  }

  function pulseResource(type, text, mode = 'gain') {
    const legend = $(`.legend-item.${type}`);
    if (!legend) return;
    legend.classList.remove('is-gaining', 'is-spending');
    void legend.offsetWidth;
    legend.classList.add(mode === 'spend' ? 'is-spending' : 'is-gaining');
    const delta = document.createElement('em');
    delta.className = `resource-delta ${mode}`;
    delta.textContent = text;
    legend.appendChild(delta);
    scheduleGameTask(() => {
      delta.remove();
      legend.classList.remove('is-gaining', 'is-spending');
    }, 850);
  }

  function pulseForgeMeter() {
    const meter = $('.forge-meter-wrap');
    meter.classList.remove('is-gaining');
    void meter.offsetWidth;
    meter.classList.add('is-gaining');
    scheduleGameTask(() => meter.classList.remove('is-gaining'), 700);
  }

  function reinforcementReward(groups) {
    const base = groups.length;
    const longBonus = groups.reduce((sum, group) => sum + (group.length >= 5 ? 2 : group.length === 4 ? 1 : 0), 0);
    const coinBonus = groups.filter((group) => group.type === 'coin').length;
    return { base, longBonus, coinBonus, total: base + longBonus + coinBonus };
  }

  function applyRewards(counts, chain, matchGroups = []) {
    const multiplier = 1 + (chain - 1) * 0.6;
    const groupCount = matchGroups.length;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    state.waveMatches += groupCount;
    state.totalMatches += groupCount;
    state.score += Math.round(total * 12 * multiplier);
    if (counts.ember) {
      const previous = state.emberCharges;
      state.emberCharges = Math.min(emberCapacity(), state.emberCharges + counts.ember);
      const gain = state.emberCharges - previous;
      pulseResource('ember', gain ? `+${gain}` : '已满');
      showCombatToast(gain ? `余烬 +${gain}` : '余烬已满', 'damage', 26, 32);
    }
    if (counts.mana) {
      const gain = Math.round(counts.mana * 2 * multiplier);
      const previous = state.mana;
      state.mana = Math.min(manaCapacity(), state.mana + gain);
      const accepted = state.mana - previous;
      pulseResource('mana', accepted ? `+${accepted}` : '已满');
      showCombatToast(accepted ? `奥能 +${accepted}` : '奥能已满', 'mana', 39, 24);
    }
    if (counts.moss) {
      applyMossSupport(counts.moss * 14 * multiplier);
    }
    const reinforcement = reinforcementReward(matchGroups);
    state.forge += reinforcement.total;
    pulseResource('coin', `+${reinforcement.total}`);
    pulseForgeMeter();
    showCombatToast(`补强 +${reinforcement.total}`, 'forge', 73, 32);
    if (reinforcement.longBonus || reinforcement.coinBonus) {
      const bonuses = [reinforcement.longBonus ? `长连 +${reinforcement.longBonus}` : '', reinforcement.coinBonus ? `铸币 +${reinforcement.coinBonus}` : ''].filter(Boolean).join('、');
      addLog(`补强 +${reinforcement.total}（基础 ${reinforcement.base}，${bonuses}）`);
    }
    checkForge();
    if (chain > 1) addLog(`${chain} 连锁！奥能、防御能量与军功收益提升 ${Math.round((multiplier - 1) * 100)}%`);
    updateUI();
  }

  function checkForge() {
    while (true) {
      const slot = syncForgeTarget();
      const cost = forgeCostFor(slot);
      if (state.forge < cost) break;
      state.forge -= cost;
      const previousEmberCapacity = emberCapacity();
      const previousManaCapacity = manaCapacity();
      state.equipment[slot] += 1;
      if (state.upgradeMode === 'auto') state.autoUpgradeIndex += 1;
      let upgradeDetail = '';
      if (slot === 'weapon') {
        const capacityGain = emberCapacity() - previousEmberCapacity;
        upgradeDetail = `；余烬上限 +${capacityGain}`;
        pulseResource('ember', `上限 +${capacityGain}`);
        showCombatToast(`余烬上限 +${capacityGain}`, 'damage', 26, 32);
      } else if (slot === 'charm') {
        const capacityGain = manaCapacity() - previousManaCapacity;
        upgradeDetail = `；奥能上限 +${capacityGain}`;
        pulseResource('mana', `上限 +${capacityGain}`);
        showCombatToast(`奥能上限 +${capacityGain}`, 'mana', 39, 24);
      } else if (slot === 'armor') {
        const wallBefore = state.wall;
        state.wallMax += ARMOR_WALL_BONUS;
        state.wall = Math.min(state.wallMax, state.wall + ARMOR_WALL_BONUS);
        const restored = Math.max(0, Math.round(state.wall - wallBefore));
        upgradeDetail = `；耐久上限 +${ARMOR_WALL_BONUS}，护盾上限 +${ARMOR_SHIELD_BONUS}${restored ? `，同步修复 ${restored}` : ''}`;
        const wallStatus = $('.wall-status');
        wallStatus.classList.remove('is-upgraded');
        void wallStatus.offsetWidth;
        wallStatus.classList.add('is-upgraded');
        scheduleGameTask(() => wallStatus.classList.remove('is-upgraded'), 950);
        showCombatToast(`耐久上限 +${ARMOR_WALL_BONUS} · 护盾上限 +${ARMOR_SHIELD_BONUS}${restored ? ` · 修复 +${restored}` : ''}`, 'repair', 20, 48);
      }
      addLog(`消耗 ${cost} 点补强，${upgradeSlotLabel(slot)}从 LV.${state.equipment[slot] - 1} 升至 LV.${state.equipment[slot]}${upgradeDetail}${state.upgradeMode === 'auto' ? '；自动策略将重新选择目标' : ''}`);
      scheduleGameTask(() => pulseResource('coin', `-${cost}`, 'spend'), 180);
      celebrateEquipmentUpgrade(slot, cost);
    }
    syncForgeTarget();
  }

  function celebrateEquipmentUpgrade(slot, cost) {
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
    const capacityDetail = slot === 'armor'
      ? `耐久上限 +${ARMOR_WALL_BONUS} · 护盾上限 +${ARMOR_SHIELD_BONUS}`
      : slot === 'weapon' ? `余烬上限 +${EMBER_CAP_PER_WEAPON_LEVEL}` : `奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}`;
    $('#upgradeEquipmentLevel').textContent = `消耗 ${cost} 补强 · LV.${level} · ${state.upgradeMode === 'auto' ? '自动补强' : '优先升级'} · ${capacityDetail}`;
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
      scheduleGameTask(() => spark.remove(), 1050);
    }

    sound.play('forge', .48, .96);
    sound.tone(294, .22, 'triangle', .045, .02);
    sound.tone(392, .26, 'triangle', .045, .13);
    sound.tone(587, .34, 'sine', .04, .26);
    sound.tone(784, .42, 'sine', .03, .41);
    scheduleGameTask(() => {
      banner.classList.remove('is-visible');
      card.classList.remove('is-upgraded');
    }, 1950);
  }

  function equipmentName(slot) {
    const names = EQUIPMENT[slot];
    return names[Math.min(state.equipment[slot] - 1, names.length - 1)];
  }

  function weaponPower(level) {
    const steps = Math.max(0, Math.floor(level) - 1);
    const scaledSteps = Math.min(19, steps);
    const overflow = Math.max(0, steps - scaledSteps);
    return Math.round(27 + 50 * scaledSteps * (1.07 ** scaledSteps) + overflow * 260);
  }

  function totalPower() {
    return weaponPower(state.equipment.weapon);
  }

  function emberCapacity(level = state.equipment.weapon) {
    return EMBER_BASE_CAP + Math.max(0, Math.floor(Number(level) || 1) - 1) * EMBER_CAP_PER_WEAPON_LEVEL;
  }

  function manaCapacity(level = state.equipment.charm) {
    return MANA_BASE_CAP + Math.max(0, Math.floor(Number(level) || 1) - 1) * MANA_CAP_PER_CHARM_LEVEL;
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

  function wallDefenseForLevel(level = 1) {
    return Math.min(72, 6 + (Math.max(1, Math.floor(Number(level) || 1)) - 1) * 6);
  }

  function wallDefense() {
    return wallDefenseForLevel(state.equipment.armor);
  }

  function shieldCapacity(wallMax = state.wallMax) {
    return Math.max(1, Math.round(wallMax * SHIELD_MAX_RATIO));
  }

  function applyMossSupport(amount, announce = true) {
    const offered = Math.max(0, Math.round(Number(amount) || 0));
    const restored = Math.min(offered, Math.max(0, state.wallMax - state.wall));
    state.wall += restored;
    state.repaired += restored;
    const shieldOffered = offered - restored;
    const shieldGained = Math.min(shieldOffered, Math.max(0, shieldCapacity() - state.shield));
    state.shield += shieldGained;
    const accepted = restored + shieldGained;
    if (announce) {
      const delta = [restored ? `耐久 +${restored}` : '', shieldGained ? `护盾 +${shieldGained}` : ''].filter(Boolean).join(' · ');
      pulseResource('moss', accepted ? `+${accepted}` : '已满');
      showCombatToast(delta || '能量已满', 'shield', 20, 53);
      addLog(delta ? `防御能量分配：${delta}` : '防御能量溢散：耐久与护盾均已达到上限');
    }
    return {
      offered,
      accepted,
      energyAccepted: accepted,
      energyCapacity: shieldCapacity(),
      restored,
      shieldGained,
      shield: state.shield,
      shieldMax: shieldCapacity(),
      wall: state.wall
    };
  }

  function breachDamageProfile(type = 'raider', wave = 1, difficulty = 'rookie', armorLevel = 1) {
    const stats = BASE_ENEMY_STATS[type] || BASE_ENEMY_STATS.raider;
    const profile = getWaveProfile(wave, difficulty);
    const safeArmorLevel = Math.max(1, Math.floor(Number(armorLevel) || 1));
    const defense = wallDefenseForLevel(safeArmorLevel);
    const wallMax = 1120 + (safeArmorLevel - 1) * ARMOR_WALL_BONUS;
    const displayedDamage = Math.round(stats.damage * profile.damageScale);
    const finalDamage = Math.max(1, Math.round(displayedDamage * (1 - defense / 100)));
    return {
      type,
      wave: profile.wave,
      difficulty,
      armorLevel: safeArmorLevel,
      defense,
      wallMax,
      displayedDamage,
      finalDamage,
      hitsToBreak: Math.ceil(wallMax / finalDamage)
    };
  }

  function updateFieldHud() {
    $('#hudAttack').textContent = totalPower();
    $('#hudDefense').textContent = `${wallDefense()}%`;
    $('#hudSpeed').textContent = attackRate();
  }

  function setUpgradeMode(mode, announce = true) {
    if (!['auto', ...UPGRADE_SLOTS].includes(mode)) return;
    state.upgradeMode = mode;
    const slot = updateUpgradeTargetUI();
    document.querySelectorAll('.strategy-button').forEach((button) => {
      const active = button.dataset.upgrade === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (state.started && announce) {
      sound.play('click', .14, 1.08);
      addLog(`${mode === 'auto' ? '自动策略本次选择' : '锻造目标切换为'}「${upgradeSlotLabel(slot)}」，LV.${state.equipment[slot]}→${state.equipment[slot] + 1} 需要 ${state.forgeTarget} 补强`);
      if (!state.paused) checkForge();
      updateUI();
    }
  }

  function updateCombo() {
    $('#comboValue').textContent = `×${state.combo}`;
    $('#comboBadge').classList.toggle('is-hot', state.combo > 1);
  }

  function updateSoundButton() {
    els.soundButton.classList.toggle('is-muted', sound.muted);
    els.soundButton.setAttribute('aria-label', sound.muted ? '开启音效' : '关闭音效');
    els.soundButton.removeAttribute('title');
    els.soundButton.querySelector('span').textContent = sound.muted ? '×' : '♪';
  }

  function updateMusicButton() {
    const track = music.currentTrack();
    const nextTrack = MUSIC_TRACKS[(music.trackIndex + 1) % MUSIC_TRACKS.length];
    const action = music.enabled ? '关闭' : '开启';
    const position = `第 ${music.trackIndex + 1} / ${MUSIC_TRACKS.length} 首`;
    const trackSummary = `${position}；当前 ${track.title}；下一首 ${nextTrack.title}`;
    els.musicButton.classList.toggle('is-muted', !music.enabled);
    els.musicButton.classList.toggle('is-active', music.playing);
    els.musicButton.setAttribute('aria-pressed', String(music.enabled));
    els.musicButton.setAttribute('aria-label', `${action} MIDI 军乐曲单；${trackSummary}`);
    els.musicButton.setAttribute('title', `${action} MIDI 军乐\n${trackSummary}`);
    els.nextTrackButton.setAttribute('aria-label', `切换下一首；${trackSummary}`);
    els.nextTrackButton.setAttribute('title', trackSummary);
    $('#musicTrackCount').textContent = position;
    $('#musicCurrentTitle').textContent = track.title;
    $('#musicNextTitle').textContent = nextTrack.title;
    $('.music-controls').setAttribute('aria-label', `MIDI 军乐控制；${trackSummary}`);
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
    $('#emberValue').textContent = `${state.emberCharges} / ${emberCapacity()}`;
    $('#manaValue').textContent = `${state.mana} / ${manaCapacity()}`;
    $('#energyValue').textContent = `${Math.ceil(state.shield)} / ${shieldCapacity()}`;
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
    $('#shieldRailValue').textContent = Math.ceil(state.shield);
    $('#wallMeter').style.width = `${Math.max(0, state.wall / state.wallMax) * 100}%`;
    $('#shieldMeter').style.width = `${Math.max(0, state.shield / shieldCapacity()) * 100}%`;
    updateUpgradeTargetUI();
    $('#forgeMeter').style.width = `${Math.min(100, state.forge / state.forgeTarget * 100)}%`;
    $('#forgeProgressText').textContent = `${state.forge} / ${state.forgeTarget}`;
    els.volleyButton.disabled = state.mana < MANA_CAST_COST || state.paused || state.gameOver;

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
    refreshContextTooltip();
  }

  function updateTargetDossier() {
    const enteredEnemies = state.enemies.filter((enemy) => enemy.entered);
    if (!enteredEnemies.length) {
      els.targetDossier.classList.add('is-empty');
      els.targetDossier.classList.remove('is-alert');
      $('#targetName').textContent = state.enemies.length ? '目标尚在场外' : '前线侦察中';
      $('#targetRole').textContent = state.enemies.length ? `无法锁定 · ${state.enemies.length} 个敌军正在进场` : '尚未发现敌军';
      $('#targetAttack').textContent = '—';
      $('#targetDefense').textContent = '—';
      $('#targetHealth').textContent = '—';
      $('#targetHealthMeter').style.width = '0%';
      return;
    }
    const target = enteredEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest);
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
    saveProgress('wave');
  }

  function createEnemyElement(enemy) {
    const el = document.createElement('div');
    el.className = `enemy ${enemy.type}${enemy.relic ? ` relic-carrier relic-${enemy.relic}` : ''}`;
    el.dataset.id = enemy.id;
    el.innerHTML = `<div class="enemy-hp"><span></span></div><span class="enemy-role-mark" aria-hidden="true">${enemy.roleIcon}</span><div class="enemy-body"><i class="horns"></i></div>${enemy.relic ? `<span class="relic-mark" title="携带${RELICS[enemy.relic].name}">${RELICS[enemy.relic].icon}</span>` : ''}<span class="enemy-stats-mini"><b>伤 ${enemy.damage}</b><b>防 ${enemy.defense}</b></span><span class="enemy-label">${enemy.name}</span>`;
    els.enemiesLayer.appendChild(el);
    return el;
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
      relic, entered: false, targetableAt: Infinity, slowUntil: 0, armorBreakUntil: 0,
      x: 105 + Math.random() * 4, y: 60 + Math.random() * 23
    };
    enemy.el = createEnemyElement(enemy);
    state.enemies.push(enemy);
    positionEnemy(enemy);
    state.waveQueue -= 1;
    if (scheduledBoss) state.waveBossesRemaining -= 1;
    state.waveSpawned += 1;
    updateUI();
    return enemy;
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

  function battlefieldAnchor(selector, fallbackX, fallbackY, container = els.battlefield) {
    const anchor = $(selector);
    if (!anchor) return { x: fallbackX, y: fallbackY };
    const fieldRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const scale = currentGameScale();
    return {
      x: (anchorRect.left + anchorRect.width / 2 - fieldRect.left) / scale,
      y: (anchorRect.top + anchorRect.height / 2 - fieldRect.top) / scale
    };
  }

  function aimTurret(enemy) {
    if (!enemy) {
      els.fortress.style.setProperty('--aim-angle', '-0.08rad');
      return;
    }
    const fieldRect = els.battlefield.getBoundingClientRect();
    const scale = currentGameScale();
    const fieldWidth = fieldRect.width / scale;
    const fieldHeight = fieldRect.height / scale;
    const pivot = battlefieldAnchor('.turret-pivot', fieldWidth * .12, fieldHeight * .42);
    const enemyRect = enemy.el.getBoundingClientRect();
    const endX = (enemyRect.left + enemyRect.width / 2 - fieldRect.left) / scale;
    const endY = (enemyRect.top + enemyRect.height * .55 - fieldRect.top) / scale;
    els.fortress.style.setProperty('--aim-angle', `${Math.atan2(endY - pivot.y, endX - pivot.x)}rad`);
  }

  function fireAt(enemy, now) {
    if (!enemy || enemy.hp <= 0) return;
    state.attackReadyAt = now + attackDelay();
    const shots = volleySize();
    const emberCharged = state.emberCharges > 0;
    if (emberCharged) {
      state.emberCharges -= 1;
      pulseResource('ember', '-1', 'spend');
      showCombatToast('余烬齐射 ×1.25', 'damage', 24, 38);
      updateUI();
    }
    const targets = [...state.enemies].sort((first, second) => first.x - second.x);
    els.fortress.classList.add('is-firing');
    els.fortress.classList.toggle('is-ember-firing', emberCharged);
    scheduleGameTask(() => els.fortress.classList.remove('is-firing'), 190);
    if (emberCharged) scheduleGameTask(() => els.fortress.classList.remove('is-ember-firing'), 240);

    for (let index = 0; index < shots; index += 1) {
      const target = targets[Math.min(index, targets.length - 1)] || enemy;
      const crit = Math.random() < .05 + state.equipment.charm * .012;
      const powerScale = index === 0 ? 1 : SECONDARY_BOLT_POWER;
      const damage = Math.round(totalPower() * powerScale * (emberCharged ? EMBER_DAMAGE_MULTIPLIER : 1) * (crit ? 1.85 : 1));
      launchProjectile(target, damage, crit, now, index, shots, emberCharged);
    }
    return { shots, emberCharged };
  }

  function launchProjectile(enemy, damage, crit, now, shotIndex = 0, shotCount = 1, emberCharged = false) {
    sound.tone(690 + shotIndex * 42 + Math.random() * 60, .055, 'sawtooth', .012);
    const fieldRect = els.projectilesLayer.getBoundingClientRect();
    const scale = currentGameScale();
    const fieldWidth = fieldRect.width / scale;
    const fieldHeight = fieldRect.height / scale;
    const muzzle = battlefieldAnchor('.muzzle-anchor', fieldWidth * .19, fieldHeight * .42, els.projectilesLayer);
    const startX = muzzle.x;
    const fanOffset = (shotIndex - (shotCount - 1) / 2) * 9;
    const startY = muzzle.y;
    const enemyRect = enemy.el.getBoundingClientRect();
    const initialEndX = (enemyRect.left + enemyRect.width / 2 - fieldRect.left) / scale;
    const initialDistance = Math.abs(initialEndX - startX);
    const travelTime = Math.min(460, Math.max(160, initialDistance / 1.2));
    const speedScale = enemy.slowUntil > now ? .55 : 1;
    const predictedTravel = fieldWidth * enemy.speed * speedScale * travelTime / 100000;
    const endX = Math.max(fieldWidth * .15, initialEndX - predictedTravel);
    const endY = (enemyRect.top + enemyRect.height * .55 - fieldRect.top) / scale + fanOffset * .18;
    const dx = endX - startX;
    const dy = endY - startY;
    const projectile = document.createElement('i');
    projectile.className = `projectile${shotIndex > 0 ? ' is-volley-secondary' : ''}${emberCharged ? ' is-ember-charged' : ''}${state.combatBuff ? ` is-${state.combatBuff.type}` : ''}`;
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
    scheduleGameTask(() => {
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
    scheduleGameTask(() => impact.remove(), 720);
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
    scheduleGameTask(() => enemy.el.remove(), 360);
    state.kills += 1;
    const baseScore = enemy.type === 'boss' ? 800 : enemy.type === 'brute' ? 110 : enemy.type === 'assault' ? 90 : enemy.type === 'swift' ? 75 : 55;
    state.score += Math.round(baseScore * DIFFICULTIES[state.difficulty].scoreScale);
    if (enemy.relic) activateRelic(enemy.relic);
    if (enemy.type === 'boss') {
      state.forge += 8;
      pulseResource('coin', '+8');
      pulseForgeMeter();
      showCombatToast('Boss 补强 +8', 'forge', enemy.x, enemy.y);
      checkForge();
      addLog('攻城巨兽倒下，获得 8 点额外补强');
    }
    updateUI();
  }

  function enemyBreaches(enemy) {
    const position = state.enemies.indexOf(enemy);
    if (position < 0) return;
    state.enemies.splice(position, 1);
    enemy.el.classList.add('is-self-destructing');
    scheduleGameTask(() => enemy.el.remove(), 440);
    const defense = wallDefense();
    const damage = Math.max(1, Math.round(enemy.damage * (1 - defense / 100)));
    const shieldAbsorbed = Math.min(state.shield, damage);
    state.shield -= shieldAbsorbed;
    const wallDamage = damage - shieldAbsorbed;
    state.wall -= wallDamage;
    createImpactEffect(Math.max(13, enemy.x), enemy.y, 'self-destruct');
    sound.play('wall', .52, enemy.type === 'boss' ? .62 : .8);
    sound.tone(enemy.type === 'boss' ? 46 : 64, .42, 'sawtooth', .052);
    sound.tone(enemy.type === 'boss' ? 78 : 106, .26, 'square', .034, .06);
    els.fortress.classList.remove('is-hit', 'is-breached', 'is-shielded');
    void els.fortress.offsetWidth;
    els.fortress.classList.add(wallDamage ? 'is-breached' : 'is-shielded');
    if (shieldAbsorbed) showCombatToast(`护盾 -${Math.round(shieldAbsorbed)}`, 'shield', 22, 43);
    if (wallDamage) showCombatToast(`耐久 -${Math.round(wallDamage)}`, 'damage', 18, 53);
    addLog(`${enemy.label}抵达终点后自爆：减伤后 ${damage} 点，护盾吸收 ${Math.round(shieldAbsorbed)}，耐久损失 ${Math.round(wallDamage)}`);
    updateUI();
    if (state.wall <= 0) endGame();
  }

  function castVolley() {
    if (state.mana < MANA_CAST_COST || state.paused || state.gameOver) return;
    state.mana -= MANA_CAST_COST;
    pulseResource('mana', `-${MANA_CAST_COST}`, 'spend');
    showCombatToast(`奥能 -${MANA_CAST_COST}`, 'mana', 39, 24);
    sound.tone(220, .35, 'sine', .045);
    sound.tone(440, .38, 'triangle', .04, .08);
    sound.tone(660, .42, 'sine', .035, .16);
    const wave = document.createElement('div');
    wave.className = 'arcane-wave';
    els.battlefield.appendChild(wave);
    scheduleGameTask(() => wave.remove(), 600);
    const damage = Math.round(42 + totalPower() * .65);
    state.enemies.filter((enemy) => enemy.entered)
      .forEach((enemy) => damageEnemy(enemy, damage, false, { secondary: true, effect: 'arcane' }));
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
        if (!enemy.entered && enemy.x <= ENEMY_ENTRY_X) {
          enemy.entered = true;
          enemy.targetableAt = now + TARGET_ACQUIRE_DELAY;
          updateUI();
        }
        if (enemy.x <= 15) enemyBreaches(enemy);
        else positionEnemy(enemy);
      });
      const enteredEnemies = state.enemies.filter((enemy) => enemy.entered);
      const target = enteredEnemies.length
        ? enteredEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
        : null;
      const targetableEnemies = enteredEnemies.filter((enemy) => now >= enemy.targetableAt);
      const firingTarget = targetableEnemies.length
        ? targetableEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
        : null;
      aimTurret(firingTarget || target);
      if (firingTarget && now >= state.attackReadyAt) {
        fireAt(firingTarget, now);
      }
      if (state.waveQueue === 0 && state.enemies.length === 0) {
        if (!state.intermissionUntil) {
          if (state.wave >= MAX_WAVES) {
            completeVictory();
            return;
          }
          state.intermissionUntil = now + WAVE_INTERMISSION_MS;
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
    scheduleGameTask(() => toast.remove(), 900);
  }

  function addLog(message) {
    const line = document.createElement('p');
    line.innerHTML = `<span>军情</span> ${message}`;
    els.battleLog.prepend(line);
    while (els.battleLog.children.length > 3) els.battleLog.lastElementChild.remove();
  }

  function togglePause(force) {
    if (!state.started || state.gameOver) return;
    const manual = typeof force !== 'boolean';
    if (manual) sound.play('click', .16, state.paused ? 1.12 : .88);
    const nextPaused = typeof force === 'boolean' ? force : !state.paused;
    if (nextPaused === state.paused) return;
    const now = performance.now();
    if (nextPaused) {
      closePlaySegment(now);
      state.paused = true;
      state.pausedAt = now;
      pauseGameTasks(now);
    } else {
      const pausedDuration = state.pausedAt ? Math.max(0, now - state.pausedAt) : 0;
      if (pausedDuration) {
        if (state.nextSpawnAt) state.nextSpawnAt += pausedDuration;
        if (state.attackReadyAt) state.attackReadyAt += pausedDuration;
        if (state.intermissionUntil) state.intermissionUntil += pausedDuration;
        state.enemies.forEach((enemy) => {
          if (enemy.targetableAt) enemy.targetableAt += pausedDuration;
          if (enemy.slowUntil) enemy.slowUntil += pausedDuration;
          if (enemy.armorBreakUntil) enemy.armorBreakUntil += pausedDuration;
        });
      }
      state.paused = false;
      state.pausedAt = 0;
      state.playSegmentStartedAt = now;
      state.lastFrame = now;
      resumeGameTasks();
      checkForge();
    }
    els.pauseButton.querySelector('span').textContent = state.paused ? '▶' : 'Ⅱ';
    els.pauseButton.setAttribute('aria-label', state.paused ? '继续游戏' : '暂停游戏');
    els.boardLock.classList.toggle('is-visible', state.paused);
    els.boardLock.querySelector('span').textContent = state.paused ? '战局暂停 · 战报已保存' : '战局暂停';
    els.gameShell.classList.toggle('is-paused', state.paused);
    if (state.paused) {
      const saved = saveProgress('pause');
      music.stop();
      if (manual && !saved) els.boardLock.querySelector('span').textContent = '战局暂停 · 正在保存';
    } else {
      music.start();
    }
    updateUI();
  }

  function resetGame() {
    cancelAnimationFrame(state.animationId);
    music.stop();
    sound.init();
    clearSavedProgress();
    state.sessionId += 1;
    clearGameTasks();
    state.selected = null; state.locked = false; state.started = true; state.paused = false; state.gameOver = false;
    state.resolution = null; state.pausedAt = 0; state.activePlayMs = 0; state.settlementRecorded = false; state.rulesWasPaused = false; state.leaderboardWasPaused = false;
    state.difficulty = state.selectedDifficulty;
    state.score = 0; state.kills = 0; state.wave = 1; state.emberCharges = 0; state.mana = 0; state.shield = 0; state.repaired = 0;
    state.forge = 0; state.forgeTarget = FORGE_START; state.equipment = { weapon: 1, armor: 1, charm: 1 };
    state.upgradeMode = 'auto'; state.autoUpgradeIndex = 0; state.combatBuff = null; state.combatBuffQueue = [];
    state.wallMax = 1120; state.wall = 1120; state.combo = 1; state.enemyId = 0;
    state.waveQueue = 0; state.waveTotal = 0; state.waveSpawned = 0; state.waveBossesRemaining = 0;
    state.waveMatches = 0; state.totalMatches = 0; state.waveProfile = null; state.intermissionUntil = 0;
    state.attackReadyAt = 0; state.lastFrame = performance.now(); state.playSegmentStartedAt = state.lastFrame; state.lastUiAt = 0; state.pendingSaveReason = null;
    clearBattleLayers();
    buildBoard();
    renderBoard(new Set(), -1, 'initial');
    updateCombo();
    els.gameOverModal.classList.remove('is-open');
    els.victoryModal.classList.remove('is-open');
    els.resumeModal.classList.remove('is-open');
    els.rulesModal.classList.remove('is-open');
    els.leaderboardModal.classList.remove('is-open');
    els.introModal.classList.remove('is-open');
    els.introModal.classList.remove('is-first-visit');
    els.boardLock.classList.remove('is-visible');
    els.boardLock.querySelector('span').textContent = '战局暂停';
    els.gameShell.classList.remove('is-paused');
    els.pauseButton.querySelector('span').textContent = 'Ⅱ';
    setUpgradeMode('auto', false);
    sound.play('click', .24, 1.2);
    startWave(1);
    updateUI();
    state.animationId = requestAnimationFrame(gameLoop);
    music.start();
  }

  function endGame() {
    if (state.gameOver) return;
    const now = performance.now();
    closePlaySegment(now);
    state.sessionId += 1;
    state.gameOver = true;
    state.paused = true;
    state.pausedAt = now;
    state.wall = 0;
    clearGameTasks();
    els.gameShell.classList.add('is-paused');
    music.stop();
    clearSavedProgress();
    renderFailureSettlement(recordSettlement(false));
    els.gameOverModal.classList.add('is-open');
    sound.tone(164, .38, 'sawtooth', .04);
    sound.tone(116, .52, 'sawtooth', .035, .24);
    sound.tone(73, .7, 'sine', .04, .52);
    updateUI();
  }

  function completeVictory() {
    if (state.gameOver) return;
    const now = performance.now();
    closePlaySegment(now);
    state.sessionId += 1;
    state.gameOver = true;
    state.paused = true;
    state.pausedAt = now;
    clearGameTasks();
    els.gameShell.classList.add('is-paused');
    music.stop();
    clearSavedProgress();
    state.score += Math.round(10000 * DIFFICULTIES[state.difficulty].scoreScale);
    renderVictorySettlement(recordSettlement(true));
    els.victoryModal.classList.add('is-open');
    sound.tone(392, .28, 'triangle', .04);
    sound.tone(587, .42, 'triangle', .045, .16);
    sound.tone(784, .7, 'sine', .04, .36);
    updateUI();
  }

  function returnToBriefing() {
    cancelAnimationFrame(state.animationId);
    music.stop();
    clearSavedProgress();
    state.sessionId += 1;
    clearGameTasks();
    state.started = false;
    state.paused = true;
    state.gameOver = false;
    state.rulesWasPaused = false;
    state.leaderboardWasPaused = false;
    state.resolution = null;
    state.playSegmentStartedAt = 0;
    els.gameShell.classList.remove('is-paused');
    els.gameOverModal.classList.remove('is-open');
    els.victoryModal.classList.remove('is-open');
    els.rulesModal.classList.remove('is-open');
    els.leaderboardModal.classList.remove('is-open');
    els.introModal.classList.add('is-open', 'is-first-visit');
    $('#startButton small').textContent = `部署 · ${DIFFICULTIES[state.selectedDifficulty].subtitle}`;
  }

  function selectDifficulty(key, announce = true) {
    if (!DIFFICULTIES[key]) return;
    state.selectedDifficulty = key;
    writeStorage(STORAGE_KEYS.difficulty, key);
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

  function openRules() {
    if (els.rulesModal.classList.contains('is-open')) return;
    rulesReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.rulesWasPaused = state.paused;
    if (state.started && !state.gameOver) togglePause(true);
    els.rulesModal.classList.add('is-open');
    window.setTimeout(() => $('#rulesClose').focus({ preventScroll: true }), 120);
  }

  function closeRules() {
    if (!els.rulesModal.classList.contains('is-open')) return;
    els.rulesModal.classList.remove('is-open');
    if (state.started && !state.gameOver && !state.rulesWasPaused) togglePause(false);
    if (rulesReturnFocus?.isConnected) rulesReturnFocus.focus();
    rulesReturnFocus = null;
  }

  function openLeaderboard() {
    if (els.leaderboardModal.classList.contains('is-open')) return;
    leaderboardReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.leaderboardWasPaused = state.paused;
    if (state.started && !state.gameOver) togglePause(true);
    settlementHistory = readHistory();
    currentSettlementId = null;
    activeHistoryFilter = 'all';
    mountHistoryBoard('#leaderboardHistorySlot');
    renderHistory();
    els.leaderboardModal.classList.add('is-open');
    window.setTimeout(() => $('#leaderboardClose').focus({ preventScroll: true }), 120);
  }

  function closeLeaderboard() {
    if (!els.leaderboardModal.classList.contains('is-open')) return;
    els.leaderboardModal.classList.remove('is-open');
    if (state.started && !state.gameOver && !state.leaderboardWasPaused) togglePause(false);
    if (leaderboardReturnFocus?.isConnected) leaderboardReturnFocus.focus();
    leaderboardReturnFocus = null;
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
    els.fullscreenButton.removeAttribute('title');
    els.fullscreenButton.classList.toggle('is-active', active);
    scheduleGameFit();
  }

  els.board.addEventListener('click', (event) => {
    const tile = event.target.closest('.rune-tile');
    if (tile) handleTile(Number(tile.dataset.index));
  });
  $('#startButton').addEventListener('click', resetGame);
  $('#resumeButton').addEventListener('click', () => restoreProgress());
  $('#discardSaveButton').addEventListener('click', discardSavedProgress);
  $('#restartButton').addEventListener('click', resetGame);
  $('#victoryRestartButton').addEventListener('click', returnToBriefing);
  $('#introClose').addEventListener('click', closeCampaignOptions);
  $('#helpButton').addEventListener('click', openCampaignOptions);
  $('#rulesButton').addEventListener('click', openRules);
  $('#rulesClose').addEventListener('click', closeRules);
  els.rulesModal.addEventListener('click', (event) => {
    if (event.target === els.rulesModal) closeRules();
  });
  els.leaderboardButton.addEventListener('click', openLeaderboard);
  $('#leaderboardClose').addEventListener('click', closeLeaderboard);
  els.leaderboardModal.addEventListener('click', (event) => {
    if (event.target === els.leaderboardModal) closeLeaderboard();
  });
  document.querySelectorAll('.difficulty-card').forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
  });
  document.querySelectorAll('.strategy-button').forEach((button) => {
    button.addEventListener('click', () => setUpgradeMode(button.dataset.upgrade));
  });
  document.querySelectorAll('[data-history-filter]').forEach((button) => {
    button.addEventListener('click', () => setHistoryFilter(button.dataset.historyFilter));
  });
  els.pauseButton.addEventListener('click', () => togglePause());
  els.musicButton.addEventListener('click', () => music.toggle());
  els.nextTrackButton.addEventListener('click', () => music.skip());
  els.soundButton.addEventListener('click', () => sound.toggle());
  els.fullscreenButton.addEventListener('click', toggleFullscreen);
  els.volleyButton.addEventListener('click', castVolley);
  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('[data-tooltip-key]');
    if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
    showContextTooltip(target);
  });
  document.addEventListener('pointerout', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('[data-tooltip-key]');
    if (!target || target !== contextTooltipTarget || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
    hideContextTooltip();
  });
  document.addEventListener('focusin', (event) => {
    if (event.target instanceof Element && event.target.matches('[data-tooltip-key]')) showContextTooltip(event.target);
  });
  document.addEventListener('focusout', (event) => {
    if (event.target === contextTooltipTarget && !(event.relatedTarget instanceof Node && event.target.contains(event.relatedTarget))) hideContextTooltip();
  });
  document.addEventListener('click', hideContextTooltip, true);
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'q') castVolley();
    if (event.key === 'Escape' && els.leaderboardModal.classList.contains('is-open')) closeLeaderboard();
    else if (event.key === 'Escape' && els.rulesModal.classList.contains('is-open')) closeRules();
    else if (event.key === 'Escape' && state.started && els.introModal.classList.contains('is-open')) closeCampaignOptions();
    else if (event.key === 'Escape' && state.started) togglePause();
  });
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.started && !state.gameOver) togglePause(true);
  });
  window.addEventListener('pagehide', () => saveProgress('leave'));
  window.addEventListener('resize', scheduleGameFit, { passive: true });
  window.addEventListener('resize', positionContextTooltip, { passive: true });
  window.addEventListener('scroll', positionContextTooltip, { passive: true, capture: true });
  window.addEventListener('orientationchange', scheduleGameFit, { passive: true });
  window.addEventListener('load', scheduleGameFit, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(scheduleGameFit);

  if (new URLSearchParams(window.location.search).has('testMode')) {
    window.__runeRampartTest = {
      grantForge(amount) {
        state.forge += Number(amount) || state.forgeTarget;
        checkForge();
        updateUI();
      },
      setEmberCharges(amount = 0) {
        state.emberCharges = Math.max(0, Math.min(emberCapacity(), Math.floor(Number(amount) || 0)));
        updateUI();
      },
      grantMana(amount = 18) {
        state.mana = Math.min(manaCapacity(), state.mana + Math.max(0, Math.floor(Number(amount) || MANA_CAST_COST)));
        updateUI();
      },
      reinforcementReward(groups = []) {
        return reinforcementReward(groups);
      },
      saveProgress(reason = 'test') {
        saveProgress(reason);
        return readSavedProgress();
      },
      savedProgress() {
        return readSavedProgress();
      },
      history() {
        return readHistory();
      },
      setHistory(records = []) {
        settlementHistory = writeHistory(records);
        return settlementHistory;
      },
      forceFailure(values = {}) {
        state.started = true;
        state.gameOver = false;
        state.paused = false;
        state.pausedAt = 0;
        state.settlementRecorded = false;
        state.difficulty = DIFFICULTIES[values.difficulty] ? values.difficulty : state.difficulty;
        state.wave = Math.floor(safeNumber(values.wave, state.wave, 1, MAX_WAVES));
        state.score = Math.floor(safeNumber(values.score, state.score, 0));
        state.kills = Math.floor(safeNumber(values.kills, state.kills, 0));
        state.totalMatches = Math.floor(safeNumber(values.totalMatches, state.totalMatches, 0));
        state.repaired = Math.floor(safeNumber(values.repaired, state.repaired, 0));
        state.activePlayMs = safeNumber(values.activePlayMs, state.activePlayMs, 0);
        state.playSegmentStartedAt = 0;
        endGame();
        return readHistory();
      },
      musicState() {
        const track = music.currentTrack();
        return {
          enabled: music.enabled,
          playing: music.playing,
          trackIndex: music.trackIndex,
          trackTitle: track.title,
          trackSource: track.source,
          trackCount: MUSIC_TRACKS.length,
          playlist: MUSIC_TRACKS.map(({ title, source, bpm, melody, bass, harmony }) => ({
            title,
            source,
            bpm,
            steps: melody.length,
            voicesAligned: melody.length === bass.length && melody.length === harmony.length
          }))
        };
      },
      advanceMusicTrack() {
        const track = music.advanceTrack(true);
        return { trackIndex: music.trackIndex, trackTitle: track.title };
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
      clearEnemies() {
        state.enemies.forEach((enemy) => enemy.el.remove());
        state.enemies = [];
        state.waveQueue = 0;
        state.waveSpawned = state.waveTotal;
        updateUI();
      },
      spawnEnemy(type = 'assault', relic = null) {
        if (!ENEMY_NAMES[type]) return;
        state.waveQueue += 1;
        const enemy = spawnEnemy(type, RELICS[relic] ? relic : null);
        return enemy ? { id: enemy.id, hp: enemy.hp, name: enemy.name, entered: enemy.entered, x: enemy.x } : null;
      },
      breachEnemy(type = 'assault') {
        if (!ENEMY_NAMES[type]) return null;
        state.wall = state.wallMax;
        state.waveQueue += 1;
        const enemy = spawnEnemy(type, null);
        if (!enemy) return null;
        enemy.x = 15;
        enemy.entered = true;
        enemy.targetableAt = performance.now();
        positionEnemy(enemy);
        const wallBefore = state.wall;
        const shieldBefore = state.shield;
        const baseDamage = enemy.damage;
        const defense = wallDefense();
        const expectedDamage = Math.max(1, Math.round(baseDamage * (1 - defense / 100)));
        const expectedShieldAbsorb = Math.min(shieldBefore, expectedDamage);
        const expectedWallDamage = expectedDamage - expectedShieldAbsorb;
        enemyBreaches(enemy);
        return {
          id: enemy.id,
          name: enemy.name,
          baseDamage,
          defense,
          expectedDamage,
          expectedShieldAbsorb,
          expectedWallDamage,
          actualShieldAbsorb: shieldBefore - state.shield,
          actualWallDamage: wallBefore - state.wall,
          wallBefore,
          wallAfter: state.wall,
          shieldBefore,
          shieldAfter: state.shield,
          removedFromBattle: !state.enemies.includes(enemy),
          selfDestructing: enemy.el.classList.contains('is-self-destructing')
        };
      },
      setDefenseState(wall = state.wallMax, shield = 0) {
        state.wall = safeNumber(wall, state.wallMax, 0, state.wallMax);
        state.shield = safeNumber(shield, 0, 0, shieldCapacity());
        updateUI();
        return { wall: state.wall, wallMax: state.wallMax, shield: state.shield, shieldMax: shieldCapacity() };
      },
      grantMossSupport(amount = 42) {
        const result = applyMossSupport(amount);
        updateUI();
        return result;
      },
      enterAllEnemies() {
        const now = performance.now();
        state.enemies.forEach((enemy) => {
          enemy.x = Math.min(enemy.x, ENEMY_ENTRY_X);
          enemy.entered = true;
          enemy.targetableAt = now;
          positionEnemy(enemy);
        });
        updateUI();
        return state.enemies.map(({ id, name, entered, x }) => ({ id, name, entered, x }));
      },
      waveProfile(wave, difficulty = 'master') {
        return getWaveProfile(wave, difficulty);
      },
      breachDamageProfile(type = 'raider', wave = 1, difficulty = 'rookie', armorLevel = 1) {
        return breachDamageProfile(type, wave, difficulty, armorLevel);
      },
      simulateBalance(difficulty = 'master', efficiency = 1) {
        return simulateBalance(difficulty, efficiency);
      },
      setEquipment(slot, level) {
        if (!['weapon', 'armor', 'charm'].includes(slot)) return;
        state.equipment[slot] = Math.max(1, Math.floor(Number(level) || 1));
        state.emberCharges = Math.min(state.emberCharges, emberCapacity());
        state.mana = Math.min(state.mana, manaCapacity());
        updateUI();
      },
      fireBurst() {
        let target = state.enemies[0];
        if (!target) {
          state.waveQueue += 1;
          spawnEnemy('boss', null);
          [target] = state.enemies;
        }
        const volley = fireAt(target, performance.now());
        return { volleySize: volleySize(), attackRate: attackRate(), ...volley, emberCharges: state.emberCharges };
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
          started: state.started,
          paused: state.paused,
          gameOver: state.gameOver,
          locked: state.locked,
          resolution: state.resolution ? { ...state.resolution } : null,
          activePlayMs: currentActivePlayMs(),
          scheduledTasks: gameTasks.size,
          upgradeMode: state.upgradeMode,
          upgradeTargetSlot: currentUpgradeSlot(),
          wave: state.wave,
          intermissionRemaining: state.intermissionUntil ? Math.max(0, state.intermissionUntil - performance.now()) : 0,
          score: state.score,
          kills: state.kills,
          wall: state.wall,
          wallMax: state.wallMax,
          shield: state.shield,
          shieldMax: shieldCapacity(),
          waveMatches: state.waveMatches,
          totalMatches: state.totalMatches,
          waveProfile: state.waveProfile,
          combatBuff: state.combatBuff ? { ...state.combatBuff } : null,
          combatBuffQueue: state.combatBuffQueue.map((buff) => ({ ...buff })),
          runeRelics: [...state.boardRelics],
          emberCharges: state.emberCharges,
          emberCapacity: emberCapacity(),
          mana: state.mana,
          manaCapacity: manaCapacity(),
          repaired: state.repaired,
          forge: state.forge,
          forgeTarget: state.forgeTarget,
          equipment: { ...state.equipment },
          board: [...state.board],
          enemies: state.enemies.map(({ type, role, relic }) => ({ type, role, relic }))
        };
      }
    };
  }

  const storedDifficulty = readStorage(STORAGE_KEYS.difficulty, 'rookie');
  const initialDifficulty = DIFFICULTIES[storedDifficulty] ? storedDifficulty : 'rookie';
  state.selectedDifficulty = initialDifficulty;
  state.difficulty = initialDifficulty;
  settlementHistory = readHistory();
  buildBoard();
  renderBoard(new Set(), -1, 'initial');
  selectDifficulty(initialDifficulty, false);
  setUpgradeMode('auto', false);
  updateSoundButton();
  updateMusicButton();
  updateFullscreenButton();
  updateUI();
  scheduleGameFit();
  const savedProgress = readSavedProgress();
  if (savedProgress) showResumePrompt(savedProgress);
  else els.introModal.classList.add('is-first-visit');
})();
