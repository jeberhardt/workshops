#!/usr/bin/env python3
"""Workshop control panel.

Runs on the Pi and serves a web page (port 8080) where participants can start,
stop and restart the two workshop servers individually and watch their output:

    WebSocket bridge    pi_bridge.py            port 8765
    HTTP sketch server  python -m http.server   port 8000

Open http://<pi-ip>:8080 from any laptop on the same network.
Uses only the Python standard library. Put this file next to pi_bridge.py.
"""

import json
import os
import signal
import subprocess
import sys
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# ---- Settings: edit these if your layout differs ---------------------------
HERE = Path(__file__).resolve().parent
PANEL_PORT = 8080
AUTOSTART = True          # start both servers when the panel starts (e.g. at boot)
LOG_LINES = 1000          # lines of output kept per server

def _is_pi5():
    try:
        return "Raspberry Pi 5" in Path("/proc/device-tree/model").read_text()
    except OSError:
        return False

# On a Pi 3/4 the NeoPixel library needs root, so the bridge runs with sudo
# (Raspberry Pi OS lets its first user sudo without a password). A Pi 5 doesn't need it.
BRIDGE_SUDO = [] if os.geteuid() == 0 or _is_pi5() else ["sudo", "-E"]

SERVERS = {
    "bridge": {
        "label": "WebSocket bridge",
        "port": 8765,
        "cwd": HERE,
        "cmd": BRIDGE_SUDO + [sys.executable, "-u", "pi_bridge.py"],
    },
    "http": {
        "label": "HTTP sketch server",
        "port": 8000,
        "cwd": HERE,              # serves index.html from this project folder
        "cmd": [sys.executable, "-u", "-m", "http.server", "8000"],
    },
}
# -----------------------------------------------------------------------------


class Managed:
    """One server process, plus a rolling buffer of its output."""

    def __init__(self, name, cfg):
        self.name = name
        self.cfg = cfg
        self.proc = None
        self.exit_code = None
        self.user_stop = False
        self.lines = deque(maxlen=LOG_LINES)
        self.seq = 0
        self.log_lock = threading.Lock()
        self.op_lock = threading.Lock()

    def log(self, text):
        with self.log_lock:
            self.seq += 1
            self.lines.append((self.seq, time.strftime("%H:%M:%S"), text))

    def running(self):
        return self.proc is not None and self.proc.poll() is None

    def start(self):
        with self.op_lock:
            if self.running():
                return "already running"
            cwd = Path(self.cfg["cwd"])
            if not cwd.is_dir():
                self.log(f"!! Folder not found: {cwd}")
                return "error"
            self.log("--- Starting: " + " ".join(str(c) for c in self.cfg["cmd"]))
            try:
                self.proc = subprocess.Popen(
                    self.cfg["cmd"],
                    cwd=cwd,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,   # errors show in the same window
                    text=True,
                    bufsize=1,
                    errors="replace",
                    start_new_session=True,     # own process group, so stop() gets children too
                    env={**os.environ, "PYTHONUNBUFFERED": "1"},
                )
            except OSError as e:
                self.proc = None
                self.log(f"!! Could not start: {e}")
                return "error"
            self.exit_code = None
            self.user_stop = False
            threading.Thread(target=self._pump, args=(self.proc,), daemon=True).start()
            return "started"

    def _pump(self, proc):
        for line in proc.stdout:
            self.log(line.rstrip("\n"))
        code = proc.wait()
        self.exit_code = code
        self.log(f"--- Stopped (exit code {code})")

    def stop(self):
        with self.op_lock:
            if not self.running():
                return "not running"
            p = self.proc
            self.user_stop = True
            self.log("--- Stopping (sending Ctrl+C)")
            # Ctrl+C first so pi_bridge.py can tidy up GPIO, then escalate.
            for sig, wait in ((signal.SIGINT, 3), (signal.SIGTERM, 2), (signal.SIGKILL, 2)):
                try:
                    os.killpg(p.pid, sig)
                except ProcessLookupError:
                    break
                try:
                    p.wait(wait)
                    break
                except subprocess.TimeoutExpired:
                    continue
            return "stopped"

    def restart(self):
        self.stop()
        return self.start()

    def status(self):
        return {
            "label": self.cfg["label"],
            "port": self.cfg["port"],
            "running": self.running(),
            "pid": self.proc.pid if self.running() else None,
            "exit_code": self.exit_code,
            # Exited on its own with an error (not stopped with the Stop button)
            "crashed": (not self.running() and self.exit_code not in (None, 0)
                        and not self.user_stop),
        }

    def since(self, n):
        with self.log_lock:
            return {"seq": self.seq, "lines": [list(l) for l in self.lines if l[0] > n]}


MANAGED = {name: Managed(name, cfg) for name, cfg in SERVERS.items()}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # keep the panel's own requests out of the terminal

    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _parts(self):
        url = urlparse(self.path)
        return [p for p in url.path.split("/") if p], parse_qs(url.query)

    def do_GET(self):
        parts, query = self._parts()
        if not parts:
            return self._send(200, PAGE.encode(), "text/html; charset=utf-8")
        if parts == ["api", "status"]:
            return self._send(200, {n: m.status() for n, m in MANAGED.items()})
        if len(parts) == 3 and parts[:2] == ["api", "logs"] and parts[2] in MANAGED:
            try:
                since = int(query.get("since", ["0"])[0])
            except ValueError:
                since = 0
            return self._send(200, MANAGED[parts[2]].since(since))
        self._send(404, {"error": "not found"})

    def do_POST(self):
        parts, _ = self._parts()
        if (len(parts) == 3 and parts[0] == "api"
                and (parts[1] in MANAGED or parts[1] == "all")
                and parts[2] in ("start", "stop", "restart")):
            targets = MANAGED.values() if parts[1] == "all" else [MANAGED[parts[1]]]
            return self._send(200, {m.name: getattr(m, parts[2])() for m in targets})
        self._send(404, {"error": "not found"})


PAGE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pi workshop servers</title>
<style>
  :root { --bg:#f4f4f1; --card:#fff; --ink:#1d1d1b; --muted:#6b6b66; --line:#ddddd6;
          --on:#1f8a4c; --off:#9a9a94; --err:#c0392b; --log:#151514; --logink:#e6e6df; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
         background:var(--bg); color:var(--ink); }
  header { padding:20px 24px 4px; display:flex; align-items:baseline; gap:16px; flex-wrap:wrap; }
  h1 { font-size:20px; margin:0; }
  #conn { font-size:13px; color:var(--muted); }
  #conn.bad { color:var(--err); font-weight:600; }
  main { display:grid; grid-template-columns:repeat(auto-fit, minmax(420px, 1fr)); gap:16px; padding:16px 24px 24px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px;
          display:flex; flex-direction:column; min-height:420px; }
  .top { padding:14px 16px; display:flex; flex-wrap:wrap; align-items:center; gap:10px;
         border-bottom:1px solid var(--line); }
  .name { font-weight:650; font-size:16px; }
  .port { color:var(--muted); font-size:13px; }
  .pill { margin-left:auto; font-size:12px; font-weight:600; padding:3px 10px; border-radius:99px;
          color:#fff; background:var(--off); }
  .pill.on { background:var(--on); }
  .pill.err { background:var(--err); }
  .bar { padding:10px 16px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  button { font:inherit; font-size:14px; padding:6px 14px; border-radius:6px; cursor:pointer;
           border:1px solid var(--line); background:#fafaf7; color:var(--ink); }
  button.primary { background:var(--ink); color:#fff; border-color:var(--ink); }
  button:disabled { opacity:.35; cursor:default; }
  .bar .link { margin-left:auto; font-size:13px; color:var(--muted); }
  .bar .link a { color:inherit; }
  pre { flex:1; margin:0 12px 12px; padding:10px 12px; background:var(--log); color:var(--logink);
        border-radius:6px; font:12.5px/1.45 ui-monospace, Menlo, Consolas, monospace;
        overflow:auto; white-space:pre-wrap; word-break:break-word; height:340px; }
</style></head>
<body>
<header><h1>Pi workshop servers</h1><span id="conn">connecting…</span></header>
<main id="cards"></main>
<script>
const host = location.hostname;
const seen = {}, logs = {}, els = {};
const MAX = 1000;

function card(name, s) {
  const c = document.createElement('section');
  c.className = 'card';
  const link = name === 'http'
    ? `<a href="http://${host}:${s.port}" target="_blank">open http://${host}:${s.port}</a>`
    : `ws://${host}:${s.port}`;
  c.innerHTML = `
    <div class="top"><span class="name"></span><span class="port">port ${s.port}</span>
      <span class="pill">…</span></div>
    <div class="bar">
      <button class="primary" data-a="start">Start</button>
      <button data-a="stop">Stop</button>
      <button data-a="restart">Restart</button>
      <button data-a="clear" title="Clear this window (doesn't affect the server)">Clear</button>
      <span class="link">${link}</span>
    </div>
    <pre></pre>`;
  c.querySelector('.name').textContent = s.label;
  c.querySelectorAll('button').forEach(b => b.onclick = () => act(name, b.dataset.a));
  document.getElementById('cards').appendChild(c);
  seen[name] = 0; logs[name] = [];
  els[name] = { pill: c.querySelector('.pill'), pre: c.querySelector('pre'),
                btn: Object.fromEntries([...c.querySelectorAll('button')].map(b => [b.dataset.a, b])) };
}

function render(name, s) {
  const e = els[name];
  e.pill.textContent = s.running ? `running (pid ${s.pid})`
    : s.exit_code === null ? 'stopped' : `stopped (exit ${s.exit_code})`;
  if (s.crashed) e.pill.textContent = `crashed (exit ${s.exit_code}), see output`;
  e.pill.className = 'pill' + (s.running ? ' on' : s.crashed ? ' err' : '');
  e.btn.start.disabled = s.running;
  e.btn.stop.disabled = !s.running;
}

async function pullLogs(name) {
  const r = await (await fetch(`/api/logs/${name}?since=${seen[name]}`)).json();
  if (r.seq < seen[name]) { seen[name] = 0; logs[name] = []; return; }  // panel restarted
  if (!r.lines.length) return;
  const pre = els[name].pre;
  const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 30;
  for (const [, t, text] of r.lines) logs[name].push(`${t}  ${text}`);
  if (logs[name].length > MAX) logs[name] = logs[name].slice(-MAX);
  pre.textContent = logs[name].join('\n');
  seen[name] = r.seq;
  if (atBottom) pre.scrollTop = pre.scrollHeight;
}

async function poll() {
  const conn = document.getElementById('conn');
  try {
    const st = await (await fetch('/api/status')).json();
    for (const [name, s] of Object.entries(st)) {
      if (!els[name]) card(name, s);
      render(name, s);
      await pullLogs(name);
    }
    conn.textContent = 'connected to ' + host; conn.className = '';
  } catch (err) {
    conn.textContent = 'Lost connection to the Pi. Retrying…'; conn.className = 'bad';
  }
}

async function act(name, a) {
  if (a === 'clear') { logs[name] = []; els[name].pre.textContent = ''; return; }
  Object.values(els[name].btn).forEach(b => b.disabled = true);
  try { await fetch(`/api/${name}/${a}`, { method: 'POST' }); } catch (e) {}
  await poll();
}

poll(); setInterval(poll, 1000);
</script>
</body></html>
"""


def main():
    # Make sure Ctrl+C reaches the servers as Ctrl+C, even if whatever launched
    # the panel told it to ignore Ctrl+C (child processes inherit "ignore").
    signal.signal(signal.SIGINT, signal.default_int_handler)

    server = ThreadingHTTPServer(("0.0.0.0", PANEL_PORT), Handler)
    server.daemon_threads = True

    # systemd stops the panel with SIGTERM; shut down cleanly so the servers stop too.
    signal.signal(signal.SIGTERM, lambda *_: threading.Thread(target=server.shutdown).start())

    if AUTOSTART:
        for m in MANAGED.values():
            m.start()

    print(f"Control panel on http://0.0.0.0:{PANEL_PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        for m in MANAGED.values():
            m.stop()


if __name__ == "__main__":
    main()
