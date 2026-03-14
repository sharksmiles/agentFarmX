# AgentFarm X — 全栈技术设计文档 v2.0

> **版本**: v2.0 | **日期**: 2026-03-14 | **范围**: Next.js 全栈 + 智能合约

---

# 目录

1. [系统架构总览](#1-系统架构总览)
2. [技术栈选型](#2-技术栈选型)
3. [数据库设计](#3-数据库设计)
4. [后端 API 实现规范](#4-后端-api-实现规范)
5. [智能合约设计](#5-智能合约设计)
6. [x402 支付协议实现](#6-x402-支付协议实现)
7. [AI Agent 执行引擎](#7-ai-agent-执行引擎)
8. [安全设计](#8-安全设计)
9. [部署架构](#9-部署架构)
10. [开发里程碑](#10-开发里程碑)

---

# 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 全栈应用                        │
│  App Router · React Server Components · Server Actions      │
│  Client: Ethers.js v6 · EIP-6963 Wallet · TailwindCSS       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌────────────────────┐      ┌──────────────────────┐
│  API Routes         │      │  Vercel Cron Jobs    │
│  /api/auth/*        │      │  能量恢复 (1min)      │
│  /api/game/*        │      │  作物成熟检测 (1min)  │
│  /api/agents/*      │      │  Agent 心跳 (10s)     │
│  /api/social/*      │      │  每日重置 (0:00)      │
└─────────┬──────────┘      └──────────┬───────────┘
          │                            │
          ▼                            ▼
┌─────────────────────────────────────────────────────┐
│              Prisma ORM + PostgreSQL 16              │
│              Upstash Redis (Serverless)              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
            ┌────────────────────────┐
            │  X Layer (OKX L2)       │
            │  AgentFactory.sol       │
            │  FarmToken.sol ($FARM)  │
            │  RaffleContract.sol     │
            │  DAOGovernor.sol        │
            └────────────────────────┘
```

## 1.1 架构特点

| 特性 | 说明 |
|------|------|
| **全栈统一** | Next.js 14 App Router，前后端同一代码库 |
| **Server Components** | 服务端渲染，减少客户端 JS，SEO 友好 |
| **API Routes** | `/app/api/*` 目录，原生支持 Edge Runtime |
| **Serverless** | Vercel 部署，自动扩缩容，按需计费 |
| **Prisma ORM** | 类型安全的数据库访问，自动迁移 |
| **Vercel Cron** | 替代 Celery，原生定时任务支持 |
| **Upstash Redis** | Serverless Redis，兼容标准协议 |

---

# 2. 技术栈选型

| 组件 | 选型 | 理由 |
|------|------|------|
| **全栈框架** | Next.js 14 (App Router) | 前后端统一，React Server Components |
| **语言** | TypeScript 5.3 | 类型安全，前后端共享类型 |
| **数据库** | PostgreSQL 16 (Vercel Postgres) | JSONB 支持，Serverless 友好 |
| **ORM** | Prisma 5.8 | 类型安全，自动迁移，Edge 兼容 |
| **缓存** | Upstash Redis | Serverless Redis，按请求计费 |
| **定时任务** | Vercel Cron Jobs | 原生 cron 支持，无需额外服务 |
| **认证** | NextAuth.js 5 + SIWE | Web3 认证，Session 管理 |
| **链交互** | Ethers.js v6 + Viem | 前后端共用，类型安全 |
| **实时通信** | Server-Sent Events (SSE) | Agent 日志流式推送 |
| **部署** | Vercel | Edge Network，全球 CDN |
| **合约语言** | Solidity ^0.8.24 | EVM 标准 |
| **合约框架** | Hardhat + OpenZeppelin 5 | 工业标准 |
| **账户抽象** | ERC-4337 | Agent SCA |
| **随机数** | Chainlink VRF v2.5 | 抽奖公平性 |

---

# 3. 数据库设计

> 数据库：PostgreSQL 16。所有表含 `created_at` / `updated_at`。

## 3.1 ER 关系图（逻辑视图）

```
users ──┬── farm_states ── land_plots ── growing_crops
        ├── inventories
        ├── agents ── agent_logs
        ├── friendships / friend_requests
        ├── user_task_progress / daily_checkins
        ├── user_renaissance_progress
        ├── raffle_tickets ── raffles ── raffle_winners
        ├── invitations / activity_records
        ├── airdrop_eligibility ── airdrop_campaigns
        ├── dao_votes ── dao_proposals
        └── capila_nft_holdings
```

---

## 3.2 用户与认证

### `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  VARCHAR(42) UNIQUE NOT NULL,
    username        VARCHAR(64) NOT NULL DEFAULT '',
    lang            VARCHAR(8)  NOT NULL DEFAULT 'en',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_new_user     BOOLEAN     NOT NULL DEFAULT TRUE,
    onboarding_phase SMALLINT   NOT NULL DEFAULT 0,
    invite_code     VARCHAR(16) UNIQUE NOT NULL,
    inviter_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    total_invites   INT         NOT NULL DEFAULT 0,
    stone_balance   INT         NOT NULL DEFAULT 0,
    crystal_balance INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_wallet     ON users(wallet_address);
CREATE INDEX idx_users_invite_code ON users(invite_code);
```

### `siwe_nonces`

```sql
CREATE TABLE siwe_nonces (
    nonce       VARCHAR(64) PRIMARY KEY,
    wallet_addr VARCHAR(42) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,   -- NOW() + 5 minutes
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `user_sessions`

```sql
CREATE TABLE user_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id),
    refresh_token VARCHAR(256) UNIQUE NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,   -- 24h
    ip_address    INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3.3 农场核心

### `farm_states`

```sql
CREATE TABLE farm_states (
    user_id          UUID PRIMARY KEY REFERENCES users(id),
    level            SMALLINT NOT NULL DEFAULT 1,
    level_exp        INT      NOT NULL DEFAULT 0,
    coin_balance     BIGINT   NOT NULL DEFAULT 0,
    boost_left       SMALLINT NOT NULL DEFAULT 3,
    boost_reset_at   DATE     NOT NULL DEFAULT CURRENT_DATE,
    energy_left      SMALLINT NOT NULL DEFAULT 40,
    -- max_energy = 40 + level*2，由应用层计算，不存储
    next_restore_at  TIMESTAMPTZ,
    -- 购买 Energy 次数限制（按天重置）
    energy_buy_small INT NOT NULL DEFAULT 0,  -- 上限 3
    energy_buy_large INT NOT NULL DEFAULT 0,  -- 上限 1
    energy_buy_full  INT NOT NULL DEFAULT 0,  -- 上限 1
    energy_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `land_plots`

```sql
CREATE TABLE land_plots (
    id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID     NOT NULL REFERENCES users(id),
    land_id    SMALLINT NOT NULL CHECK (land_id BETWEEN 1 AND 9),
    land_owned BOOLEAN  NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, land_id)
);
```

> 用户注册时插入 9 条：land_id 1~3 `owned=TRUE`，4~9 `FALSE`。

### `growing_crops`

```sql
CREATE TYPE crop_status AS ENUM ('growing','needs_water','mature','stolen','harvested');

CREATE TABLE growing_crops (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES users(id),
    land_id           SMALLINT    NOT NULL CHECK (land_id BETWEEN 1 AND 9),
    crop_type         VARCHAR(32) NOT NULL,
    planted_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_watered_time TIMESTAMPTZ,
    next_watering_due TIMESTAMPTZ,
    mature_at         TIMESTAMPTZ NOT NULL,
    is_mature         BOOLEAN     NOT NULL DEFAULT FALSE,
    status            crop_status NOT NULL DEFAULT 'growing',
    stolen_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, land_id)
);
CREATE INDEX idx_crops_mature ON growing_crops(mature_at) WHERE is_mature = FALSE;
CREATE INDEX idx_crops_water  ON growing_crops(next_watering_due);
```

### `inventories`

```sql
CREATE TABLE inventories (
    user_id   UUID        NOT NULL REFERENCES users(id),
    crop_type VARCHAR(32) NOT NULL,
    quantity  INT         NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    PRIMARY KEY (user_id, crop_type)
);
```

---

## 3.4 游戏配置（准静态，Redis 缓存）

### `crop_configs`

```sql
CREATE TABLE crop_configs (
    crop_type       VARCHAR(32) PRIMARY KEY,
    unlock_level    SMALLINT NOT NULL,
    seed_price      INT      NOT NULL,
    mature_time     INT      NOT NULL,  -- 分钟
    watering_period INT      NOT NULL,  -- 分钟
    harvest_price   INT      NOT NULL,
    seeding_exp     INT      NOT NULL,
    harvest_exp     INT      NOT NULL,
    sort_order      SMALLINT NOT NULL DEFAULT 0
);
```

### `land_price_configs` / `level_configs`

```sql
CREATE TABLE land_price_configs (
    land_id    SMALLINT PRIMARY KEY CHECK (land_id BETWEEN 1 AND 9),
    price_coin INT NOT NULL DEFAULT 0
);

CREATE TABLE level_configs (
    level        SMALLINT PRIMARY KEY CHECK (level BETWEEN 1 AND 40),
    require_exp  INT      NOT NULL,
    max_land     SMALLINT NOT NULL,
    upgrade_cost INT      NOT NULL
);
```

---

## 3.5 AI Agent

### `agents`

```sql
CREATE TYPE agent_type   AS ENUM ('farmer','trader','raider','defender');
CREATE TYPE agent_status AS ENUM ('idle','running','paused','error','out_of_funds');

CREATE TABLE agents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id         UUID         NOT NULL REFERENCES users(id),
    name             VARCHAR(64)  NOT NULL,
    type             agent_type   NOT NULL,
    status           agent_status NOT NULL DEFAULT 'idle',
    sca_address      VARCHAR(42)  UNIQUE,          -- ERC-4337 SCA，激活后设置
    balance_okb      NUMERIC(18,8) NOT NULL DEFAULT 0,
    balance_usdc     NUMERIC(18,6) NOT NULL DEFAULT 0,
    config           JSONB        NOT NULL DEFAULT '{}',
    -- 累计统计
    total_actions       INT          NOT NULL DEFAULT 0,
    total_earned_coin   BIGINT       NOT NULL DEFAULT 0,
    total_spent_gas     NUMERIC(18,8) NOT NULL DEFAULT 0,
    total_spent_usdc    NUMERIC(18,6) NOT NULL DEFAULT 0,
    steal_success_count INT          NOT NULL DEFAULT 0,
    steal_fail_count    INT          NOT NULL DEFAULT 0,
    global_rank         INT,
    -- 每日限额追踪
    daily_gas_spent    NUMERIC(18,8) NOT NULL DEFAULT 0,
    daily_usdc_spent   NUMERIC(18,6) NOT NULL DEFAULT 0,
    daily_steal_count  INT           NOT NULL DEFAULT 0,
    daily_reset_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    nft_skin           VARCHAR(128),
    last_active_at     TIMESTAMPTZ,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agents_owner  ON agents(owner_id);
CREATE INDEX idx_agents_status ON agents(status) WHERE status = 'running';
```

**`config` JSONB 结构示例：**

```json
{
  "preferred_crops": ["Wheat","Corn"],
  "auto_harvest": true,
  "auto_replant": true,
  "swap_trigger_profit_rate": 15,
  "max_single_swap_usdc": 5,
  "radar_level": 2,
  "max_daily_steals": 5,
  "early_harvest_threshold": 80,
  "max_daily_gas_okb": 0.05,
  "max_daily_spend_usdc": 10,
  "emergency_stop_balance": 1.0
}
```

### `agent_logs`

```sql
CREATE TYPE log_status AS ENUM ('success','failed','pending');

CREATE TABLE agent_logs (
    id         UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id   UUID       NOT NULL REFERENCES agents(id),
    action     VARCHAR(32) NOT NULL,
    status     log_status  NOT NULL,
    detail     TEXT        NOT NULL DEFAULT '',
    coin_delta INT,
    gas_cost   NUMERIC(18,8),
    usdc_delta NUMERIC(18,6),
    tx_hash    VARCHAR(66),
    cursor_key BIGSERIAL,
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_logs_cursor ON agent_logs(agent_id, cursor_key DESC);
CREATE INDEX idx_agent_logs_status ON agent_logs(agent_id, status);
```

---

## 3.6 社交系统

### `friendships`

```sql
CREATE TABLE friendships (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a     UUID NOT NULL REFERENCES users(id),
    user_b     UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 规范化：user_a < user_b（字典序），保证唯一性
    UNIQUE (LEAST(user_a::text, user_b::text), GREATEST(user_a::text, user_b::text))
);
CREATE INDEX idx_friends_a ON friendships(user_a);
CREATE INDEX idx_friends_b ON friendships(user_b);
```

### `friend_requests`

```sql
CREATE TYPE request_status AS ENUM ('pending','accepted','declined');

CREATE TABLE friend_requests (
    id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user  UUID           NOT NULL REFERENCES users(id),
    to_user    UUID           NOT NULL REFERENCES users(id),
    status     request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (from_user, to_user)
);
CREATE INDEX idx_freq_to ON friend_requests(to_user) WHERE status = 'pending';
```

---

## 3.7 任务与奖励

### `game_tasks` / `user_task_progress`

```sql
CREATE TABLE game_tasks (
    id         INT PRIMARY KEY,
    title      VARCHAR(128) NOT NULL,
    content    TEXT         NOT NULL,
    reward     INT          NOT NULL,
    url        VARCHAR(256),
    click      BOOLEAN      NOT NULL DEFAULT FALSE,
    banner     VARCHAR(256),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order SMALLINT     NOT NULL DEFAULT 0
);

CREATE TABLE user_task_progress (
    user_id      UUID NOT NULL REFERENCES users(id),
    task_id      INT  NOT NULL REFERENCES game_tasks(id),
    completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    claimed      BOOLEAN     NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    claimed_at   TIMESTAMPTZ,
    PRIMARY KEY (user_id, task_id)
);
```

### `daily_checkins`

```sql
CREATE TABLE daily_checkins (
    user_id          UUID PRIMARY KEY REFERENCES users(id),
    total_days       INT     NOT NULL DEFAULT 0,
    current_streak   INT     NOT NULL DEFAULT 0,
    last_checkin_date DATE,
    next_day_index   SMALLINT NOT NULL DEFAULT 0   -- 0~6，下次签到领取第几天
);
```

### `renaissance_tasks` / `user_renaissance_progress`

```sql
CREATE TABLE renaissance_tasks (
    task_id   VARCHAR(32) PRIMARY KEY,
    name      VARCHAR(128) NOT NULL,
    context   TEXT         NOT NULL,
    url       VARCHAR(256) NOT NULL,
    logo_url  VARCHAR(256) NOT NULL,
    reward    INT          NOT NULL,
    stone     INT          NOT NULL DEFAULT 0,
    crystal   INT          NOT NULL DEFAULT 0,
    is_active BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE user_renaissance_progress (
    user_id    UUID        NOT NULL REFERENCES users(id),
    task_id    VARCHAR(32) NOT NULL REFERENCES renaissance_tasks(task_id),
    completed  BOOLEAN     NOT NULL DEFAULT FALSE,
    claimable  BOOLEAN     NOT NULL DEFAULT FALSE,
    claimed    BOOLEAN     NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, task_id)
);
```

---

## 3.8 抽奖系统

### `raffles`

```sql
CREATE TABLE raffles (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(128) NOT NULL,
    description          TEXT         NOT NULL,
    requirement_level    SMALLINT     NOT NULL DEFAULT 1,
    requirement_invite   INT          NOT NULL DEFAULT 0,
    ticket_price         INT          NOT NULL,
    max_tickets_per_user INT          NOT NULL DEFAULT 10,
    reward_type          VARCHAR(32)  NOT NULL,
    reward_detail        VARCHAR(256) NOT NULL,
    reward_quantity      INT          NOT NULL DEFAULT 1,
    total_winners        INT          NOT NULL DEFAULT 1,
    in_game_reward       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_twitter_task      BOOLEAN      NOT NULL DEFAULT FALSE,
    twitter_link         VARCHAR(256),
    main_color           VARCHAR(7),
    description_text_color VARCHAR(7),
    title_background_color VARCHAR(7),
    start_time           TIMESTAMPTZ  NOT NULL,
    end_time             TIMESTAMPTZ  NOT NULL,
    draw_tx_hash         VARCHAR(66),
    is_drawn             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### `raffle_tickets` / `raffle_winners`

```sql
CREATE TABLE raffle_tickets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id    INT  NOT NULL REFERENCES raffles(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    ticket_count INT  NOT NULL DEFAULT 1,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (raffle_id, user_id)
);

CREATE TABLE raffle_winners (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id INT  NOT NULL REFERENCES raffles(id),
    user_id   UUID NOT NULL REFERENCES users(id),
    reward    VARCHAR(256) NOT NULL,
    drawn_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## 3.9 邀请与活动记录

### `invitations`

```sql
CREATE TABLE invitations (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id             UUID NOT NULL REFERENCES users(id),
    invitee_id             UUID NOT NULL UNIQUE REFERENCES users(id),
    reward_sent            BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_lv5_claimed  BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_lv10_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_lv15_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_lv20_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invitations_inviter ON invitations(inviter_id);
```

### `activity_records`（稻草人笔记）

```sql
CREATE TYPE activity_action AS ENUM ('watered','stole','failed_stealing');

CREATE TABLE activity_records (
    id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID            NOT NULL REFERENCES users(id),
    actor_user_id  UUID            NOT NULL REFERENCES users(id),
    action         activity_action NOT NULL,
    crop_type      VARCHAR(32),
    actor_earning  INT             NOT NULL DEFAULT 0,
    actor_exp_gain INT             NOT NULL DEFAULT 0,
    cursor_key     BIGSERIAL,
    action_time    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_target ON activity_records(target_user_id, cursor_key DESC);
```

---

## 3.10 空投 / DAO / NFT

### `airdrop_campaigns` / `airdrop_eligibility`

```sql
CREATE TABLE airdrop_campaigns (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(128) NOT NULL,
    snapshot_date DATE         NOT NULL,
    claim_start   TIMESTAMPTZ  NOT NULL,
    claim_end     TIMESTAMPTZ  NOT NULL,
    token_symbol  VARCHAR(16)  NOT NULL DEFAULT 'FARM',
    contract_addr VARCHAR(42),
    is_active     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE airdrop_eligibility (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    UUID          NOT NULL REFERENCES airdrop_campaigns(id),
    user_id        UUID          NOT NULL REFERENCES users(id),
    eligible       BOOLEAN       NOT NULL DEFAULT FALSE,
    airdrop_amount NUMERIC(28,8) NOT NULL DEFAULT 0,
    remarks        TEXT[]        NOT NULL DEFAULT '{}',
    claimed        BOOLEAN       NOT NULL DEFAULT FALSE,
    claim_tx_hash  VARCHAR(66),
    claimed_at     TIMESTAMPTZ,
    UNIQUE (campaign_id, user_id)
);
```

### `dao_proposals` / `dao_votes`

```sql
CREATE TYPE proposal_status AS ENUM ('active','passed','rejected','executed','cancelled');

CREATE TABLE dao_proposals (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    proposer_id UUID            NOT NULL REFERENCES users(id),
    title       VARCHAR(256)    NOT NULL,
    description TEXT            NOT NULL,
    param_key   VARCHAR(64),
    param_value JSONB,
    status      proposal_status NOT NULL DEFAULT 'active',
    vote_for    NUMERIC(28,8)   NOT NULL DEFAULT 0,
    vote_against NUMERIC(28,8)  NOT NULL DEFAULT 0,
    start_time  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    end_time    TIMESTAMPTZ     NOT NULL,
    on_chain_id VARCHAR(66),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE dao_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID    NOT NULL REFERENCES dao_proposals(id),
    voter_id    UUID    NOT NULL REFERENCES users(id),
    vote        BOOLEAN NOT NULL,
    vote_power  NUMERIC(28,8) NOT NULL,   -- sqrt(FARM_balance) at vote time
    tx_hash     VARCHAR(66),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (proposal_id, voter_id)
);
```

### `capila_nft_holdings`

```sql
CREATE TABLE capila_nft_holdings (
    user_id     UUID        NOT NULL REFERENCES users(id),
    token_id    VARCHAR(32) NOT NULL,
    picture_url VARCHAR(256),
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, token_id)
);
```

---

# 4. 后端 API 实现规范

## 4.1 项目目录结构（Next.js App Router）

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/
│   │   │   ├── nonce/route.ts
│   │   │   └── [...nextauth]/route.ts  # NextAuth.js SIWE
│   │   ├── game/
│   │   │   ├── stats/route.ts         # GET /api/game/stats
│   │   │   ├── plant/route.ts         # POST /api/game/plant
│   │   │   ├── action/route.ts        # POST /api/game/action
│   │   │   └── friend/route.ts        # POST /api/game/friend
│   │   ├── agents/
│   │   │   ├── route.ts               # GET/POST /api/agents
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET/PATCH /api/agents/:id
│   │   │       ├── control/route.ts   # POST /api/agents/:id/control
│   │   │       ├── logs/route.ts      # GET /api/agents/:id/logs
│   │   │       └── topup/route.ts     # POST /api/agents/:id/topup
│   │   ├── social/
│   │   │   ├── friends/route.ts
│   │   │   └── requests/route.ts
│   │   ├── tasks/route.ts
│   │   ├── raffle/route.ts
│   │   ├── airdrop/route.ts
│   │   └── cron/                      # Vercel Cron Jobs
│   │       ├── energy-restore/route.ts
│   │       ├── crop-maturity/route.ts
│   │       ├── agent-tick/route.ts
│   │       └── daily-reset/route.ts
│   ├── (pages)/                # 页面路由（已存在）
│   │   ├── agents/
│   │   ├── friends/
│   │   └── ...
│   └── layout.tsx
├── lib/
│   ├── prisma.ts              # Prisma Client 单例
│   ├── redis.ts               # Upstash Redis 客户端
│   ├── auth.ts                # NextAuth.js 配置
│   ├── services/              # 业务逻辑层
│   │   ├── farm-engine.ts
│   │   ├── steal-calculator.ts
│   │   ├── energy-service.ts
│   │   ├── invite-service.ts
│   │   └── x402-verifier.ts
│   ├── blockchain/            # 链交互
│   │   ├── contracts.ts       # 合约实例
│   │   ├── agent-sca.ts       # Agent SCA 操作
│   │   └── vrf-listener.ts    # Chainlink VRF 监听
│   └── utils/
│       ├── cursor-pagination.ts
│       └── siwe.ts
└── prisma/
    └── schema.prisma          # Prisma Schema（已存在）
```

## 4.2 认证流程（NextAuth.js + SIWE）

```typescript
// lib/auth.ts - NextAuth.js 配置
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SiweMessage } from 'siwe'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: { type: 'text' },
        signature: { type: 'text' },
      },
      async authorize(credentials) {
        const siwe = new SiweMessage(JSON.parse(credentials.message))
        const result = await siwe.verify({ signature: credentials.signature })
        
        if (!result.success) return null
        
        // 获取或创建用户
        const user = await prisma.user.upsert({
          where: { walletAddress: siwe.address.toLowerCase() },
          create: {
            walletAddress: siwe.address.toLowerCase(),
            inviteCode: generateInviteCode(),
            farmState: { create: { level: 1, coinBalance: 0 } },
            landPlots: { create: Array(9).fill(null).map((_, i) => ({
              landId: i + 1,
              landOwned: i < 3
            }))}
          },
          update: {},
          include: { farmState: true }
        })
        
        return { id: user.id, address: user.walletAddress }
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      session.userId = token.sub
      return session
    }
  }
})

// API Route: app/api/auth/nonce/route.ts
export async function GET() {
  const nonce = generateNonce()
  await redis.setex(`nonce:${nonce}`, 300, '1')  // 5min 过期
  return Response.json({ nonce })
}
```

## 4.3 游戏操作分发（`POST /g/a/`）

| action | 校验 | 变更 | 响应 |
|--------|------|------|------|
| `water` | `next_watering_due` 已过期 + `energy_left >= 1` | `last_watered_time=now`, `next_watering_due=now+watering_period`, `energy_left--` | 更新后的 User |
| `harvest` | `is_mature=true` | `coin_balance += harvest_price`, `level_exp += harvest_exp`, 删除作物 | 更新后的 User + coin_delta |
| `upgrade` | `level_exp >= require_exp` + `coin_balance >= upgrade_cost` | `level++`, `coin_balance -= upgrade_cost`, `level_exp -= require_exp` | 更新后的 User |
| `buyland` | `land_can_buy=true` + `coin_balance >= price` | `land_owned=true`, `coin_balance -= price` | 更新后的 User |
| `boost` | `boost_left > 0` | `mature_at=now()`, `boost_left--` | 更新后的 User |
| `shop` | `coin_balance >= total_cost` | `inventories.quantity += count`, `coin_balance -= cost` | 更新后的 User |
| `buy_energy` | 今日次数未超限 | `energy_left += 购买量`, `coin_balance -= pack_price` | 更新后的 User |

## 4.4 偷盗成功率计算逻辑

成功率 = `base(20%) + level_diff + online_penalty + crop_maturity_penalty + friendship_diff + invite_diff + recidivist_penalty + new_farmer_protection`

| 因子 | 计算方式 |
|------|---------|
| `level_diff` | `(attacker.level - target.level) × 2%`，有正负 |
| `online` | 目标在线（60s 内活跃）→ `-5%` |
| `crop_level_diff` | 作物成熟度 × (-10%)，越熟越难偷 |
| `friendship_diff` | 是好友 → `-5%`，非好友 → `+2%` |
| `invite_diff` | 攻击者邀请数 > 目标 → `+1%` |
| `new_farmer` | 目标 Lv≤3 且注册 < 3 天 → 成功率清零 |
| `recidivist` | 24h 内已偷过同目标 → `-10%` |

**Final = `max(0, sum)` → 向下取整**

## 4.5 Cursor 分页规范

```python
# utils/pagination.py
import base64, json

class CursorPagination:
    page_size = 20

    def paginate(self, queryset, cursor_str=None, order_field='cursor_key'):
        if cursor_str:
            cursor_val = json.loads(base64.b64decode(cursor_str))
            queryset = queryset.filter(**{f'{order_field}__lt': cursor_val})
        items = list(queryset.order_by(f'-{order_field}')[:self.page_size + 1])
        has_next = len(items) > self.page_size
        results  = items[:self.page_size]
        next_cursor = None
        if has_next:
            last_val   = getattr(results[-1], order_field)
            next_cursor = base64.b64encode(json.dumps(last_val).encode()).decode()
        return results, next_cursor
```

响应格式统一：`{ "results": [...], "next": "cursor_or_null" }`

## 4.6 能量恢复定时任务（Vercel Cron）

```typescript
// app/api/cron/energy-restore/route.ts
// vercel.json: { "crons": [{ "path": "/api/cron/energy-restore", "schedule": "* * * * *" }] }

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // 验证 Cron Secret（Vercel 自动注入）
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  
  // 查找需要恢复能量的用户
  const states = await prisma.farmState.findMany({
    where: {
      nextRestoreAt: { lte: now },
      energyLeft: { lt: prisma.$queryRaw`40 + level * 2` }
    },
    include: { user: true }
  })

  // 批量更新
  const updates = states.map(state => {
    const maxEnergy = 40 + state.level * 2
    const newEnergy = Math.min(state.energyLeft + 1, maxEnergy)
    return prisma.farmState.update({
      where: { userId: state.userId },
      data: {
        energyLeft: newEnergy,
        nextRestoreAt: newEnergy < maxEnergy 
          ? new Date(Date.now() + 60000) 
          : null
      }
    })
  })

  await prisma.$transaction(updates)
  
  return Response.json({ restored: updates.length })
}
```

**vercel.json 配置：**
```json
{
  "crons": [
    { "path": "/api/cron/energy-restore", "schedule": "* * * * *" },
    { "path": "/api/cron/crop-maturity", "schedule": "* * * * *" },
    { "path": "/api/cron/agent-tick", "schedule": "*/10 * * * * *" },
    { "path": "/api/cron/daily-reset", "schedule": "0 0 * * *" }
  ]
}
```

## 4.7 邀请阶梯奖励触发

```typescript
// lib/services/invite-service.ts
const MILESTONES = {
  5:  { coin: 3000, boost: 1, energy: 20, field: 'milestoneLv5Claimed' },
  10: { coin: 7000, boost: 1, energy: 20, field: 'milestoneLv10Claimed' },
  15: { coin: 12000, boost: 2, energy: 40, field: 'milestoneLv15Claimed' },
  20: { coin: 20000, boost: 2, energy: 40, field: 'milestoneLv20Claimed' },
} as const

export async function checkAndGrantMilestone(inviteeId: string, newLevel: number) {
  const milestone = MILESTONES[newLevel as keyof typeof MILESTONES]
  if (!milestone) return

  const invitation = await prisma.invitation.findUnique({
    where: { inviteeId },
    include: { inviter: { include: { farmState: true } } }
  })
  
  if (!invitation || invitation[milestone.field]) return

  // Prisma 事务
  await prisma.$transaction(async (tx) => {
    // 标记已领取
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { [milestone.field]: true }
    })

    // 发放奖励给邀请人
    const inviterState = invitation.inviter.farmState!
    const maxEnergy = 40 + inviterState.level * 2
    
    await tx.farmState.update({
      where: { userId: invitation.inviterId },
      data: {
        coinBalance: { increment: milestone.coin },
        boostLeft: { increment: milestone.boost },
        energyLeft: Math.min(
          inviterState.energyLeft + milestone.energy,
          maxEnergy
        )
      }
    })
  })
}
```

---

# 5. 智能合约设计

## 5.1 合约体系

```
contracts/
├── token/
│   └── FarmToken.sol           # $FARM ERC-20 + ERC20Votes
├── agent/
│   ├── AgentAccount.sol        # ERC-4337 SCA（每 Agent 一个实例）
│   └── AgentAccountFactory.sol # CREATE2 工厂，确定性地址
├── payment/
│   └── X402Verifier.sol        # x402 EIP-712 支付凭证验证
├── raffle/
│   └── RaffleContract.sol      # Chainlink VRF 公平开奖
├── nft/
│   └── AgentSkinNFT.sol        # Agent 皮肤 ERC-721
└── dao/
    └── FarmDAOGovernor.sol     # OZ Governor + TimelockController
```

---

## 5.2 `FarmToken.sol` — $FARM ERC-20

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * 总供应量 1,000,000,000 FARM
 * 分配：空投 30% | 团队 15% | 生态 20% | 流动性 15% | DAO 金库 20%
 */
contract FarmToken is ERC20Votes, Ownable {
    uint256 public constant MAX_SUPPLY       = 1_000_000_000 ether;
    uint256 public constant AIRDROP_ALLOC    =   300_000_000 ether;
    uint256 public constant TEAM_ALLOC       =   150_000_000 ether;
    uint256 public constant ECOSYSTEM_ALLOC  =   200_000_000 ether;
    uint256 public constant LIQUIDITY_ALLOC  =   150_000_000 ether;
    uint256 public constant DAO_TREASURY     =   200_000_000 ether;

    address public airdropContract;

    constructor(address team, address ecosystem, address liquidity, address dao)
        ERC20("Farm Token", "FARM") EIP712("Farm Token", "1") Ownable(msg.sender)
    {
        _mint(team,       TEAM_ALLOC);
        _mint(ecosystem,  ECOSYSTEM_ALLOC);
        _mint(liquidity,  LIQUIDITY_ALLOC);
        _mint(dao,        DAO_TREASURY);
    }

    function setAirdropContract(address _airdrop) external onlyOwner {
        require(airdropContract == address(0), "Already set");
        airdropContract = _airdrop;
        _mint(_airdrop, AIRDROP_ALLOC);
    }

    function _update(address from, address to, uint256 value)
        internal override(ERC20Votes) { super._update(from, to, value); }
}
```

---

## 5.3 `AgentAccount.sol` — ERC-4337 SCA

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * 每个 AI Agent 持有一个实例。
 * owner  = 用户钱包（提款/紧急停止）
 * backend = AgentFarm Relayer（执行日常操作）
 * 资金只能流回 owner，backend 无法挪走资产。
 */
contract AgentAccount is BaseAccount {
    using ECDSA for bytes32;

    IEntryPoint private immutable _ep;
    address public immutable owner;
    address public immutable backend;
    address public constant  USDC = 0x74b7F16337b8972027F6196A17a631aC6dE26d22; // X Layer USDC

    uint256 public maxDailyGasOkb;
    uint256 public maxDailyUsdcSpend;
    uint256 public emergencyStopBalance;

    uint256 public dailyGasSpent;
    uint256 public dailyUsdcSpent;
    uint256 public dailyResetTs;

    bool public stopped;

    event EmergencyStopped(uint256 okbRefunded, uint256 usdcRefunded);

    constructor(IEntryPoint ep, address _owner, address _backend) {
        _ep     = ep;
        owner   = _owner;
        backend = _backend;
    }

    function entryPoint() public view override returns (IEntryPoint) { return _ep; }

    receive() external payable {}

    modifier notStopped() { require(!stopped, "stopped"); _; }
    modifier onlyOwnerOrBackend() {
        require(msg.sender == owner || msg.sender == backend, "unauthorized"); _;
    }

    function emergencyStop() external onlyOwnerOrBackend {
        stopped = true;
        uint256 okb  = address(this).balance;
        uint256 usdc = IERC20(USDC).balanceOf(address(this));
        if (okb  > 0) payable(owner).transfer(okb);
        if (usdc > 0) IERC20(USDC).transfer(owner, usdc);
        emit EmergencyStopped(okb, usdc);
    }

    function updateConfig(uint256 maxGas, uint256 maxUsdc, uint256 stopBal)
        external { require(msg.sender == owner); maxDailyGasOkb = maxGas;
                   maxDailyUsdcSpend = maxUsdc; emergencyStopBalance = stopBal; }

    function executeX402Payment(address recipient, uint256 usdcAmt)
        external notStopped {
        require(msg.sender == backend);
        _resetDaily();
        require(dailyUsdcSpent + usdcAmt <= maxDailyUsdcSpend, "daily usdc limit");
        dailyUsdcSpent += usdcAmt;
        IERC20(USDC).transfer(recipient, usdcAmt);
        // 余额预警自动停止
        if (IERC20(USDC).balanceOf(address(this)) <= emergencyStopBalance) stopped = true;
    }

    function _validateSignature(PackedUserOperation calldata op, bytes32 hash)
        internal override returns (uint256) {
        address signer = hash.toEthSignedMessageHash().recover(op.signature);
        return (signer == owner || signer == backend) ? 0 : SIG_VALIDATION_FAILED;
    }

    function _resetDaily() internal {
        if (block.timestamp >= dailyResetTs + 1 days) {
            dailyGasSpent = dailyUsdcSpent = 0;
            dailyResetTs = block.timestamp;
        }
    }
}
```

---

## 5.4 `AgentAccountFactory.sol` — CREATE2 工厂

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./AgentAccount.sol";

/**
 * 同一 (owner, salt) 组合产生唯一确定性 SCA 地址，可预计算。
 * 后端调用 getAddress() 提前计算地址供前端展示，
 * createAgent() 正式部署（若已存在直接返回）。
 */
contract AgentAccountFactory {
    IEntryPoint public immutable entryPoint;
    address     public immutable backend;

    event AgentCreated(address indexed owner, address sca);

    constructor(IEntryPoint ep, address _backend) { entryPoint = ep; backend = _backend; }

    function createAgent(address owner, bytes32 salt) external returns (AgentAccount sca) {
        address addr = getAddress(owner, salt);
        if (addr.code.length > 0) return AgentAccount(payable(addr));
        sca = AgentAccount(payable(Create2.deploy(0, salt,
            abi.encodePacked(type(AgentAccount).creationCode,
                             abi.encode(entryPoint, owner, backend)))));
        emit AgentCreated(owner, address(sca));
    }

    function getAddress(address owner, bytes32 salt) public view returns (address) {
        return Create2.computeAddress(salt, keccak256(abi.encodePacked(
            type(AgentAccount).creationCode, abi.encode(entryPoint, owner, backend))));
    }
}
```

---

## 5.5 `X402Verifier.sol` — 支付凭证验证

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * EIP-712 结构化签名验证 + nonce 防重放
 * 支付凭证字段：from, to, amount, token, nonce, expiry
 */
contract X402Verifier is EIP712 {
    using ECDSA for bytes32;

    bytes32 private constant TYPEHASH = keccak256(
        "X402Payment(address from,address to,uint256 amount,address token,bytes32 nonce,uint256 expiry)"
    );

    mapping(bytes32 => bool) public usedNonces;

    struct PaymentProof {
        address from; address to; uint256 amount; address token;
        bytes32 nonce; uint256 expiry; bytes signature;
    }

    constructor() EIP712("X402Verifier", "1") {}

    function verify(PaymentProof calldata p) public view returns (bool) {
        require(block.timestamp <= p.expiry, "expired");
        require(!usedNonces[p.nonce], "replayed");
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            TYPEHASH, p.from, p.to, p.amount, p.token, p.nonce, p.expiry)));
        return digest.recover(p.signature) == p.from;
    }

    function consumeNonce(PaymentProof calldata p) external {
        require(verify(p), "invalid");
        usedNonces[p.nonce] = true;
    }
}
```

---

## 5.6 `RaffleContract.sol` — Chainlink VRF 开奖

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2Plus.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * 流程：
 * 1. 后端 commitTickets(raffleId, merkleRoot, totalTickets, winnersCount)
 * 2. requestDraw(raffleId) → Chainlink VRF 请求
 * 3. fulfillRandomWords 回调 → 写入随机数
 * 4. 后端 getWinningTickets(raffleId) → 链外映射票号→用户
 */
contract RaffleContract is VRFConsumerBaseV2Plus, Ownable {
    struct RaffleInfo {
        bytes32   merkleRoot;
        uint256   totalTickets;
        uint256   winnersCount;
        uint256[] randomWords;
        bool      drawn;
    }

    mapping(uint256 => RaffleInfo) public raffles;
    mapping(uint256 => uint256)    private reqToRaffle;

    bytes32 private keyHash;
    uint256 private subscriptionId;

    event DrawRequested(uint256 indexed raffleId, uint256 requestId);
    event DrawFulfilled(uint256 indexed raffleId);

    constructor(address vrf, bytes32 _keyHash, uint256 _subId)
        VRFConsumerBaseV2Plus(vrf) Ownable(msg.sender) {
        keyHash = _keyHash; subscriptionId = _subId;
    }

    function commitTickets(uint256 id, bytes32 root, uint256 total, uint256 winners)
        external onlyOwner {
        RaffleInfo storage r = raffles[id];
        require(!r.drawn);
        r.merkleRoot = root; r.totalTickets = total; r.winnersCount = winners;
    }

    function requestDraw(uint256 id) external onlyOwner returns (uint256 reqId) {
        RaffleInfo storage r = raffles[id];
        require(r.totalTickets > 0 && !r.drawn);
        reqId = s_vrfCoordinator.requestRandomWords(VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash, subId: subscriptionId, requestConfirmations: 3,
            callbackGasLimit: 200_000, numWords: uint32(r.winnersCount),
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        }));
        reqToRaffle[reqId] = id;
        emit DrawRequested(id, reqId);
    }

    function fulfillRandomWords(uint256 reqId, uint256[] calldata words) internal override {
        uint256 id = reqToRaffle[reqId];
        raffles[id].randomWords = words;
        raffles[id].drawn = true;
        emit DrawFulfilled(id);
    }

    function getWinningTickets(uint256 id) external view returns (uint256[] memory tickets) {
        RaffleInfo storage r = raffles[id];
        require(r.drawn);
        tickets = new uint256[](r.winnersCount);
        for (uint256 i; i < r.winnersCount; i++)
            tickets[i] = r.randomWords[i] % r.totalTickets;
    }
}
```

---

## 5.7 `AgentSkinNFT.sol` — ERC-721 皮肤

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AgentSkinNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextId;
    mapping(uint256 => string) public skinType;  // tokenId → 'farmer'|'trader'|...

    constructor() ERC721("AgentFarm Skin", "AGSKIN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, string calldata _type, string calldata uri)
        external onlyRole(MINTER_ROLE) returns (uint256 id) {
        id = _nextId++;
        _safeMint(to, id);
        _setTokenURI(id, uri);
        skinType[id] = _type;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## 5.8 合约部署顺序

```
1. TimelockController(48h delay)
2. FarmToken(team, ecosystem, liquidity, dao)
3. FarmDAOGovernor(FarmToken, TimelockController)
   - OZ Governor + GovernorVotes + GovernorVotesQuorumFraction(1%)
   - 投票期 72h (~21600 blocks on X Layer)
4. X402Verifier()
5. AgentAccountFactory(EntryPoint=0x0000000071727De22E5E9d8BAf0edAc6f37da032, backendRelayer)
6. AgentSkinNFT() → grantRole(MINTER_ROLE, backendRelayer)
7. RaffleContract(vrfCoordinator, keyHash, subscriptionId)
8. AirdropDistributor() → FarmToken.setAirdropContract(AirdropDistributor)
9. TimelockController.grantRole(PROPOSER, FarmDAOGovernor)
10. TimelockController.grantRole(EXECUTOR, address(0))  // 任何人可执行已通过提案
```

---

# 6. x402 支付协议实现

## 6.1 服务端 402 响应生成

```python
# services/x402_verifier.py
RADAR_PRICE_USDC = {1: Decimal('0.1'), 2: Decimal('0.5'), 3: Decimal('1.0')}

def build_402_headers(radar_level: int) -> dict:
    price_usdc6 = int(RADAR_PRICE_USDC[radar_level] * 10**6)
    nonce  = secrets.token_hex(16)
    expiry = int(time.time()) + 300
    return {
        'WWW-Authenticate':
            f'x402 chain_id=196 token=USDC price={price_usdc6} '
            f'recipient={settings.X402_RECIPIENT} nonce={nonce} expiry={expiry}'
    }

def verify_x402_header(auth_header: str, expected_price_usdc6: int) -> bool:
    # 解析 base64(proof_json)
    proof = parse_proof(auth_header)
    if proof['amount'] < expected_price_usdc6: return False
    # 调用链上合约验证签名 + nonce 消耗
    contract = w3.eth.contract(address=X402_VERIFIER, abi=ABI)
    valid = contract.functions.verify(proof_struct(proof)).call()
    if not valid: return False
    signed_tx = build_consume_tx(contract, proof)
    w3.eth.send_raw_transaction(signed_tx)
    return True
```

## 6.2 Agent 侧支付流程（前端 / Celery）

```
Agent 请求 GET /g/radar/?level=2
  ← HTTP 402  WWW-Authenticate: x402 chain_id=196 token=USDC price=500000 ...

Agent SCA（AgentAccount）构造 EIP-712 PaymentProof:
  { from: sca_addr, to: recipient, amount: 500000, token: USDC,
    nonce: rand_bytes32, expiry: now+300, sig: eip712(owner_or_backend_key) }

重发：GET /g/radar/?level=2
      Authorization: x402 base64(ProofJSON)
  ← HTTP 200  { targets: [...] }
```

---

# 7. AI Agent 执行引擎

## 7.1 Celery Beat 调度

```python
# config/celery.py
CELERY_BEAT_SCHEDULE = {
    'agent-tick':     {'task': 'tasks.agent_runner.tick_all_running_agents', 'schedule': 10.0},
    'energy-restore': {'task': 'tasks.energy_restore.restore_energy_tick',   'schedule': 60.0},
    'crop-maturity':  {'task': 'tasks.crop_maturity.check_mature_crops',      'schedule': 60.0},
}
```

## 7.2 Agent 决策策略

| 类型 | 决策循环 |
|------|---------|
| **Farmer** | 扫描自己土地 → 成熟则 harvest → 空地+有库存则 plant（按 preferred_crops）→ 需浇水则 water |
| **Trader** | 调用 Onchain OS `okx-dex-market` → 若收益率 ≥ `swap_trigger_profit_rate` → AgentAccount.executeSwap |
| **Raider** | x402 支付雷达扫描 → 按成功率排序目标 → checksteal 高概率目标 → confirm steal |
| **Defender** | 监控己方土地 → 作物成熟度 ≥ `early_harvest_threshold%` → 提前 harvest 防偷 |

---

# 8. 安全设计

## 8.1 后端安全

| 威胁 | 防御 |
|------|------|
| SIWE 重放 | Nonce 一次性 + 5min 过期，DB 标记 `used=TRUE` |
| 越权访问 | `/g/fa/` 校验 `target != self` + 好友关系 |
| 偷盗刷单 | `recidivist` 惩罚 + 每日上限 + Redis 频率限制 |
| 体力溢出 | DB `CHECK` 约束 + 应用层双重校验 |
| SQL 注入 | Django ORM 参数化，禁止拼接 raw SQL |
| API 滥用 | Nginx + django-ratelimit：登录 10/min，操作 60/min |

## 8.2 合约安全

| 威胁 | 防御 |
|------|------|
| 资金被盗 | AgentAccount 资金只能转给 `owner`，backend 无法提款 |
| x402 重放 | `usedNonces` mapping + 5min expiry |
| 随机数操控 | Chainlink VRF v2.5，不可预测 |
| 重入攻击 | OpenZeppelin ReentrancyGuard + CEI 模式 |
| 整数溢出 | Solidity 0.8+ 内置保护 |
| 中心化风险 | 多签 Gnosis Safe 持有 Owner；DAO 控制参数更新 |

---

# 9. 部署架构

## 9.1 Vercel 部署配置

| 组件 | 服务 | 说明 |
|------|------|------|
| **前端 + API** | Vercel Edge Network | 全球 CDN，自动扩缩容 |
| **数据库** | Vercel Postgres (Neon) | Serverless PostgreSQL，按存储计费 |
| **缓存** | Upstash Redis | Serverless Redis，按请求计费 |
| **Cron Jobs** | Vercel Cron | 原生定时任务，无需额外服务 |
| **文件存储** | Vercel Blob | 静态资源（NFT 图片等） |
| **监控** | Vercel Analytics + Sentry | 性能监控 + 错误追踪 |

## 9.2 环境变量配置

```env
# 数据库（Vercel 自动注入）
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# NextAuth.js
NEXTAUTH_URL=https://agentfarmx.vercel.app
NEXTAUTH_SECRET=<256bit_random>

# Web3
NEXT_PUBLIC_CHAIN_ID=196
NEXT_PUBLIC_RPC_URL=https://rpc.xlayer.tech
BACKEND_WALLET_PRIVATE_KEY=<hot_wallet_key>

# 合约地址
NEXT_PUBLIC_AGENT_FACTORY=0x...
NEXT_PUBLIC_FARM_TOKEN=0x...
NEXT_PUBLIC_RAFFLE_CONTRACT=0x...
NEXT_PUBLIC_DAO_GOVERNOR=0x...
X402_VERIFIER_ADDR=0x...

# Chainlink VRF
CHAINLINK_VRF_COORDINATOR=0x...
CHAINLINK_KEY_HASH=0x...
CHAINLINK_SUB_ID=...

# Cron Secret（Vercel 自动生成）
CRON_SECRET=<auto_generated>

# 监控
SENTRY_DSN=https://...
```

## 9.3 CI/CD 流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npx prisma generate
      - run: npm test
      
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd contracts && npm ci
      - run: cd contracts && npx hardhat test
      
  deploy:
    needs: [test, test-contracts]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 9.4 性能优化策略

| 优化项 | 方案 |
|--------|------|
| **API 响应** | Edge Runtime + Redis 缓存（游戏配置 5min TTL） |
| **数据库查询** | Prisma Connection Pooling + 索引优化 |
| **静态资源** | Next.js Image 优化 + Vercel CDN |
| **代码分割** | Dynamic Import + Route-based Code Splitting |
| **SSR/SSG** | Server Components 减少客户端 JS |
| **监控** | Vercel Analytics + Custom Metrics |

---

# 10. 开发里程碑

## 10.1 Phase 0 — 基础设施（1 周）

- [ ] Prisma Schema 完善（基于现有 SQL 设计）
- [ ] NextAuth.js + SIWE 集成
- [ ] Vercel Postgres + Upstash Redis 配置
- [ ] API Routes 基础结构搭建
- [ ] Cursor 分页工具函数

## 10.2 Phase 1 — 核心游戏逻辑（2 周）

- [ ] `/api/game/*` 路由实现（种植/浇水/收割/升级/购地/Boost）
- [ ] 偷盗成功率计算引擎
- [ ] 好友系统 API（添加/删除/搜索/好友农场操作）
- [ ] 任务系统（每日签到/游戏任务/生态任务）
- [ ] Vercel Cron Jobs（能量恢复/作物成熟检测/每日重置）

## 10.3 Phase 2 — AI Agent 系统（3 周）

- [ ] ERC-4337 合约部署（AgentFactory + AgentAccount）
- [ ] `/api/agents/*` CRUD API
- [ ] Agent 配置管理（4 种策略参数）
- [ ] Agent 执行引擎（Vercel Cron 10s 心跳）
- [ ] Agent 日志 SSE 实时推送
- [ ] SCA 充值/提款/紧急停止

## 10.4 Phase 3 — 链上功能（2 周）

- [ ] $FARM ERC-20 + ERC20Votes 部署
- [ ] RaffleContract + Chainlink VRF 集成
- [ ] 抽奖购票/开奖 API
- [ ] 空投资格计算 + 分发合约
- [ ] Capila NFT 持有检测（链上事件监听）

## 10.5 Phase 4 — x402 + DAO（2 周）

- [ ] X402Verifier 合约部署
- [ ] 雷达扫描 x402 支付流程
- [ ] Agent Trader Onchain OS API 集成
- [ ] FarmDAOGovernor + TimelockController 部署
- [ ] DAO 提案/投票 API

## 10.6 Phase 5 — 优化与上线（1 周）

- [ ] AgentSkinNFT 部署 + Mint API
- [ ] 性能优化（Redis 缓存策略/数据库索引）
- [ ] Sentry 错误监控集成
- [ ] 安全审计（合约 + API）
- [ ] 生产环境部署 + 压测

---

---

## 附录 A：Prisma Schema 示例

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL")
}

model User {
  id            String   @id @default(uuid())
  walletAddress String   @unique @map("wallet_address")
  username      String   @default("")
  lang          String   @default("en")
  isActive      Boolean  @default(true) @map("is_active")
  isNewUser     Boolean  @default(true) @map("is_new_user")
  onboardingPhase Int    @default(0) @map("onboarding_phase")
  inviteCode    String   @unique @map("invite_code")
  inviterId     String?  @map("inviter_id")
  totalInvites  Int      @default(0) @map("total_invites")
  stoneBalance  Int      @default(0) @map("stone_balance")
  crystalBalance Int     @default(0) @map("crystal_balance")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  inviter       User?         @relation("UserInvites", fields: [inviterId], references: [id])
  invitees      User[]        @relation("UserInvites")
  farmState     FarmState?
  landPlots     LandPlot[]
  agents        Agent[]
  // ... 其他关系

  @@index([walletAddress])
  @@index([inviteCode])
  @@map("users")
}

model FarmState {
  userId          String   @id @map("user_id")
  level           Int      @default(1)
  levelExp        Int      @default(0) @map("level_exp")
  coinBalance     BigInt   @default(0) @map("coin_balance")
  boostLeft       Int      @default(3) @map("boost_left")
  boostResetAt    DateTime @default(now()) @map("boost_reset_at") @db.Date
  energyLeft      Int      @default(40) @map("energy_left")
  nextRestoreAt   DateTime? @map("next_restore_at")
  energyBuySmall  Int      @default(0) @map("energy_buy_small")
  energyBuyLarge  Int      @default(0) @map("energy_buy_large")
  energyBuyFull   Int      @default(0) @map("energy_buy_full")
  energyResetDate DateTime @default(now()) @map("energy_reset_date") @db.Date
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("farm_states")
}

model Agent {
  id              String      @id @default(uuid())
  ownerId         String      @map("owner_id")
  name            String
  type            AgentType
  status          AgentStatus @default(idle)
  scaAddress      String?     @unique @map("sca_address")
  balanceOkb      Decimal     @default(0) @map("balance_okb") @db.Decimal(18, 8)
  balanceUsdc     Decimal     @default(0) @map("balance_usdc") @db.Decimal(18, 6)
  config          Json        @default("{}")
  totalActions    Int         @default(0) @map("total_actions")
  totalEarnedCoin BigInt      @default(0) @map("total_earned_coin")
  // ... 其他字段
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  owner User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  logs  AgentLog[]

  @@index([ownerId])
  @@index([status])
  @@map("agents")
}

enum AgentType {
  farmer
  trader
  raider
  defender
}

enum AgentStatus {
  idle
  running
  paused
  error
  out_of_funds
}

// ... 其他模型
```

---

*文档结束。详细 API Request/Response Schema 见 `@d:\todo\agentFarmX\PRD.md:723-820`；前端 API 客户端参考 `@d:\todo\agentFarmX\src\utils\api`。*
