import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FrameId } from '../../shared/types';
import { scrollPath, shellRim, type Pt } from '../ui/frameArt';
import { fbm, makeNoise } from '../util/noise';
import { brass, gilt, gold, silver } from './materials';
import { canvas, woodTexture } from './textures';

// Four frames that differ in shape as well as colour (the panels draw the same designs, see ui/frameArt):
//   pearl   pearl-white lacquer with stepped corners, a pearl in each step, a gold edge, gold scrolls
//           at the corners and a gold crest at the top
//   gilded  carved gold: a shell on each corner breaking the outline, scrolls along the edges, crests
//           on the top and long sides, a raised outer rim and a dark cove at the opening
//   silver  slim, with rounded corners and a polished bead at the opening
//   walnut  wide, four grained pieces mitred at the corners, with a brass inner edge

const rectPts = (w: number, h: number): Pt[] => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
];

/** A rectangle with a square step cut out of each corner. */
export function steppedPts(w: number, h: number, s: number): Pt[] {
  const x = w / 2;
  const y = h / 2;
  return [
    [-x + s, -y],
    [x - s, -y],
    [x - s, -y + s],
    [x, -y + s],
    [x, y - s],
    [x - s, y - s],
    [x - s, y],
    [-x + s, y],
    [-x + s, y - s],
    [-x, y - s],
    [-x, -y + s],
    [-x + s, -y + s],
  ];
}

function roundedPts(w: number, h: number, r: number, seg = 6): Pt[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const out: Pt[] = [];
  const corners: [number, number, number][] = [
    [w / 2 - rr, -h / 2 + rr, -Math.PI / 2],
    [w / 2 - rr, h / 2 - rr, 0],
    [-w / 2 + rr, h / 2 - rr, Math.PI / 2],
    [-w / 2 + rr, -h / 2 + rr, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return out;
}

function shapeOf(outer: Pt[], hole?: Pt[]): THREE.Shape {
  const s = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
  if (hole) s.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  return s;
}

/** Extrudes from z = 0 to z = depth + 2 * bevel; the bevel grows the outline by `bevel`. */
function extrude(shape: THREE.Shape, depth: number, bevel: number, segments: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 1,
  });
  g.translate(0, 0, bevel);
  return g;
}

/** A rectangular ring whose widest outline is ow x oh and whose opening is iw x ih. */
function rectRing(ow: number, oh: number, iw: number, ih: number, depth: number, bevel: number, segments = 2): THREE.BufferGeometry {
  return extrude(shapeOf(rectPts(ow - 2 * bevel, oh - 2 * bevel), rectPts(iw + 2 * bevel, ih + 2 * bevel)), depth, bevel, segments);
}

function sphere(r: number, x: number, y: number, z: number, flat = 1, seg = 12): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))).toNonIndexed();
  g.scale(1, 1, flat);
  g.translate(x, y, z);
  return g;
}

/** Keeps only the attributes every part shares, so the parts can be merged. */
function strip(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
  n.clearGroups();
  return n;
}

const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map(strip)) ?? strip(parts[0]);

// ---------- carved ornament ----------

/**
 * The top half of a round moulding laid along a flat curve at height z (the half against the frame is
 * never seen), its radius running from r0 at the start to r1 at the end.
 */
function halfTube(pts: Pt[], r0: number, r1: number, z: number, radial = 5): THREE.BufferGeometry {
  const n = pts.length;
  const ring = radial + 1;
  const pos = new Float32Array(n * ring * 3);
  const nor = new Float32Array(n * ring * 3);
  const uv = new Float32Array(n * ring * 2);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n - 1, i + 1)];
    const tl = Math.hypot(bx - ax, by - ay) || 1;
    // The side of the curve to its left; the cross-section sweeps from there, over the top, to the right.
    const nx = -(by - ay) / tl;
    const ny = (bx - ax) / tl;
    const r = r0 + ((r1 - r0) * i) / (n - 1);
    for (let j = 0; j < ring; j++) {
      const th = (j / radial) * Math.PI;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const v = i * ring + j;
      pos.set([x + c * nx * r, y + c * ny * r, z + s * r], v * 3);
      nor.set([c * nx, c * ny, s], v * 3);
      uv.set([x, y], v * 2);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * ring + j;
      const b = a + ring;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** A C-scroll in relief: the moulding along its path and a small bead closing its eye. */
function scroll(start: Pt, eye: Pt, R: number, dir: 1 | -1, r0: number, z: number, turns = 0.9): THREE.BufferGeometry[] {
  const path = scrollPath(start, eye, R, turns, dir);
  const end = path[path.length - 1];
  return [halfTube(path, r0, r0 * 0.55, z), sphere(r0 * 0.85, end[0], end[1], z, 0.8, 8)];
}

/**
 * A scallop shell: fluted ribs fanning from a hinge at `h` towards angle `ang`, `len` long and
 * `spread` radians wide, on a plate that rises from `z0` to just above `z`. `limit` keeps the rim
 * inside a box (minX, minY, maxX, maxY), for shells that may only break the frame's outline a little.
 */
function shell(h: Pt, ang: number, len: number, spread: number, z0: number, z: number, ribs = 7, limit?: [number, number, number, number]): THREE.BufferGeometry[] {
  const rimAt = (t: number) => shellRim(h, ang, len, spread, ribs, limit, t);
  const outline: Pt[] = [h];
  const steps = ribs * 4;
  for (let i = 0; i <= steps; i++) outline.push(rimAt(i / steps));
  const thick = z - z0;
  const plate = extrude(shapeOf(outline), Math.max(0.0005, thick - 0.0016), 0.0012, 1);
  plate.translate(0, 0, z0);
  const parts = [plate];
  for (let k = 0; k < ribs; k++) {
    const t = (k + 0.5) / ribs;
    const [ex, ey] = rimAt(t);
    const pts: Pt[] = [];
    for (let i = 0; i <= 5; i++) {
      const u = 0.1 + (0.82 * i) / 5;
      pts.push([h[0] + (ex - h[0]) * u, h[1] + (ey - h[1]) * u]);
    }
    parts.push(halfTube(pts, len * 0.03, len * 0.075, z + 0.0004, 4));
  }
  return parts;
}

// ---------- materials ----------

/**
 * Mother-of-pearl: off-white with soft waves of blush, lavender and pale aqua. Frame UVs are local
 * positions (about -0.8 to 0.8), so the texture is mapped once across a frame rather than repeated.
 */
function nacreTextures(): { color: THREE.CanvasTexture; film: THREE.CanvasTexture } {
  const S = 512;
  const [c, ctx] = canvas(S);
  const [fc, fctx] = canvas(S);
  const img = ctx.createImageData(S, S);
  const film = fctx.createImageData(S, S);
  const warpN = makeNoise(31);
  const hueN = makeNoise(57);
  const base = [240, 233, 222];
  const blush = [255, 196, 210];
  const lilac = [212, 198, 250];
  const aqua = [182, 234, 222];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = x / S;
      const ny = y / S;
      const warp = fbm(warpN, nx * 3, ny * 3, 3);
      const wave = Math.sin((nx * 14 + ny * 6 + warp * 3.4) * Math.PI) * 0.5 + 0.5;
      const hue = Math.max(0, Math.min(1, fbm(hueN, nx * 3, ny * 3, 2) * 1.4 + 0.5));
      const [a, b, f] = hue < 0.5 ? [blush, lilac, hue * 2] : [lilac, aqua, (hue - 0.5) * 2];
      const t = 0.4 + wave * 0.6;
      const lift = Math.pow(wave, 6) * 12;
      const i = (y * S + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = base[k] + (a[k] + (b[k] - a[k]) * f - base[k]) * t + lift;
      img.data[i + 3] = 255;
      // The thickness of the nacre's film, which sets the colours its sheen breaks into.
      const th = Math.max(0, Math.min(255, (hue * 0.6 + wave * 0.4) * 255));
      film.data[i] = film.data[i + 1] = film.data[i + 2] = th;
      film.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  fctx.putImageData(film, 0, 0);
  const tex = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.repeat.set(0.5, 0.5);
    t.offset.set(0.5, 0.5);
    return t;
  };
  return { color: tex(c, true), film: tex(fc, false) };
}

export const pearl = new THREE.MeshPhysicalMaterial({
  color: '#ece5dc',
  roughness: 0.38,
  clearcoat: 0.3,
  clearcoatRoughness: 0.25,
  iridescence: 1,
  iridescenceIOR: 1.45,
  iridescenceThicknessMinimum: 280,
  iridescenceThicknessMaximum: 620,
  sheen: 0.2,
  sheenRoughness: 0.4,
  sheenColor: new THREE.Color('#f7dfe9'),
});
export const pearlBead = new THREE.MeshPhysicalMaterial({
  color: '#f8f4ee',
  roughness: 0.12,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  iridescence: 1,
  iridescenceIOR: 1.45,
  iridescenceThicknessMinimum: 260,
  iridescenceThicknessMaximum: 640,
  sheen: 0.4,
  sheenColor: new THREE.Color('#ffe6f1'),
});
/** The pearl lacquer, with its nacre added on first use (it needs a canvas). */
function pearlMat(): THREE.MeshPhysicalMaterial {
  if (!pearl.map) {
    const { color, film } = nacreTextures();
    pearl.map = color;
    pearl.iridescenceThicknessMap = film;
    pearl.needsUpdate = true;
  }
  return pearl;
}
/** The carved cove of the gilded frame: deeper in, so darker and less polished. */
const coveGold = new THREE.MeshStandardMaterial({ color: '#86622a', metalness: 1, roughness: 0.52 });
const polishedSilver = new THREE.MeshStandardMaterial({ color: '#e6ebf0', metalness: 1, roughness: 0.26 });
let walnutWood: THREE.MeshStandardMaterial | null = null;
function walnutFrameMat(): THREE.MeshStandardMaterial {
  if (walnutWood) return walnutWood;
  const t = new THREE.CanvasTexture(woodTexture(512, '#24130a', '#74462a', 9, 22));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  walnutWood = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.02 });
  return walnutWood;
}

// ---------- frames ----------

export interface FramePart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
}

export interface BuiltFrame {
  parts: FramePart[];
  /** How far in front of the backing the painted canvas sits. */
  artZ: number;
  /** The frame's front, where labels go. */
  front: number;
}

const cache = new Map<string, BuiltFrame>();

/**
 * The frame for a painting whose tile leaves ow x oh for the frame (inside the tile's margin m) and
 * whose canvas is iw x ih; fw is the usual width of the frame band. Positions are relative to the
 * front of the tile's backing.
 */
export function buildFrame(frame: FrameId, ow: number, oh: number, iw: number, ih: number, fw: number, m: number): BuiltFrame {
  const key = `${frame}|${ow.toFixed(4)}|${oh.toFixed(4)}|${iw.toFixed(4)}|${ih.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const built = frame === 'ivory' ? pearlFrame(ow, oh, iw, ih, fw) : frame === 'gilded' ? gildedFrame(ow, oh, iw, ih, fw) : frame === 'silver' ? silverFrame(ow, oh, iw, ih, fw) : walnutFrame(ow, oh, iw, ih, fw, m);
  cache.set(key, built);
  return built;
}

/** A thin fillet just inside the opening, overlapping the canvas edge. */
function lip(iw: number, ih: number, fw: number, z: number, outer = 0.1, inner = 0.26): THREE.BufferGeometry {
  const g = rectRing(iw + fw * outer, ih + fw * outer, iw - fw * inner, ih - fw * inner, 0.003, 0.0015, 1);
  g.translate(0, 0, z);
  return g;
}

const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

function pearlFrame(ow: number, oh: number, iw: number, ih: number, fw: number): BuiltFrame {
  const depth = 0.014;
  const b = 0.005;
  const front = depth + 2 * b;
  const artZ = b + depth * 0.25;
  const band = (ow - iw) / 2;
  // A thin gold edge wraps the stepped outline; the pearl band sits inside it, with a fine groove
  // where they meet. The step must leave the band some flat face beside the opening.
  const ge = fw * 0.13;
  const be = ge * 0.3;
  const st = Math.min(fw * 0.62, band - ge - 2 * b - 0.004);
  const edge = extrude(shapeOf(steppedPts(ow - 2 * be, oh - 2 * be, st), steppedPts(ow - 2 * ge + 2 * be, oh - 2 * ge + 2 * be, st)), front - 2 * be, be, 2);
  const body = extrude(shapeOf(steppedPts(ow - 2 * ge - 2 * b, oh - 2 * ge - 2 * b, st), rectPts(iw + 2 * b, ih + 2 * b)), depth, b, 3);
  const orn: THREE.BufferGeometry[] = [edge];
  const pearls: THREE.BufferGeometry[] = [];
  // In each step a pearl, and from the step a gold C-scroll along each edge, curling in.
  const mid = (band + ge) / 2;
  const R = fw * 0.19;
  const r0 = fw * 0.045;
  const L = fw * 0.85;
  for (const [sx, sy] of CORNERS) {
    pearls.push(sphere(st * 0.4, sx * (ow / 2 - st / 2), sy * (oh / 2 - st / 2), front * 0.5, 0.9, 16));
    const wallX = ow / 2 - st - ge - fw * 0.05;
    const wallY = oh / 2 - st - ge - fw * 0.05;
    const dir = (sx * sy > 0 ? 1 : -1) as 1 | -1;
    orn.push(...scroll([sx * wallX, sy * (oh / 2 - mid)], [sx * (wallX - L), sy * (oh / 2 - mid)], R, dir, r0, front));
    orn.push(...scroll([sx * (ow / 2 - mid), sy * wallY], [sx * (ow / 2 - mid), sy * (wallY - L)], R, (-dir) as 1 | -1, r0, front));
  }
  // A crest at the top: a gold shell that just breaks the outline, a pearl at its heart and a scroll
  // to each side.
  const top = oh / 2 - mid - fw * 0.12;
  orn.push(...shell([0, top], Math.PI / 2, fw * 0.78, 2.2, 0, front + 0.003, 7, [-ow / 2, -oh / 2, ow / 2, oh / 2 + fw * 0.2]));
  pearls.push(sphere(fw * 0.17, 0, top, front + 0.003, 0.85, 14));
  for (const s of [1, -1] as const) orn.push(...scroll([s * fw * 0.28, top], [s * fw * 1.05, top + fw * 0.04], R, (-s) as 1 | -1, r0, front));
  return {
    parts: [
      { geo: body, mat: pearlMat() },
      { geo: merge(orn), mat: gold },
      { geo: merge(pearls), mat: pearlBead },
      { geo: lip(iw, ih, fw, artZ + 0.001), mat: gold },
    ],
    artZ,
    front,
  };
}

function gildedFrame(ow: number, oh: number, iw: number, ih: number, fw: number): BuiltFrame {
  const depth = 0.02;
  const b = 0.008;
  const front = depth + 2 * b;
  const artZ = b + depth * 0.25;
  // The gold stops short of the canvas; a carved cove, lower and darker, runs between them.
  const cv = fw * 0.26;
  const body: THREE.BufferGeometry[] = [rectRing(ow, oh, iw + 2 * cv, ih + 2 * cv, depth, b, 3)];
  // A raised rim round the outside.
  const rim = rectRing(ow, oh, ow - fw * 0.36, oh - fw * 0.36, 0.003, 0.004, 2);
  rim.translate(0, 0, front - 0.006);
  body.push(rim);
  // Burnished ornament: on each corner a shell that breaks the outline, with a C-scroll running
  // from it along each edge; on the top edge, and on long sides, a crest of a shell and two scrolls.
  const orn: THREE.BufferGeometry[] = [];
  const P = fw * 0.2;
  const box: [number, number, number, number] = [-ow / 2 - P, -oh / 2 - P, ow / 2 + P, oh / 2 + P];
  // The face between the cove and the rim, where the scrolls run.
  const lane = fw * 0.4;
  const R = fw * 0.18;
  const r0 = fw * 0.055;
  for (const [sx, sy] of CORNERS) {
    const h: Pt = [sx * (ow / 2 - fw * 0.5), sy * (oh / 2 - fw * 0.5)];
    orn.push(...shell(h, Math.atan2(sy, sx), fw * 1.0, 1.8, 0, front + 0.004, 7, box));
    orn.push(sphere(fw * 0.13, h[0], h[1], front + 0.004, 0.75, 12));
    const dir = (sx * sy > 0 ? 1 : -1) as 1 | -1;
    const run = fw * 0.62;
    orn.push(...scroll([sx * (ow / 2 - run), sy * (oh / 2 - lane)], [sx * (ow / 2 - run - fw * 0.75), sy * (oh / 2 - lane)], R, dir, r0, front));
    orn.push(...scroll([sx * (ow / 2 - lane), sy * (oh / 2 - run)], [sx * (ow / 2 - lane), sy * (oh / 2 - run - fw * 0.75)], R, (-dir) as 1 | -1, r0, front));
  }
  // A crest centred on an edge: `n` points out of the frame and `t` along the edge.
  const crest = (c: Pt, n: Pt, t: Pt) => {
    const h: Pt = [c[0] - n[0] * fw * 0.05, c[1] - n[1] * fw * 0.05];
    orn.push(...shell(h, Math.atan2(n[1], n[0]), fw * 0.7, 2.3, 0, front + 0.004, 7, box));
    orn.push(sphere(fw * 0.12, h[0], h[1], front + 0.004, 0.75, 12));
    for (const s of [1, -1]) {
      const at = (d: number, k: number): Pt => [h[0] + t[0] * s * d - n[0] * k, h[1] + t[1] * s * d - n[1] * k];
      // Mirrored either side of the shell, each curling in towards the canvas.
      const turn = (t[0] * n[1] - t[1] * n[0]) * s > 0 ? -1 : 1;
      orn.push(...scroll(at(fw * 0.25, 0), at(fw * 1.0, fw * 0.02), R, turn as 1 | -1, r0, front));
    }
  };
  const ty = oh / 2 - lane;
  const tx = ow / 2 - lane;
  if (ow > fw * 6) crest([0, ty], [0, 1], [1, 0]);
  if (oh > fw * 9)
    for (const sx of [-1, 1]) crest([sx * tx, 0], [sx, 0], [0, 1]);
  // The cove rises a little above the canvas and runs under the gold, so no gap shows between them.
  const cove = rectRing(iw + 2 * cv + 2 * b, ih + 2 * cv + 2 * b, iw, ih, 0.006, 0.004, 2);
  cove.translate(0, 0, artZ - 0.004);
  return {
    parts: [
      { geo: merge(body), mat: gilt },
      { geo: merge(orn), mat: gold },
      { geo: cove, mat: coveGold },
    ],
    artZ,
    front,
  };
}

function silverFrame(ow: number, oh: number, iw: number, ih: number, fw: number): BuiltFrame {
  const depth = 0.006;
  const b = 0.009;
  const front = depth + 2 * b;
  const artZ = b + depth * 0.2;
  // Slimmer than the others: the band stops short of the tile's margin.
  const inset = fw * 0.24;
  const W = ow - 2 * inset;
  const H = oh - 2 * inset;
  const body = extrude(shapeOf(roundedPts(W - 2 * b, H - 2 * b, fw * 0.75 - b), roundedPts(iw + 2 * b, ih + 2 * b, fw * 0.12)), depth, b, 4);
  const bead = extrude(shapeOf(roundedPts(iw + fw * 0.12, ih + fw * 0.12, fw * 0.16), roundedPts(iw - fw * 0.1, ih - fw * 0.1, fw * 0.08)), 0.002, 0.002, 2);
  bead.translate(0, 0, artZ + 0.001);
  return {
    parts: [
      { geo: body, mat: silver },
      { geo: bead, mat: polishedSilver },
    ],
    artZ,
    front,
  };
}

/** The grain runs along each piece; `k` is texture repeats per world unit. */
function setWoodUv(g: THREE.BufferGeometry, k: number, du: number, dv: number) {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * k + du;
    uv[i * 2 + 1] = (pos.getY(i) + pos.getZ(i) * 0.5) * k + dv;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function walnutFrame(ow: number, oh: number, iw: number, ih: number, fw: number, m: number): BuiltFrame {
  const depth = 0.018;
  const b = 0.003;
  const front = depth + 2 * b;
  const artZ = b + depth * 0.25;
  // Wider than the others: it reaches almost to the edge of the tile.
  const W = ow + m * 1.4;
  const H = oh + m * 1.4;
  const pieces: THREE.BufferGeometry[] = [];
  // Top and bottom are built as they are; the sides are built lying along x and turned upright, so
  // every piece has its grain running along its length and the corners show the mitre.
  // Each piece is the trapezoid between two 45-degree mitres, shrunk by the bevel (which grows it back),
  // so neighbouring pieces meet exactly on the mitre and their bevels make a fine groove there.
  const k1 = b * (1 + Math.SQRT2);
  const k2 = b * (Math.SQRT2 - 1);
  const piece = (len: number, inner: number, half: number, halfIn: number, rot: number, seed: number) => {
    const pts: Pt[] = [
      [-len / 2 + k1, half - b],
      [-inner / 2 + k2, halfIn + b],
      [inner / 2 - k2, halfIn + b],
      [len / 2 - k1, half - b],
    ];
    const g = extrude(shapeOf(pts), depth, b, 1);
    setWoodUv(g, 2.3, seed * 0.37, seed * 0.61);
    g.rotateZ(rot);
    pieces.push(g);
  };
  piece(W, iw, H / 2, ih / 2, 0, 1);
  piece(W, iw, H / 2, ih / 2, Math.PI, 2);
  piece(H, ih, W / 2, iw / 2, Math.PI / 2, 3);
  piece(H, ih, W / 2, iw / 2, -Math.PI / 2, 4);
  return {
    parts: [
      { geo: mergeGeometries(pieces.map((g) => strip(g))) ?? pieces[0], mat: walnutFrameMat() },
      { geo: lip(iw, ih, fw, artZ + 0.001, 0.14, 0.16), mat: brass },
    ],
    artZ,
    front,
  };
}
