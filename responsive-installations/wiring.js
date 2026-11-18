/* =================================================================
   wiring.js — HOW TO WIRE EACH PART TO THE RASPBERRY PI
   -----------------------------------------------------------------
   Every card has a "Wiring" section with a breadboard diagram
   (Fritzing style), the list of wires and any gotchas. The Outputs
   step's card has one for the NeoPixels and one for the buzzer.
   The pins are planned so ALL the parts can be wired at once:
   no two parts share a GPIO pin.

   The Pi has no analog inputs, so analog parts need an ADC chip:
   - the LDR (light sensor) uses an ADS1115 breakout on the I2C pins.
     Turn I2C on first: sudo raspi-config → Interface Options → I2C
   - the pots, mic and joystick go through an MCP3008 chip (8 channels,
     10-bit ADC) on the SPI pins. Turn SPI on first:
     sudo raspi-config → Interface Options → SPI
     Then gpiozero's MCP3008(channel=0).value gives 0..1 — send it as is.

   "Pin" = the physical pin on the header (1–40, pin 1 has a square pad).
   "GPIO" = the number your code uses (gpiozero, or RPi.GPIO in BCM mode).
   ================================================================= */

// Physical pin → what it is, on the 40-pin header.
const PIN_NAMES = {
  1: '3.3V',  2: '5V',     3: 'GPIO2 SDA', 4: '5V',   5: 'GPIO3 SCL', 6: 'GND',
  7: 'GPIO4', 8: 'GPIO14', 9: 'GND',   10: 'GPIO15', 11: 'GPIO17', 12: 'GPIO18',
  13: 'GPIO27', 14: 'GND', 15: 'GPIO22', 16: 'GPIO23', 17: '3.3V', 18: 'GPIO24',
  19: 'GPIO10 MOSI', 20: 'GND', 21: 'GPIO9 MISO', 22: 'GPIO25',
  23: 'GPIO11 SCLK', 24: 'GPIO8 CE0', 25: 'GND', 26: 'GPIO7 CE1',
  27: 'ID_SD', 28: 'ID_SC', 29: 'GPIO5', 30: 'GND', 31: 'GPIO6', 32: 'GPIO12',
  33: 'GPIO13', 34: 'GND', 35: 'GPIO19', 36: 'GPIO16', 37: 'GPIO26', 38: 'GPIO20',
  39: 'GND', 40: 'GPIO21',
};

const WIRE = {
  power: '#d7263d', gnd: '#2b2b2b',
  yellow: '#f2b705', green: '#2a9d8f', blue: '#3a6ee8', orange: '#f77f00', purple: '#9b5de5',
};

// Resistor colour bands
const BANDS = {
  '1kΩ':  ['#7b4a1e', '#111', '#d7263d'],
  '2kΩ':  ['#d7263d', '#111', '#d7263d'],
  '10kΩ': ['#7b4a1e', '#111', '#f77f00'],
  '330Ω': ['#f77f00', '#f77f00', '#7b4a1e'],
};

// Layout: the Pi's 40-pin header stands on the left, pin 1 at the top, and the
// breadboard is on its right, with the + and − rails running beside the header.
// The coordinates below are written along the header (x: down the header, from
// pin 1 to pin 40) and away from it (y: from the header towards the parts).
// drawWiring() flips the picture across its diagonal to stand the header up,
// and label() keeps text upright.
const PLUS_Y = 48;   // + rail
const GND_Y  = 56;   // − rail
const RAIL_PINS = { '3.3V': 1, '5V': 2 };   // which Pi pin feeds the + rail
const GND_PIN = 9;


// -----------------------------------------------------------------
// One entry per card (same ids as INPUT_DEFS in controls.js).
//   plus  : voltage on the + rail ('3.3V', '5V' or null for none)
//   chip  : true = uses the MCP3008 (analog parts)
//   parts : the components (drawn with the helpers further down)
//   wires : { pts, color, text } — add pi: n when it starts on a Pi pin
//   extras: resistors and junction dots, drawn over the wires
// -----------------------------------------------------------------
const WIRING = {

  button: () => ({
    plus: null, height: 146,
    parts: [part(110, 102, 32, 32, '#222', [['', 116], ['', 136]], svgCircle(126, 118, 9, '#555'))],
    wires: [
      { pi: 11, pts: fromPi(11, [116, 96]), color: WIRE.yellow, text: 'one button leg' },
      { pts: up([136, 96], GND_Y), color: WIRE.gnd, text: 'Other button leg → − rail' },
    ],
    notes: [
      'No resistor needed: the Pi\'s internal pull-up holds the pin HIGH, and pressing connects it to GND (LOW).',
      'gpiozero Button(17) handles this: send 1 when is_pressed.',
    ],
  }),

  switch: () => ({
    plus: null, height: 140,
    parts: [part(98, 102, 64, 26, '#b8bcc2', [['1', 110], ['COM', 130], ['2', 150]], svgCircle(130, 120, 5, '#666'), '#333')],
    wires: [
      { pi: 13, pts: fromPi(13, [130, 96]), color: WIRE.green, text: 'middle pin (COM)' },
      { pts: up([110, 96], GND_Y), color: WIRE.gnd, text: 'One outer pin → − rail (the other stays empty)' },
    ],
    notes: [
      'Same trick as the button: internal pull-up, so the pin reads LOW when the switch points at the GND side.',
      'gpiozero Button(27): send 1 when is_pressed.',
    ],
  }),

  proximity: () => ({
    plus: '5V', height: 178,
    parts: [part(96, 126, 108, 44, '#1c4f9c',
      [['VCC', 129], ['TRIG', 143], ['ECHO', 157], ['GND', 171]],
      transducer(116, 152) + transducer(184, 152))],
    wires: [
      { pts: up([129, 120], PLUS_Y), color: WIRE.power, text: 'VCC → + rail (5 V)' },
      { pi: 16, pts: fromPi(16, [143, 120], 72), color: WIRE.green, text: 'TRIG' },
      { pts: [[157, 120], [157, 104], [193, 104]], color: WIRE.orange, text: 'ECHO → 1 kΩ resistor → junction' },
      { pi: 18, pts: fromPi(18, [193, 104], 90), color: WIRE.purple, text: 'the junction between the resistors (ECHO)' },
      { pts: [[193, 104], [250, 104], [250, GND_Y]], color: WIRE.gnd, text: 'Junction → 2 kΩ resistor → − rail' },
      { pts: [[171, 120], [171, 114], [262, 114], [262, GND_Y]], color: WIRE.gnd, text: 'GND → − rail' },
    ],
    extras: [resistor(157, 104, 193, 104, '1kΩ'), resistor(193, 104, 250, 104, '2kΩ'), junction(193, 104)],
    notes: [
      'The HC-SR04 needs 5 V, and its ECHO pin answers with 5 V: too much for a GPIO pin. The 1 kΩ + 2 kΩ divider brings it down to 3.3 V. Never wire ECHO straight to the Pi.',
      'No 2 kΩ? Use two 1 kΩ in a row, or 2.2 kΩ. gpiozero DistanceSensor(echo=24, trigger=23): send distance × 100 (cm).',
    ],
  }),

  pir: () => ({
    plus: '5V', height: 152,
    parts: [part(104, 102, 80, 40, '#2e7d32', [['VCC', 124], ['OUT', 144], ['GND', 164]],
      svgCircle(144, 129, 11, '#f5f5f0', '#ccc'))],
    wires: [
      { pts: up([124, 96], PLUS_Y), color: WIRE.power, text: 'VCC → + rail (5 V)' },
      { pi: 15, pts: fromPi(15, [144, 96]), color: WIRE.orange, text: 'OUT' },
      { pts: up([164, 96], GND_Y), color: WIRE.gnd, text: 'GND → − rail' },
    ],
    notes: [
      'An HC-SR501 runs on 5 V but its OUT pin gives 3.3 V, so it can go straight to the Pi.',
      'The two orange screws on the back set sensitivity and how long it stays HIGH. Pin order varies: check the labels under the dome.',
    ],
  }),

  touch: () => ({
    plus: '3.3V', height: 146,
    parts: [part(161, 102, 64, 34, '#c62828', [['VCC', 175], ['SIG', 193], ['GND', 211]],
      svgCircle(193, 124, 8, '#e8a0a0', '#fff'))],
    wires: [
      { pts: up([175, 96], PLUS_Y), color: WIRE.power, text: 'VCC → + rail (3.3 V)' },
      { pi: 22, pts: fromPi(22, [193, 96]), color: WIRE.blue, text: 'SIG (also marked I/O or OUT)' },
      { pts: up([211, 96], GND_Y), color: WIRE.gnd, text: 'GND → − rail' },
    ],
    notes: [
      'A TTP223 touch module: SIG goes HIGH while touched. Power it from 3.3 V so its output is safe for the Pi.',
      'Pin order differs between boards: follow the labels printed on yours.',
    ],
  }),

  slider: () => potWiring(0, slidePot()),
  knob:   () => potWiring(1, rotaryPot()),

  // The LDR reads through an ADS1115 breakout on I2C (not the MCP3008).
  light: () => ({
    plus: '3.3V', height: 196,
    parts: [ads1115(), ldr(250, 266)],
    wires: [
      { pts: up([138, 94], PLUS_Y), color: WIRE.power, text: 'ADS1115 VDD → + rail (3.3 V)' },
      { pts: up([152, 94], GND_Y), color: WIRE.gnd, text: 'ADS1115 GND → − rail' },
      { pi: 5, pts: fromPi(5, [166, 94], 44), color: WIRE.blue, text: 'ADS1115 SCL' },
      { pi: 3, pts: fromPi(3, [180, 94], 40), color: WIRE.yellow, text: 'ADS1115 SDA' },
      { pts: [[250, 150], [250, 144], [120, 144], [120, PLUS_Y]], color: WIRE.power, text: 'One LDR leg → + rail' },
      { pts: [[266, 150], [266, 142], [290, 142], [290, 84], [222, 84], [222, 94]], color: WIRE.orange, text: 'Other LDR leg → ADS1115 A0' },
      { pts: [[244, 84], [244, GND_Y]], color: WIRE.gnd, text: '10 kΩ resistor from A0 → − rail' },
    ],
    extras: [resistor(244, 84, 244, GND_Y, '10kΩ'), junction(244, 84)],
    notes: [
      'The Pi has no analog inputs: the ADS1115 measures the voltage at A0 and sends it over I2C. Turn I2C on first: sudo raspi-config → Interface Options → I2C. Then i2cdetect -y 1 should show 48.',
      'The LDR and the 10 kΩ resistor make a voltage divider: more light, higher voltage at A0. ADDR and ALRT stay unconnected. pi_bridge.py sends A0’s voltage ÷ 3.3, so 0..1.',
    ],
  }),

  sound: () => ({
    plus: '3.3V', chip: true, height: 196,
    parts: [part(20, 156, 90, 30, '#1f3d7a', [['OUT', 50], ['GND', 64], ['VCC', 78]],
      svgCircle(94, 172, 9, '#222', '#999') + label(36, 158, 'MAX4466', '#fff', 5.5))],
    wires: [
      { pts: [[50, 150], [50, 136], [175, 136], [175, 128]], color: WIRE.yellow, text: 'OUT → MCP3008 CH3' },
      { pts: up([64, 150], GND_Y), color: WIRE.gnd, text: 'GND → − rail' },
      { pts: up([78, 150], PLUS_Y), color: WIRE.power, text: 'VCC → + rail (3.3 V)' },
    ],
    notes: [
      'A mic amplifier gives the raw sound wave, wobbling around half-way. Send the loudness: read it fast for ~20 ms and send max − min (×2, capped at 1).',
      'The little screw on the back sets the gain. gpiozero MCP3008(channel=3)',
    ],
  }),

  joystick: () => ({
    plus: '3.3V', chip: true, height: 206,
    parts: [part(40, 156, 90, 40, '#222',
      [['GND', 56], ['+5V', 70], ['VRx', 84], ['VRy', 98], ['SW', 112]],
      svgCircle(85, 183, 9, '#555') + svgCircle(85, 183, 5, '#888'))],
    wires: [
      { pts: up([56, 150], GND_Y), color: WIRE.gnd, text: 'GND → − rail' },
      { pts: up([70, 150], PLUS_Y), color: WIRE.power, text: '+5V pin → + rail (3.3 V!)' },
      { pts: [[84, 150], [84, 136], [185, 136], [185, 128]], color: WIRE.yellow, text: 'VRx → MCP3008 CH4 (joystickX)' },
      { pts: [[98, 150], [98, 142], [195, 142], [195, 128]], color: WIRE.blue, text: 'VRy → MCP3008 CH5 (joystickY)' },
    ],
    notes: [
      'Power it from 3.3 V even though the pin says +5V: then it can never send the chip more than it can read.',
      'SW is a push button under the stick: wire it like the button card (a free GPIO pin + GND) if you want it.',
    ],
  }),

  // --- Outputs (the Outputs step) ---

  // Three NeoPixel boards in a chain: the data goes in DIN and out DOUT to the next one.
  pixels: () => ({
    plus: '5V', height: 158,
    parts: [pixelBoard(118, '#ff4d4d'), pixelBoard(178, '#4dff88'), pixelBoard(238, '#4d8bff')],
    wires: [
      { pi: 19, pts: fromPi(19, [127, 106], 90), color: WIRE.green, text: '330 Ω resistor → first pixel DIN' },
      { pts: up([139, 106], PLUS_Y), color: WIRE.power, text: 'Every pixel’s 5V → + rail (5 V)' },
      { pts: up([199, 106], PLUS_Y), color: WIRE.power },
      { pts: up([259, 106], PLUS_Y), color: WIRE.power },
      { pts: up([151, 106], GND_Y), color: WIRE.gnd, text: 'Every pixel’s GND → − rail' },
      { pts: up([211, 106], GND_Y), color: WIRE.gnd },
      { pts: up([271, 106], GND_Y), color: WIRE.gnd },
      { pts: [[163, 106], [163, 100], [187, 100], [187, 106]], color: WIRE.yellow, text: 'Pixel 1 DOUT → pixel 2 DIN' },
      { pts: [[223, 106], [223, 100], [247, 100], [247, 106]], color: WIRE.yellow, text: 'Pixel 2 DOUT → pixel 3 DIN (pixel 3’s DOUT stays empty)' },
    ],
    extras: [resistor(pinX(19) + 7, 58, pinX(19) + 7, 84, '330Ω')],   // + 7: on the wire, which steps between the pins
    notes: [
      'The data goes one way: into DIN, out of DOUT, into the next pixel’s DIN. Many boards have an arrow showing the way. Pin order differs between boards: follow the labels printed on yours.',
      'Pin 19 is the SPI data pin, so SPI must be on (./workshop install turns it on). Three pixels can run from the Pi’s 5 V; if the first one flickers, add a 74AHCT125 level shifter on the data line.',
    ],
  }),

  // A passive buzzer, switched by a transistor: the GPIO pin only turns the transistor on and off.
  buzzer: () => ({
    plus: '5V', height: 160,
    parts: [transistor(), part(270, 120, 54, 30, '#1a1a1a', [['−', 284], ['+', 310]],
      svgCircle(297, 136, 9, '#2c2c2c', '#555') + svgCircle(297, 136, 2, '#000'))],
    wires: [
      { pi: 33, pts: fromPi(33, [212, 114], 96), color: WIRE.orange, text: '1 kΩ resistor → transistor B (middle leg)' },
      { pts: up([200, 114], GND_Y), color: WIRE.gnd, text: 'Transistor E → − rail' },
      { pts: [[224, 114], [224, 104], [284, 104], [284, 114]], color: WIRE.yellow, text: 'Transistor C → buzzer −' },
      { pts: up([310, 114], PLUS_Y), color: WIRE.power, text: 'Buzzer + → + rail (5 V)' },
    ],
    extras: [resistor(pinX(33) + 7, 58, pinX(33) + 7, 88, '1kΩ'),   // + 7: on the wire, which steps between the pins
             diode(284, 310, 104), junction(284, 104), junction(310, 104)],
    notes: [
      'The buzzer needs more current than a GPIO pin should give, so the pin only switches the PN2222A transistor, through the 1 kΩ resistor. Hold the transistor with its flat side facing you: the legs are E, B, C from left to right.',
      'The 1N4148 diode goes across the buzzer, with its stripe towards + (5 V). It soaks up the spike when the buzzer switches off. Use a passive buzzer: an active one only beeps at one pitch.',
    ],
  }),
};

// The slide and rotary pots are wired the same way, just on different channels.
function potWiring(ch, drawing) {
  return {
    plus: '3.3V', chip: true, height: 196,
    parts: [drawing],
    wires: [
      { pts: up([60, 150], PLUS_Y), color: WIRE.power, text: 'Outer pin 1 → + rail' },
      { pts: [[74, 150], [74, 136], [chX(ch), 136], [chX(ch), 128]], color: WIRE.yellow, text: `Middle pin (wiper) → MCP3008 CH${ch}` },
      { pts: up([88, 150], GND_Y), color: WIRE.gnd, text: 'Outer pin 3 → − rail' },
    ],
    notes: [
      'Turns the wrong way? Swap the two outer wires (or tick invert).',
      `gpiozero MCP3008(channel=${ch}).value`,
    ],
  };
}


// -----------------------------------------------------------------
// The MCP3008, shared by every analog part: wire it once.
// It sits on the breadboard with its notch on the left, so the top
// row is pins 16…9 and the bottom row is pins 1…8 (CH0…CH7).
// -----------------------------------------------------------------
const CHIP_TOP = ['VDD', 'VREF', 'AGND', 'CLK', 'DOUT', 'DIN', 'CS', 'DGND'];
const chX = i => 145 + i * 10;   // x of the chip's i-th pin, either row

function chipWires() {
  return [
    { pi: 23, pts: fromPi(23, [chX(3), 82], 66), color: WIRE.yellow, text: 'MCP3008 CLK (13)' },
    { pi: 21, pts: fromPi(21, [chX(4), 82], 70), color: WIRE.green,  text: 'MCP3008 DOUT (12)' },
    { pi: 19, pts: fromPi(19, [chX(5), 82], 74), color: WIRE.blue,   text: 'MCP3008 DIN (11)' },
    { pi: 24, pts: fromPi(24, [chX(6), 82], 62), color: WIRE.orange, text: 'MCP3008 CS (10)' },
    { pts: up([chX(0), 82], PLUS_Y), color: WIRE.power, text: 'VDD (16) and VREF (15) → + rail (3.3 V)' },
    { pts: up([chX(1), 82], PLUS_Y), color: WIRE.power },
    { pts: up([chX(2), 82], GND_Y), color: WIRE.gnd, text: 'AGND (14) and DGND (9) → − rail' },
    { pts: up([chX(7), 82], GND_Y), color: WIRE.gnd },
  ];
}

function mcp3008() {
  let s = `<rect x="138" y="88" width="84" height="34" rx="2" fill="#262626"/>`
        + `<circle cx="138" cy="105" r="4" fill="#3a3a3a"/>`
        + label(232, 88, 'MCP3008', '#333', 7) + label(240, 88, 'ADC', '#777', 6);
  for (let i = 0; i < 8; i++) {
    const x = chX(i);
    s += leg(x, 82, 88) + leg(x, 122, 128)
       + label(x + 2, 90, CHIP_TOP[i], '#ddd', 5)
       + label(x + 2, 120, `CH${i}`, '#ddd', 5, 'end');
  }
  return s;
}


// The ADS1115 breakout (used by the LDR): 10 pins along its top edge.
function ads1115() {
  const names = ['VDD', 'GND', 'SCL', 'SDA', 'ADDR', 'ALRT', 'A0', 'A1', 'A2', 'A3'];
  return part(128, 100, 150, 40, '#1f4fa0', names.map((n, i) => [n, 138 + i * 14]),
    label(205, 119, 'ADS1115', '#fff', 5.5));
}


// -----------------------------------------------------------------
// Wire routing
// -----------------------------------------------------------------
// Pin n on the header: x along the header, y across it. Odd pins (1, 3, …) are the
// column further from the breadboard, even pins the nearer one, as on the real Pi.
const pinX = n => 46 + Math.floor((n - 1) / 2) * 14;
const pinY = n => n % 2 ? 12 : 22;

// A wire from Pi pin n out to `to` ([x, y], or just a y to go straight out).
// With `lane` it goes out to that distance, runs along, then onto the target.
// Wires from the far (odd) column step between the near pins first.
function fromPi(n, to, lane) {
  const pts = [[pinX(n), pinY(n)]];
  let x = pinX(n);
  if (n % 2 === 1) { x += 7; pts.push([x, pinY(n)]); }
  const [tx, ty] = Array.isArray(to) ? to : [x, to];
  if (lane == null) {
    if (x !== tx) pts.push([x, 31], [tx, 31]);   // back in line once clear of the pins
    pts.push([tx, ty]);
  } else pts.push([x, lane], [tx, lane], [tx, ty]);
  return pts;
}

// Straight up from a part's leg to a rail.
function up(p, y) { return [p, [p[0], y]]; }


// -----------------------------------------------------------------
// Drawing helpers (each returns an SVG string)
// -----------------------------------------------------------------
function leg(x, y1, y2) {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#9aa0a6" stroke-width="1.6"/>`;
}

function svgCircle(cx, cy, r, fill, stroke) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
}

// Text starting at (x, y), written upright in the finished picture: it runs
// across the page (along y in these coordinates), with x as its baseline.
function label(x, y, text, fill, size = 6, anchor = 'start') {
  return `<text transform="matrix(0 1 1 0 ${x} ${y})" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${text}</text>`;
}

// A component body with legs sticking up from its top edge.
// pins: [[name, x], …] — the wire attaches 6 units above the body.
function part(x, y, w, h, fill, pins, inner = '', ink = '#fff') {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="#0003"/>` + inner;
  for (const [name, px] of pins) {
    s += leg(px, y - 6, y + 1)
       + label(px + 1.8, y + 3, name, ink, 5);
  }
  return s;
}

function transducer(cx, cy) {
  return svgCircle(cx, cy, 14, '#c0c4c8', '#888') + svgCircle(cx, cy, 9, '#6b6f73');
}

function slidePot() {
  return part(14, 156, 110, 22, '#3b3b3b', [['1', 60], ['W', 74], ['3', 88]],
    `<rect x="24" y="167" width="90" height="4" rx="2" fill="#111"/>`
    + `<rect x="94" y="162" width="12" height="14" rx="2" fill="#ddd"/>`);
}

function rotaryPot() {
  return part(52, 156, 44, 30, '#2f5fa8', [['1', 60], ['W', 74], ['3', 88]],
    svgCircle(74, 176, 8, '#ccc') + `<line x1="74" y1="176" x2="74" y2="169" stroke="#555" stroke-width="1.5"/>`);
}

function ldr(x1, x2) {
  const cx = (x1 + x2) / 2;
  return leg(x1, 150, 162) + leg(x2, 150, 162)
    + svgCircle(cx, 168, 10, '#e9a23b', '#b97a1f')
    + `<path d="M${cx - 6} 164 h3 v4 h3 v-4 h3 v4 h3" fill="none" stroke="#8a4b0f" stroke-width="1.2"/>`
    + label(cx + 2, 181, 'LDR', '#333');
}

// One NeoPixel breakout board: four legs (DIN, 5V, GND, DOUT) and its LED.
function pixelBoard(x, glow) {
  return part(x, 112, 54, 34, '#1a1a1a', [['DIN', x + 9], ['5V', x + 21], ['GND', x + 33], ['DOUT', x + 45]],
    `<rect x="${x + 20}" y="130" width="14" height="14" rx="1.5" fill="#f4f4f0"/>` + svgCircle(x + 27, 137, 4, glow));
}

// The PN2222A transistor (TO-92), flat side facing you: legs E, B, C.
function transistor() {
  return part(192, 120, 40, 34, '#222', [['E', 200], ['B', 212], ['C', 224]],
    label(214, 129, 'PN2222A', '#ccc', 5));
}

// A diode with its legs from x1 to x2 (both on wires), its stripe at the x2 end.
function diode(x1, x2, y) {
  const cx = (x1 + x2) / 2;
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#9aa0a6" stroke-width="1.6"/>`
    + `<rect x="${cx - 7}" y="${y - 3}" width="14" height="6" rx="1.5" fill="#1a1a1a"/>`
    + `<rect x="${cx + 3}" y="${y - 3}" width="2" height="6" fill="#ddd"/>`
    + label(cx + 2, y - 6, '1N4148', '#333', 5.5, 'end');
}

// A resistor sitting on a straight wire segment, with its value written beside it.
function resistor(x1, y1, x2, y2, value) {
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const across = y1 === y2;   // horizontal
  const bands = BANDS[value].map((c, i) => {
    const o = -5 + i * 4;
    return across
      ? `<rect x="${cx + o}" y="${cy - 3}" width="1.6" height="6" fill="${c}"/>`
      : `<rect x="${cx - 3}" y="${cy + o}" width="6" height="1.6" fill="${c}"/>`;
  }).join('');
  const body = across
    ? `<rect x="${cx - 9}" y="${cy - 3}" width="18" height="6" rx="2" fill="#d9b38c" stroke="#a07e58" stroke-width=".6"/>`
    : `<rect x="${cx - 3}" y="${cy - 9}" width="6" height="18" rx="2" fill="#d9b38c" stroke="#a07e58" stroke-width=".6"/>`;
  const text = across
    ? label(cx + 2, cy + 6, value, '#333')
    : label(cx - 6, cy, value, '#333', 6, 'middle');
  return body + bands + text;
}

function junction(x, y) { return svgCircle(x, y, 2.4, '#2b2b2b'); }

// A jumper wire: dark edge, colour, and a dot at each end where it plugs in.
function wire(pts, color) {
  const d = 'M' + pts.map(p => p.join(' ')).join(' L');
  const ends = [pts[0], pts[pts.length - 1]].map(([x, y]) => svgCircle(x, y, 1.8, color)).join('');
  return `<path d="${d}" fill="none" stroke="#0007" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>`
       + `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`
       + ends;
}

// The Pi's 40-pin header; the pins this diagram uses are bright.
const HEADER_END = 330;   // where the header ends, along it
function piHeader(used) {
  let s = `<rect x="28" y="0" width="${HEADER_END - 28}" height="34" rx="4" fill="#1d6b3a"/>`
        + `<rect x="39" y="5" width="${pinX(40) + 7 - 39}" height="24" rx="2" fill="#1a1a1a"/>`;
  for (let n = 1; n <= 40; n++) {
    s += `<rect x="${pinX(n) - 2.5}" y="${pinY(n) - 2.5}" width="5" height="5" rx="${n === 1 ? 0 : 1}" fill="${used.has(n) ? '#ffd166' : '#7d6d45'}"/>`;
  }
  return s
    + label(38, pinY(1), '1', '#cfe8d6', 6, 'middle') + label(38, pinY(2), '2', '#cfe8d6', 6, 'middle')
    + label(326, pinY(39), '39', '#cfe8d6', 5, 'middle') + label(326, pinY(40), '40', '#cfe8d6', 5, 'middle')
    + label(14, 2, 'Raspberry Pi', '#1d6b3a', 6.5);
}

function rails(plus, length) {
  let s = `<line x1="34" y1="${GND_Y}" x2="${length - 4}" y2="${GND_Y}" stroke="#3a6ee8" stroke-width="1"/>`
        + label(30, GND_Y, 'GND', '#3a6ee8', 5.5, 'middle');
  if (plus) s += `<line x1="34" y1="${PLUS_Y}" x2="${length - 4}" y2="${PLUS_Y}" stroke="#d7263d" stroke-width="1"/>`
               + label(22, PLUS_Y, '+' + plus, '#d7263d', 5.5, 'middle');
  return s;
}


// -----------------------------------------------------------------
// Putting a diagram together
// -----------------------------------------------------------------
function drawWiring(id) {
  const d = WIRING[id]();
  const feeds = [];
  if (d.plus) {
    const n = RAIL_PINS[d.plus];
    feeds.push({ pi: n, pts: fromPi(n, PLUS_Y), color: WIRE.power, text: '+ rail' });
  }
  feeds.push({ pi: GND_PIN, pts: fromPi(GND_PIN, GND_Y), color: WIRE.gnd, text: '− rail' });
  const chip = d.chip ? chipWires() : [];
  const all = [...feeds, ...chip, ...d.wires];
  const used = new Set(all.filter(w => w.pi).map(w => w.pi));

  // L: along the header (the finished picture's height). H: across it (its width).
  const L = HEADER_END + 10, H = d.height;
  const svg = `<svg viewBox="0 0 ${H} ${L}" role="img" aria-label="Breadboard wiring diagram" font-family="system-ui, sans-serif">`
    + `<defs><pattern id="holes-${id}" width="7" height="7" patternUnits="userSpaceOnUse">`
    + `<circle cx="3.5" cy="3.5" r=".9" fill="#0002"/></pattern></defs>`
    + `<g transform="matrix(0 1 1 0 0 0)">`   // flip across the diagonal: the header stands up on the left
    + `<rect width="${L}" height="${H}" rx="8" fill="#ece8dc"/>`
    + `<rect y="38" width="${L}" height="${H - 46}" fill="url(#holes-${id})"/>`
    + piHeader(used) + rails(d.plus, L)
    + d.parts.join('') + (d.chip ? mcp3008() : '')
    + all.map(w => wire(w.pts, w.color)).join('')
    + (d.extras || []).join('')
    + '</g></svg>';

  const rows = list => list.filter(w => w.text).map(w => ({
    color: w.color,
    text: w.pi ? `Pin ${w.pi} (${PIN_NAMES[w.pi]}) → ${w.text}` : w.text,
  }));
  return { svg, wires: rows([...feeds, ...d.wires]), chipWires: rows(chip), notes: d.notes };
}

// The "Wiring" section at the bottom of a card (drawn the first time it opens).
function wiringPanel(def, title = 'Wiring') {
  if (!WIRING[def.id]) return null;
  const box = el('details', 'wiring');
  box.append(el('summary', null, title));
  box.addEventListener('toggle', () => {
    if (!box.open || box.children.length > 1) return;
    const w = drawWiring(def.id);
    const pic = el('div', 'wiring-svg');
    pic.innerHTML = w.svg;
    pic.title = 'Click to enlarge';
    pic.onclick = () => pic.classList.toggle('zoomed');
    box.append(pic, wireList(w.wires));
    if (w.chipWires.length) {
      box.append(el('p', 'wiring-head', 'MCP3008 chip, shared by all analog parts (wire it once, turn on SPI):'),
                 wireList(w.chipWires));
    }
    for (const n of w.notes) box.append(el('p', 'wiring-note', n));
  });
  return box;
}

function wireList(rows) {
  const ul = el('ul', 'wiring-list');
  for (const r of rows) {
    const li = el('li');
    const sw = el('span', 'swatch');
    sw.style.background = r.color;
    li.append(sw, el('span', null, r.text));
    ul.append(li);
  }
  return ul;
}

// The Outputs step's card: a Wiring section for each output.
function outputWiring() {
  const box = el('div');
  box.append(wiringPanel({ id: 'pixels' }, 'Wiring: NeoPixels'),
             wiringPanel({ id: 'buzzer' }, 'Wiring: buzzer'));
  return box;
}
