import { hsl, type HSL, type Pt } from '../common';
import { type Ctx, type Trace, TAU, type Press, fill, line, within } from './print';
import { GOLD, INK, JADE, MALACHITE, type Inscribe, hall, mist, range, tone, tree } from './ink';

/** Korra's Earth Kingdom: the metal city of Zaofu, Republic City across its bay, and Kuvira's colossus. */

const DOME: HSL = [165, 12, 62];
const LAMP = hsl(44, 82, 66, 0.9);

/** Zaofu: domes of metal petals on a plateau in a green valley, one of them open like a lotus. */
export function zaofu(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.5, h * 0.08, -10, w + 10, MALACHITE, 0.6);
  mist(p, h * 0.5, h * 0.07);
  range(p, h * 0.74, h * 0.34, -10, w * 0.24, JADE, 0.8);
  range(p, h * 0.74, h * 0.38, w * 0.78, w + 10, JADE, 0.8);
  mist(p, h * 0.72, h * 0.06);
  const base = h * 0.8;
  const n = Math.max(3, Math.round((w / u) * 2.2));
  const mid = Math.floor(n / 2);
  const domes = Array.from({ length: n }, (_, i) => ({
    x: (w * (i + 0.5 + (i === mid ? 0 : p.rr(-0.12, 0.12)))) / n,
    r: u * (i === mid ? 0.26 : p.rr(0.14, 0.2)),
  }));
  const open = domes[p.r() < 0.4 ? mid : p.ri(0, n - 1)];
  // The wall that joins the domes, then the domes from the smallest to the largest.
  const x0 = domes[0].x;
  const x1 = domes[n - 1].x;
  const wall = u * 0.05;
  fill(p, tone(DOME, 1, -14), (k) => k.rect(x0, base - wall, x1 - x0, wall));
  line(p, INK(0.6), 1.2, (k) => {
    k.moveTo(x0, base - wall);
    k.lineTo(x1, base - wall);
  });
  for (const d of [...domes].sort((a, b) => a.r - b.r)) (d === open ? openDome : bud)(p, d.x, base, d.r);
  // The plateau, with trees along it.
  const g = c.createLinearGradient(0, base, 0, h);
  g.addColorStop(0, tone(JADE, 0.9, 12));
  g.addColorStop(1, tone(JADE, 1, -4));
  fill(p, g, (k) => k.rect(-4, base, w + 8, h - base + 4));
  for (let i = 0; i < 9; i++) tree(p, p.rr(0, w), base + (h - base) * p.rr(0.4, 0.95), u * p.rr(0.06, 0.1));
}

/** A closed dome: metal petals folded into a bud, with gold at its foot and tip. */
function bud(p: Press, x: number, base: number, r: number) {
  // The left edge (s = -1), the right edge (s = 1), or a seam between petals.
  const side = (k: Ctx, s: number) => {
    k.moveTo(x + s * r * 0.85, base);
    k.bezierCurveTo(x + s * r * 1.12, base - r * 0.65, x + s * r * 0.55, base - r * 1.25, x, base - r * 1.6);
  };
  const shape: Trace = (k) => {
    side(k, -1);
    k.bezierCurveTo(x + r * 0.55, base - r * 1.25, x + r * 1.12, base - r * 0.65, x + r * 0.85, base);
    k.closePath();
  };
  const g = p.c.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, tone(DOME, 1, 18));
  g.addColorStop(0.45, tone(DOME, 1, 4));
  g.addColorStop(1, tone(DOME, 1, -22));
  fill(p, g, shape);
  for (let j = 1; j < 6; j++) {
    const s = -1 + j / 3;
    line(p, 'rgba(255,255,255,0.35)', Math.max(0.8, r * 0.03), (k) => side(k, s - 0.05));
    line(p, INK(0.45), Math.max(0.8, r * 0.02), (k) => side(k, s));
  }
  line(p, INK(0.75), Math.max(1.2, r * 0.03), shape);
  line(p, GOLD, Math.max(1.5, r * 0.06), (k) => {
    k.moveTo(x - r * 0.86, base - r * 0.04);
    k.lineTo(x + r * 0.86, base - r * 0.04);
  });
  fill(p, GOLD, (k) => k.arc(x, base - r * 1.62, Math.max(1.5, r * 0.05), 0, TAU));
}

/** A dome open like a lotus: its petals turned out around the halls inside, which catch the light. */
function openDome(p: Press, x: number, base: number, r: number) {
  const glow = p.c.createRadialGradient(x, base - r * 0.6, 0, x, base - r * 0.6, r * 1.5);
  glow.addColorStop(0, 'rgba(255,232,160,0.6)');
  glow.addColorStop(1, 'rgba(255,232,160,0)');
  fill(p, glow, (k) => k.arc(x, base - r * 0.6, r * 1.5, 0, TAU));
  // A petal leaning at angle a from upright, `len` long.
  const petal = (a: number, len: number) => {
    const bx = x + Math.sin(a) * r * 0.4;
    const wd = r * 0.36;
    const at = (lx: number, ly: number): Pt => [bx + lx * Math.cos(a) + ly * Math.sin(a), base + lx * Math.sin(a) - ly * Math.cos(a)];
    const shape: Trace = (k) => {
      k.moveTo(...at(-wd * 0.45, 0));
      k.bezierCurveTo(...at(-wd * 1.1, len * 0.35), ...at(-wd * 0.7, len * 0.85), ...at(0, len));
      k.bezierCurveTo(...at(wd * 0.7, len * 0.85), ...at(wd * 1.1, len * 0.35), ...at(wd * 0.45, 0));
      k.closePath();
    };
    fill(p, tone(DOME, 1, -a * 9), shape);
    line(p, INK(0.35), Math.max(0.8, r * 0.02), (k) => {
      k.moveTo(...at(0, len * 0.05));
      k.lineTo(...at(0, len * 0.8));
    });
    line(p, INK(0.75), Math.max(1.2, r * 0.03), shape);
    fill(p, GOLD, (k) => k.arc(...at(0, len), Math.max(1.2, r * 0.04), 0, TAU));
  };
  for (const a of [-0.8, 0.8, -0.42, 0.42]) petal(a, r * 1.25);
  hall(p, x - r * 0.5, base, r * 0.36, r * 0.55);
  hall(p, x + r * 0.5, base, r * 0.36, r * 0.55);
  hall(p, x, base, r * 0.6, r * 1.2, 3);
  for (const a of [-1.45, 1.45, -1.1, 1.1]) petal(a, r * 1.1);
  line(p, GOLD, Math.max(1.5, r * 0.06), (k) => {
    k.moveTo(x - r * 0.6, base - r * 0.03);
    k.lineTo(x + r * 0.6, base - r * 0.03);
  });
}

/** Republic City across the bay on a foggy evening: towers with lit windows, an airship, and Aang's statue. */
export function republicCity(p: Press): Inscribe {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const water = h * 0.68;
  const sky = c.createLinearGradient(0, 0, 0, water);
  sky.addColorStop(0, hsl(222, 28, 22, 0.82));
  sky.addColorStop(1, hsl(205, 20, 48, 0.3));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, water + 4));
  if (p.r() < 0.7) airship(p, w * p.rr(0.3, 0.7), h * p.rr(0.12, 0.24), u * p.rr(0.1, 0.14));
  // Two rows of towers, the far one paler, each fading into the fog at its foot.
  towers(p, water - h * 0.05, h * 0.1, h * 0.32, 0.3, 0);
  mist(p, water - h * 0.06, h * 0.07, 0.65);
  const lit = towers(p, water, h * 0.08, h * 0.44, 0.72, 0.35);
  mist(p, water - h * 0.03, h * 0.05, 0.55);
  // The bay: a dark wash, ripples, and lamplight under the lit towers.
  const g = c.createLinearGradient(0, water, 0, h);
  g.addColorStop(0, hsl(208, 18, 36, 0.6));
  g.addColorStop(1, hsl(216, 22, 20, 0.85));
  fill(p, g, (k) => k.rect(-4, water, w + 8, h - water + 4));
  line(p, INK(0.35), 1, (k) => {
    for (let i = 0; i < 50; i++) {
      const rx = p.rr(-10, w);
      const ry = p.rr(water + 3, h);
      k.moveTo(rx, ry);
      k.lineTo(rx + u * p.rr(0.03, 0.1), ry);
    }
  });
  line(p, hsl(44, 80, 66, 0.5), Math.max(1, u * 0.006), (k) => {
    for (const [lx, lw] of lit)
      for (let y = water + 3; y < h; y += u * p.rr(0.02, 0.04)) {
        const rx = lx + p.rr(0, lw * 0.6);
        k.moveTo(rx, y);
        k.lineTo(rx + lw * p.rr(0.15, 0.4), y);
      }
  });
  const left = p.r() < 0.5;
  statue(p, w * (left ? 0.2 : 0.8), water + (h - water) * 0.62, h * 0.55);
  return { side: left ? 'right' : 'left', ink: GOLD };
}

/**
 * A row of towers on `foot`, `lo` to `hi` tall, in ink of strength `a`: flat tops, setbacks, spires and
 * tiled roofs. A share `lit` of them have lit windows; returns where those stand, as [x, width].
 */
function towers(p: Press, foot: number, lo: number, hi: number, a: number, lit: number): Pt[] {
  const { c, w } = p;
  const u = Math.min(p.w, p.h);
  const g = c.createLinearGradient(0, foot - hi, 0, foot);
  g.addColorStop(0, hsl(218, 18, 16, a));
  g.addColorStop(1, hsl(212, 14, 30, a * 0.35));
  const lights: [number, number, number, number][] = [];
  fill(p, g, (k) => {
    for (let x = -u * 0.02; x < w; ) {
      const bw = u * p.rr(0.05, 0.11);
      const bh = p.rr(lo, hi);
      const top = foot - bh;
      k.rect(x, top, bw, bh + 2);
      const kind = p.ri(0, 3);
      if (kind === 1) {
        k.rect(x + bw * 0.18, top - bw * 0.35, bw * 0.64, bw * 0.36);
        k.rect(x + bw * 0.34, top - bw * 0.6, bw * 0.32, bw * 0.26);
      } else if (kind === 2) {
        k.moveTo(x + bw * 0.3, top);
        k.lineTo(x + bw * 0.5, top - bw * 1.1);
        k.lineTo(x + bw * 0.7, top);
        k.closePath();
      } else if (kind === 3) {
        k.moveTo(x - bw * 0.15, top - bw * 0.05);
        k.quadraticCurveTo(x + bw * 0.1, top - bw * 0.12, x + bw * 0.25, top - bw * 0.35);
        k.lineTo(x + bw * 0.75, top - bw * 0.35);
        k.quadraticCurveTo(x + bw * 0.9, top - bw * 0.12, x + bw * 1.15, top - bw * 0.05);
        k.closePath();
      }
      if (p.r() < lit) lights.push([x, top, bw, bh]);
      x += bw * p.rr(0.85, 1.05);
    }
  });
  if (lights.length)
    fill(p, LAMP, (k) => {
      for (const [x, top, bw, bh] of lights)
        for (let y = top + bw * 0.25; y < top + bh * 0.7; y += bw * 0.22)
          for (let i = 0; i < 4; i++) if (p.r() < 0.35) k.rect(x + bw * (0.12 + i * 0.2), y, bw * 0.09, bw * 0.11);
    });
  return lights.map(([x, , bw]) => [x, bw]);
}

/** An airship in the haze, heading left or right. */
function airship(p: Press, x: number, y: number, s: number) {
  const d = p.r() < 0.5 ? 1 : -1;
  fill(p, hsl(214, 12, 38), (k) => k.ellipse(x, y, s, s * 0.22, 0, 0, TAU));
  line(p, INK(0.4), 1, (k) => k.ellipse(x, y, s, s * 0.22, 0, 0, TAU));
  // Tail fins above and below, and the gondola under the middle.
  fill(p, hsl(214, 14, 26), (k) => {
    for (const sy of [-1, 1]) {
      k.moveTo(x - d * s * 0.62, y + sy * s * 0.14);
      k.lineTo(x - d * s * 1.02, y + sy * s * 0.4);
      k.lineTo(x - d * s * 0.96, y + sy * s * 0.05);
      k.closePath();
    }
    k.rect(x - s * 0.22, y + s * 0.2, s * 0.4, s * 0.1);
  });
}

/** Aang's memorial statue, staff in hand, on its rock in the bay with lamps at its foot. */
function statue(p: Press, x: number, foot: number, s: number) {
  const { c } = p;
  const glow = c.createRadialGradient(x, foot - s * 0.3, 0, x, foot - s * 0.3, s * 0.5);
  glow.addColorStop(0, 'rgba(255,226,150,0.35)');
  glow.addColorStop(1, 'rgba(255,226,150,0)');
  fill(p, glow, (k) => k.arc(x, foot - s * 0.3, s * 0.5, 0, TAU));
  const rock: Trace = (k) => {
    k.moveTo(x - s * 0.5, foot);
    k.quadraticCurveTo(x - s * 0.38, foot - s * 0.13, x - s * 0.16, foot - s * 0.17);
    k.lineTo(x + s * 0.17, foot - s * 0.17);
    k.quadraticCurveTo(x + s * 0.4, foot - s * 0.12, x + s * 0.5, foot);
    k.closePath();
  };
  fill(p, hsl(214, 16, 20, 0.92), rock);
  within(p, rock, () =>
    line(p, INK(0.45), 1, (k) => {
      for (let i = 0; i < 14; i++) {
        const rx = x + p.rr(-0.4, 0.4) * s;
        const ry = foot - p.rr(0.02, 0.16) * s;
        k.moveTo(rx, ry);
        k.lineTo(rx + p.rr(-0.04, 0.04) * s, ry + s * 0.05);
      }
    }),
  );
  // The plinth in two steps, the robed figure and its head, lit from below.
  const stone = c.createLinearGradient(0, foot - s, 0, foot - s * 0.2);
  stone.addColorStop(0, hsl(196, 8, 50));
  stone.addColorStop(1, hsl(40, 20, 68));
  const ped = foot - s * 0.17;
  const base = ped - s * 0.14;
  const figure: Trace = (k) => {
    k.rect(x - s * 0.15, ped - s * 0.07, s * 0.3, s * 0.07);
    k.rect(x - s * 0.11, base, s * 0.22, s * 0.07);
    k.moveTo(x - s * 0.1, base);
    k.quadraticCurveTo(x - s * 0.075, base - s * 0.25, x - s * 0.075, base - s * 0.48);
    k.quadraticCurveTo(x, base - s * 0.53, x + s * 0.075, base - s * 0.48);
    k.quadraticCurveTo(x + s * 0.075, base - s * 0.25, x + s * 0.1, base);
    k.closePath();
    k.moveTo(x + s * 0.042, base - s * 0.57);
    k.arc(x, base - s * 0.57, s * 0.042, 0, TAU);
  };
  fill(p, stone, figure);
  line(p, INK(0.6), Math.max(1, s * 0.006), figure);
  // The sash across the robe and the sleeve of the arm that holds the staff.
  line(p, INK(0.45), Math.max(1, s * 0.006), (k) => {
    k.moveTo(x - s * 0.07, base - s * 0.45);
    k.lineTo(x + s * 0.08, base - s * 0.2);
    k.moveTo(x + s * 0.06, base - s * 0.46);
    k.quadraticCurveTo(x + s * 0.06, base - s * 0.36, x + s * 0.1, base - s * 0.33);
  });
  // The staff, with the glider's wings folded along its top.
  const sx = x + s * 0.11;
  line(p, INK(0.6), Math.max(1.5, s * 0.014), (k) => {
    k.moveTo(sx, base);
    k.lineTo(sx, base - s * 0.6);
  });
  const wings: Trace = (k) => {
    k.moveTo(sx, base - s * 0.76);
    k.quadraticCurveTo(sx + s * 0.032, base - s * 0.66, sx + s * 0.018, base - s * 0.5);
    k.lineTo(sx - s * 0.018, base - s * 0.5);
    k.quadraticCurveTo(sx - s * 0.032, base - s * 0.66, sx, base - s * 0.76);
    k.closePath();
  };
  fill(p, stone, wings);
  line(p, INK(0.6), Math.max(1, s * 0.006), wings);
  fill(p, stone, (k) => k.ellipse(sx - s * 0.01, base - s * 0.33, s * 0.025, s * 0.02, 0, 0, TAU));
  // Lamps along the island's shore.
  fill(p, hsl(44, 90, 72), (k) => {
    for (const t of [-0.36, -0.22, 0.22, 0.36]) {
      const lx = x + t * s;
      const ly = foot - s * 0.08;
      k.moveTo(lx + s * 0.008, ly);
      k.arc(lx, ly, Math.max(1, s * 0.008), 0, TAU);
    }
  });
}

/** Kuvira's colossus wading through the smoke over the city, its arm cannon lit with spirit energy. */
export function colossus(p: Press): Inscribe {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, hsl(22, 24, 38, 0.78));
  sky.addColorStop(0.6, hsl(28, 30, 60, 0.45));
  sky.addColorStop(1, hsl(30, 30, 70, 0.2));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, h + 8));
  // The giant is drawn in units of its height s, standing on the bottom edge; `arm` is the cannon's side.
  const arm = p.r() < 0.5 ? 1 : -1;
  const s = Math.min(h * 0.9, w * 1.02);
  const x = w / 2 - arm * s * 0.06;
  const top = h * 0.98 - s;
  const X = (d: number) => x + arm * d * s;
  const Y = (d: number) => top + d * s;
  const poly = (pts: Pt[]): Trace => (k) => {
    k.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (const [dx, dy] of pts.slice(1)) k.lineTo(X(dx), Y(dy));
    k.closePath();
  };
  // A segment from a to b, wa wide at a and wb wide at b.
  const limb = (a: Pt, b: Pt, wa: number, wb: number): Trace => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / l;
    const ny = (b[0] - a[0]) / l;
    return poly([
      [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
      [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
      [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
      [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
    ]);
  };
  // A low red sun behind the far shoulder, and smoke rising behind the giant.
  const sun = c.createRadialGradient(X(-0.2), Y(0.04), 0, X(-0.2), Y(0.04), s * 0.08);
  sun.addColorStop(0, hsl(8, 64, 52, 0.7));
  sun.addColorStop(0.75, hsl(8, 64, 52, 0.5));
  sun.addColorStop(1, hsl(8, 64, 52, 0));
  fill(p, sun, (k) => k.arc(X(-0.2), Y(0.04), s * 0.08, 0, TAU));
  for (let i = 0; i < 3; i++) plume(p, w * p.rr(0.1, 0.9), h * 0.85, u * p.rr(0.08, 0.13), [24, 10, 30], 0.22);
  const steel = c.createLinearGradient(0, Y(0), 0, Y(1));
  steel.addColorStop(0, hsl(200, 6, 30));
  steel.addColorStop(1, hsl(200, 6, 42));
  const plate = (t: Trace, ink: string | CanvasGradient = steel) => {
    fill(p, ink, t);
    line(p, INK(0.7), Math.max(1, s * 0.004), t);
  };
  // From the back: the far arm hanging, the legs mid-stride, hips, chest and helmet.
  plate(limb([-0.22, 0.21], [-0.245, 0.38], 0.085, 0.075));
  plate(limb([-0.245, 0.37], [-0.25, 0.53], 0.08, 0.09));
  plate(limb([-0.25, 0.52], [-0.25, 0.59], 0.095, 0.085));
  plate(limb([-0.09, 0.55], [-0.1, 0.75], 0.12, 0.1));
  plate(limb([-0.1, 0.74], [-0.11, 0.94], 0.1, 0.12));
  plate(poly([[-0.18, 0.93], [-0.03, 0.93], [-0.02, 1], [-0.19, 1]]));
  plate(limb([0.09, 0.55], [0.12, 0.74], 0.12, 0.1));
  plate(limb([0.12, 0.73], [0.14, 0.92], 0.1, 0.12));
  plate(poly([[0.06, 0.91], [0.22, 0.91], [0.23, 0.97], [0.05, 0.97]]));
  plate(poly([[-0.13, 0.48], [0.13, 0.48], [0.155, 0.57], [-0.155, 0.57]]));
  plate(poly([[-0.21, 0.17], [0.21, 0.17], [0.19, 0.31], [0.12, 0.5], [-0.12, 0.5], [-0.19, 0.31]]));
  plate(poly([[-0.055, 0.14], [0.055, 0.14], [0.06, 0.18], [-0.06, 0.18]]));
  plate((k) => {
    k.moveTo(X(-0.07), Y(0.15));
    k.lineTo(X(-0.082), Y(0.06));
    k.quadraticCurveTo(X(-0.078), Y(0), X(0), Y(0));
    k.quadraticCurveTo(X(0.078), Y(0), X(0.082), Y(0.06));
    k.lineTo(X(0.07), Y(0.15));
    k.closePath();
  });
  // Seams on the chest, the Earth Empire's mark, and the glowing visor.
  line(p, INK(0.45), Math.max(1, s * 0.004), (k) => {
    k.moveTo(X(0), Y(0.18));
    k.lineTo(X(0), Y(0.48));
    k.moveTo(X(-0.19), Y(0.31));
    k.lineTo(X(0.19), Y(0.31));
    k.moveTo(X(-0.14), Y(0.52));
    k.lineTo(X(0.14), Y(0.52));
    k.moveTo(X(0), Y(0.005));
    k.lineTo(X(0), Y(0.06));
  });
  line(p, hsl(150, 40, 48), Math.max(1, s * 0.006), (k) => {
    k.moveTo(X(-0.09) + s * 0.03, Y(0.245));
    k.arc(X(-0.09), Y(0.245), s * 0.03, 0, TAU);
    k.rect(Math.min(X(-0.105), X(-0.075)), Y(0.23), s * 0.03, s * 0.03);
  });
  fill(p, hsl(150, 80, 64), poly([[-0.055, 0.07], [0.055, 0.07], [0.055, 0.092], [-0.055, 0.092]]));
  // The shoulder guards, then the cannon arm across the front, aimed down at the city.
  for (const d of [-0.215, 0.215]) plate((k) => k.ellipse(X(d), Y(0.205), s * 0.085, s * 0.07, 0, 0, TAU));
  plate(limb([0.22, 0.21], [0.3, 0.35], 0.085, 0.075));
  plate(limb([0.29, 0.35], [0.41, 0.4], 0.08, 0.09));
  plate(limb([0.4, 0.4], [0.47, 0.43], 0.11, 0.1), hsl(200, 6, 24));
  line(p, 'rgba(150,255,190,0.45)', Math.max(1, s * 0.008), (k) => {
    k.moveTo(X(0.21), Y(0.18));
    k.lineTo(X(0.19), Y(0.31));
    k.lineTo(X(0.12), Y(0.49));
  });
  const mx = X(0.47);
  const my = Y(0.43);
  if (p.r() < 0.5) {
    // The beam, out to the edge of the painting.
    const ex = arm > 0 ? w + 10 : -10;
    const ey = my + Math.abs(ex - mx) * (0.03 / 0.07);
    const beam = c.createLinearGradient(mx, my, ex, ey);
    beam.addColorStop(0, 'rgba(200,255,220,0.9)');
    beam.addColorStop(1, 'rgba(90,230,150,0.25)');
    fill(p, beam, (k) => {
      k.moveTo(mx, my - s * 0.015);
      k.lineTo(ex, ey - s * 0.03);
      k.lineTo(ex, ey + s * 0.03);
      k.lineTo(mx, my + s * 0.015);
      k.closePath();
    });
  }
  const glow = c.createRadialGradient(mx, my, 0, mx, my, s * 0.12);
  glow.addColorStop(0, 'rgba(200,255,215,0.95)');
  glow.addColorStop(1, 'rgba(80,220,140,0)');
  fill(p, glow, (k) => k.arc(mx, my, s * 0.12, 0, TAU));
  // The city at its feet with fires burning, and smoke in front.
  const fires: Pt[] = [];
  fill(p, hsl(20, 12, 30, 0.9), (k) => {
    for (let bx = -u * 0.02; bx < w; ) {
      const bw = u * p.rr(0.05, 0.1);
      const bh = h * p.rr(0.05, 0.2);
      k.rect(bx, h - bh, bw, bh + 4);
      if (p.r() < 0.3) k.rect(bx + bw * 0.3, h - bh - bw * 0.4, bw * 0.4, bw * 0.4);
      if (p.r() < 0.2) fires.push([bx + bw / 2, h - bh]);
      bx += bw * p.rr(0.85, 1.05);
    }
  });
  for (const [fx, fy] of fires) {
    const f = c.createRadialGradient(fx, fy, 0, fx, fy, u * 0.06);
    f.addColorStop(0, 'rgba(255,160,70,0.75)');
    f.addColorStop(1, 'rgba(255,120,40,0)');
    fill(p, f, (k) => k.arc(fx, fy, u * 0.06, 0, TAU));
    plume(p, fx, fy - u * 0.04, u * 0.05, [22, 8, 26], 0.3);
  }
  for (let i = 0; i < 10; i++) puff(p, p.rr(0, w), h * p.rr(0.72, 0.98), u * p.rr(0.1, 0.22), [30, 18, 64], 0.45);
  mist(p, h * 0.82, h * 0.06, 0.5);
  return { side: arm > 0 ? 'left' : 'right' };
}

/** A column of smoke rising from (x, y): soft puffs that widen and thin as they climb. */
function plume(p: Press, x: number, y: number, s: number, ink: HSL, a: number) {
  for (let i = 0; i < 6; i++) puff(p, x + Math.sin(i * 1.3 + x) * s * 0.4, y - i * s * 0.9, s * (0.7 + i * 0.25), ink, a * (1 - i / 7));
}

function puff(p: Press, x: number, y: number, r: number, ink: HSL, a: number) {
  const g = p.c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, tone(ink, a));
  g.addColorStop(0.6, tone(ink, a * 0.6));
  g.addColorStop(1, tone(ink, 0));
  fill(p, g, (k) => k.arc(x, y, r, 0, TAU));
}
