import { hsl, type Pt } from '../common';
import { TAU, BLACK, NAVY, BLUE, ICE, SNOW, type Press, fill, line, within } from './print';
import { canoe, moon } from './water-motifs';

/** The southern sea: Hakoda's fleet, ice dodging, the glowing iceberg and icebergs at dusk. */

interface BergTone {
  face: string;
  shade: string;
  foot: string;
}

const BERG: BergTone = { face: hsl(195, 36, 90), shade: hsl(204, 38, 70), foot: hsl(196, 40, 52) };
const WOOD = hsl(24, 38, 26);

/** An iceberg of flat facets, taller in the middle, lit from one side, with its pale foot under the water. */
function berg(p: Press, x: number, waterline: number, wd: number, ht: number, lit: number, tone: BergTone) {
  const n = p.ri(4, 7);
  const pts: Pt[] = [[x - wd / 2, waterline]];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([x - wd / 2 + wd * t + p.rr(-0.05, 0.05) * wd, waterline - ht * Math.sin(t * Math.PI) ** 0.7 * p.rr(0.55, 1)]);
  }
  pts.push([x + wd / 2, waterline]);
  fill(p, tone.foot, (k) => k.ellipse(x, waterline, wd * 0.6, ht * 0.14, 0, 0, Math.PI));
  const body = (k: CanvasRenderingContext2D) => {
    k.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts) k.lineTo(px, py);
    k.closePath();
  };
  fill(p, tone.face, body);
  within(p, body, () => {
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      const a = p.rr(0.04, 0.12) * wd;
      const b = p.rr(0.16, 0.3) * wd;
      fill(p, tone.shade, (k) => {
        k.moveTo(px, py);
        k.lineTo(px - lit * a, waterline + 1);
        k.lineTo(px - lit * b, waterline + 1);
        k.closePath();
      });
    }
  });
  line(p, tone.foot, Math.max(1, ht * 0.02), (k) => {
    k.moveTo(x - wd * 0.48, waterline);
    k.lineTo(x + wd * 0.48, waterline);
  });
}

/** Ripples cut into a dark sea below `top`. */
function ripples(p: Press, top: number, ink: string, n = 30) {
  const u = Math.min(p.w, p.h);
  for (let i = 0; i < n * p.detail; i++) {
    const rx = p.rr(-20, p.w + 20);
    const ry = p.rr(top + 4, p.h);
    const rl = u * p.rr(0.025, 0.07) * (0.5 + (ry - top) / (p.h - top));
    line(p, ink, p.rr(1, 1.8), (k) => {
      k.moveTo(rx - rl, ry);
      k.quadraticCurveTo(rx, ry - rl * 0.3, rx + rl, ry);
    });
  }
}

/** Hakoda's warships under blue sails, setting out at dawn. */
export function warFleet(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * p.rr(0.5, 0.58);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(208, 46, 58));
  sky.addColorStop(0.7, hsl(30, 60, 84));
  sky.addColorStop(1, hsl(38, 70, 88));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  fill(p, hsl(44, 80, 86), (k) => k.arc(w * p.rr(0.2, 0.8), horizon, u * 0.08, Math.PI, TAU));
  for (let i = 0; i < 6; i++) {
    const cy = horizon * p.rr(0.15, 0.6);
    const cx = p.rr(0, w);
    const cw = u * p.rr(0.2, 0.4);
    fill(p, 'rgba(255,248,236,0.7)', (k) => k.ellipse(cx, cy, cw, cw * 0.12, 0, 0, TAU));
  }
  fill(p, NAVY, (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  ripples(p, horizon, BLUE, 34);
  const dir = p.r() < 0.5 ? 1 : -1;
  const n = Math.max(3, Math.round((w / u) * 2.2));
  const ships = Array.from({ length: n }, (_, i) => ({ x: w * ((i + 0.5) / n + p.rr(-0.06, 0.06)), d: p.r() })).sort((a, b) => a.d - b.d);
  for (const s of ships) tribeShip(p, s.x, horizon + (h - horizon) * (0.1 + s.d * 0.6), u * (0.22 + s.d * 0.2), dir);
}

/** A Water Tribe warship: a dark hull with a curled prow, two blue sails with the moon and wave on them. */
function tribeShip(p: Press, x: number, y: number, s: number, dir: number) {
  const X = (dx: number) => x + dir * dx * s;
  fill(
    p,
    WOOD,
    (k) => {
      k.moveTo(X(-0.5), y - s * 0.1);
      k.quadraticCurveTo(X(0), y + s * 0.06, X(0.46), y - s * 0.1);
      k.quadraticCurveTo(X(0.62), y - s * 0.2, X(0.54), y - s * 0.3);
      k.quadraticCurveTo(X(0.5), y - s * 0.2, X(0.42), y - s * 0.16);
      k.lineTo(X(-0.46), y - s * 0.16);
      k.closePath();
    },
    true,
  );
  for (const [mx, mh] of [
    [-0.18, 0.62],
    [0.16, 0.5],
  ]) {
    line(
      p,
      BLACK,
      Math.max(1.2, s * 0.02),
      (k) => {
        k.moveTo(X(mx), y - s * 0.15);
        k.lineTo(X(mx), y - s * (0.2 + mh));
      },
      true,
    );
    const top = y - s * (0.16 + mh);
    const sw = s * 0.32;
    const sh = s * mh * 0.78;
    const sx = X(mx);
    fill(p, BLUE, (k) => {
      k.moveTo(sx - sw / 2, top);
      k.quadraticCurveTo(sx + dir * sw * 0.15, top + sh * 0.5, sx - sw / 2 + dir * sw * 0.08, top + sh);
      k.lineTo(sx + sw / 2 + dir * sw * 0.08, top + sh);
      k.quadraticCurveTo(sx + sw / 2 + dir * sw * 0.2, top + sh * 0.5, sx + sw / 2, top);
      k.closePath();
    });
    fill(p, SNOW, (k) => k.arc(sx + dir * sw * 0.08, top + sh * 0.38, sw * 0.12, Math.PI * 0.6, Math.PI * 1.6));
    line(p, SNOW, Math.max(1, s * 0.012), (k) => {
      k.moveTo(sx - sw * 0.28 + dir * sw * 0.08, top + sh * 0.66);
      k.quadraticCurveTo(sx + dir * sw * 0.08, top + sh * 0.56, sx + sw * 0.3 + dir * sw * 0.08, top + sh * 0.66);
    });
  }
  line(p, ICE, Math.max(1, s * 0.012), (k) => {
    k.moveTo(X(-0.55), y + s * 0.02);
    k.lineTo(X(-0.8), y + s * 0.04);
  });
}

/** Ice dodging: a small sailboat threading a narrow passage between icebergs. */
export function iceDodging(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const fog = p.r() < 0.35;
  const horizon = h * p.rr(0.42, 0.5);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, fog ? hsl(210, 12, 70) : hsl(206, 50, 58));
  sky.addColorStop(1, fog ? hsl(205, 10, 86) : hsl(198, 40, 84));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  fill(p, hsl(212, 50, 30), (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  ripples(p, horizon, BLUE, 28);
  const lit = p.r() < 0.5 ? -1 : 1;
  // Far bergs, then two big ones crowding the boat from either side.
  for (let i = 0; i < 5; i++) berg(p, p.rr(0, w), horizon + u * 0.01, u * p.rr(0.12, 0.25), u * p.rr(0.05, 0.12), lit, { ...BERG, face: hsl(200, 26, 80) });
  const gap = Math.max(u * 0.22, w * 0.18);
  const mid = w * p.rr(0.42, 0.58);
  for (const side of [-1, 1]) {
    const bw = Math.max(w * 0.5, u * 0.7);
    berg(p, mid + side * (gap / 2 + bw / 2), h * p.rr(0.8, 0.86), bw, h * p.rr(0.45, 0.6), lit, BERG);
  }
  if (fog) {
    const g = c.createLinearGradient(0, horizon - u * 0.1, 0, horizon + u * 0.2);
    g.addColorStop(0, 'rgba(232,236,240,0)');
    g.addColorStop(0.5, 'rgba(232,236,240,0.65)');
    g.addColorStop(1, 'rgba(232,236,240,0)');
    fill(p, g, (k) => k.rect(-4, horizon - u * 0.1, w + 8, u * 0.3));
  }
  sailboat(p, mid, h * p.rr(0.8, 0.86), u * p.rr(0.2, 0.26), p.r() < 0.5 ? 1 : -1);
}

/** A little sailboat with one sail and a figure at the tiller. */
function sailboat(p: Press, x: number, y: number, s: number, dir: number) {
  for (let i = 1; i <= 3; i++)
    line(p, ICE, 1.2, (k) => {
      k.moveTo(x - dir * s * (0.4 + i * 0.12), y + i * s * 0.03);
      k.lineTo(x - dir * s * (0.1 + i * 0.05), y + i * s * 0.03);
    });
  fill(
    p,
    WOOD,
    (k) => {
      k.moveTo(x - s * 0.4, y - s * 0.06);
      k.quadraticCurveTo(x, y + s * 0.1, x + s * 0.4, y - s * 0.08);
      k.lineTo(x + s * 0.34, y - s * 0.12);
      k.lineTo(x - s * 0.36, y - s * 0.1);
      k.closePath();
    },
    true,
  );
  line(
    p,
    BLACK,
    Math.max(1.2, s * 0.02),
    (k) => {
      k.moveTo(x, y - s * 0.1);
      k.lineTo(x, y - s * 0.9);
    },
    true,
  );
  fill(p, SNOW, (k) => {
    k.moveTo(x + dir * s * 0.02, y - s * 0.88);
    k.quadraticCurveTo(x + dir * s * 0.42, y - s * 0.5, x + dir * s * 0.36, y - s * 0.16);
    k.lineTo(x + dir * s * 0.02, y - s * 0.16);
    k.closePath();
  });
  line(p, BLUE, Math.max(1, s * 0.03), (k) => {
    k.moveTo(x + dir * s * 0.03, y - s * 0.3);
    k.lineTo(x + dir * s * 0.33, y - s * 0.3);
  });
  const fx = x - dir * s * 0.24;
  fill(
    p,
    BLACK,
    (k) => {
      k.moveTo(fx - s * 0.05, y - s * 0.1);
      k.quadraticCurveTo(fx - s * 0.05, y - s * 0.28, fx, y - s * 0.3);
      k.quadraticCurveTo(fx + s * 0.05, y - s * 0.28, fx + s * 0.05, y - s * 0.1);
      k.closePath();
      k.moveTo(fx + s * 0.04, y - s * 0.34);
      k.arc(fx, y - s * 0.34, s * 0.04, 0, TAU);
    },
    true,
  );
}

/** The iceberg from the first episode, glowing from inside, with its beam of light and a canoe nearby. */
export function glowingIceberg(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * p.rr(0.55, 0.62);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(228, 46, 14));
  sky.addColorStop(1, hsl(212, 44, 36));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  for (let i = 0; i < 40; i++) {
    const sx = p.rr(0, w);
    const sy = p.rr(0, horizon * 0.8);
    const sr = p.rr(0.6, 1.6);
    fill(p, SNOW, (k) => k.arc(sx, sy, sr, 0, TAU));
  }
  const bx = w * p.rr(0.4, 0.6);
  const bw = Math.min(w * 0.7, u * 0.95);
  const bh = Math.min(h * 0.42, u * 0.6);
  const top = horizon - bh;
  // The beam shooting up into the sky.
  const beam = c.createLinearGradient(0, 0, 0, top);
  beam.addColorStop(0, 'rgba(190,235,255,0)');
  beam.addColorStop(1, 'rgba(190,235,255,0.75)');
  fill(p, beam, (k) => {
    k.moveTo(bx - u * 0.02, top + bh * 0.2);
    k.lineTo(bx - u * 0.05, -4);
    k.lineTo(bx + u * 0.05, -4);
    k.lineTo(bx + u * 0.02, top + bh * 0.2);
    k.closePath();
  });
  fill(p, NAVY, (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  ripples(p, horizon, BLUE, 26);
  berg(p, bx, horizon, bw, bh, -1, { face: hsl(190, 50, 84), shade: hsl(196, 46, 64), foot: hsl(190, 60, 60) });
  const glow = c.createRadialGradient(bx, horizon - bh * 0.4, 0, bx, horizon - bh * 0.4, bh * 0.55);
  glow.addColorStop(0, 'rgba(235,252,255,0.95)');
  glow.addColorStop(0.5, 'rgba(160,225,250,0.45)');
  glow.addColorStop(1, 'rgba(160,225,250,0)');
  fill(p, glow, (k) => k.arc(bx, horizon - bh * 0.4, bh * 0.55, 0, TAU));
  // A boy sitting cross-legged inside the ice, the arrow on his head.
  const fy = horizon - bh * 0.4;
  const fs = bh * 0.2;
  fill(p, hsl(196, 50, 52, 0.8), (k) => {
    k.ellipse(bx, fy + fs * 0.55, fs * 0.75, fs * 0.25, 0, 0, TAU);
    k.moveTo(bx - fs * 0.35, fy + fs * 0.5);
    k.quadraticCurveTo(bx - fs * 0.38, fy - fs * 0.05, bx, fy - fs * 0.1);
    k.quadraticCurveTo(bx + fs * 0.38, fy - fs * 0.05, bx + fs * 0.35, fy + fs * 0.5);
    k.closePath();
    k.moveTo(bx + fs * 0.2, fy - fs * 0.32);
    k.arc(bx, fy - fs * 0.32, fs * 0.2, 0, TAU);
  });
  line(p, hsl(210, 70, 40, 0.8), Math.max(1, fs * 0.06), (k) => {
    k.moveTo(bx, fy - fs * 0.5);
    k.lineTo(bx, fy - fs * 0.22);
    k.moveTo(bx - fs * 0.07, fy - fs * 0.32);
    k.lineTo(bx, fy - fs * 0.22);
    k.lineTo(bx + fs * 0.07, fy - fs * 0.32);
  });
  for (let i = 0; i < 12; i++) {
    const yy = horizon + u * 0.02 + i * u * 0.03;
    const len = bw * p.rr(0.15, 0.4) * (1 - i * 0.05);
    line(p, hsl(190, 60, 70), p.rr(1.2, 2.4), (k) => {
      k.moveTo(bx - len / 2 + p.rr(-6, 6), yy);
      k.lineTo(bx + len / 2 + p.rr(-6, 6), yy);
    });
  }
  const side = p.r() < 0.5 ? -1 : 1;
  canoe(p, bx + side * (bw * 0.5 + u * 0.12), horizon + (h - horizon) * 0.5, u * 0.22, -side);
}

/** Icebergs drifting at sundown, warm light on their faces and the sun on the water. */
export function icebergsAtDusk(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * p.rr(0.5, 0.58);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(250, 30, 30));
  sky.addColorStop(0.45, hsl(330, 36, 56));
  sky.addColorStop(0.8, hsl(22, 70, 66));
  sky.addColorStop(1, hsl(38, 80, 76));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  const sx = w * p.rr(0.25, 0.75);
  fill(p, hsl(30, 90, 70), (k) => k.arc(sx, horizon, u * 0.1, Math.PI, TAU));
  fill(p, hsl(255, 30, 22), (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  for (let i = 0; i < 16; i++) {
    const yy = horizon + u * 0.015 + i * u * 0.03;
    const len = u * p.rr(0.08, 0.25) * (1 - i * 0.04);
    line(p, hsl(28, 85, 64), p.rr(1.2, 2.6), (k) => {
      k.moveTo(sx - len / 2 + p.rr(-8, 8), yy);
      k.lineTo(sx + len / 2 + p.rr(-8, 8), yy);
    });
  }
  ripples(p, horizon, hsl(260, 26, 34), 22);
  const lit = sx < w / 2 ? -1 : 1;
  const warm: BergTone = { face: hsl(22, 55, 80), shade: hsl(262, 26, 48), foot: hsl(262, 30, 36) };
  const n = Math.max(2, Math.round((w / u) * 1.6));
  for (let i = 0; i < n; i++) {
    const d = p.r();
    berg(p, w * ((i + 0.5) / n + p.rr(-0.08, 0.08)), horizon + (h - horizon) * (0.05 + d * 0.5), u * (0.25 + d * 0.35), u * (0.12 + d * 0.25), lit, warm);
  }
  if (p.r() < 0.5) moon(p, w - sx, horizon * 0.3, u * 0.035);
}
