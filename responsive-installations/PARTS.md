# Parts List: Responsive Installations

Everything needed to run the workshop. Quantities are **per station**, meaning one Pi with all three parts wired at once,
using the pin plan in the README's *Wiring the parts to the Pi* table.

**Steps 1–9 need no hardware**: just a laptop and a browser. The sketch simulates every sensor.
The parts below are for the *Real hardware* step (step 10 in the menu), which uses the same three parts as *Simulated sensors*:
a **push button**, an **ultrasonic distance sensor** and a **light sensor (LDR)**.

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
| — | SPI turned on | `sudo raspi-config` → Interface Options → SPI (needed for the MCP3008) |

## Prototyping
| Qty | Item | Notes |
|---|---|---|
| 1 | Breadboard, half-size (400 points) or full-size (830) | Two sets of power rails: one for **5 V** (the ultrasonic sensor), one for **3.3 V** (the MCP3008 and LDR) |
| ~12 | Jumper wires, female–male | Pi header → breadboard |
| ~15 | Jumper wires, male–male | Around the breadboard |
| 1 | 40-pin GPIO ribbon cable + T-cobbler (optional) | Brings the Pi's pins onto the breadboard; tidier than loose female–male wires |

## Analog-to-digital converter
| Qty | Item | Notes |
|---|---|---|
| 1 | **MCP3008** ADC, DIP-16 | The Pi has no analog inputs, so the LDR goes through this chip (8 channels, 10-bit, SPI). Powered from 3.3 V |

## The three parts
| Qty | Part | Connects to | Power |
|---|---|---|---|
| 1 | Tactile push button | GPIO17 (pin 11) + GND | none (internal pull-up) |
| 1 | **HC-SR04** ultrasonic distance sensor | TRIG → GPIO24 (pin 18), ECHO → divider → GPIO25 (pin 22) | 5 V |
| 1 | LDR (CdS photoresistor) | MCP3008 CH2 | 3.3 V |

## Resistors
| Qty | Value | Used for |
|---|---|---|
| 1 | 1 kΩ | HC-SR04 ECHO voltage divider (top) |
| 1 | 2 kΩ | HC-SR04 ECHO voltage divider (bottom). No 2 kΩ? Use 2.2 kΩ or two 1 kΩ in series |
| 1 | 10 kΩ | LDR voltage divider |

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

## Per group or per room
Running several stations? Multiply the tables above by the number of Pis.
Participants without hardware can follow along using `test_server.py` on their laptop, which sends fake readings.
