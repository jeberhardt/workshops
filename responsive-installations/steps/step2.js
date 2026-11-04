// Step 2 — FILL THE WINDOW
// The canvas takes all the space next to the panel. Positions and sizes
// come from width and height instead of fixed numbers, so the circle
// stays in the middle at any size.

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
}

function draw() {
  background(220);
  const diameter = min(width, height) * 0.35;   // 35% of the smaller side
  circle(width / 2, height / 2, diameter);
}

// p5 calls this when the window changes size.
function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
