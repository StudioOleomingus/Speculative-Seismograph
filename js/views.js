// --- Shared view counter ("seismograph memory") ------------------------------
// Talks to a small REST backend that stores, per story file and per SOURCE line,
// how many times that line has been read across ALL visitors. The text renderer
// uses those counts to fade each line; past CONFIG.fade.maxViews it disappears.
//
// Backend contract (implemented by backend/worker.js):
//   GET  {endpoint}/counts?epoch=<n>&file=<name>
//        -> { "counts": [int, int, ...] }   // per source-line, index 0 = line 0
//   POST {endpoint}/record   body { epoch, file, from, lines }
//        -> increments source lines [from .. lines-1] by 1  (from defaults to 0)
//
// Everything degrades gracefully: if `endpoint` is empty or the network fails,
// fetchCounts() returns [] (no fading) and recordViews() is a no-op, so the
// site keeps working exactly as it did before this feature existed.

import { CONFIG } from './config.js';

const F = CONFIG.fade;
const base = () => F.endpoint.replace(/\/$/, '');

// Pull the per-line view counts for one story file. Never throws, and aborts
// after F.timeoutMs so a slow/asleep backend can't hold anything up.
export async function fetchCounts(file) {
  if (!F.endpoint) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), F.timeoutMs || 4000);
  try {
    const url = `${base()}/counts` +
      `?epoch=${encodeURIComponent(F.epoch)}&file=${encodeURIComponent(file)}`;
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.counts) ? data.counts : [];
  } catch (err) {
    console.warn('View counts unavailable:', err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Record a read: increments source lines [from .. lines-1] for `file` by 1.
// Using a range lets us commit the top lines on load and any deeper lines later
// without ever double-counting the overlap. Uses sendBeacon when available so
// the write survives the tab closing.
export function recordViews(file, from, lines) {
  if (!F.endpoint || !(lines > from)) return;
  const url = `${base()}/record`;
  const body = JSON.stringify({ epoch: F.epoch, file, from, lines });
  try {
    if (navigator.sendBeacon) {
      // IMPORTANT: send as text/plain, NOT application/json. Cross-origin
      // beacons with a non-safelisted Content-Type (like application/json)
      // require a CORS preflight, which sendBeacon can't do — the browser
      // silently drops the request and nothing is ever recorded. text/plain is
      // CORS-safelisted, so the POST goes straight through. The Worker parses
      // the body as JSON regardless of its declared Content-Type.
      const blob = new Blob([body], { type: 'text/plain' });
      const ok = navigator.sendBeacon(url, blob);
      if (!ok) console.warn('View beacon was not queued:', { file, from, lines });
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

// Small debug handle so you can test the pipeline live from the browser console:
//   await seismographViews.fetchCounts('00000.md')   // read current counts
//   seismographViews.recordViews('00000.md', 0, 5)   // manually +1 to lines 0..4
//   seismographViews.config                          // see endpoint / epoch
if (typeof window !== 'undefined') {
  window.seismographViews = { fetchCounts, recordViews, config: F };
}
