import { PrismaClient } from '@prisma/client';
import { getDecryptedApiSettings } from '../routes/settings';
import { getMaxLeverage, setLeverage, placeOrder, getAccountBalance, getMarkPrice, getFundingRates } from './binanceService';
import { sendToUser } from './websocket';

const prisma = new PrismaClient();
const botIntervals = new Map<string, NodeJS.Timeout>();
const botStatus = new Map<string, { trades: number; lastRun?: string }>();

export const startUserBot = async (userId: string) => {
  if (botIntervals.has(userId)) return;
  
  botStatus.set(userId, { trades: 0 });
  const interval = setInterval(() => runBotCycle(userId), 10000); // check every 10s
  botIntervals.set(userId, interval);
  
  console.log(`[Bot] Started for user ${userId}`);
  sendToUser(userId, { type: 'BOT_STARTED' });
};

export const stopUserBot = async (userId: string) => {
  const interval = botIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    botIntervals.delete(userId);
  }
  botStatus.delete(userId);
  console.log(`[Bot] Stopped for user ${userId}`);
  sendToUser(userId, { type: 'BOT_STOPPED' });
};

export const getBotStatus = (userId: string) => {
  return botStatus.get(userId) || { trades: 0 };
};

const runBotCycle = async (userId: string) => {
  try {
    const apiSettings = await getDecryptedApiSettings(userId);
    if (!apiSettings) return stopUserBot(userId);

    const botSettings = await prisma.botSettings.findUnique({ where: { userId } });
    if (!botSettings?.isRunning) return stopUserBot(userId);

    // Get funding rates and find next funding time
    const rates = await getFundingRates();
    const now = Date.now();

    // Check for coins near funding time (within 1.5 seconds)
    for (const rate of rates) {
      if (rate.fundingRate > -0.4) continue; // Only trade very negative rates
      
      const timeToFunding = rate.nextFundingTime - now;
      // Execute 0.4s after funding deduction (funding at 0ms, enter at 400ms)
      if (timeToFunding > -600 && timeToFunding < -300) {
        await executeShort(userId, rate.symbol, rate.fundingRate, apiSettings, botSettings);
      }
    }

    // Check open trades for TP/SL/time-based close
    await checkOpenTrades(userId, apiSettings);

    const status = botStatus.get(userId);
    if (status) {
      status.lastRun = new Date().toISOString();
      botStatus.set(userId, status);
    }
  } catch (err) {
    console.error(`[Bot] Cycle error for ${userId}:`, err);
  }
};

const executeShort = async (
  userId: string,
  symbol: string,
  fundingRate: number,
  apiSettings: { apiKey: string; secretKey: string; isTestnet: boolean },
  botSettings: { marginPercent: number; takeProfitPct: number; stopLossPct: number; closeAfterMin: number }
) => {
  try {
    // Check for existing open trade on same symbol
    const existing = await prisma.trade.findFirst({ where: { userId, symbol, status: 'OPEN' } });
    if (existing) return;

    const balance = await getAccountBalance(apiSettings.apiKey, apiSettings.secretKey, apiSettings.isTestnet);
    if (balance < 10) return;

    const leverage = await getMaxLeverage(symbol, apiSettings.apiKey, apiSettings.secretKey, apiSettings.isTestnet);
    await setLeverage(symbol, leverage, apiSettings.apiKey, apiSettings.secretKey, apiSettings.isTestnet);

    const markPrice = await getMarkPrice(symbol);
    const marginUsdt = balance * (botSettings.marginPercent / 100);
    const notional = marginUsdt * leverage;
    const quantity = parseFloat((notional / markPrice).toFixed(3));

    if (quantity <= 0) return;

    const order = await placeOrder(symbol, 'SELL', quantity, apiSettings.apiKey, apiSettings.secretKey, apiSettings.isTestnet);

    const trade = await prisma.trade.create({
      data: {
        userId,
        symbol,
        side: 'SHORT',
        entryPrice: parseFloat(order.avgPrice || markPrice.toString()),
        quantity,
        leverage,
        margin: marginUsdt,
        fundingRate,
        entryOrderId: order.orderId?.toString(),
        status: 'OPEN'
      }
    });

    sendToUser(userId, { type: 'TRADE_OPENED', trade });
    console.log(`[Bot] Opened SHORT ${symbol} for user ${userId}`);
  } catch (err) {
    console.error(`[Bot] executeShort error ${symbol}:`, err);
  }
};

const checkOpenTrades = async (
  userId: string,
  apiSettings: { apiKey: string; secretKey: string; isTestnet: boolean }
) => {
  const botSettings = await prisma.botSettings.findUnique({ where: { userId } });
  if (!botSettings) return;

  const openTrades = await prisma.trade.findMany({ where: { userId, status: 'OPEN' } });

  for (const trade of openTrades) {
    try {
      const currentPrice = await getMarkPrice(trade.symbol);
      const pnlPct = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100 * trade.leverage;
      const elapsed = (Date.now() - trade.openedAt.getTime()) / 60000; // minutes

      let shouldClose = false;
      let closeReason = '';

      if (pnlPct >= botSettings.takeProfitPct) {
        shouldClose = true;
        closeReason = 'TAKE_PROFIT';
      } else if (pnlPct <= -botSettings.stopLossPct) {
        shouldClose = true;
        closeReason = 'STOP_LOSS';
      } else if (elapsed >= botSettings.closeAfterMin) {
        shouldClose = true;
        closeReason = 'TIME_CLOSE';
      }

      if (shouldClose) {
        const closeOrder = await placeOrder(trade.symbol, 'BUY', trade.quantity, apiSettings.apiKey, apiSettings.secretKey, apiSettings.isTestnet);
        const exitPrice = parseFloat(closeOrder.avgPrice || currentPrice.toString());
        const realPnl = (trade.entryPrice - exitPrice) * trade.quantity * trade.leverage - (trade.margin * 0.0004 * 2);

        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            exitPrice,
            pnl: realPnl,
            status: 'CLOSED',
            closedAt: new Date(),
            closeReason,
            exitOrderId: closeOrder.orderId?.toString(),
            duration: Math.round(elapsed)
          }
        });

        sendToUser(userId, { type: 'TRADE_CLOSED', tradeId: trade.id, pnl: realPnl, reason: closeReason });
      }
    } catch (err) {
      console.error(`[Bot] checkOpenTrades error ${trade.symbol}:`, err);
    }
  }
};
