# my_sonic - Spin Rush

A five-zone, Sonic-style 2D speed platformer that runs in the browser. Everything (engine, levels, pixel-style art, sound effects and music) is generated in code; there are no external game assets or game libraries.

## Play

```sh
npm install
npm run dev      # http://localhost:8080
npm run build    # production build in dist/
```

## Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys, WASD or IJKL |
| Jump | Space, Z, X, C, F or Shift |
| Roll | Down while running |
| Spin dash | Hold Down, tap Jump to charge, release Down |
| Pause / resume | P |
| Quit to title | Esc (while paused) |
| Restart zone | R |
| Sound / music | M / N |
| Menu | Up / Down to pick a zone, Jump to start |

Touch devices get on-screen buttons.

## Zones

1. **Emerald Coast** - gentle hills, one loop, a few enemies (easy)
2. **Sunset Bay** - water gaps with leaping fish, three loops, springs (easy)
3. **Mossy Ruins** - stone steps, moving platforms, crabs (easy)
4. **Magma Cavern** - lava pits, shooting enemies, spike balls, crumbling platforms (hard)
5. **Sky Fortress** - islands over a void, shooters everywhere, and a boss (hardest)

Zones unlock in order and unlocked zones can be replayed from the title screen.

## Scoring

- Enemy: 100, then 200, 500 and 1000 for each further enemy defeated without touching the ground
- Item monitor: 10
- Boss: 100 per hit, 1000 for the finish
- Zone clear: time bonus (50000 under 30 s down to 0 over 5 min), 100 per ring held, 10000 perfect bonus for collecting every ring in the zone
- Extra life every 100 rings and every 50000 points

Best score and time per zone, best run, unlocked zones and sound settings are saved in the browser's local storage.

## Code

- `src/game/game.ts` - simulation (classic momentum physics, loops, enemies, boss, scoring)
- `src/game/render.ts` - renders at native 480x270 and upscales with nearest-neighbour sampling
- `src/game/levels/` - level builder DSL, themes, and the five zones
- `src/game/audio.ts` - synthesized SFX and six chiptune tracks
- `src/game/font.ts` - 5x7 bitmap HUD font
- `src/game/save.ts` - local storage persistence
- `src/pages/SonicGame.tsx` - page, input wiring, touch controls
