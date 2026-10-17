# Who’s Watching Your Browser? — interactive 3D presentation

Problem Solving course · Cyber security in a connected society · by Ahmed Abobakr & Ali Ezz

One continuous 3D world: every "slide" is a station, and moving on is a camera glide along a
glowing road. Everything is drawn in code (no AI images) and all sounds are synthesized live.

The story, 8 stations (about 8–10 minutes):

1. **Your browser knows who you are** — the hook
2. **The problem** — what cyber security is, why it matters (Chromium in browsers and apps, WannaCry, Equifax)
3. **Four ways you are watched** — trackers, fingerprinting, cookie theft, WebRTC leaks
4. **Test the problem** — the audience scans the QR code and sees their own fingerprint
5. **Our solution: Heros Shell** — the three protection zones, then its control panel
6. **Test the solution** — live demo in Chrome: Chrome alone vs Chrome + Heros
7. **Compare & measure** — decision matrix, then the measured EFF results
8. **Close** — how we decided, four habits, questions

## Run it

```bash
npm install
npm run dev        # live editing at http://localhost:5173
npm run build      # production build in dist/ (what GitHub Pages serves)
npm run build:offline   # ONE self-contained file: dist-offline/index.html
```

The offline build is the USB-stick backup: double-click `dist-offline/index.html`, no internet needed.

## Presenter controls

| Key | Action |
|---|---|
| `→` `Space` `PageDown` / click right half | next step (or the station's next part), then next station |
| `←` `PageUp` / click left half | previous station |
| `F` | fullscreen |
| `N` | speaker notes + timer |
| `T` | restart the timer |
| `M` | mute / unmute sound |
| `B` | (demo station) show backup screenshots |
| `Home` / `End` | first / last station |

Clicker remotes work (they send PageUp/PageDown). Moving the mouse tilts the 3D world.
Add `#5` to the URL to jump straight to station 5.

## Edit the words

All text lives in **`src/content.js`**: titles, bullet points, speaker notes, the decision
matrix scores, the test results, the Heros switches and the presenter names. No other file needs touching.

## The fingerprint test page (`fp.html`)

The QR code on station 4 opens this page. It reads the same things real trackers read
(canvas, audio, GPU, fonts, screen, WebRTC IP) and remembers the last result, so a reload shows
whether the ID stayed the same (trackable) or changed (protected) — and which value changed.
Use it to test Heros Shell: with Heros on, the canvas hash should change on reload and WebRTC
should say "blocked".

### Publishing it (needed for the QR code)

1. Merge this branch into `main`.
2. GitHub → repo **Settings → Pages → Source: GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys to
   `https://ali-ezz.github.io/solving-pres/` (test page: `/fp.html`).

If the URL is different, update `testPageUrl` and `demoLinks` in `src/content.js`.

## Backup screenshots for the live demo

Put `chrome.png` (Chrome alone) and `heros.png` (Chrome + Heros) in `public/demo/`.
On the demo station press `B` to show them side by side if the live demo fails.

## Code map

- `src/world.js` — renderer, glow, sky, floor grid, stars, camera glides + mouse parallax
- `src/stations3d.js` — the 3D scene of each station
- `src/panels.js` — interactive overlays (QR card placed in 3D, decision matrix, test results, Heros switches, demo)
- `src/fingerprint.js` — fingerprint collection shared by the deck and `fp.html`
- `src/audio.js` — synthesized ambience and effects
- `src/main.js` — navigation, text animation, HUD, keys
