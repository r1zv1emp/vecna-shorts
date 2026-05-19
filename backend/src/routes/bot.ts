import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { startUserBot, stopUserBot, getBotStatus } from '../services/botManager';

const router = Router();
const prisma = new PrismaClient();

// Get bot settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  let settings = await prisma.botSettings.findUnique({ where: { userId: req.user!.id } });
  if (!settings) {
    settings = await prisma.botSettings.create({
      data: { userId: req.user!.id }
    });
  }
  res.json(settings);
});

// Update bot settings
router.put('/settings',
  [
    body('marginPercent').optional().isFloat({ min: 1, max: 100 }),
    body('takeProfitPct').optional().isFloat({ min: 0.1 }),
    body('stopLossPct').optional().isFloat({ min: 0.1 }),
    body('closeAfterMin').optional().isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const settings = await prisma.botSettings.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...req.body },
      update: req.body
    });
    res.json(settings);
  }
);

// Start bot
router.post('/start', async (req: AuthRequest, res: Response) => {
  const apiSettings = await prisma.apiSettings.findUnique({ where: { userId: req.user!.id } });
  if (!apiSettings) return res.status(400).json({ error: 'Please configure Binance API keys first' });

  await startUserBot(req.user!.id);
  await prisma.botSettings.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id, isRunning: true },
    update: { isRunning: true }
  });
  res.json({ status: 'started' });
});

// Stop bot
router.post('/stop', async (req: AuthRequest, res: Response) => {
  await stopUserBot(req.user!.id);
  await prisma.botSettings.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id, isRunning: false },
    update: { isRunning: false }
  });
  res.json({ status: 'stopped' });
});

// Get bot status
router.get('/status', async (req: AuthRequest, res: Response) => {
  const status = getBotStatus(req.user!.id);
  const settings = await prisma.botSettings.findUnique({ where: { userId: req.user!.id } });
  res.json({ ...status, isRunning: settings?.isRunning || false });
});

export default router;
