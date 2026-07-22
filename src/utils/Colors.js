/**
 * Colors.js — palette helpers.  Keeps Three.js Color allocation localised.
 */
import * as THREE from 'three';

const _c = new THREE.Color();

/** Cache colour objects so we don't allocate one per material creation. */
const cache = new Map();
export function color(hex) {
  if (!cache.has(hex)) cache.set(hex, new THREE.Color(hex));
  return cache.get(hex);
}

/** Linear interpolate between two hex colours, returns a shared THREE.Color. */
export function lerpColor(a, b, t) {
  const ca = color(a), cb = color(b);
  _c.copy(ca).lerp(cb, t);
  return _c;
}
