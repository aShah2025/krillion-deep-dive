/* Krillion is entirely local: no account, network API, or build step required. */
(() => {
  'use strict';

  const { prompts, tiers } = window.KRILLION_DATA;
  const ROUND_LENGTH = 25;
  const RUN_LENGTH = 7;
  const $ = id => document.getElementById(id);
  const number = value => value.toLocaleString('en-US');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]/g, '');
  const state = { deck: [], index: 0, results: [], score: 0, status: 'ready', deadline: 0, interval: null, lastDeck: '' };
  const categoryIcons = { Geography: '◎', Food: '♧', Science: '⚛', Sports: '◈', Entertainment: '▤', Nature: '❋', Culture: '⌘', History: '⌛', Technology: '⌨' };
  const tierTitles = { common: 'A familiar find.', uncommon: 'A little less ordinary.', niche: "Now that's a deep cut.", ultra: 'One in a Krillion.', invalid: 'An undiscovered answer.' };
  const zones = [
    { depth: 0, name: 'Sunlight zone', detail: "There's a whole ocean below you." },
    { depth: 200, name: 'Twilight zone', detail: 'The light fades. Your curiosity doesn’t.' },
    { depth: 1000, name: 'Midnight zone', detail: 'Beyond the reach of sunlight.' },
    { depth: 4000, name: 'Abyssal zone', detail: 'Only the wonderfully obscure live here.' },
    { depth: 6000, name: 'Hadal trench', detail: 'Rare knowledge. Extraordinary depths.' },
    { depth: 7000, name: 'The Krillion deep', detail: 'Seven rare finds. One legendary dive.' }
  ];
  let suggestionAnswers = [];
  let selectedSuggestion = -1;
  let soundOn = false;
  let audioContext;

  function setStatus(status) {
    state.status = status;
    document.body.dataset.state = status;
  }

  function shuffle() {
    const pool = [...prompts];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (pool.slice(0, RUN_LENGTH).map(p => p.id).join(',') === state.lastDeck) pool.push(pool.shift());
    state.deck = pool.slice(0, RUN_LENGTH);
    state.lastDeck = state.deck.map(p => p.id).join(',');
  }

  function stopTimer() {
    clearInterval(state.interval);
    state.interval = null;
  }

  function renderTimer(remaining) {
    $('timer-value').textContent = remaining;
    $('timer').setAttribute('aria-label', `${remaining} seconds remaining`);
    $('timer-ring').style.strokeDashoffset = 175.93 * (1 - remaining / ROUND_LENGTH);
    $('timer').classList.toggle('urgent', remaining <= 5);
  }

  function tick() {
    if (state.status !== 'playing') return;
    const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    renderTimer(remaining);
    if (!remaining) {
      commitAnswer('', true);
      advance();
    }
  }

  function startTimer() {
    stopTimer();
    state.deadline = Date.now() + ROUND_LENGTH * 1000;
    renderTimer(ROUND_LENGTH);
    state.interval = setInterval(tick, 100);
  }

  function renderProgress() {
    $('progress-dots').replaceChildren(...Array.from({ length: RUN_LENGTH }, (_, i) => {
      const dot = document.createElement('i');
      dot.className = 'progress-dot';
      if (state.results[i]) dot.classList.add(state.results[i].points ? 'done' : 'missed');
      else if (i === state.index) dot.classList.add('current');
      return dot;
    }));
    $('progress-dots').setAttribute('aria-label', `${state.results.length} of ${RUN_LENGTH} prompts completed`);
    $('round-number').textContent = Math.min(state.index + 1, RUN_LENGTH);
  }

  function renderDepth() {
    const depth = state.score * 10;
    const zone = [...zones].reverse().find(z => depth >= z.depth);
    $('depth-value').textContent = number(depth);
    $('total-score').replaceChildren(document.createTextNode(`${state.score} `), Object.assign(document.createElement('small'), { textContent: 'pts' }));
    $('depth-zone').textContent = zone.name;
    $('ocean-event').textContent = zone.detail;
    // Scene moves past the submarine; the current depth line stays at its center.
    const viewportHeight = $('ocean-viewport').clientHeight;
    const markerY = 170 + (depth / 7000) * 1430;
    const currentLine = viewportHeight * .43;
    const scroll = Math.max(0, Math.min(1900 - viewportHeight, markerY - currentLine));
    $('ocean-world').style.transform = `translateY(-${scroll}px)`;
    $('ocean-panel')?.setAttribute('aria-label', `Live ocean depth: ${number(depth)} meters, ${zone.name}`);
  }

  function renderPrompt() {
    setStatus('playing');
    const prompt = state.deck[state.index];
    $('game-card').hidden = false;
    $('results').hidden = true;
    $('prompt-area').hidden = false;
    $('feedback-area').hidden = true;
    $('start-button').hidden = true;
    $('submit-button').hidden = false;
    $('prompt-category').textContent = prompt.category.toUpperCase();
    $('category-icon').textContent = categoryIcons[prompt.category] || '◇';
    $('prompt-title').textContent = prompt.title;
    $('prompt-hint').textContent = prompt.hint;
    $('answer-input').value = '';
    $('answer-input').disabled = false;
    $('input-note').textContent = state.results.at(-1)?.timeout ? 'Time ran out. New prompt, fresh start.' : 'Small typos forgiven. Big brains encouraged.';
    $('dive-status').textContent = 'Dive in progress';
    closeSuggestions();
    renderProgress();
    startTimer();
    $('answer-input').focus({ preventScroll: true });
    $('announcement').textContent = `Prompt ${state.index + 1} of 7. ${prompt.title} 25 seconds.`;
  }

  function startRun() {
    stopTimer();
    state.index = 0;
    state.results = [];
    state.score = 0;
    shuffle();
    renderPrompt();
    renderDepth();
    tone('start');
  }

  // Damerau-Levenshtein also forgives an adjacent transposition, e.g. "Einstien".
  function distance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
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
      if (candidate.length < 5 || Math.abs(query.length - candidate.length) > maxDistance) return Infinity;
      return distance(query, candidate);
    })) })).filter(match => match.edits <= maxDistance).sort((a, b) => a.edits - b.edits);
    if (!ranked.length || (ranked[1] && ranked[0].edits === ranked[1].edits)) return null;
    return { answer: ranked[0].answer, corrected: true };
  }

  function commitAnswer(submitted, timeout = false) {
    if (state.status !== 'playing') return;
    stopTimer();
    closeSuggestions();
    const prompt = state.deck[state.index];
    const match = timeout ? null : matchAnswer(prompt, submitted);
    const answer = match?.answer;
    const result = { prompt, submitted, answer: answer?.name || submitted, tier: answer?.tier || 'invalid', points: answer?.points || 0, timeout, corrected: match?.corrected || false };
    state.results.push(result);
    state.score += result.points;
    setStatus('feedback');
    $('answer-input').disabled = true;
    renderDepth();
    renderProgress();
    if (timeout) {
      $('announcement').textContent = `Time's up. Zero points. ${state.index === 6 ? 'Dive complete.' : 'Moving to the next prompt.'}`;
      tone('miss');
      return;
    }
    $('prompt-area').hidden = true;
    $('feedback-area').hidden = false;
    $('feedback-area').dataset.tier = result.tier;
    $('feedback-symbol').textContent = result.points === 100 ? '✷' : result.points ? '✧' : '○';
    $('feedback-tier').textContent = answer ? `${tiers[answer.tier].label || tiers[answer.tier].name} FIND` : 'NO POINTS THIS TIME';
    $('feedback-title').textContent = tierTitles[result.tier];
    $('feedback-answer').textContent = answer ? answer.name : `“${submitted || 'No answer'}”`;
    $('feedback-points').textContent = `+${result.points}`;
    $('feedback-depth').textContent = number(result.points * 10);
    $('feedback-detail').textContent = result.corrected ? `We read “${submitted}” as ${answer.name}.` : answer ? `${result.points === 100 ? 'An extraordinary' : 'A good'} find. You’re now ${number(state.score * 10)} meters deep.` : 'That answer isn’t in this prompt’s local answer bank.';
    $('next-button').replaceChildren(document.createTextNode(state.index === RUN_LENGTH - 1 ? 'See dive report' : 'Keep diving'), Object.assign(document.createElement('span'), { className: 'button-key', textContent: 'ENTER' }));
    $('dive-status').textContent = result.points ? 'Find logged. Ready to descend.' : 'Keep exploring. There’s more below.';
    $('next-button').focus({ preventScroll: true });
    $('announcement').textContent = `${answer?.name || 'Invalid answer'}. ${result.points} points. Depth ${number(state.score * 10)} meters.`;
    tone(result.points ? result.points === 100 ? 'rare' : 'find' : 'miss');
  }

  function advance() {
    if (state.status !== 'feedback') return;
    if (state.index === RUN_LENGTH - 1) finishRun();
    else { state.index++; renderPrompt(); }
  }

  function finishRun() {
    stopTimer();
    setStatus('finished');
    $('game-card').hidden = true;
    $('results').hidden = false;
    $('final-score').replaceChildren(document.createTextNode(state.score), Object.assign(document.createElement('span'), { textContent: ' / 700' }));
    $('final-depth').replaceChildren(document.createTextNode(number(state.score * 10)), Object.assign(document.createElement('span'), { textContent: ' m' }));
    const rareFinds = state.results.filter(result => result.tier === 'ultra').length;
    $('results-heading').textContent = state.score === 700 ? 'One legendary dive.' : state.score >= 350 ? 'You know the wonderfully obscure.' : 'Every answer took you somewhere.';
    $('results-description').textContent = `${state.results.filter(result => result.points > 0).length} valid finds. ${rareFinds} ultra-rare ${rareFinds === 1 ? 'answer' : 'answers'}. ${state.score === 700 ? 'You reached the Krillion deep.' : 'There’s always something new beneath the surface.'}`;
    const rows = state.results.map(result => {
      const row = document.createElement('tr');
      const answerCell = document.createElement('td');
      const promptLabel = document.createElement('span');
      promptLabel.textContent = result.prompt.title;
      const answerLabel = document.createElement('strong');
      answerLabel.textContent = result.timeout ? 'Time ran out · no answer' : result.corrected ? `${result.submitted} → ${result.answer}` : result.submitted;
      answerCell.append(promptLabel, answerLabel);
      const tierCell = document.createElement('td');
      tierCell.className = result.tier;
      tierCell.textContent = result.timeout ? 'Timeout' : result.points ? (result.tier === 'ultra' ? 'Ultra-rare' : tiers[result.tier].label || tiers[result.tier].name) : 'Invalid';
      const pointsCell = document.createElement('td');
      pointsCell.textContent = `+${result.points}`;
      row.append(answerCell, tierCell, pointsCell);
      return row;
    });
    $('summary-body').replaceChildren(...rows);
    $('restart-button').focus({ preventScroll: true });
    $('announcement').textContent = `Expedition complete. ${state.score} points. ${number(state.score * 10)} meters. Your seven-prompt dive report is ready.`;
    tone('rare');
  }

  function closeSuggestions() {
    suggestionAnswers = [];
    selectedSuggestion = -1;
    $('suggestions').hidden = true;
    $('answer-input').setAttribute('aria-expanded', 'false');
    $('answer-input').removeAttribute('aria-activedescendant');
  }

  function updateSuggestions() {
    const query = normalize($('answer-input').value);
    closeSuggestions();
    if (query.length < 3 || state.status !== 'playing') return;
    suggestionAnswers = state.deck[state.index].answers.filter(answer => [answer.name, ...answer.aliases].some(alias => normalize(alias).startsWith(query))).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4);
    if (!suggestionAnswers.length) return;
    $('suggestions').replaceChildren(...suggestionAnswers.map((answer, index) => {
      const item = document.createElement('li');
      item.id = `suggestion-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.textContent = answer.name;
      item.addEventListener('pointerdown', event => { event.preventDefault(); chooseSuggestion(index); });
      return item;
    }));
    $('suggestions').hidden = false;
    $('answer-input').setAttribute('aria-expanded', 'true');
  }

  function chooseSuggestion(index) {
    if (!suggestionAnswers[index]) return;
    $('answer-input').value = suggestionAnswers[index].name;
    closeSuggestions();
    $('answer-input').focus({ preventScroll: true });
  }

  function tone(kind) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const notes = kind === 'rare' ? [440, 554, 660, 880] : kind === 'miss' ? [170, 130] : kind === 'start' ? [330, 440, 660] : [440, 660];
      notes.forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const start = audioContext.currentTime + i * .1;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.035, start + .015);
        gain.gain.exponentialRampToValueAtTime(.001, start + .3);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(start); oscillator.stop(start + .31);
      });
    } catch { /* Audio is optional; browser restrictions never interrupt play. */ }
  }

  $('start-button').addEventListener('click', startRun);
  $('restart-button').addEventListener('click', startRun);
  $('next-button').addEventListener('click', advance);
  $('answer-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.status !== 'playing') return;
    if (Date.now() >= state.deadline) { tick(); return; }
    const value = $('answer-input').value.trim();
    commitAnswer(value);
  });
  $('answer-input').addEventListener('input', updateSuggestions);
  $('answer-input').addEventListener('blur', closeSuggestions);
  $('answer-input').addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeSuggestions(); return; }
    if (!suggestionAnswers.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      selectedSuggestion = selectedSuggestion < 0 ? (delta > 0 ? 0 : suggestionAnswers.length - 1) : (selectedSuggestion + delta + suggestionAnswers.length) % suggestionAnswers.length;
      [...$('suggestions').children].forEach((item, index) => item.setAttribute('aria-selected', String(index === selectedSuggestion)));
      $('answer-input').setAttribute('aria-activedescendant', `suggestion-${selectedSuggestion}`);
    } else if (event.key === 'Enter' && selectedSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(selectedSuggestion);
    }
  });
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-done').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const r = $('help-dialog').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('help-dialog').close(); } });
  $('sound-button').addEventListener('click', () => {
    soundOn = !soundOn;
    $('sound-button').setAttribute('aria-pressed', String(soundOn));
    $('sound-button').setAttribute('aria-label', `Turn sound ${soundOn ? 'off' : 'on'}`);
    $('sound-button').title = `Turn sound ${soundOn ? 'off' : 'on'}`;
    $('sound-waves').setAttribute('d', soundOn ? 'M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14' : 'm16 9 6 6m0-6-6 6');
    if (soundOn) tone('start');
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('resize', renderDepth);
  window.addEventListener('pagehide', stopTimer);
  window.addEventListener('pageshow', () => { if (state.status === 'playing' && !state.interval) { tick(); if (state.status === 'playing' && !state.interval) state.interval = setInterval(tick, 100); } });

  $('depth-markers').replaceChildren(...zones.map(zone => {
    const marker = document.createElement('div');
    marker.className = 'depth-mark';
    marker.style.top = `${170 + (zone.depth / 7000) * 1430}px`;
    const label = document.createElement('span');
    label.textContent = `${number(zone.depth)} m${zone.depth > 0 ? ` · ${zone.name.replace(' zone', '')}` : ' · Surface'}`;
    marker.append(label);
    return marker;
  }));
  renderProgress();
  renderDepth();
})();
