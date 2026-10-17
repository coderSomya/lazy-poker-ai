import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { initWebSocket } from './ws';
import gamesRouter from './routes/games';
import leaderboardRouter from './routes/leaderboard';
import simulationRouter from './routes/simulation';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/games', gamesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/simulation', simulationRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
initWebSocket(server);

const PORT = process.env.API_PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
