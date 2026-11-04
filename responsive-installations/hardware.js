/* =================================================================
   hardware.js — REAL HARDWARE over WebSocket
   -----------------------------------------------------------------
   Connects to a WebSocket server (e.g. a Python script on the
   Raspberry Pi reading GPIO). As soon as an input receives a reading
   its card switches from SIMULATED to LIVE. Inputs that never
   receive anything keep simulating, so you can mix real and fake.
   Untick "listen" on a card to ignore the hardware for that input.

   Messages the sketch understands (JSON):
     {"id": "slider", "value": 0.42}             one input
     {"slider": 0.42, "button": 1}               several at once
     [{"id": "knob", "value": 0.1}, ...]         a list of either
   Plain text works too, one reading per line:
     slider:0.42
     button HIGH

   Input ids: button, switch, slider, knob, proximity, light,
              pir, touch, sound, joystickX, joystickY

   Values are read in the input's hardware range (HW_RANGES below),
   0..1 by default. Digital inputs: above the middle = HIGH.
   HIGH / LOW, on / off, true / false are understood too.

   Tip: open the page with ?ws=ws://raspberrypi.local:8765
   to connect automatically (handy for an unattended installation).
   ================================================================= */

// The range your hardware sends for each input (default 0..1).
// The sketch turns it into 0..1 for you. min can be bigger than max:
// the ultrasonic sensor sends cm, and closer should mean a higher value.
const HW_RANGES = {
  proximity: { min: 200, max: 2 },      // cm: 200 cm → 0, 2 cm → 1
  // slider: { min: 0, max: 1023 },     // e.g. a 10-bit ADC reading
};

const WS_PORT = 8765;
const RECONNECT_MS = 2000;

let socket = null;
let wantConnected = false;
let reconnectTimer = null;
let messageCount = 0;
let rateTimer = null;
const unknownIds = new Set();


// Called once from setup().
function setupHardware() {
  document.getElementById('hw-ui').hidden = false;   // the connection controls in the panel
  document.body.classList.add('hardware');           // shows "listen" and "Wiring" on the cards
  const urlBox = document.getElementById('ws-url');
  const btn = document.getElementById('ws-btn');
  const params = new URLSearchParams(location.search);

  urlBox.value = params.get('ws') || loadSetting('wsUrl') || defaultUrl();
  btn.onclick = () => {
    if (wantConnected) disconnectHardware();
    else connectHardware(urlBox.value.trim());
    btn.blur();
  };
  urlBox.onkeydown = e => { if (e.key === 'Enter') btn.click(); };

  if (params.get('ws')) connectHardware(urlBox.value.trim());
}

// If the page itself comes from the Pi over http, assume the socket is there too.
function defaultUrl() {
  const host = location.protocol === 'http:' && location.hostname ? location.hostname : 'localhost';
  return `ws://${host}:${WS_PORT}`;
}


function connectHardware(url) {
  wantConnected = true;
  saveSetting('wsUrl', url);
  clearTimeout(reconnectTimer);
  if (socket) { socket.onclose = null; socket.close(); }

  setStatus('connecting', `Connecting to ${url}…`);
  try {
    socket = new WebSocket(url);
  } catch (err) {
    // Usually: a ws:// address from an https:// page (e.g. the p5 Web Editor).
    wantConnected = false;
    setStatus('error', location.protocol === 'https:' && url.startsWith('ws:')
      ? 'Blocked: this page is https, so the browser refuses ws:// to another computer. Open the sketch over http (or use wss://).'
      : `Can't connect: ${err.message}`);
    return;
  }

  socket.onopen = () => {
    unknownIds.clear();
    setStatus('live', `Connected to ${url}`);
    startRateCounter(url);
  };
  socket.onmessage = e => { messageCount++; handleHardwareMessage(e.data); };
  socket.onclose = () => {
    stopRateCounter();
    releaseLiveInputs();
    if (wantConnected) {
      setStatus('error', `No connection to ${url} — retrying…`);
      reconnectTimer = setTimeout(() => connectHardware(url), RECONNECT_MS);
    } else {
      setStatus('off', 'Simulated — not connected');
    }
  };
}

function disconnectHardware() {
  wantConnected = false;
  clearTimeout(reconnectTimer);
  if (socket) socket.close();
  else setStatus('off', 'Simulated — not connected');
}

// Send something back to the server (for outputs later: LEDs, motors…).
function sendToHardware(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(typeof data === 'string' ? data : JSON.stringify(data));
  }
}


// -----------------------------------------------------------------
// Reading messages
// -----------------------------------------------------------------
function handleHardwareMessage(data) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    // plain text: "slider:0.42" or "button HIGH", one per line
    msg = String(data).split(/\r?\n/).filter(s => s.trim()).map(line => {
      const [id, value] = line.trim().split(/\s*[:=,]\s*|\s+/);
      return { id, value };
    });
  }

  const list = Array.isArray(msg) ? msg : [msg];
  for (const m of list) {
    if (!m || typeof m !== 'object') continue;
    if ('id' in m) receiveReading(m.id, m.value);
    else for (const [id, value] of Object.entries(m)) receiveReading(id, value);
  }
}

function receiveReading(id, value) {
  const inp = inputs[id];
  if (!inp) {
    if (!unknownIds.has(id)) {
      unknownIds.add(id);
      console.warn(`[hardware] unknown input "${id}". Known: ${Object.keys(inputs).join(', ')}`);
    }
    return;
  }

  if (!inp.listen) return;   // "listen" unticked on its card

  const n = toNumber(value);
  if (n === null) return;

  const r = HW_RANGES[id] || { min: 0, max: 1 };
  let v = (n - r.min) / (r.max - r.min);
  if (inp.def.kind === 'digital') v = v > 0.5 ? 1 : 0;

  inp.value = clamp01(v);
  inp.hwRaw = value;
  if (!inp.live) setLive(inp, true);
}

function toNumber(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    if (/^(high|on|true)$/i.test(value.trim())) return 1;
    if (/^(low|off|false)$/i.test(value.trim())) return 0;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}


// -----------------------------------------------------------------
// LIVE / SIMULATED state on the panel
// -----------------------------------------------------------------
function setLive(inp, on) {
  inp.live = on;
  const card = inp.ui.card;
  const anyLive = Object.values(inputs).some(i => i.ui.card === card && i.live);
  card.classList.toggle('live', anyLive);
  inp.ui.type.textContent = anyLive ? 'live' : inp.def.kind;
}

function releaseLiveInputs() {
  for (const inp of Object.values(inputs)) if (inp.live) setLive(inp, false);
}

function setStatus(state, text) {
  document.getElementById('ws-dot').className = 'led ' + state;
  document.getElementById('ws-status').textContent = text;
  document.getElementById('ws-btn').textContent = wantConnected ? 'Disconnect' : 'Connect';
}

function startRateCounter(url) {
  stopRateCounter();
  messageCount = 0;
  rateTimer = setInterval(() => {
    const live = Object.values(inputs).filter(i => i.live).length;
    setStatus('live', `Connected to ${url} · ${messageCount} msg/s · ${live} live input${live === 1 ? '' : 's'}`);
    messageCount = 0;
  }, 1000);
}

function stopRateCounter() { clearInterval(rateTimer); rateTimer = null; }


// Remember the address between visits (browser storage may be unavailable).
function loadSetting(key) { try { return localStorage.getItem(key); } catch { return null; } }
function saveSetting(key, value) { try { localStorage.setItem(key, value); } catch {} }
