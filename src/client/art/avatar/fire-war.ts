import { hsl } from '../common';
import { type Trace, TAU, type Press, fill, fireMark, line, within } from './print';
import { type Inscribe } from './ink';
import { ASH, CRIMSON, GOLDLEAF, INDIGO, KEY, VERMILION, block, bokashi, fireRoof, flame, merged, sea, smoke, tint, washiInk } from './woodblock';

/** The Fire Nation at war: the Boiling Rock, its gondola, the war room, Zuko's ship, the Blue Spirit, Korra's arena. */

const STEEL = hsl(214, 8, 46);
const STEAM = hsl(190, 20, 94);
const WOOD = hsl(26, 36, 32);

/**
 * Made-up characters for a poster's heading, so it reads as writing without saying anything: each stroke a
 * polyline of x, y pairs in the unit square, built from boxes, crossbars, hooks, sweeps and dots.
 */
const GLYPHS: number[][][] = [
  [[0.1, 0.15, 0.4, 0.15, 0.4, 0.42, 0.1, 0.42, 0.1, 0.15], [0.52, 0.28, 0.95, 0.28], [0.78, 0.06, 0.78, 0.92, 0.68, 0.84], [0.08, 0.62, 0.48, 0.6], [0.3, 0.62, 0.1, 0.94]],
  [[0.15, 0.12, 0.85, 0.12, 0.85, 0.7, 0.15, 0.7, 0.15, 0.12], [0.5, 0.12, 0.5, 0.7], [0.15, 0.41, 0.85, 0.41], [0.05, 0.9, 0.95, 0.9]],
  [[0.08, 0.32, 0.92, 0.32], [0.5, 0.06, 0.5, 0.96], [0.48, 0.36, 0.1, 0.8], [0.52, 0.36, 0.92, 0.78], [0.82, 0.06, 0.9, 0.16]],
  [[0.1, 0.12, 0.18, 0.22], [0.04, 0.45, 0.24, 0.45, 0.14, 0.74], [0.08, 0.82, 0.4, 0.88, 0.96, 0.9], [0.38, 0.18, 0.9, 0.18], [0.64, 0.06, 0.64, 0.66], [0.38, 0.44, 0.9, 0.44]],
  [[0.5, 0, 0.56, 0.08], [0.18, 0.2, 0.82, 0.2], [0.22, 0.46, 0.78, 0.46], [0.06, 0.72, 0.94, 0.72], [0.5, 0.2, 0.5, 0.96, 0.4, 0.88]],
  [[0.32, 0.06, 0.08, 0.42], [0.2, 0.3, 0.2, 0.96], [0.62, 0.04, 0.68, 0.12], [0.42, 0.26, 0.92, 0.26], [0.46, 0.54, 0.88, 0.54], [0.38, 0.86, 0.96, 0.86], [0.66, 0.26, 0.66, 0.86]],
];

/** Adds one of the GLYPHS to the path, its box at (x, y) and `s` across. */
function glyph(k: CanvasRenderingContext2D, x: number, y: number, s: number, strokes: number[][]) {
  for (const st of strokes) {
    k.moveTo(x + st[0] * s, y + st[1] * s);
    for (let i = 2; i < st.length; i += 2) k.lineTo(x + st[i] * s, y + st[i + 1] * s);
  }
}

/** Steam boiling up off the lake: one outlined mass of billows from x0 to x1, `s` big, its foot flat on the water at y. */
function steam(p: Press, x0: number, x1: number, y: number, s: number) {
  const puffs: [number, number, number][] = [];
  for (let x = x0; x < x1; x += s * p.rr(0.6, 1)) {
    const r = s * p.rr(0.4, 0.7);
    puffs.push([x, y - r * p.rr(0.3, 0.9), r]);
  }
  const last = puffs[puffs.length - 1][0];
  within(p, (k) => k.rect(-8, -8, p.w + 16, y + 8), () =>
    merged(p, STEAM, (k) => {
      for (const [px, py, r] of puffs) {
        k.moveTo(px + r, py);
        k.arc(px, py, r, 0, TAU);
      }
      k.rect(x0, y - s * 0.3, last - x0, s * 0.3 + 8);
    }, 1),
  );
}

/** The Boiling Rock: the prison on its island in a crater lake that boils, steam rising round the walls. */
export function boilingRock(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.4, hsl(200, 20, 62), hsl(30, 30, 86, 0));
  // The crater's far wall, then the lake.
  const rim: [number, number][] = [];
  for (let x = 0; x <= w + 8; x += u * 0.08) rim.push([x, h * (0.24 + 0.05 * Math.sin((x / u) * 3)) - u * p.rr(0, 0.03)]);
  block(p, tint(ASH, 1, -8), (k) => {
    k.moveTo(-4, h * 0.5);
    for (const [x, y] of rim) k.lineTo(x, y);
    k.lineTo(w + 4, h * 0.5);
    k.closePath();
  }, 1.4);
  block(p, hsl(176, 30, 70), (k) => k.rect(-4, h * 0.48, w + 8, h * 0.52 + 4), 1.2);
  line(p, washiInk(0.7), 1.2, (k) => {
    for (let i = 0; i < 40; i++) {
      const x = p.rr(0, w);
      const y = h * p.rr(0.5, 1);
      k.moveTo(x + u * 0.012, y);
      k.arc(x, y, u * p.rr(0.006, 0.014), 0, TAU);
    }
  });
  // The prison: walls and towers on the rock, a central keep with a dark roof.
  const ix = w / 2 + p.rr(-0.1, 0.1) * w;
  const iy = h * 0.62;
  const iw = Math.min(w * 0.36, u * 0.6);
  block(p, tint(ASH, 1, -16), (k) => {
    k.moveTo(ix - iw * 0.8, iy + h * 0.06);
    k.quadraticCurveTo(ix - iw * 0.6, iy - h * 0.06, ix, iy - h * 0.07);
    k.quadraticCurveTo(ix + iw * 0.6, iy - h * 0.06, ix + iw * 0.8, iy + h * 0.06);
    k.closePath();
  }, 1.4);
  const wallTop = iy - h * 0.16;
  block(p, hsl(30, 6, 56), (k) => k.rect(ix - iw * 0.5, wallTop, iw, iy - h * 0.05 - wallTop), 1.4);
  line(p, 'rgba(0,0,0,0.25)', 1, (k) => {
    for (let y = wallTop + h * 0.02; y < iy - h * 0.05; y += h * 0.02) {
      k.moveTo(ix - iw * 0.5, y);
      k.lineTo(ix + iw * 0.5, y);
    }
  });
  for (const t of [-0.5, 0.5]) {
    block(p, hsl(30, 6, 50), (k) => k.rect(ix + t * iw - u * 0.03, wallTop - h * 0.08, u * 0.06, h * 0.08 + 2), 1.2);
    fireRoof(p, ix + t * iw, wallTop - h * 0.08, u * 0.1, u * 0.035);
  }
  block(p, hsl(30, 6, 60), (k) => k.rect(ix - iw * 0.16, wallTop - h * 0.12, iw * 0.32, h * 0.12 + 2), 1.2);
  fireRoof(p, ix, wallTop - h * 0.12, iw * 0.46, u * 0.06);
  fill(p, KEY, (k) => {
    for (let i = 0; i < 6; i++) k.rect(ix - iw * 0.4 + (iw * 0.8 * i) / 5 - u * 0.006, wallTop + h * 0.03, u * 0.012, h * 0.02);
  });
  // The gondola's cable from the rim, and the steam.
  line(p, KEY, 1.2, (k) => {
    k.moveTo(-4, h * 0.26);
    k.quadraticCurveTo(ix * 0.5, h * 0.34, ix - iw * 0.16, wallTop - h * 0.06);
  });
  steam(p, -w * 0.05, w * 0.4, h * 0.56, u * 0.12);
  steam(p, w * 0.6, w * 1.05, h * 0.6, u * 0.12);
  steam(p, -w * 0.05, w * 1.05, h * 0.95, u * 0.16);
}

/** The gondola on its cable over the boiling lake, the station on the cliff and the prison lost in steam. */
export function gondola(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.5, hsl(200, 20, 60), hsl(30, 30, 86, 0));
  const left = p.r() < 0.5;
  const d = left ? 1 : -1;
  // The lake far below, boiling.
  fill(p, hsl(176, 30, 70), (k) => k.rect(-4, h * 0.55, w + 8, h * 0.45 + 4));
  line(p, washiInk(0.7), 1.2, (k) => {
    for (let i = 0; i < 30; i++) {
      const x = p.rr(0, w);
      const y = h * p.rr(0.6, 1);
      k.moveTo(x + u * 0.01, y);
      k.arc(x, y, u * p.rr(0.005, 0.01), 0, TAU);
    }
  });
  // The far prison, faint through the steam: a wall and three towers under small roofs, their feet hidden.
  fill(p, hsl(200, 10, 62, 0.7), (k) => {
    const fx = w * (left ? 0.7 : 0.3);
    k.rect(fx - u * 0.16, h * 0.42, u * 0.32, h * 0.12);
    for (let i = 0; i < 3; i++) {
      const tx = fx + (i - 1) * u * 0.13;
      const ty = h * (0.3 + (i % 2) * 0.05);
      k.rect(tx - u * 0.03, ty, u * 0.06, h * 0.54 - ty);
      k.moveTo(tx - u * 0.055, ty + 1);
      k.lineTo(tx - u * 0.03, ty - u * 0.03);
      k.lineTo(tx + u * 0.03, ty - u * 0.03);
      k.lineTo(tx + u * 0.055, ty + 1);
      k.closePath();
    }
  });
  steam(p, -w * 0.05, w * 1.05, h * 0.55, u * 0.14);
  // The cliff and station on the near side.
  const cx = left ? 0 : w;
  block(p, tint(ASH, 1, -14), (k) => {
    k.moveTo(cx - d * 4, h * 0.2);
    k.lineTo(cx + d * w * 0.16, h * 0.26);
    k.lineTo(cx + d * w * 0.2, h * 0.5);
    k.lineTo(cx + d * w * 0.14, h + 4);
    k.lineTo(cx - d * 4, h + 4);
    k.closePath();
  }, 1.4);
  block(p, hsl(30, 8, 50), (k) => k.rect(Math.min(cx, cx + d * w * 0.15), h * 0.14, w * 0.15, h * 0.12), 1.2);
  fireRoof(p, cx + d * w * 0.08, h * 0.14, w * 0.2, h * 0.06);
  // The cable, sagging off to the prison, and the car hanging from it.
  const ax = cx + d * w * 0.16;
  const ay = h * 0.2;
  const bx = left ? w + 10 : -10;
  const by = h * 0.42;
  line(p, KEY, Math.max(1.2, u * 0.006), (k) => {
    k.moveTo(ax, ay);
    k.quadraticCurveTo((ax + bx) / 2, h * 0.36, bx, by);
    k.moveTo(ax, ay + u * 0.02);
    k.quadraticCurveTo((ax + bx) / 2, h * 0.38, bx, by + u * 0.02);
  });
  const t = 0.42;
  const gx = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * ((ax + bx) / 2) + t * t * bx;
  const gy = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * (h * 0.36) + t * t * by;
  const gs = Math.min(u * 0.22, w * 0.16);
  line(p, KEY, Math.max(1.5, u * 0.008), (k) => {
    k.moveTo(gx, gy);
    k.lineTo(gx, gy + gs * 0.4);
  });
  fill(p, KEY, (k) => k.arc(gx, gy, gs * 0.06, 0, TAU));
  block(p, hsl(30, 10, 44), (k) => k.rect(gx - gs * 0.5, gy + gs * 0.4, gs, gs * 0.7), 1.4);
  fireRoof(p, gx, gy + gs * 0.42, gs * 1.15, gs * 0.18);
  fill(p, hsl(40, 60, 70), (k) => {
    for (let i = 0; i < 3; i++) k.rect(gx - gs * 0.4 + i * gs * 0.28, gy + gs * 0.55, gs * 0.2, gs * 0.2);
  });
  line(p, KEY, 1, (k) => {
    for (let i = 0; i < 3; i++) k.rect(gx - gs * 0.4 + i * gs * 0.28, gy + gs * 0.55, gs * 0.2, gs * 0.2);
  });
  steam(p, -w * 0.05, w * 1.05, h * 0.96, u * 0.18);
}

/** The Blue Spirit: the grinning blue mask laid over a red cloth, the twin dao swords crossed behind it. */
export function blueSpirit(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h, hsl(226, 40, 16), hsl(226, 30, 28));
  block(p, CRIMSON, (k) => {
    k.moveTo(-4, h * 0.55);
    k.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.58);
    k.quadraticCurveTo(w * 0.8, h * 0.66, w + 4, h * 0.6);
    k.lineTo(w + 4, h + 4);
    k.lineTo(-4, h + 4);
    k.closePath();
  }, 1.4);
  line(p, hsl(352, 50, 24), Math.max(1, u * 0.006), (k) => {
    for (let i = 0; i < 6; i++) {
      const x = p.rr(0, w);
      k.moveTo(x, h * 0.6);
      k.quadraticCurveTo(x + u * 0.05, h * 0.8, x - u * 0.02, h + 4);
    }
  });
  const x = w / 2;
  const y = h * 0.52;
  const s = Math.min(u * 0.4, h * 0.36);
  // Two broad curved swords crossed behind.
  for (const m of [-1, 1]) {
    const ang = m * 0.7;
    const at = (lx: number, ly: number): [number, number] => [x + lx * Math.cos(ang) - ly * Math.sin(ang), y + lx * Math.sin(ang) + ly * Math.cos(ang)];
    const blade: Trace = (k) => {
      k.moveTo(...at(-s * 0.05, s * 0.6));
      k.lineTo(...at(-s * 0.07, -s * 0.9));
      k.quadraticCurveTo(...at(s * 0.05, -s * 1.25), ...at(s * 0.12, -s * 1.15));
      k.quadraticCurveTo(...at(s * 0.06, -s * 0.3), ...at(s * 0.06, s * 0.6));
      k.closePath();
    };
    block(p, STEEL, blade, 1.4);
    line(p, washiInk(0.7), Math.max(1, s * 0.012), (k) => {
      k.moveTo(...at(-s * 0.03, s * 0.5));
      k.lineTo(...at(-s * 0.04, -s * 0.9));
    });
    block(p, GOLDLEAF, (k) => {
      k.moveTo(...at(-s * 0.14, s * 0.6));
      k.lineTo(...at(s * 0.14, s * 0.6));
      k.lineTo(...at(s * 0.14, s * 0.66));
      k.lineTo(...at(-s * 0.14, s * 0.66));
      k.closePath();
    }, 1);
    block(p, hsl(20, 30, 18), (k) => {
      k.moveTo(...at(-s * 0.04, s * 0.66));
      k.lineTo(...at(s * 0.04, s * 0.66));
      k.lineTo(...at(s * 0.035, s * 0.95));
      k.lineTo(...at(-s * 0.035, s * 0.95));
      k.closePath();
    }, 1);
  }
  // The mask: a blue face with dark brows, white-rimmed eyes, and a wide grin full of teeth.
  const face: Trace = (k) => {
    k.moveTo(x, y - s * 0.62);
    k.bezierCurveTo(x + s * 0.5, y - s * 0.62, x + s * 0.55, y + s * 0.1, x + s * 0.38, y + s * 0.42);
    k.quadraticCurveTo(x, y + s * 0.7, x - s * 0.38, y + s * 0.42);
    k.bezierCurveTo(x - s * 0.55, y + s * 0.1, x - s * 0.5, y - s * 0.62, x, y - s * 0.62);
    k.closePath();
  };
  block(p, hsl(206, 56, 46), face, Math.max(1.4, s * 0.02));
  within(p, face, () => fill(p, hsl(210, 60, 34), (k) => k.ellipse(x, y + s * 0.3, s * 0.5, s * 0.3, 0, 0, TAU)));
  for (const m of [-1, 1]) {
    block(p, hsl(220, 50, 18), (k) => {
      k.moveTo(x + m * s * 0.06, y - s * 0.2);
      k.quadraticCurveTo(x + m * s * 0.25, y - s * 0.42, x + m * s * 0.46, y - s * 0.3);
      k.quadraticCurveTo(x + m * s * 0.28, y - s * 0.3, x + m * s * 0.08, y - s * 0.12);
      k.closePath();
    }, 1);
    const ex = x + m * s * 0.2;
    const ey = y - s * 0.1;
    block(p, washiInk(), (k) => k.ellipse(ex, ey, s * 0.11, s * 0.065, m * -0.2, 0, TAU), Math.max(1, s * 0.015));
    fill(p, KEY, (k) => k.ellipse(ex, ey, s * 0.06, s * 0.045, m * -0.2, 0, TAU));
  }
  const mouth: Trace = (k) => {
    k.moveTo(x - s * 0.3, y + s * 0.12);
    k.quadraticCurveTo(x, y + s * 0.22, x + s * 0.3, y + s * 0.12);
    k.quadraticCurveTo(x + s * 0.2, y + s * 0.48, x, y + s * 0.48);
    k.quadraticCurveTo(x - s * 0.2, y + s * 0.48, x - s * 0.3, y + s * 0.12);
    k.closePath();
  };
  block(p, VERMILION, mouth, Math.max(1, s * 0.015));
  within(p, mouth, () => {
    fill(p, washiInk(), (k) => {
      k.rect(x - s * 0.3, y + s * 0.12, s * 0.6, s * 0.12);
      k.rect(x - s * 0.3, y + s * 0.36, s * 0.6, s * 0.12);
    });
    line(p, KEY, Math.max(1, s * 0.01), (k) => {
      for (let i = -3; i <= 3; i++) {
        k.moveTo(x + i * s * 0.07, y + s * 0.14);
        k.lineTo(x + i * s * 0.07, y + s * 0.25);
        k.moveTo(x + i * s * 0.07, y + s * 0.36);
        k.lineTo(x + i * s * 0.07, y + s * 0.47);
      }
    });
  });
  fill(p, washiInk(), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * s * 0.24, y + s * 0.2);
      k.lineTo(x + m * s * 0.2, y + s * 0.34);
      k.lineTo(x + m * s * 0.16, y + s * 0.2);
      k.closePath();
    }
  });
}

/** The Fire Lord's crown: the golden flame worn in the topknot, on a red cushion with tassels at its corners. */
export function crown(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h, hsl(20, 30, 12), hsl(352, 40, 22));
  const x = w / 2;
  const y = h * 0.62;
  const s = Math.min(u * 0.5, h * 0.42);
  const glow = c.createRadialGradient(x, y - s * 0.3, 0, x, y - s * 0.3, s * 1.2);
  glow.addColorStop(0, 'rgba(255,200,110,0.45)');
  glow.addColorStop(1, 'rgba(255,200,110,0)');
  fill(p, glow, (k) => k.arc(x, y - s * 0.3, s * 1.2, 0, TAU));
  // The cushion and its tassels.
  block(p, VERMILION, (k) => {
    k.moveTo(x - s * 0.9, y + s * 0.1);
    k.quadraticCurveTo(x, y - s * 0.05, x + s * 0.9, y + s * 0.1);
    k.quadraticCurveTo(x + s, y + s * 0.3, x + s * 0.85, y + s * 0.45);
    k.quadraticCurveTo(x, y + s * 0.55, x - s * 0.85, y + s * 0.45);
    k.quadraticCurveTo(x - s, y + s * 0.3, x - s * 0.9, y + s * 0.1);
    k.closePath();
  }, 1.4);
  line(p, GOLDLEAF, Math.max(1, s * 0.015), (k) => {
    k.moveTo(x - s * 0.8, y + s * 0.3);
    k.quadraticCurveTo(x, y + s * 0.4, x + s * 0.8, y + s * 0.3);
  });
  for (const m of [-1, 1]) {
    line(p, GOLDLEAF, Math.max(1.5, s * 0.02), (k) => {
      k.moveTo(x + m * s * 0.88, y + s * 0.42);
      k.lineTo(x + m * s * 0.95, y + s * 0.62);
    });
    block(p, GOLDLEAF, (k) => {
      k.moveTo(x + m * s * 0.95, y + s * 0.6);
      k.lineTo(x + m * s * 1.02, y + s * 0.85);
      k.lineTo(x + m * s * 0.88, y + s * 0.85);
      k.closePath();
    }, 1);
  }
  // The crown: a ring with a gold flame of five tongues rising from it, and the pin through it.
  block(p, GOLDLEAF, (k) => k.ellipse(x, y + s * 0.02, s * 0.24, s * 0.08, 0, 0, TAU), 1.4);
  const fl: Trace = (k) => {
    k.moveTo(x - s * 0.22, y);
    k.quadraticCurveTo(x - s * 0.34, y - s * 0.3, x - s * 0.22, y - s * 0.46);
    k.quadraticCurveTo(x - s * 0.18, y - s * 0.3, x - s * 0.1, y - s * 0.26);
    k.quadraticCurveTo(x - s * 0.14, y - s * 0.5, x, y - s * 0.72);
    k.quadraticCurveTo(x + s * 0.14, y - s * 0.5, x + s * 0.1, y - s * 0.26);
    k.quadraticCurveTo(x + s * 0.18, y - s * 0.3, x + s * 0.22, y - s * 0.46);
    k.quadraticCurveTo(x + s * 0.34, y - s * 0.3, x + s * 0.22, y);
    k.closePath();
  };
  const g = c.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0);
  g.addColorStop(0, hsl(40, 70, 46));
  g.addColorStop(0.4, hsl(48, 90, 74));
  g.addColorStop(1, hsl(40, 70, 44));
  block(p, g, fl, Math.max(1.4, s * 0.015));
  line(p, hsl(36, 70, 36), Math.max(1, s * 0.012), (k) => {
    k.moveTo(x, y - s * 0.05);
    k.lineTo(x, y - s * 0.6);
    k.moveTo(x - s * 0.14, y - s * 0.04);
    k.quadraticCurveTo(x - s * 0.2, y - s * 0.25, x - s * 0.2, y - s * 0.38);
    k.moveTo(x + s * 0.14, y - s * 0.04);
    k.quadraticCurveTo(x + s * 0.2, y - s * 0.25, x + s * 0.2, y - s * 0.38);
  });
  block(p, hsl(30, 20, 70), (k) => k.rect(x - s * 0.5, y - s * 0.16, s, s * 0.035), 1);
  fill(p, GOLDLEAF, (k) => {
    k.moveTo(x - s * 0.5 + s * 0.04, y - s * 0.14);
    k.arc(x - s * 0.5, y - s * 0.14, s * 0.04, 0, TAU);
  });
}

/** The war room: the great map of the world on the generals' table, markers on it, candles at the corners. */
export function warMap(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, hsl(20, 30, 12), (k) => k.rect(-4, -4, w + 8, h + 8));
  // The table top and the map laid on it.
  block(p, WOOD, (k) => k.rect(w * 0.04, h * 0.1, w * 0.92, h * 0.82), 1.4);
  const mx0 = w * 0.09;
  const my0 = h * 0.17;
  const mw = w * 0.82;
  const mh = h * 0.68;
  const map: Trace = (k) => k.rect(mx0, my0, mw, mh);
  block(p, hsl(40, 46, 80), map, 1.4);
  within(p, map, () => {
    fill(p, hsl(196, 30, 72), (k) => k.rect(mx0, my0, mw, mh));
    // Lands: the Earth Kingdom, the Fire Nation's islands, the poles.
    const land = (pts: [number, number][], ink: string) =>
      block(p, ink, (k) => {
        k.moveTo(mx0 + pts[0][0] * mw, my0 + pts[0][1] * mh);
        for (let i = 1; i < pts.length; i++) {
          const [px, py] = pts[i];
          const [qx, qy] = pts[(i + 1) % pts.length];
          k.quadraticCurveTo(mx0 + px * mw, my0 + py * mh, mx0 + ((px + qx) / 2) * mw, my0 + ((py + qy) / 2) * mh);
        }
        k.closePath();
      }, 1.2);
    land([[0.5, 0.25], [0.72, 0.2], [0.92, 0.35], [0.9, 0.6], [0.78, 0.78], [0.6, 0.72], [0.52, 0.55], [0.42, 0.4]], hsl(100, 30, 58));
    land([[0.18, 0.3], [0.32, 0.26], [0.36, 0.38], [0.26, 0.44], [0.16, 0.4]], hsl(8, 56, 58));
    land([[0.22, 0.52], [0.3, 0.5], [0.3, 0.58], [0.22, 0.6]], hsl(8, 56, 58));
    land([[0.1, 0.04], [0.5, -0.02], [0.9, 0.05], [0.6, 0.1], [0.3, 0.1]], washiInk());
    land([[0.1, 0.95], [0.5, 0.9], [0.9, 0.96], [0.7, 1.05], [0.3, 1.05]], washiInk());
    line(p, 'rgba(60,40,20,0.3)', 1, (k) => {
      for (let i = 1; i < 6; i++) {
        k.moveTo(mx0 + (mw * i) / 6, my0);
        k.lineTo(mx0 + (mw * i) / 6, my0 + mh);
        k.moveTo(mx0, my0 + (mh * i) / 6);
        k.lineTo(mx0 + mw, my0 + mh * (i / 6));
      }
    });
    // The army's markers, red flags pushing into the Earth Kingdom.
    for (let i = 0; i < 7; i++) {
      const fx = mx0 + mw * p.rr(0.45, 0.85);
      const fy = my0 + mh * p.rr(0.3, 0.7);
      line(p, KEY, 1, (k) => {
        k.moveTo(fx, fy);
        k.lineTo(fx, fy - u * 0.05);
      });
      block(p, VERMILION, (k) => {
        k.moveTo(fx, fy - u * 0.05);
        k.lineTo(fx + u * 0.03, fy - u * 0.04);
        k.lineTo(fx, fy - u * 0.03);
        k.closePath();
      }, 0.8);
    }
  });
  // Candles at the corners.
  for (const [cx, cy] of [
    [w * 0.06, h * 0.12],
    [w * 0.94, h * 0.12],
    [w * 0.06, h * 0.9],
    [w * 0.94, h * 0.9],
  ]) {
    const glow = p.c.createRadialGradient(cx, cy - u * 0.08, 0, cx, cy - u * 0.08, u * 0.2);
    glow.addColorStop(0, 'rgba(255,190,90,0.45)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    fill(p, glow, (k) => k.arc(cx, cy - u * 0.08, u * 0.2, 0, TAU));
    block(p, hsl(40, 40, 88), (k) => k.rect(cx - u * 0.015, cy - u * 0.06, u * 0.03, u * 0.07), 1);
    flame(p, cx, cy - u * 0.06, u * 0.06);
  }
  fireMark(p, mx0 + mw * 0.26, my0 + mh * 0.36, u * 0.03, CRIMSON);
}

/** Zuko's ship among the ice floes: a grey warship with its tall funnel smoking, the ram at its bow. */
export function zukoShip(p: Press): Inscribe {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.5, hsl(206, 30, 66), hsl(40, 30, 90, 0));
  const water = h * 0.62;
  sea(p, water, INDIGO);
  for (let i = 0; i < 6; i++) {
    const fx = p.rr(0, w);
    const fy = water + (h - water) * p.rr(0.1, 0.9);
    const fs = u * p.rr(0.05, 0.12);
    block(p, washiInk(), (k) => {
      k.moveTo(fx - fs, fy);
      k.lineTo(fx - fs * 0.6, fy - fs * 0.25);
      k.lineTo(fx + fs * 0.7, fy - fs * 0.2);
      k.lineTo(fx + fs, fy);
      k.closePath();
    }, 1);
  }
  const d = p.r() < 0.5 ? 1 : -1;
  const L = Math.min(w * 0.42, u * 0.8);
  const x = w / 2 - d * L * 0.1;
  const y = water + h * 0.08;
  const X = (t: number) => x + d * t * L;
  // Hull: a long dark steel hull with the ram, a raised deck, the bridge tower and the funnel.
  block(p, hsl(214, 8, 30), (k) => {
    k.moveTo(X(-1), y - L * 0.12);
    k.lineTo(X(0.85), y - L * 0.14);
    k.lineTo(X(1.1), y - L * 0.02);
    k.lineTo(X(0.85), y + L * 0.04);
    k.lineTo(X(-0.95), y + L * 0.04);
    k.closePath();
  }, 1.6);
  line(p, VERMILION, Math.max(1.5, L * 0.012), (k) => {
    k.moveTo(X(-0.98), y - L * 0.04);
    k.lineTo(X(0.9), y - L * 0.05);
  });
  block(p, STEEL, (k) => k.rect(Math.min(X(-0.7), X(0.1)), y - L * 0.24, L * 0.8, L * 0.11), 1.2);
  block(p, hsl(214, 8, 52), (k) => k.rect(Math.min(X(-0.45), X(-0.15)), y - L * 0.4, L * 0.3, L * 0.16), 1.2);
  fill(p, hsl(44, 70, 70), (k) => {
    for (let i = 0; i < 4; i++) k.rect(Math.min(X(-0.42), X(-0.18)) + i * L * 0.07, y - L * 0.36, L * 0.04, L * 0.04);
  });
  const fx = X(0.25);
  block(p, hsl(214, 8, 26), (k) => k.rect(fx - L * 0.05, y - L * 0.52, L * 0.1, L * 0.3), 1.2);
  line(p, VERMILION, Math.max(1.5, L * 0.02), (k) => {
    k.moveTo(fx - L * 0.05, y - L * 0.47);
    k.lineTo(fx + L * 0.05, y - L * 0.47);
  });
  smoke(p, fx, y - L * 0.55, L * 0.1, -d * 1.2, [20, 6, 36]);
  fireMark(p, X(-0.75), y - L * 0.08, L * 0.05, VERMILION);
  line(p, washiInk(0.85), Math.max(1.5, u * 0.008), (k) => {
    k.moveTo(X(1.12), y);
    k.quadraticCurveTo(X(1.25), y - L * 0.05, X(1.35), y + L * 0.02);
    k.moveTo(X(-1), y + L * 0.05);
    k.quadraticCurveTo(X(-1.2), y + L * 0.1, X(-1.4), y + L * 0.05);
  });
  return { side: d > 0 ? 'left' : 'right' };
}

/** Wanted posters on a wooden wall: the Blue Spirit's mask, the Avatar's arrow, a torn one, and a lantern. */
export function wanted(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  block(p, WOOD, (k) => k.rect(-4, -4, w + 8, h + 8), 1);
  line(p, 'rgba(0,0,0,0.35)', Math.max(1, u * 0.005), (k) => {
    for (let x = u * 0.12; x < w; x += u * 0.14) {
      k.moveTo(x, -4);
      k.lineTo(x, h + 4);
    }
  });
  line(p, 'rgba(255,220,170,0.12)', 1, (k) => {
    for (let i = 0; i < 60; i++) {
      const x = p.rr(0, w);
      const y = p.rr(0, h);
      k.moveTo(x, y);
      k.lineTo(x + p.rr(-2, 2), y + u * p.rr(0.05, 0.15));
    }
  });
  const poster = (x: number, y: number, pw: number, ph: number, rot: number, art: (cx: number, cy: number, s: number) => void, torn = false) => {
    const c = p.c;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    const sheet: Trace = (k) => {
      k.moveTo(-pw / 2, -ph / 2);
      k.lineTo(pw / 2, -ph / 2);
      if (torn) {
        for (let i = 0; i <= 6; i++) k.lineTo(pw / 2 - (pw * i) / 6, ph * (0.15 + (i % 2) * 0.12));
      } else {
        k.lineTo(pw / 2, ph / 2);
        k.lineTo(-pw / 2, ph / 2);
      }
      k.closePath();
    };
    block(p, hsl(42, 40, 84), sheet, 1.2);
    // A heading of two big characters, the picture, and the small print.
    const first = p.ri(0, GLYPHS.length - 1);
    const second = (first + p.ri(1, GLYPHS.length - 1)) % GLYPHS.length;
    const gs = pw * 0.26;
    line(p, CRIMSON, Math.max(1.5, pw * 0.035), (k) => {
      glyph(k, -pw * 0.03 - gs, -ph * 0.45, gs, GLYPHS[first]);
      glyph(k, pw * 0.03, -ph * 0.45, gs, GLYPHS[second]);
    });
    art(0, -ph * 0.05, pw * 0.36);
    if (!torn)
      line(p, KEY, Math.max(1, pw * 0.015), (k) => {
        for (let i = 0; i < 4; i++) {
          k.moveTo(-pw * 0.35, ph * (0.26 + i * 0.05));
          k.lineTo(pw * (0.35 - (i % 2) * 0.15), ph * (0.26 + i * 0.05));
        }
      });
    fill(p, hsl(20, 10, 30), (k) => k.arc(0, -ph * 0.47, pw * 0.025, 0, TAU));
    c.restore();
  };
  const mask = (cx: number, cy: number, s: number) => {
    block(p, hsl(206, 56, 46), (k) => k.ellipse(cx, cy, s * 0.55, s * 0.7, 0, 0, TAU), 1);
    fill(p, washiInk(), (k) => {
      k.ellipse(cx - s * 0.2, cy - s * 0.15, s * 0.12, s * 0.07, 0, 0, TAU);
      k.moveTo(cx + s * 0.32, cy - s * 0.15);
      k.ellipse(cx + s * 0.2, cy - s * 0.15, s * 0.12, s * 0.07, 0, 0, TAU);
      k.rect(cx - s * 0.3, cy + s * 0.2, s * 0.6, s * 0.18);
    });
    line(p, KEY, 1, (k) => {
      for (let i = -2; i <= 2; i++) {
        k.moveTo(cx + i * s * 0.1, cy + s * 0.2);
        k.lineTo(cx + i * s * 0.1, cy + s * 0.38);
      }
    });
  };
  const arrowHead = (cx: number, cy: number, s: number) => {
    block(p, hsl(30, 40, 78), (k) => k.ellipse(cx, cy, s * 0.5, s * 0.62, 0, 0, TAU), 1);
    fill(p, hsl(206, 60, 46), (k) => {
      k.moveTo(cx, cy - s * 0.62);
      k.lineTo(cx + s * 0.08, cy - s * 0.1);
      k.lineTo(cx + s * 0.2, cy - s * 0.1);
      k.lineTo(cx, cy + s * 0.1);
      k.lineTo(cx - s * 0.2, cy - s * 0.1);
      k.lineTo(cx - s * 0.08, cy - s * 0.1);
      k.closePath();
    });
    fill(p, KEY, (k) => {
      k.moveTo(cx - s * 0.14, cy + s * 0.2);
      k.arc(cx - s * 0.18, cy + s * 0.2, s * 0.04, 0, TAU);
      k.moveTo(cx + s * 0.22, cy + s * 0.2);
      k.arc(cx + s * 0.18, cy + s * 0.2, s * 0.04, 0, TAU);
    });
  };
  const pw = Math.min(w * 0.42, u * 0.5);
  poster(w * 0.32, h * 0.33, pw, pw * 1.4, p.rr(-0.06, 0.04), mask);
  poster(w * 0.7, h * 0.42, pw * 0.85, pw * 1.2, p.rr(0.02, 0.08), arrowHead);
  poster(w * 0.42, h * 0.75, pw * 0.8, pw * 1.1, p.rr(-0.1, 0.1), mask, true);
  // A lantern hanging at the side.
  const lx = w * (p.r() < 0.5 ? 0.12 : 0.88);
  line(p, KEY, 1.2, (k) => {
    k.moveTo(lx, -4);
    k.lineTo(lx, h * 0.6);
  });
  const glow = p.c.createRadialGradient(lx, h * 0.66, 0, lx, h * 0.66, u * 0.3);
  glow.addColorStop(0, 'rgba(255,180,90,0.45)');
  glow.addColorStop(1, 'rgba(255,180,90,0)');
  fill(p, glow, (k) => k.arc(lx, h * 0.66, u * 0.3, 0, TAU));
  block(p, VERMILION, (k) => k.ellipse(lx, h * 0.66, u * 0.05, u * 0.065, 0, 0, TAU), 1.2);
  block(p, GOLDLEAF, (k) => {
    k.rect(lx - u * 0.025, h * 0.66 - u * 0.075, u * 0.05, u * 0.015);
    k.rect(lx - u * 0.025, h * 0.66 + u * 0.06, u * 0.05, u * 0.015);
  }, 1);
}

/** The pro-bending arena on Republic City's bay at night: its great dome lit, searchlights over it, lights on the water. */
export function proBending(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.7, hsl(230, 46, 14), hsl(250, 30, 32));
  const water = h * 0.72;
  const x = w / 2;
  const bw = Math.min(w * 0.42, u * 0.6);
  // Searchlights.
  for (const a of [-0.5, -0.2, 0.25, 0.55]) {
    const g = c.createLinearGradient(x, water - bw * 0.6, x + Math.sin(a) * h, -h * 0.2);
    g.addColorStop(0, 'rgba(255,250,220,0.35)');
    g.addColorStop(1, 'rgba(255,250,220,0)');
    fill(p, g, (k) => {
      k.moveTo(x + bw * a * 0.6, water - bw * 0.6);
      k.lineTo(x + bw * a * 0.6 + Math.sin(a - 0.06) * h * 1.2, water - bw * 0.6 - Math.cos(a - 0.06) * h * 1.2);
      k.lineTo(x + bw * a * 0.6 + Math.sin(a + 0.06) * h * 1.2, water - bw * 0.6 - Math.cos(a + 0.06) * h * 1.2);
      k.closePath();
    });
  }
  // The arena: a broad hall on piers, its ribbed dome, and the statue on top.
  block(p, hsl(30, 20, 30), (k) => {
    for (let i = 0; i <= 6; i++) k.rect(x - bw + (bw * 2 * i) / 6 - u * 0.012, water - h * 0.06, u * 0.024, h * 0.06 + 2);
  }, 1);
  block(p, hsl(36, 30, 52), (k) => k.rect(x - bw, water - h * 0.06 - bw * 0.32, bw * 2, bw * 0.32), 1.4);
  fill(p, hsl(44, 90, 70), (k) => {
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 12; i++) k.rect(x - bw * 0.92 + (bw * 1.84 * i) / 12, water - h * 0.06 - bw * (0.26 - row * 0.12), bw * 0.09, bw * 0.07);
  });
  const dome: Trace = (k) => {
    k.moveTo(x - bw * 0.85, water - h * 0.06 - bw * 0.32);
    k.bezierCurveTo(x - bw * 0.8, water - bw * 1.1, x + bw * 0.8, water - bw * 1.1, x + bw * 0.85, water - h * 0.06 - bw * 0.32);
    k.closePath();
  };
  block(p, hsl(160, 30, 42), dome, 1.4);
  within(p, dome, () =>
    line(p, GOLDLEAF, Math.max(1, u * 0.005), (k) => {
      for (let i = -4; i <= 4; i++) {
        k.moveTo(x + i * bw * 0.2, water - h * 0.06 - bw * 0.32);
        k.quadraticCurveTo(x + i * bw * 0.12, water - bw * 0.9, x, water - bw * 0.92);
      }
    }),
  );
  block(p, GOLDLEAF, (k) => {
    k.moveTo(x - bw * 0.04, water - bw * 0.9);
    k.lineTo(x - bw * 0.03, water - bw * 1.06);
    k.lineTo(x, water - bw * 1.12);
    k.lineTo(x + bw * 0.03, water - bw * 1.06);
    k.lineTo(x + bw * 0.04, water - bw * 0.9);
    k.closePath();
  }, 1);
  // The bay, with the lights laid on it.
  sea(p, water, hsl(232, 40, 12), hsl(230, 30, 30));
  line(p, hsl(44, 90, 70, 0.6), Math.max(1.5, u * 0.008), (k) => {
    for (let y = water + h * 0.02; y < h; y += h * 0.025) {
      const rx = x + p.rr(-1, 1) * bw * 0.8;
      k.moveTo(rx - u * 0.04, y);
      k.lineTo(rx + u * 0.04, y);
    }
  });
}
