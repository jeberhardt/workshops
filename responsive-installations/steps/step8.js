// Step 8 — SIMULATED SENSORS
// The panel now has three pretend sensors (controls.js). Each one gives
// inputs.<id>.value, already 0..1 — exactly like the mouse in step 6.
// So nothing else changes: stretch to a range, then smooth.
// Try the slider, hold the button, move the hand distance.

const SMOOTHING = 0.12;

let hue = 200;
let saturation = 80;
let brightness = 95;
let size = 0.25;
let pulseSpeed = 0.5;
let pulseAmount = 0.1;
let orbitSpeed = 0.6;
let orbitRadius = 0.2;
let hueDrift = 0;
let trails = 0.8;

let pulsePhase = 0;
let orbitAngle = 0;
let hueOffset = 0;

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  colorMode(HSB, 360, 100, 100, 100);
  buildControlPanel(null, ['slider', 'button', 'proximity']);   // from controls.js: just these cards
}

function draw() {
  const dt = min(deltaTime / 1000, 0.1);

  // 1. read the inputs as 0..1
  updateInputs(dt);   // runs the simulated sensors (controls.js)

  // 2. stretch and smooth
  hue         = lerp(hue,         lerp(0, 360, inputs.slider.value),    SMOOTHING);
  pulseAmount = lerp(pulseAmount, lerp(0.1, 0.6, inputs.button.value),  SMOOTHING);
  orbitRadius = lerp(orbitRadius, lerp(0, 0.4, inputs.proximity.value), SMOOTHING);

  // 3. animate and draw
  pulsePhase += pulseSpeed * TWO_PI * dt;
  orbitAngle += orbitSpeed * dt;
  hueOffset  += hueDrift * dt;

  background(230, 30, 6, 100 * (1 - trails));
  const unit = min(width, height);
  const x = width / 2  + cos(orbitAngle) * orbitRadius * unit;
  const y = height / 2 + sin(orbitAngle) * orbitRadius * unit;
  const diameter = size * unit * (1 + pulseAmount * sin(pulsePhase));
  fill((hue + hueOffset) % 360, saturation, brightness);
  noStroke();
  circle(x, y, diameter);
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
