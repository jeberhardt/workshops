// Step 7 — THE KEYBOARD AS AN INPUT
// The mouse is read every frame: where is it now? A key press is different:
// it's an event, something that happens once. p5 calls keyPressed() once
// for every press, so that's where the action goes.
// Press the space bar: the circle gets a new random colour.

let r = 48;
let g = 177;
let b = 242;
let a = 255;
let size = 0.35;

function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
}

function draw() {
  background(10, 12, 16);
  fill(r, g, b, a);
  noStroke();
  circle(width / 2, height / 2, size * min(width, height));
}

// p5 calls this once each time a key goes down. key is the key that was pressed.
function keyPressed() {
  if (key === ' ') {                // ' ' is the space bar
    r = random(255);                // the action: a new random colour
    g = random(255);
    b = random(255);
    return false;                   // stop the browser doing its own thing with space (like scrolling)
  }
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
