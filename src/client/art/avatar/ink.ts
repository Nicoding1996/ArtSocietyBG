import { finish, hsl, type HSL, type Painter, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';

/**
 * Ink-wash painting on silk for the Earth Kingdom, after Chinese landscape painting: mountains in layered
 * washes that fade into mist, short dry strokes for rock, pines, green-tiled halls, a column of writing and
 * a red seal.
 */

export const SILK: HSL = [40, 34, 84];
export const INK = (a: number) => `rgba(28,30,28,${a})`;
export const JADE: HSL = [158, 30, 40];
export const MALACHITE: HSL = [150, 34, 50];
export const AZURITE: HSL = [196, 32, 50];
export const STONE: HSL = [120, 6, 52];
export const OCHRE = hsl(34, 42, 58);
export const CINNABAR = hsl(6, 62, 44);
export const TILE = hsl(152, 36, 32);
export const TILE_DARK = hsl(152, 36, 20);
export const GOLD = hsl(44, 62, 56);

export const silkInk = (a = 1) => hsl(SILK[0], SILK[1], SILK[2], a);
export const tone = (c: HSL, a = 1, dl = 0) => hsl(c[0], c[1], c[2] + dl, a);

/** An ink painter: the shared helpers, without the print's colour blocks out of register. */
export function inkPress(painter: Painter): Press {
  return Object.assign(painter, { mx: 0, my: 0 });
}

/** Aged silk: a warm ground, a faint weave and a few darker stains. */
export function silk(p: Press) {
  const { c, w, h } = p;
  c.fillStyle = silkInk();
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const x = p.rr(0, w);
    const y = p.rr(0, h);
    const r = Math.max(w, h) * p.rr(0.15, 0.4);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(150,120,70,0.08)');
    g.addColorStop(1, 'rgba(150,120,70,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.strokeStyle = 'rgba(120,100,70,0.05)';
  c.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
}

export function inkFinish(p: Press) {
  finish(p, { weave: 2, grain: 7, vignette: 0.22, warm: 0.4 });
}

/** A band of mist: silk-coloured, soft at both edges. */
export function mist(p: Press, y: number, depth: number, strength = 0.9) {
  const g = p.c.createLinearGradient(0, y - depth, 0, y + depth);
  g.addColorStop(0, silkInk(0));
  g.addColorStop(0.5, silkInk(strength));
  g.addColorStop(1, silkInk(0));
  fill(p, g, (k) => k.rect(-4, y - depth, p.w + 8, depth * 2));
}

/** A smooth closed outline through `pts`, which run along a ridge from left to right. */
export function smooth(pts: Pt[]): Trace {
  return (k) => {
    k.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      k.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    k.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    k.closePath();
  };
}

/**
 * A range of steep mountains from x0 to x1, standing on `base` and reaching up to `top`, washed in `ink`
 * that fades towards its foot, with dry strokes and moss dots on the rock. Returns the ridge points.
 */
export function range(p: Press, base: number, top: number, x0: number, x1: number, ink: HSL, strokes = 1): Pt[] {
  const n = Math.max(2, Math.round(((x1 - x0) / Math.max(1, base - top)) * p.rr(1.2, 1.8)));
  const seg = (x1 - x0) / n;
  const pts: Pt[] = [[x0 - 4, base + 2]];
  for (let i = 0; i < n; i++) {
    const px = x0 + seg * (i + p.rr(0.35, 0.65));
    const py = top + (base - top) * p.rr(0, 0.5);
    pts.push([px - seg * p.rr(0.25, 0.4), py + (base - py) * p.rr(0.35, 0.65)]);
    pts.push([px, py]);
    pts.push([px + seg * p.rr(0.25, 0.4), py + (base - py) * p.rr(0.35, 0.65)]);
  }
  pts.push([x1 + 4, base + 2]);
  const shape = smooth(pts);
  const g = p.c.createLinearGradient(0, top, 0, base);
  g.addColorStop(0, tone(ink, 0.95));
  g.addColorStop(0.55, tone(ink, 0.7, 8));
  g.addColorStop(1, tone(ink, 0, 20));
  fill(p, g, shape);
  within(p, shape, () => {
    for (let i = 0; i < 80 * strokes * p.detail; i++) {
      const [rx, ry] = pts[1 + Math.floor(p.r() * (pts.length - 2))];
      const x = rx + p.rr(-1, 1) * seg * 0.35;
      const y = ry + p.rr(0, 1) * (base - ry) * 0.6;
      const len = (base - top) * p.rr(0.03, 0.09);
      const a = Math.PI / 2 + (x < rx ? 0.5 : -0.5) + p.rr(-0.2, 0.2);
      line(p, INK(p.rr(0.15, 0.4)), p.rr(0.8, 2), (k) => {
        k.moveTo(x, y);
        k.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      });
    }
    // Moss dots along the ridges. The outline runs below its control points, so these are clipped to it.
    for (let i = 1; i < pts.length - 1; i++) {
      if (p.r() < 0.4) continue;
      const [rx, ry] = pts[i];
      for (let j = 0; j < 5; j++) {
        const dx = rx + p.rr(-0.25, 0.25) * seg;
        const dy = ry + p.rr(0.01, 0.1) * (base - top);
        const r = p.rr(0.8, 2);
        fill(p, INK(0.6), (k) => k.arc(dx, dy, r, 0, TAU));
      }
    }
  });
  return pts;
}

/** A pine: a crooked trunk with flat clouds of needles. */
export function pine(p: Press, x: number, y: number, s: number) {
  const lean = p.rr(-0.4, 0.4);
  const tx = x + lean * s * 0.6;
  const ty = y - s;
  line(p, INK(0.85), Math.max(1.4, s * 0.06), (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x - lean * s * 0.3, y - s * 0.5, tx, ty);
  });
  const clouds = p.ri(3, 5);
  for (let i = 0; i < clouds; i++) {
    const t = 0.35 + (i / clouds) * 0.7;
    const bx = x + (tx - x) * t;
    const by = y + (ty - y) * t;
    const cx = bx + p.rr(-0.45, 0.45) * s;
    const cy = by - s * 0.04;
    const cw = s * p.rr(0.22, 0.36) * (1.1 - t * 0.4);
    line(p, INK(0.8), Math.max(1, s * 0.025), (k) => {
      k.moveTo(bx, by);
      k.lineTo(cx, cy + cw * 0.12);
    });
    fill(p, tone(JADE, 0.55), (k) => k.ellipse(cx, cy, cw, cw * 0.34, 0, 0, TAU));
    // Needles: fans of strokes spread from the branch to the edge of the cloud.
    line(p, INK(0.75), Math.max(0.8, s * 0.012), (k) => {
      const fans = Math.max(2, Math.round(cw / (s * 0.1)));
      const fr = ((cw * 1.2) / fans) * 0.75;
      for (let f = 0; f < fans; f++) {
        const fx = cx - cw * 0.6 + (cw * 1.2 * (f + 0.5)) / fans;
        const fy = cy + cw * 0.12;
        for (let j = 0; j <= 8; j++) {
          const a = Math.PI + (j / 8) * Math.PI;
          k.moveTo(fx, fy);
          k.lineTo(fx + Math.cos(a) * fr * 1.2, fy + Math.sin(a) * fr * 0.9);
        }
      }
    });
  }
}

/** A round broadleaf tree of ink dots. */
export function tree(p: Press, x: number, y: number, s: number, ink: HSL = JADE) {
  line(p, INK(0.8), Math.max(1.2, s * 0.06), (k) => {
    k.moveTo(x, y);
    k.lineTo(x + p.rr(-0.1, 0.1) * s, y - s * 0.55);
  });
  for (let i = 0; i < 16; i++) {
    const a = p.rr(0, TAU);
    const d = Math.sqrt(p.r()) * s * 0.4;
    fill(p, tone(ink, p.rr(0.5, 0.9), p.rr(-8, 8)), (k) => k.arc(x + Math.cos(a) * d, y - s * 0.7 + Math.sin(a) * d * 0.7, s * p.rr(0.08, 0.16), 0, TAU));
  }
}

/**
 * A hall in the Earth Kingdom manner: stone platform, red columns, and one or two green-tiled roofs with
 * upturned eaves. (x, base) is the middle of the platform's foot.
 */
export function hall(p: Press, x: number, base: number, wd: number, ht: number, tiers = 1, roof = TILE) {
  const plat = ht * 0.16;
  fill(p, tone(STONE, 1, 20), (k) => k.rect(x - wd * 0.55, base - plat, wd * 1.1, plat));
  line(p, INK(0.5), 1, (k) => {
    k.moveTo(x - wd * 0.55, base - plat);
    k.lineTo(x + wd * 0.55, base - plat);
  });
  let y = base - plat;
  let rw = wd;
  for (let t = 0; t < tiers; t++) {
    const bodyH = (ht - plat) * (t === 0 ? 0.42 : 0.28) / (tiers === 1 ? 0.7 : 1);
    fill(p, OCHRE, (k) => k.rect(x - rw * 0.42, y - bodyH, rw * 0.84, bodyH));
    const cols = Math.max(2, Math.round(rw / (ht * 0.12)));
    for (let i = 0; i <= cols; i++) {
      const cx = x - rw * 0.4 + (rw * 0.8 * i) / cols;
      fill(p, CINNABAR, (k) => k.rect(cx - rw * 0.012, y - bodyH, rw * 0.024, bodyH));
    }
    y -= bodyH;
    roofShape(p, x, y, rw * 1.08, (ht - plat) * (tiers === 1 ? 0.32 : 0.22), roof);
    y -= (ht - plat) * (tiers === 1 ? 0.32 : 0.2) * 0.78;
    rw *= 0.68;
  }
}

/** A village house: plastered walls, a dark door and window, and a grey tiled roof. (x, base) is the middle of its foot. */
export function house(p: Press, x: number, base: number, wd: number, roof = hsl(160, 8, 42)) {
  const ht = wd * 0.5;
  fill(p, hsl(40, 30, 86), (k) => k.rect(x - wd * 0.42, base - ht, wd * 0.84, ht));
  line(p, INK(0.5), 1, (k) => k.rect(x - wd * 0.42, base - ht, wd * 0.84, ht));
  fill(p, INK(0.75), (k) => {
    k.rect(x - wd * 0.08, base - ht * 0.62, wd * 0.16, ht * 0.62);
    k.rect(x + wd * 0.18, base - ht * 0.7, wd * 0.12, ht * 0.25);
  });
  roofShape(p, x, base - ht, wd * 1.05, wd * 0.28, roof, INK(0.3));
}

/** A tiled roof with upturned eaves, its eave line at y. */
export function roofShape(p: Press, x: number, y: number, rw: number, rh: number, ink = TILE, rows = TILE_DARK) {
  const up = rh * 0.32;
  const shape: Trace = (k) => {
    k.moveTo(x - rw / 2, y - up);
    k.quadraticCurveTo(x - rw * 0.4, y + rh * 0.05, x - rw * 0.3, y);
    k.lineTo(x + rw * 0.3, y);
    k.quadraticCurveTo(x + rw * 0.4, y + rh * 0.05, x + rw / 2, y - up);
    k.quadraticCurveTo(x + rw * 0.32, y - rh * 0.45, x + rw * 0.26, y - rh);
    k.lineTo(x - rw * 0.26, y - rh);
    k.quadraticCurveTo(x - rw * 0.32, y - rh * 0.45, x - rw / 2, y - up);
    k.closePath();
  };
  fill(p, ink, shape);
  within(p, shape, () => {
    for (let i = 1; i < 14; i++) {
      const tx = x - rw * 0.48 + (rw * 0.96 * i) / 14;
      line(p, rows, Math.max(0.8, rw * 0.006), (k) => {
        k.moveTo(x + (tx - x) * 0.5, y - rh);
        k.lineTo(tx, y + 1);
      });
    }
  });
  line(p, INK(0.85), Math.max(1.2, rh * 0.08), (k) => {
    k.moveTo(x - rw * 0.27, y - rh);
    k.lineTo(x + rw * 0.27, y - rh);
  });
  line(p, INK(0.7), Math.max(1, rh * 0.04), (k) => {
    k.moveTo(x - rw / 2, y - up);
    k.quadraticCurveTo(x - rw * 0.4, y + rh * 0.05, x - rw * 0.3, y);
    k.lineTo(x + rw * 0.3, y);
    k.quadraticCurveTo(x + rw * 0.4, y + rh * 0.05, x + rw / 2, y - up);
  });
  for (const sgn of [-1, 1]) fill(p, GOLD, (k) => k.arc(x + sgn * rw * 0.27, y - rh * 1.02, Math.max(1.2, rh * 0.07), 0, TAU));
}

/** A grey-green stone wall from x0 to x1 with its top at y, block courses and battlements. */
export function stoneWall(p: Press, x0: number, x1: number, y: number, ht: number, ink: HSL = STONE) {
  fill(p, tone(ink), (k) => k.rect(x0, y, x1 - x0, ht));
  const bh = ht / Math.max(3, Math.round(ht / 9));
  for (let yy = y + bh, r = 0; yy < y + ht - 1; yy += bh, r++) {
    const y0 = yy;
    line(p, INK(0.25), 1, (k) => {
      k.moveTo(x0, y0);
      k.lineTo(x1, y0);
    });
    for (let xx = x0 + (r % 2) * bh; xx < x1; xx += bh * 2.2) {
      const x = xx;
      line(p, INK(0.2), 1, (k) => {
        k.moveTo(x, y0 - bh);
        k.lineTo(x, y0);
      });
    }
  }
  const mw = Math.max(3, ht * 0.08);
  for (let x = x0; x < x1 - mw; x += mw * 2) fill(p, tone(ink, 1, -6), (k) => k.rect(x, y - mw * 0.9, mw, mw * 0.9));
  line(p, INK(0.6), 1.2, (k) => {
    k.moveTo(x0, y);
    k.lineTo(x1, y);
  });
}

/** What a painting asks of its inscription: the side to keep clear of the subject, and gold ink on a dark ground. */
export interface Inscribe {
  side?: 'left' | 'right';
  ink?: string;
}

/** A column of brushed writing in one top corner, with the painter's red seal under it. */
export function inscription(p: Press, want: Inscribe = {}) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const left = want.side ? want.side === 'left' : p.r() < 0.5;
  const cw = u * 0.05;
  const rows = p.ri(4, 7);
  const x = left ? w * 0.05 : w * 0.95 - cw;
  let y = h * 0.06;
  for (let i = 0; i < rows; i++) {
    const strokes = p.ri(3, 6);
    for (let s = 0; s < strokes; s++) {
      const sx = x + p.rr(0.05, 0.85) * cw;
      const sy = y + p.rr(0.05, 0.85) * cw;
      const horiz = p.r() < 0.5;
      const len = cw * p.rr(0.3, 0.8);
      line(p, want.ink ?? INK(0.8), Math.max(1, cw * 0.09), (k) => {
        k.moveTo(sx, sy);
        k.lineTo(sx + (horiz ? len : p.rr(-0.2, 0.2) * len), sy + (horiz ? p.rr(-0.1, 0.1) * len : len));
      });
    }
    y += cw * 1.15;
  }
  earthSeal(p, x, y + cw * 0.2, cw * 1.05);
}

/** A red seal with the Earth Kingdom's mark cut into it: a square inside a ring. */
export function earthSeal(p: Press, x: number, y: number, s: number) {
  fill(p, CINNABAR, (k) => k.rect(x, y, s, s));
  line(p, silkInk(), Math.max(1, s * 0.08), (k) => {
    k.arc(x + s / 2, y + s / 2, s * 0.34, 0, TAU);
    k.rect(x + s * 0.34, y + s * 0.34, s * 0.32, s * 0.32);
  });
}
