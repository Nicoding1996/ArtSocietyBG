import * as THREE from 'three';
import type { Decor, Painting, Tile } from '../../shared/types';
import { FRAME_WIDTH, TILE_MARGIN, artCanvas, canvasSize, type ArtKey } from '../art/generate';
import { buildFrame } from './frames';
import { CELL_H, CELL_W } from './layout';
import { theme } from '../theme';
import { avatarDecorProp } from './avatarDecor';
import { brass, candleWax, flame, gilt, mahogany, mirror, walnut } from './materials';
import { cameoTexture, genreBadgeTexture, shieldsTexture, tileBackTexture, toTexture } from './textures';

/** Depth of a tile's card backing; everything else sits in front of it. */
export const BACK_D = 0.014;
const GAP = 0.012;

export const defaultBacking = new THREE.MeshStandardMaterial({ color: '#1b3a44', roughness: 0.8 });
const edgeMat = new THREE.MeshStandardMaterial({ color: '#0f1d26', roughness: 0.9 });

// ---------- painted canvases ----------

const artTextures = new Map<string, THREE.CanvasTexture>();
const keyOf = (a: ArtKey) => `${a.scene}:${a.genre}:${a.seed}:${a.w}x${a.h}`;

/** A material that shows a neutral ground until the painting has been painted, then the painting. */
export function canvasMaterial(art: ArtKey, urgent = false): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: '#cbbd9e', roughness: 0.62 });
  const key = keyOf(art);
  const ready = artTextures.get(key);
  const apply = (t: THREE.CanvasTexture) => {
    mat.map = t;
    mat.color.set('#ffffff');
    mat.needsUpdate = true;
  };
  if (ready) apply(ready);
  else
    artCanvas(
      art,
      (c) => {
        let t = artTextures.get(key);
        if (!t) {
          t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          artTextures.set(key, t);
        }
        apply(t);
      },
      urgent,
    );
  return mat;
}

// ---------- frames ----------

function ringShape(ow: number, oh: number, iw: number, ih: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-ow / 2, -oh / 2);
  s.lineTo(ow / 2, -oh / 2);
  s.lineTo(ow / 2, oh / 2);
  s.lineTo(-ow / 2, oh / 2);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-iw / 2, -ih / 2);
  hole.lineTo(-iw / 2, ih / 2);
  hole.lineTo(iw / 2, ih / 2);
  hole.lineTo(iw / 2, -ih / 2);
  hole.closePath();
  s.holes.push(hole);
  return s;
}

/**
 * A bevelled rectangular ring whose widest outline is exactly ow x oh and whose narrowest opening is
 * exactly iw x ih. It starts at z = 0 and is `depth + 2 * bevel` deep.
 */
export function ring(ow: number, oh: number, iw: number, ih: number, depth: number, bevel: number, segments = 2): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(ringShape(ow - 2 * bevel, oh - 2 * bevel, iw + 2 * bevel, ih + 2 * bevel), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 1,
  });
  geo.translate(0, 0, bevel);
  return geo;
}

// Each frame style is built in frames.ts.

const plane = new THREE.PlaneGeometry(1, 1);

function backingMesh(W: number, H: number, backing: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(W - GAP, H - GAP, BACK_D), [edgeMat, edgeMat, edgeMat, edgeMat, backing, edgeMat]);
  m.position.z = BACK_D / 2;
  m.receiveShadow = true;
  return m;
}

export interface TileMeshOpts {
  scale?: number;
  backing?: THREE.Material;
  /** Adds the printed back behind the tile, so it can be shown face down and flipped. */
  withBack?: boolean;
  urgent?: boolean;
}

function backPlate(w: number, h: number, s: number): THREE.Mesh {
  const W = w * CELL_W * s;
  const H = h * CELL_H * s;
  const m = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: tileBackTexture(w, h), roughness: 0.55 }));
  m.scale.set(W - GAP * s, H - GAP * s, 1);
  m.rotation.y = Math.PI;
  m.position.z = -0.001;
  return m;
}

export function paintingMesh(p: Painting, o: TileMeshOpts = {}): THREE.Group {
  const s = o.scale ?? 1;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(s);
  g.add(inner);
  const W = p.w * CELL_W;
  const H = p.h * CELL_H;
  const m = TILE_MARGIN * CELL_H;
  const fw = FRAME_WIDTH * CELL_H;
  const { cw, ch } = canvasSize(p.w, p.h);
  const iw = cw * CELL_H;
  const ih = ch * CELL_H;
  inner.add(backingMesh(W, H, o.backing ?? defaultBacking));
  const frame = buildFrame(p.frame, W - 2 * m, H - 2 * m, iw, ih, fw, m);
  for (const part of frame.parts) {
    const mesh = new THREE.Mesh(part.geo, part.mat);
    mesh.position.z = BACK_D;
    mesh.castShadow = true;
    inner.add(mesh);
  }
  const art = new THREE.Mesh(plane, canvasMaterial(p, o.urgent));
  art.scale.set(iw + 0.006, ih + 0.006, 1);
  art.position.z = BACK_D + frame.artZ;
  inner.add(art);
  // The type label hangs over the bottom of the frame.
  const lw = Math.min(0.13, W * 0.3);
  const label = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: genreBadgeTexture(p.genre), roughness: 0.5, metalness: 0.1 }));
  label.scale.set(lw, lw * 0.62, 1);
  label.position.set(0, -H / 2 + m + fw * 0.5, BACK_D + frame.front + 0.003);
  inner.add(label);
  if (o.withBack) inner.add(backPlate(p.w, p.h, 1));
  g.userData.tile = p;
  return g;
}

// ---------- decor ----------

function shields(n: number, W: number, H: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: shieldsTexture(n), transparent: true, toneMapped: false }));
  const h = 0.06;
  const w = h * ((64 * n) / 72);
  m.scale.set(w, h, 1);
  m.position.set(-W / 2 + 0.03 + w / 2, -H / 2 + 0.028 + h / 2, z);
  return m;
}

/** Candle flames currently in use, so the frame loop can flicker them without walking the scene. */
const liveFlames = new Set<THREE.Object3D>();

function candle(x: number, y: number, z: number): THREE.Object3D {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.02, 14), brass);
  cup.position.set(x, y, z);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.085, 12), candleWax);
  wax.position.set(x, y + 0.052, z);
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), flame);
  f.scale.set(1, 1.9, 1);
  f.position.set(x, y + 0.112, z);
  f.userData.flicker = Math.random() * 10;
  liveFlames.add(f);
  g.add(cup, wax, f);
  return g;
}

/** A two-candle brass wall sconce. */
function sconce(): THREE.Object3D {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 24), brass);
  plate.rotation.x = Math.PI / 2;
  plate.scale.set(1, 1, 1.6);
  plate.position.set(0, -0.01, 0.006);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), brass);
  stem.rotation.x = Math.PI / 2;
  stem.position.set(0, -0.06, 0.03);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.23, 8), brass);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, -0.06, 0.055);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), brass);
  knob.position.set(0, -0.06, 0.055);
  g.add(plate, stem, bar, knob);
  for (const sx of [-1, 1]) g.add(candle(sx * 0.115, -0.06, 0.055));
  return g;
}

function cameos(): THREE.Object3D {
  const g = new THREE.Group();
  for (const [i, x] of [-0.2, 0.2].entries()) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.013, 10, 40), gilt);
    rim.scale.set(0.78, 1, 1);
    rim.position.set(x, 0.01, 0.018);
    const tex = toTexture(cameoTexture(i));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
    face.scale.set(0.78, 1, 1);
    face.position.set(x, 0.01, 0.012);
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: '#7a1f2b', roughness: 0.5 }));
    bow.scale.set(1.6, 0.8, 0.6);
    bow.position.set(x, 0.125, 0.02);
    g.add(rim, face, bow);
  }
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.24, 6), gilt);
  chain.rotation.z = Math.PI / 2;
  chain.position.set(0, 0.12, 0.02);
  g.add(chain);
  return g;
}

function fern(): THREE.Object3D {
  const g = new THREE.Group();
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.022, 0.13), mahogany());
  shelf.position.set(0, -0.2, 0.065);
  const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.09), mahogany());
  corbel.position.set(0, -0.245, 0.045);
  g.add(shelf, corbel);
  const pts = [
    [0.0, 0],
    [0.045, 0],
    [0.06, 0.02],
    [0.072, 0.1],
    [0.08, 0.115],
    [0.07, 0.12],
    [0, 0.12],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: '#b5603a', roughness: 0.75 }));
  pot.position.set(0, -0.189, 0.07);
  pot.castShadow = true;
  g.add(pot);
  const leaf = new THREE.MeshStandardMaterial({ color: '#3f7a3a', roughness: 0.6, side: THREE.DoubleSide });
  const blade = new THREE.ConeGeometry(0.022, 0.26, 4);
  blade.scale(1, 1, 0.25);
  blade.translate(0, 0.13, 0);
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const m = new THREE.Mesh(blade, leaf);
    m.position.set(0, -0.075, 0.07);
    m.rotation.z = (t - 0.5) * 2.2;
    m.rotation.x = -0.25 - Math.abs(t - 0.5) * 0.4;
    m.scale.setScalar(0.75 + Math.sin(t * Math.PI) * 0.35);
    g.add(m);
  }
  return g;
}

function curios(seed: number): THREE.Object3D {
  const g = new THREE.Group();
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.026, 0.12), walnut());
  shelf.position.set(0, -0.1, 0.06);
  shelf.castShadow = true;
  g.add(shelf);
  for (const x of [-0.5, 0.5]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.1), walnut());
    b.position.set(x, -0.14, 0.05);
    g.add(b);
  }
  const colors = ['#7a1f2b', '#1f4a6b', '#2f5a3a', '#8a6a2a', '#4a2a5a', '#a8432f', '#23303e'];
  let x = -0.56;
  let k = seed;
  const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
  while (x < 0.05) {
    const t = 0.022 + rnd() * 0.02;
    const h = 0.11 + rnd() * 0.07;
    const book = new THREE.Mesh(new THREE.BoxGeometry(t, h, 0.085), new THREE.MeshStandardMaterial({ color: colors[Math.floor(rnd() * colors.length)], roughness: 0.7 }));
    book.position.set(x + t / 2, -0.087 + h / 2, 0.062);
    if (rnd() < 0.15) book.rotation.z = -0.12;
    book.castShadow = true;
    g.add(book);
    const band = new THREE.Mesh(new THREE.BoxGeometry(t + 0.001, 0.008, 0.086), gilt);
    band.position.set(x + t / 2, -0.087 + h * 0.78, 0.062);
    g.add(band);
    x += t + 0.003;
  }
  const vase = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.03, 0],
        [0.045, 0.04],
        [0.03, 0.09],
        [0.02, 0.12],
        [0.03, 0.14],
        [0, 0.14],
      ].map(([a, b]) => new THREE.Vector2(a, b)),
      24,
    ),
    new THREE.MeshPhysicalMaterial({ color: '#2d5f86', roughness: 0.2, clearcoat: 1 }),
  );
  vase.position.set(0.25, -0.087, 0.06);
  vase.castShadow = true;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshStandardMaterial({ color: '#c9b27a', roughness: 0.5 }));
  globe.position.set(0.47, -0.02, 0.06);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.035, 12), brass);
  stand.position.set(0.47, -0.07, 0.06);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.004, 6, 30), brass);
  meridian.position.copy(globe.position);
  meridian.rotation.y = 0.5;
  g.add(vase, globe, stand, meridian);
  return g;
}

function pierMirror(): THREE.Object3D {
  const g = new THREE.Group();
  const ow = 0.34;
  const oh = 0.82;
  const fw = 0.045;
  const fr = new THREE.Mesh(ring(ow, oh, ow - 2 * fw, oh - 2 * fw, 0.016, 0.01, 2), gilt);
  fr.position.set(0, -0.03, 0);
  fr.castShadow = true;
  const glass = new THREE.Mesh(plane, mirror);
  glass.scale.set(ow - 2 * fw + 0.004, oh - 2 * fw + 0.004, 1);
  glass.position.set(0, -0.03, 0.012);
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gilt);
  crest.rotation.x = Math.PI / 2;
  crest.scale.set(1.4, 1, 0.5);
  crest.position.set(0, oh / 2 - 0.03, 0.02);
  g.add(fr, glass, crest);
  return g;
}

export function decorMesh(d: Decor, o: TileMeshOpts = {}): THREE.Group {
  const s = o.scale ?? 1;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(s);
  g.add(inner);
  const W = d.w * CELL_W;
  const H = d.h * CELL_H;
  inner.add(backingMesh(W, H, o.backing ?? defaultBacking));
  const seed = Number(d.id.replace(/\D/g, '')) || 7;
  const prop =
    theme() === 'avatar'
      ? avatarDecorProp(d.shape, seed)
      : d.shape === '1x1'
        ? sconce()
        : d.shape === '2x1'
          ? cameos()
          : d.shape === '1x2'
            ? fern()
            : d.shape === '3x1'
              ? curios(seed)
              : pierMirror();
  prop.position.z = BACK_D;
  prop.traverse((x) => {
    if ((x as THREE.Mesh).isMesh && !x.userData.noShadow) x.castShadow = true;
    // Candle flames and lantern paper flicker in the frame loop.
    if (x.userData.flicker !== undefined) liveFlames.add(x);
  });
  inner.add(prop);
  inner.add(shields(d.points, W, H, BACK_D + 0.004));
  g.userData.tile = d;
  return g;
}

export function tileMesh(t: Tile, o: TileMeshOpts = {}): THREE.Group {
  return t.kind === 'painting' ? paintingMesh(t, o) : decorMesh(t, o);
}

/** A face-down painting tile (only its size and number show). */
export function backMesh(w: number, h: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: tileBackTexture(w, h), roughness: 0.55 }));
  m.scale.set((w * CELL_W - GAP) * scale, (h * CELL_H - GAP) * scale, 1);
  m.position.z = 0.012 * scale;
  const body = new THREE.Mesh(new THREE.BoxGeometry((w * CELL_W - GAP) * scale, (h * CELL_H - GAP) * scale, 0.012 * scale), edgeMat);
  body.position.z = 0.006 * scale;
  body.castShadow = true;
  g.add(body, m);
  return g;
}

/** Makes a translucent copy of a tile for previews. Materials are cloned so the originals stay solid. */
export function ghostify(obj: THREE.Object3D, opacity: number) {
  obj.traverse((x) => {
    const m = x as THREE.Mesh;
    if (!m.isMesh) return;
    const clone = (mat: THREE.Material) => {
      const c = mat.clone();
      c.transparent = true;
      c.opacity = opacity;
      c.depthWrite = false;
      // Painted canvases fill in later; keep following the original material's map.
      if ((mat as THREE.MeshStandardMaterial).map === null && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const src = mat as THREE.MeshStandardMaterial;
        const dst = c as THREE.MeshStandardMaterial;
        const t0 = performance.now();
        const poll = () => {
          if (src.map) {
            dst.map = src.map;
            dst.color.copy(src.color);
            dst.needsUpdate = true;
          } else if (performance.now() - t0 < 20000) requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      }
      return c;
    };
    m.material = Array.isArray(m.material) ? m.material.map(clone) : clone(m.material);
    m.castShadow = false;
  });
}

/** Animates the candle flames on decor tiles; forgets flames whose tile has left the scene. */
export function flickerFlames(scene: THREE.Scene, t: number) {
  for (const f of liveFlames) {
    let o: THREE.Object3D | null = f;
    while (o && o !== scene) o = o.parent;
    if (!o) {
      liveFlames.delete(f);
      continue;
    }
    const k = f.userData.flicker as number;
    const wave = Math.sin(t * 13 + k) * 0.25 + Math.sin(t * 7.3 + k * 2) * 0.15;
    // A paper lantern's glow wavers instead of a flame stretching.
    const glow = f.userData.glow as number | undefined;
    if (glow === undefined) f.scale.set(1, 1.9 + wave, 1);
    else ((f as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = glow * (1 + wave * 0.3);
  }
}
