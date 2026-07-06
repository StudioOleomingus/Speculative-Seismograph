// --- Mobile landscape gate ---------------------------------------------------
// On phones: (1) boosts scroll speed by 15%, and (2) when held in portrait,
// shows an overlay asking the visitor to rotate. The button attempts to enter
// fullscreen and lock the screen to landscape for them (works on Android;
// iOS Safari doesn't allow orientation lock, so there the overlay simply stays
// up until the phone is physically rotated).

import { CONFIG } from './config.js';

const MOBILE_SCROLL_BOOST = 1.15; // +15% scroll speed on mobile

export function isMobileDevice() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return coarse && (uaMobile || Math.min(screen.width, screen.height) < 820);
}

export function initMobile() {
  if (!isMobileDevice()) return;

  // Faster scrolling on touch devices (wheel + drag paths both boosted).
  CONFIG.scroll.sensitivity *= MOBILE_SCROLL_BOOST;
  CONFIG.scroll.dragSensitivity *= MOBILE_SCROLL_BOOST;

  const overlay = document.createElement('div');
  overlay.id = 'rotate-overlay';
  overlay.innerHTML = `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="22" y="8" width="20" height="36" rx="3"
            fill="none" stroke="currentColor" stroke-width="3"/>
      <path d="M50 40 a18 18 0 0 1 -14 14" fill="none"
            stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M33 57 l4 -4 -4 -4" fill="none"
            stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <p>This piece is built for landscape.<br>
       Rotate your phone and go fullscreen to read.</p>
    <button id="rotate-button" type="button">Rotate &amp; go fullscreen</button>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#rotate-button').addEventListener('click', async () => {
    // Fullscreen first: orientation.lock() requires it on most browsers.
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (err) { /* fullscreen denied — continue */ }
    try {
      if (screen.orientation?.lock) await screen.orientation.lock('landscape');
    } catch (err) { /* not supported (iOS) — user rotates manually */ }
    update();
  });

  const landscape = window.matchMedia('(orientation: landscape)');
  const update = () => overlay.classList.toggle('hidden', landscape.matches);
  landscape.addEventListener('change', update);
  update();
}
