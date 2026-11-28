import { type HSL, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import type { Inscribe } from './ink';
import { AZURE, CINNABAR, GOLD, LEAD, MALACHITE, ORANGE, SAFFRON, SEPIA, TEAL, cloudHeap, col, crag, curl, frieze, orb, peak, shaded, sky, swirl, tower } from './thangka';
import { wallTop } from './air-sky';

/** The Air Nomads' things and pastimes: Aang's glider, Pai Sho, Gyatso's pies, marbles, air scooters, wind chimes, the gong. */

const FAR: HSL = [196, 20, 72];
const WOOD: HSL = [28, 46, 40];
const LACQUER: HSL = [4, 56, 36];

/** Far peaks along `base` and a few clouds over them, behind whatever stands in front. */
function distance(p: Press, base: number, ht: number) {
  const { w } = p;
  const u = Math.min(w, p.h);
  const n = Math.max(2, Math.round((w / u) * 1.6));
  for (let i = 0; i < n; i++) peak(p, (w * (i + 0.5)) / n + p.rr(-0.04, 0.04) * w, base, (w / n) * 1.4, ht * p.rr(0.7, 1), FAR);
  for (let i = 0; i < n; i++) cloudHeap(p, (w * (i + 0.2 + (i % 2) * 0.6)) / n, base + u * 0.01, u * 0.13, [30, 60, 84], i % 2 ? -1 : 1);
}

/**
 * Aang's glider staff unfolded and standing on its foot at (x, foot), `L` tall: the staff up its middle, two
 * great red wings near its top on wooden ribs with yellow along their leading edges, a small tail by the foot.
 */
function staffGlider(p: Press, x: number, foot: number, L: number) {
  const lw = Math.max(1, L * 0.005);
  const top = foot - L;
  const root = top + L * 0.1;
  const span = L * 0.42;
  const tipY = root + L * 0.05;
  const rear = root + L * 0.38;
  const wing: HSL = [6, 68, 46];
  for (const m of [-1, 1]) {
    const tip: Pt = [x + m * span, tipY];
    const ends: Pt[] = [tip];
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      ends.push([x + m * span * (1 - t * 0.9), tipY + (rear - tipY) * t ** 0.8]);
    }
    const lead: Trace = (k) => {
      k.moveTo(x, root);
      k.quadraticCurveTo(x + m * span * 0.55, root - L * 0.05, ...tip);
    };
    const shape: Trace = (k) => {
      lead(k);
      for (let i = 1; i < ends.length; i++) {
        const [ax, ay] = ends[i - 1];
        const [bx, by] = ends[i];
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        k.quadraticCurveTo(mx + (x - mx) * 0.2, my + (root - my) * 0.2, bx, by);
      }
      k.lineTo(x, rear);
      k.closePath();
    };
    shaded(p, wing, shape, L * 0.05, SEPIA, lw);
    within(p, shape, () => line(p, col(SAFFRON), L * 0.04, lead));
    line(p, col(WOOD), Math.max(1, L * 0.007), (k) => {
      for (const [ex, ey] of ends.slice(0, 3)) {
        k.moveTo(x, root + L * 0.02);
        k.lineTo(ex, ey);
      }
    });
    line(p, SEPIA, lw, shape);
    // The tail fin on this side, near the foot.
    const ty = foot - L * 0.2;
    const fin: Trace = (k) => {
      k.moveTo(x, ty);
      k.quadraticCurveTo(x + m * L * 0.08, ty + L * 0.01, x + m * L * 0.13, ty + L * 0.08);
      k.quadraticCurveTo(x + m * L * 0.07, ty + L * 0.07, x, ty + L * 0.11);
      k.closePath();
    };
    shaded(p, wing, fin, L * 0.02, SEPIA, lw);
    within(p, fin, () =>
      line(p, col(SAFFRON), L * 0.025, (k) => {
        k.moveTo(x, ty);
        k.quadraticCurveTo(x + m * L * 0.08, ty + L * 0.01, x + m * L * 0.13, ty + L * 0.08);
      }),
    );
    line(p, SEPIA, lw, fin);
  }
  // The staff, capped at the top and bound in gold at either end.
  const sw = L * 0.024;
  shaded(p, WOOD, (k) => k.rect(x - sw / 2, top, sw, L), sw * 0.3, SEPIA, lw);
  shaded(p, WOOD, (k) => k.ellipse(x, top, sw * 0.8, sw * 0.6, 0, 0, TAU), sw * 0.3, SEPIA, lw);
  fill(p, GOLD, (k) => {
    k.rect(x - sw * 0.6, top + L * 0.03, sw * 1.2, L * 0.012);
    k.rect(x - sw * 0.6, foot - L * 0.06, sw * 1.2, L * 0.012);
  });
}

/** Aang's glider unfolded and left standing on the temple wall in the wind, the peaks and clouds beyond. */
export function glider(p: Press): Inscribe {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([204, 40, 72]), col([44, 70, 88]));
  const left = p.r() < 0.5;
  const wall = h * 0.86;
  const L = Math.min(h * 0.76, w * 1.05);
  orb(p, w * (left ? 0.8 : 0.2), Math.min(h * 0.16, wall - L - u * 0.08), u * 0.07, [36, 90, 64]);
  distance(p, wall - u * 0.02, h * 0.26);
  if (w > u * 1.4) for (const m of [-1, 1]) tower(p, w / 2 + m * w * 0.33, wall, u * 0.1, u * 0.44, TEAL);
  wallTop(p, -u * 0.1, w + u * 0.1, wall, u * 0.07);
  c.save();
  c.translate(w / 2, wall - u * 0.028);
  c.rotate((left ? 1 : -1) * 0.06);
  staffGlider(p, 0, 0, L);
  c.restore();
  for (const m of [-1, 1]) swirl(p, w / 2 + m * L * 0.5, wall - L * (m > 0 ? 0.7 : 0.45), u * 0.05, 1.3, col(LEAD, 0.75), Math.max(1, u * 0.006), m > 0 ? 0 : Math.PI);
  return { side: left ? 'left' : 'right' };
}

/** A Pai Sho tile standing at (x, y) on the board, `r` across on the board's tilted plane: its edge showing, a flower on its face. */
function tile(p: Press, x: number, y: number, r: number, sq: number, face: HSL, flower: HSL, petals: number) {
  const th = r * 0.4;
  const ry = r * sq;
  fill(p, col(face, 1, -30), (k) => {
    k.moveTo(x + r, y);
    k.lineTo(x + r, y + th);
    k.ellipse(x, y + th, r, ry, 0, 0, Math.PI);
    k.lineTo(x - r, y);
    k.ellipse(x, y, r, ry, 0, Math.PI, 0, true);
    k.closePath();
  });
  const top: Trace = (k) => k.ellipse(x, y, r, ry, 0, 0, TAU);
  shaded(p, face, top, r * 0.3, SEPIA, 1);
  fill(p, col(flower), (k) => {
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TAU;
      const px = x + Math.cos(a) * r * 0.42;
      const py = y + Math.sin(a) * ry * 0.42;
      k.moveTo(px + r * 0.26, py);
      k.ellipse(px, py, r * 0.26, ry * 0.26, 0, 0, TAU);
    }
  });
  fill(p, GOLD, (k) => k.ellipse(x, y, r * 0.18, ry * 0.18, 0, 0, TAU));
}

/** A game of Pai Sho left half played in a temple room: the round board on the floor, cushions either side, tea, a round window on the clouds. */
export function paisho(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  const SQ = 0.45;
  const R = Math.min(w * 0.4, h * 0.42);
  const cx = w / 2;
  const cy = h - R * SQ - R * 0.25;
  const floor = cy - R * SQ - R * 0.35;
  // The plastered wall and its frieze, and a round window with the sky in it.
  sky(p, 0, floor, col([38, 40, 86]), col([36, 34, 76]));
  const fb = h * 0.04 + u * 0.05;
  frieze(p, -4, w + 4, h * 0.04, u * 0.05);
  const left = p.r() < 0.5;
  const wr = Math.min((floor - fb) * 0.38, w * 0.2);
  const wx = w < h * 0.9 ? w / 2 : w * (left ? 0.24 : 0.76);
  const wy = (fb + floor) / 2;
  const pane: Trace = (k) => k.arc(wx, wy, wr, 0, TAU);
  within(p, pane, () => {
    sky(p, wy - wr, wy + wr, col([204, 44, 70]), col([40, 70, 88]));
    peak(p, wx - wr * 0.3, wy + wr * 1.1, wr * 1.6, wr * 1.3, FAR);
    cloudHeap(p, wx + wr * 0.3, wy + wr * 0.5, wr * 0.5, [30, 60, 84]);
    line(p, col(WOOD), Math.max(1, wr * 0.04), (k) => {
      for (let i = -2; i <= 2; i++) {
        k.moveTo(wx + (i * wr) / 2.5, wy - wr);
        k.lineTo(wx + (i * wr) / 2.5, wy + wr);
        k.moveTo(wx - wr, wy + (i * wr) / 2.5);
        k.lineTo(wx + wr, wy + (i * wr) / 2.5);
      }
    });
  });
  line(p, col(WOOD), Math.max(2, wr * 0.14), pane);
  line(p, GOLD, Math.max(1, wr * 0.03), (k) => k.arc(wx, wy, wr * 1.07, 0, TAU));
  // The floor of boards.
  sky(p, floor, h + 4, col([28, 40, 46]), col([22, 44, 32]));
  line(p, col([22, 40, 24], 0.6), Math.max(1, u * 0.004), (k) => {
    for (let i = 1; i < 6; i++) {
      const y = floor + (h - floor) * (i / 6) ** 1.3;
      k.moveTo(-4, y);
      k.lineTo(w + 4, y);
    }
  });
  line(p, SEPIA, 1, (k) => {
    k.moveTo(-4, floor);
    k.lineTo(w + 4, floor);
  });
  // A cushion either side where the players sat, and their cups of tea.
  for (const m of [-1, 1]) {
    const kx = cx + m * R * 1.22;
    shaded(p, ORANGE, (k) => k.ellipse(kx, cy, R * 0.24, R * 0.11, 0, 0, TAU), R * 0.06, SEPIA, 1);
    line(p, GOLD, Math.max(1, R * 0.01), (k) => k.ellipse(kx, cy - R * 0.01, R * 0.17, R * 0.07, 0, 0, TAU));
    const tx = cx + m * R * 0.98;
    const ty = cy + R * SQ * 0.8;
    const tr = R * 0.085;
    shaded(p, LEAD, (k) => {
      k.moveTo(tx - tr, ty);
      k.lineTo(tx - tr * 0.8, ty + tr * 1.1);
      k.lineTo(tx + tr * 0.8, ty + tr * 1.1);
      k.lineTo(tx + tr, ty);
      k.closePath();
    }, tr * 0.3, SEPIA, 1);
    fill(p, col([30, 50, 40]), (k) => k.ellipse(tx, ty, tr, tr * 0.4, 0, 0, TAU));
    line(p, SEPIA, 1, (k) => k.ellipse(tx, ty, tr, tr * 0.4, 0, 0, TAU));
  }
  // The board: its edge, then the face with the red and white gardens, the lines and the four gates.
  const th = R * 0.07;
  const at = (bx: number, by: number): Pt => [cx + bx * R, cy + by * R * SQ];
  fill(p, col([24, 50, 24]), (k) => {
    k.moveTo(cx + R, cy);
    k.lineTo(cx + R, cy + th);
    k.ellipse(cx, cy + th, R, R * SQ, 0, 0, Math.PI);
    k.lineTo(cx - R, cy);
    k.ellipse(cx, cy, R, R * SQ, 0, Math.PI, 0, true);
    k.closePath();
  });
  const face: Trace = (k) => k.ellipse(cx, cy, R, R * SQ, 0, 0, TAU);
  shaded(p, [34, 44, 70], face, R * 0.1, SEPIA, 1);
  within(p, face, () => {
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      fill(p, q % 2 ? col([36, 30, 92], 0.9) : col(CINNABAR, 0.75, 6), (k) => {
        k.moveTo(...at(0, 0));
        k.lineTo(...at(Math.cos(a), Math.sin(a)));
        k.lineTo(...at(Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2)));
        k.closePath();
      });
    }
    line(p, col([24, 40, 28], 0.55), Math.max(1, R * 0.004), (k) => {
      for (let i = -8; i <= 8; i++) {
        k.moveTo(...at(i / 9, -1));
        k.lineTo(...at(i / 9, 1));
        k.moveTo(...at(-1, i / 9));
        k.lineTo(...at(1, i / 9));
      }
    });
    line(p, col([24, 40, 22], 0.85), Math.max(1.5, R * 0.01), (k) => {
      k.moveTo(...at(-1, 0));
      k.lineTo(...at(1, 0));
      k.moveTo(...at(0, -1));
      k.lineTo(...at(0, 1));
    });
  });
  fill(p, col(CINNABAR, 1, -8), (k) => {
    for (const [gx, gy] of [at(1, 0), at(-1, 0), at(0, 1), at(0, -1)]) {
      k.moveTo(gx + R * 0.05, gy);
      k.ellipse(gx, gy, R * 0.05, R * 0.05 * SQ, 0, 0, TAU);
    }
  });
  line(p, GOLD, Math.max(1, R * 0.008), face);
  // The tiles on their points, back to front, the White Lotus among them.
  const seen = new Set<string>(['1,-2']);
  const spots: [number, number, number][] = [[1, -2, -1]];
  while (spots.length < 13) {
    const i = p.ri(-7, 7);
    const j = p.ri(-7, 7);
    if (i * i + j * j > 52 || seen.has(`${i},${j}`)) continue;
    seen.add(`${i},${j}`);
    spots.push([i, j, p.ri(0, 3)]);
  }
  spots.sort((a, b) => a[1] - b[1]);
  const kinds: [HSL, HSL, number][] = [
    [[36, 30, 90], CINNABAR, 5],
    [[6, 50, 44], [40, 30, 94], 5],
    [[36, 30, 90], SAFFRON, 6],
    [[36, 30, 90], AZURE, 4],
  ];
  for (const [i, j, kind] of spots) {
    const [tx, ty] = at(i / 9, j / 9);
    if (kind < 0) tile(p, tx, ty - R * 0.035, R * 0.095, SQ, [40, 20, 97], [340, 62, 74], 8);
    else tile(p, tx, ty - R * 0.028, R * 0.065, SQ, ...kinds[kind]);
  }
  return { side: left ? 'right' : 'left' };
}

/** A fruit pie in its tin at (x, y), `r` its radius, seen a little from above: a fluted crust round a lattice over the fruit, steam rising. */
function pie(p: Press, x: number, y: number, r: number, fruit: HSL, steam: boolean) {
  const sq = 0.36;
  const tin = r * 0.22;
  const crust: HSL = [34, 64, 62];
  const side: Trace = (k) => {
    k.moveTo(x + r, y);
    k.lineTo(x + r * 0.88, y + tin);
    k.ellipse(x, y + tin, r * 0.88, r * 0.88 * sq, 0, 0, Math.PI);
    k.lineTo(x - r, y);
    k.ellipse(x, y, r, r * sq, 0, Math.PI, 0, true);
    k.closePath();
  };
  shaded(p, [30, 12, 58], side, r * 0.1, SEPIA, 1);
  const top: Trace = (k) => k.ellipse(x, y, r, r * sq, 0, 0, TAU);
  shaded(p, crust, top, r * 0.1, SEPIA, 1);
  const inner: Trace = (k) => k.ellipse(x, y - r * 0.01, r * 0.8, r * 0.8 * sq, 0, 0, TAU);
  shaded(p, fruit, inner, r * 0.12, col(crust, 1, -24), 1);
  within(p, inner, () => {
    const sw = r * 0.13;
    for (const across of [false, true])
      for (let i = -3; i <= 3; i += 2) {
        const strip: Trace = across
          ? (k) => k.rect(x - r, y + ((i * r) / 4) * sq - sw * sq * 0.8, r * 2, sw * sq * 1.6)
          : (k) => k.rect(x + (i * r) / 4 - sw / 2, y - r, sw, r * 2);
        shaded(p, crust, strip, sw * 0.3, col(crust, 1, -26), 1);
      }
  });
  line(p, col(crust, 1, -18), Math.max(1, r * 0.03), (k) => {
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const px = x + Math.cos(a) * r * 0.9;
      const py = y + Math.sin(a) * r * 0.9 * sq;
      k.moveTo(px + r * 0.05, py);
      k.ellipse(px, py, r * 0.05, r * 0.05 * sq * 1.6, 0, 0, Math.PI);
    }
  });
  if (steam)
    line(p, col(LEAD, 0.7), Math.max(1, r * 0.03), (k) => {
      for (const m of [-0.3, 0.25]) {
        const sx = x + m * r;
        k.moveTo(sx, y - r * 0.1);
        k.bezierCurveTo(sx + r * 0.2, y - r * 0.4, sx - r * 0.2, y - r * 0.6, sx + r * 0.05, y - r * 0.9);
      }
    });
}

/** Monk Gyatso's fruit pies cooling on the sill of an open window, the peaks and clouds outside. */
export function pies(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, col(LEAD, 1, -6), (k) => k.rect(-4, -4, w + 8, h + 8));
  const x0 = w * 0.1;
  const x1 = w * 0.9;
  const y0 = h * 0.14;
  const y1 = h * (h > w ? 0.76 : 0.68);
  // The black surround of a Tibetan window, wider at its foot, and the view through it.
  const m = u * 0.06;
  fill(p, col([30, 20, 14]), (k) => {
    k.moveTo(x0 - m, y0 - m * 0.6);
    k.lineTo(x1 + m, y0 - m * 0.6);
    k.lineTo(x1 + m * 1.8, y1);
    k.lineTo(x0 - m * 1.8, y1);
    k.closePath();
  });
  const opening: Trace = (k) => k.rect(x0, y0, x1 - x0, y1 - y0);
  within(p, opening, () => {
    sky(p, y0, y1, col([204, 40, 72]), col([42, 70, 88]));
    distance(p, y1 + u * 0.04, (y1 - y0) * 0.5);
  });
  line(p, col(LACQUER), Math.max(2, u * 0.022), opening);
  line(p, GOLD, Math.max(1, u * 0.006), (k) => k.rect(x0 + u * 0.016, y0 + u * 0.016, x1 - x0 - u * 0.032, y1 - y0 - u * 0.032));
  // The striped valance across its top, scalloped at its hem.
  const vh = u * 0.07;
  const valance: Trace = (k) => {
    k.moveTo(x0 - m, y0 - m * 0.6);
    k.lineTo(x1 + m, y0 - m * 0.6);
    k.lineTo(x1 + m, y0 + vh * 0.6);
    const n = Math.max(4, Math.round((x1 - x0 + 2 * m) / (u * 0.08)));
    for (let i = 1; i <= n; i++) {
      const sx = x1 + m - ((x1 - x0 + 2 * m) * i) / n;
      k.quadraticCurveTo(sx + (x1 - x0 + 2 * m) / n / 2, y0 + vh * 1.1, sx, y0 + vh * 0.6);
    }
    k.closePath();
  };
  shaded(p, LEAD, valance, vh * 0.3, SEPIA, 1);
  const stripe = (at: number, deep: number) => (k: CanvasRenderingContext2D) => k.rect(x0 - m, y0 - m * 0.6 + vh * at, x1 - x0 + 2 * m, vh * deep);
  within(p, valance, () => {
    fill(p, col(CINNABAR), stripe(0.25, 0.14));
    fill(p, col(AZURE), stripe(0.46, 0.1));
    fill(p, col(CINNABAR), stripe(0.62, 0.1));
  });
  // The sill, and the pies along it.
  const sd = u * 0.07;
  shaded(p, [36, 20, 80], (k) => k.rect(x0 - m * 2.2, y1, x1 - x0 + m * 4.4, sd), sd * 0.3, SEPIA, 1);
  line(p, GOLD, Math.max(1, u * 0.006), (k) => {
    k.moveTo(x0 - m * 2.2, y1 + sd);
    k.lineTo(x1 + m * 2.2, y1 + sd);
  });
  frieze(p, -4, w + 4, Math.min(h - u * 0.06, y1 + sd + u * 0.08), u * 0.05);
  const n = Math.max(2, Math.round((x1 - x0) / (u * 0.46)));
  const r = Math.min(u * 0.17, ((x1 - x0) / n) * 0.4);
  const fruits: HSL[] = [
    [340, 60, 42],
    [22, 80, 54],
    [262, 34, 40],
    [350, 66, 50],
  ];
  const start = p.ri(0, 3);
  for (let i = 0; i < n; i++) pie(p, x0 + ((x1 - x0) * (i + 0.5)) / n, y1 + sd * 0.35 - r * 0.24, r, fruits[(start + i) % 4], i % 2 === 0);
  return {};
}

/** A glass marble at (x, y), `r` its radius, in `ink`: shaded to a dark edge, a twist of white inside and a bright glint. */
function marble(p: Press, x: number, y: number, r: number, ink: HSL) {
  const ball: Trace = (k) => k.arc(x, y, r, 0, TAU);
  const g = p.c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, col(ink, 1, 30));
  g.addColorStop(0.6, col(ink));
  g.addColorStop(1, col(ink, 1, -18));
  fill(p, g, ball);
  line(p, col(LEAD, 0.75), Math.max(1, r * 0.14), (k) => {
    k.moveTo(x - r * 0.55, y + r * 0.25);
    k.quadraticCurveTo(x, y - r * 0.35, x + r * 0.55, y + r * 0.1);
  });
  fill(p, col(LEAD, 0.95), (k) => k.arc(x - r * 0.35, y - r * 0.4, r * 0.18, 0, TAU));
  line(p, SEPIA, 1, ball);
}

/** Aang's marble trick: marbles flying round in a ring of wind over the terrace wall, their bowl left on the wall below. */
export function marbles(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([28, 68, 66]), col([46, 72, 90]));
  const wall = h * 0.82;
  distance(p, wall - u * 0.02, h * 0.3);
  wallTop(p, -u * 0.1, w + u * 0.1, wall, u * 0.07);
  // The bowl the marbles came from, on the wall.
  const bx = w / 2;
  const by = wall - u * 0.028;
  const br = u * 0.09;
  shaded(p, WOOD, (k) => {
    k.moveTo(bx - br, by - br * 0.5);
    k.quadraticCurveTo(bx - br * 0.9, by, bx - br * 0.4, by);
    k.lineTo(bx + br * 0.4, by);
    k.quadraticCurveTo(bx + br * 0.9, by, bx + br, by - br * 0.5);
    k.closePath();
  }, br * 0.2, SEPIA, 1);
  fill(p, col(WOOD, 1, -14), (k) => k.ellipse(bx, by - br * 0.5, br, br * 0.2, 0, 0, TAU));
  marble(p, bx - br * 0.3, by - br * 0.55, br * 0.18, AZURE);
  marble(p, bx + br * 0.25, by - br * 0.58, br * 0.18, CINNABAR);
  line(p, GOLD, Math.max(1, u * 0.005), (k) => k.ellipse(bx, by - br * 0.5, br, br * 0.2, 0, 0, TAU));
  // The ring they fly round, tilted; the far half first, then the whirl of air, then the near half.
  const ox = w / 2;
  const oy = Math.min(h * 0.44, wall - u * 0.34);
  const rx = Math.min(w * 0.4, u * 0.44);
  const ry = rx * 0.3;
  const tilt = p.rr(-0.12, 0.12);
  const inks: HSL[] = [AZURE, MALACHITE, CINNABAR, SAFFRON, [40, 20, 94], TEAL, ORANGE];
  const a0 = p.rr(0, TAU);
  const balls = inks.map((ink, i) => {
    const a = a0 + (i / inks.length) * TAU;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    return { a, ink, x: ox + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: oy + ex * Math.sin(tilt) + ey * Math.cos(tilt), near: Math.sin(a) };
  });
  const mr = rx * 0.08;
  const half = (near: boolean) => {
    line(p, col(LEAD, 0.6), Math.max(1, u * 0.006), (k) => {
      for (const d of [-0.04, 0, 0.04]) k.ellipse(ox, oy, rx * (1 + d), ry * (1 + d * 2), tilt, near ? 0 : Math.PI, near ? Math.PI : TAU);
    });
    for (const b of balls) {
      if (b.near > 0 !== near) continue;
      const r = mr * (1 + b.near * 0.18);
      line(p, col(b.ink, 0.35, 20), r * 1.2, (k) => k.ellipse(ox, oy, rx, ry, tilt, b.a - 0.6, b.a - 0.1));
      marble(p, b.x, b.y, r, b.ink);
    }
  };
  half(false);
  swirl(p, ox, oy, ry * 0.9, 2.2, col(LEAD, 0.8), Math.max(1, u * 0.007), p.rr(0, TAU));
  curl(p, ox - rx * 0.6, oy - ry * 1.4, u * 0.03, col(LEAD, 0.7), Math.max(1, u * 0.005));
  curl(p, ox + rx * 0.7, oy + ry * 1.3, u * 0.03, col(LEAD, 0.7), Math.max(1, u * 0.005), -1);
  half(true);
  return {};
}

/** An air scooter at (x, y), `r` its radius: a ball of wind, pale and clear, its currents curling round inside it. */
function scooter(p: Press, x: number, y: number, r: number, turn: number) {
  const ball: Trace = (k) => k.arc(x, y, r, 0, TAU);
  const glow = p.c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.5);
  glow.addColorStop(0, col(LEAD, 0.45));
  glow.addColorStop(1, col(LEAD, 0));
  fill(p, glow, (k) => k.arc(x, y, r * 1.5, 0, TAU));
  const g = p.c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, col(LEAD, 0.95));
  g.addColorStop(0.6, col([196, 56, 78], 0.75));
  g.addColorStop(1, col([204, 50, 62], 0.7));
  fill(p, g, ball);
  line(p, col(LEAD, 0.95), Math.max(1.5, r * 0.09), (k) => {
    for (let i = 0; i < 3; i++) {
      const a = turn + (i / 3) * Math.PI;
      k.moveTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
      k.ellipse(x, y, r * 0.85, r * 0.3, a, 0, 2.2);
    }
  });
  line(p, col([206, 50, 40], 0.9), Math.max(1, r * 0.04), ball);
}

/** Air scooters racing round the temple on its crag at dusk, their wakes curling round it lap after lap. */
export function scooters(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([300, 24, 56]), col([36, 74, 82]));
  orb(p, w * (p.r() < 0.5 ? 0.16 : 0.84), h * 0.3, u * 0.08, [20, 86, 62]);
  distance(p, h * 0.78, h * 0.3);
  const ox = w / 2;
  const oy = h * 0.52;
  const rx = Math.min(w * 0.44, u * 0.66);
  const ry = rx * 0.24;
  const at = (a: number, d = 0): Pt => [ox + Math.cos(a) * rx * (1 + d), oy + Math.sin(a) * ry * (1 + d * 2)];
  const wake = (from: number, to: number) =>
    line(p, col(LEAD, 0.7), Math.max(1, u * 0.006), (k) => {
      for (const d of [-0.05, 0, 0.05]) {
        k.moveTo(...at(from, d));
        k.ellipse(ox, oy, rx * (1 + d), ry * (1 + d * 2), 0, from, to);
      }
    });
  // The far half of the track and the scooter on it, then the crag and its towers, then the near half.
  wake(Math.PI, TAU);
  const far = Math.PI * p.rr(1.12, 1.25);
  scooter(p, ...at(far), u * 0.06, p.rr(0, TAU));
  const [l, r] = crag(p, ox, h * 0.4, u * 0.5, h + 4, 0.56);
  const top = h * 0.4;
  tower(p, (l + r) / 2, top + 2, u * 0.08, u * 0.3, AZURE);
  for (const m of [-1, 1]) tower(p, (l + r) / 2 + m * (r - l) * 0.34, top + 2, u * 0.055, u * 0.2, AZURE);
  cloudHeap(p, ox - u * 0.3, h * 0.9, u * 0.18, [300, 20, 84]);
  cloudHeap(p, ox + u * 0.32, h * 0.94, u * 0.2, [300, 20, 84], -1);
  wake(0, Math.PI);
  const lead = Math.PI * p.rr(0.25, 0.4);
  for (const [a, s] of [
    [lead, 0.09],
    [lead + 0.55, 0.085],
  ]) {
    const [sx, sy] = at(a);
    for (let i = 1; i <= 3; i++) curl(p, ...at(a - i * 0.22, 0.02 * (i % 2 ? 1 : -1)), u * (0.03 - i * 0.006), col(LEAD, 0.75), Math.max(1, u * 0.005), -1);
    scooter(p, sx, sy, u * s, p.rr(0, TAU));
  }
  return {};
}

/** A Bodhi leaf of gold to catch the wind, hanging from (x, y), `s` long. */
function leaf(p: Press, x: number, y: number, s: number) {
  const shape: Trace = (k) => {
    k.moveTo(x, y);
    k.bezierCurveTo(x - s * 0.55, y + s * 0.05, x - s * 0.45, y + s * 0.6, x, y + s);
    k.bezierCurveTo(x + s * 0.45, y + s * 0.6, x + s * 0.55, y + s * 0.05, x, y);
    k.closePath();
  };
  shaded(p, [42, 78, 56], shape, s * 0.12, SEPIA, 1);
  line(p, col([36, 70, 40], 0.7), 1, (k) => {
    k.moveTo(x, y + s * 0.08);
    k.lineTo(x, y + s * 0.9);
  });
}

/** One chime hanging `len` below (x, y), leaning in the wind by `lean`: a bronze bell or a ring of tubes, a gold leaf under it. */
function chime(p: Press, x: number, y: number, len: number, s: number, bell: boolean, lean: number) {
  const c = p.c;
  const bx = x + lean * len;
  const by = y + len;
  line(p, SEPIA, 1, (k) => {
    k.moveTo(x, y);
    k.lineTo(bx, by);
  });
  c.save();
  c.translate(bx, by);
  c.rotate(-Math.atan(lean));
  if (bell) {
    const shape: Trace = (k) => {
      k.moveTo(-s * 0.12, 0);
      k.quadraticCurveTo(-s * 0.3, s * 0.06, -s * 0.3, s * 0.4);
      k.quadraticCurveTo(-s * 0.32, s * 0.6, -s * 0.42, s * 0.7);
      k.lineTo(s * 0.42, s * 0.7);
      k.quadraticCurveTo(s * 0.32, s * 0.6, s * 0.3, s * 0.4);
      k.quadraticCurveTo(s * 0.3, s * 0.06, s * 0.12, 0);
      k.closePath();
    };
    shaded(p, [34, 54, 44], shape, s * 0.12, SEPIA, 1);
    line(p, GOLD, Math.max(1, s * 0.04), (k) => {
      k.moveTo(-s * 0.3, s * 0.5);
      k.lineTo(s * 0.3, s * 0.5);
    });
    line(p, SEPIA, 1, (k) => {
      k.moveTo(0, s * 0.7);
      k.lineTo(0, s * 1.0);
    });
    fill(p, col([34, 40, 30]), (k) => k.arc(0, s * 0.78, s * 0.06, 0, TAU));
    leaf(p, 0, s * 1.0, s * 0.6);
  } else {
    shaded(p, [34, 54, 44], (k) => k.ellipse(0, s * 0.04, s * 0.34, s * 0.07, 0, 0, TAU), s * 0.05, SEPIA, 1);
    for (const [tx, tl] of [
      [-0.26, 0.9],
      [-0.13, 1.05],
      [0, 1.15],
      [0.13, 1.0],
      [0.26, 0.85],
    ]) {
      const tube: Trace = (k) => k.rect(tx * s - s * 0.045, s * 0.1, s * 0.09, tl * s);
      const g = c.createLinearGradient(tx * s - s * 0.045, 0, tx * s + s * 0.045, 0);
      g.addColorStop(0, col([42, 70, 70]));
      g.addColorStop(1, col([34, 54, 40]));
      fill(p, g, tube);
      line(p, SEPIA, 1, tube);
    }
    line(p, SEPIA, 1, (k) => {
      k.moveTo(0, s * 0.1);
      k.lineTo(0, s * 1.4);
    });
    fill(p, col(CINNABAR), (k) => k.arc(0, s * 0.7, s * 0.09, 0, TAU));
    leaf(p, 0, s * 1.4, s * 0.55);
  }
  c.restore();
}

/** Wind chimes and bells under the temple's eaves, swinging in a breeze off the clouds below. */
export function chimes(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([206, 40, 66]), col([44, 70, 88]));
  distance(p, h * 0.98, h * 0.3);
  const left = p.r() < 0.5;
  const wind = left ? 1 : -1;
  for (let i = 0; i < 3; i++) swirl(p, w * (0.2 + i * 0.3), h * (0.5 + (i % 2) * 0.16), u * 0.05, 1.3, col(LEAD, 0.7), Math.max(1, u * 0.006), i);
  // The eave across the top: teal tiles, a gold edge, rafter ends under it, sweeping up at one corner.
  const ey = h * 0.12 + u * 0.08;
  const tipX = left ? w + 4 : -4;
  const roof: Trace = (k) => {
    k.moveTo(left ? -4 : w + 4, -4);
    k.lineTo(tipX, -4);
    k.lineTo(tipX, ey - u * 0.16);
    k.quadraticCurveTo(w / 2 + (left ? 1 : -1) * w * 0.3, ey, left ? -4 : w + 4, ey);
    k.closePath();
  };
  shaded(p, TEAL, roof, u * 0.08, SEPIA, 1.2);
  within(p, roof, () =>
    line(p, col(TEAL, 0.6, -16), Math.max(1, u * 0.005), (k) => {
      for (let i = 0; i <= 14; i++) {
        const x = (w * i) / 14;
        k.moveTo(x, -4);
        k.lineTo(x + (x - w / 2) * 0.05, ey);
      }
    }),
  );
  const eave = (t: number): Pt => {
    const sx = left ? -4 : w + 4;
    const cx = w / 2 + (left ? 1 : -1) * w * 0.3;
    const cy = ey;
    const tx = tipX;
    const tyy = ey - u * 0.16;
    return [(1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx, (1 - t) * (1 - t) * ey + 2 * (1 - t) * t * cy + t * t * tyy];
  };
  line(p, GOLD, Math.max(1.5, u * 0.012), (k) => {
    k.moveTo(...eave(0));
    for (let i = 1; i <= 20; i++) k.lineTo(...eave(i / 20));
  });
  const n = Math.max(3, Math.round((w / u) * 3));
  const hangs = Array.from({ length: n }, (_, i) => ({
    t: (i + 0.5) / n,
    len: h * p.rr(0.08, 0.36),
    bell: (i + (left ? 0 : 1)) % 2 === 0,
  }));
  fill(p, col(LACQUER), (k) => {
    for (let i = 0; i <= 12; i++) {
      const [rx, ry] = eave(i / 12);
      k.rect(rx - u * 0.012, ry, u * 0.024, u * 0.03);
    }
  });
  const s = u * 0.12;
  for (const { t, len, bell } of hangs) {
    const [hx, hy] = eave(t);
    chime(p, hx, hy + u * 0.01, len, s * (bell ? 1 : 0.9), bell, wind * p.rr(0.1, 0.2));
  }
  return { side: left ? 'left' : 'right' };
}

/** The temple's great bronze gong hung in its frame in the courtyard at dawn, ringing, its mallet left against a post. */
export function gong(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h * 0.6, col([20, 62, 66]), col([46, 74, 90]));
  distance(p, h * 0.58, h * 0.3);
  wallTop(p, -u * 0.1, w + u * 0.1, h * 0.56, u * 0.06);
  // The flagstones of the courtyard.
  const ground = h * 0.84;
  shaded(p, [30, 12, 66], (k) => k.rect(-4, ground, w + 8, h - ground + 4), u * 0.04, SEPIA, 1);
  line(p, col([30, 12, 50], 0.6), Math.max(1, u * 0.004), (k) => {
    k.moveTo(-4, ground + (h - ground) * 0.45);
    k.lineTo(w + 4, ground + (h - ground) * 0.45);
    const n = Math.max(4, Math.round((w / u) * 5));
    for (let i = 0; i <= n; i++) {
      const x = (w * (i + 0.5)) / n;
      k.moveTo(x, ground);
      k.lineTo(x + (x - w / 2) * 0.1, ground + (h - ground) * 0.45);
      k.moveTo(x + (x - w / 2) * 0.1 + w / n / 2, ground + (h - ground) * 0.45);
      k.lineTo(x + (x - w / 2) * 0.2 + w / n / 2, h + 4);
    }
  });
  // The frame: two lacquered posts and a beam with upturned ends.
  const R = Math.min(w * 0.24, h * 0.24);
  const gx = w / 2;
  const gy = ground - R * 1.45;
  const beam = gy - R * 1.45;
  const pw = R * 0.12;
  for (const m of [-1, 1]) shaded(p, LACQUER, (k) => k.rect(gx + m * R * 1.4 - pw / 2, beam, pw, ground - beam + R * 0.04), pw * 0.4, SEPIA, 1);
  const beamShape: Trace = (k) => {
    k.moveTo(gx - R * 1.8, beam - R * 0.22);
    k.quadraticCurveTo(gx - R * 1.6, beam - R * 0.02, gx - R * 1.3, beam - R * 0.04);
    k.lineTo(gx + R * 1.3, beam - R * 0.04);
    k.quadraticCurveTo(gx + R * 1.6, beam - R * 0.02, gx + R * 1.8, beam - R * 0.22);
    k.lineTo(gx + R * 1.7, beam + R * 0.1);
    k.lineTo(gx - R * 1.7, beam + R * 0.1);
    k.closePath();
  };
  shaded(p, LACQUER, beamShape, R * 0.06, SEPIA, 1);
  line(p, GOLD, Math.max(1, R * 0.02), (k) => {
    k.moveTo(gx - R * 1.6, beam + R * 0.04);
    k.lineTo(gx + R * 1.6, beam + R * 0.04);
  });
  shaded(p, LACQUER, (k) => k.rect(gx - R * 1.5, ground - R * 0.5, R * 3, R * 0.1), R * 0.04, SEPIA, 1);
  // The cords it hangs from, then the gong: bronze ringed with lines, a raised boss at its heart, a gold rim.
  line(p, col([36, 30, 30]), Math.max(1.5, R * 0.025), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(gx + m * R * 0.5, beam + R * 0.1);
      k.lineTo(gx + m * R * 0.62, gy - R * 0.78);
    }
  });
  const disc: Trace = (k) => k.arc(gx, gy, R, 0, TAU);
  const g = p.c.createRadialGradient(gx - R * 0.3, gy - R * 0.3, R * 0.1, gx, gy, R);
  g.addColorStop(0, col([42, 70, 66]));
  g.addColorStop(0.7, col([34, 60, 46]));
  g.addColorStop(1, col([28, 56, 32]));
  fill(p, g, disc);
  line(p, col([30, 50, 30], 0.6), Math.max(1, R * 0.01), (k) => {
    for (const s of [0.82, 0.62, 0.44]) {
      k.moveTo(gx + R * s, gy);
      k.arc(gx, gy, R * s, 0, TAU);
    }
  });
  const boss: Trace = (k) => k.arc(gx, gy, R * 0.22, 0, TAU);
  const bg = p.c.createRadialGradient(gx - R * 0.08, gy - R * 0.08, 0, gx, gy, R * 0.22);
  bg.addColorStop(0, col([46, 80, 80]));
  bg.addColorStop(1, col([34, 60, 44]));
  fill(p, bg, boss);
  line(p, SEPIA, 1, boss);
  line(p, GOLD, Math.max(1.5, R * 0.05), disc);
  line(p, SEPIA, 1, (k) => k.arc(gx, gy, R * 1.025, 0, TAU));
  // Its ring going out in rings of its own, and the mallet against a post.
  line(p, col([44, 80, 74], 0.6), Math.max(1, R * 0.02), (k) => {
    for (const m of [-1, 1])
      for (let i = 1; i <= 3; i++) {
        const rr = R * (1.1 + i * 0.16);
        const a = m > 0 ? 0 : Math.PI;
        k.moveTo(gx + Math.cos(a - 0.4) * rr, gy + Math.sin(a - 0.4) * rr);
        k.arc(gx, gy, rr, a - 0.4, a + 0.4);
      }
  });
  const left = p.r() < 0.5;
  const mx = gx + (left ? -1 : 1) * R * 1.4;
  line(p, col(WOOD), Math.max(2, R * 0.05), (k) => {
    k.moveTo(mx + (left ? 1 : -1) * R * 0.42, ground + R * 0.02);
    k.lineTo(mx + (left ? 1 : -1) * pw, ground - R * 0.9);
  });
  shaded(p, CINNABAR, (k) => k.ellipse(mx + (left ? 1 : -1) * pw, ground - R * 0.92, R * 0.1, R * 0.08, 0, 0, TAU), R * 0.04, SEPIA, 1);
  return { side: left ? 'right' : 'left' };
}
