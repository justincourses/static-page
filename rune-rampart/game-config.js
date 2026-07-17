(() => {
  'use strict';

  const difficulties = {
    veteran: {
      name: '萌新', subtitle: '稳健守城', pressure: 1.1, eliteOffset: -.03, eliteCap: .93,
      statScale: 1.08, durabilityScale: 1.35, speedFactor: 1.12, groupScale: .9, batchDivisor: 4,
      relicChance: .07, relicGrowth: .0025, runeRelicChance: .02, scoreScale: 1.5, waveLimit: 100
    },
    master: {
      name: '大佬', subtitle: '九死一生', pressure: 1.38, eliteOffset: .16, eliteCap: .99,
      statScale: 1.28, durabilityScale: 1.55, speedFactor: 1.28, groupScale: 1.12, batchDivisor: 2,
      relicChance: .02, relicGrowth: .001, runeRelicChance: .006, scoreScale: 2, waveLimit: 100
    },
    endless: {
      name: '无限', subtitle: '守到极限', pressure: 1.18, eliteOffset: .04, eliteCap: .96,
      statScale: 1.14, durabilityScale: 1.42, speedFactor: 1.17, groupScale: .95, batchDivisor: 4,
      relicChance: .05, relicGrowth: .002, runeRelicChance: .014, scoreScale: 1.75, waveLimit: 99999, endless: true
    }
  };

  Object.values(difficulties).forEach(Object.freeze);
  window.RUNE_GUARD_CONFIG = Object.freeze({
    defaultDifficulty: 'veteran',
    difficulties: Object.freeze(difficulties)
  });
})();
