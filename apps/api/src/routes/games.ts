import { Router, Request, Response } from 'express';
import { prisma } from '@lazy-poker/database';

const router: Router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const games = await prisma.game.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: {
      gamePlayers: { include: { player: true } },
      sets: { select: { id: true, setNumber: true, loserId: true, winnerId: true, bluffCaught: true } },
    },
  });
  res.json(games);
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      gamePlayers: { include: { player: true } },
      sets: {
        orderBy: { setNumber: 'asc' },
        include: { bids: { orderBy: { createdAt: 'asc' } }, cardCounts: true },
      },
    },
  });
  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json(game);
});

export default router;
