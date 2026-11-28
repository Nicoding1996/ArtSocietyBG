import { type HSL, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import { CINNABAR, GOLD, LEAD, SEPIA, airMark, cloudHeap, col, curl, halo, lotus, peak, shaded, sky } from './thangka';

/** Charts and mandalas: Guru Pathik's seven chakras, the Avatar cycle, and the Air Nomads' emblem worked large. */

const NIGHT_RIM: HSL = [214, 30, 40];

/** A point `r` out from (x, y) at angle `a`. */
const polar = (x: number, y: number, a: number, r: number): Pt => [x + Math.cos(a) * r, y + Math.sin(a) * r];

/** A ring of `n` pointed petals round (x, y), their feet at radius r0 and their tips at r1, turned by `turn`: one path for them all. */
function petalRing(x: number, y: number, r0: number, r1: number, n: number, turn = 0, fat = 0.55): Trace {
  const spread = Math.min(0.5, (TAU / n) * fat);
  return (k) => {
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * TAU - Math.PI / 2;
      k.moveTo(...polar(x, y, a - spread, r0));
      k.quadraticCurveTo(...polar(x, y, a - spread * 0.7, r0 + (r1 - r0) * 0.9), ...polar(x, y, a, r1));
      k.quadraticCurveTo(...polar(x, y, a + spread * 0.7, r0 + (r1 - r0) * 0.9), ...polar(x, y, a + spread, r0));
      k.closePath();
    }
  };
}

/** Clouds in the four corners, and along the sides of a long painting. */
function cornerClouds(p: Press, rim: HSL) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const s = u * 0.15;
  for (const [cx, cy, f] of [
    [s * 0.6, h * 0.1, 1],
    [w - s * 0.6, h * 0.12, -1],
    [s * 0.7, h * 0.92, -1],
    [w - s * 0.7, h * 0.9, 1],
  ])
    cloudHeap(p, cx, cy, s, rim, f);
  if (h > w * 1.4) for (const m of [-1, 1]) cloudHeap(p, w / 2 + m * w * 0.3, h * (m > 0 ? 0.3 : 0.7), s * 0.8, rim, m);
}

/** The seven chakras from the root of the spine to the crown, as Guru Pathik named them, each in its colour with its count of petals. */
const CHAKRAS: { ink: HSL; petals: number }[] = [
  { ink: [4, 74, 48], petals: 4 }, // Earth: survival, blocked by fear
  { ink: [24, 84, 52], petals: 6 }, // Water: pleasure, blocked by guilt
  { ink: [46, 88, 54], petals: 10 }, // Fire: willpower, blocked by shame
  { ink: [136, 44, 44], petals: 12 }, // Air: love, blocked by grief
  { ink: [200, 66, 50], petals: 16 }, // Sound: truth, blocked by lies
  { ink: [232, 46, 56], petals: 2 }, // Light: insight, blocked by illusion
  { ink: [282, 40, 64], petals: 20 }, // Thought: cosmic energy, blocked by earthly attachment
];

/** One chakra at (x, y), `r` out to its petal tips: a glow, petals in its colour edged in gold, a bright disc in the middle. */
function wheel(p: Press, x: number, y: number, r: number, ink: HSL, petals: number) {
  const g = p.c.createRadialGradient(x, y, 0, x, y, r * 1.8);
  g.addColorStop(0, col(ink, 0.5, 20));
  g.addColorStop(1, col(ink, 0, 20));
  fill(p, g, (k) => k.arc(x, y, r * 1.8, 0, TAU));
  const lw = Math.max(1, r * 0.06);
  if (petals === 2)
    // The brow's two petals spread out like wings.
    shaded(p, ink, (k) => {
      for (const m of [-1, 1]) {
        k.moveTo(x + m * r * 0.3, y - r * 0.24);
        k.quadraticCurveTo(x + m * r * 1.3, y - r * 0.9, x + m * r * 1.6, y);
        k.quadraticCurveTo(x + m * r * 1.3, y + r * 0.9, x + m * r * 0.3, y + r * 0.24);
        k.closePath();
      }
    }, r * 0.3, GOLD, lw);
  else shaded(p, ink, petalRing(x, y, r * 0.42, r, petals), r * 0.2, GOLD, lw);
  const disc: Trace = (k) => k.arc(x, y, r * 0.5, 0, TAU);
  const dg = p.c.createRadialGradient(x, y, 0, x, y, r * 0.5);
  dg.addColorStop(0, col(ink, 1, 26));
  dg.addColorStop(1, col(ink, 1, -8));
  fill(p, dg, disc);
  line(p, GOLD, lw, disc);
  fill(p, col(LEAD), (k) => k.arc(x, y, r * 0.12, 0, TAU));
}

/**
 * Guru Pathik's chart of the seven chakras as a black thangka: the haloes of one sitting in meditation left
 * empty over a lotus seat, three channels rising through them, each chakra a wheel of petals in its colour.
 */
export function chakras(p: Press) {
  const { w, h } = p;
  sky(p, 0, h, col([226, 34, 13]), col([16, 34, 11]));
  const H = Math.min(h * 0.86, w * 1.5);
  const x = w / 2;
  const base = h / 2 + H * 0.42;
  // The Eastern Temple's peaks either side of a long painting, clouds in the corners.
  const side = (w - H * 0.62) / 2;
  if (side > H * 0.3)
    for (const m of [-1, 1]) {
      const px = x + m * (H * 0.31 + side * 0.5);
      peak(p, px, h + 4, Math.min(side * 1.2, H * 0.7), H * 0.62, [200, 22, 30]);
      lotus(p, px + m * side * 0.12, h * 0.94, H * 0.16);
    }
  cornerClouds(p, NIGHT_RIM);
  // Rays fanning from the crown, then the haloes, then the lotus seat.
  const ys = [0.07, 0.18, 0.3, 0.43, 0.57, 0.71, 0.86].map((t) => base - H * t);
  line(p, col([44, 80, 66], 0.5), Math.max(1, H * 0.003), (k) => {
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (1.1 + (0.8 * i) / 16);
      k.moveTo(...polar(x, ys[6], a, H * 0.1));
      k.lineTo(...polar(x, ys[6], a, H * 0.18));
    }
  });
  halo(p, x, base - H * 0.3, H * 0.3, [196, 40, 30]);
  halo(p, x, base - H * 0.7, H * 0.14, [150, 36, 32]);
  lotus(p, x, base + H * 0.03, H * 0.5);
  // The red and the white channels winding up either side of the gold one, crossing at every wheel.
  const amp = H * 0.045;
  for (const [ink, m] of [
    [col(CINNABAR, 1, 8), 1],
    [col(LEAD), -1],
  ] as [string, number][])
    line(p, ink, Math.max(1, H * 0.007), (k) => {
      k.moveTo(x, ys[0]);
      for (let i = 1; i < ys.length; i++) k.quadraticCurveTo(x + m * amp * (i % 2 ? 2 : -2), (ys[i - 1] + ys[i]) / 2, x, ys[i]);
    });
  line(p, GOLD, Math.max(1.5, H * 0.01), (k) => {
    k.moveTo(x, ys[0]);
    k.lineTo(x, ys[6]);
  });
  ys.forEach((y, i) => wheel(p, x, y, H * (i === 6 ? 0.07 : i === 5 ? 0.04 : 0.048), CHAKRAS[i].ink, CHAKRAS[i].petals));
}

/** The four nations round the Avatar cycle, clockwise from the top, in the colours of the game's borders. */
const NATIONS: { ink: HSL; mark: 'air' | 'water' | 'earth' | 'fire' }[] = [
  { ink: [40, 68, 55], mark: 'air' },
  { ink: [213, 58, 56], mark: 'water' },
  { ink: [132, 31, 51], mark: 'earth' },
  { ink: [346, 56, 57], mark: 'fire' },
];

/** A nation's mark in white inside a ring, `s` its radius: the three winds, moon over waves, the earth's square, a flame. */
function nationMark(p: Press, mark: string, x: number, y: number, s: number) {
  const ink = col(LEAD);
  const lw = Math.max(1, s * 0.13);
  if (mark === 'air') return airMark(p, x, y, s, ink, lw);
  line(p, ink, lw, (k) => k.arc(x, y, s, 0, TAU));
  if (mark === 'water')
    line(p, ink, lw, (k) => {
      k.arc(x, y - s * 0.5, s * 0.36, Math.PI * 0.12, Math.PI * 0.88);
      for (const dy of [0.1, 0.42]) {
        k.moveTo(x - s * 0.62, y + s * dy);
        for (let i = 1; i <= 3; i++) k.quadraticCurveTo(x - s * 0.62 + s * 0.41 * (i - 0.5), y + s * (dy - 0.18), x - s * 0.62 + s * 0.41 * i, y + s * dy);
      }
    });
  else if (mark === 'earth')
    line(p, ink, lw, (k) => {
      const q = s * 0.5;
      k.moveTo(x - q, y - q * 0.8);
      k.quadraticCurveTo(x, y - q * 1.1, x + q, y - q * 0.8);
      k.lineTo(x + q * 0.8, y + q);
      k.lineTo(x - q * 0.8, y + q);
      k.closePath();
      k.moveTo(x + q * 0.34, y + q * 0.1);
      k.arc(x, y + q * 0.1, q * 0.34, 0, TAU);
    });
  else
    fill(p, ink, (k) => {
      k.moveTo(x, y + s * 0.62);
      k.quadraticCurveTo(x - s * 0.62, y + s * 0.5, x - s * 0.44, y - s * 0.1);
      k.quadraticCurveTo(x - s * 0.3, y + s * 0.12, x - s * 0.16, y + s * 0.1);
      k.quadraticCurveTo(x - s * 0.3, y - s * 0.4, x, y - s * 0.76);
      k.quadraticCurveTo(x + s * 0.3, y - s * 0.4, x + s * 0.16, y + s * 0.1);
      k.quadraticCurveTo(x + s * 0.3, y + s * 0.12, x + s * 0.44, y - s * 0.1);
      k.quadraticCurveTo(x + s * 0.62, y + s * 0.5, x, y + s * 0.62);
      k.closePath();
    });
}

/**
 * The Avatar cycle as a palace mandala: a ring of fire, a ring of gold and a ring of lotus petals round a
 * square palace with a gate in each wall, its quarters in the four nations' colours with their marks, and
 * gold arrows turning round the lotus in the middle from Air to Water to Earth to Fire.
 */
export function cycle(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([222, 44, 26]), col([232, 40, 16]));
  cornerClouds(p, NIGHT_RIM);
  const x = w / 2;
  const y = h / 2;
  const R = u * 0.47;
  if (w > h * 1.4)
    for (const m of [-1, 1]) {
      const cx = x + m * (R + (w / 2 - R) / 2);
      cloudHeap(p, cx, y - u * 0.08, u * 0.12, NIGHT_RIM, m);
      cloudHeap(p, cx + m * u * 0.1, y + u * 0.14, u * 0.1, NIGHT_RIM, -m);
    }
  // The ring of fire: tongues in three layers curling round the circle.
  const n = 30;
  const tongues = (r0: number, r1: number): Trace => (k) => {
    const da = Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      k.moveTo(...polar(x, y, a - da, r0));
      k.quadraticCurveTo(...polar(x, y, a - da * 0.7, r0 + (r1 - r0) * 0.6), ...polar(x, y, a + da * 0.5, r1));
      k.quadraticCurveTo(...polar(x, y, a + da * 1.1, r0 + (r1 - r0) * 0.5), ...polar(x, y, a + da, r0));
    }
    k.closePath();
  };
  fill(p, col([8, 76, 44]), tongues(R * 0.8, R));
  fill(p, col([22, 88, 52]), tongues(R * 0.8, R * 0.95));
  fill(p, col([44, 92, 60]), tongues(R * 0.8, R * 0.89));
  line(p, SEPIA, 1, tongues(R * 0.8, R));
  // The ring of gold, and the lotus petals inside it.
  const ring = (r: number): Trace => (k) => k.arc(x, y, r, 0, TAU);
  fill(p, GOLD, ring(R * 0.84));
  line(p, col([30, 60, 30], 0.7), Math.max(1, R * 0.006), (k) => {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      k.moveTo(...polar(x, y, a, R * 0.79));
      k.lineTo(...polar(x, y, a, R * 0.83));
    }
  });
  line(p, SEPIA, 1, ring(R * 0.84));
  fill(p, col([350, 50, 74]), ring(R * 0.78));
  shaded(p, [350, 56, 70], petalRing(x, y, R * 0.62, R * 0.78, 32, 0, 0.6), R * 0.03, GOLD, Math.max(1, R * 0.008));
  const disc = ring(R * 0.66);
  fill(p, col([222, 50, 30]), disc);
  line(p, GOLD, Math.max(1, R * 0.012), disc);
  // The palace: a square with a gate in each wall, its four quarters in the nations' colours.
  const s = R * 0.44;
  const gw = s * 0.26;
  const gd = s * 0.2;
  const corners: Pt[] = [];
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    const rot = ([px, py]: Pt): Pt => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)];
    for (const pt of [
      [-s, -s],
      [-gw, -s],
      [-gw, -s - gd],
      [gw, -s - gd],
      [gw, -s],
    ] as Pt[])
      corners.push(rot(pt));
  }
  const palace: Trace = (k) => {
    k.moveTo(...corners[0]);
    for (const pt of corners.slice(1)) k.lineTo(...pt);
    k.closePath();
  };
  within(p, palace, () =>
    NATIONS.forEach(({ ink }, i) => {
      const a = (i * Math.PI) / 2 - Math.PI / 2;
      const g = p.c.createRadialGradient(x, y, 0, x, y, s * 1.4);
      g.addColorStop(0, col(ink, 1, 12));
      g.addColorStop(1, col(ink, 1, -8));
      fill(p, g, (k) => {
        k.moveTo(x, y);
        k.lineTo(...polar(x, y, a - Math.PI / 4, s * 2));
        k.lineTo(...polar(x, y, a + Math.PI / 4, s * 2));
        k.closePath();
      });
    }),
  );
  line(p, GOLD, Math.max(1.5, R * 0.024), palace);
  line(p, SEPIA, 1, palace);
  line(p, col(LEAD, 0.35), Math.max(1, R * 0.006), (k) => {
    for (const [cx, cy] of [corners[0], corners[5], corners[10], corners[15]]) {
      k.moveTo(x, y);
      k.lineTo(cx, cy);
    }
  });
  // The nations' marks, the lotus in the middle, and the arrows turning round it.
  NATIONS.forEach(({ mark }, i) => {
    const [mx, my] = polar(x, y, (i * Math.PI) / 2 - Math.PI / 2, s * 0.64);
    nationMark(p, mark, mx, my, s * 0.2);
  });
  fill(p, col(LEAD), ring(s * 0.36));
  line(p, GOLD, Math.max(1, R * 0.01), ring(s * 0.36));
  shaded(p, [350, 40, 84], petalRing(x, y, s * 0.06, s * 0.3, 8, Math.PI / 8, 0.7), s * 0.05, GOLD, Math.max(1, R * 0.006));
  shaded(p, [350, 50, 76], petalRing(x, y, s * 0.05, s * 0.22, 8, 0, 0.7), s * 0.04, GOLD, Math.max(1, R * 0.006));
  fill(p, GOLD, ring(s * 0.07));
  const aw = Math.max(1.5, R * 0.014);
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2 - Math.PI / 2 + 0.36;
    const a1 = a0 + Math.PI / 2 - 0.72;
    const r = s * 0.62;
    line(p, GOLD, aw, (k) => {
      k.arc(x, y, r, a0, a1);
      const [tx, ty] = polar(x, y, a1, r);
      const back = a1 - 0.16;
      k.moveTo(...polar(x, y, back, r + s * 0.07));
      k.lineTo(tx, ty);
      k.lineTo(...polar(x, y, back, r - s * 0.07));
    });
  }
}

/** One medallion of the Air Nomads' emblem, `R` its radius: curls of wind round a ring of petals, the three winds in gold at its heart. */
function medallion(p: Press, x: number, y: number, R: number) {
  const lw = Math.max(1, R * 0.02);
  for (let i = 0; i < 14; i++) {
    const [cx, cy] = polar(x, y, (i / 14) * TAU, R * 0.93);
    curl(p, cx, cy, R * 0.07, col([44, 90, 72]), lw, 1);
  }
  const ring = (r: number): Trace => (k) => k.arc(x, y, r, 0, TAU);
  const g = p.c.createRadialGradient(x, y, R * 0.3, x, y, R * 0.84);
  g.addColorStop(0, col([18, 80, 48]));
  g.addColorStop(1, col([8, 70, 38]));
  fill(p, g, ring(R * 0.84));
  line(p, GOLD, Math.max(1.5, R * 0.026), ring(R * 0.84));
  line(p, SEPIA, 1, ring(R * 0.87));
  shaded(p, [40, 90, 58], petalRing(x, y, R * 0.52, R * 0.8, 16, 0, 0.6), R * 0.06, GOLD, lw);
  shaded(p, [30, 90, 54], petalRing(x, y, R * 0.5, R * 0.7, 16, Math.PI / 16, 0.6), R * 0.05, GOLD, lw);
  const heart = ring(R * 0.54);
  const hg = p.c.createRadialGradient(x, y, 0, x, y, R * 0.54);
  hg.addColorStop(0, col([30, 80, 56]));
  hg.addColorStop(1, col([12, 72, 40]));
  fill(p, hg, heart);
  line(p, GOLD, Math.max(1.5, R * 0.02), heart);
  airMark(p, x, y, R * 0.42, SEPIA, R * 0.07 + 2);
  airMark(p, x, y, R * 0.42, GOLD, R * 0.06);
}

/** The Air Nomads' emblem worked large in gold on saffron, as on a temple hanging: its winds spinning, clouds round it, two smaller beside a long one. */
export function emblem(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  sky(p, 0, h, col([38, 88, 60]), col([26, 86, 50]));
  // Fine gold lines of wind sweeping across the cloth behind.
  line(p, col([44, 90, 74], 0.4), Math.max(1, u * 0.004), (k) => {
    for (let i = 0; i < 9; i++) {
      const y0 = (h * (i + 0.5)) / 9;
      k.moveTo(-4, y0);
      for (let j = 1; j <= 4; j++) k.quadraticCurveTo((w * (j - 0.5)) / 4, y0 + ((j + i) % 2 ? -1 : 1) * u * 0.04, (w * j) / 4, y0);
    }
  });
  cornerClouds(p, [30, 70, 70]);
  medallion(p, w / 2, h / 2, u * 0.42);
  if (w > u * 1.7) for (const m of [-1, 1]) medallion(p, w / 2 + m * w * 0.34, h / 2, u * 0.24);
  else if (h > u * 1.7) for (const m of [-1, 1]) medallion(p, w / 2, h / 2 + m * h * 0.34, u * 0.24);
}
