// --- Text renderer ---------------------------------------------------------
// Rasterises a small subset of Markdown into an off-screen canvas and exposes
// it as a THREE.CanvasTexture wrapped around the drum.
//
// Supported Markdown:
//   #, ##, ###        headers (three sizes)
//   -, •, *  + space  bullets
//   **bold**  *italic*  ***bold italic***   inline styles
//   \<char>           escaped punctuation (rendered literally)
//
// A single `layout()` pass is used both to measure the text extent (to size the
// canvas) and to draw it, so the two can't drift out of sync.

import * as THREE from 'three';
import { CONFIG } from './config.js';

const L = CONFIG.layout;

const textCanvas = document.createElement('canvas');
const ctx = textCanvas.getContext('2d');
textCanvas.width = CONFIG.canvas.baseSize;
textCanvas.height = CONFIG.canvas.textHeight;

export const texture = new THREE.CanvasTexture(textCanvas);
texture.minFilter = THREE.LinearFilter;
texture.wrapS = THREE.ClampToEdgeWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;

let frontOffset = 0;
export function getFrontOffset() { return frontOffset; }

// Per-block-type rendering spec (font size, line height, gap after block).
const BLOCK_SPEC = {
  h1:     { size: L.fonts.size.h1,     lineHeight: L.advance.h1Line,     gap: L.advance.h1Gap,     bold: true },
  h2:     { size: L.fonts.size.h2,     lineHeight: L.advance.h2Line,     gap: L.advance.h2Gap,     bold: true },
  h3:     { size: L.fonts.size.h3,     lineHeight: L.advance.h3Line,     gap: L.advance.h3Gap,     bold: true },
  bullet: { size: L.fonts.size.bullet, lineHeight: L.advance.bulletLine, gap: L.advance.bulletGap, bold: false },
  body:   { size: L.fonts.size.body,   lineHeight: L.advance.bodyLine,   gap: L.advance.bodyPara,  bold: false },
};

function fontStr(size, bold, italic) {
  return `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px ${L.fonts.family}`;
}

function unescapeMd(s) {
  return s.replace(/\\([\\`*_{}\[\]()#+\-.!=~>])/g, '$1');
}

// Split a line into styled runs: [{ text, bold, italic }, ...].
function parseInline(text) {
  const tokens = [];
  const re = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ text: unescapeMd(text.slice(last, m.index)), bold: false, italic: false });
    }
    if (m[1] !== undefined)      tokens.push({ text: unescapeMd(m[1]), bold: true,  italic: true  });
    else if (m[2] !== undefined) tokens.push({ text: unescapeMd(m[2]), bold: true,  italic: false });
    else                         tokens.push({ text: unescapeMd(m[3]), bold: false, italic: true  });
    last = re.lastIndex;
  }
  if (last < text.length) {
    tokens.push({ text: unescapeMd(text.slice(last)), bold: false, italic: false });
  }
  return tokens;
}

// Turn a raw document into a list of blocks with parsed inline runs.
function parseBlocks(mdText) {
  return mdText.split('\n').map((raw) => {
    const line = raw.trim();
    if (!line) return { type: 'blank' };

    const header = line.match(/^(#{1,6})\s*(.*)$/);
    if (header) {
      const level = Math.min(header[1].length, 3);
      return { type: 'h' + level, tokens: parseInline(header[2]) };
    }

    const bullet = line.match(/^([•\-]|\*)\s+(.*)$/);
    if (bullet) return { type: 'bullet', tokens: parseInline(bullet[2]) };

    return { type: 'body', tokens: parseInline(line) };
  });
}

// Flatten a block's runs into individual styled words (adds a bullet marker).
function toWords(tokens, forceBold, marker) {
  const words = [];
  if (marker) words.push({ text: marker, bold: false, italic: false });
  for (const tok of tokens) {
    for (const part of tok.text.split(/\s+/)) {
      if (part) words.push({ text: part, bold: forceBold || tok.bold, italic: tok.italic });
    }
  }
  return words;
}

// Lay out one block's words with word wrapping. Draws when `draw` is true.
// Returns the y after the block's last line.
function layoutWords(words, spec, startY, draw) {
  let curY = startY;
  let curX = L.startX;
  let lineHasContent = false;
  for (const wd of words) {
    ctx.font = fontStr(spec.size, wd.bold, wd.italic);
    const wordWidth = ctx.measureText(wd.text).width;
    const spaceWidth = ctx.measureText(' ').width;
    if (lineHasContent && (curX + wordWidth - L.startX) > L.maxWidth) {
      curY += spec.lineHeight;
      curX = L.startX;
      lineHasContent = false;
    }
    if (draw) ctx.fillText(wd.text, curX, curY);
    curX += wordWidth + spaceWidth;
    lineHasContent = true;
  }
  return curY + spec.lineHeight;
}

// Single pass over the blocks; measures (draw=false) or renders (draw=true).
function layout(blocks, draw) {
  let y = L.initialY;
  for (const block of blocks) {
    if (block.type === 'blank') { y += L.advance.blank; continue; }
    const spec = BLOCK_SPEC[block.type];
    const words = toWords(block.tokens, spec.bold, block.type === 'bullet' ? '•' : '');
    y = layoutWords(words, spec, y, draw);
    y += spec.gap;
  }
  return y;
}

export function drawMarkdown(mdText) {
  const blocks = parseBlocks(mdText);

  const finalY = layout(blocks, false);
  const neededFromCenter = Math.max(Math.abs(L.initialY), Math.abs(finalY)) + L.padding;
  const neededWidth = Math.max(CONFIG.canvas.baseSize, neededFromCenter * 2);

  textCanvas.width = neededWidth;
  textCanvas.height = CONFIG.canvas.textHeight;

  // Transparent — only the dark text renders over the background image.
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  ctx.fillStyle = L.color;

  ctx.save();
  ctx.translate(textCanvas.width / 2, textCanvas.height / 2);
  ctx.rotate(Math.PI / 2);
  layout(blocks, true);
  ctx.restore();

  // NOTE: dispose()+needsUpdate is redundant (see improvement B4); kept here to
  // preserve current behaviour until B4 is addressed deliberately.
  texture.dispose();

  // Recompute the front-facing offset for the new canvas width.
  //   final_U = 0.5 * repeat + offset = textStartU  ->  offset = textStartU - 0.5 * repeat
  const repeatX = CONFIG.canvas.baseSize / textCanvas.width;
  const textStartU = 0.5 + Math.abs(L.initialY) / textCanvas.width;
  texture.repeat.x = repeatX;
  frontOffset = textStartU - 0.5 * repeatX + L.frontNudge;
  texture.offset.x = frontOffset;
  texture.needsUpdate = true;
}
