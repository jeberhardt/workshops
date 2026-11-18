# Parts List: Responsive Installations

Everything needed to run the workshop. Quantities are **per station**, meaning one Pi with every part below wired at once,
using the pin plan in the README's *Wiring the parts to the Pi* table.

**Steps 1–9 need no hardware**: just a laptop and a browser. The sketch simulates every sensor.
The parts below are for the *Real hardware* step (step 10 in the menu), which uses the same three parts as *Simulated sensors*:
a **push button**, an **ultrasonic distance sensor** and a **light sensor (LDR)**,
and for the *Outputs* step (step 11 in the menu): a **piezo** and **3 NeoPixels**.

## Computer and software
| Qty | Item | Notes |
|---|---|---|
| 1 | Laptop with a modern browser | Runs the sketch. Opens the page over **http**, not https (see *The https gotcha* in the README) |
| — | Python 3 | On the laptop for `test_server.py`, on the Pi for `pi_bridge.py` |
| — | `websockets` (from `requirements.txt`) | Install in a venv; see *Installing the Python packages* |
| — | Text editor | VS Code (with Live Server) works well |
| — | Wi-Fi network shared by the laptop and the Pi | So the sketch can reach `ws://raspberrypi.local:8765` |

## Raspberry Pi
| Qty | Item | Notes |
|---|---|---|
| 1 | Raspberry Pi with a 40-pin header | Any model with Wi-Fi (e.g. Pi 3B+, 4, 5, or Zero 2 W with a soldered header) |
| 1 | microSD card, 16 GB or more | Raspberry Pi OS (Bookworm or later), which includes `gpiozero` |
| 1 | Pi power supply | The official supply for your model |
| — | I2C turned on | `sudo raspi-config` → Interface Options → I2C (needed for the ADS1115) |
| — | `adafruit-blinka`, `adafruit-circuitpython-ads1x15` | `pip install` in the venv, for the ADS1115 |

## Prototyping
| Qty | Item | Notes |
|---|---|---|
| 1 | Breadboard, half-size (400 points) or full-size (830) | Two sets of power rails: one for **5 V** (the ultrasonic sensor), one for **3.3 V** (the ADS1115 and LDR) |
| ~14 | Jumper wires, female–male | Pi header → breadboard |
| ~20 | Jumper wires, male–male | Around the breadboard |
| 1 | 40-pin GPIO ribbon cable + T-cobbler (optional) | Brings the Pi's pins onto the breadboard; tidier than loose female–male wires |

## Analog-to-digital converter
| Qty | Item | Notes |
|---|---|---|
| 1 | **ADS1115** ADC breakout (e.g. Adafruit 1085, with header pins) | The Pi has no analog inputs, so the LDR goes through this board (4 channels, 16-bit, I2C, address 0x48). Powered from 3.3 V |

## The three parts
| Qty | Part | Connects to | Power |
|---|---|---|---|
| 1 | Tactile push button | GPIO17 (pin 11) + GND | none (internal pull-up) |
| 1 | **HC-SR04** ultrasonic distance sensor | TRIG → GPIO24 (pin 18), ECHO → divider → GPIO25 (pin 22) | 5 V |
| 1 | LDR (CdS photoresistor) | ADS1115 A0 (SDA → pin 3, SCL → pin 5) | 3.3 V |

## Outputs (for the Outputs step)
| Qty | Part | Connects to | Power |
|---|---|---|---|
| 1 | Passive piezo buzzer (a bare disc or a "passive" module; not an active buzzer) | + → GPIO5 (pin 29), − → GND | none |
| 3 | NeoPixels (WS2812B), chained: a 3-pixel stick or strip, or 3 breakout pixels | DIN → 330 Ω → GPIO18 (pin 12) | 5 V |
| 1 | 74AHCT125 level shifter (optional) | Between GPIO18 and DIN, if the pixels flicker | 5 V |

## Resistors
| Qty | Value | Used for |
|---|---|---|
| 1 | 1 kΩ | HC-SR04 ECHO voltage divider (top) |
| 1 | 2 kΩ | HC-SR04 ECHO voltage divider (bottom). No 2 kΩ? Use 2.2 kΩ or two 1 kΩ in series |
| 1 | 10 kΩ | LDR voltage divider |
| 1 | 330 Ω | NeoPixel data line |

Never wire the HC-SR04's ECHO pin straight to the Pi: it outputs 5 V, and the Pi's pins take 3.3 V.

## Useful extras
- Spare 1 kΩ, 2.2 kΩ and 10 kΩ resistors
- Multimeter, for checking the 3.3 V / 5 V rails and the ECHO divider
- Projector or large screen, if the sketch is shown as an installation (press **P** to hide the panel and **F** for fullscreen)
- For an offline venue: the component photos saved into `images/` (see *Component photos* in the README)

## Going further
The sketch and `pi_bridge.py` also support a toggle switch, a PIR motion sensor, a touch pad, two potentiometers, a microphone
and a joystick. Their pins are in the README's *Wiring the parts to the Pi* table. To use one, uncomment it in `WIRED` in
`pi_bridge.py` and add its id to the `buildControlPanel()` list in the Real hardware step.
The potentiometers, microphone and joystick are analog and read through an **MCP3008** chip on SPI, which the three-part
kit doesn't need.

## Per group or per room
Running several stations? Multiply the tables above by the number of Pis.
Participants without hardware can follow along using `test_server.py` on their laptop, which sends fake readings.
