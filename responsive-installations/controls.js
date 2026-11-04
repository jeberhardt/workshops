/* =================================================================
   controls.js — SIMULATED HARDWARE
   -----------------------------------------------------------------
   Each card in the panel pretends to be a real component.
   Every input ends up as one entry in `inputs`:

     inputs.slider.value    normalized 0..1 (what the sketch uses)
     inputs.slider.raw      what the real part would report (0–1023, cm, HIGH/LOW)
     inputs.slider.target   the circle property it drives ('none' = nothing)
     inputs.slider.invert   flip the value (1 - value)

   REAL hardware arrives through hardware.js (WebSocket). Any input
   that receives readings switches to LIVE and stops simulating.
   Untick "listen" on a card to keep it simulated (inputs.slider.listen).
   You can also set one by hand: setInput('slider', 0.42);
   ================================================================= */

// -----------------------------------------------------------------
// The inputs on the panel. Add your own here.
//   type     : which widget to draw (see WIDGETS below)
//   kind     : 'digital' (on/off) or 'analog' (a range)
//   target   : the property it starts connected to (a key of PROPS in steps/step10.js)
//   start    : starting value 0..1
//   channels : for inputs that give more than one value (a joystick gives X and Y)
// -----------------------------------------------------------------
const INPUT_DEFS = [
  { id: 'button',    label: 'Push button',            type: 'button',    kind: 'digital', target: 'pulseAmount' },
  { id: 'switch',    label: 'Toggle switch',          type: 'toggle',    kind: 'digital', target: 'trails' },
  { id: 'slider',    label: 'Slide potentiometer',    type: 'slider',    kind: 'analog',  target: 'hue',        start: 0.55 },
  { id: 'knob',      label: 'Rotary potentiometer',   type: 'knob',      kind: 'analog',  target: 'pulseSpeed', start: 0.25 },
  { id: 'proximity', label: 'Proximity (ultrasonic)', type: 'proximity', kind: 'analog',  target: 'orbitRadius' },
  { id: 'light',     label: 'Light sensor (LDR)',     type: 'light',     kind: 'analog',  target: 'brightness' },
  { id: 'pir',       label: 'Motion sensor (PIR)',    type: 'pir',       kind: 'digital', target: 'hueDrift' },
  { id: 'touch',     label: 'Capacitive touch pad',   type: 'touch',     kind: 'digital', target: 'strokeWeight' },
  { id: 'sound',     label: 'Sound sensor (mic)',     type: 'sound',     kind: 'analog',  target: 'jitter' },
  { id: 'joystick',  label: 'Joystick',               type: 'joystick',  kind: 'analog',  channels: [
      { suffix: 'X', target: 'x', start: 0.5 },
      { suffix: 'Y', target: 'y', start: 0.5 },
  ] },
];

// -----------------------------------------------------------------
// A photo of the real component, from Wikimedia Commons (openly licensed).
// Value = the Commons file name. Tap the photo on the panel to see its credit.
// To use your own photo instead, put a path or URL here (e.g. 'images/button.jpg').
// -----------------------------------------------------------------
const PHOTOS = {
  button:    'Tactile_switches.jpg',
  switch:    'Toggle_Switch_-_3PDT.jpg',
  slider:    'Siemens_RC_826_-_Fader_potentiometer-1727.jpg',
  knob:      '10k_Ohm_Breadboard_Compatible_Potentiometer.jpg',
  proximity: 'HC_SR04_Ultrasonic_Module.jpg',
  light:     'LDR07_Light-dependent_CdS_photoresistor.jpg',
  pir:       'Pyrosensor.jpg',
  touch:     'Capacitive_touchscreen.jpg',
  sound:     'Electret_condenser_microphone_capsules.jpg',
  joystick:  'SparkFun_breakout-board-for-thumb-joystick_16096160437_o.jpg',
};

const inputs = {};
let sensorNoise = true;   // the "Realistic sensor noise" checkbox


// Set an input from anywhere (e.g. real hardware). value is 0..1.
function setInput(id, value) {
  if (inputs[id]) inputs[id].value = clamp01(value);
}


// -----------------------------------------------------------------
// Called every frame from draw(). Runs the sensor simulations
// (noise, timers, decay) and refreshes the meters on the panel.
// -----------------------------------------------------------------
function updateInputs(dt) {
  const now = performance.now();
  const noise = sensorNoise ? 1 : 0;

  for (const inp of Object.values(inputs)) {
    const s = inp.sim;
    let raw = null;

    // Live inputs get their value from hardware.js — just show the reading.
    if (inp.live) {
      if (inp.def.kind === 'digital') raw = inp.value > 0.5 ? 'HIGH' : 'LOW';
      else raw = typeof inp.hwRaw === 'number' ? String(+inp.hwRaw.toFixed(3)) : String(inp.hwRaw);
    } else switch (inp.def.type) {
      case 'proximity': {
        // HC-SR04 style: distance in cm, a little wobbly, and the odd missed echo
        let cm = s.cm + noise * randn() * 2;
        if (noise && Math.random() < 0.005) cm = 200;
        cm = Math.min(200, Math.max(2, cm));
        inp.value = 1 - (cm - 2) / 198;   // closer → higher value
        raw = cm.toFixed(0) + ' cm';
        break;
      }
      case 'light': {
        const level = s.covered ? 0.04 : s.level;
        inp.value = clamp01(level + noise * randn() * 0.015);
        break;
      }
      case 'pir':
        // a PIR stays HIGH for a while after it sees motion
        inp.value = now < s.until ? 1 : 0;
        if (inp.value) raw = 'HIGH ' + ((s.until - now) / 1000).toFixed(1) + 's';
        break;
      case 'sound':
        s.peak *= Math.pow(0.03, dt);   // a clap fades out over about a second
        inp.value = clamp01(Math.max(s.peak, s.floor + noise * Math.abs(randn()) * 0.05));
        break;
    }

    if (raw === null) {
      raw = inp.def.kind === 'digital'
        ? (inp.value > 0.5 ? 'HIGH' : 'LOW')
        : String(Math.round(inp.value * 1023));   // like Arduino analogRead()
    }
    inp.raw = raw;
    inp.ui.fill.style.width = (inp.value * 100).toFixed(1) + '%';
    inp.ui.raw.textContent = raw;
  }
}


// -----------------------------------------------------------------
// The widgets. Each one receives its container and its input(s).
// -----------------------------------------------------------------
const WIDGETS = {

  button(w, [inp]) {
    const b = el('button', 'btn', 'Press & hold');
    holdable(b, () => inp.value = 1, () => inp.value = 0);
    w.append(b);
  },

  toggle(w, [inp]) {
    const lab = el('label', 'switch');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const txt = el('span', 'sub', 'OFF');
    cb.onchange = () => {
      inp.value = cb.checked ? 1 : 0;
      txt.textContent = cb.checked ? 'ON' : 'OFF';
      cb.blur();
    };
    lab.append(cb, el('span', 'track'), txt);
    w.append(lab);
  },

  slider(w, [inp]) {
    const r = makeRange(0, 1023, Math.round(inp.value * 1023));
    r.oninput = () => inp.value = r.value / 1023;
    w.append(r);
  },

  knob(w, [inp]) {
    const k = el('div', 'knob');
    const show = () => k.style.transform = `rotate(${-135 + inp.value * 270}deg)`;
    let startY = null, startV = 0;
    k.addEventListener('pointerdown', e => {
      startY = e.clientY; startV = inp.value;
      k.setPointerCapture(e.pointerId);
    });
    k.addEventListener('pointermove', e => {
      if (startY === null) return;
      inp.value = clamp01(startV + (startY - e.clientY) / 150);
      show();
    });
    const end = () => startY = null;
    k.addEventListener('pointerup', end);
    k.addEventListener('pointercancel', end);
    k.addEventListener('wheel', e => {
      e.preventDefault();
      inp.value = clamp01(inp.value - e.deltaY / 1000);
      show();
    }, { passive: false });
    show();
    w.append(k, el('div', 'sub center', 'Drag up / down'));
  },

  proximity(w, [inp]) {
    inp.sim.cm = 150;
    const lab = el('div', 'sub', 'Hand distance: 150 cm');
    const r = makeRange(2, 200, 150);
    r.oninput = () => {
      inp.sim.cm = +r.value;
      lab.textContent = `Hand distance: ${r.value} cm`;
    };
    w.append(lab, r);
  },

  light(w, [inp]) {
    inp.sim.level = 0.7;
    inp.sim.covered = false;
    const r = makeRange(0, 100, 70);
    r.oninput = () => inp.sim.level = r.value / 100;
    const b = el('button', 'btn small', 'Cover with hand');
    holdable(b, () => inp.sim.covered = true, () => inp.sim.covered = false);
    w.append(el('div', 'sub', 'Ambient light'), r, b);
  },

  pir(w, [inp]) {
    inp.sim.until = 0;
    const b = el('button', 'btn', 'Walk past');
    b.onclick = () => inp.sim.until = performance.now() + 3000;
    w.append(b, el('div', 'sub', 'Stays HIGH for 3 s after motion, like a real PIR.'));
  },

  touch(w, [inp]) {
    const pad = el('div', 'pad', 'Touch here');
    holdable(pad, () => inp.value = 1, () => inp.value = 0);
    w.append(pad);
  },

  sound(w, [inp]) {
    inp.sim.peak = 0;
    inp.sim.floor = 0.03;
    const b = el('button', 'btn', 'Clap!');
    b.addEventListener('pointerdown', () => inp.sim.peak = 1);
    const r = makeRange(0, 100, 3);
    r.oninput = () => inp.sim.floor = r.value / 100;
    w.append(b, el('div', 'sub', 'Background noise'), r);
  },

  joystick(w, [ix, iy]) {
    const base = el('div', 'joy');
    const dot = el('div', 'joy-dot');
    base.append(dot);
    const place = () => {
      dot.style.left = ix.value * 100 + '%';
      dot.style.top  = iy.value * 100 + '%';
    };
    const move = e => {
      const r = base.getBoundingClientRect();
      let dx = (e.clientX - r.left) / r.width  * 2 - 1;
      let dy = (e.clientY - r.top)  / r.height * 2 - 1;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      ix.value = (dx + 1) / 2;
      iy.value = (dy + 1) / 2;
      place();
    };
    let dragging = false;
    base.addEventListener('pointerdown', e => {
      dragging = true;
      base.setPointerCapture(e.pointerId);
      move(e);
    });
    base.addEventListener('pointermove', e => { if (dragging) move(e); });
    const release = () => {          // springs back to the centre
      dragging = false;
      ix.value = iy.value = 0.5;
      place();
    };
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);
    place();
    w.append(base);
  },
};


// -----------------------------------------------------------------
// Building the panel (called once from setup()).
//   props : the PROPS table for the "→ property" dropdowns (null = no dropdowns)
//   only  : a list of input ids to show (leave out for all of them)
// -----------------------------------------------------------------
function buildControlPanel(props, only) {
  const root = document.getElementById('inputs');
  const noiseBox = document.getElementById('noise');
  if (noiseBox) noiseBox.onchange = () => { sensorNoise = noiseBox.checked; noiseBox.blur(); };

  for (const def of INPUT_DEFS) {
    if (only && !only.includes(def.id)) continue;
    const channelDefs = def.channels || [{ suffix: '', target: def.target, start: def.start }];
    const channels = channelDefs.map(ch => {
      const inp = {
        id: def.id + ch.suffix, def, label: ch.suffix,
        value: ch.start ?? 0, raw: '',
        target: ch.target || 'none', invert: false,
        listen: loadSetting('listen.' + def.id) !== 'off',
        sim: {}, ui: {},
      };
      inputs[inp.id] = inp;
      return inp;
    });

    const card = el('div', 'card');
    const head = el('div', 'card-head');
    const photo = photoFor(def);
    if (photo) head.append(photo);
    const titles = el('div', 'card-titles');
    const typeLabel = el('span', 'card-type', def.kind);
    titles.append(el('span', 'card-title', def.label), typeLabel);
    head.append(titles, listenToggle(def, channels));
    for (const inp of channels) Object.assign(inp.ui, { card, type: typeLabel });
    const widget = el('div', 'widget');
    WIDGETS[def.type](widget, channels);
    card.append(head, widget);

    for (const inp of channels) card.append(channelRow(inp, props));
    const wiring = wiringPanel(def);   // from wiring.js
    if (wiring) card.append(wiring);
    root.append(card);
  }
}

// "listen" checkbox: take readings from the hardware for this card, or keep simulating.
function listenToggle(def, channels) {
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = channels[0].listen;
  cb.onchange = () => {
    for (const inp of channels) {
      inp.listen = cb.checked;
      if (!cb.checked && inp.live) setLive(inp, false);   // back to the simulator
    }
    saveSetting('listen.' + def.id, cb.checked ? 'on' : 'off');
    cb.blur();
  };
  const lab = el('label', 'listen');
  lab.title = 'Use readings from the hardware for this input';
  lab.append(cb, ' listen');
  return lab;
}

// A meter + "→ property" dropdown + invert checkbox for one input (just the meter without props).
function channelRow(inp, props) {
  const row = el('div', 'channel');

  const readout = el('div', 'readout');
  if (inp.label) readout.append(el('span', 'chan', inp.label));
  const meter = el('div', 'meter');
  const fill = el('div');
  meter.append(fill);
  const raw = el('span', 'raw');
  readout.append(meter, raw);
  Object.assign(inp.ui, { fill, raw });
  row.append(readout);
  if (!props) return row;

  const sel = document.createElement('select');
  sel.append(new Option('— not connected —', 'none'));
  const groups = {};
  for (const [key, p] of Object.entries(props)) {
    if (!groups[p.group]) {
      groups[p.group] = document.createElement('optgroup');
      groups[p.group].label = p.group;
      sel.append(groups[p.group]);
    }
    groups[p.group].append(new Option(p.label, key));
  }
  sel.value = inp.target;
  sel.onchange = () => { inp.target = sel.value; sel.blur(); };

  const inv = document.createElement('input');
  inv.type = 'checkbox';
  inv.onchange = () => { inp.invert = inv.checked; inv.blur(); };
  const invLabel = el('label');
  invLabel.append(inv, ' invert');

  const mapping = el('div', 'mapping');
  mapping.append(el('span', 'arrow', '→'), sel, invLabel);

  row.append(mapping);
  return row;
}


// Thumbnail of the real part. Commons names load a small version and link
// to the file page (licence + author). If it can't load (offline), it hides.
function photoFor(def) {
  const name = PHOTOS[def.id];
  if (!name) return null;
  const isCommons = !/[\/:]/.test(name);
  const src  = isCommons ? 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=160' : name;
  const page = isCommons ? 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(name) : name;

  const link = el('a', 'photo');
  link.href = page;
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = isCommons ? 'Photo: Wikimedia Commons (tap for credit)' : def.label;
  const img = document.createElement('img');
  img.src = src;
  img.alt = def.label;
  img.loading = 'lazy';
  img.onerror = () => link.remove();
  link.append(img);
  return link;
}


// -----------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function makeRange(min, max, value) {
  const r = document.createElement('input');
  r.type = 'range';
  r.min = min; r.max = max; r.value = value;
  return r;
}

// Press-and-hold for buttons and pads (mouse and touch).
function holdable(elem, onDown, onUp) {
  elem.addEventListener('pointerdown', e => {
    e.preventDefault();
    elem.setPointerCapture(e.pointerId);
    elem.classList.add('active');
    onDown();
  });
  const up = () => { elem.classList.remove('active'); onUp(); };
  elem.addEventListener('pointerup', up);
  elem.addEventListener('pointercancel', up);
}

function clamp01(v) { return Math.min(1, Math.max(0, v)); }

// Bell-shaped random number, roughly -1..1 (more realistic than flat noise)
function randn() { return (Math.random() + Math.random() + Math.random()) / 1.5 - 1; }
