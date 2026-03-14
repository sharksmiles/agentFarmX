# 数据库设计方案

> **技术栈**: Prisma ORM + Vercel Postgres (全托管) | **版本**: v1.0

---

## 📋 目录

1. [技术选型说明](#技术选型说明)
2. [Prisma Schema 完整定义](#prisma-schema-完整定义)
3. [表结构详解](#表结构详解)
4. [索引优化策略](#索引优化策略)
5. [数据迁移计划](#数据迁移计划)
6. [性能优化建议](#性能优化建议)

---

## 技术选型说明

### Vercel Postgres 优势

| 特性 | 说明 |
|------|------|
| **全托管** | 无需运维，自动备份和恢复 |
| **Serverless** | 按需计费，自动扩缩容 |
| **低延迟** | Edge Network，全球分布 |
| **Prisma 集成** | 原生支持，零配置 |
| **连接池** | 自动管理，支持高并发 |

### Prisma ORM 优势

- ✅ **类型安全**: 自动生成 TypeScript 类型
- ✅ **迁移管理**: 声明式 Schema，自动生成迁移
- ✅ **查询优化**: 自动 JOIN 优化，N+1 问题检测
- ✅ **Edge 兼容**: 支持 Vercel Edge Runtime

---

## Prisma Schema 完整定义

创建 `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL") // uses connection pooling
  directUrl = env("POSTGRES_URL_NON_POOLING") // uses a direct connection
}

// ==================== 用户系统 ====================

model User {
  id            String   @id @default(cuid())
  walletAddress String   @unique @db.VarChar(42)
  username      String?  @db.VarChar(50)
  avatar        String?  @db.VarChar(255)
  
  // 游戏数据
  level         Int      @default(1)
  experience    Int      @default(0)
  farmCoins     Int      @default(1000)
  
  // 社交数据
  inviteCode    String   @unique @default(cuid()) @db.VarChar(20)
  invitedBy     String?  @db.VarChar(20)
  inviteCount   Int      @default(0)
  
  // 时间戳
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime @default(now())
  
  // 关联关系
  farmState     FarmState?
  agents        Agent[]
  inventory     Inventory[]
  socialActions SocialAction[]
  raffleEntries RaffleEntry[]
  transactions  Transaction[]
  
  @@index([walletAddress])
  @@index([inviteCode])
  @@index([createdAt])
  @@map("users")
}

// ==================== 农场状态 ====================

model FarmState {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 能量系统
  energy        Int      @default(100)
  maxEnergy     Int      @default(100)
  lastEnergyUpdate DateTime @default(now())
  
  // 土地系统
  unlockedLands Int      @default(6) // 已解锁地块数
  
  // 统计数据
  totalHarvests Int      @default(0)
  totalPlants   Int      @default(0)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // 关联关系
  landPlots     LandPlot[]
  
  @@index([userId])
  @@map("farm_states")
}

// ==================== 土地地块 ====================

model LandPlot {
  id            String   @id @default(cuid())
  farmStateId   String
  farmState     FarmState @relation(fields: [farmStateId], references: [id], onDelete: Cascade)
  
  plotIndex     Int      // 地块索引 (0-35)
  isUnlocked    Boolean  @default(false)
  
  // 作物状态
  cropId        String?  @db.VarChar(50) // 作物类型 ID (如 "Apple")
  plantedAt     DateTime?
  harvestAt     DateTime?
  growthStage   Int      @default(0) // 0: 空地, 1-3: 生长阶段, 4: 成熟
  
  // 增益效果
  boostMultiplier Float  @default(1.0) // 收益倍数
  boostExpireAt   DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([farmStateId, plotIndex])
  @@index([farmStateId])
  @@index([harvestAt])
  @@map("land_plots")
}

// ==================== 背包系统 ====================

model Inventory {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  itemType      String   @db.VarChar(50) // "crop" | "boost" | "decoration"
  itemId        String   @db.VarChar(50) // 物品 ID (如 "Apple", "SpeedBoost")
  quantity      Int      @default(0)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, itemType, itemId])
  @@index([userId])
  @@map("inventories")
}

// ==================== AI Agent 系统 ====================

model Agent {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 链上数据
  scaAddress    String   @unique @db.VarChar(42) // Smart Contract Account 地址
  nftTokenId    String?  @db.VarChar(78) // NFT Token ID (uint256)
  
  // Agent 配置
  name          String   @db.VarChar(100)
  personality   String   @db.VarChar(50) // "aggressive" | "conservative" | "balanced"
  strategyType  String   @db.VarChar(50) // "farming" | "trading" | "social"
  
  // AI 配置 (v2.0)
  aiModel       String   @default("gpt-3.5-turbo") @db.VarChar(50) // LLM 模型
  customPrompt  String?  @db.Text // 用户自定义提示词
  temperature   Float    @default(0.7) // LLM 温度参数
  
  // 状态
  status        String   @default("idle") @db.VarChar(20) // "idle" | "running" | "paused" | "error"
  isActive      Boolean  @default(false)
  
  // 性能数据
  totalProfit   Int      @default(0) // 累计收益 (FarmCoins)
  totalTasks    Int      @default(0) // 执行任务数
  successRate   Float    @default(0.0) // 成功率
  
  // 时间戳
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastActiveAt  DateTime?
  
  // 关联关系
  tasks         AgentTask[]
  logs          AgentLog[]
  skillUsages   AgentSkillUsage[]
  decisions     AgentDecision[]
  
  @@index([userId])
  @@index([scaAddress])
  @@index([status])
  @@map("agents")
}

// ==================== Agent 任务 ====================

model AgentTask {
  id            String   @id @default(cuid())
  agentId       String
  agent         Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  
  taskType      String   @db.VarChar(50) // "plant" | "harvest" | "trade" | "social"
  taskData      Json     // 任务参数 (JSONB)
  
  status        String   @default("pending") @db.VarChar(20) // "pending" | "running" | "completed" | "failed"
  priority      Int      @default(0) // 优先级 (0-10)
  
  // 执行结果
  result        Json?    // 执行结果 (JSONB)
  error         String?  @db.Text
  
  // 时间戳
  createdAt     DateTime @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  
  @@index([agentId])
  @@index([status])
  @@index([createdAt])
  @@map("agent_tasks")
}

// ==================== Agent 日志 ====================

model AgentLog {
  id            String   @id @default(cuid())
  agentId       String
  agent         Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  
  level         String   @db.VarChar(20) // "info" | "warning" | "error"
  message       String   @db.Text
  metadata      Json?    // 额外数据 (JSONB)
  
  createdAt     DateTime @default(now())
  
  @@index([agentId])
  @@index([createdAt])
  @@map("agent_logs")
}

// ==================== Agent Skills (AI v2.0) ====================

model AgentSkill {
  id            String   @id @default(cuid())
  
  // Skill 定义
  name          String   @unique @db.VarChar(100) // 技能名称 (如 "plant_crop")
  displayName   String   @db.VarChar(100) // 显示名称
  description   String   @db.Text // 功能描述 (给 LLM 看)
  category      String   @db.VarChar(50) // "farming" | "trading" | "social" | "strategy"
  
  // 参数定义 (JSON Schema)
  parameters    Json     // { type: "object", properties: {...}, required: [...] }
  
  // 限制条件
  energyCost    Int      @default(0) // 能量消耗
  cooldown      Int      @default(0) // 冷却时间 (秒)
  requiredLevel Int      @default(1) // 所需等级
  
  // 状态
  isActive      Boolean  @default(true) // 是否启用
  isSystem      Boolean  @default(true) // 是否系统内置 (false 为用户自定义)
  
  // 统计数据
  totalUsages   Int      @default(0) // 总使用次数
  successCount  Int      @default(0) // 成功次数
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // 关联关系
  usages        AgentSkillUsage[]
  
  @@index([category])
  @@index([isActive])
  @@map("agent_skills")
}

// ==================== Agent Skill 使用记录 ====================

model AgentSkillUsage {
  id            String   @id @default(cuid())
  agentId       String
  agent         Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  
  skillId       String
  skill         AgentSkill @relation(fields: [skillId], references: [id], onDelete: Cascade)
  
  // 执行信息
  parameters    Json     // 执行参数
  result        Json?    // 执行结果
  success       Boolean  @default(false)
  error         String?  @db.Text
  
  // 性能数据
  executionTime Int      @default(0) // 执行时间 (毫秒)
  
  createdAt     DateTime @default(now())
  
  @@index([agentId])
  @@index([skillId])
  @@index([createdAt])
  @@map("agent_skill_usages")
}

// ==================== Agent LLM 决策记录 ====================

model AgentDecision {
  id            String   @id @default(cuid())
  agentId       String
  agent         Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  
  // LLM 调用信息
  model         String   @db.VarChar(50) // 使用的模型
  prompt        String   @db.Text // 提示词
  response      String   @db.Text // LLM 响应
  
  // 决策结果
  decisions     Json     // 决策列表 (Skill 调用序列)
  reasoning     String?  @db.Text // 决策理由
  
  // 成本和性能
  tokensUsed    Int      @default(0) // Token 消耗
  cost          Float    @default(0.0) // 成本 (USD)
  latency       Int      @default(0) // 延迟 (毫秒)
  
  // 执行结果
  executed      Boolean  @default(false) // 是否已执行
  success       Boolean  @default(false) // 是否成功
  
  createdAt     DateTime @default(now())
  
  @@index([agentId])
  @@index([createdAt])
  @@index([model])
  @@map("agent_decisions")
}

// ==================== 社交系统 ====================

model SocialAction {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  targetUserId  String   // 目标用户 ID
  actionType    String   @db.VarChar(50) // "visit" | "water" | "steal"
  
  // 奖励
  rewardCoins   Int      @default(0)
  rewardExp     Int      @default(0)
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([targetUserId])
  @@index([createdAt])
  @@map("social_actions")
}

// ==================== 抽奖系统 ====================

model RaffleEntry {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  raffleId      String   @db.VarChar(100) // 抽奖活动 ID
  ticketCount   Int      @default(1) // 抽奖券数量
  
  // 中奖信息
  isWinner      Boolean  @default(false)
  prizeType     String?  @db.VarChar(50) // "nft" | "token" | "boost"
  prizeAmount   String?  @db.VarChar(78) // 奖品数量 (支持大数)
  
  // 链上数据
  txHash        String?  @db.VarChar(66) // 交易哈希
  
  createdAt     DateTime @default(now())
  claimedAt     DateTime?
  
  @@index([userId])
  @@index([raffleId])
  @@index([isWinner])
  @@map("raffle_entries")
}

// ==================== 交易记录 ====================

model Transaction {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type          String   @db.VarChar(50) // "earn" | "spend" | "transfer"
  category      String   @db.VarChar(50) // "harvest" | "plant" | "unlock_land" | "agent_create"
  
  amount        Int      // 金额 (FarmCoins)
  balance       Int      // 交易后余额
  
  description   String?  @db.VarChar(255)
  metadata      Json?    // 额外数据 (JSONB)
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([type])
  @@index([createdAt])
  @@map("transactions")
}

// ==================== 系统配置 ====================

model SystemConfig {
  id            String   @id @default(cuid())
  key           String   @unique @db.VarChar(100)
  value         Json     // 配置值 (JSONB)
  
  description   String?  @db.Text
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([key])
  @@map("system_configs")
}
```

---

## 表结构详解

### 1. 用户系统 (`users`)

**核心字段**:
- `walletAddress`: 钱包地址 (唯一索引)
- `inviteCode`: 邀请码 (唯一，自动生成)
- `farmCoins`: 游戏货币余额

**设计要点**:
- 使用 `cuid()` 作为主键，避免 UUID 性能问题
- `walletAddress` 固定长度 42 字符 (0x + 40 hex)
- `inviteCode` 用于邀请系统，支持快速查询

### 2. 农场状态 (`farm_states`)

**能量系统**:
- `energy`: 当前能量值
- `maxEnergy`: 最大能量上限
- `lastEnergyUpdate`: 上次能量更新时间 (用于计算恢复)

**设计要点**:
- 一对一关系 (`userId` 唯一)
- 能量恢复通过 Vercel Cron Job 每分钟计算

### 3. 土地地块 (`land_plots`)

**作物生长**:
- `cropId`: 作物类型 (引用静态配置)
- `plantedAt`: 种植时间
- `harvestAt`: 可收获时间
- `growthStage`: 生长阶段 (0-4)

**设计要点**:
- 复合唯一索引 `(farmStateId, plotIndex)` 确保每个地块唯一
- `harvestAt` 索引用于定时任务快速查询成熟作物

### 4. AI Agent 系统 (`agents`)

**链上关联**:
- `scaAddress`: ERC-4337 智能合约账户地址
- `nftTokenId`: Agent NFT Token ID

**性能追踪**:
- `totalProfit`: 累计收益
- `successRate`: 任务成功率

**设计要点**:
- `scaAddress` 唯一索引，链上链下数据同步
- `status` 索引用于查询活跃 Agent

### 5. 背包系统 (`inventories`)

**物品分类**:
- `itemType`: 物品类型 (crop/boost/decoration)
- `itemId`: 具体物品 ID
- `quantity`: 数量

**设计要点**:
- 复合唯一索引 `(userId, itemType, itemId)` 避免重复
- 使用 JSONB 存储物品元数据 (未来扩展)

---

## 索引优化策略

### 主要索引

```sql
-- 用户查询
CREATE INDEX idx_users_wallet ON users(walletAddress);
CREATE INDEX idx_users_invite ON users(inviteCode);
CREATE INDEX idx_users_created ON users(createdAt);

-- 农场查询
CREATE INDEX idx_farm_states_user ON farm_states(userId);
CREATE INDEX idx_land_plots_farm ON land_plots(farmStateId);
CREATE INDEX idx_land_plots_harvest ON land_plots(harvestAt) WHERE harvestAt IS NOT NULL;

-- Agent 查询
CREATE INDEX idx_agents_user ON agents(userId);
CREATE INDEX idx_agents_sca ON agents(scaAddress);
CREATE INDEX idx_agents_status ON agents(status) WHERE status != 'idle';

-- 任务查询
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agentId);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status, createdAt);

-- 交易查询
CREATE INDEX idx_transactions_user_created ON transactions(userId, createdAt DESC);
```

### 部分索引 (Partial Index)

```sql
-- 只索引活跃 Agent
CREATE INDEX idx_agents_active ON agents(userId) WHERE isActive = true;

-- 只索引未完成任务
CREATE INDEX idx_tasks_pending ON agent_tasks(agentId, priority DESC) 
  WHERE status IN ('pending', 'running');
```

---

## 数据迁移计划

### 初始化迁移

```bash
# 1. 生成初始迁移
npx prisma migrate dev --name init

# 2. 查看迁移 SQL
cat prisma/migrations/*/migration.sql

# 3. 应用到生产环境
npx prisma migrate deploy
```

### 迁移最佳实践

1. **开发环境**: 使用 `prisma migrate dev`
2. **生产环境**: 使用 `prisma migrate deploy`
3. **回滚**: 手动编写回滚 SQL
4. **数据备份**: 迁移前自动备份 (Vercel Postgres 自动)

### 示例迁移脚本

创建 `prisma/migrations/20260314_add_agent_reputation/migration.sql`:

```sql
-- 添加 Agent 声誉系统
ALTER TABLE "agents" ADD COLUMN "reputation" INTEGER NOT NULL DEFAULT 100;
CREATE INDEX "idx_agents_reputation" ON "agents"("reputation" DESC);

-- 更新现有数据
UPDATE "agents" SET "reputation" = 100 WHERE "reputation" IS NULL;
```

---

## 性能优化建议

### 1. 连接池配置

Vercel Postgres 自动管理连接池，但需要配置环境变量:

```env
# .env.local
POSTGRES_PRISMA_URL="postgres://...?pgbouncer=true&connection_limit=1"
POSTGRES_URL_NON_POOLING="postgres://..."
```

### 2. 查询优化

```typescript
// ❌ 避免 N+1 查询
const users = await prisma.user.findMany();
for (const user of users) {
  const farmState = await prisma.farmState.findUnique({ where: { userId: user.id } });
}

// ✅ 使用 include 预加载
const users = await prisma.user.findMany({
  include: { farmState: true }
});
```

### 3. 批量操作

```typescript
// ✅ 批量插入
await prisma.inventory.createMany({
  data: [
    { userId: '1', itemType: 'crop', itemId: 'Apple', quantity: 10 },
    { userId: '1', itemType: 'crop', itemId: 'Wheat', quantity: 5 },
  ],
  skipDuplicates: true,
});
```

### 4. 事务处理

```typescript
// ✅ 使用交互式事务
await prisma.$transaction(async (tx) => {
  // 扣除能量
  await tx.farmState.update({
    where: { userId },
    data: { energy: { decrement: 10 } },
  });
  
  // 种植作物
  await tx.landPlot.update({
    where: { id: plotId },
    data: { cropId: 'Apple', plantedAt: new Date() },
  });
  
  // 记录交易
  await tx.transaction.create({
    data: {
      userId,
      type: 'spend',
      category: 'plant',
      amount: -10,
      balance: newBalance,
    },
  });
});
```

### 5. 缓存策略

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 缓存用户数据 (TTL: 5分钟)
async function getUserWithCache(userId: string) {
  const cacheKey = `user:${userId}`;
  
  // 尝试从缓存读取
  const cached = await redis.get(cacheKey);
  if (cached) return cached;
  
  // 从数据库查询
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // 写入缓存
  await redis.setex(cacheKey, 300, JSON.stringify(user));
  
  return user;
}
```

---

## 数据库初始化脚本

创建 `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建系统配置
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'energy_recovery_rate',
        value: { rate: 1, interval: 60 }, // 每分钟恢复 1 点
        description: '能量恢复速率',
      },
      {
        key: 'crop_config',
        value: {
          Apple: { growTime: 180, baseReward: 50, energyCost: 10 },
          Wheat: { growTime: 120, baseReward: 30, energyCost: 5 },
        },
        description: '作物配置',
      },
    ],
  });

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

在 `package.json` 添加:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

执行种子数据:

```bash
npx prisma db seed
```

---

## 下一步

- ✅ 数据库 Schema 已定义
- ⏭️ 继续阅读 [API Routes 实现方案](./02-API-ROUTES.md)
- 📚 参考 [Prisma 文档](https://www.prisma.io/docs)
