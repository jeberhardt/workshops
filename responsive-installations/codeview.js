/* =================================================================
   codeview.js — SHOW AND EDIT THE SKETCH'S CODE
   -----------------------------------------------------------------
   The "Code" button (or the C key) shows the current step's sketch
   over the canvas. Served over http it shows the file itself. Opened
   as a file (file://), the browser won't let the page read it, so it
   shows the code that is actually running instead: the step's
   settings and functions (STEPS in steps.js lists them).

   The code can be edited. "Run" (or Ctrl/⌘+Enter) saves the edit in
   this browser and reloads the step with it; steps.js runs the edit
   instead of the file. "Reset" throws the edit away. The files in
   steps/ are never changed.

   On steps with input cards, a second tab, "Sensors", shows how those
   cards work in simplified code (SENSOR_CODE in controls.js, read only).
   ================================================================= */

let codeBox = null;
let codeOriginal = null;   // the file (or running code), to tell an edit from no edit
let codeDirty = false;     // typed in the editor but not run yet
let codeTab = 'sketch';    // 'sketch' (the step, editable) or 'sensors' (controls.js, read only)
let sketchDraft = null;    // the sketch text while the Sensors tab is showing
let sketchSource = '';        // where the sketch text came from, for the bar

function setupCodeView() {
  const btn = document.getElementById('code-btn');
  if (!btn) return;
  btn.onclick = () => { toggleCode(); btn.blur(); };
  if (EDITED_CODE != null) btn.textContent = 'Code ✎';
}

function toggleCode() {
  if (!codeBox) codeBox = buildCodeBox();
  codeBox.hidden = !codeBox.hidden;
  if (!codeBox.hidden) {
    if (codeTab === 'sketch' && !codeDirty) loadCode();
    codeBox.querySelector('.code-input').focus();
  }
}

function buildCodeBox() {
  const box = el('div', 'code-view');
  box.hidden = true;

  const bar = el('div', 'code-bar');
  const run = el('button', 'btn small primary code-run', 'Run');
  run.title = 'Run the edited code (Ctrl/⌘+Enter)';
  run.onclick = runEdit;
  const reset = el('button', 'btn small code-reset', 'Reset');
  reset.title = 'Throw away the edit and go back to the file';
  reset.onclick = () => confirmThen(reset, 'Discard edit?', resetEdit);
  const close = el('button', 'btn small', 'Close');
  close.onclick = () => box.hidden = true;
  const tabs = el('div', 'code-tabs');
  const sketchTab = el('button', 'code-tab on', STEP.file);
  sketchTab.dataset.tab = 'sketch';
  tabs.append(sketchTab);
  if (Object.keys(inputs).length > 0) {   // this step has input cards (controls.js)
    const sensorsTab = el('button', 'code-tab', 'Sensors');
    sensorsTab.dataset.tab = 'sensors';
    sensorsTab.title = 'The code in controls.js behind the input cards on this step';
    tabs.append(sensorsTab);
  }
  tabs.onclick = e => { if (e.target.dataset.tab) showTab(e.target.dataset.tab); };
  bar.append(tabs, el('span', 'sub code-src'), reset, run, close);

  // A see-through textarea over a highlighted copy: you type in one and see the colours of the other.
  const edit = el('div', 'code-edit');
  const shown = el('pre', 'code-text');
  const input = el('textarea', 'code-input');
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-label', `Code of ${STEP.file}`);
  input.oninput = () => { codeDirty = true; showCode(input.value); };
  input.onscroll = () => { shown.scrollTop = input.scrollTop; shown.scrollLeft = input.scrollLeft; };
  input.onkeydown = e => {
    e.stopPropagation();   // typing here isn't input for the sketch (keyPressed() in step 7 on)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (codeTab === 'sketch') runEdit(); }
    else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '  '); }
    else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
  };
  edit.append(shown, input);

  box.append(bar, edit);
  document.getElementById('stage').append(box);
  return box;
}

// Re-read every time it opens, so edits to the file show up after a save.
async function loadCode() {
  let src;
  try {
    const res = await fetch(STEP.file, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    codeOriginal = await res.text();
    src = 'the file';
  } catch {
    codeOriginal = runningCode();
    src = 'running now (open the page over http to see the whole file)';
  }
  if (EDITED_CODE != null) src = 'your edit — saved in this browser';
  const code = EDITED_CODE ?? codeOriginal;
  sketchSource = src;
  codeBox.querySelector('.code-src').textContent = src;
  codeBox.querySelector('.code-reset').hidden = EDITED_CODE == null;
  codeBox.querySelector('.code-input').value = code;
  showCode(code);
}

function showTab(tab) {
  if (tab === codeTab) return;
  const input = codeBox.querySelector('.code-input');
  codeBox.querySelectorAll('.code-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  codeBox.querySelector('.code-run').hidden = tab !== 'sketch';
  input.readOnly = tab !== 'sketch';

  if (tab === 'sensors') {
    sketchDraft = input.value;   // keep any typing for when we come back
    codeBox.querySelector('.code-reset').hidden = true;
    codeBox.querySelector('.code-src').textContent = 'simplified — read only';
    input.value = sensorsCode();
  } else {
    codeBox.querySelector('.code-reset').hidden = EDITED_CODE == null;
    codeBox.querySelector('.code-src').textContent = sketchSource;
    input.value = sketchDraft;
  }
  codeTab = tab;
  input.scrollTop = input.scrollLeft = 0;
  showCode(input.value);
}

// How the cards on this step work, in simplified code (SENSOR_CODE in controls.js).
function sensorsCode() {
  const defs = INPUT_DEFS.filter(d => Object.values(inputs).some(inp => inp.def === d));
  const parts = [
    '// How the cards on this step work, simplified.\n'
    + '// Every card ends up as a number from 0 to 1 in inputs.<id>.value,\n'
    + '// and the sketch reads it in draw(), just like mouseX in step 6.\n'
    + '// (The real code, with the panel layout and touch screens, is in controls.js.)',
  ];
  for (const d of defs) {
    const line = '-'.repeat(Math.max(4, 60 - d.label.length));
    parts.push(`// ---- ${d.label} (${d.kind}) ${line}\n${SENSOR_CODE[d.type]}`);
  }
  return parts.join('\n\n') + '\n';
}

function showCode(code) {
  // A trailing newline needs something after it, or the copy is a line shorter than the textarea.
  codeBox.querySelector('.code-text').innerHTML = highlight(code.endsWith('\n') ? code + ' ' : code);
}

function runEdit() {
  if (codeTab !== 'sketch') return;
  const code = codeBox.querySelector('.code-input').value;
  if (code === codeOriginal) forgetSetting(EDIT_KEY);   // back to the file: nothing to keep
  else saveSetting(EDIT_KEY, code);
  location.reload();
}

function resetEdit() {
  forgetSetting(EDIT_KEY);
  location.reload();
}

// Click once to arm, again within 3 s to do it.
function confirmThen(btn, question, action) {
  if (btn.dataset.armed) return action();
  const label = btn.textContent;
  btn.dataset.armed = '1';
  btn.textContent = question;
  setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 3000);
}

function runningCode() {
  // Indirect eval reads the step's top-level consts and lets, which aren't on window.
  // The steps write constants in CAPITALS, so that tells const from let.
  const globals = (STEP.globals || []).map(name =>
    `${name === name.toUpperCase() ? 'const' : 'let'} ${name} = ${showValue((0, eval)(name))};`);
  const functions = (STEP.functions || []).filter(n => typeof window[n] === 'function').map(n => window[n].toString());
  return `// ${STEP.file} as it's running (comments outside the functions aren't kept).\n\n`
    + [...globals, ...functions].join('\n\n');
}

// Numbers as they are; objects one entry per line, like PROPS in steps 10 and 11.
function showValue(v) {
  if (typeof v !== 'object' || v === null) return JSON.stringify(v);
  const line = x => JSON.stringify(x).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ');
  return '{\n' + Object.entries(v).map(([k, x]) => `  ${k}: ${line(x)},`).join('\n') + '\n}';
}


// A small JavaScript highlighter: comments, strings, numbers, keywords, p5 calls.
const JS_KEYWORDS = /^(const|let|var|function|return|if|else|for|while|of|in|new|true|false|null|undefined|async|await|try|catch|throw|break|continue|typeof)$/;

function highlight(code) {
  const token = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
  let out = '', last = 0, m;
  while ((m = token.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    const text = escapeHtml(m[0]);
    if (m[1]) out += `<span class="c-com">${text}</span>`;
    else if (m[2]) out += `<span class="c-str">${text}</span>`;
    else if (m[3]) out += `<span class="c-num">${text}</span>`;
    else if (JS_KEYWORDS.test(m[0])) out += `<span class="c-key">${text}</span>`;
    else if (m[4]) out += `<span class="c-fn">${text}</span>`;
    else out += text;
    last = token.lastIndex;
  }
  return out + escapeHtml(code.slice(last));
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
