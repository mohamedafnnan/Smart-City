/**
 * SceneManager.js
 * -----------------------------------------------------------------------------
 * Owns the root scene graph.  We create semantic groups so systems can
 * toggle their whole subtree via `group.visible = false` — no per-mesh loops.
 *
 * WHY GROUPS:
 *   THREE.Group is a lightweight Object3D used purely as a container.  Setting
 *   `visible = false` on a group short-circuits traversal for all descendants,
 *   which is the cheapest way to implement layer toggles.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CityConfig.COLORS.skyDay);
    this.scene.fog = new THREE.Fog(CityConfig.COLORS.fogDay, 250, 800);

    // Semantic groups (order matters only for readability, not rendering)
    this.groups = {
      environment: new THREE.Group(),
      lighting: new THREE.Group(),
      ground: new THREE.Group(),
      roads: new THREE.Group(),
      buildings: new THREE.Group(),
      utilities: new THREE.Group(),
      services: new THREE.Group(),
      iot: new THREE.Group(),
      vegetation: new THREE.Group(),
      streetLights: new THREE.Group(),
      vehicles: new THREE.Group(),
      traffic: new THREE.Group(),
      effects: new THREE.Group(),
      helpers: new THREE.Group(),
    };

    for (const key of Object.keys(this.groups)) {
      this.groups[key].name = `Group:${key}`;
      this.scene.add(this.groups[key]);
    }
  }

  /** Convenience — retrieve a group by name. */
  group(name) { return this.groups[name]; }

  setLayerVisible(name, visible) {
    const g = this.groups[name];
    if (g) g.visible = visible;
  }
}
