/**
 * EventBus.js
 * -----------------------------------------------------------------------------
 * Ultra-light publish/subscribe hub.
 *
 * WHY THIS EXISTS
 *  UI code (dashboard, sidebar, toolbar) must not import scene code directly;
 *  scene code should not know about the DOM.  A named-event bus decouples them.
 *
 *  Every subscriber returns an unsubscribe function to prevent listener leaks
 *  on HMR / navigation.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._map = new Map();
  }

  on(event, handler) {
    if (!this._map.has(event)) this._map.set(event, new Set());
    this._map.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(event, handler) {
    const set = this._map.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this._map.get(event);
    if (!set) return;
    // Copy to avoid mutation during iteration
    for (const h of [...set]) {
      try { h(payload); }
      catch (e) { console.error(`[EventBus] handler for "${event}" threw`, e); }
    }
  }

  clear() { this._map.clear(); }
}

/** Application-wide singleton. */
export const bus = new EventBus();
