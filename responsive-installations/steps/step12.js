// Step 12 — OUTPUTS
// So far the Pi has talked to the sketch. Now the sketch talks back.
// This step is about wiring two outputs to the Pi: a buzzer and 3 NeoPixels.
// Open "Wiring" on the Outputs card to see how to connect each one.
// sendToHardware() (hardware.js) sends a message to the Pi over the WebSocket,
// and pi_bridge.py on the Pi does what it says:
//   { beep: { hz: 880 } }      the buzzer plays a note (hz = how high) until...
//   { beep: false }            ...this stops it
//   { pixels: [255, 120, 0] }  the 3 NeoPixels light up in that colour (red, green, blue)
//   { pixels: [[255, 0, 0], [0, 255, 0], [0, 0, 255]] }   one colour for each pixel
// New in this step's card: "Blink" makes the 3 pixels flash, each a different colour.
// Connect to the Pi first. Then hold down the Buzzer button on the screen.

let buzzing = false;     // is the Buzzer button held down?

// Blinking the NeoPixels
const BLINK_MS = 500;    // how long each flash lasts, in milliseconds
const COLOURS = [        // one colour for each of the 3 pixels: [r, g, b]
  [255, 0, 0],           // first pixel: red
  [0, 255, 0],           // second pixel: green
  [0, 0, 255],           // third pixel: blue
];
let blinking = false;    // is the Blink button on?
let lit = false;         // are the pixels lit right now?
let lastBlink = 0;       // when they last switched (in milliseconds)

function setup() {
  const stage = document.getElementById('stage');
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  canvas.mousePressed(pressCanvas);   // only clicks on the canvas, not on the panel or the Code view
  setupHardware();        // from hardware.js: the Connect box
  buildOutputButtons();   // the Outputs card
}

// The Outputs card: buttons for the NeoPixels, and the wiring for each output (from wiring.js).
function buildOutputButtons() {
  const card = createDiv().class('card').parent('inputs');
  const head = createDiv().class('card-titles').parent(createDiv().class('card-head').parent(card));
  createSpan('Outputs on the Pi').class('card-title').parent(head);
  createSpan('output').class('card-type').parent(head);
  const buttons = createDiv().class('widget').parent(card);
  createButton('Lights on').class('btn').parent(buttons).mousePressed(lightsOn);
  createButton('Lights off').class('btn').parent(buttons).mousePressed(lightsOff);
  createButton('Blink').class('btn').parent(buttons).mousePressed(startBlinking);
  createDiv('Buzzer: GPIO13 (pin 33) · NeoPixels: GPIO10 (pin 19)').class('sub').parent(buttons);
  card.child(outputWiring());   // "Wiring: NeoPixels" and "Wiring: buzzer"
}

function lightsOn() {
  blinking = false;
  sendToHardware({ pixels: [255, 120, 0] });   // orange: try your own colour
}

function lightsOff() {
  blinking = false;
  sendToHardware({ pixels: [0, 0, 0] });
}

function startBlinking() {
  blinking = true;
}

// Called from draw(): every BLINK_MS, switch the pixels on (in their COLOURS) or off.
function blink() {
  if (millis() - lastBlink < BLINK_MS) return;   // not time yet
  lastBlink = millis();
  lit = !lit;
  if (lit) {
    sendToHardware({ pixels: COLOURS });          // a list of colours: one per pixel
  } else {
    sendToHardware({ pixels: [0, 0, 0] });        // all off
  }
}

// The Buzzer button, in the middle of the screen.
function buttonSize() {
  return 0.4 * min(width, height);
}

function overButton() {
  return dist(mouseX, mouseY, width / 2, height / 2) < buttonSize() / 2;
}

function pressCanvas() {
  if (overButton()) {
    buzzing = true;
    sendToHardware({ beep: { hz: 880 } });   // start: try 440 (lower) or 1760 (higher)
  }
}

function mouseReleased() {   // letting go anywhere stops it
  if (buzzing) {
    buzzing = false;
    sendToHardware({ beep: false });         // stop
  }
}

function draw() {
  if (blinking) blink();

  background(10, 12, 16);
  noStroke();
  if (buzzing) {
    fill(255, 120, 0);   // held down: bright
  } else {
    fill(120, 60, 20);   // waiting: dim
  }
  circle(width / 2, height / 2, buttonSize());

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(buttonSize() / 6);
  text('Buzzer', width / 2, height / 2);
}

function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
