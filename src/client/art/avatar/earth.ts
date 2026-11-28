import type { Painter } from '../common';
import { type Press, unpainted } from './print';
import { type Inscribe, inkFinish, inkPress, inscription, silk } from './ink';
import { lovers, mailChutes, monorail, omashu, outerWall, upperRing } from './earth-cities';
import { jasmine, kyoshiFans, kyoshiIsland, library, mistyPalms, sandsailer, teaSet, unagi } from './earth-lands';
import { colossus, republicCity, zaofu } from './earth-korra';
import { badgermoles, bosco, greatDivide, laogai, makapu, ostrichHorses, serpentPass } from './earth-wilds';
import { beifong, cabbages, drill, earthRumble } from './earth-towns';
import { bumi, toph } from './earth-people';

/** Earth Kingdom paintings, in ink and mineral colours on silk (see ink.ts). A painter may say where its inscription goes. */

const EARTH: Record<string, (p: Press) => Inscribe | void> = {
  outerwall: outerWall,
  upperring: upperRing,
  monorail,
  omashu,
  mailchutes: mailChutes,
  lovers,
  kyoshiisland: kyoshiIsland,
  unagi,
  kyoshifans: kyoshiFans,
  sandsailer,
  library,
  mistypalms: mistyPalms,
  jasmine,
  teaset: teaSet,
  zaofu,
  republiccity: republicCity,
  colossus,
  badgermoles,
  bosco,
  ostrichhorses: ostrichHorses,
  greatdivide: greatDivide,
  serpentpass: serpentPass,
  laogai,
  makapu,
  cabbages,
  drill,
  earthrumble: earthRumble,
  beifong,
  toph,
  bumi,
};

export function earthScene(painter: Painter, scene: string) {
  const p = inkPress(painter);
  silk(p);
  const want = (EARTH[scene] ?? unpainted(scene))(p);
  inscription(p, want || {});
  inkFinish(p);
}
