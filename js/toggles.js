// --- Toggle bank -----------------------------------------------------------
// Each switch and its indicator light are modelled as a single Toggle unit,
// built and updated together. This removes the old parallel forEach loops
// (keyed by data-index) and the risk of switch/light index mismatch.

import { CONFIG } from './config.js';

const A = CONFIG.toggles.assets;

class Toggle {
  constructor(index, onChange) {
    this.index = index;
    this.onChange = onChange;
    this.on = false;

    // <div class="toggle"> <switch img> <light img> </div>
    this.el = document.createElement('div');
    this.el.className = 'toggle';

    this.switchBtn = document.createElement('button');
    this.switchBtn.className = 'toggle-switch';
    this.switchBtn.type = 'button';
    this.switchBtn.setAttribute('aria-pressed', 'false');
    this.switchBtn.setAttribute('aria-label', `Story selector switch ${index + 1}`);
    this.switchImg = document.createElement('img');
    this.switchImg.alt = '';
    this.switchBtn.appendChild(this.switchImg);

    this.lightImg = document.createElement('img');
    this.lightImg.className = 'toggle-light';
    this.lightImg.alt = '';
    this.lightImg.setAttribute('aria-hidden', 'true');

    this.el.appendChild(this.switchBtn);
    this.el.appendChild(this.lightImg);

    this.switchBtn.addEventListener('click', () => this.flip());
    this.render();
  }

  flip() {
    this.on = !this.on;
    this.render();
    this.onChange();
  }

  render() {
    this.switchImg.src = this.on ? A.switchOn : A.switchOff;
    this.lightImg.src = this.on ? A.lightOn : A.lightOff;
    this.switchBtn.setAttribute('aria-pressed', String(this.on));
  }

  get bit() { return this.on ? 1 : 0; }
}

/**
 * Build the toggle bank inside `panelEl`.
 * @returns {{ getBits: () => string }}
 */
export function initToggles(panelEl, onChange) {
  const toggles = [];
  const notify = () => onChange(bitString());
  const bitString = () => toggles.map((t) => t.bit).join('');

  for (let i = 0; i < CONFIG.toggles.count; i++) {
    const t = new Toggle(i, notify);
    toggles.push(t);
    panelEl.appendChild(t.el);
  }

  return { getBits: bitString };
}
