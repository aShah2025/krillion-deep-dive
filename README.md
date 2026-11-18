# Krillion

A single-page, deep-sea rare-answer trivia game built with HTML, CSS, and vanilla JavaScript. No build step or runtime dependencies.

## Play locally

Open `dist/index.html` directly in a browser, or serve the static directory:

```sh
cd /Users/aadityashah/Developer/krillion
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Visit <http://127.0.0.1:4173>. Click **Let's dive in** to start. Answer seven shuffled prompts with 25 seconds each. Lock in your answer, read the result, then keep diving. Timeouts automatically advance with zero points. **Play again · New shuffle** immediately starts a new expedition.

| Tier | Points | Descent |
| --- | ---: | ---: |
| Common / Surface | 10 | 100 m |
| Uncommon | 30 | 300 m |
| Niche | 60 | 600 m |
| Ultra-rare / One in a Krillion | 100 | 1,000 m |

A perfect 700-point dive reaches 7,000 m. The report shows every prompt, submitted answer, rarity, points, final score, and final depth. Invalid answers and timeouts earn zero.

## Files

```text
dist/
  index.html      Accessible game layout and instructions
  styles.css      Responsive layout, controls, and animations
  game.js         Timer, matching, autocomplete, scoring, and restart
  data.js         20 prompts, 952 answers, aliases, and curated tiers
  ocean.svg       Original scrolling ocean illustration
  favicon.svg     Pixel shrimp mark
tests/
  browser.mjs     Headless Chrome regression suite
netlify.toml     Netlify publish directory and static response headers
package.json     Browser test tooling (no game runtime dependencies)
```

The answer bank includes geography, food, cars, Olympic sports, science, arcade games, nature, literature, and more. Rarity tiers are curated game difficulty ratings, not measured player frequency. The bank is finite; the instructions explain this limitation.

Matching ignores capitalization, accents, spaces, and punctuation. Exact aliases are accepted. Unambiguous typos of one edit (two for long answers) are forgiven, including adjacent swapped letters. Short answers require exact matches to avoid accidental credit. Autocomplete appears after three characters, offers up to four prefix matches, and never reveals their tiers. Use arrow keys and Enter to select a suggestion, then Enter again to submit.

Timers use a wall-clock deadline, so delayed browser ticks cannot extend a prompt. A help dialog does not pause a live timer. Feedback between submitted answers gives you time to review before starting the next 25-second prompt. Sound is optional and off by default. Reduced-motion preferences are respected.

## GitHub and Netlify

Create an empty GitHub repository, then push this project directory. Import that repository into Netlify. The included `netlify.toml` sets the publish directory to **`dist`**. Leave the build command blank; the game is already deployable. You can also drag the `dist` folder into Netlify's manual deploy screen.

## Browser checks

Start the local server above in one terminal. In another:

```sh
npm install
npm run test:browser
```

Puppeteer is a development-only dependency. It is not loaded by the game or needed for Netlify deployment. The suite uses an installed Google Chrome on macOS when available, otherwise Puppeteer's bundled browser. Set `CHROME_PATH` for a custom browser or `BASE_URL` to test a different served URL. `PUPPETEER_MODULE` can point at an existing Puppeteer module installation.

All 10 checks passed in headless Chrome 157, including a real 25-second countdown and timeout. Tests cover every scoring tier, exact depth arithmetic, invalid answers, seven-prompt completion, seven consecutive timeouts, restart/shuffle, aliases and typos, keyboard autocomplete, late submissions, a perfect 700-point / 7,000m run, responsive layout, and browser JavaScript errors. Screenshots and `results.json` are written to ignored `tests/artifacts/`.

The app is independent and inspired by the rare-answer game concept; it is not affiliated with the original Krillion.
