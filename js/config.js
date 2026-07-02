// --- Central configuration -------------------------------------------------
// Every tunable magic number lives here so layout/behaviour can be adjusted in
// one place. Sections mirror the subsystems (scene, cylinder, scroll, text).

export const CONFIG = {
  // Toggle bank: how many switch+light units, and their artwork.
  toggles: {
    count: 5,
    assets: {
      switchOn:  './Assets/Switches/On.png',
      switchOff: './Assets/Switches/Off.png',
      lightOn:   './Assets/Lights/On.png',
      lightOff:  './Assets/Lights/Off.png',
    },
  },

  // Perspective camera.
  // Curvature "feel" of the text is controlled here: a narrower fov + larger
  // distance is more telephoto, which flattens the apparent warp of the drum.
  // fov and z are paired so the drum stays the same on-screen size
  // (keep dist * tan(fov/2) roughly constant when tuning). Original: fov 50 @ z 7.
  camera: {
    fov: 35,
    near: 0.1,
    far: 1000,
    position: [-0.06, -0.35, 10.4],
  },

  // The rolling drum.
  cylinder: {
    radius: 1.7,
    height: 6.0,
    segments: 512,
  },

  // Wheel scrolling: raw wheel scaling, easing, and how scroll maps to the
  // texture's horizontal offset.
  scroll: {
    sensitivity: 0.002,     // wheel deltaY -> targetScroll
    ease: 0.08,             // eased approach of currentScroll to targetScroll
    offsetScale: 0.015,     // currentScroll -> texture.offset.x
    dragSensitivity: 0.01,  // pointer drag: pixels dragged -> targetScroll
    keyStep: 0.4,           // arrow-key press -> targetScroll (PageUp/Down = x4)
  },

  // Off-screen canvas used to rasterise the story text into a texture.
  canvas: {
    baseSize: 2048,   // reference width; texture.repeat compensates when wider
    textHeight: 2048,
  },

  // Text layout on the canvas (drawn rotated 90deg around the drum).
  layout: {
    // Text column width along the drum, reduced to 2/3 of the original 1700.
    // startX is kept at -maxWidth/2 so the column stays centered.
    maxWidth: 1133,
    startX: -567,
    initialY: -650,
    padding: 100,
    color: '#000000',
    frontNudge: -0.08, // pushes the title into the upper readable zone
    // Corrects the drum's circumference:height anamorphic stretch (glyphs would
    // otherwise render ~1.78x too tall). 1.0 = exact geometric correction;
    // nudge slightly (e.g. 0.95–1.1) if the glyphs still look off.
    aspect: 1.0,
    // "Charter" (bundled in Assets/fonts/, see @font-face in css/style.css) with
    // a serif fallback. The renderer builds the actual canvas font strings from
    // family + size + weight/style.
    fonts: {
      family: '"Charter", Georgia, "Times New Roman", serif',
      size: {
        h1: 44,
        h2: 38,
        h3: 34,
        bullet: 36,
        body: 26,
      },
    },
    // Vertical advances (px): per-line height and gap after each block kind.
    advance: {
      blank: 20,
      h1Line: 58, h1Gap: 16,
      h2Line: 50, h2Gap: 16,
      h3Line: 46, h3Gap: 16,
      bulletLine: 44, bulletGap: 12,
      bodyLine: 37,   // per wrapped body line (leading reduced by 1 from 38)
      bodyPara: 28,   // extra spacing after a body paragraph
    },
  },

  // Story data.
  paths: {
    textsBase: './texts/',
    manifest: './texts/index.json',
  },
};
