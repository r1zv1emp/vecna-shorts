import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get trades
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, limit = '50', offset = '0' } = req.query;
  const where: Record<string, unknown> = { userId: req.user!.id };
  if (status) where.status = status;

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    }),
    prisma.trade.count({ where })
  ]);
  res.json({ trades, total });
});

// Get single trade
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  res.json(trade);
});

// PnL summary
router.get('/stats/summary', async (req: AuthRequest, res: Response) => {
  const [open, closed, totalPnl, winCount] = await Promise.all([
    prisma.trade.count({ where: { userId: req.user!.id, status: 'OPEN' } }),
    prisma.trade.count({ where: { userId: req.user!.id, status: 'CLOSED' } }),
    prisma.trade.aggregate({ _sum: { pnl: true }, where: { userId: req.user!.id, status: 'CLOSED' } }),
    prisma.trade.count({ where: { userId: req.user!.id, status: 'CLOSED', pnl: { gt: 0 } } })
  ]);
  const winRate = closed > 0 ? (winCount / closed) * 100 : 0;
  res.json({ open, closed, totalPnl: totalPnl._sum.pnl || 0, winRate: winRate.toFixed(1) });
});

export default router;
