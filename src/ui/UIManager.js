/**
 * UIManager.js
 * -----------------------------------------------------------------------------
 * Owns non-dashboard DOM: layer toggles, camera preset buttons, top-bar
 * actions, info card, settings modal, keyboard shortcuts, FPS/draw counters.
 */
import { bus } from '../core/EventBus.js';

const LAYERS = [
  { id: 'buildings',    label: 'Buildings',    icon: '🏙️',  default: true },
  { id: 'services',     label: 'Civic Services', icon: '🏥', default: true },
  { id: 'utilities',    label: 'Utilities',    icon: '⚡',  default: true },
  { id: 'iot',          label: 'IoT & Props',  icon: '📡',  default: true },
  { id: 'vegetation',   label: 'Vegetation',   icon: '🌳',  default: true },
  { id: 'roads',        label: 'Roads',        icon: '🛣️',  default: true },
  { id: 'streetLights', label: 'Street Lights', icon: '💡', default: true },
  { id: 'vehicles',     label: 'Vehicles',     icon: '🚗',  default: true },
  { id: 'traffic',      label: 'Traffic Lights', icon: '🚦', default: true },
  { id: 'effects',      label: 'Effects',      icon: '✨',  default: true },
];

const PRESETS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'birdseye',    label: 'Birdseye' },
  { id: 'downtown',    label: 'Downtown' },
  { id: 'residential', label: 'Residential' },
  { id: 'industrial',  label: 'Industrial' },
  { id: 'utility',     label: 'Utility' },
  { id: 'street',      label: 'Street' },
];

export class UIManager {
  constructor({ sceneManager, cameraMgr, controlsMgr, cinematic, weather, dayNight, time }) {
    this.sceneManager = sceneManager;
    this.cameraMgr = cameraMgr;
    this.controlsMgr = controlsMgr;
    this.cinematic = cinematic;
    this.weather = weather;
    this.dayNight = dayNight;
    this.time = time;

    this._buildLayers();
    this._buildPresets();
    this._bindTopActions();
    this._bindInfoCard();
    this._bindShortcuts();
    this._bindTimeSlider();
    this._buildSettings();

    this._fpsEl = document.getElementById('fps-counter');
    this._drawEl = document.getElementById('draw-calls');
    this._triEl = document.getElementById('tri-count');
    this._timeEl = document.getElementById('sim-time');

    bus.on('object:select', (e) => this._showInfo(e));
    bus.on('object:deselect', () => this._hideInfo());
  }

  _buildLayers() {
    const list = document.getElementById('layer-list');
    for (const layer of LAYERS) {
      const li = document.createElement('li');
      li.className = 'layer-item';
      li.innerHTML = `
        <label>
          <input type="checkbox" data-layer="${layer.id}" ${layer.default ? 'checked' : ''}>
          <span class="layer-icon">${layer.icon}</span>
          <span class="layer-name">${layer.label}</span>
        </label>
      `;
      list.appendChild(li);
      li.querySelector('input').addEventListener('change', (e) => {
        this.sceneManager.setLayerVisible(layer.id, e.target.checked);
        bus.emit('layer:toggle', { id: layer.id, visible: e.target.checked });
      });
    }
  }

  _buildPresets() {
    const el = document.getElementById('camera-presets');
    for (const p of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        this.cameraMgr.goTo(p.id, { controls: this.controlsMgr.controls });
      });
      el.appendChild(btn);
    }
  }

  _bindTopActions() {
    document.querySelectorAll('[data-action]').forEach((btn) => {
      const action = btn.dataset.action;
      btn.addEventListener('click', () => {
        switch (action) {
          case 'focus-city':
            this.cameraMgr.goTo('overview', { controls: this.controlsMgr.controls });
            break;
          case 'cinematic':
            this.cinematic.start();
            break;
          case 'daynight':
            // Snap to night or day
            const target = this.time.simHour > 6 && this.time.simHour < 20 ? 22 : 12;
            this._animateHour(target);
            break;
          case 'weather':
            this.weather.cycle();
            break;
          case 'settings':
            document.getElementById('settings-modal').classList.remove('hidden');
            break;
          case 'close-settings':
            document.getElementById('settings-modal').classList.add('hidden');
            break;
        }
      });
    });
  }

  _bindInfoCard() {
    document.querySelector('[data-action="close-info"]').addEventListener('click', () => {
      this._hideInfo();
      bus.emit('object:deselect');
    });
  }

  _bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      switch (e.key.toLowerCase()) {
        case 'd': {
          const target = this.time.simHour > 6 && this.time.simHour < 20 ? 22 : 12;
          this._animateHour(target); break;
        }
        case 'c': this.cinematic.start(); break;
        case 'w': this.weather.cycle(); break;
        case 'r': this.cameraMgr.goTo('overview', { controls: this.controlsMgr.controls }); break;
        case 't': {
          const el = document.querySelector('[data-layer="traffic"]');
          if (el) { el.checked = !el.checked; el.dispatchEvent(new Event('change')); }
          break;
        }
      }
    });
  }

  _bindTimeSlider() {
    const slider = document.getElementById('time-slider');
    slider.value = this.time.simHour;
    slider.addEventListener('input', (e) => {
      const h = parseFloat(e.target.value);
      this.time.setHour(h);
      this.dayNight.apply(h);
    });
  }

  _animateHour(target) {
    const start = this.time.simHour;
    const dur = 0.9;
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / (dur * 1000));
      const eased = t * t * (3 - 2 * t);
      const h = start + (target - start) * eased;
      this.time.setHour(h);
      this.dayNight.apply(h);
      document.getElementById('time-slider').value = h;
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  _buildSettings() {
    const body = document.getElementById('settings-body');
    body.innerHTML = `
      <div class="setting-row">
        <label>Auto-advance time
          <input type="checkbox" id="s-auto-time">
        </label>
      </div>
      <div class="setting-row">
        <label>Time speed
          <input type="range" min="0.005" max="0.2" step="0.005" value="0.02" id="s-time-speed">
        </label>
      </div>
      <div class="setting-row">
        <label>Show helpers
          <input type="checkbox" id="s-helpers">
        </label>
      </div>
      <div class="setting-row">
        <label>Weather mode
          <select id="s-weather">
            <option value="clear">Clear</option>
            <option value="cloudy">Cloudy</option>
            <option value="rain">Rain</option>
          </select>
        </label>
      </div>
    `;
    body.querySelector('#s-auto-time').addEventListener('change', (e) => {
      this.time.autoAdvance = e.target.checked;
    });
    body.querySelector('#s-time-speed').addEventListener('input', (e) => {
      this.time.simSpeed = parseFloat(e.target.value);
    });
    body.querySelector('#s-weather').addEventListener('change', (e) => {
      this.weather.set(e.target.value);
    });
    body.querySelector('#s-helpers').addEventListener('change', (e) => {
      this.sceneManager.setLayerVisible('helpers', e.target.checked);
    });
  }

  _showInfo(entry) {
    const card = document.getElementById('info-card');
    document.getElementById('info-title').textContent = entry.name;
    document.getElementById('info-subtitle').textContent = entry.type;
    document.getElementById('info-description').textContent = entry.description || '';
    const iconMap = {
      Residential: '🏘️', Commercial: '🏢', Industrial: '🏭',
      Hospital: '🏥', School: '🏫', 'Fire Station': '🚒', 'Police Station': '🚓',
      'City Hall': '🏛️', Library: '📚',
      'Solar Farm': '☀️', 'Wind Turbine': '🌬️', 'Water Tower': '💧',
      Substation: '⚡', '5G Tower': '📡',
      'Digital Billboard': '📺', 'EV Charger': '🔌', 'Bus Stop': '🚌',
      'Drone Pad': '🚁', 'Weather Station': '🌤️', 'IoT Sensor': '📶',
      'Smart Bin': '🗑️', Park: '🌳',
    };
    document.getElementById('info-icon').textContent = iconMap[entry.type] || '📍';

    const stats = entry.stats || {};
    const html = Object.entries(stats).map(([k, v]) =>
      `<div class="stat-pill"><span>${k}</span><b>${v}</b></div>`
    ).join('');
    document.getElementById('info-stats').innerHTML = html;
    card.classList.remove('hidden');
  }

  _hideInfo() {
    document.getElementById('info-card').classList.add('hidden');
  }

  updateStats(fps, renderer, hour) {
    if (this._fpsEl) this._fpsEl.textContent = Math.round(fps);
    if (this._drawEl) this._drawEl.textContent = renderer.info.render.calls;
    if (this._triEl) this._triEl.textContent = renderer.info.render.triangles.toLocaleString();
    if (this._timeEl) this._timeEl.textContent = this._fmtHour(hour);
  }

  _fmtHour(h) {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
}
