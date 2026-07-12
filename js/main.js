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
// returned for it. Used to record how far it was read when the reader leaves.
let currentView = null; // { file, lineScrolls, lineSrc }

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

// Record how far the current story was read, then clear it. Called when the
// reader switches stories or leaves the page. "Every page load" counts once:
// source lines from the top down to the deepest line reached each get +1.
function finalizeView() {
  const view = currentView;
  currentView = null;
  if (!view || !view.lineScrolls.length) return;

  const maxScroll = getMaxScroll();
  const ahead = CONFIG.fade.visibleAhead;

  // Deepest visual line whose front-scroll has been reached, plus a drum-face
  // of lines below it that are visible even without scrolling.
  let visualCount = ahead;
  for (let i = 0; i < view.lineScrolls.length; i++) {
    if (view.lineScrolls[i] <= maxScroll + 1e-9) visualCount = i + 1 + ahead;
  }
  visualCount = Math.min(view.lineScrolls.length, visualCount);

  // Map those visual lines back to a source-line count (contiguous from 0).
  let sourceLines = 0;
  for (let i = 0; i < visualCount; i++) {
    if (view.lineSrc[i] + 1 > sourceLines) sourceLines = view.lineSrc[i] + 1;
  }
  recordViews(view.file, sourceLines);
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
  currentView = { file, lineScrolls: meta.lineScrolls, lineSrc: meta.lineSrc };

  // Then apply the accumulated fading when the counts land, if this story is
  // still the one on screen. (No-op when there's no backend or no views yet.)
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
