import { Router, Response } from 'express';
import { AuthRequest, ownerMiddleware } from '../middleware/auth';
import { getFundingRates } from '../services/binanceService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Funding rate screener (owner only)
router.get('/funding', ownerMiddleware, async (_req: AuthRequest, res: Response) => {
  const rates = await getFundingRates();
  res.json(rates);
});

// Selected coins
router.get('/selected', ownerMiddleware, async (_req: AuthRequest, res: Response) => {
  const coins = await prisma.selectedCoin.findMany({ orderBy: { fundingRate: 'asc' } });
  res.json(coins);
});

// Golden coins (owner only)
router.get('/golden', ownerMiddleware, async (_req: AuthRequest, res: Response) => {
  const coins = await prisma.goldenCoin.findMany({ orderBy: { fundingRate: 'asc' } });
  res.json(coins);
});

export default router;
