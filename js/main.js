// --- Entry point -----------------------------------------------------------
// Wires the modules together: builds the scene and toggle bank, loads the
// story manifest, and swaps the rendered story whenever a switch flips.

import { CONFIG } from './config.js';
import { drawMarkdown } from './text-renderer.js';
import { initScene, resetScroll, getMaxScroll } from './scene.js';
import { initToggles } from './toggles.js';
import { initPen } from './pen.js';
import { initMobile } from './mobile.js';
import { fetchCounts, recordViews } from './views.js';

let manifest = null;

// The story currently on the drum, plus the scroll->line map the renderer
// returned for it, plus bookkeeping for recording the read.
//   recorded: how many source lines we've already committed (avoids double count)
//   counted:  whether the dwell timer has fired (page has been "read")
//   timer:    the dwell timer handle
let currentView = null; // { file, lineScrolls, lineSrc, recorded, counted, timer, token }

// Bumped on every loadStory() so a slow view-count response from an earlier
// story can't paint its fading over a story the reader has since switched to.
let loadToken = 0;

// Canvas 2D only uses a web font once it has actually loaded, so preload every
// Charter face (regular/bold/italic/bold-italic) before the first draw. Falls
// back silently to a serif system font if the files aren't present.
async function ensureFonts() {
  if (!document.fonts) return;
  const family = '"Charter"';
  try {
    await Promise.all([
      document.fonts.load(`400 32px ${family}`),
      document.fonts.load(`700 32px ${family}`),
      document.fonts.load(`italic 400 32px ${family}`),
      document.fonts.load(`italic 700 32px ${family}`),
    ]);
    await document.fonts.ready;
  } catch (err) {
    console.warn('Charter not loaded, using serif fallback:', err);
  }
}

async function loadManifest() {
  try {
    const res = await fetch(CONFIG.paths.manifest);
    if (res.ok) manifest = await res.json();
  } catch (err) {
    console.warn('Manifest unavailable, falling back to direct filenames:', err);
  }
}

function fileForBits(bits) {
  if (manifest) {
    const entry = manifest.stories.find((s) => s.switches === bits);
    if (entry) {
      // A combination may have alternate stories (named <bits>A.md, etc.).
      // Build the pool of all versions and pick one at random each load, so
      // the same switch pattern can surface a different story. The 00000
      // starting page has no alternates and is always shown as-is.
      const files = [entry.file, ...(entry.alternates || []).map((a) => a.file)];
      const pick = files[Math.floor(Math.random() * files.length)];
      return CONFIG.paths.textsBase + pick;
    }
  }
  return CONFIG.paths.textsBase + bits + '.md';
}

// How many source lines (from the top) have been on screen given a scroll depth:
// the deepest visual line whose front-scroll was reached, plus a drum-face of
// lines below it that are visible without scrolling, mapped back to source lines.
function depthSourceLines(view, maxScroll) {
  if (!view.lineScrolls.length) return 0;
  const ahead = CONFIG.fade.visibleAhead;

  let visualCount = ahead;
  for (let i = 0; i < view.lineScrolls.length; i++) {
    if (view.lineScrolls[i] <= maxScroll + 1e-9) visualCount = i + 1 + ahead;
  }
  visualCount = Math.min(view.lineScrolls.length, visualCount);

  let sourceLines = 0;
  for (let i = 0; i < visualCount; i++) {
    if (view.lineSrc[i] + 1 > sourceLines) sourceLines = view.lineSrc[i] + 1;
  }
  return sourceLines;
}

// Commit newly-read lines: increments only the range beyond what we've already
// recorded for this view, so committing on load AND on leave never double-counts.
function commit(view, sourceLines) {
  if (sourceLines > view.recorded) {
    recordViews(view.file, view.recorded, sourceLines);
    view.recorded = sourceLines;
  }
}

// Called when the reader leaves the current story (switch, tab hide, or close).
// If the page hasn't been on screen long enough to count as read, it's dropped;
// otherwise any lines scrolled into view since the dwell commit are banked.
function finalizeView() {
  const view = currentView;
  if (!view) return;
  if (!view.counted) {
    // Too brief (e.g. flipped straight past) — cancel and don't record.
    if (view.timer) { clearTimeout(view.timer); view.timer = null; }
    return;
  }
  commit(view, depthSourceLines(view, getMaxScroll()));
}

async function loadStory(bits) {
  const url = fileForBits(bits);
  const file = url.split('/').pop(); // stable fade key, e.g. "00001A.md"
  const token = ++loadToken;

  // Kick off the shared view-count fetch, but DON'T wait on it — it's a
  // cross-origin round trip and blocking the draw on it makes switches feel
  // laggy. We draw from the (fast, local) story file first, then fade once the
  // counts arrive.
  const countsPromise = fetchCounts(file);

  let text;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('File not found');
    text = await res.text();
  } catch (err) {
    console.error('Error loading story:', err);
    text =
      '### ' + bits +
      '\n\nNo document found for\ncombination: ' + bits +
      '\n\nPlace a file at:\n' + CONFIG.paths.textsBase + bits + '.md';
  }

  if (token !== loadToken) return; // a newer switch superseded this load

  // Immediate draw (full-strength text) so the page appears instantly.
  const meta = drawMarkdown(text, []);
  const view = {
    file,
    lineScrolls: meta.lineScrolls,
    lineSrc: meta.lineSrc,
    recorded: 0,
    counted: false,
    timer: null,
    token,
  };
  currentView = view;

  // Record the read after a short dwell — this is the reliable path: it doesn't
  // depend on the tab-close/switch events (which browsers fire inconsistently).
  // Commits the lines on screen now; anything scrolled to later is banked on
  // leave by finalizeView().
  view.timer = setTimeout(() => {
    if (loadToken !== token) return; // superseded
    view.counted = true;
    commit(view, depthSourceLines(view, getMaxScroll()));
  }, CONFIG.fade.recordDelayMs);

  // Apply the accumulated fading when the counts land, if this story is still
  // on screen. (No-op when there's no backend or the page has no views yet.)
  countsPromise.then((counts) => {
    if (token !== loadToken || !counts || !counts.length) return;
    drawMarkdown(text, counts);
  });
}

// Apply mobile tweaks (scroll boost + font scaling + rotate gate) BEFORE the
// first drawMarkdown() so the initial render already uses the scaled fonts.
initMobile();

initScene(document.getElementById('canvas-container'));
initPen();

const toggles = initToggles(
  document.getElementById('toggle-panel'),
  // Switching stories: bank the outgoing story's read-depth before loading the
  // next one, then reset scroll.
  (bits) => { finalizeView(); resetScroll(); loadStory(bits); },
);

// Bank the final story's read-depth when the tab is closed or backgrounded.
// pagehide is the reliable "leaving" signal; sendBeacon (in views.js) survives it.
window.addEventListener('pagehide', finalizeView);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') finalizeView();
});

await Promise.all([loadManifest(), ensureFonts()]);
loadStory(toggles.getBits());
