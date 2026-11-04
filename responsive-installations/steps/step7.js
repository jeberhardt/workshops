// Step 7 — SMOOTHING
// Real inputs are jumpy: noisy sensors, buttons that go straight from
// 0 to 1. Instead of setting a property, move it a fraction of the way
// towards its target every frame. Jumps become glides.
// Hold the mouse button down to see an on/off input glide.

const SMOOTHING = 0.12;  // 1 = instant (jumpy), 0.05 = slow and dreamy

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
}

function draw() {
  const dt = min(deltaTime / 1000, 0.1);

  // 1. read the inputs as 0..1
  const mx = constrain(mouseX / width, 0, 1);
  const my = constrain(mouseY / height, 0, 1);
  const pressed = mouseIsPressed ? 1 : 0;        // an on/off input

  // 2. stretch to each range, then glide there: lerp(now, target, SMOOTHING)
  hue         = lerp(hue,         lerp(0, 360, mx),       SMOOTHING);
  orbitRadius = lerp(orbitRadius, lerp(0, 0.4, my),       SMOOTHING);
  pulseAmount = lerp(pulseAmount, lerp(0.1, 0.6, pressed), SMOOTHING);

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
