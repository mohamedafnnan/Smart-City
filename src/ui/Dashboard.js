/**
 * Dashboard.js
 * -----------------------------------------------------------------------------
 * Right-sidebar KPI dashboard.  Each metric is rendered as a card containing
 *   - a label + value
 *   - a sparkline canvas (last 32 samples)
 *
 * The `_tick(simulatedSeconds, hour, weather)` function produces plausible,
 * time-of-day-aware synthetic values every 1 s so the dashboard feels alive.
 */
import { bus } from '../core/EventBus.js';
import { rng } from '../utils/Random.js';

const METRICS = [
  { id: 'traffic',   label: 'Traffic Density', unit: '%',       color: '#ff8f4d', range: [30, 90],  base: 55, dayBump: 20 },
  { id: 'power',     label: 'Power Consumption', unit: 'MW',   color: '#00e5ff', range: [40, 180], base: 90, dayBump: 40 },
  { id: 'solar',     label: 'Solar Generation', unit: 'MW',    color: '#ffd54d', range: [0, 80],   base: 0, sunDriven: true },
  { id: 'wind',      label: 'Wind Generation', unit: 'MW',     color: '#7cd8ff', range: [5, 45],   base: 20 },
  { id: 'water',     label: 'Water Usage', unit: 'kL/h',       color: '#5aa9ff', range: [80, 320], base: 180, dayBump: 60 },
  { id: 'air',       label: 'Air Quality (PM2.5)', unit: 'µg', color: '#7fd18c', range: [4, 90],   base: 18 },
  { id: 'noise',     label: 'Noise Level', unit: 'dB',         color: '#c07dff', range: [35, 75],  base: 55, dayBump: 10 },
  { id: 'waste',     label: 'Waste Fill Avg', unit: '%',       color: '#e0e070', range: [10, 90],  base: 42 },
  { id: 'parking',   label: 'Parking Free', unit: '%',         color: '#4dffb2', range: [10, 95],  base: 60 },
  { id: 'alerts',    label: 'Active Alerts', unit: '',         color: '#ff5a5a', range: [0, 5],    base: 1, step: 0.5 },
  { id: 'weather',   label: 'Temperature', unit: '°C',         color: '#ff9d4d', range: [12, 32],  base: 22, sunDriven: true },
  { id: 'iot',       label: 'IoT Online', unit: '%',           color: '#a8ffb0', range: [95, 100], base: 98 },
  { id: 'network',   label: 'Network Load', unit: '%',         color: '#00c8ff', range: [20, 88],  base: 45, dayBump: 25 },
];

export class Dashboard {
  constructor() {
    this.grid = document.getElementById('dashboard-grid');
    this.alertFeed = document.getElementById('alert-feed');
    this.cards = new Map();
    this.history = new Map();
    this.alerts = [];
    this._elapsed = 0;
    this._hour = 12;
    this._weather = 'clear';

    for (const m of METRICS) {
      this.history.set(m.id, new Array(32).fill(m.base));
      this._createCard(m);
    }

    bus.on('time:change', (h) => { this._hour = h; });
    bus.on('weather:change', (w) => { this._weather = w; });
  }

  _createCard(metric) {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `
      <div class="kpi-head">
        <span class="kpi-label">${metric.label}</span>
      </div>
      <div class="kpi-body">
        <span class="kpi-value" id="kpi-${metric.id}-val">--</span>
        <span class="kpi-unit">${metric.unit}</span>
      </div>
      <canvas class="kpi-spark" id="kpi-${metric.id}-cvs" width="200" height="34"></canvas>
    `;
    this.grid.appendChild(card);
    this.cards.set(metric.id, {
      metric,
      valEl: card.querySelector(`#kpi-${metric.id}-val`),
      canvas: card.querySelector(`#kpi-${metric.id}-cvs`),
    });
  }

  _sunFactor(hour) {
    // 0 at night, 1 at solar noon
    if (hour < 6 || hour > 20) return 0;
    return Math.sin(((hour - 6) / 14) * Math.PI);
  }

  _dayFactor(hour) {
    // Activity factor peaks around commute
    const commuteA = Math.exp(-Math.pow((hour - 8.5) / 1.5, 2));
    const commuteB = Math.exp(-Math.pow((hour - 18) / 1.7, 2));
    const midday = Math.exp(-Math.pow((hour - 13) / 3.5, 2)) * 0.5;
    return Math.min(1, commuteA + commuteB + midday);
  }

  tick(delta) {
    this._elapsed += delta;
    if (this._elapsed < 1.0) return; // update once per sim-second
    this._elapsed = 0;

    const sunF = this._sunFactor(this._hour);
    const dayF = this._dayFactor(this._hour);
    const isRain = this._weather === 'rain';

    for (const [id, { metric, valEl, canvas }] of this.cards) {
      const hist = this.history.get(id);
      let val;
      if (metric.sunDriven && id === 'solar') {
        val = metric.range[1] * sunF * (isRain ? 0.35 : 1) * rng.range(0.9, 1.05);
      } else if (metric.sunDriven && id === 'weather') {
        val = 15 + 12 * sunF - (isRain ? 5 : 0) + rng.range(-0.5, 0.5);
      } else {
        val = metric.base + (metric.dayBump || 0) * dayF + rng.range(-3, 3);
        if (id === 'air' && isRain) val *= 0.5;
        if (id === 'wind' && isRain) val *= 1.5;
      }
      val = Math.max(metric.range[0], Math.min(metric.range[1], val));
      hist.shift(); hist.push(val);

      // Format value
      let display;
      if (id === 'alerts') display = Math.round(val);
      else if (Math.abs(val) >= 100) display = val.toFixed(0);
      else display = val.toFixed(1);
      valEl.textContent = display;

      this._drawSpark(canvas, hist, metric);
    }

    this._maybeAddAlert();
  }

  _drawSpark(canvas, data, metric) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...data), max = Math.max(...data);
    const range = Math.max(max - min, 0.0001);
    // Fill
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, metric.color + '55');
    grad.addColorStop(1, metric.color + '00');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = metric.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  _maybeAddAlert() {
    if (rng.chance(0.08)) {
      const templates = [
        { level: 'info', text: 'IoT sensor #{n} came online' },
        { level: 'warn', text: 'Traffic congestion detected on Grid {x}-{y}' },
        { level: 'warn', text: 'Waste bin #{n} exceeded 80 % capacity' },
        { level: 'info', text: 'Wind turbine {n} started ramp-up' },
        { level: 'crit', text: 'Substation SS-1 load spike detected' },
        { level: 'info', text: 'Solar farm exceeded forecast by {p} %' },
        { level: 'warn', text: 'Air quality dip near Sensor {n}' },
      ];
      const t = templates[Math.floor(rng.next() * templates.length)];
      const msg = t.text
        .replace('{n}', rng.int(100, 999))
        .replace('{x}', rng.int(1, 8))
        .replace('{y}', rng.int(1, 8))
        .replace('{p}', rng.int(2, 18));
      this.alerts.unshift({ ts: this._formatHour(), text: msg, level: t.level });
      if (this.alerts.length > 8) this.alerts.pop();
      this._renderAlerts();
    }
  }

  _formatHour() {
    const h = Math.floor(this._hour);
    const m = Math.floor((this._hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  _renderAlerts() {
    if (!this.alertFeed) return;
    this.alertFeed.innerHTML = this.alerts.map(a => `
      <li class="alert-item alert-${a.level}">
        <span class="alert-time">${a.ts}</span>
        <span class="alert-text">${a.text}</span>
      </li>
    `).join('');
  }
}
