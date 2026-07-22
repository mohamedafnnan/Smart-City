/**
 * IoTProps.js
 * -----------------------------------------------------------------------------
 * Small smart-city props scattered around the city:
 *   - Digital billboards (animated CanvasTexture)
 *   - EV charging stations
 *   - Bus stops
 *   - Trash bins (smart-waste sensors)
 *   - Drone landing pad + hovering drone
 *   - Weather station
 *   - IoT sensor pole
 *   - Trees (INSTANCED)
 */
import * as THREE from 'three';
import { rng } from '../../utils/Random.js';
import { CityConfig } from '../../config/CityConfig.js';

export class IoTProps {
  constructor(iotGroup, vegetationGroup, registry) {
    this.iot = iotGroup;
    this.veg = vegetationGroup;
    this.registry = registry;
    this.billboards = []; // {mat, canvas, ctx, elapsed}
    this.drones = [];     // {group, orbit, elapsed}
  }

  // ============ BILLBOARD ============
  buildBillboard(x, z, rotationY = 0) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    container.rotation.y = rotationY;

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.4 });
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 0.3), poleMat);
    pole.position.y = 3;
    pole.castShadow = true;
    container.add(pole);

    // Animated screen
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 256;
    const ctx = cvs.getContext('2d');
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screenMat = new THREE.MeshBasicMaterial({ map: tex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), screenMat);
    screen.position.set(0, 7.5, 0.1);
    container.add(screen);
    // Back panel
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.7, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x0d1017, roughness: 0.5 })
    );
    back.position.set(0, 7.5, 0);
    container.add(back);

    this.billboards.push({ tex, canvas: cvs, ctx, elapsed: rng.range(0, 5), messageIndex: 0 });
    this.iot.add(container);

    this.registry.register({
      type: 'Digital Billboard', name: `Billboard ${rng.int(100, 999)}`,
      description: 'Programmatic digital-out-of-home unit with live ad rotation.',
      stats: { impressions: `${rng.int(2, 40)}k/day`, brightness: `${rng.int(400, 1200)} nits`, status: 'LIVE' },
      object: container,
    });
    return container;
  }

  updateBillboards(elapsed) {
    for (const b of this.billboards) {
      const dt = elapsed - b.elapsed;
      if (dt < 3.5) continue;
      b.elapsed = elapsed;
      b.messageIndex = (b.messageIndex + 1) % BILLBOARD_MSGS.length;
      this._paintBillboard(b);
    }
  }

  _paintBillboard(b) {
    const ctx = b.ctx;
    const msg = BILLBOARD_MSGS[b.messageIndex];
    ctx.fillStyle = msg.bg;
    ctx.fillRect(0, 0, 512, 256);
    // Accent bar
    ctx.fillStyle = msg.accent;
    ctx.fillRect(0, 0, 512, 12);
    ctx.fillRect(0, 244, 512, 12);
    ctx.fillStyle = msg.fg;
    ctx.font = 'bold 42px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(msg.title, 256, 110);
    ctx.font = '22px Inter, Arial';
    ctx.fillText(msg.sub, 256, 160);
    ctx.font = '16px JetBrains Mono, monospace';
    ctx.fillText(msg.tag, 256, 210);
    b.tex.needsUpdate = true;
  }

  // ============ EV CHARGER ============
  buildEVCharger(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.5, metalness: 0.4 })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    container.add(body);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x0a1a2a })
    );
    screen.position.set(0, 1.3, 0.21);
    container.add(screen);
    // LED
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    led.position.set(0.2, 1.6, 0.21);
    container.add(led);
    this.iot.add(container);
    this.registry.register({
      type: 'EV Charger', name: `EV Charger ${rng.int(10, 99)}`,
      description: 'DC fast-charger 150 kW with contactless payment.',
      stats: { power: '150 kW', sessions24h: rng.int(6, 60), status: 'AVAILABLE' },
      object: container,
    });
    return container;
  }

  // ============ BUS STOP ============
  buildBusStop(x, z, rot = 0) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    container.rotation.y = rot;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.15, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.5, metalness: 0.6 })
    );
    roof.position.y = 2.4;
    roof.castShadow = true;
    container.add(roof);
    for (let i = 0; i < 2; i++) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x333a44, roughness: 0.6 })
      );
      post.position.set(-1.7 + i * 3.4, 1.2, -0.8);
      container.add(post);
    }
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.15, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.85 })
    );
    bench.position.set(0, 0.45, -0.5);
    container.add(bench);
    this.iot.add(container);
    this.registry.register({
      type: 'Bus Stop', name: `Bus Stop ${rng.int(100, 999)}`,
      description: 'Smart bus stop with e-ink schedule display and passenger counter.',
      stats: { nextBus: `${rng.int(1, 12)} min`, riders24h: rng.int(80, 800) },
      object: container,
    });
    return container;
  }

  // ============ DRONE PAD + DRONE ============
  buildDronePad(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.9 })
    );
    pad.position.y = 0.1;
    container.add(pad);
    // H symbol
    const h = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 })
    );
    h.rotation.x = -Math.PI / 2;
    h.position.y = 0.21;
    container.add(h);

    // Drone
    const drone = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.6 })
    );
    drone.add(body);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x111318 })
      );
      arm.position.set(Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35);
      arm.rotation.y = -angle;
      drone.add(arm);
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.02, 12),
        new THREE.MeshBasicMaterial({ color: 0x9ad6ff, transparent: true, opacity: 0.5 })
      );
      rotor.position.set(Math.cos(angle) * 0.55, 0.05, Math.sin(angle) * 0.55);
      drone.add(rotor);
    }
    drone.position.set(0, 6, 0);
    container.add(drone);
    this.drones.push({ group: drone, orbit: rng.range(2.5, 4), elapsed: rng.range(0, 6), radius: rng.range(4, 7) });

    this.iot.add(container);
    this.registry.register({
      type: 'Drone Pad', name: 'Drone Pad Alpha',
      description: 'Autonomous drone landing/charging pad; delivery + inspection.',
      stats: { flights24h: rng.int(20, 100), drone: 'DJI-M300 · ONLINE' },
      object: container,
    });
    return container;
  }

  updateDrones(delta) {
    for (const d of this.drones) {
      d.elapsed += delta;
      const a = d.elapsed / d.orbit;
      d.group.position.x = Math.cos(a) * d.radius;
      d.group.position.z = Math.sin(a) * d.radius;
      d.group.position.y = 6 + Math.sin(d.elapsed * 1.6) * 0.4;
      d.group.rotation.y = -a + Math.PI / 2;
      // Rotor spin — we don't spin individual meshes to keep it cheap,
      // the transparent disc gives the illusion.
    }
  }

  // ============ WEATHER STATION ============
  buildWeatherStation(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x8892a0, roughness: 0.6, metalness: 0.4 })
    );
    pole.position.y = 2;
    container.add(pole);
    // Anemometer cups
    const anem = new THREE.Group();
    anem.position.y = 4.2;
    for (let i = 0; i < 3; i++) {
      const cup = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })
      );
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.03, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
      );
      arm.position.x = 0.25;
      cup.position.set(0.5, 0, 0);
      cup.rotation.z = -Math.PI / 2;
      const armGroup = new THREE.Group();
      armGroup.add(arm); armGroup.add(cup);
      armGroup.rotation.y = (i / 3) * Math.PI * 2;
      anem.add(armGroup);
    }
    container.add(anem);
    this.iot.add(container);
    this.registry.register({
      type: 'Weather Station', name: 'Weather Station #1',
      description: 'Real-time weather telemetry: temp, humidity, wind, pressure.',
      stats: { temp: '24 °C', humidity: '58 %', wind: '3.2 m/s', pressure: '1013 hPa' },
      object: container,
    });
    return { container, anem };
  }

  // ============ IOT SENSOR POLE ============
  buildIoTSensor(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x555b64, roughness: 0.6 })
    );
    pole.position.y = 1.5;
    container.add(pole);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0d1017, roughness: 0.5 })
    );
    box.position.y = 2.9;
    container.add(box);
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    led.position.set(0.15, 3.0, 0.16);
    container.add(led);
    this.iot.add(container);
    this.registry.register({
      type: 'IoT Sensor', name: `Sensor ${rng.int(1000, 9999)}`,
      description: 'Multi-sensor node (air quality, noise, occupancy) → LoRaWAN.',
      stats: { pm25: `${rng.int(4, 60)} µg/m³`, noise: `${rng.int(35, 75)} dB`, battery: `${rng.int(50, 100)} %` },
      object: container,
    });
    return container;
  }

  // ============ SMART TRASH BIN ============
  buildTrashBin(x, z) {
    const container = new THREE.Group();
    container.position.set(x, 0, z);
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 1, 10),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 })
    );
    bin.position.y = 0.5;
    container.add(bin);
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: 0x1e7a4a, roughness: 0.6 })
    );
    lid.position.y = 1.05;
    container.add(lid);
    this.iot.add(container);
    this.registry.register({
      type: 'Smart Bin', name: `Waste Bin ${rng.int(100, 999)}`,
      description: 'Ultrasonic fill-level sensor; auto-dispatch on 80 %.',
      stats: { fill: `${rng.int(10, 90)} %`, last: `${rng.int(1, 20)} h ago` },
      object: container,
    });
    return container;
  }

  // ============ TREES (INSTANCED) ============
  buildTrees(positions) {
    const count = positions.length;
    if (!count) return null;

    const trunkGeom = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6);
    trunkGeom.translate(0, 0.6, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });

    const foliageGeom = new THREE.SphereGeometry(1.1, 8, 6);
    foliageGeom.translate(0, 2.1, 0);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d6a3a, roughness: 0.9 });

    const trunks = new THREE.InstancedMesh(trunkGeom, trunkMat, count);
    const foliage = new THREE.InstancedMesh(foliageGeom, foliageMat, count);
    trunks.castShadow = false;
    foliage.castShadow = true;

    const dummy = new THREE.Object3D();
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    for (let i = 0; i < count; i++) {
      const p = positions[i];
      const s = rng.range(0.85, 1.35);
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.y = rng.range(0, Math.PI * 2);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      foliage.setMatrixAt(i, dummy.matrix);

      // Slight per-tree colour variation → richer look
      const g = 0.35 + rng.range(-0.08, 0.08);
      const r = 0.12 + rng.range(-0.04, 0.04);
      const b = 0.18 + rng.range(-0.04, 0.04);
      colorAttr.setXYZ(i, r, g, b);
    }
    trunks.instanceMatrix.needsUpdate = true;
    foliage.instanceMatrix.needsUpdate = true;

    this.veg.add(trunks);
    this.veg.add(foliage);
    return { trunks, foliage };
  }
}

const BILLBOARD_MSGS = [
  { title: 'GO GREEN', sub: 'Ride shared. Save the city.', tag: '#SmartMobility', bg: '#0d3b1a', fg: '#e6ffe6', accent: '#2ecc71' },
  { title: 'NEXUS 5G', sub: 'Fibre-fast wireless everywhere.', tag: 'nexus.city/5g', bg: '#0a1a3a', fg: '#a8e0ff', accent: '#00e5ff' },
  { title: 'ART FEST', sub: 'Downtown · This weekend', tag: 'nexus.art/2026', bg: '#3b0d3a', fg: '#ffd6f8', accent: '#ff4dc4' },
  { title: 'EV CHARGE', sub: 'Free until 6 PM at Bay 7', tag: '#GoElectric', bg: '#3a2c0d', fg: '#fff0c0', accent: '#ffbe45' },
  { title: 'AIR: GOOD', sub: 'PM2.5: 12 µg/m³ · Enjoy the day', tag: 'live.airnexus', bg: '#0d2b3a', fg: '#cff0ff', accent: '#00b7ff' },
];
