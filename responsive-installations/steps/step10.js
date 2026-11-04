/* =================================================================
   Step 10 — REAL HARDWARE
   -----------------------------------------------------------------
   Step 9 plus one line: setupHardware() connects to the Raspberry Pi
   over a WebSocket (hardware.js). Any input that receives readings
   turns LIVE; the rest keep simulating. Each card's "Wiring" shows
   how to connect the real part.
   ================================================================= */

// -----------------------------------------------------------------
// Every property an input can control.
//   min / max : the range an input sweeps through (input 0 → min, 1 → max)
//   value     : the resting value when no input is connected
// Add a property here and it shows up in every dropdown automatically.
// -----------------------------------------------------------------
const PROPS = {
  // --- the circle ---
  x:            { group: 'Circle',    label: 'Position X',        min: 0,    max: 1,    value: 0.5  }, // fraction of width
  y:            { group: 'Circle',    label: 'Position Y',        min: 0,    max: 1,    value: 0.5  }, // fraction of height
  size:         { group: 'Circle',    label: 'Size',              min: 0.03, max: 0.9,  value: 0.35 }, // fraction of the smaller side
  hue:          { group: 'Circle',    label: 'Hue',               min: 0,    max: 360,  value: 200  },
  saturation:   { group: 'Circle',    label: 'Saturation',        min: 0,    max: 100,  value: 80   },
  brightness:   { group: 'Circle',    label: 'Brightness',        min: 0,    max: 100,  value: 95   },
  opacity:      { group: 'Circle',    label: 'Opacity',           min: 0,    max: 100,  value: 100  },
  strokeWeight: { group: 'Circle',    label: 'Outline thickness', min: 0,    max: 30,   value: 0    },

  // --- the animation ---
  pulseSpeed:   { group: 'Animation', label: 'Pulse speed',       min: 0,    max: 4,    value: 0.5  }, // pulses per second
  pulseAmount:  { group: 'Animation', label: 'Pulse amount',      min: 0,    max: 0.6,  value: 0.1  }, // how much the size breathes
  orbitSpeed:   { group: 'Animation', label: 'Orbit speed',       min: -3,   max: 3,    value: 0.6  }, // radians per second
  orbitRadius:  { group: 'Animation', label: 'Orbit radius',      min: 0,    max: 0.4,  value: 0    }, // fraction of the smaller side
  hueDrift:     { group: 'Animation', label: 'Colour cycling',    min: 0,    max: 180,  value: 0    }, // degrees per second
  jitter:       { group: 'Animation', label: 'Jitter',            min: 0,    max: 40,   value: 0    }, // pixels of shake
  trails:       { group: 'Animation', label: 'Trails',            min: 0,    max: 0.9,  value: 0    }, // 0 = none, 0.9 = long (higher leaves ghosts)
};

// How quickly properties follow their inputs.
// 1 = instant (jumpy), 0.05 = slow and dreamy. Smooths noisy sensors and on/off jumps.
const SMOOTHING = 0.12;

const current = {};   // the live, smoothed value of every property

// Animation clocks. We accumulate them so changing a speed never makes the circle jump.
let pulsePhase = 0;
let orbitAngle = 0;
let hueOffset  = 0;


function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  colorMode(HSB, 360, 100, 100, 100);

  for (const key in PROPS) current[key] = PROPS[key].value;
  buildControlPanel(PROPS);   // from controls.js
  setupHardware();            // from hardware.js
}


function draw() {
  const dt = min(deltaTime / 1000, 0.1);   // seconds since last frame

  updateInputs(dt);   // 1. read the (simulated) hardware
  applyMappings();    // 2. inputs → properties
  const p = current;

  // 3. advance the animation
  pulsePhase += p.pulseSpeed * TWO_PI * dt;
  orbitAngle += p.orbitSpeed * dt;
  hueOffset  += p.hueDrift * dt;

  // 4. draw
  // A see-through background leaves trails of the previous frames.
  background(230, 30, 6, 100 * (1 - p.trails));

  const unit = min(width, height);
  const r = p.orbitRadius * unit;
  const x = p.x * width  + cos(orbitAngle) * r + random(-p.jitter, p.jitter);
  const y = p.y * height + sin(orbitAngle) * r + random(-p.jitter, p.jitter);
  const diameter = p.size * unit * (1 + p.pulseAmount * sin(pulsePhase));
  const hue = (p.hue + hueOffset) % 360;

  fill(hue, p.saturation, p.brightness, p.opacity);
  if (p.strokeWeight > 0.5) {
    stroke((hue + 180) % 360, p.saturation * 0.6, 100, p.opacity);  // complementary outline
    strokeWeight(p.strokeWeight);
  } else {
    noStroke();
  }
  circle(x, y, diameter);
}


// -----------------------------------------------------------------
// Inputs → properties.
// Each input gives 0..1. We stretch that to the property's min..max.
// Several inputs on the same property are averaged.
// -----------------------------------------------------------------
function applyMappings() {
  for (const key in PROPS) {
    const prop = PROPS[key];

    const values = [];
    for (const id in inputs) {
      const input = inputs[id];
      if (input.target === key) values.push(input.invert ? 1 - input.value : input.value);
    }

    let target = prop.value;   // nothing connected → resting value
    if (values.length > 0) {
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      target = lerp(prop.min, prop.max, average);
    }

    current[key] = lerp(current[key], target, SMOOTHING);
  }
}


function windowResized() {
  const stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
}
