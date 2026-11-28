import * as THREE from 'three';
import { GENRE_INFO, RULES } from '../../shared/content';
import type { Genre } from '../../shared/types';
import { typeIcon } from '../theme';
import { fbm, makeNoise } from '../util/noise';
import { loadedIcon } from '../ui/icons';
import { CELL_H, CELL_W, MARGIN_X, MARGIN_Y, PANEL_H, PANEL_W } from './layout';

export function canvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  // CPU-backed canvases upload to WebGL without a GPU readback stall.
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

export function toTexture(c: HTMLCanvasElement, srgb = true, repeat: number | [number, number] = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const [rx, ry] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  if (rx !== 1 || ry !== 1) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
  }
  return t;
}

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lightens (f > 0) or darkens (f < 0) a hex colour. */
export function shade(hex: string, f: number): string {
  const [r, g, b] = rgb(hex);
  const m = (v: number) => Math.round(Math.max(0, Math.min(255, f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

const GOLD = '#e2c27a';
const SERIF = '"Cormorant Garamond", Georgia, serif';

/** Grainy wood with rings running along x. */
export function woodTexture(size: number, dark: string, light: string, seed: number, rings = 40): HTMLCanvasElement {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const n = makeNoise(seed);
  const a = rgb(dark);
  const b = rgb(light);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const warp = fbm(n, nx * 3, ny * 10, 3);
      let t = Math.sin((ny * rings + warp * 5) * Math.PI) * 0.5 + 0.5;
      t = Math.pow(t, 2.2) * 0.6 + n(nx * 300, ny * 12) * 0.12 + 0.25;
      t = Math.max(0, Math.min(1, t));
      const i = (y * size + x) * 4;
      img.data[i] = a[0] + (b[0] - a[0]) * t;
      img.data[i + 1] = a[1] + (b[1] - a[1]) * t;
      img.data[i + 2] = a[2] + (b[2] - a[2]) * t;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function marbleTexture(size: number, seed: number): HTMLCanvasElement {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const n = makeNoise(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const turb = fbm(n, nx * 4, ny * 4, 5);
      const vein = Math.pow(1 - Math.abs(Math.sin((nx * 3 + ny * 2 + turb * 2.6) * Math.PI)), 9);
      const cloud = fbm(n, nx * 9 + 40, ny * 9, 3) * 10;
      const i = (y * size + x) * 4;
      img.data[i] = 236 + cloud - vein * 70;
      img.data[i + 1] = 230 + cloud - vein * 72;
      img.data[i + 2] = 220 + cloud - vein * 66;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function feltTexture(size: number, base: string, seed: number): HTMLCanvasElement {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const n = makeNoise(seed);
  const col = rgb(base);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = fbm(n, x / 40, y / 40, 3) * 14 + (Math.random() - 0.5) * 10;
      const i = (y * size + x) * 4;
      img.data[i] = col[0] + v;
      img.data[i + 1] = col[1] + v;
      img.data[i + 2] = col[2] + v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function drawIcon(ctx: CanvasRenderingContext2D, name: string, color: string, x: number, y: number, size: number, stroke = 1.6) {
  const img = loadedIcon(name, color, 128, stroke);
  if (img) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function eyeMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x, y - s * 0.8, x + s, y);
  ctx.quadraticCurveTo(x, y + s * 0.8, x - s, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let grain: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  const N = 384;
  const [c, ctx] = canvas(N);
  const img = ctx.createImageData(N, N);
  const n = makeNoise(5);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const v = 128 + n(x / 2.5, y / 2.5) * 40 + n(x / 20, y / 20) * 30 + (Math.random() - 0.5) * 30;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  grain = c;
  return c;
}

export interface WallStyle {
  /** Wallpaper base colour. */
  base: string;
  /** Second stripe colour. */
  stripe: string;
  /** Motif colour. */
  motif: string;
}

export const WALL_STYLES: WallStyle[] = [
  { base: '#1d4f5c', stripe: '#1a4652', motif: '#2b6a77' },
  { base: '#5a1e2c', stripe: '#501a27', motif: '#74303f' },
  { base: '#22452f', stripe: '#1d3d29', motif: '#305c40' },
  { base: '#2b2f5e', stripe: '#262a54', motif: '#3b4079' },
];

const PX = 220;

/**
 * The wallpaper inside a gallery wall's moulding: striped damask with the grid marks printed on it
 * (corner dots, the eyeline band, the two start stars and the -2 corners). Tiles hide the marks they cover.
 */
export function wallpaperTexture(style: WallStyle): HTMLCanvasElement {
  const W = PANEL_W * PX;
  const H = PANEL_H * PX;
  const [c, ctx] = canvas(W, H);
  const gx = (x: number) => (MARGIN_X + x * CELL_W) * PX;
  const gy = (y: number) => (MARGIN_Y + y * CELL_H) * PX;
  ctx.fillStyle = style.base;
  ctx.fillRect(0, 0, c.width, c.height);
  // Stripes, two per cell.
  const sw = (CELL_W / 2) * PX;
  ctx.fillStyle = style.stripe;
  for (let x = gx(0) - sw * 8; x < c.width; x += sw * 2) ctx.fillRect(x, 0, sw, c.height);
  // Fine pinstripes in gold.
  ctx.strokeStyle = 'rgba(226,194,122,0.10)';
  ctx.lineWidth = 2;
  for (let x = gx(0) - sw * 8; x < c.width; x += sw * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }
  // A small damask motif in the middle of every cell.
  ctx.fillStyle = style.motif;
  for (let y = -1; y <= RULES.wallH; y++) {
    for (let x = -1; x <= RULES.wallW; x++) {
      const cx = gx(x + 0.5);
      const cy = gy(y + 0.5);
      const s = CELL_H * PX * 0.16;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 1.6);
      ctx.quadraticCurveTo(cx + s, cy - s * 0.4, cx, cy + s * 1.6);
      ctx.quadraticCurveTo(cx - s, cy - s * 0.4, cx, cy - s * 1.6);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 1.5, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Paper grain: one small noise tile blended over the whole sheet.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.22;
  ctx.drawImage(grainTile(), 0, 0, c.width, c.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // The eyeline: a lighter band between the eye marks.
  const e0 = gy(RULES.eyeTop);
  const e1 = gy(RULES.eyeBottom + 1);
  ctx.fillStyle = 'rgba(255,236,196,0.075)';
  ctx.fillRect(gx(0), e0, gx(RULES.wallW) - gx(0), e1 - e0);
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(240,206,130,0.5)';
  ctx.lineWidth = 3;
  for (const y of [e0, e1]) {
    ctx.beginPath();
    ctx.moveTo(gx(0) - MARGIN_X * PX * 0.75, y);
    ctx.lineTo(gx(RULES.wallW) + MARGIN_X * PX * 0.75, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const x of [gx(0) - MARGIN_X * PX * 0.5, gx(RULES.wallW) + MARGIN_X * PX * 0.5]) {
    for (const y of [e0, e1]) eyeMark(ctx, x, y, MARGIN_X * PX * 0.26, GOLD);
  }
  ctx.font = `600 ${Math.round(MARGIN_X * PX * 0.2)}px ${SERIF}`;
  ctx.fillStyle = 'rgba(240,206,130,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const x of [gx(0) - MARGIN_X * PX * 0.5, gx(RULES.wallW) + MARGIN_X * PX * 0.5]) {
    ctx.save();
    ctx.translate(x, (e0 + e1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('EYELINE', 0, 0);
    ctx.restore();
  }
  // Cell corner dots.
  ctx.fillStyle = 'rgba(240,206,130,0.55)';
  for (let y = 0; y <= RULES.wallH; y++) {
    for (let x = 0; x <= RULES.wallW; x++) {
      ctx.beginPath();
      ctx.arc(gx(x), gy(y), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The grid's outline.
  ctx.strokeStyle = 'rgba(240,206,130,0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(gx(0), gy(0), gx(RULES.wallW) - gx(0), gy(RULES.wallH) - gy(0));
  // Start stars.
  ctx.fillStyle = '#f0c95c';
  for (const [x, y] of RULES.stars) star(ctx, gx(x + 0.5), gy(y + 0.5), CELL_H * PX * 0.3);
  // Uncovered corners cost points.
  ctx.font = `700 ${Math.round(CELL_H * PX * 0.5)}px ${SERIF}`;
  ctx.fillStyle = 'rgba(240,206,130,0.9)';
  for (const [x, y] of RULES.corners) ctx.fillText('\u22122', gx(x + 0.5), gy(y + 0.5) + 2);
  return c;
}

/** Dark wainscot panelling: raised panels with bevelled edges. */
export function panelTexture(): HTMLCanvasElement {
  const [c, ctx] = canvas(1024, 256);
  const wood = woodTexture(256, '#2a130b', '#5a2f1a', 9, 18);
  ctx.drawImage(wood, 0, 0, 1024, 256);
  ctx.drawImage(wood, 512, 0, 512, 256);
  const panels = 4;
  const pw = 1024 / panels;
  for (let i = 0; i < panels; i++) {
    const x = i * pw + 22;
    const y = 30;
    const w = pw - 44;
    const h = 256 - 60;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,220,180,0.16)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 3, y + 3, w, h);
    ctx.strokeStyle = 'rgba(255,210,160,0.2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(226,194,122,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 18, y + 18, w - 36, h - 36);
  }
  return c;
}

/** Polished plank floor with staggered joints. Tiles seamlessly in both directions. */
export function parquetTexture(): HTMLCanvasElement {
  const S = 1024;
  const T = 64;
  const [c, ctx] = canvas(S);
  const plank = woodTexture(512, '#3d2414', '#7a4a2a', 4, 14);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = 0; r < S / T; r++) {
    // Plank lengths that add up to exactly one texture width, so the row wraps.
    const lens: number[] = [];
    let sum = 0;
    while (sum < S) {
      const len = 240 + rnd() * 200;
      lens.push(len);
      sum += len;
    }
    const over = sum - S;
    lens[lens.length - 1] -= over;
    if (lens.length > 1 && lens[lens.length - 1] < 140) lens[lens.length - 2] += lens.pop()!;
    let x = -rnd() * 260;
    for (const len of lens) {
      const sx = rnd() * (512 - len / 2);
      const sy = rnd() * (512 - T / 2);
      const dark = 0.05 + rnd() * 0.22;
      for (const off of [0, S]) {
        ctx.drawImage(plank, sx, sy, len / 2, T / 2, x + off, r * T, len, T);
        ctx.fillStyle = `rgba(20,8,2,${dark})`;
        ctx.fillRect(x + off, r * T, len, T);
        ctx.strokeStyle = 'rgba(10,4,0,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + off + 1, r * T + 1, len - 2, T - 2);
      }
      x += len;
    }
  }
  return c;
}

/** Quiet damask for the salon's own walls (around the gallery walls). */
export function damaskTexture(base: string, motif: string): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = motif;
  const cell = S / 2;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const cx = x * cell + (y % 2 ? cell / 2 : 0);
      const cy = y * cell;
      ctx.save();
      ctx.translate(cx, cy);
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(cell * 0.12, -cell * 0.1, cell * 0.22, -cell * 0.02, cell * 0.3, 0);
        ctx.bezierCurveTo(cell * 0.22, cell * 0.02, cell * 0.12, cell * 0.1, 0, 0);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, cell * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.18;
  ctx.drawImage(grainTile(), 0, 0, S, S);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** Museum board geometry (board-local units, x right, z towards the viewer). */
export const MUSEUM = {
  w: 3.3,
  d: 2.15,
  trackX0: -1.215,
  trackDX: 0.27,
  trackZ0: -0.24,
  trackDZ: 0.255,
  rankZ: -0.66,
  rankX: [-0.93, -0.31, 0.31, 0.93],
  startX: -1.5,
};

export function trackPos(n: number): { x: number; z: number } {
  if (n <= 0) return { x: MUSEUM.startX, z: MUSEUM.trackZ0 };
  const k = (n - 1) % 50;
  return { x: MUSEUM.trackX0 + (k % 10) * MUSEUM.trackDX, z: MUSEUM.trackZ0 + Math.floor(k / 10) * MUSEUM.trackDZ };
}

/** The museum board's top: the ranking slots and a prestige track of fifty small gilt frames. */
export function museumTexture(): HTMLCanvasElement {
  const K = 620;
  const W = MUSEUM.w * K;
  const H = MUSEUM.d * K;
  const [c, ctx] = canvas(W, H);
  const X = (x: number) => (x + MUSEUM.w / 2) * K;
  const Z = (z: number) => (z + MUSEUM.d / 2) * K;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3a1520');
  g.addColorStop(1, '#250c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalAlpha = 0.25;
  ctx.drawImage(woodTexture(512, '#1a0608', '#4a1a22', 21, 14), 0, 0, c.width, c.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.strokeRect(22, 22, c.width - 44, c.height - 44);
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, c.width - 88, c.height - 88);
  // Genre bands down both sides, beside the museum piles.
  const band = (x: number, z0: number, z1: number, genre: Genre) => {
    ctx.fillStyle = GENRE_INFO[genre].color;
    ctx.fillRect(X(x) - 14, Z(z0), 28, Z(z1) - Z(z0));
  };
  band(-MUSEUM.w / 2 + 0.09, -0.85, -0.02, 'city');
  band(-MUSEUM.w / 2 + 0.09, 0.02, 0.85, 'portrait');
  band(MUSEUM.w / 2 - 0.09, -0.85, -0.02, 'still');
  band(MUSEUM.w / 2 - 0.09, 0.02, 0.85, 'landscape');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GOLD;
  ctx.font = `700 ${Math.round(K * 0.11)}px ${SERIF}`;
  ctx.fillText('THE  MUSEUM', X(0), Z(-0.9));
  // Ranking slots, lowest to highest.
  MUSEUM.rankX.forEach((x, i) => {
    const mult = RULES.multipliers[3 - i];
    const cx = X(x);
    const cy = Z(MUSEUM.rankZ);
    const w = K * 0.44;
    const h = K * 0.2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 5;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = GOLD;
    ctx.font = `700 ${Math.round(K * 0.1)}px ${SERIF}`;
    ctx.fillText(`\u00d7${mult}`, cx + w * 0.22, cy + 4);
    ctx.strokeStyle = 'rgba(226,194,122,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - w * 0.2, cy, h * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  });
  // The start box for types the museum has not acquired yet.
  ctx.strokeStyle = 'rgba(226,194,122,0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  const sx = X(MUSEUM.startX);
  ctx.strokeRect(sx - K * 0.11, Z(MUSEUM.trackZ0) - K * 0.11, K * 0.22, Z(MUSEUM.trackZ0 + 3 * MUSEUM.trackDZ) - Z(MUSEUM.trackZ0) + K * 0.22);
  ctx.setLineDash([]);
  ctx.font = `600 ${Math.round(K * 0.06)}px ${SERIF}`;
  ctx.fillStyle = GOLD;
  ctx.fillText('0', sx, Z(MUSEUM.trackZ0 + 4 * MUSEUM.trackDZ) - K * 0.02);
  // Fifty numbered frames.
  for (let n = 1; n <= 50; n++) {
    const p = trackPos(n);
    const cx = X(p.x);
    const cy = Z(p.z);
    const w = K * 0.215;
    const h = K * 0.19;
    const rg = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    rg.addColorStop(0, '#f3d98c');
    rg.addColorStop(0.5, '#b8862f');
    rg.addColorStop(1, '#f0d088');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 10);
    ctx.fill();
    ctx.fillStyle = n % 5 === 0 ? '#1d4f5c' : '#203048';
    ctx.beginPath();
    ctx.roundRect(cx - w / 2 + 9, cy - h / 2 + 9, w - 18, h - 18, 6);
    ctx.fill();
    ctx.fillStyle = n % 5 === 0 ? '#fff4d6' : GOLD;
    ctx.font = `700 ${Math.round(K * 0.085)}px ${SERIF}`;
    ctx.fillText(String(n), cx, cy + 3);
  }
  return c;
}

const backCache = new Map<string, THREE.CanvasTexture>();

/** The back of a painting tile: dark blue with a gilt border and the number that moves the prestige marker. */
export function tileBackTexture(w: number, h: number): THREE.CanvasTexture {
  const key = `${w}x${h}`;
  const hit = backCache.get(key);
  if (hit) return hit;
  const k = 70;
  const [c, ctx] = canvas(w * CELL_W * k * 3, h * CELL_H * k * 3);
  const g = ctx.createRadialGradient(c.width / 2, c.height / 2, 4, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.7);
  g.addColorStop(0, '#24406b');
  g.addColorStop(1, '#13223d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 6;
  for (let x = 0; x < c.width; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  const r = Math.min(c.width, c.height) * 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(c.width / 2, c.height / 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(226,194,122,0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#f6e2ad';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(r * 1.25)}px ${SERIF}`;
  ctx.fillText(String(w + h), c.width / 2, c.height / 2 + r * 0.06);
  const t = toTexture(c);
  backCache.set(key, t);
  return t;
}

const discCache = new Map<string, THREE.CanvasTexture>();

/** Face of a bid disc: the number on ivory inside a ring of the player's colour. Null draws the back. */
export function discTexture(n: number | null, color: string): THREE.CanvasTexture {
  const key = `${n}|${color}`;
  const hit = discCache.get(key);
  if (hit) return hit;
  const S = 128;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();
  if (n === null) {
    ctx.strokeStyle = 'rgba(255,240,200,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    drawIcon(ctx, 'laurel', '#fff2cf', S / 2, S / 2, S * 0.5, 2);
  } else {
    ctx.fillStyle = '#f7efdc';
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1c0c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${n >= 10 ? 56 : 64}px ${SERIF}`;
    ctx.fillText(String(n), S / 2, S / 2 + 3);
  }
  const t = toTexture(c);
  discCache.set(key, t);
  return t;
}

const badgeCache = new Map<string, THREE.CanvasTexture>();

/** The type label at the bottom of every frame: an icon on the type's colour. */
export function genreBadgeTexture(genre: Genre): THREE.CanvasTexture {
  const name = typeIcon(genre);
  const hit = badgeCache.get(name);
  if (hit) return hit;
  const [c, ctx] = canvas(160, 100);
  ctx.fillStyle = '#16120e';
  ctx.beginPath();
  ctx.roundRect(0, 0, 160, 100, 14);
  ctx.fill();
  ctx.fillStyle = GENRE_INFO[genre].color;
  ctx.beginPath();
  ctx.roundRect(7, 7, 146, 86, 10);
  ctx.fill();
  drawIcon(ctx, name, '#16120e', 80, 50, 76, 2.2);
  const t = toTexture(c);
  badgeCache.set(name, t);
  return t;
}

const shieldCache = new Map<number, THREE.CanvasTexture>();

/** Gold shields: the points a decor tile is worth. */
export function shieldsTexture(n: number): THREE.CanvasTexture {
  const hit = shieldCache.get(n);
  if (hit) return hit;
  const [c, ctx] = canvas(64 * n, 72);
  for (let i = 0; i < n; i++) {
    const x = 32 + i * 64;
    ctx.fillStyle = '#2a1c0c';
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x + 27, 14);
    ctx.lineTo(x + 25, 38);
    ctx.quadraticCurveTo(x + 20, 58, x, 68);
    ctx.quadraticCurveTo(x - 20, 58, x - 25, 38);
    ctx.lineTo(x - 27, 14);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(x - 20, 10, x + 20, 60);
    g.addColorStop(0, '#fbe39a');
    g.addColorStop(1, '#c99a3a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x + 21, 18);
    ctx.lineTo(x + 19, 38);
    ctx.quadraticCurveTo(x + 15, 54, x, 62);
    ctx.quadraticCurveTo(x - 15, 54, x - 19, 38);
    ctx.lineTo(x - 21, 18);
    ctx.closePath();
    ctx.fill();
  }
  const t = toTexture(c);
  shieldCache.set(n, t);
  return t;
}

/** Engraved brass name plate above a gallery wall. */
export function plaqueTexture(name: string, color: string): HTMLCanvasElement {
  const [c, ctx] = canvas(768, 140);
  const g = ctx.createLinearGradient(0, 0, 0, 140);
  g.addColorStop(0, '#f6dc94');
  g.addColorStop(0.45, '#c79a43');
  g.addColorStop(1, '#8e6526');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, 768, 140, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,36,10,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(14, 14, 740, 112, 18);
  ctx.stroke();
  ctx.fillStyle = color;
  for (const x of [52, 716]) {
    ctx.beginPath();
    ctx.arc(x, 70, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,36,10,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 76px ${SERIF}`;
  ctx.fillStyle = 'rgba(255,245,215,0.55)';
  ctx.fillText(name, 386, 76, 600);
  ctx.fillStyle = '#3a2408';
  ctx.fillText(name, 384, 73, 600);
  return c;
}

/**
 * A small engraved brass plate, like the name plates over the walls: the museum piles and the supply.
 * With `accent`, an enamel badge in the type's colour carries its icon at the left.
 */
export function brassPlateTexture(text: string, accent?: { color: string; icon: string }): HTMLCanvasElement {
  const W = 560;
  const H = 160;
  const [c, ctx] = canvas(W, H);
  const body = ctx.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, '#f8e3a2');
  body.addColorStop(0.45, '#cfa24b');
  body.addColorStop(1, '#94692a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(3, 3, W - 6, H - 6, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,34,8,0.8)';
  ctx.lineWidth = 5;
  ctx.stroke();
  // An engraved line inside the rim and a sheen across the top.
  ctx.strokeStyle = 'rgba(58,34,8,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(17, 17, W - 34, H - 34, 20);
  ctx.stroke();
  const sheen = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  sheen.addColorStop(0, 'rgba(255,250,225,0.5)');
  sheen.addColorStop(1, 'rgba(255,250,225,0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect(20, 20, W - 40, H * 0.32, 14);
  ctx.fill();
  let cx = W / 2;
  let room = W - 90;
  if (accent) {
    const s = 96;
    const x = 34;
    const y = (H - s) / 2;
    ctx.fillStyle = '#3a2408';
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, s + 10, s + 10, 20);
    ctx.fill();
    ctx.fillStyle = accent.color;
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, 15);
    ctx.fill();
    drawIcon(ctx, accent.icon, '#16120e', x + s / 2, y + s / 2, s * 0.74, 2.2);
    const left = x + s + 14;
    cx = left + (W - 30 - left) / 2;
    room = W - 30 - left - 10;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 66px ${SERIF}`;
  ctx.fillStyle = 'rgba(255,246,218,0.6)';
  ctx.fillText(text, cx + 2, H / 2 + 6, room);
  ctx.fillStyle = '#3a2408';
  ctx.fillText(text, cx, H / 2 + 3, room);
  return c;
}

/** A small engraved label (value tokens, easel signs). */
export function labelTexture(text: string, opts: { w?: number; h?: number; bg?: string; fg?: string; size?: number } = {}): HTMLCanvasElement {
  const w = opts.w ?? 256;
  const h = opts.h ?? 128;
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, opts.bg ?? '#7a1f2b');
  g.addColorStop(1, shade(opts.bg ?? '#7a1f2b', -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, h * 0.22);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(3, h * 0.05);
  ctx.beginPath();
  ctx.roundRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16, h * 0.16);
  ctx.stroke();
  ctx.fillStyle = opts.fg ?? '#f6e2ad';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${opts.size ?? Math.round(h * 0.62)}px ${SERIF}`;
  ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.86);
  return c;
}

/** Profile cameo for the decor tile. */
export function cameoTexture(seed: number): HTMLCanvasElement {
  const [c, ctx] = canvas(128, 160);
  ctx.fillStyle = seed % 2 ? '#a8432f' : '#2f5a78';
  ctx.beginPath();
  ctx.ellipse(64, 80, 60, 76, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3eadb';
  ctx.beginPath();
  const flip = seed % 2 ? 1 : -1;
  ctx.save();
  ctx.translate(64, 80);
  ctx.scale(flip, 1);
  ctx.moveTo(-6, -52);
  ctx.bezierCurveTo(22, -56, 30, -30, 24, -16);
  ctx.lineTo(32, -6);
  ctx.lineTo(24, 0);
  ctx.bezierCurveTo(28, 10, 20, 14, 16, 16);
  ctx.bezierCurveTo(18, 30, 10, 36, 0, 40);
  ctx.bezierCurveTo(-4, 52, 20, 58, 30, 66);
  ctx.lineTo(-40, 66);
  ctx.bezierCurveTo(-30, 40, -40, 30, -36, 10);
  ctx.bezierCurveTo(-46, -20, -36, -50, -6, -52);
  ctx.fill();
  ctx.restore();
  return c;
}

export function glowTexture(): HTMLCanvasElement {
  const S = 128;
  const [c, ctx] = canvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,240,200,0.6)');
  g.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

/** A soft dark spot used as a cheap contact shadow under props. */
export function shadowTexture(): HTMLCanvasElement {
  const S = 128;
  const [c, ctx] = canvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

/** Night sky seen through the salon's tall windows. */
export function windowTexture(): HTMLCanvasElement {
  const [c, ctx] = canvas(256, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0d1630');
  g.addColorStop(0.7, '#1f3358');
  g.addColorStop(1, '#3d4a6a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,250,230,${0.3 + Math.random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 330, Math.random() * 1.4 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f5ecd2';
  ctx.beginPath();
  ctx.arc(180, 90, 18, 0, Math.PI * 2);
  ctx.fill();
  // Rooftops of the city outside.
  ctx.fillStyle = '#0a0f1c';
  let x = 0;
  while (x < 256) {
    const w = 20 + Math.random() * 40;
    const h = 40 + Math.random() * 90;
    ctx.fillRect(x, 512 - h, w + 1, h);
    if (Math.random() < 0.6) {
      ctx.fillStyle = 'rgba(255,200,110,0.8)';
      ctx.fillRect(x + 6, 512 - h + 14, 5, 7);
      ctx.fillStyle = '#0a0f1c';
    }
    x += w;
  }
  return c;
}
