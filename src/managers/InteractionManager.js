/**
 * InteractionManager.js
 * -----------------------------------------------------------------------------
 * Handles pointer input → raycasting → hover/select events.
 *
 * THREE.js NOTE:
 *   THREE.Raycaster shoots a ray from the camera through a normalised device
 *   coordinate and returns intersected meshes sorted by distance.
 *
 * We only raycast selectable objects (those with `userData.selectable === true`)
 * — every registry-registered object qualifies.  To avoid raycasting
 * thousands of trees/vehicles every frame, we throttle the *hover* raycast
 * to ~15 Hz.  Click raycasts are always immediate.
 */
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';

export class InteractionManager {
  constructor(camera, scene, registry, canvas) {
    this.camera = camera;
    this.scene = scene;
    this.registry = registry;
    this.canvas = canvas;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoverId = null;
    this.selectedId = null;
    this._lastHoverTime = 0;

    // Cache hover highlight material — swapped in/out per hovered object
    this._originalEmissives = new WeakMap();
    this._hoverColor = new THREE.Color(0x00e5ff);
    this._selectColor = new THREE.Color(0xffb020);

    this._bind();
  }

  _bind() {
    this.canvas.addEventListener('pointermove', (e) => this._onMove(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _updatePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _pickRoot(intersect) {
    // Walk up until we find an ancestor with a registryId
    let o = intersect.object;
    while (o) {
      if (o.userData && o.userData.registryId) return o;
      o = o.parent;
    }
    return null;
  }

  _findFirstSelectable() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // Restrict raycast to registered top-level objects for perf
    const roots = this.registry.all().map((e) => e.object).filter(Boolean);
    const hits = this.raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    return this._pickRoot(hits[0]);
  }

  _onMove(e) {
    const now = performance.now();
    if (now - this._lastHoverTime < 60) return; // ~15 Hz
    this._lastHoverTime = now;
    this._updatePointer(e);
    const root = this._findFirstSelectable();
    const id = root ? root.userData.registryId : null;
    if (id === this.hoverId) return;

    if (this.hoverId != null) this._setHighlight(this.hoverId, null);
    this.hoverId = id;
    if (id != null && id !== this.selectedId) this._setHighlight(id, this._hoverColor);
    document.body.style.cursor = id != null ? 'pointer' : 'default';
  }

  _onClick(e) {
    this._updatePointer(e);
    const root = this._findFirstSelectable();
    if (!root) {
      this._deselect();
      return;
    }
    const id = root.userData.registryId;
    if (id === this.selectedId) return;
    // Un-highlight previous
    if (this.selectedId != null) this._setHighlight(this.selectedId, null);
    this.selectedId = id;
    this._setHighlight(id, this._selectColor);
    const entry = this.registry.get(id);
    if (entry) bus.emit('object:select', entry);
  }

  _deselect() {
    if (this.selectedId != null) {
      this._setHighlight(this.selectedId, null);
      this.selectedId = null;
      bus.emit('object:deselect');
    }
  }

  _setHighlight(id, color) {
    const entry = this.registry.get(id);
    if (!entry || !entry.object) return;
    entry.object.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!mat || !('emissive' in mat)) continue;
          if (color) {
            if (!this._originalEmissives.has(mat)) {
              this._originalEmissives.set(mat, {
                color: mat.emissive.getHex(), intensity: mat.emissiveIntensity ?? 1,
              });
            }
            mat.emissive.copy(color);
            mat.emissiveIntensity = 0.7;
          } else {
            const orig = this._originalEmissives.get(mat);
            if (orig) {
              mat.emissive.setHex(orig.color);
              mat.emissiveIntensity = orig.intensity;
              this._originalEmissives.delete(mat);
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        }
      }
    });
  }
}
