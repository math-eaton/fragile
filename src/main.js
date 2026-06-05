import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls }  from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass }     from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { cfg }            from './config.js';
import { Spider }         from './spider.js';
import { ThresholdShader, PixelationShader } from './shaders.js';

function cssToVec4(hex, alpha = 1) {
  const c = new THREE.Color(hex);
  return new THREE.Vector4(c.r, c.g, c.b, alpha);
}

const renderer = new THREE.WebGLRenderer({
  antialias:             false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// scene + cam
const scene  = new THREE.Scene();
scene.background = new THREE.Color(cfg.BG_CSS);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 0, cfg.CAM_Z);

// const camera = new THREE.OrthographicCamera(
//   window.innerWidth / -2,
//   window.innerWidth / 2,
//   window.innerHeight / 2,
//   window.innerHeight / -2,
//   0.1,
//   300
// );
// camera.position.set(0, 0, cfg.CAM_Z);


// light
const pointLight = new THREE.PointLight(0xffffff, 3.0, 120);
pointLight.position.set(5, 8, 10);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 15, 5);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight2.position.set(-8, -5, -10);
scene.add(directionalLight2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.05;

// post process
const W = window.innerWidth, H = window.innerHeight;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const thresholdPass = new ShaderPass({
  ...ThresholdShader,
  uniforms: {
    tDiffuse:       { value: null },
    resolution:     { value: new THREE.Vector2(W, H) },
    threshold:      { value: cfg.THRESHOLD },
    ditherStrength: { value: cfg.DITHER_STR },
    colorMix:       { value: 1.0 },
    aboveColor:     { value: cssToVec4(cfg.ABOVE_CSS, 1.0) },
    belowColor:     { value: cssToVec4(cfg.BELOW_CSS, cfg.BELOW_ALPHA) },
  },
});
thresholdPass.enabled = cfg.USE_THRESHOLD;
composer.addPass(thresholdPass);

const pixelPass = new ShaderPass({
  ...PixelationShader,
  uniforms: {
    tDiffuse:   { value: null },
    resolution: { value: new THREE.Vector2(W, H) },
    pixelSize:  { value: cfg.PIXEL_SIZE },
  },
});
pixelPass.enabled = cfg.USE_PIXELATION;
composer.addPass(pixelPass);

let spiders = [];

function buildSpiders() {
  for (const s of spiders) s.dispose();
  spiders = [];
  for (let i = 0; i < cfg.CREATURE_COUNT; i++) {
    spiders.push(new Spider(scene, cfg, i));
  }
}

buildSpiders();

// anim
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  for (const s of spiders) s.update(t);
  controls.update();
  composer.render();
}

animate();

// gui controls
const gui      = new GUI({ title: 'fragile', touchStyles: true });
let   guiSaved = {};

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

// &c
const sceneF = gui.addFolder('Scene');
sceneF.add(cfg, 'CREATURE_COUNT', 1, 8,  1  ).name('creatures').onChange(buildSpiders);
sceneF.add(cfg, 'SPAWN_SPREAD',   0, 30, 0.1).name('spacing').onChange(buildSpiders);
sceneF.add(cfg, 'LEG_COUNT',      4, 16, 1  ).name('legs')
  .onChange(() => spiders.forEach(s => s.rebuild()));
sceneF.add(cfg, 'SEG_COUNT',      8, 20, 1  ).name('segments')
  .onChange(() => spiders.forEach(s => s.rebuild()));

const colorF = gui.addFolder('Colors');

const bgProxy = { color: cfg.BG_CSS };

colorF.addColor(bgProxy, 'color').name('background').onChange(v => {
  cfg.BG_CSS = v;
  scene.background = new THREE.Color(v);
  document.body.style.backgroundColor = v;
});

colorF.add({ blend: cfg.BODY_BLEND }, 'blend', BLEND_MODES).name('blend mode')
  .onChange(v => { renderer.domElement.style.mixBlendMode = v; });

const lightF = gui.addFolder('Lighting');

const dir1Proxy = { color: '#ffffff' };
const dir2Proxy = { color: '#ffffff' };
const ambProxy  = { color: '#ffffff' };

lightF.add(directionalLight, 'intensity', 0, 8, 0.05).name('dir1 intensity');
lightF.addColor(dir1Proxy, 'color').name('dir1 color')
  .onChange(v => { directionalLight.color.set(v); });
lightF.add(directionalLight.position, 'x', -20, 20, 0.1).name('dir1 x');
lightF.add(directionalLight.position, 'y', -20, 20, 0.1).name('dir1 y');
lightF.add(directionalLight.position, 'z', -20, 20, 0.1).name('dir1 z');

lightF.add(directionalLight2, 'intensity', 0, 8, 0.05).name('dir2 intensity');
lightF.addColor(dir2Proxy, 'color').name('dir2 color')
  .onChange(v => { directionalLight2.color.set(v); });
lightF.add(directionalLight2.position, 'x', -20, 20, 0.1).name('dir2 x');
lightF.add(directionalLight2.position, 'y', -20, 20, 0.1).name('dir2 y');
lightF.add(directionalLight2.position, 'z', -20, 20, 0.1).name('dir2 z');

lightF.add(ambientLight, 'intensity', 0, 3, 0.05).name('ambient intensity');
lightF.addColor(ambProxy, 'color').name('ambient color')
  .onChange(v => { ambientLight.color.set(v); });

const physF = gui.addFolder('Physics');
physF.add(cfg, 'GRAVITY',       0,    0.06,  0.001).name('gravity');
physF.add(cfg, 'DRAG',          0.9,  1.0,   0.001).name('drag');
physF.add(cfg, 'NOISE_AMP',     0,    0.04,  0.001).name('noise amp');
physF.add(cfg, 'NOISE_SPEED',   0,    2.0,   0.01 ).name('noise speed');
physF.add(cfg, 'NOISE_SEED',    0,    100,   0.1  ).name('noise seed');

const renF = gui.addFolder('Render');
renF.add(cfg, 'TUBE_BASE_R', 0.001, 0.08, 0.001).name('base radius');
renF.add(cfg, 'TUBE_TIP_R',  0.0,   0.04, 0.001).name('tip radius');
renF.add(cfg, 'SHININESS', 0, 200, 1).name('shininess').onChange(v => {
  spiders.forEach(s => s.tentacles.forEach(t => { t.mesh.material.shininess = v; }));
});

const fxF = gui.addFolder('Post-FX');
const thU = thresholdPass.uniforms;
const pxU = pixelPass.uniforms;

fxF.add({ on: cfg.USE_THRESHOLD }, 'on').name('threshold')
  .onChange(v => { thresholdPass.enabled = v; });
fxF.add(thU.threshold,      'value', 0,   1,   0.001).name('  level');
fxF.add(thU.ditherStrength, 'value', 0,   0.5, 0.001).name('  dither');
fxF.add(thU.colorMix,       'value', 0,   1,   0.01 ).name('  color mix');
fxF.add({ on: cfg.USE_PIXELATION }, 'on').name('pixelate')
  .onChange(v => { pixelPass.enabled = v; });
fxF.add(pxU.pixelSize, 'value', 1, 32, 0.5).name('  pixel size');


const actF = gui.addFolder('Actions');
const actions = {
  Randomize() {
    cfg.NOISE_SEED = Math.random() * 100;
    buildSpiders();
  },
  'Vary Physics'() {
    spiders.forEach(s => s.randomizePhysics());
  },
  Screenshot() {
    composer.render();
    const url  = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href     = url;
    link.download = `fragile-${Date.now()}.png`;
    link.click();
  },
  'Reset Camera'() {
    camera.position.set(0, 0, cfg.CAM_Z);
    camera.lookAt(0, 0, 0);
    controls.reset();
  },
};
actF.add(actions, 'Randomize');
actF.add(actions, 'Vary Physics');
actF.add(actions, 'Screenshot');
actF.add(actions, 'Reset Camera');

gui.folders.forEach(f => f.close());

const toggleBtn = document.getElementById('gui-toggle');

gui.domElement.querySelector('.title').addEventListener('click', () => {
  if (gui._closed) {
    gui.open();                          // undo lil-gui's collapse
    gui.hide();
    toggleBtn.style.display = 'flex';
  }
});

toggleBtn.addEventListener('click', () => {
  gui.show();
  toggleBtn.style.display = 'none';
});




window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  thresholdPass.uniforms.resolution.value.set(w, h);
  pixelPass.uniforms.resolution.value.set(w, h);
});
