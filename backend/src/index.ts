import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import botRoutes from './routes/bot';
import tradeRoutes from './routes/trade';
import screenerRoutes from './routes/screener';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';

import { wsHandler } from './services/websocket';
import { startFundingRateMonitor } from './services/fundingMonitor';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
wsHandler(wss);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/bot', authMiddleware, botRoutes);
app.use('/api/trades', authMiddleware, tradeRoutes);
app.use('/api/screener', authMiddleware, screenerRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Vecna Shorts Backend running on port ${PORT}`);
  startFundingRateMonitor();
});

export { wss };
