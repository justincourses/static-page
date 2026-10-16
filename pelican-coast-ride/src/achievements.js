// Pelican Coast Ride - Achievement Definitions & Persistence Manager

const STORAGE_KEY = 'pelican_coast_3d_achievements';

export const ACHIEVEMENTS = [
  {
    id: 'first_catch',
    icon: '🐟',
    title: '开张大吉',
    desc: '在海岸公路上抓到第 1 条海鱼',
    target: 1,
    metric: 'totalFish',
  },
  {
    id: 'scarf_wind',
    icon: '🧣',
    title: '红巾烈烈',
    desc: '骑行时速达到 48 km/h，让红围巾迎风完全舒展',
    target: 48,
    metric: 'maxSpeedKmh',
  },
  {
    id: 'wing_wheelie',
    icon: '🦅',
    title: '展翅独轮',
    desc: '按 T 展翅抬前轮累计骑行满 5 秒',
    target: 5,
    metric: 'wheelieSeconds',
  },
  {
    id: 'air_catch',
    icon: '🦘',
    title: '凌空掠影',
    desc: '按空格跳跃在半空中抓到高空飞鱼',
    target: 1,
    metric: 'airCatches',
  },
  {
    id: 'combo_5',
    icon: '🔥',
    title: '连击捕手',
    desc: '连续抓鱼达成 5 连击（Combo ×5）',
    target: 5,
    metric: 'maxCombo',
  },
  {
    id: 'starry_night',
    icon: '🌙',
    title: '踏月追星',
    desc: '经历昼夜交替，从黄昏落日骑入星空月夜',
    target: 1,
    metric: 'reachedStarryNight',
  },
  {
    id: 'all_cameras',
    icon: '🎬',
    title: '全机位导演',
    desc: '体验全部 5 种镜头（含电影运镜与鹈鹕视角）',
    target: 5,
    metric: 'camerasUsedCount',
  },
  {
    id: 'autopilot_ace',
    icon: '🤖',
    title: '智能巡航员',
    desc: '不操作时由鹈鹕自动驾驶追上并抓获 5 条鱼',
    target: 5,
    metric: 'autopilotCatches',
  },
  {
    id: 'high_cadence',
    icon: '⚡',
    title: '百转踏频',
    desc: '踏频达到 115 RPM，让随踏频合成的音乐飙至极速',
    target: 115,
    metric: 'maxCadenceRpm',
  },
  {
    id: 'golden_fish',
    icon: '✨',
    title: '奇珍海味',
    desc: '抓到稀有的黄金鬼头刀或夜光月鱼',
    target: 1,
    metric: 'rareFishCatches',
  },
  {
    id: 'wave_runner',
    icon: '🌊',
    title: '踏浪贴海',
    desc: '在最靠海的碎浪车道累计骑行 300 米',
    target: 300,
    metric: 'seaLaneMeters',
  },
  {
    id: 'wheelie_catch',
    icon: '🎪',
    title: '杂技鹈鹕',
    desc: '在 T 展翅抬前轮姿态下成功抓到海鱼',
    target: 1,
    metric: 'wheelieCatches',
  },
  {
    id: 'full_basket',
    icon: '🧺',
    title: '鱼篓满载',
    desc: '累计抓获 20 条海鱼，塞满单车鱼篓',
    target: 20,
    metric: 'totalFish',
  },
  {
    id: 'coast_legend',
    icon: '🏆',
    title: '海岸传奇',
    desc: '单局得分突破 1500 分且骑行超过 800 米',
    target: 1500,
    metric: 'legendProgress',
  },
];

function createInitialMetrics() {
  return {
    totalFish: 0,
    maxSpeedKmh: 0,
    wheelieSeconds: 0,
    airCatches: 0,
    maxCombo: 0,
    reachedStarryNight: 0,
    camerasUsedCount: 0,
    autopilotCatches: 0,
    maxCadenceRpm: 0,
    rareFishCatches: 0,
    seaLaneMeters: 0,
    wheelieCatches: 0,
    legendProgress: 0,
  };
}

export class AchievementManager {
  constructor({ onUnlock } = {}) {
    this.storageKey = STORAGE_KEY;
    this.onUnlock = typeof onUnlock === 'function' ? onUnlock : null;
    this.metrics = createInitialMetrics();
    this.unlocked = this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Ignore storage access or parse errors
    }
    return {};
  }

  _saveToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify(this.unlocked));
    } catch {
      // Ignore storage quota or privacy mode errors
    }
  }

  updateMetrics(partialMetrics = {}) {
    if (!partialMetrics || typeof partialMetrics !== 'object') {
      return [];
    }

    for (const [key, rawValue] of Object.entries(partialMetrics)) {
      if (rawValue === undefined || rawValue === null) continue;
      const numVal = typeof rawValue === 'boolean' ? (rawValue ? 1 : 0) : Number(rawValue);
      if (Number.isNaN(numVal)) continue;

      if (key in this.metrics) {
        this.metrics[key] = Math.max(this.metrics[key] || 0, numVal);
      } else {
        this.metrics[key] = numVal;
      }
    }

    // Automatically derive legendProgress if score and distance are supplied without explicit legendProgress
    if (
      partialMetrics.legendProgress === undefined &&
      (partialMetrics.score !== undefined ||
        partialMetrics.distanceMeters !== undefined ||
        partialMetrics.distance !== undefined)
    ) {
      const score = Number(this.metrics.score) || 0;
      const dist = Number(this.metrics.distanceMeters ?? this.metrics.distance) || 0;
      if (score >= 1500 && dist >= 800) {
        this.metrics.legendProgress = Math.max(this.metrics.legendProgress, score);
      } else {
        const ratio = Math.min(score / 1500, dist / 800);
        this.metrics.legendProgress = Math.max(
          this.metrics.legendProgress,
          Math.min(1499, Math.floor(ratio * 1500))
        );
      }
    }

    const newlyUnlocked = [];
    let changed = false;

    for (const ach of ACHIEVEMENTS) {
      const isAlreadyUnlocked = Boolean(this.unlocked[ach.id]);
      const currentVal = Number(this.metrics[ach.metric]) || 0;

      if (!isAlreadyUnlocked && currentVal >= ach.target) {
        const unlockedAt = Date.now();
        this.unlocked[ach.id] = { unlockedAt };
        changed = true;

        const unlockedEntry = {
          ...ach,
          unlocked: true,
          unlockedAt,
          currentValue: currentVal,
          progressRatio: 1,
        };
        newlyUnlocked.push(unlockedEntry);

        if (this.onUnlock) {
          this.onUnlock(unlockedEntry);
        }
      }
    }

    if (changed) {
      this._saveToStorage();
    }

    return newlyUnlocked;
  }

  getSummary() {
    let unlockedCount = 0;

    const list = ACHIEVEMENTS.map((ach) => {
      const unlockRecord = this.unlocked[ach.id];
      const unlocked = Boolean(unlockRecord);
      if (unlocked) unlockedCount++;

      const unlockedAt =
        unlockRecord && typeof unlockRecord === 'object'
          ? unlockRecord.unlockedAt || null
          : typeof unlockRecord === 'number'
          ? unlockRecord
          : null;

      const rawCurrent = Number(this.metrics[ach.metric]) || 0;
      const currentValue = unlocked ? Math.max(rawCurrent, ach.target) : rawCurrent;
      const progressRatio = unlocked
        ? 1
        : Math.max(0, Math.min(1, currentValue / Math.max(1, ach.target)));

      return {
        ...ach,
        unlocked,
        unlockedAt,
        currentValue,
        progressRatio,
      };
    });

    return {
      unlockedCount,
      totalCount: ACHIEVEMENTS.length,
      list,
    };
  }

  reset() {
    this.unlocked = {};
    this.metrics = createInitialMetrics();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }
    } catch {
      // Ignore storage errors
    }
    return this.getSummary();
  }
}
