/* =================================================================
   steps.js — THE WORKSHOP STEPS
   -----------------------------------------------------------------
   Each step of the tutorial is its own p5.js sketch in steps/.
   Pick one from the menu in the panel, step with ‹ › or the arrow
   keys, or put ?step=3 at the end of the address.

   To add a step: write steps/stepN.js and add a line to STEPS.
   A step that wants the input cards calls buildControlPanel() in its
   setup() (steps 9-12), and setupHardware() for real hardware (steps 11, 12).
   globals / functions: what the Code view shows when it can't read the file.
   hidden: true leaves a step out of the menu (its file stays); the
   steps after it move up a number. Delete the line to bring it back.
   An edit made in the Code view runs instead of the file (see codeview.js).

   The workshop slides are in the same menu. Each slide is a page in
   slides/ (slides/cover.html, …), shown in place of the canvas.
   Slides keep their own numbers (Slide 1–34, as in the deck), so the
   step numbers don't change. Open one with ?slide=cover.
   ORDER says where each slide and step goes in the menu and for ‹ ›.

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
    about: 'Simulated sensors, now from the Raspberry Pi: each card turns LIVE when the real part sends readings. Open "Wiring" to connect it.',
    globals: ['SMOOTHING', 'r', 'g', 'b', 'a', 'size', 'x', 'bright'],
    functions: ['setup', 'draw', 'windowResized'] },
  { file: 'steps/step12.js', title: 'Outputs',
    about: 'The sketch talks back. Wire a buzzer and 3 NeoPixels (open "Wiring" on the Outputs card). Hold the Buzzer button on the screen to sound the buzzer; the card\'s buttons light the pixels.',
    globals: ['buzzing'],
    functions: ['setup', 'buildOutputButtons', 'lightsOn', 'lightsOff', 'buttonSize', 'overButton', 'pressCanvas', 'mouseReleased', 'draw', 'windowResized'] },
].filter(s => !s.hidden);

// The slides, in deck order: slides/<id>.html. Their number is their place in this list.
const SLIDES = [
  { id: 'cover', title: 'Make it move' },
  { id: 'agenda', title: 'The next three hours' },
  { id: 'why', title: 'Why a Raspberry Pi?' },
  { id: 'in-out', title: 'What’s in, what’s out' },
  { id: 'stack', title: 'How the pieces talk' },
  { id: 'kit', title: 'What’s on your table' },
  { id: 'setup', title: 'Part 1 · Set up the Pi' },
  { id: 'inputs-overview', title: 'Inputs' },
  { id: 'outputs-overview', title: 'Outputs' },
  { id: 'breadboard', title: 'How a breadboard connects' },
  { id: 'rails', title: 'Power and ground go to the rails' },
  { id: 'button', title: 'Part 2 · Wire a button' },
  { id: 'button-pin', title: 'Use a different pin' },
  { id: 'wire-proximity', title: 'Wire a proximity sensor' },
  { id: 'wire-light', title: 'Wire a light sensor' },
  { id: 'bridge', title: 'Part 3 · Bridge to the browser' },
  { id: 'sketch', title: 'Part 4 · p5.js listens' },
  { id: 'fullscreen', title: 'Going full screen' },
  { id: 'break', title: '10-minute break' },
  { id: 'inputs', title: 'From one bit to the whole room' },
  { id: 'proximity', title: 'Input 2 · Proximity' },
  { id: 'smoothing', title: 'Raw sensors are noisy' },
  { id: 'smoothing-code', title: 'Smoothing in code' },
  { id: 'inputs-more', title: 'More inputs to explore' },
  { id: 'outputs', title: 'Now the sketch talks back' },
  { id: 'led', title: 'Output 1 · NeoPixels' },
  { id: 'haptic', title: 'Output 2 · Buzzer' },
  { id: 'outputs-more', title: 'More outputs to explore' },
  { id: 'boards', title: 'Beyond the Pi: other boards' },
  { id: 'displays', title: 'The screen doesn’t have to be here' },
  { id: 'sprint', title: 'Build sprint' },
  { id: 'alternatives', title: 'Other ways to build it' },
  { id: 'install', title: 'Leaving it alone in public' },
  { id: 'resources', title: 'Keep going' },
];

// The order of the menu and of ‹ ›: slide ids and step files, mixed.
// Move a line to move it. Anything left out goes at the end; a hidden step stays out.
const ORDER = [
  'cover', 'agenda', 'why', 'in-out', 'stack', 'kit', 'inputs-overview', 'outputs-overview',
  'steps/step1.js', 'steps/step2.js', 'steps/step3.js', 'steps/step4.js', 'steps/step5.js',
  'steps/step6.js', 'steps/step7.js', 'steps/step8.js', 'steps/step9.js',
  'setup', 'breadboard', 'rails', 'button', 'button-pin', 'wire-proximity', 'wire-light', 'bridge', 'sketch',
  'steps/step11.js',
  'fullscreen', 'break', 'inputs', 'proximity', 'smoothing', 'smoothing-code', 'inputs-more',
  'outputs', 'led', 'haptic',
  'steps/step12.js',
  'outputs-more', 'boards', 'displays', 'sprint', 'alternatives', 'install', 'resources',
];

// Everything in the menu, in ORDER: { slide } or { step }, each with its label.
const MENU = [];
for (const name of ORDER) addToMenu(name);
SLIDES.forEach(s => addToMenu(s.id));      // any slide missing from ORDER
STEPS.forEach(s => addToMenu(s.file));     // any step missing from ORDER

function addToMenu(name) {
  if (MENU.some(m => m.name === name)) return;
  const slideIndex = SLIDES.findIndex(s => s.id === name);
  const stepIndex = STEPS.findIndex(s => s.file === name);
  if (slideIndex >= 0) MENU.push({ name, slide: SLIDES[slideIndex], label: `Slide ${slideIndex + 1}` });
  if (stepIndex >= 0) MENU.push({ name, step: STEPS[stepIndex], number: stepIndex + 1, label: `Step ${stepIndex + 1}` });
}

// Which one to show: ?slide=cover, ?step=3, or the first in the menu.
const pageParams = new URLSearchParams(location.search);
let here = MENU.findIndex(m => m.slide && m.slide.id === pageParams.get('slide'));
if (here < 0 && pageParams.has('step')) {
  const n = Math.min(Math.max(parseInt(pageParams.get('step')) || 1, 1), STEPS.length);
  here = MENU.findIndex(m => m.number === n);
}
if (here < 0) here = 0;
const HERE = MENU[here];
const SLIDE = HERE.slide || null;    // the slide being shown, or null
const STEP = HERE.step || null;      // the sketch step being shown, or null
const stepNumber = HERE.number || null;

// An edit made in the Code view (codeview.js), saved in this browser. It runs instead of the file.
const EDIT_KEY = STEP ? `edit:${STEP.file}` : null;
const EDITED_CODE = STEP ? loadSetting(EDIT_KEY) : null;   // null = no edit
const sketchSrc = !STEP ? null : EDITED_CODE == null ? STEP.file
  : URL.createObjectURL(new Blob([EDITED_CODE, `\n//# sourceURL=${STEP.file} (edited)`], { type: 'text/javascript' }));

// Show the sketch's errors in the panel, so a typo in an edit doesn't just leave a blank canvas.
window.addEventListener('error', e => {
  if (!STEP) return;
  if (e.filename !== sketchSrc && !e.filename?.includes(STEP.file)) return;
  const box = document.getElementById('step-error');
  box.textContent = `${e.message} (line ${e.lineno})` + (EDITED_CODE != null ? ' — press C to fix it, or Reset.' : '');
  box.hidden = false;
});

// Load the step's sketch. p5 starts once the page has loaded, so it finds its setup() and draw().
// A slide has no sketch: p5 doesn't start, and the slide's page fills the stage instead.
if (STEP) document.write(`<script src="${sketchSrc}"><\/script>`);
else showSlide();

function showSlide() {
  document.body.classList.add('on-slide');
  const frame = document.createElement('iframe');
  frame.className = 'slide-frame';
  frame.title = `${HERE.label}: ${SLIDE.title}`;
  frame.src = `slides/${SLIDE.id}.html`;
  document.getElementById('stage').append(frame);
}


function goTo(i) {
  if (i === here || i < 0 || i >= MENU.length) return;
  const m = MENU[i];
  pageParams.delete('step');
  pageParams.delete('slide');
  if (m.slide) pageParams.set('slide', m.slide.id);
  else pageParams.set('step', m.number);   // keeps ?ws=… if it's there
  location.search = pageParams;
}

function buildStepNav() {
  const title = SLIDE ? SLIDE.title : STEP.title;
  document.title = `${HERE.label}: ${title}`;
  const about = document.getElementById('step-about');
  about.append(el('strong', null, `${HERE.label} · ${title}`));
  if (STEP) about.append(el('br'), STEP.about);

  const menu = document.getElementById('step-menu');
  MENU.forEach((m, i) => menu.append(new Option(`${m.label} · ${m.slide ? m.slide.title : m.step.title}`, i)));
  menu.value = here;
  menu.onchange = () => goTo(+menu.value);

  const prev = document.getElementById('step-prev');
  const next = document.getElementById('step-next');
  prev.disabled = here === 0;
  next.disabled = here === MENU.length - 1;
  prev.onclick = () => goTo(here - 1);
  next.onclick = () => goTo(here + 1);
}

function handleKey(key) {
  const k = key.toLowerCase();
  if (k === 'p') {
    document.body.classList.toggle('panel-hidden');
    if (typeof windowResized === 'function') windowResized();   // let the sketch refit its canvas
  }
  if (k === 'f') {
    if (STEP) fullscreen(!fullscreen());
    else if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
  if (k === 'c' && STEP) toggleCode();
  if (k === 'arrowleft') goTo(here - 1);
  if (k === 'arrowright') goTo(here + 1);
}

document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;   // don't steal keys from the panel
  handleKey(e.key);
});

// Keys pressed while a slide has the focus (slides/slide.js passes them on).
window.addEventListener('message', e => {
  if (SLIDE && e.data && typeof e.data.slideKey === 'string') handleKey(e.data.slideKey);
});

buildStepNav();
if (STEP) setupCodeView();   // from codeview.js
