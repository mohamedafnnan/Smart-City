/**
 * RainEffect.js
 * -----------------------------------------------------------------------------
 * GPU rain via a single BufferGeometry + Points material.
 *
 * We push all raindrops into one draw call.  Each frame we advance the y
 * coordinate on the CPU (Points don't have shaders that own state), and
 * wrap when drops go below ground.  6000 drops is negligible.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export class RainEffect {
  constructor(scene, group) {
    this.scene = scene;
    this.group = group;
    this.enabled = false;

    const count = CityConfig.WEATHER.rainCount;
    const positions = new Float32Array(count * 3);
    const size = CityConfig.CITY_SIZE * 1.5;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * size;
      positions[i * 3 + 1] = Math.random() * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * size;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9ac4e0, size: 0.4, transparent: true, opacity: 0.7,
      depthWrite: false,
    });
    this.points = new THREE.Points(geom, mat);
    this.points.visible = false;
    this.group.add(this.points);
    this._positions = positions;
    this._count = count;
  }

  setEnabled(v) { this.enabled = v; this.points.visible = v; }

  update(delta) {
    if (!this.enabled) return;
    const p = this._positions;
    const speed = 45 * delta;
    for (let i = 0; i < this._count; i++) {
      p[i * 3 + 1] -= speed;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 120;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
