/**
 * Utilities.js
 * -----------------------------------------------------------------------------
 * Solar farm, wind turbines, water tower, power substation, 5G tower.
 *
 * Each utility is a procedural mesh registered in the Registry so users can
 * click it and read its live stats.  The wind-turbine blades and 5G tower
 * beacon are animated in `update(dt)`.
 */
import * as THREE from 'three';
import { CityConfig } from '../../config/CityConfig.js';
import { rng } from '../../utils/Random.js';

export class Utilities {
  constructor(group, registry) {
    this.group = group;
    this.registry = registry;
    this.turbines = []; // {blades, spin}
    this.beacons  = []; // {mesh, base, elapsed}
  }

  // ============ SOLAR FARM ============
  buildSolarFarm(x, z, panelsX = 6, panelsZ = 4) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0a1a3a, roughness: 0.25, metalness: 0.6, emissive: 0x0a1533, emissiveIntensity: 0.15,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a8f97, roughness: 0.6, metalness: 0.6 });

    for (let i = 0; i < panelsX; i++) {
      for (let j = 0; j < panelsZ; j++) {
        const px = (i - (panelsX - 1) / 2) * 4;
        const pz = (j - (panelsZ - 1) / 2) * 3.2;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), frameMat);
        post.position.set(px, 0.6, pz);
        container.add(post);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.8), panelMat);
        panel.position.set(px, 1.3, pz);
        panel.rotation.x = -Math.PI / 6;
        panel.castShadow = true;
        container.add(panel);
      }
    }
    this.group.add(container);

    this.registry.register({
      type: 'Solar Farm', name: 'Solar Farm A',
      description: 'Photovoltaic array feeding the district substation with real-time MPPT.',
      stats: { panels: panelsX * panelsZ, capacity: `${panelsX * panelsZ * 0.4} kWp`, output: `${(panelsX * panelsZ * 0.34).toFixed(1)} kW` },
      object: container,
    });
    return container;
  }

  // ============ WIND TURBINE ============
  buildWindTurbine(x, z, height = 22) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.5, metalness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, height, 14), poleMat);
    pole.position.y = height / 2;
    pole.castShadow = true;
    container.add(pole);

    const nacelle = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.5, metalness: 0.3 })
    );
    nacelle.position.set(0, height, 0.5);
    nacelle.castShadow = true;
    container.add(nacelle);

    // Blade assembly
    const blades = new THREE.Group();
    blades.position.set(0, height, 1.4);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 })
      );
      blade.position.y = 4;
      blade.castShadow = true;
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI * 2) / 3;
      arm.add(blade);
      blades.add(arm);
    }
    container.add(blades);

    this.group.add(container);
    this.turbines.push({ blades, spin: rng.range(1.2, 2.4) });

    this.registry.register({
      type: 'Wind Turbine', name: `Wind Turbine ${rng.int(10, 99)}`,
      description: '2 MW class turbine feeding the grid via inverter with SCADA monitoring.',
      stats: { capacity: '2.0 MW', output: `${rng.int(600, 1900)} kW`, rpm: rng.int(11, 18) },
      object: container,
    });
    return container;
  }

  // ============ WATER TOWER ============
  buildWaterTower(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x555b64, roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 6), legMat);
      leg.position.set(Math.cos(angle) * 2, 5, Math.sin(angle) * 2);
      leg.rotation.z = Math.cos(angle) * 0.08;
      leg.rotation.x = -Math.sin(angle) * 0.08;
      leg.castShadow = true;
      container.add(leg);
    }
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 4, 20),
      new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.5, metalness: 0.4 })
    );
    tank.position.y = 12;
    tank.castShadow = true;
    container.add(tank);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(3, 1.8, 20),
      new THREE.MeshStandardMaterial({ color: 0x4a90c2, roughness: 0.5, metalness: 0.3 })
    );
    cap.position.y = 14.9;
    cap.castShadow = true;
    container.add(cap);

    this.group.add(container);
    this.registry.register({
      type: 'Water Tower', name: 'Water Tower Central',
      description: 'Elevated potable-water reserve; pressure & chlorine telemetry every 30 s.',
      stats: { capacity: '500 kL', level: `${rng.int(60, 95)} %`, pressure: `${rng.int(3, 6)} bar` },
      object: container,
    });
    return container;
  }

  // ============ POWER SUBSTATION ============
  buildSubstation(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);

    // Concrete pad
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a7f86, roughness: 0.9 })
    );
    pad.position.y = 0.1;
    container.add(pad);

    // Transformers
    const trMat = new THREE.MeshStandardMaterial({ color: 0x606670, roughness: 0.6, metalness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 2), trMat);
      tr.position.set(-4 + i * 3.5, 1.3, -2);
      tr.castShadow = true;
      container.add(tr);
    }

    // Pylons
    const pyMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const py = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 8, 6), pyMat);
      py.position.set(-5 + i * 3.3, 4, 3);
      py.castShadow = true;
      container.add(py);
    }

    this.group.add(container);
    this.registry.register({
      type: 'Substation', name: 'Substation SS-1',
      description: 'Distribution substation converting HV incoming to 11 kV feeders.',
      stats: { load: `${rng.int(40, 92)} %`, feeders: 8, faults24h: 0 },
      object: container,
    });
    return container;
  }

  // ============ 5G / COMM TOWER ============
  build5GTower(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0xdd2222, roughness: 0.5, metalness: 0.3 });
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 30, 8), trussMat);
    main.position.y = 15;
    main.castShadow = true;
    container.add(main);

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.3 - i * 0.25, 0.08, 8, 12),
        trussMat
      );
      ring.position.y = 8 + i * 6;
      ring.rotation.x = Math.PI / 2;
      container.add(ring);
    }

    // Beacon
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1.5, roughness: 0.3,
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), beaconMat);
    beacon.position.y = 31;
    container.add(beacon);
    this.beacons.push({ mat: beaconMat, base: 1.5, elapsed: rng.range(0, 6) });

    this.group.add(container);
    this.registry.register({
      type: '5G Tower', name: `5G Tower ${rng.pick(['N','S','E','W'])}-${rng.int(1, 9)}`,
      description: 'mmWave + sub-6 GHz 5G base station covering 800 m radius.',
      stats: { subscribers: rng.int(1400, 4200), throughput: `${rng.int(400, 1200)} Mbps`, status: 'OPERATIONAL' },
      object: container,
    });
    return container;
  }

  update(delta) {
    for (const t of this.turbines) t.blades.rotation.z += t.spin * delta;
    for (const b of this.beacons) {
      b.elapsed += delta;
      b.mat.emissiveIntensity = b.base * (0.5 + 0.5 * Math.sin(b.elapsed * 3));
    }
  }
}
