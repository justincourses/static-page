import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-output');
fs.mkdirSync(output, { recursive: true });

function matched(board) {
  const hits = new Set();
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const start = row * 7 + col;
      if (board[start] === board[start + 1] && board[start] === board[start + 2]) {
        hits.add(start); hits.add(start + 1); hits.add(start + 2);
      }
    }
  }
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row < 5; row += 1) {
      const start = row * 7 + col;
      if (board[start] === board[start + 7] && board[start] === board[start + 14]) {
        hits.add(start); hits.add(start + 7); hits.add(start + 14);
      }
    }
  }
  return hits;
}

function validSwap(board) {
  for (let index = 0; index < 49; index += 1) {
    const row = Math.floor(index / 7);
    const col = index % 7;
    const neighbours = [];
    if (col < 6) neighbours.push(index + 1);
    if (row < 6) neighbours.push(index + 7);
    for (const neighbour of neighbours) {
      const candidate = [...board];
      [candidate[index], candidate[neighbour]] = [candidate[neighbour], candidate[index]];
      if (matched(candidate).size) return [index, neighbour];
    }
  }
  throw new Error('Generated board has no valid move');
}

function expectedDropPlan(matchIndices) {
  const removed = new Set(matchIndices);
  const plan = new Map();
  for (let col = 0; col < 7; col += 1) {
    const survivors = [];
    for (let row = 6; row >= 0; row -= 1) {
      if (!removed.has(row * 7 + col)) survivors.push(row);
    }
    const spawnedRows = 7 - survivors.length;
    for (let row = 6, cursor = 0; row >= 0; row -= 1, cursor += 1) {
      const sourceRow = survivors[cursor];
      const dropRows = sourceRow === undefined ? spawnedRows : row - sourceRow;
      if (dropRows > 0) plan.set(row * 7 + col, dropRows);
    }
  }
  return plan;
}

async function assertMinimumFont(page, context) {
  const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((node) => {
      const style = getComputedStyle(node);
      const hasDirectText = [...node.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim()
      );
      return hasDirectText && style.display !== 'none' && style.visibility !== 'hidden'
        && Number.parseFloat(style.fontSize) < 14;
    })
    .map((node) => ({
      tag: node.tagName,
      className: node.className,
      size: getComputedStyle(node).fontSize,
      text: node.textContent.trim().slice(0, 40)
    })));
  if (offenders.length) throw new Error(`${context} contains text smaller than 14px: ${JSON.stringify(offenders)}`);
}

let activeBrowser;

(async () => {
  const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.CHROME_PATH || (fs.existsSync(defaultChromePath) ? defaultChromePath : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  activeBrowser = browser;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    errors.push(`request: ${request.url()} ${failure ? failure.errorText : 'failed'}`);
  });

  await page.goto('http://127.0.0.1:4173/?testMode=1', { waitUntil: 'networkidle' });
  if (await page.title() !== '是男人就顶100波') throw new Error('Unexpected page title');
  if (!await page.locator('#introModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Briefing modal is not open');
  if (await page.locator('.difficulty-card').count() !== 3) throw new Error('Difficulty picker does not have three levels');
  const difficultyNames = await page.locator('.difficulty-card span b').allInnerTexts();
  if (difficultyNames.join('/') !== '新手/老兵/大佬') throw new Error(`Unexpected difficulty names: ${difficultyNames.join('/')}`);
  if (!await page.locator('.briefing-device-note').innerText().then((text) => text.includes('电脑端体验最佳') && text.includes('横屏'))) throw new Error('Welcome screen does not explain the recommended device orientation');
  if (!await page.locator('.briefing-music-note').innerText().then((text) => text.includes('科罗贝尼基') && text.includes('自动循环'))) throw new Error('Welcome screen does not explain the MIDI playlist');
  await assertMinimumFont(page, 'Desktop welcome');
  await page.screenshot({ path: path.join(output, 'welcome.png'), fullPage: false });
  await page.locator('[data-difficulty="veteran"]').click();
  if (!await page.locator('[data-difficulty="veteran"]').evaluate((node) => node.classList.contains('is-selected'))) throw new Error('Veteran difficulty was not selected');
  if (await page.evaluate(() => localStorage.getItem('runeRampart.difficulty')) !== 'veteran') throw new Error('Difficulty selection was not persisted');
  await page.locator('#startButton').click();
  await page.waitForTimeout(700);

  if (await page.locator('.rune-tile').count() !== 49) throw new Error('Board does not have 49 tiles');
  await assertMinimumFont(page, 'Desktop game');
  if (await page.locator('#waveValue').innerText() !== '001') throw new Error('Wave one did not start');
  if (await page.locator('#difficultyValue').innerText() !== '老兵') throw new Error('Selected difficulty was not applied');
  const initialCheckpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('runeRampart.progress.v1') || 'null'));
  if (initialCheckpoint?.reason !== 'wave' || initialCheckpoint.wave !== 1 || initialCheckpoint.difficulty !== 'veteran') throw new Error(`Wave-start checkpoint was not saved: ${JSON.stringify(initialCheckpoint)}`);
  if (await page.locator('#fullscreenButton').getAttribute('aria-label') !== '进入全屏') throw new Error('Fullscreen control is not ready');
  if (await page.locator('#soundButton').evaluate((node) => node.classList.contains('is-muted'))) throw new Error('Sound should start enabled');
  if (await page.locator('#musicButton').getAttribute('aria-pressed') !== 'true') throw new Error('MIDI music should start enabled');
  if (!await page.evaluate(() => window.__runeRampartTest.musicState().playing)) throw new Error('MIDI music sequencer did not start with the battle');
  if (await page.locator('[data-tooltip-key]').count() < 25) throw new Error('Too few game controls and status modules expose contextual hover tips');
  await page.locator('.wall-status').hover();
  await page.waitForTimeout(180);
  const wallTooltip = await page.locator('#contextTooltip').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      visible: node.classList.contains('is-visible'),
      ariaHidden: node.getAttribute('aria-hidden'),
      text: node.textContent.replace(/\s+/g, ' ').trim(),
      position: getComputedStyle(node).position,
      rect: rect.toJSON(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      fontSizes: [...node.querySelectorAll('*')].map((child) => Number.parseFloat(getComputedStyle(child).fontSize))
    };
  });
  if (!wallTooltip.visible || wallTooltip.ariaHidden !== 'false' || wallTooltip.position !== 'fixed' || !wallTooltip.text.includes('城墙 1120 / 1120') || !wallTooltip.text.includes('城防减伤 6%') || wallTooltip.rect.left < 0 || wallTooltip.rect.top < 0 || wallTooltip.rect.right > wallTooltip.viewport.width || wallTooltip.rect.bottom > wallTooltip.viewport.height || wallTooltip.fontSizes.some((size) => size < 14)) throw new Error(`Wall hover tip is incomplete or out of bounds: ${JSON.stringify(wallTooltip)}`);
  await page.screenshot({ path: path.join(output, 'context-tooltip.png'), fullPage: false });
  await page.locator('#pauseButton').focus();
  await page.waitForTimeout(30);
  const focusedTooltip = await page.locator('#contextTooltip').innerText();
  if (!focusedTooltip.includes('立即暂停') || !focusedTooltip.includes('立即冻结敌军') || await page.locator('#pauseButton').getAttribute('aria-describedby') !== 'contextTooltip') throw new Error(`Keyboard-focused pause tooltip is incomplete: ${focusedTooltip}`);
  if (await page.locator('#pauseButton').getAttribute('title') !== null || await page.locator('#soundButton').getAttribute('title') !== null || await page.locator('#fullscreenButton').getAttribute('title') !== null) throw new Error('Native titles can overlap the custom contextual tooltip');
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(0, 0);
  await page.locator('#leaderboardButton').click();
  await page.locator('#leaderboardModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  await page.waitForTimeout(160);
  const navbarLeaderboard = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('runeRampart.progress.v1') || 'null');
    return {
      paused: window.__runeRampartTest.snapshot().paused,
      musicPlaying: window.__runeRampartTest.musicState().playing,
      saveReason: save?.reason,
      boardParent: document.querySelector('#historyBoard').parentElement?.id,
      filter: document.querySelector('[data-history-filter="all"]').getAttribute('aria-pressed'),
      count: document.querySelector('#historyCount').textContent,
      emptyText: document.querySelector('#historyRows').textContent.trim(),
      focused: document.activeElement?.id
    };
  });
  if (!navbarLeaderboard.paused || navbarLeaderboard.musicPlaying || navbarLeaderboard.saveReason !== 'pause' || navbarLeaderboard.boardParent !== 'leaderboardHistorySlot' || navbarLeaderboard.filter !== 'true' || navbarLeaderboard.count !== '0 条战报' || !navbarLeaderboard.emptyText.includes('还没有战报') || navbarLeaderboard.focused !== 'leaderboardClose') throw new Error(`Navbar leaderboard did not pause safely and show the default overall ranking: ${JSON.stringify(navbarLeaderboard)}`);
  await assertMinimumFont(page, 'Navbar leaderboard');
  await page.screenshot({ path: path.join(output, 'navbar-leaderboard.png'), fullPage: false });
  await page.locator('#leaderboardClose').click();
  const leaderboardClosed = await page.evaluate(() => ({
    open: document.querySelector('#leaderboardModal').classList.contains('is-open'),
    paused: window.__runeRampartTest.snapshot().paused,
    musicPlaying: window.__runeRampartTest.musicState().playing,
    focused: document.activeElement?.id
  }));
  if (leaderboardClosed.open || leaderboardClosed.paused || !leaderboardClosed.musicPlaying || leaderboardClosed.focused !== 'leaderboardButton') throw new Error(`Closing navbar leaderboard did not restore the battle: ${JSON.stringify(leaderboardClosed)}`);
  const playlistCycle = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    const before = test.musicState();
    const visited = [];
    for (let index = 0; index < before.trackCount; index += 1) visited.push(test.advanceMusicTrack().trackTitle);
    const after = test.musicState();
    return { before, visited, after, buttonTitle: document.querySelector('#musicButton').title, log: document.querySelector('#battleLog').innerText };
  });
  if (playlistCycle.before.trackCount < 20 || new Set(playlistCycle.visited).size !== playlistCycle.before.trackCount || playlistCycle.after.trackIndex !== playlistCycle.before.trackIndex || playlistCycle.after.trackTitle !== playlistCycle.before.trackTitle) throw new Error(`MIDI playlist does not cycle through at least 20 distinct tracks: ${JSON.stringify(playlistCycle)}`);
  if (!playlistCycle.before.playlist.every((track) => (track.source.includes('公版') || track.source.includes('原创')) && track.steps >= 32 && track.voicesAligned && track.bpm >= 90) || !playlistCycle.buttonTitle.includes(playlistCycle.after.trackTitle) || !playlistCycle.log.includes('军乐换曲')) throw new Error(`MIDI playlist attribution, arrangement or feedback is incomplete: ${JSON.stringify(playlistCycle)}`);
  const beforeManualSkip = await page.evaluate(() => window.__runeRampartTest.musicState());
  await page.locator('#nextTrackButton').click();
  await page.waitForTimeout(120);
  const afterManualSkip = await page.evaluate(() => ({
    music: window.__runeRampartTest.musicState(),
    position: document.querySelector('#musicTrackCount').textContent,
    currentTitle: document.querySelector('#musicCurrentTitle').textContent,
    nextTitle: document.querySelector('#musicNextTitle').textContent,
    label: document.querySelector('#nextTrackButton').getAttribute('aria-label'),
    persisted: localStorage.getItem('runeRampart.musicTrack'),
    paused: window.__runeRampartTest.snapshot().paused,
    iconOnly: !document.querySelector('#nextTrackButton b') && document.querySelector('#nextTrackButton').textContent.trim() === '»'
  }));
  const expectedTrackIndex = (beforeManualSkip.trackIndex + 1) % beforeManualSkip.trackCount;
  const expectedNextTitle = afterManualSkip.music.playlist[(expectedTrackIndex + 1) % beforeManualSkip.trackCount].title;
  if (afterManualSkip.music.trackIndex !== expectedTrackIndex || !afterManualSkip.music.playing || afterManualSkip.position !== `第 ${expectedTrackIndex + 1} / ${beforeManualSkip.trackCount} 首` || afterManualSkip.currentTitle !== afterManualSkip.music.trackTitle || afterManualSkip.nextTitle !== expectedNextTitle || !afterManualSkip.label.includes(afterManualSkip.music.trackTitle) || !afterManualSkip.label.includes(expectedNextTitle) || afterManualSkip.persisted !== String(expectedTrackIndex) || afterManualSkip.paused || !afterManualSkip.iconOnly) throw new Error(`Non-blocking icon-only next-track control failed: ${JSON.stringify({ beforeManualSkip, afterManualSkip })}`);
  await page.locator('#nextTrackButton').hover();
  await page.waitForTimeout(180);
  const musicTip = await page.locator('#musicHoverTip').evaluate((node) => ({
    opacity: Number(getComputedStyle(node).opacity),
    visible: getComputedStyle(node).visibility,
    text: node.textContent.replace(/\s+/g, ' ').trim(),
    fontSizes: [...node.querySelectorAll('*')].map((child) => Number.parseFloat(getComputedStyle(child).fontSize))
  }));
  if (musicTip.opacity < .99 || musicTip.visible !== 'visible' || !musicTip.text.includes(afterManualSkip.position) || !musicTip.text.includes(afterManualSkip.currentTitle) || !musicTip.text.includes(afterManualSkip.nextTitle) || musicTip.fontSizes.some((size) => size < 14)) throw new Error(`Music hover tip is incomplete or illegible: ${JSON.stringify(musicTip)}`);
  await page.mouse.move(0, 0);
  if (await page.locator('.forge-rule').count() !== 0) throw new Error('Detailed reinforcement rules still occupy the compact upgrade HUD');
  await page.locator('#rulesButton').click();
  await page.locator('#rulesModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  await page.waitForTimeout(180);
  const rulesView = await page.evaluate(() => {
    const modal = document.querySelector('#rulesModal');
    const save = JSON.parse(localStorage.getItem('runeRampart.progress.v1') || 'null');
    return {
      sectionCount: modal.querySelectorAll('.rule-section').length,
      text: modal.textContent.replace(/\s+/g, ' ').trim(),
      paused: window.__runeRampartTest.snapshot().paused,
      musicPlaying: window.__runeRampartTest.musicState().playing,
      saveReason: save?.reason,
      savePaused: save?.paused,
      boardLocked: document.querySelector('#boardLock').classList.contains('is-visible'),
      focused: document.activeElement?.id,
      conciseBoardHint: document.querySelector('.board-hint').textContent.replace(/\s+/g, ' ').trim()
    };
  });
  if (rulesView.sectionCount !== 6 || !rulesView.text.includes('四连额外 +1') || !rulesView.text.includes('五连及以上额外 +2') || !rulesView.text.includes('铸币组再额外 +1') || !rulesView.text.includes('按自身等级计算') || !rulesView.text.includes('彩蛋越稀有') || !rulesView.text.includes('立即冻结')) throw new Error(`Central rules dialog is incomplete: ${JSON.stringify(rulesView)}`);
  if (!rulesView.paused || rulesView.musicPlaying || rulesView.saveReason !== 'pause' || !rulesView.savePaused || !rulesView.boardLocked || rulesView.focused !== 'rulesClose') throw new Error(`Opening rules did not pause and save safely: ${JSON.stringify(rulesView)}`);
  if (rulesView.conciseBoardHint !== '操作：交换相邻符文，连成三枚即可消除') throw new Error(`Board hint is still too verbose: ${rulesView.conciseBoardHint}`);
  await assertMinimumFont(page, 'Rules dialog');
  await page.screenshot({ path: path.join(output, 'rules.png'), fullPage: false });
  await page.locator('#rulesClose').click();
  await page.locator('#rulesModal').waitFor({ state: 'hidden', timeout: 500 });
  const rulesClosed = await page.evaluate(() => ({
    paused: window.__runeRampartTest.snapshot().paused,
    musicPlaying: window.__runeRampartTest.musicState().playing,
    focused: document.activeElement?.id
  }));
  if (rulesClosed.paused || !rulesClosed.musicPlaying || rulesClosed.focused !== 'rulesButton') throw new Error(`Closing rules did not restore the running battle: ${JSON.stringify(rulesClosed)}`);
  const reinforcementRules = await page.evaluate(() => {
    const reward = window.__runeRampartTest.reinforcementReward;
    return {
      normal: reward([{ type: 'ember', length: 3 }]),
      four: reward([{ type: 'mana', length: 4 }]),
      five: reward([{ type: 'moss', length: 5 }]),
      coin: reward([{ type: 'coin', length: 3 }])
    };
  });
  if (reinforcementRules.normal.total !== 1 || reinforcementRules.four.total !== 2 || reinforcementRules.five.total !== 3 || reinforcementRules.coin.total !== 2) throw new Error(`Reinforcement rules are inconsistent: ${JSON.stringify(reinforcementRules)}`);
  await page.locator('#soundButton').click();
  if (!await page.locator('#soundButton').evaluate((node) => node.classList.contains('is-muted'))) throw new Error('Sound mute toggle failed');
  await page.locator('#soundButton').click();
  await page.locator('#musicButton').click();
  if (await page.locator('#musicButton').getAttribute('aria-pressed') !== 'false' || await page.evaluate(() => window.__runeRampartTest.musicState().playing)) throw new Error('MIDI music toggle did not stop playback');
  if (await page.evaluate(() => localStorage.getItem('runeRampart.music')) !== 'false') throw new Error('MIDI music setting was not persisted');
  await page.locator('#musicButton').click();
  if (await page.locator('#musicButton').getAttribute('aria-pressed') !== 'true' || !await page.evaluate(() => window.__runeRampartTest.musicState().playing)) throw new Error('MIDI music toggle did not resume playback');
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });

  const beforeWeaponUpgrade = await page.evaluate(() => window.__runeRampartTest.snapshot());
  await page.locator('[data-upgrade="weapon"]').click();
  await page.evaluate(() => window.__runeRampartTest.grantForge());
  await page.locator('.loadout-stat.is-upgraded').waitFor({ state: 'visible', timeout: 800 });
  await page.locator('#equipmentUpgradeBanner.is-visible').waitFor({ state: 'visible', timeout: 800 });
  const equipmentLevelTotal = await page.locator('#weaponLevel, #armorLevel, #charmLevel').evaluateAll(
    (nodes) => nodes.reduce((total, node) => total + Number(node.textContent), 0)
  );
  if (equipmentLevelTotal !== 4 || await page.locator('#weaponLevel').innerText() !== '2') throw new Error(`Attack-priority upgrade did not apply: ${equipmentLevelTotal}`);
  if (!await page.locator('#upgradeEquipmentLevel').innerText().then((text) => text.includes('消耗 26 补强'))) throw new Error('Upgrade banner does not explain reinforcement consumption');
  const upgradedWeaponTarget = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    emberHud: document.querySelector('#emberValue').textContent,
    banner: document.querySelector('#equipmentUpgradeBanner').innerText,
    log: document.querySelector('#battleLog').innerText
  }));
  if (upgradedWeaponTarget.snapshot.upgradeTargetSlot !== 'weapon' || upgradedWeaponTarget.snapshot.forgeTarget <= 26 || upgradedWeaponTarget.snapshot.emberCapacity !== beforeWeaponUpgrade.emberCapacity + 4 || upgradedWeaponTarget.snapshot.emberCharges !== beforeWeaponUpgrade.emberCharges || !upgradedWeaponTarget.emberHud.endsWith(`/ ${upgradedWeaponTarget.snapshot.emberCapacity}`) || !upgradedWeaponTarget.banner.includes('余烬上限 +4') || !upgradedWeaponTarget.log.includes('余烬上限 +4') || !await page.locator('#forgeTargetName').innerText().then((text) => text.includes('攻击 LV.2→3'))) throw new Error(`Attack upgrade did not raise its own cost and ember capacity: ${JSON.stringify(upgradedWeaponTarget)}`);
  await page.locator('[data-upgrade="armor"]').click();
  const armorTarget = await page.evaluate(() => window.__runeRampartTest.snapshot());
  if (armorTarget.upgradeTargetSlot !== 'armor' || armorTarget.forgeTarget !== 26 || !await page.locator('#forgeTargetName').innerText().then((text) => text.includes('防御 LV.1→2'))) throw new Error(`Switching priority did not reveal the defense-specific cost: ${JSON.stringify(armorTarget)}`);
  await page.locator('[data-upgrade="auto"]').click();
  const autoTarget = await page.evaluate(() => ({ snapshot: window.__runeRampartTest.snapshot(), hint: document.querySelector('#strategyHint').textContent }));
  if (autoTarget.snapshot.upgradeTargetSlot !== 'armor' || autoTarget.snapshot.forgeTarget !== 26 || !autoTarget.hint.includes('本次防御')) throw new Error(`Auto mode did not internally choose and display its current target: ${JSON.stringify(autoTarget)}`);
  const armorUpgrade = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    const before = test.snapshot();
    test.grantForge();
    const after = test.snapshot();
    return {
      before,
      after,
      log: document.querySelector('#battleLog').innerText,
      wallAnimating: document.querySelector('.wall-status').classList.contains('is-upgraded'),
      armorAnimating: document.querySelector('#armorCard').classList.contains('is-upgraded'),
      banner: document.querySelector('#equipmentUpgradeBanner').innerText
    };
  });
  if (armorUpgrade.after.equipment.armor !== armorUpgrade.before.equipment.armor + 1 || armorUpgrade.after.wallMax !== armorUpgrade.before.wallMax + 90 || armorUpgrade.after.wall !== armorUpgrade.before.wall + 90 || armorUpgrade.after.shieldMax !== armorUpgrade.before.shieldMax + 45 || armorUpgrade.after.shield !== armorUpgrade.before.shield || !armorUpgrade.wallAnimating || !armorUpgrade.armorAnimating || !armorUpgrade.log.includes('耐久上限 +90') || !armorUpgrade.log.includes('护盾上限 +45') || !armorUpgrade.banner.includes('耐久上限 +90') || !armorUpgrade.banner.includes('护盾上限 +45')) throw new Error(`Defense upgrade did not visibly add wall and shield capacity: ${JSON.stringify(armorUpgrade)}`);
  await page.locator('#armorCard').dispatchEvent('pointerover', { relatedTarget: null });
  await page.waitForTimeout(80);
  const armorTooltip = await page.locator('#contextTooltip').innerText();
  if (!armorTooltip.includes('耐久上限 +90') || !armorTooltip.includes('护盾上限 +45') || !armorTooltip.includes('同步修复最多 90 点')) throw new Error(`Defense hover tip does not explain its durability and shield benefits: ${armorTooltip}`);
  await page.locator('#armorCard').evaluate((node) => node.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body })));
  const speedUpgrade = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    const before = test.snapshot();
    test.grantForge();
    const after = test.snapshot();
    return {
      before,
      after,
      manaHud: document.querySelector('#manaValue').textContent,
      banner: document.querySelector('#equipmentUpgradeBanner').innerText,
      log: document.querySelector('#battleLog').innerText
    };
  });
  if (speedUpgrade.after.equipment.charm !== speedUpgrade.before.equipment.charm + 1 || speedUpgrade.after.manaCapacity !== speedUpgrade.before.manaCapacity + 9 || speedUpgrade.after.mana !== speedUpgrade.before.mana || !speedUpgrade.manaHud.endsWith(`/ ${speedUpgrade.after.manaCapacity}`) || !speedUpgrade.banner.includes('奥能上限 +9') || !speedUpgrade.log.includes('奥能上限 +9')) throw new Error(`Attack-speed upgrade did not visibly increase mana capacity: ${JSON.stringify(speedUpgrade)}`);
  await page.locator('[data-upgrade="weapon"]').click();
  if (!await page.locator('#rulesModal').textContent().then((text) => text.includes('等级越高费用越高') && text.includes('升级后再重选') && text.includes('余烬上限 +4') && text.includes('奥能上限 +9') && text.includes('耐久上限 +90') && text.includes('护盾上限 +45') && text.includes('固定整备 3 秒'))) throw new Error('Per-item upgrade and fixed intermission rules are missing from the central rules dialog');
  const loadoutParent = await page.locator('#weaponCard').evaluate((node) => node.parentElement?.parentElement?.className);
  if (!loadoutParent?.includes('compact-arsenal')) throw new Error('Full weapon values are not grouped below the upgrade console');
  const weaponPower = (await page.locator('#weaponStat').innerText()).match(/\d+/)?.[0];
  if (await page.locator('#hudAttack').innerText() !== weaponPower) throw new Error('Compact battlefield HUD did not sync the upgraded attack value');
  if (!await page.locator('#weaponName').isVisible() || await page.locator('#weaponName').innerText() !== '余烬连弩') throw new Error('Equipment special name is not visible below the primary loadout value');
  const battlefieldLayout = await page.evaluate(() => {
    const field = document.querySelector('#battlefield').getBoundingClientRect();
    const target = document.querySelector('#targetDossier').getBoundingClientRect();
    const miniHud = document.querySelector('.field-hud').getBoundingClientRect();
    const combatBuffs = document.querySelector('#combatBuffs').getBoundingClientRect();
    const battleLog = document.querySelector('#battleLog').getBoundingClientRect();
    const loadout = document.querySelector('.battle-loadout').getBoundingClientRect();
    const upgradeConsole = document.querySelector('.upgrade-console').getBoundingClientRect();
    const logBackground = getComputedStyle(document.querySelector('#battleLog p')).backgroundColor;
    return {
      targetRightGap: field.right - target.right,
      targetTopGap: target.top - field.top,
      targetAspect: target.width / target.height,
      hudLeftGap: miniHud.left - field.left,
      hudTopGap: miniHud.top - field.top,
      buffLeftGap: combatBuffs.left - field.left,
      buffTopGap: combatBuffs.top - field.top,
      hudBottomGap: miniHud.bottom - field.top,
      battleLogLeftGap: battleLog.left - field.left,
      battleLogBottomGap: field.bottom - battleLog.bottom,
      loadoutLeftGap: loadout.left - field.left,
      loadoutGap: loadout.top - upgradeConsole.bottom,
      loadoutHeight: loadout.height,
      logBackground,
      buffParent: document.querySelector('#combatBuffs').parentElement?.id
    };
  });
  if (battlefieldLayout.targetRightGap > 20 || battlefieldLayout.targetTopGap > 20) throw new Error(`Threat dossier is not top-right: ${JSON.stringify(battlefieldLayout)}`);
  if (battlefieldLayout.targetAspect < 3.5) throw new Error(`Threat dossier is not wide and shallow: ${JSON.stringify(battlefieldLayout)}`);
  if (battlefieldLayout.hudLeftGap > 20 || battlefieldLayout.hudTopGap > 20) throw new Error(`Compact ally HUD is not top-left: ${JSON.stringify(battlefieldLayout)}`);
  if (battlefieldLayout.buffLeftGap > 20 || battlefieldLayout.buffTopGap < battlefieldLayout.hudBottomGap) throw new Error(`Relic status is not placed below the top-left HUD: ${JSON.stringify(battlefieldLayout)}`);
  if (battlefieldLayout.battleLogLeftGap > 20 || battlefieldLayout.battleLogBottomGap > 20) throw new Error(`Battle intel is not bottom-left: ${JSON.stringify(battlefieldLayout)}`);
  if (battlefieldLayout.loadoutGap < -1 || battlefieldLayout.loadoutGap > 12 || battlefieldLayout.loadoutHeight > 52) throw new Error(`Full loadout is not compactly placed below the upgrade console: ${JSON.stringify(battlefieldLayout)}`);
  if (!battlefieldLayout.logBackground.includes('0.48')) throw new Error(`Battle intel is not translucent enough: ${JSON.stringify(battlefieldLayout)}`);
  if (battlefieldLayout.buffParent !== 'battlefield') throw new Error('Relic status is not anchored to the battlefield');
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(output, 'equipment-upgrade.png'), fullPage: true });
  await page.waitForTimeout(1900);

  const burstResult = await page.evaluate(() => {
    window.__runeRampartTest.setEquipment('charm', 4);
    window.__runeRampartTest.setEmberCharges(2);
    const before = document.querySelectorAll('.projectile').length;
    const burst = window.__runeRampartTest.fireBurst();
    const projectile = document.querySelectorAll('.projectile')[before];
    const muzzle = document.querySelector('.muzzle-anchor').getBoundingClientRect();
    const layer = document.querySelector('#projectilesLayer').getBoundingClientRect();
    const scale = Number.parseFloat(document.querySelector('#gameViewport').dataset.scale) || 1;
    const muzzlePoint = { x: (muzzle.left + muzzle.width / 2 - layer.left) / scale, y: (muzzle.top + muzzle.height / 2 - layer.top) / scale };
    const projectilePoint = { x: Number.parseFloat(projectile.style.left), y: Number.parseFloat(projectile.style.top) };
    return {
      ...burst,
      projectilesAdded: document.querySelectorAll('.projectile').length - before,
      emberProjectiles: document.querySelectorAll('.projectile.is-ember-charged').length,
      emberHud: document.querySelector('#emberValue').textContent,
      emberCapacity: window.__runeRampartTest.snapshot().emberCapacity,
      spendFeedback: document.querySelector('.legend-item.ember .resource-delta.spend')?.textContent,
      muzzleError: Math.hypot(muzzlePoint.x - projectilePoint.x, muzzlePoint.y - projectilePoint.y)
    };
  });
  if (burstResult.volleySize !== 2 || burstResult.projectilesAdded < 2) throw new Error(`Attack-speed multishot did not render: ${JSON.stringify(burstResult)}`);
  if (!burstResult.emberCharged || burstResult.emberCharges !== 1 || burstResult.emberProjectiles < 2 || burstResult.emberHud !== `1 / ${burstResult.emberCapacity}` || burstResult.spendFeedback !== '-1') throw new Error(`Ember gain/consumption is not perceptible: ${JSON.stringify(burstResult)}`);
  if (burstResult.muzzleError > 1) throw new Error(`Projectile does not originate at the cannon muzzle: ${JSON.stringify(burstResult)}`);
  await page.screenshot({ path: path.join(output, 'multishot.png'), fullPage: false });

  const beforeScore = Number(await page.locator('#scoreValue').innerText());
  const classes = await page.locator('.rune-tile').evaluateAll((nodes) => nodes.map((node) => node.className));
  const board = classes.map((value) => ['ember', 'mana', 'moss', 'coin'].find((kind) => value.includes(kind)));
  const [first, second] = validSwap(board);
  const swappedBoard = [...board];
  [swappedBoard[first], swappedBoard[second]] = [swappedBoard[second], swappedBoard[first]];
  const futureMatches = [...matched(swappedBoard)];
  const expectedFirstDrop = expectedDropPlan(futureMatches);
  if (!expectedFirstDrop.size || expectedFirstDrop.size >= 49) throw new Error(`Drop-animation test did not produce a localized collapse: ${JSON.stringify({ futureMatches, expectedFirstDrop: [...expectedFirstDrop] })}`);
  const relicIndex = futureMatches.find((index) => index !== first && index !== second)
    ?? (futureMatches[0] === first ? second : futureMatches[0] === second ? first : futureMatches[0]);
  await page.evaluate(({ relicIndex }) => {
    window.__runeRampartTest.clearRelics();
    window.__runeRampartTest.clearRuneRelics();
    window.__runeRampartTest.setRuneRelic(relicIndex, 'frost');
  }, { relicIndex });
  if (await page.locator('.rune-relic-mark').count() !== 1) throw new Error('Forced rune Easter egg marker did not render');
  const beforeMatchResources = await page.evaluate(() => window.__runeRampartTest.snapshot());
  await page.locator('.rune-tile').nth(first).click();
  await page.locator('.rune-tile').nth(second).click();
  await page.locator('.match-primed').first().waitFor({ state: 'visible', timeout: 700 });
  await page.waitForTimeout(90);
  await page.locator('#pauseButton').click();
  const frozenChain = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    save: JSON.parse(localStorage.getItem('runeRampart.progress.v1') || 'null'),
    animationState: getComputedStyle(document.querySelector('.match-primed')).animationPlayState,
    shellPaused: document.querySelector('#gameShell').classList.contains('is-paused'),
    lockText: document.querySelector('#boardLock').textContent
  }));
  if (!frozenChain.snapshot.paused || !frozenChain.snapshot.locked || frozenChain.snapshot.resolution?.kind !== 'resolve' || frozenChain.save?.reason !== 'pause' || frozenChain.save?.resolution?.kind !== 'resolve' || frozenChain.animationState !== 'paused' || !frozenChain.shellPaused || !frozenChain.lockText.includes('已保存')) {
    throw new Error(`In-flight cascade did not pause and save immediately: ${JSON.stringify(frozenChain)}`);
  }
  await page.waitForTimeout(900);
  const stillFrozenChain = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    primed: document.querySelectorAll('.match-primed').length,
    dropping: document.querySelectorAll('.is-dropping').length
  }));
  if (stillFrozenChain.snapshot.score !== frozenChain.snapshot.score || stillFrozenChain.snapshot.forge !== frozenChain.snapshot.forge || stillFrozenChain.snapshot.board.join(',') !== frozenChain.snapshot.board.join(',') || stillFrozenChain.snapshot.resolution?.phase !== frozenChain.snapshot.resolution?.phase || !stillFrozenChain.primed || stillFrozenChain.dropping) {
    throw new Error(`Paused cascade continued in the background: ${JSON.stringify({ frozenChain, stillFrozenChain })}`);
  }
  await page.screenshot({ path: path.join(output, 'animation-paused.png'), fullPage: false });
  await page.locator('#pauseButton').click();
  await page.waitForTimeout(50);
  await page.screenshot({ path: path.join(output, 'animation-charge.png'), fullPage: false });
  await page.locator('.matched').first().waitFor({ state: 'attached', timeout: 900 });
  await page.waitForTimeout(90);
  await page.screenshot({ path: path.join(output, 'animation-burst.png'), fullPage: false });
  await page.locator('.is-dropping').first().waitFor({ state: 'attached', timeout: 900 });
  await page.waitForTimeout(190);
  const reinforcementFeedback = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    delta: document.querySelector('.legend-item.coin .resource-delta.gain')?.textContent,
    dropping: [...document.querySelectorAll('.rune-tile.is-dropping')].map((node) => ({
      index: Number(node.dataset.index),
      rows: Number(node.dataset.dropRows),
      animationName: getComputedStyle(node).animationName
    }))
  }));
  if (!(reinforcementFeedback.snapshot.forge > beforeMatchResources.forge) || !reinforcementFeedback.delta?.startsWith('+')) throw new Error(`Every match does not visibly advance reinforcement: ${JSON.stringify(reinforcementFeedback)}`);
  const actualDropPlan = new Map(reinforcementFeedback.dropping.map(({ index, rows }) => [index, rows]));
  if (actualDropPlan.size !== expectedFirstDrop.size || [...expectedFirstDrop].some(([index, rows]) => actualDropPlan.get(index) !== rows) || reinforcementFeedback.dropping.some(({ rows, animationName }) => rows < 1 || animationName !== 'tile-drop')) throw new Error(`Only tiles above cleared cells should animate and fall by their actual distance: ${JSON.stringify({ expected: [...expectedFirstDrop], actual: reinforcementFeedback.dropping })}`);
  await page.screenshot({ path: path.join(output, 'animation-drop.png'), fullPage: false });
  await page.waitForTimeout(700);
  const afterScore = Number(await page.locator('#scoreValue').innerText());
  if (!(afterScore > beforeScore)) throw new Error(`Match did not score: ${beforeScore} -> ${afterScore}`);
  const boardRelicResult = await page.evaluate(() => window.__runeRampartTest.snapshot());
  const boardRelicTypes = [boardRelicResult.combatBuff?.type, ...boardRelicResult.combatBuffQueue.map((buff) => buff.type)];
  if (!boardRelicTypes.includes('frost')) throw new Error(`Matched rune Easter egg did not enter the effect queue: ${JSON.stringify(boardRelicResult)}`);
  await page.evaluate(() => {
    window.__runeRampartTest.clearRelics();
    window.__runeRampartTest.grantRelic('frost');
    window.__runeRampartTest.grantRelic('shatter');
    window.__runeRampartTest.grantRelic('blast');
  });
  const queuedRelics = await page.evaluate(() => window.__runeRampartTest.snapshot());
  if (queuedRelics.combatBuff?.type !== 'frost' || queuedRelics.combatBuffQueue.length !== 2) throw new Error(`Relic effects did not queue: ${JSON.stringify(queuedRelics)}`);
  if (await page.locator('.combat-buff em').innerText() !== '候命 2') throw new Error('Relic queue count is not displayed in the effect frame');
  if (Number(await page.locator('.combat-buff').evaluate((node) => getComputedStyle(node).opacity)) < .99) throw new Error('Relic effect frame is not fully visible');
  await page.screenshot({ path: path.join(output, 'relic-queue.png'), fullPage: false });
  await page.evaluate(() => {
    window.__runeRampartTest.setEquipment('charm', 1);
    window.__runeRampartTest.setRelicShots(1);
    window.__runeRampartTest.fireBurst();
  });
  await page.waitForTimeout(650);
  const advancedRelics = await page.evaluate(() => window.__runeRampartTest.snapshot());
  if (advancedRelics.combatBuff?.type !== 'shatter' || advancedRelics.combatBuffQueue.length !== 1) throw new Error(`Relic queue did not advance after effect exhaustion: ${JSON.stringify(advancedRelics)}`);
  await page.evaluate(() => window.__runeRampartTest.clearRelics());
  const manaSpend = await page.evaluate(() => {
    window.__runeRampartTest.grantMana(18);
    return window.__runeRampartTest.snapshot().mana;
  });
  await page.locator('#volleyButton').click();
  await page.locator('.arcane-wave').waitFor({ state: 'attached', timeout: 500 });
  const manaAfterVolley = await page.evaluate(() => ({
    mana: window.__runeRampartTest.snapshot().mana,
    feedback: document.querySelector('.legend-item.mana .resource-delta.spend')?.textContent
  }));
  if (manaAfterVolley.mana !== manaSpend - 18 || manaAfterVolley.feedback !== '-18') throw new Error(`Mana consumption is not perceptible: ${JSON.stringify({ manaSpend, manaAfterVolley })}`);

  await page.locator('#pauseButton').click();
  const offstageTargeting = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    test.clearEnemies();
    const spawned = test.spawnEnemy('swift');
    return {
      spawned,
      dossierEmpty: document.querySelector('#targetDossier').classList.contains('is-empty'),
      targetName: document.querySelector('#targetName').textContent,
      targetRole: document.querySelector('#targetRole').textContent
    };
  });
  if (!offstageTargeting.spawned || offstageTargeting.spawned.entered || offstageTargeting.spawned.x <= 98 || !offstageTargeting.dossierEmpty || !offstageTargeting.targetRole.includes('无法锁定')) throw new Error(`Off-stage enemy can be locked before entering the field: ${JSON.stringify(offstageTargeting)}`);
  const enteredTargeting = await page.evaluate(() => {
    const entered = window.__runeRampartTest.enterAllEnemies();
    return {
      entered,
      dossierEmpty: document.querySelector('#targetDossier').classList.contains('is-empty'),
      targetName: document.querySelector('#targetName').textContent,
      targetAttack: document.querySelector('#targetAttack').textContent
    };
  });
  if (!enteredTargeting.entered.every((enemy) => enemy.entered && enemy.x <= 98) || enteredTargeting.dossierEmpty || enteredTargeting.targetName !== offstageTargeting.spawned.name || Number(enteredTargeting.targetAttack) <= 0 || await page.locator('.target-stats > div:first-child span').innerText() !== '伤害') throw new Error(`Enemy was not acquired with a clear damage value after entering the field: ${JSON.stringify(enteredTargeting)}`);
  const shieldFlow = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    const baseline = test.snapshot();
    test.setDefenseState(baseline.wallMax - 20, 0);
    const support = test.grantMossSupport(50);
    const snapshot = test.snapshot();
    return {
      support,
      snapshot,
      legend: document.querySelector('#energyValue').textContent,
      rail: document.querySelector('#shieldRailValue').textContent,
      meterWidth: Number.parseFloat(document.querySelector('#shieldMeter').style.width),
      log: document.querySelector('#battleLog').innerText,
      ruleText: document.querySelector('#rulesModal').textContent
    };
  });
  if (shieldFlow.support.restored !== 20 || shieldFlow.support.shieldGained !== 30 || shieldFlow.support.energyAccepted !== 50 || shieldFlow.support.energyCapacity !== shieldFlow.snapshot.shieldMax || shieldFlow.snapshot.wall !== shieldFlow.snapshot.wallMax || shieldFlow.snapshot.shield !== 30 || shieldFlow.legend !== `30 / ${shieldFlow.snapshot.shieldMax}` || shieldFlow.rail !== '30' || !(shieldFlow.meterWidth > 0) || !shieldFlow.log.includes('防御能量分配：耐久 +20 · 护盾 +30') || !shieldFlow.ruleText.includes('绿晶提供防御能量') || !shieldFlow.ruleText.includes('剩余部分转化为护盾') || !shieldFlow.ruleText.includes('再消耗护盾')) throw new Error(`Green rune energy was not visibly split between repair and shield: ${JSON.stringify(shieldFlow)}`);
  await page.locator('.legend-item.moss').hover();
  await page.waitForTimeout(80);
  const energyTooltip = await page.locator('#contextTooltip').innerText();
  if (!energyTooltip.includes(`防御能量 30 / ${shieldFlow.snapshot.shieldMax}`) || !energyTooltip.includes('先用于修复缺失耐久') || !energyTooltip.includes('剩余能量转化为护盾') || !energyTooltip.includes('受到伤害时先扣护盾')) throw new Error(`Energy hover tip is incomplete: ${energyTooltip}`);
  await page.mouse.move(0, 0);
  const selfDestruct = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    test.clearEnemies();
    test.setEquipment('armor', 3);
    const result = test.breachEnemy('assault');
    const damageToasts = [...document.querySelectorAll('.combat-toast.damage')];
    const shieldToasts = [...document.querySelectorAll('.combat-toast.shield')];
    const feedback = {
      damageToast: damageToasts.at(-1)?.textContent || '',
      shieldToast: shieldToasts.at(-1)?.textContent || '',
      log: document.querySelector('#battleLog').innerText,
      impactAttached: Boolean(document.querySelector('.impact-flash.self-destruct')),
      enemyAnimating: Boolean(document.querySelector('.enemy.is-self-destructing')),
      wallText: document.querySelector('#wallValue').textContent,
      shieldText: document.querySelector('#energyValue').textContent.split('/')[0].trim(),
      ruleText: document.querySelector('#rulesModal').textContent
    };
    test.setEquipment('armor', 1);
    return { result, feedback };
  });
  if (!selfDestruct.result || selfDestruct.result.actualShieldAbsorb !== selfDestruct.result.expectedShieldAbsorb || selfDestruct.result.actualWallDamage !== selfDestruct.result.expectedWallDamage || selfDestruct.result.wallAfter !== selfDestruct.result.wallBefore - selfDestruct.result.expectedWallDamage || selfDestruct.result.shieldAfter !== selfDestruct.result.shieldBefore - selfDestruct.result.expectedShieldAbsorb || !selfDestruct.result.removedFromBattle || !selfDestruct.result.selfDestructing) throw new Error(`Enemy shield-first self-destruct damage is incorrect: ${JSON.stringify(selfDestruct)}`);
  if (!selfDestruct.feedback.impactAttached || !selfDestruct.feedback.enemyAnimating || selfDestruct.feedback.shieldToast !== `护盾 -${selfDestruct.result.expectedShieldAbsorb}` || selfDestruct.feedback.damageToast !== `耐久 -${selfDestruct.result.expectedWallDamage}` || !selfDestruct.feedback.log.includes(`护盾吸收 ${selfDestruct.result.expectedShieldAbsorb}`) || Number(selfDestruct.feedback.wallText) !== selfDestruct.result.wallAfter || Number(selfDestruct.feedback.shieldText) !== selfDestruct.result.shieldAfter || !selfDestruct.feedback.ruleText.includes('先应用城防减伤，再消耗护盾，最后才扣耐久')) throw new Error(`Enemy self-destruct feedback or rule explanation is incomplete: ${JSON.stringify(selfDestruct)}`);
  await page.locator('#pauseButton').click();
  await page.waitForTimeout(160);
  const selfDestructVisual = await page.evaluate(() => {
    const impact = document.querySelector('.impact-flash.self-destruct');
    const enemy = document.querySelector('.enemy.is-self-destructing');
    return {
      impactOpacity: impact ? Number(getComputedStyle(impact).opacity) : 0,
      impactSize: impact ? impact.getBoundingClientRect().width : 0,
      enemyOpacity: enemy ? Number(getComputedStyle(enemy).opacity) : 0,
      fortressBreached: document.querySelector('#fortress').classList.contains('is-breached'),
      shieldToastVisible: [...document.querySelectorAll('.combat-toast.shield')].some((node) => node.textContent.startsWith('护盾 -') && Number(getComputedStyle(node).opacity) > 0),
      damageToastVisible: [...document.querySelectorAll('.combat-toast.damage')].some((node) => node.textContent.startsWith('耐久 -') && Number(getComputedStyle(node).opacity) > 0)
    };
  });
  if (selfDestructVisual.impactOpacity < .5 || selfDestructVisual.impactSize < 40 || selfDestructVisual.enemyOpacity < .3 || !selfDestructVisual.fortressBreached || !selfDestructVisual.shieldToastVisible || !selfDestructVisual.damageToastVisible) throw new Error(`Enemy self-destruct animation is not perceptible: ${JSON.stringify(selfDestructVisual)}`);
  await page.screenshot({ path: path.join(output, 'enemy-self-destruct.png'), fullPage: false });

  await page.waitForTimeout(1500);
  if (await page.locator('.enemy').count() < 1) await page.evaluate(() => window.__runeRampartTest.spawnEnemy('assault'));
  if (await page.locator('.enemy').count() < 1) throw new Error('No enemy spawned');
  await page.evaluate(() => {
    window.__runeRampartTest.spawnEnemy('swift');
    window.__runeRampartTest.spawnEnemy('assault');
    window.__runeRampartTest.spawnEnemy('brute');
    window.__runeRampartTest.spawnEnemy('boss');
    window.__runeRampartTest.enterAllEnemies();
  });
  for (const type of ['swift', 'assault', 'brute', 'boss']) {
    if (await page.locator(`.enemy.${type}`).count() < 1) throw new Error(`Distinct ${type} enemy did not render`);
  }
  if (await page.locator('#targetDossier').evaluate((node) => node.classList.contains('is-empty'))) throw new Error('Target dossier did not acquire an enemy');
  if (Number(await page.locator('#targetAttack').innerText()) <= 0) throw new Error('Enemy breach damage is not displayed');
  if (Number(await page.locator('#targetDefense').innerText()) < 0) throw new Error('Enemy defense is not displayed');
  if ((await page.locator('.enemy-label').first().innerText()).length < 3) throw new Error('Enemy name is missing');
  const aimAngle = await page.locator('#fortress').evaluate((node) => node.style.getPropertyValue('--aim-angle'));
  if (!aimAngle.includes('rad')) throw new Error('Turret did not aim at its target');
  await page.evaluate(() => {
    window.__runeRampartTest.clearRelics();
    window.__runeRampartTest.grantRelic('blast');
  });
  await page.locator('.combat-buff.blast').waitFor({ state: 'visible', timeout: 500 });
  await page.locator('.impact-flash.blast').first().waitFor({ state: 'attached', timeout: 1800 });
  await page.screenshot({ path: path.join(output, 'enemy-dossier.png'), fullPage: false });
  await page.locator('#pauseButton').click();
  if (!await page.locator('#boardLock').evaluate((node) => node.classList.contains('is-visible'))) throw new Error('Pause lock is not visible');
  if (await page.evaluate(() => window.__runeRampartTest.musicState().playing)) throw new Error('MIDI music should pause with the battle');
  await page.waitForFunction(() => {
    const save = JSON.parse(localStorage.getItem('runeRampart.progress.v1') || 'null');
    return save?.reason === 'pause';
  }, null, { timeout: 3000 });
  const pausedState = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    save: JSON.parse(localStorage.getItem('runeRampart.progress.v1') || 'null')
  }));
  if (pausedState.save?.reason !== 'pause' || pausedState.save.wave !== pausedState.snapshot.wave || pausedState.save.shield !== pausedState.snapshot.shield || pausedState.save.emberCharges !== pausedState.snapshot.emberCharges || pausedState.save.mana !== pausedState.snapshot.mana || pausedState.save.board.join(',') !== pausedState.snapshot.board.join(',')) throw new Error(`Pause checkpoint is incomplete: ${JSON.stringify(pausedState)}`);

  const resumePage = await page.context().newPage({ viewport: { width: 980, height: 820 } });
  resumePage.on('pageerror', (error) => errors.push(`resume pageerror: ${error.message}`));
  resumePage.on('console', (message) => { if (message.type() === 'error') errors.push(`resume console: ${message.text()}`); });
  await resumePage.goto('http://127.0.0.1:4173/?testMode=1', { waitUntil: 'networkidle' });
  if (!await resumePage.locator('#resumeModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Saved campaign prompt did not open on reload');
  if (await resumePage.locator('#introModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Difficulty briefing should wait for the resume decision');
  if (await resumePage.locator('#resumeDifficulty').innerText() !== '老兵' || !await resumePage.locator('#resumeWave').innerText().then((text) => text.includes(String(pausedState.snapshot.wave).padStart(3, '0')))) throw new Error('Resume summary does not describe the saved campaign');
  await assertMinimumFont(resumePage, 'Resume prompt');
  await resumePage.screenshot({ path: path.join(output, 'resume-prompt.png'), fullPage: false });
  await resumePage.setViewportSize({ width: 390, height: 844 });
  await resumePage.waitForTimeout(180);
  const mobileResumeFits = await resumePage.locator('.resume-card').evaluate((node) => node.scrollWidth <= node.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!mobileResumeFits) throw new Error('Mobile resume prompt overflows horizontally');
  await assertMinimumFont(resumePage, 'Mobile resume prompt');
  await resumePage.screenshot({ path: path.join(output, 'mobile-resume.png'), fullPage: false });
  await resumePage.locator('#resumeButton').click();
  await resumePage.waitForTimeout(40);
  const restoredState = await resumePage.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    music: window.__runeRampartTest.musicState(),
    log: document.querySelector('#battleLog').innerText,
    lockVisible: document.querySelector('#boardLock').classList.contains('is-visible')
  }));
  if (!restoredState.snapshot.started || restoredState.snapshot.paused || restoredState.lockVisible || restoredState.snapshot.difficulty !== pausedState.snapshot.difficulty || restoredState.snapshot.wave !== pausedState.snapshot.wave || restoredState.snapshot.wall !== pausedState.snapshot.wall || restoredState.snapshot.shield !== pausedState.snapshot.shield || restoredState.snapshot.emberCharges !== pausedState.snapshot.emberCharges || restoredState.snapshot.emberCapacity !== pausedState.snapshot.emberCapacity || restoredState.snapshot.mana !== pausedState.snapshot.mana || restoredState.snapshot.manaCapacity !== pausedState.snapshot.manaCapacity || restoredState.snapshot.forge !== pausedState.snapshot.forge || restoredState.snapshot.board.join(',') !== pausedState.snapshot.board.join(',')) throw new Error(`Continue did not immediately resume the saved campaign: ${JSON.stringify({ pausedState, restoredState })}`);
  if (!restoredState.music.enabled || !restoredState.music.playing) throw new Error(`Music did not resume immediately: ${JSON.stringify(restoredState)}`);
  await resumePage.waitForTimeout(80);
  const runningAfterRestore = await resumePage.evaluate(() => window.__runeRampartTest.snapshot());
  if (runningAfterRestore.paused || runningAfterRestore.activePlayMs <= restoredState.snapshot.activePlayMs + 40) throw new Error(`Game clock did not continue after restoring: ${JSON.stringify({ restoredState, runningAfterRestore })}`);
  await resumePage.close();

  const restartPage = await page.context().newPage({ viewport: { width: 980, height: 820 } });
  await restartPage.goto('http://127.0.0.1:4173/?testMode=1', { waitUntil: 'networkidle' });
  if (!await restartPage.locator('#resumeModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Reloaded campaign no longer offers restart/continue choice');
  await restartPage.locator('#discardSaveButton').click();
  if (!await restartPage.locator('#introModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Restart choice did not return to campaign briefing');
  if (!await restartPage.locator('[data-difficulty="veteran"]').evaluate((node) => node.classList.contains('is-selected'))) throw new Error('Restart briefing did not retain the last difficulty');
  if (await restartPage.evaluate(() => localStorage.getItem('runeRampart.progress.v1')) !== null) throw new Error('Restart choice did not archive the old checkpoint');
  await restartPage.close();
  await page.locator('#pauseButton').click();
  if (!await page.evaluate(() => window.__runeRampartTest.musicState().playing)) throw new Error('MIDI music did not resume after unpausing');

  await page.locator('#helpButton').click();
  if (!await page.locator('#introModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Campaign options did not reopen');
  if (!await page.locator('#boardLock').evaluate((node) => node.classList.contains('is-visible'))) throw new Error('Opening campaign options did not pause the battle');
  await page.locator('#introClose').click();
  if (await page.locator('#introModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Campaign options did not close');

  const balance = await page.evaluate(() => {
    const test = window.__runeRampartTest;
    const samples = [1, 10, 11, 20, 50, 90, 100].map((wave) => ({
      wave,
      rookie: test.waveProfile(wave, 'rookie'),
      veteran: test.waveProfile(wave, 'veteran'),
      master: test.waveProfile(wave, 'master')
    }));
    return {
      samples,
      masterCurve: Array.from({ length: 100 }, (_, index) => test.waveProfile(index + 1, 'master')),
      casualRookie: test.simulateBalance('rookie', 1.15),
      medianVeteran: test.simulateBalance('veteran', 1.3),
      skilledVeteran: test.simulateBalance('veteran', 1.5),
      strongMaster: test.simulateBalance('master', 2),
      eliteMaster: test.simulateBalance('master', 2.25),
      breachProfiles: {
        rookieOpening: test.breachDamageProfile('assault', 1, 'rookie', 1),
        veteranOpening: test.breachDamageProfile('assault', 1, 'veteran', 1),
        masterOpening: test.breachDamageProfile('assault', 1, 'master', 1),
        masterOpeningBoss: test.breachDamageProfile('boss', 1, 'master', 1),
        masterMid: test.breachDamageProfile('assault', 50, 'master', 5),
        masterMidBoss: test.breachDamageProfile('boss', 50, 'master', 5),
        masterLate: test.breachDamageProfile('assault', 100, 'master', 10),
        masterLateBoss: test.breachDamageProfile('boss', 100, 'master', 10)
      }
    };
  });
  for (const sample of balance.samples) {
    if (!(sample.master.enemyCount >= sample.veteran.enemyCount && sample.veteran.enemyCount >= sample.rookie.enemyCount)) {
      throw new Error(`Enemy density does not scale by difficulty at wave ${sample.wave}`);
    }
    if (!(sample.master.advancedChance > sample.veteran.advancedChance && sample.veteran.advancedChance > sample.rookie.advancedChance)) {
      throw new Error(`Advanced-enemy share does not scale at wave ${sample.wave}`);
    }
    if (!(sample.rookie.relicChance > sample.veteran.relicChance && sample.veteran.relicChance > sample.master.relicChance)) {
      throw new Error(`Enemy Easter eggs do not become rarer at higher difficulty on wave ${sample.wave}`);
    }
    if (!(sample.rookie.runeRelicChance > sample.veteran.runeRelicChance && sample.veteran.runeRelicChance > sample.master.runeRelicChance)) {
      throw new Error(`Rune Easter eggs do not become rarer at higher difficulty on wave ${sample.wave}`);
    }
    if ([sample.rookie, sample.veteran, sample.master].some((profile) => profile.intermission !== 3000)) {
      throw new Error(`Cleared waves do not use the fixed three-second intermission at wave ${sample.wave}`);
    }
  }
  const wave10 = balance.samples.find((sample) => sample.wave === 10).master;
  const wave11 = balance.samples.find((sample) => sample.wave === 11).master;
  const wave100 = balance.samples.find((sample) => sample.wave === 100).master;
  const wave1 = balance.samples.find((sample) => sample.wave === 1);
  if (wave1.rookie.enemyCount < 7 || wave1.veteran.enemyCount < 10 || wave1.master.enemyCount < 12 || wave1.rookie.hpScale < .85 || wave1.veteran.hpScale < 1.45 || wave1.master.hpScale < 1.95) throw new Error(`Opening difficulty targets are not calibrated: ${JSON.stringify(wave1)}`);
  if (!(wave1.master.spawnInterval < wave1.veteran.spawnInterval && wave1.veteran.spawnInterval < wave1.rookie.spawnInterval && wave1.master.speedScale > wave1.veteran.speedScale && wave1.veteran.speedScale > wave1.rookie.speedScale && wave1.master.advancedChance >= .64)) throw new Error(`Opening density, speed and elite ratio are not pressure-scaled: ${JSON.stringify(wave1)}`);
  const openingPressure = ['rookie', 'veteran', 'master'].map((key) => {
    const profile = wave1[key];
    return profile.enemyCount * profile.hpScale * profile.speedScale * (1 + profile.advancedChance);
  });
  if (!(openingPressure[1] > openingPressure[0] * 2.5 && openingPressure[2] > openingPressure[1] * 2)) throw new Error(`Difficulty tiers are not meaningfully separated: ${JSON.stringify({ wave1, openingPressure })}`);
  const breach = balance.breachProfiles;
  if (!(breach.masterOpening.finalDamage > breach.veteranOpening.finalDamage && breach.veteranOpening.finalDamage > breach.rookieOpening.finalDamage)) throw new Error(`Opening breach damage does not scale by difficulty: ${JSON.stringify(breach)}`);
  if (breach.rookieOpening.hitsToBreak < 20 || breach.veteranOpening.hitsToBreak < 15 || breach.masterOpening.hitsToBreak < 12 || breach.masterOpeningBoss.hitsToBreak < 6) throw new Error(`Opening enemies can erase the wall in too few breaches: ${JSON.stringify(breach)}`);
  if (breach.masterMid.hitsToBreak < 12 || breach.masterLate.hitsToBreak < 12 || breach.masterMidBoss.hitsToBreak < 6 || breach.masterLateBoss.hitsToBreak < 6) throw new Error(`Mid/late breach damage grows too aggressively for reasonable defense investment: ${JSON.stringify(breach)}`);
  if ([breach.masterMid, breach.masterLate, breach.masterMidBoss, breach.masterLateBoss].some((sample) => sample.finalDamage >= sample.displayedDamage || sample.hitsToBreak < 1)) throw new Error(`Defense is not applied to breach damage: ${JSON.stringify(breach)}`);
  if (!wave10.isBossWave || wave11.stage !== wave10.stage + 1 || !(wave11.hpScale > wave10.hpScale)) throw new Error('Ten-wave step-up is not calibrated');
  if (wave100.stage !== 10 || wave100.bossCount !== 3 || wave100.batchSize !== 5 || wave100.requiredGroups !== 23) throw new Error(`Wave 100 profile is incorrect: ${JSON.stringify(wave100)}`);
  balance.masterCurve.forEach((profile, index) => {
    if (index === 0) return;
    const previous = balance.masterCurve[index - 1];
    if (profile.enemyCount < previous.enemyCount || profile.requiredGroups < previous.requiredGroups) throw new Error(`Master pressure regresses at wave ${profile.wave}`);
    if (!(profile.hpScale > previous.hpScale && profile.damageScale > previous.damageScale && profile.defenseScale > previous.defenseScale)) throw new Error(`Master stats do not rise at wave ${profile.wave}`);
    if (profile.wave % 10 === 0 && !profile.isBossWave) throw new Error(`Boss wave missing at ${profile.wave}`);
    if (profile.wave % 10 === 1 && profile.wave > 1 && profile.stage !== previous.stage + 1) throw new Error(`Stage transition missing at ${profile.wave}`);
  });
  if (balance.casualRookie.firstFailure !== null || balance.casualRookie.minimumMargin < 1) throw new Error(`Rookie is not clearable by casual-positive play: ${JSON.stringify(balance.casualRookie)}`);
  if (balance.medianVeteran.firstFailure === null || balance.skilledVeteran.firstFailure !== null) throw new Error(`Veteran is not calibrated as a meaningful skill divider: ${JSON.stringify({ median: balance.medianVeteran, skilled: balance.skilledVeteran })}`);
  if (balance.strongMaster.firstFailure === null || balance.eliteMaster.firstFailure !== null || !(balance.eliteMaster.minimumMargin > 1 && balance.eliteMaster.minimumMargin < 1.08)) throw new Error(`Master is not calibrated for a tiny elite clear window: ${JSON.stringify({ strong: balance.strongMaster, elite: balance.eliteMaster })}`);
  const eliteLevels = Object.values(balance.eliteMaster.equipment);
  if (Math.max(...eliteLevels) - Math.min(...eliteLevels) > 1) throw new Error(`Elite auto-upgrade is not balanced: ${JSON.stringify(balance.eliteMaster.equipment)}`);

  await page.evaluate(() => window.__runeRampartTest.clearWave(2));
  await page.waitForTimeout(150);
  const earlyClearIntermission = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    countdown: document.querySelector('#nextWaveValue').textContent,
    tooltipRule: (() => {
      const target = document.querySelector('.next-wave');
      target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      return document.querySelector('#contextTooltipBody').textContent;
    })()
  }));
  if (earlyClearIntermission.snapshot.wave !== 2 || earlyClearIntermission.snapshot.intermissionRemaining < 2700 || earlyClearIntermission.snapshot.intermissionRemaining > 3000 || earlyClearIntermission.countdown !== '3 秒' || !earlyClearIntermission.tooltipRule.includes('固定整备 3 秒')) throw new Error(`Early-cleared wave did not enter the fixed three-second intermission: ${JSON.stringify(earlyClearIntermission)}`);
  await page.mouse.move(0, 0);

  await page.setViewportSize({ width: 1920, height: 900 });
  await page.waitForTimeout(350);
  const ultraWideFit = await page.evaluate(() => {
    const shell = document.querySelector('#gameShell');
    const viewport = document.querySelector('#gameViewport');
    const rect = shell.getBoundingClientRect();
    const scale = Number.parseFloat(viewport.dataset.scale) || 1;
    return {
      scale,
      rect: rect.toJSON(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      widthRatio: rect.width / shell.offsetWidth,
      heightRatio: rect.height / shell.offsetHeight,
      scaled: viewport.classList.contains('is-scaled')
    };
  });
  if (!ultraWideFit.scaled || !(ultraWideFit.scale < 1)) throw new Error(`Ultra-wide short viewport did not activate proportional fit: ${JSON.stringify(ultraWideFit)}`);
  if (ultraWideFit.rect.left < -1 || ultraWideFit.rect.right > ultraWideFit.viewportWidth + 1 || ultraWideFit.rect.top < -1 || ultraWideFit.rect.bottom > ultraWideFit.viewportHeight + 1) throw new Error(`Scaled desktop canvas is not fully visible: ${JSON.stringify(ultraWideFit)}`);
  if (Math.abs(ultraWideFit.widthRatio - ultraWideFit.heightRatio) > .002 || Math.abs(ultraWideFit.widthRatio - ultraWideFit.scale) > .002) throw new Error(`Desktop canvas is not scaled uniformly: ${JSON.stringify(ultraWideFit)}`);
  if (ultraWideFit.documentHeight > ultraWideFit.viewportHeight + 1) throw new Error(`Scaled desktop canvas still scrolls vertically: ${JSON.stringify(ultraWideFit)}`);
  const scaledShot = await page.evaluate(() => {
    const before = document.querySelectorAll('.projectile').length;
    window.__runeRampartTest.fireBurst();
    const projectile = document.querySelectorAll('.projectile')[before];
    const muzzle = document.querySelector('.muzzle-anchor').getBoundingClientRect();
    const layer = document.querySelector('#projectilesLayer').getBoundingClientRect();
    const scale = Number.parseFloat(document.querySelector('#gameViewport').dataset.scale) || 1;
    const muzzlePoint = { x: (muzzle.left + muzzle.width / 2 - layer.left) / scale, y: (muzzle.top + muzzle.height / 2 - layer.top) / scale };
    const projectilePoint = { x: Number.parseFloat(projectile.style.left), y: Number.parseFloat(projectile.style.top) };
    return { scale, muzzleError: Math.hypot(muzzlePoint.x - projectilePoint.x, muzzlePoint.y - projectilePoint.y) };
  });
  if (scaledShot.muzzleError > 1) throw new Error(`Scaled projectile no longer originates at the cannon muzzle: ${JSON.stringify(scaledShot)}`);
  await page.screenshot({ path: path.join(output, 'ultrawide-fit.png'), fullPage: false });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(350);
  const landscapeMobileFit = await page.evaluate(() => {
    const shell = document.querySelector('#gameShell');
    const viewport = document.querySelector('#gameViewport');
    const guard = document.querySelector('#orientationGuard');
    const rect = shell.getBoundingClientRect();
    const scale = Number.parseFloat(viewport.dataset.scale) || 1;
    return {
      scale,
      rect: rect.toJSON(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      widthRatio: rect.width / shell.offsetWidth,
      heightRatio: rect.height / shell.offsetHeight,
      guardVisible: getComputedStyle(guard).display !== 'none',
      compactLandscape: viewport.classList.contains('is-compact-landscape')
    };
  });
  if (!landscapeMobileFit.compactLandscape || landscapeMobileFit.guardVisible || !(landscapeMobileFit.scale < 1)) throw new Error(`Mobile landscape did not use the fitted desktop canvas: ${JSON.stringify(landscapeMobileFit)}`);
  if (landscapeMobileFit.rect.left < -1 || landscapeMobileFit.rect.right > landscapeMobileFit.viewportWidth + 1 || landscapeMobileFit.rect.top < -1 || landscapeMobileFit.rect.bottom > landscapeMobileFit.viewportHeight + 1) throw new Error(`Mobile landscape canvas is not fully visible: ${JSON.stringify(landscapeMobileFit)}`);
  if (Math.abs(landscapeMobileFit.widthRatio - landscapeMobileFit.heightRatio) > .002) throw new Error(`Mobile landscape canvas is not scaled uniformly: ${JSON.stringify(landscapeMobileFit)}`);
  await page.locator('.wall-status').hover();
  await page.waitForTimeout(120);
  const mobileTooltip = await page.locator('#contextTooltip').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      visible: node.classList.contains('is-visible'),
      rect: rect.toJSON(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      text: node.textContent.replace(/\s+/g, ' ').trim(),
      fontSizes: [node, ...node.querySelectorAll('*')].map((child) => Number.parseFloat(getComputedStyle(child).fontSize))
    };
  });
  if (!mobileTooltip.visible || !mobileTooltip.text.includes('护盾') || mobileTooltip.rect.left < 0 || mobileTooltip.rect.right > mobileTooltip.viewport.width || mobileTooltip.rect.top < 0 || mobileTooltip.rect.bottom > mobileTooltip.viewport.height || mobileTooltip.fontSizes.some((size) => size < 14)) throw new Error(`Mobile contextual tooltip is clipped or illegible: ${JSON.stringify(mobileTooltip)}`);
  await page.screenshot({ path: path.join(output, 'mobile-tooltip.png'), fullPage: false });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(output, 'mobile-landscape.png'), fullPage: false });

  await page.evaluate(() => document.querySelector('#rulesButton').click());
  await page.locator('#rulesModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  await page.waitForTimeout(180);
  const mobileRules = await page.evaluate(() => {
    const card = document.querySelector('.rules-card');
    const rect = card.getBoundingClientRect();
    const forgeLabel = document.querySelector('.forge-meter-wrap > span');
    return {
      rect: rect.toJSON(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      horizontalFit: card.scrollWidth <= card.clientWidth + 1,
      sectionCount: card.querySelectorAll('.rule-section').length,
      paused: window.__runeRampartTest.snapshot().paused,
      forgeLabelFits: forgeLabel.scrollWidth <= forgeLabel.clientWidth + 1,
      hasInlineRule: Boolean(document.querySelector('.forge-rule'))
    };
  });
  if (!mobileRules.horizontalFit || mobileRules.sectionCount !== 6 || !mobileRules.paused || !mobileRules.forgeLabelFits || mobileRules.hasInlineRule || mobileRules.rect.left < -2 || mobileRules.rect.right > mobileRules.viewportWidth + 2 || mobileRules.rect.top < -2 || mobileRules.rect.bottom > mobileRules.viewportHeight + 2) throw new Error(`Small-screen rules or upgrade layout overflows: ${JSON.stringify(mobileRules)}`);
  await assertMinimumFont(page, 'Mobile landscape rules');
  await page.screenshot({ path: path.join(output, 'mobile-rules.png'), fullPage: false });
  await page.locator('#rulesClose').click();
  if (await page.evaluate(() => window.__runeRampartTest.snapshot().paused)) throw new Error('Closing mobile rules did not resume the battle');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const portraitGuard = await page.evaluate(() => ({
    visible: getComputedStyle(document.querySelector('#orientationGuard')).display !== 'none',
    message: document.querySelector('#orientationGuard').innerText,
    shellInert: document.querySelector('#gameShell').inert,
    bodyLocked: document.body.classList.contains('portrait-game-locked'),
    fits: document.documentElement.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollHeight <= window.innerHeight + 1
  }));
  if (!portraitGuard.visible || !portraitGuard.shellInert || !portraitGuard.bodyLocked || !portraitGuard.fits || !portraitGuard.message.includes('请将设备横过来') || !portraitGuard.message.includes('电脑')) throw new Error(`Portrait orientation guard is incomplete: ${JSON.stringify(portraitGuard)}`);
  await assertMinimumFont(page, 'Portrait orientation guard');
  await page.screenshot({ path: path.join(output, 'mobile-portrait-guard.png'), fullPage: false });
  await page.evaluate(() => document.querySelector('#helpButton').click());
  await page.locator('#introModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  await page.waitForTimeout(300);
  const mobileDialogFits = await page.locator('.campaign-briefing').evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
  if (!mobileDialogFits) throw new Error('Mobile campaign options overflow horizontally');
  if (!await page.locator('.briefing-device-note').innerText().then((text) => text.includes('电脑端体验最佳') && text.includes('横屏'))) throw new Error('Portrait welcome screen is missing the device guidance');
  await assertMinimumFont(page, 'Mobile welcome');
  await page.screenshot({ path: path.join(output, 'mobile-welcome.png'), fullPage: false });

  await page.locator('#introClose').click();
  await page.evaluate(() => window.__runeRampartTest.clearWave(100));
  await page.locator('#victoryModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  const victoryView = await page.evaluate(() => {
    const history = window.__runeRampartTest.history();
    const card = document.querySelector('.victory-card');
    return {
      rank: document.querySelector('#victoryRank').textContent,
      difficulty: document.querySelector('#victoryDifficulty').textContent,
      kills: document.querySelector('#victoryKills').textContent,
      matches: document.querySelector('#victoryMatches').textContent,
      time: document.querySelector('#victoryTime').textContent,
      score: document.querySelector('#victoryScore').textContent,
      breakdown: document.querySelector('#victoryScoreBreakdown').textContent,
      boardParent: document.querySelector('#historyBoard').parentElement?.id,
      currentRows: document.querySelectorAll('#historyRows tr.is-current').length,
      rows: [...document.querySelectorAll('#historyRows tr')].map((row) => [...row.cells].map((cell) => cell.textContent)),
      history,
      horizontalFit: card.scrollWidth <= card.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  });
  if (victoryView.rank !== '#01' || victoryView.difficulty !== '老兵' || victoryView.boardParent !== 'victoryHistorySlot' || victoryView.currentRows !== 1 || victoryView.rows[0]?.[2] !== '100 波' || !victoryView.breakdown.includes('波次 150,000') || !victoryView.breakdown.includes('速通奖励') || !victoryView.history[0]?.victory || victoryView.history[0]?.clearedWaves !== 100 || victoryView.score.replace(/\D/g, '') !== String(victoryView.history[0]?.settlementScore) || !victoryView.horizontalFit) throw new Error(`Victory settlement does not show and highlight the persisted leaderboard: ${JSON.stringify(victoryView)}`);
  await page.locator('[data-history-filter="veteran"]').click();
  if (await page.locator('#historyRows tr.is-current td').first().innerText() !== '#01') throw new Error('Victory leaderboard cannot switch to and rerank the current difficulty');
  await page.locator('[data-history-filter="all"]').click();
  await assertMinimumFont(page, 'Victory settlement leaderboard');
  await page.screenshot({ path: path.join(output, 'victory-settlement.png'), fullPage: false });
  const speedRanking = await page.evaluate(() => {
    const [fast] = window.__runeRampartTest.history();
    const slow = {
      ...fast,
      id: 'slower-higher-score-clear',
      achievedAt: fast.achievedAt + 1,
      activePlayMs: fast.activePlayMs + 60000,
      settlementScore: fast.settlementScore + 999999,
      baseScore: fast.baseScore + 999999
    };
    return window.__runeRampartTest.setHistory([slow, fast]);
  });
  if (speedRanking[0]?.id === 'slower-higher-score-clear' || !(speedRanking[0]?.activePlayMs < speedRanking[1]?.activePlayMs) || !(speedRanking[0]?.settlementScore < speedRanking[1]?.settlementScore)) throw new Error(`Faster 100-wave clear is not ranked before a slower higher-score clear: ${JSON.stringify(speedRanking)}`);
  await page.locator('#victoryRestartButton').click();
  await page.locator('#introModal.is-open').waitFor({ state: 'visible', timeout: 500 });

  await page.setViewportSize({ width: 1120, height: 900 });
  await page.waitForTimeout(240);
  await page.evaluate(() => window.__runeRampartTest.setHistory([
    { id: 'master-low', achievedAt: 4000, difficulty: 'master', clearedWaves: 0, settlementScore: 1, baseScore: 1, kills: 0, totalMatches: 0, activePlayMs: 1000 },
    { id: 'veteran-late', achievedAt: 3000, difficulty: 'veteran', clearedWaves: 10, settlementScore: 18000, baseScore: 2800, kills: 20, totalMatches: 12, activePlayMs: 100000 },
    { id: 'veteran-early', achievedAt: 2000, difficulty: 'veteran', clearedWaves: 10, settlementScore: 18000, baseScore: 2800, kills: 20, totalMatches: 12, activePlayMs: 100000 },
    { id: 'rookie-high', achievedAt: 1000, difficulty: 'rookie', clearedWaves: 99, settlementScore: 999999, baseScore: 999999, kills: 999, totalMatches: 999, activePlayMs: 999000 }
  ]));
  await page.locator('[data-difficulty="veteran"]').click();
  await page.locator('#startButton').click();
  await page.waitForTimeout(120);
  const settlementHistory = await page.evaluate(() => window.__runeRampartTest.forceFailure({
    difficulty: 'veteran', wave: 13, score: 5000, kills: 42, totalMatches: 18, repaired: 260, activePlayMs: 125000
  }));
  await page.locator('#gameOverModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  const settlementView = await page.evaluate(() => ({
    rank: document.querySelector('#finalRank').textContent,
    difficulty: document.querySelector('#finalDifficulty').textContent,
    wave: document.querySelector('#finalWave').textContent,
    kills: document.querySelector('#finalKills').textContent,
    matches: document.querySelector('#finalMatches').textContent,
    time: document.querySelector('#finalTime').textContent,
    score: document.querySelector('#finalScore').textContent,
    breakdown: document.querySelector('#finalScoreBreakdown').textContent,
    boardParent: document.querySelector('#historyBoard').parentElement?.id,
    currentRows: document.querySelectorAll('#historyRows tr.is-current').length,
    rows: [...document.querySelectorAll('#historyRows tr')].map((row) => [...row.cells].map((cell) => cell.textContent))
  }));
  if (settlementView.rank !== '#02' || settlementView.difficulty !== '老兵' || settlementView.wave !== '12 / 100' || settlementView.kills !== '42' || settlementView.matches !== '18' || settlementView.time !== '02:05' || settlementView.score.replace(/\D/g, '') !== '23250' || !settlementView.breakdown.includes('基础军功 5,000') || !settlementView.breakdown.includes('波次 18,000') || settlementView.boardParent !== 'failureHistorySlot' || settlementView.currentRows !== 1) {
    throw new Error(`Failure settlement does not explain the result: ${JSON.stringify(settlementView)}`);
  }
  const historyIds = settlementHistory.map((record) => record.id);
  if (historyIds[0] !== 'master-low' || historyIds[1] === 'veteran-early' || historyIds.indexOf('veteran-early') > historyIds.indexOf('veteran-late') || historyIds.at(-1) !== 'rookie-high') {
    throw new Error(`History ranking does not follow difficulty, achievement and earlier-time priority: ${JSON.stringify(settlementHistory)}`);
  }
  if (settlementView.rows[0]?.[1] !== '大佬' || settlementView.rows[1]?.[1] !== '老兵' || settlementView.rows.at(-1)?.[1] !== '新手') throw new Error(`History ranking UI order is incorrect: ${JSON.stringify(settlementView.rows)}`);
  await page.locator('[data-history-filter="veteran"]').click();
  const veteranRanking = await page.evaluate(() => ({
    active: document.querySelector('[data-history-filter="veteran"]').getAttribute('aria-pressed'),
    count: document.querySelector('#historyCount').textContent,
    rows: [...document.querySelectorAll('#historyRows tr')].map((row) => [...row.cells].map((cell) => cell.textContent)),
    currentRank: document.querySelector('#historyRows tr.is-current td')?.textContent
  }));
  if (veteranRanking.active !== 'true' || veteranRanking.count !== '3 条战报' || veteranRanking.rows.some((row) => row[1] !== '老兵') || veteranRanking.rows[0]?.[0] !== '#01' || veteranRanking.currentRank !== '#01') throw new Error(`Difficulty-specific ranking did not rerank veteran records: ${JSON.stringify(veteranRanking)}`);
  await page.locator('[data-history-filter="master"]').click();
  const masterRanking = await page.evaluate(() => [...document.querySelectorAll('#historyRows tr')].map((row) => [...row.cells].map((cell) => cell.textContent)));
  if (masterRanking.length !== 1 || masterRanking[0][0] !== '#01' || masterRanking[0][1] !== '大佬') throw new Error(`Master-only ranking is incorrect: ${JSON.stringify(masterRanking)}`);
  await page.locator('[data-history-filter="all"]').click();
  if (await page.locator('#historyRows tr').count() !== 5) throw new Error('Overall ranking did not return after difficulty filtering');
  await assertMinimumFont(page, 'Failure settlement');
  await page.screenshot({ path: path.join(output, 'failure-settlement.png'), fullPage: false });

  const historyPage = await page.context().newPage({ viewport: { width: 1120, height: 900 } });
  await historyPage.goto('http://127.0.0.1:4173/?testMode=1', { waitUntil: 'networkidle' });
  const persistedHistory = await historyPage.evaluate(() => window.__runeRampartTest.history());
  if (persistedHistory.map((record) => record.id).join(',') !== historyIds.join(',')) throw new Error(`Local ranking did not persist after reload: ${JSON.stringify({ historyIds, persistedHistory })}`);
  await historyPage.close();

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS score=${afterScore} enemies=${await page.locator('.enemy').count()} errors=0`);
  await browser.close();
  activeBrowser = null;
})().catch(async (error) => {
  console.error(error);
  if (activeBrowser) await activeBrowser.close();
  process.exitCode = 1;
});
