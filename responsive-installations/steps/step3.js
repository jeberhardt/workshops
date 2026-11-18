// Step 3 — COLOUR AND VARIABLES
// RGBA colour: how much red, green and blue light to mix (0–255 each),
// and alpha: how see-through (0 = invisible, 255 = solid).
// The circle's properties get names at the top, so they're easy to find
// and change — and later, an input can change them.

// The circle's properties. Change these numbers and reload.
let r = 48;             // red   0–255
let g = 177;            // green 0–255
let b = 242;            // blue  0–255
let a = 255;            // alpha 0–255 (0 = invisible, 255 = solid)
let size = 0.35;        // fraction of the smaller side

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
}

function draw() {
  background(10, 12, 16);   // very dark blue
  fill(r, g, b, a);
  noStroke();
  circle(width / 2, height / 2, size * min(width, height));
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
