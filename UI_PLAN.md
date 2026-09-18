# Slither Me Jev: UI Plan

Executor: Sonnet. Work phase by phase. Commit and push after each phase. Do not touch `.env`. Do not change `server.js` except where Phase 6 says to.

## Goal

This is a 20-second clip on X that people watch **on a phone, on mute**. Within 2 seconds a viewer should understand three things:
1. 8 AI snakes are fighting (plus one human).
2. Each AI is "thinking" live, and you can see its confidence.
3. The brain is Jev: one call, 7 decisions, about 150 ms.

The current version fails because the snakes are 1-cell dots, the food is invisible, the odds are hidden in a list below the fold, and nothing marks a kill or a win.

## Layout (16:9, fits 1920x1080 and a laptop screen with no scrolling)

```
+---------------------------------------------------------------+
|  SLITHER ME JEV            [Jev: 1 call · 7 decisions · 142ms] |  top bar, 56px
+-------------------------------------------+-------------------+
|                                           |  LEADERBOARD      |
|                                           |  1 ● Psycho   12  |
|             ARENA (square,                |  2 ● Greedy    9  |
|             fills height)                 |  3 ○ YOU       7  |
|                                           |  ...              |
|                                           |  ☠ Coward         |
|                                           +-------------------+
|                                           |  KILL FEED        |
|                                           |  Psycho ☠ Ghost   |
+-------------------------------------------+-------------------+
```

- The whole page is `100vh` with no scroll. The arena is square, sized `min(100vh - 56px - 32px, 100vw - 340px)`. The right panel is 300px wide.
- Remove the current `#hud` odds list entirely. The odds move onto the arena (Phase 3).
- On screens narrower than 900px, stack the panel under the arena.

## Visual style

- Background `#07070c`. Arena `#0d0d16` with a faint dot grid (`#ffffff08`, one dot per cell), rounded corners (12px), and a 1px border of `#ffffff14`.
- Font: Google Fonts `Space Grotesk` for UI text and `JetBrains Mono` for numbers.
- Snake colors (neon, distinct on dark):
  `#ff3b5c` Psycho, `#3bb0ff` Coward, `#ffd23b` Greedy, `#b56bff` Hunter, `#2ef2c4` Ghost, `#ff8a3b` Chaos, `#7dff3b` Sniper. Human `#ffffff`.
- Glow: draw each snake with `ctx.shadowBlur = 12` in its own color. Reset `shadowBlur` afterward.
- Use one canvas and scale it for `devicePixelRatio` so it stays crisp on retina screens and in recordings.

## Phase 1: Layout and style shell
1. Rewrite `index.html` with the layout above, the CSS variables for the colors, and the fonts.
2. Top bar: the title on the left and the Jev stat pill on the right (it can show placeholder text for now).
3. Right panel: leaderboard and kill feed containers.
4. Commit: `ui: layout shell, neon theme`

## Phase 2: Snakes that look like snakes
1. Grid of **24x24** cells, with the cell size computed from the arena size.
2. Every snake starts at **length 5**. Spawn all 8 evenly around a ring (radius about 35% of the grid), each facing the center. That looks fair and dramatic at tick 0.
3. Drawing:
   - Draw the body as rounded segments, with the width tapering from 90% of a cell at the head to 55% at the tail, and the color fading slightly toward the tail.
   - Draw the head as a circle with **two white eyes and black pupils** pointing in the direction of travel. The eyes do most of the work of making it read as a snake.
4. **Smooth motion:** keep `prevBody` and `body` for each snake, and render with `requestAnimationFrame`, interpolating positions by `t = (now - lastTickTime) / TICK_MS`, clamped to 0 to 1. Keep the game logic tick-based. Only rendering is interpolated. This one change is what stops the game looking janky.
5. Food: 12 glowing orbs, radius 30% of a cell, pulsing in size (`sin(time)`), in soft white-pink `#ffd6f0` with glow. When food is eaten, it pops briefly (scale up and fade over 200 ms).
6. Commit: `ui: real snakes, smooth motion, glowing food`

## Phase 3: Show Jev thinking (the hook)
1. Above each AI snake's head, draw a **floating tag**:
   `Psycho ▲ 87%`
   - The name is in the snake's color, the arrow is the chosen direction, and the percentage is that move's probability from Jev.
   - The pill background is `#000000b0` and the text size is 11 to 12px at 1080p.
   - If the confidence is below 55%, the percentage turns orange and gets a `?` (for example `▲ 48%?`). Visible hesitation makes the clip entertaining.
2. The human's tag reads `YOU` in white, and a subtle pulsing ring surrounds the human's head.
3. Faint **direction arrows** at the head: a small translucent wedge for each legal move, with opacity equal to its probability, so you can see the spread of options. Keep them subtle.
4. Top bar stat pill: time the `fetch` in `askJev` with `performance.now()` and show `Jev · 1 call · N decisions · XXX ms`, updated every tick. When a call fails, briefly show `fallback` in orange.
5. Press `O` to toggle the tags (clean shots for recording).
6. Commit: `ui: live Jev odds over heads + latency pill`

## Phase 4: Deaths, kill feed, leaderboard
1. Record the **cause of death**: `wall`, `self`, or `<other snake name>`. Store `killer` on the dead snake and increment `kills` on the killer.
2. **Fix collisions so moves resolve simultaneously.** Compute every snake's new head first, then resolve:
   - A head that moves into a wall or into any body cell dies.
   - Two heads that move into the same cell: the longer snake survives, and if they're equal length both die.
   - A snake's tail cell counts as free if that snake isn't eating this tick.
   This removes the current bias where the order of the snakes array decides who lives.
3. Death animation: the body flashes white once, bursts into particles in the snake's color (about 20 particles, 500 ms), then disappears. A small screen shake (3px, 150 ms) when any snake dies.
4. Kill feed (right panel, newest on top, max 5 entries, each fades out after 6 s):
   - `Psycho ☠ Ghost` (name colors kept)
   - `Coward hit a wall`
   - `Chaos ate itself`
5. Leaderboard: sorted by alive first, then length. Each row shows a color dot, name, length, and kills (`⚔2`). Dead rows are dimmed with strikethrough and a skull. Animate reordering (CSS transform transition).
6. Commit: `ui: kill feed, leaderboard, fair collisions, death fx`

## Phase 5: Start and win screens
1. **Start screen** over the arena: the title, the line "8 AIs. 1 grid. Only 1 survives.", and two buttons: `Play (arrows)` and `Watch AI only`. `Watch AI only` removes the human and runs 8 Jev snakes (add an eighth name `Viper`, color `#ff5ce1`).
2. A **3-2-1 countdown**, with big numbers that scale in and fade.
3. **Win screen:** dim the arena, show the winner's name large in its color with glow, the word `WINNER`, and a stats line (`length 18 · 3 kills · 94% avg confidence`). Add confetti in the winner's color. If the human wins, show `YOU BEAT JEV`.
4. `R` restarts. In watch mode, restart automatically 5 s after a win (good for recording multiple rounds).
5. URL flags: `?watch=1` skips the start screen into watch mode, and `?rec=1` hides the cursor. Use both for recording.
6. Commit: `ui: start screen, countdown, win screen, watch mode`

## Phase 6: Make the AIs play better (so the clip is dramatic)
The facts Jev gets now are too thin (`safe` or `food here`). In `game.js` `legalMoves`, give every legal move a fact string like:
`safe · food 3 away · nearest enemy head 2 away · open space 41 cells`
- `food N away`: Manhattan distance from the new head to the nearest food.
- `enemy head N away`: distance to the nearest living enemy head.
- `open space N`: a flood-fill count from the new cell, capped at 60. This stops the snakes trapping themselves.
- Keep `wall, death` and `body collision, death` for fatal moves.

In `server.js`, replace the generic instruction with a real personality, sent from the client as `personality`:
- Psycho: "Hunt other snakes. Move toward enemy heads when you are longer."
- Greedy: "Always go for the nearest food."
- Coward: "Avoid other snakes. Prefer the most open space."
- Hunter: "Cut off the nearest enemy's path."
- Ghost: "Stay near the edges and survive."
- Chaos: "Be unpredictable but never pick a death move."
- Sniper: "Take food only when no enemy is near."
- Viper: "Balance food and safety."

Commit: `ai: richer move facts + personalities`

## Phase 7: Polish check
- Test at 1920x1080 and 1366x768: no scrollbars, nothing cut off.
- 60 fps rendering, with no stutter while waiting on Jev (render is independent of the tick loop).
- There are no console errors.
- A full watch-mode round lasts 20 to 60 seconds. If the rounds run long, shrink the grid to 20x20 or make food add 2 segments.
- Update `README.md`: a one-line pitch, a GIF placeholder, run steps (`npm i`, create `.env` from `.env.example`, `node server.js`, open `localhost:3000/?watch=1`).
- Commit: `polish + readme`

## Rules
- Keep it vanilla JS and canvas. No frameworks, no build step.
- Never commit `.env`. Run `git status` before every commit.
- Keep the tick at 300 ms. Never block rendering on the Jev call.
