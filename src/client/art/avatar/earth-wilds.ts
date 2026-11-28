import { hsl, type HSL, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import { AZURITE, CINNABAR, GOLD, INK, JADE, MALACHITE, STONE, hall, house, mist, pine, range, roofShape, silkInk, smooth, tone, tree } from './ink';

/** Earth Kingdom creatures and wild places: badgermoles, Bosco, ostrich horses, the canyon, the pass, a lake, a volcano. */

const EARTHY: HSL = [32, 30, 46];
const FUR: HSL = [28, 22, 22];
const BROWN: HSL = [26, 36, 30];
const BIRD: HSL = [28, 38, 34];
const LAKE: HSL = [192, 24, 52];

const bez = (t: number, a: number, b: number, c: number, d: number) => {
  const m = 1 - t;
  return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d;
};
const bez2 = (t: number, a: number, b: number, c: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

/** A boulder on the ground at (x, y): a rounded heap of stone with a few dry strokes. */
function boulder(p: Press, x: number, y: number, r: number, ink: HSL = STONE) {
  const shape: Trace = (k) => {
    k.moveTo(x - r, y);
    k.bezierCurveTo(x - r * 1.05, y - r * 0.8, x + r * 0.6, y - r * 1.1, x + r, y);
    k.closePath();
  };
  fill(p, tone(ink, 0.95, -10), shape);
  within(p, shape, () =>
    line(p, INK(0.35), 1, (k) => {
      for (let i = 0; i < 8; i++) {
        const sx = x + p.rr(-0.8, 0.8) * r;
        const sy = y - p.rr(0.1, 0.7) * r;
        k.moveTo(sx, sy);
        k.lineTo(sx + r * 0.1, sy + r * 0.25);
      }
    }),
  );
  line(p, INK(0.7), 1.2, shape);
}

/** Ripples on still water: short level strokes from y0 down to y1, longer nearer. */
function ripples(p: Press, y0: number, y1: number, n: number, a = 0.3) {
  const { w } = p;
  const u = Math.min(p.w, p.h);
  line(p, INK(a), 1, (k) => {
    for (let i = 0; i < n * p.detail; i++) {
      const y = p.rr(y0, y1);
      const x = p.rr(-10, w);
      k.moveTo(x, y);
      k.lineTo(x + u * (0.02 + ((y - y0) / Math.max(1, y1 - y0)) * 0.08) * p.rr(0.5, 1.2), y);
    }
  });
}

/** Two badgermoles in their cave under a shaft of light from the roof, the far one asleep. */
export function badgermoles(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const lx = w * p.rr(0.35, 0.65);
  const floor = h * 0.78;
  fill(p, INK(0.82), (k) => k.rect(-4, -4, w + 8, h + 8));
  const light = c.createRadialGradient(lx, h * 0.3, 0, lx, h * 0.3, Math.max(w, h) * 0.65);
  light.addColorStop(0, silkInk(0.8));
  light.addColorStop(0.5, silkInk(0.3));
  light.addColorStop(1, silkInk(0));
  fill(p, light, (k) => k.rect(-4, -4, w + 8, h + 8));
  const shaft = c.createLinearGradient(0, 0, 0, floor);
  shaft.addColorStop(0, silkInk(0.55));
  shaft.addColorStop(1, silkInk(0.06));
  fill(p, shaft, (k) => {
    k.moveTo(lx - u * 0.07, -4);
    k.lineTo(lx + u * 0.07, -4);
    k.lineTo(lx + u * 0.3, floor);
    k.lineTo(lx - u * 0.22, floor);
    k.closePath();
  });
  // Dry strokes on the rock walls, and teeth of stone hanging from the roof.
  line(p, INK(0.25), 1.2, (k) => {
    for (let i = 0; i < 50 * p.detail; i++) {
      const x = p.rr(0, w);
      const y = p.rr(0, floor);
      if (Math.abs(x - lx) < u * 0.2 && y < h * 0.45) continue;
      const len = u * p.rr(0.02, 0.07);
      k.moveTo(x, y);
      k.quadraticCurveTo(x + len * p.rr(-0.6, 0.6), y + len * 0.5, x + len * p.rr(-0.9, 0.9), y + len * p.rr(0.3, 1));
    }
  });
  fill(p, INK(0.85), (k) => {
    for (let x = -u * 0.05; x < w; x += u * p.rr(0.06, 0.14)) {
      if (Math.abs(x - lx) < u * 0.12) continue;
      const tw = u * p.rr(0.03, 0.07);
      k.moveTo(x, -4);
      k.lineTo(x + tw / 2, h * p.rr(0.05, 0.18));
      k.lineTo(x + tw, -4);
      k.closePath();
    }
  });
  const g = c.createLinearGradient(0, floor - h * 0.06, 0, h);
  g.addColorStop(0, tone(EARTHY, 0));
  g.addColorStop(0.3, tone(EARTHY, 0.75));
  g.addColorStop(1, tone(EARTHY, 0.95, -14));
  fill(p, g, (k) => k.rect(-4, floor - h * 0.06, w + 8, h - floor + h * 0.06 + 4));
  for (let i = 0; i < 3; i++) boulder(p, p.rr(0, w), floor + (h - floor) * p.rr(0.2, 0.8), u * p.rr(0.05, 0.1), EARTHY);
  // The sleeper further back, the other nearer, nose to the light.
  const s = Math.min(u * 0.85, w * 0.55);
  const near = p.r() < 0.5 ? 1 : -1;
  badgermole(p, w / 2 - near * Math.min(u * 0.4, w * 0.26), floor + (h - floor) * 0.12, s * 0.7, near, true);
  badgermole(p, w / 2 + near * Math.min(u * 0.22, w * 0.14) - near * s * 0.2, floor + (h - floor) * 0.5, s, -near, false);
}

/** A badgermole: a great dark hump of fur, a long pale snout, and claws for digging. Faces right if dir is 1. */
function badgermole(p: Press, x: number, y: number, s: number, dir: number, asleep: boolean) {
  const X = (d: number) => x + dir * d * s;
  const Y = (d: number) => y + d * s * (asleep ? 0.75 : 1);
  const back: [Pt, Pt, Pt, Pt] = [[-0.5, 0], [-0.62, -0.46], [0.08, -0.62], [0.34, -0.32]];
  const body: Trace = (k) => {
    k.moveTo(X(back[0][0]), Y(back[0][1]));
    k.bezierCurveTo(X(back[1][0]), Y(back[1][1]), X(back[2][0]), Y(back[2][1]), X(back[3][0]), Y(back[3][1]));
    k.quadraticCurveTo(X(0.46), Y(-0.2), X(0.64), Y(-0.08));
    k.quadraticCurveTo(X(0.52), Y(0.01), X(0.36), Y(-0.02));
    k.lineTo(X(0.3), Y(0));
    k.closePath();
  };
  fill(p, tone(FUR, 0.97), body);
  // Sheen in the fur along the back.
  line(p, tone(FUR, 0.8, 22), Math.max(1, s * 0.008), (k) => {
    for (let i = 0; i < 40; i++) {
      const t = 0.05 + (i / 40) * 0.9;
      const bx = bez(t, back[0][0], back[1][0], back[2][0], back[3][0]) + 0.02;
      const by = bez(t, back[0][1], back[1][1], back[2][1], back[3][1]) + 0.05 + p.rr(0, 0.12);
      k.moveTo(X(bx), Y(by));
      k.lineTo(X(bx - 0.03), Y(by + 0.06));
    }
  });
  // A front leg like a spade, with long pale claws; the hind claws are small.
  const leg: Trace = (k) => {
    k.moveTo(X(0.12), Y(-0.24));
    k.quadraticCurveTo(X(0.3), Y(-0.24), X(0.34), Y(-0.02));
    k.lineTo(X(0.16), Y(0));
    k.closePath();
  };
  fill(p, tone(FUR, 1, -6), leg);
  line(p, INK(0.6), Math.max(1, s * 0.006), leg);
  // The pale face with a dark stripe down the snout, a pink nose and eyes that never open.
  const face: Trace = (k) => {
    k.moveTo(X(0.26), Y(-0.36));
    k.quadraticCurveTo(X(0.46), Y(-0.22), X(0.64), Y(-0.08));
    k.quadraticCurveTo(X(0.52), Y(0.01), X(0.36), Y(-0.03));
    k.quadraticCurveTo(X(0.34), Y(-0.2), X(0.26), Y(-0.36));
    k.closePath();
  };
  fill(p, hsl(40, 24, 80), face);
  line(p, tone(FUR, 0.95, -4), s * 0.035, (k) => {
    k.moveTo(X(0.24), Y(-0.4));
    k.quadraticCurveTo(X(0.44), Y(-0.25), X(0.6), Y(-0.1));
  });
  fill(p, hsl(350, 34, 56), (k) => k.arc(X(0.635), Y(-0.08), s * 0.02, 0, TAU));
  line(p, INK(0.8), Math.max(1, s * 0.008), (k) => {
    k.moveTo(X(0.39), Y(-0.19));
    k.lineTo(X(0.44), Y(-0.17));
  });
  line(p, INK(0.75), Math.max(1.2, s * 0.008), body);
  line(p, hsl(40, 30, 86), Math.max(1.2, s * 0.022), (k) => {
    for (let i = 0; i < 4; i++) {
      k.moveTo(X(0.2 + i * 0.04), Y(-0.03));
      k.quadraticCurveTo(X(0.28 + i * 0.045), Y(-0.03), X(0.33 + i * 0.05), Y(0.015));
    }
    for (let i = 0; i < 3; i++) {
      k.moveTo(X(-0.46 + i * 0.03), Y(-0.02));
      k.lineTo(X(-0.43 + i * 0.03), Y(0.01));
    }
  });
}

/** Bosco, the Earth King's bear, sitting up in the palace garden in his royal collar. */
export function bosco(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const ground = h * 0.86;
  hall(p, w * p.rr(0.3, 0.7), h * 0.5, u * 0.9, u * 0.4, 2);
  mist(p, h * 0.5, h * 0.12);
  const g = c.createLinearGradient(0, h * 0.52, 0, h);
  g.addColorStop(0, tone(JADE, 0, 20));
  g.addColorStop(0.4, tone(JADE, 0.35, 20));
  g.addColorStop(1, tone(JADE, 0.6, 8));
  fill(p, g, (k) => k.rect(-4, h * 0.52, w + 8, h * 0.48 + 4));
  const rockLeft = p.r() < 0.5;
  taihu(p, w * (rockLeft ? 0.13 : 0.87), ground - h * 0.02, Math.min(u * 0.42, h * 0.5));
  pine(p, w * (rockLeft ? 0.9 : 0.1), ground - h * 0.03, u * 0.5);
  const s = Math.min(u * 0.62, h * 0.62);
  bear(p, w / 2, ground, s);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    peony(p, w / 2 + side * s * p.rr(0.45, 0.8), ground + h * p.rr(-0.01, 0.08), u * p.rr(0.04, 0.065));
  }
}

/** A scholar's rock from Lake Tai: a tall grey stone worn through with holes. */
function taihu(p: Press, x: number, base: number, s: number) {
  const j = () => p.rr(-0.04, 0.04);
  const pts: Pt[] = [
    [x - s * 0.13, base],
    [x - s * (0.22 + j()), base - s * 0.25],
    [x - s * (0.12 + j()), base - s * 0.45],
    [x - s * (0.32 + j()), base - s * 0.72],
    [x - s * 0.16, base - s * 0.98],
    [x + s * (0.1 + j()), base - s],
    [x + s * (0.28 + j()), base - s * 0.78],
    [x + s * (0.12 + j()), base - s * 0.52],
    [x + s * (0.2 + j()), base - s * 0.26],
    [x + s * 0.12, base],
  ];
  const shape = smooth(pts);
  fill(p, tone(STONE, 0.95, 8), shape);
  within(p, shape, () => {
    line(p, INK(0.35), 1, (k) => {
      for (let i = 0; i < 36 * p.detail; i++) {
        const sx = x + p.rr(-0.3, 0.3) * s;
        const sy = base - p.rr(0, 1) * s;
        k.moveTo(sx, sy);
        k.quadraticCurveTo(sx + s * p.rr(-0.06, 0.06), sy + s * 0.05, sx + s * p.rr(-0.04, 0.06), sy + s * p.rr(0.06, 0.14));
      }
    });
    // Holes worn through the stone, each with a pale lip on its upper side.
    for (let i = 0; i < 8; i++) {
      const hx = x + p.rr(-0.16, 0.16) * s;
      const hy = base - p.rr(0.15, 0.9) * s;
      const hr = s * p.rr(0.015, 0.05);
      const rot = p.rr(-0.8, 0.8);
      fill(p, INK(0.55), (k) => k.ellipse(hx, hy, hr, hr * p.rr(0.8, 1.6), rot, 0, TAU));
      line(p, silkInk(0.6), Math.max(1, hr * 0.25), (k) => k.ellipse(hx, hy - hr * 0.2, hr * 1.1, hr * 1.2, rot, Math.PI * 1.1, Math.PI * 1.9));
    }
  });
  line(p, INK(0.75), 1.5, shape);
}

/** A peony bush: dark leaves and a few full flowers. */
function peony(p: Press, x: number, y: number, s: number) {
  for (let i = 0; i < 7; i++) {
    const a = p.rr(Math.PI, TAU);
    fill(p, tone(JADE, 0.85, p.rr(-8, 4)), (k) => k.ellipse(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.5, s * 0.45, s * 0.2, a, 0, TAU));
  }
  const pink = p.r() < 0.5;
  for (let i = 0; i < 3; i++) {
    const fx = x + p.rr(-0.8, 0.8) * s;
    const fy = y - p.rr(0.2, 0.7) * s;
    const fr = s * p.rr(0.28, 0.4);
    fill(p, pink ? hsl(340, 60, 74) : tone([352, 60, 46]), (k) => k.arc(fx, fy, fr, 0, TAU));
    fill(p, pink ? hsl(340, 60, 62) : tone([352, 60, 36]), (k) => k.arc(fx, fy, fr * 0.55, 0, TAU));
    fill(p, GOLD, (k) => k.arc(fx, fy, fr * 0.18, 0, TAU));
  }
}

/** Bosco: a brown bear sitting up with his paws on his belly, a pale muzzle, and a green collar with a gold medallion. */
function bear(p: Press, x: number, base: number, s: number) {
  const body: Trace = (k) => {
    k.moveTo(x - s * 0.36, base);
    k.bezierCurveTo(x - s * 0.46, base - s * 0.35, x - s * 0.3, base - s * 0.72, x, base - s * 0.74);
    k.bezierCurveTo(x + s * 0.3, base - s * 0.72, x + s * 0.46, base - s * 0.35, x + s * 0.36, base);
    k.closePath();
  };
  fill(p, tone(BROWN), body);
  // A rough edge of fur: short strokes out from the outline, along both of its curves (m = 1 is the left).
  const cx: [number, number, number, number] = [-0.36, -0.46, -0.3, 0];
  const cy: [number, number, number, number] = [0, -0.35, -0.72, -0.74];
  line(p, tone(BROWN, 0.9, -4), Math.max(1, s * 0.008), (k) => {
    for (const m of [1, -1])
      for (let i = 0; i < 20; i++) {
        const t = 0.06 + (i / 20) * 0.9;
        const tx = bez(t + 0.01, ...cx) - bez(t - 0.01, ...cx);
        const ty = bez(t + 0.01, ...cy) - bez(t - 0.01, ...cy);
        const l = Math.hypot(tx, ty) || 1;
        const nx = (m * ty) / l;
        const ny = -tx / l;
        const ex = x + m * bez(t, ...cx) * s;
        const ey = base + bez(t, ...cy) * s;
        const len = s * p.rr(0.01, 0.024);
        k.moveTo(ex - nx * s * 0.01, ey - ny * s * 0.01);
        k.lineTo(ex + nx * len + p.rr(-0.006, 0.006) * s, ey + ny * len);
      }
  });
  fill(p, tone(BROWN, 0.6, 14), (k) => k.ellipse(x, base - s * 0.28, s * 0.2, s * 0.24, 0, 0, TAU));
  // Hind feet with their pale soles towards us, and the arms resting on the belly.
  for (const sx of [-1, 1]) {
    fill(p, tone(BROWN, 1, -5), (k) => k.ellipse(x + sx * s * 0.27, base - s * 0.05, s * 0.12, s * 0.08, sx * 0.3, 0, TAU));
    fill(p, hsl(30, 20, 56), (k) => k.ellipse(x + sx * s * 0.28, base - s * 0.05, s * 0.07, s * 0.05, sx * 0.3, 0, TAU));
    line(p, tone(BROWN, 1, -7), s * 0.11, (k) => {
      k.moveTo(x + sx * s * 0.25, base - s * 0.6);
      k.quadraticCurveTo(x + sx * s * 0.29, base - s * 0.36, x + sx * s * 0.13, base - s * 0.26);
    });
  }
  // The head: round ears, a pale muzzle, nose and small eyes.
  const hy = base - s * 0.83;
  for (const sx of [-1, 1]) fill(p, tone(BROWN, 1, -5), (k) => k.arc(x + sx * s * 0.13, hy - s * 0.12, s * 0.06, 0, TAU));
  fill(p, tone(BROWN), (k) => k.ellipse(x, hy, s * 0.18, s * 0.16, 0, 0, TAU));
  fill(p, hsl(34, 30, 64), (k) => k.ellipse(x, hy + s * 0.06, s * 0.09, s * 0.065, 0, 0, TAU));
  fill(p, INK(0.92), (k) => {
    k.ellipse(x, hy + s * 0.03, s * 0.035, s * 0.024, 0, 0, TAU);
    for (const sx of [-1, 1]) {
      k.moveTo(x + sx * s * 0.07 + s * 0.016, hy - s * 0.03);
      k.arc(x + sx * s * 0.07, hy - s * 0.03, s * 0.016, 0, TAU);
    }
  });
  line(p, INK(0.7), Math.max(1, s * 0.008), (k) => {
    k.moveTo(x, hy + s * 0.05);
    k.lineTo(x, hy + s * 0.08);
    k.quadraticCurveTo(x - s * 0.03, hy + s * 0.1, x - s * 0.05, hy + s * 0.08);
    k.moveTo(x, hy + s * 0.08);
    k.quadraticCurveTo(x + s * 0.03, hy + s * 0.1, x + s * 0.05, hy + s * 0.08);
  });
  // The royal collar.
  const collar: Trace = (k) => {
    k.moveTo(x - s * 0.18, hy + s * 0.13);
    k.quadraticCurveTo(x, hy + s * 0.25, x + s * 0.18, hy + s * 0.13);
  };
  line(p, hsl(150, 40, 36), s * 0.06, collar);
  line(p, GOLD, Math.max(1, s * 0.012), collar);
  fill(p, GOLD, (k) => k.arc(x, hy + s * 0.22, s * 0.04, 0, TAU));
  line(p, hsl(150, 40, 30), Math.max(1, s * 0.008), (k) => k.rect(x - s * 0.015, hy + s * 0.205, s * 0.03, s * 0.03));
}

/** Ostrich horses on the plain by a road: a few grazing, some saddled, nearer ones larger. */
export function ostrichHorses(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.5, h * 0.28, -10, w + 10, AZURITE, 0.3);
  mist(p, h * 0.5, h * 0.06);
  const plain = h * 0.52;
  const g = c.createLinearGradient(0, plain, 0, h);
  g.addColorStop(0, tone(MALACHITE, 0.25, 20));
  g.addColorStop(1, tone(MALACHITE, 0.55, 6));
  fill(p, g, (k) => k.rect(-4, plain, w + 8, h - plain + 4));
  const rx = w * p.rr(0.3, 0.7);
  fill(p, hsl(34, 36, 66, 0.7), (k) => {
    k.moveTo(rx - u * 0.01, plain);
    k.quadraticCurveTo(rx - w * 0.2, h * 0.75, rx + w * 0.05, h + 4);
    k.lineTo(rx + w * 0.22, h + 4);
    k.quadraticCurveTo(rx - w * 0.12, h * 0.75, rx + u * 0.01, plain);
    k.closePath();
  });
  line(p, tone(JADE, 0.6), 1, (k) => {
    for (let i = 0; i < 140 * p.detail; i++) {
      const gx = p.rr(0, w);
      const gy = p.rr(plain + h * 0.04, h);
      const len = u * (0.01 + ((gy - plain) / h) * 0.06);
      k.moveTo(gx, gy);
      k.lineTo(gx + p.rr(-0.3, 0.3) * len, gy - len);
    }
  });
  const n = Math.max(3, Math.round((w / u) * 1.6));
  const herd = Array.from({ length: n }, (_, i) => ({ x: (w * (i + p.rr(0.2, 0.8))) / n, d: p.rr(0, 1) })).sort((a, b) => a.d - b.d);
  for (const { x, d } of herd) {
    const y = plain + (h - plain) * (0.25 + d * 0.62);
    ostrichHorse(p, x, y, u * (0.26 + d * 0.3), p.r() < 0.5 ? 1 : -1, p.r() < 0.4, p.r() < 0.35);
  }
}

/** An ostrich horse standing on (x, y), `s` tall at the head: a bird's body and legs, and a long horse's head. */
function ostrichHorse(p: Press, x: number, y: number, s: number, dir: number, graze: boolean, saddle: boolean) {
  const X = (d: number) => x + dir * d * s;
  const Y = (d: number) => y - d * s;
  const light = tone(BIRD, 0.92, 14);
  // Legs, the far one a shade darker: feathered thighs, thin shins bent back at the hock, toes forward.
  for (const [o, dl] of [[-0.07, -8], [0.05, 0]] as const) {
    line(p, hsl(42, 26, 52 + dl), Math.max(1, s * 0.03), (k) => {
      k.moveTo(X(o - 0.02), Y(0.5));
      k.lineTo(X(o - 0.1), Y(0.3));
      k.lineTo(X(o), Y(0.02));
      k.lineTo(X(o + 0.06), Y(0));
    });
    line(p, tone(BIRD, 0.95, dl), s * 0.09, (k) => {
      k.moveTo(X(o + 0.02), Y(0.66));
      k.lineTo(X(o - 0.04), Y(0.48));
    });
  }
  fill(p, tone(BIRD, 0.92), (k) => k.ellipse(X(0), Y(0.72), s * 0.3, s * 0.16, dir * -0.12, 0, TAU));
  fill(p, hsl(40, 30, 80, 0.7), (k) => k.ellipse(X(0.03), Y(0.64), s * 0.17, s * 0.05, dir * -0.12, 0, TAU));
  line(p, tone(BIRD, 0.85, -14), Math.max(1, s * 0.022), (k) => {
    for (let i = 0; i < 3; i++) {
      k.moveTo(X(0.12 - i * 0.08), Y(0.77 - i * 0.01));
      k.quadraticCurveTo(X(-0.02 - i * 0.08), Y(0.71), X(-0.14 - i * 0.06), Y(0.67 + i * 0.02));
    }
  });
  line(p, INK(0.75), Math.max(1, s * 0.03), (k) => {
    for (let i = 0; i < 4; i++) {
      k.moveTo(X(-0.24), Y(0.74));
      k.quadraticCurveTo(X(-0.36), Y(0.8 + i * 0.04), X(-0.42 - i * 0.02), Y(0.7 + i * 0.07));
    }
  });
  if (saddle) {
    fill(p, tone(JADE, 0.95), (k) => k.ellipse(X(0.02), Y(0.86), s * 0.12, s * 0.05, dir * -0.12, 0, TAU));
    line(p, CINNABAR, Math.max(1, s * 0.016), (k) => {
      k.moveTo(X(-0.09), Y(0.84));
      k.lineTo(X(0.13), Y(0.885));
    });
    line(p, INK(0.6), 1, (k) => {
      k.moveTo(X(0.02), Y(0.82));
      k.lineTo(X(0.03), Y(0.6));
    });
  }
  // The neck and mane, then the head: long like a horse's, with a dark muzzle.
  const hd: Pt = graze ? [0.48, 0.38] : [0.38, 1.12];
  const bend: Pt = graze ? [0.4, 0.72] : [0.26, 1.0];
  line(p, light, s * 0.08, (k) => {
    k.moveTo(X(0.2), Y(0.76));
    k.quadraticCurveTo(X(bend[0]), Y(bend[1]), X(hd[0]), Y(hd[1]));
  });
  // A short dark mane on the back of the neck, behind the head.
  line(p, INK(0.7), Math.max(1, s * 0.018), (k) => {
    for (let i = 0; i < 3; i++) {
      const t = graze ? 0.25 + i * 0.12 : 0.6 + i * 0.12;
      const nx = bez2(t, 0.2, bend[0], hd[0]) + (graze ? 0 : -0.04);
      const ny = bez2(t, 0.76, bend[1], hd[1]) + (graze ? 0.04 : 0);
      k.moveTo(X(nx), Y(ny));
      k.lineTo(X(nx - 0.05), Y(ny + (graze ? 0.03 : -0.04)));
    }
  });
  const rot = graze ? 1.2 : 0.6;
  const r = dir > 0 ? rot : Math.PI - rot;
  const hx = X(hd[0]) + Math.cos(r) * s * 0.06;
  const hy = Y(hd[1]) + Math.sin(r) * s * 0.06;
  const head: Trace = (k) => k.ellipse(hx, hy, s * 0.11, s * 0.045, r, 0, TAU);
  fill(p, light, head);
  line(p, INK(0.7), Math.max(1, s * 0.01), head);
  fill(p, INK(0.75), (k) => k.arc(hx + Math.cos(r) * s * 0.09, hy + Math.sin(r) * s * 0.09, s * 0.024, 0, TAU));
  fill(p, INK(0.9), (k) => k.arc(hx - Math.cos(r) * s * 0.035, hy - s * 0.016, Math.max(0.8, s * 0.012), 0, TAU));
  line(p, INK(0.7), Math.max(1, s * 0.014), (k) => {
    k.moveTo(X(hd[0]), Y(hd[1]));
    k.lineTo(X(hd[0] - 0.04), Y(hd[1] + 0.07));
  });
}

/** The Great Divide: banded canyon walls stepping away into the distance, the floor lost in mist. */
export function greatDivide(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const cx = w * p.rr(0.42, 0.58);
  const rock: HSL[] = [[36, 30, 70], [30, 34, 60], [22, 38, 50], [18, 40, 38]];
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const rim = h * (0.24 - t * 0.36);
    const foot = h * (0.52 + t * 0.6);
    const gw = w * (0.05 + t * 0.33);
    for (const side of [-1, 1]) {
      // The wall's face, stepping in and out, with a ledge here and there.
      const edge: Pt[] = [];
      for (let j = 0; j <= 7; j++) {
        const ex = cx + side * (gw + w * p.rr(0, 0.06));
        const ey = rim + ((foot - rim) * (j + p.rr(-0.3, 0.3) * (j > 0 ? 1 : 0))) / 7;
        edge.push([ex, ey]);
        if (j < 7 && p.r() < 0.5) edge.push([ex + side * w * p.rr(0.015, 0.04), ey + (foot - rim) * 0.015]);
      }
      const outer = side < 0 ? -4 : w + 4;
      const shape: Trace = (k) => {
        k.moveTo(outer, rim - h * 0.03);
        k.lineTo(edge[0][0] + side * w * 0.03, rim);
        for (const [ex, ey] of edge) k.lineTo(ex, ey);
        k.lineTo(outer, foot);
        k.closePath();
      };
      fill(p, tone(rock[i], 0.6 + t * 0.4), shape);
      within(p, shape, () => {
        // Bands of rock, and the short slanting strokes of cut stone.
        for (let y = rim; y < foot; y += h * p.rr(0.03, 0.07)) {
          const band = h * p.rr(0.008, 0.022);
          const yy = y;
          fill(p, tone(rock[i], 0.45, p.rr(-14, 10)), (k) => k.rect(-4, yy, w + 8, band));
        }
        line(p, INK(0.25 + t * 0.25), 1 + t, (k) => {
          for (let q = 0; q < 30 * p.detail; q++) {
            const sy = p.rr(rim, foot);
            const sx = cx + side * (gw + p.rr(0, w * 0.3));
            k.moveTo(sx, sy);
            k.lineTo(sx - side * u * p.rr(0.01, 0.03), sy + u * p.rr(0.03, 0.08));
          }
        });
      });
      line(p, INK(0.45 + t * 0.35), 1 + t * 0.6, (k) => {
        k.moveTo(edge[0][0], edge[0][1]);
        for (const [ex, ey] of edge) k.lineTo(ex, ey);
      });
      // A pine or two holding on to the near walls.
      if (i >= 2 && p.r() < 0.7) {
        const [px, py] = edge[p.ri(1, 6)];
        pine(p, px - side * u * 0.02, py, u * (0.08 + t * 0.06));
      }
    }
    mist(p, foot - (foot - rim) * 0.08, h * 0.06, 0.85);
  }
  // Birds over the gap.
  line(p, INK(0.7), 1.2, (k) => {
    for (let i = 0; i < 3; i++) {
      const bx = cx + p.rr(-0.1, 0.1) * w;
      const by = h * p.rr(0.08, 0.3);
      const bs = u * p.rr(0.012, 0.02);
      k.moveTo(bx - bs, by - bs * 0.4);
      k.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.5, bx, by);
      k.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.5, bx + bs, by - bs * 0.4);
    }
  });
}

/** The Serpent's Pass: a thin path on a spine of rock across the lake to the far shore, the serpent rising beside it. */
export function serpentPass(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.3, h * 0.08, -10, w + 10, AZURITE, 0.4);
  mist(p, h * 0.3, h * 0.05);
  const nearLeft = p.r() < 0.5;
  // Ba Sing Se's wall, far off where the path ends.
  const wx = nearLeft ? w * 0.62 : w * 0.1;
  fill(p, hsl(196, 12, 50, 0.4), (k) => {
    k.rect(wx, h * 0.27, w * 0.28, h * 0.04);
    for (let x = wx; x < wx + w * 0.28; x += u * 0.025) k.rect(x, h * 0.26, u * 0.012, h * 0.012);
  });
  const lake = c.createLinearGradient(0, h * 0.3, 0, h);
  lake.addColorStop(0, tone(LAKE, 0.25, 16));
  lake.addColorStop(1, tone(LAKE, 0.8, -12));
  fill(p, lake, (k) => k.rect(-4, h * 0.3, w + 8, h * 0.7 + 4));
  ripples(p, h * 0.32, h, 80, 0.3);
  // The spine, from a near corner (thick) curving away to the far shore (thin), its crest broken into rocks.
  const P0: Pt = [nearLeft ? -w * 0.05 : w * 1.05, h * 0.98];
  const P1: Pt = [w * 0.5, h * 0.62];
  const P2: Pt = [nearLeft ? w * 0.78 : w * 0.22, h * 0.31];
  const n = 26;
  const crest: Pt[] = [];
  const foot: Pt[] = [];
  const path: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = bez2(t, P0[0], P1[0], P2[0]);
    const y = bez2(t, P0[1], P1[1], P2[1]);
    const th = h * (0.2 - 0.185 * Math.sqrt(t));
    crest.push([x, y - th * (0.5 + p.rr(0, 0.6) * (i % 3 === 0 ? 1 : 0.3))]);
    foot.push([x, y + th * 0.5]);
    path.push([x, y - th * 0.15]);
  }
  const back = [...foot].reverse();
  const spine: Trace = (k) => {
    k.moveTo(crest[0][0], crest[0][1]);
    for (const [x, y] of crest.slice(1)) k.lineTo(x, y);
    for (const [x, y] of back) k.lineTo(x, y);
    k.closePath();
  };
  const g = c.createLinearGradient(0, h * 0.3, 0, h);
  g.addColorStop(0, tone(STONE, 0.9, 6));
  g.addColorStop(1, tone(STONE, 1, -24));
  fill(p, g, spine);
  within(p, spine, () =>
    line(p, INK(0.45), 1.2, (k) => {
      for (let i = 0; i < 70 * p.detail; i++) {
        const [x, y] = crest[p.ri(0, n)];
        const d = u * p.rr(0.01, 0.06);
        k.moveTo(x + p.rr(-0.03, 0.03) * u, y + d * 0.2);
        k.lineTo(x + p.rr(-0.03, 0.03) * u, y + d);
      }
    }),
  );
  line(p, INK(0.8), 1.4, (k) => {
    k.moveTo(crest[0][0], crest[0][1]);
    for (const [x, y] of crest.slice(1)) k.lineTo(x, y);
  });
  line(p, hsl(38, 30, 82), Math.max(1.2, u * 0.01), (k) => {
    k.moveTo(path[0][0], path[0][1]);
    for (const [x, y] of path.slice(1)) k.lineTo(x, y);
  });
  line(p, silkInk(0.5), 1.2, (k) => {
    for (const [x, y] of foot) {
      k.moveTo(x - u * 0.03, y + 2);
      k.lineTo(x + u * 0.03, y + 2);
    }
  });
  // The serpent in the open water: its neck and finned head out of the lake, its coils further off.
  const d = nearLeft ? 1 : -1;
  const hs = Math.min(u * 0.24, w * 0.15);
  const sx = nearLeft ? w * 0.62 : w * 0.38;
  const sy = h * 0.9;
  const SERPENT = hsl(170, 24, 17);
  line(p, SERPENT, hs * 0.2, (k) => {
    k.moveTo(sx, sy);
    k.bezierCurveTo(sx + d * hs * 0.35, sy - hs * 0.5, sx - d * hs * 0.3, sy - hs * 0.8, sx - d * hs * 0.05, sy - hs * 1.2);
  });
  fill(p, SERPENT, (k) => {
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const fx = bez(t, sx, sx + d * hs * 0.35, sx - d * hs * 0.3, sx - d * hs * 0.05) + d * hs * 0.09;
      const fy = bez(t, sy, sy - hs * 0.5, sy - hs * 0.8, sy - hs * 1.2);
      k.moveTo(fx, fy - hs * 0.05);
      k.lineTo(fx + d * hs * 0.13, fy - hs * 0.02);
      k.lineTo(fx, fy + hs * 0.05);
      k.closePath();
    }
  });
  const hx = sx - d * hs * 0.05;
  const hy = sy - hs * 1.2;
  fill(p, SERPENT, (k) => k.ellipse(hx - d * hs * 0.12, hy, hs * 0.22, hs * 0.1, d * 0.25, 0, TAU));
  fill(p, hsl(44, 80, 60), (k) => k.arc(hx - d * hs * 0.1, hy - hs * 0.03, Math.max(1, hs * 0.025), 0, TAU));
  line(p, silkInk(0.6), 1.2, (k) => k.ellipse(sx, sy + hs * 0.03, hs * 0.4, hs * 0.05, 0, 0, TAU));
  let cx = sx + d * hs * 0.7;
  let cy = sy - h * 0.05;
  let ch = hs * 0.8;
  for (let i = 0; i < 2; i++) {
    const x0 = cx;
    const y0 = cy;
    const hh = ch;
    line(p, SERPENT, hh * 0.22, (k) => {
      k.moveTo(x0, y0);
      k.quadraticCurveTo(x0 + (d * hh) / 2, y0 - hh * 1.1, x0 + d * hh, y0);
    });
    line(p, silkInk(0.6), 1.2, (k) => k.ellipse(x0 + (d * hh) / 2, y0 + hh * 0.04, hh * 0.7, hh * 0.06, 0, 0, TAU));
    cx += d * hh * 1.5;
    cy -= h * 0.05;
    ch *= 0.7;
  }
}

/** Lake Laogai: a still lake in autumn with a pavilion on its island, and something faint under the water. */
export function laogai(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const shore = h * 0.48;
  const ridge = range(p, shore, h * 0.14, -10, w + 10, AZURITE, 0.5);
  mist(p, shore, h * 0.05);
  const autumn: HSL[] = [JADE, [18, 58, 48], [36, 62, 54], [8, 52, 42]];
  for (let i = 0; i < 12; i++) tree(p, p.rr(0, w), shore + h * 0.03, u * p.rr(0.05, 0.09), p.pick(autumn));
  // The lake, with the hills upside down in it.
  const water = shore + h * 0.03;
  const g = c.createLinearGradient(0, water, 0, h);
  g.addColorStop(0, tone(LAKE, 0.3, 18));
  g.addColorStop(1, tone(LAKE, 0.6, 2));
  fill(p, g, (k) => k.rect(-4, water, w + 8, h - water + 4));
  const flip = ridge.map(([x, y]): Pt => [x, 2 * water - y]);
  const rg = c.createLinearGradient(0, water, 0, 2 * water - h * 0.14);
  rg.addColorStop(0, tone(AZURITE, 0.05));
  rg.addColorStop(1, tone(AZURITE, 0.28));
  fill(p, rg, smooth(flip));
  ripples(p, water + h * 0.02, h, 50, 0.25);
  // The island, and below it the halls and passages that the lake hides.
  const ix = w * p.rr(0.35, 0.65);
  const iy = water + (h - water) * 0.3;
  const by = water + (h - water) * 0.68;
  line(p, INK(0.13), Math.max(1, u * 0.005), (k) => {
    k.rect(ix - u * 0.13, by - u * 0.05, u * 0.26, u * 0.1);
    k.moveTo(ix - u * 0.13, by);
    k.lineTo(ix - u * 0.45, by);
    k.moveTo(ix + u * 0.13, by);
    k.lineTo(ix + u * 0.42, by);
    k.rect(ix - u * 0.56, by - u * 0.04, u * 0.11, u * 0.08);
    k.rect(ix + u * 0.42, by - u * 0.04, u * 0.11, u * 0.08);
    k.moveTo(ix, by - u * 0.05);
    k.lineTo(ix, iy + u * 0.02);
    for (let i = -2; i <= 2; i++) {
      k.moveTo(ix + i * u * 0.05, by - u * 0.05);
      k.lineTo(ix + i * u * 0.05, by + u * 0.05);
    }
  });
  const isle: Trace = (k) => {
    k.moveTo(ix - u * 0.16, iy + u * 0.01);
    k.quadraticCurveTo(ix - u * 0.08, iy - u * 0.07, ix + u * 0.02, iy - u * 0.06);
    k.quadraticCurveTo(ix + u * 0.12, iy - u * 0.05, ix + u * 0.17, iy + u * 0.01);
    k.closePath();
  };
  fill(p, tone(STONE, 0.95, -10), isle);
  line(p, INK(0.7), 1.2, isle);
  pine(p, ix - u * 0.08, iy - u * 0.04, u * 0.16);
  // A small open pavilion on the island.
  fill(p, tone([6, 50, 40]), (k) => {
    k.rect(ix + u * 0.01, iy - u * 0.12, u * 0.008, u * 0.07);
    k.rect(ix + u * 0.09, iy - u * 0.12, u * 0.008, u * 0.07);
  });
  roofShape(p, ix + u * 0.054, iy - u * 0.12, u * 0.15, u * 0.05);
  line(p, silkInk(0.6), 1.2, (k) => k.ellipse(ix, iy + u * 0.015, u * 0.2, u * 0.012, 0, 0, TAU));
  // Reeds in front.
  const rx = p.r() < 0.5 ? w * 0.08 : w * 0.92;
  for (let i = 0; i < 18; i++) {
    const x = rx + p.rr(-0.12, 0.12) * u;
    const top = h * p.rr(0.6, 0.8);
    const bend = u * p.rr(-0.05, 0.05);
    line(p, INK(0.6), 1.2, (k) => {
      k.moveTo(x, h + 2);
      k.quadraticCurveTo(x, (h + top) / 2, x + bend, top);
    });
    if (p.r() < 0.5) fill(p, hsl(30, 40, 40, 0.85), (k) => k.ellipse(x + bend, top + u * 0.02, u * 0.008, u * 0.025, bend / u, 0, TAU));
  }
}

/** Makapu Village under its volcano: the smoking peak over the clouds, terraced fields, and roofs in blossom. */
export function makapu(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const vx = w * p.rr(0.4, 0.6);
  const peak = h * 0.22;
  const foot = h * 0.62;
  // Smoke rising from the crater, drifting to one side.
  const drift = p.r() < 0.5 ? 1 : -1;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const px = vx + drift * t * t * w * 0.35;
    const py = peak - t * peak * 1.1;
    const pr = u * (0.05 + t * 0.1);
    const g = c.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, INK(0.3 - t * 0.15));
    g.addColorStop(1, INK(0));
    fill(p, g, (k) => k.arc(px, py, pr, 0, TAU));
  }
  const cw = Math.min(w, h * 1.3);
  const cone: Trace = (k) => {
    k.moveTo(vx - cw * 0.8, foot);
    k.quadraticCurveTo(vx - cw * 0.24, foot - (foot - peak) * 0.45, vx - cw * 0.08, peak);
    k.lineTo(vx + cw * 0.08, peak + h * 0.006);
    k.quadraticCurveTo(vx + cw * 0.24, foot - (foot - peak) * 0.45, vx + cw * 0.8, foot);
    k.closePath();
  };
  const g = c.createLinearGradient(0, peak, 0, foot);
  g.addColorStop(0, tone([20, 14, 34], 0.95));
  g.addColorStop(0.6, tone([20, 12, 46], 0.6));
  g.addColorStop(1, tone([20, 12, 60], 0));
  fill(p, g, cone);
  within(p, cone, () =>
    line(p, INK(0.35), 1.2, (k) => {
      for (let i = 0; i < 26; i++) {
        const a = p.rr(-1, 1);
        k.moveTo(vx + a * cw * 0.07, peak + h * 0.01);
        k.quadraticCurveTo(vx + a * cw * 0.16, peak + (foot - peak) * 0.3, vx + a * cw * (0.3 + p.rr(0, 0.2)), peak + (foot - peak) * p.rr(0.5, 0.8));
      }
    }),
  );
  fill(p, CINNABAR, (k) => k.ellipse(vx, peak + h * 0.004, cw * 0.06, h * 0.006, 0, 0, TAU));
  mist(p, h * 0.38, h * 0.05, 0.85);
  mist(p, h * 0.58, h * 0.06);
  // The green foothill under the village, and terraced fields stepping down it, each with a dark lip.
  const hill: Trace = (k) => {
    k.moveTo(vx - cw * 0.95, h * 0.9);
    k.quadraticCurveTo(vx - cw * 0.3, h * 0.55, vx, h * 0.56);
    k.quadraticCurveTo(vx + cw * 0.3, h * 0.55, vx + cw * 0.95, h * 0.9);
    k.closePath();
  };
  const hg = c.createLinearGradient(0, h * 0.55, 0, h * 0.9);
  hg.addColorStop(0, tone(MALACHITE, 0.3, 14));
  hg.addColorStop(1, tone(MALACHITE, 0.5, 4));
  fill(p, hg, hill);
  for (let i = 0; i < 6; i++) {
    const ty = h * (0.6 + i * 0.04);
    const tw = Math.min(w, cw * 1.2) * (0.4 + i * 0.12);
    const tx = vx + p.rr(-0.08, 0.08) * w;
    const band = h * 0.03;
    const field: Trace = (k) => {
      k.moveTo(tx - tw / 2, ty + band * 0.8);
      k.quadraticCurveTo(tx, ty - band * 0.6, tx + tw / 2, ty + band * 0.8);
      k.lineTo(tx + tw / 2, ty + band * 1.4);
      k.quadraticCurveTo(tx, ty + band * 0.1, tx - tw / 2, ty + band * 1.4);
      k.closePath();
    };
    fill(p, tone(MALACHITE, 0.55, 12 - i * 3), field);
    line(p, INK(0.45), 1.2, (k) => {
      k.moveTo(tx - tw / 2, ty + band * 1.4);
      k.quadraticCurveTo(tx, ty + band * 0.1, tx + tw / 2, ty + band * 1.4);
    });
  }
  // The village: plastered houses with grey roofs among trees in blossom, Aunt Wu's hall in the middle.
  const vy = h * 0.92;
  const houses = Math.max(4, Math.round((w / u) * 5));
  for (let i = 0; i < houses; i++) {
    const hx = (w * (i + 0.5)) / houses + p.rr(-0.3, 0.3) * (w / houses);
    if (Math.abs(hx - vx) < u * 0.16) continue;
    house(p, hx, vy - h * p.rr(0, 0.08), u * p.rr(0.1, 0.14));
  }
  hall(p, vx, vy + h * 0.02, u * 0.26, u * 0.2, 2);
  for (let i = 0; i < 10; i++) {
    const bx = p.rr(0, w);
    const by = vy - h * p.rr(-0.02, 0.1);
    line(p, INK(0.75), Math.max(1, u * 0.006), (k) => {
      k.moveTo(bx, by + u * 0.04);
      k.lineTo(bx + u * p.rr(-0.02, 0.02), by - u * 0.03);
    });
    fill(p, hsl(345, 60, 82, 0.85), (k) => {
      for (let j = 0; j < 12; j++) {
        const fx = bx + p.rr(-0.05, 0.05) * u;
        const fy = by - u * 0.03 + p.rr(-0.03, 0.03) * u;
        k.moveTo(fx + u * 0.008, fy);
        k.arc(fx, fy, u * 0.008, 0, TAU);
      }
    });
  }
}
