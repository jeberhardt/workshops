"""
pi_bridge.py — the real Raspberry Pi bridge.

Reads the parts wired as in the README ("Wiring the parts to the Pi")
with gpiozero and sends their readings to the sketch over a WebSocket,
30 times a second, in the same format as test_server.py.

    python pi_bridge.py                 -> ws://<this Pi>:8765

Only wired some of the parts? List them in WIRED below. A part that isn't
listed is left out, so its card in the sketch keeps simulating.
(Unconnected MCP3008 channels float and would send random noise.)

It also drives outputs (OUTPUTS below) when the sketch asks, with
sendToHardware() in the Outputs step:
    {"beep": {"hz": 880, "ms": 300}}     the buzzer plays a note
    {"pixels": [255, 120, 0]}            all NeoPixels one colour ([0, 0, 0] = off)
    {"pixels": [[255,0,0], [0,255,0], [0,0,255]]}   one colour each

Needs: gpiozero (comes with Raspberry Pi OS) and websockets (see
"Installing the Python packages" in the README). The light sensor reads
through an ADS1115 on I2C: turn I2C on (sudo raspi-config -> Interface
Options -> I2C) and pip install adafruit-circuitpython-ads1x15. The other
analog parts use an MCP3008 on SPI (turn SPI on the same way). The NeoPixels
also use SPI, and pip install adafruit-circuitpython-neopixel-spi.
./workshop install does all of this.
"""
import asyncio
import json
import threading
import time
import warnings

import websockets

try:
    from gpiozero import (MCP3008, Button, DigitalInputDevice,
                          DistanceSensor, MotionSensor)
except ImportError:
    raise SystemExit("gpiozero not found. Run this on the Pi (with a venv made "
                     "using --system-site-packages), or use test_server.py instead.")

PORT = 8765
RATE = 30  # messages per second
# What to print about the messages (it shows in the control panel's bridge window):
SHOW_MESSAGES = True   # print messages to and from the browser
SHOW_EVERY_READING = False  # False: only the readings that changed. True: all 30 a second
# How much a reading must change to be printed (digital parts: any change).
SHOW_CHANGE = {"proximity": 2.0}  # cm
SHOW_CHANGE_DEFAULT = 0.02        # for 0..1 readings

# The parts you have wired. Comment out the ones you haven't.
# The workshop's Real hardware step uses the button, the ultrasonic sensor and the LDR;
# the others are ready to uncomment if you wire them too.
WIRED = [
    "button",     # GPIO17 (pin 11) + GND
    # "switch",     # GPIO27 (pin 13) + GND
    "proximity",  # HC-SR04: TRIG GPIO23 (pin 16), ECHO via divider GPIO24 (pin 18)
    # "pir",        # HC-SR501 OUT GPIO22 (pin 15)
    # "touch",      # TTP223 SIG GPIO25 (pin 22)
    # "slider",     # MCP3008 CH0
    # "knob",       # MCP3008 CH1
    "light",      # ADS1115 A0, on I2C: SDA pin 3, SCL pin 5
    # "sound",      # MCP3008 CH3
    # "joystickX",  # MCP3008 CH4
    # "joystickY",  # MCP3008 CH5
]

SOUND_WINDOW = 0.02  # seconds of sound to look at for each loudness reading

# The outputs you have wired. Comment out the ones you haven't.
OUTPUTS = [
    "buzzer",     # passive buzzer, through a transistor: GPIO13 (pin 33)
    "pixels",     # NeoPixels: DIN via 330 ohm to GPIO10 (pin 19, SPI), 5V, GND
]
PIXEL_COUNT = 3
PIXEL_BRIGHTNESS = 0.3  # 0..1. Full brightness is dazzling up close


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
    # gpiozero warns that its default timing is less accurate than the pigpio
    # library's. It's accurate enough here, so hide that warning.
    from gpiozero.exc import PWMSoftwareFallback
    warnings.filterwarnings("ignore", category=PWMSoftwareFallback)
    d = DistanceSensor(echo=24, trigger=23, max_distance=2)
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
    t = DigitalInputDevice(25)          # the TTP223 drives SIG HIGH while touched
    return lambda: t.value

def setup_adc(channel):
    def setup():
        adc = MCP3008(channel=channel)  # .value is already 0..1
        return lambda: round(adc.value, 3)
    return setup

def needs(packages):
    """The error to show when a library is missing: names the pip command that fixes it."""
    return RuntimeError(f"library missing: in the venv, run  pip install {packages}  then Restart")


def setup_light():
    # The LDR reads through an ADS1115 breakout on I2C (A0), not the MCP3008.
    try:
        import board
        import adafruit_ads1x15.ads1115 as ADS
        from adafruit_ads1x15.analog_in import AnalogIn
    except ImportError:
        raise needs("adafruit-blinka adafruit-circuitpython-ads1x15")
    ads = ADS.ADS1115(board.I2C())      # address 0x48: ADDR left unconnected
    a0 = getattr(ADS, "P0", None)
    if a0 is None:                      # newer versions of the library name the pins differently
        from adafruit_ads1x15.ads1x15 import Pin
        a0 = Pin.A0
    light = AnalogIn(ads, a0)
    # The divider gives 0 V (dark) to 3.3 V (bright): send it as 0..1.
    return lambda: round(min(max(light.voltage / 3.3, 0.0), 1.0), 3)

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
    "light": setup_light,
    "sound": setup_sound,
    "joystickX": setup_adc(4),
    "joystickY": setup_adc(5),
}


# --- Outputs: one setup function each, returns (do, off) ---
# do(value) acts on the value from the sketch's message; off() switches it off.

def setup_buzzer():
    from gpiozero import TonalBuzzer
    from gpiozero.tones import Tone
    buzzer = TonalBuzzer(13, octaves=3)  # can play 55 Hz to 3520 Hz
    low, high = buzzer.min_tone.frequency, buzzer.max_tone.frequency
    timer = None

    def beep(value):                    # {"hz": 880, "ms": 300}
        nonlocal timer
        hz = min(max(float(value.get("hz", 880)), low), high)
        ms = min(max(float(value.get("ms", 300)), 10), 5000)
        if timer:
            timer.cancel()              # a new beep replaces one still playing
        buzzer.play(Tone.from_frequency(hz))
        timer = threading.Timer(ms / 1000, buzzer.stop)
        timer.start()
    return beep, buzzer.stop


def setup_pixels():
    # The NeoPixels' data goes out on the SPI pin (GPIO10, pin 19). This works the
    # same on every Pi from the 3 to the 5, and needs no sudo.
    try:
        import board
        import neopixel_spi
    except ImportError:
        raise needs("adafruit-blinka adafruit-circuitpython-neopixel-spi")
    strip = neopixel_spi.NeoPixel_SPI(board.SPI(), PIXEL_COUNT, pixel_order=neopixel_spi.GRB,
                                      brightness=PIXEL_BRIGHTNESS, auto_write=True)

    def colour(c):
        return tuple(min(max(int(v), 0), 255) for v in c[:3])

    def show(value):                    # [r, g, b] for all, or [[r, g, b], ...] one each
        if value and isinstance(value[0], (list, tuple)):
            for i, c in enumerate(value[:PIXEL_COUNT]):
                strip[i] = colour(c)
        else:
            strip.fill(colour(value))

    def off():
        strip.fill((0, 0, 0))

    off()
    return show, off


OUTPUT_SETUP = {
    "buzzer": setup_buzzer,
    "pixels": setup_pixels,
}
# The message key the sketch uses for each output.
OUTPUT_KEYS = {"buzzer": "beep", "pixels": "pixels"}


def setup_outputs():
    outputs = {}
    for name in OUTPUTS:
        try:
            outputs[OUTPUT_KEYS[name]] = OUTPUT_SETUP[name]()
            print(f"  {name:10} ready")
        except Exception as e:          # e.g. library not installed: skip it, keep the rest
            print(f"  {name:10} skipped: {e}")
    return outputs


outputs = {}  # message key -> (do, off), filled in by main()


def act_on(message):
    """A message from the sketch: do what it asks of each output."""
    try:
        data = json.loads(message)
    except ValueError:
        return
    if not isinstance(data, dict):
        return
    for key, value in data.items():
        if key not in outputs:
            print(f"no output for {key!r}" + ("" if outputs else " (no outputs ready)"))
            continue
        try:
            outputs[key][0](value)
        except Exception as e:
            print(f"{key}: {e}")


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
last_shown = {}  # the readings last printed, to spot what changed


def show_readings(message):
    """Print the readings sent to the browser: all of them, or just what changed."""
    if not SHOW_MESSAGES:
        return
    if SHOW_EVERY_READING:
        print("to browser:  ", json.dumps(message))
        return
    changed = {}
    for name, value in message.items():
        before = last_shown.get(name)
        if before is None or abs(value - before) >= SHOW_CHANGE.get(name, SHOW_CHANGE_DEFAULT):
            changed[name] = value
    if changed:
        last_shown.update(changed)
        print("to browser:  ", json.dumps(changed))


async def handler(ws):
    clients.add(ws)
    last_shown.clear()                  # so the next readings print in full
    print(f"browser connected ({len(clients)} open)")
    try:
        async for message in ws:        # anything the sketch sends with sendToHardware()
            if SHOW_MESSAGES:
                print("from browser:", message)
            act_on(message)
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
            reading = await asyncio.to_thread(readings, readers)
            show_readings(reading)
            message = json.dumps(reading)
            for ws in list(clients):
                try:
                    await ws.send(message)
                except websockets.ConnectionClosed:
                    clients.discard(ws)
        await asyncio.sleep(max(0, 1 / RATE - (time.monotonic() - tick)))


async def main():
    print("Setting up parts:")
    readers = setup_parts()
    print("Setting up outputs:")
    outputs.update(setup_outputs())
    if not readers and not outputs:
        raise SystemExit("No parts ready: check WIRED, OUTPUTS and the wiring.")
    async with websockets.serve(handler, "0.0.0.0", PORT):
        print(f"Pi bridge running on ws://<this Pi>:{PORT}  (Ctrl+C to stop)")
        await send_readings(readers)


def outputs_off():
    for key, (do, off) in outputs.items():
        try:
            off()
        except Exception:
            pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    finally:
        outputs_off()                   # don't leave the buzzer squealing or the pixels on
