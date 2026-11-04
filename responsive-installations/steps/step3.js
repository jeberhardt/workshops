// Step 3 — COLOUR AND VARIABLES
// HSB colour: hue picks the colour, saturation how strong, brightness how light.
// The circle's properties get names at the top, so they're easy to find
// and change — and later, an input can change them.

// The circle's properties. Change these numbers and reload.
let hue = 200;          // 0–360, round the colour wheel
let saturation = 80;    // 0 = grey, 100 = full colour
let brightness = 95;    // 0 = black, 100 = full
let size = 0.35;        // fraction of the smaller side

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  colorMode(HSB, 360, 100, 100, 100);   // hue, saturation, brightness, opacity
}

function draw() {
  background(230, 30, 6);   // very dark blue
  fill(hue, saturation, brightness);
  noStroke();
  circle(width / 2, height / 2, size * min(width, height));
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
