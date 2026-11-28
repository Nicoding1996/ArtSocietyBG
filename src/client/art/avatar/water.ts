import { hsl, type Painter } from '../common';
import { canals, chiefPalace, redMoon, siegeFleet, waterGate } from './water-north';
import { glowingIceberg, iceDodging, icebergsAtDusk, warFleet } from './water-sea';
import { festival, oasisGarden, oceanSpirit, spiritPortal } from './water-spirits';
import { penguinSledding, polarBearDog, turtleSeals } from './water-creatures';
import { banner, blackSnow, hutInterior, iceFishing, scroll, swamp, vial, watchtowerView } from './water-south';
import { type Ctx, type Trace, TAU, BLACK, NAVY, BLUE, ICE, SNOW, SKY, type Press, fill, line, within, paper, pull, seal } from './print';
import { CITY_FAR, CITY_NEAR, WALL, moon, arch, pendant, boomerang, pelt, necklace, pouch, SNOW_SHADE, aurora, ridge, watchtower, igloo, hut, snowWall, penguin, GRASS, GRASS_LIGHT, tuft, reed, koi, tower, crest, canoe } from './water-motifs';

/**
 * Water Tribe paintings, made like the stonecut and stencil prints of the Arctic print shops: flat inks on
 * soft paper, colour blocks printed a little out of register with the black, ink that didn't quite take,
 * and the shop's seal in a corner.
 */
const WATER: Record<string, (p: Press) => void> = {
  icecity: iceCity,
  oasis,
  southpole: southPole,
  katara: (p) => portrait(p, 'katara'),
  sokka: (p) => portrait(p, 'sokka'),
  keepsakes,
  watergate: waterGate,
  canals,
  chiefpalace: chiefPalace,
  redmoon: redMoon,
  siegefleet: siegeFleet,
  warfleet: warFleet,
  icedodging: iceDodging,
  iceberg: glowingIceberg,
  dusk: icebergsAtDusk,
  oasisgarden: oasisGarden,
  oceanspirit: oceanSpirit,
  portal: spiritPortal,
  festival,
  polarbeardog: polarBearDog,
  penguins: penguinSledding,
  seals: turtleSeals,
  watchtower: watchtowerView,
  blacksnow: blackSnow,
  hut: hutInterior,
  icefishing: iceFishing,
  banner,
  scroll,
  vial,
  swamp,
};

export function waterScene(painter: Painter, scene: string) {
  const p: Press = Object.assign(painter, { mx: painter.rr(-1.6, 1.6), my: painter.rr(-1.2, 1.2) });
  paper(p);
  (WATER[scene] ?? unpainted(scene))(p);
  seal(p);
  pull(p);
}

/** A placeholder for a subject on the list that isn't painted yet. */
const unpainted = (scene: string) => (p: Press) => {
  line(p, BLUE, 3, (k) => {
    k.setLineDash([12, 10]);
    k.rect(p.w * 0.1, p.h * 0.1, p.w * 0.8, p.h * 0.8);
  });
  p.c.fillStyle = BLUE;
  p.c.font = `${Math.round(Math.min(p.w, p.h) * 0.09)}px serif`;
  p.c.textAlign = 'center';
  p.c.fillText(scene, p.w / 2, p.h / 2);
};

function iceCity(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const wide = w / h > 1.3;
  const wallTop = h * (wide ? 0.6 : 0.66);
  const wallBottom = h * (wide ? 0.79 : 0.77);
  // A night sky, brushed lighter towards the horizon as through a stencil.
  const sky = c.createLinearGradient(0, 0, 0, wallBottom);
  sky.addColorStop(0, hsl(221, 52, 12));
  sky.addColorStop(0.55, hsl(214, 52, 24));
  sky.addColorStop(1, hsl(204, 46, 46));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, wallBottom + 4));
  for (let i = 0; i < 45; i++) {
    const sx = p.rr(0, w);
    const sy = p.rr(0, wallTop * 0.7);
    const sr = p.rr(0.6, 1.7);
    fill(p, SNOW, (k) => k.arc(sx, sy, sr, 0, TAU));
  }
  const mr = u * p.rr(0.1, 0.14);
  const left = p.r() < 0.5;
  const mx = wide ? w * (left ? p.rr(0.14, 0.26) : p.rr(0.74, 0.86)) : w * p.rr(0.28, 0.72);
  const my = wide ? h * p.rr(0.2, 0.26) : h * p.rr(0.13, 0.18);
  moon(p, mx, my, mr);
  const lit = mx < w / 2 ? -1 : 1;

  // Two rows of ice towers climbing towards the palace.
  const cx = wide ? (left ? w * p.rr(0.5, 0.62) : w * p.rr(0.38, 0.5)) : w * p.rr(0.42, 0.58);
  const peak = h * (wide ? 0.2 : 0.3);
  const base = wallTop + u * 0.02;
  for (const near of [false, true]) {
    let x = -p.rr(0, u * 0.08);
    while (x < w) {
      const bw = u * p.rr(0.06, 0.12) * (near ? 1.15 : 0.85);
      const fall = Math.min(1, Math.abs(x + bw / 2 - cx) / (w * 0.5));
      const top = Math.min(base - u * 0.06, peak + (wallTop - peak) * (near ? 0.4 + fall * 0.45 : 0.05 + fall * 0.75) + p.rr(-1, 1) * u * 0.03);
      tower(p, x, top, bw, base, near ? CITY_NEAR : CITY_FAR, lit);
      x += bw * p.rr(0.7, 1);
    }
  }

  // The great wall, crowned with waves, with the water gate between two towers.
  fill(p, WALL.face, (k) => k.rect(-4, wallTop, w + 8, wallBottom - wallTop));
  const step = u * p.rr(0.065, 0.085);
  for (let x = -step * p.r(); x < w + step; x += step) crest(p, x, wallTop, step, WALL);
  const rows = p.ri(3, 4);
  const bh = (wallBottom - wallTop) / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = wallTop + r * bh;
    if (r > 0)
      line(p, WALL.shade, 1.3, (k) => {
        k.moveTo(-4, y0);
        k.lineTo(w + 4, y0);
      });
    const bl = bh * p.rr(1.8, 2.4);
    for (let x = (r % 2) * bl * 0.5 - bl; x < w + bl; x += bl)
      line(p, WALL.shade, 1.1, (k) => {
        k.moveTo(x, y0);
        k.lineTo(x, y0 + bh);
      });
  }
  const gw = u * p.rr(0.13, 0.17);
  const gh = (wallBottom - wallTop) * 0.85;
  for (const sgn of [-1, 1]) tower(p, cx + sgn * gw * 0.95 - gw * 0.24, wallTop - u * p.rr(0.08, 0.12), gw * 0.48, wallBottom, WALL, lit);
  arch(p, cx, wallBottom - gh / 2, gw, gh, NAVY);

  // The canal: dark water, the moon on it in broken bars, and ripples cut into the block.
  fill(p, NAVY, (k) => k.rect(-4, wallBottom, w + 8, h - wallBottom + 4));
  for (let i = 0; i < 16; i++) {
    const yy = wallBottom + u * 0.02 + i * u * 0.028;
    if (yy > h) break;
    const len = mr * p.rr(0.5, 1.5) * (1 - i * 0.035);
    const off = p.rr(-0.15, 0.15) * mr;
    line(p, ICE, p.rr(1.2, 2.6), (k) => {
      k.moveTo(mx + off - len / 2, yy);
      k.lineTo(mx + off + len / 2, yy);
    });
  }
  for (let i = 0; i < 30 * p.detail; i++) {
    const rx = p.rr(-20, w + 20);
    const ry = p.rr(wallBottom + 4, h);
    const rl = u * p.rr(0.025, 0.07);
    line(p, BLUE, p.rr(1, 1.8), (k) => {
      k.moveTo(rx - rl, ry);
      k.quadraticCurveTo(rx, ry - rl * 0.3, rx + rl, ry);
    });
  }
  if (p.r() < 0.65) {
    const bx = w * (p.r() < 0.5 ? p.rr(0.12, 0.32) : p.rr(0.68, 0.88));
    canoe(p, bx, wallBottom + (h - wallBottom) * p.rr(0.5, 0.7), u * p.rr(0.2, 0.26), p.r() < 0.5 ? 1 : -1);
  }
}

type Who = 'katara' | 'sokka';

const HAIR = hsl(18, 34, 13);

const HAIR_LIGHT = hsl(22, 30, 30);

const SKIN = hsl(24, 42, 44);

const SKIN_SHADE = hsl(18, 42, 33);

const LIPS = hsl(4, 38, 30);

/**
 * A head-and-shoulders print of Katara or Sokka, told apart by what fans know them by: Katara's hair loops
 * and necklace, Sokka's wolf tail and boomerang.
 */
function portrait(p: Press, who: Who) {
  const { w, h } = p;
  const aspect = w / h;
  const side = aspect > 1.25 ? (p.r() < 0.5 ? -1 : 1) : 0;
  const s = Math.min(h * (side ? 0.36 : 0.32), w * (side ? 0.3 : 0.44));
  const x = side ? w * (0.5 + side * 0.2) : w * 0.5;
  const y = side ? h * 0.42 : h * (aspect < 0.75 ? 0.42 : 0.4);
  const lit = p.r() < 0.5 ? -1 : 1;
  const rx = s * 0.32;
  const ry = s * 0.44;
  const disc = p.pick([SKY, ICE, hsl(208, 40, 76)]);
  const dr = s * p.rr(0.95, 1.12);
  fill(p, disc, (k) => k.arc(x, y - s * 0.05, dr, 0, TAU));
  line(p, BLUE, Math.max(1.2, s * 0.02), (k) => k.arc(x, y - s * 0.05, dr * 1.08, 0, TAU));
  if (side) {
    const ox = w * (0.5 - side * 0.26);
    if (who === 'katara') waterWhip(p, ox, h * 0.5, s, side);
    else flyingBoomerang(p, ox, h * 0.45, s * 0.7, side);
  }
  // Behind the head and shoulders.
  if (who === 'katara') {
    const back: Trace = (k) => {
      k.moveTo(x - rx * 1.15, y + ry * 1.9);
      k.bezierCurveTo(x - rx * 1.5, y + ry * 0.6, x - rx * 1.4, y - ry * 1.25, x, y - ry * 1.14);
      k.bezierCurveTo(x + rx * 1.4, y - ry * 1.25, x + rx * 1.5, y + ry * 0.6, x + rx * 1.15, y + ry * 1.9);
      k.closePath();
    };
    fill(p, HAIR, back, true);
    // Strands cut into the hair.
    for (let i = 0; i < 8; i++) {
      const sgn = i % 2 ? 1 : -1;
      const off = p.rr(1.05, 1.35);
      line(
        p,
        HAIR_LIGHT,
        Math.max(1, rx * 0.025),
        (k) => {
          k.moveTo(x + sgn * rx * (off - 0.2), y - ry * 0.6);
          k.quadraticCurveTo(x + sgn * rx * (off + 0.1), y + ry * 0.5, x + sgn * rx * (off - 0.1), y + ry * 1.7);
        },
        true,
      );
    }
  } else if (who === 'sokka') {
    // The boomerang he carries on his back, one arm showing over his shoulder.
    const bs = -lit;
    boomerang(p, x + bs * s * 0.62, y + s * 0.74, s * 0.5, -Math.PI / 2 + bs * 1.1);
    const tilt = lit * 0.25;
    fill(
      p,
      HAIR,
      (k) => {
        k.moveTo(x - rx * 0.2, y - ry * 0.8);
        k.quadraticCurveTo(x - rx * 0.25 + tilt * rx, y - ry * 1.45, x + tilt * rx * 2, y - ry * 1.68);
        k.quadraticCurveTo(x + rx * 0.3 + tilt * rx, y - ry * 1.35, x + rx * 0.2, y - ry * 0.8);
        k.closePath();
      },
      true,
    );
  }
  parka(p, x, y, s, lit);
  const neck: Trace = (k) => k.rect(x - rx * 0.42, y + ry * 0.5, rx * 0.84, ry * 1.05);
  fill(p, SKIN, neck);
  within(p, neck, () => fill(p, SKIN_SHADE, (k) => k.ellipse(x, y + ry * 0.78, rx * 0.7, ry * 0.3, 0, 0, TAU)));
  furCollar(p, x, y + s * 0.62, s);
  head(p, x, y, rx, ry, lit);
  features(p, x, y, rx, ry, who);
  // In front of the face.
  if (who === 'katara') {
    for (const sgn of [-1, 1]) {
      fill(
        p,
        HAIR,
        (k) => {
          k.moveTo(x, y - ry * 1.02);
          k.quadraticCurveTo(x + sgn * rx * 0.12, y - ry * 0.62, x + sgn * rx * 0.6, y - ry * 0.48);
          k.quadraticCurveTo(x + sgn * rx * 0.92, y - ry * 0.36, x + sgn * rx * 1.04, y + ry * 0.02);
          k.bezierCurveTo(x + sgn * rx * 1.1, y - ry * 0.7, x + sgn * rx * 0.6, y - ry * 1.12, x, y - ry * 1.1);
          k.closePath();
        },
        true,
      );
      // Her hair loops: a strand on each side looped down beside the face and tied with a bead.
      const lx = x + sgn * rx * 0.98;
      const loop: Trace = (k) => k.ellipse(lx, y + ry * 0.2, rx * 0.12, ry * 0.36, sgn * -0.08, 0, TAU);
      line(p, BLACK, rx * 0.17, loop, true);
      line(p, HAIR_LIGHT, rx * 0.08, loop, true);
      fill(p, BLUE, (k) => k.arc(lx, y - ry * 0.17, rx * 0.085, 0, TAU));
    }
    // Her mother's necklace: a blue choker with a carved pendant.
    line(p, BLUE, ry * 0.08, (k) => {
      k.moveTo(x - rx * 0.43, y + ry * 1.08);
      k.quadraticCurveTo(x, y + ry * 1.2, x + rx * 0.43, y + ry * 1.08);
    });
    pendant(p, x, y + ry * 1.27, rx * 0.15);
  } else if (who === 'sokka') {
    fill(
      p,
      HAIR,
      (k) => {
        k.moveTo(x - rx * 0.55, y - ry * 0.55);
        k.quadraticCurveTo(x - rx * 0.62, y - ry * 1.02, x, y - ry * 1.0);
        k.quadraticCurveTo(x + rx * 0.62, y - ry * 1.02, x + rx * 0.55, y - ry * 0.55);
        k.quadraticCurveTo(x, y - ry * 0.7, x - rx * 0.55, y - ry * 0.55);
        k.closePath();
      },
      true,
    );
    fill(p, BLUE, (k) => k.ellipse(x + lit * 0.25 * rx * 0.6, y - ry * 1.02, rx * 0.12, ry * 0.05, 0, 0, TAU));
  }
}

/** A blue parka with white fur down the front. */
function parka(p: Press, x: number, y: number, s: number, lit: number) {
  const { h } = p;
  const top = y + s * 0.58;
  const half = s * 0.95;
  const body: Trace = (k) => {
    k.moveTo(x - s * 0.3, top);
    k.bezierCurveTo(x - half * 0.9, top + s * 0.02, x - half * 1.15, top + s * 0.25, x - half * 1.3, h + 4);
    k.lineTo(x + half * 1.3, h + 4);
    k.bezierCurveTo(x + half * 1.15, top + s * 0.25, x + half * 0.9, top + s * 0.02, x + s * 0.3, top);
    k.closePath();
  };
  fill(p, BLUE, body);
  within(p, body, () => {
    fill(p, NAVY, (k) => k.rect(lit < 0 ? x + half * 0.45 : x - half * 2, top, half * 1.55, h));
    fill(p, SNOW, (k) => k.rect(x - s * 0.1, top, s * 0.2, h));
    for (let yy = top + s * 0.1; yy < h; yy += s * 0.09) {
      const y0 = yy;
      line(p, ICE, 1, (k) => {
        k.moveTo(x - s * 0.08, y0);
        k.lineTo(x - s * 0.03, y0 + s * 0.04);
        k.moveTo(x + s * 0.08, y0 + s * 0.02);
        k.lineTo(x + s * 0.03, y0 + s * 0.06);
      });
    }
  });
}

/** A ruff of white fur round the neck, open at the throat. */
function furCollar(p: Press, x: number, y: number, s: number) {
  const n = 30;
  const tuftPath = (k: Ctx, rxo: number, ryo: number, a0: number, a1: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const r = 1 + (i % 2 ? 0.07 : -0.03);
      const px = x + Math.cos(a) * rxo * r;
      const py = y + Math.sin(a) * ryo * r;
      if (i === 0) k.moveTo(px, py);
      else k.lineTo(px, py);
    }
  };
  fill(p, SNOW, (k) => {
    tuftPath(k, s * 0.62, s * 0.2, Math.PI * 0.05, Math.PI * 0.95);
    k.lineTo(x - s * 0.2, y - s * 0.02);
    k.quadraticCurveTo(x, y + s * 0.12, x + s * 0.2, y - s * 0.02);
    k.closePath();
  });
  for (let i = 0; i < 26; i++) {
    const a = p.rr(Math.PI * 0.1, Math.PI * 0.9);
    const d = p.rr(0.5, 0.92);
    const fx = x + Math.cos(a) * s * 0.6 * d;
    const fy = y + Math.sin(a) * s * 0.2 * d;
    line(p, ICE, 1.1, (k) => {
      k.moveTo(fx, fy);
      k.lineTo(fx + Math.cos(a) * s * 0.04, fy + Math.sin(a) * s * 0.04);
    });
  }
}

/** Ears, face and the shadow on its far side. */
function head(p: Press, x: number, y: number, rx: number, ry: number, lit: number) {
  for (const sgn of [-1, 1]) fill(p, sgn === -lit ? SKIN_SHADE : SKIN, (k) => k.ellipse(x + sgn * rx * 0.97, y + ry * 0.05, rx * 0.14, ry * 0.19, 0, 0, TAU));
  const face: Trace = (k) => {
    k.moveTo(x - rx, y - ry * 0.15);
    k.bezierCurveTo(x - rx * 1.02, y + ry * 0.5, x - rx * 0.48, y + ry * 0.98, x, y + ry);
    k.bezierCurveTo(x + rx * 0.48, y + ry * 0.98, x + rx * 1.02, y + ry * 0.5, x + rx, y - ry * 0.15);
    k.bezierCurveTo(x + rx * 1.02, y - ry * 1.18, x - rx * 1.02, y - ry * 1.18, x - rx, y - ry * 0.15);
    k.closePath();
  };
  fill(p, SKIN, face);
  within(p, face, () => fill(p, SKIN_SHADE, (k) => k.ellipse(x - lit * rx * 1.15, y + ry * 0.1, rx * 0.6, ry * 1.4, 0, 0, TAU)));
}

/** Blue eyes with a heavy upper lid, brows, nose and mouth, each a little different per person. */
function features(p: Press, x: number, y: number, rx: number, ry: number, who: Who) {
  const ey = y + ry * 0.08;
  const browLift = who === 'sokka' ? 0.02 : 0.06;
  const browW = who === 'katara' ? 0.035 : 0.055;
  for (const sgn of [-1, 1]) {
    const ex = x + sgn * rx * 0.43;
    const ew = rx * 0.42;
    const eh = ry * 0.15;
    const eye: Trace = (k) => {
      k.translate(ex, ey);
      k.scale(sgn, 1);
      k.moveTo(-ew * 0.5, eh * 0.2);
      k.quadraticCurveTo(-ew * 0.05, -eh * 1.3, ew * 0.5, -eh * 0.25);
      k.quadraticCurveTo(ew * 0.1, eh * 1.1, -ew * 0.5, eh * 0.2);
      k.closePath();
    };
    fill(p, SNOW, eye, true);
    within(
      p,
      eye,
      () => {
        fill(p, hsl(205, 70, 46), (k) => k.arc(ex - sgn * ew * 0.04, ey, eh * 0.72, 0, TAU), true);
        fill(p, BLACK, (k) => k.arc(ex - sgn * ew * 0.04, ey, eh * 0.34, 0, TAU), true);
        fill(p, SNOW, (k) => k.arc(ex - sgn * ew * 0.1, ey - eh * 0.25, eh * 0.16, 0, TAU), true);
      },
      true,
    );
    line(
      p,
      BLACK,
      Math.max(1.4, ry * 0.04),
      (k) => {
        k.translate(ex, ey);
        k.scale(sgn, 1);
        k.moveTo(-ew * 0.52, eh * 0.15);
        k.quadraticCurveTo(-ew * 0.05, -eh * 1.35, ew * 0.58, -eh * 0.45);
        if (who !== 'sokka') k.lineTo(ew * 0.68, -eh * 0.7);
      },
      true,
    );
    line(
      p,
      HAIR,
      Math.max(1.4, ry * browW),
      (k) => {
        k.translate(ex, ey);
        k.scale(sgn, 1);
        k.moveTo(-ew * 0.45, -eh * 2.2 + ry * browLift);
        k.quadraticCurveTo(ew * 0.05, -eh * (who === 'katara' ? 3.0 : 2.7), ew * 0.6, -eh * 2.3 - ry * browLift);
      },
      true,
    );
  }
  line(
    p,
    SKIN_SHADE,
    Math.max(1, ry * 0.03),
    (k) => {
      k.moveTo(x + rx * 0.02, y + ry * 0.32);
      k.lineTo(x + rx * 0.1, y + ry * 0.42);
      k.lineTo(x - rx * 0.02, y + ry * 0.44);
    },
    true,
  );
  const smirk = who === 'sokka' ? 0.06 : 0;
  line(
    p,
    LIPS,
    Math.max(1.2, ry * 0.035),
    (k) => {
      k.moveTo(x - rx * 0.18, y + ry * 0.62 - ry * smirk);
      k.quadraticCurveTo(x, y + ry * 0.69, x + rx * 0.2, y + ry * 0.6 - ry * smirk * 2);
    },
    true,
  );
}

/** A boomerang in flight with its spinning trail. */
function flyingBoomerang(p: Press, x: number, y: number, s: number, side: number) {
  for (let i = 0; i < 3; i++) {
    const r = s * (0.9 + i * 0.3);
    line(p, SKY, Math.max(1.2, s * 0.03), (k) => k.arc(x + side * s * 0.6, y + s * 0.4, r, Math.PI * 1.05, Math.PI * 1.55));
  }
  boomerang(p, x, y, s * 0.6, p.rr(0, TAU));
}

/** A ribbon of water whipping up from below and curling over at the top. */
function waterWhip(p: Press, x: number, y: number, s: number, side: number) {
  const N = 40;
  const pts: { x: number; y: number; wd: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * Math.PI * 2.2;
    const r = s * (1.1 - t * 0.7);
    pts.push({ x: x + Math.sin(a) * r * 0.55 * -side, y: y + s * 1.3 - t * s * 2.4 + Math.cos(a) * r * 0.15, wd: s * (0.16 - t * 0.12) });
  }
  const band: Trace = (k) => {
    k.moveTo(pts[0].x - pts[0].wd, pts[0].y);
    for (const q of pts) k.lineTo(q.x - q.wd, q.y);
    for (let i = N; i >= 0; i--) k.lineTo(pts[i].x + pts[i].wd, pts[i].y);
    k.closePath();
  };
  fill(p, BLUE, band);
  line(p, SKY, Math.max(1.2, s * 0.03), (k) => {
    k.moveTo(pts[2].x, pts[2].y);
    for (let i = 3; i < N; i++) k.lineTo(pts[i].x + pts[i].wd * 0.3, pts[i].y);
  });
  for (let i = 0; i < 12; i++) {
    const q = pts[p.ri(4, N)];
    const dx = q.x + p.rr(-1, 1) * s * 0.35;
    const dy = q.y + p.rr(-1, 1) * s * 0.2;
    const dr = s * p.rr(0.02, 0.05);
    fill(p, BLUE, (k) => k.arc(dx, dy, dr, 0, TAU));
  }
}

/** Sokka's boomerang, Katara's necklace and sometimes her water skin, laid on a fur pelt over blue cloth. */
function keepsakes(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const aspect = w / h;
  fill(p, NAVY, (k) => k.rect(-4, -4, w + 8, h + 8));
  for (let y = u * 0.02; y < h; y += u * 0.035) {
    const yy = y;
    line(p, hsl(214, 50, 28), 1.2, (k) => {
      k.moveTo(-4, yy);
      k.lineTo(w + 4, yy + p.rr(-2, 2));
    });
  }
  pelt(p, w / 2, h / 2, w * (aspect > 1.4 ? 0.44 : 0.42), h * (aspect < 0.8 ? 0.43 : 0.4));
  if (aspect > 1.4) {
    boomerang(p, w * 0.27, h * 0.42, u * 0.36, Math.PI * p.rr(0.3, 0.7));
    necklace(p, w * 0.55, h * 0.52, u * 0.3, p.rr(-0.3, 0.3));
    pouch(p, w * 0.77, h * 0.5, u * 0.32, p.rr(-0.3, 0.3));
  } else if (aspect < 0.8) {
    boomerang(p, w * 0.5, h * 0.25, w * 0.3, -Math.PI / 2 + p.rr(-0.3, 0.3));
    necklace(p, w * 0.5, h * 0.52, w * 0.28, p.rr(-0.4, 0.4));
    if (aspect > 0.6) pouch(p, w * 0.52, h * 0.77, w * 0.26, p.rr(-0.4, 0.4));
  } else {
    boomerang(p, w * 0.38, h * 0.38, u * 0.34, Math.PI * p.rr(0.15, 0.35));
    necklace(p, w * 0.62, h * 0.62, u * 0.28, p.rr(-0.4, 0.4));
  }
}

/** The village at the South Pole: igloos and hide tents behind a snow wall, and the watchtower. */
function southPole(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const aspect = w / h;
  const night = p.r() < 0.45;
  const lit = p.r() < 0.5 ? -1 : 1;
  const horizon = h * (aspect < 0.8 ? 0.44 : 0.46);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  if (night) {
    sky.addColorStop(0, hsl(222, 50, 12));
    sky.addColorStop(1, hsl(210, 45, 32));
  } else {
    sky.addColorStop(0, hsl(204, 46, 60));
    sky.addColorStop(1, hsl(198, 38, 86));
  }
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 6));
  if (night) {
    aurora(p, horizon);
    for (let i = 0; i < 40; i++) {
      const sx = p.rr(0, w);
      const sy = p.rr(0, horizon * 0.8);
      const sr = p.rr(0.6, 1.6);
      fill(p, SNOW, (k) => k.arc(sx, sy, sr, 0, TAU));
    }
  } else {
    const sx = w * p.rr(0.2, 0.8);
    fill(p, hsl(44, 70, 86), (k) => k.arc(sx, horizon - u * 0.12, u * 0.07, 0, TAU));
  }
  ridge(p, horizon, u, night ? hsl(208, 30, 50) : hsl(203, 30, 74));
  // The sea with floes, then the snowfield with long blue drifts.
  const seaB = horizon + u * 0.07;
  fill(p, NAVY, (k) => k.rect(-4, horizon, w + 8, seaB - horizon));
  for (let i = 0; i < 9; i++) {
    const fx = p.rr(0, w);
    const fy = p.rr(horizon + u * 0.015, seaB - u * 0.012);
    const fw = u * p.rr(0.04, 0.12);
    fill(p, ICE, (k) => {
      k.moveTo(fx - fw / 2, fy);
      k.lineTo(fx - fw * 0.3, fy - u * 0.008);
      k.lineTo(fx + fw * 0.4, fy - u * 0.01);
      k.lineTo(fx + fw / 2, fy);
      k.lineTo(fx + fw * 0.2, fy + u * 0.008);
      k.closePath();
    });
  }
  fill(p, SNOW, (k) => k.rect(-4, seaB, w + 8, h - seaB + 4));
  for (let i = 0; i < 5; i++) {
    const dy = seaB + (h - seaB) * p.rr(0.05, 0.95);
    const dx = p.rr(0, w);
    fill(p, SNOW_SHADE, (k) => k.ellipse(dx, dy, w * p.rr(0.2, 0.45), u * p.rr(0.008, 0.02), 0, 0, TAU));
  }
  // The village along the ground line, the tower at one end.
  const ground = seaB + (h - seaB) * (aspect < 0.8 ? 0.48 : 0.5);
  const towerLeft = p.r() < 0.5;
  const tx = w * (towerLeft ? p.rr(0.14, 0.24) : p.rr(0.76, 0.86));
  watchtower(p, tx, ground, Math.min(ground * 0.8, u * p.rr(0.6, 0.75)), u * p.rr(0.12, 0.14), lit);
  const room0 = towerLeft ? tx + u * 0.16 : u * 0.04;
  const room1 = towerLeft ? w - u * 0.04 : tx - u * 0.16;
  for (let x = room0 + u * 0.08; x < room1 - u * 0.04; x += u * p.rr(0.24, 0.32)) {
    const s = u * p.rr(0.12, 0.16);
    if (p.r() < 0.55) igloo(p, x, ground, s, lit);
    else hut(p, x, ground, s * 1.25, lit);
  }
  // The snow wall in front, hiding the foot of the houses, with a gap to walk through.
  const wallY = ground + u * 0.07;
  const gap = w * p.rr(0.35, 0.65);
  snowWall(p, -u * 0.05, gap - u * 0.06, wallY, u * 0.045);
  snowWall(p, gap + u * 0.06, w + u * 0.05, wallY, u * 0.045);
  // Otter penguins waddling past, or a canoe on the sea.
  if (p.r() < 0.6) {
    const n = p.ri(2, 5);
    const dir = p.r() < 0.5 ? 1 : -1;
    const py = wallY + (h - wallY) * p.rr(0.45, 0.7);
    let px = w * p.rr(0.2, 0.6);
    for (let i = 0; i < n; i++) {
      penguin(p, px, py + p.rr(-1, 1) * u * 0.01, u * p.rr(0.07, 0.09), dir);
      px += dir * u * p.rr(0.09, 0.13);
    }
  } else {
    canoe(p, w * p.rr(0.3, 0.7), horizon + u * 0.05, u * 0.16, p.r() < 0.5 ? 1 : -1);
  }
}

/** Tui and La, the Moon and Ocean spirits, circling in their pond, seen from above. */
function oasis(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const aspect = w / h;
  const tall = aspect < 0.8;
  const wide = aspect > 1.35;
  const cx = w / 2;
  const cy = tall ? h * 0.6 : h * 0.5;
  const R = u * 0.4;
  const moonLeft = p.r() < 0.5;
  if (tall) moon(p, w * p.rr(0.4, 0.6), h * 0.17, u * 0.13, true);
  if (wide) {
    // The moon on one side, tall reeds on the other.
    const span = (w - 2.4 * R) / 2;
    moon(p, moonLeft ? span * 0.55 : w - span * 0.55, h * 0.4, Math.min(span * 0.34, u * 0.18), true);
    const rx = moonLeft ? w - span * 0.55 : span * 0.55;
    for (let i = 0; i < 7; i++) reed(p, rx + p.rr(-0.35, 0.35) * span, h * p.rr(0.82, 0.95), h * p.rr(0.45, 0.75), p.r() < 0.5 ? GRASS : GRASS_LIGHT);
  }
  // Grass all round the pond, its blades pointing away from the water.
  const n = Math.round(34 * p.detail);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + p.rr(-0.06, 0.06);
    const d = R * p.rr(0.98, 1.04);
    tuft(p, cx + Math.cos(a) * d, cy + Math.sin(a) * d, a, u * p.rr(0.06, 0.1), p.r() < 0.5 ? GRASS : GRASS_LIGHT);
  }
  fill(p, BLUE, (k) => k.arc(cx, cy, R, 0, TAU));
  for (let i = 0; i < 6; i++) {
    const rr = R * (0.16 + i * 0.13);
    let a = p.rr(0, TAU);
    for (let k = 0; k < 3; k++) {
      const len = p.rr(0.6, 1.6);
      const a0 = a;
      line(p, hsl(205, 46, 52), Math.max(1, u * 0.006), (q) => q.arc(cx, cy, rr, a0, a0 + len));
      a += len + p.rr(0.3, 0.9);
    }
  }
  line(p, NAVY, u * 0.022, (k) => k.arc(cx, cy, R, 0, TAU));
  const a0 = p.rr(0, TAU);
  koi(p, cx, cy, R * 0.5, a0, SNOW, BLACK);
  koi(p, cx, cy, R * 0.5, a0 + Math.PI, BLACK, SNOW);
}
