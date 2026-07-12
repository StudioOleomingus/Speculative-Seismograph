// --- Shared view counter ("seismograph memory") ------------------------------
// Talks to a small REST backend that stores, per story file and per SOURCE line,
// how many times that line has been read across ALL visitors. The text renderer
// uses those counts to fade each line; past CONFIG.fade.maxViews it disappears.
//
// Backend contract (implemented by backend/worker.js):
//   GET  {endpoint}/counts?epoch=<n>&file=<name>
//        -> { "counts": [int, int, ...] }   // per source-line, index 0 = line 0
//   POST {endpoint}/record   body { epoch, file, lines }
//        -> increments source lines [0 .. lines-1] by 1
//
// Everything degrades gracefully: if `endpoint` is empty or the network fails,
// fetchCounts() returns [] (no fading) and recordViews() is a no-op, so the
// site keeps working exactly as it did before this feature existed.

import { CONFIG } from './config.js';

const F = CONFIG.fade;

// Pull the per-line view counts for one story file. Never throws.
export async function fetchCounts(file) {
  if (!F.endpoint) return [];
  try {
    const url = `${F.endpoint.replace(/\/$/, '')}/counts` +
      `?epoch=${encodeURIComponent(F.epoch)}&file=${encodeURIComponent(file)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.counts) ? data.counts : [];
  } catch (err) {
    console.warn('View counts unavailable:', err);
    return [];
  }
}

// Record one read: increments source lines [0 .. lines-1] for `file`. Uses
// sendBeacon when possible so it survives the tab closing / page unloading.
export function recordViews(file, lines) {
  if (!F.endpoint || !(lines > 0)) return;
  const url = `${F.endpoint.replace(/\/$/, '')}/record`;
  const body = JSON.stringify({ epoch: F.epoch, file, lines });
  try {
    if (navigator.sendBeacon) {
      // IMPORTANT: send as text/plain, NOT application/json. Cross-origin
      // beacons with a non-safelisted Content-Type (like application/json)
      // require a CORS preflight, which sendBeacon can't do — the browser
      // silently drops the request and nothing is ever recorded. text/plain is
      // CORS-safelisted, so the POST goes straight through. The Worker parses
      // the body as JSON regardless of its declared Content-Type.
      const blob = new Blob([body], { type: 'text/plain' });
      navigator.sendBeacon(url, blob);
    } else {
      // Same reasoning for the fallback: text/plain avoids a preflight.
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
        keepalive: true,
      }).catch(() => { /* best-effort */ });
    }
  } catch (err) {
    console.warn('View record failed:', err);
  }
}
