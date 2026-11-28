import { type HSL, type Pt } from '../common';
import { type Trace, type Press, fill, line, within } from './print';
import type { Inscribe } from './ink';
import { GOLD, ORANGE, SAFFRON, SEPIA, TEAL, cloudHeap, col, halo, peak, shaded, sky, tower } from './thangka';

/** Air Nomad portraits as thangkas: Aang seated in meditation on a lotus inside his haloes, and Monk Gyatso smiling. */

const FAR: HSL = [196, 20, 72];
const TATTOO = col([206, 64, 46]);
const BEAD: HSL = [24, 50, 34];
const GREY: HSL = [40, 8, 88];

/** A lotus throne `wd` wide with its top at (x, y): petals standing up behind a gold band, and petals turned down under it. */
function lotusSeat(p: Press, x: number, y: number, wd: number) {
  const n = 9;
  const ph = wd * 0.1;
  const pw = wd / n;
  const lw = Math.max(1, wd * 0.004);
  const row = (up: boolean): Trace => (k) => {
    for (let i = 0; i < n; i++) {
      const px = x - wd / 2 + pw * (i + 0.5);
      const hh = up ? ph * (0.8 + 0.4 * Math.sin(((i + 0.5) / n) * Math.PI)) : ph;
      const d = up ? -1 : 1;
      k.moveTo(px - pw * 0.55, y);
      k.quadraticCurveTo(px - pw * 0.5, y + d * hh * 0.9, px, y + d * hh);
      k.quadraticCurveTo(px + pw * 0.5, y + d * hh * 0.9, px + pw * 0.55, y);
      k.closePath();
    }
  };
  shaded(p, [350, 50, 72], row(false), ph * 0.3, GOLD, lw);
  shaded(p, [350, 56, 70], row(true), ph * 0.3, GOLD, lw);
  shaded(p, [44, 70, 56], (k) => k.rect(x - wd / 2, y - ph * 0.12, wd, ph * 0.24), ph * 0.1, SEPIA, lw);
}

/** The Air Nomads' arrow on a bald head, running down over the crown to a point on the forehead. */
function arrow(p: Press, head: Trace, x: number, top: number, tip: number, wd: number) {
  within(p, head, () =>
    fill(p, TATTOO, (k) => {
      const neck = tip - wd * 1.1;
      k.rect(x - wd * 0.32, top - wd, wd * 0.64, neck - top + wd + 1);
      k.moveTo(x - wd, neck);
      k.lineTo(x + wd, neck);
      k.lineTo(x, tip);
      k.closePath();
    }),
  );
}

/**
 * Avatar Aang as a thangka's central figure: seated in meditation on a lotus throne inside his body's halo and
 * his head's, his arrow down over his crown, in a yellow shirt with the orange of the Air Nomads over it.
 */
export function aang(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([24, 66, 66]), col([46, 72, 90]));
  const S = Math.min(h * 0.72, w * 0.95);
  const x = w / 2;
  const base = h / 2 + S * 0.46;
  // Peaks and clouds under the throne, and temple towers either side of a wide painting.
  const n = Math.max(2, Math.round((w / u) * 1.6));
  for (let i = 0; i < n; i++) peak(p, (w * (i + 0.5)) / n, h * 0.86, (w / n) * 1.4, h * p.rr(0.2, 0.32), FAR);
  if (w > S * 1.7) for (const m of [-1, 1]) tower(p, x + m * (S * 0.5 + (w / 2 - S * 0.5) * 0.5), h * 0.82, u * 0.09, u * 0.4, TEAL);
  for (const m of [-1, 1]) cloudHeap(p, x + m * S * 0.56, h * 0.9, u * 0.18, [30, 60, 82], m);
  halo(p, x, base - S * 0.42, S * 0.5, [190, 40, 52]);
  halo(p, x, base - S * 0.82, S * 0.2, [140, 40, 54]);
  lotusSeat(p, x, base, S * 0.95);
  const lw = Math.max(1, S * 0.004);
  // Legs crossed under him in orange.
  const legs: Trace = (k) => {
    k.moveTo(x - S * 0.44, base - S * 0.02);
    k.quadraticCurveTo(x - S * 0.46, base - S * 0.16, x - S * 0.3, base - S * 0.2);
    k.quadraticCurveTo(x, base - S * 0.26, x + S * 0.3, base - S * 0.2);
    k.quadraticCurveTo(x + S * 0.46, base - S * 0.16, x + S * 0.44, base - S * 0.02);
    k.quadraticCurveTo(x, base + S * 0.03, x - S * 0.44, base - S * 0.02);
    k.closePath();
  };
  shaded(p, ORANGE, legs, S * 0.05, SEPIA, lw);
  line(p, col(ORANGE, 0.8, -16), lw, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.36, base - S * 0.12);
      k.quadraticCurveTo(x + m * S * 0.2, base - S * 0.1, x + m * S * 0.06, base - S * 0.14);
      k.moveTo(x + m * S * 0.3, base - S * 0.04);
      k.quadraticCurveTo(x + m * S * 0.16, base - S * 0.03, x + m * S * 0.04, base - S * 0.06);
    }
  });
  // His yellow shirt, and the orange mantle over his shoulders, open down the front and edged in gold.
  const torso: Trace = (k) => {
    k.moveTo(x - S * 0.2, base - S * 0.18);
    k.lineTo(x - S * 0.22, base - S * 0.48);
    k.quadraticCurveTo(x - S * 0.22, base - S * 0.6, x - S * 0.1, base - S * 0.62);
    k.lineTo(x + S * 0.1, base - S * 0.62);
    k.quadraticCurveTo(x + S * 0.22, base - S * 0.6, x + S * 0.22, base - S * 0.48);
    k.lineTo(x + S * 0.2, base - S * 0.18);
    k.closePath();
  };
  shaded(p, SAFFRON, torso, S * 0.05, SEPIA, lw);
  const mantle: Trace = (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.06, base - S * 0.63);
      k.quadraticCurveTo(x + m * S * 0.25, base - S * 0.63, x + m * S * 0.28, base - S * 0.52);
      k.lineTo(x + m * S * 0.31, base - S * 0.34);
      k.lineTo(x + m * S * 0.17, base - S * 0.3);
      k.quadraticCurveTo(x + m * S * 0.08, base - S * 0.44, x + m * S * 0.06, base - S * 0.63);
      k.closePath();
    }
  };
  shaded(p, ORANGE, mantle, S * 0.04, SEPIA, lw);
  line(p, GOLD, Math.max(1, S * 0.008), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.06, base - S * 0.63);
      k.quadraticCurveTo(x + m * S * 0.08, base - S * 0.44, x + m * S * 0.17, base - S * 0.3);
    }
  });
  // Forearms down to his hands, laid one in the other in his lap.
  const arms: Trace = (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.27, base - S * 0.36);
      k.quadraticCurveTo(x + m * S * 0.26, base - S * 0.24, x + m * S * 0.08, base - S * 0.22);
    }
  };
  line(p, SEPIA, S * 0.09 + 2, arms);
  line(p, col(SAFFRON), S * 0.09, arms);
  shaded(p, [28, 52, 76], (k) => k.ellipse(x, base - S * 0.22, S * 0.08, S * 0.04, 0, 0, Math.PI * 2), S * 0.02, SEPIA, lw);
  line(p, SEPIA, lw, (k) => {
    k.moveTo(x - S * 0.05, base - S * 0.23);
    k.quadraticCurveTo(x, base - S * 0.25, x + S * 0.05, base - S * 0.23);
  });
  // Neck, ears and head, the arrow, and his face at peace with his eyes closed.
  shaded(p, [28, 52, 72], (k) => k.rect(x - S * 0.045, base - S * 0.7, S * 0.09, S * 0.09), S * 0.02, SEPIA, lw);
  for (const m of [-1, 1]) shaded(p, [28, 52, 74], (k) => k.ellipse(x + m * S * 0.118, base - S * 0.79, S * 0.028, S * 0.042, 0, 0, Math.PI * 2), S * 0.012, SEPIA, lw);
  const hy = base - S * 0.8;
  const head: Trace = (k) => k.ellipse(x, hy, S * 0.12, S * 0.14, 0, 0, Math.PI * 2);
  shaded(p, [28, 52, 78], head, S * 0.03, SEPIA, lw);
  arrow(p, head, x, hy - S * 0.15, hy - S * 0.03, S * 0.045);
  fill(p, col([6, 60, 70], 0.25), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.07 + S * 0.025, hy + S * 0.035);
      k.arc(x + m * S * 0.07, hy + S * 0.035, S * 0.025, 0, Math.PI * 2);
    }
  });
  line(p, SEPIA, Math.max(1, S * 0.006), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.075, hy + S * 0.005);
      k.quadraticCurveTo(x + m * S * 0.048, hy + S * 0.022, x + m * S * 0.02, hy + S * 0.005);
    }
    k.moveTo(x - S * 0.028, hy + S * 0.075);
    k.quadraticCurveTo(x, hy + S * 0.092, x + S * 0.028, hy + S * 0.075);
  });
  line(p, col([24, 40, 44]), Math.max(1, S * 0.005), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * S * 0.085, hy - S * 0.03);
      k.quadraticCurveTo(x + m * S * 0.05, hy - S * 0.045, x + m * S * 0.02, hy - S * 0.03);
    }
    k.moveTo(x, hy + S * 0.02);
    k.quadraticCurveTo(x + S * 0.012, hy + S * 0.045, x - S * 0.005, hy + S * 0.05);
  });
  return {};
}

/**
 * Monk Gyatso, Aang's teacher, as a bust inside his halo: tall and thin, his arrow down over his crown, grey
 * brows and a long grey beard, smiling, with his big wooden beads over his saffron and orange.
 */
export function gyatso(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  const wide = w > h * 1.3;
  const left = p.r() < 0.5;
  const x = wide ? w * (left ? 0.36 : 0.64) : w / 2;
  const r = Math.min(h * 0.15, w * 0.2);
  const hy = h * 0.4;
  const lw = Math.max(1, r * 0.025);
  sky(p, 0, h, col([24, 66, 64]), col([44, 72, 88]));
  // His temple on its peak far off beside a wide painting, clouds under it.
  if (wide) {
    const tx = w * (left ? 0.8 : 0.2);
    peak(p, tx, h * 0.92, u * 0.7, h * 0.46, FAR, false);
    for (const [dx, th] of [
      [-0.06, 0.16],
      [0.06, 0.18],
      [0, 0.26],
    ])
      tower(p, tx + dx * u, h * 0.47, u * 0.05, u * th);
    cloudHeap(p, tx, h * 0.86, u * 0.2, [30, 60, 82]);
  }
  halo(p, x, hy - r * 0.1, r * 1.75, [150, 40, 56]);
  // His shoulders in saffron, the orange mantle over them open down the front, edged in gold.
  const sw = r * 2.1;
  const body: Trace = (k) => {
    k.moveTo(x - r * 0.45, hy + r * 1.05);
    k.quadraticCurveTo(x - sw * 0.75, hy + r * 1.2, x - sw, hy + r * 1.9);
    k.lineTo(x - sw * 1.1, h + 4);
    k.lineTo(x + sw * 1.1, h + 4);
    k.lineTo(x + sw, hy + r * 1.9);
    k.quadraticCurveTo(x + sw * 0.75, hy + r * 1.2, x + r * 0.45, hy + r * 1.05);
    k.closePath();
  };
  shaded(p, SAFFRON, body, r * 0.3, SEPIA, lw);
  const edge = (m: number) => (k: CanvasRenderingContext2D) => {
    k.moveTo(x + m * r * 0.34, hy + r * 1.05);
    k.quadraticCurveTo(x + m * r * 0.4, hy + r * 2.2, x + m * r * 0.12, h + 4);
  };
  within(p, body, () => {
    shaded(p, ORANGE, (k) => {
      for (const m of [-1, 1]) {
        edge(m)(k);
        k.lineTo(x + m * sw * 1.3, h + 4);
        k.lineTo(x + m * sw * 1.3, hy + r * 0.9);
        k.closePath();
      }
    }, r * 0.24, SEPIA, lw);
    for (const m of [-1, 1]) line(p, GOLD, Math.max(1.5, r * 0.07), edge(m));
  });
  line(p, SEPIA, lw, body);
  // Neck, ears with their long lobes, and the long head.
  const skin: HSL = [26, 44, 72];
  shaded(p, skin, (k) => k.rect(x - r * 0.3, hy + r * 0.6, r * 0.6, r * 0.5), r * 0.1, SEPIA, lw);
  for (const m of [-1, 1]) shaded(p, skin, (k) => k.ellipse(x + m * r * 0.78, hy + r * 0.08, r * 0.17, r * 0.32, m * 0.12, 0, Math.PI * 2), r * 0.06, SEPIA, lw);
  const head: Trace = (k) => k.ellipse(x, hy, r * 0.76, r * 0.98, 0, 0, Math.PI * 2);
  shaded(p, skin, head, r * 0.14, SEPIA, lw);
  arrow(p, head, x, hy - r * 1.0, hy - r * 0.38, r * 0.2);
  const ink = col([20, 40, 30]);
  line(p, col(skin, 0.8, -26), Math.max(1, r * 0.02), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.52, hy - r * 0.52);
      k.quadraticCurveTo(x + m * r * 0.38, hy - r * 0.58, x + m * r * 0.26, hy - r * 0.52);
      k.moveTo(x + m * r * 0.5, hy - r * 0.42);
      k.quadraticCurveTo(x + m * r * 0.38, hy - r * 0.47, x + m * r * 0.28, hy - r * 0.42);
      // Lines from his nose round his smile.
      k.moveTo(x + m * r * 0.14, hy + r * 0.14);
      k.quadraticCurveTo(x + m * r * 0.36, hy + r * 0.3, x + m * r * 0.3, hy + r * 0.52);
    }
  });
  // Bushy grey brows over eyes creased shut with smiling, crow's feet at their corners.
  line(p, col(GREY), Math.max(1.5, r * 0.1), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.12, hy - r * 0.3);
      k.quadraticCurveTo(x + m * r * 0.32, hy - r * 0.36, x + m * r * 0.52, hy - r * 0.2);
    }
  });
  line(p, ink, Math.max(1, r * 0.035), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.15, hy - r * 0.1);
      k.quadraticCurveTo(x + m * r * 0.29, hy - r * 0.22, x + m * r * 0.43, hy - r * 0.1);
    }
  });
  line(p, ink, Math.max(1, r * 0.018), (k) => {
    for (const m of [-1, 1])
      for (const d of [-0.06, 0.02]) {
        k.moveTo(x + m * r * 0.48, hy + r * d - r * 0.06);
        k.lineTo(x + m * r * 0.58, hy + r * d * 1.6 - r * 0.06);
      }
    // His long nose, and his smile.
    k.moveTo(x - r * 0.02, hy - r * 0.16);
    k.quadraticCurveTo(x + r * 0.06, hy + r * 0.1, x + r * 0.04, hy + r * 0.2);
    k.quadraticCurveTo(x, hy + r * 0.25, x - r * 0.08, hy + r * 0.2);
    k.moveTo(x - r * 0.2, hy + r * 0.4);
    k.quadraticCurveTo(x, hy + r * 0.54, x + r * 0.2, hy + r * 0.4);
  });
  // The grey moustache drooping past his mouth, and the long beard from his chin.
  line(p, col(GREY), Math.max(1.5, r * 0.07), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x, hy + r * 0.3);
      k.quadraticCurveTo(x + m * r * 0.3, hy + r * 0.3, x + m * r * 0.34, hy + r * 0.56);
      k.quadraticCurveTo(x + m * r * 0.36, hy + r * 0.72, x + m * r * 0.32, hy + r * 0.86);
    }
  });
  const beard: Trace = (k) => {
    k.moveTo(x - r * 0.2, hy + r * 0.7);
    k.quadraticCurveTo(x - r * 0.18, hy + r * 1.4, x, hy + r * 1.9);
    k.quadraticCurveTo(x + r * 0.18, hy + r * 1.4, x + r * 0.2, hy + r * 0.7);
    k.quadraticCurveTo(x, hy + r * 0.8, x - r * 0.2, hy + r * 0.7);
    k.closePath();
  };
  shaded(p, GREY, beard, r * 0.06, SEPIA, lw);
  line(p, col(GREY, 0.9, -18), Math.max(1, r * 0.015), (k) => {
    for (const d of [-0.1, 0, 0.1]) {
      k.moveTo(x + d * r, hy + r * 0.82);
      k.quadraticCurveTo(x + d * r * 1.2, hy + r * 1.3, x + d * r * 0.3, hy + r * 1.75);
    }
  });
  // His great wooden beads, hung round his neck down over his chest, evenly spaced along the loop.
  const beads = 15;
  const ax = x - r * 0.62;
  const ay = hy + r * 1.12;
  const cy = hy + r * 3.3;
  const at = (t: number): Pt => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * x + t * t * (2 * x - ax), (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * ay];
  const steps = 60;
  const lens = [0];
  for (let i = 1; i <= steps; i++) {
    const [qx, qy] = at((i - 1) / steps);
    const [px, py] = at(i / steps);
    lens.push(lens[i - 1] + Math.hypot(px - qx, py - qy));
  }
  for (let i = 0; i < beads; i++) {
    const want = (lens[steps] * i) / (beads - 1);
    let j = 1;
    while (j < steps && lens[j] < want) j++;
    const [px, py] = at((j - 1 + (want - lens[j - 1]) / Math.max(1e-6, lens[j] - lens[j - 1])) / steps);
    const g = p.c.createRadialGradient(px - r * 0.04, py - r * 0.04, 0, px, py, r * 0.12);
    g.addColorStop(0, col(BEAD, 1, 18));
    g.addColorStop(1, col(BEAD, 1, -6));
    fill(p, g, (k) => k.arc(px, py, r * 0.12, 0, Math.PI * 2));
    line(p, SEPIA, lw, (k) => k.arc(px, py, r * 0.12, 0, Math.PI * 2));
  }
  return { side: wide ? (left ? 'right' : 'left') : left ? 'left' : 'right' };
}
