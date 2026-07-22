/**
 * Registry.js
 * -----------------------------------------------------------------------------
 * A catalogue of every "interactive" object in the scene.
 *
 * Each entry associates a THREE.Object3D with rich metadata:
 *   { id, type, name, description, stats, position }
 *
 * This is the source of truth for:
 *   - Raycaster interaction (info cards)
 *   - Search panel fuzzy matching
 *   - Dashboard aggregation
 *
 * Objects are found via `.userData.registryId` set at construction time.
 */

let _nextId = 1;

export class Registry {
  constructor() {
    /** @type {Map<number, {id:number,type:string,name:string,description:string,stats:object,object:THREE.Object3D}>} */
    this._byId = new Map();
    /** @type {Map<string, Array<any>>} type -> entries */
    this._byType = new Map();
  }

  register(entry) {
    const id = _nextId++;
    entry.id = id;
    if (entry.object) {
      entry.object.userData.registryId = id;
      entry.object.userData.selectable = true;
    }
    this._byId.set(id, entry);
    if (!this._byType.has(entry.type)) this._byType.set(entry.type, []);
    this._byType.get(entry.type).push(entry);
    return entry;
  }

  get(id) { return this._byId.get(id); }
  all()   { return [...this._byId.values()]; }
  byType(t) { return this._byType.get(t) ?? []; }
  count() { return this._byId.size; }

  /** Fuzzy search — case-insensitive substring over name+type+description. */
  search(q, limit = 12) {
    if (!q) return [];
    const needle = q.toLowerCase();
    const out = [];
    for (const e of this._byId.values()) {
      const hay = `${e.name} ${e.type} ${e.description || ''}`.toLowerCase();
      if (hay.includes(needle)) out.push(e);
      if (out.length >= limit) break;
    }
    return out;
  }
}
