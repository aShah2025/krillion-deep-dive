# Krillion & Noillirk

One little krill, two big adventures. A single-page browser game written in HTML, CSS, and vanilla JavaScript, ready to deploy to Netlify with no build step.

Choose your game on the start screen:

- **Krillion:** unusual answers win. A helmeted pixel krill dives through an ocean of reefs, fish, jellyfish, and trenches.
- **Noillirk:** common answers win. A tiny krill on three balloons rises from a forest pond through clouds and mountains into the evening sky.

Both games have **7 prompts, 25 seconds per prompt**, a maximum score of **700**, and unlimited shuffled replays. Every point moves the explorer **10 meters**, to a perfect depth or altitude of **7,000 m**. Switch Game returns to the chooser and starts a fresh adventure.

| Answer tier | Krillion | Noillirk |
| --- | ---: | ---: |
| Common | 10 | 100 |
| Uncommon | 30 | 60 |
| Niche | 60 | 30 |
| Ultra-rare | 100 | 10 |

Scores are curated game ratings, not measured player frequencies. The local bank contains 20 diverse prompts and 952 answers, with familiar aliases and typo forgiveness. It is a finite list: an unlisted answer lets you try again while the original timer keeps running. Passing or timing out scores zero. Timeouts automatically advance; after an accepted answer, the next timer waits for **Next prompt**.

The game reveals five example answers and their scores after each accepted answer or pass. After seven prompts, see your complete report, copy a spoiler-free result, replay the same game, or try the other one. Each game's best score and your last selected mode are saved locally when browser storage is available.

## Run locally

Open `dist/index.html` directly, or start a server:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Visit <http://127.0.0.1:4173>. No installation is required to play. Scenery, sprites, sound, and game logic are created locally, with no external fonts, artwork, accounts, or APIs.

## Deploy to Netlify

Import [the GitHub repository](https://github.com/aShah2025/krillion-deep-dive). Leave the **build command blank** and set the **publish directory to `dist`**. The included `netlify.toml` already declares that directory. Alternatively, drag the `dist` directory into Netlify's manual deploy screen.

## Project structure

```text
dist/
  index.html      Mode chooser, HUD, prompts, results, and instructions
  styles.css      Responsive world-first interface and mobile controls
  game.js         Both scoring modes, timer, matching, results, and storage
  world.js        Original procedural pixel worlds and animated krill
  data.js         20 prompts, 952 valid answers, aliases, and rarity tiers
  favicon.svg     Original pixel krill mark
tests/
  browser.mjs     Headless browser regression tests
netlify.toml     Static hosting settings
package.json     Development-only browser test dependency
```

## Browser tests

With the local server running:

```sh
npm install
npm run test:browser
```

Puppeteer is only needed to run tests; Netlify and the game do not use it. The suite uses installed Google Chrome on macOS when available, otherwise Puppeteer's bundled browser. Use `CHROME_PATH` for another Chrome binary, `BASE_URL` for a different served URL, or `PUPPETEER_MODULE` for an existing Puppeteer installation.

The suite verifies both mode choices, opposite scoring, exact distance arithmetic, the real countdown, automatic timeouts, rejected-answer retries, passing, complete runs, restart and mode switching, aliases and typos, keyboard autocomplete, local best scores, and desktop/mobile rendering. Screenshots and machine-readable results go into ignored `tests/artifacts/`.

The interface supports keyboard controls, reduced motion, optional synthesized sound, and fullscreen where available. This is an independent recreation inspired by Noillirk and Krillion, with original code, artwork, and a local answer bank.
