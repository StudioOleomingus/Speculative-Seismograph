// --- Three.js scene --------------------------------------------------------
// Builds the scene, the rolling cylinder (mapped with the text texture), the
// wheel-driven scroll, and the animation loop. Consumes the texture and the
// front-facing offset from the text renderer.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { CONFIG } from './config.js';
import { texture, getFrontOffset } from './text-renderer.js';

let targetScroll = 0;
let currentScroll = 0;

export function resetScroll() {
  targetScroll = 0;
  currentScroll = 0;
}

export function initScene(container) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far,
  );
  camera.position.set(...CONFIG.camera.position);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(5, 10, 7);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight2.position.set(-5, -5, 2);
  scene.add(dirLight2);

  // Open-ended cylinder; UVs shifted by 0.5 so the seam sits at the back.
  const geometry = new THREE.CylinderGeometry(
    CONFIG.cylinder.radius,
    CONFIG.cylinder.radius,
    CONFIG.cylinder.height,
    CONFIG.cylinder.segments,
    1,
    true,
  );
  const uvAttr = geometry.attributes.uv;
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setX(i, (uvAttr.getX(i) + 0.5) % 1.0);
  }
  uvAttr.needsUpdate = true;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.0,
    color: 0xffffff,
    transparent: true,
    side: THREE.FrontSide,
  });

  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.rotation.z = Math.PI / 2; // lie horizontally
  scene.add(cylinder);

  window.addEventListener('wheel', (event) => {
    targetScroll += event.deltaY * CONFIG.scroll.sensitivity;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    currentScroll += (targetScroll - currentScroll) * CONFIG.scroll.ease;
    texture.offset.x = getFrontOffset() - currentScroll * CONFIG.scroll.offsetScale;
    renderer.render(scene, camera);
  }
  animate();
}
