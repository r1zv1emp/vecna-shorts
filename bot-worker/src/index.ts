import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { runAllUserBots } from './strategies/fundingBot';
import { updateFundingRates } from './services/fundingService';

const prisma = new PrismaClient();
let running = false;

console.log('🤖 Vecna Shorts Bot Worker starting...');

const tick = async () => {
  if (running) return;
  running = true;
  try {
    await updateFundingRates();
    await runAllUserBots();
  } catch (err) {
    console.error('[Worker] tick error:', err);
  } finally {
    running = false;
  }
};

// Run every 10 seconds
setInterval(tick, 10_000);
tick(); // immediate first run

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
