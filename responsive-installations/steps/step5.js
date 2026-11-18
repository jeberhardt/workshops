// Step 5 — ORBIT AND TRAILS
// Two more clocks: orbitAngle sends the circle round the centre
// (cos() for x, sin() for y), colourPhase swings the colour to its
// opposite (255 minus each channel) and back. lerp() mixes the two; more in step 6.
// A see-through background only partly covers the last frame: trails.

let r = 48;
let g = 177;
let b = 242;
let a = 255;
let size = 0.25;
let pulseSpeed = 0.5;    // pulses per second
let pulseAmount = 0.1;   // how much the size breathes
let orbitSpeed = 0.6;    // radians per second (negative = the other way)
let orbitRadius = 0.2;   // fraction of the smaller side
let colourSpeed = 0.1;   // swings per second to the opposite colour and back
let trails = 0.8;        // 0 = none, 0.9 = long

// Animation clocks: each grows every frame, so changing a speed never makes the circle jump.
let pulsePhase = 0;
let orbitAngle = 0;
let colourPhase = 0;

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
}

function draw() {
  const dt = min(deltaTime / 1000, 0.1);
  pulsePhase += pulseSpeed * TWO_PI * dt;
  orbitAngle += orbitSpeed * dt;
  colourPhase += colourSpeed * TWO_PI * dt;

  background(10, 12, 16, 255 * (1 - trails));   // the 4th number is alpha

  const unit = min(width, height);
  const x = width / 2  + cos(orbitAngle) * orbitRadius * unit;
  const y = height / 2 + sin(orbitAngle) * orbitRadius * unit;
  const diameter = size * unit * (1 + pulseAmount * sin(pulsePhase));

  const swing = (1 - cos(colourPhase)) / 2;   // 0 → 1 → 0: there and back
  fill(lerp(r, 255 - r, swing), lerp(g, 255 - g, swing), lerp(b, 255 - b, swing), a);
  noStroke();
  circle(x, y, diameter);
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
