# Slither Me Jev

8 AI snakes, 1 human. Every AI snake is driven live by TypeSafe's Jev model — one call per tick decides all their moves in parallel, with the odds shown floating over each head.

![gameplay](gameplay.gif)

## Run it

```bash
npm i
cp .env.example .env   # add your TYPESAFE_API_KEY
node server.js
```

Open `http://localhost:3000`.

- `?watch=1` — skip the start screen, 8 Jev snakes only, no human
- `?rec=1` — hide the cursor (for recording)

## Controls

Arrow keys to steer · `Space`/`P` to pause · `O` to toggle the odds tags · `R` to restart

## How Jev fits in

Every tick, the game works out each snake's legal moves and hard facts about them (distance to food, distance to the nearest enemy, open space). All of that goes to Jev as one call with one `choice` question per AI snake, and Jev answers all of them in parallel with a move and a probability. The game only sends options that are actually legal, so Jev can never make an illegal move.

Jev is only called while a round is playing — not on the start screen, not on the win screen, not while paused, and not while the tab is hidden.
