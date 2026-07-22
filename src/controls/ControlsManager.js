/**
 * ControlsManager.js
 * -----------------------------------------------------------------------------
 * OrbitControls wrapper with damping and reasonable min/max distances so users
 * can't fly under the terrain or off into infinity.
 *
 * THREE.js NOTE: OrbitControls is *not* in the core three package — it lives
 * under three/examples/jsm.  It's an official add-on maintained by mrdoob.
 */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityConfig } from '../config/CityConfig.js';

export class ControlsManager {
  constructor(camera, domElement) {
    const c = CityConfig.CAMERA;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.8;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = c.minDistance;
    this.controls.maxDistance = c.maxDistance;
    this.controls.maxPolarAngle = c.maxPolarAngle;
    this.controls.target.set(c.target[0], c.target[1], c.target[2]);
    this.controls.update();
  }

  update() { this.controls.update(); }
  dispose() { this.controls.dispose(); }
}
