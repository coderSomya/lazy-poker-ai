import { Router, Request, Response } from 'express';
import { broadcast } from '../ws';

const router: Router = Router();

const liveEvents: unknown[] = [];

export function pushSimEvent(event: unknown): void {
  liveEvents.push(event);
  if (liveEvents.length > 500) liveEvents.shift();
  broadcast('sim-event', event);
}

router.get('/events', (_req: Request, res: Response) => {
  res.json(liveEvents.slice(-100));
});

router.post('/events', (req: Request, res: Response) => {
  const event = req.body;
  pushSimEvent(event);
  res.json({ ok: true });
});

router.delete('/events', (_req: Request, res: Response) => {
  liveEvents.length = 0;
  res.json({ ok: true });
});

export default router;
