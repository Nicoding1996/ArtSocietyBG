import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { decorInfo, makeDecor } from '../shared/content';
import { DECOR_SHAPES, THEMES, type ThemeId } from '../shared/types';
import { setTheme } from './theme';
import { CELL_H, CELL_W } from './three/layout';
import { WALL_STYLES } from './three/textures';
import { decorMesh, flickerFlames } from './three/tiles';

const GAP = 0.16;

/**
 * Every theme's decor tiles on a lit wall, one row per theme, handy for tuning their models. `&theme=avatar`
 * shows one theme, `&shape=2x1` one shape, `&wall=1` another wall colour (0 to 3) and `&zoom=2` comes closer.
 */
export function showDecorPage(ui: HTMLElement, params: URLSearchParams) {
  const one = THEMES.find((t) => t === params.get('theme'));
  const themes: ThemeId[] = one ? [one] : [...THEMES];
  const shapes = DECOR_SHAPES.filter((s) => !params.has('shape') || s === params.get('shape'));
  const style = WALL_STYLES[Math.abs(Number(params.get('wall')) || 0) % WALL_STYLES.length];
  const zoom = Number(params.get('zoom')) || 1;

  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene') as HTMLCanvasElement, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // Lit like a wall in the salon: the soft room reflection, a warm key light from high up and the chandelier.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07060a');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  scene.add(new THREE.HemisphereLight('#ffe9cf', '#2a1810', 0.55));
  const key = new THREE.DirectionalLight('#ffe2b8', 1.6);
  key.position.set(-4, 10, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const chandelier = new THREE.PointLight('#ffd9a0', 34, 22, 1.25);
  chandelier.position.set(0, 2, 8.6);
  scene.add(chandelier);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: style.base, roughness: 0.85 }));
  wall.receiveShadow = true;
  scene.add(wall);
  const backing = new THREE.MeshStandardMaterial({ color: style.stripe, roughness: 0.78 });
  backing.color.multiplyScalar(0.92);

  const rowW = shapes.reduce((s, sh) => s + Number(sh[0]) * CELL_W, 0) + GAP * (shapes.length - 1);
  const rowH = Math.max(...shapes.map((s) => Number(s[2]) * CELL_H)) + 0.3;
  const labels: { el: HTMLElement; at: THREE.Vector3 }[] = [];
  themes.forEach((t, row) => {
    // The tiles pick their models from the current theme.
    setTheme(t);
    const y = ((themes.length - 1) / 2 - row) * rowH;
    let x = -rowW / 2;
    shapes.forEach((s, i) => {
      const d = makeDecor(s, `d${row * 10 + i + 1}`);
      const w = d.w * CELL_W;
      const obj = decorMesh(d, { backing });
      obj.position.set(x + w / 2, y, 0.001);
      scene.add(obj);
      const el = document.createElement('div');
      el.textContent = `${decorInfo(t)[s].name} \u00b7 ${s}`;
      el.style.cssText = 'position:absolute;transform:translate(-50%,6px);font-size:12px;color:#cbbd9e;white-space:nowrap';
      ui.appendChild(el);
      labels.push({ el, at: new THREE.Vector3(x + w / 2, y - (d.h * CELL_H) / 2, 0) });
      x += w + GAP;
    });
  });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  // The game's bloom: only true highlights (candle flames) glow.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.45, 1.9));
  composer.addPass(new OutputPass());

  const fit = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((themes.length * rowH + 0.4) / 2 / tan, (rowW + 0.6) / 2 / (tan * camera.aspect)) / zoom;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const l of labels) {
      const p = l.at.clone().project(camera);
      l.el.style.left = `${((p.x + 1) / 2) * w}px`;
      l.el.style.top = `${((1 - p.y) / 2) * h}px`;
    }
  };
  fit();
  window.addEventListener('resize', fit);
  const frame = () => {
    flickerFlames(scene, performance.now() / 1000);
    composer.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
