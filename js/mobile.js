// --- Mobile landscape gate ---------------------------------------------------
// On phones: (1) boosts scroll speed, and (2) when held in portrait, shows an
// overlay asking the visitor to rotate. The button attempts to enter fullscreen
// and lock the screen to landscape for them (works on Android; iOS Safari
// doesn't allow orientation lock, so there the overlay simply stays up until the
// phone is physically rotated).

import { CONFIG } from './config.js';

const MOBILE_SCROLL_BOOST = 1.20; // +20% scroll speed on mobile
const MOBILE_FONT_SCALE = 2;      // 2x text size on mobile (body 36 -> 72)

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

  // Bigger text on small screens. Runs before the first drawMarkdown() call.
  // Per-line advances (*Line) scale with the fonts so lines don't overlap;
  // paragraph/heading gaps and blank spacing stay at base values.
  for (const k in CONFIG.layout.fonts.size) CONFIG.layout.fonts.size[k] *= MOBILE_FONT_SCALE;
  for (const k in CONFIG.layout.advance) {
    if (k.endsWith('Line')) CONFIG.layout.advance[k] *= MOBILE_FONT_SCALE;
  }

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

  // No usable fullscreen API (e.g. iPhone Safari, or embedded in an iframe
  // without allowfullscreen): hide the button, the rotate message is enough.
  const fsAvailable =
    document.fullscreenEnabled || document.webkitFullscreenEnabled ||
    document.documentElement.webkitRequestFullscreen;
  if (!fsAvailable) overlay.querySelector('#rotate-button').style.display = 'none';

  // Fullscreen must be requested synchronously inside the click handler (no
  // preceding await) or Android drops the user-activation and silently ignores
  // it. Vendor-prefixed fallbacks cover older Android/Samsung browsers.
  overlay.querySelector('#rotate-button').addEventListener('click', () => {
    const el = document.documentElement;
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (!request) return;
    try {
      const p = request.call(el);
      if (p?.catch) p.catch((err) => console.warn('Fullscreen denied:', err));
    } catch (err) {
      console.warn('Fullscreen failed:', err);
    }
  });

  // Orientation lock only works once fullscreen is actually engaged, so do it
  // in the fullscreenchange event rather than racing it in the click handler.
  function lockLandscape() {
    if (!(document.fullscreenElement || document.webkitFullscreenElement)) return;
    try {
      screen.orientation?.lock('landscape')?.catch(() => { /* iOS: unsupported */ });
    } catch (err) { /* older API shapes */ }
    update();
  }
  document.addEventListener('fullscreenchange', lockLandscape);
  document.addEventListener('webkitfullscreenchange', lockLandscape);

  const landscape = window.matchMedia('(orientation: landscape)');
  const update = () => overlay.classList.toggle('hidden', landscape.matches);
  landscape.addEventListener('change', update);
  update();
}
