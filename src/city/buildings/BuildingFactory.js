/**
 * BuildingFactory.js
 * -----------------------------------------------------------------------------
 * Procedurally generates buildings for a given district type.
 *
 * WHY PROCEDURAL:
 *  - Zero asset dependencies (no GLTF fetch → no CORS / offline issues).
 *  - Infinite variety with a seeded RNG → visually rich yet reproducible.
 *  - Buildings become interactive registry entries automatically.
 *
 * MATERIAL STRATEGY:
 *  - MeshStandardMaterial (PBR) for the shell.
 *  - Windows are painted as an emissive stripe pattern via CanvasTexture
 *    generated once and re-used across many buildings → 1 texture, N meshes.
 */
import * as THREE from 'three';
import { CityConfig } from '../../config/CityConfig.js';
import { rng } from '../../utils/Random.js';

// -----------------------------------------------------------------------------
// Reusable window texture cache (per building type + lit state).
// -----------------------------------------------------------------------------
const _texCache = new Map();
function makeWindowTexture(rows, cols, litRatio, baseColor, windowColor, litColor) {
  const key = `${rows}x${cols}-${litRatio.toFixed(2)}-${baseColor}-${windowColor}-${litColor}`;
  if (_texCache.has(key)) return _texCache.get(key);

  const cvs = document.createElement('canvas');
  cvs.width = 256; cvs.height = 256;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#' + baseColor.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 256, 256);

  const wc = '#' + windowColor.toString(16).padStart(6, '0');
  const lc = '#' + litColor.toString(16).padStart(6, '0');

  const cellW = 256 / cols;
  const cellH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() < litRatio;
      ctx.fillStyle = lit ? lc : wc;
      ctx.fillRect(c * cellW + 2, r * cellH + 3, cellW - 4, cellH - 6);
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  _texCache.set(key, tex);
  return tex;
}

// -----------------------------------------------------------------------------
export class BuildingFactory {
  constructor() {
    /** shared roof material — we mutate colour per instance via `.clone()` for variance */
    this._sharedRoofMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  }

  /**
   * @param {'residential'|'commercial'|'industrial'|'civic'} type
   * @param {number} x world X (block centre)
   * @param {number} z world Z
   * @param {number} maxFootprint metres available
   * @returns { object: THREE.Object3D, meta: {...} }
   */
  create(type, x, z, maxFootprint) {
    switch (type) {
      case 'residential': return this._residential(x, z, maxFootprint);
      case 'commercial':  return this._commercial(x, z, maxFootprint);
      case 'industrial':  return this._industrial(x, z, maxFootprint);
      case 'civic':       return this._civic(x, z, maxFootprint);
      default:            return this._residential(x, z, maxFootprint);
    }
  }

  // ---------- Residential (short, pitched roof) ----------
  _residential(x, z, maxFootprint) {
    const cfg = CityConfig.BUILDINGS.residential;
    const w = rng.range(6, Math.min(11, maxFootprint));
    const d = rng.range(6, Math.min(11, maxFootprint));
    const h = rng.range(cfg.minH, cfg.maxH);
    const baseColor = rng.pick(cfg.baseColors);
    const roofColor = rng.pick(cfg.roofColors);

    const group = new THREE.Group();
    // Shell
    const shellGeom = new THREE.BoxGeometry(w, h, d);
    const rows = Math.max(2, Math.floor(h / 3));
    const cols = Math.max(2, Math.floor(w / 2.5));
    const tex = makeWindowTexture(rows, cols, cfg.windowRatio, baseColor, cfg.windowColor, cfg.litColor);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, map: tex, roughness: 0.85, metalness: 0.02,
    });
    const shell = new THREE.Mesh(shellGeom, shellMat);
    shell.position.y = h / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    // Pitched roof
    const roofGeom = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 3.5, 4);
    roofGeom.rotateY(Math.PI / 4);
    const roofMat = this._sharedRoofMat.clone();
    roofMat.color.setHex(roofColor);
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = h + 1.5;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(x, 0, z);
    return {
      object: group,
      meta: {
        type: 'Residential',
        name: `Residential Block ${rng.int(100, 999)}`,
        description: 'Family housing with rooftop solar readiness and smart meters.',
        stats: {
          floors: Math.max(1, Math.floor(h / 3)),
          occupants: rng.int(4, 28),
          energy: `${rng.int(5, 45)} kWh/day`,
        },
      },
    };
  }

  // ---------- Commercial (tall skyscraper) ----------
  _commercial(x, z, maxFootprint) {
    const cfg = CityConfig.BUILDINGS.commercial;
    const w = rng.range(9, Math.min(15, maxFootprint));
    const d = rng.range(9, Math.min(15, maxFootprint));
    const h = rng.range(cfg.minH, cfg.maxH);
    const baseColor = rng.pick(cfg.baseColors);

    const group = new THREE.Group();
    const rows = Math.max(6, Math.floor(h / 3.2));
    const cols = Math.max(3, Math.floor(w / 2.2));
    const tex = makeWindowTexture(rows, cols, cfg.windowRatio, baseColor, cfg.windowColor, cfg.litColor);

    // Main tower
    const towerGeom = new THREE.BoxGeometry(w, h, d);
    const towerMat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.35, metalness: 0.55, envMapIntensity: 0.6,
    });
    const tower = new THREE.Mesh(towerGeom, towerMat);
    tower.position.y = h / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    // Setback penthouse
    if (rng.chance(0.6)) {
      const ph = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.6, 3, d * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1a232c, roughness: 0.6, metalness: 0.3 })
      );
      ph.position.y = h + 1.5;
      ph.castShadow = true;
      group.add(ph);

      // Antenna
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.14, 5, 6),
        new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.8 })
      );
      ant.position.y = h + 5.5;
      group.add(ant);
    }

    group.position.set(x, 0, z);
    return {
      object: group,
      meta: {
        type: 'Commercial',
        name: `Tower ${rng.pick(['Vantage','Meridian','Apex','Zenith','Skyline','Horizon','Summit','Nexus'])} ${rng.int(1, 99)}`,
        description: 'Class-A commercial tower with adaptive HVAC and rooftop micro-turbines.',
        stats: {
          floors: Math.floor(h / 3.2),
          companies: rng.int(4, 22),
          occupants: rng.int(400, 3200),
          energy: `${rng.int(300, 2200)} kWh/day`,
        },
      },
    };
  }

  // ---------- Industrial (wide, low, flat roof + vents) ----------
  _industrial(x, z, maxFootprint) {
    const cfg = CityConfig.BUILDINGS.industrial;
    const w = rng.range(12, Math.min(20, maxFootprint));
    const d = rng.range(12, Math.min(20, maxFootprint));
    const h = rng.range(cfg.minH, cfg.maxH);
    const baseColor = rng.pick(cfg.baseColors);

    const group = new THREE.Group();
    const rows = Math.max(1, Math.floor(h / 4));
    const cols = Math.max(3, Math.floor(w / 3));
    const tex = makeWindowTexture(rows, cols, cfg.windowRatio, baseColor, cfg.windowColor, cfg.litColor);
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.2 })
    );
    shell.position.y = h / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    // Vent / chimney stack
    for (let i = 0; i < rng.int(1, 3); i++) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, h * 0.6, 12),
        new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.7, metalness: 0.5 })
      );
      stack.position.set(rng.range(-w/3, w/3), h + h * 0.3, rng.range(-d/3, d/3));
      stack.castShadow = true;
      group.add(stack);
    }

    group.position.set(x, 0, z);
    return {
      object: group,
      meta: {
        type: 'Industrial',
        name: `Facility ${rng.pick(['Alpha','Beta','Gamma','Delta','Omega','Sigma'])}-${rng.int(10, 99)}`,
        description: 'Automated manufacturing plant with waste-heat recovery.',
        stats: {
          shifts: rng.int(1, 3),
          output: `${rng.int(20, 800)} units/hr`,
          energy: `${rng.int(1200, 6500)} kWh/day`,
        },
      },
    };
  }

  // ---------- Civic (hospital / school / fire / police / stadium) ----------
  _civic(x, z, maxFootprint) {
    const cfg = CityConfig.BUILDINGS.civic;
    const civicRoles = ['Hospital', 'School', 'Fire Station', 'Police Station', 'City Hall', 'Library'];
    const role = rng.pick(civicRoles);
    const w = rng.range(10, Math.min(16, maxFootprint));
    const d = rng.range(10, Math.min(16, maxFootprint));
    const h = rng.range(cfg.minH, cfg.maxH);
    const baseColor = rng.pick(cfg.baseColors);

    const group = new THREE.Group();
    const rows = Math.max(3, Math.floor(h / 3));
    const cols = Math.max(3, Math.floor(w / 2.4));
    const tex = makeWindowTexture(rows, cols, cfg.windowRatio, baseColor, cfg.windowColor, cfg.litColor);

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.1 })
    );
    shell.position.y = h / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    // Emblem plate colour based on role
    const emblemColor = role === 'Hospital' ? 0xff3b30
                      : role === 'Fire Station' ? 0xff5b30
                      : role === 'Police Station' ? 0x2456d6
                      : role === 'School' ? 0xffb020
                      : 0x00e5ff;
    const emblem = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.45, 1.4, 0.15),
      new THREE.MeshStandardMaterial({ color: emblemColor, emissive: emblemColor, emissiveIntensity: 0.5, roughness: 0.4 })
    );
    emblem.position.set(0, h * 0.9, d / 2 + 0.08);
    group.add(emblem);

    group.position.set(x, 0, z);
    return {
      object: group,
      meta: {
        type: role,
        name: `${role} #${rng.int(1, 12)}`,
        description: `${role} providing critical civic services with 24/7 IoT monitoring.`,
        stats: {
          staff: rng.int(20, 400),
          capacity: rng.int(50, 900),
          energy: `${rng.int(200, 1400)} kWh/day`,
        },
      },
    };
  }
}
