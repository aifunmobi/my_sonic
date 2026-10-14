import { LevelBuilder } from "./dsl";
import { EMERALD } from "./themes";

/** Level 1: gentle hills, one loop, a couple of enemies. */
export function buildLevel1() {
  const b = new LevelBuilder(420);
  b.flat(420).hill(160, 50).flat(300).slope(160, 340).flat(300).slope(160, 420).flat(520).gap(96).flat(400).hill(200, 70).flat(420);
  b.slope(160, 340).flat(360).slope(200, 420).flat(560).gap(110).flat(400).hill(160, 40).flat(700);

  b.ringRow(150, 5).monitor(330, "ring").ringArc(500, 5, 120, 40, 30);
  b.ringRow(620, 3).enemy("buzzer", 740, 70, { height: 64 });
  b.ringRow(1080, 4).enemy("crawler", 1200, 60).monitor(1300, "shield");
  b.loop(1760, 80);
  b.chopper(2068, 480).ringsAt([[2040, 372], [2068, 362], [2096, 372]]);
  b.spring(2200, false).platform(2250, 320, 96).ringRow(2262, 4, 20, 20, 320).monitor(2330, "life", 320);
  b.enemy("crawler", 2420, 60).ringRow(2440, 3);
  b.ringArc(2616, 6, 140, 40, 36);
  b.checkpoint(2760).spikesAt(2900, 32).ringRow(2880, 3, 60).enemy("crawler", 3040, 50);
  b.ringRow(3320, 6).enemy("buzzer", 3420, 100, { height: 70 }).spikesAt(3560, 32).ringRow(3540, 3, 60);
  b.loop(4140, 90);
  b.chopper(4471, 480).ringsAt([[4440, 372], [4471, 360], [4502, 372]]);
  b.checkpoint(4560).monitor(4620, "ring").enemy("crawler", 4720, 80).ringRow(4760, 5);
  b.ringArc(5006, 5, 120, 40, 40);

  b.autoDecor(["palm", "flower", "bush", "totem", "flower", "bush"], 95, 7);
  return b.build({ index: 0, name: "EMERALD COAST", act: 1, theme: EMERALD, height: 540, start: [60, 400], goal: 5300, music: 0 });
}
