// --- Seismograph pen -------------------------------------------------------
// Places the PEN.png overlay, pivots it from its hole, and oscillates it in
// response to scroll velocity (spring + damping + a little noise).
//
// Driven by scene.onFrame((currentScroll, velocity) => ...).

import { CONFIG } from './config.js';
import { onFrame } from './scene.js';

const P = CONFIG.pen;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function initPen() {
  // Position + rotation origin shared by the pen and its shadow (same artwork
  // dimensions, same pivot).
  const place = (img) => {
    img.alt = '';
    img.style.left = P.pivotScreen.x + 'vw';
    img.style.top = P.pivotScreen.y + 'vh';
    img.style.width = P.widthVw + 'vw';
    img.style.transformOrigin = `${P.pivotInImage.x}% ${P.pivotInImage.y}%`;
  };

  // Shadow sits behind the pen (lower z-index via CSS) and can be nudged.
  const shadow = document.createElement('img');
  shadow.id = 'pen-shadow';
  shadow.src = encodeURI(P.shadowSrc);
  place(shadow);
  document.body.appendChild(shadow);

  const pen = document.createElement('img');
  pen.id = 'pen';
  pen.src = P.src;
  place(pen);
  document.body.appendChild(pen);

  const setPenAngle = (deg) => {
    const base = `translate(-${P.pivotInImage.x}%, -${P.pivotInImage.y}%)`;
    pen.style.transform = `${base} rotate(${deg}deg)`;
    shadow.style.transform =
      `translate(${P.shadowOffset.x}vw, ${P.shadowOffset.y}vh) ${base} rotate(${deg}deg)`;
  };
  setPenAngle(P.restAngleDeg);

  let angle = P.restAngleDeg;
  let angularVel = 0;

  function update(scroll, velocity) {
    // Spring-damped oscillation, excited by scroll velocity.
    angularVel += -P.stiffness * (angle - P.restAngleDeg);
    angularVel += velocity * P.kick;
    angularVel *= (1 - P.damping);
    angle += angularVel;
    if (Math.abs(velocity) > P.restVelocity) {
      angle += (Math.random() - 0.5) * P.noise;
    }
    angle = clamp(angle, P.restAngleDeg - P.maxAngleDeg, P.restAngleDeg + P.maxAngleDeg);
    setPenAngle(angle);
  }

  onFrame(update);
}
