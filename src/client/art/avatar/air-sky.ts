import { type HSL, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import type { Inscribe } from './ink';
import { AZURE, CINNABAR, GOLD, LEAD, MALACHITE, ORANGE, ROCK, SAFFRON, SEPIA, TEAL, cloudHeap, col, crag, curl, frieze, lotus, orb, peak, ripples, shaded, sky, swirl, templeWindow } from './thangka';

/** Creatures of the air and the open sky: sky bison, winged lemurs, kites, prayer banners, a sea of clouds. */

const FUR: HSL = [40, 34, 90];
const MARK: HSL = [26, 46, 40];
const FAR: HSL = [196, 20, 72];

/**
 * A sky bison in profile facing `dir`, its body's middle at (x, y) and `L` long: a great cream body with the
 * brown arrow down its back, a broad flat tail, short horns, and six short legs hanging, or tucked under it
 * when it lies down. `saddle` puts Appa's saddle and reins on.
 */
function bison(p: Press, x: number, y: number, L: number, dir: number, opts: { lying?: boolean; saddle?: boolean } = {}) {
  const at = (lx: number, ly: number): Pt => [x + dir * lx * L, y + ly * L];
  const lw = Math.max(1, L * 0.008);
  // Legs: the far three darker, then the near three, short and thick, hanging or folded.
  if (!opts.lying)
    for (const far of [true, false])
      for (const lx of [-0.3, 0, 0.28]) {
        const fx = lx + (far ? 0.06 : 0);
        shaded(p, far ? [40, 24, 76] : FUR, (k) => k.ellipse(...at(fx, 0.26), L * 0.07, L * 0.11, dir * 0.2, 0, TAU), L * 0.04, SEPIA, lw);
        line(p, SEPIA, lw, (k) => {
          for (let i = -1; i <= 1; i++) {
            k.moveTo(...at(fx + i * 0.025, 0.34));
            k.lineTo(...at(fx + i * 0.025, 0.37));
          }
        });
      }
  // The tail: broad and flat, a brown band across its end.
  const tail: Trace = (k) => {
    k.moveTo(...at(-0.44, -0.06));
    k.quadraticCurveTo(...at(-0.62, -0.1), ...at(-0.74, -0.2));
    k.quadraticCurveTo(...at(-0.8, -0.04), ...at(-0.74, 0.12));
    k.quadraticCurveTo(...at(-0.62, 0.06), ...at(-0.44, 0.08));
    k.closePath();
  };
  shaded(p, FUR, tail, L * 0.1, SEPIA, lw);
  within(p, tail, () => fill(p, col(MARK), (k) => k.ellipse(...at(-0.78, -0.04), L * 0.08, L * 0.2, 0, 0, TAU)));
  line(p, SEPIA, lw, tail);
  // The body: shaggy along its belly, the arrow down its back.
  const body: Trace = (k) => {
    k.moveTo(...at(-0.48, 0));
    k.bezierCurveTo(...at(-0.48, -0.3), ...at(0.3, -0.34), ...at(0.46, -0.12));
    k.quadraticCurveTo(...at(0.52, 0.06), ...at(0.4, 0.2));
    for (let i = 1; i <= 8; i++) k.quadraticCurveTo(...at(0.4 - (i - 0.5) * 0.11, i % 2 ? 0.3 : 0.24), ...at(0.4 - i * 0.11, 0.24));
    k.quadraticCurveTo(...at(-0.5, 0.14), ...at(-0.48, 0));
    k.closePath();
  };
  shaded(p, FUR, body, L * 0.16, SEPIA, lw * 1.3);
  within(p, body, () => {
    fill(p, col(MARK), (k) => {
      k.moveTo(...at(-0.5, -0.12));
      k.quadraticCurveTo(...at(0, -0.36), ...at(0.4, -0.16));
      k.lineTo(...at(0.42, -0.06));
      k.quadraticCurveTo(...at(0, -0.24), ...at(-0.5, -0.02));
      k.closePath();
    });
    line(p, col(FUR, 0.8, -22), lw, (k) => {
      for (let i = 0; i < 9; i++) {
        const [fx, fy] = at(-0.36 + i * 0.09, 0.08 + (i % 3) * 0.04);
        k.moveTo(fx, fy);
        k.quadraticCurveTo(fx + dir * L * 0.02, fy + L * 0.03, fx, fy + L * 0.06);
      }
    });
  });
  line(p, SEPIA, lw * 1.3, body);
  if (opts.saddle) {
    // Appa's saddle: a wooden rim round a red seat, strapped under him.
    shaded(p, [22, 44, 34], (k) => {
      k.moveTo(...at(-0.26, -0.24));
      k.lineTo(...at(-0.28, -0.36));
      k.lineTo(...at(0.22, -0.38));
      k.lineTo(...at(0.22, -0.26));
      k.closePath();
    }, L * 0.04, SEPIA, lw);
    fill(p, col(CINNABAR), (k) => {
      k.moveTo(...at(-0.24, -0.33));
      k.lineTo(...at(0.2, -0.35));
      k.lineTo(...at(0.2, -0.3));
      k.lineTo(...at(-0.24, -0.28));
      k.closePath();
    });
    line(p, col(SAFFRON), Math.max(1, L * 0.012), (k) => {
      k.moveTo(...at(-0.26, -0.36));
      k.lineTo(...at(0.22, -0.38));
    });
    line(p, col([22, 44, 30]), Math.max(1, L * 0.01), (k) => {
      k.moveTo(...at(-0.02, -0.26));
      k.quadraticCurveTo(...at(0.02, 0), ...at(-0.04, 0.24));
      k.moveTo(...at(0.22, -0.32));
      k.quadraticCurveTo(...at(0.4, -0.3), ...at(0.5, -0.12));
    });
  }
  // The head: a broad face lower than the back, short curved horns, a small eye and a big nose.
  const head: Trace = (k) => {
    k.moveTo(...at(0.38, -0.14));
    k.bezierCurveTo(...at(0.42, -0.3), ...at(0.68, -0.3), ...at(0.74, -0.12));
    k.quadraticCurveTo(...at(0.8, 0.02), ...at(0.72, 0.12));
    k.quadraticCurveTo(...at(0.56, 0.2), ...at(0.42, 0.12));
    k.quadraticCurveTo(...at(0.34, 0.0), ...at(0.38, -0.14));
    k.closePath();
  };
  shaded(p, FUR, head, L * 0.1, SEPIA, lw * 1.3);
  within(p, head, () =>
    fill(p, col(MARK), (k) => {
      k.moveTo(...at(0.4, -0.2));
      k.quadraticCurveTo(...at(0.56, -0.32), ...at(0.7, -0.18));
      k.lineTo(...at(0.75, -0.08));
      k.lineTo(...at(0.64, -0.17));
      k.quadraticCurveTo(...at(0.54, -0.22), ...at(0.42, -0.12));
      k.closePath();
    }),
  );
  line(p, SEPIA, lw * 1.3, head);
  for (const [hx, ink] of [
    [0.48, col([36, 30, 66])],
    [0.42, col([36, 30, 76])],
  ] as [number, string][]) {
    const horn: Trace = (k) => {
      k.moveTo(...at(hx, -0.2));
      k.quadraticCurveTo(...at(hx - 0.04, -0.34), ...at(hx - 0.14, -0.36));
      k.quadraticCurveTo(...at(hx - 0.06, -0.3), ...at(hx + 0.04, -0.2));
      k.closePath();
    };
    fill(p, ink, horn);
    line(p, SEPIA, lw, horn);
  }
  fill(p, SEPIA, (k) => {
    k.arc(...at(0.62, -0.08), L * 0.018, 0, TAU);
    k.moveTo(...at(0.77, 0.02));
    k.ellipse(...at(0.75, 0.02), L * 0.02, L * 0.012, 0, 0, TAU);
  });
  line(p, SEPIA, lw, (k) => {
    k.moveTo(...at(0.74, 0.08));
    k.quadraticCurveTo(...at(0.66, 0.12), ...at(0.58, 0.08));
  });
  if (opts.saddle)
    line(p, col([22, 44, 30]), Math.max(1, L * 0.008), (k) => {
      k.moveTo(...at(0.2, -0.36));
      k.quadraticCurveTo(...at(0.36, -0.36), ...at(0.44, -0.24));
    });
}

/** Appa flying above a sea of clouds, saddled, the sun behind. */
export function appa(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([22, 70, 64]), col([44, 74, 88]));
  const dir = p.r() < 0.5 ? 1 : -1;
  orb(p, w * (dir > 0 ? 0.24 : 0.76), h * 0.26, u * 0.12);
  const rows = 2;
  for (let r = 0; r < rows; r++) {
    const n = Math.max(2, Math.round((w / u) * (2 + r)));
    for (let i = 0; i < n; i++) cloudHeap(p, (w * (i + 0.5 + (r % 2) * 0.5)) / n, h * (0.74 + r * 0.16), u * (0.16 + r * 0.06), [30, 60, 82], i % 2 ? -1 : 1);
  }
  const L = Math.min(w * 0.5, u * 0.9);
  bison(p, w / 2, h * 0.46, L, dir, { saddle: true });
  swirl(p, w / 2 - dir * L * 0.7, h * 0.36, u * 0.06, 1.3, col(LEAD, 0.7), Math.max(1, u * 0.006));
  return { side: dir > 0 ? 'right' : 'left' };
}

/** A herd of wild sky bison on the wing over the snow peaks at dawn, near ones big, far ones small. */
export function herd(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h * 0.8, col([330, 30, 64]), col([40, 74, 86]));
  orb(p, w * 0.5, h * 0.62, u * 0.12, [24, 90, 64]);
  const n = Math.max(3, Math.round((w / u) * 2));
  for (let i = 0; i < n; i++) peak(p, (w * (i + 0.5)) / n, h + 4, (w / n) * 1.5, h * p.rr(0.3, 0.45), FAR);
  cloudHeap(p, w * 0.25, h * 0.84, u * 0.18, [330, 30, 84]);
  cloudHeap(p, w * 0.78, h * 0.9, u * 0.2, [330, 30, 84], -1);
  const dir = p.r() < 0.5 ? 1 : -1;
  // The far ones high and small, then the near ones lower and big, spaced so none hides another.
  const far = Math.max(3, Math.round((w / u) * 2.2));
  for (let i = 0; i < far; i++) bison(p, (w * (i + 0.5 + p.rr(-0.2, 0.2))) / far, h * (0.14 + p.rr(0, 0.12)), u * p.rr(0.08, 0.11), dir);
  const near = Math.max(2, Math.round((w / u) * 1.4));
  const L = Math.min(u * 0.3, (w / near) * 0.52);
  for (let i = 0; i < near; i++) bison(p, (w * (i + 0.5 + p.rr(-0.1, 0.1))) / near, h * (0.34 + (i % 2) * 0.12 + p.rr(0, 0.05)), L * p.rr(0.85, 1), dir);
}

/** Appa lying by a mountain lake at noon, his reflection under him, lotus on the water and the peaks behind. */
export function bisonLake(p: Press): Inscribe {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h * 0.5, col([30, 60, 70]), col([46, 70, 90]));
  peak(p, w * 0.25, h * 0.52, Math.max(w * 0.5, u * 0.7), h * 0.32, FAR);
  peak(p, w * 0.72, h * 0.52, Math.max(w * 0.45, u * 0.6), h * 0.38, FAR);
  // The shore he lies on, and the lake in front.
  shaded(p, [96, 34, 56], (k) => k.rect(-4, h * 0.5, w + 8, h * 0.14), h * 0.04, SEPIA, 1);
  const water = h * 0.64;
  ripples(p, water, h + 4, [186, 38, 54]);
  const dir = p.r() < 0.5 ? 1 : -1;
  const L = Math.min(w * 0.62, u * 0.95);
  const bx = w / 2;
  const by = h * 0.6 - L * 0.22;
  // His reflection, faint and flipped, broken by ripples.
  c.save();
  c.globalAlpha = 0.25;
  c.translate(0, water * 2 + L * 0.08);
  c.scale(1, -1);
  bison(p, bx, by, L, dir, { lying: true });
  c.restore();
  line(p, col(LEAD, 0.45), Math.max(1, u * 0.005), (k) => {
    for (let i = 0; i < 14; i++) {
      const ry = water + (h - water) * ((i + 0.5) / 14);
      const rx = bx + p.rr(-0.3, 0.3) * L;
      k.moveTo(rx - L * 0.12, ry);
      k.lineTo(rx + L * 0.12, ry);
    }
  });
  bison(p, bx, by, L, dir, { lying: true });
  for (let i = 0; i < 3; i++) lotus(p, w * p.rr(0.1, 0.9), h * p.rr(0.82, 0.96), u * p.rr(0.07, 0.1));
  return { side: dir > 0 ? 'left' : 'right' };
}

/** A winged lemur, `s` tall from its feet at (x, y) to its ear tips: sitting, or gliding with its wings spread. */
function lemur(p: Press, x: number, y: number, s: number, glide = false, peach = false) {
  const lw = Math.max(1, s * 0.012);
  const GREY: HSL = [30, 10, 86];
  const hy = y - s * 0.62;
  if (glide) {
    // Wings: a membrane from wrist to ankle on each side.
    for (const m of [-1, 1])
      shaded(p, [26, 16, 56], (k) => {
        k.moveTo(x + m * s * 0.08, y - s * 0.48);
        k.quadraticCurveTo(x + m * s * 0.5, y - s * 0.7, x + m * s * 0.62, y - s * 0.42);
        for (let i = 1; i <= 3; i++) k.quadraticCurveTo(x + m * s * (0.62 - (i - 0.5) * 0.16), y - s * 0.3, x + m * s * (0.62 - i * 0.16), y - s * 0.22);
        k.lineTo(x + m * s * 0.08, y - s * 0.22);
        k.closePath();
      }, s * 0.08, SEPIA, lw);
  }
  // Tail curling up behind.
  line(p, SEPIA, s * 0.1 + 2, (k) => {
    k.moveTo(x + s * 0.1, y - s * 0.08);
    k.bezierCurveTo(x + s * 0.5, y - s * 0.05, x + s * 0.5, y - s * 0.5, x + s * 0.3, y - s * 0.6);
  });
  line(p, col(GREY), s * 0.1, (k) => {
    k.moveTo(x + s * 0.1, y - s * 0.08);
    k.bezierCurveTo(x + s * 0.5, y - s * 0.05, x + s * 0.5, y - s * 0.5, x + s * 0.3, y - s * 0.6);
  });
  line(p, col(MARK), s * 0.1, (k) => {
    for (const t of [0.3, 0.55, 0.8]) {
      const bx = (1 - t) ** 3 * (x + s * 0.1) + 3 * (1 - t) ** 2 * t * (x + s * 0.5) + 3 * (1 - t) * t * t * (x + s * 0.5) + t ** 3 * (x + s * 0.3);
      const by = (1 - t) ** 3 * (y - s * 0.08) + 3 * (1 - t) ** 2 * t * (y - s * 0.05) + 3 * (1 - t) * t * t * (y - s * 0.5) + t ** 3 * (y - s * 0.6);
      k.moveTo(bx - s * 0.02, by);
      k.lineTo(bx + s * 0.02, by);
    }
  });
  // The body, sitting up.
  shaded(p, GREY, (k) => {
    k.moveTo(x - s * 0.12, y);
    k.quadraticCurveTo(x - s * 0.2, y - s * 0.3, x - s * 0.1, y - s * 0.52);
    k.lineTo(x + s * 0.1, y - s * 0.52);
    k.quadraticCurveTo(x + s * 0.2, y - s * 0.3, x + s * 0.12, y);
    k.closePath();
  }, s * 0.1, SEPIA, lw);
  fill(p, col(FUR, 1, 4), (k) => k.ellipse(x, y - s * 0.26, s * 0.08, s * 0.16, 0, 0, TAU));
  // Ears, big and pointed, then the head with its great green eyes.
  for (const m of [-1, 1]) {
    const ear: Trace = (k) => {
      k.moveTo(x + m * s * 0.06, hy - s * 0.06);
      k.quadraticCurveTo(x + m * s * 0.3, hy - s * 0.22, x + m * s * 0.36, hy - s * 0.38);
      k.quadraticCurveTo(x + m * s * 0.2, hy - s * 0.04, x + m * s * 0.12, hy + s * 0.04);
      k.closePath();
    };
    shaded(p, GREY, ear, s * 0.06, SEPIA, lw);
    fill(p, col([350, 50, 80]), (k) => {
      k.moveTo(x + m * s * 0.1, hy - s * 0.06);
      k.quadraticCurveTo(x + m * s * 0.28, hy - s * 0.2, x + m * s * 0.32, hy - s * 0.32);
      k.quadraticCurveTo(x + m * s * 0.2, hy - s * 0.06, x + m * s * 0.13, hy);
      k.closePath();
    });
  }
  shaded(p, GREY, (k) => k.ellipse(x, hy, s * 0.15, s * 0.12, 0, 0, TAU), s * 0.06, SEPIA, lw);
  for (const m of [-1, 1]) {
    fill(p, col([96, 60, 46]), (k) => k.arc(x + m * s * 0.065, hy - s * 0.01, s * 0.05, 0, TAU));
    fill(p, SEPIA, (k) => k.arc(x + m * s * 0.065, hy - s * 0.005, s * 0.026, 0, TAU));
    fill(p, col(LEAD), (k) => k.arc(x + m * s * 0.075, hy - s * 0.025, s * 0.012, 0, TAU));
  }
  fill(p, SEPIA, (k) => k.ellipse(x, hy + s * 0.05, s * 0.018, s * 0.012, 0, 0, TAU));
  // Arms, holding a peach if it has one.
  if (peach) {
    const py = y - s * 0.36;
    shaded(p, [18, 80, 66], (k) => k.arc(x, py, s * 0.1, 0, TAU), s * 0.05, SEPIA, lw);
    fill(p, col([350, 70, 70], 0.6), (k) => k.arc(x + s * 0.03, py - s * 0.02, s * 0.06, 0, TAU));
    fill(p, col(MALACHITE), (k) => k.ellipse(x + s * 0.05, py - s * 0.11, s * 0.05, s * 0.02, -0.5, 0, TAU));
  }
  line(p, SEPIA, s * 0.05 + 1.5, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * s * 0.12, y - s * 0.48);
      k.quadraticCurveTo(x + m * s * 0.16, y - s * 0.38, x + m * s * (peach ? 0.08 : 0.1), y - s * 0.34);
    }
  });
  line(p, col(GREY), s * 0.05, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * s * 0.12, y - s * 0.48);
      k.quadraticCurveTo(x + m * s * 0.16, y - s * 0.38, x + m * s * (peach ? 0.08 : 0.1), y - s * 0.34);
    }
  });
}

/** A temple wall's coping with its teal tiles over the red frieze, from x0 to x1 with its top at y. */
export function wallTop(p: Press, x0: number, x1: number, y: number, th: number) {
  shaded(p, LEAD, (k) => k.rect(x0, y, x1 - x0, p.h - y + 4), th * 0.6, SEPIA, 1);
  frieze(p, x0, x1, y + th * 0.3, th * 0.6);
  shaded(p, TEAL, (k) => {
    k.moveTo(x0 - th * 0.3, y + th * 0.3);
    k.lineTo(x0 + th * 0.2, y - th * 0.4);
    k.lineTo(x1 - th * 0.2, y - th * 0.4);
    k.lineTo(x1 + th * 0.3, y + th * 0.3);
    k.closePath();
  }, th * 0.4, SEPIA, 1);
  line(p, GOLD, Math.max(1, th * 0.08), (k) => {
    k.moveTo(x0 - th * 0.3, y + th * 0.3);
    k.lineTo(x1 + th * 0.3, y + th * 0.3);
  });
}

/** Momo on the temple wall with a peach in his hands, the sky and the peaks behind. */
export function momo(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([26, 66, 66]), col([46, 70, 90]));
  peak(p, w * 0.2, h * 0.7, Math.max(w * 0.5, u * 0.7), h * 0.36, FAR);
  peak(p, w * 0.82, h * 0.7, Math.max(w * 0.45, u * 0.6), h * 0.3, FAR);
  cloudHeap(p, w * 0.5, h * 0.66, u * 0.2, [30, 60, 82]);
  const top = h * 0.78;
  wallTop(p, -u * 0.1, w + u * 0.1, top, u * 0.08);
  const s = Math.min(h * 0.62, w * 0.8);
  lemur(p, w / 2, top - u * 0.02, s, false, true);
}

/** Winged lemurs on the temple roofs at sunset, some sitting on the ridge and some gliding out over the edge. */
export function lemurs(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([10, 60, 60]), col([40, 80, 80]));
  orb(p, w * 0.5, h * 0.62, u * 0.14, [16, 90, 60]);
  // Roofs, one after another, the ridges sweeping up at their ends.
  const n = Math.max(2, Math.round((w / u) * 1.3));
  const ridges: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const rx = (w * (i + 0.5)) / n;
    const rw = (w / n) * 1.04;
    const ry = h * (0.58 + (i % 2) * 0.08);
    shaded(p, TEAL, (k) => {
      k.moveTo(rx - rw / 2, ry - u * 0.06);
      k.quadraticCurveTo(rx - rw * 0.4, ry, rx - rw * 0.3, ry);
      k.lineTo(rx + rw * 0.3, ry);
      k.quadraticCurveTo(rx + rw * 0.4, ry, rx + rw / 2, ry - u * 0.06);
      k.lineTo(rx + rw * 0.56, ry + u * 0.2);
      k.lineTo(rx - rw * 0.56, ry + u * 0.2);
      k.closePath();
    }, u * 0.08, SEPIA, 1);
    line(p, col(TEAL, 0.6, -14), Math.max(1, u * 0.005), (k) => {
      for (let j = 1; j < 10; j++) {
        const tx = rx - rw * 0.5 + (rw * j) / 10;
        k.moveTo(tx, ry + u * 0.01);
        k.lineTo(tx + (tx - rx) * 0.08, ry + u * 0.2);
      }
    });
    shaded(p, LEAD, (k) => k.rect(rx - rw * 0.46, ry + u * 0.2, rw * 0.92, h), u * 0.06, SEPIA, 1);
    frieze(p, rx - rw * 0.46, rx + rw * 0.46, ry + u * 0.2, u * 0.04);
    const panes = Math.max(1, Math.round((rw / u) * 1.4));
    for (let j = 0; j < panes; j++) templeWindow(p, rx - rw * 0.46 + (rw * 0.92 * (j + 0.5)) / panes, ry + u * 0.3, u * 0.08);
    ridges.push([rx, ry, rw]);
  }
  // The lemurs: most sitting along the ridges, two gliding off.
  const s = u * 0.22;
  for (const [rx, ry, rw] of ridges) {
    const k = Math.max(1, Math.round((rw / u) * 1.6));
    for (let i = 0; i < k; i++) lemur(p, rx - rw * 0.3 + ((rw * 0.6) * (i + 0.5)) / k + p.rr(-0.04, 0.04) * rw, ry + 1, s * p.rr(0.8, 1));
  }
  lemur(p, w * 0.3, h * 0.36, s * 1.1, true);
  if (w > u * 1.3) lemur(p, w * 0.74, h * 0.26, s * 0.9, true);
}

/** Peaks rising out of a sea of clouds at sunrise, the sun's rays fanning over them in gold. */
export function cloudSea(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([12, 60, 66]), col([44, 80, 86]));
  const sx = w * p.rr(0.35, 0.65);
  const sy = h * 0.5;
  line(p, col([44, 90, 70], 0.5), Math.max(1.5, u * 0.008), (k) => {
    for (let i = 0; i < 18; i++) {
      const a = Math.PI + (i / 17) * Math.PI;
      k.moveTo(sx + Math.cos(a) * u * 0.18, sy + Math.sin(a) * u * 0.18);
      k.lineTo(sx + Math.cos(a) * u * 1.4, sy + Math.sin(a) * u * 1.4);
    }
  });
  orb(p, sx, sy, u * 0.14, [30, 92, 62]);
  // The peaks, far and pale first, then the nearer crags.
  const n = Math.max(3, Math.round((w / u) * 2));
  for (let i = 0; i < n; i++) peak(p, (w * (i + 0.5)) / n + p.rr(-0.05, 0.05) * w, h * 0.62, (w / n) * 1.2, h * p.rr(0.25, 0.42), FAR);
  for (let i = 0; i < 2; i++) {
    const cx = w * (i ? 0.84 : 0.14);
    crag(p, cx, h * p.rr(0.28, 0.4), u * 0.36, h * 0.9, 0.35);
  }
  // The sea of clouds in rows, the nearest biggest.
  for (let r = 0; r < 3; r++) {
    const m = Math.max(2, Math.round((w / u) * (3 - r)));
    for (let i = 0; i < m; i++) cloudHeap(p, (w * (i + 0.5 + (r % 2) * 0.4)) / m, h * (0.66 + r * 0.13), u * (0.13 + r * 0.06), [20, 60, 84], i % 2 ? -1 : 1);
  }
}

/** A kite: a diamond of bright cloth with a gold edge and a tail of bows, flying at (x, y), `s` tall, tilted by `a`. */
function kite(p: Press, x: number, y: number, s: number, a: number, ink: HSL, tail: Pt[]) {
  line(p, SEPIA, 1, (k) => {
    k.moveTo(x, y + s * 0.6);
    for (const pt of tail) k.lineTo(...pt);
  });
  fill(p, col(CINNABAR), (k) => {
    tail.forEach(([tx, ty], i) => {
      if (i % 2) return;
      k.moveTo(tx - s * 0.08, ty - s * 0.04);
      k.lineTo(tx + s * 0.08, ty + s * 0.04);
      k.lineTo(tx + s * 0.08, ty - s * 0.04);
      k.lineTo(tx - s * 0.08, ty + s * 0.04);
      k.closePath();
    });
  });
  const c = p.c;
  c.save();
  c.translate(x, y);
  c.rotate(a);
  const cloth: Trace = (k) => {
    k.moveTo(0, -s * 0.55);
    k.lineTo(s * 0.36, -s * 0.1);
    k.lineTo(0, s * 0.6);
    k.lineTo(-s * 0.36, -s * 0.1);
    k.closePath();
  };
  shaded(p, ink, cloth, s * 0.2, SEPIA, 1);
  line(p, GOLD, Math.max(1, s * 0.03), (k) => {
    k.moveTo(0, -s * 0.55);
    k.lineTo(0, s * 0.6);
    k.moveTo(-s * 0.36, -s * 0.1);
    k.lineTo(s * 0.36, -s * 0.1);
  });
  c.restore();
}

/** Kites flying high over a temple terrace on a spring day, their strings tied to a post on its wall. */
export function kites(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([200, 40, 76]), col([44, 70, 88]));
  cloudHeap(p, w * 0.24, h * 0.6, u * 0.2, [30, 60, 84]);
  cloudHeap(p, w * 0.8, h * 0.34, u * 0.16, [30, 60, 84], -1);
  // The terrace wall at the foot of the painting, and the post on it where the strings are tied.
  const ry = h * 0.86;
  const th = u * 0.07;
  const post = ry - th * 0.4;
  const anchor: Pt = [w * 0.5, post - u * 0.12];
  const n = 3 + Math.round(Math.max(w, h) / u - 1);
  const inks: HSL[] = [SAFFRON, CINNABAR, AZURE, MALACHITE, ORANGE];
  for (let i = 0; i < n; i++) {
    const kx = w * (0.18 + (0.64 * i) / Math.max(1, n - 1)) + p.rr(-0.06, 0.06) * w;
    const ky = h * (0.1 + p.rr(0, 0.42));
    const ks = u * p.rr(0.12, 0.18);
    line(p, col([16, 30, 30], 0.7), 1, (k) => {
      k.moveTo(kx, ky + ks * 0.6);
      k.quadraticCurveTo((kx + anchor[0]) / 2 + u * 0.1, (ky + anchor[1]) / 2 + u * 0.1, ...anchor);
    });
    const tail: Pt[] = [];
    for (let j = 1; j <= 6; j++) tail.push([kx + Math.sin(j * 1.1 + i) * u * 0.03, ky + ks * 0.6 + j * ks * 0.28]);
    kite(p, kx, ky, ks, p.rr(-0.3, 0.3), inks[i % inks.length], tail);
  }
  wallTop(p, -u * 0.1, w + u * 0.1, ry, th);
  const pw = u * 0.022;
  shaded(p, [26, 44, 36], (k) => k.rect(anchor[0] - pw / 2, anchor[1], pw, post - anchor[1]), pw * 0.4, SEPIA, 1);
  fill(p, GOLD, (k) => k.arc(anchor[0], anchor[1], pw * 0.7, 0, TAU));
  line(p, SEPIA, 1, (k) => k.arc(anchor[0], anchor[1], pw * 0.7, 0, TAU));
  // The spare string wound round the post's foot.
  line(p, col([16, 30, 30], 0.8), Math.max(1, u * 0.004), (k) => {
    for (let i = 0; i < 4; i++) {
      const y = post - u * (0.012 + i * 0.008);
      k.moveTo(anchor[0] - pw / 2, y);
      k.lineTo(anchor[0] + pw / 2, y - u * 0.004);
    }
  });
}

/** Prayer banners strung across a mountain pass, five colours fluttering over a cairn, the snow peaks beyond. */
export function banners(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h * 0.7, col([206, 34, 70]), col([44, 70, 88]));
  peak(p, w * 0.3, h * 0.6, Math.max(w * 0.4, u * 0.7), h * 0.4, FAR);
  peak(p, w * 0.7, h * 0.62, Math.max(w * 0.4, u * 0.7), h * 0.46, FAR);
  // The pass: slopes up to either side, the saddle low in the middle.
  shaded(p, [80, 24, 56], (k) => {
    k.moveTo(-4, h * 0.46);
    k.quadraticCurveTo(w * 0.3, h * 0.62, w * 0.5, h * 0.7);
    k.quadraticCurveTo(w * 0.7, h * 0.62, w + 4, h * 0.42);
    k.lineTo(w + 4, h + 4);
    k.lineTo(-4, h + 4);
    k.closePath();
  }, u * 0.12, SEPIA, 1.2);
  // The cairn of stones in the saddle.
  for (let i = 0; i < 6; i++) {
    const sw = u * (0.09 - i * 0.012);
    shaded(p, [30, 10, 64], (k) => k.ellipse(w * 0.5, h * 0.72 - i * u * 0.035, sw, u * 0.022, 0, 0, TAU), sw * 0.3, SEPIA, 1);
  }
  // Poles on the slopes, and strings of flags sagging between them.
  const poles: Pt[] = [
    [w * 0.08, h * 0.5],
    [w * 0.5, h * 0.58],
    [w * 0.92, h * 0.46],
  ];
  line(p, SEPIA, Math.max(1.5, u * 0.01), (k) => {
    for (const [px, py] of poles) {
      k.moveTo(px, py + h * 0.06);
      k.lineTo(px, py - h * 0.34);
    }
  });
  const colours: HSL[] = [AZURE, LEAD, CINNABAR, MALACHITE, SAFFRON];
  for (let s = 0; s < 3; s++)
    for (let i = 1; i < poles.length; i++) {
      const [ax, ay] = poles[i - 1];
      const [bx, by] = poles[i];
      const a: Pt = [ax, ay - h * (0.32 - s * 0.08)];
      const b: Pt = [bx, by - h * (0.32 - s * 0.08)];
      const sag = h * 0.1;
      line(p, SEPIA, 1, (k) => {
        k.moveTo(...a);
        k.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2, ...b);
      });
      const n = Math.max(6, Math.round(((bx - ax) / u) * 12));
      for (let j = 1; j < n; j++) {
        const t = j / n;
        const fx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ((a[0] + b[0]) / 2) + t * t * b[0];
        const fy = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ((a[1] + b[1]) / 2 + sag * 2) + t * t * b[1];
        const fs = u * 0.05;
        const flutter = Math.sin(j * 1.7 + s) * fs * 0.25;
        shaded(p, colours[(j + s) % 5], (k) => {
          k.moveTo(fx - fs * 0.4, fy);
          k.lineTo(fx + fs * 0.4, fy);
          k.lineTo(fx + fs * 0.4 + flutter, fy + fs);
          k.lineTo(fx - fs * 0.4 + flutter, fy + fs);
          k.closePath();
        }, fs * 0.2, SEPIA, 1);
      }
    }
  for (const m of [-1, 1]) swirl(p, w * 0.5 + m * w * 0.24, h * 0.18, u * 0.06, 1.3, col(LEAD, 0.7), Math.max(1, u * 0.006), m > 0 ? 0 : Math.PI);
}

/** The meditation ledge: a shelf of rock out over the valley, a cushion at its end and incense burning, peaks and clouds below. */
export function ledge(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([20, 66, 66]), col([46, 74, 90]));
  const left = p.r() < 0.5;
  orb(p, w * (left ? 0.74 : 0.26), h * 0.3, u * 0.1);
  const n = Math.max(3, Math.round((w / u) * 2.2));
  for (let i = 0; i < n; i++) peak(p, (w * (i + 0.5)) / n, h * 0.82, (w / n) * 1.4, h * p.rr(0.2, 0.36), FAR);
  for (let i = 0; i < n; i++) cloudHeap(p, (w * (i + 0.5)) / n, h * 0.84, u * 0.16, [30, 60, 84], i % 2 ? -1 : 1);
  // The ledge, reaching out from one side.
  const d = left ? 1 : -1;
  const ex = left ? 0 : w;
  const tip = ex + d * Math.min(w * 0.62, u * 0.9);
  const top = h * 0.6;
  // Its underside steps back to the cliff in ledges of rock, each a little further in and further down.
  const steps = 5;
  const sx0 = tip - d * u * 0.04;
  const sy0 = top + h * 0.05;
  const sx1 = ex + d * Math.min(w * 0.12, u * 0.16);
  const under: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    under.push([sx0 + (sx1 - sx0) * t ** 0.6 + (i && i < steps ? p.rr(-1, 1) * u * 0.015 : 0), sy0 + (h + 4 - sy0) * t ** 1.5]);
  }
  const shelf: Trace = (k) => {
    k.moveTo(ex - d * 4, top - h * 0.04);
    k.lineTo(tip, top);
    k.lineTo(...under[0]);
    for (let i = 1; i <= steps; i++) {
      const [ax, ay] = under[i - 1];
      const [bx, by] = under[i];
      k.lineTo(ax + (bx - ax) * 0.8, ay + (by - ay) * 0.2);
      k.lineTo(bx, by);
    }
    k.lineTo(ex - d * 4, h + 4);
    k.closePath();
  };
  shaded(p, ROCK, shelf, u * 0.12, SEPIA, 1.2, [top, top + h * 0.3]);
  within(p, shelf, () => {
    // The beds of rock running back into the cliff from each step, and the lit lip along the top.
    line(p, col(ROCK, 0.55, -18), Math.max(1, u * 0.005), (k) => {
      for (let i = 1; i < steps; i++) {
        const [bx, by] = under[i];
        k.moveTo(bx, by);
        k.quadraticCurveTo((bx + ex) / 2, by - h * 0.02, ex - d * 4, by - h * 0.03);
      }
    });
    line(p, col(ROCK, 0.6, 18), Math.max(1.5, u * 0.012), (k) => {
      k.moveTo(ex - d * 4, top - h * 0.04 + u * 0.008);
      k.lineTo(tip - d * u * 0.01, top + u * 0.008);
    });
  });
  line(p, SEPIA, 1.2, shelf);
  // The cushion near its end, and incense smoke curling up beside it.
  const cx = tip - d * u * 0.14;
  shaded(p, ORANGE, (k) => k.ellipse(cx, top - u * 0.02, u * 0.09, u * 0.035, 0, 0, TAU), u * 0.03, SEPIA, 1);
  line(p, GOLD, Math.max(1, u * 0.006), (k) => k.ellipse(cx, top - u * 0.025, u * 0.06, u * 0.02, 0, 0, TAU));
  const ix = cx - d * u * 0.16;
  shaded(p, [36, 50, 46], (k) => k.rect(ix - u * 0.02, top - u * 0.05, u * 0.04, u * 0.04), u * 0.01, SEPIA, 1);
  line(p, col(LEAD, 0.75), Math.max(1, u * 0.005), (k) => {
    k.moveTo(ix, top - u * 0.05);
    k.bezierCurveTo(ix + u * 0.04, top - u * 0.12, ix - u * 0.04, top - u * 0.18, ix + u * 0.02, top - u * 0.26);
  });
  curl(p, ix + u * 0.02, top - u * 0.28, u * 0.025, col(LEAD, 0.75), Math.max(1, u * 0.005));
  return { side: left ? 'right' : 'left' };
}
