import { hsl } from '../common';
import { type Trace, TAU, BLACK, NAVY, BLUE, ICE, SNOW, RED, type Press, fill, line, within } from './print';
import { type Tone, CITY_FAR, CITY_NEAR, WALL, arch, canoe, crest, moon, tower } from './water-motifs';

/** The Northern Water Tribe: its gate, canals and palace, and two nights of the siege. */

const IRON = hsl(222, 10, 17);
const DAWN = hsl(38, 62, 84);

/** The ice wall's courses of blocks between x0 and x1. */
function blocks(p: Press, x0: number, x1: number, top: number, bottom: number, rows: number, ink: string) {
  const bh = (bottom - top) / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = top + r * bh;
    if (r > 0)
      line(p, ink, 1.3, (k) => {
        k.moveTo(x0, y0);
        k.lineTo(x1, y0);
      });
    const bl = bh * p.rr(1.8, 2.4);
    for (let x = x0 + (r % 2) * bl * 0.5; x < x1; x += bl)
      line(p, ink, 1.1, (k) => {
        k.moveTo(x, y0);
        k.lineTo(x, y0 + bh);
      });
  }
}

/** The great wall parting to let a canoe in, seen from the sea at dawn. */
export function waterGate(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const tall = w / h < 0.85;
  const wallTop = h * (tall ? 0.36 : 0.3);
  const sea = h * (tall ? 0.74 : 0.76);
  const sky = c.createLinearGradient(0, 0, 0, sea);
  sky.addColorStop(0, hsl(212, 42, 50));
  sky.addColorStop(0.45, hsl(18, 48, 78));
  sky.addColorStop(1, DAWN);
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, sea + 4));
  const gx = w * p.rr(0.4, 0.6);
  const gap = Math.max(u * 0.12, w * p.rr(0.12, 0.17));
  // The city beyond, glimpsed through the gap and over the wall.
  for (let i = 0; i < 12; i++) {
    const bw = u * p.rr(0.05, 0.1);
    const bx = gx + p.rr(-2.2, 2.2) * gap - bw / 2;
    const near = Math.abs(bx + bw / 2 - gx) < gap * 0.6;
    tower(p, bx, wallTop - u * p.rr(near ? 0.02 : 0.04, near ? 0.12 : 0.18), bw, sea, CITY_FAR, -1);
  }
  fill(p, NAVY, (k) => k.rect(gx - gap, sea - u * 0.04, gap * 2, u * 0.05));
  // The two halves of the wall, their cut faces shaded.
  const step = u * p.rr(0.07, 0.09);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -4 : gx + gap / 2;
    const x1 = side < 0 ? gx - gap / 2 : w + 4;
    const half: Trace = (k) => k.rect(x0, 0, x1 - x0, sea + 1);
    within(p, half, () => {
      fill(p, WALL.face, (k) => k.rect(x0, wallTop, x1 - x0, sea - wallTop));
      for (let x = x0 - step * p.r(); x < x1 + step; x += step) crest(p, x, wallTop, step, WALL);
      blocks(p, x0, x1, wallTop, sea, 5, WALL.shade);
    });
    const ex = side < 0 ? x1 - u * 0.035 : x0;
    fill(p, hsl(205, 36, 66), (k) => k.rect(ex, wallTop - step * 0.4, u * 0.035, sea - wallTop + step * 0.4));
    // Ice breaking off the edges as the wall moves.
    for (let i = 0; i < 5; i++) {
      const ix = (side < 0 ? x1 : x0) + side * p.rr(-0.2, 1.2) * u * 0.05;
      const iy = p.rr(wallTop, sea);
      const s = u * p.rr(0.012, 0.03);
      fill(p, ICE, (k) => {
        k.moveTo(ix - s, iy);
        k.lineTo(ix, iy - s * 0.8);
        k.lineTo(ix + s * 0.9, iy + s * 0.2);
        k.lineTo(ix + s * 0.1, iy + s);
        k.closePath();
      });
    }
  }
  // The sea, with dawn light on it and a canoe heading in.
  fill(p, NAVY, (k) => k.rect(-4, sea, w + 8, h - sea + 4));
  for (let i = 0; i < 14; i++) {
    const yy = sea + u * 0.02 + i * u * 0.03;
    const len = gap * p.rr(0.4, 1.1) * (1 - i * 0.03);
    line(p, hsl(36, 55, 72), p.rr(1.2, 2.4), (k) => {
      k.moveTo(gx - len / 2 + p.rr(-4, 4), yy);
      k.lineTo(gx + len / 2 + p.rr(-4, 4), yy);
    });
  }
  for (let i = 0; i < 26 * p.detail; i++) {
    const rx = p.rr(-20, w + 20);
    const ry = p.rr(sea + 4, h);
    const rl = u * p.rr(0.025, 0.07);
    line(p, BLUE, p.rr(1, 1.8), (k) => {
      k.moveTo(rx - rl, ry);
      k.quadraticCurveTo(rx, ry - rl * 0.3, rx + rl, ry);
    });
  }
  canoe(p, gx + p.rr(-0.6, 0.6) * gap, sea + (h - sea) * p.rr(0.45, 0.65), u * p.rr(0.2, 0.26), p.r() < 0.5 ? 1 : -1);
}

/** Down a canal between ice houses at dusk, under an ice bridge. */
export function canals(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const vx = w * p.rr(0.44, 0.56);
  const vy = h * p.rr(0.36, 0.44);
  const sky = c.createLinearGradient(0, 0, 0, vy);
  sky.addColorStop(0, hsl(238, 34, 28));
  sky.addColorStop(0.6, hsl(300, 26, 52));
  sky.addColorStop(1, hsl(28, 55, 76));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, vy + 6));
  if (p.r() < 0.6) moon(p, vx + p.rr(-0.3, 0.3) * w, vy * p.rr(0.25, 0.45), u * 0.05);
  // Water from our feet to the vanishing point, with its quays.
  const bl = w * p.rr(0.1, 0.2);
  const br = w * p.rr(0.8, 0.9);
  const at = (edge: number, t: number): [number, number] => [vx + (edge - vx) * t, vy + (h - vy) * t];
  fill(p, NAVY, (k) => {
    k.moveTo(bl, h + 4);
    k.lineTo(vx - 1, vy);
    k.lineTo(vx + 1, vy);
    k.lineTo(br, h + 4);
    k.closePath();
  });
  for (let i = 0; i < 22; i++) {
    const t = p.rr(0.15, 1);
    const [x0] = at(bl, t);
    const [x1, y] = at(br, t);
    const len = (x1 - x0) * p.rr(0.1, 0.3);
    const x = p.rr(x0 + len, x1 - len);
    line(p, i % 3 ? BLUE : hsl(28, 50, 66), Math.max(1, t * 2.2), (k) => {
      k.moveTo(x - len / 2, y);
      k.lineTo(x + len / 2, y);
    });
  }
  // House fronts along both quays, far ones first so nearer ones overlap them.
  const near = h * p.rr(1.0, 1.3);
  for (const edge of [bl, br]) {
    const tMax = edge < vx ? (vx + 10) / (vx - edge) : (w + 10 - vx) / (edge - vx);
    const fronts: { t0: number; t1: number; m: number; tone: Tone }[] = [];
    for (let t = 0.03; t < tMax; ) {
      const t1 = t * p.rr(1.25, 1.5) + 0.02;
      fronts.push({ t0: t, t1, m: p.rr(0.75, 1.2), tone: p.r() < 0.5 ? CITY_NEAR : WALL });
      t = t1;
    }
    for (const f of fronts) {
      const [x0, y0] = at(edge, f.t0);
      const [x1, y1] = at(edge, f.t1);
      const top0 = y0 - near * f.t0 * f.m;
      const top1 = y1 - near * f.t1 * f.m;
      const face: Trace = (k) => {
        k.moveTo(x0, y0);
        k.lineTo(x1, y1);
        k.lineTo(x1, top1);
        k.lineTo(x0, top0);
        k.closePath();
      };
      fill(p, f.tone.face, face);
      line(p, f.tone.shade, Math.max(1, f.t1 * 2.5), (k) => {
        k.moveTo(x1, y1);
        k.lineTo(x1, top1);
      });
      // A dome or a parapet on the roofline, and arched windows in rows.
      const mx = (x0 + x1) / 2;
      const my = (top0 + top1) / 2;
      const span = Math.abs(x1 - x0);
      if (p.r() < 0.5) fill(p, f.tone.face, (k) => k.ellipse(mx, my + 1, span * 0.42, span * 0.36, 0, Math.PI, TAU));
      for (let row = 0.25; row < 0.85; row += 0.22) {
        for (let col = 0.25; col < 0.9; col += 0.5) {
          if (p.r() < 0.25) continue;
          const wx = x0 + (x1 - x0) * col;
          const wyTop = top0 + (top1 - top0) * col;
          const wyBot = y0 + (y1 - y0) * col;
          const wy = wyTop + (wyBot - wyTop) * row;
          const s = span * 0.16;
          arch(p, wx, wy, s, s * 1.5, p.r() < 0.2 ? hsl(42, 75, 70) : f.tone.window);
        }
      }
    }
  }
  // An ice bridge across the canal.
  const tb = p.rr(0.32, 0.5);
  const [lx, ly] = at(bl, tb);
  const [rx] = at(br, tb);
  const deck = ly - near * tb * 0.42;
  const thick = near * tb * 0.1;
  fill(p, ICE, (k) => {
    k.rect(lx - 2, deck, rx - lx + 4, ly - deck);
    k.ellipse((lx + rx) / 2, ly, (rx - lx) * 0.46, ly - deck - thick, 0, Math.PI, TAU, true);
  });
  line(p, hsl(204, 34, 70), Math.max(1, tb * 3), (k) => {
    k.moveTo(lx, deck);
    k.lineTo(rx, deck);
  });
  for (let i = 0; i < 9; i++) {
    const x = lx + ((rx - lx) * (i + 0.5)) / 9;
    fill(p, ICE, (k) => k.rect(x - thick * 0.25, deck - thick * 0.9, thick * 0.5, thick * 0.9));
  }
  canoe(p, w * p.rr(0.4, 0.6), h * p.rr(0.82, 0.9), u * p.rr(0.28, 0.34), p.r() < 0.5 ? 1 : -1);
}

/** The chief's palace at the top of the northern city, up its long stairs. */
export function chiefPalace(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const sky = c.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, hsl(222, 50, 12));
  sky.addColorStop(1, hsl(210, 46, 34));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, h + 8));
  for (let i = 0; i < 40; i++) {
    const sx = p.rr(0, w);
    const sy = p.rr(0, h * 0.5);
    const sr = p.rr(0.6, 1.6);
    fill(p, SNOW, (k) => k.arc(sx, sy, sr, 0, TAU));
  }
  const cx = w * p.rr(0.46, 0.54);
  const pw = Math.min(w * 0.62, u * 0.9);
  const base = h * 0.5;
  moon(p, cx + pw * p.pick([-0.42, 0.42]), h * 0.16, u * 0.09);
  // Terraces stepping down either side, then the palace with its dome and spires.
  for (let i = 0; i < 4; i++) {
    const tw = w * (0.35 + i * 0.2);
    const ty = base + i * h * 0.08;
    fill(p, i % 2 ? CITY_NEAR.face : WALL.face, (k) => k.rect(cx - tw / 2, ty, tw, h * 0.09));
    line(p, CITY_NEAR.shade, 1.3, (k) => {
      k.moveTo(cx - tw / 2, ty);
      k.lineTo(cx + tw / 2, ty);
    });
    for (let x = cx - tw / 2; x < cx + tw / 2; x += u * 0.08) crest(p, x, ty, u * 0.05, WALL);
  }
  const bodyTop = base - h * 0.14;
  fill(p, WALL.face, (k) => k.rect(cx - pw / 2, bodyTop, pw, base - bodyTop + 2));
  fill(p, WALL.shade, (k) => k.rect(cx + pw * 0.18, bodyTop, pw * 0.32, base - bodyTop + 2));
  const dome: Trace = (k) => k.ellipse(cx, bodyTop + 1, pw * 0.3, pw * 0.34, 0, Math.PI, TAU);
  fill(p, WALL.face, dome);
  within(p, dome, () => fill(p, WALL.shade, (k) => k.rect(cx + pw * 0.08, bodyTop - pw, pw * 0.4, pw)));
  for (const sgn of [-1, 1]) tower(p, cx + sgn * pw * 0.42 - pw * 0.07, bodyTop - h * 0.12, pw * 0.14, base, WALL, -1);
  for (let i = -2; i <= 2; i++) arch(p, cx + i * pw * 0.16, bodyTop + (base - bodyTop) * 0.55, pw * 0.06, (base - bodyTop) * 0.45, i === 0 ? hsl(42, 70, 72) : NAVY);
  // The Water Tribe banner on the dome.
  const poleTop = bodyTop - pw * 0.34 - u * 0.12;
  line(
    p,
    BLACK,
    1.6,
    (k) => {
      k.moveTo(cx, bodyTop - pw * 0.33);
      k.lineTo(cx, poleTop);
    },
    true,
  );
  fill(p, BLUE, (k) => k.rect(cx, poleTop, u * 0.08, u * 0.05));
  // The stairs, widening as they come down towards us.
  const stairs: Trace = (k) => {
    k.moveTo(cx - pw * 0.08, base);
    k.lineTo(cx + pw * 0.08, base);
    k.lineTo(cx + w * 0.3, h + 4);
    k.lineTo(cx - w * 0.3, h + 4);
    k.closePath();
  };
  fill(p, SNOW, stairs);
  within(p, stairs, () => {
    for (let t = 0.02; t < 1; t += 0.035 + t * 0.03) {
      const y = base + (h - base) * t;
      line(p, hsl(204, 30, 74), 1 + t * 1.5, (k) => {
        k.moveTo(0, y);
        k.lineTo(w, y);
      });
    }
  });
  for (const sgn of [-1, 1])
    line(p, CITY_NEAR.shade, u * 0.012, (k) => {
      k.moveTo(cx + sgn * pw * 0.08, base);
      k.lineTo(cx + sgn * w * 0.3, h + 4);
    });
}

/** The northern city on the night the Moon Spirit fell, under a red moon, everything drained of colour. */
export function redMoon(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const wide = w / h > 1.3;
  const wallTop = h * (wide ? 0.62 : 0.66);
  const wallBottom = h * (wide ? 0.8 : 0.78);
  const sky = c.createLinearGradient(0, 0, 0, wallBottom);
  sky.addColorStop(0, hsl(350, 40, 8));
  sky.addColorStop(0.7, hsl(355, 45, 20));
  sky.addColorStop(1, hsl(5, 40, 30));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, wallBottom + 4));
  const mr = u * p.rr(0.15, 0.2);
  const mx = w * p.rr(0.3, 0.7);
  const my = h * (wide ? 0.3 : 0.24);
  const halo = c.createRadialGradient(mx, my, mr, mx, my, mr * 2.4);
  halo.addColorStop(0, 'rgba(200,40,40,0.35)');
  halo.addColorStop(1, 'rgba(200,40,40,0)');
  fill(p, halo, (k) => k.arc(mx, my, mr * 2.4, 0, TAU));
  fill(p, RED, (k) => k.arc(mx, my, mr, 0, TAU));
  fill(p, hsl(358, 55, 36), (k) => k.arc(mx + mr * 0.2, my + mr * 0.1, mr * 0.45, 0, TAU));
  const grey: Tone = { face: hsl(350, 6, 52), shade: hsl(350, 8, 36), window: hsl(350, 20, 14) };
  const dark: Tone = { face: hsl(350, 6, 34), shade: hsl(350, 8, 24), window: hsl(350, 20, 10) };
  for (const tone of [dark, grey]) {
    let x = -p.rr(0, u * 0.08);
    while (x < w) {
      const bw = u * p.rr(0.06, 0.12);
      const top = wallTop - u * p.rr(tone === dark ? 0.12 : 0.04, tone === dark ? 0.3 : 0.16);
      tower(p, x, top, bw, wallTop + 2, tone, mx < w / 2 ? -1 : 1);
      x += bw * p.rr(0.75, 1);
    }
  }
  fill(p, grey.face, (k) => k.rect(-4, wallTop, w + 8, wallBottom - wallTop));
  blocks(p, -4, w + 4, wallTop, wallBottom, 3, grey.shade);
  fill(p, hsl(350, 30, 10), (k) => k.rect(-4, wallBottom, w + 8, h - wallBottom + 4));
  for (let i = 0; i < 14; i++) {
    const yy = wallBottom + u * 0.02 + i * u * 0.03;
    const len = mr * p.rr(0.5, 1.4) * (1 - i * 0.04);
    line(p, hsl(358, 55, 40), p.rr(1.2, 2.6), (k) => {
      k.moveTo(mx - len / 2 + p.rr(-5, 5), yy);
      k.lineTo(mx + len / 2 + p.rr(-5, 5), yy);
    });
  }
}

/** Fire Navy ships coming out of the fog towards the northern wall, with ash falling. */
export function siegeFleet(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * p.rr(0.55, 0.62);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(220, 14, 36));
  sky.addColorStop(1, hsl(210, 12, 70));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  fill(p, hsl(214, 40, 26), (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  // The wall on one side, the fleet coming from the other.
  const wallLeft = p.r() < 0.5;
  const wx0 = wallLeft ? -4 : w * 0.72;
  const wx1 = wallLeft ? w * 0.28 : w + 4;
  const wtop = horizon - h * 0.34;
  fill(p, WALL.face, (k) => k.rect(wx0, wtop, wx1 - wx0, horizon - wtop + u * 0.02));
  within(
    p,
    (k) => k.rect(wx0, 0, wx1 - wx0, horizon + u * 0.02),
    () => {
      for (let x = wx0 - u * 0.05; x < wx1 + u * 0.08; x += u * 0.08) crest(p, x, wtop, u * 0.08, WALL);
      blocks(p, wx0, wx1, wtop, horizon + u * 0.02, 5, WALL.shade);
    },
  );
  const dir = wallLeft ? -1 : 1;
  const ships = Math.max(2, Math.round((w / u) * 2));
  for (let i = 0; i < ships; i++) {
    const t = (i + 0.5) / ships;
    const depth = p.rr(0, 1);
    const sx = wallLeft ? w * (0.38 + t * 0.6) : w * (0.04 + t * 0.6);
    const sy = horizon + (h - horizon) * (0.15 + depth * 0.55);
    fireShip(p, sx, sy, u * (0.28 + depth * 0.22), dir);
  }
  // Fog banks drifting across, and black snow.
  for (let i = 0; i < 4; i++) {
    const fy = horizon + (h - horizon) * p.rr(-0.4, 0.6);
    const g = c.createLinearGradient(0, fy - u * 0.08, 0, fy + u * 0.08);
    g.addColorStop(0, 'rgba(225,228,232,0)');
    g.addColorStop(0.5, 'rgba(225,228,232,0.45)');
    g.addColorStop(1, 'rgba(225,228,232,0)');
    fill(p, g, (k) => k.rect(-4, fy - u * 0.08, w + 8, u * 0.16));
  }
  for (let i = 0; i < 160 * p.detail; i++) {
    const ax = p.rr(0, w);
    const ay = p.rr(0, h);
    const ar = p.rr(0.8, 2.2);
    fill(p, 'rgba(25,24,28,0.75)', (k) => k.arc(ax, ay, ar, 0, TAU), true);
  }
}

/** A Fire Navy ship: iron hull with a raised ram bow, a bridge tower, a smoking stack and a red flag. */
function fireShip(p: Press, x: number, y: number, len: number, dir: number) {
  const X = (dx: number) => x + dir * dx * len;
  fill(
    p,
    IRON,
    (k) => {
      k.moveTo(X(-0.5), y - len * 0.07);
      k.lineTo(X(0.36), y - len * 0.07);
      k.lineTo(X(0.52), y - len * 0.17);
      k.lineTo(X(0.44), y + len * 0.04);
      k.lineTo(X(-0.47), y + len * 0.04);
      k.closePath();
      k.moveTo(X(-0.36), y - len * 0.07);
      k.lineTo(X(-0.36), y - len * 0.26);
      k.lineTo(X(-0.18), y - len * 0.26);
      k.lineTo(X(-0.14), y - len * 0.07);
      k.closePath();
      k.rect(Math.min(X(-0.05), X(0.01)), y - len * 0.33, len * 0.06, len * 0.27);
    },
    true,
  );
  for (let i = 0; i < 5; i++) fill(p, hsl(22, 80, 55), (k) => k.arc(X(-0.35 + i * 0.16), y - len * 0.015, len * 0.012, 0, TAU));
  fill(p, RED, (k) => k.rect(Math.min(X(-0.3), X(-0.22)), y - len * 0.33, len * 0.08, len * 0.05));
  for (let i = 0; i < 4; i++) {
    const sx = X(-0.02) - dir * i * len * 0.07;
    const sy = y - len * (0.37 + i * 0.05);
    fill(p, hsl(220, 6, 36 + i * 6, 0.85), (k) => k.arc(sx, sy, len * (0.04 + i * 0.015), 0, TAU));
  }
}
