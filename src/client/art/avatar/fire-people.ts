import { hsl, type HSL, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import type { Inscribe } from './ink';
import { CRIMSON, GOLDLEAF, INDIGO, KEY, block, bokashi, sun, tint, washiInk } from './woodblock';

/** Fire Nation portraits as ukiyo-e bust prints (okubi-e), in flat colour inside key lines: Prince Zuko, and Iroh with his tea. */

const SKIN: HSL = [30, 42, 84];
const HAIR = hsl(222, 20, 10);
const GREY = hsl(40, 8, 84);

/** Where the sitter goes: in the middle, or to one side of a wide print with room left for the cartouche. */
function place(p: Press) {
  const { w, h } = p;
  const wide = w > h * 1.3;
  const left = p.r() < 0.5;
  return { x: wide ? w * (left ? 0.36 : 0.64) : w / 2, hy: h * 0.42, r: Math.min(h * 0.15, w * 0.2), wide, left };
}
const cartoucheSide = (wide: boolean, left: boolean): Inscribe => ({ side: wide ? (left ? 'right' : 'left') : left ? 'left' : 'right' });

/** A smooth closed shape through `pts`, its curves turning at each point. */
function blob(k: CanvasRenderingContext2D, pts: Pt[]) {
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  k.moveTo(...mid(pts[pts.length - 1], pts[0]));
  pts.forEach((pt, i) => k.quadraticCurveTo(...pt, ...mid(pt, pts[(i + 1) % pts.length])));
  k.closePath();
}

/** Shoulders from the neck down past the bottom edge, `sw` wide each side. */
function shoulders(x: number, hy: number, r: number, sw: number, bottom: number): Trace {
  return (k) => {
    k.moveTo(x - r * 0.5, hy + r * 1.0);
    k.quadraticCurveTo(x - sw * 0.75, hy + r * 1.15, x - sw, hy + r * 1.85);
    k.lineTo(x - sw * 1.1, bottom);
    k.lineTo(x + sw * 1.1, bottom);
    k.lineTo(x + sw, hy + r * 1.85);
    k.quadraticCurveTo(x + sw * 0.75, hy + r * 1.15, x + r * 0.5, hy + r * 1.0);
    k.closePath();
  };
}

/** The robe's front, crossed over with a gold edge and a darker undershirt in the opening. */
function crossedFront(p: Press, body: Trace, x: number, hy: number, r: number, bottom: number, under: string) {
  within(p, body, () => {
    fill(p, under, (k) => {
      k.moveTo(x - r * 0.5, hy + r * 1.0);
      k.lineTo(x + r * 0.05, hy + r * 2.3);
      k.lineTo(x + r * 0.5, hy + r * 1.0);
      k.closePath();
    });
    line(p, GOLDLEAF, Math.max(1.5, r * 0.12), (k) => {
      k.moveTo(x - r * 0.56, hy + r * 1.0);
      k.lineTo(x + r * 0.08, hy + r * 2.35);
      k.moveTo(x + r * 0.56, hy + r * 1.0);
      k.lineTo(x - r * 0.25, hy + r * 2.7);
      k.lineTo(x - r * 0.25, bottom);
    });
  });
}

/** An almond eye with a gold iris, the upper lid in a firm line; `open` narrows it. */
function eye(p: Press, ex: number, ey: number, r: number, open = 1) {
  const shape: Trace = (k) => {
    k.moveTo(ex - r, ey);
    k.quadraticCurveTo(ex, ey - r * 0.7 * open, ex + r, ey);
    k.quadraticCurveTo(ex, ey + r * 0.45 * open, ex - r, ey);
    k.closePath();
  };
  fill(p, hsl(40, 30, 96), shape);
  within(p, shape, () => {
    fill(p, hsl(42, 80, 50), (k) => k.arc(ex, ey - r * 0.04, r * 0.44, 0, TAU));
    fill(p, KEY, (k) => k.arc(ex, ey - r * 0.04, r * 0.2, 0, TAU));
  });
  line(p, KEY, Math.max(1.2, r * 0.16), (k) => {
    k.moveTo(ex - r * 1.05, ey + r * 0.05);
    k.quadraticCurveTo(ex, ey - r * 0.75 * open, ex + r * 1.05, ey);
  });
}

/** Prince Zuko: his topknot and the gold flame of the crown prince, dark fringe, the scar over his left eye, high red collar. */
export function zuko(p: Press): Inscribe {
  const { w, h } = p;
  const { x, hy, r, wide, left } = place(p);
  const outline = Math.max(1.2, r * 0.025);
  // A dark ground dusted like mica, and a red sun behind his head.
  bokashi(p, 0, h + 4, hsl(232, 16, 14), hsl(352, 34, 18));
  fill(p, 'rgba(255,236,210,0.08)', (k) => {
    for (let i = 0; i < 180; i++) {
      const gx = p.rr(0, w);
      const gy = p.rr(0, h);
      const gr = p.rr(0.4, 1.1);
      k.moveTo(gx + gr, gy);
      k.arc(gx, gy, gr, 0, TAU);
    }
  });
  sun(p, x, hy - r * 0.15, r * 1.85);
  // The tunic and its shoulder guards, black rimmed with gold.
  const sw = r * 2.2;
  const body = shoulders(x, hy, r, sw, h + 4);
  block(p, CRIMSON, body, outline);
  crossedFront(p, body, x, hy, r, h + 4, hsl(352, 40, 20));
  for (const m of [-1, 1]) {
    block(p, hsl(352, 30, 13), (k) => {
      k.moveTo(x + m * r * 0.78, hy + r * 1.12);
      k.quadraticCurveTo(x + m * sw * 0.92, hy + r * 1.08, x + m * sw * 1.08, hy + r * 2.0);
      k.quadraticCurveTo(x + m * sw * 0.85, hy + r * 2.22, x + m * sw * 0.6, hy + r * 2.05);
      k.quadraticCurveTo(x + m * sw * 0.58, hy + r * 1.5, x + m * r * 0.78, hy + r * 1.12);
      k.closePath();
    }, outline);
    line(p, GOLDLEAF, Math.max(1, r * 0.045), (k) => {
      k.moveTo(x + m * r * 0.86, hy + r * 1.2);
      k.quadraticCurveTo(x + m * sw * 0.86, hy + r * 1.2, x + m * sw * 0.98, hy + r * 1.94);
    });
  }
  // Neck, and the standing collar round it.
  fill(p, tint(SKIN, 1, -12), (k) => k.rect(x - r * 0.3, hy + r * 0.55, r * 0.6, r * 0.45));
  block(p, hsl(352, 30, 13), (k) => {
    k.moveTo(x - r * 0.4, hy + r * 0.74);
    k.lineTo(x - r * 0.54, hy + r * 1.1);
    k.quadraticCurveTo(x, hy + r * 1.24, x + r * 0.54, hy + r * 1.1);
    k.lineTo(x + r * 0.4, hy + r * 0.74);
    k.quadraticCurveTo(x, hy + r * 0.86, x - r * 0.4, hy + r * 0.74);
    k.closePath();
  }, outline);
  line(p, GOLDLEAF, Math.max(1, r * 0.04), (k) => {
    k.moveTo(x - r * 0.52, hy + r * 1.04);
    k.quadraticCurveTo(x, hy + r * 1.17, x + r * 0.52, hy + r * 1.04);
  });
  // Ears (the scarred one burnt too), then the face.
  const SCAR = hsl(6, 48, 64);
  for (const m of [-1, 1]) block(p, m > 0 ? SCAR : tint(SKIN, 1, -4), (k) => k.ellipse(x + m * r * 0.74, hy + r * 0.06, r * 0.12, r * 0.2, m * 0.2, 0, TAU), outline);
  const face: Trace = (k) => {
    k.moveTo(x, hy - r * 0.98);
    k.bezierCurveTo(x + r * 0.62, hy - r * 0.98, x + r * 0.8, hy - r * 0.4, x + r * 0.74, hy + r * 0.12);
    k.bezierCurveTo(x + r * 0.68, hy + r * 0.55, x + r * 0.35, hy + r * 0.95, x, hy + r * 0.98);
    k.bezierCurveTo(x - r * 0.35, hy + r * 0.95, x - r * 0.68, hy + r * 0.55, x - r * 0.74, hy + r * 0.12);
    k.bezierCurveTo(x - r * 0.8, hy - r * 0.4, x - r * 0.62, hy - r * 0.98, x, hy - r * 0.98);
    k.closePath();
  };
  fill(p, tint(SKIN), face);
  // The scar: a burn round his left eye, from the brow back to the ear.
  const scar: Pt[] = (
    [
      [0.08, -0.12],
      [0.14, -0.4],
      [0.34, -0.52],
      [0.58, -0.46],
      [0.8, -0.24],
      [0.84, 0.08],
      [0.66, 0.26],
      [0.42, 0.2],
      [0.22, 0.13],
    ] as Pt[]
  ).map(([sx, sy]) => [x + sx * r, hy + sy * r]);
  within(p, face, () => {
    fill(p, SCAR, (k) => blob(k, scar));
    line(p, hsl(4, 40, 52), Math.max(1, r * 0.02), (k) => {
      k.moveTo(x + r * 0.2, hy - r * 0.32);
      k.quadraticCurveTo(x + r * 0.45, hy - r * 0.42, x + r * 0.66, hy - r * 0.3);
      k.moveTo(x + r * 0.5, hy + r * 0.14);
      k.quadraticCurveTo(x + r * 0.66, hy + r * 0.12, x + r * 0.74, hy - r * 0.02);
    });
  });
  line(p, KEY, outline, face);
  // Eyes: the good one stern under a heavy brow, the scarred one narrowed and browless.
  eye(p, x - r * 0.33, hy - r * 0.1, r * 0.17, 0.85);
  eye(p, x + r * 0.35, hy - r * 0.08, r * 0.15, 0.45);
  block(p, HAIR, (k) => {
    k.moveTo(x - r * 0.12, hy - r * 0.24);
    k.quadraticCurveTo(x - r * 0.34, hy - r * 0.36, x - r * 0.58, hy - r * 0.36);
    k.quadraticCurveTo(x - r * 0.36, hy - r * 0.3, x - r * 0.14, hy - r * 0.19);
    k.closePath();
  }, 1);
  line(p, tint(SKIN, 0.9, -30), Math.max(1, r * 0.022), (k) => {
    k.moveTo(x - r * 0.02, hy - r * 0.12);
    k.quadraticCurveTo(x - r * 0.06, hy + r * 0.2, x + r * 0.04, hy + r * 0.3);
    k.quadraticCurveTo(x + r * 0.12, hy + r * 0.32, x + r * 0.12, hy + r * 0.26);
  });
  line(p, hsl(356, 40, 40), Math.max(1.2, r * 0.035), (k) => {
    k.moveTo(x - r * 0.2, hy + r * 0.56);
    k.quadraticCurveTo(x, hy + r * 0.52, x + r * 0.2, hy + r * 0.57);
  });
  // Hair: drawn back to the topknot and the crown's gold flame, with a ragged fringe over his brow.
  const cap: Trace = (k) => {
    k.moveTo(x - r * 0.8, hy - r * 0.05);
    k.bezierCurveTo(x - r * 0.95, hy - r * 1.42, x + r * 0.95, hy - r * 1.42, x + r * 0.8, hy - r * 0.05);
    k.quadraticCurveTo(x + r * 0.72, hy - r * 0.45, x + r * 0.55, hy - r * 0.6);
    k.quadraticCurveTo(x, hy - r * 0.72, x - r * 0.55, hy - r * 0.6);
    k.quadraticCurveTo(x - r * 0.72, hy - r * 0.45, x - r * 0.8, hy - r * 0.05);
    k.closePath();
  };
  fill(p, HAIR, (k) => {
    cap(k);
    for (const [lx, ty] of [
      [-0.62, 0.02],
      [-0.4, -0.2],
      [-0.16, -0.3],
      [0.1, -0.27],
      [0.36, -0.22],
      [0.6, 0.04],
    ]) {
      // Each lock runs the same way round as the cap, so where they overlap they fill as one.
      k.moveTo(x + (lx + 0.17) * r, hy - r * 0.75);
      k.quadraticCurveTo(x + (lx + 0.05) * r, hy - r * 0.38, x + lx * 1.05 * r, hy + ty * r);
      k.quadraticCurveTo(x + (lx - 0.06) * r, hy - r * 0.38, x + (lx - 0.17) * r, hy - r * 0.75);
      k.closePath();
    }
    k.moveTo(x + r * 0.22, hy - r * 1.1);
    k.arc(x, hy - r * 1.1, r * 0.22, 0, TAU);
  });
  within(p, cap, () =>
    line(p, 'rgba(150,160,190,0.3)', Math.max(1, r * 0.015), (k) => {
      for (const m of [-1, 1])
        for (let i = 0; i < 3; i++) {
          k.moveTo(x + m * r * (0.12 + i * 0.2), hy - r * 1.02);
          k.quadraticCurveTo(x + m * r * (0.2 + i * 0.22), hy - r * 0.9, x + m * r * (0.3 + i * 0.18), hy - r * 0.68);
        }
    }),
  );
  const cy = hy - r * 1.06;
  const g = p.c.createLinearGradient(x - r * 0.2, 0, x + r * 0.2, 0);
  g.addColorStop(0, hsl(40, 70, 44));
  g.addColorStop(0.45, hsl(48, 90, 72));
  g.addColorStop(1, hsl(40, 70, 42));
  block(p, g, (k) => {
    k.moveTo(x - r * 0.15, cy);
    k.quadraticCurveTo(x - r * 0.23, cy - r * 0.2, x - r * 0.13, cy - r * 0.32);
    k.quadraticCurveTo(x - r * 0.11, cy - r * 0.2, x - r * 0.05, cy - r * 0.18);
    k.quadraticCurveTo(x - r * 0.08, cy - r * 0.34, x, cy - r * 0.48);
    k.quadraticCurveTo(x + r * 0.08, cy - r * 0.34, x + r * 0.05, cy - r * 0.18);
    k.quadraticCurveTo(x + r * 0.11, cy - r * 0.2, x + r * 0.13, cy - r * 0.32);
    k.quadraticCurveTo(x + r * 0.23, cy - r * 0.2, x + r * 0.15, cy);
    k.closePath();
  }, outline);
  line(p, hsl(30, 20, 70), Math.max(1.2, r * 0.035), (k) => {
    k.moveTo(x - r * 0.3, cy - r * 0.12);
    k.lineTo(x + r * 0.3, cy - r * 0.12);
  });
  return cartoucheSide(wide, left);
}

/** Iroh in red and gold: white topknot and great grey beard, bushy brows, eyes creased with a smile, a cup of tea in his hands. */
export function iroh(p: Press): Inscribe {
  const { c, w, h } = p;
  const { x, hy, r, wide, left } = place(p);
  const outline = Math.max(1.2, r * 0.025);
  // A jade ground, and the White Lotus behind his head: eight broad petals, eight narrow ones between, in a pale ring.
  bokashi(p, 0, h + 4, hsl(162, 24, 40), hsl(150, 22, 22));
  const lr = r * 1.9;
  const ly = hy - r * 0.1;
  fill(p, washiInk(0.12), (k) => k.arc(x, ly, lr, 0, TAU));
  line(p, washiInk(0.4), Math.max(1, r * 0.03), (k) => k.arc(x, ly, lr * 0.98, 0, TAU));
  const petals = (k: CanvasRenderingContext2D, turn: number, r1: number, half: number) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + turn;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const r0 = lr * 0.2;
      const rm = (r0 + r1) / 2;
      k.moveTo(x + ca * r0, ly + sa * r0);
      k.quadraticCurveTo(x + ca * rm - sa * half, ly + sa * rm + ca * half, x + ca * r1, ly + sa * r1);
      k.quadraticCurveTo(x + ca * rm + sa * half, ly + sa * rm - ca * half, x + ca * r0, ly + sa * r0);
      k.closePath();
    }
  };
  fill(p, washiInk(0.55), (k) => petals(k, Math.PI / 8, lr * 0.78, lr * 0.16));
  fill(p, washiInk(0.85), (k) => petals(k, 0, lr * 0.92, lr * 0.3));
  line(p, 'rgba(30,60,50,0.35)', Math.max(1, r * 0.02), (k) => petals(k, 0, lr * 0.92, lr * 0.3));
  // The robe: red, crossed over with a gold edge.
  const ROBE = hsl(356, 50, 40);
  const sw = r * 2.5;
  const body = shoulders(x, hy, r, sw, h + 4);
  block(p, ROBE, body, outline);
  crossedFront(p, body, x, hy, r, h + 4, hsl(352, 44, 24));
  fill(p, tint(SKIN, 1, -12), (k) => k.rect(x - r * 0.34, hy + r * 0.55, r * 0.68, r * 0.45));
  // Big ears, the round face, rosy cheeks.
  for (const m of [-1, 1]) block(p, tint(SKIN, 1, -4), (k) => k.ellipse(x + m * r * 0.8, hy + r * 0.04, r * 0.15, r * 0.24, m * 0.2, 0, TAU), outline);
  const face: Trace = (k) => k.ellipse(x, hy, r * 0.82, r * 0.92, 0, 0, TAU);
  block(p, tint(SKIN), face, outline);
  for (const m of [-1, 1]) {
    const bx = x + m * r * 0.44;
    const by = hy + r * 0.22;
    const g = c.createRadialGradient(bx, by, 0, bx, by, r * 0.24);
    g.addColorStop(0, 'rgba(230,110,100,0.4)');
    g.addColorStop(1, 'rgba(230,110,100,0)');
    fill(p, g, (k) => k.arc(bx, by, r * 0.24, 0, TAU));
  }
  // Eyes creased shut with smiling, lines at their corners, and the lines of his brow.
  line(p, KEY, Math.max(1.2, r * 0.04), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.18, hy - r * 0.04);
      k.quadraticCurveTo(x + m * r * 0.32, hy - r * 0.16, x + m * r * 0.46, hy - r * 0.04);
    }
  });
  line(p, tint(SKIN, 0.9, -34), Math.max(1, r * 0.018), (k) => {
    for (const m of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        k.moveTo(x + m * r * 0.5, hy - r * (0.08 - i * 0.06));
        k.lineTo(x + m * r * 0.62, hy - r * (0.12 - i * 0.1));
      }
      k.moveTo(x + m * r * 0.2, hy + r * 0.06);
      k.quadraticCurveTo(x + m * r * 0.32, hy + r * 0.12, x + m * r * 0.44, hy + r * 0.06);
    }
    for (let i = 0; i < 2; i++) {
      k.moveTo(x - r * 0.3, hy - r * (0.52 + i * 0.1));
      k.quadraticCurveTo(x, hy - r * (0.58 + i * 0.1), x + r * 0.3, hy - r * (0.52 + i * 0.1));
    }
  });
  // The broad nose.
  line(p, tint(SKIN, 0.9, -34), Math.max(1.2, r * 0.025), (k) => {
    k.moveTo(x - r * 0.04, hy - r * 0.02);
    k.quadraticCurveTo(x - r * 0.1, hy + r * 0.2, x - r * 0.16, hy + r * 0.3);
    k.quadraticCurveTo(x - r * 0.12, hy + r * 0.4, x, hy + r * 0.38);
    k.quadraticCurveTo(x + r * 0.12, hy + r * 0.4, x + r * 0.16, hy + r * 0.3);
  });
  // Hair swept back to a topknot, sideburns running down into the great beard, the moustache, his smile.
  fill(p, GREY, (k) => {
    k.moveTo(x - r * 0.8, hy - r * 0.2);
    k.bezierCurveTo(x - r * 0.95, hy - r * 1.4, x + r * 0.95, hy - r * 1.4, x + r * 0.8, hy - r * 0.2);
    k.quadraticCurveTo(x + r * 0.7, hy - r * 0.6, x + r * 0.4, hy - r * 0.76);
    k.quadraticCurveTo(x, hy - r * 0.84, x - r * 0.4, hy - r * 0.76);
    k.quadraticCurveTo(x - r * 0.7, hy - r * 0.6, x - r * 0.8, hy - r * 0.2);
    k.closePath();
    k.moveTo(x + r * 0.2, hy - r * 1.08);
    k.arc(x, hy - r * 1.08, r * 0.2, 0, TAU);
  });
  line(p, GOLDLEAF, Math.max(1.2, r * 0.05), (k) => {
    k.moveTo(x - r * 0.2, hy - r * 0.98);
    k.lineTo(x + r * 0.2, hy - r * 0.98);
  });
  const beard: Trace = (k) => {
    k.moveTo(x - r * 0.8, hy - r * 0.3);
    k.bezierCurveTo(x - r * 0.95, hy + r * 0.5, x - r * 0.6, hy + r * 1.35, x, hy + r * 1.42);
    k.bezierCurveTo(x + r * 0.6, hy + r * 1.35, x + r * 0.95, hy + r * 0.5, x + r * 0.8, hy - r * 0.3);
    k.lineTo(x + r * 0.68, hy - r * 0.26);
    k.quadraticCurveTo(x + r * 0.62, hy + r * 0.3, x + r * 0.34, hy + r * 0.64);
    k.quadraticCurveTo(x, hy + r * 0.8, x - r * 0.34, hy + r * 0.64);
    k.quadraticCurveTo(x - r * 0.62, hy + r * 0.3, x - r * 0.68, hy - r * 0.26);
    k.closePath();
  };
  block(p, GREY, beard, outline);
  line(p, 'rgba(110,110,120,0.4)', Math.max(1, r * 0.018), (k) => {
    for (let i = -3; i <= 3; i++) {
      k.moveTo(x + i * r * 0.15, hy + r * 0.82);
      k.quadraticCurveTo(x + i * r * 0.19, hy + r * 1.1, x + i * r * 0.13, hy + r * 1.32);
    }
  });
  line(p, hsl(356, 40, 34), Math.max(1.2, r * 0.035), (k) => {
    k.moveTo(x - r * 0.18, hy + r * 0.6);
    k.quadraticCurveTo(x, hy + r * 0.7, x + r * 0.18, hy + r * 0.6);
  });
  block(p, GREY, (k) => {
    k.moveTo(x, hy + r * 0.42);
    k.quadraticCurveTo(x - r * 0.3, hy + r * 0.4, x - r * 0.46, hy + r * 0.66);
    k.quadraticCurveTo(x - r * 0.24, hy + r * 0.54, x, hy + r * 0.56);
    k.quadraticCurveTo(x + r * 0.24, hy + r * 0.54, x + r * 0.46, hy + r * 0.66);
    k.quadraticCurveTo(x + r * 0.3, hy + r * 0.4, x, hy + r * 0.42);
    k.closePath();
  }, outline);
  // Bushy brows, swept up at the ends.
  block(p, GREY, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.1, hy - r * 0.22);
      k.quadraticCurveTo(x + m * r * 0.36, hy - r * 0.4, x + m * r * 0.68, hy - r * 0.42);
      k.lineTo(x + m * r * 0.58, hy - r * 0.32);
      k.quadraticCurveTo(x + m * r * 0.36, hy - r * 0.26, x + m * r * 0.12, hy - r * 0.16);
      k.closePath();
    }
  }, 1);
  // His sleeves coming in to the cup he holds in both hands, steam rising off it.
  const cupY = hy + r * 1.95;
  for (const m of [-1, 1])
    block(p, ROBE, (k) => {
      k.moveTo(x + m * sw * 0.95, hy + r * 1.9);
      k.quadraticCurveTo(x + m * sw * 0.7, cupY + r * 0.1, x + m * r * 0.5, cupY - r * 0.06);
      k.lineTo(x + m * r * 0.52, cupY + r * 0.46);
      k.quadraticCurveTo(x + m * sw * 0.8, cupY + r * 0.6, x + m * sw * 1.1, hy + r * 3.2);
      k.closePath();
    }, outline);
  line(p, GOLDLEAF, Math.max(1.5, r * 0.1), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.56, cupY - r * 0.06);
      k.lineTo(x + m * r * 0.58, cupY + r * 0.44);
    }
  });
  const cup: Trace = (k) => {
    k.moveTo(x - r * 0.27, cupY - r * 0.12);
    k.quadraticCurveTo(x - r * 0.26, cupY + r * 0.24, x - r * 0.12, cupY + r * 0.28);
    k.lineTo(x + r * 0.12, cupY + r * 0.28);
    k.quadraticCurveTo(x + r * 0.26, cupY + r * 0.24, x + r * 0.27, cupY - r * 0.12);
    k.closePath();
  };
  block(p, washiInk(), cup, outline);
  line(p, INDIGO, Math.max(1, r * 0.04), (k) => {
    k.moveTo(x - r * 0.26, cupY + r * 0.02);
    k.quadraticCurveTo(x, cupY + r * 0.06, x + r * 0.26, cupY + r * 0.02);
  });
  block(p, hsl(36, 60, 50), (k) => k.ellipse(x, cupY - r * 0.12, r * 0.27, r * 0.06, 0, 0, TAU), 1);
  for (const m of [-1, 1]) {
    const hand: Trace = (k) => k.ellipse(x + m * r * 0.34, cupY + r * 0.12, r * 0.17, r * 0.24, m * -0.3, 0, TAU);
    block(p, tint(SKIN, 1, -4), hand, outline);
    line(p, tint(SKIN, 0.9, -34), Math.max(1, r * 0.018), (k) => {
      for (let i = 0; i < 3; i++) {
        k.moveTo(x + m * r * 0.24, cupY + r * (0.02 + i * 0.09));
        k.lineTo(x + m * r * 0.4, cupY + r * (0.05 + i * 0.09));
      }
    });
  }
  line(p, washiInk(0.6), Math.max(1, r * 0.025), (k) => {
    for (let i = -1; i <= 1; i++) {
      const sx = x + i * r * 0.1;
      k.moveTo(sx, cupY - r * 0.2);
      k.bezierCurveTo(sx + r * 0.08, cupY - r * 0.32, sx - r * 0.08, cupY - r * 0.44, sx + r * 0.02, cupY - r * 0.58);
    }
  });
  // The teapot on the table's edge beside him.
  const table = h - r * 0.12;
  block(p, hsl(24, 34, 22), (k) => k.rect(-4, table, w + 8, h - table + 4), outline);
  const pot = left ? 1 : -1;
  const tx = Math.max(w * 0.14, Math.min(w * 0.86, x + pot * sw * 1.2));
  const tr = r * 0.42;
  const ty = table - tr * 0.72;
  const CLAY = hsl(16, 40, 36);
  line(p, KEY, Math.max(2, tr * 0.16) + 2.4, (k) => k.ellipse(tx + pot * tr * 1.05, ty - tr * 0.05, tr * 0.32, tr * 0.42, 0, 0, TAU));
  line(p, CLAY, Math.max(2, tr * 0.16), (k) => k.ellipse(tx + pot * tr * 1.05, ty - tr * 0.05, tr * 0.32, tr * 0.42, 0, 0, TAU));
  block(p, CLAY, (k) => {
    k.moveTo(tx - pot * tr * 0.8, ty + tr * 0.1);
    k.quadraticCurveTo(tx - pot * tr * 1.25, ty - tr * 0.1, tx - pot * tr * 1.45, ty - tr * 0.6);
    k.lineTo(tx - pot * tr * 1.3, ty - tr * 0.62);
    k.quadraticCurveTo(tx - pot * tr * 1.1, ty - tr * 0.3, tx - pot * tr * 0.75, ty - tr * 0.3);
    k.closePath();
  }, outline);
  block(p, CLAY, (k) => k.ellipse(tx, ty, tr, tr * 0.72, 0, 0, TAU), outline);
  block(p, tint([16, 40, 36], 1, 8), (k) => k.ellipse(tx, ty - tr * 0.66, tr * 0.45, tr * 0.14, 0, 0, TAU), outline);
  block(p, tint([16, 40, 36], 1, 8), (k) => k.arc(tx, ty - tr * 0.84, tr * 0.12, 0, TAU), outline);
  return cartoucheSide(wide, left);
}
