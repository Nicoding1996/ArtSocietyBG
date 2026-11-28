import { hsl } from '../common';
import { type Trace, TAU, BLACK, NAVY, BLUE, ICE, SNOW, SKY, RED, type Press, fill, line, within } from './print';
import { BONE, BONE_DARK, HIDE, HIDE_DARK, SNOW_SHADE, aurora, igloo, pelt, penguin, ridge, snowWall, watchtower } from './water-motifs';

/** Life in the south: the watchtower, black snow, a hut by the fire, ice fishing, the banner, and three treasures. */

const ASH = 'rgba(28,26,30,0.82)';
const FIRE = hsl(26, 90, 56);
const FIRE_HOT = hsl(44, 95, 70);
const SWAMP = hsl(150, 22, 24);
const SWAMP_LIGHT = hsl(140, 22, 38);

/** Sky over snow, day or night. Returns the horizon's height. */
function southSky(p: Press, at: number, night: boolean): number {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * at;
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, night ? hsl(222, 50, 12) : hsl(204, 46, 60));
  sky.addColorStop(1, night ? hsl(210, 45, 32) : hsl(198, 38, 86));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  if (night) aurora(p, horizon);
  ridge(p, horizon, u, night ? hsl(208, 30, 50) : hsl(203, 30, 76));
  fill(p, SNOW, (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  return horizon;
}

/** Sokka's watchtower up close from the foot of the wall, penguins tobogganing past. */
export function watchtowerView(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const night = p.r() < 0.3;
  const horizon = southSky(p, p.rr(0.6, 0.7), night);
  const lit = p.r() < 0.5 ? -1 : 1;
  const tx = w * p.rr(0.4, 0.6);
  const base = h * 0.82;
  const tw = Math.min(w * 0.36, u * 0.42);
  // Leave room above the tower for its platform, pole and pennant.
  watchtower(p, tx, base, Math.min(base * 0.72, base - h * 0.03 - tw * 1.9), tw, lit);
  snowWall(p, -u * 0.05, tx - u * 0.25, base + u * 0.02, u * 0.06);
  snowWall(p, tx + u * 0.25, w + u * 0.05, base + u * 0.02, u * 0.06);
  for (let i = 0; i < 4; i++) fill(p, SNOW_SHADE, (k) => k.ellipse(p.rr(0, w), p.rr(horizon, h), w * p.rr(0.15, 0.3), u * 0.012, 0, 0, TAU));
  const dir = p.r() < 0.5 ? 1 : -1;
  for (let i = 0; i < 3; i++) penguin(p, w * (0.2 + i * 0.12) * (dir > 0 ? 1 : -1) + (dir > 0 ? 0 : w), h * p.rr(0.9, 0.96), u * 0.07, dir);
}

/** Black snow falling on the village: soot from the Fire Navy before a raid. */
export function blackSnow(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * p.rr(0.5, 0.58);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(220, 10, 30));
  sky.addColorStop(1, hsl(210, 8, 62));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  // The shape of a ship far off, its smoke drifting over.
  const sx = w * p.rr(0.2, 0.8);
  fill(
    p,
    hsl(222, 10, 20),
    (k) => {
      k.moveTo(sx - u * 0.12, horizon - u * 0.01);
      k.lineTo(sx + u * 0.1, horizon - u * 0.01);
      k.lineTo(sx + u * 0.13, horizon - u * 0.04);
      k.lineTo(sx + u * 0.06, horizon - u * 0.04);
      k.lineTo(sx + u * 0.05, horizon - u * 0.1);
      k.lineTo(sx + u * 0.02, horizon - u * 0.1);
      k.lineTo(sx + u * 0.01, horizon - u * 0.04);
      k.lineTo(sx - u * 0.12, horizon - u * 0.04);
      k.closePath();
    },
    true,
  );
  for (let i = 0; i < 7; i++) fill(p, `rgba(40,38,44,${0.45 - i * 0.05})`, (k) => k.arc(sx + u * 0.035 + i * u * 0.05, horizon - u * (0.13 + i * 0.03), u * (0.03 + i * 0.012), 0, TAU));
  fill(p, hsl(210, 6, 82), (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  const lit = -1;
  const ground = horizon + (h - horizon) * 0.45;
  for (let x = u * 0.15; x < w - u * 0.1; x += u * p.rr(0.28, 0.36)) igloo(p, x, ground, u * p.rr(0.12, 0.15), lit);
  snowWall(p, -u * 0.05, w + u * 0.05, ground + u * 0.08, u * 0.045);
  // A child holding out a hand to catch the flakes.
  const kx = w * p.rr(0.3, 0.7);
  const ky = ground + (h - ground) * 0.75;
  const ks = u * 0.18;
  fill(
    p,
    BLUE,
    (k) => {
      k.moveTo(kx - ks * 0.22, ky);
      k.quadraticCurveTo(kx - ks * 0.26, ky - ks * 0.6, kx, ky - ks * 0.66);
      k.quadraticCurveTo(kx + ks * 0.26, ky - ks * 0.6, kx + ks * 0.22, ky);
      k.closePath();
    },
    true,
  );
  fill(p, SNOW, (k) => k.arc(kx, ky - ks * 0.8, ks * 0.17, 0, TAU), true);
  fill(p, hsl(24, 42, 44), (k) => k.arc(kx, ky - ks * 0.8, ks * 0.11, 0, TAU), true);
  line(p, BLUE, ks * 0.08, (k) => {
    k.moveTo(kx + ks * 0.12, ky - ks * 0.5);
    k.lineTo(kx + ks * 0.38, ky - ks * 0.72);
  }, true);
  // The black flakes, everywhere.
  for (let i = 0; i < 380 * p.detail; i++) {
    const ax = p.rr(0, w);
    const ay = p.rr(0, h);
    const ar = p.rr(0.8, 2.6) * (0.6 + ay / h);
    fill(p, ASH, (k) => k.arc(ax, ay, ar, 0, TAU), true);
  }
}

/** Inside a southern hut: the cooking fire under its pot, hides on the walls, the door flap open on the snow. */
export function hutInterior(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  fill(p, HIDE_DARK, (k) => k.rect(-4, -4, w + 8, h + 8));
  // The curve of the hut wall, stitched hides lit by the fire.
  const cx = w * p.rr(0.42, 0.58);
  const fy = h * 0.72;
  const warm = c.createRadialGradient(cx, fy, 0, cx, fy, Math.max(w, h) * 0.75);
  warm.addColorStop(0, hsl(32, 60, 62));
  warm.addColorStop(0.5, hsl(28, 40, 42));
  warm.addColorStop(1, hsl(24, 34, 22));
  fill(p, warm, (k) => k.rect(-4, -4, w + 8, h + 8));
  for (let i = 0; i < 9; i++) {
    const x = (w * (i + 0.5)) / 9;
    line(p, hsl(24, 34, 26), Math.max(1.2, u * 0.006), (k) => {
      k.moveTo(w / 2 + (x - w / 2) * 0.2, -4);
      k.quadraticCurveTo(x, h * 0.3, x + (x - w / 2) * 0.3, h * 0.7);
    });
  }
  // The open door flap with the snow outside.
  const dx = cx + (p.r() < 0.5 ? -1 : 1) * w * 0.32;
  const door: Trace = (k) => {
    k.moveTo(dx - u * 0.1, h * 0.62);
    k.quadraticCurveTo(dx - u * 0.1, h * 0.3, dx, h * 0.28);
    k.quadraticCurveTo(dx + u * 0.1, h * 0.3, dx + u * 0.1, h * 0.62);
    k.closePath();
  };
  fill(p, hsl(204, 40, 76), door);
  within(p, door, () => {
    fill(p, SNOW, (k) => k.rect(dx - u * 0.2, h * 0.5, u * 0.4, h * 0.2));
    for (let i = 0; i < 12; i++) fill(p, SNOW, (k) => k.arc(dx + p.rr(-0.1, 0.1) * u, h * p.rr(0.3, 0.55), u * 0.006, 0, TAU));
  });
  // Floor of furs.
  fill(p, hsl(30, 30, 30), (k) => k.rect(-4, h * 0.66, w + 8, h * 0.4));
  for (let i = 0; i < 4; i++) pelt(p, w * (0.15 + i * 0.25), h * p.rr(0.82, 0.92), w * 0.14, h * 0.07);
  // The fire: stones, logs, flames, and the pot on its tripod.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (i / 8);
    fill(p, hsl(210, 6, 36), (k) => k.ellipse(cx + Math.cos(a) * u * 0.14, fy + u * 0.02 - Math.sin(a) * u * 0.02, u * 0.03, u * 0.02, 0, 0, TAU), true);
  }
  const glow = c.createRadialGradient(cx, fy - u * 0.05, 0, cx, fy - u * 0.05, u * 0.3);
  glow.addColorStop(0, 'rgba(255,200,110,0.6)');
  glow.addColorStop(1, 'rgba(255,200,110,0)');
  fill(p, glow, (k) => k.arc(cx, fy - u * 0.05, u * 0.3, 0, TAU));
  for (const [ink, s] of [
    [FIRE, 1],
    [FIRE_HOT, 0.55],
  ] as const)
    fill(p, ink, (k) => {
      k.moveTo(cx - u * 0.1 * s, fy);
      k.quadraticCurveTo(cx - u * 0.09 * s, fy - u * 0.14 * s, cx - u * 0.03 * s, fy - u * 0.2 * s);
      k.quadraticCurveTo(cx - u * 0.02 * s, fy - u * 0.1 * s, cx + u * 0.01 * s, fy - u * 0.24 * s);
      k.quadraticCurveTo(cx + u * 0.08 * s, fy - u * 0.12 * s, cx + u * 0.1 * s, fy);
      k.closePath();
    });
  for (const sgn of [-1, 0, 1])
    line(p, BLACK, Math.max(1.4, u * 0.008), (k) => {
      k.moveTo(cx + sgn * u * 0.18, fy + u * 0.03);
      k.lineTo(cx, fy - u * 0.4);
    }, true);
  fill(p, hsl(210, 10, 20), (k) => k.ellipse(cx, fy - u * 0.28, u * 0.1, u * 0.075, 0, 0, TAU), true);
  line(p, BLACK, 1.4, (k) => {
    k.moveTo(cx, fy - u * 0.4);
    k.lineTo(cx, fy - u * 0.35);
  }, true);
  for (let i = 0; i < 3; i++)
    line(p, 'rgba(240,236,228,0.6)', Math.max(1.2, u * 0.006), (k) => {
      const sx = cx + (i - 1) * u * 0.04;
      k.moveTo(sx, fy - u * 0.36);
      k.bezierCurveTo(sx + u * 0.03, fy - u * 0.45, sx - u * 0.03, fy - u * 0.52, sx + u * 0.02, fy - u * 0.6);
    });
}

/** Ice fishing: a round hole in the ice with a spear, a line and the day's catch beside it. */
export function iceFishing(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const horizon = southSky(p, p.rr(0.2, 0.3), false);
  for (let i = 0; i < 5; i++) fill(p, SNOW_SHADE, (k) => k.ellipse(p.rr(0, w), p.rr(horizon, h), w * p.rr(0.2, 0.4), u * 0.012, 0, 0, TAU));
  const hx = w * p.rr(0.4, 0.6);
  const hy = horizon + (h - horizon) * 0.5;
  const hr = Math.min(w * 0.22, u * 0.28);
  fill(p, ICE, (k) => k.ellipse(hx, hy, hr * 1.25, hr * 0.5, 0, 0, TAU));
  fill(p, NAVY, (k) => k.ellipse(hx, hy, hr, hr * 0.38, 0, 0, TAU));
  for (let i = 0; i < 3; i++) line(p, BLUE, Math.max(1, u * 0.006), (k) => k.ellipse(hx, hy, hr * (0.3 + i * 0.22), hr * 0.38 * (0.3 + i * 0.22), 0, 0, TAU));
  // A line into the water, the spear across the ice, and three fish.
  line(p, BLACK, Math.max(1, u * 0.004), (k) => {
    k.moveTo(hx + hr * 0.2, hy);
    k.lineTo(hx + hr * 0.9, hy - hr * 0.9);
  }, true);
  line(p, BONE_DARK, Math.max(2, u * 0.012), (k) => {
    k.moveTo(hx + hr * 0.9, hy - hr * 0.9);
    k.lineTo(hx + hr * 1.5, hy - hr * 0.55);
  });
  const sa = p.rr(-0.3, 0.3);
  const sx0 = hx - hr * 1.6;
  const sy0 = hy + hr * 0.75;
  const sl = hr * 2.4;
  line(p, BONE_DARK, Math.max(2, u * 0.014), (k) => {
    k.moveTo(sx0, sy0);
    k.lineTo(sx0 + Math.cos(sa) * sl, sy0 + Math.sin(sa) * sl * 0.3);
  });
  const tx = sx0 + Math.cos(sa) * sl;
  const ty = sy0 + Math.sin(sa) * sl * 0.3;
  fill(p, BONE, (k) => {
    k.moveTo(tx, ty - u * 0.02);
    k.lineTo(tx + u * 0.07, ty);
    k.lineTo(tx, ty + u * 0.02);
    k.closePath();
  });
  for (let i = 0; i < 3; i++) fish(p, hx - hr * (1.2 - i * 0.35), hy - hr * (0.75 + i * 0.12), u * 0.11, p.rr(-0.4, 0.4));
}

/** A silver fish lying on the ice. */
function fish(p: Press, x: number, y: number, s: number, ang: number) {
  const c = p.c;
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const body: Trace = (k) => {
    k.moveTo(-s * 0.5, 0);
    k.quadraticCurveTo(0, -s * 0.24, s * 0.5, 0);
    k.quadraticCurveTo(0, s * 0.24, -s * 0.5, 0);
    k.closePath();
    k.moveTo(-s * 0.45, 0);
    k.lineTo(-s * 0.7, -s * 0.16);
    k.lineTo(-s * 0.7, s * 0.16);
    k.closePath();
  };
  fill(p, hsl(205, 20, 66), body);
  line(p, BLACK, 1.4, body, true);
  line(p, hsl(205, 30, 46), Math.max(1, s * 0.03), (k) => {
    k.moveTo(-s * 0.35, 0);
    k.lineTo(s * 0.35, 0);
  });
  fill(p, BLACK, (k) => k.arc(s * 0.33, -s * 0.04, s * 0.035, 0, TAU), true);
  c.restore();
}

/** The Water Tribe banner on a tall pole, cracking in the wind over the snow. */
export function banner(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const horizon = southSky(p, p.rr(0.72, 0.8), p.r() < 0.35);
  const px = w * p.rr(0.28, 0.4);
  const top = h * 0.08;
  line(p, BLACK, Math.max(2, u * 0.016), (k) => {
    k.moveTo(px, h * 0.96);
    k.lineTo(px, top);
  }, true);
  fill(p, BONE, (k) => k.arc(px, top, u * 0.02, 0, TAU));
  const fw = Math.min(w * 0.6, u * 0.85);
  const fh = Math.min(h * 0.34, fw * 0.9);
  const wave = p.rr(0.6, 1);
  const flag: Trace = (k) => {
    k.moveTo(px, top + u * 0.02);
    k.bezierCurveTo(px + fw * 0.3, top - fh * 0.12 * wave, px + fw * 0.7, top + fh * 0.18 * wave, px + fw, top + fh * 0.05);
    k.lineTo(px + fw * 0.92, top + fh * 0.55);
    k.lineTo(px + fw, top + fh * 1.05);
    k.bezierCurveTo(px + fw * 0.7, top + fh * 1.15 * wave, px + fw * 0.3, top + fh * 0.85, px, top + fh);
    k.closePath();
  };
  fill(p, BLUE, flag);
  within(p, flag, () => {
    fill(p, NAVY, (k) => k.rect(px, top + fh * 0.78, fw * 1.1, fh * 0.4));
    // The emblem: a crescent moon over three waves.
    const ex = px + fw * 0.48;
    const ey = top + fh * 0.42;
    const er = fh * 0.2;
    fill(p, SNOW, (k) => k.arc(ex, ey - er * 0.1, er, 0, TAU));
    fill(p, BLUE, (k) => k.arc(ex + er * 0.35, ey - er * 0.3, er * 0.85, 0, TAU));
    for (let i = 0; i < 3; i++)
      line(p, SNOW, Math.max(1.4, fh * 0.035), (k) => {
        const y = ey + er * (0.9 + i * 0.35);
        k.moveTo(ex - er * 1.2, y);
        k.quadraticCurveTo(ex - er * 0.6, y - er * 0.3, ex, y);
        k.quadraticCurveTo(ex + er * 0.6, y + er * 0.3, ex + er * 1.2, y);
      });
  });
  for (let i = 0; i < 8; i++) {
    const y = p.rr(0.1, 0.6) * h;
    line(p, 'rgba(255,255,255,0.6)', Math.max(1, u * 0.004), (k) => {
      const x0 = p.rr(0.5, 0.95) * w;
      k.moveTo(x0, y);
      k.lineTo(x0 + u * p.rr(0.05, 0.12), y + u * 0.01);
    });
  }
  snowWall(p, -u * 0.05, w + u * 0.05, horizon + (h - horizon) * 0.6, u * 0.04);
}

/** The waterbending scroll laid out on a fur, its figures showing the forms. */
export function scroll(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, NAVY, (k) => k.rect(-4, -4, w + 8, h + 8));
  for (let y = u * 0.02; y < h; y += u * 0.035) {
    const yy = y;
    line(p, hsl(214, 50, 28), 1.2, (k) => {
      k.moveTo(-4, yy);
      k.lineTo(w + 4, yy);
    });
  }
  pelt(p, w / 2, h / 2, w * 0.46, h * 0.42);
  const sw = w * 0.78;
  const sh = Math.min(h * 0.46, sw * 0.4);
  const x0 = w / 2 - sw / 2;
  const y0 = h / 2 - sh / 2;
  fill(p, hsl(40, 46, 82), (k) => k.rect(x0, y0, sw, sh));
  line(p, HIDE_DARK, 1.4, (k) => k.rect(x0, y0, sw, sh), true);
  for (const x of [x0, x0 + sw]) {
    fill(p, hsl(26, 40, 30), (k) => k.roundRect(x - sh * 0.06, y0 - sh * 0.08, sh * 0.12, sh * 1.16, sh * 0.05), true);
    fill(p, BONE, (k) => {
      k.arc(x, y0 - sh * 0.1, sh * 0.06, 0, TAU);
      k.moveTo(x + sh * 0.06, y0 + sh * 1.1);
      k.arc(x, y0 + sh * 1.1, sh * 0.06, 0, TAU);
    });
  }
  // Panels of little figures, each in a stance with water arcing from its hands.
  const n = Math.max(3, Math.round(sw / (sh * 0.75)));
  for (let i = 0; i < n; i++) {
    const fx = x0 + (sw * (i + 0.5)) / n;
    const fy = y0 + sh * 0.62;
    const fs = sh * 0.45;
    const lean = p.rr(-0.3, 0.3);
    line(p, BLACK, Math.max(1.2, fs * 0.05), (k) => {
      k.moveTo(fx - fs * 0.3, fy + fs * 0.45);
      k.lineTo(fx, fy);
      k.lineTo(fx + fs * 0.32, fy + fs * 0.45);
      k.moveTo(fx, fy);
      k.lineTo(fx + lean * fs, fy - fs * 0.5);
      k.moveTo(fx + lean * fs * 0.8, fy - fs * 0.38);
      k.lineTo(fx + fs * (0.35 + lean), fy - fs * p.rr(0.2, 0.7));
      k.moveTo(fx + lean * fs * 0.8, fy - fs * 0.38);
      k.lineTo(fx - fs * (0.3 - lean), fy - fs * p.rr(0.1, 0.5));
    }, true);
    fill(p, BLACK, (k) => k.arc(fx + lean * fs * 1.1, fy - fs * 0.62, fs * 0.09, 0, TAU), true);
    line(p, BLUE, Math.max(1.4, fs * 0.06), (k) => k.arc(fx + lean * fs, fy - fs * 0.45, fs * 0.45, Math.PI * p.rr(1.1, 1.4), Math.PI * p.rr(1.7, 2.0)));
    fill(p, RED, (k) => k.rect(fx + fs * 0.3, y0 + sh * 0.08, fs * 0.12, fs * 0.12));
  }
}

/** A small glass vial of glowing Spirit Water on its cord, lying on blue cloth by moonlight. */
export function vial(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  fill(p, NAVY, (k) => k.rect(-4, -4, w + 8, h + 8));
  // Folds in the cloth.
  for (let i = 0; i < 7; i++) {
    const x = (w * (i + 0.5)) / 7;
    line(p, hsl(214, 50, 30), Math.max(2, u * 0.02), (k) => {
      k.moveTo(x, -4);
      k.bezierCurveTo(x + u * 0.08, h * 0.3, x - u * 0.08, h * 0.6, x + u * 0.04, h + 4);
    });
  }
  const vx = w / 2;
  const vy = h * 0.58;
  const vh = Math.min(h * 0.5, w * 0.9);
  const vw = vh * 0.34;
  // The cord, looping up out of the picture.
  line(p, HIDE, Math.max(1.6, u * 0.012), (k) => {
    k.moveTo(vx, vy - vh * 0.5);
    k.bezierCurveTo(vx - w * 0.4, vy - vh * 0.9, vx + w * 0.3, h * 0.05, vx - w * 0.1, -4);
  });
  const glow = c.createRadialGradient(vx, vy, 0, vx, vy, vh * 0.9);
  glow.addColorStop(0, 'rgba(170,240,255,0.55)');
  glow.addColorStop(1, 'rgba(170,240,255,0)');
  fill(p, glow, (k) => k.arc(vx, vy, vh * 0.9, 0, TAU));
  const glass: Trace = (k) => {
    k.moveTo(vx - vw * 0.25, vy - vh * 0.44);
    k.lineTo(vx - vw * 0.25, vy - vh * 0.25);
    k.bezierCurveTo(vx - vw * 0.6, vy - vh * 0.15, vx - vw * 0.55, vy + vh * 0.48, vx, vy + vh * 0.48);
    k.bezierCurveTo(vx + vw * 0.55, vy + vh * 0.48, vx + vw * 0.6, vy - vh * 0.15, vx + vw * 0.25, vy - vh * 0.25);
    k.lineTo(vx + vw * 0.25, vy - vh * 0.44);
    k.closePath();
  };
  fill(p, hsl(196, 40, 80, 0.55), glass);
  within(p, glass, () => {
    fill(p, hsl(186, 70, 70), (k) => k.rect(vx - vw, vy - vh * 0.05, vw * 2, vh));
    for (let i = 0; i < 6; i++) fill(p, SNOW, (k) => k.arc(vx + p.rr(-0.3, 0.3) * vw, vy + p.rr(0, 0.4) * vh, vw * p.rr(0.03, 0.07), 0, TAU));
    line(p, 'rgba(255,255,255,0.8)', Math.max(1.4, vw * 0.06), (k) => {
      k.moveTo(vx - vw * 0.28, vy - vh * 0.1);
      k.quadraticCurveTo(vx - vw * 0.38, vy + vh * 0.2, vx - vw * 0.22, vy + vh * 0.38);
    });
  });
  line(p, BLACK, 1.6, glass, true);
  fill(p, HIDE_DARK, (k) => k.roundRect(vx - vw * 0.3, vy - vh * 0.52, vw * 0.6, vh * 0.1, vw * 0.06), true);
  line(p, SKY, Math.max(1, u * 0.006), (k) => k.arc(vx, vy + vh * 0.1, vh * 0.75, Math.PI * 1.15, Math.PI * 1.35));
}

/** The great tree at the heart of the Foggy Swamp, its roots reaching through the mist. */
export function swamp(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, hsl(160, 14, 54));
  sky.addColorStop(1, hsl(170, 16, 34));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, h + 8));
  const water = h * 0.76;
  fill(p, hsl(168, 26, 22), (k) => k.rect(-4, water, w + 8, h - water + 4));
  const cx = w * p.rr(0.42, 0.58);
  const tw = Math.min(w * 0.3, u * 0.36);
  // Roots arching down into the water.
  for (let i = 0; i < 9; i++) {
    const t = (i - 4) / 4;
    const rx = cx + t * w * 0.48;
    line(p, SWAMP, Math.max(3, tw * 0.1 * (1 - Math.abs(t) * 0.5)), (k) => {
      k.moveTo(cx + t * tw * 0.3, water - h * 0.2);
      k.quadraticCurveTo(cx + t * tw * 0.9, water - h * 0.32, rx, water + u * 0.02);
    });
  }
  // Trunk and the canopy spreading out of the top of the picture.
  fill(p, SWAMP, (k) => {
    k.moveTo(cx - tw * 0.32, water - h * 0.18);
    k.bezierCurveTo(cx - tw * 0.2, h * 0.4, cx - tw * 0.4, h * 0.2, cx - tw * 0.6, -4);
    k.lineTo(cx + tw * 0.6, -4);
    k.bezierCurveTo(cx + tw * 0.4, h * 0.2, cx + tw * 0.2, h * 0.4, cx + tw * 0.32, water - h * 0.18);
    k.closePath();
  });
  for (let i = 0; i < 30; i++) {
    const lx = p.rr(-0.1, 1.1) * w;
    const ly = p.rr(-0.05, 0.25) * h;
    fill(p, p.r() < 0.5 ? SWAMP_LIGHT : hsl(150, 24, 30), (k) => k.arc(lx, ly, u * p.rr(0.06, 0.12), 0, TAU));
  }
  // Hanging moss and vines.
  for (let i = 0; i < 16; i++) {
    const vx = p.rr(0, w);
    const vl = h * p.rr(0.15, 0.45);
    line(p, SWAMP_LIGHT, Math.max(1, u * 0.006), (k) => {
      k.moveTo(vx, h * 0.15);
      k.quadraticCurveTo(vx + u * 0.03, h * 0.15 + vl * 0.5, vx, h * 0.15 + vl);
    });
  }
  // Mist lying on the water, and a skiff with a pole.
  for (let i = 0; i < 4; i++) {
    const my = water - u * 0.05 + i * u * 0.05;
    const g = c.createLinearGradient(0, my - u * 0.05, 0, my + u * 0.05);
    g.addColorStop(0, 'rgba(230,240,236,0)');
    g.addColorStop(0.5, 'rgba(230,240,236,0.5)');
    g.addColorStop(1, 'rgba(230,240,236,0)');
    fill(p, g, (k) => k.rect(-4, my - u * 0.05, w + 8, u * 0.1));
  }
  const bx = w * (p.r() < 0.5 ? 0.2 : 0.8);
  const by = water + (h - water) * 0.5;
  fill(p, hsl(26, 30, 22), (k) => {
    k.moveTo(bx - u * 0.12, by);
    k.lineTo(bx + u * 0.12, by);
    k.lineTo(bx + u * 0.09, by + u * 0.025);
    k.lineTo(bx - u * 0.09, by + u * 0.025);
    k.closePath();
  }, true);
  fill(p, BLACK, (k) => {
    k.moveTo(bx - u * 0.02, by);
    k.quadraticCurveTo(bx - u * 0.025, by - u * 0.09, bx, by - u * 0.1);
    k.quadraticCurveTo(bx + u * 0.025, by - u * 0.09, bx + u * 0.02, by);
    k.closePath();
    k.moveTo(bx + u * 0.018, by - u * 0.12);
    k.arc(bx, by - u * 0.12, u * 0.018, 0, TAU);
  }, true);
  line(p, BLACK, Math.max(1.2, u * 0.006), (k) => {
    k.moveTo(bx + u * 0.03, by - u * 0.18);
    k.lineTo(bx - u * 0.03, by + u * 0.06);
  }, true);
}
