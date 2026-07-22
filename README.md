# NEXUS — Interactive 3D Smart City

A production-quality **Three.js** visualization of a modern Smart City, built with Vite. Zero external asset dependencies — every mesh, texture, and material is generated procedurally so the project runs offline out-of-the-box.

![Three.js](https://img.shields.io/badge/three.js-0.160-000?logo=three.js) ![Vite](https://img.shields.io/badge/vite-5.x-646cff?logo=vite) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

**City Content**
- Residential, Commercial & Industrial districts with 200+ procedural buildings
- Full road network with lanes, sidewalks, crosswalks, and lane markings
- Traffic-light-driven vehicle simulation (cars, buses, trucks) with lane-following AI
- Utilities: Solar farm, Wind turbines, Water towers, Power substation, 5G towers, IoT sensors
- Services: Hospital, School, Fire station, Police station
- Green: Parks, 2000+ instanced trees, bus stops, EV charging, drone pad, digital billboards

**Interaction**
- Orbit / pan / zoom · click-to-select any building · hover highlights
- Info cards with per-building live metrics
- 8 toggleable city layers (Buildings, Vehicles, Utilities, IoT, Trees, Roads, Lights, Effects)
- Camera presets + one-click cinematic fly-through (GSAP timelines)
- Full-day time slider — dynamic sun position, sky, fog, street-light auto-on
- Weather modes: Clear · Cloudy · Rain
- Search panel with fuzzy match over every named object

**Dashboard**
- 13 live KPIs (traffic, power, solar, wind, water, air quality, noise, waste, parking, alerts, weather, IoT, network)
- Animated sparkline charts (canvas 2D)
- Emergency alert feed
- Live FPS / draw-call / triangle-count monitor
- Minimap top-down projection

**Engineering**
- InstancedMesh for trees, street lights, building windows (>10 000 instances at ~40 draw calls)
- Object-pooled vehicle system (zero GC during simulation)
- PBR materials + ACES filmic tone mapping + PCF soft shadows
- Fog + hemisphere + directional + ambient lighting rig
- Central `EventBus`, `Time`, `Registry` — no globals, no scattered `requestAnimationFrame`
- All GPU resources tracked and disposed via `DisposalRegistry`

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

Production build:
```bash
npm run build
npm run preview
```

---

## 📁 Folder Structure

```
SmartCity/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── public/
└── src/
    ├── main.js                    # Bootstrap
    ├── core/                      # App, EventBus, Time, Registry, Disposal
    ├── scene/                     # Scene builder
    ├── camera/                    # Camera manager + presets
    ├── renderer/                  # WebGLRenderer factory
    ├── controls/                  # OrbitControls wrapper
    ├── lighting/                  # Sun, hemi, ambient, street lights
    ├── environment/               # Sky, fog, ground, water
    ├── city/
    │   ├── CityBuilder.js
    │   ├── roads/                 # Road network + markings
    │   ├── buildings/             # Residential / commercial / industrial / services
    │   ├── vehicles/              # Pooled vehicles + traffic AI
    │   ├── traffic/               # Traffic-light controller
    │   ├── utilities/             # Solar, wind, water, power, 5G
    │   └── iot/                   # IoT sensors, billboards, drones
    ├── effects/                   # Post-render effects (rain, particles)
    ├── animations/                # Cinematic camera + GSAP timelines
    ├── managers/                  # Interaction, Weather, DayNight, Search
    ├── ui/                        # Dashboard, panels, HUD, styles
    ├── helpers/                   # Debug helpers
    ├── utils/                     # Math, colors, RNG, geometry
    └── config/                    # Central configuration
```

---

## 🎮 Controls

| Input | Action |
|---|---|
| **Left Mouse** | Rotate |
| **Right Mouse** | Pan |
| **Wheel** | Zoom |
| **Click object** | Select + info card |
| **Hover object** | Highlight |
| **D** | Toggle day/night |
| **T** | Toggle traffic heatmap |
| **C** | Cinematic fly-through |
| **W** | Cycle weather |
| **R** | Reset camera |
| **Time slider** | Scrub time-of-day |

---

## 🧠 Architecture

The app is a single `App` orchestrator that owns:
1. `Renderer` (WebGLRenderer, ACES tone mapping, PCF soft shadows)
2. `SceneManager` (root scene graph, groups per system)
3. `CameraManager` (perspective + preset transitions)
4. `ControlsManager` (OrbitControls with damped pan-limits)
5. `CityBuilder` (declaratively assembles districts from config)
6. `InteractionManager` (Raycaster + hover/click)
7. `DayNightCycle`, `WeatherManager`, `TrafficSystem`
8. `UIManager` + `Dashboard`

A single `Clock`-driven `update(delta)` propagates ticks to every subsystem — no subsystem creates its own `requestAnimationFrame`.

An `EventBus` decouples UI ↔ Scene events (`layer:toggle`, `object:select`, `time:change`, etc.).

Every GPU resource (geometry, material, texture, RT) is registered in `DisposalRegistry` and disposed on teardown → no leaks on HMR.

---

## ⚡ Performance

| Optimization | Effect |
|---|---|
| `InstancedMesh` for trees / lamps / windows | 10 000 objects → ~40 draw calls |
| Object pooling for vehicles | 0 GC allocations during simulation |
| Frustum culling (three.js default) + tight bounding spheres | ~50 % culled on typical camera |
| Merged BufferGeometries for districts | -70 % draw calls |
| Shadow map only on key sun light | 1 depth pass instead of 3 |
| Fog + tight `camera.far` | Reduced overdraw |
| Damped OrbitControls + rAF-throttled resize | Smooth on low-end |

Target: **60 FPS** on a 2019+ integrated GPU at 1080p.

---

## 🧾 License

MIT © 2026 NEXUS Smart City Contributors.
