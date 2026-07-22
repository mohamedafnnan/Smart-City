/**
 * App.js
 * -----------------------------------------------------------------------------
 * The single orchestrator.  Owns every subsystem, drives the render loop, and
 * cleans everything up on teardown.
 *
 * DESIGN:
 *   - One `requestAnimationFrame` loop lives here.  Every subsystem exposes
 *     an `update(delta, elapsed)` (or is passive) — nothing else creates
 *     its own frame loop.  This keeps timing deterministic and pausable.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';
import { bus } from './EventBus.js';
import { Time } from './Time.js';
import { Registry } from './Registry.js';
import { DisposalRegistry } from './DisposalRegistry.js';
import { createRenderer } from '../renderer/Renderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { CameraManager } from '../camera/CameraManager.js';
import { ControlsManager } from '../controls/ControlsManager.js';
import { LightingSystem } from '../lighting/LightingSystem.js';
import { StreetLights } from '../lighting/StreetLights.js';
import { Environment } from '../environment/Environment.js';
import { RoadNetwork } from '../city/roads/RoadNetwork.js';
import { CityBuilder } from '../city/CityBuilder.js';
import { TrafficLightSystem } from '../city/traffic/TrafficLightSystem.js';
import { VehicleSystem } from '../city/vehicles/VehicleSystem.js';
import { RainEffect } from '../effects/RainEffect.js';
import { InteractionManager } from '../managers/InteractionManager.js';
import { WeatherManager } from '../managers/WeatherManager.js';
import { DayNightCycle } from '../managers/DayNightCycle.js';
import { CinematicManager } from '../managers/CinematicManager.js';
import { SearchManager } from '../managers/SearchManager.js';
import { Dashboard } from '../ui/Dashboard.js';
import { UIManager } from '../ui/UIManager.js';
import { Minimap } from '../ui/Minimap.js';

export class App {
  constructor(canvas, onProgress) {
    this.canvas = canvas;
    this.onProgress = onProgress || (() => {});
    this._fpsSamples = [];
    this._lastFrame = performance.now();
    this._running = false;
    this._raf = null;
  }

  async boot() {
    this._report(0.05, 'Booting renderer…');
    this.renderer = createRenderer(this.canvas);

    this._report(0.12, 'Creating scene graph…');
    this.sceneMgr = new SceneManager();
    this.time = new Time();
    this.registry = new Registry();
    this.disposal = new DisposalRegistry();

    this._report(0.20, 'Configuring camera & controls…');
    this.cameraMgr = new CameraManager();
    this.controlsMgr = new ControlsManager(this.cameraMgr.camera, this.canvas);

    this._report(0.28, 'Building environment…');
    this.environment = new Environment(this.sceneMgr.scene, this.sceneMgr.group('environment'));

    this._report(0.36, 'Building lighting…');
    this.lighting = new LightingSystem(this.sceneMgr.scene, this.sceneMgr.group('lighting'));

    this._report(0.45, 'Laying road network…');
    this.roads = new RoadNetwork(this.sceneMgr.group('roads'));

    this._report(0.55, 'Installing street lights…');
    this.streetLights = new StreetLights(
      this.sceneMgr.scene,
      this.sceneMgr.group('streetLights'),
      this.roads.lampPositions
    );

    this._report(0.65, 'Constructing districts…');
    this.cityBuilder = new CityBuilder(this.sceneMgr, this.registry);
    const buildResult = this.cityBuilder.build();
    this._utilitiesUpdate = buildResult.utilitiesUpdater;
    this._iotUpdate = buildResult.iotUpdater;

    this._report(0.78, 'Programming traffic lights…');
    this.trafficLights = new TrafficLightSystem(
      this.sceneMgr.group('traffic'),
      this.roads.intersections
    );

    this._report(0.83, 'Spawning vehicle fleet…');
    this.vehicles = new VehicleSystem(
      this.sceneMgr.group('vehicles'),
      this.roads,
      this.trafficLights
    );

    this._report(0.88, 'Preparing weather effects…');
    this.rain = new RainEffect(this.sceneMgr.scene, this.sceneMgr.group('effects'));

    this._report(0.92, 'Wiring interaction…');
    this.interaction = new InteractionManager(
      this.cameraMgr.camera,
      this.sceneMgr.scene,
      this.registry,
      this.canvas
    );

    this._report(0.94, 'Configuring managers…');
    this.weather = new WeatherManager(this.sceneMgr.scene, this.rain);
    this.dayNight = new DayNightCycle(this.lighting, this.environment, this.streetLights);
    this.cinematic = new CinematicManager(this.cameraMgr, this.controlsMgr);
    this.search = new SearchManager(this.registry, this.cameraMgr, this.controlsMgr);

    this._report(0.97, 'Booting dashboard…');
    this.dashboard = new Dashboard();
    this.minimap = new Minimap(this.registry, this.cameraMgr);

    this.ui = new UIManager({
      sceneManager: this.sceneMgr,
      cameraMgr: this.cameraMgr,
      controlsMgr: this.controlsMgr,
      cinematic: this.cinematic,
      weather: this.weather,
      dayNight: this.dayNight,
      time: this.time,
    });

    // Initial time apply
    this.dayNight.apply(this.time.simHour);

    window.addEventListener('resize', () => this._onResize());
    this._report(1.0, 'Ready.');

    // Slight delay for the loader to complete its animation gracefully
    await new Promise((r) => setTimeout(r, 300));
    document.getElementById('loading-screen').classList.add('hidden');

    this.start();
  }

  _report(p, status) {
    this.onProgress(p, status);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastFrame = performance.now();
    const loop = () => {
      if (!this._running) return;
      this._raf = requestAnimationFrame(loop);
      this._frame();
    };
    loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _frame() {
    const now = performance.now();
    const fps = 1000 / Math.max(1, now - this._lastFrame);
    this._lastFrame = now;
    this._fpsSamples.push(fps);
    if (this._fpsSamples.length > 30) this._fpsSamples.shift();
    const avgFps = this._fpsSamples.reduce((a, b) => a + b, 0) / this._fpsSamples.length;

    const delta = this.time.tick();
    const elapsed = this.time.elapsed;

    // Update subsystems
    this.controlsMgr.update();
    if (this.time.autoAdvance) this.dayNight.apply(this.time.simHour);
    if (this._utilitiesUpdate) this._utilitiesUpdate(delta);
    if (this._iotUpdate) this._iotUpdate(delta, elapsed);
    this.trafficLights.update(delta);
    this.vehicles.update(delta);
    this.rain.update(delta);
    this.dashboard.tick(delta);
    this.minimap.update(delta);

    // Render
    this.renderer.render(this.sceneMgr.scene, this.cameraMgr.camera);

    // HUD stats
    this.ui.updateStats(avgFps, this.renderer, this.time.simHour);
  }

  _onResize() {
    this.cameraMgr.resize();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CityConfig.RENDERER.pixelRatioCap));
  }

  dispose() {
    this.stop();
    this.controlsMgr.dispose();
    this.sceneMgr.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    this.disposal.disposeAll();
    this.renderer.dispose();
    bus.clear();
  }
}
