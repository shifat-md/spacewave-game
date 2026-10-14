# Space Wave - Geometry Dash 60s Challenge

An authentic Geometry Dash Wave-mode arcade game built with vanilla JavaScript, modern HTML5 Canvas, Web Audio API, and Tailwind CSS.

## 🚀 Overview

The game challenges players to survive a **60-second cyber highway** navigating at 45-degree angles through winding neon caverns, hazard spikes, speed portals, and inverted gravity fields.

### 🎮 Features

- **Geometry Dash Wave Mechanics**:
  - Instantaneous 45° angle ascent and descent with smooth vector ship rotation.
  - Authentic continuous glowing zigzag trail ribbon.
  - Tight, forgiving collision hitbox (matching Geometry Dash design standards).
- **Escalating 60-Second Sector Progression**:
  - **Sector 1 (0s - 10s)**: *Lift Off* (1x Speed) - Cavern introduction, gentle slopes, initial crystals.
  - **Sector 2 (10s - 22s)**: *Neon Grid* (2x Speed) - Green portal speed boost, tighter zigzag caverns, floor & ceiling spikes.
  - **Sector 3 (22s - 34s)**: *Gravity Void & Mini Wave* (2x Speed) - Inverted gravity portal (hold to dive, release to climb) and mini-wave portal (sharper angles).
  - **Sector 4 (34s - 46s)**: *Cyber Drop* (3x Speed) - Pink portal speed boost, the heavy EDM beat drop, pulsing hazards.
  - **Sector 5 (46s - 57s)**: *Supernova Climax* (3.5x Speed) - Adrenaline-fueled rapid micro-adjustments and gravity switches.
  - **Sector 6 (57s - 60s)**: *Event Horizon* - Opening starlight arena leading to the glowing 100% Victory archway.
- **Built-in Web Audio API Synthesizer**:
  - Dynamic 140 BPM EDM synthwave soundtrack running parallel to the 60s clock.
  - Procedural sound effects for clicks, portal passes, crystal pickups, crashes, and victory fanfare.
  - Zero external sound asset dependencies.
- **Practice Mode**:
  - Place checkpoints (`Z` key or UI button) and delete checkpoints (`X` key).
  - Instant respawn at your latest checkpoint upon crash.
- **Customization & Statistics**:
  - 5 customizable wave ship neon cores: Cyan, Magenta, Emerald, Amber, Violet.
  - High score percentage tracking and total attempt counter saved in `localStorage`.

---

## 🕹️ Controls

| Action | Keyboard | Mouse / Touch |
| :--- | :--- | :--- |
| **Climb 45°** | **HOLD** `Space`, `W`, or `Up Arrow` | **HOLD** Left Click / Touch |
| **Dive 45°** | **RELEASE** Key | **RELEASE** Click / Touch |
| **Pause Game** | `Esc` or `P` | Pause Button in HUD |
| **Toggle Mute** | `M` | Speaker Icon in HUD |
| **Place Checkpoint** *(Practice)* | `Z` | `+ Place` Button |
| **Remove Checkpoint** *(Practice)* | `X` | `- Delete` Button |

---

## 💻 Running the Game

You can open `index.html` directly in any web browser, or serve it using npm:

```bash
# Start local development server
npm start

# Or rebuild Tailwind CSS styles
npm run build:css
```
