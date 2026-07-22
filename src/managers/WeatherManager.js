/**
 * WeatherManager.js
 * -----------------------------------------------------------------------------
 * Cycles through: clear → cloudy → rain.  Adjusts fog, ambient light, and
 * enables the RainEffect accordingly.
 */
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';

const MODES = ['clear', 'cloudy', 'rain'];

export class WeatherManager {
  constructor(scene, rain) {
    this.scene = scene;
    this.rain = rain;
    this.mode = 'clear';
    this._defaultFogFar = scene.fog?.far ?? 800;
    this._defaultFogNear = scene.fog?.near ?? 250;
  }

  cycle() {
    const i = MODES.indexOf(this.mode);
    this.set(MODES[(i + 1) % MODES.length]);
  }

  set(mode) {
    if (!MODES.includes(mode)) return;
    this.mode = mode;
    switch (mode) {
      case 'clear':
        if (this.scene.fog) { this.scene.fog.near = this._defaultFogNear; this.scene.fog.far = this._defaultFogFar; }
        this.rain.setEnabled(false);
        break;
      case 'cloudy':
        if (this.scene.fog) { this.scene.fog.near = 60; this.scene.fog.far = 400; }
        this.rain.setEnabled(false);
        break;
      case 'rain':
        if (this.scene.fog) { this.scene.fog.near = 30; this.scene.fog.far = 250; }
        this.rain.setEnabled(true);
        break;
    }
    bus.emit('weather:change', mode);
  }
}
