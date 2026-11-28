import { type HSL } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import type { Inscribe } from './ink';
import { AZURE, CINNABAR, GOLD, LEAD, MALACHITE, ORANGE, ROCK, SAFFRON, SEPIA, TEAL, cloudHeap, col, crag, orb, peak, ripples, shaded, sky, swirl, tower } from './thangka';

/** The Air Nomads' temples: the Southern, Northern, Eastern and Western Air Temples, and Air Temple Island. */

const FAR: HSL = [196, 20, 72];
const STONE: HSL = [32, 12, 64];
const WOOD: HSL = [24, 40, 34];

/** The warm sky most of the temples stand in, graded from apricot down to pale gold at y1. */
function warmSky(p: Press, y1: number) {
  sky(p, 0, y1, col([24, 70, 64]), col([44, 74, 88]));
}

/** Rock with its contours: shaded at the edges, cracks running down it. */
function rock(p: Press, shape: Trace, x: number, top: number, wd: number, foot: number, ink: HSL = ROCK) {
  shaded(p, ink, shape, wd * 0.2);
  within(p, shape, () =>
    line(p, col(ink, 0.55, -16), Math.max(1, wd * 0.008), (k) => {
      for (let i = -2; i <= 2; i++) {
        if (!i) continue;
        k.moveTo(x + i * wd * 0.1, top + wd * 0.06);
        k.quadraticCurveTo(x + i * wd * 0.14, (top + foot) / 2, x + i * wd * 0.2, foot);
      }
    }),
  );
}

/** The Southern Air Temple: its towers crowded on a peak above the clouds, snow peaks behind, the sun rising. */
export function southTemple(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  warmSky(p, h * 0.85);
  const left = p.r() < 0.5;
  orb(p, w * (left ? 0.78 : 0.22), h * 0.15, u * 0.08);
  peak(p, w * 0.12, h * 0.7, Math.max(w * 0.5, u * 0.6), h * 0.42, FAR);
  peak(p, w * 0.9, h * 0.72, Math.max(w * 0.46, u * 0.55), h * 0.36, FAR);
  cloudHeap(p, w * 0.18, h * 0.6, u * 0.2, [30, 60, 82]);
  cloudHeap(p, w * 0.84, h * 0.62, u * 0.22, [30, 60, 82], -1);
  // The temple's mountain: steep sides and a flat summit, a stair zigzagging up its face.
  const mx = w / 2;
  const top = h * 0.44;
  const mw = Math.min(w * 0.8, u * 0.8);
  const mountain: Trace = (k) => {
    k.moveTo(mx - mw * 0.5, h + 4);
    k.quadraticCurveTo(mx - mw * 0.42, h * 0.62, mx - mw * 0.24, top + h * 0.06);
    k.lineTo(mx - mw * 0.21, top);
    k.lineTo(mx + mw * 0.21, top);
    k.lineTo(mx + mw * 0.25, top + h * 0.05);
    k.quadraticCurveTo(mx + mw * 0.42, h * 0.62, mx + mw * 0.5, h + 4);
    k.closePath();
  };
  rock(p, mountain, mx, top, mw, h);
  line(p, col(LEAD, 0.8), Math.max(1.5, u * 0.008), (k) => {
    k.moveTo(mx, top + h * 0.02);
    for (let i = 1; i <= 5; i++) k.lineTo(mx + (i % 2 ? 1 : -1) * mw * (0.06 + i * 0.025), top + h * (0.02 + i * 0.07));
  });
  // The towers, the outer ones first, the tallest in the middle.
  const tw = u * 0.07;
  for (const [dx, th] of [
    [-0.17, 0.2],
    [0.17, 0.22],
    [-0.09, 0.28],
    [0.09, 0.3],
    [0, 0.4],
  ])
    tower(p, mx + dx * mw, top + 2, tw * (dx ? 0.9 : 1.1), u * th);
  fill(p, col(LEAD, 1, -6), (k) => k.rect(mx - mw * 0.21, top - h * 0.012, mw * 0.42, h * 0.02));
  line(p, SEPIA, 1, (k) => k.rect(mx - mw * 0.21, top - h * 0.012, mw * 0.42, h * 0.02));
  // Clouds wrapped round the mountain.
  cloudHeap(p, mx - mw * 0.46, h * 0.76, u * 0.2, [196, 40, 78]);
  cloudHeap(p, mx + mw * 0.44, h * 0.84, u * 0.22, [196, 40, 78], -1);
  const n = Math.max(1, Math.round((w / u) * 1.4));
  for (let i = 0; i < n; i++) cloudHeap(p, (w * (i + 0.5)) / n, h * 0.98, u * 0.26, [30, 60, 82], i % 2 ? -1 : 1);
}

/** One stone Avatar on its plinth, `s` tall, its head after the nation it was born to, a pale halo behind. */
function statue(p: Press, x: number, base: number, s: number, kind: number) {
  const lw = Math.max(1, s * 0.012);
  const hy = base - s * 0.86;
  fill(p, col([44, 70, 70], 0.22), (k) => k.arc(x, hy, s * 0.17, 0, TAU));
  line(p, GOLD, lw * 1.5, (k) => k.arc(x, hy, s * 0.17, 0, TAU));
  const robe: Trace = (k) => {
    k.moveTo(x - s * 0.1, base - s * 0.76);
    k.quadraticCurveTo(x - s * 0.22, base - s * 0.72, x - s * 0.24, base - s * 0.5);
    k.lineTo(x - s * 0.28, base - s * 0.1);
    k.lineTo(x + s * 0.28, base - s * 0.1);
    k.lineTo(x + s * 0.24, base - s * 0.5);
    k.quadraticCurveTo(x + s * 0.22, base - s * 0.72, x + s * 0.1, base - s * 0.76);
    k.closePath();
  };
  shaded(p, STONE, robe, s * 0.12, SEPIA, lw);
  line(p, col(STONE, 0.7, -18), lw, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * s * 0.08, base - s * 0.45);
      k.lineTo(x + m * s * 0.12, base - s * 0.1);
      k.moveTo(x + m * s * 0.2, base - s * 0.62);
      k.quadraticCurveTo(x + m * s * 0.08, base - s * 0.5, x, base - s * 0.52);
    }
  });
  shaded(p, STONE, (k) => k.ellipse(x, base - s * 0.53, s * 0.07, s * 0.05, 0, 0, TAU), s * 0.04, SEPIA, lw);
  shaded(p, STONE, (k) => k.rect(x - s * 0.32, base - s * 0.1, s * 0.64, s * 0.1), s * 0.05, SEPIA, lw);
  // The head: bald, a topknot with a crown, Kyoshi's tall headdress, or long hair.
  const head: Trace = (k) => k.ellipse(x, hy, s * 0.085, s * 0.1, 0, 0, TAU);
  if (kind === 3) shaded(p, STONE, (k) => k.ellipse(x, hy + s * 0.08, s * 0.12, s * 0.16, 0, 0, TAU), s * 0.05, SEPIA, lw);
  shaded(p, STONE, head, s * 0.05, SEPIA, lw);
  if (kind === 1)
    shaded(p, STONE, (k) => {
      k.moveTo(x - s * 0.04, hy - s * 0.09);
      k.lineTo(x, hy - s * 0.17);
      k.lineTo(x + s * 0.04, hy - s * 0.09);
      k.closePath();
    }, s * 0.02, SEPIA, lw);
  if (kind === 2)
    shaded(p, STONE, (k) => {
      k.moveTo(x - s * 0.1, hy - s * 0.04);
      k.quadraticCurveTo(x - s * 0.12, hy - s * 0.2, x - s * 0.02, hy - s * 0.24);
      k.lineTo(x + s * 0.02, hy - s * 0.24);
      k.quadraticCurveTo(x + s * 0.12, hy - s * 0.2, x + s * 0.1, hy - s * 0.04);
      k.quadraticCurveTo(x, hy - s * 0.12, x - s * 0.1, hy - s * 0.04);
      k.closePath();
    }, s * 0.03, SEPIA, lw);
  line(p, col(STONE, 0.8, -30), lw, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * s * 0.02, hy);
      k.lineTo(x + m * s * 0.05, hy + s * 0.004);
    }
  });
}

/** A candle burning on the step at (x, y), `s` tall. */
function candle(p: Press, x: number, y: number, s: number) {
  const g = p.c.createRadialGradient(x, y - s, 0, x, y - s, s * 2.2);
  g.addColorStop(0, 'rgba(255,200,110,0.5)');
  g.addColorStop(1, 'rgba(255,200,110,0)');
  fill(p, g, (k) => k.arc(x, y - s, s * 2.2, 0, TAU));
  shaded(p, LEAD, (k) => k.rect(x - s * 0.12, y - s * 0.6, s * 0.24, s * 0.6), s * 0.06, SEPIA, 1);
  fill(p, col(SAFFRON), (k) => {
    k.moveTo(x, y - s * 1.1);
    k.quadraticCurveTo(x + s * 0.14, y - s * 0.78, x, y - s * 0.62);
    k.quadraticCurveTo(x - s * 0.14, y - s * 0.78, x, y - s * 1.1);
    k.closePath();
  });
}

/** The sanctuary of the Southern Air Temple: two rows of stone Avatars on their steps in the dark, candles burning before them. */
export function sanctuary(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([12, 40, 14]), col([20, 44, 26]));
  const glow = p.c.createRadialGradient(w / 2, h, 0, w / 2, h, Math.max(w, h) * 0.7);
  glow.addColorStop(0, 'rgba(255,190,110,0.32)');
  glow.addColorStop(1, 'rgba(255,190,110,0)');
  fill(p, glow, (k) => k.rect(0, 0, w, h));
  let kind = p.ri(0, 3);
  for (const [base, s, off] of [
    [h * 0.54, h * 0.4, 0.5],
    [h * 0.96, h * 0.42, 0],
  ]) {
    shaded(p, [24, 14, 30], (k) => k.rect(-4, base - s * 0.02, w + 8, h * 0.05), h * 0.02, SEPIA, 1);
    const n = Math.max(2, Math.round(w / (s * 0.62)));
    const step = w / n;
    for (let i = -1; i <= n; i++) {
      const x = step * (i + 0.5 + off);
      if (x < -step * 0.3 || x > w + step * 0.3) continue;
      statue(p, x, base - s * 0.02, s * 0.9, kind++ % 4);
      candle(p, x + step * 0.3, base + h * 0.02, u * 0.05);
    }
  }
}

/** The airball court: poles of every height standing in rows on the stone court, a hoop at each end, the ball left on a pole. */
export function airball(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  warmSky(p, h * 0.52);
  peak(p, w * 0.22, h * 0.5, Math.max(u * 0.8, w * 0.45), h * 0.34, FAR);
  peak(p, w * 0.78, h * 0.52, Math.max(u * 0.7, w * 0.4), h * 0.28, FAR);
  cloudHeap(p, w * 0.5, h * 0.48, u * 0.18, [30, 60, 82]);
  // The court, wider toward us, and its far wall.
  const y0 = h * 0.5;
  const y1 = h * 1.02;
  const court: Trace = (k) => {
    k.moveTo(w * 0.16, y0);
    k.lineTo(w * 0.84, y0);
    k.lineTo(w * 1.08, y1);
    k.lineTo(-w * 0.08, y1);
    k.closePath();
  };
  shaded(p, [34, 22, 70], court, u * 0.12);
  line(p, col([34, 22, 52], 0.5), 1, (k) => {
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const y = y0 + (y1 - y0) * t * t;
      k.moveTo(w * 0.16 - w * 0.24 * t * t, y);
      k.lineTo(w * 0.84 + w * 0.24 * t * t, y);
    }
  });
  shaded(p, STONE, (k) => k.rect(w * 0.14, y0 - h * 0.04, w * 0.72, h * 0.04), h * 0.02, SEPIA, 1);
  // Poles, far rows first, each a little bigger nearer.
  const rows = 4;
  const cols = Math.max(4, Math.round((w / u) * 4));
  const ball = p.ri(0, rows * cols - 1);
  let n = 0;
  for (let r = 0; r < rows; r++) {
    const t = (r + 0.6) / (rows + 0.2);
    const y = y0 + (y1 - y0) * t * t;
    const xl = w * 0.16 - w * 0.24 * t * t;
    const xr = w * 0.84 + w * 0.24 * t * t;
    const sc = 0.45 + 0.55 * t;
    for (let c = 0; c < cols; c++) {
      const x = xl + ((xr - xl) * (c + 0.5 + (r % 2) * 0.3)) / (cols + 0.3);
      const ph = h * sc * p.rr(0.06, 0.24);
      const pw = u * 0.026 * sc;
      const g = p.c.createLinearGradient(x - pw, 0, x + pw, 0);
      g.addColorStop(0, col(WOOD, 1, -6));
      g.addColorStop(0.4, col(WOOD, 1, 14));
      g.addColorStop(1, col(WOOD, 1, -10));
      fill(p, g, (k) => k.rect(x - pw, y - ph, pw * 2, ph));
      line(p, SEPIA, 1, (k) => k.rect(x - pw, y - ph, pw * 2, ph));
      fill(p, col(WOOD, 1, 24), (k) => k.ellipse(x, y - ph, pw, pw * 0.4, 0, 0, TAU));
      if (n++ === ball) {
        const br = pw * 2.2;
        const bg = p.c.createRadialGradient(x - br * 0.3, y - ph - br * 1.3, 0, x, y - ph - br, br);
        bg.addColorStop(0, col(LEAD));
        bg.addColorStop(1, col(ORANGE, 1, 10));
        fill(p, bg, (k) => k.arc(x, y - ph - br, br, 0, TAU));
        line(p, SEPIA, 1, (k) => k.arc(x, y - ph - br, br, 0, TAU));
      }
    }
  }
  // The hoops at either end.
  for (const m of [-1, 1]) {
    const hx = w / 2 + m * w * 0.36;
    const hy = h * 0.62;
    const hr = u * 0.07;
    line(p, SEPIA, Math.max(2, u * 0.014) + 2, (k) => {
      k.moveTo(hx, hy + hr);
      k.lineTo(hx, h * 0.82);
    });
    line(p, col(WOOD), Math.max(2, u * 0.014), (k) => {
      k.moveTo(hx, hy + hr);
      k.lineTo(hx, h * 0.82);
    });
    line(p, SEPIA, Math.max(2, u * 0.016) + 2, (k) => k.arc(hx, hy, hr, 0, TAU));
    line(p, col(SAFFRON), Math.max(2, u * 0.016), (k) => k.arc(hx, hy, hr, 0, TAU));
  }
}

/** The Northern Air Temple on its spire of rock: towers clinging up the cliff to the top, mist round its foot, the Mechanist's pipes up its face. */
export function northTemple(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h * 0.9, col([30, 56, 70]), col([46, 60, 90]));
  peak(p, w * 0.1, h * 0.78, Math.max(w * 0.5, u * 0.7), h * 0.4, FAR);
  peak(p, w * 0.92, h * 0.8, Math.max(w * 0.45, u * 0.6), h * 0.34, FAR);
  const left = p.r() < 0.5;
  const sx = w * (left ? 0.46 : 0.54);
  const sw = Math.min(w * 0.46, u * 0.52);
  const top = h * 0.24;
  crag(p, sx, top, sw, h + 4, 0.45);
  // The Mechanist's pipes up the face, a puff of steam where one vents.
  const px = sx + (left ? 1 : -1) * sw * 0.12;
  line(p, SEPIA, Math.max(2, u * 0.012) + 2, (k) => {
    k.moveTo(px, h);
    k.lineTo(px, h * 0.44);
    k.lineTo(px + (left ? 1 : -1) * sw * 0.1, h * 0.4);
  });
  line(p, col([30, 20, 50]), Math.max(2, u * 0.012), (k) => {
    k.moveTo(px, h);
    k.lineTo(px, h * 0.44);
    k.lineTo(px + (left ? 1 : -1) * sw * 0.1, h * 0.4);
  });
  cloudHeap(p, px + (left ? 1 : -1) * sw * 0.16, h * 0.36, u * 0.06, [30, 20, 80]);
  // Ledges stepping down the cliff, each with its tower, and the great tower on the top.
  for (const [dx, y, s] of [
    [-0.34, 0.62, 0.7],
    [0.36, 0.5, 0.8],
    [-0.3, 0.38, 0.75],
  ]) {
    const lx = sx + dx * sw * (left ? 1 : -1);
    const ly = h * y;
    shaded(p, ROCK, (k) => {
      k.moveTo(lx - u * 0.08 * s, ly);
      k.lineTo(lx + u * 0.08 * s, ly);
      k.lineTo(lx + u * 0.03 * s, ly + u * 0.05 * s);
      k.lineTo(lx - u * 0.05 * s, ly + u * 0.04 * s);
      k.closePath();
    }, u * 0.02, SEPIA, 1);
    tower(p, lx, ly, u * 0.06 * s, u * 0.22 * s, AZURE);
  }
  tower(p, sx + (left ? -1 : 1) * sw * 0.04, top + 2, u * 0.09, u * 0.32, AZURE);
  cloudHeap(p, sx - sw * 0.5, h * 0.8, u * 0.2, [196, 40, 80]);
  cloudHeap(p, sx + sw * 0.55, h * 0.88, u * 0.22, [196, 40, 80], -1);
  const n = Math.max(1, Math.round((w / u) * 1.4));
  for (let i = 0; i < n; i++) cloudHeap(p, (w * (i + 0.5)) / n, h * 1.0, u * 0.24, [30, 60, 84], i % 2 ? -1 : 1);
  return { side: left ? 'right' : 'left' };
}

/** A glider of the Mechanist's: cloth wings on a wooden frame with scalloped trailing edges, at (x, y), `s` across, heading `a`. */
function glider(p: Press, x: number, y: number, s: number, a: number) {
  const c = p.c;
  c.save();
  c.translate(x, y);
  c.rotate(a);
  const wing: Trace = (k) => {
    k.moveTo(0, -s * 0.3);
    k.quadraticCurveTo(s * 0.5, -s * 0.22, s, -s * 0.05);
    for (let i = 1; i <= 3; i++) k.quadraticCurveTo(s * (1 - (i - 0.5) / 3) * 0.9, s * 0.02, s * (1 - i / 3) * 0.9 + s * 0.04, s * 0.14);
    for (let i = 1; i <= 3; i++) k.quadraticCurveTo(-s * ((i - 0.5) / 3) * 0.9, s * 0.02, -s * (i / 3) * 0.9 - (i === 3 ? s * 0.1 : -s * 0.04), i === 3 ? -s * 0.05 : s * 0.14);
    k.quadraticCurveTo(-s * 0.5, -s * 0.22, 0, -s * 0.3);
    k.closePath();
  };
  shaded(p, [34, 40, 72], wing, s * 0.2, SEPIA, 1);
  line(p, col(WOOD), Math.max(1, s * 0.035), (k) => {
    k.moveTo(0, -s * 0.32);
    k.lineTo(0, s * 0.18);
    k.moveTo(-s * 0.94, -s * 0.04);
    k.quadraticCurveTo(0, -s * 0.26, s * 0.94, -s * 0.04);
  });
  c.restore();
}

/** The Mechanist's flying machines round the Northern Air Temple's cliffs: gliders on the wind, and his first war balloon rising. */
export function gliders(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([22, 60, 62]), col([44, 70, 86]));
  const left = p.r() < 0.5;
  const d = left ? 1 : -1;
  cloudHeap(p, w * (left ? 0.62 : 0.38), h * 0.84, u * 0.24, [30, 60, 82]);
  cloudHeap(p, w * (left ? 0.92 : 0.08), h * 0.7, u * 0.18, [30, 60, 82], -d);
  // The cliff and its towers on the near side.
  const cx = left ? 0 : w;
  const cliff: Trace = (k) => {
    k.moveTo(cx - d * 4, h * 0.3);
    k.lineTo(cx + d * w * 0.14, h * 0.32);
    k.lineTo(cx + d * w * 0.2, h * 0.5);
    k.lineTo(cx + d * w * 0.16, h * 0.7);
    k.lineTo(cx + d * w * 0.22, h + 4);
    k.lineTo(cx - d * 4, h + 4);
    k.closePath();
  };
  rock(p, cliff, cx + d * w * 0.08, h * 0.3, w * 0.28, h);
  tower(p, cx + d * w * 0.05, h * 0.31, u * 0.07, u * 0.26, AZURE);
  tower(p, cx + d * w * 0.12, h * 0.33, u * 0.05, u * 0.18, AZURE);
  // The war balloon: gores of red and grey, the basket on its ropes, the fire under it.
  const bx = w * (left ? 0.72 : 0.28);
  const by = h * 0.36;
  const br = Math.min(u * 0.2, w * 0.16);
  const env: Trace = (k) => {
    k.moveTo(bx - br * 0.24, by + br * 1.1);
    k.bezierCurveTo(bx - br * 1.2, by + br * 0.4, bx - br * 1.05, by - br * 1.05, bx, by - br * 1.05);
    k.bezierCurveTo(bx + br * 1.05, by - br * 1.05, bx + br * 1.2, by + br * 0.4, bx + br * 0.24, by + br * 1.1);
    k.closePath();
  };
  shaded(p, [4, 50, 44], env, br * 0.5);
  within(p, env, () => {
    fill(p, col([30, 8, 52]), (k) => {
      for (const m of [-0.62, 0.0, 0.62]) {
        k.moveTo(bx + m * br - br * 0.14, by - br * 1.1);
        k.quadraticCurveTo(bx + m * br * 1.3 - br * 0.12, by, bx + m * br * 0.3 - br * 0.05, by + br * 1.15);
        k.lineTo(bx + m * br * 0.3 + br * 0.05, by + br * 1.15);
        k.quadraticCurveTo(bx + m * br * 1.3 + br * 0.12, by, bx + m * br + br * 0.14, by - br * 1.1);
        k.closePath();
      }
    });
    line(p, GOLD, Math.max(1, br * 0.03), (k) => {
      k.moveTo(bx - br * 1.2, by + br * 0.1);
      k.quadraticCurveTo(bx, by + br * 0.24, bx + br * 1.2, by + br * 0.1);
    });
  });
  line(p, SEPIA, 1.2, env);
  line(p, SEPIA, 1, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(bx + m * br * 0.24, by + br * 1.1);
      k.lineTo(bx + m * br * 0.2, by + br * 1.45);
    }
  });
  fill(p, col(SAFFRON), (k) => {
    k.moveTo(bx, by + br * 1.02);
    k.quadraticCurveTo(bx + br * 0.1, by + br * 1.2, bx, by + br * 1.3);
    k.quadraticCurveTo(bx - br * 0.1, by + br * 1.2, bx, by + br * 1.02);
    k.closePath();
  });
  shaded(p, WOOD, (k) => k.rect(bx - br * 0.24, by + br * 1.42, br * 0.48, br * 0.26), br * 0.1, SEPIA, 1);
  // Gliders on the wind between the cliff and the balloon.
  const n = Math.max(2, Math.round((w / u) * 1.6));
  for (let i = 0; i < n; i++) {
    const gx = cx + d * (w * 0.26 + ((w * 0.4) / n) * i) + p.rr(-0.03, 0.03) * w;
    const gy = h * p.rr(0.14, 0.7);
    glider(p, gx, gy, u * p.rr(0.11, 0.16), d * p.rr(0.15, 0.45));
  }
  swirl(p, w * 0.5, h * 0.2, u * 0.08, 1.4, col(LEAD, 0.6), Math.max(1, u * 0.006));
  return { side: left ? 'right' : 'left' };
}

/** A branch of peach blossom reaching in from a corner. */
function blossom(p: Press, x0: number, y0: number, len: number, dir: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push([x0 + dir * len * t, y0 - len * 0.35 * Math.sin(t * 2.2)]);
  }
  line(p, col([20, 30, 22]), Math.max(2, len * 0.03), (k) => {
    k.moveTo(...pts[0]);
    for (const pt of pts.slice(1)) k.lineTo(...pt);
  });
  const flowers: [number, number, number][] = pts.slice(1).flatMap(([px, py], i) => [
    [px + p.rr(-0.04, 0.04) * len, py + p.rr(-0.08, 0.02) * len, len * (0.04 + i * 0.004)],
    [px + p.rr(-0.06, 0.06) * len, py - p.rr(0.02, 0.1) * len, len * 0.035],
  ]);
  for (const [fx, fy, fr] of flowers) {
    fill(p, col([350, 70, 84]), (k) => {
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * TAU;
        k.moveTo(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr);
        k.arc(fx + Math.cos(a) * fr * 0.6, fy + Math.sin(a) * fr * 0.6, fr * 0.55, 0, TAU);
      }
    });
    fill(p, col([40, 90, 60]), (k) => k.arc(fx, fy, fr * 0.3, 0, TAU));
  }
}

/** The Eastern Air Temple at dawn: slender towers on separate peaks joined by rope bridges, peach blossom in front. */
export function eastTemple(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h * 0.8, col([340, 40, 70]), col([40, 74, 88]));
  orb(p, w * 0.5, h * 0.52, u * 0.12, [24, 90, 64]);
  cloudHeap(p, w * 0.5, h * 0.64, u * 0.22, [340, 40, 84]);
  const n = Math.max(3, Math.min(5, Math.round((w / u) * 1.8)));
  const tops: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = (w * (i + 0.5)) / n + p.rr(-0.06, 0.06) * (w / n);
    const top = h * p.rr(0.3, 0.52);
    const pw = Math.min((w / n) * p.rr(0.55, 0.8), u * 0.42);
    crag(p, x, top, pw, h + 4, p.rr(0.3, 0.45));
    tops.push([x, top]);
  }
  // Rope bridges between the tops, under the towers.
  line(p, col(WOOD, 1, -10), Math.max(1, u * 0.005), (k) => {
    for (let i = 1; i < tops.length; i++) {
      const [ax, ay] = tops[i - 1];
      const [bx, by] = tops[i];
      for (const dy of [0, -u * 0.02]) {
        k.moveTo(ax, ay + dy - u * 0.01);
        k.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + u * 0.08 + dy, bx, by + dy - u * 0.01);
      }
      for (let j = 1; j < 10; j++) {
        const t = j / 10;
        const mx = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * ((ax + bx) / 2) + t * t * bx;
        const my = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * (Math.max(ay, by) + u * 0.08) + t * t * by - u * 0.01;
        k.moveTo(mx, my);
        k.lineTo(mx, my - u * 0.02);
      }
    }
  });
  tops.forEach(([x, top], i) => {
    tower(p, x - u * 0.03, top + 2, u * 0.045, u * (0.26 + (i % 2) * 0.08), CINNABAR);
    tower(p, x + u * 0.035, top + 2, u * 0.035, u * 0.18, CINNABAR);
  });
  cloudHeap(p, w * 0.15, h * 0.86, u * 0.2, [340, 40, 84]);
  cloudHeap(p, w * 0.85, h * 0.92, u * 0.2, [340, 40, 84], -1);
  const left = p.r() < 0.5;
  blossom(p, left ? -u * 0.02 : w + u * 0.02, h * 0.98, Math.min(w * 0.55, u * 0.6), left ? 1 : -1);
  return { side: left ? 'right' : 'left' };
}

/** The Western Air Temple: halls and towers hanging roof-down from ledges on the canyon's cliff face, a waterfall pouring past them into the mist. */
export function westTemple(p: Press): Inscribe {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const rim = h * 0.16;
  sky(p, 0, rim + 4, col([24, 70, 66]), col([44, 70, 86]));
  sky(p, rim, h, col([196, 24, 60]), col([204, 30, 82]));
  // The cliff face under the rim, its foot ragged over the mist.
  const faceFoot = h * 0.68;
  const foot = Array.from({ length: 9 }, (_, i) => faceFoot + h * (0.04 * Math.sin(i * 2.3) + p.rr(-0.02, 0.02)));
  const face: Trace = (k) => {
    k.moveTo(-4, rim);
    k.lineTo(w + 4, rim);
    k.lineTo(w + 4, foot[8]);
    for (let i = 8; i >= 0; i--) k.lineTo((w * i) / 8, foot[i]);
    k.lineTo(-4, foot[0]);
    k.closePath();
  };
  shaded(p, ROCK, face, h * 0.1);
  // Beds of rock at uneven depths, and cracks of uneven length running down between them.
  const beds = Array.from({ length: 4 }, (_, i) => rim + (faceFoot - rim) * ((i + 1 + p.rr(-0.3, 0.3)) / 5));
  const cracks = Array.from({ length: Math.max(4, Math.round((w / u) * 4)) }, () => {
    const x = w * p.rr(0, 1);
    const y0 = rim + (faceFoot - rim) * p.rr(0, 0.5);
    return [x, y0, y0 + (faceFoot - rim) * p.rr(0.2, 0.5), p.rr(-1, 1) * u * 0.03];
  });
  within(p, face, () => {
    line(p, col(ROCK, 0.45, -16), Math.max(1, u * 0.006), (k) => {
      beds.forEach((y, i) => {
        k.moveTo(-4, y);
        for (let j = 1; j <= 6; j++) k.quadraticCurveTo((w * (j - 0.5)) / 6, y + ((j + i) % 2 ? -1 : 1) * h * 0.015, (w * j) / 6, y + ((j + i) % 3) * h * 0.006);
      });
      for (const [x, y0, y1, bend] of cracks) {
        k.moveTo(x, y0);
        k.quadraticCurveTo(x + bend, (y0 + y1) / 2, x - bend * 0.5, y1);
      }
    });
  });
  line(p, SEPIA, 1.2, face);
  fill(p, col(MALACHITE, 1, 6), (k) => k.rect(-4, rim - h * 0.025, w + 8, h * 0.03));
  line(p, SEPIA, 1, (k) => k.rect(-4, rim - h * 0.025, w + 8, h * 0.03));
  // Two ledges across the face, buildings hanging from each with their roofs pointing down.
  const left = p.r() < 0.5;
  for (const [ly, s] of [
    [rim + (faceFoot - rim) * 0.12, 1],
    [rim + (faceFoot - rim) * 0.55, 0.8],
  ]) {
    const x0 = w * (left ? 0.2 : 0.06);
    const x1 = w * (left ? 0.94 : 0.8);
    shaded(p, ROCK, (k) => {
      k.moveTo(x0, ly);
      k.lineTo(x1, ly);
      k.lineTo(x1 - u * 0.03, ly + h * 0.03);
      k.lineTo(x0 + u * 0.03, ly + h * 0.03);
      k.closePath();
    }, h * 0.02, SEPIA, 1);
    const n = Math.max(2, Math.round(((x1 - x0) / u) * 1.8));
    for (let i = 0; i < n; i++) {
      const bx = x0 + ((x1 - x0) * (i + 0.5)) / n + p.rr(-0.04, 0.04) * u;
      const bs = u * s * p.rr(0.8, 1);
      c.save();
      c.translate(bx, ly + h * 0.028);
      c.scale(1, -1);
      if (i % 2) tower(p, 0, 0, bs * 0.1, bs * 0.3, TEAL);
      else pagoda(p, 0, 0, bs * 0.2, bs * 0.3, 3, TEAL);
      c.restore();
    }
  }
  // The waterfall from the rim down the face, and mist over the canyon floor.
  const fx = w * (left ? 0.1 : 0.9);
  const fw = u * 0.08;
  const fall: Trace = (k) => {
    k.moveTo(fx - fw / 2, rim - h * 0.025);
    k.lineTo(fx + fw / 2, rim - h * 0.025);
    k.quadraticCurveTo(fx + fw * 0.6, h * 0.6, fx + fw * 0.9, h + 4);
    k.lineTo(fx - fw * 0.9, h + 4);
    k.quadraticCurveTo(fx - fw * 0.6, h * 0.6, fx - fw / 2, rim - h * 0.025);
    k.closePath();
  };
  fill(p, col([196, 40, 88], 0.92), fall);
  line(p, col(LEAD, 0.8), Math.max(1, u * 0.004), (k) => {
    for (let i = -2; i <= 2; i++) {
      k.moveTo(fx + i * fw * 0.18, rim);
      k.quadraticCurveTo(fx + i * fw * 0.24, h * 0.6, fx + i * fw * 0.34, h);
    }
  });
  line(p, SEPIA, 1, fall);
  const n = Math.max(2, Math.round((w / u) * 2));
  for (let i = 0; i < n; i++) cloudHeap(p, (w * (i + 0.5)) / n, h * (0.86 + (i % 2) * 0.08), u * 0.24, [196, 40, 82], i % 2 ? -1 : 1);
  return { side: left ? 'right' : 'left' };
}
/** A tiered tower: white storeys under flared roofs in `roof`, each smaller than the last, a gold spire on top. */
function pagoda(p: Press, x: number, base: number, wd: number, ht: number, tiers: number, roof: HSL) {
  let y = base;
  let tw = wd;
  const th = ht / (tiers + 0.6);
  for (let i = 0; i < tiers; i++) {
    shaded(p, LEAD, (k) => k.rect(x - tw * 0.38, y - th * 0.7, tw * 0.76, th * 0.7), tw * 0.12, SEPIA, 1);
    fill(p, col([24, 30, 26]), (k) => {
      for (const m of [-0.18, 0.18]) k.rect(x + m * tw - tw * 0.05, y - th * 0.5, tw * 0.1, th * 0.3);
    });
    y -= th * 0.7;
    const rw = tw * 1.2;
    const roofShape: Trace = (k) => {
      k.moveTo(x - rw / 2, y + th * 0.05);
      k.quadraticCurveTo(x - rw * 0.34, y - th * 0.08, x - rw * 0.26, y - th * 0.32);
      k.lineTo(x + rw * 0.26, y - th * 0.32);
      k.quadraticCurveTo(x + rw * 0.34, y - th * 0.08, x + rw / 2, y + th * 0.05);
      k.quadraticCurveTo(x, y - th * 0.02, x - rw / 2, y + th * 0.05);
      k.closePath();
    };
    shaded(p, roof, roofShape, rw * 0.2, SEPIA, 1);
    line(p, GOLD, Math.max(1, tw * 0.03), (k) => {
      k.moveTo(x - rw / 2, y + th * 0.05);
      k.quadraticCurveTo(x, y - th * 0.02, x + rw / 2, y + th * 0.05);
    });
    y -= th * 0.3;
    tw *= 0.74;
  }
  line(p, GOLD, Math.max(1.5, wd * 0.03), (k) => {
    k.moveTo(x, y);
    k.lineTo(x, y - th * 0.6);
  });
  fill(p, GOLD, (k) => k.arc(x, y - th * 0.6, Math.max(1.5, wd * 0.03), 0, TAU));
}

/** Air Temple Island in Yue Bay at dusk: the temple's tiered tower over its cliffs and trees, Republic City pale across the water. */
export function templeIsland(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  const water = h * 0.66;
  sky(p, 0, water, col([300, 26, 60]), col([36, 76, 84]));
  orb(p, w * 0.8, h * 0.24, u * 0.08, [30, 90, 66]);
  // The city across the bay.
  fill(p, col([260, 16, 64], 0.75), (k) => {
    for (let i = 0; i < 26; i++) {
      const bx = (w * i) / 26 + p.rr(0, w / 40);
      const bh = h * p.rr(0.05, 0.2) * (i % 5 === 2 ? 1.5 : 1);
      const bw = w * p.rr(0.015, 0.03);
      k.rect(bx, water - bh, bw, bh + 1);
    }
  });
  ripples(p, water, h + 4, [190, 36, 46]);
  // The island: cliffs, trees and the temple.
  const left = p.r() < 0.5;
  const ix = w * (left ? 0.36 : 0.64);
  const iw = Math.min(w * 0.6, u * 1.1);
  const top = h * 0.5;
  const island: Trace = (k) => {
    k.moveTo(ix - iw / 2, water + h * 0.04);
    k.quadraticCurveTo(ix - iw * 0.44, top + h * 0.04, ix - iw * 0.3, top);
    k.lineTo(ix + iw * 0.28, top - h * 0.02);
    k.quadraticCurveTo(ix + iw * 0.44, top + h * 0.04, ix + iw / 2, water + h * 0.04);
    k.closePath();
  };
  rock(p, island, ix, top, iw, water + h * 0.04);
  for (let i = 0; i < 7; i++) {
    const tx = ix + iw * p.rr(-0.36, 0.34);
    const tr = u * p.rr(0.04, 0.06);
    shaded(p, MALACHITE, (k) => {
      k.moveTo(tx + tr, top);
      k.arc(tx, top - tr * 0.4, tr, 0, TAU);
    }, tr * 0.6, SEPIA, 1);
  }
  pagoda(p, ix - iw * 0.08, top, u * 0.2, u * 0.4, 4, TEAL);
  for (const m of [-1, 1]) {
    shaded(p, LEAD, (k) => k.rect(ix - iw * 0.08 + m * u * 0.2 - u * 0.07, top - u * 0.08, u * 0.14, u * 0.08), u * 0.02, SEPIA, 1);
    shaded(p, TEAL, (k) => {
      const rx = ix - iw * 0.08 + m * u * 0.2;
      k.moveTo(rx - u * 0.09, top - u * 0.075);
      k.lineTo(rx - u * 0.05, top - u * 0.12);
      k.lineTo(rx + u * 0.05, top - u * 0.12);
      k.lineTo(rx + u * 0.09, top - u * 0.075);
      k.closePath();
    }, u * 0.02, SEPIA, 1);
  }
  cloudHeap(p, w * (left ? 0.85 : 0.15), h * 0.42, u * 0.16, [300, 30, 84]);
  return { side: left ? 'right' : 'left' };
}

/** The spinning gates on Air Temple Island: tall painted panels on their spindles, each caught at its own angle, a leaf drifting through. */
export function gates(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  warmSky(p, h * 0.5);
  // Roofs of the temple behind the courtyard wall.
  for (let i = 0; i < 3; i++) {
    const rx = w * (0.2 + i * 0.3);
    shaded(p, TEAL, (k) => {
      k.moveTo(rx - u * 0.3, h * 0.42);
      k.quadraticCurveTo(rx - u * 0.18, h * 0.38, rx - u * 0.14, h * 0.3);
      k.lineTo(rx + u * 0.14, h * 0.3);
      k.quadraticCurveTo(rx + u * 0.18, h * 0.38, rx + u * 0.3, h * 0.42);
      k.closePath();
    }, u * 0.06, SEPIA, 1);
  }
  shaded(p, LEAD, (k) => k.rect(-4, h * 0.42, w + 8, h * 0.1), h * 0.03, SEPIA, 1);
  shaded(p, [34, 22, 70], (k) => k.rect(-4, h * 0.52, w + 8, h * 0.5), h * 0.08, SEPIA, 1);
  // Two rows of gates, the far one smaller.
  for (const [base, ph, pw, n] of [
    [h * 0.62, h * 0.2, u * 0.07, Math.round((w / u) * 7)],
    [h * 0.92, h * 0.34, u * 0.1, Math.round((w / u) * 5)],
  ]) {
    for (let i = 0; i < n; i++) {
      const x = (w * (i + 0.5)) / n;
      const turn = Math.abs(Math.cos(p.rr(0, Math.PI)));
      const hw = pw * Math.max(0.12, turn);
      const panel: Trace = (k) => k.rect(x - hw, base - ph, hw * 2, ph);
      shaded(p, [16, 70, 40 + turn * 14], panel, hw * 0.5, SEPIA, 1);
      line(p, GOLD, Math.max(1, pw * 0.05), (k) => k.rect(x - hw * 0.8, base - ph * 0.94, hw * 1.6, ph * 0.88));
      if (turn > 0.55) swirl(p, x, base - ph * 0.55, hw * 0.6, 1.3, GOLD, Math.max(1, pw * 0.04));
      line(p, SEPIA, Math.max(1.5, pw * 0.06), (k) => {
        k.moveTo(x, base - ph - h * 0.015);
        k.lineTo(x, base - ph);
        k.moveTo(x, base);
        k.lineTo(x, base + h * 0.012);
      });
    }
  }
  // Wind through them, and the leaf it carries.
  for (let i = 0; i < 3; i++) swirl(p, w * p.rr(0.15, 0.85), h * p.rr(0.55, 0.85), u * p.rr(0.05, 0.09), 1.3, col(LEAD, 0.7), Math.max(1, u * 0.006), p.rr(0, TAU));
  const lx = w * p.rr(0.3, 0.7);
  const ly = h * 0.7;
  const ls = u * 0.04;
  shaded(p, [100, 50, 46], (k) => {
    k.moveTo(lx - ls, ly);
    k.quadraticCurveTo(lx, ly - ls * 0.7, lx + ls, ly);
    k.quadraticCurveTo(lx, ly + ls * 0.7, lx - ls, ly);
    k.closePath();
  }, ls * 0.4, SEPIA, 1);
}
