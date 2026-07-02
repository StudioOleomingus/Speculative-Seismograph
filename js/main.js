// --- Entry point -----------------------------------------------------------
// Wires the modules together: builds the scene and toggle bank, loads the
// story manifest, and swaps the rendered story whenever a switch flips.

import { CONFIG } from './config.js';
import { drawMarkdown } from './text-renderer.js';
import { initScene, resetScroll } from './scene.js';
import { initToggles } from './toggles.js';

let manifest = null;

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
    if (entry) return CONFIG.paths.textsBase + entry.file;
  }
  return CONFIG.paths.textsBase + bits + '.md';
}

async function loadStory(bits) {
  try {
    const res = await fetch(fileForBits(bits));
    if (!res.ok) throw new Error('File not found');
    drawMarkdown(await res.text());
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

const toggles = initToggles(
  document.getElementById('toggle-panel'),
  (bits) => { resetScroll(); loadStory(bits); },
);

await loadManifest();
loadStory(toggles.getBits());
