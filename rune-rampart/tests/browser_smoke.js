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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
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
  await assertMinimumFont(page, 'Desktop welcome');
  await page.screenshot({ path: path.join(output, 'welcome.png'), fullPage: false });
  await page.locator('[data-difficulty="veteran"]').click();
  if (!await page.locator('[data-difficulty="veteran"]').evaluate((node) => node.classList.contains('is-selected'))) throw new Error('Veteran difficulty was not selected');
  await page.locator('#startButton').click();
  await page.waitForTimeout(700);

  if (await page.locator('.rune-tile').count() !== 49) throw new Error('Board does not have 49 tiles');
  await assertMinimumFont(page, 'Desktop game');
  if (await page.locator('#waveValue').innerText() !== '001') throw new Error('Wave one did not start');
  if (await page.locator('#difficultyValue').innerText() !== '老兵') throw new Error('Selected difficulty was not applied');
  if (await page.locator('#fullscreenButton').getAttribute('aria-label') !== '进入全屏') throw new Error('Fullscreen control is not ready');
  if (await page.locator('#soundButton').evaluate((node) => node.classList.contains('is-muted'))) throw new Error('Sound should start enabled');
  await page.locator('#soundButton').click();
  if (!await page.locator('#soundButton').evaluate((node) => node.classList.contains('is-muted'))) throw new Error('Sound mute toggle failed');
  await page.locator('#soundButton').click();
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });

  await page.locator('[data-upgrade="weapon"]').click();
  await page.evaluate(() => window.__runeRampartTest.grantForge(16));
  await page.locator('.loadout-stat.is-upgraded').waitFor({ state: 'visible', timeout: 800 });
  await page.locator('#equipmentUpgradeBanner.is-visible').waitFor({ state: 'visible', timeout: 800 });
  const equipmentLevelTotal = await page.locator('#weaponLevel, #armorLevel, #charmLevel').evaluateAll(
    (nodes) => nodes.reduce((total, node) => total + Number(node.textContent), 0)
  );
  if (equipmentLevelTotal !== 4 || await page.locator('#weaponLevel').innerText() !== '2') throw new Error(`Attack-priority upgrade did not apply: ${equipmentLevelTotal}`);
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
    const before = document.querySelectorAll('.projectile').length;
    const burst = window.__runeRampartTest.fireBurst();
    return { ...burst, projectilesAdded: document.querySelectorAll('.projectile').length - before };
  });
  if (burstResult.volleySize !== 2 || burstResult.projectilesAdded < 2) throw new Error(`Attack-speed multishot did not render: ${JSON.stringify(burstResult)}`);
  await page.screenshot({ path: path.join(output, 'multishot.png'), fullPage: false });

  const beforeScore = Number(await page.locator('#scoreValue').innerText());
  const classes = await page.locator('.rune-tile').evaluateAll((nodes) => nodes.map((node) => node.className));
  const board = classes.map((value) => ['ember', 'mana', 'moss', 'coin'].find((kind) => value.includes(kind)));
  const [first, second] = validSwap(board);
  const swappedBoard = [...board];
  [swappedBoard[first], swappedBoard[second]] = [swappedBoard[second], swappedBoard[first]];
  const futureMatches = [...matched(swappedBoard)];
  const relicIndex = futureMatches.find((index) => index !== first && index !== second)
    ?? (futureMatches[0] === first ? second : futureMatches[0] === second ? first : futureMatches[0]);
  await page.evaluate(({ relicIndex }) => {
    window.__runeRampartTest.clearRuneRelics();
    window.__runeRampartTest.setRuneRelic(relicIndex, 'frost');
  }, { relicIndex });
  if (await page.locator('.rune-relic-mark').count() !== 1) throw new Error('Forced rune Easter egg marker did not render');
  await page.locator('.rune-tile').nth(first).click();
  await page.locator('.rune-tile').nth(second).click();
  await page.locator('.match-primed').first().waitFor({ state: 'visible', timeout: 700 });
  await page.waitForTimeout(140);
  await page.screenshot({ path: path.join(output, 'animation-charge.png'), fullPage: false });
  await page.locator('.matched').first().waitFor({ state: 'attached', timeout: 900 });
  await page.waitForTimeout(90);
  await page.screenshot({ path: path.join(output, 'animation-burst.png'), fullPage: false });
  await page.locator('.is-dropping').first().waitFor({ state: 'attached', timeout: 900 });
  await page.waitForTimeout(190);
  await page.screenshot({ path: path.join(output, 'animation-drop.png'), fullPage: false });
  await page.waitForTimeout(700);
  const afterScore = Number(await page.locator('#scoreValue').innerText());
  if (!(afterScore > beforeScore)) throw new Error(`Match did not score: ${beforeScore} -> ${afterScore}`);
  await page.locator('.combat-buff.frost').waitFor({ state: 'visible', timeout: 800 });
  await page.evaluate(() => {
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

  await page.waitForTimeout(1500);
  if (await page.locator('.enemy').count() < 1) throw new Error('No enemy spawned');
  await page.evaluate(() => {
    window.__runeRampartTest.spawnEnemy('swift');
    window.__runeRampartTest.spawnEnemy('assault');
    window.__runeRampartTest.spawnEnemy('brute');
    window.__runeRampartTest.spawnEnemy('boss');
  });
  for (const type of ['swift', 'assault', 'brute', 'boss']) {
    if (await page.locator(`.enemy.${type}`).count() < 1) throw new Error(`Distinct ${type} enemy did not render`);
  }
  if (await page.locator('#targetDossier').evaluate((node) => node.classList.contains('is-empty'))) throw new Error('Target dossier did not acquire an enemy');
  if (Number(await page.locator('#targetAttack').innerText()) <= 0) throw new Error('Enemy attack is not displayed');
  if (Number(await page.locator('#targetDefense').innerText()) < 0) throw new Error('Enemy defense is not displayed');
  if ((await page.locator('.enemy-label').first().innerText()).length < 3) throw new Error('Enemy name is missing');
  const aimAngle = await page.locator('#fortress').evaluate((node) => node.style.getPropertyValue('--aim-angle'));
  if (!aimAngle.includes('rad')) throw new Error('Turret did not aim at its target');
  await page.evaluate(() => window.__runeRampartTest.grantRelic('blast'));
  await page.locator('.combat-buff.blast').waitFor({ state: 'visible', timeout: 500 });
  await page.locator('.impact-flash.blast').first().waitFor({ state: 'attached', timeout: 1800 });
  await page.screenshot({ path: path.join(output, 'enemy-dossier.png'), fullPage: false });
  await page.locator('#pauseButton').click();
  if (!await page.locator('#boardLock').evaluate((node) => node.classList.contains('is-visible'))) throw new Error('Pause lock is not visible');
  await page.locator('#pauseButton').click();

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
      ideal: test.simulateBalance('master', 1),
      nearIdeal: test.simulateBalance('master', .95)
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
  }
  const wave10 = balance.samples.find((sample) => sample.wave === 10).master;
  const wave11 = balance.samples.find((sample) => sample.wave === 11).master;
  const wave100 = balance.samples.find((sample) => sample.wave === 100).master;
  if (!wave10.isBossWave || wave11.stage !== wave10.stage + 1 || !(wave11.hpScale > wave10.hpScale)) throw new Error('Ten-wave step-up is not calibrated');
  if (wave100.stage !== 10 || wave100.bossCount !== 3 || wave100.batchSize !== 4 || wave100.requiredGroups !== 20) throw new Error(`Wave 100 profile is incorrect: ${JSON.stringify(wave100)}`);
  balance.masterCurve.forEach((profile, index) => {
    if (index === 0) return;
    const previous = balance.masterCurve[index - 1];
    if (profile.enemyCount < previous.enemyCount || profile.requiredGroups < previous.requiredGroups) throw new Error(`Master pressure regresses at wave ${profile.wave}`);
    if (!(profile.hpScale > previous.hpScale && profile.damageScale > previous.damageScale && profile.defenseScale > previous.defenseScale)) throw new Error(`Master stats do not rise at wave ${profile.wave}`);
    if (profile.wave % 10 === 0 && !profile.isBossWave) throw new Error(`Boss wave missing at ${profile.wave}`);
    if (profile.wave % 10 === 1 && profile.wave > 1 && profile.stage !== previous.stage + 1) throw new Error(`Stage transition missing at ${profile.wave}`);
  });
  if (balance.ideal.firstFailure !== null || !(balance.ideal.minimumMargin > 1 && balance.ideal.minimumMargin < 1.08)) throw new Error(`Ideal master curve is not tuned to the edge: ${JSON.stringify(balance.ideal)}`);
  if (!(balance.nearIdeal.firstFailure >= 50 && balance.nearIdeal.firstFailure < 100)) throw new Error(`Near-ideal play should fail before wave 100: ${JSON.stringify(balance.nearIdeal)}`);
  const idealLevels = Object.values(balance.ideal.equipment);
  if (Math.max(...idealLevels) - Math.min(...idealLevels) > 1) throw new Error(`Ideal auto-upgrade is not balanced: ${JSON.stringify(balance.ideal.equipment)}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__runeRampartTest.grantRelic('blast'));
  const mobileBuffLayout = await page.evaluate(() => {
    const buff = document.querySelector('.combat-buff').getBoundingClientRect();
    const turret = document.querySelector('.turret').getBoundingClientRect();
    return { buff: buff.toJSON(), turret: turret.toJSON(), overlapsTurret: buff.left < turret.right && buff.right > turret.left && buff.top < turret.bottom && buff.bottom > turret.top };
  });
  if (mobileBuffLayout.overlapsTurret) throw new Error(`Mobile relic effect frame overlaps the turret: ${JSON.stringify(mobileBuffLayout)}`);
  const mobileOverflow = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return getComputedStyle(node).display !== 'none' && (rect.right > window.innerWidth + 1 || rect.left < -1);
      })
      .slice(0, 12)
      .map((node) => ({ tag: node.tagName, id: node.id, className: node.className, rect: node.getBoundingClientRect().toJSON() }))
  }));
  if (!mobileOverflow.fits) throw new Error(`Mobile layout overflows horizontally: ${JSON.stringify(mobileOverflow)}`);
  await assertMinimumFont(page, 'Mobile game');
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  await page.evaluate(() => window.__runeRampartTest.clearRelics());
  await page.locator('#helpButton').click();
  await page.locator('#introModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  await page.waitForTimeout(300);
  const mobileDialogFits = await page.locator('.campaign-briefing').evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
  if (!mobileDialogFits) throw new Error('Mobile campaign options overflow horizontally');
  await assertMinimumFont(page, 'Mobile welcome');
  await page.screenshot({ path: path.join(output, 'mobile-welcome.png'), fullPage: false });

  await page.locator('#introClose').click();
  await page.evaluate(() => window.__runeRampartTest.clearWave(100));
  await page.locator('#victoryModal.is-open').waitFor({ state: 'visible', timeout: 500 });
  await page.locator('#victoryRestartButton').click();
  await page.locator('#introModal.is-open').waitFor({ state: 'visible', timeout: 500 });

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS score=${afterScore} enemies=${await page.locator('.enemy').count()} errors=0`);
  await browser.close();
  activeBrowser = null;
})().catch(async (error) => {
  console.error(error);
  if (activeBrowser) await activeBrowser.close();
  process.exitCode = 1;
});
