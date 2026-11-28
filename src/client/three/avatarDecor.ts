import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DecorShape } from '../../shared/types';
import { blackLacquer, brass, darkGold, gilt } from './materials';
import { canvas, glowTexture, toTexture, woodTexture } from './textures';

/**
 * The Avatar theme's decor tiles: paper lantern (1x1), Kyoshi war fans (2x1), potted jasmine (1x2), tea shelf
 * (3x1) and glider staff (1x3). Built like the classic props in tiles.ts: centred on the tile, standing out
 * from its backing (z = 0 is the backing's face), inside its cells (0.48 wide, 0.32 tall each), and clear of
 * the point shields in the bottom-left corner.
 */
export function avatarDecorProp(shape: DecorShape, seed: number): THREE.Object3D {
  switch (shape) {
    case '1x1':
      return paperLantern();
    case '2x1':
      return kyoshiFans();
    case '1x2':
      return pottedJasmine(seed);
    case '3x1':
      return teaShelf(seed);
    case '1x3':
      return gliderStaff();
  }
}

const TAU = Math.PI * 2;

function lazy<T>(make: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= make());
}

/** The curio shelf's little generator: the same tile id always gives the same arrangement. */
function seeded(seed: number): () => number {
  let k = Math.abs(Math.round(seed)) % 233280;
  return () => (k = (k * 9301 + 49297) % 233280) / 233280;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

const v2 = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

// ---------- materials ----------

const rosewood = lazy(() => new THREE.MeshStandardMaterial({ map: toTexture(woodTexture(256, '#1a0b06', '#5a2c1b', 5, 16)), roughness: 0.42 }));
const staffWood = lazy(() => {
  // The wood texture's grain runs across; turn it a quarter so it runs along the staff.
  const t = toTexture(woodTexture(256, '#86542a', '#d29d62', 9, 12));
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI / 2;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
});
const redSilk = new THREE.MeshStandardMaterial({ color: '#a3241b', roughness: 0.7 });
const greenSilk = new THREE.MeshStandardMaterial({ color: '#2f6a3b', roughness: 0.7 });
const redLacquer = new THREE.MeshPhysicalMaterial({ color: '#7d1a12', roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.18 });
const porcelain = new THREE.MeshPhysicalMaterial({ color: '#f3efe4', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
const yixingClay = new THREE.MeshStandardMaterial({ color: '#7a3a22', roughness: 0.62 });
const celadon = new THREE.MeshPhysicalMaterial({ color: '#a3c2a0', roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1 });
const bamboo = new THREE.MeshStandardMaterial({ color: '#b59a5c', roughness: 0.55 });
const soil = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 1 });

// ---------- 1x1: paper lantern ----------

/** How brightly a lantern's paper glows; flickerFlames in tiles.ts wavers it round this. */
const LANTERN_GLOW = 0.8;
const LANTERN_HH = 0.062;

/** The Fire Nation's flame: a tall middle tongue between two that curl outwards, on a short base. */
function fireEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(9, -20, 13, -6, 9, 6);
  ctx.bezierCurveTo(7, 13, 3, 17, 0, 18);
  ctx.bezierCurveTo(-3, 17, -7, 13, -9, 6);
  ctx.bezierCurveTo(-13, -6, -9, -20, 0, -34);
  ctx.fill();
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 5, 21);
    ctx.bezierCurveTo(sx * 22, 18, sx * 28, 2, sx * 21, -15);
    ctx.bezierCurveTo(sx * 20, -3, sx * 15, 6, sx * 8, 9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(-14, 21, 28, 5);
  ctx.restore();
}

/** Red paper round the lantern (u runs round it, v up it), with the emblem at u = 0.5. */
const lanternPaper = lazy(() => {
  const [c, ctx] = canvas(512, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#5e0f0a');
  g.addColorStop(0.5, '#cf3a20');
  g.addColorStop(1, '#5e0f0a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  // The bamboo ribs show through the paper.
  ctx.strokeStyle = 'rgba(70, 10, 4, 0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const x = (i + 0.5) * 32;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  ctx.fillStyle = '#e9b44c';
  ctx.fillRect(0, 10, 512, 4);
  ctx.fillRect(0, 114, 512, 4);
  fireEmblem(ctx, 256, 64, 1.05, '#f7d36b');
  return toTexture(c);
});

const lanternBody = lazy(() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push(new THREE.Vector2(0.036 + 0.046 * Math.pow(Math.sin(Math.PI * t), 0.65), -LANTERN_HH + 2 * LANTERN_HH * t));
  }
  return new THREE.LatheGeometry(pts, 32);
});

/** Warm light thrown on the wall behind a lantern. */
const haloMat = lazy(
  () =>
    new THREE.MeshBasicMaterial({
      map: toTexture(glowTexture()),
      color: '#ff8c3c',
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
);

function paperLantern(): THREE.Object3D {
  const g = new THREE.Group();
  const wood = rosewood();
  const hh = LANTERN_HH;
  const z = 0.094;
  // A dark wood arm reaches out from a small wall plate; the lantern hangs from its tip on a red cord.
  g.add(mesh(new THREE.BoxGeometry(0.046, 0.072, 0.012), wood, 0, 0.1, 0.006));
  g.add(mesh(new THREE.BoxGeometry(0.012, 0.014, 0.1), wood, 0, 0.123, 0.056));
  g.add(mesh(new THREE.SphereGeometry(0.009, 12, 8), gilt, 0, 0.123, 0.108));
  g.add(mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.03, 6), redSilk, 0, 0.101, z));
  g.add(mesh(new THREE.TorusGeometry(0.007, 0.0016, 6, 16), gilt, 0, hh + 0.022, z));
  // Its own material, so that every lantern flickers on its own.
  const paper = new THREE.MeshStandardMaterial({
    map: lanternPaper(),
    emissiveMap: lanternPaper(),
    emissive: '#ffb07a',
    emissiveIntensity: LANTERN_GLOW,
    roughness: 0.85,
  });
  const body = mesh(lanternBody(), paper, 0, 0, z);
  body.rotation.y = Math.PI;
  body.userData.flicker = Math.random() * 10;
  body.userData.glow = LANTERN_GLOW;
  g.add(body);
  // Black lacquer caps with gold rims, then a bead and a silk tassel underneath.
  for (const sy of [1, -1]) {
    g.add(mesh(new THREE.CylinderGeometry(sy > 0 ? 0.036 : 0.042, sy > 0 ? 0.042 : 0.036, 0.016, 24), blackLacquer, 0, sy * (hh + 0.008), z));
    const rim = mesh(new THREE.TorusGeometry(0.04, 0.0022, 6, 32), gilt, 0, sy * (hh + 0.001), z);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
  }
  g.add(mesh(new THREE.SphereGeometry(0.0065, 10, 8), gilt, 0, -hh - 0.023, z));
  g.add(mesh(new THREE.CylinderGeometry(0.0028, 0.011, 0.046, 10), redSilk, 0, -hh - 0.05, z));
  const halo = mesh(new THREE.PlaneGeometry(0.36, 0.3), haloMat(), 0, -0.005, 0.003);
  halo.userData.noShadow = true;
  g.add(halo);
  return g;
}

// ---------- 2x1: Kyoshi war fans ----------

const FAN_SPREAD = 2.6;
const FAN_R = 0.19;

/** A fan's leaf folded into pleats. Each pleat has its own corners, so the folds stay crisp. */
function pleatedLeaf(r0: number, r1: number, spread: number, folds: number, depth: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const a0 = Math.PI / 2 - spread / 2;
  const zOf = (i: number) => (i % 2 ? depth : 0);
  for (let i = 0; i < folds; i++) {
    const t0 = i / folds;
    const t1 = (i + 1) / folds;
    const a = a0 + spread * t0;
    const b = a0 + spread * t1;
    const n = pos.length / 3;
    pos.push(r0 * Math.cos(a), r0 * Math.sin(a), zOf(i) * 0.3);
    pos.push(r1 * Math.cos(a), r1 * Math.sin(a), zOf(i));
    pos.push(r1 * Math.cos(b), r1 * Math.sin(b), zOf(i + 1));
    pos.push(r0 * Math.cos(b), r0 * Math.sin(b), zOf(i + 1) * 0.3);
    // The texture is the leaf unrolled: its left edge is the fan's left end, its top the outer edge.
    uv.push(1 - t0, 0, 1 - t0, 1, 1 - t1, 1, 1 - t1, 0);
    index.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** A small cloud scroll: two spirals curling away from each other. */
function cloudScroll(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const a = t * TAU * 1.1;
      const rr = r * (1 - t * 0.85);
      const px = x + sx * (r - Math.cos(a) * rr);
      const py = y - Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
}

/** Gold leaf with a border along the edge, cloud scrolls, and Kyoshi green lacquer by the pivot. */
const fanLeafMat = lazy(() => {
  const [c, ctx] = canvas(512, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#f2d585');
  g.addColorStop(0.6, '#d9ae52');
  g.addColorStop(1, '#b88a36');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#946a20';
  ctx.fillRect(0, 5, 512, 3);
  ctx.fillRect(0, 13, 512, 2);
  ctx.strokeStyle = 'rgba(122, 84, 24, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) cloudScroll(ctx, 37 + i * 73, 54, 12);
  ctx.fillStyle = '#9b2a1f';
  ctx.fillRect(0, 92, 512, 3);
  ctx.fillStyle = '#2d5a36';
  ctx.fillRect(0, 95, 512, 33);
  // Satin like the gilt frames: a polished leaf flares where the chandelier reflects off it.
  return new THREE.MeshStandardMaterial({ map: toTexture(c), metalness: 0.7, roughness: 0.52 });
});

const fanLeaf = lazy(() => pleatedLeaf(0.06, FAN_R, FAN_SPREAD, 18, 0.006));

function fan(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(fanLeaf(), fanLeafMat()));
  // The guard sticks along both edges, and the inner sticks between the pivot and the leaf.
  for (const side of [-1, 1]) {
    const a = Math.PI / 2 + (side * FAN_SPREAD) / 2;
    const len = FAN_R + 0.008;
    const s = mesh(new THREE.BoxGeometry(0.011, len, 0.007), darkGold, (Math.cos(a) * len) / 2, (Math.sin(a) * len) / 2, 0.0075);
    s.rotation.z = a - Math.PI / 2;
    g.add(s);
  }
  for (let i = 1; i < 10; i++) {
    const a = Math.PI / 2 - FAN_SPREAD / 2 + (FAN_SPREAD * i) / 10;
    const s = mesh(new THREE.BoxGeometry(0.004, 0.058, 0.003), darkGold, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.002);
    s.rotation.z = a - Math.PI / 2;
    g.add(s);
  }
  const pin = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 16), gilt, 0, 0, 0.008);
  pin.rotation.x = Math.PI / 2;
  g.add(pin);
  g.add(mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.022, 6), greenSilk, 0, -0.019, 0.01));
  g.add(mesh(new THREE.CylinderGeometry(0.0025, 0.009, 0.034, 10), greenSilk, 0, -0.045, 0.01));
  return g;
}

/** Two open war fans side by side, leaning a little apart, their tops standing off the wall. */
function kyoshiFans(): THREE.Object3D {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const f = fan();
    f.position.set(side * 0.225, -0.075, 0.004);
    f.rotation.set(0.12, 0, -side * 0.1);
    g.add(f);
  }
  return g;
}

// ---------- 1x2: potted jasmine ----------

/** Blue and white porcelain: bands at rim and foot, and a flowering scroll round the belly. */
const potMat = lazy(() => {
  const [c, ctx] = canvas(512, 160);
  ctx.fillStyle = '#f2eee4';
  ctx.fillRect(0, 0, 512, 160);
  const blue = '#22408e';
  ctx.fillStyle = blue;
  ctx.fillRect(0, 6, 512, 7);
  ctx.fillRect(0, 18, 512, 2);
  ctx.fillRect(0, 140, 512, 2);
  ctx.fillRect(0, 146, 512, 8);
  ctx.strokeStyle = blue;
  ctx.lineWidth = 3;
  const wave = (x: number) => 80 + Math.sin((x / 512) * TAU * 4) * 22;
  ctx.beginPath();
  for (let x = 0; x <= 512; x += 4) {
    if (x) ctx.lineTo(x, wave(x));
    else ctx.moveTo(x, wave(x));
  }
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    // A flower beside each crest of the scroll, on its outer side, and a leaf further along.
    const x = 32 + i * 64;
    const y = wave(x) + (i % 2 ? -20 : 20);
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#f2eee4';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.ellipse(x + 22, wave(x + 22) + (i % 2 ? 9 : -9), 8, 3.5, i % 2 ? -0.6 : 0.6, 0, TAU);
    ctx.fill();
  }
  const t = toTexture(c);
  return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
});

const POT_H = 0.114;
const potBody = lazy(
  () =>
    new THREE.LatheGeometry(
      v2([
        [0, 0],
        [0.042, 0],
        [0.05, 0.012],
        [0.058, 0.024],
        [0.064, 0.036],
        [0.066, 0.048],
        [0.065, 0.06],
        [0.062, 0.072],
        [0.057, 0.084],
        [0.053, 0.096],
        [0.054, 0.104],
        [0.058, 0.11],
        [0.058, POT_H],
      ]),
      32,
    ),
);

const STAKE_X = 0.055;
const STAKE_LOW = -0.085;
const STAKE_TOP = 0.16;
const HOOP_R = 0.055;

/** A point on the vine and its outward direction: up the right stake, over the hoop, down the left stake. */
function vineAt(s: number): [number, number, number, number] {
  if (s < 0.35) return [STAKE_X, STAKE_LOW + (STAKE_TOP - STAKE_LOW) * (s / 0.35), 1, 0];
  if (s < 0.65) {
    const a = ((s - 0.35) / 0.3) * Math.PI;
    return [Math.cos(a) * HOOP_R, STAKE_TOP + Math.sin(a) * HOOP_R, Math.cos(a), Math.sin(a)];
  }
  return [-STAKE_X, STAKE_TOP - (STAKE_TOP - STAKE_LOW) * ((s - 0.65) / 0.35), -1, 0];
}

function leafShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.009, 0.011, 0, 0.03);
  s.quadraticCurveTo(-0.009, 0.011, 0, 0);
  return s;
}

/** Five rounded petals round a small heart. */
function flowerShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= 5; i++) {
    const notch = Math.PI / 2 + TAU / 10 + (i * TAU) / 5;
    const x = Math.cos(notch) * r * 0.3;
    const y = Math.sin(notch) * r * 0.3;
    if (!i) s.moveTo(x, y);
    else s.quadraticCurveTo(Math.cos(notch - TAU / 10) * r * 1.6, Math.sin(notch - TAU / 10) * r * 1.6, x, y);
  }
  return s;
}

/**
 * The whole plant as two meshes, leaves (with a shade of green each) and flowers, built once and shared by
 * every jasmine tile. Coordinates are the plant's own: the stakes stand at x = +-STAKE_X in the plane z = 0.
 */
const jasmineGeo = lazy(() => {
  const r = seeded(4242);
  const leafBase = new THREE.ShapeGeometry(leafShape(), 3);
  const flowerBase = new THREE.ShapeGeometry(flowerShape(0.0105), 3);
  const budBase = new THREE.SphereGeometry(0.0042, 8, 6);
  const dark = new THREE.Color('#244f22');
  const light = new THREE.Color('#4f8a3a');
  const leaves: THREE.BufferGeometry[] = [];
  const flowers: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const put = (list: THREE.BufferGeometry[], base: THREE.BufferGeometry, x: number, y: number, z: number, rz: number, tilt: number, size: number, color?: THREE.Color) => {
    m.compose(p.set(x, y, z), q.setFromEuler(e.set((r() - 0.5) * tilt, (r() - 0.5) * tilt, rz)), sc.setScalar(size));
    const geo = base.clone().applyMatrix4(m);
    if (color) {
      const n = geo.attributes.position.count;
      const rgb = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) color.toArray(rgb, i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    }
    list.push(geo);
  };
  for (let i = 0; i < 100; i++) {
    // Leaves all along the vine, mostly on the outside of the hoop, pointing roughly away from it.
    const [x, y, nx, ny] = vineAt((i + r()) / 100);
    const off = (r() - 0.35) * 0.045;
    const dir = Math.atan2(ny, nx) - Math.PI / 2 + (r() - 0.5) * 2.2;
    put(leaves, leafBase, x + nx * off, y + ny * off, (r() - 0.4) * 0.04, dir, 1.6, 0.85 + r() * 0.5, dark.clone().lerp(light, r()));
  }
  for (let i = 0; i < 24; i++) {
    // A bushy base over the soil.
    const a = (i / 23) * Math.PI;
    put(leaves, leafBase, Math.cos(a) * 0.045 * r(), STAKE_LOW + r() * 0.03, (r() - 0.3) * 0.05, a - Math.PI / 2, 1.2, 0.8 + r() * 0.4, dark.clone().lerp(light, r()));
  }
  for (let i = 0; i < 24; i++) {
    const [x, y, nx, ny] = vineAt(0.04 + r() * 0.92);
    const off = (r() - 0.3) * 0.03;
    put(flowers, flowerBase, x + nx * off, y + ny * off, 0.012 + r() * 0.02, r() * TAU, 1.0, 0.8 + r() * 0.4);
  }
  for (let i = 0; i < 10; i++) {
    const [x, y, nx, ny] = vineAt(r());
    const off = (r() - 0.2) * 0.035;
    put(flowers, budBase, x + nx * off, y + ny * off, 0.01 + r() * 0.02, 0, 0, 0.8 + r() * 0.4);
  }
  return { leaves: mergeGeometries(leaves)!, flowers: mergeGeometries(flowers)! };
});

const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide });
const flowerMat = new THREE.MeshStandardMaterial({ color: '#fbf8ef', roughness: 0.6, side: THREE.DoubleSide, emissive: '#fff8e8', emissiveIntensity: 0.08 });

/** Jasmine climbing a bamboo hoop, in a blue and white pot on a small wall shelf. */
function pottedJasmine(seed: number): THREE.Object3D {
  const g = new THREE.Group();
  const wood = rosewood();
  g.add(mesh(new THREE.BoxGeometry(0.27, 0.02, 0.12), wood, 0, -0.215, 0.06));
  g.add(mesh(new THREE.BoxGeometry(0.034, 0.06, 0.085), wood, 0, -0.255, 0.043));
  const base = -0.205;
  const z = 0.064;
  const pot = mesh(potBody(), potMat(), 0, base, z);
  pot.rotation.y = Math.PI;
  g.add(pot);
  const earth = mesh(new THREE.CircleGeometry(0.054, 24), soil, 0, base + 0.104, z);
  earth.rotation.x = -Math.PI / 2;
  g.add(earth);
  const plant = new THREE.Group();
  plant.position.z = z;
  const stakeLen = STAKE_TOP - (base + 0.1);
  for (const sx of [-1, 1]) plant.add(mesh(new THREE.CylinderGeometry(0.0032, 0.0032, stakeLen, 6), bamboo, sx * STAKE_X, STAKE_TOP - stakeLen / 2));
  plant.add(mesh(new THREE.TorusGeometry(HOOP_R, 0.0032, 6, 24, Math.PI), bamboo, 0, STAKE_TOP));
  const { leaves, flowers } = jasmineGeo();
  plant.add(new THREE.Mesh(leaves, leafMat), new THREE.Mesh(flowers, flowerMat));
  // Every other jasmine is the mirror image, so neighbours differ.
  if (seed % 2) plant.scale.x = -1;
  g.add(plant);
  return g;
}

// ---------- 3x1: tea shelf ----------

interface Item {
  obj: THREE.Object3D;
  /** Its extent along x, in its own coordinates. */
  minX: number;
  maxX: number;
  /** How far in front of the shelf's middle it stands. */
  dz?: number;
}

const TIN_COLORS = ['#8f1d16', '#2e5b3f', '#b0822c', '#1d2a44'];
const tinMats = new Map<string, THREE.Material>();
const tinMat = (color: string) => {
  let m = tinMats.get(color);
  if (!m) tinMats.set(color, (m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.2 })));
  return m;
};

/** Brush strokes that read as two written characters, stacked as on a tea label. */
const GLYPHS: number[][][] = [
  // [x0, y0, x1, y1] strokes in a 32 x 32 box centred on 0.
  [
    [-13, -8, 13, -8],
    [0, -15, 0, 15],
    [0, -6, -13, 12],
    [0, -6, 13, 12],
  ],
  [
    [-12, -13, 12, -13],
    [-10, 0, 10, 0],
    [-14, 13, 14, 13],
    [0, -13, 0, 13],
  ],
  [
    [-11, -11, -11, 11],
    [-11, -11, 11, -11],
    [11, -11, 11, 11],
    [-11, 11, 11, 11],
    [-6, 0, 6, 0],
  ],
  [
    [2, -15, -12, 14],
    [0, -4, 13, 14],
    [-14, -6, 14, -6],
  ],
];

const labelMats = lazy(() =>
  [0, 1, 2].map((k) => {
    const [c, ctx] = canvas(96, 128);
    ctx.fillStyle = '#efe3c4';
    ctx.fillRect(0, 0, 96, 128);
    ctx.strokeStyle = '#a3241b';
    ctx.lineWidth = 4;
    ctx.strokeRect(7, 7, 82, 114);
    ctx.strokeStyle = '#1b1410';
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    for (const [j, cy] of [40, 84].entries()) {
      for (const [x0, y0, x1, y1] of GLYPHS[(k + j * 2) % GLYPHS.length]) {
        ctx.beginPath();
        ctx.moveTo(48 + x0, cy + y0);
        ctx.lineTo(48 + x1, cy + y1);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#b3261e';
    ctx.fillRect(66, 104, 12, 12);
    return new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 0.8 });
  }),
);

/** Three lacquered tea tins with paper labels and brass lids. */
function tins(r: () => number): Item {
  const g = new THREE.Group();
  const colors = [...TIN_COLORS].sort(() => r() - 0.5);
  const rad = 0.026;
  let x = 0;
  for (let i = 0; i < 3; i++) {
    const h = 0.09 + r() * 0.04;
    const cx = x + rad;
    g.add(mesh(new THREE.CylinderGeometry(rad, rad, h, 24), tinMat(colors[i]), cx, h / 2));
    g.add(mesh(new THREE.CylinderGeometry(rad + 0.0008, rad + 0.0008, h * 0.56, 16, 1, true, -0.62, 1.24), labelMats()[i], cx, h * 0.48));
    g.add(mesh(new THREE.CylinderGeometry(rad + 0.0022, rad + 0.0022, 0.016, 24), brass, cx, h + 0.006));
    g.add(mesh(new THREE.SphereGeometry(0.006, 10, 8), brass, cx, h + 0.016));
    x += rad * 2 + 0.008;
  }
  return { obj: g, minX: 0, maxX: x - 0.008 };
}

/** A lathe profile's radius at height y. */
function radiusAt(profile: number[][], y: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    if (y1 > y0 && y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return profile[profile.length - 1][0];
}

/** A teapot seen side on, spout to the right: a lathed body and lid, a tube spout and a ring handle. */
function teapot(body: number[][], mat: THREE.Material, spout: number[][], handleR: number, handleY: number): Item {
  const g = new THREE.Group();
  g.add(mesh(new THREE.LatheGeometry(v2(body), 28), mat));
  const [rimR, rimY] = body[body.length - 1];
  const top = rimY + 0.012;
  g.add(mesh(new THREE.LatheGeometry(v2([[rimR + 0.002, rimY], [rimR * 0.8, rimY + 0.006], [rimR * 0.4, top - 0.001], [0, top]]), 24), mat));
  g.add(mesh(new THREE.SphereGeometry(0.0075, 12, 8), mat, 0, top + 0.004));
  const [a, b, c] = spout.map(([x, y]) => new THREE.Vector3(x, y, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, b, c), 12, 0.0068, 8), mat));
  // A ring handle on the left with its gap towards the body; both ends sink just into it.
  const turn = Math.PI * 0.375;
  const reach = Math.cos(turn) * handleR;
  const rise = Math.sin(turn) * handleR;
  const hx = -Math.max(radiusAt(body, handleY - rise), radiusAt(body, handleY + rise)) + 0.003 - reach;
  const handle = mesh(new THREE.TorusGeometry(handleR, 0.0055, 8, 20, Math.PI * 1.25), mat, hx, handleY);
  handle.rotation.z = turn;
  g.add(handle);
  return { obj: g, minX: hx - handleR - 0.006, maxX: c.x + 0.007 };
}

const clayPot = () =>
  teapot(
    [
      [0, 0],
      [0.036, 0],
      [0.048, 0.008],
      [0.056, 0.026],
      [0.054, 0.042],
      [0.044, 0.054],
      [0.03, 0.06],
      [0.026, 0.061],
    ],
    yixingClay,
    [
      [0.05, 0.022],
      [0.085, 0.03],
      [0.098, 0.06],
    ],
    0.022,
    0.03,
  );

const celadonPot = () =>
  teapot(
    [
      [0, 0],
      [0.03, 0],
      [0.046, 0.012],
      [0.054, 0.034],
      [0.05, 0.056],
      [0.036, 0.072],
      [0.022, 0.078],
    ],
    celadon,
    [
      [0.048, 0.03],
      [0.075, 0.035],
      [0.088, 0.064],
    ],
    0.024,
    0.04,
  );

/** Three porcelain tea bowls on a small tray. */
function cups(): Item {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.17, 0.008, 0.075), rosewood(), 0, 0.004));
  const cup = new THREE.LatheGeometry(
    v2([
      [0, 0],
      [0.011, 0],
      [0.012, 0.003],
      [0.016, 0.006],
      [0.019, 0.022],
      [0.0192, 0.025],
      [0.0175, 0.025],
      [0.0165, 0.008],
      [0, 0.0065],
    ]),
    20,
  );
  for (const x of [-0.052, 0, 0.052]) g.add(mesh(cup, porcelain, x, 0.008));
  return { obj: g, minX: -0.085, maxX: 0.085 };
}

/** The White Lotus tile, Iroh's favourite at Pai Sho: a lotus on dark wood in a gold ring. */
const paiShoFace = lazy(() => {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#4b2416';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#d9ae52';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 57, 0, TAU);
  ctx.stroke();
  ctx.translate(64, 64);
  for (const [n, len, wide, color, turn] of [
    [8, 24, 9, '#f7f2e6', 0],
    [8, 14, 6, '#f0c9c0', TAU / 16],
  ] as const) {
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate(turn + (i * TAU) / n);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -len, wide, len - 2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = '#e8b54a';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TAU);
  ctx.fill();
  return new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 0.5 });
});

function paiShoTile(): Item {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.007, 32), [rosewood(), paiShoFace(), rosewood()], 0, 0.03);
  // Standing on its edge, leaning back against the wall.
  t.rotation.x = Math.PI / 2 - 0.22;
  g.add(t);
  return { obj: g, minX: -0.03, maxX: 0.03, dz: -0.035 };
}

/** A rosewood shelf with upturned ends: tea tins, two teapots, tea bowls and a Pai Sho tile. */
function teaShelf(seed: number): THREE.Object3D {
  const r = seeded(seed);
  const g = new THREE.Group();
  const wood = rosewood();
  const top = -0.048;
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.024, 0.12), wood, 0, -0.06, 0.06));
  for (const sx of [-1, 1]) {
    const end = mesh(new THREE.BoxGeometry(0.05, 0.014, 0.12), wood, sx * 0.615, -0.052, 0.06);
    end.rotation.z = sx * 0.28;
    g.add(end);
    g.add(mesh(new THREE.BoxGeometry(0.026, 0.07, 0.09), wood, sx * 0.47, -0.107, 0.045));
  }
  const items = [tins(r), clayPot(), cups(), paiShoTile(), celadonPot()];
  if (r() < 0.5) items.reverse();
  // Life size, the pots and tins look lost on so long a shelf.
  const k = 1.25;
  const span = 1.14;
  const used = items.reduce((s, it) => s + (it.maxX - it.minX) * k, 0);
  const gap = (span - used) / (items.length - 1);
  let x = -span / 2;
  for (const it of items) {
    it.obj.scale.setScalar(k);
    it.obj.position.set(x - it.minX * k, top, 0.06 + (it.dz ?? 0));
    g.add(it.obj);
    x += (it.maxX - it.minX) * k + gap;
  }
  return g;
}

// ---------- 1x3: glider staff ----------

/** The Air Nomads' sign, bold enough to read at a few pixels: three arms swirling out from the middle, in a ring. */
const airEmblem = lazy(() => {
  const S = 128;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = '#ead39b';
  ctx.fillRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2);
  // A cylinder's cap shows its texture a quarter turn round: draw it turned back so the sign stands upright.
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#c8641e';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.save();
    ctx.rotate(Math.PI / 2 + (k * TAU) / 3);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = t * Math.PI * 1.5;
      const rr = 4 + t * 36;
      if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.restore();
  }
  return new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 0.5 });
});

const wingFrame = new THREE.MeshStandardMaterial({ color: '#5a3218', roughness: 0.6, side: THREE.DoubleSide });
const wingYellow = new THREE.MeshStandardMaterial({ color: '#e0a73a', roughness: 0.7, side: THREE.DoubleSide });
const wingRed = new THREE.MeshStandardMaterial({ color: '#b23a22', roughness: 0.7, side: THREE.DoubleSide });

/** One folded wing beside the staff: widest high up, rounded at the top. Its inner edge is the staff's axis. */
function wingShape(w: number, len: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.7, len * 0.2, w * 1.45, len * 0.75, 0, len);
  s.lineTo(0, 0);
  return s;
}

/** Aang's glider folded into a staff, leaning a little, held to the wall by two brass rings. */
function gliderStaff(): THREE.Object3D {
  const g = new THREE.Group();
  const z = 0.05;
  g.add(mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.84, 12), staffWood(), 0, -0.01, z));
  g.add(mesh(new THREE.CylinderGeometry(0.0135, 0.0112, 0.034, 12), redLacquer, 0, 0.405, z));
  g.add(mesh(new THREE.SphereGeometry(0.0135, 14, 10), redLacquer, 0, 0.422, z));
  g.add(mesh(new THREE.CylinderGeometry(0.0122, 0.0122, 0.02, 12), brass, 0, -0.41, z));
  g.add(mesh(new THREE.SphereGeometry(0.0112, 12, 8), staffWood(), 0, -0.43, z));
  // The folded wings either side of the upper staff: orange-red cloth edged in yellow, on a dark wooden frame.
  for (const side of [-1, 1]) {
    for (const [w, len, y0, mat, dz] of [
      [0.052, 0.53, -0.125, wingFrame, -0.0015],
      [0.045, 0.5, -0.11, wingYellow, 0],
      [0.033, 0.45, -0.085, wingRed, 0.0015],
    ] as const) {
      const m = mesh(new THREE.ShapeGeometry(wingShape(w, len), 12), mat, 0, y0, z + dz);
      m.scale.x = side;
      g.add(m);
    }
  }
  // An Air Nomad medallion where the wings are widest.
  const medal = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 24), [brass, airEmblem(), brass], 0, 0.18, z + 0.0125);
  medal.rotation.x = Math.PI / 2;
  g.add(medal);
  for (const y of [-0.27, 0.36]) {
    const ring = mesh(new THREE.TorusGeometry(0.0135, 0.0026, 6, 18), brass, 0, y, z);
    ring.rotation.x = Math.PI / 2;
    const rod = mesh(new THREE.CylinderGeometry(0.003, 0.003, z - 0.0135, 6), brass, 0, y, (z - 0.0135) / 2);
    rod.rotation.x = Math.PI / 2;
    g.add(ring, rod);
  }
  // Leaning to the left keeps its foot off the point shields.
  g.rotation.z = 0.2;
  return g;
}
