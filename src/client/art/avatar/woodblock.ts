import { finish, hsl, type HSL, type Painter } from '../common';
import { type Ink, type Trace, TAU, type Press, fill, fireMark, line, within } from './print';
import type { Inscribe } from './ink';

/**
 * Woodblock prints for the Fire Nation, after ukiyo-e: flat colour inside black key lines, skies graded down
 * from the top edge (bokashi), bands of mist with rounded ends, vermilion and gold on warm paper, and a title
 * cartouche with the publisher's seal.
 */

export const WASHI: HSL = [38, 46, 86];
export const KEY = hsl(222, 26, 12);
export const VERMILION = hsl(8, 74, 50);
export const CRIMSON = hsl(352, 58, 32);
export const GOLDLEAF = hsl(44, 72, 56);
export const SAFFRON = hsl(36, 86, 60);
export const INDIGO = hsl(214, 54, 30);
export const ASH: HSL = [24, 8, 40];
export const LAVA: HSL = [14, 80, 50];
export const ROOF = hsl(352, 34, 20);
export const washiInk = (a = 1) => hsl(WASHI[0], WASHI[1], WASHI[2], a);
export const tint = (c: HSL, a = 1, dl = 0) => hsl(c[0], c[1], c[2] + dl, a);

/** A woodblock painter: the shared helpers, with the blocks in register. */
export function woodPress(painter: Painter): Press {
  return Object.assign(painter, { mx: 0, my: 0 });
}

/** Warm paper with short fibres, dark and light, each kind laid down in one stroke. */
export function washi(p: Press) {
  const { c, w, h } = p;
  c.fillStyle = washiInk();
  c.fillRect(0, 0, w, h);
  const dark = new Path2D();
  const light = new Path2D();
  for (let i = 0; i < 900; i++) {
    const x = p.rr(0, w);
    const y = p.rr(0, h);
    const a = p.rr(0, Math.PI);
    const l = p.rr(3, 16);
    const fibre = p.r() < 0.5 ? dark : light;
    fibre.moveTo(x, y);
    fibre.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  c.lineWidth = 0.8;
  c.strokeStyle = 'rgba(120,95,60,0.08)';
  c.stroke(dark);
  c.strokeStyle = 'rgba(255,255,245,0.12)';
  c.stroke(light);
}

export function woodFinish(p: Press) {
  finish(p, { weave: 0, grain: 9, vignette: 0.2, warm: 0.45 });
}

/** The sky graded down from `top` at y0 to `bottom` at y1 (bokashi); `bottom` defaults to nothing. */
export function bokashi(p: Press, y0: number, y1: number, top: string, bottom = 'rgba(0,0,0,0)') {
  const g = p.c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  fill(p, g, (k) => k.rect(-4, y0, p.w + 8, y1 - y0));
}

/** A flat colour inside a black key line. */
export function block(p: Press, ink: Ink, trace: Trace, width = 1.4) {
  fill(p, ink, trace);
  line(p, KEY, width, trace);
}

/** A band of mist with rounded ends from x0 to x1 at height y, `th` thick, with a thinner band under it. */
export function kasumi(p: Press, x0: number, x1: number, y: number, th: number, ink: Ink = washiInk(0.94)) {
  fill(p, ink, (k) => {
    k.roundRect(x0, y - th / 2, x1 - x0, th, th / 2);
    const sx = x0 + (x1 - x0) * 0.25;
    k.roundRect(sx, y + th * 0.3, (x1 - x0) * 0.55, th * 0.6, th * 0.3);
  });
}

/** Clouds drawn as ukiyo-e scrolls: lobed bands with a curl at the end, outlined in key. */
export function cloud(p: Press, x: number, y: number, s: number, ink: Ink = hsl(42, 60, 97)) {
  const lobes = 4;
  const shape: Trace = (k) => {
    k.moveTo(x - s, y);
    for (let i = 0; i < lobes; i++) {
      const lx = x - s + ((i + 0.5) * 2 * s) / lobes;
      const lr = (s / lobes) * (i === 1 || i === 2 ? 1.25 : 0.95);
      k.arc(lx, y, lr, Math.PI, 0);
    }
    k.lineTo(x + s, y);
    k.quadraticCurveTo(x, y + s * 0.22, x - s, y);
    k.closePath();
  };
  fill(p, ink, shape);
  line(p, KEY, Math.max(1, s * 0.03), shape);
  line(p, KEY, Math.max(1, s * 0.025), (k) => {
    k.moveTo(x + s * 0.5, y - s * 0.1);
    k.arc(x + s * 0.42, y - s * 0.1, s * 0.08, 0, Math.PI * 1.5);
  });
}

/** The sea from y down: indigo graded deeper, with rows of breaking curls in paper white. */
export function sea(p: Press, y: number, ink: string = INDIGO, top: string = hsl(206, 40, 58)) {
  const { w, h } = p;
  const u = Math.min(w, h);
  bokashi(p, y, h + 4, top, ink);
  for (let row = 0; row < 7; row++) {
    const yy = y + (h - y) * ((row + 0.5) / 7);
    const s = u * (0.025 + (row / 7) * 0.05);
    line(p, washiInk(0.85), Math.max(1, s * 0.16), (k) => {
      for (let x = -s * p.r() * 4; x < w + s; x += s * p.rr(2.6, 3.6)) {
        k.moveTo(x, yy);
        k.quadraticCurveTo(x + s * 0.7, yy - s * 0.9, x + s * 1.4, yy - s * 0.2);
        k.quadraticCurveTo(x + s * 1.1, yy - s * 0.5, x + s * 0.9, yy - s * 0.15);
      }
    });
  }
}

/** A stylised flame of several tongues, standing on (x, y), s tall: vermilion outside, saffron and pale gold in. */
export function flame(p: Press, x: number, y: number, s: number, lean = 0, colours: string[] = [VERMILION, SAFFRON, hsl(48, 90, 80)]) {
  colours.forEach((ink, layer) => {
    const k0 = 1 - layer * 0.28;
    const shape: Trace = (k) => {
      const hw = s * 0.32 * k0;
      k.moveTo(x - hw, y);
      k.bezierCurveTo(x - hw * 1.3, y - s * 0.35 * k0, x - hw * 0.2 + lean * s * 0.2, y - s * 0.55 * k0, x - hw * 0.5 + lean * s * 0.3, y - s * 0.75 * k0);
      k.quadraticCurveTo(x + lean * s * 0.15, y - s * 0.5 * k0, x + lean * s * 0.45, y - s * k0);
      k.quadraticCurveTo(x + hw * 0.6 + lean * s * 0.2, y - s * 0.55 * k0, x + hw * 0.9 + lean * s * 0.35, y - s * 0.68 * k0);
      k.bezierCurveTo(x + hw * 0.8, y - s * 0.35 * k0, x + hw * 1.3, y - s * 0.2 * k0, x + hw, y);
      k.closePath();
    };
    fill(p, ink, shape);
    if (layer === 0) line(p, KEY, Math.max(1, s * 0.025), shape);
  });
}

/** A Fire Nation roof: dark tiles between upturned eaves tipped with gold, the eave line at y. */
export function fireRoof(p: Press, x: number, y: number, rw: number, rh: number, tiles: string = ROOF) {
  const up = rh * 0.45;
  const shape: Trace = (k) => {
    k.moveTo(x - rw / 2, y - up);
    k.quadraticCurveTo(x - rw * 0.38, y + rh * 0.08, x - rw * 0.26, y);
    k.lineTo(x + rw * 0.26, y);
    k.quadraticCurveTo(x + rw * 0.38, y + rh * 0.08, x + rw / 2, y - up);
    k.quadraticCurveTo(x + rw * 0.3, y - rh * 0.4, x + rw * 0.22, y - rh);
    k.lineTo(x - rw * 0.22, y - rh);
    k.quadraticCurveTo(x - rw * 0.3, y - rh * 0.4, x - rw / 2, y - up);
    k.closePath();
  };
  fill(p, tiles, shape);
  within(p, shape, () =>
    line(p, 'rgba(0,0,0,0.35)', Math.max(0.8, rw * 0.008), (k) => {
      for (let i = 1; i < 12; i++) {
        const tx = x - rw * 0.46 + (rw * 0.92 * i) / 12;
        k.moveTo(x + (tx - x) * 0.5, y - rh);
        k.lineTo(tx, y + 1);
      }
    }),
  );
  line(p, KEY, Math.max(1, rh * 0.06), shape);
  line(p, GOLDLEAF, Math.max(1, rh * 0.08), (k) => {
    k.moveTo(x - rw * 0.23, y - rh);
    k.lineTo(x + rw * 0.23, y - rh);
  });
  fill(p, GOLDLEAF, (k) => {
    for (const m of [-1, 1]) {
      k.moveTo(x + m * rw * 0.5 + rh * 0.08, y - up);
      k.arc(x + m * rw * 0.5, y - up, Math.max(1.2, rh * 0.08), 0, TAU);
    }
  });
}

/**
 * A Fire Nation hall: a stone base, red walls between dark pillars, and one or more dark roofs with gold
 * ridges. (x, base) is the middle of its foot.
 */
export function fireHall(p: Press, x: number, base: number, wd: number, ht: number, tiers = 1) {
  const plat = ht * 0.12;
  block(p, hsl(30, 10, 58), (k) => k.rect(x - wd * 0.55, base - plat, wd * 1.1, plat), 1);
  let y = base - plat;
  let rw = wd;
  const bodyH = (ht - plat) / (tiers * 1.55);
  for (let t = 0; t < tiers; t++) {
    const bh = bodyH * (t === 0 ? 1 : 0.7);
    block(p, VERMILION, (k) => k.rect(x - rw * 0.4, y - bh, rw * 0.8, bh), 1);
    fill(p, KEY, (k) => {
      const cols = Math.max(2, Math.round(rw / (ht * 0.14)));
      for (let i = 0; i <= cols; i++) k.rect(x - rw * 0.4 + (rw * 0.8 * i) / cols - rw * 0.012, y - bh, rw * 0.024, bh);
    });
    y -= bh;
    fireRoof(p, x, y, rw * 1.12, bodyH * 0.62);
    y -= bodyH * 0.5;
    rw *= 0.7;
  }
}

/** The outline of a volcano from x0 to x1 on `base` with its broken top at `top`, to draw or to clip lava to. */
export function volcanoShape(x0: number, x1: number, base: number, top: number): Trace {
  const cx = (x0 + x1) / 2;
  const tw = (x1 - x0) * 0.09;
  return (k) => {
    k.moveTo(x0, base);
    k.quadraticCurveTo(cx - (x1 - x0) * 0.16, base - (base - top) * 0.55, cx - tw, top);
    k.lineTo(cx - tw * 0.3, top + (base - top) * 0.03);
    k.lineTo(cx + tw * 0.4, top - (base - top) * 0.01);
    k.lineTo(cx + tw, top + (base - top) * 0.02);
    k.quadraticCurveTo(cx + (x1 - x0) * 0.16, base - (base - top) * 0.55, x1, base);
    k.closePath();
  };
}

/** A volcano from x0 to x1 on `base`, its broken top at `top`, in ash grey with darker gullies. Returns the crater's middle. */
export function volcano(p: Press, x0: number, x1: number, base: number, top: number, ink: HSL = ASH): [number, number] {
  const cx = (x0 + x1) / 2;
  const tw = (x1 - x0) * 0.09;
  const shape = volcanoShape(x0, x1, base, top);
  const g = p.c.createLinearGradient(0, top, 0, base);
  g.addColorStop(0, tint(ink, 1, -12));
  g.addColorStop(1, tint(ink, 1, 14));
  fill(p, g, shape);
  within(p, shape, () =>
    line(p, 'rgba(0,0,0,0.3)', Math.max(1, (x1 - x0) * 0.004), (k) => {
      for (let i = 0; i < 12; i++) {
        const a = -1 + (2 * i) / 11;
        k.moveTo(cx + a * tw, top + (base - top) * 0.03);
        k.quadraticCurveTo(cx + a * (x1 - x0) * 0.12, top + (base - top) * 0.4, cx + a * (x1 - x0) * 0.32, base);
      }
    }),
  );
  line(p, KEY, Math.max(1.2, (x1 - x0) * 0.004), shape);
  return [cx, top];
}

/**
 * Shapes that overlap, filled as one: the key line goes down first, twice as wide, and the fill covers its
 * inner half and every line inside, so only the outline of the whole is left.
 */
export function merged(p: Press, ink: Ink, trace: Trace, width = 1.4) {
  line(p, KEY, width * 2, trace);
  fill(p, ink, trace);
}

/** Smoke out of a crater at (x, y): billows leaning with the wind, one outlined mass with curls inside. */
export function smoke(p: Press, x: number, y: number, s: number, lean: number, ink: HSL = [24, 6, 52]) {
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    puffs.push([x + lean * t * t * s * 3 + Math.sin(i * 2.1) * s * 0.15, y - t * s * 2.8, s * (0.3 + t * 0.45)]);
  }
  const shape: Trace = (k) => {
    for (const [px, py, r] of puffs) {
      k.moveTo(px + r, py);
      k.arc(px, py, r, 0, TAU);
    }
  };
  const g = p.c.createLinearGradient(0, y, 0, y - s * 3.2);
  g.addColorStop(0, tint(ink, 1, -6));
  g.addColorStop(1, tint(ink, 1, 16));
  merged(p, g, shape, Math.max(1, s * 0.03));
  line(p, 'rgba(0,0,0,0.28)', Math.max(1, s * 0.025), (k) => {
    for (const [px, py, r] of puffs.slice(1)) {
      k.moveTo(px - r * 0.55, py + r * 0.25);
      k.quadraticCurveTo(px - r * 0.1, py - r * 0.45, px + r * 0.45, py);
    }
  });
}

/** A red sun: a plain disc, the way the prints show it. */
export function sun(p: Press, x: number, y: number, r: number, ink: string = VERMILION) {
  fill(p, ink, (k) => k.arc(x, y, r, 0, TAU));
}

/**
 * The title cartouche in a top corner: a pale panel with brushed glyphs, and under it the publisher's red seal
 * with the Fire Nation's flame cut into it.
 */
export function cartouche(p: Press, want: Inscribe = {}) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const left = want.side ? want.side === 'left' : p.r() < 0.5;
  const cw = u * 0.075;
  const ch = Math.min(h * 0.32, u * p.rr(0.26, 0.36));
  const x = left ? w * 0.045 : w * 0.955 - cw;
  const y = h * 0.045;
  block(p, p.pick([hsl(45, 55, 80), hsl(40, 35, 92), hsl(10, 45, 76)]), (k) => k.rect(x, y, cw, ch), 1.4);
  line(p, KEY, Math.max(1, cw * 0.06), (k) => k.rect(x + cw * 0.1, y + cw * 0.1, cw * 0.8, ch - cw * 0.2));
  const glyphs = Math.max(2, Math.floor((ch - cw * 0.3) / (cw * 0.9)));
  line(p, want.ink ?? 'rgba(20,20,30,0.85)', Math.max(1, cw * 0.08), (k) => {
    for (let g = 0; g < glyphs; g++) {
      const gx = x + cw * 0.25;
      const gy = y + cw * 0.25 + g * cw * 0.9;
      const s = cw * 0.5;
      for (let i = 0; i < p.ri(3, 5); i++) {
        const x0 = gx + p.rr(0, s);
        const y0 = gy + p.rr(0, s);
        k.moveTo(x0, y0);
        k.lineTo(x0 + p.rr(-0.5, 0.5) * s, y0 + p.rr(-0.2, 0.6) * s);
      }
    }
  });
  const ss = cw * 0.85;
  const sx = left ? x : x + cw - ss;
  const sy = y + ch + cw * 0.25;
  fill(p, VERMILION, (k) => k.roundRect(sx, sy, ss, ss, ss * 0.12));
  fireMark(p, sx + ss / 2, sy + ss * 0.5, ss * 0.34, washiInk());
}
