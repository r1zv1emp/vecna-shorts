# 🕷️ Vecna Shorts — Funding Rate Bot

24/7 Binance Futures funding rate shorting bot with full dashboard.

---

## 📁 Project Structure

```
vecna-shorts/
├── frontend/          ← Next.js dashboard (Vercel)
├── backend/           ← Express API + WebSocket (Fly.io)
├── bot-worker/        ← Background trading bot (Fly.io)
├── docker-compose.yml ← Local dev setup
└── .github/           ← CI/CD workflows
```

---

## 🔑 Default Login

| Field    | Value         |
|----------|---------------|
| Username | `Vecna7`      |
| Password | `@Hassanr1zv1`|

---

## ⚡ STEP 1 — Local Setup (Test First)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Git

### Run locally with Docker

```bash
# 1. Clone your repo
git clone https://github.com/YOUR_USERNAME/vecna-shorts.git
cd vecna-shorts

# 2. Start everything (database + backend + bot + frontend)
docker-compose up --build

# 3. Open browser
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001/health
```

### Run locally without Docker (manual)

```bash
# Terminal 1 — Start PostgreSQL (Docker only for DB)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=vecna_shorts postgres:16-alpine

# Terminal 2 — Backend
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

# Terminal 3 — Bot Worker
cd bot-worker
cp .env.example .env
# Same DATABASE_URL and ENCRYPTION_KEY as backend
npm install
npx prisma generate
npm run dev

# Terminal 4 — Frontend
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001
# Set NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
npm install
npm run dev
```

---

## 🐙 STEP 2 — GitHub Upload

```bash
# Inside vecna-shorts/ folder:

git init
git add .
git commit -m "🚀 Initial commit — Vecna Shorts"

# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/vecna-shorts.git
git branch -M main
git push -u origin main
```

---

## 🚀 STEP 3 — Fly.io Deploy (Backend + Bot)

### Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux / Windows WSL
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

### Deploy Backend

```bash
cd backend

# Build TypeScript first
npm install
npm run build

# Create Fly app
fly apps create vecna-shorts-backend

# Set secrets (run each line separately)
fly secrets set DATABASE_URL="postgresql://user:pass@host:5432/vecna_shorts" --app vecna-shorts-backend
fly secrets set JWT_SECRET="your-random-32-char-secret-here" --app vecna-shorts-backend
fly secrets set ENCRYPTION_KEY="your-32-char-encryption-key-here!!" --app vecna-shorts-backend
fly secrets set FRONTEND_URL="https://your-vercel-app.vercel.app" --app vecna-shorts-backend

# Create PostgreSQL database (Fly managed)
fly postgres create --name vecna-shorts-db --region iad
fly postgres attach vecna-shorts-db --app vecna-shorts-backend

# Deploy
fly deploy --app vecna-shorts-backend

# Run migrations
fly ssh console --app vecna-shorts-backend -C "npx prisma migrate deploy"
fly ssh console --app vecna-shorts-backend -C "npx ts-node src/utils/seed.ts"

# Get your backend URL (save it — needed for Vercel)
# https://vecna-shorts-backend.fly.dev
```

### Deploy Bot Worker

```bash
cd bot-worker

npm install
npm run build

fly apps create vecna-shorts-bot

# Must use same DATABASE_URL and ENCRYPTION_KEY as backend
fly secrets set DATABASE_URL="postgresql://user:pass@host:5432/vecna_shorts" --app vecna-shorts-bot
fly secrets set ENCRYPTION_KEY="your-32-char-encryption-key-here!!" --app vecna-shorts-bot

fly deploy --app vecna-shorts-bot
```

### Verify both are running
```bash
fly status --app vecna-shorts-backend
fly status --app vecna-shorts-bot
fly logs --app vecna-shorts-bot
```

---

## 🌐 STEP 4 — Vercel Deploy (Frontend)

### Option A — Vercel Dashboard (easiest)

1. Go to **vercel.com** → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://vecna-shorts-backend.fly.dev
   NEXT_PUBLIC_WS_URL  = wss://vecna-shorts-backend.fly.dev/ws
   ```
5. Click **Deploy**

### Option B — Vercel CLI

```bash
cd frontend

npm i -g vercel
vercel login

# Set env vars
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://vecna-shorts-backend.fly.dev

vercel env add NEXT_PUBLIC_WS_URL production
# Enter: wss://vecna-shorts-backend.fly.dev/ws

# Deploy
vercel --prod
```

---

## 🔐 Environment Variables Reference

### Backend (.env)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random 32+ char string for JWT signing |
| `ENCRYPTION_KEY` | 32+ char key for API key encryption |
| `REDIS_URL` | Redis connection (optional, for queues) |
| `FRONTEND_URL` | Your Vercel app URL (for CORS) |
| `PORT` | Server port (default: 3001) |

### Bot Worker (.env)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Same PostgreSQL as backend |
| `ENCRYPTION_KEY` | **Exact same** as backend |

### Frontend (.env.local)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Your backend URL |
| `NEXT_PUBLIC_WS_URL` | Your backend WebSocket URL |

---

## 🤖 How the Bot Works

1. **Funding Monitor** checks Binance every 30s for funding rates
2. Coins with funding ≤ -0.4% → auto-added to **Selected Coins**
3. Coins with funding ≤ -2.0% → saved to **Golden Coins** permanently
4. When user starts bot, it monitors funding times
5. **0.4 seconds after** funding deduction → opens SHORT position
6. Uses **maximum available leverage** automatically
7. Closes trade when: **TP hit** | **SL hit** | **Time expires**

---

## 📊 Features by Role

| Feature | Owner | User |
|---------|-------|------|
| Dashboard Overview | ✅ | ✅ |
| Bot Control | ✅ | ✅ |
| Trades / P&L | ✅ | ✅ |
| Trade Journal | ✅ | ✅ |
| API Settings | ✅ | ✅ |
| Funding Screener | ✅ | ❌ |
| Golden Coins | ✅ | ❌ |
| Admin Panel | ✅ | ❌ |
| Invite Code Generate | ✅ | ❌ |
| User Management | ✅ | ❌ |

---

## 🆘 Troubleshooting

**Bot not trading?**
- Check Binance API keys are set in Settings
- Ensure Futures trading is enabled on your Binance account
- Check bot logs: `fly logs --app vecna-shorts-bot`

**WebSocket not connecting?**
- Make sure `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`) in production

**Database errors?**
- Run: `fly ssh console --app vecna-shorts-backend -C "npx prisma migrate deploy"`

**CORS errors?**
- Set `FRONTEND_URL` secret in backend to match your exact Vercel URL
