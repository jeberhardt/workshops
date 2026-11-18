// Step 9 — SIMULATED SENSORS
// The panel now has three pretend sensors (controls.js). Each one gives
// inputs.<id>.value, already 0..1 — exactly like the mouse in step 6.
// So nothing else changes: stretch to a range, then smooth.
// Hold the button, move the hand distance, change the light (or cover the sensor).

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
  buildControlPanel(null, ['button', 'proximity', 'light']);   // from controls.js: just these cards
  sensorNoise = false;   // clean, steady readings (real sensors are noisier: see step 11)
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
