// Step 4 — MOVEMENT
// p5 runs draw() about 60 times a second. To animate, keep a value that
// grows a little every frame — here pulsePhase — and feed it to sin(),
// which swings smoothly between -1 and 1: the size breathes.
// deltaTime keeps the speed the same on fast and slow computers.

let r = 48;
let g = 177;
let b = 242;
let a = 255;
let size = 0.35;
let pulseSpeed = 0.5;    // pulses per second
let pulseAmount = 0.1;   // how much the size breathes (0.1 = ±10%)

let pulsePhase = 0;      // the animation clock: grows every frame

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
}

function draw() {
  const dt = min(deltaTime / 1000, 0.1);    // seconds since the last frame (capped, so a hiccup can't jump)
  pulsePhase += pulseSpeed * TWO_PI * dt;   // TWO_PI = one full swing of sin()

  background(10, 12, 16);
  fill(r, g, b, a);
  noStroke();
  const diameter = size * min(width, height) * (1 + pulseAmount * sin(pulsePhase));
  circle(width / 2, height / 2, diameter);
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
