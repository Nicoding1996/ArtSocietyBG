import { hsl, type HSL, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, fireMark, line, within } from './print';
import type { Inscribe } from './ink';
import { CRIMSON, GOLDLEAF, INDIGO, KEY, SAFFRON, VERMILION, block, bokashi, cloud, kasumi, sea, sun, tint, washiInk } from './woodblock';
import { dragonBody, dragonHead } from './fire-sun';

/** Fire Nation creatures, and a spirit: komodo rhinos on the march, a messenger hawk, Roku's dragon Fang, the Painted Lady. */

/** A point on the cubic Bézier a-b-c-d at t. */
function bez(t: number, a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const m = 1 - t;
  return [
    m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0],
    m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1],
  ];
}

/** A far building's silhouette in one flat ink: a hall under an upswept roof, (x, y) the middle of its foot. */
function farHall(p: Press, x: number, y: number, wd: number, ht: number, ink: string) {
  fill(p, ink, (k) => {
    k.rect(x - wd * 0.36, y - ht * 0.55, wd * 0.72, ht * 0.55 + 1);
    k.moveTo(x - wd * 0.5, y - ht * 0.68);
    k.quadraticCurveTo(x - wd * 0.3, y - ht * 0.5, x - wd * 0.2, y - ht);
    k.lineTo(x + wd * 0.2, y - ht);
    k.quadraticCurveTo(x + wd * 0.3, y - ht * 0.5, x + wd * 0.5, y - ht * 0.68);
    k.lineTo(x + wd * 0.42, y - ht * 0.52);
    k.lineTo(x - wd * 0.42, y - ht * 0.52);
    k.closePath();
  });
}

const HIDE: HSL = [92, 12, 44];

/**
 * A komodo rhino in profile facing `dir`, standing on the ground at y with the middle of its body over x, `L`
 * long: a scaly barrel on stocky legs, plates down its back, the great horn on its nose, and a red saddle
 * cloth with the Fire Nation's flame. `step` swings its legs; `banner` raises a tall flag from the saddle.
 */
function rhino(p: Press, x: number, y: number, L: number, dir: number, step: number, banner: boolean) {
  const at = (lx: number, ly: number): Pt => [x + dir * lx * L, y + ly * L];
  const wd = Math.max(1, L * 0.008);
  // A leg from inside the body down to the foot, a pale claw at the toe.
  const leg = (lx: number, swing: number, ink: string) => {
    block(p, ink, (k) => {
      k.moveTo(...at(lx - 0.07, -0.32));
      k.lineTo(...at(lx + 0.06, -0.32));
      k.quadraticCurveTo(...at(lx + 0.07 + swing * 0.5, -0.14), ...at(lx + 0.06 + swing, -0.03));
      k.quadraticCurveTo(...at(lx + 0.1 + swing, -0.01), ...at(lx + 0.09 + swing, 0));
      k.lineTo(...at(lx - 0.07 + swing, 0));
      k.quadraticCurveTo(...at(lx - 0.08 + swing * 0.5, -0.14), ...at(lx - 0.07, -0.32));
      k.closePath();
    }, wd);
    fill(p, washiInk(), (k) => {
      for (const cy of [-0.022, -0.004]) {
        k.moveTo(...at(lx + 0.08 + swing, cy - 0.008));
        k.lineTo(...at(lx + 0.12 + swing, cy + 0.004));
        k.lineTo(...at(lx + 0.08 + swing, cy + 0.008));
        k.closePath();
      }
    });
  };
  const far = tint(HIDE, 1, -12);
  const near = tint(HIDE);
  leg(0.17, -step * 0.06, far);
  leg(-0.32, step * 0.06, far);
  leg(0.24, step * 0.06, near);
  leg(-0.25, -step * 0.06, near);
  // The heavy tail.
  block(p, near, (k) => {
    k.moveTo(...at(-0.38, -0.5));
    k.quadraticCurveTo(...at(-0.62, -0.4), ...at(-0.72, -0.12));
    k.quadraticCurveTo(...at(-0.58, -0.26), ...at(-0.36, -0.3));
    k.closePath();
  }, wd);
  // Plates down the back, standing out along the curve of it.
  const P0: Pt = [-0.42, -0.36];
  const P1: Pt = [-0.42, -0.62];
  const P2: Pt = [-0.05, -0.7];
  const P3: Pt = [0.24, -0.62];
  block(p, tint(HIDE, 1, -18), (k) => {
    for (let j = 0; j < 8; j++) {
      const t = 0.12 + j * 0.105;
      const [bx, by] = bez(t, P0, P1, P2, P3);
      const [ax, ay] = bez(t - 0.03, P0, P1, P2, P3);
      const [cx, cy] = bez(t + 0.03, P0, P1, P2, P3);
      const tl = Math.hypot(cx - ax, cy - ay);
      const tx = (cx - ax) / tl;
      const ty = (cy - ay) / tl;
      const tall = 0.05 + 0.04 * Math.sin(Math.PI * t);
      k.moveTo(...at(bx - tx * 0.035 - ty * 0.02, by - ty * 0.035 + tx * 0.02));
      k.lineTo(...at(bx + ty * tall, by - tx * tall));
      k.lineTo(...at(bx + tx * 0.035 - ty * 0.02, by + ty * 0.035 + tx * 0.02));
      k.closePath();
    }
  }, wd);
  // The body, scaled and paler underneath.
  const body: Trace = (k) => {
    k.moveTo(...at(...P0));
    k.bezierCurveTo(...at(...P1), ...at(...P2), ...at(...P3));
    k.quadraticCurveTo(...at(0.42, -0.56), ...at(0.42, -0.36));
    k.bezierCurveTo(...at(0.4, -0.2), ...at(-0.2, -0.16), ...at(-0.36, -0.24));
    k.quadraticCurveTo(...at(-0.44, -0.28), ...at(...P0));
    k.closePath();
  };
  fill(p, near, body);
  within(p, body, () => {
    fill(p, tint(HIDE, 1, 12), (k) => k.ellipse(...at(0, -0.2), L * 0.42, L * 0.08, 0, 0, TAU));
    line(p, tint(HIDE, 0.8, -14), Math.max(1, L * 0.006), (k) => {
      for (let i = 0; i < 26; i++) {
        const [sx, sy] = at(p.rr(-0.4, 0.4), p.rr(-0.6, -0.24));
        k.moveTo(sx - L * 0.02, sy);
        k.quadraticCurveTo(sx, sy + L * 0.018, sx + L * 0.02, sy);
      }
    });
  });
  line(p, KEY, wd * 1.4, body);
  // The head, low and heavy: the great horn on the nose, a short one on the brow, a frill of spikes behind.
  block(p, tint(HIDE, 1, -18), (k) => {
    for (const [bx, tip] of [
      [0.33, -0.7],
      [0.39, -0.72],
    ] as [number, number][]) {
      k.moveTo(...at(bx - 0.03, -0.56));
      k.lineTo(...at(bx - 0.02, tip));
      k.lineTo(...at(bx + 0.04, -0.57));
      k.closePath();
    }
  }, wd);
  const head: Trace = (k) => {
    k.moveTo(...at(0.3, -0.58));
    k.quadraticCurveTo(...at(0.46, -0.62), ...at(0.58, -0.5));
    k.quadraticCurveTo(...at(0.72, -0.45), ...at(0.8, -0.36));
    k.quadraticCurveTo(...at(0.86, -0.3), ...at(0.8, -0.25));
    k.quadraticCurveTo(...at(0.66, -0.2), ...at(0.5, -0.24));
    k.quadraticCurveTo(...at(0.4, -0.26), ...at(0.34, -0.34));
    k.closePath();
  };
  block(p, near, head, wd * 1.4);
  const bone = hsl(40, 30, 82);
  block(p, bone, (k) => {
    k.moveTo(...at(0.79, -0.37));
    k.quadraticCurveTo(...at(0.87, -0.52), ...at(0.77, -0.7));
    k.quadraticCurveTo(...at(0.75, -0.52), ...at(0.65, -0.44));
    k.closePath();
    k.moveTo(...at(0.62, -0.47));
    k.lineTo(...at(0.58, -0.6));
    k.lineTo(...at(0.54, -0.5));
    k.closePath();
  }, wd);
  line(p, KEY, wd, (k) => {
    k.moveTo(...at(0.8, -0.27));
    k.quadraticCurveTo(...at(0.7, -0.25), ...at(0.58, -0.26));
    k.moveTo(...at(0.5, -0.47));
    k.quadraticCurveTo(...at(0.55, -0.5), ...at(0.61, -0.46));
  });
  fill(p, SAFFRON, (k) => k.arc(...at(0.555, -0.44), L * 0.018, 0, TAU));
  fill(p, KEY, (k) => {
    k.arc(...at(0.56, -0.44), L * 0.008, 0, TAU);
    k.moveTo(...at(0.795, -0.33));
    k.arc(...at(0.79, -0.33), L * 0.007, 0, TAU);
  });
  // The saddle cloth, red with a gold border and the flame on it, and the saddle on top.
  const cloth: Trace = (k) => {
    k.moveTo(...at(-0.16, -0.8));
    k.lineTo(...at(0.16, -0.8));
    k.lineTo(...at(0.2, -0.36));
    for (let i = 1; i <= 6; i++) k.lineTo(...at(0.2 - i * 0.065, i % 2 ? -0.32 : -0.36));
    k.closePath();
  };
  within(p, body, () => {
    fill(p, VERMILION, cloth);
    line(p, GOLDLEAF, Math.max(1, L * 0.014), (k) => {
      k.moveTo(...at(0.18, -0.38));
      for (let i = 1; i <= 6; i++) k.lineTo(...at(0.18 - i * 0.06, i % 2 ? -0.345 : -0.385));
    });
    line(p, KEY, wd, cloth);
  });
  fireMark(p, ...at(0.02, -0.5), L * 0.06, GOLDLEAF);
  block(p, hsl(20, 40, 22), (k) => {
    k.moveTo(...at(-0.12, -0.64));
    k.lineTo(...at(-0.14, -0.75));
    k.quadraticCurveTo(...at(0, -0.66), ...at(0.12, -0.77));
    k.lineTo(...at(0.13, -0.64));
    k.closePath();
  }, wd);
  if (banner) {
    // A tall banner on a pole from the back of the saddle, hung from a crossbar.
    line(p, KEY, Math.max(1.5, L * 0.014), (k) => {
      k.moveTo(...at(-0.12, -0.7));
      k.lineTo(...at(-0.12, -1.22));
      k.moveTo(...at(-0.12, -1.18));
      k.lineTo(...at(0.06, -1.18));
    });
    block(p, VERMILION, (k) => {
      k.moveTo(...at(-0.11, -1.17));
      k.lineTo(...at(0.06, -1.17));
      k.lineTo(...at(0.06, -0.86));
      k.lineTo(...at(-0.025, -0.9));
      k.lineTo(...at(-0.11, -0.86));
      k.closePath();
    }, wd);
    fireMark(p, ...at(-0.025, -1.05), L * 0.05, GOLDLEAF);
  }
}

/** Komodo rhinos of the Fire Nation cavalry walking the road at dawn, saddled and bannered, the sun rising ahead of them. */
export function komodo(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.62, hsl(16, 62, 62), hsl(40, 60, 88, 0));
  const dir = p.r() < 0.5 ? 1 : -1;
  // The sun a little ahead of the column's middle, clear of the leader's banner.
  sun(p, w * (0.5 + dir * 0.12), h * 0.24, u * 0.12);
  // Hills beyond the road, mist over them, the road, and the fields this side of it.
  const ridge = Array.from({ length: 9 }, (_, i) => h * (0.52 + 0.06 * Math.sin(i * 1.7 + p.rr(0, 1.5))));
  block(p, hsl(96, 16, 58), (k) => {
    k.moveTo(-4, h * 0.76);
    k.lineTo(-4, ridge[0]);
    for (let i = 1; i < ridge.length; i++) {
      const x0 = (w * (i - 1)) / 8;
      const x1 = (w * i) / 8;
      k.quadraticCurveTo(x0, ridge[i - 1] - h * 0.02, (x0 + x1) / 2, (ridge[i - 1] + ridge[i]) / 2);
    }
    k.lineTo(w + 4, ridge[ridge.length - 1]);
    k.lineTo(w + 4, h * 0.76);
    k.closePath();
  }, 1.2);
  kasumi(p, -w * 0.05, w * 0.6, h * 0.64, h * 0.05);
  kasumi(p, w * 0.5, w * 1.05, h * 0.58, h * 0.04);
  block(p, hsl(36, 38, 74), (k) => k.rect(-4, h * 0.74, w + 8, h * 0.3), 1.2);
  block(p, hsl(86, 22, 40), (k) => k.rect(-4, h * 0.92, w + 8, h * 0.1), 1.2);
  // The column, the leader first so each one behind it overlaps the tail in front with its horn clear.
  const n = w > h * 1.6 ? 3 : 2;
  const L = Math.min((w * 0.9) / ((n - 1) * 1.2 + 1.54), h * 0.62);
  const ground = h * 0.88;
  const xc = w / 2 - dir * L * 0.06;
  for (let i = 0; i < n; i++) {
    const rx = xc + dir * ((n - 1) * 0.6 - i * 1.2) * L;
    rhino(p, rx, ground, L, dir, i % 2 ? 1 : -1, i === 0);
  }
  kasumi(p, w * 0.05, w * 0.95, ground + h * 0.01, h * 0.035, hsl(38, 40, 84, 0.8));
  return { side: dir > 0 ? 'left' : 'right' };
}

/** The messenger hawk on its lacquered perch at dawn, a message case on its back, the capital's roofs in mist below. */
export function hawk(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.75, hsl(352, 46, 44), hsl(36, 80, 82));
  const dir = p.r() < 0.5 ? 1 : -1;
  const S = Math.min(h * 0.44, w * 0.95);
  const bar = h * 0.62;
  const th = Math.max(4, u * 0.035);
  const x = w / 2 - dir * S * 0.03;
  const at = (lx: number, ly: number): Pt => [x + dir * lx * S, bar - th / 2 + ly * S];
  sun(p, ...at(0.06, -0.84), S * 0.34, washiInk());
  // Roofs of the capital far below, through the mist.
  for (let i = 0; i < 3; i++) farHall(p, w * (0.18 + i * 0.32) + p.rr(-0.04, 0.04) * w, h * (0.9 + (i % 2) * 0.05), u * 0.42, u * 0.16, hsl(352, 24, 48, 0.55));
  kasumi(p, -w * 0.05, w * 0.7, h * 0.86, h * 0.05);
  kasumi(p, w * 0.35, w * 1.05, h * 0.95, h * 0.05);
  // The perch's posts, and the silk cord hanging in loops under the bar, tasselled at the ends.
  const px0 = w * 0.1;
  const px1 = w * 0.9;
  block(p, CRIMSON, (k) => {
    k.rect(px0, bar, th * 0.8, h);
    k.rect(px1 - th * 0.8, bar, th * 0.8, h);
  }, 1.2);
  const cord = hsl(20, 80, 56);
  line(p, cord, Math.max(1.5, u * 0.008), (k) => {
    for (let i = 0; i < 2; i++) {
      const a = px0 + (px1 - px0) * (0.12 + i * 0.44);
      const b = a + (px1 - px0) * 0.32;
      k.moveTo(a, bar + th / 2);
      k.quadraticCurveTo((a + b) / 2, bar + h * 0.12, b, bar + th / 2);
    }
    k.moveTo(px0 + th * 1.2, bar + th / 2);
    k.lineTo(px0 + th * 1.2, bar + h * 0.16);
    k.moveTo(px1 - th * 1.2, bar + th / 2);
    k.lineTo(px1 - th * 1.2, bar + h * 0.16);
  });
  for (const tx of [px0 + th * 1.2, px1 - th * 1.2])
    block(p, cord, (k) => {
      k.moveTo(tx - th * 0.25, bar + h * 0.16);
      k.lineTo(tx + th * 0.25, bar + h * 0.16);
      k.lineTo(tx + th * 0.6, bar + h * 0.24);
      k.lineTo(tx - th * 0.6, bar + h * 0.24);
      k.closePath();
    }, 1);
  // The tail hangs behind the bar, so it goes down first.
  const BACK = hsl(24, 30, 24);
  const CHEST = hsl(38, 44, 84);
  block(p, tint([28, 26, 34]), (k) => {
    k.moveTo(...at(-0.16, -0.16));
    k.lineTo(...at(-0.03, -0.12));
    k.lineTo(...at(-0.1, 0.38));
    k.lineTo(...at(-0.25, 0.35));
    k.closePath();
  }, 1.2);
  line(p, BACK, Math.max(1, S * 0.012), (k) => {
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      k.moveTo(...at(-0.16 - t * 0.09, -0.16 + t * 0.51));
      k.lineTo(...at(-0.03 - t * 0.07, -0.12 + t * 0.5));
    }
  });
  block(p, CRIMSON, (k) => k.rect(px0 - th * 0.3, bar - th / 2, px1 - px0 + th * 0.6, th), 1.2);
  line(p, GOLDLEAF, Math.max(1, th * 0.12), (k) => {
    k.moveTo(px0, bar - th * 0.2);
    k.lineTo(px1, bar - th * 0.2);
  });
  // The body: a cream chest streaked with brown, the folded wing over its side.
  const body: Trace = (k) => {
    k.moveTo(...at(0.16, -0.74));
    k.bezierCurveTo(...at(0.3, -0.62), ...at(0.3, -0.24), ...at(0.12, -0.08));
    k.quadraticCurveTo(...at(0, -0.02), ...at(-0.12, -0.12));
    k.bezierCurveTo(...at(-0.22, -0.34), ...at(-0.16, -0.66), ...at(0, -0.8));
    k.closePath();
  };
  fill(p, CHEST, body);
  within(p, body, () =>
    fill(p, tint([26, 34, 36], 0.75), (k) => {
      for (let i = 0; i < 22; i++) {
        const [sx, sy] = at(p.rr(0.04, 0.26), p.rr(-0.68, -0.14));
        k.moveTo(sx + S * 0.008, sy);
        k.ellipse(sx, sy, S * 0.008, S * 0.022, 0, 0, TAU);
      }
    }),
  );
  line(p, KEY, Math.max(1.2, S * 0.01), body);
  // Legs and talons gripping the bar.
  const LEG = hsl(46, 80, 56);
  line(p, LEG, Math.max(2, S * 0.035), (k) => {
    k.moveTo(...at(0.08, -0.1));
    k.lineTo(...at(0.07, -0.01));
    k.moveTo(...at(0.0, -0.09));
    k.lineTo(...at(0.0, -0.01));
  });
  fill(p, CHEST, (k) => k.ellipse(...at(0.05, -0.1), S * 0.08, S * 0.035, 0, 0, TAU));
  line(p, KEY, Math.max(1, S * 0.01), (k) => {
    for (const fx of [0.0, 0.07]) {
      k.moveTo(...at(fx - 0.02, 0));
      k.quadraticCurveTo(...at(fx + 0.04, -0.01), ...at(fx + 0.05, 0.04));
    }
  });
  const wing: Trace = (k) => {
    k.moveTo(...at(0.02, -0.72));
    k.bezierCurveTo(...at(0.16, -0.62), ...at(0.18, -0.36), ...at(0.08, -0.22));
    k.quadraticCurveTo(...at(-0.04, -0.06), ...at(-0.2, 0.06));
    k.bezierCurveTo(...at(-0.2, -0.2), ...at(-0.18, -0.5), ...at(-0.08, -0.68));
    k.closePath();
  };
  fill(p, BACK, wing);
  within(p, wing, () => {
    line(p, tint([28, 30, 46], 0.9), Math.max(1, S * 0.008), (k) => {
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 4; i++) {
          const [sx, sy] = at(-0.1 + i * 0.06 - row * 0.02, -0.62 + row * 0.1 + i * 0.03);
          k.moveTo(sx - S * 0.03, sy);
          k.quadraticCurveTo(sx, sy + S * 0.04, sx + S * 0.03, sy);
        }
      for (let i = 0; i < 4; i++) {
        k.moveTo(...at(0.06 - i * 0.04, -0.3 + i * 0.02));
        k.quadraticCurveTo(...at(-0.04 - i * 0.03, -0.12), ...at(-0.18 + i * 0.02, 0.04));
      }
    });
  });
  line(p, KEY, Math.max(1.2, S * 0.01), wing);
  // The message case strapped on its back.
  const cs = S * 0.05;
  line(p, KEY, Math.max(1, S * 0.008), (k) => {
    k.moveTo(...at(-0.08, -0.56));
    k.quadraticCurveTo(...at(0.12, -0.6), ...at(0.27, -0.5));
  });
  block(p, VERMILION, (k) => {
    const [ax, ay] = at(-0.03, -0.74);
    const [bx, by] = at(-0.14, -0.44);
    const nx = (-(by - ay) / Math.hypot(bx - ax, by - ay)) * cs;
    const ny = ((bx - ax) / Math.hypot(bx - ax, by - ay)) * cs;
    k.moveTo(ax + nx, ay + ny);
    k.lineTo(bx + nx, by + ny);
    k.lineTo(bx - nx, by - ny);
    k.lineTo(ax - nx, ay - ny);
    k.closePath();
  }, 1.2);
  fill(p, GOLDLEAF, (k) => {
    for (const t of [0, 1]) {
      const [cx, cy] = at(-0.03 - t * 0.11, -0.74 + t * 0.3);
      k.moveTo(cx + cs * 1.1, cy);
      k.arc(cx, cy, cs * 1.1, 0, TAU);
    }
  });
  // The head: dark cap, pale throat, the hooked beak with its yellow cere, a fierce brow over the eye.
  const head: Trace = (k) => k.arc(...at(0.08, -0.84), S * 0.12, 0, TAU);
  fill(p, BACK, head);
  within(p, head, () => fill(p, CHEST, (k) => k.ellipse(...at(0.15, -0.75), S * 0.09, S * 0.06, 0, 0, TAU)));
  line(p, KEY, Math.max(1.2, S * 0.01), head);
  block(p, hsl(220, 10, 26), (k) => {
    k.moveTo(...at(0.17, -0.9));
    k.quadraticCurveTo(...at(0.29, -0.91), ...at(0.29, -0.79));
    k.quadraticCurveTo(...at(0.25, -0.82), ...at(0.18, -0.8));
    k.closePath();
  }, 1);
  fill(p, SAFFRON, (k) => k.ellipse(...at(0.185, -0.86), S * 0.025, S * 0.035, 0, 0, TAU));
  fill(p, SAFFRON, (k) => k.arc(...at(0.12, -0.87), S * 0.026, 0, TAU));
  fill(p, KEY, (k) => k.arc(...at(0.125, -0.87), S * 0.012, 0, TAU));
  line(p, KEY, Math.max(1.5, S * 0.018), (k) => {
    k.moveTo(...at(0.03, -0.9));
    k.quadraticCurveTo(...at(0.12, -0.93), ...at(0.19, -0.9));
    k.moveTo(...at(0.1, -0.84));
    k.quadraticCurveTo(...at(0.11, -0.8), ...at(0.08, -0.76));
  });
  return { side: dir > 0 ? 'left' : 'right' };
}

/** Night mist: a soft pale band centred on (x, y), x by y, fading out to its edges. */
function haze(p: Press, x: number, y: number, rx: number, ry: number, a: number) {
  const g = p.c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(232,234,244,${a})`);
  g.addColorStop(1, 'rgba(232,234,244,0)');
  fill(p, g, (k) => {
    k.translate(x, y);
    k.scale(rx, ry);
    k.arc(0, 0, 1, 0, TAU);
  });
}

/** A dragon's foreleg reaching out from (x, y) at angle `a`, `s` long, with four curved talons. */
function claw(p: Press, x: number, y: number, s: number, a: number, ink: string) {
  const ex = x + Math.cos(a) * s;
  const ey = y + Math.sin(a) * s;
  line(p, KEY, s * 0.34 + 2.4, (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x + Math.cos(a - 0.6) * s * 0.6, y + Math.sin(a - 0.6) * s * 0.6, ex, ey);
  });
  line(p, ink, s * 0.34, (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x + Math.cos(a - 0.6) * s * 0.6, y + Math.sin(a - 0.6) * s * 0.6, ex, ey);
  });
  line(p, washiInk(), Math.max(1, s * 0.07), (k) => {
    for (let i = -1.5; i <= 1.5; i++) {
      const ta = a + i * 0.45;
      k.moveTo(ex, ey);
      k.quadraticCurveTo(ex + Math.cos(ta) * s * 0.35, ey + Math.sin(ta) * s * 0.35, ex + Math.cos(ta + 0.6) * s * 0.42, ey + Math.sin(ta + 0.6) * s * 0.42);
    }
  });
}

/** Fang, Avatar Roku's red dragon, winding through the clouds over the sea at sunset. */
export function fang(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.78, hsl(352, 54, 40), hsl(32, 84, 74));
  const horizon = h * 0.8;
  const dir = p.r() < 0.5 ? 1 : -1;
  sun(p, w * (dir > 0 ? 0.3 : 0.7), horizon - u * 0.1, u * 0.15, hsl(8, 80, 54));
  // Clouds behind him.
  for (let i = 0; i < 3; i++) cloud(p, w * p.rr(0.05, 0.95), h * p.rr(0.12, 0.7), u * p.rr(0.12, 0.2), hsl(36, 70, 90));
  // His body from beyond the edge to the head, rising and falling in long waves.
  const n = 64;
  const x0 = dir > 0 ? -w * 0.08 : w * 1.08;
  const x1 = dir > 0 ? w * 0.76 : w * 0.24;
  const yc = h * 0.44;
  const amp = h * 0.13;
  const ph = p.rr(0, Math.PI);
  const path: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [x0 + (x1 - x0) * t, yc + amp * Math.sin(t * Math.PI * 2.6 + ph) * (0.7 + 0.3 * t) - h * 0.06 * t];
  });
  const s = Math.min(u * 0.085, h * 0.1);
  const RED = hsl(356, 62, 44);
  const BELLY = hsl(42, 70, 78);
  // Legs under the body, then the body over their roots.
  for (const [t, reach] of [
    [0.42, 0.6],
    [0.8, -0.6],
  ]) {
    const [lx, ly] = path[Math.round(t * n)];
    claw(p, lx, ly + s * 0.2, s * 1.3, Math.PI / 2 + dir * reach, RED);
  }
  dragonBody(p, path, s, RED, BELLY, () => true);
  const [hx, hy] = path[n];
  dragonHead(p, hx, hy, s * 1.5, dir, RED, GOLDLEAF);
  // Clouds in front, where his body passes behind them.
  for (const t of [0.2, 0.58]) {
    const [cx, cy] = path[Math.round(t * n)];
    cloud(p, cx, cy + s * 0.4, u * p.rr(0.13, 0.18), hsl(36, 70, 92));
  }
  sea(p, horizon, INDIGO, hsl(14, 50, 56));
  line(p, hsl(30, 90, 66, 0.6), Math.max(1.5, u * 0.008), (k) => {
    const rx0 = w * (dir > 0 ? 0.3 : 0.7);
    for (let y = horizon + h * 0.02; y < h; y += h * 0.03) {
      const rx = rx0 + p.rr(-0.06, 0.06) * w;
      k.moveTo(rx - u * 0.05, y);
      k.lineTo(rx + u * 0.05, y);
    }
  });
  return { side: dir > 0 ? 'left' : 'right' };
}

/**
 * The Painted Lady on the river at Jang Hui by night: the spirit in her veiled hat and pale robes standing on
 * the water in mist, the village on its stilts behind her and a thin moon over it.
 */
export function paintedLady(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  const water = h * 0.56;
  bokashi(p, 0, water, hsl(228, 44, 12), hsl(214, 30, 34));
  const left = p.r() < 0.5;
  // A thin moon and a few stars.
  const mx = w * (left ? 0.26 : 0.74);
  const my = h * 0.14;
  const mr = u * 0.07;
  const d = mr * 0.55;
  const yi = Math.sqrt(mr * mr - (d * d) / 4);
  const a = Math.atan2(yi, d / 2);
  const b = Math.atan2(yi, -d / 2);
  fill(p, washiInk(0.92), (k) => {
    k.arc(mx, my, mr, a, TAU - a);
    k.arc(mx + d, my, mr, -b, b, true);
    k.closePath();
  });
  fill(p, washiInk(0.7), (k) => {
    for (let i = 0; i < 24; i++) {
      const sx = p.rr(0, w);
      const sy = p.rr(0, water * 0.8);
      const r = p.rr(0.5, 1.3);
      k.moveTo(sx + r, sy);
      k.arc(sx, sy, r, 0, TAU);
    }
  });
  // The village on its stilts at either side, lamps in a few windows.
  const STILT = hsl(222, 26, 20);
  for (const side of [-1, 1]) {
    const n = Math.max(2, Math.round((w / u) * 2));
    for (let i = 0; i < n; i++) {
      const hx = w / 2 + side * (w * 0.2 + (i * w * 0.32) / n) + p.rr(-0.02, 0.02) * w;
      const hw = u * p.rr(0.14, 0.2);
      const base = water - h * p.rr(0.0, 0.02);
      farHall(p, hx, base - u * 0.05, hw, hw * 0.9, STILT);
      line(p, STILT, Math.max(1, u * 0.006), (k) => {
        for (let j = 0; j < 4; j++) {
          k.moveTo(hx - hw * 0.32 + (j * hw * 0.64) / 3, base - u * 0.05);
          k.lineTo(hx - hw * 0.32 + (j * hw * 0.64) / 3, water + h * 0.02);
        }
      });
      if (p.r() < 0.7) fill(p, hsl(40, 90, 64, 0.9), (k) => k.rect(hx - hw * 0.08 + p.rr(-0.15, 0.15) * hw, base - u * 0.05 - hw * 0.36, hw * 0.12, hw * 0.12));
    }
  }
  // The river: dark water, ripples, the moon's light broken on it.
  bokashi(p, water, h + 4, hsl(218, 36, 26), hsl(228, 44, 10));
  line(p, washiInk(0.18), 1, (k) => {
    for (let i = 0; i < 40; i++) {
      const rx = p.rr(0, w);
      const ry = water + (h - water) * p.rr(0.02, 1);
      k.moveTo(rx, ry);
      k.lineTo(rx + u * p.rr(0.04, 0.1), ry);
    }
  });
  line(p, washiInk(0.55), Math.max(1.5, u * 0.008), (k) => {
    for (let y = water + h * 0.02; y < h * 0.8; y += h * 0.025) {
      const rx = mx + p.rr(-0.03, 0.03) * w;
      k.moveTo(rx - u * 0.03, y);
      k.lineTo(rx + u * 0.03, y);
    }
  });
  haze(p, w * 0.3, water + h * 0.03, w * 0.42, h * 0.025, 0.22);
  haze(p, w * 0.76, water + h * 0.1, w * 0.36, h * 0.03, 0.18);
  // The Painted Lady, a little off the middle, away from the moon.
  const F = Math.min(h * 0.5, w * 1.3);
  const fx = w / 2 + (left ? 1 : -1) * w * 0.06;
  const fy = h * 0.86;
  const at = (lx: number, ly: number): Pt => [fx + lx * F, fy + ly * F];
  const ROBE = hsl(44, 46, 82);
  const robe: Trace = (k) => {
    k.moveTo(...at(-0.07, -0.72));
    k.quadraticCurveTo(...at(-0.13, -0.71), ...at(-0.15, -0.64));
    k.bezierCurveTo(...at(-0.16, -0.4), ...at(-0.2, -0.15), ...at(-0.22, 0));
    k.quadraticCurveTo(...at(0, 0.03), ...at(0.22, 0));
    k.bezierCurveTo(...at(0.2, -0.15), ...at(0.16, -0.4), ...at(0.15, -0.64));
    k.quadraticCurveTo(...at(0.13, -0.71), ...at(0.07, -0.72));
    k.closePath();
  };
  fill(p, ROBE, robe);
  within(p, robe, () => {
    line(p, tint([40, 30, 62], 0.7), Math.max(1, F * 0.004), (k) => {
      for (let i = -3; i <= 3; i++) {
        k.moveTo(...at(i * 0.02, -0.46));
        k.quadraticCurveTo(...at(i * 0.03, -0.25), ...at(i * 0.06, 0.02));
      }
    });
    fill(p, CRIMSON, (k) => {
      const [sx, sy] = at(-0.3, -0.5);
      k.rect(sx, sy, F * 0.6, F * 0.045);
      const [hx, hy] = at(-0.3, -0.035);
      k.rect(hx, hy, F * 0.6, F * 0.06);
    });
  });
  line(p, KEY, Math.max(1, F * 0.005), robe);
  // The sash's long ribbons, and the wide sleeves hanging from her shoulders.
  line(p, CRIMSON, Math.max(1.5, F * 0.014), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(...at(m * 0.012, -0.46));
      k.bezierCurveTo(...at(m * 0.04, -0.36), ...at(m * 0.0, -0.26), ...at(m * 0.03, -0.14));
    }
  });
  for (const m of [-1, 1])
    block(p, ROBE, (k) => {
      k.moveTo(...at(m * 0.12, -0.69));
      k.quadraticCurveTo(...at(m * 0.24, -0.6), ...at(m * 0.27, -0.36));
      k.quadraticCurveTo(...at(m * 0.22, -0.32), ...at(m * 0.15, -0.34));
      k.quadraticCurveTo(...at(m * 0.13, -0.5), ...at(m * 0.1, -0.62));
      k.closePath();
    }, Math.max(1, F * 0.005));
  // Neck, face with its red markings, and her long hair falling in front of the shoulders.
  const SKIN = hsl(30, 30, 90);
  fill(p, SKIN, (k) => {
    const [nx, ny] = at(-0.02, -0.77);
    k.rect(nx, ny, F * 0.04, F * 0.06);
  });
  const face: Trace = (k) => k.ellipse(...at(0, -0.815), F * 0.045, F * 0.058, 0, 0, TAU);
  block(p, SKIN, face, Math.max(1, F * 0.004));
  line(p, VERMILION, Math.max(1, F * 0.006), (k) => {
    k.moveTo(...at(0, -0.858));
    k.lineTo(...at(0, -0.842));
    for (const m of [-1, 1])
      for (const dy of [0, 0.014]) {
        k.moveTo(...at(m * 0.018, -0.808 + dy));
        k.lineTo(...at(m * 0.034, -0.812 + dy));
      }
  });
  fill(p, VERMILION, (k) => k.ellipse(...at(0, -0.782), F * 0.008, F * 0.005, 0, 0, TAU));
  line(p, KEY, Math.max(1, F * 0.004), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(...at(m * 0.008, -0.828));
      k.quadraticCurveTo(...at(m * 0.018, -0.822), ...at(m * 0.028, -0.828));
    }
  });
  const HAIR = hsl(226, 30, 10);
  fill(p, HAIR, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(...at(m * 0.042, -0.86));
      k.quadraticCurveTo(...at(m * 0.06, -0.78), ...at(m * 0.05, -0.7));
      k.quadraticCurveTo(...at(m * 0.06, -0.62), ...at(m * 0.04, -0.56));
      k.quadraticCurveTo(...at(m * 0.03, -0.66), ...at(m * 0.035, -0.74));
      k.quadraticCurveTo(...at(m * 0.04, -0.8), ...at(m * 0.03, -0.86));
      k.closePath();
    }
  });
  // The wide hat, and the veil hanging from its brim over her face and shoulders.
  const STRAW = hsl(42, 40, 62);
  block(p, STRAW, (k) => {
    k.moveTo(...at(-0.08, -0.895));
    k.lineTo(...at(0, -0.955));
    k.lineTo(...at(0.08, -0.895));
    k.closePath();
  }, Math.max(1, F * 0.004));
  const brim: Trace = (k) => k.ellipse(...at(0, -0.89), F * 0.2, F * 0.028, 0, 0, TAU);
  block(p, STRAW, brim, Math.max(1, F * 0.004));
  const veil: Trace = (k) => {
    k.moveTo(...at(-0.19, -0.885));
    k.quadraticCurveTo(...at(0, -0.86), ...at(0.19, -0.885));
    k.lineTo(...at(0.17, -0.6));
    for (let i = 1; i <= 8; i++) k.quadraticCurveTo(...at(0.17 - (i - 0.5) * 0.0425, i % 2 ? -0.575 : -0.6), ...at(0.17 - i * 0.0425, -0.6));
    k.closePath();
  };
  fill(p, washiInk(0.34), veil);
  line(p, washiInk(0.4), Math.max(1, F * 0.003), (k) => {
    for (let i = -4; i <= 4; i++) {
      k.moveTo(...at(i * 0.042, -0.875));
      k.lineTo(...at(i * 0.038, -0.6));
    }
  });
  line(p, washiInk(0.6), Math.max(1, F * 0.003), veil);
  // Mist round her feet, and her reflection broken on the water.
  line(p, tint([44, 46, 82], 0.3), Math.max(1.5, F * 0.012), (k) => {
    for (let i = 0; i < 6; i++) {
      const [rx, ry] = at(0, 0.03 + i * 0.03);
      const rw = F * (0.2 - i * 0.025);
      k.moveTo(rx - rw, ry);
      k.lineTo(rx + rw, ry);
    }
  });
  haze(p, fx, fy - F * 0.01, F * 0.42, F * 0.05, 0.4);
  return { side: left ? 'right' : 'left' };
}
