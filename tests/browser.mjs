import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

// Test-only browser dependency; the game itself has no dependencies.
const require = createRequire(import.meta.url);
const modulePath = process.env.PUPPETEER_MODULE || process.argv[2];
const { default: puppeteer } = await import(modulePath ? pathToFileURL(modulePath).href : require.resolve('puppeteer'));
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_PATH || (existsSync(macChrome) ? macChrome : undefined);
const browser = await puppeteer.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const artifacts = new URL('./artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
await page.evaluateOnNewDocument(() => { Math.random = () => .999999; });
const text = selector => page.$eval(selector, element => element.textContent.trim());
const value = async selector => Number((await text(selector)).replace(/[^\d]/g, ''));
const status = async expected => page.waitForFunction(s => document.body.dataset.state === s, {}, expected);
const fresh = async (mode = 'krillion') => { await page.goto(base, { waitUntil: 'networkidle0' }); await page.click(`#choose-${mode}`); await page.click('#start-button'); await status('playing'); assert.equal(await page.$eval('body', element => element.dataset.mode), mode); };
const submit = async answer => { await page.$eval('#answer-input', (element, answer) => { element.value = answer; element.dispatchEvent(new Event('input', { bubbles: true })); }, answer); await page.click('#submit-button'); await status('feedback'); };
const next = async () => { await page.click('#next-button'); };
const current = () => page.evaluate(() => window.KRILLION_DATA.prompts.find(prompt => prompt.title === document.getElementById('prompt-title').textContent));
const checks = [];
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };

try {
  if (process.argv.includes('--visual')) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    for (const game of ['krillion', 'noillirk']) {
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      await page.goto(base, { waitUntil: 'networkidle0' });
      await page.click(`#choose-${game}`);
      await page.waitForFunction(() => document.getElementById('world-canvas').getContext('2d').getImageData(2, 2, 1, 1).data[1] > 0);
      await page.screenshot({ path: new URL(`${game}-final-menu.png`, artifacts).pathname });
      await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
      await fresh(game);
      for (let i = 0; i < 7; i++) {
        const prompt = await current();
        await submit(prompt.answers.find(answer => answer.tier === (game === 'krillion' ? 'ultra' : 'common')).name);
        await next();
      }
      await status('finished');
      const canvasData = await page.evaluate(() => {
        const canvas = document.getElementById('world-canvas');
        const box = canvas.getBoundingClientRect();
        return { corner: [...canvas.getContext('2d').getImageData(2, 2, 1, 1).data], width: box.width, height: box.height, zIndex: getComputedStyle(canvas).zIndex };
      });
      console.log(game, JSON.stringify(canvasData));
      await page.screenshot({ path: new URL(`${game}-final-verified.png`, artifacts).pathname });
    }
    assert.deepEqual(errors, []);
    console.log('PASS final scene screenshots in both modes, mobile menus, and no JavaScript errors');
  } else {
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  assert.equal(await page.$$eval('.mode-option', options => options.length), 2);
  await page.screenshot({ path: new URL('desktop.png', artifacts).pathname, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.screenshot({ path: new URL('mobile.png', artifacts).pathname, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile must not overflow horizontally');
  console.log(`Screenshots saved: ${artifacts.pathname}desktop.png and mobile.png`);
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });

  await fresh();
  assert.equal(await value('#timer-value'), 25);
  await page.screenshot({ path: new URL('krillion-playing.png', artifacts).pathname });
  await page.waitForFunction(() => +document.getElementById('timer-value').textContent <= 24);
  assert.equal(await value('#round-number'), 1);
  await page.waitForFunction(() => +document.getElementById('round-number').textContent === 2, { timeout: 27000 });
  assert.equal(await value('#total-score'), 0);
  assert.equal(await value('#depth-value'), 0);
  pass('real timer starts at 25, counts down, and automatically advances with zero points');

  await page.evaluate(() => { const realNow = Date.now.bind(Date); window.testTimeOffset = 0; Date.now = () => realNow() + window.testTimeOffset; });
  for (let round = 2; round <= 7; round++) {
    await page.evaluate(() => { window.testTimeOffset += 26000; });
    if (round < 7) await page.waitForFunction(expected => +document.getElementById('round-number').textContent === expected, {}, round + 1);
    else await status('finished');
  }
  assert.equal(await page.$$eval('#summary-body tr', rows => rows.length), 7);
  assert.equal(await page.$$eval('#summary-body tr', rows => rows.every(row => row.textContent.includes('Timeout'))), true);
  assert.equal(await text('#final-score'), '0 / 700');
  pass('seven consecutive timeouts finish the run and produce seven zero-point report rows');

  await fresh();
  const tierPlan = ['common', 'uncommon', 'niche', 'ultra', 'common', 'niche', 'ultra'];
  let total = 0;
  const promptTitles = [];
  for (let i = 0; i < 7; i++) {
    const prompt = await current();
    promptTitles.push(prompt.title);
    const answer = prompt.answers.find(answer => answer.tier === tierPlan[i]);
    assert.ok(answer, `${prompt.id} has ${tierPlan[i]} answers`);
    await submit(answer.name);
    total += answer.points;
    assert.equal(await value('#feedback-points'), answer.points);
    assert.equal(await value('#total-score'), total);
    assert.equal(await value('#depth-value'), total * 10);
    await next();
  }
  await status('finished');
  assert.equal(new Set(promptTitles).size, 7);
  assert.equal(await text('#final-score'), `${total} / 700`);
  assert.equal(await text('#final-depth'), `${(total * 10).toLocaleString('en-US')} m`);
  assert.equal(await page.$$eval('#summary-body tr', rows => rows.length), 7);
  pass('all four scoring tiers award configured points and exact 10m per point; full report displays seven unique prompts');
  await page.screenshot({ path: new URL('report.png', artifacts).pathname, fullPage: true });

  await page.click('#restart-button');
  await status('playing');
  assert.equal(await value('#round-number'), 1);
  assert.equal(await value('#timer-value'), 25);
  assert.equal(await value('#total-score'), 0);
  assert.notEqual(await text('#prompt-title'), promptTitles[0]);
  pass('Play Again resets score, depth, timer, and round and produces a new shuffle');

  await fresh();
  await page.waitForFunction(() => +document.getElementById('timer-value').textContent <= 24);
  await page.type('#answer-input', 'definitely not a country');
  await page.click('#submit-button');
  await status('playing');
  assert.equal(await value('#round-number'), 1);
  assert.equal(await value('#total-score'), 0);
  assert.equal(await value('#depth-value'), 0);
  assert.ok(await value('#timer-value') <= 24, 'invalid retry must not reset the timer');
  assert.match(await text('#input-note'), /try another/i);
  await submit('Bahrain');
  assert.equal(await value('#feedback-points'), 100);
  assert.equal(await page.$$eval('#answer-board li', items => items.length), 5);
  await next();
  await status('playing');
  await page.click('#pass-button');
  await status('feedback');
  assert.equal(await value('#feedback-points'), 0);
  assert.equal(await value('#total-score'), 100);
  pass('invalid answers allow retry without points or timer reset; valid retry reveals the board; Pass records zero');

  await fresh();
  await submit('  TÜRKİYE  ');
  assert.equal(await text('#feedback-answer'), 'Turkey');
  assert.equal(await value('#feedback-points'), 30);
  await fresh();
  await submit('Bahrani');
  assert.equal(await text('#feedback-answer'), 'Bahrain');
  assert.equal(await value('#feedback-points'), 100);
  assert.match(await text('#feedback-detail'), /We read/);
  pass('case, whitespace, accent aliases, and an unambiguous transposition are accepted');

  await fresh();
  await page.type('#answer-input', 'Can');
  await page.waitForSelector('#suggestions:not([hidden])');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#answer-input', element => element.value), 'Canada');
  await page.keyboard.press('Enter');
  await status('feedback');
  assert.equal(await value('#feedback-points'), 10);
  pass('autocomplete works with keyboard selection and submission');

  await fresh();
  await page.evaluate(() => { Date.now = () => 9e15; document.getElementById('answer-input').value = 'Bahrain'; document.getElementById('answer-form').requestSubmit(); });
  await page.waitForFunction(() => +document.getElementById('round-number').textContent === 2);
  assert.equal(await value('#total-score'), 0);
  pass('an answer submitted after the deadline cannot earn points');

  await fresh();
  for (let i = 0; i < 7; i++) { const prompt = await current(); await submit(prompt.answers.find(answer => answer.tier === 'ultra').name); await next(); }
  await status('finished');
  assert.equal(await text('#final-score'), '700 / 700');
  assert.equal(await text('#final-depth'), '7,000 m');
  assert.equal(await text('#depth-zone'), 'The Krillion deep');
  await page.screenshot({ path: new URL('perfect-run.png', artifacts).pathname, fullPage: true });
  pass('a perfect seven-answer run reaches 700 points and 7,000m with the final trench milestone');

  await fresh('noillirk');
  await page.evaluate(() => { const realNow = Date.now.bind(Date); window.testTimeOffset = 0; Date.now = () => realNow() + window.testTimeOffset; });
  for (let round = 1; round <= 7; round++) {
    await page.evaluate(() => { window.testTimeOffset += 26000; });
    if (round < 7) await page.waitForFunction(expected => +document.getElementById('round-number').textContent === expected, {}, round + 1);
    else await status('finished');
  }
  assert.equal(await text('#final-score'), '0 / 700');
  assert.equal(await page.$$eval('#summary-body tr', rows => rows.filter(row => row.textContent.includes('Timeout')).length), 7);
  pass('Noillirk also automatically advances every timeout and completes a zero-point run');

  await fresh('noillirk');
  await page.screenshot({ path: new URL('noillirk-playing.png', artifacts).pathname });
  const commonPoints = { common: 100, uncommon: 60, niche: 30, ultra: 10 };
  let altitudeScore = 0;
  for (let i = 0; i < 7; i++) {
    const prompt = await current();
    const answer = prompt.answers.find(answer => answer.tier === tierPlan[i]);
    await submit(answer.name);
    altitudeScore += commonPoints[answer.tier];
    assert.equal(await value('#feedback-points'), commonPoints[answer.tier]);
    assert.equal(await value('#total-score'), altitudeScore);
    assert.equal(await value('#depth-value'), altitudeScore * 10);
    await next();
  }
  await status('finished');
  assert.equal(await text('#final-score'), `${altitudeScore} / 700`);
  assert.equal(await text('#final-depth'), `${(altitudeScore * 10).toLocaleString('en-US')} m`);
  pass('Noillirk reverses every scoring tier, rewards common answers, and records altitude at 10m per point');

  await page.click('#restart-button');
  await status('playing');
  assert.equal(await page.$eval('body', element => element.dataset.mode), 'noillirk');
  await page.click('#change-mode-button');
  await status('ready');
  assert.equal(await value('#total-score'), 0);
  await page.click('#choose-krillion');
  await page.click('#start-button');
  await status('playing');
  assert.equal(await value('#timer-value'), 25);
  assert.equal(await value('#round-number'), 1);
  assert.equal(await value('#total-score'), 0);
  pass('mode switching clears an active run and starts the selected game with a fresh timer and score');

  await fresh('noillirk');
  for (let i = 0; i < 7; i++) { const prompt = await current(); await submit(prompt.answers.find(answer => answer.tier === 'common').name); await next(); }
  await status('finished');
  assert.equal(await text('#final-score'), '700 / 700');
  assert.equal(await text('#final-depth'), '7,000 m');
  assert.equal(await text('#depth-zone'), 'On top of the world');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => {
    const pixel = document.getElementById('world-canvas').getContext('2d').getImageData(2, 2, 1, 1).data;
    return pixel[2] > pixel[0] && pixel[2] > pixel[1] && pixel[0] > 5;
  });
  pass('the final sky world renders a colored night scene and supports reduced motion');
  await page.screenshot({ path: new URL('noillirk-perfect-run.png', artifacts).pathname, fullPage: true });
  await page.goto(base, { waitUntil: 'networkidle0' });
  assert.equal(await text('#best-noillirk'), '7,000 m');
  assert.equal(await text('#best-krillion'), '7,000 m');
  assert.equal(await page.$eval('body', element => element.dataset.mode), 'noillirk');
  pass('Noillirk perfect run reaches 700 points and 7,000m; both personal bests and mode choice persist after reload');

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.screenshot({ path: new URL('dual-mode-menu-mobile.png', artifacts).pathname, fullPage: true });
  await page.click('#start-button');
  await status('playing');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: new URL('noillirk-mobile-playing.png', artifacts).pathname });
  await page.type('#answer-input', 'Japan');
  await page.click('#submit-button');
  await status('feedback');
  assert.equal(await value('#feedback-points'), 100);
  pass('mobile menu and active game fit the viewport and accept a scored answer');
  assert.deepEqual(errors, []);
  pass('no browser JavaScript errors');
  await writeFile(new URL('results.json', artifacts), JSON.stringify({ passed: checks.length, checks, errors, browser: await browser.version() }, null, 2));
  console.log(`All ${checks.length} browser checks passed.`);
  }
} finally { await browser.close(); }
