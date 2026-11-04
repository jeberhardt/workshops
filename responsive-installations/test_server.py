"""
test_server.py — pretends to be the Raspberry Pi.

Sends fake readings for every input, 30 times a second, so you can
check the sketch's WebSocket connection without any hardware.
Swap readings() for real sensor reads and this becomes your Pi bridge.

    pip install websockets
    python test_server.py              -> ws://localhost:8765

Then press Connect in the sketch's panel.
"""
import asyncio
import json
import math
import random
import time

import websockets

PORT = 8765
RATE = 30  # messages per second
clients = set()


def readings(t):
    """One message with every input. Values are 0..1 unless HW_RANGES in
    hardware.js says otherwise (proximity is sent in cm)."""
    return {
        "button":    1 if t % 4 < 0.5 else 0,             # short press every 4 s
        "switch":    1 if t % 12 < 6 else 0,              # on 6 s, off 6 s
        "slider":    (t * 0.05) % 1,                       # slow ramp
        "knob":      0.5 + 0.5 * math.sin(t * 0.3),
        "proximity": round(100 + 90 * math.sin(t * 0.5) + random.uniform(-2, 2), 1),  # cm
        "light":     0.6 + 0.3 * math.sin(t * 0.2),
        "pir":       1 if t % 10 < 3 else 0,
        "touch":     1 if t % 7 < 1 else 0,
        "sound":     max(0.0, math.sin(t * 2)) ** 8,       # rhythmic "claps"
        "joystickX": 0.5 + 0.4 * math.cos(t),
        "joystickY": 0.5 + 0.4 * math.sin(t),
    }


async def handler(ws):
    clients.add(ws)
    print(f"browser connected ({len(clients)} open)")
    try:
        async for message in ws:              # anything the sketch sends back
            print("from browser:", message)
    except websockets.ConnectionClosed:
        pass
    finally:
        clients.discard(ws)
        print(f"browser left ({len(clients)} open)")


async def send_readings():
    start = time.time()
    while True:
        if clients:
            message = json.dumps(readings(time.time() - start))
            for ws in list(clients):
                try:
                    await ws.send(message)
                except websockets.ConnectionClosed:
                    clients.discard(ws)
        await asyncio.sleep(1 / RATE)


async def main():
    async with websockets.serve(handler, "0.0.0.0", PORT):
        print(f"Test server running on ws://localhost:{PORT}  (Ctrl+C to stop)")
        await send_readings()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
