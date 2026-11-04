/* =================================================================
   wiring.js — HOW TO WIRE EACH PART TO THE RASPBERRY PI
   -----------------------------------------------------------------
   Every card has a "Wiring" section with a breadboard diagram
   (Fritzing style), the list of wires and any gotchas.
   The pins are planned so ALL the parts can be wired at once:
   no two parts share a GPIO pin.

   The Pi has no analog inputs, so the analog parts (pots, LDR, mic,
   joystick) go through an MCP3008 chip (8 channels, 10-bit ADC) on
   the SPI pins. Turn SPI on first:
     sudo raspi-config → Interface Options → SPI
   Then gpiozero's MCP3008(channel=0).value gives 0..1 — send it as is.

   "Pin" = the physical pin on the header (1–40, pin 1 has a square pad).
   "GPIO" = the number your code uses (gpiozero, or RPi.GPIO in BCM mode).
   ================================================================= */

// Physical pin → what it is (the first 26 pins of the 40-pin header).
const PIN_NAMES = {
  1: '3.3V',  2: '5V',     3: 'GPIO2',  4: '5V',      5: 'GPIO3',  6: 'GND',
  7: 'GPIO4', 8: 'GPIO14', 9: 'GND',   10: 'GPIO15', 11: 'GPIO17', 12: 'GPIO18',
  13: 'GPIO27', 14: 'GND', 15: 'GPIO22', 16: 'GPIO23', 17: '3.3V', 18: 'GPIO24',
  19: 'GPIO10 MOSI', 20: 'GND', 21: 'GPIO9 MISO', 22: 'GPIO25',
  23: 'GPIO11 SCLK', 24: 'GPIO8 CE0', 25: 'GND', 26: 'GPIO7 CE1',
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
};

// The drawing is 300 units wide. The Pi header runs along the top,
// with the breadboard's power rails just under it.
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
      { pi: 18, pts: fromPi(18, [143, 120], 72), color: WIRE.green, text: 'TRIG' },
      { pts: [[157, 120], [157, 104], [193, 104]], color: WIRE.orange, text: 'ECHO → 1 kΩ resistor → junction' },
      { pi: 22, pts: fromPi(22, [193, 104]), color: WIRE.purple, text: 'the junction between the resistors' },
      { pts: [[193, 104], [250, 104], [250, GND_Y]], color: WIRE.gnd, text: 'Junction → 2 kΩ resistor → − rail' },
      { pts: [[171, 120], [171, 114], [262, 114], [262, GND_Y]], color: WIRE.gnd, text: 'GND → − rail' },
    ],
    extras: [resistor(157, 104, 193, 104, '1kΩ'), resistor(193, 104, 250, 104, '2kΩ'), junction(193, 104)],
    notes: [
      'The HC-SR04 needs 5 V, and its ECHO pin answers with 5 V: too much for a GPIO pin. The 1 kΩ + 2 kΩ divider brings it down to 3.3 V. Never wire ECHO straight to the Pi.',
      'No 2 kΩ? Use two 1 kΩ in a row, or 2.2 kΩ. gpiozero DistanceSensor(echo=25, trigger=24): send distance × 100 (cm).',
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
    parts: [part(119, 102, 64, 34, '#c62828', [['VCC', 133], ['SIG', 151], ['GND', 169]],
      svgCircle(151, 124, 8, '#e8a0a0', '#fff'))],
    wires: [
      { pts: up([133, 96], PLUS_Y), color: WIRE.power, text: 'VCC → + rail (3.3 V)' },
      { pi: 16, pts: fromPi(16, [151, 96]), color: WIRE.blue, text: 'SIG (also marked I/O or OUT)' },
      { pts: up([169, 96], GND_Y), color: WIRE.gnd, text: 'GND → − rail' },
    ],
    notes: [
      'A TTP223 touch module: SIG goes HIGH while touched. Power it from 3.3 V so its output is safe for the Pi.',
      'Pin order differs between boards: follow the labels printed on yours.',
    ],
  }),

  slider: () => potWiring(0, slidePot()),
  knob:   () => potWiring(1, rotaryPot()),

  light: () => ({
    plus: '3.3V', chip: true, height: 196,
    parts: [ldr(60, 76)],
    wires: [
      { pts: up([60, 150], PLUS_Y), color: WIRE.power, text: 'One LDR leg → + rail' },
      { pts: [[76, 150], [76, 136], [165, 136], [165, 128]], color: WIRE.yellow, text: 'Other LDR leg → MCP3008 CH2' },
      { pts: [[120, 136], [120, GND_Y]], color: WIRE.gnd, text: '10 kΩ resistor from that leg → − rail' },
    ],
    extras: [resistor(120, 136, 120, GND_Y, '10kΩ'), junction(120, 136)],
    notes: [
      'The LDR and the 10 kΩ resistor make a voltage divider: more light, higher reading.',
      'gpiozero MCP3008(channel=2).value',
    ],
  }),

  sound: () => ({
    plus: '3.3V', chip: true, height: 196,
    parts: [part(20, 156, 90, 30, '#1f3d7a', [['OUT', 50], ['GND', 64], ['VCC', 78]],
      svgCircle(94, 172, 9, '#222', '#999') + label(26, 181, 'MAX4466', '#fff'))],
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
        + label(228, 103, 'MCP3008', '#333', 7) + label(228, 112, 'ADC', '#777', 6);
  for (let i = 0; i < 8; i++) {
    const x = chX(i);
    s += leg(x, 82, 88) + leg(x, 122, 128)
       + `<text transform="translate(${x + 2} 90) rotate(-90)" text-anchor="end" font-size="5.5" fill="#ddd">${CHIP_TOP[i]}</text>`
       + `<text transform="translate(${x + 2} 120) rotate(-90)" font-size="5.5" fill="#ddd">CH${i}</text>`;
  }
  return s;
}


// -----------------------------------------------------------------
// Wire routing
// -----------------------------------------------------------------
// Pin n on the header. Odd pins are the inner row (lower), even the outer row.
const pinX = n => 46 + Math.floor((n - 1) / 2) * 14;
const pinY = n => n % 2 ? 22 : 12;

// A wire from Pi pin n down to `to` ([x, y], or just a y to drop straight down).
// With `lane` it drops to that height, runs across, then drops onto the target.
// Wires from the outer row step sideways first so they pass between the inner pins.
function fromPi(n, to, lane) {
  const pts = [[pinX(n), pinY(n)]];
  let x = pinX(n);
  if (n % 2 === 0) { x += 7; pts.push([x, pinY(n)]); }
  const [tx, ty] = Array.isArray(to) ? to : [x, to];
  if (lane == null) pts.push([x, ty]);
  else pts.push([x, lane], [tx, lane], [tx, ty]);
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

function label(x, y, text, fill, size = 6) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${text}</text>`;
}

// A component body with legs sticking up from its top edge.
// pins: [[name, x], …] — the wire attaches 6 units above the body.
function part(x, y, w, h, fill, pins, inner = '', ink = '#fff') {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="#0003"/>` + inner;
  for (const [name, px] of pins) {
    s += leg(px, y - 6, y + 1)
       + `<text x="${px}" y="${y + 8}" font-size="5" text-anchor="middle" fill="${ink}">${name}</text>`;
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
    + label(cx - 6, 189, 'LDR', '#333');
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
    ? `<text x="${cx}" y="${cy - 6}" font-size="6" text-anchor="middle" fill="#333">${value}</text>`
    : `<text x="${cx - 6}" y="${cy + 2}" font-size="6" text-anchor="end" fill="#333">${value}</text>`;
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

// The Pi's corner with pins 1–26; pins this diagram uses are bright.
function piHeader(used) {
  let s = `<rect x="28" y="0" width="268" height="34" rx="4" fill="#1d6b3a"/>`
        + `<rect x="39" y="5" width="183" height="24" rx="2" fill="#1a1a1a"/>`;
  for (let n = 1; n <= 26; n++) {
    s += `<rect x="${pinX(n) - 2.5}" y="${pinY(n) - 2.5}" width="5" height="5" rx="${n === 1 ? 0 : 1}" fill="${used.has(n) ? '#ffd166' : '#7d6d45'}"/>`;
  }
  return s
    + label(32, 24, '1', '#cfe8d6') + label(32, 14, '2', '#cfe8d6')
    + label(225, 24, '25', '#cfe8d6') + label(225, 14, '26', '#cfe8d6')
    + label(242, 17, 'Raspberry Pi', '#fff', 7) + label(242, 26, 'pins 1–26 of 40', '#cfe8d6', 5);
}

function rails(plus) {
  let s = `<line x1="34" y1="${GND_Y}" x2="296" y2="${GND_Y}" stroke="#3a6ee8" stroke-width="1"/>`
        + label(4, GND_Y + 2, 'GND', '#3a6ee8');
  if (plus) s += `<line x1="34" y1="${PLUS_Y}" x2="296" y2="${PLUS_Y}" stroke="#d7263d" stroke-width="1"/>`
               + label(4, PLUS_Y + 2, '+' + plus, '#d7263d');
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

  const W = 300, H = d.height;
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Breadboard wiring diagram" font-family="system-ui, sans-serif">`
    + `<defs><pattern id="holes-${id}" width="7" height="7" patternUnits="userSpaceOnUse">`
    + `<circle cx="3.5" cy="3.5" r=".9" fill="#0002"/></pattern></defs>`
    + `<rect width="${W}" height="${H}" rx="8" fill="#ece8dc"/>`
    + `<rect y="38" width="${W}" height="${H - 46}" fill="url(#holes-${id})"/>`
    + piHeader(used) + rails(d.plus)
    + d.parts.join('') + (d.chip ? mcp3008() : '')
    + all.map(w => wire(w.pts, w.color)).join('')
    + (d.extras || []).join('')
    + '</svg>';

  const rows = list => list.filter(w => w.text).map(w => ({
    color: w.color,
    text: w.pi ? `Pin ${w.pi} (${PIN_NAMES[w.pi]}) → ${w.text}` : w.text,
  }));
  return { svg, wires: rows([...feeds, ...d.wires]), chipWires: rows(chip), notes: d.notes };
}

// The "Wiring" section at the bottom of a card (drawn the first time it opens).
function wiringPanel(def) {
  if (!WIRING[def.id]) return null;
  const box = el('details', 'wiring');
  box.append(el('summary', null, 'Wiring'));
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
