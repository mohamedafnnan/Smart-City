/**
 * DayNightCycle.js
 * -----------------------------------------------------------------------------
 * Drives lighting + sky + street-lights based on the simulation time.
 * Not itself a per-frame updater — it just re-applies state whenever
 * `apply(hour)` is called (either by the auto tick or the UI slider).
 */
import { bus } from '../core/EventBus.js';
import { CityConfig } from '../config/CityConfig.js';

export class DayNightCycle {
  constructor(lighting, environment, streetLights) {
    this.lighting = lighting;
    this.environment = environment;
    this.streetLights = streetLights;
  }

  apply(hour) {
    const { sunriseHour, sunsetHour } = CityConfig.TIME;
    this.lighting.setHour(hour, sunriseHour, sunsetHour);
    this.environment.setHour(hour);
    const isNight = hour < sunriseHour - 0.3 || hour > sunsetHour + 0.3;
    if (this.streetLights) this.streetLights.setNight(isNight);
    bus.emit('time:change', hour);
  }
}
