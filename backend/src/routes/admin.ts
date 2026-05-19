import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, ownerMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

router.use(ownerMiddleware);

// Generate invite code
router.post('/invite-codes/generate',
  [body('expiresInDays').optional().isInt({ min: 1 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { expiresInDays } = req.body;
    const code = uuidv4().split('-')[0].toUpperCase() + uuidv4().split('-')[1].toUpperCase();
    let expiresAt: Date | undefined;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const invite = await prisma.inviteCode.create({ data: { code, expiresAt } });
    res.json(invite);
  }
);

// List invite codes
router.get('/invite-codes', async (_req: AuthRequest, res: Response) => {
  const codes = await prisma.inviteCode.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(codes);
});

// Delete invite code
router.delete('/invite-codes/:id', async (req: AuthRequest, res: Response) => {
  await prisma.inviteCode.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// List users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, username: true, email: true, isActive: true, createdAt: true }
  });
  res.json(users);
});

// Toggle user active
router.patch('/users/:id/toggle', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive } });
  res.json({ isActive: updated.isActive });
});

// Get golden coins
router.get('/golden-coins', async (_req: AuthRequest, res: Response) => {
  const coins = await prisma.goldenCoin.findMany({ orderBy: { fundingRate: 'asc' } });
  res.json(coins);
});

// Remove golden coin
router.delete('/golden-coins/:id', async (req: AuthRequest, res: Response) => {
  await prisma.goldenCoin.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Dashboard stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  const [totalUsers, totalTrades, openTrades, goldenCoins] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.trade.count(),
    prisma.trade.count({ where: { status: 'OPEN' } }),
    prisma.goldenCoin.count()
  ]);
  const totalPnl = await prisma.trade.aggregate({ _sum: { pnl: true }, where: { status: 'CLOSED' } });
  res.json({ totalUsers, totalTrades, openTrades, goldenCoins, totalPnl: totalPnl._sum.pnl || 0 });
});

export default router;
