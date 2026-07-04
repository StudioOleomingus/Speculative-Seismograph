// --- Entry point -----------------------------------------------------------
// Wires the modules together: builds the scene and toggle bank, loads the
// story manifest, and swaps the rendered story whenever a switch flips.

import { CONFIG } from './config.js';
import { drawMarkdown } from './text-renderer.js';
import { initScene, resetScroll } from './scene.js';
import { initToggles } from './toggles.js';
import { initPen } from './pen.js';

let manifest = null;

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

// Header image for a switch combination: images/<bits>.png. Keyed by the same
// 5-bit tag as the texts (alternates share their combination's image). Resolves
// to null when the image doesn't exist yet, so the text renders without it.
function imageForBits(bits) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = CONFIG.paths.imagesBase + bits + '.png';
  });
}

async function loadStory(bits) {
  try {
    const [res, image] = await Promise.all([
      fetch(fileForBits(bits)),
      imageForBits(bits),
    ]);
    if (!res.ok) throw new Error('File not found');
    drawMarkdown(await res.text(), image);
  } catch (err) {
    console.error('Error loading story:', err);
    drawMarkdown(
      '### ' + bits +
      '\n\nNo document found for\ncombination: ' + bits +
      '\n\nPlace a file at:\n' + CONFIG.paths.textsBase + bits + '.md',
    );
  }
}

initScene(document.getElementById('canvas-container'));
initPen();

const toggles = initToggles(
  document.getElementById('toggle-panel'),
  (bits) => { resetScroll(); loadStory(bits); },
);

await Promise.all([loadManifest(), ensureFonts()]);
loadStory(toggles.getBits());
