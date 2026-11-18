// Step 11 — REAL HARDWARE
// Step 9 plus one line: setupHardware() connects to the Raspberry Pi
// over a WebSocket (hardware.js). Each card that receives readings from
// the real part turns LIVE; the rest keep simulating. The sketch doesn't
// change at all: a real sensor gives inputs.<id>.value, 0..1, just like
// a pretend one. Open "Wiring" on a card to connect the real part.

const SMOOTHING = 0.12;

let r = 48;
let g = 177;
let b = 242;
let a = 255;
let size = 0.35;         // fraction of the smaller side
let x = 0.5;             // fraction of the width: 0 = left edge, 1 = right edge
let bright = 1;          // 0 = black, 1 = the full colour

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  buildControlPanel(null, ['button', 'proximity', 'light']);   // from controls.js: the same cards as step 9
  setupHardware();                                             // from hardware.js: the one new line
}

function draw() {
  const dt = min(deltaTime / 1000, 0.1);

  // 1. read the inputs as 0..1
  updateInputs(dt);   // runs the simulated sensors (controls.js)

  // 2. stretch and smooth
  size       = lerp(size,       lerp(0.35, 0.2, inputs.button.value),    SMOOTHING);  // pressed = smaller
  x          = lerp(x,          lerp(0.15, 0.85, inputs.proximity.value), SMOOTHING); // far = left, close = right
  bright     = lerp(bright,     lerp(0.15, 1, inputs.light.value),       SMOOTHING);  // dark = dim

  // 3. draw
  background(10, 12, 16);
  fill(r * bright, g * bright, b * bright, a);   // less light → less of each colour
  noStroke();
  circle(x * width, height / 2, size * min(width, height));
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
