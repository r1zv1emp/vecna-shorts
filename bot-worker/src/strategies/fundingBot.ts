import { PrismaClient } from '@prisma/client';
import CryptoJS from 'crypto-js';
import { getFundingRates } from '../services/fundingService';
import { getBalance, getMarkPrice, getMaxLeverage, setLeverage, placeMarketOrder } from '../services/binanceExecutor';

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vecna-secret-key-32chars-minimum!!';

const decrypt = (cipher: string): string => {
  try {
    return CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  } catch { return ''; }
};

export const runAllUserBots = async () => {
  // Get all active bot instances
  const activeBots = await prisma.botSettings.findMany({
    where: { isRunning: true },
    include: { user: { include: { apiSettings: true } } },
  });

  await Promise.allSettled(activeBots.map(bot => runUserBot(bot)));
};

const runUserBot = async (bot: {
  userId: string;
  marginPercent: number;
  takeProfitPct: number;
  stopLossPct: number;
  closeAfterMin: number;
  user: {
    apiSettings: {
      apiKey: string;
      secretKey: string;
      isTestnet: boolean;
    } | null;
  };
}) => {
  if (!bot.user.apiSettings) return;

  const apiKey = decrypt(bot.user.apiSettings.apiKey);
  const secretKey = decrypt(bot.user.apiSettings.secretKey);
  const { isTestnet } = bot.user.apiSettings;

  if (!apiKey || !secretKey) return;

  const rates = await getFundingRates();
  const now = Date.now();

  // Check for entry signals (funding rate <= -0.4% AND near funding time)
  for (const rate of rates) {
    if (rate.fundingRate > -0.4) continue;

    const timeToFunding = rate.nextFundingTime - now;

    // 0.4 seconds AFTER funding deduction window (-600ms to -200ms from funding time)
    if (timeToFunding > -600 || timeToFunding < -800) continue;

    await tryOpenShort(bot.userId, rate.symbol, rate.fundingRate, apiKey, secretKey, isTestnet, bot.marginPercent);
  }

  // Check existing open trades for close conditions
  await checkAndCloseTrades(bot.userId, apiKey, secretKey, isTestnet, bot.takeProfitPct, bot.stopLossPct, bot.closeAfterMin);
};

const tryOpenShort = async (
  userId: string, symbol: string, fundingRate: number,
  apiKey: string, secretKey: string, isTestnet: boolean, marginPercent: number
) => {
  try {
    // Avoid duplicate positions
    const exists = await prisma.trade.findFirst({ where: { userId, symbol, status: 'OPEN' } });
    if (exists) return;

    const balance = await getBalance(apiKey, secretKey, isTestnet);
    if (balance < 10) {
      console.log(`[Bot:${userId}] Insufficient balance: $${balance}`);
      return;
    }

    const leverage = await getMaxLeverage(symbol, apiKey, secretKey, isTestnet);
    await setLeverage(symbol, leverage, apiKey, secretKey, isTestnet);

    const markPrice = await getMarkPrice(symbol);
    const marginUsdt = balance * (marginPercent / 100);
    const notional = marginUsdt * leverage;
    // Round quantity to proper precision
    const rawQty = notional / markPrice;
    const quantity = parseFloat(rawQty.toFixed(3));
    if (quantity <= 0) return;

    console.log(`[Bot:${userId}] Opening SHORT ${symbol} | qty=${quantity} | lev=${leverage}x | funding=${fundingRate.toFixed(4)}%`);

    const order = await placeMarketOrder(symbol, 'SELL', quantity, apiKey, secretKey, isTestnet);
    const entryPrice = parseFloat(order.avgPrice || markPrice.toString());

    await prisma.trade.create({
      data: {
        userId, symbol, side: 'SHORT',
        entryPrice, quantity, leverage,
        margin: marginUsdt, fundingRate,
        entryOrderId: order.orderId?.toString(),
        status: 'OPEN',
      },
    });

    console.log(`[Bot:${userId}] ✅ SHORT opened: ${symbol} @ $${entryPrice}`);
  } catch (err) {
    console.error(`[Bot:${userId}] tryOpenShort ${symbol} error:`, (err as Error).message);
  }
};

const checkAndCloseTrades = async (
  userId: string, apiKey: string, secretKey: string, isTestnet: boolean,
  tpPct: number, slPct: number, closeAfterMin: number
) => {
  const openTrades = await prisma.trade.findMany({ where: { userId, status: 'OPEN' } });

  for (const trade of openTrades) {
    try {
      const currentPrice = await getMarkPrice(trade.symbol);
      const pnlPct = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100 * trade.leverage;
      const elapsedMin = (Date.now() - trade.openedAt.getTime()) / 60_000;

      let shouldClose = false;
      let closeReason = '';

      if (pnlPct >= tpPct) { shouldClose = true; closeReason = 'TAKE_PROFIT'; }
      else if (pnlPct <= -slPct) { shouldClose = true; closeReason = 'STOP_LOSS'; }
      else if (elapsedMin >= closeAfterMin) { shouldClose = true; closeReason = 'TIME_CLOSE'; }

      if (!shouldClose) continue;

      console.log(`[Bot:${userId}] Closing ${trade.symbol} | reason=${closeReason} | pnl%=${pnlPct.toFixed(2)}`);

      const closeOrder = await placeMarketOrder(trade.symbol, 'BUY', trade.quantity, apiKey, secretKey, isTestnet);
      const exitPrice = parseFloat(closeOrder.avgPrice || currentPrice.toString());

      // P&L = (entry - exit) * qty — fees (taker ~0.04% each side)
      const grossPnl = (trade.entryPrice - exitPrice) * trade.quantity;
      const fees = (trade.margin * 0.0004) * 2;
      const realPnl = grossPnl - fees;

      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          exitPrice, pnl: realPnl, status: 'CLOSED',
          closedAt: new Date(), closeReason,
          exitOrderId: closeOrder.orderId?.toString(),
          duration: Math.round(elapsedMin),
        },
      });

      console.log(`[Bot:${userId}] ✅ Closed ${trade.symbol} @ $${exitPrice} | PnL=$${realPnl.toFixed(2)}`);
    } catch (err) {
      console.error(`[Bot:${userId}] checkAndCloseTrades ${trade.symbol} error:`, (err as Error).message);
    }
  }
};
