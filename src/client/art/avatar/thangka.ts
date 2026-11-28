import { finish, hsl, type HSL, type Painter } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import type { Inscribe } from './ink';

/**
 * Thangkas for the Air Nomads, after Tibetan scroll painting on cotton: mineral colours laid flat and shaded
 * darker toward their edges, fine sepia outlines with gold on clouds, haloes and ornament, heaped clouds of
 * scalloped lobes, steep peaks drawn in nested contours under snow, and warm skies fading to the horizon.
 */

export const GROUND: HSL = [42, 38, 88];
export const SEPIA = hsl(16, 44, 22);
export const GOLD = hsl(44, 82, 56);
export const SAFFRON: HSL = [40, 92, 56];
export const ORANGE: HSL = [24, 86, 52];
export const AZURE: HSL = [204, 62, 46];
export const TEAL: HSL = [176, 42, 40];
export const MALACHITE: HSL = [150, 40, 40];
export const CINNABAR: HSL = [6, 70, 48];
export const LEAD: HSL = [40, 30, 96];
export const ROCK: HSL = [186, 28, 46];
/** A colour from one of the pigments, `a` its opacity and `dl` lighter or darker. */
export const col = (c: HSL, a = 1, dl = 0) => hsl(c[0], c[1], c[2] + dl, a);

/** A thangka painter: the shared helpers, nothing printed out of register. */
export function thangkaPress(painter: Painter): Press {
  return Object.assign(painter, { mx: 0, my: 0 });
}

/** Primed cotton: a warm ground; its weave comes up in the finish. */
export function cotton(p: Press) {
  p.c.fillStyle = col(GROUND);
  p.c.fillRect(0, 0, p.w, p.h);
}

export function thangkaFinish(p: Press) {
  finish(p, { weave: 5, grain: 7, vignette: 0.16, warm: 0.3 });
}

/** A sky graded from `top` at y0 down to `bottom` at y1. */
export function sky(p: Press, y0: number, y1: number, top: string, bottom: string) {
  const g = p.c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  fill(p, g, (k) => k.rect(-4, y0, p.w + 8, y1 - y0));
}

/**
 * A shape in flat colour darkened toward its edges, the way thangka painters shade, then outlined: two soft
 * strokes kept inside the shape do the shading, a thin one the outline.
 */
export function shaded(p: Press, base: HSL, trace: Trace, edge: number, outline: string = SEPIA, lw = 1.2, lit?: [number, number]) {
  if (lit) {
    // Lit from above: lighter at lit[0], the plain colour by lit[1].
    const g = p.c.createLinearGradient(0, lit[0], 0, lit[1]);
    g.addColorStop(0, col(base, 1, 14));
    g.addColorStop(1, col(base));
    fill(p, g, trace);
  } else fill(p, col(base), trace);
  // On a shape too small for it to show, the shading at the edge is left out; the outline covers it.
  if (edge >= 2)
    within(p, trace, () => {
      line(p, col(base, 0.3, -18), edge, trace);
      line(p, col(base, 0.35, -12), edge * 0.45, trace);
    });
  line(p, outline, lw, trace);
}

/** The lobes of a cloud, back to front: [x, y, radius] in units of its size. */
const LOBES: [number, number, number][] = [
  [-0.08, -0.6, 0.24],
  [-0.42, -0.32, 0.3],
  [0.14, -0.4, 0.33],
  [0.5, -0.24, 0.26],
  [-0.74, 0, 0.29],
  [-0.28, 0.02, 0.37],
  [0.24, 0.04, 0.35],
  [0.7, 0.02, 0.29],
];

/**
 * A thangka cloud heaped from scalloped lobes, each shaded from white to `rim` at its edge, outlined in gold
 * with an inner contour, and a curl in the biggest. (x, y) is its middle, `s` half its width.
 */
export function cloudHeap(p: Press, x: number, y: number, s: number, rim: HSL = [196, 40, 78], flip = 1) {
  const lw = Math.max(1, s * 0.022);
  for (const [dx, dy, r] of LOBES) {
    const cx = x + dx * s * flip;
    const cy = y + dy * s;
    const rr = r * s;
    const g = p.c.createRadialGradient(cx - rr * 0.25, cy - rr * 0.3, rr * 0.1, cx, cy, rr);
    g.addColorStop(0, col(LEAD));
    g.addColorStop(0.55, col(LEAD, 1, -3));
    g.addColorStop(1, col(rim));
    const lobe: Trace = (k) => k.arc(cx, cy, rr, 0, TAU);
    fill(p, g, lobe);
    line(p, col(rim, 0.9, -14), Math.max(1, lw * 0.8), (k) => k.arc(cx, cy, rr * 0.72, Math.PI * 1.05, Math.PI * 1.7));
    line(p, GOLD, lw, lobe);
  }
  const [dx, dy, r] = LOBES[5];
  curl(p, x + dx * s * flip, y + dy * s, r * s * 0.5, GOLD, lw, flip);
}

/** A curl: a spiral turning in to (x, y) from radius r. */
export function curl(p: Press, x: number, y: number, r: number, ink: string, width: number, flip = 1) {
  line(p, ink, width, (k) => {
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = flip * (Math.PI + t * TAU * 1.3);
      const rr = r * (1 - t * 0.85);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i) k.lineTo(px, py);
      else k.moveTo(px, py);
    }
  });
}

/** A peak's outline on `base` centred on x, wd wide and ht tall. */
function peakShape(x: number, base: number, wd: number, ht: number): Trace {
  return (k) => {
    k.moveTo(x - wd / 2, base);
    k.quadraticCurveTo(x - wd * 0.36, base - ht * 0.42, x - wd * 0.2, base - ht * 0.58);
    k.lineTo(x - wd * 0.25, base - ht * 0.64);
    k.quadraticCurveTo(x - wd * 0.12, base - ht * 0.84, x, base - ht);
    k.quadraticCurveTo(x + wd * 0.1, base - ht * 0.78, x + wd * 0.21, base - ht * 0.7);
    k.lineTo(x + wd * 0.17, base - ht * 0.62);
    k.quadraticCurveTo(x + wd * 0.34, base - ht * 0.38, x + wd / 2, base);
    k.closePath();
  };
}

/** A steep stylised peak from x - wd/2 to x + wd/2 on `base`, `ht` tall: nested contours of rock, shaded at its edges, snow on top. */
export function peak(p: Press, x: number, base: number, wd: number, ht: number, rock: HSL = ROCK, snow = true) {
  const shape = peakShape(x, base, wd, ht);
  shaded(p, rock, shape, wd * 0.22);
  within(p, shape, () => {
    for (const s of [0.66, 0.36]) line(p, col(rock, 0.6, -16), Math.max(1, wd * 0.008), peakShape(x, base, wd * s, ht * (0.55 + 0.45 * s)));
    if (snow) {
      const top = base - ht;
      fill(p, col(LEAD), (k) => {
        k.moveTo(x - wd * 0.5, top - 4);
        k.lineTo(x - wd * 0.5, top + ht * 0.26);
        for (let i = 1; i <= 6; i++) {
          const sx = x - wd * 0.5 + (wd * i) / 6;
          k.quadraticCurveTo(sx - wd / 12, top + ht * (i % 2 ? 0.36 : 0.22), sx, top + ht * 0.26);
        }
        k.lineTo(x + wd * 0.5, top - 4);
        k.closePath();
      });
      line(p, col([200, 30, 70], 0.7), Math.max(1, wd * 0.008), (k) => {
        k.moveTo(x - wd * 0.06, top + ht * 0.08);
        k.quadraticCurveTo(x - wd * 0.1, top + ht * 0.18, x - wd * 0.16, top + ht * 0.26);
      });
    }
  });
  line(p, SEPIA, 1.2, shape);
}

/**
 * An Air Nomad tower: a round white body shaded at its sides, a saffron band and arched windows, a tall cone
 * of a roof in `roof` with gold at its eaves and a gold spire. (x, base) is the middle of its foot.
 */
export function tower(p: Press, x: number, base: number, wd: number, ht: number, roof: HSL = TEAL) {
  const bodyTop = base - ht * 0.55;
  const bh = base - bodyTop;
  const body: Trace = (k) => k.rect(x - wd / 2, bodyTop, wd, bh);
  const g = p.c.createLinearGradient(x - wd / 2, 0, x + wd / 2, 0);
  g.addColorStop(0, col(LEAD, 1, -20));
  g.addColorStop(0.35, col(LEAD));
  g.addColorStop(1, col(LEAD, 1, -24));
  fill(p, g, body);
  fill(p, col(ORANGE), (k) => k.rect(x - wd / 2, bodyTop + bh * 0.06, wd, bh * 0.09));
  // Square windows under lintels, in a row or two.
  fill(p, col([24, 30, 26]), (k) => {
    const rows = bh > wd * 1.4 ? 2 : 1;
    for (let r = 0; r < rows; r++)
      for (const m of [-0.24, 0, 0.24]) k.rect(x + m * wd - wd * 0.06, bodyTop + bh * (0.3 + r * 0.32), wd * 0.12, wd * 0.14);
  });
  line(p, SEPIA, 1, body);
  // The roof sweeps up from wide eaves turned up at their tips, its sides drawn in to the spire.
  const rw = wd * 1.6;
  const apex = base - ht;
  const eave = bodyTop + bh * 0.02;
  const rh = eave - apex;
  const roofShape: Trace = (k) => {
    k.moveTo(x - rw / 2, eave - rh * 0.08);
    k.quadraticCurveTo(x - rw * 0.14, eave - rh * 0.1, x - rw * 0.07, eave - rh * 0.5);
    k.quadraticCurveTo(x - rw * 0.025, eave - rh * 0.8, x, apex);
    k.quadraticCurveTo(x + rw * 0.025, eave - rh * 0.8, x + rw * 0.07, eave - rh * 0.5);
    k.quadraticCurveTo(x + rw * 0.14, eave - rh * 0.1, x + rw / 2, eave - rh * 0.08);
    k.quadraticCurveTo(x + rw * 0.3, eave + rh * 0.03, x, eave + rh * 0.05);
    k.quadraticCurveTo(x - rw * 0.3, eave + rh * 0.03, x - rw / 2, eave - rh * 0.08);
    k.closePath();
  };
  shaded(p, roof, roofShape, rw * 0.22, SEPIA, 1);
  line(p, GOLD, Math.max(1, wd * 0.05), (k) => {
    k.moveTo(x - rw / 2, eave - rh * 0.08);
    k.quadraticCurveTo(x - rw * 0.3, eave + rh * 0.03, x, eave + rh * 0.05);
    k.quadraticCurveTo(x + rw * 0.3, eave + rh * 0.03, x + rw / 2, eave - rh * 0.08);
    k.moveTo(x, apex);
    k.lineTo(x, apex - ht * 0.08);
  });
  fill(p, GOLD, (k) => k.arc(x, apex - ht * 0.09, Math.max(1, wd * 0.06), 0, TAU));
}

/**
 * A crag of rock rising from `foot` to `top`, `wd` wide at its foot and `tw` of that across its summit: flanks
 * that step in as they climb, each step a band of rock shaded at its edges with a lit edge on the left.
 * Returns the summit's left and right ends.
 */
export function crag(p: Press, x: number, top: number, wd: number, foot: number, tw = 0.5, ink: HSL = ROCK): [number, number] {
  const steps = 5;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = foot + (top - foot) * t;
    const half = (wd / 2) * (1 - t * (1 - tw));
    const jog = i > 0 && i < steps ? wd * 0.05 : 0;
    left.push([x - half + p.rr(-1, 1) * jog, y]);
    right.push([x + half + p.rr(-1, 1) * jog, y]);
  }
  const shape: Trace = (k) => {
    k.moveTo(...left[0]);
    for (let i = 1; i <= steps; i++) {
      const [qx, qy] = left[i - 1];
      const [px, py] = left[i];
      k.lineTo(qx + (px - qx) * 0.25, py + (qy - py) * 0.3);
      k.lineTo(px, py);
    }
    k.quadraticCurveTo(x, top - wd * 0.02, ...right[steps]);
    for (let i = steps - 1; i >= 0; i--) {
      const [qx, qy] = right[i + 1];
      const [px, py] = right[i];
      k.lineTo(px + (qx - px) * 0.25, qy + (py - qy) * 0.7);
      k.lineTo(px, py);
    }
    k.closePath();
  };
  shaded(p, ink, shape, wd * 0.2, SEPIA, 1.2, [top, top + (foot - top) * 0.6]);
  within(p, shape, () => {
    line(p, col(ink, 0.55, -18), Math.max(1, wd * 0.01), (k) => {
      for (let i = 1; i < steps; i++) {
        k.moveTo(...left[i]);
        k.quadraticCurveTo(x, left[i][1] + wd * 0.05, ...right[i]);
      }
    });
    line(p, col(ink, 0.55, 16), Math.max(1, wd * 0.03), (k) => {
      k.moveTo(left[0][0] + wd * 0.04, foot);
      for (let i = 1; i <= steps; i++) k.lineTo(left[i][0] + wd * 0.04, left[i][1]);
    });
  });
  line(p, SEPIA, 1.2, shape);
  return [left[steps][0], right[steps][0]];
}

/**
 * The dark red band that crowns a temple wall under its eaves, the way Tibetan walls are finished, with gold
 * discs along it. From x0 to x1, its top at y and `th` deep.
 */
export function frieze(p: Press, x0: number, x1: number, y: number, th: number) {
  shaded(p, [4, 46, 30], (k) => k.rect(x0, y, x1 - x0, th), th * 0.3, SEPIA, 1);
  const n = Math.max(2, Math.round((x1 - x0) / (th * 3.2)));
  fill(p, GOLD, (k) => {
    for (let i = 0; i < n; i++) {
      const cx = x0 + ((x1 - x0) * (i + 0.5)) / n;
      k.moveTo(cx + th * 0.24, y + th / 2);
      k.arc(cx, y + th / 2, th * 0.24, 0, TAU);
    }
  });
}

/**
 * A Tibetan window, `s` wide with its top middle at (x, y): a black surround narrowing to its top, a red
 * frame with gold mullions, and a striped valance over it.
 */
export function templeWindow(p: Press, x: number, y: number, s: number) {
  const ht = s * 1.1;
  fill(p, col([30, 20, 14]), (k) => {
    k.moveTo(x - s * 0.4, y);
    k.lineTo(x + s * 0.4, y);
    k.lineTo(x + s * 0.52, y + ht);
    k.lineTo(x - s * 0.52, y + ht);
    k.closePath();
  });
  const fw = s * 0.48;
  const fh = ht * 0.62;
  const fy = y + ht * 0.22;
  fill(p, col(CINNABAR, 1, -12), (k) => k.rect(x - fw / 2, fy, fw, fh));
  line(p, GOLD, Math.max(1, s * 0.035), (k) => {
    k.rect(x - fw / 2, fy, fw, fh);
    k.moveTo(x, fy);
    k.lineTo(x, fy + fh);
    k.moveTo(x - fw / 2, fy + fh / 2);
    k.lineTo(x + fw / 2, fy + fh / 2);
  });
  fill(p, col(LEAD), (k) => k.rect(x - s * 0.5, y - s * 0.04, s, s * 0.14));
  fill(p, col(AZURE), (k) => {
    for (let i = 0; i < 5; i++) k.rect(x - s * 0.5 + (s * (i + 0.25)) / 5, y - s * 0.04, s * 0.1, s * 0.14);
  });
  line(p, SEPIA, 1, (k) => k.rect(x - s * 0.5, y - s * 0.04, s, s * 0.14));
}

/** The sun or the moon: a disc shaded from `ink` at its middle a little darker to its edge, ringed in gold. */
export function orb(p: Press, x: number, y: number, r: number, ink: HSL = [18, 88, 58]) {
  const g = p.c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col(ink, 1, 8));
  g.addColorStop(1, col(ink, 1, -6));
  fill(p, g, (k) => k.arc(x, y, r, 0, TAU));
  line(p, GOLD, Math.max(1, r * 0.06), (k) => k.arc(x, y, r, 0, TAU));
}

/** A halo: a disc shaded out from `inner` at its middle, edged in gold, with a ring of fine gold rays. */
export function halo(p: Press, x: number, y: number, r: number, inner: HSL = [170, 40, 70]) {
  const g = p.c.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, col(inner, 1, 12));
  g.addColorStop(1, col(inner, 1, -10));
  fill(p, g, (k) => k.arc(x, y, r, 0, TAU));
  line(p, col([44, 80, 70], 0.55), Math.max(1, r * 0.008), (k) => {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      k.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55);
      k.lineTo(x + Math.cos(a) * r * 0.94, y + Math.sin(a) * r * 0.94);
    }
  });
  line(p, GOLD, Math.max(1.5, r * 0.05), (k) => k.arc(x, y, r, 0, TAU));
  line(p, SEPIA, 1, (k) => k.arc(x, y, r * 1.03, 0, TAU));
}

/** An open lotus seen from the side, standing on (x, y), `s` across: petals shaded white to `petal`, edged in gold. */
export function lotus(p: Press, x: number, y: number, s: number, petal: HSL = [350, 60, 74]) {
  const one = (a: number, len: number, wd: number) => {
    const tx = x + Math.sin(a) * len;
    const ty = y - Math.cos(a) * len;
    const shape: Trace = (k) => {
      k.moveTo(x, y);
      k.quadraticCurveTo(x + Math.sin(a - wd) * len * 0.8, y - Math.cos(a - wd) * len * 0.8, tx, ty);
      k.quadraticCurveTo(x + Math.sin(a + wd) * len * 0.8, y - Math.cos(a + wd) * len * 0.8, x, y);
      k.closePath();
    };
    const g = p.c.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, col(LEAD));
    g.addColorStop(1, col(petal));
    fill(p, g, shape);
    line(p, GOLD, Math.max(1, s * 0.03), shape);
  };
  for (const a of [-1.15, 1.15, -0.62, 0.62]) one(a, s * 0.5, 0.42);
  for (const a of [-0.3, 0.3, 0]) one(a, s * 0.58, 0.36);
  fill(p, col(MALACHITE, 1, -4), (k) => k.ellipse(x, y + s * 0.04, s * 0.42, s * 0.08, 0, 0, TAU));
  line(p, GOLD, Math.max(1, s * 0.025), (k) => k.ellipse(x, y + s * 0.04, s * 0.42, s * 0.08, 0, 0, TAU));
}

/** The Air Nomads' mark: three winds curling out from the middle, inside a ring. (x, y) its middle, `s` its radius. */
export function airMark(p: Press, x: number, y: number, s: number, ink: string = GOLD, lw = Math.max(1, s * 0.14)) {
  line(p, ink, lw, (k) => {
    k.arc(x, y, s, 0, TAU);
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * TAU - Math.PI / 2;
      for (let j = 0; j <= 16; j++) {
        const t = j / 16;
        const a = a0 + t * 2.6;
        const r = s * (0.12 + 0.62 * t);
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (j) k.lineTo(px, py);
        else k.moveTo(px, py);
      }
    }
  });
}

/** The painter's mark in a bottom corner: the three winds in gold on a cinnabar disc. */
export function airSeal(p: Press, want: Inscribe = {}) {
  const { w, h } = p;
  const s = Math.min(w, h) * 0.04;
  const left = want.side ? want.side === 'left' : p.r() < 0.5;
  const x = left ? w * 0.05 + s : w * 0.95 - s;
  const y = h * 0.95 - s;
  fill(p, col(CINNABAR), (k) => k.arc(x, y, s, 0, TAU));
  line(p, GOLD, Math.max(1, s * 0.08), (k) => k.arc(x, y, s * 0.94, 0, TAU));
  airMark(p, x, y, s * 0.62, want.ink ?? GOLD);
}

/** Water as thangkas paint it: rows of scalloped ripples in pale lines over blue-green, from y0 down to y1. */
export function ripples(p: Press, y0: number, y1: number, water: HSL = [186, 40, 50]) {
  sky(p, y0, y1, col(water, 1, 12), col(water, 1, -12));
  const { w } = p;
  const rows = 9;
  line(p, col(LEAD, 0.55), 1, (k) => {
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows;
      const y = y0 + (y1 - y0) * t;
      const s = (y1 - y0) * (0.02 + t * 0.05);
      for (let x = (r % 2) * s - s; x < w + s * 2; x += s * 2) {
        k.moveTo(x - s, y);
        k.arc(x, y, s, Math.PI, 0);
      }
    }
  });
}

/** A gust of airbending: a spiral of `turns` out from (x, y) to radius r. */
export function swirl(p: Press, x: number, y: number, r: number, turns: number, ink: string, width: number, start = 0) {
  line(p, ink, width, (k) => {
    const n = Math.ceil(turns * 28);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = start + t * turns * TAU;
      const rr = r * (0.12 + 0.88 * t);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i) k.lineTo(px, py);
      else k.moveTo(px, py);
    }
  });
}
