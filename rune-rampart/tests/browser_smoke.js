const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

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

let activeBrowser;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
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
  if (await page.title() !== '符文壁垒 · Rune Rampart') throw new Error('Unexpected page title');
  if (!await page.locator('#introModal').evaluate((node) => node.classList.contains('is-open'))) throw new Error('Briefing modal is not open');
  await page.locator('#startButton').click();
  await page.waitForTimeout(700);

  if (await page.locator('.rune-tile').count() !== 49) throw new Error('Board does not have 49 tiles');
  if (await page.locator('#waveValue').innerText() !== '01') throw new Error('Wave one did not start');
  if (await page.locator('#soundButton').evaluate((node) => node.classList.contains('is-muted'))) throw new Error('Sound should start enabled');
  await page.locator('#soundButton').click();
  if (!await page.locator('#soundButton').evaluate((node) => node.classList.contains('is-muted'))) throw new Error('Sound mute toggle failed');
  await page.locator('#soundButton').click();
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });

  await page.evaluate(() => window.__runeRampartTest.grantForge(18));
  await page.locator('.equipment-card.is-upgraded').waitFor({ state: 'visible', timeout: 800 });
  await page.locator('#equipmentUpgradeBanner.is-visible').waitFor({ state: 'visible', timeout: 800 });
  const equipmentLevelTotal = await page.locator('#weaponLevel, #armorLevel, #charmLevel').evaluateAll(
    (nodes) => nodes.reduce((total, node) => total + Number(node.textContent), 0)
  );
  if (equipmentLevelTotal !== 4) throw new Error(`Equipment upgrade did not apply: ${equipmentLevelTotal}`);
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(output, 'equipment-upgrade.png'), fullPage: true });
  await page.waitForTimeout(1900);

  const beforeScore = Number(await page.locator('#scoreValue').innerText());
  const classes = await page.locator('.rune-tile').evaluateAll((nodes) => nodes.map((node) => node.className));
  const board = classes.map((value) => ['ember', 'mana', 'moss', 'coin'].find((kind) => value.includes(kind)));
  const [first, second] = validSwap(board);
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

  await page.waitForTimeout(1500);
  if (await page.locator('.enemy').count() < 1) throw new Error('No enemy spawned');
  if (await page.locator('#targetDossier').evaluate((node) => node.classList.contains('is-empty'))) throw new Error('Target dossier did not acquire an enemy');
  if (Number(await page.locator('#targetAttack').innerText()) <= 0) throw new Error('Enemy attack is not displayed');
  if (Number(await page.locator('#targetDefense').innerText()) < 0) throw new Error('Enemy defense is not displayed');
  if ((await page.locator('.enemy-label').first().innerText()).length < 3) throw new Error('Enemy name is missing');
  await page.screenshot({ path: path.join(output, 'enemy-dossier.png'), fullPage: false });
  await page.locator('#pauseButton').click();
  if (!await page.locator('#boardLock').evaluate((node) => node.classList.contains('is-visible'))) throw new Error('Pause lock is not visible');
  await page.locator('#pauseButton').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Mobile layout overflows horizontally');
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS score=${afterScore} enemies=${await page.locator('.enemy').count()} errors=0`);
  await browser.close();
  activeBrowser = null;
})().catch(async (error) => {
  console.error(error);
  if (activeBrowser) await activeBrowser.close();
  process.exitCode = 1;
});
