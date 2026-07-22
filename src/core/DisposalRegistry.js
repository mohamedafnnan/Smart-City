/**
 * DisposalRegistry.js
 * -----------------------------------------------------------------------------
 * Tracks every disposable Three.js resource so we can tear the app down
 * cleanly (important during Vite HMR — otherwise WebGL contexts leak).
 *
 * Anything with a `.dispose()` method can be registered.
 * Objects added to the scene graph don't need to be here — traversing and
 * disposing their geometry+material catches those.
 */

export class DisposalRegistry {
  constructor() { this._items = new Set(); }

  track(obj) {
    if (obj && typeof obj.dispose === 'function') this._items.add(obj);
    return obj;
  }

  disposeAll() {
    for (const obj of this._items) {
      try { obj.dispose(); } catch (e) { /* swallow — best-effort */ }
    }
    this._items.clear();
  }
}
