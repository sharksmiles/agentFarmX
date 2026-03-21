# AgentFarm X

**AI Agent Playground on X Layer** | **v3.0**

AgentFarm X is an innovative Web3 application running on the **X Layer** ecosystem. Players can not only manually manage their farms but also deploy **AI Agents** for automated strategy gameplay, resource competition, and intelligent on-chain interactions using **Onchain OS APIs**.

---

## 🌟 Features

- **🤖 AI Agent v2.0**: LLM-driven autonomous agents with GPT-3.5/GPT-4 decision making and Function Calling skills system
- **⛓️ X Layer Ecosystem**: High-performance, low-cost on-chain interactions based on OKX L2
- **💰 x402 + Permit2 Payment**: x402 preauth flow with Uniswap Permit2 for gasless per-skill micro-payments (0.001 USDC/skill)
- **🎮 Database-Driven Config**: 24 crops, 50 levels, dynamic game balance via PostgreSQL
- **🎯 Advanced Steal System**: 7-factor success rate calculation with anti-cheat protection
- **🔗 Onchain OS Integration**: Deep integration with Trade/Market APIs, giving agents market awareness
- **🤝 DAO & Collaboration**: Multi-agent collaboration network, building autonomous economic systems
- **🔐 ERC-4337 Account Abstraction**: Each Agent has its own Smart Contract Account (SCA)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 16
- npm or yarn

### Option 1: Quick Start Script (Recommended)

```powershell
# Windows PowerShell
.\scripts\quick-start.ps1
```

This will automatically:
- ✅ Install dependencies
- ✅ Generate Prisma client
- ✅ Run database migrations
- ✅ Seed game configurations
- ✅ Run tests
- ✅ Start development server

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL and other required variables

# 3. Database setup
npx prisma generate
npx prisma db push

# 4. Initialize game data
npx tsx scripts/seed-game-configs.ts
npx tsx scripts/seed-skills.ts

# 5. Run tests
npx tsx scripts/test-api-endpoints.ts

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

---

## 📚 Documentation

- **[PRD v3.0](./PRD.md)** - Complete product requirements (Chinese)
- **[Smart Contracts](./SMART_CONTRACTS.md)** - Blockchain integration and contract details
- **[Tech Design](./TECH_DESIGN.md)** - Technical architecture

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js 14 App Router pages
│   ├── api/               # API Routes (19 modules)
│   │   ├── agents/        # AI Agent management (11 endpoints)
│   │   ├── auth/          # SIWE authentication
│   │   ├── farm/          # Farm operations (7 endpoints)
│   │   ├── social/        # Friend system, watering, stealing
│   │   ├── cron/          # Vercel Cron Jobs
│   │   └── ...
│   ├── agents/            # AI Agent management pages
│   ├── friends/           # Friend system pages
│   ├── earn/              # Task and rewards pages
│   └── ...
├── components/            # React components (15 modules)
│   ├── agents/           # AI Agent components
│   ├── game/             # Farm game components
│   ├── auth/             # AuthGate, wallet connection
│   ├── context/          # React Context providers
│   └── ...
├── utils/
│   ├── api/              # API client and endpoints
│   ├── func/             # Utility functions (wallet, x402, onchain)
│   ├── types/            # TypeScript type definitions
│   └── mock/             # Mock data for development
├── lib/                   # Shared libraries (Prisma, JWT, cache)
└── middleware/            # Next.js middleware
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: React Context API

### Backend
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5.8
- **Authentication**: SIWE (EIP-4361)
- **AI Engine**: OpenAI API (GPT-3.5/GPT-4)

### Web3
- **Blockchain**: X Layer (OKX L2)
- **Wallet**: EIP-6963 Wallet Discovery
- **Library**: Ethers.js v6
- **Account Abstraction**: ERC-4337 Smart Contract Account
- **Payment**: x402 HTTP Payment Protocol + Uniswap Permit2 (EIP-712 preauth + per-skill transferFrom)

### Testing & DevOps
- **Unit Tests**: Jest
- **E2E Tests**: Cypress
- **Deployment**: Vercel (Serverless + Cron Jobs)

---

## 🎮 Main Features

### 1. Farm Management
- Plant, water, and harvest 24 types of crops
- Upgrade farm levels (1-40)
- Unlock up to 36 land plots
- Boost crops for instant maturity

### 2. AI Agent System (v2.0)
- Create and configure AI agents with personality (`aggressive`/`balanced`/`conservative`) & strategy (`farming`/`raider`)
- LLM-driven decision making with Function Calling (GPT-3.5/GPT-4), plus simulation fallback
- Decision cycle: every **5 minutes** via cron heartbeat
- **12 Skills** across 3 categories:
  - Farming: `plant_crop`, `harvest_crop`, `use_boost`, `unlock_land`, `buy_seed`
  - Social: `steal_crop`, `visit_friend`, `water_friend_crop`, `radar_scan`
  - Strategy: `check_energy`, `optimize_farm`, `analyze_market`
- Per-skill cost: **0.001 USDC** (deducted via Permit2 preauth)
- Monitor agent performance, costs, and decision history
- Internal API calls authenticated via `x-user-id` header (no payment gate)

### 3. Social Features
- Friend system with farm visits
- Water friends' crops for rewards
- Steal crops with 7-factor success rate calculation
- Invitation rewards and leaderboards

### 4. Tasks & Rewards
- Daily check-in rewards (7-day cycle)
- Game tasks and ecosystem tasks
- Airdrop campaigns

### 5. Wallet Integration
- Multi-wallet support (OKX Wallet, MetaMask) via EIP-6963
- Token management (OKB, USDC, FarmCoins)
- Transaction history

### 6. Raffle System
- Buy tickets with FarmCoins
- Twitter task verification
- Winner selection and rewards

---

## ⛓️ Smart Contracts (X Layer Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| USDC | `0x74b7f16337b8972027f6196a17a631ac6de26d22` | Payment token |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | Uniswap Permit2 (agent preauth) |
| Agent Factory | `0x7192862d94c8316FDEE4f8AE7d25f80a30C980b6` | ERC-4337 SCA factory |
| $FARM Token | `0xee9c2a8aF5B232eaf372d78f71B3fC7126798673` | Governance token (ERC-20) |
| Raffle | `0x94d323Aa7612D8C04e0e597c3E637d98A4243aE1` | Raffle contract |

---

## 🤖 AI Agent API

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | Get user's agents |
| `/api/agents` | POST | Create new agent |
| `/api/agents/[id]` | GET/PATCH/DELETE | Agent CRUD |
| `/api/agents/[id]/start` | POST | Start agent (requires fresh Permit2 preauth) |
| `/api/agents/[id]/stop` | POST | Stop agent |
| `/api/agents/[id]/decide` | POST | Trigger LLM decision |
| `/api/agents/[id]/decisions` | GET | Decision history |
| `/api/agents/[id]/logs` | GET | Agent execution logs |
| `/api/agents/[id]/skills` | GET | Available skills |
| `/api/agents/[id]/preauth` | GET/POST/DELETE | Permit2 preauth status & revoke |
| `/api/agents/[id]/preauth/permit2` | POST | Submit Permit2 signature |
| `/api/agents/[id]/topup` | POST/GET | SCA top-up management |

---

## ⏰ Cron Jobs (Vercel)

| Job | Schedule | Description |
|-----|----------|-------------|
| Energy Recovery | `* * * * *` | Restore user energy |
| Crop Maturity | `* * * * *` | Update crop growth status |
| Agent Heartbeat | `*/5 * * * *` | Trigger agent decisions |
| Daily Reset | `0 0 * * *` | Reset daily limits |

---

## 📊 Database Schema

- **16 tables** managed by Prisma ORM
- Core tables: User, FarmState, LandPlot, Agent, AgentSkill, AgentDecision, AgentPaymentAuth
- Full-text search and cursor-based pagination

---

## 🚢 Deployment

### Vercel (Recommended)
The easiest way to deploy is using the [Vercel Platform](https://vercel.com):

```bash
vercel
```

### Environment Variables Required
```
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
OPENAI_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
# Permit2 / Payment
BACKEND_WALLET_PRIVATE_KEY=
NEXT_PUBLIC_PAYMENT_RECEIVER=
NEXT_PUBLIC_PAYMENT_TOKEN=
NEXT_PUBLIC_NETWORK=
```

---

## 📝 License

This project is part of the X Layer ecosystem.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

**Built with ❤️ for the X Layer ecosystem**
