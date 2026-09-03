import { LevelBuilder } from "./dsl";
import { SUNSET } from "./themes";

/** Level 2: more water gaps with leaping fish, three loops, springs. */
export function buildLevel2() {
  const b = new LevelBuilder(420);
  b.flat(360).slope(120, 380).flat(240).gap(100).flat(300).hill(160, 60).flat(440).slope(140, 320).flat(320).gap(110).flat(260);
  b.slope(200, 420).flat(600).hill(200, 80).flat(400).gap(120).flat(300).slope(160, 340).flat(300).slope(160, 420).flat(500).gap(120);
  b.flat(200).hill(160, 50).flat(800);

  b.ringRow(120, 6).enemy("crawler", 300, 50).monitor(560, "ring").ringRow(520, 5);
  b.chopper(770, 470).ringsAt([[740, 330], [770, 320], [800, 330]]);
  b.ringRow(860, 4).enemy("buzzer", 1000, 80, { height: 60 }).ringArc(1200, 6, 130, 40, 40);
  b.loop(1500, 80);
  b.ringRow(1640, 3).spikesAt(1900, 32).ringRow(1890, 3, 56).enemy("buzzer", 2050, 90, { height: 64 }).ringRow(1980, 5);
  b.chopper(2235, 470).ringsAt([[2205, 232], [2235, 222], [2265, 232]]);
  b.ringRow(2320, 5).enemy("crawler", 2460, 50);
  b.checkpoint(2800).ringRow(2830, 4);
  b.loop(3000, 96);
  b.ringArc(3450, 7, 150, 40, 44).monitor(3600, "shield").enemy("crawler", 3700, 60).enemy("crawler", 3860, 50).ringRow(3740, 6, 40);
  b.chopper(4010, 470).ringsAt([[3980, 372], [4010, 360], [4040, 372]]);
  b.spring(4120, true).platform(4180, 240, 96).ringRow(4190, 5, 20, 20, 240).monitor(4260, "life", 240);
  b.ringRow(4240, 4).enemy("buzzer", 4330, 60, { height: 60 });
  b.spikesAt(4600, 48).ringRow(4580, 4, 56).enemy("crawler", 4720, 50).ringRow(4560, 3, 24);
  b.checkpoint(5040).monitor(5100, "ring");
  b.loop(5240, 80);
  b.chopper(5550, 470).ringsAt([[5520, 372], [5550, 360], [5580, 372]]);
  b.ringRow(5640, 5).enemy("buzzer", 5740, 60, { height: 64 }).ringArc(5890, 5, 120, 40, 40);
  b.ringRow(6080, 6);

  b.autoDecor(["palm", "umbrella", "rock", "flower", "palm", "bush"], 140, 3);
  return b.build({ index: 1, name: "SUNSET BAY", act: 1, theme: SUNSET, height: 540, start: [60, 400], goal: 6300, music: 1 });
}
