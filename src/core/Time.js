/**
 * Time.js
 * -----------------------------------------------------------------------------
 * Simulation clock.  Distinct from `THREE.Clock` (which is wall-time only).
 *
 * We separate:
 *   - `delta`    : real-time seconds since last frame (for animations)
 *   - `elapsed`  : total real-time seconds (for sinusoidal effects)
 *   - `simHour`  : simulated hour of day 0..24 (for lighting + dashboards)
 *
 * WHY:  Coupling animation-speed to sim-time lets us pause/scrub the day
 * cycle without freezing traffic — a common demand in city visualisations.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export class Time {
  constructor() {
    this._clock = new THREE.Clock();
    this.delta = 0;
    this.elapsed = 0;
    this.simHour = CityConfig.TIME.startHour;
    this.autoAdvance = false;
    this.simSpeed = CityConfig.TIME.speed;
  }

  tick() {
    this.delta = Math.min(this._clock.getDelta(), 0.1); // clamp huge dt (tab-blur)
    this.elapsed += this.delta;
    if (this.autoAdvance) {
      this.simHour = (this.simHour + this.delta * this.simSpeed) % 24;
    }
    return this.delta;
  }

  setHour(h) { this.simHour = ((h % 24) + 24) % 24; }
  isNight()  { return this.simHour < 6 || this.simHour > 20; }
  formatted() {
    const h = Math.floor(this.simHour);
    const m = Math.floor((this.simHour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
