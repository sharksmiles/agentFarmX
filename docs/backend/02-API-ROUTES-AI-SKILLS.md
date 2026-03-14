# AI Agent Skills API 模块

> **技术栈**: Next.js 14 + OpenAI/Claude + Function Calling | **版本**: v2.0

---

## 📋 目录

1. [Skills 管理 API](#skills-管理-api)
2. [AI 决策 API](#ai-决策-api)
3. [决策历史 API](#决策历史-api)
4. [Skill 使用统计 API](#skill-使用统计-api)

---

## Skills 管理 API

### 1. 获取所有可用 Skills

创建 `src/app/api/agents/skills/route.ts`:

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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const skills = await prisma.agentSkill.findMany({
      where: {
        ...(category && { category }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        parameters: true,
        energyCost: true,
        cooldown: true,
        requiredLevel: true,
        isActive: true,
        totalUsages: true,
        successCount: true,
      },
    });

    // 计算成功率
    const skillsWithStats = skills.map(skill => ({
      ...skill,
      successRate: skill.totalUsages > 0 
        ? (skill.successCount / skill.totalUsages) * 100 
        : 0,
    }));

    return NextResponse.json({
      skills: skillsWithStats,
      total: skills.length,
    });
  } catch (error) {
    console.error('Get skills error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 创建自定义 Skill (管理员功能)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, displayName, description, category, parameters, energyCost, cooldown } = await request.json();

    const skill = await prisma.agentSkill.create({
      data: {
        name,
        displayName,
        description,
        category,
        parameters,
        energyCost: energyCost || 0,
        cooldown: cooldown || 0,
        isSystem: false, // 用户自定义
      },
    });

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Create skill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. 获取 Skill 详情

创建 `src/app/api/agents/skills/[skillId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  try {
    const { skillId } = params;

    const skill = await prisma.agentSkill.findUnique({
      where: { id: skillId },
      include: {
        usages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            agentId: true,
            parameters: true,
            success: true,
            executionTime: true,
            createdAt: true,
          },
        },
      },
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Get skill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Skill 使用统计

创建 `src/app/api/agents/skills/usage/route.ts`:

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

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 统计每个 Skill 的使用情况
    const usageStats = await prisma.agentSkillUsage.groupBy({
      by: ['skillId'],
      where: {
        ...(agentId && { agentId }),
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      _sum: {
        executionTime: true,
      },
      _avg: {
        executionTime: true,
      },
    });

    // 获取 Skill 详情
    const skillIds = usageStats.map(s => s.skillId);
    const skills = await prisma.agentSkill.findMany({
      where: { id: { in: skillIds } },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
      },
    });

    const skillMap = new Map(skills.map(s => [s.id, s]));

    const stats = usageStats.map(stat => ({
      skill: skillMap.get(stat.skillId),
      totalUsages: stat._count.id,
      totalExecutionTime: stat._sum.executionTime || 0,
      avgExecutionTime: stat._avg.executionTime || 0,
    }));

    return NextResponse.json({
      stats,
      period: { days, startDate },
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## AI 决策 API

### 1. 触发 AI 决策

创建 `src/app/api/agents/[agentId]/decide/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { makeAIDecision } from '@/lib/ai-agent-engine';

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
      include: { user: true },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 收集上下文
    const context = await gatherAgentContext(agent);

    // 调用 LLM 决策
    const startTime = Date.now();
    const decision = await makeAIDecision(agent, context);
    const latency = Date.now() - startTime;

    // 保存决策记录
    const decisionRecord = await prisma.agentDecision.create({
      data: {
        agentId: agent.id,
        model: agent.aiModel,
        prompt: decision.prompt,
        response: decision.response,
        decisions: decision.decisions,
        reasoning: decision.reasoning,
        tokensUsed: decision.tokensUsed,
        cost: decision.cost,
        latency,
      },
    });

    return NextResponse.json({
      decisionId: decisionRecord.id,
      decisions: decision.decisions,
      reasoning: decision.reasoning,
      cost: decision.cost,
      latency,
    });
  } catch (error: any) {
    console.error('AI decision error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 辅助函数：收集 Agent 上下文
async function gatherAgentContext(agent: any) {
  const [farmState, inventory, friends, marketPrices] = await Promise.all([
    prisma.farmState.findUnique({
      where: { userId: agent.userId },
      include: { landPlots: true },
    }),
    prisma.inventory.findMany({
      where: { userId: agent.userId },
    }),
    prisma.user.findMany({
      where: {
        id: { not: agent.userId },
      },
      take: 10,
    }),
    getMarketPrices(),
  ]);

  return {
    userId: agent.userId,
    agentId: agent.id,
    personality: agent.personality,
    strategyType: agent.strategyType,
    farmState,
    inventory,
    friends,
    marketPrices,
  };
}

async function getMarketPrices() {
  // 模拟市场价格，实际应从数据库或外部 API 获取
  return {
    Apple: 50,
    Wheat: 30,
    Corn: 40,
    Tomato: 35,
  };
}
```

### 2. 执行 AI 决策

创建 `src/app/api/agents/[agentId]/execute-decision/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { executeSkill } from '@/lib/skill-executor';

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
    const { decisionId } = await request.json();

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const decision = await prisma.agentDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision || decision.agentId !== agentId) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.executed) {
      return NextResponse.json({ error: 'Decision already executed' }, { status: 400 });
    }

    // 执行决策中的所有 Skills
    const results = [];
    const decisions = decision.decisions as any[];

    for (const skillDecision of decisions) {
      try {
        const result = await executeSkill(
          agent,
          skillDecision.skillName,
          skillDecision.parameters
        );

        results.push({
          skillName: skillDecision.skillName,
          success: true,
          result,
        });

        // 记录 Skill 使用
        await recordSkillUsage(agent.id, skillDecision, result);

      } catch (error: any) {
        results.push({
          skillName: skillDecision.skillName,
          success: false,
          error: error.message,
        });
      }
    }

    // 更新决策状态
    const allSuccess = results.every(r => r.success);
    await prisma.agentDecision.update({
      where: { id: decisionId },
      data: {
        executed: true,
        success: allSuccess,
      },
    });

    return NextResponse.json({
      success: allSuccess,
      results,
    });
  } catch (error) {
    console.error('Execute decision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function recordSkillUsage(agentId: string, skillDecision: any, result: any) {
  const skill = await prisma.agentSkill.findUnique({
    where: { name: skillDecision.skillName },
  });

  if (!skill) return;

  await prisma.agentSkillUsage.create({
    data: {
      agentId,
      skillId: skill.id,
      parameters: skillDecision.parameters,
      result,
      success: true,
      executionTime: result.executionTime || 0,
    },
  });

  // 更新 Skill 统计
  await prisma.agentSkill.update({
    where: { id: skill.id },
    data: {
      totalUsages: { increment: 1 },
      successCount: { increment: 1 },
    },
  });
}
```

---

## 决策历史 API

### 获取 Agent 决策历史

创建 `src/app/api/agents/[agentId]/decisions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const [decisions, total] = await Promise.all([
      prisma.agentDecision.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          model: true,
          decisions: true,
          reasoning: true,
          tokensUsed: true,
          cost: true,
          latency: true,
          executed: true,
          success: true,
          createdAt: true,
        },
      }),
      prisma.agentDecision.count({
        where: { agentId },
      }),
    ]);

    // 计算统计数据
    const stats = await prisma.agentDecision.aggregate({
      where: { agentId },
      _sum: {
        tokensUsed: true,
        cost: true,
      },
      _avg: {
        latency: true,
      },
    });

    return NextResponse.json({
      decisions,
      total,
      stats: {
        totalTokens: stats._sum.tokensUsed || 0,
        totalCost: stats._sum.cost || 0,
        avgLatency: stats._avg.latency || 0,
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 获取 Agent 可用 Skills

创建 `src/app/api/agents/[agentId]/skills/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
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
      include: { user: true },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 获取所有激活的 Skills
    const allSkills = await prisma.agentSkill.findMany({
      where: { isActive: true },
    });

    // 根据 Agent 等级和策略类型过滤
    const availableSkills = allSkills.filter(skill => {
      // 检查等级要求
      if (skill.requiredLevel > agent.user.level) {
        return false;
      }

      // 根据策略类型优先推荐相关 Skills
      if (agent.strategyType === skill.category) {
        return true;
      }

      // 通用 Skills 总是可用
      if (skill.category === 'strategy') {
        return true;
      }

      return true;
    });

    // 获取每个 Skill 的使用统计
    const skillIds = availableSkills.map(s => s.id);
    const usageStats = await prisma.agentSkillUsage.groupBy({
      by: ['skillId'],
      where: {
        agentId,
        skillId: { in: skillIds },
      },
      _count: {
        id: true,
      },
    });

    const usageMap = new Map(usageStats.map(s => [s.skillId, s._count.id]));

    const skillsWithUsage = availableSkills.map(skill => ({
      ...skill,
      usageCount: usageMap.get(skill.id) || 0,
      recommended: skill.category === agent.strategyType,
    }));

    return NextResponse.json({
      skills: skillsWithUsage,
      total: skillsWithUsage.length,
    });
  } catch (error) {
    console.error('Get agent skills error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Skill 执行器

创建 `src/lib/skill-executor.ts`:

```typescript
import { prisma } from './prisma';
import { ALL_SKILLS } from './agent-skills';

export async function executeSkill(
  agent: any,
  skillName: string,
  parameters: any
) {
  const skill = ALL_SKILLS.find(s => s.name === skillName);

  if (!skill) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  // 检查能量消耗
  if (skill.energyCost > 0) {
    const farmState = await prisma.farmState.findUnique({
      where: { userId: agent.userId },
    });

    if (!farmState || farmState.energy < skill.energyCost) {
      throw new Error('Not enough energy');
    }
  }

  // 检查冷却时间
  if (skill.cooldown > 0) {
    const lastUsage = await prisma.agentSkillUsage.findFirst({
      where: {
        agentId: agent.id,
        skill: { name: skillName },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastUsage) {
      const timeSinceLastUse = Date.now() - lastUsage.createdAt.getTime();
      if (timeSinceLastUse < skill.cooldown * 1000) {
        throw new Error(`Skill on cooldown. Wait ${Math.ceil((skill.cooldown * 1000 - timeSinceLastUse) / 1000)}s`);
      }
    }
  }

  // 执行 Skill
  const startTime = Date.now();
  const context = {
    userId: agent.userId,
    agentId: agent.id,
  };

  const result = await skill.execute(parameters, context);
  const executionTime = Date.now() - startTime;

  return {
    ...result,
    executionTime,
  };
}
```

---

## 下一步

- ✅ AI Agent Skills API 已定义
- ⏭️ 参考 [06-AI-AGENT-ENHANCED.md](./06-AI-AGENT-ENHANCED.md) 了解完整 AI Agent 架构
- 📚 查看 [01-DATABASE-SCHEMA.md](./01-DATABASE-SCHEMA.md) 了解数据库表结构
