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
  const pen = document.createElement('img');
  pen.id = 'pen';
  pen.src = P.src;
  pen.alt = '';
  pen.style.left = P.pivotScreen.x + 'vw';
  pen.style.top = P.pivotScreen.y + 'vh';
  pen.style.width = P.widthVw + 'vw';
  pen.style.transformOrigin = `${P.pivotInImage.x}% ${P.pivotInImage.y}%`;
  document.body.appendChild(pen);

  const setPenAngle = (deg) => {
    pen.style.transform =
      `translate(-${P.pivotInImage.x}%, -${P.pivotInImage.y}%) rotate(${deg}deg)`;
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
