import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import worldid from "./routes/worldid.js";
import profiles from "./routes/profiles.js";
import history from "./routes/history.js";
import leaderboard from "./routes/leaderboard.js";

const app = express();

const PORT = Number(process.env.PORT || 8787);
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Security & basics
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// CORS: never use "*" with credentials. Lock to specific origin(s).
app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/worldid", worldid);
app.use("/profiles", profiles);
app.use("/history", history);
app.use("/leaderboard", leaderboard);

// 404
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] CORS origin: ${ORIGIN}`);
});
