/**
 * CinematicManager.js
 * -----------------------------------------------------------------------------
 * GSAP-driven scripted camera fly-through visiting the city presets in order.
 * Kills itself if the user touches OrbitControls.
 */
import gsap from 'gsap';

const ROUTE = ['birdseye', 'downtown', 'residential', 'utility', 'industrial', 'overview'];

export class CinematicManager {
  constructor(cameraMgr, controlsMgr) {
    this.cam = cameraMgr;
    this.controls = controlsMgr;
    this.timeline = null;
    this._interrupted = false;
    this._boundInterrupt = () => this.stop();
  }

  start() {
    if (this.timeline) this.stop();
    this._interrupted = false;
    // Stop on any user interaction with the canvas
    this.controls.controls.addEventListener('start', this._boundInterrupt);

    this.timeline = gsap.timeline({ onComplete: () => this.stop() });
    for (const preset of ROUTE) {
      this.timeline.call(() => {
        if (this._interrupted) return;
        this.cam.goTo(preset, { duration: 3.4, controls: this.controls.controls });
      });
      this.timeline.to({}, { duration: 3.8 });
    }
  }

  stop() {
    if (this.timeline) { this.timeline.kill(); this.timeline = null; }
    this._interrupted = true;
    this.controls.controls.removeEventListener('start', this._boundInterrupt);
  }
}
