import { hsl } from '../common';
import { type Trace, TAU, BLACK, NAVY, BLUE, SNOW, type Press, fill, line, within } from './print';
import { BEAK, SNOW_SHADE, penguin, ridge } from './water-motifs';

/** Creatures of the poles: a polar bear dog, otter penguins sledding and turtle seals on the floes. */

const SEAL = hsl(210, 12, 34);
const SEAL_LIGHT = hsl(210, 12, 50);
const SHELL = hsl(32, 34, 40);
const SHELL_LINE = hsl(28, 34, 26);

/** Snowfield under a pale sky, with ridges on the horizon. Returns the horizon's height. */
function polarDay(p: Press, at = 0.5): number {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * at;
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(204, 46, 62));
  sky.addColorStop(1, hsl(198, 38, 88));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  ridge(p, horizon, u, hsl(203, 30, 76));
  fill(p, SNOW, (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  for (let i = 0; i < 5; i++) {
    const dy = horizon + (h - horizon) * p.rr(0.05, 0.95);
    fill(p, SNOW_SHADE, (k) => k.ellipse(p.rr(0, w), dy, w * p.rr(0.2, 0.45), u * p.rr(0.008, 0.02), 0, 0, TAU));
  }
  return horizon;
}

/** A polar bear dog standing in the snow, side on, with a blue saddle blanket. */
export function polarBearDog(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  // A dusk sky and blue snow, so the white animal stands out.
  const horizon = h * p.rr(0.42, 0.5);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(216, 46, 34));
  sky.addColorStop(1, hsl(205, 40, 62));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  ridge(p, horizon, u, hsl(210, 30, 48));
  fill(p, hsl(206, 34, 74), (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  for (let i = 0; i < 5; i++) {
    const dy = horizon + (h - horizon) * p.rr(0.05, 0.95);
    fill(p, hsl(208, 34, 66), (k) => k.ellipse(p.rr(0, w), dy, w * p.rr(0.2, 0.45), u * p.rr(0.008, 0.02), 0, 0, TAU));
  }
  const f = p.r() < 0.5 ? 1 : -1;
  const s = Math.min(w * 0.36, h * 0.42);
  const x = w / 2 - f * s * 0.1;
  const ground = h * 0.86;
  const X = (dx: number) => x + f * dx * s;
  fill(p, hsl(210, 34, 58), (k) => k.ellipse(x, ground, s * 1.1, s * 0.08, 0, 0, TAU));
  // Legs, then body and neck, then the head.
  const legs: Trace = (k) => {
    for (const lx of [-0.7, -0.42, 0.32, 0.6]) {
      k.moveTo(X(lx) - s * 0.11, ground - s * 0.62);
      k.lineTo(X(lx) + s * 0.11, ground - s * 0.62);
      k.lineTo(X(lx) + s * 0.1, ground - s * 0.04);
      k.quadraticCurveTo(X(lx) + s * 0.14, ground, X(lx), ground);
      k.quadraticCurveTo(X(lx) - s * 0.14, ground, X(lx) - s * 0.1, ground - s * 0.04);
      k.closePath();
    }
  };
  const body: Trace = (k) => {
    k.ellipse(x, ground - s * 0.72, s * 0.9, s * 0.36, 0, 0, TAU);
    k.moveTo(X(0.55), ground - s * 0.95);
    k.quadraticCurveTo(X(0.85), ground - s * 1.2, X(0.95), ground - s * 1.05);
    k.lineTo(X(0.9), ground - s * 0.55);
    k.closePath();
  };
  const headShape: Trace = (k) => {
    k.ellipse(X(1.05), ground - s * 1.12, s * 0.28, s * 0.23, 0, 0, TAU);
    k.ellipse(X(1.3), ground - s * 1.05, s * 0.2, s * 0.13, f * 0.1, 0, TAU);
  };
  const ears: Trace = (k) => {
    for (const ex of [0.92, 1.1]) {
      k.moveTo(X(ex) + s * 0.08, ground - s * 1.33);
      k.ellipse(X(ex), ground - s * 1.33, s * 0.08, s * 0.1, 0, 0, TAU);
    }
  };
  // Outline everything first, then fill on top, so only the outer silhouette keeps a black edge.
  const parts = [legs, body, headShape, ears];
  for (const part of parts) line(p, BLACK, Math.max(2.5, s * 0.025), part, true);
  for (const part of parts) fill(p, SNOW, part, true);
  // Shade under the belly and on the far legs.
  within(
    p,
    body,
    () => fill(p, hsl(205, 30, 80), (k) => k.ellipse(x, ground - s * 0.45, s * 0.95, s * 0.2, 0, 0, TAU), true),
    true,
  );
  within(
    p,
    legs,
    () => fill(p, hsl(205, 30, 80), (k) => k.rect(Math.min(X(-0.45), X(0.6)) - s * 0.1, ground - s * 0.6, s * 0.2, s * 0.6), true),
    true,
  );
  fill(p, BLACK, (k) => k.ellipse(X(1.48), ground - s * 1.08, s * 0.05, s * 0.04, 0, 0, TAU), true);
  fill(p, BLACK, (k) => k.ellipse(X(1.12), ground - s * 1.18, s * 0.035, s * 0.028, 0, 0, TAU), true);
  line(
    p,
    BLACK,
    1.4,
    (k) => {
      k.moveTo(X(1.46), ground - s * 0.98);
      k.quadraticCurveTo(X(1.35), ground - s * 0.92, X(1.2), ground - s * 0.96);
    },
    true,
  );
  // The saddle blanket and its straps.
  const blanket: Trace = (k) => k.roundRect(x - s * 0.35, ground - s * 1.1, s * 0.7, s * 0.4, s * 0.06);
  fill(p, BLUE, blanket);
  within(p, blanket, () => fill(p, SNOW, (k) => k.rect(x - s * 0.35, ground - s * 0.8, s * 0.7, s * 0.05)));
  line(p, NAVY, Math.max(1.4, s * 0.03), (k) => {
    k.moveTo(x - s * 0.1, ground - s * 0.72);
    k.lineTo(x - s * 0.12, ground - s * 0.38);
  });
  for (let i = 0; i < 24; i++) {
    const fx = x + p.rr(-0.8, 0.8) * s;
    const fy = ground - s * p.rr(0.5, 0.95);
    line(p, hsl(205, 26, 80), 1.1, (k) => {
      k.moveTo(fx, fy);
      k.lineTo(fx - f * s * 0.04, fy + s * 0.05);
    });
  }
  // A stubby tail.
  line(p, BLACK, Math.max(2.5, s * 0.025), (k) => k.arc(X(-0.92), ground - s * 0.82, s * 0.06, 0, TAU), true);
  fill(p, SNOW, (k) => k.arc(X(-0.92), ground - s * 0.82, s * 0.06, 0, TAU), true);
}

/** Otter penguins sliding down a long snow slope on their bellies. */
export function penguinSledding(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  polarDay(p, 0.34);
  const dir = p.r() < 0.5 ? 1 : -1;
  // The slope: high on one side, running down across the picture.
  const yTop = h * 0.42;
  const yBot = h * 0.9;
  const slopeY = (x: number) => (dir > 0 ? yTop + ((yBot - yTop) * x) / w : yBot - ((yBot - yTop) * x) / w);
  fill(p, hsl(204, 34, 84), (k) => {
    k.moveTo(-4, slopeY(-4));
    k.lineTo(w + 4, slopeY(w + 4));
    k.lineTo(w + 4, h + 4);
    k.lineTo(-4, h + 4);
    k.closePath();
  });
  fill(p, SNOW, (k) => {
    k.moveTo(-4, slopeY(-4) + u * 0.02);
    k.lineTo(w + 4, slopeY(w + 4) + u * 0.02);
    k.lineTo(w + 4, h + 4);
    k.lineTo(-4, h + 4);
    k.closePath();
  });
  const ang = Math.atan2(slopeY(w) - slopeY(0), w);
  const n = Math.max(3, Math.round((w / u) * 2.5));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6) / (n + 0.4);
    const px = dir > 0 ? t * w : w - t * w;
    const py = slopeY(px) + u * 0.01;
    slider(p, px, py, u * p.rr(0.08, 0.11), ang, dir);
  }
  // One still waiting its turn at the top.
  const tx = dir > 0 ? u * 0.08 : w - u * 0.08;
  penguin(p, tx, slopeY(tx) + u * 0.015, u * 0.1, dir);
}

/** A penguin lying on its belly along the slope, flippers back, with speed lines behind it. */
function slider(p: Press, x: number, y: number, s: number, ang: number, dir: number) {
  const c = p.c;
  for (let i = 0; i < 3; i++) {
    const off = s * (0.6 + i * 0.25);
    line(p, hsl(204, 30, 72), 1.2, (k) => {
      k.moveTo(x - Math.cos(ang) * off - Math.sin(ang) * s * (0.05 - i * 0.12), y - Math.sin(ang) * off - s * (0.1 + i * 0.08));
      k.lineTo(x - Math.cos(ang) * (off + s * 0.5), y - Math.sin(ang) * (off + s * 0.5) - s * (0.1 + i * 0.08));
    });
  }
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(dir, 1);
  fill(p, BLACK, (k) => k.ellipse(0, -s * 0.18, s * 0.55, s * 0.2, 0, 0, TAU), true);
  fill(p, SNOW, (k) => k.ellipse(s * 0.05, -s * 0.08, s * 0.42, s * 0.1, 0, 0, TAU));
  fill(p, BLACK, (k) => k.arc(s * 0.5, -s * 0.26, s * 0.16, 0, TAU), true);
  fill(p, SNOW, (k) => k.arc(s * 0.56, -s * 0.3, s * 0.04, 0, TAU), true);
  fill(p, BEAK, (k) => {
    k.moveTo(s * 0.64, -s * 0.28);
    k.lineTo(s * 0.8, -s * 0.24);
    k.lineTo(s * 0.64, -s * 0.2);
    k.closePath();
  });
  fill(p, BLACK, (k) => k.ellipse(-s * 0.1, -s * 0.32, s * 0.25, s * 0.05, -0.2, 0, TAU), true);
  fill(p, BEAK, (k) => {
    k.ellipse(-s * 0.58, -s * 0.16, s * 0.08, s * 0.035, 0, 0, TAU);
    k.ellipse(-s * 0.6, -s * 0.24, s * 0.08, s * 0.035, 0, 0, TAU);
  });
  c.restore();
}

/** Turtle seals basking on floes in a dark sea. */
export function turtleSeals(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const horizon = h * p.rr(0.3, 0.38);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, hsl(205, 44, 60));
  sky.addColorStop(1, hsl(198, 36, 86));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 4));
  ridge(p, horizon, u, hsl(203, 30, 76));
  fill(p, NAVY, (k) => k.rect(-4, horizon, w + 8, h - horizon + 4));
  for (let i = 0; i < 30 * p.detail; i++) {
    const rx = p.rr(0, w);
    const ry = p.rr(horizon + 4, h);
    const rl = u * p.rr(0.02, 0.06);
    line(p, BLUE, p.rr(1, 1.6), (k) => {
      k.moveTo(rx - rl, ry);
      k.quadraticCurveTo(rx, ry - rl * 0.3, rx + rl, ry);
    });
  }
  const floes = Math.max(2, Math.round((w / u) * 1.4));
  for (let i = 0; i < floes; i++) {
    const fx = w * ((i + 0.5) / floes + p.rr(-0.06, 0.06));
    const fy = horizon + (h - horizon) * p.rr(0.35, 0.75);
    const fw = (w / floes) * p.rr(0.75, 0.95);
    const fh = u * p.rr(0.06, 0.1);
    fill(p, hsl(196, 40, 52), (k) => k.ellipse(fx, fy + fh * 0.4, fw * 0.5, fh * 0.6, 0, 0, Math.PI));
    const top: Trace = (k) => {
      k.moveTo(fx - fw / 2, fy);
      k.lineTo(fx - fw * 0.42, fy - fh * 0.4);
      k.lineTo(fx + fw * 0.4, fy - fh * 0.45);
      k.lineTo(fx + fw / 2, fy);
      k.lineTo(fx + fw * 0.45, fy + fh * 0.4);
      k.lineTo(fx - fw * 0.44, fy + fh * 0.4);
      k.closePath();
    };
    fill(p, SNOW, top);
    const n = p.ri(1, 3);
    for (let j = 0; j < n; j++) seal(p, fx + (j - (n - 1) / 2) * fw * 0.3, fy + fh * 0.05, u * p.rr(0.09, 0.12), p.r() < 0.5 ? 1 : -1);
  }
}

/** A turtle seal: a plump grey seal wearing a domed shell with plates cut into it. */
function seal(p: Press, x: number, y: number, s: number, dir: number) {
  const X = (dx: number) => x + dir * dx * s;
  fill(
    p,
    SEAL,
    (k) => {
      k.moveTo(X(-0.7), y);
      k.quadraticCurveTo(X(-0.75), y - s * 0.12, X(-0.95), y - s * 0.18);
      k.quadraticCurveTo(X(-0.7), y - s * 0.3, X(-0.4), y - s * 0.32);
      k.quadraticCurveTo(X(0.3), y - s * 0.5, X(0.55), y - s * 0.55);
      k.quadraticCurveTo(X(0.8), y - s * 0.55, X(0.75), y - s * 0.3);
      k.quadraticCurveTo(X(0.6), y, X(0.3), y);
      k.closePath();
    },
    true,
  );
  fill(p, SEAL_LIGHT, (k) => k.ellipse(X(0.15), y - s * 0.08, s * 0.4, s * 0.07, 0, 0, TAU));
  const shell: Trace = (k) => k.ellipse(X(-0.1), y - s * 0.32, s * 0.42, s * 0.2, 0, Math.PI, TAU);
  fill(p, SHELL, shell);
  within(p, shell, () => {
    for (let i = -2; i <= 2; i++)
      line(p, SHELL_LINE, Math.max(1, s * 0.03), (k) => {
        k.moveTo(X(-0.1 + i * 0.16), y - s * 0.32);
        k.lineTo(X(-0.1 + i * 0.12), y - s * 0.55);
      });
    line(p, SHELL_LINE, Math.max(1, s * 0.03), (k) => k.ellipse(X(-0.1), y - s * 0.32, s * 0.3, s * 0.11, 0, Math.PI, TAU));
  });
  fill(p, BLACK, (k) => k.arc(X(0.6), y - s * 0.44, s * 0.035, 0, TAU), true);
  fill(p, BLACK, (k) => k.arc(X(0.77), y - s * 0.38, s * 0.025, 0, TAU), true);
}
