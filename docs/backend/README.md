# AgentFarm X 后端实施方案总览

> **版本**: v1.0 | **日期**: 2026-03-14 | **部署平台**: Vercel + Vercel Postgres

---

## 📋 文档导航

本后端实施方案分为以下模块化文档，便于分阶段开发和维护：

### 1️⃣ [数据库设计方案](./01-DATABASE-SCHEMA.md)
- **技术栈**: Prisma ORM + Vercel Postgres (全托管)
- **内容**:
  - 完整 Prisma Schema 定义 (11 个核心表)
  - **AI Agent Skills 表结构** ⭐ NEW
  - **LLM 决策记录表** ⭐ NEW
  - 索引优化策略
  - 数据迁移计划

### 2️⃣ [API Routes 实现方案](./02-API-ROUTES.md)
- **技术栈**: Next.js 14 App Router + Server Actions + AI LLM
- **内容**:
  - 认证模块 (`/api/auth/*`)
  - 游戏逻辑模块 (`/api/game/*`)
  - Agent 管理模块 (`/api/agents/*`)
  - **AI Agent Skills API** (`/api/agents/skills/*`) ⭐ NEW
  - **LLM 决策 API** (`/api/agents/[id]/decide`) ⭐ NEW
  - 社交功能模块 (`/api/social/*`)
  - 支付协议模块 (`/api/payment/*`)

### 2.5️⃣ [AI Agent Skills API 详解](./02-API-ROUTES-AI-SKILLS.md) ⭐ NEW
- **技术栈**: OpenAI/Claude + Function Calling
- **内容**:
  - Skills 管理 API
  - AI 决策触发和执行
  - 决策历史查询
  - Skill 使用统计

### 3️⃣ [智能合约开发方案](./03-SMART-CONTRACTS.md)
- **技术栈**: Solidity ^0.8.24 + Hardhat + OpenZeppelin 5
- **内容**:
  - AgentFactory.sol (ERC-4337 账户抽象)
  - FarmToken.sol ($FARM ERC-20)
  - RaffleContract.sol (Chainlink VRF)
  - DAOGovernor.sol (治理合约)
  - 合约部署和验证流程

### 4️⃣ [定时任务方案](./04-CRON-JOBS.md)
- **技术栈**: Vercel Cron Jobs
- **内容**:
  - 能量恢复任务 (1分钟)
  - 作物成熟检测 (1分钟)
  - Agent 心跳检测 (10秒)
  - 每日数据重置 (0:00)

### 5️⃣ [实施路线图](./05-IMPLEMENTATION-ROADMAP.md)
- **内容**:
  - 开发阶段划分 (7 个阶段)
  - **AI Agent 开发里程碑** ⭐ UPDATED
  - **LLM 成本预算和优化** ⭐ NEW
  - 依赖关系图
  - 测试和部署计划

### 6️⃣ [AI Agent 增强方案](./06-AI-AGENT-ENHANCED.md) ⭐ NEW
- **技术栈**: OpenAI GPT-4 / Claude / Gemini + Skills
- **内容**:
  - AI Agent vs 传统 Agent 对比
  - Skill 系统设计 (15+ Skills)
  - LLM 决策引擎实现
  - 提示词工程最佳实践
  - 成本优化策略

---

## 🏗️ 技术架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 全栈应用                        │
│         App Router · Server Components · Server Actions      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌────────────────────┐      ┌──────────────────────┐
│  API Routes         │      │  Vercel Cron Jobs    │
│  /api/auth/*        │      │  - 能量恢复           │
│  /api/game/*        │      │  - 作物检测           │
│  /api/agents/*      │      │  - Agent 心跳         │
│  /api/social/*      │      │  - 每日重置           │
└─────────┬──────────┘      └──────────┬───────────┘
          │                            │
          ▼                            ▼
┌─────────────────────────────────────────────────────┐
│         Prisma ORM + Vercel Postgres (全托管)        │
│              Upstash Redis (Serverless)              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
            ┌────────────────────────┐
            │  X Layer (OKX L2)       │
            │  - AgentFactory.sol     │
            │  - FarmToken.sol        │
            │  - RaffleContract.sol   │
            │  - DAOGovernor.sol      │
            └────────────────────────┘
```

---

## 🎯 核心技术选型

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| **全栈框架** | Next.js 14 (App Router) | 前后端统一，支持 RSC 和 Server Actions |
| **数据库** | Vercel Postgres | 全托管 PostgreSQL，自动扩缩容 |
| **ORM** | Prisma 5.8+ | 类型安全，支持 Edge Runtime |
| **缓存** | Upstash Redis | Serverless Redis，按请求计费 |
| **定时任务** | Vercel Cron Jobs | 原生 cron 支持，无需额外服务 |
| **认证** | NextAuth.js 5 + SIWE | Web3 钱包认证 |
| **链交互** | Ethers.js v6 + Viem | 类型安全的区块链交互 |
| **AI 引擎** | OpenAI/Claude API | LLM 智能决策，Function Calling ⭐ NEW |
| **部署** | Vercel | Edge Network，全球 CDN |

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
```

### 2. 数据库初始化

```bash
# 生成 Prisma Client
npx prisma generate

# 执行数据库迁移
npx prisma migrate dev --name init

# (可选) 填充测试数据
npx prisma db seed
```

### 3. 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 4. 部署到 Vercel

```bash
# 连接 Vercel 项目
vercel link

# 部署到生产环境
vercel --prod
```

---

## 📦 项目结构

```
agentFarmX/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/               # 认证相关
│   │   │   ├── game/               # 游戏逻辑
│   │   │   ├── agents/             # Agent 管理
│   │   │   ├── social/             # 社交功能
│   │   │   └── payment/            # 支付协议
│   │   ├── (pages)/                # 页面路由
│   │   └── layout.tsx
│   ├── components/                 # React 组件
│   ├── lib/                        # 工具库
│   │   ├── prisma.ts               # Prisma 客户端
│   │   ├── redis.ts                # Redis 客户端
│   │   └── blockchain.ts           # 区块链工具
│   └── utils/                      # 辅助函数
├── prisma/
│   ├── schema.prisma               # 数据库 Schema
│   ├── migrations/                 # 迁移文件
│   └── seed.ts                     # 种子数据
├── contracts/                      # 智能合约
│   ├── src/
│   │   ├── AgentFactory.sol
│   │   ├── FarmToken.sol
│   │   ├── RaffleContract.sol
│   │   └── DAOGovernor.sol
│   ├── test/                       # 合约测试
│   └── scripts/                    # 部署脚本
├── docs/
│   └── backend/                    # 后端文档 (本目录)
└── vercel.json                     # Vercel 配置
```

---

## 🔐 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库 (Vercel Postgres)
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# 区块链 (X Layer)
NEXT_PUBLIC_CHAIN_ID="196"
NEXT_PUBLIC_RPC_URL="https://rpc.xlayer.tech"
PRIVATE_KEY="0x..."  # 部署合约用

# Chainlink VRF
VRF_COORDINATOR="0x..."
VRF_KEY_HASH="0x..."
VRF_SUBSCRIPTION_ID="123"

# AI Agent (可选)
OPENAI_API_KEY="sk-..."
```

---

## 📚 相关资源

- [Next.js 14 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Vercel Postgres 文档](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Cron Jobs 文档](https://vercel.com/docs/cron-jobs)
- [NextAuth.js 文档](https://next-auth.js.org/)
- [Ethers.js 文档](https://docs.ethers.org/v6/)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/)

---

## 📞 支持

如有问题，请参考各模块文档或提交 Issue。
