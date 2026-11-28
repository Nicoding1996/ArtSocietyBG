import { hsl, type HSL } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import { AZURITE, GOLD, INK, JADE, type Inscribe, STONE, mist, range, tone } from './ink';

/** Earth Kingdom portraits after gongbi painting, in fine ink outlines and flat mineral colour: Toph, and King Bumi. */

const SKIN: HSL = [28, 50, 84];
const HAIR = hsl(220, 12, 12);
const OUTLINE = INK(0.75);

/** Where the sitter goes: in the middle, or to one side of a wide painting with room left for the inscription. */
function place(p: Press) {
  const { w, h } = p;
  const wide = w > h * 1.3;
  const left = p.r() < 0.5;
  return { x: wide ? w * (left ? 0.34 : 0.66) : w / 2, hy: h * 0.42, r: Math.min(h * 0.15, w * 0.2), wide, left };
}

/** Faint mountains behind the sitter. */
function backdrop(p: Press) {
  range(p, p.h * 0.62, p.h * 0.2, -10, p.w + 10, AZURITE, 0.2);
  mist(p, p.h * 0.62, p.h * 0.12);
}

/** Robe from the neck down past the bottom edge, shoulders `sw` wide each side. */
function robe(x: number, hy: number, r: number, sw: number, bottom: number): Trace {
  return (k) => {
    k.moveTo(x - r * 0.42, hy + r * 1.15);
    k.quadraticCurveTo(x - sw * 0.7, hy + r * 1.25, x - sw, hy + r * 1.9);
    k.lineTo(x - sw * 1.12, bottom);
    k.lineTo(x + sw * 1.12, bottom);
    k.lineTo(x + sw, hy + r * 1.9);
    k.quadraticCurveTo(x + sw * 0.7, hy + r * 1.25, x + r * 0.42, hy + r * 1.15);
    k.closePath();
  };
}

/** Arms down the sides of a robe: shaded beyond a seam that runs from the shoulder to the bottom edge. */
function arms(p: Press, body: Trace, x: number, hy: number, r: number, sw: number, bottom: number) {
  within(p, body, () => {
    for (const m of [-1, 1]) {
      const seam: Trace = (k) => {
        k.moveTo(x + m * sw * 0.6, hy + r * 1.3);
        k.quadraticCurveTo(x + m * sw * 0.7, hy + r * 2.4, x + m * sw * 0.8, bottom);
      };
      fill(p, 'rgba(10,20,10,0.18)', (k) => {
        seam(k);
        k.lineTo(x + m * sw * 1.4, bottom);
        k.lineTo(x + m * sw * 1.4, hy + r * 1.1);
        k.closePath();
      });
      line(p, INK(0.45), Math.max(1, r * 0.02), seam);
    }
  });
}

/** A rock hanging in the air, held there by earthbending. */
function liftedRock(p: Press, x: number, y: number, s: number) {
  const rock: Trace = (k) => {
    k.moveTo(x - s, y);
    k.lineTo(x - s * 0.5, y - s * 0.8);
    k.lineTo(x + s * 0.6, y - s * 0.7);
    k.lineTo(x + s, y + s * 0.1);
    k.lineTo(x + s * 0.3, y + s * 0.7);
    k.lineTo(x - s * 0.7, y + s * 0.5);
    k.closePath();
  };
  fill(p, tone(STONE, 0.95, 6), rock);
  within(p, rock, () =>
    line(p, INK(0.35), 1, (k) => {
      for (let i = 0; i < 5; i++) {
        const sx = x + p.rr(-0.7, 0.5) * s;
        const sy = y + p.rr(-0.5, 0.3) * s;
        k.moveTo(sx, sy);
        k.lineTo(sx + s * 0.2, sy + s * 0.3);
      }
    }),
  );
  line(p, OUTLINE, 1.2, rock);
  fill(p, tone(STONE, 1, -10), (k) => {
    for (let i = 0; i < 4; i++) {
      const gx = x + p.rr(-0.6, 0.6) * s;
      const gy = y + s * p.rr(0.9, 2);
      const gr = Math.max(0.8, s * 0.06);
      k.moveTo(gx + gr, gy);
      k.arc(gx, gy, gr, 0, TAU);
    }
  });
}

/** An eye: an almond of white, the iris clipped inside it, the upper lid in a firm line. */
function eye(p: Press, ex: number, ey: number, r: number, iris: string, pupil: boolean, look = 0) {
  const shape: Trace = (k) => {
    k.moveTo(ex - r, ey);
    k.quadraticCurveTo(ex, ey - r * 0.72, ex + r, ey);
    k.quadraticCurveTo(ex, ey + r * 0.48, ex - r, ey);
    k.closePath();
  };
  fill(p, hsl(40, 30, 96), shape);
  within(p, shape, () => {
    fill(p, iris, (k) => k.arc(ex + look * r * 0.2, ey - r * 0.02, r * 0.42, 0, TAU));
    if (pupil) fill(p, INK(0.9), (k) => k.arc(ex + look * r * 0.2, ey - r * 0.02, r * 0.18, 0, TAU));
  });
  line(p, OUTLINE, Math.max(1.2, r * 0.14), (k) => {
    k.moveTo(ex - r * 1.05, ey + r * 0.04);
    k.quadraticCurveTo(ex, ey - r * 0.76, ex + r * 1.05, ey);
  });
  line(p, INK(0.35), Math.max(0.8, r * 0.05), (k) => {
    k.moveTo(ex - r * 0.8, ey + r * 0.12);
    k.quadraticCurveTo(ex, ey + r * 0.5, ex + r * 0.9, ey + r * 0.06);
  });
}

/** A soft flush on the cheek. */
function blush(p: Press, x: number, y: number, r: number) {
  const g = p.c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(230,120,110,0.3)');
  g.addColorStop(1, 'rgba(230,120,110,0)');
  fill(p, g, (k) => k.arc(x, y, r, 0, TAU));
}

/** Toph Beifong at twelve: black hair in a bun with her green band, a thick fringe, pale unseeing eyes and a smirk. */
export function toph(p: Press): Inscribe {
  const { w, h } = p;
  const { x, hy, r, wide, left } = place(p);
  backdrop(p);
  // Rocks she is holding up, off to one side.
  if (wide) for (let i = 0; i < 3; i++) liftedRock(p, w * (left ? 0.62 : 0.38) + (i - 1) * r * 1.4, h * (0.3 + (i % 2) * 0.22), r * (0.35 + i * 0.08));
  else liftedRock(p, x + (left ? 1 : -1) * r * 2.1, h * 0.2, r * 0.3);
  // Hair behind the head, with the bun on top.
  fill(p, HAIR, (k) => {
    k.ellipse(x, hy - r * 0.1, r * 1.1, r * 1.08, 0, 0, TAU);
    k.moveTo(x + r * 0.4, hy - r * 1.2);
    k.arc(x, hy - r * 1.2, r * 0.4, 0, TAU);
  });
  // Neck and the green tunic, its collar open in a V with the pale trim.
  fill(p, tone(SKIN, 1, -8), (k) => k.rect(x - r * 0.28, hy + r * 0.6, r * 0.56, r * 0.75));
  const tunic = robe(x, hy, r, r * 2.1, h + 4);
  fill(p, hsl(128, 28, 44), tunic);
  fill(p, hsl(140, 30, 24), (k) => {
    k.moveTo(x - r * 0.42, hy + r * 1.18);
    k.lineTo(x, hy + r * 2.1);
    k.lineTo(x + r * 0.42, hy + r * 1.18);
    k.closePath();
  });
  line(p, hsl(48, 52, 72), r * 0.16, (k) => {
    k.moveTo(x - r * 0.52, hy + r * 1.14);
    k.lineTo(x, hy + r * 2.16);
    k.lineTo(x + r * 0.52, hy + r * 1.14);
  });
  arms(p, tunic, x, hy, r, r * 2.1, h + 4);
  // Her dark sash, where the painting is tall enough to show it.
  within(p, tunic, () => fill(p, hsl(140, 30, 22), (k) => k.rect(x - r * 3, hy + r * 3.3, r * 6, r * 0.38)));
  line(p, OUTLINE, Math.max(1, r * 0.025), tunic);
  // The face.
  const face: Trace = (k) => k.ellipse(x, hy, r * 0.8, r * 0.95, 0, 0, TAU);
  fill(p, tone(SKIN), face);
  line(p, OUTLINE, Math.max(1, r * 0.022), face);
  blush(p, x - r * 0.46, hy + r * 0.36, r * 0.24);
  blush(p, x + r * 0.46, hy + r * 0.36, r * 0.24);
  const look = p.rr(-0.6, 0.6);
  for (const m of [-1, 1]) eye(p, x + m * r * 0.35, hy + r * 0.1, r * 0.19, hsl(110, 10, 78), false, look);
  line(p, INK(0.5), Math.max(1, r * 0.02), (k) => {
    k.moveTo(x - r * 0.02, hy + r * 0.26);
    k.quadraticCurveTo(x + r * 0.07, hy + r * 0.36, x - r * 0.04, hy + r * 0.39);
  });
  const smirk = p.r() < 0.5 ? 1 : -1;
  line(p, hsl(356, 42, 48), Math.max(1.2, r * 0.035), (k) => {
    k.moveTo(x - smirk * r * 0.18, hy + r * 0.57);
    k.quadraticCurveTo(x + smirk * r * 0.02, hy + r * 0.61, x + smirk * r * 0.22, hy + r * 0.49);
  });
  // The fringe, in locks that end in points just over her eyes, and long locks either side of the face.
  fill(p, HAIR, (k) => {
    k.moveTo(x - r * 0.88, hy + r * 0.05);
    k.bezierCurveTo(x - r * 0.95, hy - r * 0.95, x + r * 0.95, hy - r * 0.95, x + r * 0.88, hy + r * 0.05);
    const n = 9;
    for (let i = 1; i < n; i++) {
      const ex = x + r * 0.88 - (r * 1.76 * i) / n;
      k.lineTo(ex, i % 2 ? hy - r * (0.06 + p.rr(0, 0.08)) : hy - r * (0.3 + p.rr(0, 0.08)));
    }
    k.closePath();
  });
  for (const m of [-1, 1])
    fill(p, HAIR, (k) => {
      k.moveTo(x + m * r * 0.96, hy - r * 0.3);
      k.quadraticCurveTo(x + m * r * 1.02, hy + r * 0.4, x + m * r * 0.78, hy + r * 0.9);
      k.quadraticCurveTo(x + m * r * 0.8, hy + r * 0.3, x + m * r * 0.7, hy - r * 0.2);
      k.closePath();
    });
  line(p, 'rgba(160,170,190,0.35)', Math.max(1, r * 0.015), (k) => {
    for (let i = 0; i < 6; i++) {
      const sx = x + p.rr(-0.6, 0.6) * r;
      k.moveTo(sx, hy - r * 0.82);
      k.quadraticCurveTo(sx + r * 0.05, hy - r * 0.55, sx - r * 0.02, hy - r * 0.3);
    }
  });
  // Her headband across the top of the head, and the balls at either side of the bun.
  line(p, hsl(96, 34, 62), r * 0.13, (k) => {
    k.moveTo(x - r * 0.72, hy - r * 0.72);
    k.quadraticCurveTo(x, hy - r * 1.12, x + r * 0.72, hy - r * 0.72);
  });
  fill(p, hsl(48, 70, 62), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.48 + r * 0.12, hy - r * 1.02);
      k.arc(x + m * r * 0.48, hy - r * 1.02, r * 0.12, 0, TAU);
    }
  });
  return { side: wide ? (left ? 'right' : 'left') : left ? 'left' : 'right' };
}

/** King Bumi laughing: wild white hair under a small crown, eyebrows like horns, one big eye, and a single tooth. */
export function bumi(p: Press): Inscribe {
  const { w, h } = p;
  const { x, hy, r, wide, left } = place(p);
  backdrop(p);
  if (wide) for (let i = 0; i < 2; i++) liftedRock(p, w * (left ? 0.64 : 0.36) + (i - 0.5) * r * 1.8, h * (0.3 + i * 0.2), r * (0.5 + i * 0.25));
  // The round back of his throne, green with a gold rim.
  const ty = hy + r * 0.4;
  const tr = r * 2.3;
  fill(p, tone(JADE, 0.95, 6), (k) => k.arc(x, ty, tr, 0, TAU));
  line(p, GOLD, r * 0.12, (k) => k.arc(x, ty, tr, 0, TAU));
  line(p, GOLD, Math.max(1, r * 0.04), (k) => k.arc(x, ty, tr * 0.86, 0, TAU));
  // His robe: dark green with a gold collar over a lighter undershirt.
  const body = robe(x, hy, r, r * 2.3, h + 4);
  fill(p, hsl(142, 32, 30), body);
  fill(p, hsl(110, 30, 56), (k) => {
    k.moveTo(x - r * 0.5, hy + r * 1.15);
    k.lineTo(x, hy + r * 2);
    k.lineTo(x + r * 0.5, hy + r * 1.15);
    k.closePath();
  });
  line(p, GOLD, r * 0.2, (k) => {
    k.moveTo(x - r * 0.62, hy + r * 1.1);
    k.lineTo(x, hy + r * 2.08);
    k.lineTo(x + r * 0.62, hy + r * 1.1);
  });
  arms(p, body, x, hy, r, r * 2.3, h + 4);
  line(p, OUTLINE, Math.max(1, r * 0.025), body);
  fill(p, tone(SKIN, 1, -10), (k) => k.rect(x - r * 0.3, hy + r * 0.7, r * 0.6, r * 0.6));
  // White hair in wild locks out from the top and sides of his head.
  const locks = 11;
  fill(p, hsl(40, 14, 94), (k) => {
    for (let i = 0; i < locks; i++) {
      const a = Math.PI + 0.15 + (i / (locks - 1)) * (Math.PI - 0.3);
      const bx = x + Math.cos(a) * r * 0.7;
      const by = hy - r * 0.2 + Math.sin(a) * r * 0.75;
      const len = r * p.rr(0.55, 0.9);
      const tx = bx + Math.cos(a + p.rr(-0.25, 0.25)) * len;
      const ty2 = by + Math.sin(a) * len;
      const nx = -Math.sin(a) * r * 0.2;
      const ny = Math.cos(a) * r * 0.2;
      k.moveTo(bx - nx, by - ny);
      k.quadraticCurveTo(bx + (tx - bx) * 0.5 - nx * 0.6, by + (ty2 - by) * 0.4 - ny * 0.6, tx, ty2);
      k.quadraticCurveTo(bx + (tx - bx) * 0.5 + nx * 0.6, by + (ty2 - by) * 0.5 + ny * 0.6, bx + nx, by + ny);
      k.closePath();
    }
    k.ellipse(x, hy - r * 0.35, r * 0.85, r * 0.7, 0, 0, TAU);
  });
  // A small gold crown with three points.
  const crown: Trace = (k) => {
    const cy = hy - r * 1.02;
    k.moveTo(x - r * 0.3, cy);
    k.lineTo(x - r * 0.32, cy - r * 0.3);
    k.lineTo(x - r * 0.16, cy - r * 0.14);
    k.lineTo(x, cy - r * 0.38);
    k.lineTo(x + r * 0.16, cy - r * 0.14);
    k.lineTo(x + r * 0.32, cy - r * 0.3);
    k.lineTo(x + r * 0.3, cy);
    k.closePath();
  };
  fill(p, GOLD, crown);
  line(p, OUTLINE, Math.max(1, r * 0.02), crown);
  fill(p, hsl(150, 50, 40), (k) => k.arc(x, hy - r * 1.12, r * 0.05, 0, TAU));
  // Big ears, then the long face.
  for (const m of [-1, 1]) {
    const ear: Trace = (k) => k.ellipse(x + m * r * 0.8, hy + r * 0.12, r * 0.2, r * 0.3, m * 0.25, 0, TAU);
    fill(p, tone(SKIN, 1, -4), ear);
    line(p, OUTLINE, Math.max(1, r * 0.02), ear);
  }
  const face: Trace = (k) => {
    k.moveTo(x - r * 0.72, hy - r * 0.3);
    k.bezierCurveTo(x - r * 0.72, hy - r * 1.05, x + r * 0.72, hy - r * 1.05, x + r * 0.72, hy - r * 0.3);
    k.bezierCurveTo(x + r * 0.78, hy + r * 0.5, x + r * 0.45, hy + r * 1.05, x, hy + r * 1.05);
    k.bezierCurveTo(x - r * 0.45, hy + r * 1.05, x - r * 0.78, hy + r * 0.5, x - r * 0.72, hy - r * 0.3);
    k.closePath();
  };
  fill(p, tone(SKIN, 1, -2), face);
  line(p, OUTLINE, Math.max(1, r * 0.022), face);
  // Wrinkles across the brow and round the mouth.
  line(p, INK(0.4), Math.max(0.8, r * 0.016), (k) => {
    for (let i = 0; i < 3; i++) {
      const y = hy - r * (0.62 - i * 0.1);
      k.moveTo(x - r * 0.34, y);
      k.quadraticCurveTo(x, y - r * 0.06, x + r * 0.34, y);
    }
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.22, hy + r * 0.2);
      k.quadraticCurveTo(x + m * r * 0.5, hy + r * 0.45, x + m * r * 0.45, hy + r * 0.78);
      k.moveTo(x + m * r * 0.55, hy - r * 0.12);
      k.lineTo(x + m * r * 0.66, hy - r * 0.18);
      k.moveTo(x + m * r * 0.55, hy - r * 0.04);
      k.lineTo(x + m * r * 0.67, hy - r * 0.04);
    }
  });
  // One eye wide open, the other screwed up with laughing.
  const big = p.r() < 0.5 ? -1 : 1;
  eye(p, x + big * r * 0.3, hy - r * 0.1, r * 0.17, hsl(30, 30, 40), true);
  line(p, OUTLINE, Math.max(1.2, r * 0.03), (k) => {
    k.moveTo(x - big * r * 0.44, hy - r * 0.08);
    k.quadraticCurveTo(x - big * r * 0.3, hy - r * 0.18, x - big * r * 0.16, hy - r * 0.08);
  });
  // Eyebrows like white horns.
  fill(p, hsl(40, 14, 94), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.17, hy - r * 0.26);
      k.quadraticCurveTo(x + m * r * 0.5, hy - r * 0.44, x + m * r * 1.05, hy - r * 0.95);
      k.quadraticCurveTo(x + m * r * 0.6, hy - r * 0.3, x + m * r * 0.18, hy - r * 0.16);
      k.closePath();
    }
  });
  line(p, INK(0.45), Math.max(0.8, r * 0.015), (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * r * 0.17, hy - r * 0.26);
      k.quadraticCurveTo(x + m * r * 0.5, hy - r * 0.44, x + m * r * 1.05, hy - r * 0.95);
    }
  });
  // The long nose, and the grin with its one tooth.
  line(p, INK(0.55), Math.max(1, r * 0.02), (k) => {
    k.moveTo(x - r * 0.04, hy - r * 0.08);
    k.quadraticCurveTo(x - r * 0.06, hy + r * 0.25, x + r * 0.04, hy + r * 0.36);
    k.quadraticCurveTo(x + r * 0.14, hy + r * 0.38, x + r * 0.12, hy + r * 0.3);
  });
  const grin: Trace = (k) => {
    k.moveTo(x - r * 0.42, hy + r * 0.5);
    k.quadraticCurveTo(x, hy + r * 0.6, x + r * 0.42, hy + r * 0.5);
    k.quadraticCurveTo(x, hy + r * 0.95, x - r * 0.42, hy + r * 0.5);
    k.closePath();
  };
  fill(p, hsl(350, 40, 22), grin);
  fill(p, hsl(40, 30, 92), (k) => k.rect(x - big * r * 0.1 - r * 0.05, hy + r * 0.62, r * 0.1, r * 0.1));
  line(p, OUTLINE, Math.max(1, r * 0.022), grin);
  return { side: wide ? (left ? 'right' : 'left') : left ? 'left' : 'right' };
}
