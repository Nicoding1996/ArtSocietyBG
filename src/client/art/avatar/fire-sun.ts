import { hsl, type Pt } from '../common';
import { type Trace, TAU, type Press, fill, fireMark, line, within } from './print';
import { ASH, CRIMSON, GOLDLEAF, KEY, LAVA, SAFFRON, VERMILION, block, bokashi, cloud, fireHall, flame, kasumi, merged, sea, smoke, sun, tint, volcano, volcanoShape, washiInk } from './woodblock';

/** The sun and the fire under the earth: the Sun Warriors, the dragons, the comet, the volcanoes, the eclipse. */

const JUNGLE = hsl(140, 34, 26);
const JUNGLE_LIGHT = hsl(110, 30, 40);
const RUIN = hsl(36, 22, 62);

/** A round mass of jungle trees, dark and outlined, standing on (x, y). */
function canopy(p: Press, x: number, y: number, s: number, ink = JUNGLE) {
  merged(p, ink, (k) => {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      const cx = x + Math.cos(a) * s * 0.5;
      const cy = y - s * 0.3 + Math.sin(a) * s * 0.35;
      k.moveTo(cx + s * 0.35, cy);
      k.arc(cx, cy, s * 0.35, 0, TAU);
    }
    k.rect(x - s * 0.7, y - s * 0.35, s * 1.4, s * 0.35);
  }, 1.2);
  // Leaves picked out in a lighter green.
  line(p, tint([110, 30, 50], 0.8), Math.max(1, s * 0.02), (k) => {
    for (let i = 0; i < 6; i++) {
      const lx = x + p.rr(-0.6, 0.6) * s;
      const ly = y - p.rr(0.2, 0.6) * s;
      k.moveTo(lx - s * 0.08, ly);
      k.quadraticCurveTo(lx, ly - s * 0.08, lx + s * 0.08, ly);
    }
  });
}

/** The Sun Warriors' city: a stepped temple in the jungle with the sun stone at its top, mist and vines. */
export function sunWarriors(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.5, hsl(196, 40, 70), hsl(50, 60, 90, 0));
  sun(p, w * 0.5, h * 0.12, u * 0.06, washiInk());
  const base = h * 0.72;
  const tw = Math.min(w * 0.7, u * 0.95);
  const steps = 5;
  const sh = (base - h * 0.28) / steps;
  for (let i = 0; i < steps; i++) {
    const bw = tw * (1 - i * 0.16);
    const y = base - i * sh;
    block(p, tint([36, 22, 62], 1, -i * 3), (k) => {
      k.moveTo(w / 2 - bw / 2, y);
      k.lineTo(w / 2 - bw / 2 + sh * 0.3, y - sh);
      k.lineTo(w / 2 + bw / 2 - sh * 0.3, y - sh);
      k.lineTo(w / 2 + bw / 2, y);
      k.closePath();
    }, 1.2);
  }
  // The stair up the middle, the shrine at the top and the sun stone over it.
  const top = base - steps * sh;
  block(p, tint([36, 22, 62], 1, 10), (k) => {
    k.moveTo(w / 2 - tw * 0.08, base);
    k.lineTo(w / 2 - tw * 0.05, top);
    k.lineTo(w / 2 + tw * 0.05, top);
    k.lineTo(w / 2 + tw * 0.08, base);
    k.closePath();
  }, 1);
  line(p, 'rgba(0,0,0,0.3)', 1, (k) => {
    for (let y = top + sh * 0.25; y < base; y += sh * 0.25) {
      const t = (y - top) / (base - top);
      const hw = tw * (0.05 + t * 0.03);
      k.moveTo(w / 2 - hw, y);
      k.lineTo(w / 2 + hw, y);
    }
  });
  block(p, RUIN, (k) => k.rect(w / 2 - tw * 0.1, top - sh * 0.9, tw * 0.2, sh * 0.9), 1.2);
  const sr = tw * 0.09;
  block(p, GOLDLEAF, (k) => k.arc(w / 2, top - sh * 0.9 - sr * 0.8, sr, 0, TAU), 1.2);
  line(p, KEY, Math.max(1, sr * 0.08), (k) => {
    k.arc(w / 2, top - sh * 0.9 - sr * 0.8, sr * 0.55, 0, TAU);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      k.moveTo(w / 2 + Math.cos(a) * sr * 0.62, top - sh * 0.9 - sr * 0.8 + Math.sin(a) * sr * 0.62);
      k.lineTo(w / 2 + Math.cos(a) * sr * 0.9, top - sh * 0.9 - sr * 0.8 + Math.sin(a) * sr * 0.9);
    }
  });
  // Vines down the steps, mist, and the jungle closing in at the sides and the front.
  line(p, JUNGLE_LIGHT, Math.max(1, u * 0.005), (k) => {
    for (let i = 0; i < 10; i++) {
      const vx = w / 2 + p.rr(-0.45, 0.45) * tw;
      const vy = base - p.rr(0.3, 1) * (base - top);
      k.moveTo(vx, vy);
      k.quadraticCurveTo(vx + u * 0.02, vy + sh * 0.6, vx - u * 0.01, vy + sh * p.rr(0.8, 1.6));
    }
  });
  kasumi(p, -w * 0.05, w * 0.4, h * 0.42, h * 0.04);
  kasumi(p, w * 0.6, w * 1.05, h * 0.52, h * 0.04);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    canopy(p, w / 2 + side * (tw * 0.5 + p.rr(0, 0.3) * u), base + h * p.rr(0, 0.06), u * p.rr(0.2, 0.32), i < 2 ? JUNGLE_LIGHT : JUNGLE);
  }
  const n = Math.max(3, Math.round((w / u) * 3));
  for (let i = 0; i < n; i++) canopy(p, (w * (i + 0.5)) / n, h * 1.02, u * p.rr(0.3, 0.42));
}

/** A dragon's body along `path` (tail first), drawn where `front` says: thin at the tail, `s` thick in the middle. */
export function dragonBody(p: Press, path: Pt[], s: number, ink: string, belly: string, front: (i: number) => boolean) {
  for (let i = 1; i < path.length; i++) {
    if (!front(i)) continue;
    const t = i / (path.length - 1);
    const th = s * (0.25 + 0.75 * Math.sin(Math.PI * t * 0.85));
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    line(p, KEY, th + 2.4, (k) => {
      k.moveTo(x0, y0);
      k.lineTo(x1, y1);
    });
    line(p, ink, th, (k) => {
      k.moveTo(x0, y0);
      k.lineTo(x1, y1);
    });
    line(p, belly, th * 0.3, (k) => {
      k.moveTo(x0, y0 + th * 0.18);
      k.lineTo(x1, y1 + th * 0.18);
    });
    // Spines along the top, every other step.
    if (i % 2 === 0)
      fill(p, KEY, (k) => {
        k.moveTo(x1 - th * 0.2, y1 - th * 0.45);
        k.lineTo(x1, y1 - th * 0.85);
        k.lineTo(x1 + th * 0.2, y1 - th * 0.45);
        k.closePath();
      });
  }
}

/**
 * A dragon's head in profile facing `dir`, (x, y) where the neck joins it and `s` from there to the nose: a
 * mane of flame behind, antlers swept back, a heavy brow over the eye, an upturned snout, the jaw open on its
 * teeth, and whiskers trailing.
 */
export function dragonHead(p: Press, x: number, y: number, s: number, dir: number, ink: string, mane: string) {
  const at = (lx: number, ly: number): Pt => [x + dir * lx * s, y + ly * s];
  const poly = (k: CanvasRenderingContext2D, pts: number[]) => {
    k.moveTo(...at(pts[0], pts[1]));
    for (let i = 2; i < pts.length; i += 2) k.lineTo(...at(pts[i], pts[i + 1]));
  };
  // The mane: five tongues of flame fanning back from the skull, a longer darker set behind a lighter one.
  for (const [inkM, reach] of [
    [tint([352, 40, 30]), 0.72],
    [mane, 0.58],
  ] as [string, number][])
    block(p, inkM, (k) => {
      for (let i = 0; i < 5; i++) {
        const bx = 0.04 - i * 0.015;
        const by = -0.1 + i * 0.07;
        k.moveTo(...at(bx, by - 0.08));
        k.quadraticCurveTo(...at(bx - reach * 0.45, by - 0.2), ...at(bx - reach, by - 0.32 + i * 0.12));
        k.quadraticCurveTo(...at(bx - reach * 0.4, by + 0.02), ...at(bx, by + 0.08));
        k.closePath();
      }
    }, 1);
  // Antlers, the far one first.
  for (const [dx, dy, ink2] of [
    [0.08, 0.02, tint([40, 30, 62])],
    [0, 0, tint([42, 40, 80])],
  ] as [number, number, string][]) {
    const horn = (k: CanvasRenderingContext2D) => {
      poly(k, [0.12 + dx, -0.28 + dy, -0.14 + dx, -0.5 + dy, -0.46 + dx, -0.56 + dy]);
      poly(k, [-0.1 + dx, -0.47 + dy, -0.12 + dx, -0.68 + dy]);
    };
    line(p, KEY, Math.max(2.4, s * 0.1), horn);
    line(p, ink2, Math.max(1.2, s * 0.06), horn);
  }
  // The open mouth behind the jaws, then the head itself.
  fill(p, CRIMSON, (k) => {
    poly(k, [0.38, 0.02, 0.86, -0.03, 0.8, 0.17]);
    k.closePath();
  });
  // Teeth down from the upper jaw and up from the lower, the edges of the mouth running from its corner.
  const upper = (t: number) => 0.02 - (t - 0.38) * 0.104;
  const lower = (t: number) => 0.02 + (t - 0.38) * 0.357;
  fill(p, washiInk(), (k) => {
    for (const t of [0.5, 0.6, 0.7, 0.79]) {
      poly(k, [t, upper(t) - 0.01, t + 0.05, upper(t + 0.05) - 0.01, t + 0.025, upper(t + 0.025) + 0.06]);
      k.closePath();
    }
    for (const t of [0.52, 0.62]) {
      poly(k, [t, lower(t) + 0.01, t + 0.05, lower(t + 0.05) + 0.01, t + 0.025, lower(t + 0.025) - 0.06]);
      k.closePath();
    }
  });
  block(p, ink, (k) => {
    k.moveTo(...at(-0.12, -0.05));
    k.quadraticCurveTo(...at(-0.1, -0.33), ...at(0.18, -0.31));
    k.quadraticCurveTo(...at(0.34, -0.3), ...at(0.38, -0.22));
    k.lineTo(...at(0.7, -0.16));
    k.quadraticCurveTo(...at(0.82, -0.26), ...at(0.89, -0.13));
    k.quadraticCurveTo(...at(0.92, -0.05), ...at(0.86, -0.03));
    k.lineTo(...at(0.38, 0.02));
    k.lineTo(...at(0.8, 0.17));
    k.quadraticCurveTo(...at(0.82, 0.23), ...at(0.74, 0.25));
    k.quadraticCurveTo(...at(0.4, 0.31), ...at(0.12, 0.22));
    k.lineTo(...at(-0.12, 0.12));
    k.closePath();
  }, Math.max(1, s * 0.035));
  // The brow, the eye under it, and the nostril.
  block(p, tint([352, 40, 22]), (k) => {
    poly(k, [0.16, -0.24, 0.3, -0.31, 0.46, -0.24, 0.3, -0.25]);
    k.closePath();
  }, 1);
  fill(p, SAFFRON, (k) => k.ellipse(...at(0.3, -0.18), s * 0.075, s * 0.045, 0, 0, TAU));
  fill(p, KEY, (k) => k.ellipse(...at(0.31, -0.18), s * 0.018, s * 0.04, 0, 0, TAU));
  line(p, KEY, Math.max(1, s * 0.03), (k) => {
    k.moveTo(...at(0.8, -0.12));
    k.quadraticCurveTo(...at(0.84, -0.17), ...at(0.86, -0.1));
  });
  // A whisker from the lip trailing back under the jaw, and a tuft of beard under the chin.
  line(p, KEY, Math.max(1, s * 0.025), (k) => {
    k.moveTo(...at(0.84, -0.06));
    k.bezierCurveTo(...at(0.98, 0.12), ...at(0.7, 0.42), ...at(0.4, 0.4));
    k.quadraticCurveTo(...at(0.15, 0.38), ...at(0.05, 0.56));
  });
  block(p, mane, (k) => {
    poly(k, [0.5, 0.26, 0.42, 0.5, 0.36, 0.27]);
    k.closePath();
    poly(k, [0.36, 0.27, 0.24, 0.44, 0.24, 0.24]);
    k.closePath();
  }, 1);
}

/** Ran and Shaw, the red dragon and the blue, coiling round each other up the sky with fire of every colour between them. */
export function ranShaw(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.6, hsl(40, 70, 66), hsl(40, 60, 86, 0));
  for (let i = 0; i < 4; i++) cloud(p, w * p.rr(0.1, 0.9), h * p.rr(0.15, 0.9), u * p.rr(0.14, 0.22));
  const cx = w / 2;
  const amp = Math.min(w * 0.3, u * 0.32);
  const top = h * 0.3;
  const bottom = h * 1.05;
  const n = 48;
  const turns = 1.6;
  const s = u * 0.11;
  const hs = s * 1.5;
  // Their coils swell in the middle and the two are a little out of step, so they read as bodies, not a pattern.
  // Near the top the necks part, so the heads face each other across the fire with a gap between their jaws.
  const phases = [0, Math.PI * 0.82];
  const helix = (t: number, d: number) => {
    const a = amp * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    return cx + Math.sin(t * turns * TAU + phases[d]) * a + (d ? 1 : -1) * amp * 0.25 * (1 - t);
  };
  const sides = helix(0.85, 0) < helix(0.85, 1) ? [-1, 1] : [1, -1];
  const gap = u * 0.07 + hs * 0.9;
  const paths: Pt[][] = phases.map((_, d) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const e = Math.max(0, (t - 0.7) / 0.3);
      const part = e * e * (3 - 2 * e);
      return [helix(t, d) * (1 - part) + (cx + sides[d] * gap) * part, bottom - (bottom - top) * t] as Pt;
    }),
  );
  const depth = (i: number, d: number) => Math.cos((i / n) * turns * TAU + phases[d]);
  const inks: [string, string][] = [
    [VERMILION, SAFFRON],
    [hsl(210, 60, 44), hsl(190, 60, 78)],
  ];
  // The coils behind first, then the ones in front.
  for (const front of [false, true])
    paths.forEach((path, d) => dragonBody(p, path, s, inks[d][0], inks[d][1], (i) => depth(i, d) >= 0 === front));
  // The fire of many colours between their jaws.
  const fy = top + hs * 0.05;
  const colours = [VERMILION, SAFFRON, hsl(130, 50, 50), hsl(200, 70, 55), hsl(280, 40, 55)];
  colours.forEach((ink, i) => {
    const r = u * (0.1 - i * 0.016);
    fill(p, ink, (k) => {
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * TAU + i * 0.4;
        k.moveTo(cx, fy);
        k.quadraticCurveTo(cx + Math.cos(a - 0.4) * r, fy + Math.sin(a - 0.4) * r, cx + Math.cos(a) * r * 1.2, fy + Math.sin(a) * r * 1.2);
        k.quadraticCurveTo(cx + Math.cos(a + 0.3) * r * 0.5, fy + Math.sin(a + 0.3) * r * 0.5, cx, fy);
      }
    });
  });
  paths.forEach((path, d) => {
    const [hx, hy] = path[n];
    dragonHead(p, hx, hy, hs, -sides[d], inks[d][0], inks[d][1]);
  });
}

/** The eternal flame on its altar in the dark of the Sun Warriors' temple, the sun carved on the wall behind. */
export function eternalFlame(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  fill(p, hsl(20, 30, 11), (k) => k.rect(-4, -4, w + 8, h + 8));
  const fx = w / 2;
  const fy = h * 0.62;
  const glow = c.createRadialGradient(fx, fy - h * 0.12, 0, fx, fy - h * 0.12, Math.max(w, h) * 0.6);
  glow.addColorStop(0, 'rgba(255,180,80,0.75)');
  glow.addColorStop(0.5, 'rgba(200,90,40,0.25)');
  glow.addColorStop(1, 'rgba(200,90,40,0)');
  fill(p, glow, (k) => k.rect(-4, -4, w + 8, h + 8));
  // The carved sun on the back wall.
  const sy = h * 0.24;
  const sr = u * 0.2;
  line(p, 'rgba(255,200,120,0.35)', Math.max(1.5, u * 0.012), (k) => {
    k.arc(fx, sy, sr * 0.55, 0, TAU);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      k.moveTo(fx + Math.cos(a) * sr * 0.7, sy + Math.sin(a) * sr * 0.7);
      k.lineTo(fx + Math.cos(a) * sr, sy + Math.sin(a) * sr);
    }
  });
  // Pillars of the hall.
  for (const m of [-1, 1])
    block(p, hsl(24, 24, 20), (k) => k.rect(fx + m * w * 0.36 - u * 0.06, -4, u * 0.12, h + 8), 1.2);
  // The steps and the altar.
  for (let i = 0; i < 3; i++) block(p, hsl(28, 16, 30 + i * 4), (k) => k.rect(fx - u * (0.45 - i * 0.1), h * (0.86 - i * 0.06), u * (0.9 - i * 0.2), h * 0.06), 1.2);
  block(p, hsl(28, 16, 40), (k) => {
    k.moveTo(fx - u * 0.16, h * 0.68);
    k.lineTo(fx - u * 0.1, fy);
    k.lineTo(fx + u * 0.1, fy);
    k.lineTo(fx + u * 0.16, h * 0.68);
    k.closePath();
  }, 1.2);
  block(p, hsl(28, 16, 46), (k) => k.rect(fx - u * 0.13, fy - h * 0.02, u * 0.26, h * 0.025), 1.2);
  flame(p, fx, fy - h * 0.02, h * 0.34, p.rr(-0.15, 0.15));
}

/** Sozin's Comet: its fiery tail across the night sky over a volcano and the sea, lighting both. */
export function comet(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.8, hsl(226, 50, 14), hsl(14, 60, 40));
  fill(p, washiInk(0.85), (k) => {
    for (let i = 0; i < 40; i++) {
      const sx = p.rr(0, w);
      const sy = p.rr(0, h * 0.5);
      const r = p.rr(0.6, 1.6);
      k.moveTo(sx + r, sy);
      k.arc(sx, sy, r, 0, TAU);
    }
  });
  // The comet: a long tapering tail from a high corner down to its bright head.
  const left = p.r() < 0.5;
  const tx = left ? -w * 0.1 : w * 1.1;
  const ty = -h * 0.05;
  const hx = w * (left ? 0.64 : 0.36);
  const hy = h * 0.36;
  const dx = hx - tx;
  const dy = hy - ty;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const r = u * 0.05;
  [
    [hsl(14, 80, 50, 0.85), 3.2],
    [hsl(30, 90, 60, 0.9), 2],
    [hsl(48, 90, 82), 1],
  ].forEach(([ink, wd]) => {
    const wr = r * (wd as number);
    fill(p, ink as string, (k) => {
      k.moveTo(tx + nx * wr * 0.2, ty + ny * wr * 0.2);
      k.quadraticCurveTo(hx - dx * 0.3 + nx * wr, hy - dy * 0.3 + ny * wr, hx + nx * wr * 0.4, hy + ny * wr * 0.4);
      k.arc(hx, hy, wr * 0.4, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
      k.quadraticCurveTo(hx - dx * 0.3 - nx * wr, hy - dy * 0.3 - ny * wr, tx - nx * wr * 0.2, ty - ny * wr * 0.2);
      k.closePath();
    });
  });
  const glow = c.createRadialGradient(hx, hy, 0, hx, hy, r * 4);
  glow.addColorStop(0, 'rgba(255,240,200,0.9)');
  glow.addColorStop(1, 'rgba(255,160,80,0)');
  fill(p, glow, (k) => k.arc(hx, hy, r * 4, 0, TAU));
  // The volcano under it, glowing at the crater, and the sea.
  const shore = h * 0.8;
  const vw = Math.min(w * 0.45, h * 0.75);
  const [cx, cy] = volcano(p, w / 2 - vw, w / 2 + vw, shore, h * 0.55, [16, 12, 22]);
  fill(p, hsl(16, 90, 56), (k) => k.ellipse(cx, cy + h * 0.005, w * 0.07, h * 0.008, 0, 0, TAU));
  // The smoke drifts away from the comet's head, so nothing dims it.
  smoke(p, cx, cy - h * 0.01, u * 0.06, left ? -0.8 : 0.8, [16, 10, 30]);
  sea(p, shore, hsl(226, 50, 18));
  line(p, hsl(30, 90, 64, 0.7), Math.max(1.5, u * 0.008), (k) => {
    for (let y = shore + h * 0.02; y < h; y += h * 0.025) {
      const rx = hx + p.rr(-0.05, 0.05) * w;
      k.moveTo(rx - u * 0.04, y);
      k.lineTo(rx + u * 0.04, y);
    }
  });
}

/** The Fire Nation's airships in formation under a burning sky, smoke rising from the forest below. */
export function airships(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.8, hsl(352, 60, 34), hsl(24, 90, 62));
  const ground = h * 0.82;
  // Burning forest and its smoke.
  for (let i = 0; i < 4; i++) smoke(p, w * p.rr(0.05, 0.95), ground, u * p.rr(0.07, 0.11), p.rr(-1, 1), [20, 10, 24]);
  const treeline: number[] = [];
  for (let x = 0; x <= w + 8; x += u * 0.05) treeline.push(ground - u * p.rr(0.01, 0.05));
  block(p, hsl(20, 30, 14), (k) => {
    k.moveTo(-4, ground);
    treeline.forEach((y, i) => k.lineTo(i * u * 0.05, y));
    k.lineTo(w + 4, h + 4);
    k.lineTo(-4, h + 4);
    k.closePath();
  }, 1.2);
  const fires = Math.max(4, Math.round((w / u) * 5));
  for (let i = 0; i < fires; i++) flame(p, w * p.rr(0, 1), ground + h * p.rr(0.02, 0.12), h * p.rr(0.06, 0.12));
  // The fleet, nearer ships lower and larger.
  const n = Math.max(3, Math.round((w / u) * 2.2));
  const ships = Array.from({ length: n }, (_, i) => ({ x: (w * (i + p.rr(0.2, 0.8))) / n, d: p.rr(0, 1) })).sort((a, b) => a.d - b.d);
  const dir = p.r() < 0.5 ? 1 : -1;
  for (const { x, d } of ships) airship(p, x, h * (0.18 + d * 0.4), u * (0.12 + d * 0.16), dir);
}

/** A Fire Nation airship: a long dark envelope with tail fins, the flame painted on its side, a gondola below. */
function airship(p: Press, x: number, y: number, s: number, dir: number) {
  block(p, hsl(220, 8, 24), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x - dir * s * 0.7, y + m * s * 0.12);
      k.lineTo(x - dir * s * 1.05, y + m * s * 0.38);
      k.lineTo(x - dir * s * 0.98, y + m * s * 0.04);
      k.closePath();
    }
  }, 1);
  const hull: Trace = (k) => k.ellipse(x, y, s, s * 0.24, 0, 0, TAU);
  block(p, hsl(220, 6, 36), hull, Math.max(1, s * 0.02));
  within(p, hull, () =>
    line(p, 'rgba(0,0,0,0.3)', Math.max(1, s * 0.012), (k) => {
      for (let i = -3; i <= 3; i++) {
        k.moveTo(x + i * s * 0.25, y - s * 0.3);
        k.quadraticCurveTo(x + i * s * 0.28, y, x + i * s * 0.25, y + s * 0.3);
      }
    }),
  );
  fireMark(p, x + dir * s * 0.3, y, s * 0.12, VERMILION);
  block(p, hsl(220, 8, 22), (k) => k.rect(x - s * 0.25, y + s * 0.22, s * 0.5, s * 0.1), 1);
}

/** The Fire Temple on Crescent Island: a tall red spire on the cliffs of a volcano, lava running to the sea. */
export function fireTemple(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.6, hsl(18, 70, 56), hsl(40, 70, 84, 0));
  const shore = h * 0.8;
  const vw = Math.min(w * 0.48, h * 0.8);
  const [cx, cy] = volcano(p, w * 0.28 - vw, w * 0.28 + vw, shore, h * 0.32);
  smoke(p, cx, cy, u * 0.07, 1);
  within(p, volcanoShape(w * 0.28 - vw, w * 0.28 + vw, shore, h * 0.32), () =>
    line(p, hsl(16, 90, 54), Math.max(2, u * 0.012), (k) => {
      for (const a of [-0.6, 0.2]) {
        k.moveTo(cx + a * w * 0.04, cy + h * 0.01);
        k.bezierCurveTo(cx + a * w * 0.15, cy + h * 0.15, cx + a * w * 0.3, cy + h * 0.3, cx + a * w * 0.5, shore + 4);
      }
    }),
  );
  // The cliff the temple stands on, and the temple: a hall with a spire of five roofs and a flame at its tip.
  const tx = w * 0.72;
  const ty = h * 0.58;
  block(p, tint(ASH, 1, -10), (k) => {
    k.moveTo(w * 0.5, shore);
    k.lineTo(w * 0.55, ty + h * 0.04);
    k.lineTo(tx - u * 0.1, ty);
    k.lineTo(w + 4, ty - h * 0.02);
    k.lineTo(w + 4, shore);
    k.closePath();
  }, 1.4);
  fireHall(p, tx, ty, u * 0.36, u * 0.22, 1);
  let y = ty - u * 0.2;
  for (let i = 0; i < 5; i++) {
    const rw = u * (0.22 - i * 0.035);
    block(p, VERMILION, (k) => k.rect(tx - rw * 0.3, y - u * 0.05, rw * 0.6, u * 0.05), 1);
    fireRoofTier(p, tx, y - u * 0.05, rw, u * 0.03);
    y -= u * 0.075;
  }
  fireMark(p, tx, y - u * 0.03, u * 0.04, GOLDLEAF);
  sea(p, shore);
  kasumi(p, -w * 0.05, w * 0.5, h * 0.5, h * 0.035);
}

/** A thin roof tier on a spire. */
function fireRoofTier(p: Press, x: number, y: number, rw: number, rh: number) {
  block(p, hsl(352, 34, 20), (k) => {
    k.moveTo(x - rw / 2, y - rh * 0.2);
    k.quadraticCurveTo(x - rw * 0.3, y + rh * 0.4, x, y + rh * 0.3);
    k.quadraticCurveTo(x + rw * 0.3, y + rh * 0.4, x + rw / 2, y - rh * 0.2);
    k.lineTo(x + rw * 0.25, y - rh);
    k.lineTo(x - rw * 0.25, y - rh);
    k.closePath();
  }, 1);
}

/** Avatar Roku's island on its last day: the volcano throwing up fire and ash, lava down to the sea, his house below. */
export function rokuIsland(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.7, hsl(352, 50, 18), hsl(14, 70, 40));
  const shore = h * 0.82;
  // The ash cloud: heavy dark puffs over the crater.
  const vx = w * p.rr(0.4, 0.6);
  const top = h * 0.36;
  const ash = Array.from({ length: 10 }, () => {
    const a = p.rr(Math.PI * 1.1, Math.PI * 1.9);
    const d = u * p.rr(0.1, 0.4);
    return [vx + Math.cos(a) * d * 1.4, top - u * 0.1 + Math.sin(a) * d, u * p.rr(0.08, 0.16)];
  });
  merged(p, hsl(20, 8, 24), (k) => {
    for (const [ax, ay, pr] of ash) {
      k.moveTo(ax + pr, ay);
      k.arc(ax, ay, pr, 0, TAU);
    }
  }, 1);
  const vw = Math.min(w * 0.8, h * 1.1);
  const [cx, cy] = volcano(p, vx - vw, vx + vw, shore, top, [12, 14, 20]);
  // The fountain of fire, and lava down the sides, kept on the mountain.
  for (let i = 0; i < 5; i++) flame(p, cx + (i - 2) * u * 0.04, cy + h * 0.01, h * p.rr(0.12, 0.22), (i - 2) * 0.3, [hsl(LAVA[0], LAVA[1], LAVA[2]), SAFFRON, hsl(50, 90, 82)]);
  within(p, volcanoShape(vx - vw, vx + vw, shore, top), () =>
    line(p, hsl(LAVA[0], LAVA[1], LAVA[2] + 4), Math.max(2, u * 0.014), (k) => {
      for (let i = 0; i < 4; i++) {
        const a = -1 + (2 * i) / 3 + p.rr(-0.15, 0.15);
        k.moveTo(cx + a * vw * 0.05, cy + h * 0.01);
        k.bezierCurveTo(cx + a * vw * 0.15, cy + h * 0.12, cx + a * vw * 0.38, cy + h * 0.25, cx + a * vw * 0.62, shore + 4);
      }
    }),
  );
  fill(p, 'rgba(255,170,80,0.7)', (k) => {
    for (let i = 0; i < 24; i++) {
      const ex = cx + p.rr(-0.25, 0.25) * u;
      const ey = cy - p.rr(0.05, 0.3) * u;
      const er = Math.max(0.8, u * p.rr(0.003, 0.008));
      k.moveTo(ex + er, ey);
      k.arc(ex, ey, er, 0, TAU);
    }
  });
  // Roku's house by the shore, under a tree.
  const hx = vx + (p.r() < 0.5 ? -1 : 1) * w * 0.3;
  fireHall(p, hx, shore - h * 0.005, u * 0.16, u * 0.1);
  sea(p, shore, hsl(226, 40, 20));
}

/** The Day of Black Sun: the moon over the sun at noon, its corona burning white over the palace roofs in shadow. */
export function blackSun(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h, hsl(226, 50, 10), hsl(240, 30, 30));
  fill(p, washiInk(0.8), (k) => {
    for (let i = 0; i < 30; i++) {
      const sx = p.rr(0, w);
      const sy = p.rr(0, h * 0.6);
      const r = p.rr(0.5, 1.4);
      k.moveTo(sx + r, sy);
      k.arc(sx, sy, r, 0, TAU);
    }
  });
  const sx = w * p.rr(0.35, 0.65);
  const sy = h * 0.3;
  const r = u * 0.13;
  const corona = c.createRadialGradient(sx, sy, r * 0.9, sx, sy, r * 2.4);
  corona.addColorStop(0, 'rgba(255,250,230,0.95)');
  corona.addColorStop(0.3, 'rgba(255,220,160,0.45)');
  corona.addColorStop(1, 'rgba(255,200,120,0)');
  fill(p, corona, (k) => k.arc(sx, sy, r * 2.4, 0, TAU));
  line(p, 'rgba(255,245,220,0.6)', Math.max(1, u * 0.004), (k) => {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + p.rr(-0.05, 0.05);
      k.moveTo(sx + Math.cos(a) * r * 1.05, sy + Math.sin(a) * r * 1.05);
      k.lineTo(sx + Math.cos(a) * r * p.rr(1.5, 2.2), sy + Math.sin(a) * r * p.rr(1.5, 2.2));
    }
  });
  fill(p, hsl(230, 30, 6), (k) => k.arc(sx, sy, r, 0, TAU));
  fill(p, 'rgba(255,240,200,0.95)', (k) => k.arc(sx + r * 0.72, sy - r * 0.68, r * 0.08, 0, TAU));
  // The palace in shadow.
  const base = h * 0.8;
  block(p, hsl(232, 24, 14), (k) => k.rect(-4, base, w + 8, h - base + 4), 1.2);
  fireHall(p, w / 2, base, Math.min(w * 0.7, u * 0.9), u * 0.42, 2);
  fill(p, 'rgba(20,20,50,0.55)', (k) => k.rect(-4, base - u * 0.45, w + 8, h));
}

/** The volcanic islands at sunset: cones on the horizon trailing smoke, the low red sun, and the waves in front. */
export function volcanicIslands(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.6, hsl(352, 60, 40), hsl(30, 90, 70));
  const horizon = h * 0.6;
  sun(p, w * p.rr(0.3, 0.7), horizon - u * 0.22, u * 0.1, hsl(6, 80, 52));
  const n = Math.max(2, Math.round((w / u) * 1.6));
  for (let i = 0; i < n; i++) {
    const x = (w * (i + p.rr(0.25, 0.75))) / n;
    const s = u * p.rr(0.3, 0.55);
    const [cx, cy] = volcano(p, x - s, x + s, horizon + h * 0.01, horizon - s * p.rr(0.45, 0.7), [14, 20, 18 + i * 4]);
    if (p.r() < 0.7) smoke(p, cx, cy, s * 0.12, p.rr(0.4, 1));
  }
  kasumi(p, -w * 0.05, w * 0.5, horizon - h * 0.1, h * 0.03, hsl(30, 80, 76, 0.9));
  sea(p, horizon, hsl(230, 40, 22), hsl(16, 60, 56));
  line(p, hsl(30, 90, 66, 0.6), Math.max(1.5, u * 0.008), (k) => {
    for (let y = horizon + h * 0.03; y < h; y += h * 0.03) {
      const rx = w / 2 + p.rr(-0.1, 0.1) * w;
      k.moveTo(rx - u * 0.06, y);
      k.lineTo(rx + u * 0.06, y);
    }
  });
}

