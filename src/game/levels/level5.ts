import { LevelBuilder } from "./dsl";
import { SKY } from "./themes";

/** Level 5: islands over a void, shooting enemies everywhere, and a boss. */
export function buildLevel5() {
  const b = new LevelBuilder(420);
  b.flat(300).gap(140).flat(240).gap(170).flat(300).slope(120, 360).flat(260).gap(180).flat(240).slope(160, 420).flat(560).gap(160);
  b.flat(220).gap(170).flat(300).slope(140, 340).flat(300).gap(190).flat(260).slope(200, 420).flat(600).gap(180).flat(240).gap(170);
  b.flat(300).hill(200, 70).flat(240).gap(160).flat(1000).flat(500);

  b.ringRow(100, 5).monitor(240, "ring");
  b.ringsAt([[340, 350], [370, 340], [400, 350]]);
  b.spikesAt(560, 32).ringRow(550, 3, 56).ringRow(460, 3);
  b.ringsAt([[720, 340], [765, 330], [810, 340]]);
  b.enemy("buzzer", 1000, 80, { height: 64, shoots: true }).ringRow(900, 5).checkpoint(1120);
  b.enemy("crab", 1400, 40, { shoots: true }).ringRow(1300, 4);
  b.ringsAt([[1570, 290], [1620, 280], [1670, 290]]);
  b.enemy("spikeball", 1830, 0, { height: 100 }).ringRow(1740, 3).ringRow(1880, 3);
  b.checkpoint(2140).loop(2390, 96).ringRow(2160, 4).monitor(2600, "shield");
  b.ringsAt([[2700, 350], [2750, 340], [2800, 350]]);
  b.spikesAt(2900, 48).ringRow(2890, 3, 60).enemy("crawler", 3000, 30);
  b.ringsAt([[3080, 350], [3135, 340], [3190, 350]]);
  b.enemy("buzzer", 3300, 70, { height: 64, shoots: true }).enemy("buzzer", 3440, 50, { height: 84, shoots: true }).ringRow(3260, 5).monitor(3480, "ring");
  b.enemy("crab", 3800, 40, { shoots: true }).spikesAt(3900, 32).ringRow(3890, 3, 56).ringRow(3700, 4);
  b.platform(4030, 320, 60).ringsAt([[4000, 290], [4060, 280], [4120, 290]]);
  b.checkpoint(4180).enemy("spikeball", 4300, 0, { height: 100 }).ringRow(4220, 3).ringRow(4340, 3);
  b.loop(4870, 96).ringRow(4640, 4);
  b.ringsAt([[5240, 350], [5300, 340], [5360, 350]]);
  b.spikesAt(5470, 64).ringRow(5460, 4, 62).enemy("buzzer", 5560, 50, { height: 70, shoots: true });
  b.ringsAt([[5660, 350], [5715, 340], [5770, 350]]);
  b.enemy("crab", 5900, 40, { shoots: true }).enemy("crawler", 6040, 30).ringRow(5820, 4).ringArc(6200, 6, 140, 40, 40);
  b.checkpoint(6340).monitor(6400, "ring").monitor(6460, "life").ringRow(6380, 4, 50);
  b.ringsAt([[6570, 350], [6620, 340], [6670, 350]]);
  b.ringRow(6740, 5);
  b.bossArena(6900, 480);
  b.ringRow(7420, 5);

  b.autoDecor(["antenna", "pipe", "rock", "antenna", "pipe"], 130, 9);
  return b.build({ index: 4, name: "SKY FORTRESS", act: 1, theme: SKY, height: 540, start: [60, 400], goal: 7560, music: 4 });
}
