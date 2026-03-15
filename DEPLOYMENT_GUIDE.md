# AgentFarm X 部署指南

## 📋 前置要求

- Node.js 18+
- PostgreSQL 16
- npm 或 yarn
- Git

## 🚀 快速开始

### 1. 环境配置

创建 `.env` 文件：

```bash
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/agentfarmx?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI API (用于 AI Agent)
OPENAI_API_KEY="sk-your-openai-api-key"

# Vercel Cron 安全密钥
CRON_SECRET="your-cron-secret-key"

# 支付接收地址
PAYMENT_RECEIVER_ADDRESS="0xYourWalletAddress"

# API Base URL (可选，默认为空)
NEXT_PUBLIC_API_URL=""
```

### 2. 安装依赖

**注意**：Windows 用户可能遇到 Prisma 生成客户端的权限问题。

#### 方案 A：正常安装（推荐）

```bash
# 以管理员身份运行 PowerShell
npm install
```

#### 方案 B：跳过 Prisma 生成（如遇到权限问题）

```bash
# 跳过 postinstall 脚本
npm install --ignore-scripts

# 手动生成 Prisma 客户端（以管理员身份）
npx prisma generate
```

### 3. 数据库迁移

#### 3.1 创建数据库

```bash
# 使用 PostgreSQL CLI
createdb agentfarmx

# 或使用 SQL
psql -U postgres
CREATE DATABASE agentfarmx;
```

#### 3.2 运行 Prisma 迁移

```bash
# 推送 Schema 到数据库
npx prisma db push

# 或创建迁移文件
npx prisma migrate dev --name init
```

#### 3.3 初始化游戏配置数据

```bash
# 运行种子脚本
npx tsx scripts/seed-game-configs.ts
```

这将创建：
- 24 种作物配置
- 50 个等级配置
- 土地价格配置
- 抽奖状态配置

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📦 生产部署

### Vercel 部署（推荐）

1. **连接 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **在 Vercel 创建项目**
   - 导入 GitHub 仓库
   - 配置环境变量（从 `.env` 复制）
   - 部署

3. **配置 Cron Jobs**
   
   Vercel 会自动读取 `vercel.json` 中的 cron 配置：
   - `/api/cron/energy-recovery` - 每分钟
   - `/api/cron/crop-maturity` - 每分钟
   - `/api/cron/agent-heartbeat` - 每 5 分钟
   - `/api/cron/daily-reset` - 每日 0:00

4. **配置数据库**
   
   使用 Vercel Postgres 或外部 PostgreSQL：
   ```bash
   # 在 Vercel 项目设置中添加
   DATABASE_URL="postgresql://..."
   ```

5. **运行数据库迁移**
   ```bash
   # 本地连接生产数据库
   DATABASE_URL="<production-db-url>" npx prisma db push
   
   # 运行种子脚本
   DATABASE_URL="<production-db-url>" npx tsx scripts/seed-game-configs.ts
   ```

## 🔧 技术债务修复清单

根据 PRD v3.0 Section 28，以下问题已修复：

### ✅ 已完成

1. **x402 后端验证逻辑** - `/api/payment/quote` 已实现
   - GET: 获取支付报价
   - POST: 验证支付交易

2. **GameStats 数据库化** - 新增 Prisma 模型
   - `CropConfig` - 作物配置表
   - `LevelConfig` - 等级配置表
   - `/api/config/game` - 游戏配置 API

3. **偷盗成功率后端化** - `/api/social/steal` 已增强
   - 7 个因素计算成功率
   - 完整的成功率详情返回
   - 防止作弊

4. **AgentContext 创建** - `src/components/context/agentContext.tsx`
   - 独立的 Agent 状态管理
   - 完整的 CRUD 方法
   - 类型安全

### ⚠️ 需要手动操作

由于 Prisma 客户端尚未重新生成，以下文件会有 TypeScript 错误：

- `src/app/api/config/game/route.ts`
- `scripts/seed-game-configs.ts`
- `src/app/api/social/steal/route.ts`

**解决方法**：
```bash
# 以管理员身份运行
npx prisma generate

# 或重新安装
npm install
```

## 🗄️ 数据库 Schema 更新

新增的表：

```prisma
model CropConfig {
  id              String   @id @default(cuid())
  cropType        String   @unique
  unlockLevel     Int
  seedPrice       Int
  matureTime      Int
  wateringPeriod  Int
  harvestPrice    Int
  seedingExp      Int
  harvestExp      Int
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model LevelConfig {
  id              String   @id @default(cuid())
  level           Int      @unique
  requiredExp     Int
  maxLand         Int
  upgradeCost     Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 📊 API 更新

### 新增端点

1. **GET /api/config/game** - 获取游戏配置
   ```json
   {
     "crop_info": [...],
     "land_prices": {...},
     "level_requirements": {...},
     "raffle_live": 0
   }
   ```

2. **GET /api/payment/quote?serviceId=radar-basic** - 获取支付报价
   ```json
   {
     "serviceId": "radar-basic",
     "price": 0.1,
     "currency": "USDC",
     "nonce": "...",
     "paymentAddress": "0x...",
     "expiresAt": "2026-03-15T..."
   }
   ```

3. **POST /api/payment/quote** - 验证支付
   ```json
   {
     "serviceId": "radar-basic",
     "signature": "0x...",
     "nonce": "...",
     "txHash": "0x..."
   }
   ```

### 增强端点

**POST /api/social/steal** - 现在返回完整的成功率详情：
```json
{
  "success": true,
  "reward": 60,
  "successRate": 65,
  "successRateDetails": {
    "base_success_rate": "50%",
    "online": "0% (target offline)",
    "crop_level_diff": "-4% (crop level 19 vs stealer level 15)",
    "level_diff": "+5% (stealer level 15 vs target level 10)",
    "invite_diff": "+2% (stealer has 10 invites vs target 6)",
    "friendship_diff": "0%",
    "recidivist": "-6% (7 recent steals)",
    "new_farmer": "0%"
  },
  "energyCost": 1,
  "coinCost": 100
}
```

## 🐛 故障排除

### Prisma 生成失败（Windows）

**错误**: `EPERM: operation not permitted, rename`

**解决方案**:
1. 关闭所有可能占用文件的程序（VS Code、终端等）
2. 以管理员身份运行 PowerShell
3. 删除 `node_modules\.prisma` 文件夹
4. 重新运行 `npm install`

### 数据库连接失败

**检查清单**:
- PostgreSQL 服务是否运行
- DATABASE_URL 是否正确
- 数据库是否已创建
- 用户权限是否足够

### Cron Jobs 不执行

**Vercel 环境**:
- 确保 `CRON_SECRET` 环境变量已设置
- 检查 Vercel 项目的 Cron 日志
- 确认 `vercel.json` 配置正确

## 📝 下一步

1. **配置钱包连接**
   - 确保 MetaMask/OKX Wallet 已安装
   - 配置 X Layer 网络（Chain ID: 196）

2. **创建第一个 Agent**
   - 访问 `/agents/create`
   - 配置 Agent 参数
   - 充值 SCA 账户

3. **测试游戏功能**
   - 种植作物
   - 添加好友
   - 完成任务
   - 参与抽奖

## 🔗 相关文档

- [PRD v3.0](./PRD.md) - 完整产品需求文档
- [技术设计](./TECH_DESIGN.md) - 技术架构文档
- [Prisma Schema](./prisma/schema.prisma) - 数据库模型定义

---

**版本**: 1.0  
**最后更新**: 2026-03-15  
**维护者**: AgentFarm X 开发团队
