/* =================================================================
   codeview.js — SHOW THE SKETCH'S CODE
   -----------------------------------------------------------------
   The "Code" button (or the C key) shows the current step's sketch
   over the canvas. Served over http it shows the file itself. Opened
   as a file (file://), the browser won't let the page read it, so it
   shows the code that is actually running instead: the step's
   settings and functions (STEPS in steps.js lists them).
   ================================================================= */

let codeBox = null;

function setupCodeView() {
  const btn = document.getElementById('code-btn');
  if (btn) btn.onclick = () => { toggleCode(); btn.blur(); };
}

function toggleCode() {
  if (!codeBox) codeBox = buildCodeBox();
  codeBox.hidden = !codeBox.hidden;
  if (!codeBox.hidden) loadCode();
}

function buildCodeBox() {
  const box = el('div', 'code-view');
  box.hidden = true;
  const bar = el('div', 'code-bar');
  const close = el('button', 'btn small', 'Close');
  close.onclick = () => box.hidden = true;
  bar.append(el('span', 'code-name', STEP.file), el('span', 'sub code-src'), close);
  box.append(bar, el('pre', 'code-text'));
  document.getElementById('stage').append(box);
  return box;
}

// Re-read every time it opens, so edits show up after a save.
async function loadCode() {
  let code, src;
  try {
    const res = await fetch(STEP.file, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    code = await res.text();
    src = 'the file';
  } catch {
    code = runningCode();
    src = 'running now (open the page over http to see the whole file)';
  }
  codeBox.querySelector('.code-src').textContent = src;
  codeBox.querySelector('.code-text').innerHTML = highlight(code);
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

// Numbers as they are; objects one entry per line, like PROPS in step 2.
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
