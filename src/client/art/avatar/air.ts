import type { Painter } from '../common';
import { type Press, unpainted } from './print';
import type { Inscribe } from './ink';
import { airSeal, cotton, thangkaFinish, thangkaPress } from './thangka';
import { airball, eastTemple, gates, gliders, northTemple, sanctuary, southTemple, templeIsland, westTemple } from './air-temples';
import { appa, banners, bisonLake, cloudSea, herd, kites, ledge, lemurs, momo } from './air-sky';
import { chimes, glider, gong, marbles, paisho, pies, scooters } from './air-treasures';
import { chakras, cycle, emblem } from './air-mandalas';
import { aang, gyatso } from './air-people';

/** Air Nomad paintings, as Tibetan thangkas (see thangka.ts). A painter may say which corner its seal goes in. */
const AIR: Record<string, (p: Press) => Inscribe | void> = {
  southtemple: southTemple,
  sanctuary,
  airball,
  northtemple: northTemple,
  gliders,
  easttemple: eastTemple,
  westtemple: westTemple,
  templeisland: templeIsland,
  gates,
  appa,
  herd,
  bisonlake: bisonLake,
  momo,
  lemurs,
  cloudsea: cloudSea,
  kites,
  banners,
  ledge,
  chakras,
  glider,
  paisho,
  pies,
  cycle,
  emblem,
  marbles,
  scooters,
  chimes,
  gong,
  aang,
  gyatso,
};

export function airScene(painter: Painter, scene: string) {
  const p = thangkaPress(painter);
  cotton(p);
  const want = (AIR[scene] ?? unpainted(scene))(p);
  airSeal(p, want || {});
  thangkaFinish(p);
}