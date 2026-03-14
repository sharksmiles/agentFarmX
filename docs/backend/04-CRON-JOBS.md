# 定时任务方案

> **技术栈**: Vercel Cron Jobs | **版本**: v1.0

---

## 📋 目录

1. [Vercel Cron Jobs 概述](#vercel-cron-jobs-概述)
2. [能量恢复任务](#能量恢复任务)
3. [作物成熟检测](#作物成熟检测)
4. [Agent 心跳检测](#agent-心跳检测)
5. [每日数据重置](#每日数据重置)
6. [配置和部署](#配置和部署)

---

## Vercel Cron Jobs 概述

### 为什么选择 Vercel Cron Jobs

| 特性 | 说明 |
|------|------|
| **原生集成** | 无需额外服务，直接在 `vercel.json` 配置 |
| **Serverless** | 按执行次数计费，无需维护服务器 |
| **全球分布** | Edge Network，低延迟 |
| **简单配置** | 标准 cron 语法，易于理解 |
| **自动扩展** | 自动处理高并发 |

### 限制和注意事项

- **执行时间限制**: 最长 10 秒 (Hobby)，60 秒 (Pro)
- **并发限制**: 根据套餐不同
- **时区**: 默认 UTC
- **最小间隔**: 1 分钟

---

## 能量恢复任务

### 功能说明

每分钟为所有用户恢复能量值，基于上次更新时间计算恢复量。

### 实现代码

创建 `src/app/api/cron/energy-recovery/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const maxDuration = 60; // Pro plan: 60s timeout

export async function GET(request: NextRequest) {
  try {
    // 验证 Cron Secret (安全性)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Energy Recovery] Starting...');

    // 获取能量恢复配置
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'energy_recovery_rate' },
    });

    const recoveryRate = (config?.value as any)?.rate || 1; // 默认每分钟恢复 1 点
    const now = new Date();

    // 批量查询需要恢复能量的农场
    const farmStates = await prisma.farmState.findMany({
      where: {
        energy: { lt: prisma.farmState.fields.maxEnergy },
      },
      select: {
        id: true,
        userId: true,
        energy: true,
        maxEnergy: true,
        lastEnergyUpdate: true,
      },
    });

    console.log(`[Energy Recovery] Found ${farmStates.length} farms to update`);

    // 批量更新
    const updates = farmStates.map(async (farm) => {
      const lastUpdate = new Date(farm.lastEnergyUpdate);
      const minutesPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
      
      if (minutesPassed < 1) return null;

      const energyToRecover = Math.min(
        minutesPassed * recoveryRate,
        farm.maxEnergy - farm.energy
      );

      if (energyToRecover <= 0) return null;

      return prisma.farmState.update({
        where: { id: farm.id },
        data: {
          energy: Math.min(farm.energy + energyToRecover, farm.maxEnergy),
          lastEnergyUpdate: now,
        },
      });
    });

    const results = await Promise.all(updates);
    const updatedCount = results.filter(r => r !== null).length;

    // 记录到 Redis (监控)
    await redis.set(
      'cron:energy_recovery:last_run',
      JSON.stringify({
        timestamp: now.toISOString(),
        processed: farmStates.length,
        updated: updatedCount,
        duration: Date.now() - startTime,
      }),
      { ex: 3600 } // 1小时过期
    );

    console.log(`[Energy Recovery] Completed: ${updatedCount}/${farmStates.length} updated in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      processed: farmStates.length,
      updated: updatedCount,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Energy Recovery] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Cron 配置

```json
{
  "path": "/api/cron/energy-recovery",
  "schedule": "* * * * *"
}
```

---

## 作物成熟检测

### 功能说明

每分钟检测成熟的作物，更新生长阶段，发送通知。

### 实现代码

创建 `src/app/api/cron/crop-maturity/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Crop Maturity] Starting...');

    const now = new Date();

    // 查询已成熟但未标记的作物
    const maturePlots = await prisma.landPlot.findMany({
      where: {
        cropId: { not: null },
        harvestAt: { lte: now },
        growthStage: { lt: 4 }, // 未标记为成熟
      },
      include: {
        farmState: {
          select: {
            userId: true,
          },
        },
      },
    });

    console.log(`[Crop Maturity] Found ${maturePlots.length} mature crops`);

    // 批量更新生长阶段
    const updates = maturePlots.map((plot) =>
      prisma.landPlot.update({
        where: { id: plot.id },
        data: { growthStage: 4 }, // 标记为成熟
      })
    );

    await Promise.all(updates);

    // 发送通知 (通过 Redis Pub/Sub)
    const notifications = maturePlots.map(async (plot) => {
      const notificationKey = `notification:${plot.farmState.userId}`;
      await redis.lpush(notificationKey, JSON.stringify({
        type: 'crop_mature',
        plotId: plot.id,
        cropId: plot.cropId,
        timestamp: now.toISOString(),
      }));
      await redis.expire(notificationKey, 86400); // 24小时过期
    });

    await Promise.all(notifications);

    // 记录统计
    await redis.set(
      'cron:crop_maturity:last_run',
      JSON.stringify({
        timestamp: now.toISOString(),
        matured: maturePlots.length,
        duration: Date.now() - startTime,
      }),
      { ex: 3600 }
    );

    console.log(`[Crop Maturity] Completed: ${maturePlots.length} crops matured in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      matured: maturePlots.length,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Crop Maturity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Cron 配置

```json
{
  "path": "/api/cron/crop-maturity",
  "schedule": "* * * * *"
}
```

---

## Agent 心跳检测

### 功能说明

每 10 秒检测活跃 Agent 状态，处理超时任务，记录健康状态。

### 实现代码

创建 `src/app/api/cron/agent-heartbeat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const maxDuration = 60;

const HEARTBEAT_TIMEOUT = 30000; // 30秒超时

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Agent Heartbeat] Starting...');

    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - HEARTBEAT_TIMEOUT);

    // 查询活跃的 Agent
    const activeAgents = await prisma.agent.findMany({
      where: {
        isActive: true,
        status: 'running',
      },
      select: {
        id: true,
        userId: true,
        lastActiveAt: true,
      },
    });

    console.log(`[Agent Heartbeat] Checking ${activeAgents.length} active agents`);

    // 检测超时 Agent
    const timeoutAgents = activeAgents.filter(
      (agent) => agent.lastActiveAt && agent.lastActiveAt < timeoutThreshold
    );

    if (timeoutAgents.length > 0) {
      console.log(`[Agent Heartbeat] Found ${timeoutAgents.length} timeout agents`);

      // 更新超时 Agent 状态
      await prisma.agent.updateMany({
        where: {
          id: { in: timeoutAgents.map(a => a.id) },
        },
        data: {
          status: 'error',
          isActive: false,
        },
      });

      // 记录日志
      const logs = timeoutAgents.map((agent) =>
        prisma.agentLog.create({
          data: {
            agentId: agent.id,
            level: 'error',
            message: 'Agent heartbeat timeout',
            metadata: {
              lastActiveAt: agent.lastActiveAt?.toISOString(),
              timeoutAt: now.toISOString(),
            },
          },
        })
      );

      await Promise.all(logs);
    }

    // 检查待处理任务
    const pendingTasks = await prisma.agentTask.findMany({
      where: {
        status: 'running',
        startedAt: { lt: timeoutThreshold },
      },
    });

    if (pendingTasks.length > 0) {
      console.log(`[Agent Heartbeat] Found ${pendingTasks.length} timeout tasks`);

      // 标记超时任务为失败
      await prisma.agentTask.updateMany({
        where: {
          id: { in: pendingTasks.map(t => t.id) },
        },
        data: {
          status: 'failed',
          error: 'Task execution timeout',
          completedAt: now,
        },
      });
    }

    // 更新健康状态到 Redis
    const healthStatus = {
      timestamp: now.toISOString(),
      totalActive: activeAgents.length,
      timeoutAgents: timeoutAgents.length,
      timeoutTasks: pendingTasks.length,
      duration: Date.now() - startTime,
    };

    await redis.set(
      'cron:agent_heartbeat:last_run',
      JSON.stringify(healthStatus),
      { ex: 60 } // 1分钟过期
    );

    console.log(`[Agent Heartbeat] Completed in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      ...healthStatus,
    });
  } catch (error) {
    console.error('[Agent Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Cron 配置

```json
{
  "path": "/api/cron/agent-heartbeat",
  "schedule": "*/10 * * * * *"
}
```

**注意**: Vercel Cron 最小间隔为 1 分钟，如需 10 秒间隔，需要使用外部 Cron 服务（如 cron-job.org）或在单次执行中循环处理。

**替代方案**:

```typescript
// 在 1 分钟内执行 6 次，每次间隔 10 秒
export async function GET(request: NextRequest) {
  for (let i = 0; i < 6; i++) {
    await performHeartbeatCheck();
    if (i < 5) await new Promise(resolve => setTimeout(resolve, 10000));
  }
  return NextResponse.json({ success: true });
}
```

---

## 每日数据重置

### 功能说明

每天 UTC 0:00 重置每日任务、社交互动次数、排行榜等数据。

### 实现代码

创建 `src/app/api/cron/daily-reset/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Daily Reset] Starting...');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. 清理过期的社交互动记录 (保留 7 天)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const deletedActions = await prisma.socialAction.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
      },
    });

    console.log(`[Daily Reset] Deleted ${deletedActions.count} old social actions`);

    // 2. 清理过期的 Agent 日志 (保留 30 天)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deletedLogs = await prisma.agentLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    console.log(`[Daily Reset] Deleted ${deletedLogs.count} old agent logs`);

    // 3. 更新每日排行榜
    const topPlayers = await prisma.user.findMany({
      orderBy: [
        { level: 'desc' },
        { experience: 'desc' },
      ],
      take: 100,
      select: {
        id: true,
        walletAddress: true,
        username: true,
        level: true,
        experience: true,
        farmCoins: true,
      },
    });

    await redis.set(
      'leaderboard:daily',
      JSON.stringify({
        date: now.toISOString().split('T')[0],
        players: topPlayers,
      }),
      { ex: 86400 } // 24小时过期
    );

    console.log(`[Daily Reset] Updated leaderboard with ${topPlayers.length} players`);

    // 4. 统计昨日数据
    const yesterdayStats = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: yesterday,
          lt: now,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    await redis.set(
      `stats:daily:${yesterday.toISOString().split('T')[0]}`,
      JSON.stringify({
        totalTransactions: yesterdayStats._count,
        totalAmount: yesterdayStats._sum.amount || 0,
      }),
      { ex: 30 * 86400 } // 30天过期
    );

    // 5. 清理 Redis 缓存
    const pattern = 'cache:*';
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Daily Reset] Cleared ${keys.length} cache keys`);
    }

    // 记录执行结果
    await redis.set(
      'cron:daily_reset:last_run',
      JSON.stringify({
        timestamp: now.toISOString(),
        deletedActions: deletedActions.count,
        deletedLogs: deletedLogs.count,
        leaderboardSize: topPlayers.length,
        duration: Date.now() - startTime,
      }),
      { ex: 86400 }
    );

    console.log(`[Daily Reset] Completed in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      deletedActions: deletedActions.count,
      deletedLogs: deletedLogs.count,
      leaderboardSize: topPlayers.length,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Daily Reset] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Cron 配置

```json
{
  "path": "/api/cron/daily-reset",
  "schedule": "0 0 * * *"
}
```

---

## 配置和部署

### 1. Vercel 配置文件

创建/更新 `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/energy-recovery",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/crop-maturity",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/agent-heartbeat",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/daily-reset",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 2. 环境变量

在 Vercel Dashboard 或 `.env.local` 添加:

```bash
# Cron Job 安全密钥
CRON_SECRET="your-random-secret-key-here"
```

生成安全密钥:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 部署

```bash
# 部署到 Vercel
vercel --prod

# 查看 Cron Jobs 状态
vercel cron ls
```

### 4. 监控和日志

在 Vercel Dashboard:
1. 进入项目 → **Cron Jobs**
2. 查看执行历史和日志
3. 设置告警通知

---

## 性能优化

### 1. 批量处理

```typescript
// ❌ 避免逐个处理
for (const farm of farms) {
  await prisma.farmState.update({ where: { id: farm.id }, data: {...} });
}

// ✅ 使用批量更新
await prisma.$transaction(
  farms.map(farm => 
    prisma.farmState.update({ where: { id: farm.id }, data: {...} })
  )
);
```

### 2. 分页处理大数据

```typescript
const BATCH_SIZE = 1000;
let skip = 0;
let hasMore = true;

while (hasMore) {
  const batch = await prisma.farmState.findMany({
    skip,
    take: BATCH_SIZE,
  });

  if (batch.length < BATCH_SIZE) {
    hasMore = false;
  }

  // 处理批次
  await processBatch(batch);
  skip += BATCH_SIZE;
}
```

### 3. 使用索引

确保查询字段有索引:

```prisma
model LandPlot {
  // ...
  @@index([harvestAt]) // 用于作物成熟查询
}

model Agent {
  // ...
  @@index([status, isActive]) // 用于心跳检测
}
```

---

## 错误处理和重试

### 重试机制

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

// 使用
await withRetry(() => prisma.farmState.updateMany({...}));
```

### 告警通知

```typescript
async function sendAlert(message: string) {
  // 发送到 Discord/Slack/Email
  await fetch(process.env.WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `[Cron Alert] ${message}` }),
  });
}

// 在错误处理中使用
catch (error) {
  await sendAlert(`Energy recovery failed: ${error.message}`);
  throw error;
}
```

---

## 测试

### 本地测试

```bash
# 测试能量恢复
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/energy-recovery

# 测试作物成熟
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/crop-maturity
```

### 生产环境测试

在 Vercel Dashboard:
1. 进入 **Cron Jobs**
2. 点击 **Run Now** 手动触发
3. 查看执行日志

---

## 下一步

- ✅ 定时任务已配置
- ⏭️ 继续阅读 [实施路线图](./05-IMPLEMENTATION-ROADMAP.md)
