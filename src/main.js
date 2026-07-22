/**
 * main.js — Bootstrap entry point.
 *
 * WHY THIS FILE IS SO SMALL:
 *   All logic lives inside the App orchestrator.  main.js is intentionally
 *   a two-line entry so the build boundary is obvious and easy to test.
 */
import { App } from './core/App.js';

const canvas = document.getElementById('scene-canvas');
const loaderFill = document.getElementById('loader-progress');
const loaderStatus = document.getElementById('loader-status');

const app = new App(canvas, (progress, status) => {
  if (loaderFill) loaderFill.style.width = `${Math.round(progress * 100)}%`;
  if (loaderStatus) loaderStatus.textContent = status;
});

app.boot().catch((err) => {
  console.error('[NEXUS] fatal boot error', err);
  if (loaderStatus) {
    loaderStatus.textContent = 'Failed to boot — check console.';
    loaderStatus.style.color = '#ff5a5a';
  }
});

// Expose for debugging / HMR cleanup
window.__NEXUS__ = app;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.dispose();
  });
}
