/**
 * CityBuilder.js
 * -----------------------------------------------------------------------------
 * Top-level composer: reads the declarative CITY_LAYOUT grid and populates
 * every block with the appropriate content.  Also decides where to place the
 * utility clusters, drone pad, weather station, IoT sensors, billboards, and
 * trees.
 */
import * as THREE from 'three';
import { CityConfig, CITY_LAYOUT } from '../config/CityConfig.js';
import { rng } from '../utils/Random.js';
import { BuildingFactory } from './buildings/BuildingFactory.js';
import { Utilities } from './utilities/Utilities.js';
import { IoTProps } from './iot/IoTProps.js';

export class CityBuilder {
  constructor(sceneManager, registry) {
    this.sceneManager = sceneManager;
    this.registry = registry;
    this.factory = new BuildingFactory();
    this.utilities = new Utilities(sceneManager.group('utilities'), registry);
    this.iot = new IoTProps(
      sceneManager.group('iot'),
      sceneManager.group('vegetation'),
      registry
    );
  }

  build() {
    const { CITY_SIZE, GRID, ROAD_WIDTH } = CityConfig;
    const half = CITY_SIZE / 2;
    const cell = CITY_SIZE / GRID;

    const buildingsGroup = this.sceneManager.group('buildings');
    const servicesGroup  = this.sceneManager.group('services');

    // Collect prop positions for later
    const treePositions = [];
    const iotSensorPositions = [];
    const trashPositions = [];

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const code = CITY_LAYOUT[row][col];
        // Block centre
        const cx = -half + col * cell + cell / 2;
        const cz = -half + row * cell + cell / 2;
        const usable = cell - ROAD_WIDTH - 2;

        switch (code) {
          case 'R': this._fillResidential(cx, cz, usable, buildingsGroup, treePositions); break;
          case 'C': this._fillCommercial(cx, cz, usable, buildingsGroup, treePositions); break;
          case 'I': this._fillIndustrial(cx, cz, usable, buildingsGroup, treePositions); break;
          case 'V': this._fillCivic(cx, cz, usable, servicesGroup, treePositions); break;
          case 'P': this._fillPark(cx, cz, usable, treePositions); break;
          case 'U': this._fillUtility(cx, cz, usable, treePositions); break;
        }

        // Sprinkle IoT sensors sparsely
        if (rng.chance(0.35)) {
          iotSensorPositions.push({ x: cx + rng.range(-usable/2, usable/2), z: cz + rng.range(-usable/2, usable/2) });
        }
        if (rng.chance(0.4)) {
          trashPositions.push({ x: cx + rng.range(-usable/2, usable/2), z: cz + rng.range(-usable/2, usable/2) });
        }
      }
    }

    // ---------- Signature utilities (one-per-city) ----------
    // Solar farm somewhere in a utility block already handled by _fillUtility.
    // Add a weather station near downtown.
    this.iot.buildWeatherStation(0, 0);

    // Digital billboards along the main east-west road
    for (let i = 0; i < 4; i++) {
      const bx = -half + 40 + i * 90;
      this.iot.buildBillboard(bx, -CityConfig.ROAD_WIDTH / 2 - 4, 0);
    }

    // Drone pad on a rooftop-like open plot
    this.iot.buildDronePad(-half + 30, half - 30);

    // Instanced trees
    this.iot.buildTrees(treePositions);

    // IoT sensor poles (individual)
    for (const p of iotSensorPositions) this.iot.buildIoTSensor(p.x, p.z);

    // Smart trash bins
    for (const p of trashPositions) this.iot.buildTrashBin(p.x, p.z);

    // A few EV chargers near commercial blocks
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      this.iot.buildEVCharger(Math.cos(ang) * 45, Math.sin(ang) * 45);
    }
    // Bus stops around the outer ring
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      this.iot.buildBusStop(Math.cos(ang) * 150, Math.sin(ang) * 150, -ang);
    }

    return {
      treePositions,
      utilitiesUpdater: (dt) => this.utilities.update(dt),
      iotUpdater: (dt, elapsed) => {
        this.iot.updateDrones(dt);
        this.iot.updateBillboards(elapsed);
      },
    };
  }

  // --------------------------------------------------------------------------
  _fillResidential(cx, cz, usable, group, treeOut) {
    const perAxis = 2;
    const step = usable / perAxis;
    for (let a = 0; a < perAxis; a++) {
      for (let b = 0; b < perAxis; b++) {
        const jitterX = rng.range(-1.5, 1.5);
        const jitterZ = rng.range(-1.5, 1.5);
        const x = cx + (a - (perAxis - 1) / 2) * step + jitterX;
        const z = cz + (b - (perAxis - 1) / 2) * step + jitterZ;
        const { object, meta } = this.factory.create('residential', x, z, step - 3);
        group.add(object);
        this.registry.register({ ...meta, object });
      }
    }
    // Trees around edges
    for (let i = 0; i < CityConfig.PROPS.treesPerBlock / 2; i++) {
      treeOut.push({
        x: cx + rng.range(-usable / 2 + 1, usable / 2 - 1),
        z: cz + rng.range(-usable / 2 + 1, usable / 2 - 1),
      });
    }
  }

  _fillCommercial(cx, cz, usable, group, treeOut) {
    // 1 or 2 tall towers with plazas
    const towers = rng.chance(0.5) ? 2 : 1;
    for (let i = 0; i < towers; i++) {
      const offX = towers === 2 ? (i === 0 ? -usable/4 : usable/4) : 0;
      const { object, meta } = this.factory.create('commercial', cx + offX, cz, usable / (towers + 0.3));
      group.add(object);
      this.registry.register({ ...meta, object });
    }
    // Fewer trees downtown
    for (let i = 0; i < 5; i++) {
      treeOut.push({
        x: cx + rng.range(-usable / 2, usable / 2),
        z: cz + rng.range(-usable / 2, usable / 2),
      });
    }
  }

  _fillIndustrial(cx, cz, usable, group, treeOut) {
    const { object, meta } = this.factory.create('industrial', cx, cz, usable - 4);
    group.add(object);
    this.registry.register({ ...meta, object });
    // Sparse trees around the fence line
    for (let i = 0; i < 4; i++) {
      treeOut.push({
        x: cx + rng.range(-usable / 2, usable / 2),
        z: cz + rng.range(-usable / 2, usable / 2),
      });
    }
  }

  _fillCivic(cx, cz, usable, group, treeOut) {
    const { object, meta } = this.factory.create('civic', cx, cz, usable - 2);
    group.add(object);
    this.registry.register({ ...meta, object });
    for (let i = 0; i < 10; i++) {
      treeOut.push({
        x: cx + rng.range(-usable / 2, usable / 2),
        z: cz + rng.range(-usable / 2, usable / 2),
      });
    }
  }

  _fillPark(cx, cz, usable, treeOut) {
    // Grass patch — colour blob on the ground
    const g = this.sceneManager.group('ground');
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(usable, usable, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x2e6b2b, roughness: 0.95 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(cx, 0.03, cz);
    grass.receiveShadow = true;
    g.add(grass);

    // Fountain: cylinder + water disc
    const fountain = new THREE.Group();
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.5, 20),
      new THREE.MeshStandardMaterial({ color: 0xc8ced6, roughness: 0.7 })
    );
    rim.position.y = 0.25;
    fountain.add(rim);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(2.85, 20),
      new THREE.MeshStandardMaterial({ color: 0x2ea5d6, roughness: 0.15, metalness: 0.5 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.51;
    fountain.add(water);
    fountain.position.set(cx, 0, cz);
    g.add(fountain);

    for (let i = 0; i < CityConfig.PROPS.treesPerBlock; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(5, usable / 2 - 1);
      treeOut.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
    }

    this.registry.register({
      type: 'Park', name: `Central Park ${rng.int(1, 9)}`,
      description: 'Public green space with pollinator plots and cooling shade canopy.',
      stats: { trees: CityConfig.PROPS.treesPerBlock, area: `${usable * usable} m²` },
      object: fountain,
    });
  }

  _fillUtility(cx, cz, usable, treeOut) {
    // Randomly pick a utility to build here
    const roll = rng.next();
    if (roll < 0.35) {
      this.utilities.buildSolarFarm(cx, cz);
    } else if (roll < 0.65) {
      // Cluster of wind turbines
      const count = rng.int(2, 3);
      for (let i = 0; i < count; i++) {
        this.utilities.buildWindTurbine(
          cx + rng.range(-usable / 3, usable / 3),
          cz + rng.range(-usable / 3, usable / 3)
        );
      }
    } else if (roll < 0.85) {
      this.utilities.buildSubstation(cx, cz);
    } else {
      this.utilities.build5GTower(cx, cz);
    }
    // Water tower randomly on one utility block
    if (rng.chance(0.25)) this.utilities.buildWaterTower(cx + rng.range(-6, 6), cz + rng.range(-6, 6));
    // A few trees
    for (let i = 0; i < 5; i++) {
      treeOut.push({
        x: cx + rng.range(-usable / 2, usable / 2),
        z: cz + rng.range(-usable / 2, usable / 2),
      });
    }
  }
}
