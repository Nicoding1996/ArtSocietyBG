import type { Painter } from '../common';
import { type Press, unpainted } from './print';
import type { Inscribe } from './ink';
import { cartouche, washi, woodFinish, woodPress } from './woodblock';
import { agniKai, beachHouse, emberPlayers, fireCapital, lanterns, throneRoom, turtleDucks } from './fire-capital';
import { airships, blackSun, comet, eternalFlame, fireTemple, ranShaw, rokuIsland, sunWarriors, volcanicIslands } from './fire-sun';
import { blueSpirit, boilingRock, crown, gondola, proBending, wanted, warMap, zukoShip } from './fire-war';
import { fang, hawk, komodo, paintedLady } from './fire-creatures';
import { iroh, zuko } from './fire-people';

/** Fire Nation paintings, as ukiyo-e woodblock prints (see woodblock.ts). A painter may say where its cartouche goes. */

const FIRE: Record<string, (p: Press) => Inscribe | void> = {
  firecapital: fireCapital,
  throneroom: throneRoom,
  turtleducks: turtleDucks,
  beachhouse: beachHouse,
  emberplayers: emberPlayers,
  agnikai: agniKai,
  lanterns,
  sunwarriors: sunWarriors,
  ranshaw: ranShaw,
  eternalflame: eternalFlame,
  comet,
  airships,
  firetemple: fireTemple,
  rokuisland: rokuIsland,
  blacksun: blackSun,
  volcanic: volcanicIslands,
  boilingrock: boilingRock,
  gondola,
  bluespirit: blueSpirit,
  crown,
  warmap: warMap,
  zukoship: zukoShip,
  wanted,
  probending: proBending,
  komodo,
  hawk,
  fang,
  paintedlady: paintedLady,
  zuko,
  iroh,
};

export function fireScene(painter: Painter, scene: string) {
  const p = woodPress(painter);
  washi(p);
  const want = (FIRE[scene] ?? unpainted(scene))(p);
  cartouche(p, want || {});
  woodFinish(p);
}
