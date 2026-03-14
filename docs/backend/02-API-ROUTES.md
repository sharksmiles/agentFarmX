# API Routes 实现方案

> **技术栈**: Next.js 14 App Router + Server Actions + AI LLM | **版本**: v2.0

---

## 📋 目录

1. [架构设计](#架构设计)
2. [认证模块](#认证模块)
3. [游戏逻辑模块](#游戏逻辑模块)
4. [Agent 管理模块](#agent-管理模块)
5. [AI Agent Skills 模块](#ai-agent-skills-模块) ⭐ NEW
6. [社交功能模块](#社交功能模块)
7. [支付协议模块](#支付协议模块)
8. [错误处理和中间件](#错误处理和中间件)

---

## 架构设计

### API 路由结构

```
src/app/api/
├── auth/
│   ├── [...nextauth]/route.ts    # NextAuth.js 配置
│   └── nonce/route.ts             # SIWE Nonce 生成
├── game/
│   ├── farm/
│   │   ├── state/route.ts         # 获取农场状态
│   │   ├── plant/route.ts         # 种植作物
│   │   ├── harvest/route.ts       # 收获作物
│   │   └── unlock/route.ts        # 解锁土地
│   ├── inventory/route.ts         # 背包管理
│   └── leaderboard/route.ts       # 排行榜
├── agents/
│   ├── create/route.ts            # 创建 Agent
│   ├── [agentId]/
│   │   ├── route.ts               # Agent 详情
│   │   ├── start/route.ts         # 启动 Agent
│   │   ├── stop/route.ts          # 停止 Agent
│   │   ├── tasks/route.ts         # 任务列表
│   │   ├── logs/route.ts          # 日志流 (SSE)
│   │   ├── decide/route.ts        # AI 决策 (LLM) ⭐ NEW
│   │   ├── skills/route.ts        # 可用技能列表 ⭐ NEW
│   │   └── decisions/route.ts     # 决策历史 ⭐ NEW
│   ├── list/route.ts              # Agent 列表
│   └── skills/
│       ├── route.ts               # Skills 列表
│       ├── [skillId]/route.ts     # Skill 详情
│       └── usage/route.ts         # Skill 使用统计
├── social/
│   ├── visit/route.ts             # 访问好友
│   ├── water/route.ts             # 浇水
│   ├── steal/route.ts             # 偷菜
│   └── friends/route.ts           # 好友列表
├── payment/
│   ├── quote/route.ts             # x402 报价
│   ├── verify/route.ts            # 支付验证
│   └── callback/route.ts          # 支付回调
└── raffle/
    ├── enter/route.ts             # 参与抽奖
    └── claim/route.ts             # 领取奖励
```

---

## 认证模块

### 1. NextAuth.js + SIWE 配置

创建 `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SiweMessage } from 'siwe';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: { label: 'Message', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            return null;
          }

          const siwe = new SiweMessage(JSON.parse(credentials.message));
          const result = await siwe.verify({
            signature: credentials.signature,
          });

          if (!result.success) {
            return null;
          }

          const walletAddress = siwe.address.toLowerCase();

          // 查找或创建用户
          let user = await prisma.user.findUnique({
            where: { walletAddress },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                walletAddress,
                farmState: {
                  create: {
                    energy: 100,
                    maxEnergy: 100,
                    landPlots: {
                      create: Array.from({ length: 6 }, (_, i) => ({
                        plotIndex: i,
                        isUnlocked: true,
                      })),
                    },
                  },
                },
              },
            });
          }

          // 更新最后登录时间
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            walletAddress: user.walletAddress,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = user.walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.walletAddress = token.walletAddress as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 2. Nonce 生成

创建 `src/app/api/auth/nonce/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { generateNonce } from 'siwe';

export async function GET() {
  const nonce = generateNonce();
  return NextResponse.json({ nonce });
}
```

### 3. 类型定义

创建 `src/types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      walletAddress: string;
    };
  }

  interface User {
    id: string;
    walletAddress: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    walletAddress: string;
  }
}
```

---

## 游戏逻辑模块

### 1. 获取农场状态

创建 `src/app/api/game/farm/state/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const farmState = await prisma.farmState.findUnique({
      where: { userId: session.user.id },
      include: {
        landPlots: {
          orderBy: { plotIndex: 'asc' },
        },
        user: {
          select: {
            level: true,
            experience: true,
            farmCoins: true,
          },
        },
      },
    });

    if (!farmState) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    // 计算能量恢复
    const now = new Date();
    const lastUpdate = new Date(farmState.lastEnergyUpdate);
    const minutesPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
    const energyRecovered = Math.min(minutesPassed, farmState.maxEnergy - farmState.energy);

    if (energyRecovered > 0) {
      await prisma.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: Math.min(farmState.energy + energyRecovered, farmState.maxEnergy),
          lastEnergyUpdate: now,
        },
      });
    }

    return NextResponse.json({
      ...farmState,
      energy: Math.min(farmState.energy + energyRecovered, farmState.maxEnergy),
    });
  } catch (error) {
    console.error('Get farm state error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. 种植作物

创建 `src/app/api/game/farm/plant/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getCropConfig } from '@/lib/game-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plotId, cropId } = await request.json();

    // 获取作物配置
    const cropConfig = await getCropConfig(cropId);
    if (!cropConfig) {
      return NextResponse.json({ error: 'Invalid crop' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 检查地块状态
      const plot = await tx.landPlot.findUnique({
        where: { id: plotId },
        include: { farmState: true },
      });

      if (!plot || plot.farmState.userId !== session.user.id) {
        throw new Error('Invalid plot');
      }

      if (plot.cropId) {
        throw new Error('Plot already has a crop');
      }

      // 检查能量
      if (plot.farmState.energy < cropConfig.energyCost) {
        throw new Error('Not enough energy');
      }

      // 检查背包
      const inventory = await tx.inventory.findUnique({
        where: {
          userId_itemType_itemId: {
            userId: session.user.id,
            itemType: 'crop',
            itemId: cropId,
          },
        },
      });

      if (!inventory || inventory.quantity < 1) {
        throw new Error('Not enough seeds');
      }

      // 扣除种子
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: 1 } },
      });

      // 扣除能量
      await tx.farmState.update({
        where: { id: plot.farmStateId },
        data: { energy: { decrement: cropConfig.energyCost } },
      });

      // 种植作物
      const now = new Date();
      const harvestAt = new Date(now.getTime() + cropConfig.growTime * 1000);

      const updatedPlot = await tx.landPlot.update({
        where: { id: plotId },
        data: {
          cropId,
          plantedAt: now,
          harvestAt,
          growthStage: 1,
        },
      });

      // 记录交易
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'spend',
          category: 'plant',
          amount: -cropConfig.energyCost,
          balance: plot.farmState.energy - cropConfig.energyCost,
          description: `Planted ${cropId}`,
        },
      });

      return updatedPlot;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Plant crop error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

### 3. 收获作物

创建 `src/app/api/game/farm/harvest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getCropConfig } from '@/lib/game-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plotId } = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      const plot = await tx.landPlot.findUnique({
        where: { id: plotId },
        include: { farmState: { include: { user: true } } },
      });

      if (!plot || plot.farmState.userId !== session.user.id) {
        throw new Error('Invalid plot');
      }

      if (!plot.cropId || !plot.harvestAt) {
        throw new Error('No crop to harvest');
      }

      const now = new Date();
      if (now < plot.harvestAt) {
        throw new Error('Crop not ready');
      }

      const cropConfig = await getCropConfig(plot.cropId);
      if (!cropConfig) {
        throw new Error('Invalid crop config');
      }

      // 计算收益
      const baseReward = cropConfig.baseReward;
      const boostMultiplier = plot.boostMultiplier || 1.0;
      const finalReward = Math.floor(baseReward * boostMultiplier);

      // 添加到背包
      await tx.inventory.upsert({
        where: {
          userId_itemType_itemId: {
            userId: session.user.id,
            itemType: 'crop',
            itemId: plot.cropId,
          },
        },
        create: {
          userId: session.user.id,
          itemType: 'crop',
          itemId: plot.cropId,
          quantity: finalReward,
        },
        update: {
          quantity: { increment: finalReward },
        },
      });

      // 更新用户金币和经验
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          farmCoins: { increment: finalReward },
          experience: { increment: Math.floor(finalReward * 0.5) },
        },
      });

      // 清空地块
      const updatedPlot = await tx.landPlot.update({
        where: { id: plotId },
        data: {
          cropId: null,
          plantedAt: null,
          harvestAt: null,
          growthStage: 0,
          boostMultiplier: 1.0,
        },
      });

      // 更新农场统计
      await tx.farmState.update({
        where: { id: plot.farmStateId },
        data: { totalHarvests: { increment: 1 } },
      });

      // 记录交易
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'earn',
          category: 'harvest',
          amount: finalReward,
          balance: updatedUser.farmCoins,
          description: `Harvested ${plot.cropId}`,
        },
      });

      return {
        plot: updatedPlot,
        reward: finalReward,
        newBalance: updatedUser.farmCoins,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Harvest crop error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

### 4. 解锁土地

创建 `src/app/api/game/farm/unlock/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const UNLOCK_COSTS = [0, 0, 0, 0, 0, 0, 100, 200, 300, 500, 800, 1200]; // 前6块免费

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plotIndex } = await request.json();

    if (plotIndex < 0 || plotIndex > 35) {
      return NextResponse.json({ error: 'Invalid plot index' }, { status: 400 });
    }

    const cost = UNLOCK_COSTS[Math.min(plotIndex, UNLOCK_COSTS.length - 1)];

    const result = await prisma.$transaction(async (tx) => {
      const farmState = await tx.farmState.findUnique({
        where: { userId: session.user.id },
        include: { user: true, landPlots: true },
      });

      if (!farmState) {
        throw new Error('Farm not found');
      }

      // 检查是否已解锁
      const existingPlot = farmState.landPlots.find((p) => p.plotIndex === plotIndex);
      if (existingPlot?.isUnlocked) {
        throw new Error('Plot already unlocked');
      }

      // 检查金币
      if (farmState.user.farmCoins < cost) {
        throw new Error('Not enough coins');
      }

      // 扣除金币
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { farmCoins: { decrement: cost } },
      });

      // 解锁地块
      let plot;
      if (existingPlot) {
        plot = await tx.landPlot.update({
          where: { id: existingPlot.id },
          data: { isUnlocked: true },
        });
      } else {
        plot = await tx.landPlot.create({
          data: {
            farmStateId: farmState.id,
            plotIndex,
            isUnlocked: true,
          },
        });
      }

      // 更新已解锁数量
      await tx.farmState.update({
        where: { id: farmState.id },
        data: { unlockedLands: { increment: 1 } },
      });

      // 记录交易
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'spend',
          category: 'unlock_land',
          amount: -cost,
          balance: updatedUser.farmCoins,
          description: `Unlocked plot ${plotIndex}`,
        },
      });

      return { plot, newBalance: updatedUser.farmCoins };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Unlock land error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

---

## Agent 管理模块

### 1. 创建 Agent

创建 `src/app/api/agents/create/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAgentSCA } from '@/lib/blockchain/agent-factory';

const AGENT_CREATION_COST = 1000; // FarmCoins

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, personality, strategyType } = await request.json();

    // 验证参数
    if (!name || !personality || !strategyType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 检查金币
      if (user.farmCoins < AGENT_CREATION_COST) {
        throw new Error('Not enough coins');
      }

      // 扣除金币
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { farmCoins: { decrement: AGENT_CREATION_COST } },
      });

      // 创建链上 SCA (Smart Contract Account)
      const { scaAddress, txHash } = await createAgentSCA(user.walletAddress);

      // 创建 Agent 记录
      const agent = await tx.agent.create({
        data: {
          userId: session.user.id,
          scaAddress,
          name,
          personality,
          strategyType,
          status: 'idle',
        },
      });

      // 记录交易
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'spend',
          category: 'agent_create',
          amount: -AGENT_CREATION_COST,
          balance: updatedUser.farmCoins,
          description: `Created agent: ${name}`,
          metadata: { agentId: agent.id, txHash },
        },
      });

      return { agent, txHash };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Create agent error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

### 2. 启动 Agent

创建 `src/app/api/agents/[agentId]/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { startAgentExecution } from '@/lib/agent-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status === 'running') {
      return NextResponse.json({ error: 'Agent already running' }, { status: 400 });
    }

    // 更新状态
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'running',
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    // 启动 Agent 执行引擎 (异步)
    startAgentExecution(agentId).catch((error) => {
      console.error(`Agent ${agentId} execution error:`, error);
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Start agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Agent 日志流 (SSE)

创建 `src/app/api/agents/[agentId]/logs/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { agentId } = params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || agent.userId !== session.user.id) {
    return new Response('Agent not found', { status: 404 });
  }

  // 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 发送历史日志
      const logs = await prisma.agentLog.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      for (const log of logs.reverse()) {
        const data = `data: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // 监听新日志 (使用轮询或 Redis Pub/Sub)
      const interval = setInterval(async () => {
        try {
          const newLogs = await prisma.agentLog.findMany({
            where: {
              agentId,
              createdAt: { gt: new Date(Date.now() - 5000) },
            },
            orderBy: { createdAt: 'asc' },
          });

          for (const log of newLogs) {
            const data = `data: ${JSON.stringify(log)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          console.error('SSE error:', error);
        }
      }, 5000);

      // 清理
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

## 社交功能模块

### 1. 访问好友

创建 `src/app/api/social/visit/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const VISIT_REWARD_COINS = 10;
const VISIT_REWARD_EXP = 5;
const VISIT_COOLDOWN = 24 * 60 * 60 * 1000; // 24小时

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await request.json();

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot visit yourself' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 检查冷却时间
      const lastVisit = await tx.socialAction.findFirst({
        where: {
          userId: session.user.id,
          targetUserId,
          actionType: 'visit',
          createdAt: { gt: new Date(Date.now() - VISIT_COOLDOWN) },
        },
      });

      if (lastVisit) {
        throw new Error('Visit cooldown not expired');
      }

      // 创建访问记录
      const action = await tx.socialAction.create({
        data: {
          userId: session.user.id,
          targetUserId,
          actionType: 'visit',
          rewardCoins: VISIT_REWARD_COINS,
          rewardExp: VISIT_REWARD_EXP,
        },
      });

      // 奖励用户
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          farmCoins: { increment: VISIT_REWARD_COINS },
          experience: { increment: VISIT_REWARD_EXP },
        },
      });

      return { action, newBalance: updatedUser.farmCoins };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Visit error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

---

## 支付协议模块

### 1. x402 报价

创建 `src/app/api/payment/quote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service, params } = await request.json();

    // 根据服务类型计算价格
    let price = 0;
    switch (service) {
      case 'agent_execution':
        price = 100; // 100 $FARM per execution
        break;
      case 'boost_purchase':
        price = params.duration * 10; // 10 $FARM per hour
        break;
      default:
        return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    const quote = {
      quoteId: `quote_${Date.now()}`,
      service,
      price,
      currency: 'FARM',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟有效期
    };

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 错误处理和中间件

### 1. 全局错误处理

创建 `src/lib/api-error.ts`:

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  console.error('Unexpected error:', error);
  return {
    error: 'Internal server error',
    statusCode: 500,
  };
}
```

### 2. 认证中间件

创建 `src/lib/auth-middleware.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest } from 'next/server';

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  return session;
}
```

### 3. 速率限制

创建 `src/lib/rate-limit.ts`:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<boolean> {
  const key = `rate_limit:${identifier}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, window);
  }
  
  return count <= limit;
}
```

---

## 工具函数

### 游戏配置

创建 `src/lib/game-config.ts`:

```typescript
import { prisma } from './prisma';

export async function getCropConfig(cropId: string) {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'crop_config' },
  });

  if (!config) return null;

  const crops = config.value as Record<string, any>;
  return crops[cropId] || null;
}

export async function getEnergyRecoveryRate() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'energy_recovery_rate' },
  });

  return config?.value as { rate: number; interval: number } || { rate: 1, interval: 60 };
}
```

---

## 下一步

- ✅ API Routes 已定义
- ⏭️ 继续阅读 [智能合约开发方案](./03-SMART-CONTRACTS.md)
