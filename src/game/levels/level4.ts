import { LevelBuilder } from "./dsl";
import { MAGMA } from "./themes";

/** Level 4: lava pits, shooting enemies, spike balls, crumbling platforms. */
export function buildLevel4() {
  const b = new LevelBuilder(420);
  b.flat(320).slope(120, 380).flat(300).gap(150).flat(260).slope(140, 340).flat(360).gap(160).flat(300).slope(200, 420).flat(560).gap(170);
  b.flat(300).gap(240).flat(300).hill(200, 80).flat(400).slope(160, 330).flat(360).gap(160).flat(200).slope(200, 420).flat(600).gap(180);
  b.flat(260).gap(150).flat(200).hill(160, 60).flat(800);

  b.ringRow(120, 5).enemy("crawler", 600, 60).ringRow(520, 4).monitor(700, "ring");
  b.ringsAt([[790, 350], [815, 340], [840, 340], [865, 350]]);
  b.enemy("spikeball", 1020, 0, { height: 100 }).ringRow(920, 3).ringRow(1080, 3);
  b.spikesAt(1400, 48).ringRow(1390, 3, 60).enemy("buzzer", 1550, 90, { height: 70, shoots: true }).ringRow(1300, 4);
  b.ringsAt([[1700, 270], [1730, 260], [1760, 270]]);
  b.checkpoint(1840).enemy("crab", 1970, 40, { shoots: true }).ringRow(1880, 3).monitor(2080, "shield");
  b.loop(2590, 90).ringRow(2340, 4);
  b.ringsAt([[2920, 350], [2955, 340], [2990, 350]]);
  b.ringRow(3080, 4).enemy("crawler", 3220, 50);
  b.platform(3380, 420, 64, { crumble: true }).platform(3470, 420, 64, { crumble: true }).ringsAt([[3400, 390], [3500, 390]]);
  b.spikesAt(3700, 64).ringRow(3690, 4, 62).enemy("spikeball", 3820, 0, { height: 100 }).ringRow(3600, 3);
  b.ringArc(3980, 6, 140, 40, 40);
  b.checkpoint(4100).enemy("buzzer", 4200, 80, { height: 64, shoots: true }).enemy("buzzer", 4380, 60, { height: 80, shoots: true }).ringRow(4240, 5).monitor(4440, "ring");
  b.spikesAt(4800, 48).ringRow(4790, 3, 60).enemy("crab", 4900, 40, { shoots: true }).ringRow(4680, 4);
  b.ringsAt([[5050, 270], [5080, 260], [5110, 270]]);
  b.ringRow(5200, 4);
  b.checkpoint(5600).loop(5820, 96).ringRow(5620, 4);
  b.ringsAt([[6220, 350], [6250, 340], [6280, 350]]);
  b.enemy("crawler", 6420, 40).enemy("crawler", 6540, 30).ringRow(6380, 4, 50);
  b.ringsAt([[6650, 350], [6675, 340], [6700, 350]]);
  b.spikesAt(6850, 32).ringRow(6840, 3, 56).monitor(6790, "life");
  b.ringArc(7030, 5, 120, 40, 40).ringRow(7200, 6);

  b.autoDecor(["crystal", "rock", "lavaburst", "torch", "crystal", "rock"], 120, 5);
  return b.build({ index: 3, name: "MAGMA CAVERN", act: 1, theme: MAGMA, height: 540, start: [60, 400], goal: 7500, music: 3 });
}
