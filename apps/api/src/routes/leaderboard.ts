import { Router, Request, Response } from 'express';
import { prisma } from '@lazy-poker/database';

const router: Router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const stats = await prisma.playerStats.findMany({
    include: { player: true },
    orderBy: [{ gamesWon: 'desc' }, { gamesLost: 'asc' }],
  });

  const leaderboard = stats.map((s: typeof stats[0], idx: number) => ({
    rank: idx + 1,
    playerId: s.playerId,
    playerName: s.player.name,
    model: s.player.model,
    gamesPlayed: s.gamesPlayed,
    gamesWon: s.gamesWon,
    gamesLost: s.gamesLost,
    winRate: s.gamesPlayed > 0 ? ((s.gamesWon / s.gamesPlayed) * 100).toFixed(1) : '0.0',
    setsWon: s.setsWon,
    setsLost: s.setsLost,
    bluffsAttempted: s.bluffsAttempted,
    bluffsCaught: s.bluffsCaught,
    bluffsSucceeded: s.bluffsSucceeded,
    bluffSuccessRate:
      s.bluffsAttempted > 0 ? ((s.bluffsSucceeded / s.bluffsAttempted) * 100).toFixed(1) : '0.0',
    checksCorrect: s.checksCorrect,
    checksIncorrect: s.checksIncorrect,
    totalBidsMade: s.totalBidsMade,
  }));

  res.json(leaderboard);
});

export default router;
