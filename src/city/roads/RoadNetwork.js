/**
 * RoadNetwork.js
 * -----------------------------------------------------------------------------
 * Builds the entire road grid, sidewalks, and lane markings.
 *
 * ALGORITHM:
 *   The city is a `GRID × GRID` array of blocks. We compute the block width
 *   (`blockSize`) so blocks + roads exactly fill `CITY_SIZE`. Then we lay one
 *   strip of road between every two adjacent blocks in both axes.  Yellow
 *   dashed centre-lines are drawn as thin planes on top.
 *
 * PATHS FOR VEHICLES:
 *   The road centres also become the "lane" polylines that the vehicle AI
 *   drives along.  We store them so the traffic system doesn't have to
 *   re-derive them.
 */
import * as THREE from 'three';
import { CityConfig } from '../../config/CityConfig.js';

export class RoadNetwork {
  constructor(group) {
    this.group = group;
    this.roadMat = new THREE.MeshStandardMaterial({
      color: CityConfig.COLORS.road, roughness: 0.9, metalness: 0.0,
    });
    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: CityConfig.COLORS.sidewalk, roughness: 0.85,
    });
    this.lineMat = new THREE.MeshBasicMaterial({ color: CityConfig.COLORS.roadLine });
    this.crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });

    /** Lane polylines. Each is an array of {x,z}. */
    this.lanesH = [];  // horizontal (running along X)
    this.lanesV = [];  // vertical   (running along Z)
    /** Intersection centres — needed by the traffic-light system. */
    this.intersections = [];
    /** Lamp positions along road edges. */
    this.lampPositions = [];

    this._build();
  }

  _build() {
    const { CITY_SIZE, GRID, ROAD_WIDTH, SIDEWALK_WIDTH } = CityConfig;
    const half = CITY_SIZE / 2;
    const cell = CITY_SIZE / GRID;

    // Road z-positions for horizontal roads = each grid line.
    // We have GRID+1 lines (0..GRID).
    const linePositions = [];
    for (let i = 0; i <= GRID; i++) linePositions.push(-half + i * cell);

    // ---------- Horizontal roads (extend along X) ----------
    for (const z of linePositions) {
      // Road strip
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(CITY_SIZE, ROAD_WIDTH),
        this.roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.01, z);
      road.receiveShadow = true;
      this.group.add(road);

      // Sidewalks (both sides)
      for (const sign of [-1, 1]) {
        const sw = new THREE.Mesh(
          new THREE.PlaneGeometry(CITY_SIZE, SIDEWALK_WIDTH),
          this.sidewalkMat
        );
        sw.rotation.x = -Math.PI / 2;
        sw.position.set(0, 0.02, z + sign * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2));
        sw.receiveShadow = true;
        this.group.add(sw);
      }

      // Dashed centre line (small planes every 4m)
      const dashCount = Math.floor(CITY_SIZE / 6);
      for (let i = 0; i < dashCount; i++) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(2.5, 0.18),
          this.lineMat
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(-half + i * 6 + 3, 0.03, z);
        this.group.add(dash);
      }

      // Lane polyline (for vehicles) — offset by lane width
      const laneOffset = CityConfig.TRAFFIC.laneOffset;
      this.lanesH.push({
        forward: [{ x: -half - 10, z: z - laneOffset }, { x: half + 10, z: z - laneOffset }],
        backward: [{ x: half + 10, z: z + laneOffset }, { x: -half - 10, z: z + laneOffset }],
      });

      // Lamp positions along this road (both sides)
      for (let i = 0; i < GRID; i++) {
        const x = -half + i * cell + cell / 2;
        this.lampPositions.push({ x, z: z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 0.4, rot: 0 });
        this.lampPositions.push({ x, z: z - ROAD_WIDTH / 2 - SIDEWALK_WIDTH - 0.4, rot: Math.PI });
      }
    }

    // ---------- Vertical roads (extend along Z) ----------
    for (const x of linePositions) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, CITY_SIZE),
        this.roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.011, 0); // very slightly above H roads to avoid z-fight
      road.receiveShadow = true;
      this.group.add(road);

      for (const sign of [-1, 1]) {
        const sw = new THREE.Mesh(
          new THREE.PlaneGeometry(SIDEWALK_WIDTH, CITY_SIZE),
          this.sidewalkMat
        );
        sw.rotation.x = -Math.PI / 2;
        sw.position.set(x + sign * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), 0.02, 0);
        sw.receiveShadow = true;
        this.group.add(sw);
      }

      const dashCount = Math.floor(CITY_SIZE / 6);
      for (let i = 0; i < dashCount; i++) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.18, 2.5),
          this.lineMat
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.03, -half + i * 6 + 3);
        this.group.add(dash);
      }

      const laneOffset = CityConfig.TRAFFIC.laneOffset;
      this.lanesV.push({
        forward:  [{ x: x + laneOffset, z: -half - 10 }, { x: x + laneOffset, z: half + 10 }],
        backward: [{ x: x - laneOffset, z: half + 10 },  { x: x - laneOffset, z: -half - 10 }],
      });
    }

    // ---------- Intersection centres ----------
    for (const x of linePositions) {
      for (const z of linePositions) {
        this.intersections.push({ x, z });
      }
    }

    // ---------- Crosswalks at every intersection ----------
    for (const isec of this.intersections) {
      for (let i = 0; i < 6; i++) {
        // 4 crosswalk strips per intersection would be ideal; we do 2 axes
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 3),
          this.crosswalkMat
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(isec.x + (i - 2.5) * 0.9, 0.04, isec.z + ROAD_WIDTH / 2 + 0.6);
        this.group.add(stripe);
      }
    }
  }
}
