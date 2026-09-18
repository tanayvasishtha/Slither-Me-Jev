// Jev bridge: one call per tick, 7 questions (one per AI snake)
import "dotenv/config";
import express from "express";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const app = express();
app.use(express.json());
app.use(express.static("."));
const jev = new TypeSafeClient(); // reads TYPESAFE_API_KEY from env

app.post("/moves", async (req, res) => {
  try {
    const { snakes } = req.body; // [{id, personality, moves:{dir:fact}}]
    const questions = {};
    for (const s of snakes) {
      questions[s.id] = choice(
        `You are snake "${s.personality}" in a battle royale. Pick your next move.`,
        s.moves
      );
    }
    const r = await jev.systemOne({
      state: `Tick in an 8-snake arena. ${snakes.length} AI snakes deciding moves now.`,
      questions,
    });
    const out = {};
    for (const id in r.answers) {
      out[id] = { choice: r.answers[id].choice, probabilities: r.answers[id].probabilities };
    }
    res.json(out);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Slither Me Jev on http://localhost:3000"));
