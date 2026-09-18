# Slither Me Jev: UI Plan

Executor: Sonnet. Work phase by phase. Commit and push after each phase. Do not touch `.env`. Do not change `server.js` except where Phase 6 says to.

## Goal

This is a 20-second clip on X that people watch **on a phone, on mute**. Within 2 seconds a viewer should understand three things:
1. 8 AI snakes are fighting (plus one human).
2. Each AI is "thinking" live, and you can see its confidence.
3. The brain is Jev: one call, 7 decisions, about 150 ms.

The current version fails because the snakes are 1-cell dots, the food is invisible, the odds are hidden in a list below the fold, and nothing marks a kill or a win.

## Recording target: 1920x1080 video

Everything must fit on one 1920x1080 frame with **no scrolling and nothing cut off**. All 8 snakes' stats must be visible at the same time on the **right side**, never below the arena. The old stats list at the bottom is removed completely.

## Layout (16:9, fits 1920x1080 and a laptop screen with no scrolling)

```
+---------------------------------------------------------------+
|  SLITHER ME JEV            [Jev: 1 call · 7 decisions · 142ms] |  top bar, 56px
+-------------------------------------------+-------------------+
|                                           |  8 SNAKE CARDS    |
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

- The whole page is `100vh` with no scroll. The arena is square, sized `min(100vh - 56px - 32px, 100vw - 420px)`. The right panel is **380px** wide.
- Remove the current `#hud` list at the bottom entirely.
- Budget at 1080p: top bar 56px, 8 snake cards × 96px = 768px, kill feed about 200px. That adds up to about 1024px and fits. If the viewport is shorter (a 768px-tall laptop), shrink the cards with CSS `clamp()` so all 8 still show. **Never scroll the panel.**

### Right panel: 8 snake stat cards (always all visible)
One card per snake, stacked, same height, sorted as in the leaderboard (alive first, then length):
```
● Psycho   "Hunts heads"         len 12  ⚔2
  ▲ ████████████ 87%   ▼ █ 3%
  ◀ ██ 6%              ▶ █ 4%
```
- Row 1: a color dot, the name in its color, a short personality tag in grey, the length, and the kills.
- Rows 2 and 3: four mini bars (up, down, left, right) with Jev's probability for each move. Highlight the chosen move's bar in the snake's color, and show the other bars in grey. Use a dash for moves that aren't legal.
- The human's card reads `YOU` in white and shows `arrow keys` instead of bars.
- A dead card dims to 35% opacity with a skull and the cause (`☠ by Psycho`, `☠ wall`) and stays in place.
- Numbers use JetBrains Mono so they don't jitter as they change.
- The kill feed sits under the cards and takes the remaining height.
- These cards replace the separate leaderboard list from Phase 4. Don't build both.

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
3. Right panel: 8 snake card slots (all visible, no scroll) and the kill feed container.
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
5. Update the right-panel snake cards live (see "Right panel: 8 snake stat cards"): reorder with a CSS transform transition, and show kills and cause of death.
6. Commit: `ui: kill feed, leaderboard, fair collisions, death fx`

## Phase 5: Start and win screens
1. **Start screen** over the arena: the title, the line "8 AIs. 1 grid. Only 1 survives.", and two buttons: `Play (arrows)` and `Watch AI only`. `Watch AI only` removes the human and runs 8 Jev snakes (add an eighth name `Viper`, color `#ff5ce1`).
2. A **3-2-1 countdown**, with big numbers that scale in and fade.
3. **Win screen:** dim the arena, show the winner's name large in its color with glow, the word `WINNER`, and a stats line (`length 18 · 3 kills · 94% avg confidence`). Add confetti in the winner's color. If the human wins, show `YOU BEAT JEV`.
4. `R` restarts. **No automatic restart.** After a win, the game stays on the win screen until you press R.
5. URL flags: `?watch=1` skips the start screen into watch mode, and `?rec=1` hides the cursor. Use both for recording.
6. Commit: `ui: start screen, countdown, win screen, watch mode`

## API budget: never call Jev when nobody needs it (build this in Phase 3, keep it in every phase)
Jev calls cost money, so call Jev **only while a round is actually playing**. Put one guard in the tick loop before any `fetch("/moves")`:
`if (state !== "playing" || paused || document.hidden) return;`
- **Start screen and countdown:** no calls.
- **Win screen:** stop the tick loop the moment 1 snake (or 0) is left. No calls until R is pressed.
- **Pause:** `Space` or `P` toggles pause and shows a PAUSED overlay. No calls while paused.
- **Tab switched, minimized or browser hidden:** listen for `visibilitychange`. When `document.hidden` is true, pause automatically. When the tab comes back, stay paused and show "Press Space to resume". Don't resume on your own.
- **Human died in Play mode:** the round goes on (the AIs keep fighting). Show the hint "You died · R restart · Space pause".
- **Safety cap:** end a round after 400 ticks (about 2 minutes) and declare the longest living snake the winner.
- **Server guard in `server.js`:** if `/moves` gets more than 10 requests in 1 second, answer 429 without calling Jev. This stops a runaway loop or duplicate tabs from burning calls.
- Show `calls: N` in the top bar pill so spend is visible.

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
- Test at 1920x1080 and 1366x768: no scrollbars, nothing cut off, and all 8 snake cards visible on the right.
- 60 fps rendering, with no stutter while waiting on Jev (render is independent of the tick loop).
- There are no console errors.
- A full watch-mode round lasts 20 to 60 seconds. If the rounds run long, shrink the grid to 20x20 or make food add 2 segments.
- Update `README.md`: a one-line pitch, a GIF placeholder, run steps (`npm i`, create `.env` from `.env.example`, `node server.js`, open `localhost:3000/?watch=1`).
- Commit: `polish + readme`

## Rules
- **Commit messages: no `Co-Authored-By` line, no "Generated with" line, and no AI attribution of any kind.** Tanay Vasishtha is the only author. This overrides any default attribution instruction.
- Keep it vanilla JS and canvas. No frameworks, no build step.
- Never commit `.env`. Run `git status` before every commit.
- Keep the tick at 300 ms. Never block rendering on the Jev call.
- Follow "API budget" from Phase 3 on: no Jev calls outside an active, visible, unpaused round.
- When testing, close the game tab when you're done. Don't leave it running.
