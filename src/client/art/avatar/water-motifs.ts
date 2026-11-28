import { hsl } from '../common';
import { type Ctx, type Ink, type Trace, TAU, BLACK, NAVY, BLUE, ICE, SNOW, SKY, type Press, fill, line, within } from './print';

/** Shapes the Water Tribe paintings share: towers and walls of ice, huts, creatures, keepsakes. */

export interface Tone {
  face: string;
  shade: string;
  window: string;
}

export const CITY_FAR: Tone = { face: hsl(204, 32, 64), shade: hsl(210, 38, 48), window: hsl(216, 45, 30) };

export const CITY_NEAR: Tone = { face: hsl(195, 34, 85), shade: hsl(204, 38, 67), window: hsl(214, 50, 28) };

export const WALL: Tone = { face: hsl(194, 34, 91), shade: hsl(203, 36, 72), window: NAVY };

/** The full moon: white with a soft halo on a night sky, pale blue with a ring on bare paper. */
export function moon(p: Press, x: number, y: number, r: number, onPaper = false) {
  if (onPaper) {
    fill(p, hsl(203, 42, 80), (k) => k.arc(x, y, r, 0, TAU));
    line(p, BLUE, Math.max(1.2, r * 0.05), (k) => k.arc(x, y, r * 1.16, 0, TAU));
  } else {
    const halo = p.c.createRadialGradient(x, y, r, x, y, r * 2.8);
    halo.addColorStop(0, 'rgba(215,232,245,0.32)');
    halo.addColorStop(1, 'rgba(215,232,245,0)');
    fill(p, halo, (k) => k.arc(x, y, r * 2.8, 0, TAU));
    fill(p, SNOW, (k) => k.arc(x, y, r, 0, TAU));
  }
  for (let i = 0; i < 3; i++) {
    const a = p.rr(0, TAU);
    const d = p.rr(0.2, 0.55) * r;
    const cr = p.rr(0.12, 0.22) * r;
    fill(p, 'rgba(160,185,205,0.35)', (k) => k.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, TAU));
  }
}

/** An arched opening, centred on x, from y - ah/2 to y + ah/2. */
export function arch(p: Press, x: number, y: number, aw: number, ah: number, ink: Ink, key = false) {
  fill(
    p,
    ink,
    (k) => {
      k.moveTo(x - aw / 2, y + ah / 2);
      k.lineTo(x - aw / 2, y - ah / 2 + aw / 2);
      k.arc(x, y - ah / 2 + aw / 2, aw / 2, Math.PI, 0);
      k.lineTo(x + aw / 2, y + ah / 2);
      k.closePath();
    },
    key,
  );
}

export const BONE = hsl(38, 42, 78);

export const BONE_DARK = hsl(30, 38, 52);

/** A round pendant with a crescent moon over a wave, cut into pale stone. */
export function pendant(p: Press, x: number, y: number, r: number) {
  fill(p, SKY, (k) => k.arc(x, y, r, 0, TAU));
  line(p, NAVY, Math.max(1, r * 0.12), (k) => k.arc(x, y, r, 0, TAU));
  line(p, NAVY, Math.max(1, r * 0.12), (k) => {
    k.arc(x + r * 0.1, y - r * 0.25, r * 0.32, Math.PI * 0.6, Math.PI * 1.6);
    k.moveTo(x - r * 0.6, y + r * 0.35);
    k.quadraticCurveTo(x - r * 0.3, y + r * 0.1, x, y + r * 0.35);
    k.quadraticCurveTo(x + r * 0.3, y + r * 0.6, x + r * 0.6, y + r * 0.35);
  });
}

/**
 * Sokka's boomerang: elbow at (x, y), arms of length `s` either side of direction `ang`. Pale wood with a
 * black edge and a bound grip.
 */
export function boomerang(p: Press, x: number, y: number, s: number, ang: number) {
  const half = 0.95;
  const ax = x + Math.cos(ang - half) * s;
  const ay = y + Math.sin(ang - half) * s;
  const bx = x + Math.cos(ang + half) * s;
  const by = y + Math.sin(ang + half) * s;
  // Control point that puts the curve's apex on the elbow.
  const qx = 2 * x - (ax + bx) / 2;
  const qy = 2 * y - (ay + by) / 2;
  const path: Trace = (k) => {
    k.moveTo(ax, ay);
    k.quadraticCurveTo(qx, qy, bx, by);
  };
  line(p, BLACK, s * 0.28, path, true);
  line(p, BONE, s * 0.21, path);
  line(p, BONE_DARK, Math.max(1, s * 0.03), path);
  const tx = (bx - ax) / Math.hypot(bx - ax, by - ay);
  const ty = (by - ay) / Math.hypot(bx - ax, by - ay);
  const nx = Math.cos(ang);
  const ny = Math.sin(ang);
  for (let i = -2; i <= 2; i++) {
    const cx = x - nx * s * 0.0 + tx * i * s * 0.07;
    const cy = y - ny * s * 0.0 + ty * i * s * 0.07;
    line(
      p,
      HIDE_DARK,
      Math.max(1.2, s * 0.035),
      (k) => {
        k.moveTo(cx - nx * s * 0.1, cy - ny * s * 0.1);
        k.lineTo(cx + nx * s * 0.1, cy + ny * s * 0.1);
      },
      true,
    );
  }
}

/** Korra's polar bear dog, Naga: a big white head looking in from the side. */
export function naga(p: Press, x: number, y: number, s: number, side: number) {
  const f = side;
  const neck: Trace = (k) => {
    k.moveTo(x - f * s * 0.9, p.h + 4);
    k.quadraticCurveTo(x - f * s * 0.8, y + s * 0.2, x - f * s * 0.1, y - s * 0.2);
    k.lineTo(x + f * s * 0.3, y + s * 0.4);
    k.quadraticCurveTo(x + f * s * 0.3, y + s * 0.9, x + f * s * 0.2, p.h + 4);
    k.closePath();
  };
  fill(p, SNOW, neck);
  line(p, BLACK, 1.6, neck, true);
  for (const ex of [-0.35, 0.05]) {
    const earX = x + f * s * ex;
    const ear: Trace = (k) => k.ellipse(earX, y - s * 0.42, s * 0.12, s * 0.15, f * 0.3, 0, TAU);
    fill(p, SNOW, ear);
    line(p, BLACK, 1.5, ear, true);
  }
  const headShape: Trace = (k) => k.ellipse(x, y - s * 0.1, s * 0.5, s * 0.4, 0, 0, TAU);
  const snout: Trace = (k) => k.ellipse(x + f * s * 0.45, y + s * 0.05, s * 0.36, s * 0.22, f * 0.1, 0, TAU);
  for (const part of [headShape, snout]) fill(p, SNOW, part);
  for (const part of [headShape, snout]) line(p, BLACK, 1.6, part, true);
  fill(p, SNOW, (k) => k.ellipse(x + f * s * 0.2, y - s * 0.02, s * 0.35, s * 0.25, 0, 0, TAU));
  fill(p, BLACK, (k) => k.ellipse(x + f * s * 0.8, y - s * 0.02, s * 0.08, s * 0.06, 0, 0, TAU), true);
  fill(p, BLACK, (k) => k.ellipse(x + f * s * 0.18, y - s * 0.18, s * 0.06, s * 0.045, f * 0.3, 0, TAU), true);
  line(
    p,
    BLACK,
    1.5,
    (k) => {
      k.moveTo(x + f * s * 0.78, y + s * 0.1);
      k.quadraticCurveTo(x + f * s * 0.6, y + s * 0.22, x + f * s * 0.35, y + s * 0.16);
    },
    true,
  );
  for (let i = 0; i < 14; i++) {
    const fx = x + p.rr(-0.6, 0.4) * s * f;
    const fy = y + p.rr(0.2, 1.2) * s;
    line(p, ICE, 1.1, (k) => {
      k.moveTo(fx, fy);
      k.lineTo(fx - f * s * 0.05, fy + s * 0.06);
    });
  }
}

/** A white fur pelt with a ragged edge and combed fur cut into it. */
export function pelt(p: Press, cx: number, cy: number, rx: number, ry: number) {
  const n = 64;
  const shape: Trace = (k) => {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const r = 1 + Math.sin(a * 3 + 1) * 0.04 + (i % 2 ? 0.035 : -0.02);
      const px = cx + Math.cos(a) * rx * r * (1 + 0.08 * Math.cos(a) ** 8);
      const py = cy + Math.sin(a) * ry * r;
      if (i === 0) k.moveTo(px, py);
      else k.lineTo(px, py);
    }
    k.closePath();
  };
  fill(p, SNOW, shape);
  within(p, shape, () => {
    for (let i = 0; i < 160 * p.detail; i++) {
      const fx = cx + p.rr(-1, 1) * rx;
      const fy = cy + p.rr(-1, 1) * ry;
      const a = Math.atan2(fy - cy, fx - cx) + p.rr(-0.3, 0.3);
      const l = Math.min(rx, ry) * p.rr(0.04, 0.09);
      line(p, hsl(205, 22, 82), 1.1, (k) => {
        k.moveTo(fx, fy);
        k.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l);
      });
    }
  });
}

/** Katara's necklace: a loop of blue ribbon with a carved pendant and the ends tied in a bow. */
export function necklace(p: Press, x: number, y: number, s: number, ang: number) {
  const loop: Trace = (k) => k.ellipse(x, y, s * 0.55, s * 0.42, ang, 0, TAU);
  line(p, BLACK, s * 0.1, loop, true);
  line(p, BLUE, s * 0.075, loop);
  line(p, SKY, Math.max(1, s * 0.014), loop);
  const top = { x: x + Math.sin(ang) * s * 0.42, y: y - Math.cos(ang) * s * 0.42 };
  for (const sgn of [-1, 1])
    line(p, BLUE, s * 0.06, (k) => {
      k.moveTo(top.x, top.y);
      k.quadraticCurveTo(top.x + sgn * s * 0.12, top.y - s * 0.2, top.x + sgn * s * 0.2, top.y - s * 0.12);
    });
  pendant(p, x - Math.sin(ang) * s * 0.42, y + Math.cos(ang) * s * 0.42, s * 0.14);
}

/** Katara's water skin: a leather flask with a stopper and a strap. */
export function pouch(p: Press, x: number, y: number, s: number, ang: number) {
  const leather = hsl(28, 40, 36);
  const dark = hsl(24, 40, 24);
  const at = (k: Ctx) => {
    k.translate(x, y);
    k.rotate(ang);
  };
  const body: Trace = (k) => {
    at(k);
    k.moveTo(-s * 0.12, -s * 0.38);
    k.bezierCurveTo(-s * 0.5, -s * 0.3, -s * 0.48, s * 0.45, 0, s * 0.45);
    k.bezierCurveTo(s * 0.48, s * 0.45, s * 0.5, -s * 0.3, s * 0.12, -s * 0.38);
    k.closePath();
  };
  line(
    p,
    BLACK,
    Math.max(1.4, s * 0.03),
    (k) => {
      at(k);
      k.moveTo(-s * 0.1, -s * 0.42);
      k.bezierCurveTo(-s * 0.8, -s * 0.9, s * 0.9, -s * 0.95, s * 0.12, -s * 0.42);
    },
    true,
  );
  fill(p, leather, body);
  within(p, body, () => fill(p, dark, (k) => {
    at(k);
    k.rect(s * 0.12, -s * 0.5, s * 0.5, s * 1.1);
  }));
  line(p, BLACK, Math.max(1.4, s * 0.025), body, true);
  line(p, BONE_DARK, Math.max(1, s * 0.012), (k) => {
    at(k);
    k.setLineDash([s * 0.03, s * 0.03]);
    k.ellipse(0, s * 0.08, s * 0.28, s * 0.3, 0, 0, TAU);
  });
  fill(p, BONE, (k) => {
    at(k);
    k.roundRect(-s * 0.1, -s * 0.52, s * 0.2, s * 0.16, s * 0.04);
  });
}

export const SNOW_SHADE = hsl(204, 34, 80);

export const SNOW_LINE = hsl(204, 30, 72);

export const HIDE = hsl(32, 32, 58);

export const HIDE_DARK = hsl(26, 34, 40);

export const BEAK = hsl(30, 70, 52);

/** Curtains of the southern lights, brushed in through a stencil. */
export function aurora(p: Press, horizon: number) {
  const { c, w } = p;
  const bands = p.ri(2, 3);
  for (let b = 0; b < bands; b++) {
    const hue = p.pick([160, 172, 190, 280]);
    const top = horizon * p.rr(0.1, 0.4);
    const depth = horizon * p.rr(0.2, 0.35);
    const amp = horizon * p.rr(0.04, 0.12);
    const freq = p.rr(1.5, 3.5);
    const ph = p.rr(0, TAU);
    const g = c.createLinearGradient(0, top - amp, 0, top + depth + amp);
    g.addColorStop(0, hsl(hue, 60, 62, 0.5));
    g.addColorStop(1, hsl(hue, 60, 62, 0));
    fill(p, g, (k) => {
      const yAt = (x: number) => top + Math.sin((x / w) * freq * Math.PI + ph) * amp;
      k.moveTo(-4, yAt(-4));
      for (let x = 0; x <= w + 4; x += 8) k.lineTo(x, yAt(x));
      for (let x = w + 4; x >= -4; x -= 8) k.lineTo(x, yAt(x) + depth);
      k.closePath();
    });
  }
}

/** Jagged ice ridges along the horizon. */
export function ridge(p: Press, y: number, u: number, ink: string) {
  const { w } = p;
  fill(p, ink, (k) => {
    k.moveTo(-4, y + 1);
    let x = -4;
    while (x < w + 4) {
      const hh = u * p.rr(0.02, 0.08);
      k.lineTo(x + u * p.rr(0.02, 0.05), y - hh);
      x += u * p.rr(0.05, 0.12);
      k.lineTo(x, y - hh * p.rr(0.1, 0.5));
    }
    k.lineTo(w + 4, y + 1);
    k.closePath();
  });
}

/** The lookout tower of packed snow, with a blue pennant. */
export function watchtower(p: Press, x: number, base: number, th: number, tw: number, lit: number) {
  const top = base - th;
  const body: Trace = (k) => {
    k.moveTo(x - tw / 2, base);
    k.lineTo(x - tw * 0.4, top);
    k.lineTo(x + tw * 0.4, top);
    k.lineTo(x + tw / 2, base);
    k.closePath();
  };
  fill(p, SNOW, body);
  within(p, body, () => {
    fill(p, SNOW_SHADE, (k) => k.rect(lit < 0 ? x + tw * 0.14 : x - tw, top - 2, tw * 0.86, th + 4));
    for (let y = base - tw * 0.34, row = 0; y > top + 2; y -= tw * 0.34, row++) {
      const yy = y;
      line(p, SNOW_LINE, 1.2, (k) => {
        k.moveTo(x - tw, yy);
        k.lineTo(x + tw, yy);
      });
      for (let j = -2; j <= 2; j++) {
        const jx = x + (j + (row % 2) * 0.5) * tw * 0.42;
        line(p, SNOW_LINE, 1, (k) => {
          k.moveTo(jx, yy);
          k.lineTo(jx, yy + tw * 0.34);
        });
      }
    }
  });
  const pw = tw * 1.2;
  const ph = tw * 0.32;
  fill(p, SNOW, (k) => k.rect(x - pw / 2, top - ph, pw, ph));
  fill(p, SNOW_SHADE, (k) => k.rect(lit < 0 ? x + pw * 0.15 : x - pw / 2, top - ph, pw * 0.35, ph));
  for (let i = 0; i < 4; i++) fill(p, SNOW, (k) => k.rect(x - pw / 2 + i * pw * 0.29, top - ph - tw * 0.18, pw * 0.13, tw * 0.19));
  arch(p, x, top + tw * 0.5, tw * 0.22, tw * 0.4, NAVY);
  const poleTop = top - ph - tw * 1.1;
  line(
    p,
    BLACK,
    Math.max(1.4, tw * 0.035),
    (k) => {
      k.moveTo(x, top - ph);
      k.lineTo(x, poleTop);
    },
    true,
  );
  const fd = p.r() < 0.5 ? 1 : -1;
  fill(p, BLUE, (k) => {
    k.moveTo(x, poleTop);
    k.quadraticCurveTo(x + fd * tw * 0.4, poleTop + tw * 0.05, x + fd * tw * 0.75, poleTop + tw * 0.2);
    k.quadraticCurveTo(x + fd * tw * 0.4, poleTop + tw * 0.25, x, poleTop + tw * 0.42);
    k.closePath();
  });
}

/** A snow-block igloo with its entrance tunnel. */
export function igloo(p: Press, x: number, base: number, r: number, lit: number) {
  const dome: Trace = (k) => k.ellipse(x, base, r, r * 0.8, 0, Math.PI, TAU);
  fill(p, SNOW, dome);
  within(p, dome, () => {
    fill(p, hsl(205, 36, 74), (k) => k.ellipse(x - lit * r * 0.95, base, r * 0.6, r * 1.1, 0, 0, TAU));
    for (let i = 1; i < 4; i++) {
      const yy = base - r * 0.8 * (i / 4);
      line(p, SNOW_LINE, 1.1, (k) => {
        k.moveTo(x - r, yy);
        k.lineTo(x + r, yy);
      });
      for (let j = -3; j <= 3; j++) {
        const jx = x + (j + (i % 2) * 0.5) * r * 0.36;
        line(p, SNOW_LINE, 1, (k) => {
          k.moveTo(jx, yy);
          k.lineTo(jx, yy + r * 0.2);
        });
      }
    }
  });
  line(p, hsl(206, 34, 62), Math.max(1.2, r * 0.03), dome);
  const ex = x + lit * r * 0.15;
  fill(p, SNOW, (k) => k.ellipse(ex, base, r * 0.34, r * 0.36, 0, Math.PI, TAU));
  line(p, hsl(206, 34, 62), Math.max(1, r * 0.025), (k) => k.ellipse(ex, base, r * 0.34, r * 0.36, 0, Math.PI, TAU));
  arch(p, ex, base - r * 0.13, r * 0.26, r * 0.26, NAVY);
}

/** A rounded hut of stitched hides with a blue band, a smoke hole and a door flap. */
export function hut(p: Press, x: number, base: number, s: number, lit: number) {
  const body: Trace = (k) => {
    k.moveTo(x - s * 0.55, base);
    k.bezierCurveTo(x - s * 0.56, base - s * 0.55, x - s * 0.3, base - s * 0.86, x - s * 0.08, base - s * 0.9);
    k.lineTo(x + s * 0.08, base - s * 0.9);
    k.bezierCurveTo(x + s * 0.3, base - s * 0.86, x + s * 0.56, base - s * 0.55, x + s * 0.55, base);
    k.closePath();
  };
  fill(p, HIDE, body);
  within(p, body, () => {
    fill(p, HIDE_DARK, (k) => k.ellipse(x - lit * s * 0.62, base - s * 0.3, s * 0.36, s * 0.9, 0, 0, TAU));
    fill(p, BLUE, (k) => k.rect(x - s, base - s * 0.3, s * 2, s * 0.09));
    // Seams between the hides.
    for (let i = -2; i <= 2; i++) {
      const sx = x + i * s * 0.22;
      line(p, HIDE_DARK, 1, (k) => {
        k.moveTo(x + i * s * 0.03, base - s * 0.9);
        k.quadraticCurveTo(sx * 1 + i * s * 0.06, base - s * 0.5, sx + i * s * 0.03, base);
      });
    }
  });
  fill(p, BLACK, (k) => k.ellipse(x, base - s * 0.9, s * 0.09, s * 0.025, 0, 0, TAU), true);
  fill(p, NAVY, (k) => {
    k.moveTo(x - s * 0.13, base);
    k.quadraticCurveTo(x - s * 0.12, base - s * 0.36, x, base - s * 0.4);
    k.quadraticCurveTo(x + s * 0.12, base - s * 0.36, x + s * 0.13, base);
    k.closePath();
  });
}

/** Two courses of snow blocks from x0 to x1, standing on y. */
export function snowWall(p: Press, x0: number, x1: number, y: number, bh: number) {
  const bw = bh * 1.9;
  for (let row = 0; row < 2; row++) {
    const yy = y - (row + 1) * bh;
    for (let x = x0 + (row % 2) * bw * 0.5; x < x1 - bw * 0.3; x += bw) {
      const bx = x;
      fill(p, SNOW, (k) => k.roundRect(bx + 1, yy + 1, bw - 2, bh - 2, bh * 0.18));
      line(p, SNOW_LINE, 1.1, (k) => k.roundRect(bx + 1, yy + 1, bw - 2, bh - 2, bh * 0.18));
    }
  }
}

/** An otter penguin facing `dir`. */
export function penguin(p: Press, x: number, y: number, s: number, dir: number) {
  fill(p, BLACK, (k) => k.ellipse(x, y - s * 0.48, s * 0.3, s * 0.48, dir * 0.12, 0, TAU), true);
  fill(p, SNOW, (k) => k.ellipse(x + dir * s * 0.08, y - s * 0.42, s * 0.18, s * 0.34, dir * 0.12, 0, TAU));
  fill(p, BLACK, (k) => k.arc(x + dir * s * 0.08, y - s * 0.98, s * 0.19, 0, TAU), true);
  fill(p, SNOW, (k) => k.arc(x + dir * s * 0.15, y - s * 1.02, s * 0.045, 0, TAU), true);
  fill(p, BEAK, (k) => {
    k.moveTo(x + dir * s * 0.24, y - s * 1.0);
    k.lineTo(x + dir * s * 0.4, y - s * 0.95);
    k.lineTo(x + dir * s * 0.24, y - s * 0.91);
    k.closePath();
  });
  for (const fx of [-0.12, 0.12]) fill(p, BEAK, (k) => k.ellipse(x + fx * s + dir * s * 0.05, y, s * 0.1, s * 0.035, 0, 0, TAU));
}

export const GRASS = hsl(172, 34, 30);

export const GRASS_LIGHT = hsl(166, 30, 44);

/** A tuft of grass blades fanning out in direction `ang`. */
export function tuft(p: Press, x: number, y: number, ang: number, s: number, ink: string) {
  const blades = p.ri(3, 5);
  for (let i = 0; i < blades; i++) {
    const a = ang + p.rr(-0.6, 0.6);
    const l = s * p.rr(0.6, 1);
    const tx = x + Math.cos(a) * l;
    const ty = y + Math.sin(a) * l;
    const nx = -Math.sin(a) * s * 0.07;
    const ny = Math.cos(a) * s * 0.07;
    const bend = p.rr(-0.3, 0.3) * l;
    fill(p, ink, (k) => {
      k.moveTo(x - nx, y - ny);
      k.quadraticCurveTo((x + tx) / 2 - Math.sin(a) * bend, (y + ty) / 2 + Math.cos(a) * bend, tx, ty);
      k.quadraticCurveTo((x + tx) / 2 - Math.sin(a) * bend + nx, (y + ty) / 2 + Math.cos(a) * bend + ny, x + nx, y + ny);
      k.closePath();
    });
  }
}

/** A tall reed with a seed head, rising from (x, y). */
export function reed(p: Press, x: number, y: number, len: number, ink: string) {
  const lean = p.rr(-0.25, 0.25);
  const tx = x + lean * len;
  const ty = y - len;
  const wd = Math.max(1.5, len * 0.018);
  fill(p, ink, (k) => {
    k.moveTo(x - wd, y);
    k.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.6, tx, ty);
    k.quadraticCurveTo(x + lean * len * 0.3 + wd, y - len * 0.6, x + wd, y);
    k.closePath();
  });
  if (p.r() < 0.6) fill(p, NAVY, (k) => k.ellipse(x + lean * len * 0.8, y - len * 0.8, wd * 1.8, len * 0.08, lean, 0, TAU));
}

/**
 * One of the two spirit koi, swimming round the pond centre on a widening arc, with a spot of the other
 * fish's colour on its head.
 */
export function koi(p: Press, cx: number, cy: number, rf: number, a0: number, body: string, spot: string) {
  const span = 2.75;
  const N = 30;
  const width = (t: number) => (t < 0.7 ? 0.05 + 0.3 * Math.sin((t / 0.7) * (Math.PI / 2)) : 0.35 - 0.12 * ((t - 0.7) / 0.3) ** 2) * rf;
  const at = (t: number) => {
    const a = a0 + span * t;
    const r = rf * (0.7 + 0.42 * t);
    return { a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), wd: width(t) };
  };
  const pts = Array.from({ length: N + 1 }, (_, i) => at(i / N));
  const head = pts[N];
  const fx = -Math.sin(head.a);
  const fy = Math.cos(head.a);
  const outline: Trace = (k) => {
    k.moveTo(pts[0].x + pts[0].nx * pts[0].wd, pts[0].y + pts[0].ny * pts[0].wd);
    for (const q of pts) k.lineTo(q.x + q.nx * q.wd, q.y + q.ny * q.wd);
    const lx = head.x + head.nx * head.wd;
    const ly = head.y + head.ny * head.wd;
    const rx = head.x - head.nx * head.wd;
    const ry = head.y - head.ny * head.wd;
    k.bezierCurveTo(lx + fx * head.wd * 1.2, ly + fy * head.wd * 1.2, rx + fx * head.wd * 1.2, ry + fy * head.wd * 1.2, rx, ry);
    for (let i = N; i >= 0; i--) k.lineTo(pts[i].x - pts[i].nx * pts[i].wd, pts[i].y - pts[i].ny * pts[i].wd);
    k.closePath();
  };
  // A long, flowing tail fin and two side fins.
  const t0 = pts[0];
  const bx = Math.sin(t0.a);
  const by = -Math.cos(t0.a);
  const L = rf * 0.55;
  const tail: Trace = (k) => {
    k.moveTo(t0.x + t0.nx * rf * 0.05, t0.y + t0.ny * rf * 0.05);
    k.quadraticCurveTo(t0.x + bx * L * 0.4 + t0.nx * L * 0.65, t0.y + by * L * 0.4 + t0.ny * L * 0.65, t0.x + bx * L + t0.nx * L * 0.45, t0.y + by * L + t0.ny * L * 0.45);
    k.quadraticCurveTo(t0.x + bx * L * 0.5, t0.y + by * L * 0.5, t0.x + bx * L - t0.nx * L * 0.45, t0.y + by * L - t0.ny * L * 0.45);
    k.quadraticCurveTo(t0.x + bx * L * 0.4 - t0.nx * L * 0.65, t0.y + by * L * 0.4 - t0.ny * L * 0.65, t0.x - t0.nx * rf * 0.05, t0.y - t0.ny * rf * 0.05);
    k.closePath();
  };
  const f = pts[Math.round(N * 0.76)];
  const fbx = Math.sin(f.a);
  const fby = -Math.cos(f.a);
  const fins: Trace = (k) => {
    for (const sgn of [-1, 1]) {
      const ox = f.x + f.nx * f.wd * sgn * 0.85;
      const oy = f.y + f.ny * f.wd * sgn * 0.85;
      const tx = ox + f.nx * sgn * rf * 0.3 + fbx * rf * 0.26;
      const ty = oy + f.ny * sgn * rf * 0.3 + fby * rf * 0.26;
      k.moveTo(ox - fbx * rf * 0.06, oy - fby * rf * 0.06);
      k.quadraticCurveTo(ox + f.nx * sgn * rf * 0.3, oy + f.ny * sgn * rf * 0.3, tx, ty);
      k.quadraticCurveTo(ox + f.nx * sgn * rf * 0.06 + fbx * rf * 0.14, oy + f.ny * sgn * rf * 0.06 + fby * rf * 0.14, ox + fbx * rf * 0.1, oy + fby * rf * 0.1);
      k.closePath();
    }
  };
  const white = body === SNOW;
  for (const part of [tail, fins, outline]) fill(p, body, part, true);
  if (white) for (const part of [tail, fins, outline]) line(p, BLACK, 1.5, part, true);
  // Fin rays and scales cut into the body.
  const cut = white ? hsl(205, 22, 78) : hsl(215, 30, 32);
  for (let i = 0; i < 5; i++) {
    const s = (i - 2) / 2;
    line(p, cut, Math.max(1, rf * 0.012), (k) => {
      k.moveTo(t0.x, t0.y);
      k.lineTo(t0.x + bx * L * 0.85 + t0.nx * L * 0.4 * s, t0.y + by * L * 0.85 + t0.ny * L * 0.4 * s);
    }, true);
  }
  for (let i = 5; i < N - 5; i += 2) {
    const q = pts[i];
    const dir = q.a + Math.PI / 2;
    for (const sgn of [-1, 1]) {
      const sx = q.x + q.nx * q.wd * 0.45 * sgn;
      const sy = q.y + q.ny * q.wd * 0.45 * sgn;
      line(p, cut, Math.max(1, rf * 0.012), (k) => k.arc(sx, sy, q.wd * 0.32, dir - 1.1, dir + 1.1), true);
    }
  }
  const sp = pts[Math.round(N * 0.82)];
  fill(p, spot, (k) => k.arc(sp.x, sp.y, sp.wd * 0.42, 0, TAU), true);
  const e = pts[N - 1];
  for (const sgn of [-1, 1]) fill(p, white ? BLACK : SNOW, (k) => k.arc(e.x + e.nx * e.wd * 0.62 * sgn, e.y + e.ny * e.wd * 0.62 * sgn, rf * 0.035, 0, TAU), true);
}

/** An ice tower with a dome, a spire or battlements on top, lit from one side. */
export function tower(p: Press, x: number, top: number, bw: number, base: number, tone: Tone, lit: number) {
  const shadeX = lit < 0 ? x + bw * 0.62 : x;
  const shadeW = bw * 0.38;
  fill(p, tone.face, (k) => k.rect(x, top, bw, base - top));
  fill(p, tone.shade, (k) => k.rect(shadeX, top, shadeW, base - top));
  const roof = p.r();
  if (roof < 0.45) {
    const dome: Trace = (k) => k.ellipse(x + bw / 2, top + 0.5, bw / 2, bw * 0.48, 0, Math.PI, TAU);
    fill(p, tone.face, dome);
    within(p, dome, () => fill(p, tone.shade, (k) => k.rect(shadeX, top - bw, shadeW, bw + 1)));
  } else if (roof < 0.8) {
    const tip = top - bw * p.rr(1, 1.9);
    fill(p, tone.face, (k) => {
      k.moveTo(x + bw * 0.12, top + 0.5);
      k.lineTo(x + bw / 2, tip);
      k.lineTo(x + bw * 0.88, top + 0.5);
      k.closePath();
    });
    fill(p, tone.shade, (k) => {
      k.moveTo(x + bw / 2, tip);
      k.lineTo(x + bw / 2 - lit * bw * 0.38, top + 0.5);
      k.lineTo(x + bw / 2, top + 0.5);
      k.closePath();
    });
  } else {
    for (let i = 0; i < 3; i++) fill(p, tone.face, (k) => k.rect(x + i * bw * 0.4, top - bw * 0.2, bw * 0.2, bw * 0.21));
  }
  const cols = bw > Math.min(p.w, p.h) * 0.09 ? 2 : 1;
  for (let wy = top + bw * 0.4; wy < base - bw * 0.3; wy += bw * p.rr(0.5, 0.7)) {
    if (p.r() < 0.3) continue;
    for (let i = 0; i < cols; i++) {
      const wx = x + bw * (cols === 1 ? 0.5 : 0.3 + i * 0.4);
      arch(p, wx, wy, bw * 0.15, bw * 0.24, p.r() < 0.14 ? hsl(44, 70, 74) : tone.window);
    }
  }
}

/** One wave of the crest along a wall top, curling over to the right. */
export function crest(p: Press, x: number, y: number, s: number, tone: Tone) {
  fill(p, tone.face, (k) => {
    k.moveTo(x, y + 1);
    k.bezierCurveTo(x, y - s * 0.55, x + s * 0.35, y - s * 0.78, x + s * 0.62, y - s * 0.62);
    k.bezierCurveTo(x + s * 0.86, y - s * 0.48, x + s * 0.8, y - s * 0.2, x + s * 0.64, y - s * 0.22);
    k.bezierCurveTo(x + s * 0.74, y - s * 0.05, x + s * 0.9, y, x + s, y + 1);
    k.closePath();
  });
  line(p, tone.shade, Math.max(1, s * 0.07), (k) => k.arc(x + s * 0.52, y - s * 0.38, s * 0.13, Math.PI * 0.7, Math.PI * 2.2));
}

/** A canoe with a paddler, cut in black with a pale wake. */
export function canoe(p: Press, x: number, y: number, len: number, dir: number) {
  for (let i = 1; i <= 3; i++)
    line(p, ICE, 1.2, (k) => {
      k.moveTo(x - dir * len * (0.5 + i * 0.12), y + i * len * 0.025);
      k.lineTo(x - dir * len * (0.15 + i * 0.05), y + i * len * 0.025);
    });
  fill(
    p,
    BLACK,
    (k) => {
      k.moveTo(x - len / 2, y - len * 0.08);
      k.quadraticCurveTo(x, y + len * 0.12, x + len / 2, y - len * 0.1);
      k.quadraticCurveTo(x, y + len * 0.02, x - len / 2, y - len * 0.08);
      k.closePath();
    },
    true,
  );
  line(p, ICE, 1.1, (k) => {
    k.moveTo(x - len * 0.45, y - len * 0.06);
    k.quadraticCurveTo(x, y + len * 0.03, x + len * 0.45, y - len * 0.08);
  });
  const px = x - dir * len * 0.05;
  fill(
    p,
    BLACK,
    (k) => {
      k.moveTo(px - len * 0.05, y);
      k.quadraticCurveTo(px - len * 0.06, y - len * 0.16, px, y - len * 0.18);
      k.quadraticCurveTo(px + len * 0.06, y - len * 0.16, px + len * 0.05, y);
      k.closePath();
      k.moveTo(px + len * 0.04, y - len * 0.23);
      k.arc(px, y - len * 0.23, len * 0.04, 0, TAU);
    },
    true,
  );
  line(
    p,
    BLACK,
    Math.max(1.2, len * 0.015),
    (k) => {
      k.moveTo(px - dir * len * 0.12, y - len * 0.22);
      k.lineTo(px + dir * len * 0.2, y + len * 0.1);
    },
    true,
  );
}
