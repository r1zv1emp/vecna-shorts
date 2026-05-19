import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  nextFundingTime: number;
  markPrice: number;
}

let cachedRates: FundingRate[] = [];
let lastFetch = 0;
const CACHE_TTL = 25_000; // 25 seconds

export const getFundingRates = async (): Promise<FundingRate[]> => {
  if (Date.now() - lastFetch < CACHE_TTL && cachedRates.length > 0) {
    return cachedRates;
  }
  try {
    const [fundingRes, priceRes] = await Promise.all([
      axios.get('https://fapi.binance.com/fapi/v1/fundingRate', { params: { limit: 500 }, timeout: 5000 }),
      axios.get('https://fapi.binance.com/fapi/v1/premiumIndex', { timeout: 5000 }),
    ]);

    const priceMap: Record<string, number> = {};
    const nextFundingMap: Record<string, number> = {};
    for (const item of priceRes.data) {
      priceMap[item.symbol] = parseFloat(item.markPrice);
      nextFundingMap[item.symbol] = item.nextFundingTime;
    }

    cachedRates = fundingRes.data
      .filter((r: { symbol: string }) => r.symbol.endsWith('USDT'))
      .map((r: { symbol: string; fundingRate: string }) => ({
        symbol: r.symbol,
        fundingRate: parseFloat(r.fundingRate) * 100,
        nextFundingTime: nextFundingMap[r.symbol] || 0,
        markPrice: priceMap[r.symbol] || 0,
      }))
      .sort((a: FundingRate, b: FundingRate) => a.fundingRate - b.fundingRate);

    lastFetch = Date.now();
    return cachedRates;
  } catch (err) {
    console.error('[FundingService] fetch error:', err);
    return cachedRates;
  }
};

export const updateFundingRates = async () => {
  const rates = await getFundingRates();
  if (!rates.length) return;

  const SELECTED_THRESHOLD = -0.4;
  const GOLDEN_THRESHOLD = -2.0;

  const selected = rates.filter(r => r.fundingRate <= SELECTED_THRESHOLD);

  // Refresh selected coins
  await prisma.selectedCoin.deleteMany();
  if (selected.length > 0) {
    await prisma.selectedCoin.createMany({
      data: selected.map(c => ({ symbol: c.symbol, fundingRate: c.fundingRate })),
      skipDuplicates: true,
    });
  }

  // Upsert golden coins
  const golden = rates.filter(r => r.fundingRate <= GOLDEN_THRESHOLD);
  for (const coin of golden) {
    await prisma.goldenCoin.upsert({
      where: { symbol: coin.symbol },
      create: { symbol: coin.symbol, fundingRate: coin.fundingRate },
      update: { fundingRate: coin.fundingRate },
    });
  }
};
