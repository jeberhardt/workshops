// Step 6 — THE MOUSE AS AN INPUT
// The first input. The big idea of the workshop:
//   any input → a number from 0 to 1 → stretched to the range a property needs.
// lerp(a, b, t) gives a when t is 0, b when t is 1, and in between for the rest.
// Move the mouse over the canvas: left/right = colour, up/down = orbit size.

let hue = 200;
let saturation = 80;
let brightness = 95;
let size = 0.25;
let pulseSpeed = 0.5;
let pulseAmount = 0.1;
let orbitSpeed = 0.6;
let orbitRadius = 0.2;
let hueDrift = 0;        // off, so the mouse is in charge of the colour
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
  const mx = constrain(mouseX / width, 0, 1);    // 0 = left edge, 1 = right edge
  const my = constrain(mouseY / height, 0, 1);   // 0 = top, 1 = bottom

  // 2. stretch 0..1 to each property's range
  hue = lerp(0, 360, mx);
  orbitRadius = lerp(0, 0.4, my);

  // 3. animate and draw, as before
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
