import { hsl, type HSL } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import { AZURITE, CINNABAR, GOLD, INK, JADE, MALACHITE, OCHRE, STONE, TILE, hall, mist, range, roofShape, silkInk, tone, tree } from './ink';

/** Kyoshi Island, the Si Wong Desert, and the Jasmine Dragon. */

const SAND: HSL = [38, 44, 66];
const SEA: HSL = [190, 26, 44];

/** Ink waves: rows of curling strokes over a wash of sea, from y to the bottom. */
function sea(p: Press, y: number, ink: HSL = SEA) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const g = p.c.createLinearGradient(0, y, 0, h);
  g.addColorStop(0, tone(ink, 0.35, 16));
  g.addColorStop(1, tone(ink, 0.8));
  fill(p, g, (k) => k.rect(-4, y, w + 8, h - y + 4));
  for (let row = 0; row < 12; row++) {
    const yy = y + (h - y) * (row / 12) + p.rr(0, (h - y) / 24);
    const s = u * (0.02 + (row / 12) * 0.05);
    for (let x = -s * p.r() * 3; x < w + s; x += s * p.rr(2.5, 4)) {
      const x0 = x;
      line(p, INK(0.35 + row * 0.03), Math.max(0.8, s * 0.12), (k) => {
        k.moveTo(x0, yy);
        k.quadraticCurveTo(x0 + s, yy - s * 0.7, x0 + s * 2, yy);
      });
    }
  }
}

/** Kyoshi Island: the village by the bay, and Avatar Kyoshi's statue on the headland. */
export function kyoshiIsland(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.4, h * 0.1, -10, w + 10, AZURITE, 0.4);
  mist(p, h * 0.4, h * 0.06);
  const shore = h * 0.62;
  range(p, shore, h * 0.36, -10, w + 10, MALACHITE, 0.7);
  // The statue on the headland: robes, fans and the tall headdress.
  const left = p.r() < 0.5;
  const sx = w * (left ? 0.24 : 0.76);
  const sh = Math.min(h * 0.5, u * 0.62);
  const sb = shore - h * 0.02;
  const st = sb - sh;
  fill(p, tone(STONE, 1, 4), (k) => {
    k.moveTo(sx - sh * 0.2, sb);
    k.quadraticCurveTo(sx - sh * 0.16, st + sh * 0.4, sx - sh * 0.1, st + sh * 0.25);
    k.lineTo(sx + sh * 0.1, st + sh * 0.25);
    k.quadraticCurveTo(sx + sh * 0.16, st + sh * 0.4, sx + sh * 0.2, sb);
    k.closePath();
    k.moveTo(sx + sh * 0.07, st + sh * 0.17);
    k.arc(sx, st + sh * 0.17, sh * 0.07, 0, TAU);
    k.moveTo(sx - sh * 0.07, st + sh * 0.12);
    k.lineTo(sx, st);
    k.lineTo(sx + sh * 0.07, st + sh * 0.12);
    k.closePath();
  });
  for (const sgn of [-1, 1]) {
    const fx = sx + sgn * sh * 0.2;
    const fy = st + sh * 0.38;
    fill(p, tone(STONE, 1, -6), (k) => {
      k.moveTo(fx, fy);
      k.arc(fx, fy, sh * 0.12, sgn < 0 ? Math.PI * 1.05 : Math.PI * 1.45, sgn < 0 ? Math.PI * 1.55 : Math.PI * 1.95);
      k.closePath();
    });
  }
  line(p, INK(0.5), 1.2, (k) => {
    k.moveTo(sx, st + sh * 0.3);
    k.lineTo(sx, sb);
  });
  // Village houses along the shore, boats in the bay.
  const n = Math.max(3, Math.round((w / u) * 3));
  for (let i = 0; i < n; i++) {
    const hx = left ? w * (0.42 + (i / n) * 0.55) : w * (0.04 + (i / n) * 0.55);
    const s = u * p.rr(0.1, 0.14);
    fill(p, OCHRE, (k) => k.rect(hx - s * 0.4, shore - s * 0.45, s * 0.8, s * 0.45));
    roofShape(p, hx, shore - s * 0.45, s, s * 0.3, i % 2 ? TILE : hsl(150, 26, 42));
  }
  sea(p, shore);
  for (let i = 0; i < 3; i++) {
    const bx = w * p.rr(0.15, 0.85);
    const by = shore + (h - shore) * p.rr(0.3, 0.7);
    fill(p, INK(0.8), (k) => {
      k.moveTo(bx - u * 0.05, by);
      k.quadraticCurveTo(bx, by + u * 0.02, bx + u * 0.05, by - u * 0.01);
      k.closePath();
    });
  }
}

/** The Unagi rearing out of the bay, spouting water, a small boat in the waves below. */
export function unagi(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.36, h * 0.12, -10, w + 10, AZURITE, 0.4);
  const water = h * 0.55;
  sea(p, water);
  const cx = w * p.rr(0.4, 0.6);
  const bw = u * 0.13;
  const dir = p.r() < 0.5 ? 1 : -1;
  // The body: an S rising from the water to the head.
  const pts: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    pts.push([cx + dir * Math.sin(t * Math.PI * 1.2) * u * 0.25 - dir * t * u * 0.1, water + u * 0.05 - t * (water - h * 0.16)]);
  }
  const body: Trace = (k) => {
    k.moveTo(pts[0][0] - bw, pts[0][1]);
    for (const [x, y] of pts) k.lineTo(x - bw * 0.85, y);
    for (let i = pts.length - 1; i >= 0; i--) k.lineTo(pts[i][0] + bw * 0.85, pts[i][1]);
    k.closePath();
  };
  fill(p, tone(JADE, 1, -14), body);
  within(p, body, () => {
    for (let i = 0; i < pts.length; i += 2) {
      const [x, y] = pts[i];
      line(p, tone(JADE, 0.9, 10), Math.max(1, u * 0.006), (k) => k.arc(x, y + bw * 0.4, bw * 0.6, Math.PI * 1.2, Math.PI * 1.8));
    }
  });
  const [hx, hy] = pts[pts.length - 1];
  fill(p, tone(JADE, 1, -18), (k) => k.ellipse(hx + dir * bw * 0.5, hy, bw * 1.5, bw * 0.75, dir * -0.2, 0, TAU));
  fill(p, hsl(50, 70, 60), (k) => k.arc(hx + dir * bw * 0.9, hy - bw * 0.2, bw * 0.16, 0, TAU));
  for (const s of [-1, 1])
    line(p, INK(0.8), Math.max(1.2, u * 0.006), (k) => {
      k.moveTo(hx + dir * bw * 1.7, hy + s * bw * 0.2);
      k.bezierCurveTo(hx + dir * bw * 2.6, hy + s * bw * 0.6, hx + dir * bw * 2.2, hy + s * bw * 1.4, hx + dir * bw * 3, hy + s * bw * 1.8);
    });
  // The spout of water, falling as spray.
  for (let i = 0; i < 40; i++) {
    const a = -Math.PI / 2 + p.rr(-0.6, 0.6);
    const d = u * p.rr(0.05, 0.3);
    const r = u * p.rr(0.005, 0.015);
    fill(p, 'rgba(240,244,240,0.85)', (k) => k.arc(hx + dir * bw * 0.4 + Math.cos(a) * d, hy - bw + Math.sin(a) * d * 0.6, r, 0, TAU));
  }
  for (let i = 0; i < 18; i++) {
    const fx = cx + p.rr(-1.6, 1.6) * bw;
    const r = u * p.rr(0.01, 0.025);
    fill(p, 'rgba(240,244,240,0.85)', (k) => k.arc(fx, water + u * 0.04 + p.rr(-1, 1) * u * 0.01, r, 0, TAU));
  }
  const bx = cx - dir * u * 0.35;
  fill(p, INK(0.85), (k) => {
    k.moveTo(bx - u * 0.06, water + u * 0.12);
    k.quadraticCurveTo(bx, water + u * 0.15, bx + u * 0.06, water + u * 0.11);
    k.closePath();
  });
}

/** Kyoshi Warrior fans, open on green silk beside the gold headdress. */
export function kyoshiFans(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, tone(JADE, 0.9, 4), (k) => k.rect(-4, -4, w + 8, h + 8));
  for (let i = 0; i < 9; i++) {
    const x = (w * (i + 0.5)) / 9;
    line(p, tone(JADE, 0.9, -6), Math.max(2, u * 0.012), (k) => {
      k.moveTo(x, -4);
      k.bezierCurveTo(x + u * 0.06, h * 0.3, x - u * 0.06, h * 0.7, x + u * 0.03, h + 4);
    });
  }
  const wide = w / h > 1.2;
  const s = Math.min(wide ? h * 0.42 : w * 0.38, u * 0.45);
  const spots: [number, number, number][] = wide
    ? [
        [w * 0.28, h * 0.62, -0.25],
        [w * 0.52, h * 0.55, 0.2],
      ]
    : [
        [w * 0.42, h * 0.38, -0.3],
        [w * 0.56, h * 0.62, 0.25],
      ];
  for (const [fx, fy, rot] of spots) fan(p, fx, fy, s, rot);
  const hx = wide ? w * 0.8 : w * 0.5;
  const hy = wide ? h * 0.5 : h * 0.86;
  const hs = s * 0.55;
  fill(p, GOLD, (k) => {
    k.ellipse(hx, hy, hs * 0.7, hs * 0.25, 0, 0, TAU);
    k.moveTo(hx - hs * 0.5, hy - hs * 0.1);
    k.lineTo(hx - hs * 0.3, hy - hs * 0.8);
    k.lineTo(hx, hy - hs * 0.4);
    k.lineTo(hx + hs * 0.3, hy - hs * 0.8);
    k.lineTo(hx + hs * 0.5, hy - hs * 0.1);
    k.closePath();
  });
  line(p, INK(0.7), 1.4, (k) => k.ellipse(hx, hy, hs * 0.7, hs * 0.25, 0, 0, TAU));
  fill(p, tone(JADE, 1, -10), (k) => k.ellipse(hx, hy, hs * 0.55, hs * 0.14, 0, 0, TAU));
  fill(p, CINNABAR, (k) => k.arc(hx, hy - hs * 0.45, hs * 0.08, 0, TAU));
}

/** An open fan: gold leaf on ribs, with a green band, pivot at (x, y). */
function fan(p: Press, x: number, y: number, s: number, rot: number) {
  const a0 = -Math.PI / 2 - 1.2 + rot;
  const a1 = -Math.PI / 2 + 1.2 + rot;
  const leaf: Trace = (k) => {
    k.moveTo(x + Math.cos(a0) * s * 0.3, y + Math.sin(a0) * s * 0.3);
    k.arc(x, y, s, a0, a1);
    k.arc(x, y, s * 0.3, a1, a0, true);
    k.closePath();
  };
  fill(p, GOLD, leaf);
  within(p, leaf, () => {
    fill(p, tone(JADE, 1, -8), (k) => {
      k.arc(x, y, s, a0, a1);
      k.arc(x, y, s * 0.82, a1, a0, true);
      k.closePath();
    });
    for (let i = 0; i <= 12; i++) {
      const a = a0 + ((a1 - a0) * i) / 12;
      line(p, hsl(40, 50, 40), 1, (k) => {
        k.moveTo(x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.3);
        k.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
      });
    }
  });
  line(p, INK(0.8), 1.4, leaf);
  for (let i = 0; i <= 12; i += 2) {
    const a = a0 + ((a1 - a0) * i) / 12;
    line(p, hsl(26, 40, 26), Math.max(1.2, s * 0.02), (k) => {
      k.moveTo(x, y);
      k.lineTo(x + Math.cos(a) * s * 0.32, y + Math.sin(a) * s * 0.32);
    });
  }
  fill(p, INK(0.9), (k) => k.arc(x, y, s * 0.04, 0, TAU));
}

/** Dunes washed in ochre under a white sky, from y down. */
function dunes(p: Press, y: number) {
  const { w, h } = p;
  const u = Math.min(w, h);
  for (let row = 0; row < 5; row++) {
    const top = y + (h - y) * (row / 5) - u * 0.04;
    const ink: HSL = [SAND[0], SAND[1], SAND[2] - row * 5];
    const amp = u * p.rr(0.03, 0.08);
    const ph = p.rr(0, TAU);
    const fr = p.rr(1.5, 3);
    const dune: Trace = (k) => {
      k.moveTo(-4, h + 4);
      for (let x = -4; x <= w + 4; x += 8) k.lineTo(x, top + Math.sin((x / w) * fr * Math.PI + ph) * amp);
      k.lineTo(w + 4, h + 4);
      k.closePath();
    };
    fill(p, tone(ink, 0.9), dune);
    line(p, INK(0.3), 1, (k) => {
      for (let x = -4; x <= w + 4; x += 8) {
        const yy = top + Math.sin((x / w) * fr * Math.PI + ph) * amp;
        if (x === -4) k.moveTo(x, yy);
        else k.lineTo(x, yy);
      }
    });
  }
}

/** A sandsailer racing over the dunes, its sail full. */
export function sandsailer(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const sun = c.createRadialGradient(w * 0.75, h * 0.2, 0, w * 0.75, h * 0.2, u * 0.3);
  sun.addColorStop(0, 'rgba(255,240,200,0.9)');
  sun.addColorStop(1, 'rgba(255,240,200,0)');
  fill(p, sun, (k) => k.rect(-4, -4, w + 8, h + 8));
  dunes(p, h * 0.45);
  const x = w * p.rr(0.35, 0.6);
  const y = h * 0.75;
  const s = u * 0.4;
  const dir = p.r() < 0.5 ? 1 : -1;
  fill(p, hsl(26, 40, 30), (k) => {
    k.moveTo(x - s * 0.5, y);
    k.lineTo(x + dir * s * 0.55, y - s * 0.02);
    k.lineTo(x + dir * s * 0.45, y + s * 0.07);
    k.lineTo(x - s * 0.42, y + s * 0.07);
    k.closePath();
  });
  line(p, INK(0.9), Math.max(1.4, s * 0.02), (k) => {
    k.moveTo(x, y);
    k.lineTo(x, y - s * 0.8);
  });
  fill(p, tone(SAND, 1, 20), (k) => {
    k.moveTo(x + dir * s * 0.02, y - s * 0.78);
    k.quadraticCurveTo(x + dir * s * 0.5, y - s * 0.5, x + dir * s * 0.42, y - s * 0.08);
    k.lineTo(x + dir * s * 0.02, y - s * 0.08);
    k.closePath();
  });
  for (let i = 0; i < 3; i++) {
    const fx = x - dir * s * (0.1 + i * 0.12);
    fill(p, hsl(30, 30, 36), (k) => {
      k.rect(fx - s * 0.02, y - s * 0.12, s * 0.04, s * 0.12);
      k.moveTo(fx + s * 0.03, y - s * 0.15);
      k.arc(fx, y - s * 0.15, s * 0.03, 0, TAU);
    });
  }
  for (let i = 0; i < 8; i++)
    line(p, tone(SAND, 0.7, -10), 1.2, (k) => {
      const yy = y + s * 0.05 + i * s * 0.015;
      k.moveTo(x - dir * s * 0.5, yy);
      k.lineTo(x - dir * s * (0.8 + i * 0.1), yy + s * 0.02);
    });
}

/** Wan Shi Tong's library tower sinking into the dunes. */
export function library(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  dunes(p, h * 0.66);
  const x = w * p.rr(0.42, 0.58);
  const base = h * 0.78;
  const tw = Math.min(w * 0.5, u * 0.55);
  // Tiers narrowing upwards, each with a roof, topped by the spire.
  let y = base;
  let bw = tw;
  for (let t = 0; t < 5; t++) {
    const th = h * 0.11;
    fill(p, tone(STONE, 1, 12 - t * 2), (k) => k.rect(x - bw * 0.4, y - th, bw * 0.8, th));
    for (let i = 0; i < 5; i++) fill(p, INK(0.7), (k) => k.rect(x - bw * 0.3 + i * bw * 0.14, y - th * 0.75, bw * 0.06, th * 0.5));
    y -= th;
    roofShape(p, x, y, bw, th * 0.45, hsl(36, 40, 44));
    y -= th * 0.35;
    bw *= 0.78;
  }
  fill(p, tone(STONE, 1, -10), (k) => {
    k.moveTo(x - bw * 0.15, y);
    k.lineTo(x, y - h * 0.08);
    k.lineTo(x + bw * 0.15, y);
    k.closePath();
  });
  // The owl's face over the door, and the sand drifting over the lowest tier.
  fill(p, INK(0.85), (k) => {
    k.arc(x - tw * 0.06, base - h * 0.08, tw * 0.04, 0, TAU);
    k.moveTo(x + tw * 0.1, base - h * 0.08);
    k.arc(x + tw * 0.06, base - h * 0.08, tw * 0.04, 0, TAU);
  });
  fill(p, tone(SAND, 1, -4), (k) => {
    k.moveTo(-4, h + 4);
    k.lineTo(-4, base - h * 0.02);
    k.quadraticCurveTo(x, base - h * 0.12, w + 4, base + h * 0.02);
    k.lineTo(w + 4, h + 4);
    k.closePath();
  });
  mist(p, base, h * 0.03, 0.4);
}

/** Misty Palms Oasis: palms round a pool, an inn by the water, the desert beyond. */
export function mistyPalms(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  dunes(p, h * 0.4);
  const py = h * 0.74;
  fill(p, tone(SEA, 0.8, 10), (k) => k.ellipse(w / 2, py, w * 0.34, h * 0.07, 0, 0, TAU));
  line(p, INK(0.5), 1.2, (k) => k.ellipse(w / 2, py, w * 0.34, h * 0.07, 0, 0, TAU));
  const ix = w * (p.r() < 0.5 ? 0.25 : 0.75);
  fill(p, OCHRE, (k) => k.rect(ix - u * 0.12, py - h * 0.2, u * 0.24, h * 0.14));
  roofShape(p, ix, py - h * 0.2, u * 0.3, u * 0.08, hsl(36, 40, 44));
  const n = Math.max(4, Math.round((w / u) * 4));
  for (let i = 0; i < n; i++) {
    const x = w * ((i + 0.5) / n) + p.rr(-0.04, 0.04) * w;
    palm(p, x, py - h * p.rr(-0.02, 0.06), h * p.rr(0.28, 0.4));
  }
}

/** A palm: a curving trunk with a burst of fronds. */
function palm(p: Press, x: number, y: number, s: number) {
  const lean = p.rr(-0.25, 0.25);
  const tx = x + lean * s;
  const ty = y - s;
  line(p, hsl(30, 30, 30), Math.max(1.5, s * 0.03), (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x + lean * s * 0.2, y - s * 0.6, tx, ty);
  });
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.45 + p.rr(-0.1, 0.1);
    const l = s * p.rr(0.3, 0.42);
    line(p, tone(JADE, 0.9, -4), Math.max(1.5, s * 0.025), (k) => {
      k.moveTo(tx, ty);
      k.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - l * 0.1, tx + Math.cos(a) * l, ty + Math.sin(a) * l + l * 0.3);
    });
  }
}

/** The Jasmine Dragon: Iroh's tea shop on a street of the Upper Ring, lanterns at the door. */
export function jasmine(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.3, h * 0.08, -10, w + 10, AZURITE, 0.3);
  mist(p, h * 0.3, h * 0.05);
  const x = w / 2;
  const base = h * 0.82;
  const sw = Math.min(w * 0.7, u * 0.9);
  hall(p, x, base, sw, Math.min(h * 0.6, sw * 0.75), 2);
  // The sign board and the lanterns either side of the door.
  const sy = base - h * 0.32;
  fill(p, hsl(30, 40, 24), (k) => k.rect(x - sw * 0.22, sy, sw * 0.44, sw * 0.1));
  for (let i = 0; i < 4; i++) {
    const gx = x - sw * 0.17 + i * sw * 0.11;
    line(p, GOLD, Math.max(1.4, sw * 0.012), (k) => {
      k.moveTo(gx, sy + sw * 0.03);
      k.lineTo(gx + sw * 0.03, sy + sw * 0.05);
      k.moveTo(gx + sw * 0.01, sy + sw * 0.07);
      k.lineTo(gx + sw * 0.04, sy + sw * 0.07);
    });
  }
  for (const sgn of [-1, 1]) {
    const lx = x + sgn * sw * 0.3;
    const ly = base - h * 0.2;
    const gl = c.createRadialGradient(lx, ly, 0, lx, ly, u * 0.1);
    gl.addColorStop(0, 'rgba(255,200,120,0.5)');
    gl.addColorStop(1, 'rgba(255,200,120,0)');
    fill(p, gl, (k) => k.arc(lx, ly, u * 0.1, 0, TAU));
    fill(p, CINNABAR, (k) => k.ellipse(lx, ly, u * 0.03, u * 0.04, 0, 0, TAU));
    fill(p, GOLD, (k) => k.rect(lx - u * 0.015, ly - u * 0.05, u * 0.03, u * 0.012));
  }
  fill(p, tone(STONE, 1, 22), (k) => k.rect(-4, base, w + 8, h - base + 4));
  for (let i = 0; i < 4; i++) tree(p, p.r() < 0.5 ? p.rr(0, x - sw * 0.5) : p.rr(x + sw * 0.5, w), base, u * p.rr(0.14, 0.2), MALACHITE);
}

/** A tea tray: a round pot, cups and a sprig of jasmine, steam rising. */
export function teaSet(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, tone(JADE, 0.85, 6), (k) => k.rect(-4, h * 0.55, w + 8, h * 0.5));
  line(p, INK(0.5), 1.2, (k) => {
    k.moveTo(-4, h * 0.55);
    k.lineTo(w + 4, h * 0.55);
  });
  const x = w * 0.42;
  const y = h * 0.7;
  const s = Math.min(w * 0.3, u * 0.38);
  const pot: Trace = (k) => k.ellipse(x, y - s * 0.35, s * 0.42, s * 0.36, 0, 0, TAU);
  fill(p, hsl(26, 36, 34), pot);
  within(p, pot, () => fill(p, hsl(26, 36, 24), (k) => k.ellipse(x + s * 0.18, y - s * 0.3, s * 0.3, s * 0.4, 0, 0, TAU)));
  line(p, INK(0.8), 1.4, pot);
  line(p, hsl(26, 36, 30), Math.max(2, s * 0.05), (k) => {
    k.moveTo(x - s * 0.36, y - s * 0.45);
    k.quadraticCurveTo(x - s * 0.62, y - s * 0.65, x - s * 0.68, y - s * 0.8);
    k.moveTo(x + s * 0.38, y - s * 0.55);
    k.bezierCurveTo(x + s * 0.7, y - s * 0.7, x + s * 0.7, y - s * 0.1, x + s * 0.38, y - s * 0.2);
  });
  fill(p, hsl(26, 36, 24), (k) => k.ellipse(x, y - s * 0.72, s * 0.16, s * 0.05, 0, 0, TAU));
  fill(p, GOLD, (k) => k.arc(x, y - s * 0.78, s * 0.04, 0, TAU));
  for (let i = 0; i < 3; i++)
    line(p, 'rgba(250,248,240,0.7)', Math.max(1, s * 0.015), (k) => {
      const sx = x - s * 0.68 + i * s * 0.04;
      k.moveTo(sx, y - s * 0.85);
      k.bezierCurveTo(sx + s * 0.08, y - s * 1, sx - s * 0.08, y - s * 1.1, sx + s * 0.04, y - s * 1.25);
    });
  const cups = w / h > 1.2 ? 3 : 2;
  for (let i = 0; i < cups; i++) {
    const cx2 = x + s * (0.75 + i * 0.45);
    const cy2 = y + s * 0.05;
    const cup: Trace = (k) => {
      k.moveTo(cx2 - s * 0.14, cy2 - s * 0.16);
      k.lineTo(cx2 + s * 0.14, cy2 - s * 0.16);
      k.quadraticCurveTo(cx2 + s * 0.13, cy2, cx2, cy2);
      k.quadraticCurveTo(cx2 - s * 0.13, cy2, cx2 - s * 0.14, cy2 - s * 0.16);
      k.closePath();
    };
    fill(p, silkInk(), cup);
    line(p, INK(0.7), 1.2, cup);
    line(p, tone(JADE, 1, -10), Math.max(1, s * 0.02), (k) => {
      k.moveTo(cx2 - s * 0.12, cy2 - s * 0.1);
      k.lineTo(cx2 + s * 0.12, cy2 - s * 0.1);
    });
  }
  for (let i = 0; i < 5; i++) {
    const fx = x - s * 0.9 + p.rr(-0.1, 0.1) * s;
    const fy = y + s * 0.15 + p.rr(-0.05, 0.05) * s;
    for (let k2 = 0; k2 < 5; k2++) {
      const a = (k2 / 5) * TAU;
      fill(p, silkInk(), (k) => k.arc(fx + Math.cos(a) * s * 0.03, fy + Math.sin(a) * s * 0.03, s * 0.025, 0, TAU));
    }
  }
}

