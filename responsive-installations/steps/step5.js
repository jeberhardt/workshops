// Step 5 — ORBIT AND TRAILS
// Two more clocks: orbitAngle sends the circle round the centre
// (cos() for x, sin() for y), hueOffset turns the colour wheel.
// A see-through background only partly covers the last frame: trails.

let hue = 200;
let saturation = 80;
let brightness = 95;
let size = 0.25;
let pulseSpeed = 0.5;    // pulses per second
let pulseAmount = 0.1;   // how much the size breathes
let orbitSpeed = 0.6;    // radians per second (negative = the other way)
let orbitRadius = 0.2;   // fraction of the smaller side
let hueDrift = 20;       // degrees per second round the colour wheel
let trails = 0.8;        // 0 = none, 0.9 = long

// Animation clocks: each grows every frame, so changing a speed never makes the circle jump.
let pulsePhase = 0;
let orbitAngle = 0;
let hueOffset = 0;

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  const dt = min(deltaTime / 1000, 0.1);
  pulsePhase += pulseSpeed * TWO_PI * dt;
  orbitAngle += orbitSpeed * dt;
  hueOffset  += hueDrift * dt;

  background(230, 30, 6, 100 * (1 - trails));   // the 4th number is opacity

  const unit = min(width, height);
  const x = width / 2  + cos(orbitAngle) * orbitRadius * unit;
  const y = height / 2 + sin(orbitAngle) * orbitRadius * unit;
  const diameter = size * unit * (1 + pulseAmount * sin(pulsePhase));

  fill((hue + hueOffset) % 360, saturation, brightness);   // % 360 wraps round the wheel
  noStroke();
  circle(x, y, diameter);
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
