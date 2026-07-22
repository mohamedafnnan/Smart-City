/**
 * MathUtils.js — small numeric helpers shared across the codebase.
 * Kept intentionally tiny; heavy math lives in Three.js itself.
 */

export const TAU = Math.PI * 2;

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
export function degToRad(d) { return (d * Math.PI) / 180; }
export function radToDeg(r) { return (r * 180) / Math.PI; }
export function mapRange(v, a1, a2, b1, b2) {
  return b1 + ((v - a1) * (b2 - b1)) / (a2 - a1);
}
export function distance2D(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}
