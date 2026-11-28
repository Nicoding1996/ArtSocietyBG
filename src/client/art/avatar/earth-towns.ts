import { hsl, type HSL } from '../common';
import { type Trace, TAU, type Press, fill, fireMark, line, within } from './print';
import { CINNABAR, GOLD, INK, JADE, MALACHITE, STONE, TILE, hall, house, mist, pine, range, roofShape, silkInk, stoneWall, tone, tree } from './ink';

/** Earth Kingdom towns and people's places: the cabbage cart, the drill at the wall, Earth Rumble, the Beifong estate. */

const WOOD: HSL = [26, 40, 34];
const DUST: HSL = [34, 34, 62];
const LAKE: HSL = [192, 24, 52];

/** A cabbage: a pale round head in dark outer leaves, with veins. */
function cabbage(p: Press, x: number, y: number, r: number) {
  fill(p, hsl(84, 36, 68), (k) => k.arc(x, y, r, 0, TAU));
  fill(p, hsl(100, 32, 44), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r, y);
      k.quadraticCurveTo(x + m * r * 1.1, y + r * 0.95, x, y + r);
      k.quadraticCurveTo(x + m * r * 0.45, y + r * 0.2, x + m * r * 0.2, y - r * 0.6);
      k.quadraticCurveTo(x + m * r * 0.8, y - r * 0.55, x + m * r, y);
      k.closePath();
    }
  });
  line(p, INK(0.45), Math.max(0.8, r * 0.06), (k) => {
    for (const m of [-1, 0, 1]) {
      k.moveTo(x, y + r * 0.85);
      k.quadraticCurveTo(x + m * r * 0.2, y, x + m * r * 0.55, y - r * 0.55);
    }
  });
  line(p, INK(0.65), Math.max(0.8, r * 0.05), (k) => k.arc(x, y, r, 0, TAU));
}

/** My cabbages: the merchant's cart on the market road under its awning, piled high, a few heads loose in the dust. */
export function cabbages(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const road = h * 0.66;
  // The street behind: houses, a tree, the hills in mist.
  range(p, h * 0.42, h * 0.16, -10, w + 10, [196, 24, 56], 0.3);
  mist(p, h * 0.42, h * 0.08);
  const n = Math.max(2, Math.round((w / u) * 2));
  for (let i = 0; i < n; i++) house(p, (w * (i + 0.5)) / n + p.rr(-0.1, 0.1) * u, road, u * p.rr(0.36, 0.46));
  tree(p, w * p.rr(0.1, 0.9), road, u * 0.35);
  const g = c.createLinearGradient(0, road, 0, h);
  g.addColorStop(0, tone(DUST, 0.75, 8));
  g.addColorStop(1, tone(DUST, 0.95, -6));
  fill(p, g, (k) => k.rect(-4, road, w + 8, h - road + 4));
  line(p, INK(0.25), 1.2, (k) => {
    for (let i = 0; i < 40 * p.detail; i++) {
      const x = p.rr(-10, w);
      const y = p.rr(road + 4, h);
      k.moveTo(x, y);
      k.lineTo(x + u * p.rr(0.03, 0.1), y + p.rr(-1, 1));
    }
  });
  // The cart: a bed of planks on one big wheel, its shafts resting on the road, an awning on two poles.
  const d = p.r() < 0.5 ? 1 : -1;
  const s = Math.min(u * 0.95, w * 0.62);
  const cx = w / 2 - d * s * 0.05;
  const wy = road + (h - road) * 0.42;
  const r = s * 0.17;
  const bedTop = wy - r * 1.05;
  const X = (t: number) => cx + d * t * s;
  const bed: Trace = (k) => {
    k.moveTo(X(-0.34), bedTop);
    k.lineTo(X(0.26), bedTop);
    k.lineTo(X(0.24), bedTop + s * 0.08);
    k.lineTo(X(-0.32), bedTop + s * 0.08);
    k.closePath();
  };
  // The awning behind the load.
  line(p, tone(WOOD, 1, -8), Math.max(1.5, s * 0.012), (k) => {
    k.moveTo(X(-0.3), bedTop);
    k.lineTo(X(-0.3), bedTop - s * 0.42);
    k.moveTo(X(0.22), bedTop);
    k.lineTo(X(0.22), bedTop - s * 0.42);
  });
  const awning: Trace = (k) => {
    k.moveTo(X(-0.38), bedTop - s * 0.36);
    k.quadraticCurveTo(X(-0.04), bedTop - s * 0.5, X(0.3), bedTop - s * 0.38);
    k.lineTo(X(0.27), bedTop - s * 0.46);
    k.quadraticCurveTo(X(-0.04), bedTop - s * 0.58, X(-0.35), bedTop - s * 0.46);
    k.closePath();
  };
  fill(p, hsl(44, 40, 82), awning);
  within(p, awning, () =>
    line(p, tone(MALACHITE, 0.8), s * 0.03, (k) => {
      for (let t = -0.34; t < 0.3; t += 0.09) {
        k.moveTo(X(t), bedTop - s * 0.6);
        k.lineTo(X(t), bedTop - s * 0.3);
      }
    }),
  );
  line(p, INK(0.6), 1.2, awning);
  // The load: rows of cabbages heaped above the bed.
  const rows = [7, 6, 4, 2];
  const cr = s * 0.045;
  rows.forEach((count, row) => {
    const y = bedTop - cr * 0.6 - row * cr * 1.45;
    for (let i = 0; i < count; i++) {
      const t = -0.3 + ((i + 0.5 + (7 - count) / 2) / 7) * 0.54;
      cabbage(p, X(t) + p.rr(-0.2, 0.2) * cr, y + p.rr(-0.15, 0.15) * cr, cr * p.rr(0.9, 1.1));
    }
  });
  fill(p, tone(WOOD), bed);
  line(p, INK(0.55), 1, (k) => {
    k.moveTo(X(-0.33), bedTop + s * 0.04);
    k.lineTo(X(0.25), bedTop + s * 0.04);
  });
  line(p, INK(0.7), 1.2, bed);
  // Shafts down to the road, a prop at the back, and the wheel.
  line(p, tone(WOOD, 1, -6), Math.max(2, s * 0.018), (k) => {
    k.moveTo(X(0.2), bedTop + s * 0.05);
    k.lineTo(X(0.55), road + (h - road) * 0.75);
    k.moveTo(X(-0.3), bedTop + s * 0.08);
    k.lineTo(X(-0.31), wy + r * 0.9);
  });
  const wx = X(-0.04);
  fill(p, tone(WOOD, 0.5, 10), (k) => k.arc(wx, wy, r, 0, TAU));
  line(p, tone(WOOD, 1, -10), Math.max(2, r * 0.12), (k) => k.arc(wx, wy, r * 0.94, 0, TAU));
  line(p, tone(WOOD, 1, -6), Math.max(1, r * 0.05), (k) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      k.moveTo(wx, wy);
      k.lineTo(wx + Math.cos(a) * r * 0.9, wy + Math.sin(a) * r * 0.9);
    }
  });
  fill(p, INK(0.8), (k) => k.arc(wx, wy, r * 0.12, 0, TAU));
  // Heads that rolled off.
  const loose = p.ri(3, 5);
  for (let i = 0; i < loose; i++) cabbage(p, X(p.rr(0.3, 0.75)) + p.rr(-0.1, 0.1) * u, road + (h - road) * p.rr(0.6, 0.92), cr * p.rr(0.9, 1.2));
}

/** The Fire Nation's drill against the outer wall of Ba Sing Se, dust thick where its point bites the stone. */
export function drill(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const wallLeft = p.r() < 0.5;
  const d = wallLeft ? -1 : 1;
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, silkInk(0));
  sky.addColorStop(1, tone(DUST, 0.5));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, h + 8));
  range(p, h * 0.62, h * 0.4, -10, w + 10, [30, 16, 56], 0.3);
  mist(p, h * 0.62, h * 0.06);
  const ground = h * 0.84;
  fill(p, tone(DUST, 0.8, -6), (k) => k.rect(-4, ground, w + 8, h - ground + 4));
  // The wall: a slab of stone too tall to see the top of, its battlements high up.
  const face = wallLeft ? w * 0.18 : w * 0.82;
  stoneWall(p, wallLeft ? -4 : face, wallLeft ? face : w + 4, h * 0.08, ground - h * 0.08);
  // The machine: a long iron body on tracks, its point a cone with a spiral thread.
  const R = h * 0.17;
  const cy = h * 0.5;
  const tip = face - d * u * 0.01;
  const bit = R * 2.2;
  const front = tip - d * bit;
  const L = Math.min(w * 0.62, h * 2);
  const back = front - d * L;
  const x0 = Math.min(front, back);
  const x1 = Math.max(front, back);
  const iron = c.createLinearGradient(0, cy - R, 0, cy + R);
  iron.addColorStop(0, hsl(20, 6, 48));
  iron.addColorStop(0.45, hsl(20, 6, 34));
  iron.addColorStop(1, hsl(20, 8, 16));
  // Tracks first, under the body.
  const tr: Trace = (k) => {
    k.moveTo(x0 + L * 0.08, ground);
    k.lineTo(x1 - L * 0.08, ground);
    k.arc(x1 - L * 0.08, ground - R * 0.35, R * 0.35, Math.PI / 2, -Math.PI / 2, true);
    k.lineTo(x0 + L * 0.08, ground - R * 0.7);
    k.arc(x0 + L * 0.08, ground - R * 0.35, R * 0.35, -Math.PI / 2, Math.PI / 2, true);
    k.closePath();
  };
  fill(p, hsl(20, 8, 20), tr);
  fill(p, hsl(20, 6, 40), (k) => {
    for (let x = x0 + L * 0.1; x < x1 - L * 0.06; x += R * 0.5) {
      k.moveTo(x + R * 0.18, ground - R * 0.35);
      k.arc(x, ground - R * 0.35, R * 0.18, 0, TAU);
    }
  });
  line(p, hsl(20, 8, 26), Math.max(2, R * 0.12), (k) => {
    k.moveTo(x0 + L * 0.3, ground - R * 0.6);
    k.lineTo(x0 + L * 0.3, cy + R * 0.8);
    k.moveTo(x1 - L * 0.3, ground - R * 0.6);
    k.lineTo(x1 - L * 0.3, cy + R * 0.8);
  });
  const body: Trace = (k) => {
    k.moveTo(x0 + R * 0.4, cy - R);
    k.lineTo(x1 - R * 0.4, cy - R);
    k.quadraticCurveTo(x1, cy - R, x1, cy);
    k.quadraticCurveTo(x1, cy + R, x1 - R * 0.4, cy + R);
    k.lineTo(x0 + R * 0.4, cy + R);
    k.quadraticCurveTo(x0, cy + R, x0, cy);
    k.quadraticCurveTo(x0, cy - R, x0 + R * 0.4, cy - R);
    k.closePath();
  };
  fill(p, iron, body);
  line(p, INK(0.5), Math.max(1, R * 0.03), (k) => {
    for (let x = x0 + L * 0.12; x < x1 - L * 0.05; x += L * 0.14) {
      k.moveTo(x, cy - R);
      k.quadraticCurveTo(x + R * 0.12, cy, x, cy + R);
    }
  });
  line(p, INK(0.75), Math.max(1.2, R * 0.03), body);
  // Smokestacks, and the Fire Nation's flame on a plate.
  for (const t of [0.25, 0.4]) {
    const sx = back + d * L * t;
    fill(p, hsl(20, 8, 22), (k) => k.rect(sx - R * 0.1, cy - R * 1.5, R * 0.2, R * 0.55));
    for (let i = 0; i < 4; i++) {
      const px = sx - d * i * R * 0.3;
      const py = cy - R * 1.6 - i * R * 0.35;
      const pr = R * (0.2 + i * 0.12);
      const g = c.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, INK(0.4 - i * 0.07));
      g.addColorStop(1, INK(0));
      fill(p, g, (k) => k.arc(px, py, pr, 0, TAU));
    }
  }
  const ex = back + d * L * 0.62;
  fill(p, INK(0.85), (k) => k.arc(ex, cy - R * 0.1, R * 0.36, 0, TAU));
  fireMark(p, ex, cy - R * 0.06, R * 0.28);
  // The bit.
  const cone: Trace = (k) => {
    k.moveTo(front, cy - R * 0.9);
    k.lineTo(tip, cy);
    k.lineTo(front, cy + R * 0.9);
    k.closePath();
  };
  fill(p, iron, cone);
  within(p, cone, () =>
    line(p, INK(0.6), Math.max(1, R * 0.04), (k) => {
      for (let i = 0; i < 7; i++) {
        const x = front + d * (bit * i) / 7;
        k.moveTo(x, cy - R);
        k.lineTo(x + d * bit * 0.2, cy + R);
      }
    }),
  );
  line(p, INK(0.75), Math.max(1.2, R * 0.03), cone);
  // Cracks in the wall around the point, and dust and stone bursting from it.
  line(p, INK(0.75), Math.max(1, u * 0.005), (k) => {
    for (let i = 0; i < 6; i++) {
      let x = face;
      let y = cy;
      const a = p.rr(-1.3, 1.3);
      k.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += d * Math.cos(a + p.rr(-0.4, 0.4)) * u * 0.05;
        y += Math.sin(a + p.rr(-0.4, 0.4)) * u * 0.06;
        k.lineTo(x, y);
      }
    }
  });
  for (let i = 0; i < 9; i++) {
    const px = face - d * p.rr(0, 0.25) * u;
    const py = cy + p.rr(-0.3, 0.5) * R * 2;
    const pr = u * p.rr(0.06, 0.14);
    const g = c.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, tone(DUST, 0.6, 6));
    g.addColorStop(1, tone(DUST, 0, 6));
    fill(p, g, (k) => k.arc(px, py, pr, 0, TAU));
  }
  fill(p, tone(STONE, 1, -16), (k) => {
    for (let i = 0; i < 10; i++) {
      const rx = face - d * p.rr(0.02, 0.3) * u;
      const ry = cy + p.rr(-0.4, 0.6) * R * 2;
      const rs = u * p.rr(0.006, 0.016);
      k.moveTo(rx + rs, ry);
      k.arc(rx, ry, rs, 0, TAU);
    }
  });
  mist(p, ground, h * 0.04, 0.6);
}

/** The Earth Rumble ring at night: a raised stone stage under strings of lanterns, rocks hanging in the air over it. */
export function earthRumble(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  fill(p, INK(0.8), (k) => k.rect(-4, -4, w + 8, h + 8));
  const cx = w / 2;
  const sy = h * 0.72;
  const glow = c.createRadialGradient(cx, sy - h * 0.1, 0, cx, sy - h * 0.1, Math.max(w, h) * 0.55);
  glow.addColorStop(0, 'rgba(255,214,140,0.55)');
  glow.addColorStop(1, 'rgba(255,214,140,0)');
  fill(p, glow, (k) => k.rect(-4, -4, w + 8, h + 8));
  // The stands: dark tiers curving round behind the ring.
  for (let i = 0; i < 4; i++) {
    const ty = h * (0.5 - i * 0.09);
    line(p, INK(0.55 + i * 0.08), h * 0.05, (k) => {
      k.moveTo(-10, ty + h * 0.08);
      k.quadraticCurveTo(cx, ty - h * 0.04, w + 10, ty + h * 0.08);
    });
    line(p, 'rgba(255,214,140,0.25)', 1, (k) => {
      k.moveTo(-10, ty + h * 0.055);
      k.quadraticCurveTo(cx, ty - h * 0.065, w + 10, ty + h * 0.055);
    });
  }
  // Strings of lanterns.
  for (let i = 0; i < 2; i++) {
    const y0 = h * (0.08 + i * 0.12);
    const sag = h * 0.1;
    line(p, INK(0.7), 1, (k) => {
      k.moveTo(-10, y0);
      k.quadraticCurveTo(cx, y0 + sag * 2, w + 10, y0);
    });
    const n = Math.max(5, Math.round((w / u) * 6));
    for (let j = 1; j < n; j++) {
      const t = j / n;
      const lx = bez2(t, -10, cx, w + 10);
      const ly = bez2(t, y0, y0 + sag * 2, y0) + u * 0.03;
      const lr = u * 0.022;
      const lg = c.createRadialGradient(lx, ly, 0, lx, ly, lr * 3);
      lg.addColorStop(0, 'rgba(255,170,80,0.5)');
      lg.addColorStop(1, 'rgba(255,170,80,0)');
      fill(p, lg, (k) => k.arc(lx, ly, lr * 3, 0, TAU));
      fill(p, j % 2 ? CINNABAR : hsl(36, 80, 56), (k) => k.ellipse(lx, ly, lr, lr * 1.3, 0, 0, TAU));
    }
  }
  // The stage: its lit top in perspective, its front face, cracks and broken stone.
  const sw = Math.min(w * 0.42, u * 0.7);
  const sd = h * 0.16;
  const sh = h * 0.1;
  const top: Trace = (k) => {
    k.moveTo(cx - sw, sy);
    k.lineTo(cx + sw, sy);
    k.lineTo(cx + sw * 0.72, sy - sd);
    k.lineTo(cx - sw * 0.72, sy - sd);
    k.closePath();
  };
  fill(p, tone(STONE, 1, 10), top);
  fill(p, tone(STONE, 1, -18), (k) => k.rect(cx - sw, sy, sw * 2, sh));
  line(p, INK(0.6), Math.max(1, u * 0.004), (k) => {
    for (let i = 0; i < 5; i++) {
      let x = cx + p.rr(-0.6, 0.6) * sw;
      let y = sy - p.rr(0.1, 0.9) * sd;
      k.moveTo(x, y);
      for (let j = 0; j < 3; j++) {
        x += p.rr(-0.1, 0.1) * sw;
        y += p.rr(-0.2, 0.2) * sd;
        k.lineTo(x, y);
      }
    }
    for (let x = cx - sw; x < cx + sw; x += sw * 0.25) {
      k.moveTo(x, sy);
      k.lineTo(x, sy + sh);
    }
  });
  line(p, INK(0.75), 1.4, top);
  // Banners on poles at the front corners.
  for (const m of [-1, 1]) {
    const bx = cx + m * sw * 1.08;
    line(p, INK(0.85), Math.max(1.5, u * 0.008), (k) => {
      k.moveTo(bx, sy + sh);
      k.lineTo(bx, sy - h * 0.48);
    });
    const banner: Trace = (k) => {
      k.moveTo(bx - m * u * 0.005, sy - h * 0.46);
      k.lineTo(bx - m * u * 0.1, sy - h * 0.46);
      k.lineTo(bx - m * u * 0.1, sy - h * 0.2);
      k.lineTo(bx - m * u * 0.055, sy - h * 0.24);
      k.lineTo(bx - m * u * 0.005, sy - h * 0.2);
      k.closePath();
    };
    fill(p, tone(JADE, 1, 6), banner);
    line(p, GOLD, Math.max(1, u * 0.006), (k) => {
      const ex = bx - m * u * 0.0525;
      const ey = sy - h * 0.37;
      k.moveTo(ex + u * 0.025, ey);
      k.arc(ex, ey, u * 0.025, 0, TAU);
      k.rect(ex - u * 0.012, ey - u * 0.012, u * 0.024, u * 0.024);
    });
  }
  // Rocks hanging in the air over the ring, dust falling from them, and boulders where the last ones landed.
  for (let i = 0; i < 3; i++) {
    const rx = cx + p.rr(-0.6, 0.6) * sw;
    const ry = sy - sd - h * p.rr(0.08, 0.28);
    const rr = u * p.rr(0.04, 0.08);
    const rock: Trace = (k) => {
      k.moveTo(rx - rr, ry);
      k.lineTo(rx - rr * 0.5, ry - rr * 0.8);
      k.lineTo(rx + rr * 0.6, ry - rr * 0.7);
      k.lineTo(rx + rr, ry + rr * 0.1);
      k.lineTo(rx + rr * 0.3, ry + rr * 0.7);
      k.lineTo(rx - rr * 0.7, ry + rr * 0.5);
      k.closePath();
    };
    // Dust shaken loose under it, and grit falling away.
    const dust = c.createRadialGradient(rx, ry + rr, 0, rx, ry + rr, rr * 1.6);
    dust.addColorStop(0, 'rgba(220,200,160,0.4)');
    dust.addColorStop(1, 'rgba(220,200,160,0)');
    fill(p, dust, (k) => k.ellipse(rx, ry + rr, rr * 1.6, rr * 1.1, 0, 0, TAU));
    fill(p, tone(STONE, 1, -4), rock);
    line(p, INK(0.8), 1.2, rock);
    fill(p, tone(STONE, 1, -14), (k) => {
      for (let j = 0; j < 6; j++) {
        const gx = rx + p.rr(-0.7, 0.7) * rr;
        const gy = ry + rr * p.rr(0.9, 2.6);
        const gr = Math.max(0.8, rr * p.rr(0.05, 0.1));
        k.moveTo(gx + gr, gy);
        k.arc(gx, gy, gr, 0, TAU);
      }
    });
  }
  for (let i = 0; i < 2; i++) {
    const bx = cx + p.rr(-0.7, 0.7) * sw;
    const by = sy - sd * p.rr(0.2, 0.7);
    const br = u * p.rr(0.03, 0.05);
    fill(p, tone(STONE, 1, -8), (k) => k.ellipse(bx, by, br * 1.3, br * 0.7, 0, Math.PI, TAU));
    line(p, INK(0.7), 1, (k) => k.ellipse(bx, by, br * 1.3, br * 0.7, 0, Math.PI, TAU));
  }
}

/** The Beifong estate in Gaoling from above: halls and a garden pond inside white walls, the flying boar over the gate. */
export function beifong(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  range(p, h * 0.3, h * 0.06, -10, w + 10, [170, 20, 54], 0.4);
  mist(p, h * 0.3, h * 0.06);
  // The compound in plan is a rectangle; the back wall sits higher and shifted by `ox`.
  const fy = h * 0.84;
  const by = h * 0.4;
  const ox = Math.min(w, h) * 0.18 * (p.r() < 0.5 ? 1 : -1);
  const x0 = w * 0.08;
  const x1 = w * 0.92 - Math.abs(ox);
  const sx = ox < 0 ? Math.abs(ox) : 0;
  const L = x0 + sx;
  const R = x1 + sx;
  const wh = h * 0.085;
  const lawn: Trace = (k) => {
    k.moveTo(L, fy);
    k.lineTo(R, fy);
    k.lineTo(R + ox, by);
    k.lineTo(L + ox, by);
    k.closePath();
  };
  for (let i = 0; i < 3; i++) pine(p, L + ox + (R - L) * (0.15 + i * 0.35) + p.rr(-0.05, 0.05) * u, by - wh * 0.4, u * p.rr(0.18, 0.26));
  fill(p, tone(MALACHITE, 0.35, 16), lawn);
  wallRun(p, L + ox, by, R + ox, by, wh);
  // The main hall at the back, a side hall, then the garden: pond, bridge, willows.
  const mx = (L + R) / 2 + ox * 0.85;
  hall(p, mx, by + h * 0.12, Math.min(u * 0.6, (R - L) * 0.4), u * 0.3, 2);
  mist(p, by + h * 0.12, h * 0.025, 0.55);
  hall(p, L + ox * 0.5 + (R - L) * 0.16, by + h * 0.24, Math.min(u * 0.34, (R - L) * 0.22), u * 0.18);
  const px = (L + R) / 2 + ox * 0.35 + (R - L) * 0.12;
  const py = by + (fy - by) * 0.64;
  const pw = Math.min(u * 0.4, (R - L) * 0.26);
  const pond: Trace = (k) => k.ellipse(px, py, pw, pw * 0.32, 0, 0, TAU);
  fill(p, tone(LAKE, 0.75, 10), pond);
  within(p, pond, () =>
    line(p, INK(0.25), 1, (k) => {
      for (let i = 0; i < 10; i++) {
        const rx = px + p.rr(-1, 0.8) * pw;
        const ry = py + p.rr(-0.25, 0.25) * pw;
        k.moveTo(rx, ry);
        k.lineTo(rx + pw * 0.2, ry);
      }
    }),
  );
  line(p, INK(0.6), 1.2, pond);
  fill(p, tone(JADE, 0.9, 6), (k) => {
    for (let i = 0; i < 5; i++) {
      const lx = px + p.rr(-0.7, 0.7) * pw;
      const ly = py + p.rr(-0.15, 0.15) * pw;
      k.moveTo(lx + pw * 0.06, ly);
      k.ellipse(lx, ly, pw * 0.06, pw * 0.025, 0, 0, TAU);
    }
  });
  // A zigzag bridge across the pond: a deck of red lacquer with a pale rail along it.
  const bridge: Trace = (k) => {
    k.moveTo(px - pw * 0.15, py - pw * 0.34);
    k.lineTo(px - pw * 0.05, py - pw * 0.1);
    k.lineTo(px + pw * 0.12, py - pw * 0.05);
    k.lineTo(px + pw * 0.05, py + pw * 0.34);
  };
  line(p, INK(0.7), Math.max(3, u * 0.026), bridge);
  line(p, CINNABAR, Math.max(2, u * 0.02), bridge);
  line(p, hsl(20, 50, 70), 1, (k) => {
    k.moveTo(px - pw * 0.15, py - pw * 0.36);
    k.lineTo(px - pw * 0.05, py - pw * 0.12);
    k.lineTo(px + pw * 0.12, py - pw * 0.07);
    k.lineTo(px + pw * 0.05, py + pw * 0.32);
  });
  for (let i = 0; i < 3; i++) willow(p, px + (i - 1) * pw * 1.1 + p.rr(-0.1, 0.1) * pw, py - pw * (0.1 + (i % 2) * 0.3), u * 0.2);
  // The side walls, and the front wall with its gate, the family's flying boar on a gold disc over the door.
  wallRun(p, L, fy, L + ox, by, wh);
  wallRun(p, R, fy, R + ox, by, wh);
  wallRun(p, L, fy, R, fy, wh);
  const gx = (L + R) / 2;
  fill(p, tone([6, 50, 34]), (k) => k.rect(gx - u * 0.07, fy - wh * 1.6, u * 0.14, wh * 1.6));
  fill(p, INK(0.85), (k) => k.rect(gx - u * 0.045, fy - wh * 1.3, u * 0.09, wh * 1.3));
  roofShape(p, gx, fy - wh * 1.6, u * 0.24, u * 0.07);
  const er = u * 0.028;
  const ey = fy - wh * 1.6 - u * 0.1;
  fill(p, GOLD, (k) => k.arc(gx, ey, er, 0, TAU));
  fill(p, INK(0.85), (k) => {
    k.ellipse(gx, ey + er * 0.1, er * 0.45, er * 0.26, 0, 0, TAU);
    k.moveTo(gx + er * 0.42, ey);
    k.arc(gx + er * 0.48, ey - er * 0.02, er * 0.16, 0, TAU);
    k.moveTo(gx - er * 0.1, ey - er * 0.1);
    k.quadraticCurveTo(gx - er * 0.4, ey - er * 0.7, gx - er * 0.75, ey - er * 0.35);
    k.quadraticCurveTo(gx - er * 0.4, ey - er * 0.25, gx - er * 0.1, ey - er * 0.1);
  });
  line(p, INK(0.7), 1, (k) => k.arc(gx, ey, er, 0, TAU));
  // The road outside the gate.
  fill(p, tone(DUST, 0.6, 8), (k) => {
    k.moveTo(gx - u * 0.07, fy);
    k.lineTo(gx + u * 0.07, fy);
    k.lineTo(gx + u * 0.16, h + 4);
    k.lineTo(gx - u * 0.16, h + 4);
    k.closePath();
  });
}

/** A run of white plastered wall along its foot from (xa, ya) to (xb, yb), ht tall, with a dark tiled top. */
function wallRun(p: Press, xa: number, ya: number, xb: number, yb: number, ht: number) {
  const face: Trace = (k) => {
    k.moveTo(xa, ya);
    k.lineTo(xb, yb);
    k.lineTo(xb, yb - ht);
    k.lineTo(xa, ya - ht);
    k.closePath();
  };
  fill(p, hsl(40, 24, 88), face);
  line(p, INK(0.55), 1, face);
  line(p, TILE, ht * 0.32, (k) => {
    k.moveTo(xa, ya - ht);
    k.lineTo(xb, yb - ht);
  });
}

/** A willow: a short dark trunk with long green strands hanging from it. */
function willow(p: Press, x: number, y: number, s: number) {
  line(p, INK(0.85), Math.max(1.5, s * 0.05), (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x - s * 0.1, y - s * 0.5, x + s * 0.05, y - s * 0.9);
  });
  line(p, tone(MALACHITE, 0.8, 8), Math.max(1, s * 0.012), (k) => {
    for (let i = 0; i < 22; i++) {
      const a = p.rr(-1, 1);
      const tx = x + s * 0.05 + a * s * 0.35;
      const ty = y - s * 0.9 + Math.abs(a) * s * 0.15;
      k.moveTo(x + s * 0.05, y - s * 0.95);
      k.quadraticCurveTo(tx + a * s * 0.1, ty - s * 0.1, tx, ty);
      k.lineTo(tx + p.rr(-0.04, 0.04) * s, ty + s * p.rr(0.4, 0.75));
    }
  });
}

const bez2 = (t: number, a: number, b: number, c: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
