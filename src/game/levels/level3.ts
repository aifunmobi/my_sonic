import { LevelBuilder } from "./dsl";
import { RUINS } from "./themes";

/** Level 3: stone blocks, moving platforms, crabs, two loops. */
export function buildLevel3() {
  const b = new LevelBuilder(420);
  b.flat(400).hill(200, 60).flat(400).gap(120).flat(300).gap(160).flat(400).slope(160, 340).flat(400).slope(200, 420).flat(560).gap(140);
  b.flat(360).hill(200, 90).flat(400).slope(120, 360).flat(200).gap(120).flat(300).slope(160, 420).flat(600).gap(150).flat(200).hill(160, 50).flat(800);

  b.ringRow(120, 6).enemy("crawler", 320, 60).ringArc(500, 6, 140, 40, 36);
  b.block(800, 388, 32, 32).block(832, 356, 64, 64).ringRow(840, 3, 20, 20, 356).monitor(880, "ring", 356).enemy("crab", 720, 30);
  b.chopper(1060, 480).ringsAt([[1030, 370], [1060, 360], [1090, 370]]);
  b.ringRow(1160, 4).enemy("buzzer", 1300, 60, { height: 64 });
  b.platform(1460, 400, 80, { move: { dx: 50, dy: 0, period: 240 } }).ringsAt([[1470, 340], [1500, 330], [1530, 340]]);
  b.ringRow(1620, 5).enemy("crab", 1800, 40).monitor(1900, "shield").ringRow(1860, 3, 56);
  b.spikesAt(2300, 48).ringRow(2290, 3, 60).enemy("buzzer", 2440, 80, { height: 70 }).ringRow(2180, 5).ringRow(2400, 4);
  b.checkpoint(2780).ringRow(2810, 4);
  b.loop(3020, 90);
  b.chopper(3370, 480).ringsAt([[3340, 372], [3370, 360], [3400, 372]]);
  b.platform(3480, 380, 64, { move: { dx: 0, dy: 60, period: 200 } }).platform(3600, 300, 96).ringRow(3608, 5, 20, 20, 300).monitor(3680, "life", 300);
  b.enemy("crab", 3700, 40).ringRow(3740, 3);
  b.ringArc(3900, 7, 150, 40, 46);
  b.enemy("crawler", 4120, 50).enemy("crawler", 4260, 50).spikesAt(4300, 32).ringRow(4290, 3, 56).ringRow(4060, 4, 24);
  b.ringRow(4560, 5).monitor(4680, "ring");
  b.chopper(4780, 480).ringsAt([[4750, 312], [4780, 300], [4810, 312]]);
  b.checkpoint(4880).enemy("crab", 5050, 40).ringRow(4940, 4);
  b.loop(5560, 80);
  b.chopper(5975, 480).ringsAt([[5945, 372], [5975, 360], [6005, 372]]);
  b.ringRow(6080, 5).enemy("buzzer", 6170, 60, { height: 60 }).ringArc(6330, 5, 120, 40, 40).ringRow(6480, 6);

  b.autoDecor(["column", "ruinwall", "torch", "bush", "flower", "column"], 90, 11);
  return b.build({ index: 2, name: "MOSSY RUINS", act: 1, theme: RUINS, height: 540, start: [60, 400], goal: 6800, music: 2 });
}
