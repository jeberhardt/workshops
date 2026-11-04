# Workshop: Responsive Installations

A p5.js sketch of one animated circle, plus a control panel of inputs.
Each input simulates a sensor until real hardware sends readings over a WebSocket.
Every input can be connected to any property of the circle or its animation.

## Files
| File | What it is | Who edits it |
|---|---|---|
| `steps/step1.js` … `steps/step10.js` | One p5.js sketch per workshop step (step 10: `PROPS`, the drawing, the animation) | Everyone — this is the canvas |
| `steps.js` | The list of steps and the step buttons | Add a step here |
| `controls.js` | The simulated sensors and the panel | Add inputs here |
| `hardware.js` | WebSocket connection to real hardware | Set hardware ranges in `HW_RANGES` |
| `wiring.js` | Breadboard diagrams: how to wire each part to the Pi | Change pins here |
| `codeview.js` | The **Code** button: shows the step's sketch over the canvas | Rarely |
| `index.html`, `style.css` | Page and panel styling | Rarely |
| `test_server.py` | Fake "Raspberry Pi" for testing without hardware | Starting point for your Pi bridge |

**Locally:** open the folder with any static server (e.g. VS Code Live Server, or `python3 -m http.server`).
**p5.js Web Editor:** create a new sketch and upload the files. See the https note below before connecting hardware.

## Workshop steps
Each step of the tutorial is its own sketch in `steps/`, picked from the menu at the top of the panel,
stepped through with **‹ ›** or the **← →** keys, or chosen with `?step=3` at the end of the address (combine with `&ws=…` for an installation).
Each step adds one idea to the one before; **Code** shows the step's sketch.

1. **A circle** — the bare minimum: `createCanvas`, `background`, `circle`.
2. **Fill the window** — size the canvas to the space, position with `width`/`height`, `windowResized()`.
3. **Colour and variables** — HSB colour; the circle's properties as named variables.
4. **Movement** — an animation clock with `deltaTime`; `sin()` makes the size breathe.
5. **Orbit and trails** — `cos()`/`sin()` orbit, colour cycling, a see-through background.
6. **The mouse as an input** — any input → 0..1 → `lerp()` to the range a property needs.
7. **Smoothing** — glide towards the target; an on/off input (mouse button) stops jumping.
8. **Simulated sensors** — three panel cards; `inputs.slider.value` is 0..1, just like the mouse.
9. **Any input → any property** — every property in `PROPS`; the dropdowns choose the mapping.
10. **Real hardware** — step 9 plus `setupHardware()`: readings from the Pi, wiring diagrams.

To add a step, write `steps/stepN.js` and add a line to `STEPS` in `steps.js`.
A step gets input cards with `buildControlPanel(PROPS)` (or `buildControlPanel(null, ['slider', …])` for a few cards
without dropdowns) and real hardware with `setupHardware()`.

## The idea in one line
Hardware gives a number → we normalize it to **0..1** → we stretch it to a property's **min..max** → we smooth it.

## Connecting real hardware
1. Run a WebSocket server that sends sensor readings (on the Pi, or `python3 test_server.py` to test — needs `pip install websockets`).
2. Type its address in the panel (e.g. `ws://raspberrypi.local:8765`) and press **Connect**.
3. Each input that receives a reading turns **LIVE** (green) and stops simulating. Inputs with no hardware keep simulating.
   If the connection drops, it retries every 2 s and the cards fall back to simulation.

For an installation, open the page with `?ws=ws://raspberrypi.local:8765` at the end of the address to connect automatically.

### Message format
JSON, as one object, several at once, or a list:
```
{"id": "slider", "value": 0.42}
{"slider": 0.42, "button": 1, "proximity": 37.5}
[{"id": "knob", "value": 0.1}, {"id": "pir", "value": 1}]
```
Plain text also works, one reading per line: `slider:0.42` or `button HIGH`.

Input ids: `button`, `switch`, `slider`, `knob`, `proximity`, `light`, `pir`, `touch`, `sound`, `joystickX`, `joystickY`.

Values are 0..1 by default. If your hardware sends another range, add it to `HW_RANGES` in `hardware.js`.
For example, proximity is set up for centimetres (200 cm = far, 2 cm = close), and a 10-bit ADC would be `{ min: 0, max: 1023 }`.
Digital inputs accept 0/1, HIGH/LOW, on/off or true/false.
To send something back to the server (LEDs, motors later), call `sendToHardware({...})`.

### The https gotcha
Browsers won't let an **https** page (like the p5.js Web Editor) open a plain `ws://` connection to another computer.
`ws://localhost` is fine. To reach the Pi, serve the sketch over **http** (ideally from the Pi itself, then the default address points at it), or use `wss://`.
The panel tells you when this is what's blocking the connection.

Untick **listen** on a card to keep that input simulated even while the hardware is sending it.

## Wiring the parts to the Pi
Open **Wiring** at the bottom of any card for a breadboard diagram, the list of wires and the gotchas. Click a diagram to enlarge it.
The pins are planned so every part can be connected at the same time:

| Part | Connects to | Power |
|---|---|---|
| Push button | GPIO17 (pin 11) + GND, internal pull-up | none |
| Toggle switch | GPIO27 (pin 13) + GND, internal pull-up | none |
| Ultrasonic HC-SR04 | TRIG → GPIO24 (pin 18), ECHO → **1 kΩ/2 kΩ divider** → GPIO25 (pin 22) | 5 V |
| PIR HC-SR501 | OUT → GPIO22 (pin 15) | 5 V |
| Touch TTP223 | SIG → GPIO23 (pin 16) | 3.3 V |
| Slide pot · rotary pot · LDR · mic · joystick X/Y | MCP3008 CH0 · CH1 · CH2 · CH3 · CH4/CH5 | 3.3 V |

The Pi has no analog inputs, so the analog parts go through an **MCP3008** ADC on SPI
(CLK → pin 23, DOUT → pin 21, DIN → pin 19, CS → pin 24). Turn SPI on with `sudo raspi-config` → Interface Options → SPI.
`gpiozero.MCP3008(channel=n).value` already gives 0..1.

## Seeing the code
Press **Code** (or **C**) to show the current step's sketch over the canvas; press it again to hide it.
Served over http it shows the file itself. Opened straight from disk, the browser won't let the page read the file,
so it shows the running settings and functions instead.

## Simulated inputs
Push button · toggle switch · slide pot · rotary pot · ultrasonic proximity (cm, with jitter and missed echoes) ·
LDR light sensor (with "cover" button) · PIR motion (stays HIGH 3 s) · capacitive touch · sound/mic (clap + noise floor) · joystick (X and Y).
Turn off **Realistic sensor noise** to compare clean vs. real-world readings.

## Things to try
- **Add a property:** add a line to `PROPS` in `steps/step10.js` and use `current.yourProp` in `draw()`. It appears in every dropdown.
- **Add an input:** add an entry to `INPUT_DEFS` and (if it's a new type) a widget in `WIDGETS` in `controls.js`. Hardware can then send readings under its id.
- **Change the feel:** `SMOOTHING` in `steps/step10.js` (1 = instant, 0.05 = dreamy).

## Component photos
Each card shows a small photo of the real part, loaded from Wikimedia Commons (openly licensed).
Tap a photo to open its Commons page with the author and licence. The file names are in `PHOTOS` in `controls.js`.
Photos need an internet connection and may be blocked in some embedded previews; if they can't load they simply hide.
For an offline venue, save them into an `images/` folder and change each `PHOTOS` entry to e.g. `'images/button.jpg'`.

Keys: **← →** previous / next step, **C** shows the code, **P** hides the panel (for projection), **F** toggles fullscreen.
