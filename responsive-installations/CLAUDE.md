# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
A beginner workshop: a p5.js sketch of one animated circle, taught in cumulative steps (`steps/step1.js` … `steps/step11.js`),
ending with real Raspberry Pi sensors driving it over a WebSocket. Readers are beginners, so code and comments in the
step files are teaching material: plain, short, one new idea per step. There is no build, bundler, linter or test suite.

## Commands
```bash
python3 -m http.server                 # serve the page; open http://localhost:8000/?step=3
                                       # (?ws=ws://host:8765 auto-connects to hardware)

# Python servers, in a venv (Pi OS refuses pip outside one):
python3 -m venv --system-site-packages .venv && source .venv/bin/activate && pip install -r requirements.txt
python test_server.py                  # fake sensor readings on ws://localhost:8765, no hardware needed
python pi_bridge.py                    # on the Pi: reads the wired parts with gpiozero
```
`gpiozero` is deliberately not in `requirements.txt`: it comes from Raspberry Pi OS via `--system-site-packages`.

**Checking JS changes:** `node --check` on a single file is not enough. The page's classic scripts share one global
scope, so a top-level name declared in two of them makes the browser reject a whole script (this has broken the page before).
Parse them together, once per step:
```bash
for s in steps/*.js; do cat controls.js wiring.js hardware.js codeview.js steps.js $s > /tmp/all.js \
  && node --check /tmp/all.js >/dev/null || echo "clash or syntax error with $s"; done
```
Then load the page in a browser before calling a change done.

## Architecture
**Page and load order.** `index.html` loads p5 (global mode) and then `controls.js`, `wiring.js`, `hardware.js`,
`codeview.js`, `steps.js`, in that order, as classic scripts. `steps.js` reads `?step=N`, picks the entry in `STEPS` and
`document.write`s a `<script>` for that step's file. p5 then finds the step's global `setup()`/`draw()`. Only one step is ever
loaded; changing step reloads the page.

**Input pipeline** (the workshop's core idea: hardware → 0..1 → property min..max → smoothed):
- `controls.js`: `INPUT_DEFS` defines the panel cards; `WIDGETS[type]` builds each card's UI and writes `inputs.<id>.value` (0..1);
  `updateInputs(dt)`, called from the step's `draw()`, runs the per-frame simulations (noise, PIR timer, sound decay).
  A step opts in with `buildControlPanel(PROPS)`, or `buildControlPanel(null, ['slider', …])` for cards without dropdowns.
- `hardware.js`: `setupHardware()` (step 11 only) opens the WebSocket. An input that receives readings turns LIVE and
  stops simulating. `HW_RANGES` converts the hardware's units (e.g. proximity in cm) into 0..1.
- Step 10 (hidden for now): `PROPS` lists every property an input can drive (min/max/resting value). `applyMappings()` lerps each
  input into its target's range, averages several inputs on one target, and smooths with `SMOOTHING`.

**Contracts that span files. Change them together:**
- Input ids (`button`, `slider`, `joystickX`, …) appear in `INPUT_DEFS`, `HW_RANGES`, `wiring.js`, `pi_bridge.py` (`WIRED`),
  `test_server.py` (`readings()`) and the README's message-format section.
- `INPUT_DEFS[].target` must be a key of `PROPS`.
- Step 11 (Real hardware) is step 9 (Simulated sensors) plus `setupHardware()`, so their cards and drawing code must stay identical.
  Step 12 (Outputs) is step 11 plus an Outputs card.
- Output messages (`{"beep": {hz, ms}}`, `{"pixels": [r, g, b] | [[r, g, b], …]}`) are sent by `steps/step12.js` and handled
  by `act_on()` in `pi_bridge.py` (`OUTPUT_KEYS` maps output names to message keys). The README's message-format
  section documents them. NeoPixels use a different library on a Pi 5 and a Pi 3/4, and need root on a Pi 3/4, so
  `control.py` starts the bridge with `sudo -E` there.
- Each `STEPS` entry lists `globals`/`functions`. Over `file://` the Code view can't fetch the file, so it rebuilds
  the code from these names. It also assumes step constants are in CAPITALS (that's how it tells `const` from `let`).

**Code view (`codeview.js`).** It shows the step file and makes it editable. **Run** saves the text to localStorage under
`edit:<step file>` and reloads, and `steps.js` then loads that text from a Blob URL instead of the file. **Reset** removes
it. Edits are keyed by file name, so renumbering steps moves saved edits onto other steps. The read-only **Sensors**
tab shows hand-written, beginner-level snippets for the cards on the page (`SENSOR_CODE[type]` in `controls.js`), not
the real `WIDGETS` code. They're a teaching version, so when a widget or its simulation in `updateInputs()` changes (ranges,
timings, start values), update its `SENSOR_CODE` text to match.

## Conventions
- code must be as simple as possible, this is for beginners, and readability is very important
- Colour is RGBA, 0–255, in variables `r`, `g`, `b`, `a` (PROPS keys too). Don't use HSB. Don't name variables after p5
  functions (`red`, `green`, `blue`, `alpha`, …). "Colour cycling" (`colourSpeed`/`colourPhase`) swings the colour to its opposite and back.
- British spelling in comments, labels and docs (`colour`), but p5 API names as they are (`colorMode`).
- Each step builds on the one before and starts with a header comment: `// Step N — TITLE` plus what's new in it.
- **Hiding a step:** `hidden: true` on its `STEPS` entry takes it out of the menu without touching files. Menu numbers
  are positions in the visible list, so later steps show one number lower than their file and header. The
  "Any input → any property" step (`step10.js`) is currently hidden.
- **Adding or removing a step** means renumbering: rename the later files (`git mv`, highest first), then update
  their `Step N` headers, "step N" cross-references in comments, `STEPS` in `steps.js`, the step list and file paths in
  `README.md`, `PARTS.md` ("Steps 1–N need no hardware"), and the `steps/stepN.js` paths in `controls.js` comments.
- Keyboard: `steps.js` owns ← → C P F and ignores keys typed in inputs and textareas. The Code editor stops key
  events from reaching the sketch, so `keyPressed()` in a step doesn't fire while someone is typing code.
