/**
 * SearchManager.js
 * -----------------------------------------------------------------------------
 * Wires the top-bar search input to the Registry.  On item click we fly the
 * camera to the object and emit `object:select`.
 */
import { bus } from '../core/EventBus.js';
import * as THREE from 'three';

export class SearchManager {
  constructor(registry, cameraMgr, controlsMgr) {
    this.registry = registry;
    this.cam = cameraMgr;
    this.controls = controlsMgr;
    this.input = document.getElementById('search-input');
    this.results = document.getElementById('search-results');
    if (this.input) {
      this.input.addEventListener('input', () => this._onInput());
      this.input.addEventListener('focus', () => this._onInput());
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.top-search')) this._hide();
      });
    }
  }

  _onInput() {
    const q = this.input.value.trim();
    if (!q) { this._hide(); return; }
    const res = this.registry.search(q, 10);
    this.results.innerHTML = '';
    if (!res.length) {
      this.results.innerHTML = `<div class="search-empty">No results</div>`;
      this.results.classList.add('open');
      return;
    }
    for (const entry of res) {
      const el = document.createElement('button');
      el.className = 'search-result';
      el.innerHTML = `
        <div class="sr-type">${entry.type}</div>
        <div class="sr-name">${entry.name}</div>
      `;
      el.addEventListener('click', () => this._pick(entry));
      this.results.appendChild(el);
    }
    this.results.classList.add('open');
  }

  _pick(entry) {
    const p = new THREE.Vector3();
    entry.object.getWorldPosition(p);
    this.cam.flyTo(
      [p.x + 30, 30, p.z + 30],
      [p.x, p.y + 5, p.z],
      { duration: 1.4, controls: this.controls.controls }
    );
    bus.emit('object:select', entry);
    this._hide();
    this.input.value = entry.name;
  }

  _hide() { this.results.classList.remove('open'); }
}
