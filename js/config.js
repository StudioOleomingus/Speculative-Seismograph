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
  camera: {
    fov: 50,
    near: 0.1,
    far: 1000,
    position: [-0.06, -0.35, 7.0],
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
    sensitivity: 0.002, // wheel deltaY -> targetScroll
    ease: 0.08,         // eased approach of currentScroll to targetScroll
    offsetScale: 0.015, // currentScroll -> texture.offset.x
  },

  // Off-screen canvas used to rasterise the story text into a texture.
  canvas: {
    baseSize: 2048,   // reference width; texture.repeat compensates when wider
    textHeight: 2048,
  },

  // Text layout on the canvas (drawn rotated 90deg around the drum).
  layout: {
    startX: -850,
    maxWidth: 1700,
    initialY: -650,
    padding: 100,
    color: '#222222',
    frontNudge: -0.08, // pushes the title into the upper readable zone
    fonts: {
      header: 'bold 46px "Courier New", Courier, monospace',
      bullet: '38px "Courier New", Courier, monospace',
      body:   '28px "Courier New", Courier, monospace',
    },
    // Vertical advances (px) per line kind.
    advance: {
      blank: 20,
      header: 64,
      bullet: 56,
      bodyLine: 38,  // per wrapped body line
      bodyPara: 28,  // extra spacing after a body paragraph
    },
  },

  // Story data.
  paths: {
    textsBase: './texts/',
    manifest: './texts/index.json',
  },
};
