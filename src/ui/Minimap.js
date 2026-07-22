/**
 * Minimap.js
 * -----------------------------------------------------------------------------
 * Top-down 2D minimap rendered to a Canvas.  Draws:
 *   - City extent (fog rectangle)
 *   - Road grid (grey lines)
 *   - Buildings as coloured dots per district
 *   - Camera cone
 *
 * Uses the registry so it stays in sync with whatever is in the scene.
 */
import { CityConfig } from '../config/CityConfig.js';

export class Minimap {
  constructor(registry, cameraMgr) {
    this.registry = registry;
    this.cam = cameraMgr;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._elapsed = 0;
  }

  update(delta) {
    this._elapsed += delta;
    if (this._elapsed < 0.15) return;
    this._elapsed = 0;
    this._draw();
  }

  _draw() {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const size = CityConfig.CITY_SIZE;
    const scale = w / (size * 1.15);
    const cx = w / 2, cy = h / 2;
    const worldToMap = (x, z) => [cx + x * scale, cy + z * scale];

    ctx.fillStyle = '#0a1017';
    ctx.fillRect(0, 0, w, h);

    // City extent
    ctx.strokeStyle = '#2a3140';
    ctx.strokeRect(cx - (size/2)*scale, cy - (size/2)*scale, size*scale, size*scale);

    // Road grid
    ctx.strokeStyle = '#3a4250';
    ctx.lineWidth = 0.5;
    const grid = CityConfig.GRID;
    for (let i = 0; i <= grid; i++) {
      const t = -size/2 + (i * size / grid);
      const [x1, y1] = worldToMap(-size/2, t);
      const [x2, y2] = worldToMap(size/2, t);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = worldToMap(t, -size/2);
      const [x4, y4] = worldToMap(t, size/2);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }

    // Dots per registry entry
    const colors = {
      Residential: '#d6c1a2',
      Commercial: '#00e5ff',
      Industrial: '#8a8d92',
      Hospital: '#ff3b30',
      'Fire Station': '#ff5b30',
      'Police Station': '#2456d6',
      School: '#ffb020',
      'Solar Farm': '#ffd54d',
      'Wind Turbine': '#7cd8ff',
      'Water Tower': '#5aa9ff',
      Substation: '#ffb020',
      '5G Tower': '#ff3b30',
      Park: '#2e6b2b',
    };
    for (const entry of this.registry.all()) {
      const c = colors[entry.type]; if (!c) continue;
      const p = entry.object; if (!p) continue;
      const wx = p.position.x, wz = p.position.z;
      const [mx, my] = worldToMap(wx, wz);
      ctx.fillStyle = c;
      ctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // Camera arrow
    const cam = this.cam.camera;
    const [px, py] = worldToMap(cam.position.x, cam.position.z);
    // Direction to look-at target (approximate)
    const targ = { x: 0, z: 0 };
    const dx = targ.x - cam.position.x, dz = targ.z - cam.position.z;
    const angle = Math.atan2(dz, dx);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
