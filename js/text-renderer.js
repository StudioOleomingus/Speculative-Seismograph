// --- Text renderer ---------------------------------------------------------
// Rasterises Markdown into an off-screen canvas and exposes it as a
// THREE.CanvasTexture wrapped around the drum. Layout is measured once to size
// the canvas, then drawn; `frontOffset` positions the title on the front face.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
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

function isHeader(line) { return line.startsWith('###'); }
function isBullet(line) { return line.startsWith('•') || line.startsWith('-'); }

function measureWrapLines(context, text, maxWidth) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 1;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (context.measureText(testLine).width > maxWidth && n > 0) {
      line = words[n] + ' ';
      lineCount++;
    } else {
      line = testLine;
    }
  }
  return lineCount;
}

function measureTextExtent(mdText) {
  let y = L.initialY;
  mdText.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { y += L.advance.blank; return; }
    if (isHeader(trimmed)) {
      ctx.font = L.fonts.header; y += L.advance.header;
    } else if (isBullet(trimmed)) {
      ctx.font = L.fonts.bullet; y += L.advance.bullet;
    } else {
      ctx.font = L.fonts.body;
      y += measureWrapLines(ctx, trimmed, L.maxWidth) * L.advance.bodyLine + L.advance.bodyPara;
    }
  });
  return y;
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (context.measureText(testLine).width > maxWidth && n > 0) {
      context.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, currentY);
  return currentY + lineHeight;
}

export function drawMarkdown(mdText) {
  const finalY = measureTextExtent(mdText);
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

  let startY = L.initialY;
  mdText.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { startY += L.advance.blank; return; }
    if (isHeader(trimmed)) {
      ctx.font = L.fonts.header;
      ctx.fillText(trimmed, L.startX, startY);
      startY += L.advance.header;
    } else if (isBullet(trimmed)) {
      ctx.font = L.fonts.bullet;
      ctx.fillText(trimmed, L.startX, startY);
      startY += L.advance.bullet;
    } else {
      ctx.font = L.fonts.body;
      startY = wrapText(ctx, trimmed, L.startX, startY, L.maxWidth, L.advance.bodyLine);
      startY += L.advance.bodyPara;
    }
  });

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
