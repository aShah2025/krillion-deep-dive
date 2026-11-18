import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

// Test-only browser dependency; the game itself has no dependencies.
const require = createRequire(import.meta.url);
const modulePath = process.env.PUPPETEER_MODULE;
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
const fresh = async () => { await page.goto(base, { waitUntil: 'networkidle0' }); await page.click('#start-button'); await status('playing'); };
const submit = async answer => { await page.$eval('#answer-input', (element, answer) => { element.value = answer; element.dispatchEvent(new Event('input', { bubbles: true })); }, answer); await page.click('#submit-button'); await status('feedback'); };
const next = async () => { await page.click('#next-button'); };
const current = () => page.evaluate(() => window.KRILLION_DATA.prompts.find(prompt => prompt.title === document.getElementById('prompt-title').textContent));
const checks = [];
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };

try {
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: new URL('desktop.png', artifacts).pathname, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.screenshot({ path: new URL('mobile.png', artifacts).pathname, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile must not overflow horizontally');
  console.log(`Screenshots saved: ${artifacts.pathname}desktop.png and mobile.png`);
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });

  await fresh();
  assert.equal(await value('#timer-value'), 25);
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
  await submit('definitely not a country');
  assert.equal(await value('#feedback-points'), 0);
  assert.equal(await value('#depth-value'), 0);
  await next();
  await status('playing');
  pass('invalid answer awards zero and next prompt remains playable');

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
  assert.deepEqual(errors, []);
  pass('no browser JavaScript errors');
  await writeFile(new URL('results.json', artifacts), JSON.stringify({ passed: checks.length, checks, errors, browser: await browser.version() }, null, 2));
  console.log(`All ${checks.length} browser checks passed.`);
} finally { await browser.close(); }
