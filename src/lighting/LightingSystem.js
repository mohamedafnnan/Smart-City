/**
 * LightingSystem.js
 * -----------------------------------------------------------------------------
 * Three-light rig:
 *   1. DirectionalLight  — the sun (casts shadows)
 *   2. HemisphereLight   — sky + ground bounce (cheap ambient with hue split)
 *   3. AmbientLight      — flat fill to prevent pitch-black shadow interiors
 *
 * Why not a full path-tracer / IBL?  We want 60 FPS on integrated GPUs, and
 * a directional-only shadow pass is by far the cheapest way to get depth cues.
 * The look is tuned via ACES tone mapping in the renderer.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export class LightingSystem {
  constructor(scene, group) {
    const L = CityConfig.LIGHTING;

    // ---------- Ambient ----------
    this.ambient = new THREE.AmbientLight(0xffffff, L.ambientIntensity);
    group.add(this.ambient);

    // ---------- Hemisphere ----------
    this.hemi = new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity);
    this.hemi.position.set(0, 200, 0);
    group.add(this.hemi);

    // ---------- Sun ----------
    this.sun = new THREE.DirectionalLight(L.sunColor, L.sunIntensity);
    this.sun.position.set(120, 200, 90);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(
      CityConfig.RENDERER.shadowMapSize,
      CityConfig.RENDERER.shadowMapSize
    );
    const s = L.shadowCameraSize;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 700;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    group.add(this.sun);
    group.add(this.sun.target);

    // Visualiser sphere for the sun (small emissive ball).
    this.sunBall = new THREE.Mesh(
      new THREE.SphereGeometry(6, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
    );
    this.sunBall.position.copy(this.sun.position);
    group.add(this.sunBall);
  }

  /**
   * Position the sun based on hour of day (0..24).
   * We map the day arc onto a semicircle over the city.
   * @param {number} hour
   * @param {number} sunrise
   * @param {number} sunset
   */
  setHour(hour, sunrise = 6, sunset = 19) {
    const dist = CityConfig.LIGHTING.sunDistance;
    // t goes 0..1 during the day and clamps at night
    let t;
    if (hour < sunrise) t = 0;
    else if (hour > sunset) t = 1;
    else t = (hour - sunrise) / (sunset - sunrise);

    // Sun follows a semi-circle from East (t=0) through South-zenith (t=0.5) to West (t=1)
    const angle = Math.PI * (1 - t); // 180° at sunrise → 0° at sunset (west)
    const y = Math.sin(angle) * dist;
    const x = Math.cos(angle) * dist;
    const z = Math.cos(angle) * 0.35 * dist;

    this.sun.position.set(x, Math.max(y, -20), z);
    this.sunBall.position.copy(this.sun.position);

    // Fade intensity around dawn/dusk
    const isNight = hour < sunrise - 0.5 || hour > sunset + 0.5;
    const twilight = (hour < sunrise + 1 && hour > sunrise - 1) ||
                     (hour > sunset - 1 && hour < sunset + 1);

    this.sun.intensity = isNight ? 0 : (twilight ? 0.9 : 2.5);
    this.hemi.intensity = isNight ? 0.15 : 0.55;
    this.ambient.intensity = isNight ? 0.10 : 0.35;

    // Warm at twilight, neutral midday
    const warmth = twilight ? 0xff9a55 : 0xfff4d6;
    this.sun.color.setHex(warmth);
    this.sunBall.visible = !isNight;
  }
}
