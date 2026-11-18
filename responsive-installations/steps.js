/* =================================================================
   steps.js — THE WORKSHOP STEPS
   -----------------------------------------------------------------
   Each step of the tutorial is its own p5.js sketch in steps/.
   Pick one from the menu in the panel, step with ‹ › or the arrow
   keys, or put ?step=3 at the end of the address.

   To add a step: write steps/stepN.js and add a line to STEPS.
   A step that wants the input cards calls buildControlPanel() in its
   setup() (steps 9, 10), and setupHardware() for real hardware (step 11).
   globals / functions: what the Code view shows when it can't read the file.
   hidden: true leaves a step out of the menu (its file stays); the
   steps after it move up a number. Delete the line to bring it back.
   An edit made in the Code view runs instead of the file (see codeview.js).

   Keys (every step):  ← → = step    C = code    P = hide panel    F = fullscreen
   ================================================================= */

const STEPS = [
  { file: 'steps/step1.js', title: 'A circle',
    about: 'The smallest p5.js sketch: a canvas and one circle.',
    functions: ['setup', 'draw'] },
  { file: 'steps/step2.js', title: 'Fill the window',
    about: 'The canvas fills the space and the circle stays centred, at any size.',
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step3.js', title: 'Colour and variables',
    about: 'RGBA colour, and the circle\'s properties as named variables.',
    globals: ['r', 'g', 'b', 'a', 'size'],
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step4.js', title: 'Movement',
    about: 'An animation clock and sin(): the circle breathes.',
    globals: ['pulseSpeed', 'pulseAmount'],
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step5.js', title: 'Orbit and trails',
    about: 'cos() and sin() send it round the centre; a see-through background leaves trails.',
    globals: ['orbitSpeed', 'orbitRadius', 'colourSpeed', 'trails'],
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step6.js', title: 'The mouse as an input',
    about: 'Move the mouse over the canvas. Any input → 0..1 → the range a property needs.',
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step7.js', title: 'The keyboard as an input',
    about: 'Press the space bar: a new random colour. A key press is an event: keyPressed() runs once per press.',
    globals: ['r', 'g', 'b', 'a', 'size'],
    functions: ['setup', 'draw', 'keyPressed', 'windowResized'] },
  { file: 'steps/step8.js', title: 'Smoothing',
    about: 'Glide towards the target instead of jumping. Hold the mouse button down.',
    globals: ['SMOOTHING'],
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step9.js', title: 'Simulated sensors',
    about: 'Three pretend sensors, each giving 0..1, just like the mouse. Button → size, proximity → left/right, light → brightness.',
    globals: ['SMOOTHING', 'r', 'g', 'b', 'a', 'size', 'x', 'bright'],
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step10.js', title: 'Any input → any property', hidden: true,
    about: 'All the properties in one table; the dropdowns choose what each input controls.',
    globals: ['PROPS', 'SMOOTHING'],
    functions: ['setup', 'draw', 'applyMappings', 'windowResized'] },
  { file: 'steps/step11.js', title: 'Real hardware',
    about: 'Each card simulates a sensor until the Raspberry Pi sends readings. Open "Wiring" to connect the real part.',
    globals: ['PROPS', 'SMOOTHING'],
    functions: ['setup', 'draw', 'applyMappings', 'windowResized'] },
].filter(s => !s.hidden);

const pageParams = new URLSearchParams(location.search);
const stepNumber = Math.min(Math.max(parseInt(pageParams.get('step')) || 1, 1), STEPS.length);
const STEP = STEPS[stepNumber - 1];

// An edit made in the Code view (codeview.js), saved in this browser. It runs instead of the file.
const EDIT_KEY = `edit:${STEP.file}`;
const EDITED_CODE = loadSetting(EDIT_KEY);   // null = no edit
const sketchSrc = EDITED_CODE == null ? STEP.file
  : URL.createObjectURL(new Blob([EDITED_CODE, `\n//# sourceURL=${STEP.file} (edited)`], { type: 'text/javascript' }));

// Show the sketch's errors in the panel, so a typo in an edit doesn't just leave a blank canvas.
window.addEventListener('error', e => {
  if (e.filename !== sketchSrc && !e.filename?.includes(STEP.file)) return;
  const box = document.getElementById('step-error');
  box.textContent = `${e.message} (line ${e.lineno})` + (EDITED_CODE != null ? ' — press C to fix it, or Reset.' : '');
  box.hidden = false;
});

// Load the step's sketch. p5 starts once the page has loaded, so it finds its setup() and draw().
document.write(`<script src="${sketchSrc}"><\/script>`);


function goToStep(n) {
  if (n === stepNumber || n < 1 || n > STEPS.length) return;
  pageParams.set('step', n);   // keeps ?ws=… if it's there
  location.search = pageParams;
}

function buildStepNav() {
  document.title = `Step ${stepNumber}: ${STEP.title}`;
  const about = document.getElementById('step-about');
  about.append(el('strong', null, `Step ${stepNumber} · ${STEP.title}`), el('br'), STEP.about);

  const menu = document.getElementById('step-menu');
  STEPS.forEach((s, i) => menu.append(new Option(`${i + 1} · ${s.title}`, i + 1)));
  menu.value = stepNumber;
  menu.onchange = () => goToStep(+menu.value);

  const prev = document.getElementById('step-prev');
  const next = document.getElementById('step-next');
  prev.disabled = stepNumber === 1;
  next.disabled = stepNumber === STEPS.length;
  prev.onclick = () => goToStep(stepNumber - 1);
  next.onclick = () => goToStep(stepNumber + 1);
}

document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;   // don't steal keys from the panel

  const k = e.key.toLowerCase();
  if (k === 'p') {
    document.body.classList.toggle('panel-hidden');
    if (typeof windowResized === 'function') windowResized();   // let the sketch refit its canvas
  }
  if (k === 'f') fullscreen(!fullscreen());
  if (k === 'c') toggleCode();
  if (k === 'arrowleft') goToStep(stepNumber - 1);
  if (k === 'arrowright') goToStep(stepNumber + 1);
});

buildStepNav();
setupCodeView();   // from codeview.js
