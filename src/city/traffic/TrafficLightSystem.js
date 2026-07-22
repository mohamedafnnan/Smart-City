/**
 * TrafficLightSystem.js
 * -----------------------------------------------------------------------------
 * Manages a state machine per intersection with cyclic Red/Yellow/Green phases.
 * Vehicles query `TrafficLightSystem.canPass(x, z, direction)` to decide
 * whether to slow/stop when approaching an intersection.
 *
 * We use one *global* phase so the whole city breathes together — cheaper
 * to compute and visually more pleasing than random per-intersection phases.
 */
import * as THREE from 'three';
import { CityConfig } from '../../config/CityConfig.js';

const STATE_GREEN_H = 0;
const STATE_YELLOW_H = 1;
const STATE_GREEN_V = 2;
const STATE_YELLOW_V = 3;

const PHASE_DURATIONS = [5.0, 1.2, 5.0, 1.2]; // seconds

export class TrafficLightSystem {
  constructor(group, intersections) {
    this.group = group;
    this.intersections = intersections;
    this.state = STATE_GREEN_H;
    this.timeInState = 0;

    // Visualise as small emissive posts at each intersection corner.
    this.headMatH = new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: 0x00ff44, emissiveIntensity: 1.2, roughness: 0.5,
    });
    this.headMatV = new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: 0xff2222, emissiveIntensity: 1.2, roughness: 0.5,
    });

    // One instanced mesh per direction for cheap rendering.
    const geom = new THREE.SphereGeometry(0.28, 10, 8);
    this.hMesh = new THREE.InstancedMesh(geom, this.headMatH, intersections.length);
    this.vMesh = new THREE.InstancedMesh(geom, this.headMatV, intersections.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < intersections.length; i++) {
      const p = intersections[i];
      // Head that faces horizontal traffic (controlling H flow)
      dummy.position.set(p.x + 5.6, 3.5, p.z + 5.6);
      dummy.updateMatrix();
      this.hMesh.setMatrixAt(i, dummy.matrix);
      // Head for vertical flow
      dummy.position.set(p.x - 5.6, 3.5, p.z - 5.6);
      dummy.updateMatrix();
      this.vMesh.setMatrixAt(i, dummy.matrix);
    }
    this.hMesh.instanceMatrix.needsUpdate = true;
    this.vMesh.instanceMatrix.needsUpdate = true;
    group.add(this.hMesh);
    group.add(this.vMesh);
  }

  update(delta) {
    this.timeInState += delta;
    if (this.timeInState >= PHASE_DURATIONS[this.state]) {
      this.timeInState = 0;
      this.state = (this.state + 1) % 4;
      this._applyColors();
    }
  }

  _applyColors() {
    switch (this.state) {
      case STATE_GREEN_H:
        this.headMatH.emissive.setHex(0x00ff44);
        this.headMatV.emissive.setHex(0xff2222);
        break;
      case STATE_YELLOW_H:
        this.headMatH.emissive.setHex(0xffcc00);
        this.headMatV.emissive.setHex(0xff2222);
        break;
      case STATE_GREEN_V:
        this.headMatH.emissive.setHex(0xff2222);
        this.headMatV.emissive.setHex(0x00ff44);
        break;
      case STATE_YELLOW_V:
        this.headMatH.emissive.setHex(0xff2222);
        this.headMatV.emissive.setHex(0xffcc00);
        break;
    }
  }

  /**
   * Vehicles use this to decide whether to slow before an intersection.
   * @param {'H'|'V'} axis
   * @returns {boolean}
   */
  canPass(axis) {
    if (axis === 'H') return this.state === STATE_GREEN_H;
    return this.state === STATE_GREEN_V;
  }
}
