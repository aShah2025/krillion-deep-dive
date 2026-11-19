/* Two local games, one answer bank. No account, API, or build step. */
(() => {
  'use strict';
  const { prompts } = window.KRILLION_DATA;
  const $ = id => document.getElementById(id);
  const number = value => value.toLocaleString('en-US');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]/g, '');
  const ROUND_LENGTH = 25, RUN_LENGTH = 7;
  const modes = {
    krillion: {
      name: 'Krillion', direction: 'deeper', distanceLabel: 'DEPTH', rule: 'RARE ANSWERS WIN',
      description: 'The rarer your answer, the deeper your little explorer goes.',
      points: { common: 10, uncommon: 30, niche: 60, ultra: 100 },
      labels: { common: 'Common / Surface', uncommon: 'Uncommon', niche: 'Niche', ultra: 'One in a Krillion' },
      zones: [[0, 'At the surface'], [200, 'Twilight zone'], [1000, 'Midnight zone'], [4000, 'The abyss'], [6000, 'Hadal trench'], [7000, 'The Krillion deep']]
    },
    noillirk: {
      name: 'Noillirk', direction: 'higher', distanceLabel: 'ALTITUDE', rule: 'COMMON ANSWERS WIN',
      description: 'The more familiar your answer, the higher your little explorer flies.',
      points: { common: 100, uncommon: 60, niche: 30, ultra: 10 },
      labels: { common: 'Crowd favorite', uncommon: 'Familiar pick', niche: 'Less common', ultra: 'Off the beaten path' },
      zones: [[0, 'The forest pond'], [200, 'Above the treetops'], [1000, 'Cloud country'], [2500, 'Mountain air'], [4500, 'Above the clouds'], [6000, 'The evening sky'], [7000, 'On top of the world']]
    }
  };
  const state = { mode: 'krillion', status: 'ready', deck: [], index: 0, results: [], score: 0, deadline: 0, interval: null, lastDeck: '', lastRejected: '' };
  let suggestionAnswers = [], selectedSuggestion = -1, soundOn = false, audioContext;
  const mode = () => modes[state.mode];
  function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function writeStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Play also works with storage disabled. */ } }
  const storedBests = readStorage('krill-bests', {});
  const bests = Object.fromEntries(Object.keys(modes).map(key => [key, Math.max(0, Math.min(700, Number(storedBests?.[key]) || 0))]));

  function setStatus(status) {
    state.status = status;
    document.body.dataset.state = status;
    window.KrillionWorld?.setState(status);
  }
  function stopTimer() { clearInterval(state.interval); state.interval = null; }
  function renderTimer(seconds) {
    $('timer-value').textContent = seconds;
    $('timer').setAttribute('aria-label', `${seconds} seconds remaining`);
    $('timer-ring').style.strokeDashoffset = 175.93 * (1 - seconds / ROUND_LENGTH);
    $('timer').classList.toggle('urgent', seconds <= 5);
  }
  function tick() {
    if (state.status !== 'playing') return;
    const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    renderTimer(seconds);
    if (!seconds) { resolveAnswer(null, state.lastRejected, 'timeout'); advance(); }
  }
  function startTimer() {
    stopTimer();
    state.deadline = Date.now() + ROUND_LENGTH * 1000;
    renderTimer(ROUND_LENGTH);
    state.interval = setInterval(tick, 100);
  }
  function renderProgress() {
    $('round-number').textContent = Math.min(state.index + 1, RUN_LENGTH);
    $('progress-dots').replaceChildren(...Array.from({ length: RUN_LENGTH }, (_, index) => {
      const dot = document.createElement('i');
      dot.className = `progress-dot${state.results[index] ? state.results[index].points ? ' done' : ' missed' : index === state.index ? ' current' : ''}`;
      return dot;
    }));
    $('progress-dots').setAttribute('aria-label', `${state.results.length} of 7 prompts completed`);
  }
  function renderDepth() {
    const distance = state.score * 10;
    const zone = [...mode().zones].reverse().find(([threshold]) => distance >= threshold)[1];
    $('depth-value').textContent = number(distance);
    $('depth-zone').textContent = zone;
    $('total-score').replaceChildren(document.createTextNode(`${state.score} `), Object.assign(document.createElement('small'), { textContent: 'pts' }));
    $('distance-label').textContent = mode().distanceLabel;
    window.KrillionWorld?.setProgress(state.score);
  }
  function renderBests() { for (const key of Object.keys(modes)) $(`best-${key}`).textContent = `${number(bests[key] * 10)} m`; }
  function renderGuide() {
    const keys = state.mode === 'krillion' ? ['common', 'uncommon', 'niche', 'ultra'] : ['ultra', 'niche', 'uncommon', 'common'];
    $('guide-title').textContent = state.mode === 'krillion' ? 'RARE ANSWERS TAKE YOU DEEPER' : 'COMMON ANSWERS LIFT YOU HIGHER';
    $('tier-grid').replaceChildren(...keys.map(key => {
      const item = document.createElement('div'); item.className = `tier-item ${key}`;
      const label = document.createElement('span'); label.className = 'tier-label'; label.textContent = mode().labels[key];
      const points = document.createElement('strong'); points.className = 'tier-points'; points.textContent = `${mode().points[key]} pts`;
      item.append(label, points); return item;
    }));
    $('help-intro').textContent = `${mode().name}: seven prompts, 25 seconds each. ${state.mode === 'krillion' ? 'Think of a valid answer few people would name.' : 'Think of a familiar answer most people would name.'}`;
    $('help-tiers').replaceChildren(...keys.map(key => {
      const item = document.createElement('li');
      const label = document.createElement('span'); label.textContent = mode().labels[key];
      const points = document.createElement('strong'); points.textContent = `${mode().points[key]} pts`;
      item.append(label, points); return item;
    }));
    $('help-mode').textContent = `Every point takes you 10 meters ${mode().direction}. A perfect 700-point run reaches 7,000 m. Passing or running out of time scores zero. After an accepted answer or a pass, choose Next prompt to start the next timer. Timeouts advance automatically.`;
  }
  function chooseMode(key) {
    if (!Object.hasOwn(modes, key) || state.status !== 'ready') return;
    state.mode = key; writeStorage('krill-mode', key);
    document.body.dataset.mode = key;
    for (const option of Object.keys(modes)) $(`choose-${option}`).setAttribute('aria-pressed', String(option === key));
    $('brand-name').replaceChildren(document.createTextNode(mode().name.toLowerCase()), Object.assign(document.createElement('span'), { textContent: '.' }));
    document.querySelector('.brand-tag').textContent = key === 'krillion' ? '& noillirk' : '& krillion';
    $('mode-description').textContent = mode().description;
    $('start-button').textContent = `Play ${mode().name}`;
    $('round-caption').textContent = `${mode().name.toUpperCase()} · ${mode().rule}`;
    $('scene-caption').textContent = key === 'krillion' ? 'A whole ocean of possibilities.' : 'A little guess. A big lift.';
    $('answer-input').placeholder = key === 'krillion' ? 'What would nobody else say?' : 'What would most people say?';
    document.querySelector('meta[name="theme-color"]').content = key === 'krillion' ? '#123d47' : '#355b56';
    window.KrillionWorld?.setMode(key);
    renderGuide(); renderDepth();
  }
  function showMenu() {
    stopTimer(); closeSuggestions();
    state.score = 0; state.index = 0; state.results = [];
    setStatus('ready');
    $('menu-screen').hidden = false; $('game-card').hidden = true; $('results').hidden = true;
    $('flight-hud').hidden = true; $('rarity-guide').hidden = false;
    renderDepth(); renderBests();
    $('start-button').focus({ preventScroll: true });
  }
  function shuffle() {
    const pool = [...prompts];
    for (let index = pool.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[other]] = [pool[other], pool[index]];
    }
    if (pool.slice(0, RUN_LENGTH).map(prompt => prompt.id).join(',') === state.lastDeck) pool.push(pool.shift());
    state.deck = pool.slice(0, RUN_LENGTH);
    state.lastDeck = state.deck.map(prompt => prompt.id).join(',');
  }
  function renderPrompt() {
    const previousTimeout = state.results.at(-1)?.reason === 'timeout';
    setStatus('playing');
    const prompt = state.deck[state.index];
    $('menu-screen').hidden = true; $('results').hidden = true; $('rarity-guide').hidden = true;
    $('flight-hud').hidden = false; $('game-card').hidden = false;
    $('prompt-area').hidden = false; $('feedback-area').hidden = true;
    $('prompt-category').textContent = prompt.category.toUpperCase();
    $('prompt-title').textContent = prompt.title; $('prompt-hint').textContent = prompt.hint;
    $('answer-input').value = ''; $('answer-input').disabled = false;
    $('answer-input').removeAttribute('aria-invalid'); $('answer-input').classList.remove('invalid');
    $('input-note').textContent = previousTimeout ? 'Time ran out. New prompt, fresh start.' : state.mode === 'krillion' ? 'Think past the obvious. Small typos are okay.' : 'Trust your first thought. Small typos are okay.';
    $('input-note').classList.remove('error');
    $('dive-status').textContent = state.mode === 'krillion' ? 'Rare answers win. Go a little deeper.' : 'Common answers win. Think like the crowd.';
    state.lastRejected = '';
    closeSuggestions(); renderProgress(); startTimer();
    $('answer-input').focus({ preventScroll: true });
    $('announcement').textContent = `Prompt ${state.index + 1} of 7. ${prompt.title} 25 seconds.`;
  }
  function startRun() {
    stopTimer(); state.index = 0; state.results = []; state.score = 0;
    shuffle(); renderPrompt(); renderDepth(); tone('start');
  }

  // Adjacent transpositions count as one edit; short aliases require exact matches.
  function distance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
    }
    return matrix[a.length][b.length];
  }
  function matchAnswer(prompt, submitted) {
    const query = normalize(submitted);
    if (!query) return null;
    const exact = prompt.answers.find(answer => [answer.name, ...answer.aliases].some(alias => normalize(alias) === query));
    if (exact) return { answer: exact, corrected: false };
    if (query.length < 5) return null;
    const maxDistance = query.length >= 9 ? 2 : 1;
    const ranked = prompt.answers.map(answer => ({ answer, edits: Math.min(...[answer.name, ...answer.aliases].map(alias => {
      const candidate = normalize(alias);
      return candidate.length < 5 || Math.abs(query.length - candidate.length) > maxDistance ? Infinity : distance(query, candidate);
    })) })).filter(match => match.edits <= maxDistance).sort((a, b) => a.edits - b.edits);
    if (!ranked.length || ranked[1]?.edits === ranked[0].edits) return null;
    return { answer: ranked[0].answer, corrected: true };
  }
  function submitAnswer() {
    if (state.status !== 'playing') return;
    if (Date.now() >= state.deadline) { tick(); return; }
    const submitted = $('answer-input').value.trim();
    const match = matchAnswer(state.deck[state.index], submitted);
    if (!match) {
      state.lastRejected = submitted;
      closeSuggestions();
      $('input-note').textContent = submitted ? 'Not on this answer list — try another while there’s time.' : 'Type an answer, or choose Pass.';
      $('input-note').classList.add('error');
      $('answer-input').setAttribute('aria-invalid', 'true'); $('answer-input').classList.add('invalid');
      $('answer-input').focus({ preventScroll: true }); tone('miss');
      return;
    }
    resolveAnswer(match, submitted, 'answer');
  }
  function resolveAnswer(match, submitted, reason) {
    if (state.status !== 'playing') return;
    stopTimer(); closeSuggestions();
    const answer = match?.answer;
    const result = { prompt: state.deck[state.index], submitted, answer: answer?.name || submitted, tier: answer?.tier || 'invalid', points: answer ? mode().points[answer.tier] : 0, reason, corrected: match?.corrected || false };
    state.results.push(result); state.score += result.points;
    setStatus('feedback'); $('answer-input').disabled = true;
    renderProgress(); renderDepth();
    if (reason === 'timeout') { tone('miss'); return; }
    $('prompt-area').hidden = true; $('feedback-area').hidden = false;
    $('feedback-area').dataset.tier = result.points === 100 ? 'best' : result.tier;
    $('feedback-symbol').textContent = result.points === 100 ? '✷' : result.points ? '✦' : '○';
    $('feedback-tier').textContent = answer ? mode().labels[answer.tier].toUpperCase() : 'PASSED THIS ONE';
    $('feedback-title').textContent = !answer ? 'There’s always the next one.' : result.points === 100 ? state.mode === 'krillion' ? 'One in a Krillion.' : 'You read the room.' : state.mode === 'krillion' ? 'A good little discovery.' : 'You’re on your way up.';
    $('feedback-answer').textContent = answer ? answer.name : 'No answer locked in';
    $('feedback-points').textContent = `+${result.points}`; $('feedback-depth').textContent = number(result.points * 10);
    $('feedback-direction').textContent = mode().direction;
    $('feedback-detail').textContent = result.corrected ? `We read “${submitted}” as ${answer.name}.` : `${number(state.score * 10)} m ${state.mode === 'krillion' ? 'below the surface' : 'above the pond'}. Take a breath before the next prompt.`;
    $('answer-board').replaceChildren(...[...result.prompt.answers].sort((a, b) => mode().points[b.tier] - mode().points[a.tier]).slice(0, 5).map(item => {
      const li = document.createElement('li');
      const name = document.createElement('span'); name.textContent = item.name;
      const points = document.createElement('strong'); points.textContent = `${mode().points[item.tier]} pts`;
      li.append(name, points); return li;
    }));
    $('next-button').replaceChildren(document.createTextNode(state.index === 6 ? 'See your adventure' : 'Next prompt'), Object.assign(document.createElement('span'), { className: 'button-key', textContent: 'ENTER' }));
    $('dive-status').textContent = 'Your next timer waits for you.';
    $('next-button').focus({ preventScroll: true });
    $('announcement').textContent = `${answer?.name || 'Passed'}. ${result.points} points. ${number(state.score * 10)} meters ${mode().direction}.`;
    tone(result.points === 100 ? 'rare' : result.points ? 'find' : 'miss');
  }
  function advance() {
    if (state.status !== 'feedback') return;
    if (state.index === 6) finishRun(); else { state.index++; renderPrompt(); }
  }
  function finishRun() {
    stopTimer(); setStatus('finished');
    $('game-card').hidden = true; $('results').hidden = false;
    $('results-eyebrow').textContent = `${mode().name.toUpperCase()} · ADVENTURE COMPLETE`;
    $('results-heading').textContent = state.score === 700 ? state.mode === 'krillion' ? 'The deepest little legend.' : 'On top of the world.' : state.mode === 'krillion' ? 'A wonderfully obscure adventure.' : 'Great minds fly together.';
    $('final-score').replaceChildren(document.createTextNode(state.score), Object.assign(document.createElement('span'), { textContent: ' / 700' }));
    $('final-depth').replaceChildren(document.createTextNode(number(state.score * 10)), Object.assign(document.createElement('span'), { textContent: ' m' }));
    $('final-distance-label').textContent = state.mode === 'krillion' ? 'DEPTH REACHED' : 'ALTITUDE REACHED';
    $('summary-tier-label').textContent = state.mode === 'krillion' ? 'Rarity' : 'Popularity';
    const bestPicks = state.results.filter(result => result.points === 100).length;
    $('results-description').textContent = `${state.results.filter(result => result.points).length} valid answers · ${bestPicks} ${state.mode === 'krillion' ? 'ultra-rare finds' : 'crowd favorites'} · one little ${state.mode === 'krillion' ? 'dive' : 'climb'}.`;
    $('summary-body').replaceChildren(...state.results.map(result => {
      const row = document.createElement('tr');
      const answerCell = document.createElement('td');
      const prompt = document.createElement('span'); prompt.textContent = result.prompt.title;
      const answer = document.createElement('strong'); answer.textContent = result.reason === 'timeout' ? result.submitted ? `Time ran out · “${result.submitted}” wasn’t accepted` : 'Time ran out · no answer' : result.reason === 'pass' ? 'Passed' : result.corrected ? `${result.submitted} → ${result.answer}` : result.submitted;
      answerCell.append(prompt, answer);
      const tierCell = document.createElement('td'); tierCell.className = result.tier; tierCell.textContent = result.points ? mode().labels[result.tier] : result.reason === 'timeout' ? 'Timeout' : 'Passed';
      const pointsCell = document.createElement('td'); pointsCell.textContent = `+${result.points}`;
      row.append(answerCell, tierCell, pointsCell); return row;
    }));
    bests[state.mode] = Math.max(bests[state.mode], state.score); writeStorage('krill-bests', bests); renderBests();
    $('copy-result-button').textContent = 'Copy result';
    $('restart-button').focus({ preventScroll: true });
    $('announcement').textContent = `${mode().name} complete. ${state.score} points. ${number(state.score * 10)} meters. Your seven-prompt report is ready.`;
    tone('rare');
  }
  function closeSuggestions() {
    suggestionAnswers = []; selectedSuggestion = -1;
    $('suggestions').hidden = true;
    $('answer-input').setAttribute('aria-expanded', 'false'); $('answer-input').removeAttribute('aria-activedescendant');
  }
  function updateSuggestions() {
    const query = normalize($('answer-input').value); closeSuggestions();
    $('answer-input').removeAttribute('aria-invalid'); $('answer-input').classList.remove('invalid');
    if (query.length < 3 || state.status !== 'playing') return;
    suggestionAnswers = state.deck[state.index].answers.filter(answer => [answer.name, ...answer.aliases].some(alias => normalize(alias).startsWith(query))).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4);
    if (!suggestionAnswers.length) return;
    $('suggestions').replaceChildren(...suggestionAnswers.map((answer, index) => {
      const item = document.createElement('li'); item.id = `suggestion-${index}`;
      item.setAttribute('role', 'option'); item.setAttribute('aria-selected', 'false'); item.textContent = answer.name;
      item.addEventListener('pointerdown', event => { event.preventDefault(); chooseSuggestion(index); }); return item;
    }));
    $('suggestions').hidden = false; $('answer-input').setAttribute('aria-expanded', 'true');
  }
  function chooseSuggestion(index) {
    if (!suggestionAnswers[index]) return;
    $('answer-input').value = suggestionAnswers[index].name; closeSuggestions(); $('answer-input').focus({ preventScroll: true });
  }
  function tone(kind) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const notes = kind === 'rare' ? [440, 554, 660, 880] : kind === 'miss' ? [170, 130] : kind === 'start' ? [330, 440, 660] : [440, 660];
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        const start = audioContext.currentTime + index * .1;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.035, start + .015); gain.gain.exponentialRampToValueAtTime(.001, start + .3);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .31);
      });
    } catch { /* Sound is optional. */ }
  }
  for (const key of Object.keys(modes)) $(`choose-${key}`).addEventListener('click', () => chooseMode(key));
  $('start-button').addEventListener('click', startRun); $('restart-button').addEventListener('click', startRun);
  for (const id of ['home-button', 'change-mode-button', 'results-menu-button']) $(id).addEventListener('click', showMenu);
  $('next-button').addEventListener('click', advance);
  $('answer-form').addEventListener('submit', event => { event.preventDefault(); submitAnswer(); });
  $('pass-button').addEventListener('click', () => { if (state.status === 'playing') { if (Date.now() >= state.deadline) tick(); else resolveAnswer(null, state.lastRejected, 'pass'); } });
  $('answer-input').addEventListener('input', updateSuggestions); $('answer-input').addEventListener('blur', closeSuggestions);
  $('answer-input').addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeSuggestions(); return; }
    if (!suggestionAnswers.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const delta = event.key === 'ArrowDown' ? 1 : -1;
      selectedSuggestion = selectedSuggestion < 0 ? delta > 0 ? 0 : suggestionAnswers.length - 1 : (selectedSuggestion + delta + suggestionAnswers.length) % suggestionAnswers.length;
      [...$('suggestions').children].forEach((item, index) => item.setAttribute('aria-selected', String(index === selectedSuggestion)));
      $('answer-input').setAttribute('aria-activedescendant', `suggestion-${selectedSuggestion}`);
    } else if (event.key === 'Enter' && selectedSuggestion >= 0) { event.preventDefault(); chooseSuggestion(selectedSuggestion); }
  });
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  for (const id of ['close-help', 'help-done']) $(id).addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
  $('sound-button').addEventListener('click', () => {
    soundOn = !soundOn; $('sound-button').setAttribute('aria-pressed', String(soundOn));
    $('sound-button').setAttribute('aria-label', `Turn sound ${soundOn ? 'off' : 'on'}`); $('sound-button').title = `Turn sound ${soundOn ? 'off' : 'on'}`;
    $('sound-waves').setAttribute('d', soundOn ? 'M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14' : 'm16 9 6 6m0-6-6 6');
    if (soundOn) tone('start');
  });
  $('fullscreen-button').hidden = !document.fullscreenEnabled;
  $('fullscreen-button').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { $('announcement').textContent = 'Fullscreen is unavailable in this browser.'; } });
  document.addEventListener('fullscreenchange', () => { $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'); });
  $('copy-result-button').addEventListener('click', async () => {
    const squares = state.results.map(result => result.points === 100 ? '🟨' : result.points >= 60 ? '🟩' : result.points ? '🟦' : '⬜').join('');
    const share = `${mode().name} · ${state.score}/700\n${squares}\n${number(state.score * 10)} m ${mode().direction}\n${location.protocol === 'file:' ? 'Krillion & Noillirk' : location.origin + location.pathname}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(share);
      else { const text = document.createElement('textarea'); text.value = share; document.body.append(text); text.select(); const copied = document.execCommand('copy'); text.remove(); if (!copied) throw new Error('Copy unavailable'); }
      $('copy-result-button').textContent = 'Copied!';
    } catch { $('copy-result-button').textContent = 'Couldn’t copy'; $('announcement').textContent = `Your result: ${mode().name}, ${state.score} points, ${number(state.score * 10)} meters.`; }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('pagehide', stopTimer);
  window.addEventListener('pageshow', () => { if (state.status === 'playing' && !state.interval) { tick(); if (state.status === 'playing' && !state.interval) state.interval = setInterval(tick, 100); } });
  function resizeViewport() { document.documentElement.style.setProperty('--app-height', `${window.visualViewport?.height || window.innerHeight}px`); }
  window.visualViewport?.addEventListener('resize', resizeViewport); window.addEventListener('resize', resizeViewport); resizeViewport();
  const savedMode = readStorage('krill-mode', 'krillion');
  chooseMode(Object.hasOwn(modes, savedMode) ? savedMode : 'krillion'); renderBests(); renderProgress();
})();
