import { hsl } from '../common';
import { type Trace, TAU, BLACK, NAVY, BLUE, ICE, SNOW, SKY, type Press, fill, line, within } from './print';
import { CITY_NEAR, GRASS, GRASS_LIGHT, WALL, arch, aurora, crest, koi, moon, tower, tuft } from './water-motifs';

/** Spirits of the poles: the oasis garden, the Ocean Spirit's wrath, the southern portal and its festival. */

const LEAF = hsl(150, 34, 34);
const LEAF_LIGHT = hsl(140, 32, 48);
const LANTERN = hsl(40, 85, 64);

/** The Spirit Oasis seen through its gateway: a warm green garden held inside walls of ice. */
export function oasisGarden(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const sky = c.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, hsl(222, 48, 14));
  sky.addColorStop(1, hsl(212, 44, 32));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, h + 8));
  moon(p, w * p.rr(0.3, 0.7), h * 0.16, u * 0.08);
  const ground = h * 0.52;
  // Ice walls closing the garden in at both sides and behind.
  fill(p, CITY_NEAR.face, (k) => k.rect(-4, ground - h * 0.2, w + 8, h * 0.22));
  for (let x = -u * 0.05; x < w; x += u * 0.07) crest(p, x, ground - h * 0.2, u * 0.07, WALL);
  // Grass, round trees and a little pond with its two koi.
  fill(p, GRASS, (k) => k.rect(-4, ground, w + 8, h - ground + 4));
  for (let i = 0; i < 90 * p.detail; i++) {
    const gx = p.rr(0, w);
    const gy = p.rr(ground + 4, h);
    tuft(p, gx, gy, -Math.PI / 2, u * p.rr(0.03, 0.06) * (0.5 + (gy - ground) / (h - ground)), p.r() < 0.5 ? GRASS_LIGHT : LEAF_LIGHT);
  }
  const trees = Math.max(3, Math.round((w / u) * 2.5));
  for (let i = 0; i < trees; i++) {
    const tx = w * ((i + 0.5) / trees + p.rr(-0.05, 0.05));
    if (Math.abs(tx - w / 2) < u * 0.25) continue;
    const ty = ground + h * p.rr(0.02, 0.08);
    const tr = u * p.rr(0.08, 0.13);
    fill(p, hsl(24, 30, 22), (k) => k.rect(tx - tr * 0.08, ty - tr * 0.6, tr * 0.16, tr * 0.7));
    for (const [dx, dy, s] of [
      [0, -1.1, 1],
      [-0.5, -0.8, 0.7],
      [0.5, -0.8, 0.7],
    ])
      fill(p, dy < -1 ? LEAF : LEAF_LIGHT, (k) => k.arc(tx + dx * tr, ty + dy * tr, tr * s * 0.7, 0, TAU));
  }
  const px = w / 2;
  const py = ground + (h - ground) * 0.45;
  const pr = Math.min(u * 0.22, w * 0.3);
  fill(p, BLUE, (k) => k.ellipse(px, py, pr, pr * 0.42, 0, 0, TAU));
  line(p, NAVY, u * 0.012, (k) => k.ellipse(px, py, pr, pr * 0.42, 0, 0, TAU));
  // The koi, small and seen from above, squashed into the pond's ellipse.
  const ctx = p.c;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(1, 0.42);
  ctx.translate(-px, -py);
  const a0 = p.rr(0, TAU);
  koi(p, px, py, pr * 0.42, a0, SNOW, BLACK);
  koi(p, px, py, pr * 0.42, a0 + Math.PI, BLACK, SNOW);
  ctx.restore();
  // The gateway framing the view: dark ice pillars and a lintel.
  const gw = w * 0.08;
  fill(p, hsl(210, 34, 40), (k) => {
    k.rect(-4, -4, gw, h + 8);
    k.rect(w - gw, -4, gw + 4, h + 8);
  });
  fill(p, hsl(210, 34, 34), (k) => k.rect(-4, -4, w + 8, h * 0.05));
  for (const x of [gw, w - gw]) line(p, ICE, Math.max(1.2, u * 0.008), (k) => {
    k.moveTo(x, h * 0.05);
    k.lineTo(x, h + 4);
  });
}

/** The Ocean Spirit rising from the sea as a giant koi of water, glowing, over the burning fleet. */
export function oceanSpirit(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const sea = h * 0.8;
  const sky = c.createLinearGradient(0, 0, 0, sea);
  sky.addColorStop(0, hsl(225, 46, 10));
  sky.addColorStop(1, hsl(212, 44, 28));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, sea + 4));
  const cx = w * p.rr(0.45, 0.55);
  const top = h * 0.1;
  const bw = Math.min(w * 0.42, u * 0.55);
  const glow = c.createRadialGradient(cx, h * 0.45, 0, cx, h * 0.45, Math.max(w, h) * 0.6);
  glow.addColorStop(0, 'rgba(160,220,255,0.45)');
  glow.addColorStop(1, 'rgba(160,220,255,0)');
  fill(p, glow, (k) => k.rect(-4, -4, w + 8, sea + 4));
  // The koi's body, rising out of the sea with its tail flowing back into it.
  const body: Trace = (k) => {
    k.moveTo(cx - bw * 0.55, sea + 2);
    k.bezierCurveTo(cx - bw * 0.7, h * 0.55, cx - bw * 0.55, top + bw * 0.4, cx, top);
    k.bezierCurveTo(cx + bw * 0.55, top + bw * 0.4, cx + bw * 0.7, h * 0.55, cx + bw * 0.55, sea + 2);
    k.closePath();
  };
  fill(p, hsl(205, 60, 52), body);
  within(p, body, () => {
    for (let i = 0; i < 9; i++) {
      const y = top + (sea - top) * (0.15 + i * 0.1);
      line(p, hsl(200, 70, 72), Math.max(1.2, u * 0.008), (k) => {
        k.moveTo(cx - bw, y + u * 0.06);
        k.quadraticCurveTo(cx, y - u * 0.05, cx + bw, y + u * 0.06);
      });
    }
    for (let i = 0; i < 30; i++) {
      const sx = cx + p.rr(-0.6, 0.6) * bw;
      const sy = p.rr(top + bw * 0.6, sea);
      line(p, hsl(198, 60, 66), Math.max(1, u * 0.005), (k) => k.arc(sx, sy, u * 0.025, Math.PI * 1.1, Math.PI * 1.9));
    }
  });
  // Fins sweeping out, and the face.
  for (const sgn of [-1, 1])
    fill(p, hsl(205, 60, 46), (k) => {
      k.moveTo(cx + sgn * bw * 0.45, top + bw * 0.9);
      k.quadraticCurveTo(cx + sgn * bw * 1.2, top + bw * 0.8, cx + sgn * bw * 1.05, top + bw * 1.5);
      k.quadraticCurveTo(cx + sgn * bw * 0.8, top + bw * 1.2, cx + sgn * bw * 0.5, top + bw * 1.25);
      k.closePath();
    });
  for (const sgn of [-1, 1]) {
    fill(p, SNOW, (k) => k.ellipse(cx + sgn * bw * 0.2, top + bw * 0.3, bw * 0.07, bw * 0.05, sgn * 0.3, 0, TAU), true);
    line(p, SKY, Math.max(1.2, u * 0.006), (k) => {
      k.moveTo(cx + sgn * bw * 0.08, top + bw * 0.5);
      k.quadraticCurveTo(cx + sgn * bw * 0.35, top + bw * 0.6, cx + sgn * bw * 0.55, top + bw * 0.85);
    });
  }
  // The Avatar glowing at its heart.
  const fy = top + (sea - top) * 0.45;
  const fg = c.createRadialGradient(cx, fy, 0, cx, fy, bw * 0.2);
  fg.addColorStop(0, 'rgba(255,255,255,0.95)');
  fg.addColorStop(1, 'rgba(200,240,255,0)');
  fill(p, fg, (k) => k.arc(cx, fy, bw * 0.2, 0, TAU));
  fill(p, SNOW, (k) => {
    k.moveTo(cx + bw * 0.03, fy - bw * 0.06);
    k.arc(cx, fy - bw * 0.06, bw * 0.03, 0, TAU);
    k.moveTo(cx - bw * 0.04, fy + bw * 0.08);
    k.quadraticCurveTo(cx, fy - bw * 0.04, cx + bw * 0.04, fy + bw * 0.08);
    k.closePath();
  });
  // The sea, churned white where the spirit rises, with Fire Navy hulls burning below.
  fill(p, NAVY, (k) => k.rect(-4, sea, w + 8, h - sea + 4));
  for (let i = 0; i < 40; i++) {
    const fx = cx + p.rr(-1.1, 1.1) * bw;
    const fy2 = sea + p.rr(-0.01, 0.04) * h;
    const r = u * p.rr(0.01, 0.03);
    fill(p, SNOW, (k) => k.arc(fx, fy2, r, 0, TAU));
  }
  for (const sgn of [-1, 1]) {
    const sx = cx + sgn * (bw * 0.9 + w * 0.12);
    const sy = sea + (h - sea) * 0.5;
    fill(
      p,
      hsl(222, 10, 17),
      (k) => {
        k.moveTo(sx - u * 0.12, sy - u * 0.02);
        k.lineTo(sx + u * 0.12, sy - u * 0.02);
        k.lineTo(sx + u * 0.08, sy + u * 0.02);
        k.lineTo(sx - u * 0.1, sy + u * 0.02);
        k.closePath();
      },
      true,
    );
    fill(p, hsl(22, 85, 56), (k) => k.ellipse(sx, sy - u * 0.04, u * 0.04, u * 0.03, 0, 0, TAU));
  }
}

/** The southern spirit portal: a column of light out of a ring in the ice, spirits drifting round it. */
export function spiritPortal(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const ground = h * 0.74;
  const sky = c.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, hsl(230, 46, 12));
  sky.addColorStop(1, hsl(212, 44, 30));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, ground + 4));
  aurora(p, ground);
  fill(p, SNOW, (k) => k.rect(-4, ground, w + 8, h - ground + 4));
  const cx = w * p.rr(0.44, 0.56);
  const rw = Math.min(w * 0.42, u * 0.5);
  // Ice cliffs either side.
  for (const sgn of [-1, 1])
    fill(p, hsl(204, 32, 70), (k) => {
      const x0 = sgn < 0 ? -4 : w + 4;
      k.moveTo(x0, ground + 2);
      k.lineTo(x0, ground - h * p.rr(0.25, 0.4));
      k.lineTo(cx + sgn * rw * p.rr(0.9, 1.3), ground - h * p.rr(0.05, 0.15));
      k.lineTo(cx + sgn * rw * 0.7, ground + 2);
      k.closePath();
    });
  // The column of light, its swirl cut into it.
  const beam = c.createLinearGradient(cx - rw * 0.3, 0, cx + rw * 0.3, 0);
  beam.addColorStop(0, 'rgba(150,240,230,0.25)');
  beam.addColorStop(0.5, 'rgba(235,255,250,0.95)');
  beam.addColorStop(1, 'rgba(150,240,230,0.25)');
  fill(p, beam, (k) => {
    k.moveTo(cx - rw * 0.32, ground);
    k.lineTo(cx - rw * 0.2, -4);
    k.lineTo(cx + rw * 0.2, -4);
    k.lineTo(cx + rw * 0.32, ground);
    k.closePath();
  });
  for (let i = 0; i < 8; i++) {
    const y = ground - (ground / 8) * (i + 0.5);
    line(p, hsl(172, 60, 62), Math.max(1.2, u * 0.008), (k) => k.ellipse(cx, y, rw * (0.3 - (i / 8) * 0.08), u * 0.025, 0, Math.PI * 0.1, Math.PI * 1.1));
  }
  // The ring in the ice, and spirits drifting up round the light.
  fill(p, hsl(180, 40, 60), (k) => k.ellipse(cx, ground + u * 0.02, rw * 0.5, rw * 0.12, 0, 0, TAU));
  fill(p, SNOW, (k) => k.ellipse(cx, ground + u * 0.02, rw * 0.38, rw * 0.08, 0, 0, TAU));
  for (let i = 0; i < 9; i++) {
    const sx = cx + p.rr(-1.6, 1.6) * rw * 0.5;
    const sy = p.rr(h * 0.08, ground - u * 0.05);
    const s = u * p.rr(0.02, 0.045);
    fill(p, hsl(p.pick([170, 190, 280]), 55, 72, 0.85), (k) => {
      k.ellipse(sx, sy, s, s * 1.3, 0, 0, TAU);
      k.moveTo(sx - s, sy + s);
      k.quadraticCurveTo(sx, sy + s * 3, sx + s * 0.6, sy + s * 2.6);
    });
    fill(p, NAVY, (k) => {
      k.arc(sx - s * 0.35, sy - s * 0.2, s * 0.15, 0, TAU);
      k.moveTo(sx + s * 0.5, sy - s * 0.2);
      k.arc(sx + s * 0.35, sy - s * 0.2, s * 0.15, 0, TAU);
    });
  }
}

/** The Glacier Spirits Festival: stalls and lanterns on the ice under the southern capital at night. */
export function festival(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const ground = h * 0.62;
  const sky = c.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, hsl(228, 46, 12));
  sky.addColorStop(1, hsl(214, 44, 28));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, ground + 4));
  aurora(p, ground * 0.8);
  // The capital behind: a row of ice towers.
  let x = -u * 0.04;
  while (x < w) {
    const bw = u * p.rr(0.06, 0.1);
    tower(p, x, ground - u * p.rr(0.12, 0.3), bw, ground + 2, CITY_NEAR, p.r() < 0.5 ? -1 : 1);
    x += bw * p.rr(0.8, 1.1);
  }
  fill(p, SNOW, (k) => k.rect(-4, ground, w + 8, h - ground + 4));
  // Strings of lanterns swagging across.
  for (let s = 0; s < 2; s++) {
    const y0 = ground - u * (0.1 + s * 0.08);
    const sag = u * 0.06;
    const n = Math.round(w / (u * 0.07));
    line(p, BLACK, 1.1, (k) => {
      k.moveTo(-4, y0);
      k.quadraticCurveTo(w / 2, y0 + sag * 2, w + 4, y0);
    }, true);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const lx = t * w;
      const ly = y0 + sag * 4 * t * (1 - t) + u * 0.012;
      const lr = u * 0.014;
      const gl = c.createRadialGradient(lx, ly, 0, lx, ly, lr * 4);
      gl.addColorStop(0, 'rgba(255,215,130,0.5)');
      gl.addColorStop(1, 'rgba(255,215,130,0)');
      fill(p, gl, (k) => k.arc(lx, ly, lr * 4, 0, TAU));
      fill(p, i % 3 ? LANTERN : hsl(200, 60, 62), (k) => k.ellipse(lx, ly, lr, lr * 1.25, 0, 0, TAU));
    }
  }
  // Stalls along the front, each with a striped awning and a lit counter.
  const n = Math.max(3, Math.round((w / u) * 2.2));
  for (let i = 0; i < n; i++) {
    const sx = w * ((i + 0.5) / n);
    const sw = (w / n) * 0.78;
    const sy = ground + (h - ground) * p.rr(0.28, 0.42);
    const sh = u * 0.16;
    fill(p, HUT_HIDE, (k) => k.rect(sx - sw / 2, sy - sh, sw, sh));
    arch(p, sx, sy - sh * 0.35, sw * 0.6, sh * 0.6, hsl(36, 70, 58));
    const aw: Trace = (k) => {
      k.moveTo(sx - sw * 0.6, sy - sh);
      k.lineTo(sx - sw * 0.45, sy - sh * 1.35);
      k.lineTo(sx + sw * 0.45, sy - sh * 1.35);
      k.lineTo(sx + sw * 0.6, sy - sh);
      k.closePath();
    };
    fill(p, BLUE, aw);
    within(p, aw, () => {
      for (let j = 0; j < 6; j++) fill(p, SNOW, (k) => k.rect(sx - sw * 0.6 + j * sw * 0.24, sy - sh * 1.4, sw * 0.12, sh * 0.5));
    });
  }
  // A few figures in parkas wandering between the stalls.
  for (let i = 0; i < Math.round(n * 1.5); i++) {
    const fx = p.rr(0.05, 0.95) * w;
    const fy = ground + (h - ground) * p.rr(0.6, 0.85);
    const fs = u * p.rr(0.06, 0.08);
    fill(
      p,
      NAVY,
      (k) => {
        k.moveTo(fx - fs * 0.25, fy);
        k.quadraticCurveTo(fx - fs * 0.3, fy - fs * 0.7, fx, fy - fs * 0.8);
        k.quadraticCurveTo(fx + fs * 0.3, fy - fs * 0.7, fx + fs * 0.25, fy);
        k.closePath();
        k.moveTo(fx + fs * 0.16, fy - fs * 0.95);
        k.arc(fx, fy - fs * 0.95, fs * 0.16, 0, TAU);
      },
      true,
    );
    line(p, ICE, Math.max(1, fs * 0.06), (k) => k.arc(fx, fy - fs * 0.95, fs * 0.17, Math.PI * 0.9, Math.PI * 2.1));
  }
}

const HUT_HIDE = hsl(32, 32, 50);
