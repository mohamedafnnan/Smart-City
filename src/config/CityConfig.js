/**
 * CityConfig.js
 * -----------------------------------------------------------------------------
 * Central declarative configuration for the whole simulation.
 *
 * DESIGN RATIONALE
 * ----------------
 * We store *every* magic number in one place so the visual designer can tune
 * the city without touching engineering code.  All builders read from here,
 * which means a single edit rebuilds the deterministic city on the next load.
 *
 * The city sits on a square plot of `CITY_SIZE` metres, sub-divided into a
 * `GRID` of blocks separated by roads.  Each block is assigned a district
 * type (residential / commercial / industrial / park / civic / utility).
 */

export const CityConfig = {
  // -------------------------------------------------- WORLD SIZE
  CITY_SIZE: 400,           // total city footprint (metres)
  GRID: 8,                  // 8×8 blocks
  ROAD_WIDTH: 10,
  SIDEWALK_WIDTH: 1.2,

  // -------------------------------------------------- RENDERER
  RENDERER: {
    antialias: true,
    powerPreference: 'high-performance',
    pixelRatioCap: 2,
    toneMappingExposure: 1.05,
    shadowMapSize: 2048,
  },

  // -------------------------------------------------- CAMERA
  CAMERA: {
    fov: 50,
    near: 0.5,
    far: 1200,
    initialPosition: [180, 140, 180],
    target: [0, 0, 0],
    minDistance: 20,
    maxDistance: 600,
    maxPolarAngle: Math.PI / 2 - 0.05,
  },

  // -------------------------------------------------- LIGHTING
  LIGHTING: {
    ambientIntensity: 0.35,
    hemiSky: 0x9ec6ff,
    hemiGround: 0x2a2f38,
    hemiIntensity: 0.55,
    sunColor: 0xfff4d6,
    sunIntensity: 2.5,
    sunDistance: 260,
    shadowCameraSize: 260,
  },

  // -------------------------------------------------- COLORS
  COLORS: {
    skyDay: 0x89bffb,
    skyNight: 0x03060d,
    fogDay: 0xcfd9e6,
    fogNight: 0x05070c,
    ground: 0x1e2a1a,
    road: 0x22262d,
    roadLine: 0xf5d76e,
    sidewalk: 0x8a8f97,
    water: 0x1e5a80,
    accentCyan: 0x00e5ff,
    accentMagenta: 0x7c4dff,
    accentGreen: 0x2ecc71,
    accentOrange: 0xff9800,
    accentRed: 0xff3b30,
  },

  // -------------------------------------------------- BUILDING TYPES
  BUILDINGS: {
    residential: {
      minH: 8, maxH: 24, baseColors: [0xd6c1a2, 0xbfa887, 0xa79274, 0xdbc9b0],
      roofColors: [0x8b3f2a, 0x5c3d2e, 0x715142],
      windowRatio: 0.35, windowColor: 0x1a2634, litColor: 0xfff2a8,
    },
    commercial: {
      minH: 40, maxH: 130, baseColors: [0x2b3844, 0x1e2a35, 0x364752, 0x4a5a68],
      windowRatio: 0.65, windowColor: 0x0d1a26, litColor: 0xa8dfff,
    },
    industrial: {
      minH: 10, maxH: 22, baseColors: [0x6b6f76, 0x4a4d52, 0x8a8d92],
      windowRatio: 0.15, windowColor: 0x151a20, litColor: 0xffb060,
    },
    civic: {
      minH: 12, maxH: 22, baseColors: [0xd8dde3, 0xc2c8d0, 0xe8ecf1],
      windowRatio: 0.45, windowColor: 0x162535, litColor: 0xfff0c0,
    },
  },

  // -------------------------------------------------- TRAFFIC
  TRAFFIC: {
    vehicleCount: 80,
    minSpeed: 4,
    maxSpeed: 14,
    laneOffset: 2.2,
    safeDistance: 5,
    signalCycleSec: 12,
  },

  // -------------------------------------------------- TREES / PROPS
  PROPS: {
    treesPerBlock: 24,
    lampSpacing: 18,
    trashSpacing: 60,
  },

  // -------------------------------------------------- WEATHER
  WEATHER: {
    modes: ['clear', 'cloudy', 'rain'],
    rainCount: 6000,
  },

  // -------------------------------------------------- DAY/NIGHT
  TIME: {
    startHour: 12,
    speed: 0.02,       // simulated hours per real second when auto-play is on
    sunriseHour: 6,
    sunsetHour: 19,
  },
};

/**
 * Deterministic layout of the 8×8 grid.  Row 0 = north.
 * Types: R=residential, C=commercial, I=industrial, P=park, V=civic, U=utility
 * The layout intentionally places industrial to the east, commercial downtown,
 * residential around, and civic/parks distributed for visual interest.
 */
export const CITY_LAYOUT = [
  ['R','R','R','V','C','C','I','I'],
  ['R','P','R','C','C','C','I','I'],
  ['R','R','R','C','V','C','I','U'],
  ['V','R','C','C','C','C','I','I'],
  ['R','R','C','C','C','V','I','U'],
  ['R','P','R','V','C','C','I','I'],
  ['R','R','R','R','C','C','U','I'],
  ['R','R','V','R','R','C','I','I'],
];
