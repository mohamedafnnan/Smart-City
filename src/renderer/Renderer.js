/**
 * Renderer.js
 * -----------------------------------------------------------------------------
 * Factory for the WebGLRenderer.
 *
 * KEY DECISIONS
 *  - `antialias: true`               → free MSAA (no post-process AA needed).
 *  - `powerPreference: 'high-performance'` → hint to pick discrete GPU on laptops.
 *  - ACES tone-mapping               → cinematic look with PBR values > 1.
 *  - `outputColorSpace = SRGB`       → correct gamma; textures decode linearly.
 *  - `shadowMap.type = PCFSoftShadow`→ soft-edged, hides shadow-map jaggies.
 *  - Pixel-ratio capped at 2         → prevents 4k screens from crushing perf.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({
    canvas,
    antialias: CityConfig.RENDERER.antialias,
    powerPreference: CityConfig.RENDERER.powerPreference,
    alpha: false,
    stencil: false,
    depth: true,
  });

  r.setPixelRatio(Math.min(window.devicePixelRatio, CityConfig.RENDERER.pixelRatioCap));
  r.setSize(window.innerWidth, window.innerHeight, false);

  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = CityConfig.RENDERER.toneMappingExposure;

  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.shadowMap.autoUpdate = true;

  r.setClearColor(new THREE.Color(CityConfig.COLORS.skyDay));

  return r;
}
