import { PrismaClient } from '@prisma/client';
import { getFundingRates } from './binanceService';
import { broadcast } from './websocket';

const prisma = new PrismaClient();

const SELECTED_THRESHOLD = -0.4;
const GOLDEN_THRESHOLD = -2.0;
let monitorInterval: NodeJS.Timeout | null = null;

export const startFundingRateMonitor = () => {
  console.log('[Monitor] Starting funding rate monitor...');
  runMonitor();
  monitorInterval = setInterval(runMonitor, 30000); // every 30s
};

export const stopFundingRateMonitor = () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
};

const runMonitor = async () => {
  try {
    const rates = await getFundingRates();
    if (!rates.length) return;

    // Update selected coins (funding <= -0.4%)
    const selectedCoins = rates.filter(r => r.fundingRate <= SELECTED_THRESHOLD);
    
    // Clear and repopulate selected coins
    await prisma.selectedCoin.deleteMany();
    if (selectedCoins.length > 0) {
      await prisma.selectedCoin.createMany({
        data: selectedCoins.map(c => ({
          symbol: c.symbol,
          fundingRate: c.fundingRate
        })),
        skipDuplicates: true
      });
    }

    // Golden coins: funding <= -2.0%, add permanently (not replace)
    const goldenCoins = rates.filter(r => r.fundingRate <= GOLDEN_THRESHOLD);
    for (const coin of goldenCoins) {
      await prisma.goldenCoin.upsert({
        where: { symbol: coin.symbol },
        create: { symbol: coin.symbol, fundingRate: coin.fundingRate },
        update: { fundingRate: coin.fundingRate }
      });
    }

    // Broadcast to WebSocket clients
    broadcast({ type: 'FUNDING_UPDATE', data: rates.slice(0, 100) });
    broadcast({ type: 'SELECTED_UPDATE', data: selectedCoins });

  } catch (err) {
    console.error('[Monitor] Error:', err);
  }
};
