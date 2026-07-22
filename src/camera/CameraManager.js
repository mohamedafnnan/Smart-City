/**
 * CameraManager.js
 * -----------------------------------------------------------------------------
 * Owns the PerspectiveCamera and provides preset transitions.
 *
 * WHY PERSPECTIVE (vs Orthographic):
 *   The Smart City is a spatial 3D showcase; orthographic loses depth cues
 *   that make skyscraper heights readable.  Perspective + moderate FOV (50°)
 *   avoids the fish-eye look of high-FOV cameras.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { CityConfig } from '../config/CityConfig.js';

export class CameraManager {
  constructor() {
    const c = CityConfig.CAMERA;
    this.camera = new THREE.PerspectiveCamera(
      c.fov, window.innerWidth / window.innerHeight, c.near, c.far
    );
    this.camera.position.fromArray(c.initialPosition);
    this.camera.lookAt(new THREE.Vector3().fromArray(c.target));

    this.presets = {
      overview:  { pos: [180, 140, 180], target: [0, 0, 0] },
      downtown:  { pos: [30, 60, 60],    target: [0, 20, 0] },
      residential: { pos: [-140, 40, -80], target: [-120, 4, -80] },
      industrial:  { pos: [140, 50, -20],  target: [140, 5, -20] },
      utility:     { pos: [180, 60, 120],  target: [160, 6, 120] },
      birdseye:    { pos: [0, 350, 0.01],  target: [0, 0, 0] },
      street:      { pos: [10, 3, 40],     target: [30, 3, 60] },
    };
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** Animate to a named preset. */
  goTo(presetName, { duration = 1.6, controls = null } = {}) {
    const p = this.presets[presetName];
    if (!p) return;
    this.flyTo(p.pos, p.target, { duration, controls });
  }

  /** Animate to explicit position + look-at target. */
  flyTo(pos, target, { duration = 1.6, controls = null, ease = 'power3.inOut' } = {}) {
    const cam = this.camera;
    const targetVec = controls ? controls.target : new THREE.Vector3();

    gsap.to(cam.position, { x: pos[0], y: pos[1], z: pos[2], duration, ease });
    gsap.to(targetVec, {
      x: target[0], y: target[1], z: target[2], duration, ease,
      onUpdate: () => {
        if (!controls) cam.lookAt(targetVec);
        else controls.update();
      },
    });
  }
}
