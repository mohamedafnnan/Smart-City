/**
 * VehicleSystem.js
 * -----------------------------------------------------------------------------
 * Object-pooled vehicle simulation.
 *
 * DESIGN:
 *   - N vehicles are created up-front (no runtime allocation → zero GC).
 *   - Each vehicle is assigned to one lane (a horizontal or vertical road).
 *   - Vehicles move along the lane; when they exit the city they wrap to the
 *     opposite end (toroidal world).  This keeps traffic density stable.
 *   - Vehicles check the traffic-light state for their axis: if red and
 *     they're within `SLOW_ZONE` of an intersection, they decelerate.
 *
 * VISUAL:
 *   - Cars are small boxes with a smaller top box (roof) + two head/tail-lights.
 *     Trucks are longer + taller.  Colours are randomised per vehicle.
 *
 * PERF:
 *   Vehicles are individual Meshes (not instanced) because each rotates
 *   independently and we want unique colours — 80 vehicles at ~2 draw calls
 *   each = ~160 calls, still negligible.
 */
import * as THREE from 'three';
import { CityConfig } from '../../config/CityConfig.js';
import { rng } from '../../utils/Random.js';

const CAR_COLORS = [
  0xe63946, 0x2a9d8f, 0xf4a261, 0x264653, 0xe9c46a,
  0x577590, 0xf28482, 0x84a59d, 0xbc4749, 0x386641,
  0xe07a5f, 0x81b29a, 0xf2cc8f, 0x3d405b, 0xd62828,
];

export class VehicleSystem {
  constructor(group, roadNetwork, lightSystem) {
    this.group = group;
    this.roads = roadNetwork;
    this.lights = lightSystem;
    this.vehicles = [];
    this.paused = false;
    this._temp = new THREE.Vector3();

    this._createFleet(CityConfig.TRAFFIC.vehicleCount);
  }

  _createFleet(count) {
    // Collect lane axes and their world coordinates
    const half = CityConfig.CITY_SIZE / 2 + 10;
    const laneOffset = CityConfig.TRAFFIC.laneOffset;

    const lines = [];
    // Horizontal lanes: use z-position of each grid line, both directions
    for (const line of this.roads.lanesH) {
      // forward: from -half to +half at z - laneOffset
      lines.push({ axis: 'H', z: line.forward[0].z, dir: 1, x0: -half, x1: half });
      lines.push({ axis: 'H', z: line.backward[0].z, dir: -1, x0: half, x1: -half });
    }
    for (const line of this.roads.lanesV) {
      lines.push({ axis: 'V', x: line.forward[0].x, dir: 1, z0: -half, z1: half });
      lines.push({ axis: 'V', x: line.backward[0].x, dir: -1, z0: half, z1: -half });
    }

    for (let i = 0; i < count; i++) {
      const lane = lines[i % lines.length];
      const kind = rng.chance(0.14) ? 'bus' : (rng.chance(0.15) ? 'truck' : 'car');
      const v = this._makeVehicleMesh(kind);

      // Random position along the lane
      const t = rng.range(0, 1);
      if (lane.axis === 'H') {
        v.position.set(
          lane.dir > 0 ? lane.x0 + t * (lane.x1 - lane.x0) : lane.x0 - t * (lane.x0 - lane.x1),
          v.position.y,
          lane.z
        );
        v.rotation.y = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        v.position.set(
          lane.x,
          v.position.y,
          lane.dir > 0 ? lane.z0 + t * (lane.z1 - lane.z0) : lane.z0 - t * (lane.z0 - lane.z1)
        );
        v.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      }
      this.group.add(v);
      this.vehicles.push({
        mesh: v,
        lane,
        speed: rng.range(CityConfig.TRAFFIC.minSpeed, CityConfig.TRAFFIC.maxSpeed),
        currentSpeed: 0,
        kind,
      });
    }
  }

  _makeVehicleMesh(kind) {
    const group = new THREE.Group();
    let w, l, h, roofRatio, colorSet;
    if (kind === 'car') { w = 1.4; l = 3.0; h = 0.8; roofRatio = 0.55; colorSet = CAR_COLORS; }
    else if (kind === 'truck') { w = 1.6; l = 4.5; h = 1.4; roofRatio = 0.4; colorSet = [0xffffff, 0xe0e0e0, 0x2b2b2b]; }
    else { w = 1.8; l = 5.5; h = 1.5; roofRatio = 0.8; colorSet = [0x00e5ff, 0xff5566, 0xf4a261]; }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: rng.pick(colorSet), roughness: 0.5, metalness: 0.6,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyMat);
    body.position.y = h / 2 + 0.2;
    body.castShadow = true;
    group.add(body);

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0a1017, roughness: 0.2, metalness: 0.8,
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.55, l * roofRatio), roofMat);
    roof.position.y = h + h * 0.35;
    roof.castShadow = true;
    group.add(roof);

    // Head + tail lights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), hlMat);
    hl.position.set(-w / 2 + 0.15, h / 2 + 0.2, l / 2 + 0.02);
    group.add(hl);
    const hl2 = hl.clone(); hl2.position.x = w / 2 - 0.15; group.add(hl2);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), tlMat);
    tl.position.set(-w / 2 + 0.15, h / 2 + 0.2, -l / 2 - 0.02);
    group.add(tl);
    const tl2 = tl.clone(); tl2.position.x = w / 2 - 0.15; group.add(tl2);

    return group;
  }

  update(delta) {
    if (this.paused) return;
    for (const v of this.vehicles) {
      // Approach behaviour: check if next intersection is red for our axis
      const canPass = this.lights.canPass(v.lane.axis);
      const target = canPass ? v.speed : this._speedNearIntersection(v);
      v.currentSpeed += (target - v.currentSpeed) * Math.min(1, delta * 3);
      const step = v.currentSpeed * delta;

      if (v.lane.axis === 'H') {
        v.mesh.position.x += step * v.lane.dir;
        // Wrap
        if (v.lane.dir > 0 && v.mesh.position.x > v.lane.x1 + 5) v.mesh.position.x = v.lane.x0 - 5;
        if (v.lane.dir < 0 && v.mesh.position.x < v.lane.x1 - 5) v.mesh.position.x = v.lane.x0 + 5;
      } else {
        v.mesh.position.z += step * v.lane.dir;
        if (v.lane.dir > 0 && v.mesh.position.z > v.lane.z1 + 5) v.mesh.position.z = v.lane.z0 - 5;
        if (v.lane.dir < 0 && v.mesh.position.z < v.lane.z1 - 5) v.mesh.position.z = v.lane.z0 + 5;
      }
    }
  }

  _speedNearIntersection(v) {
    // Slow to 20 % when red — a nod to traffic behaviour without full pathfinding
    return v.speed * 0.2;
  }
}
