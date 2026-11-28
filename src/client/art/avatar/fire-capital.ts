import { hsl } from '../common';
import { type Trace, TAU, type Press, fill, fireMark, line, within } from './print';
import { ASH, CRIMSON, GOLDLEAF, INDIGO, KEY, SAFFRON, VERMILION, block, bokashi, fireHall, fireRoof, flame, kasumi, sea, sun, tint, washiInk } from './woodblock';

/** The Fire Nation capital and the royal family's places: the palace, the pond, Ember Island, the courtyard. */

const STONE_FLOOR = hsl(30, 10, 66);

/** The capital in its crater: roofs climbing the far slope to the palace, the dark rim in front, the harbour below. */
export function fireCapital(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.55, hsl(14, 72, 58), hsl(36, 80, 82, 0));
  sun(p, w * (p.r() < 0.5 ? 0.18 : 0.82), h * 0.17, u * 0.07, hsl(6, 72, 50, 0.9));
  const l = w * 0.28;
  const r = w * 0.72;
  // The far inner slope of the crater, with the city on it and the palace at the top.
  block(p, tint(ASH, 1, 28), (k) => {
    k.moveTo(l - w * 0.1, h * 0.64);
    k.lineTo(l - w * 0.1, h * 0.46);
    k.quadraticCurveTo(w * 0.5, h * 0.24, r + w * 0.1, h * 0.46);
    k.lineTo(r + w * 0.1, h * 0.64);
    k.closePath();
  });
  for (let row = 0; row < 4; row++) {
    const y = h * (0.5 - row * 0.045);
    const n = Math.max(3, Math.round(((r - l) / u) * (7 - row)));
    for (let i = 0; i < n; i++) {
      const x = l + ((r - l) * (i + 0.5)) / n + p.rr(-0.2, 0.2) * ((r - l) / n);
      if (Math.abs(x - w / 2) < u * 0.16 && row > 1) continue;
      fireRoof(p, x, y, u * 0.08, u * 0.025);
    }
  }
  fireHall(p, w / 2, h * 0.46, u * 0.28, u * 0.24, 3);
  // The rim in front: dark rock up to both edges, its lip low across the middle.
  const rim: Trace = (k) => {
    k.moveTo(-4, h * 0.82);
    k.lineTo(-4, h * 0.3);
    k.quadraticCurveTo(w * 0.12, h * 0.26, l, h * 0.48);
    k.quadraticCurveTo(w * 0.5, h * 0.55, r, h * 0.48);
    k.quadraticCurveTo(w * 0.88, h * 0.26, w + 4, h * 0.3);
    k.lineTo(w + 4, h * 0.82);
    k.closePath();
  };
  const g = p.c.createLinearGradient(0, h * 0.26, 0, h * 0.82);
  g.addColorStop(0, tint(ASH, 1, -18));
  g.addColorStop(1, tint(ASH, 1, 4));
  fill(p, g, rim);
  within(p, rim, () =>
    line(p, 'rgba(0,0,0,0.3)', 1.2, (k) => {
      for (let i = 0; i < 26; i++) {
        const x = p.rr(0, w);
        k.moveTo(x, h * 0.3);
        k.quadraticCurveTo(x + p.rr(-0.05, 0.05) * w, h * 0.55, x + p.rr(-0.08, 0.08) * w, h * 0.82);
      }
    }),
  );
  line(p, KEY, 1.6, rim);
  kasumi(p, -w * 0.05, w * 0.45, h * 0.62, h * 0.05);
  kasumi(p, w * 0.55, w * 1.05, h * 0.7, h * 0.045);
  // The harbour: a red sea wall with gate towers, ships at anchor, and the sea.
  const wall = h * 0.8;
  block(p, VERMILION, (k) => k.rect(-4, wall - h * 0.04, w + 8, h * 0.04), 1.2);
  for (const t of [0.2, 0.5, 0.8]) fireRoof(p, w * t, wall - h * 0.04, u * 0.12, u * 0.04);
  sea(p, wall);
  for (let i = 0; i < 3; i++) ship(p, w * p.rr(0.1, 0.9), wall + (h - wall) * p.rr(0.35, 0.7), u * p.rr(0.08, 0.12));
}

/** A small Fire Navy ship: a dark hull, a funnel and a red pennant. */
function ship(p: Press, x: number, y: number, s: number) {
  block(p, hsl(220, 10, 22), (k) => {
    k.moveTo(x - s, y - s * 0.15);
    k.lineTo(x + s, y - s * 0.2);
    k.lineTo(x + s * 0.8, y + s * 0.1);
    k.lineTo(x - s * 0.85, y + s * 0.1);
    k.closePath();
  }, 1);
  block(p, hsl(220, 8, 30), (k) => k.rect(x - s * 0.1, y - s * 0.6, s * 0.2, s * 0.42), 1);
  fill(p, VERMILION, (k) => {
    k.moveTo(x, y - s * 0.6);
    k.lineTo(x + s * 0.4, y - s * 0.52);
    k.lineTo(x, y - s * 0.44);
    k.closePath();
  });
}

/** The throne room: dark pillars, a long red carpet, and the wall of flame before an empty throne. */
export function throneRoom(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  fill(p, hsl(352, 30, 9), (k) => k.rect(-4, -4, w + 8, h + 8));
  const dais = h * 0.6;
  const glow = c.createRadialGradient(w / 2, dais, 0, w / 2, dais, Math.max(w, h) * 0.7);
  glow.addColorStop(0, 'rgba(255,170,60,0.7)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  fill(p, glow, (k) => k.rect(-4, -4, w + 8, h + 8));
  // The throne high on its steps, a dark seat with a back shaped like a flame.
  block(p, hsl(352, 30, 16), (k) => {
    for (let i = 0; i < 4; i++) k.rect(w / 2 - u * (0.5 - i * 0.08), dais - h * (0.05 + i * 0.05), u * (1 - i * 0.16), h * 0.05);
  }, 1);
  line(p, GOLDLEAF, Math.max(1, u * 0.005), (k) => {
    for (let i = 0; i < 4; i++) {
      const y = dais - h * (0.05 + i * 0.05);
      k.moveTo(w / 2 - u * (0.5 - i * 0.08), y);
      k.lineTo(w / 2 + u * (0.5 - i * 0.08), y);
    }
  });
  const ty = dais - h * 0.2;
  block(p, KEY, (k) => {
    k.moveTo(w / 2 - u * 0.09, ty);
    k.lineTo(w / 2 - u * 0.1, ty - u * 0.14);
    k.quadraticCurveTo(w / 2 - u * 0.05, ty - u * 0.2, w / 2, ty - u * 0.3);
    k.quadraticCurveTo(w / 2 + u * 0.05, ty - u * 0.2, w / 2 + u * 0.1, ty - u * 0.14);
    k.lineTo(w / 2 + u * 0.09, ty);
    k.closePath();
  }, 1);
  fireMark(p, w / 2, ty - u * 0.13, u * 0.05, GOLDLEAF);
  // Pillars down both sides, larger nearer.
  for (const m of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const px = w / 2 + m * w * (0.3 + i * 0.09);
      const pw = u * (0.05 + i * 0.035);
      block(p, CRIMSON, (k) => k.rect(px - pw / 2, -4, pw, dais + h * 0.06 + i * h * 0.12), 1.2);
      line(p, GOLDLEAF, Math.max(1, pw * 0.12), (k) => {
        const y = dais + h * 0.04 + i * h * 0.12;
        k.moveTo(px - pw / 2, y);
        k.lineTo(px + pw / 2, y);
      });
    }
  // The floor and the carpet up to the steps.
  fill(p, hsl(352, 24, 13), (k) => k.rect(-4, dais, w + 8, h - dais + 4));
  block(p, CRIMSON, (k) => {
    k.moveTo(w / 2 - u * 0.1, dais);
    k.lineTo(w / 2 + u * 0.1, dais);
    k.lineTo(w / 2 + u * 0.3, h + 4);
    k.lineTo(w / 2 - u * 0.3, h + 4);
    k.closePath();
  }, 1);
  line(p, GOLDLEAF, Math.max(1, u * 0.008), (k) => {
    k.moveTo(w / 2 - u * 0.085, dais);
    k.lineTo(w / 2 - u * 0.26, h + 4);
    k.moveTo(w / 2 + u * 0.085, dais);
    k.lineTo(w / 2 + u * 0.26, h + 4);
  });
  // The wall of flame along the foot of the steps, and its light on the floor.
  const n = Math.max(6, Math.round((w / u) * 7));
  for (let i = 0; i < n; i++) {
    const fx = w * 0.08 + ((w * 0.84) * (i + 0.5)) / n;
    flame(p, fx, dais + h * 0.01, h * p.rr(0.22, 0.32), p.rr(-0.3, 0.3));
  }
  line(p, 'rgba(255,170,70,0.35)', Math.max(1, u * 0.01), (k) => {
    for (let i = 0; i < n * 2; i++) {
      const fx = w * 0.08 + w * 0.84 * p.r();
      const fy = dais + h * p.rr(0.05, 0.3);
      k.moveTo(fx, fy);
      k.lineTo(fx, fy + h * p.rr(0.03, 0.08));
    }
  });
}

/** The turtle-duck pond in the palace garden: a mother and her young among lily pads, under a willow. */
export function turtleDucks(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, h * 0.2, h, hsl(170, 30, 80, 0), hsl(186, 34, 52));
  // Ripples and lily pads.
  line(p, washiInk(0.6), 1.2, (k) => {
    for (let i = 0; i < 26; i++) {
      const x = p.rr(0, w);
      const y = h * p.rr(0.35, 1);
      k.moveTo(x, y);
      k.lineTo(x + u * p.rr(0.04, 0.1), y);
    }
  });
  // The family, placed first so no pad sits under them: the mother leading, the young behind her.
  const dir = p.r() < 0.5 ? 1 : -1;
  const s = Math.min(u * 0.34, w * 0.3);
  const mx = w * 0.5 + dir * s * 0.45;
  const my = h * 0.64;
  const family: [number, number, number][] = [[mx, my, s]];
  for (let i = 1; i <= 3; i++) family.push([mx - dir * s * (0.55 + i * 0.42), my + h * (0.04 + i * 0.035), s * 0.42]);
  for (let i = 0; i < 7; i++) {
    const lx = p.rr(0, w);
    const ly = h * p.rr(0.45, 0.95);
    const lr = u * p.rr(0.05, 0.09);
    const notch = p.rr(0, TAU);
    if (family.some(([fx, fy, fs]) => Math.abs(lx - fx) < fs * 0.7 + lr && Math.abs(ly - fy) < fs * 0.45 + lr * 0.4)) continue;
    block(p, hsl(130, 34, 40), (k) => {
      k.ellipse(lx, ly, lr, lr * 0.4, 0, notch + 0.3, notch + TAU - 0.3);
      k.lineTo(lx, ly);
      k.closePath();
    }, 1);
    if (p.r() < 0.35) {
      fill(p, hsl(340, 60, 82), (k) => k.ellipse(lx + lr * 0.3, ly - lr * 0.25, lr * 0.3, lr * 0.2, 0, 0, TAU));
      line(p, KEY, 1, (k) => k.ellipse(lx + lr * 0.3, ly - lr * 0.25, lr * 0.3, lr * 0.2, 0, 0, TAU));
    }
  }
  // Willow strands hanging from the top.
  const wx = w * (p.r() < 0.5 ? 0.15 : 0.85);
  line(p, KEY, Math.max(2, u * 0.012), (k) => {
    k.moveTo(wx - u * 0.3, -4);
    k.quadraticCurveTo(wx, h * 0.05, wx + u * 0.3, -4);
  });
  for (let i = 0; i < 16; i++) {
    const sx = wx + p.rr(-0.28, 0.28) * u;
    const len = h * p.rr(0.2, 0.5);
    line(p, hsl(100, 36, 40), Math.max(1, u * 0.004), (k) => {
      k.moveTo(sx, h * 0.02);
      k.quadraticCurveTo(sx + u * 0.03, len * 0.5, sx + u * p.rr(-0.02, 0.04), len);
    });
    fill(p, hsl(96, 40, 46), (k) => {
      for (let j = 1; j < 8; j++) {
        const t = j / 8;
        const lx = sx + u * 0.015 * Math.sin(t * 3);
        const ly = h * 0.02 + len * t;
        k.moveTo(lx, ly);
        k.ellipse(lx + u * 0.008, ly, u * 0.012, u * 0.004, 0.6, 0, TAU);
      }
    });
  }
  for (const [fx, fy, fs] of family) turtleDuck(p, fx, fy, fs, dir);
}

/** A turtle duck: a duck's head and tail on a turtle's green shell, swimming, `s` long. */
function turtleDuck(p: Press, x: number, y: number, s: number, dir: number) {
  line(p, washiInk(0.8), Math.max(1, s * 0.03), (k) => k.ellipse(x, y + s * 0.05, s * 0.75, s * 0.12, 0, 0, Math.PI));
  block(p, hsl(36, 30, 44), (k) => {
    k.ellipse(x, y, s * 0.5, s * 0.16, 0, 0, Math.PI);
    k.closePath();
  }, 1);
  const shell: Trace = (k) => {
    k.ellipse(x - dir * s * 0.05, y - s * 0.02, s * 0.4, s * 0.3, 0, Math.PI, TAU);
    k.closePath();
  };
  fill(p, hsl(110, 30, 34), shell);
  within(p, shell, () =>
    line(p, hsl(60, 30, 62), Math.max(1, s * 0.025), (k) => {
      for (let i = -2; i <= 2; i++) {
        const sx = x - dir * s * 0.05 + i * s * 0.15;
        k.moveTo(sx - s * 0.06, y - s * 0.02);
        k.lineTo(sx - s * 0.04, y - s * 0.18);
        k.lineTo(sx + s * 0.04, y - s * 0.18);
        k.lineTo(sx + s * 0.06, y - s * 0.02);
      }
    }),
  );
  line(p, KEY, Math.max(1, s * 0.03), shell);
  // Neck, head and beak, and a little tail.
  const hx = x + dir * s * 0.45;
  const hy = y - s * 0.3;
  line(p, hsl(36, 30, 44), s * 0.1, (k) => {
    k.moveTo(x + dir * s * 0.3, y - s * 0.05);
    k.quadraticCurveTo(x + dir * s * 0.45, y - s * 0.1, hx, hy);
  });
  block(p, hsl(40, 30, 50), (k) => k.arc(hx, hy, s * 0.1, 0, TAU), Math.max(1, s * 0.025));
  block(p, SAFFRON, (k) => {
    k.moveTo(hx + dir * s * 0.07, hy - s * 0.03);
    k.lineTo(hx + dir * s * 0.22, hy + s * 0.01);
    k.lineTo(hx + dir * s * 0.07, hy + s * 0.04);
    k.closePath();
  }, Math.max(1, s * 0.02));
  fill(p, KEY, (k) => k.arc(hx + dir * s * 0.02, hy - s * 0.02, Math.max(0.8, s * 0.02), 0, TAU));
  block(p, hsl(36, 30, 40), (k) => {
    k.moveTo(x - dir * s * 0.45, y - s * 0.02);
    k.lineTo(x - dir * s * 0.62, y - s * 0.14);
    k.lineTo(x - dir * s * 0.5, y + s * 0.02);
    k.closePath();
  }, Math.max(1, s * 0.02));
}

/** The royal family's beach house on Ember Island: red walls and dark roofs above the sand, palms, the sea at sunset. */
export function beachHouse(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.6, hsl(350, 50, 62), hsl(30, 80, 80, 0));
  sun(p, w * p.rr(0.3, 0.7), h * 0.5, u * 0.1, hsl(10, 80, 56));
  const shore = h * 0.56;
  sea(p, shore);
  // The beach, and the rise the house stands on.
  block(p, hsl(40, 50, 74), (k) => {
    k.moveTo(-4, h * 0.78);
    k.quadraticCurveTo(w * 0.5, h * 0.7, w + 4, h * 0.82);
    k.lineTo(w + 4, h + 4);
    k.lineTo(-4, h + 4);
    k.closePath();
  }, 1.2);
  const hx = w * (p.r() < 0.5 ? 0.38 : 0.62);
  block(p, hsl(30, 20, 46), (k) => {
    k.moveTo(hx - u * 0.42, h * 0.78);
    k.quadraticCurveTo(hx - u * 0.3, h * 0.64, hx, h * 0.63);
    k.quadraticCurveTo(hx + u * 0.3, h * 0.64, hx + u * 0.42, h * 0.78);
    k.closePath();
  }, 1.2);
  fireHall(p, hx, h * 0.66, u * 0.46, u * 0.32, 2);
  for (const m of [-1, 1]) palm(p, hx + m * u * p.rr(0.36, 0.5), h * p.rr(0.8, 0.9), u * p.rr(0.3, 0.42), m);
  kasumi(p, -w * 0.1, w * 0.4, h * 0.3, h * 0.04);
}

/** A palm leaning out, its trunk ringed and its fronds in dark green fans. */
function palm(p: Press, x: number, y: number, s: number, lean: number) {
  const tx = x + lean * s * 0.3;
  const ty = y - s;
  line(p, KEY, Math.max(3, s * 0.05), (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x + lean * s * 0.05, y - s * 0.6, tx, ty);
  });
  line(p, hsl(30, 30, 40), Math.max(2, s * 0.035), (k) => {
    k.moveTo(x, y);
    k.quadraticCurveTo(x + lean * s * 0.05, y - s * 0.6, tx, ty);
  });
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5 + p.rr(-0.1, 0.1);
    const ex = tx + Math.cos(a) * s * 0.42;
    const ey = ty + Math.sin(a) * s * 0.42 + s * 0.12;
    const frond: Trace = (k) => {
      k.moveTo(tx, ty);
      k.quadraticCurveTo(tx + Math.cos(a) * s * 0.25, ty + Math.sin(a) * s * 0.3 - s * 0.08, ex, ey);
      k.quadraticCurveTo(tx + Math.cos(a) * s * 0.2, ty + Math.sin(a) * s * 0.2, tx, ty);
      k.closePath();
    };
    block(p, hsl(130, 34, 30), frond, 1);
  }
}

/** The Ember Island Players' stage: red curtains drawn back on a painted iceberg and moon, footlights burning. */
export function emberPlayers(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, hsl(352, 30, 12), (k) => k.rect(-4, -4, w + 8, h + 8));
  const x0 = w * 0.12;
  const x1 = w * 0.88;
  const top = h * 0.14;
  const floor = h * 0.8;
  // The painted backdrop: sea, an iceberg and a paper moon.
  bokashi(p, top, floor, hsl(206, 40, 62), hsl(200, 40, 82));
  fill(p, washiInk(0.95), (k) => k.arc(w * 0.66, h * 0.32, u * 0.07, 0, TAU));
  line(p, KEY, 1.2, (k) => k.arc(w * 0.66, h * 0.32, u * 0.07, 0, TAU));
  block(p, hsl(196, 30, 92), (k) => {
    k.moveTo(w * 0.3, floor - h * 0.12);
    k.lineTo(w * 0.38, h * 0.36);
    k.lineTo(w * 0.44, h * 0.48);
    k.lineTo(w * 0.5, h * 0.4);
    k.lineTo(w * 0.6, floor - h * 0.12);
    k.closePath();
  }, 1.2);
  line(p, INDIGO, Math.max(1.5, u * 0.008), (k) => {
    for (let x = x0; x < x1; x += u * 0.08) {
      k.moveTo(x, floor - h * 0.1);
      k.quadraticCurveTo(x + u * 0.04, floor - h * 0.14, x + u * 0.08, floor - h * 0.1);
    }
  });
  // The stage floor, the frame, and the curtains tied back.
  block(p, hsl(30, 40, 30), (k) => k.rect(-4, floor, w + 8, h * 0.06), 1.2);
  for (const m of [-1, 1]) {
    const ex = m < 0 ? x0 : x1;
    const curtain: Trace = (k) => {
      k.moveTo(m < 0 ? -4 : w + 4, top);
      k.lineTo(ex + m * -u * 0.12, top);
      k.quadraticCurveTo(ex + m * u * 0.02, h * 0.45, ex + m * u * 0.06, h * 0.56);
      k.quadraticCurveTo(ex + m * u * 0.02, h * 0.68, ex + m * u * 0.04, floor);
      k.lineTo(m < 0 ? -4 : w + 4, floor);
      k.closePath();
    };
    fill(p, VERMILION, curtain);
    const outer = m < 0 ? 0 : w;
    const inner = ex - m * u * 0.12;
    within(p, curtain, () =>
      line(p, CRIMSON, Math.max(1, u * 0.008), (k) => {
        for (let i = 1; i < 4; i++) {
          const fx = outer + (inner - outer) * (i / 4);
          k.moveTo(fx, top);
          k.quadraticCurveTo(fx - m * u * 0.05, h * 0.56, fx, floor);
        }
      }),
    );
    line(p, KEY, 1.4, curtain);
    fill(p, GOLDLEAF, (k) => k.ellipse(ex + m * u * 0.06, h * 0.56, u * 0.03, u * 0.015, 0, 0, TAU));
  }
  block(p, CRIMSON, (k) => k.rect(-4, -4, w + 8, top + 4), 1.4);
  line(p, GOLDLEAF, Math.max(1.5, u * 0.012), (k) => {
    k.moveTo(-4, top - h * 0.02);
    k.lineTo(w + 4, top - h * 0.02);
  });
  fireMark(p, w / 2, top * 0.5, top * 0.32, GOLDLEAF);
  // Footlights.
  const n = Math.max(5, Math.round((w / u) * 6));
  for (let i = 0; i < n; i++) flame(p, x0 + ((x1 - x0) * (i + 0.5)) / n, floor + h * 0.01, h * 0.05);
  fill(p, hsl(352, 30, 8), (k) => k.rect(-4, floor + h * 0.06, w + 8, h));
}

/** An Agni Kai in the palace courtyard, told by its fire alone: blue flame and orange meeting over the stones. */
export function agniKai(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h * 0.45, hsl(10, 30, 46), hsl(30, 30, 80, 0));
  // The palace wall and gate behind the courtyard.
  const wy = h * 0.46;
  block(p, VERMILION, (k) => k.rect(-4, wy - h * 0.14, w + 8, h * 0.14), 1.4);
  fill(p, KEY, (k) => {
    for (let x = u * 0.05; x < w; x += u * 0.16) k.rect(x, wy - h * 0.14, u * 0.025, h * 0.14);
  });
  fireRoof(p, w / 2, wy - h * 0.14, w * 1.1, h * 0.07);
  fireRoof(p, w / 2, wy - h * 0.2, u * 0.5, h * 0.07);
  // The courtyard floor in perspective, with the Fire Nation's mark at its centre.
  block(p, STONE_FLOOR, (k) => k.rect(-4, wy, w + 8, h - wy + 4), 1.2);
  line(p, 'rgba(0,0,0,0.25)', 1, (k) => {
    for (let i = 1; i < 8; i++) {
      const y = wy + (h - wy) * Math.pow(i / 8, 1.6);
      k.moveTo(-4, y);
      k.lineTo(w + 4, y);
    }
    for (let i = -8; i <= 8; i++) {
      k.moveTo(w / 2 + i * u * 0.06, wy);
      k.lineTo(w / 2 + i * u * 0.3, h + 4);
    }
  });
  fireMark(p, w / 2, h * 0.78, u * 0.12, hsl(352, 40, 40, 0.6));
  // The two fires, each reaching from its side, meeting in a burst.
  const y = h * 0.6;
  const mx = w / 2 + p.rr(-0.06, 0.06) * w;
  jet(p, -4, mx, y, u * 0.16, [hsl(214, 80, 50), hsl(196, 90, 70), hsl(190, 90, 92)]);
  jet(p, w + 4, mx, y, u * 0.16, [VERMILION, SAFFRON, hsl(48, 90, 80)]);
  fill(p, 'rgba(255,250,230,0.85)', (k) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      k.moveTo(mx, y);
      k.lineTo(mx + Math.cos(a - 0.12) * u * 0.06, y + Math.sin(a - 0.12) * u * 0.06);
      k.lineTo(mx + Math.cos(a) * u * p.rr(0.12, 0.2), y + Math.sin(a) * u * p.rr(0.12, 0.2));
      k.lineTo(mx + Math.cos(a + 0.12) * u * 0.06, y + Math.sin(a + 0.12) * u * 0.06);
      k.closePath();
    }
  });
}

/** A jet of fire from the edge at x0 to x1, its tongues curling, in three colours from the outside in. */
function jet(p: Press, x0: number, x1: number, y: number, s: number, inks: string[]) {
  const d = Math.sign(x1 - x0);
  inks.forEach((ink, layer) => {
    const th = s * (1 - layer * 0.3);
    const shape: Trace = (k) => {
      k.moveTo(x0, y - th * 0.6);
      const n = 6;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const x = x0 + (x1 - x0) * t;
        k.quadraticCurveTo(x - d * s * 0.15, y - th * (0.75 - t * 0.5) - s * 0.15, x, y - th * (0.55 - t * 0.45));
      }
      for (let i = n; i >= 1; i--) {
        const t = i / n;
        const x = x0 + (x1 - x0) * (t - 1 / n);
        k.quadraticCurveTo(x + d * s * 0.1, y + th * (0.75 - t * 0.5) + s * 0.12, x, y + th * (0.55 - (t - 1 / n) * 0.45));
      }
      k.closePath();
    };
    fill(p, ink, shape);
    if (layer === 0) line(p, KEY, Math.max(1, s * 0.03), shape);
  });
}

/** Lanterns over the capital at night: strings of red paper lanterns above dark roofs, and sky lanterns rising. */
export function lanterns(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, 0, h, hsl(226, 46, 16), hsl(250, 30, 34));
  // Sky lanterns drifting up.
  for (let i = 0; i < 9; i++) {
    const x = p.rr(0, w);
    const y = h * p.rr(0.05, 0.45);
    const s = u * p.rr(0.012, 0.026);
    const g = c.createRadialGradient(x, y, 0, x, y, s * 3);
    g.addColorStop(0, 'rgba(255,190,90,0.55)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    fill(p, g, (k) => k.arc(x, y, s * 3, 0, TAU));
    fill(p, SAFFRON, (k) => k.roundRect(x - s * 0.6, y - s, s * 1.2, s * 2, s * 0.3));
  }
  // The roofs of the city below.
  for (let row = 0; row < 2; row++) {
    const y = h * (0.86 + row * 0.08);
    const n = Math.max(3, Math.round((w / u) * (3 + row)));
    for (let i = 0; i < n; i++) {
      const x = (w * (i + 0.5 + p.rr(-0.2, 0.2))) / n;
      block(p, hsl(352, 24, 14), (k) => k.rect(x - u * 0.14, y, u * 0.28, h), 1);
      fireRoof(p, x, y, u * (0.36 + row * 0.06), u * 0.08, hsl(240, 20, 12));
    }
  }
  // Strings of lanterns across, sagging, each lantern glowing.
  for (let s = 0; s < 3; s++) {
    const y0 = h * (0.12 + s * 0.17);
    const sag = h * p.rr(0.08, 0.16);
    line(p, KEY, 1.2, (k) => {
      k.moveTo(-10, y0);
      k.quadraticCurveTo(w / 2, y0 + sag * 2, w + 10, y0);
    });
    const n = Math.max(4, Math.round((w / u) * 5));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const lx = (1 - t) * (1 - t) * -10 + 2 * (1 - t) * t * (w / 2) + t * t * (w + 10);
      const ly = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0;
      lantern(p, lx, ly, u * (0.035 + s * 0.012));
    }
  }
}

/** A red paper lantern hung at (x, y): a glowing body with gold caps and a tassel. */
function lantern(p: Press, x: number, y: number, s: number) {
  const g = p.c.createRadialGradient(x, y + s * 1.2, 0, x, y + s * 1.2, s * 3);
  g.addColorStop(0, 'rgba(255,150,70,0.5)');
  g.addColorStop(1, 'rgba(255,150,70,0)');
  fill(p, g, (k) => k.arc(x, y + s * 1.2, s * 3, 0, TAU));
  line(p, KEY, 1, (k) => {
    k.moveTo(x, y);
    k.lineTo(x, y + s * 0.3);
  });
  block(p, VERMILION, (k) => k.ellipse(x, y + s * 1.2, s * 0.75, s * 0.9, 0, 0, TAU), Math.max(1, s * 0.06));
  line(p, CRIMSON, Math.max(1, s * 0.05), (k) => {
    for (const m of [-0.4, 0, 0.4]) {
      k.moveTo(x + m * s, y + s * 0.38);
      k.quadraticCurveTo(x + m * s * 1.8, y + s * 1.2, x + m * s, y + s * 2.02);
    }
  });
  block(p, GOLDLEAF, (k) => {
    k.rect(x - s * 0.35, y + s * 0.22, s * 0.7, s * 0.18);
    k.rect(x - s * 0.35, y + s * 2, s * 0.7, s * 0.18);
  }, 1);
  line(p, SAFFRON, Math.max(1, s * 0.08), (k) => {
    k.moveTo(x, y + s * 2.18);
    k.lineTo(x, y + s * 2.7);
  });
}
