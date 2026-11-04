"""
pi_bridge.py — the real Raspberry Pi bridge.

Reads the parts wired as in the README ("Wiring the parts to the Pi")
with gpiozero and sends their readings to the sketch over a WebSocket,
30 times a second, in the same format as test_server.py.

    python pi_bridge.py                 -> ws://<this Pi>:8765

Only wired some of the parts? List them in WIRED below. A part that isn't
listed is left out, so its card in the sketch keeps simulating.
(Unconnected MCP3008 channels float and would send random noise.)

Needs: gpiozero (comes with Raspberry Pi OS), SPI turned on for the
MCP3008 (sudo raspi-config -> Interface Options -> SPI), and websockets
(see "Installing the Python packages" in the README).
"""
import asyncio
import json
import threading
import time

import websockets

try:
    from gpiozero import (MCP3008, Button, DigitalInputDevice,
                          DistanceSensor, MotionSensor)
except ImportError:
    raise SystemExit("gpiozero not found. Run this on the Pi (with a venv made "
                     "using --system-site-packages), or use test_server.py instead.")

PORT = 8765
RATE = 30  # messages per second

# The parts you have wired. Comment out the ones you haven't.
WIRED = [
    "button",     # GPIO17 (pin 11) + GND
    "switch",     # GPIO27 (pin 13) + GND
    "proximity",  # HC-SR04: TRIG GPIO24 (pin 18), ECHO via divider GPIO25 (pin 22)
    "pir",        # HC-SR501 OUT GPIO22 (pin 15)
    "touch",      # TTP223 SIG GPIO23 (pin 16)
    "slider",     # MCP3008 CH0
    "knob",       # MCP3008 CH1
    "light",      # MCP3008 CH2
    "sound",      # MCP3008 CH3
    "joystickX",  # MCP3008 CH4
    "joystickY",  # MCP3008 CH5
]

SOUND_WINDOW = 0.02  # seconds of sound to look at for each loudness reading


# --- One setup function per part: returns a function that gives its reading ---

def setup_button():
    b = Button(17)                      # internal pull-up, pressed = connected to GND
    return lambda: 1 if b.is_pressed else 0

def setup_switch():
    s = Button(27)                      # same trick as the button
    return lambda: 1 if s.is_pressed else 0

def setup_proximity():
    # Sends centimetres; HW_RANGES in hardware.js turns 200..2 cm into 0..1.
    # gpiozero waits until it has heard enough echoes, so a sensor that's
    # unplugged would freeze every other part. Read it on its own thread instead.
    d = DistanceSensor(echo=25, trigger=24, max_distance=2)
    latest = {"cm": 200.0}              # "far" until the first echo comes back
    def keep_reading():
        while True:
            latest["cm"] = round(d.distance * 100, 1)
            time.sleep(1 / RATE)
    threading.Thread(target=keep_reading, daemon=True).start()
    return lambda: latest["cm"]

def setup_pir():
    m = MotionSensor(22)
    return lambda: 1 if m.motion_detected else 0

def setup_touch():
    t = DigitalInputDevice(23)          # the TTP223 drives SIG HIGH while touched
    return lambda: t.value

def setup_adc(channel):
    def setup():
        adc = MCP3008(channel=channel)  # .value is already 0..1
        return lambda: round(adc.value, 3)
    return setup

def setup_sound():
    # The mic gives the raw wave around half-way. Loudness = how far it swings.
    mic = MCP3008(channel=3)
    def loudness():
        lo, hi = 1.0, 0.0
        end = time.monotonic() + SOUND_WINDOW
        while time.monotonic() < end:
            v = mic.value
            lo, hi = min(lo, v), max(hi, v)
        return round(min(1.0, (hi - lo) * 2), 3)
    return loudness

SETUP = {
    "button": setup_button,
    "switch": setup_switch,
    "proximity": setup_proximity,
    "pir": setup_pir,
    "touch": setup_touch,
    "slider": setup_adc(0),
    "knob": setup_adc(1),
    "light": setup_adc(2),
    "sound": setup_sound,
    "joystickX": setup_adc(4),
    "joystickY": setup_adc(5),
}


def setup_parts():
    readers = {}
    for name in WIRED:
        try:
            readers[name] = SETUP[name]()
            print(f"  {name:10} ready")
        except Exception as e:          # e.g. SPI is off: skip the part, keep the rest
            print(f"  {name:10} skipped: {e}")
    return readers


def readings(readers):
    """One message with every wired part."""
    message = {}
    for name, read in readers.items():
        try:
            message[name] = read()
        except Exception as e:
            print(f"{name}: {e}")
    return message


clients = set()


async def handler(ws):
    clients.add(ws)
    print(f"browser connected ({len(clients)} open)")
    try:
        async for message in ws:        # anything the sketch sends with sendToHardware()
            print("from browser:", message)
    except websockets.ConnectionClosed:
        pass
    finally:
        clients.discard(ws)
        print(f"browser left ({len(clients)} open)")


async def send_readings(readers):
    while True:
        tick = time.monotonic()
        if clients:
            # Reading takes a little while (the sound window), so do it off the event loop.
            message = json.dumps(await asyncio.to_thread(readings, readers))
            for ws in list(clients):
                try:
                    await ws.send(message)
                except websockets.ConnectionClosed:
                    clients.discard(ws)
        await asyncio.sleep(max(0, 1 / RATE - (time.monotonic() - tick)))


async def main():
    print("Setting up parts:")
    readers = setup_parts()
    if not readers:
        raise SystemExit("No parts ready: check WIRED and the wiring.")
    async with websockets.serve(handler, "0.0.0.0", PORT):
        print(f"Pi bridge running on ws://<this Pi>:{PORT}  (Ctrl+C to stop)")
        await send_readings(readers)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
