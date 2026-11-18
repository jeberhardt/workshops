// Step 12 — OUTPUTS
// So far the Pi has talked to the sketch. Now the sketch talks back.
// sendToHardware() (hardware.js) sends a message to the Pi over the same
// WebSocket, and pi_bridge.py on the Pi does what it says:
//   { beep: { hz: 880, ms: 300 } }   the buzzer plays a note: hz = how high, ms = how long
//   { pixels: [255, 120, 0] }        the 3 NeoPixels light up in that colour (red, green, blue)
// Press the buttons on the Outputs card. Connect to the Pi first.

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
  setupHardware();                                             // from hardware.js
  buildOutputButtons();                                        // new: the Outputs card
}

// The Outputs card: three buttons, each sends one message to the Pi.
function buildOutputButtons() {
  const card = createDiv().class('card').parent('inputs');
  const head = createDiv().class('card-titles').parent(createDiv().class('card-head').parent(card));
  createSpan('Outputs on the Pi').class('card-title').parent(head);
  createSpan('output').class('card-type').parent(head);

  const buttons = createDiv().class('widget').parent(card);
  createButton('Beep').class('btn').parent(buttons).mousePressed(beep);
  createButton('Lights on').class('btn').parent(buttons).mousePressed(lightsOn);
  createButton('Lights off').class('btn').parent(buttons).mousePressed(lightsOff);
  createDiv('Buzzer: GPIO13 (pin 33) · NeoPixels: GPIO10 (pin 19)').class('sub').parent(buttons);
}

function beep() {
  sendToHardware({ beep: { hz: 880, ms: 300 } });   // try another note: 440 is lower, 1760 higher
}

function lightsOn() {
  // The circle's colour right now, rounded to whole numbers.
  sendToHardware({ pixels: [round(r * bright), round(g * bright), round(b * bright)] });
}

function lightsOff() {
  sendToHardware({ pixels: [0, 0, 0] });
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
