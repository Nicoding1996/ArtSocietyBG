import { makeRng, type Rand } from '../../shared/rng';

export type HSL = [number, number, number];

export interface Painter {
  c: CanvasRenderingContext2D;
  w: number;
  h: number;
  r: Rand;
  /** Stroke-count multiplier (masterpieces get more detail). */
  detail: number;
  rr(a: number, b: number): number;
  ri(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
  gauss(): number;
}

/**
 * A painter draws in a virtual canvas of `vw` x `vh` (defaults to the real size). The context is
 * scaled so stroke sizes stay the same whatever resolution the texture is rendered at.
 */
export function makePainter(canvas: HTMLCanvasElement, seed: number, detail = 1, vw = canvas.width, vh = canvas.height): Painter {
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  c.setTransform(canvas.width / vw, 0, 0, canvas.height / vh, 0, 0);
  const r = makeRng(seed);
  return {
    c,
    w: vw,
    h: vh,
    r,
    detail,
    rr: (a, b) => a + (b - a) * r(),
    ri: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    gauss: () => {
      let s = 0;
      for (let i = 0; i < 4; i++) s += r();
      return (s - 2) / 0.577;
    },
  };
}

export const hsl = (h: number, s: number, l: number, a = 1): string =>
  `hsla(${((h % 360) + 360) % 360},${Math.max(0, Math.min(100, s))}%,${Math.max(0, Math.min(100, l))}%,${a})`;

export const hslA = (c: HSL, a = 1) => hsl(c[0], c[1], c[2], a);

export function jit(p: Painter, c: HSL, dh = 6, ds = 6, dl = 6, a = 1): string {
  return hsl(c[0] + (p.r() - 0.5) * 2 * dh, c[1] + (p.r() - 0.5) * 2 * ds, c[2] + (p.r() - 0.5) * 2 * dl, a);
}

function hslToRgb([h, s, l]: HSL): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

/** Blends in RGB so distant hues meet in a natural grey instead of a rainbow. */
export function mix(a: HSL, b: HSL, t: number): HSL {
  const ca = hslToRgb(a);
  const cb = hslToRgb(b);
  return rgbToHsl(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
}

export function hexToHsl(hex: string): HSL {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgbToHsl(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** A single slightly curved brush stroke centred on (x, y). */
export function brush(p: Painter, x: number, y: number, ang: number, len: number, wid: number, color: string, alpha = 1) {
  const c = p.c;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const dx = (ca * len) / 2;
  const dy = (sa * len) / 2;
  const bend = (p.r() - 0.5) * wid * 1.2;
  c.globalAlpha = alpha;
  c.strokeStyle = color;
  c.lineWidth = wid;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - dx, y - dy);
  c.quadraticCurveTo(x - sa * bend, y + ca * bend, x + dx, y + dy);
  c.stroke();
  c.globalAlpha = 1;
}

/** Stroke plus a faint highlight, for thick impasto paint. */
export function impasto(p: Painter, x: number, y: number, ang: number, len: number, wid: number, color: string, alpha = 1) {
  brush(p, x, y, ang, len, wid, color, alpha);
  const o = wid * 0.28;
  brush(p, x - o, y - o, ang, len * 0.8, Math.max(0.6, wid * 0.32), 'rgba(255,255,255,0.9)', 0.12 * alpha);
}

export function fillGradient(p: Painter, stops: [number, string][], x0 = 0, y0 = 0, x1 = 0, y1 = p.h) {
  const g = p.c.createLinearGradient(x0, y0, x1, y1);
  for (const [t, col] of stops) g.addColorStop(t, col);
  p.c.fillStyle = g;
  p.c.fillRect(0, 0, p.w, p.h);
}

export function glow(p: Painter, x: number, y: number, radius: number, color: string, alpha = 1) {
  const g = p.c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  p.c.globalAlpha = alpha;
  p.c.fillStyle = g;
  p.c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  p.c.globalAlpha = 1;
}

export interface FinishOptions {
  weave?: number;
  grain?: number;
  vignette?: number;
  warm?: number;
}

/** Canvas weave, grain, vignette and a warm varnish, applied per pixel. */
export function finish(p: Painter, o: FinishOptions) {
  const { c, r } = p;
  // Works on real pixels, whatever virtual size the scene was painted at.
  const w = c.canvas.width;
  const h = c.canvas.height;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const weave = o.weave ?? 6;
  const grain = o.grain ?? 10;
  const vig = o.vignette ?? 0.25;
  const warm = (o.warm ?? 0.2) * 10;
  const cx = w / 2;
  const cy = h / 2;
  const maxD = cx * cx + cy * cy;
  for (let y = 0; y < h; y++) {
    const wy = Math.sin(y * 1.7);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const wv = weave * (Math.sin(x * 1.7) * 0.5 + wy * 0.5) * (((x + y) & 1) * 2 - 1) * 0.5;
      const n = (r() - 0.5) * grain + wv;
      const dx = x - cx;
      const dy = y - cy;
      const v = 1 - vig * Math.pow((dx * dx + dy * dy) / maxD, 1.4);
      d[i] = (d[i] + n + warm) * v;
      d[i + 1] = (d[i + 1] + n + warm * 0.35) * v;
      d[i + 2] = (d[i + 2] + n - warm * 0.6) * v;
    }
  }
  c.putImageData(img, 0, 0);
}

export type Pt = [number, number];

/** Splits a convex polygon by the line through (px, py) with direction angle `ang`. */
export function splitPolygon(poly: Pt[], px: number, py: number, ang: number): [Pt[], Pt[]] | null {
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const side = (pt: Pt) => (pt[0] - px) * nx + (pt[1] - py) * ny;
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    const s0 = side(p0);
    const s1 = side(p1);
    if (s0 >= 0) a.push(p0);
    if (s0 <= 0) b.push(p0);
    if ((s0 > 0 && s1 < 0) || (s0 < 0 && s1 > 0)) {
      const t = s0 / (s0 - s1);
      const q: Pt = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
      a.push(q);
      b.push(q);
    }
  }
  if (a.length < 3 || b.length < 3) return null;
  return [a, b];
}

export function polyArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    s += x0 * y1 - x1 * y0;
  }
  return Math.abs(s) / 2;
}

export function polyPath(c: CanvasRenderingContext2D, poly: Pt[]) {
  c.beginPath();
  c.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
  c.closePath();
}

export function centroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const pt of poly) {
    x += pt[0];
    y += pt[1];
  }
  return [x / poly.length, y / poly.length];
}
