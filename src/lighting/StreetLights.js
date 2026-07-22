/**
 * StreetLights.js
 * -----------------------------------------------------------------------------
 * Places instanced lamp-posts along the road network.
 *
 * WHY INSTANCED:
 *   A city has hundreds of identical lamps.  A regular Mesh per lamp would
 *   cost hundreds of draw calls.  THREE.InstancedMesh submits one draw call
 *   and passes per-instance transforms as a mat4 attribute — the entire
 *   population becomes GPU-side.
 *
 * We split the post (pole) and head (emissive bulb) into two InstancedMeshes
 * so the head can turn emissive at night without lighting the pole.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export class StreetLights {
  constructor(scene, group, roadPositions) {
    this.group = group;
    const count = roadPositions.length;
    if (!count) return;

    const poleGeom = new THREE.CylinderGeometry(0.08, 0.12, 4, 6);
    poleGeom.translate(0, 2, 0);
    const armGeom = new THREE.BoxGeometry(0.9, 0.06, 0.06);
    armGeom.translate(0.45, 4, 0);
    const bulbGeom = new THREE.SphereGeometry(0.18, 10, 8);
    bulbGeom.translate(0.9, 4, 0);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.4 });
    const bulbMatOff = new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: 0x000000, roughness: 0.5,
    });
    // We keep a single material and toggle emissive.
    this.bulbMat = bulbMatOff;

    this.polesMesh = new THREE.InstancedMesh(poleGeom, poleMat, count);
    this.armsMesh  = new THREE.InstancedMesh(armGeom, poleMat, count);
    this.bulbsMesh = new THREE.InstancedMesh(bulbGeom, this.bulbMat, count);
    this.polesMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const p = roadPositions[i];
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.y = p.rot || 0;
      dummy.updateMatrix();
      this.polesMesh.setMatrixAt(i, dummy.matrix);
      this.armsMesh.setMatrixAt(i, dummy.matrix);
      this.bulbsMesh.setMatrixAt(i, dummy.matrix);
    }
    this.polesMesh.instanceMatrix.needsUpdate = true;
    this.armsMesh.instanceMatrix.needsUpdate = true;
    this.bulbsMesh.instanceMatrix.needsUpdate = true;

    group.add(this.polesMesh, this.armsMesh, this.bulbsMesh);
  }

  /** Toggle emissive glow based on hour. */
  setNight(isNight) {
    if (!this.bulbMat) return;
    if (isNight) {
      this.bulbMat.emissive.setHex(0xffcc55);
      this.bulbMat.emissiveIntensity = 1.6;
      this.bulbMat.color.setHex(0xffe0a0);
    } else {
      this.bulbMat.emissive.setHex(0x000000);
      this.bulbMat.emissiveIntensity = 0;
      this.bulbMat.color.setHex(0x222222);
    }
  }
}
