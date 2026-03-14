# AI Agent 增强方案 (LLM + Skills)

> **技术栈**: OpenAI GPT-4 / Claude / Gemini + Function Calling | **版本**: v2.0

---

## 📋 目录

1. [架构设计](#架构设计)
2. [Skill 系统设计](#skill-系统设计)
3. [LLM 决策引擎](#llm-决策引擎)
4. [实现代码](#实现代码)
5. [提示词工程](#提示词工程)
6. [成本优化](#成本优化)

---

## 架构设计

### 传统 Agent vs AI Agent

| 特性 | 传统 Agent (v1.0) | AI Agent (v2.0) |
|------|------------------|-----------------|
| **决策方式** | 硬编码规则 | LLM 智能推理 |
| **适应性** | 固定策略 | 动态学习 |
| **复杂度** | 简单 if-else | 自然语言理解 |
| **扩展性** | 需要修改代码 | 添加 Skill 即可 |
| **成本** | 低 | 中等（API 调用） |

### AI Agent 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户启动 Agent                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              AI 决策引擎 (LLM Core)                      │
│  - 分析当前农场状态                                       │
│  - 理解用户策略偏好                                       │
│  - 生成执行计划                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Skill Registry (技能库)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Farming  │ │ Trading  │ │ Social   │ │ Strategy │   │
│  │ Skills   │ │ Skills   │ │ Skills   │ │ Skills   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Function Calling (执行层)                      │
│  - plantCrop()                                           │
│  - harvestCrop()                                         │
│  - visitFriend()                                         │
│  - analyzePrices()                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              游戏 API / 数据库                           │
└─────────────────────────────────────────────────────────┘
```

---

## Skill 系统设计

### Skill 定义结构

每个 Skill 是一个**可被 LLM 调用的函数**，包含：

```typescript
interface AgentSkill {
  name: string;              // 技能名称
  description: string;       // 功能描述（给 LLM 看）
  category: 'farming' | 'trading' | 'social' | 'strategy';
  parameters: {              // 参数定义（JSON Schema）
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any, context: AgentContext) => Promise<SkillResult>;
  cooldown?: number;         // 冷却时间（秒）
  energyCost?: number;       // 能量消耗
}
```

### 核心 Skill 库

#### 1. Farming Skills (农场技能)

```typescript
const farmingSkills: AgentSkill[] = [
  {
    name: 'plant_crop',
    description: 'Plant a crop on an empty land plot. Choose crop based on growth time and profit.',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        plotId: { type: 'string', description: 'Land plot ID' },
        cropId: { 
          type: 'string', 
          enum: ['Apple', 'Wheat', 'Corn', 'Tomato'],
          description: 'Crop type to plant'
        },
      },
      required: ['plotId', 'cropId'],
    },
    energyCost: 10,
    execute: async (params, context) => {
      const result = await plantCrop(context.userId, params.plotId, params.cropId);
      return {
        success: true,
        message: `Planted ${params.cropId} on plot ${params.plotId}`,
        data: result,
      };
    },
  },
  
  {
    name: 'harvest_crop',
    description: 'Harvest a mature crop from a land plot. Only works if crop is ready.',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        plotId: { type: 'string', description: 'Land plot ID with mature crop' },
      },
      required: ['plotId'],
    },
    execute: async (params, context) => {
      const result = await harvestCrop(context.userId, params.plotId);
      return {
        success: true,
        message: `Harvested crop from plot ${params.plotId}, earned ${result.reward} coins`,
        data: result,
      };
    },
  },
  
  {
    name: 'analyze_farm_state',
    description: 'Get current farm state including energy, plots, and inventory.',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (params, context) => {
      const farmState = await getFarmState(context.userId);
      return {
        success: true,
        message: 'Farm state retrieved',
        data: {
          energy: farmState.energy,
          maxEnergy: farmState.maxEnergy,
          emptyPlots: farmState.landPlots.filter(p => !p.cropId).length,
          matureCrops: farmState.landPlots.filter(p => p.growthStage === 4).length,
          growingCrops: farmState.landPlots.filter(p => p.cropId && p.growthStage < 4).length,
        },
      };
    },
  },
];
```

#### 2. Trading Skills (交易技能)

```typescript
const tradingSkills: AgentSkill[] = [
  {
    name: 'check_market_prices',
    description: 'Check current market prices for all crops and items.',
    category: 'trading',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (params, context) => {
      const prices = await getMarketPrices();
      return {
        success: true,
        message: 'Market prices retrieved',
        data: prices,
      };
    },
  },
  
  {
    name: 'sell_item',
    description: 'Sell items from inventory at current market price.',
    category: 'trading',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Item ID to sell' },
        quantity: { type: 'number', description: 'Quantity to sell' },
      },
      required: ['itemId', 'quantity'],
    },
    execute: async (params, context) => {
      const result = await sellItem(context.userId, params.itemId, params.quantity);
      return {
        success: true,
        message: `Sold ${params.quantity}x ${params.itemId} for ${result.totalPrice} coins`,
        data: result,
      };
    },
  },
  
  {
    name: 'calculate_profit_margin',
    description: 'Calculate profit margin for a specific crop considering growth time and costs.',
    category: 'trading',
    parameters: {
      type: 'object',
      properties: {
        cropId: { type: 'string', description: 'Crop ID to analyze' },
      },
      required: ['cropId'],
    },
    execute: async (params, context) => {
      const cropConfig = await getCropConfig(params.cropId);
      const marketPrice = await getMarketPrice(params.cropId);
      
      const profitMargin = {
        cropId: params.cropId,
        cost: cropConfig.energyCost,
        baseReward: cropConfig.baseReward,
        marketPrice,
        growthTime: cropConfig.growTime,
        profitPerHour: (marketPrice - cropConfig.energyCost) / (cropConfig.growTime / 3600),
      };
      
      return {
        success: true,
        message: `Profit analysis for ${params.cropId}`,
        data: profitMargin,
      };
    },
  },
];
```

#### 3. Social Skills (社交技能)

```typescript
const socialSkills: AgentSkill[] = [
  {
    name: 'visit_friend',
    description: 'Visit a friend\'s farm to earn social rewards.',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {
        friendId: { type: 'string', description: 'Friend user ID' },
      },
      required: ['friendId'],
    },
    cooldown: 86400, // 24 hours
    execute: async (params, context) => {
      const result = await visitFriend(context.userId, params.friendId);
      return {
        success: true,
        message: `Visited friend ${params.friendId}, earned ${result.reward} coins`,
        data: result,
      };
    },
  },
  
  {
    name: 'water_friend_crop',
    description: 'Water a friend\'s crop to help them and earn rewards.',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {
        friendId: { type: 'string', description: 'Friend user ID' },
        plotId: { type: 'string', description: 'Plot ID to water' },
      },
      required: ['friendId', 'plotId'],
    },
    execute: async (params, context) => {
      const result = await waterFriendCrop(context.userId, params.friendId, params.plotId);
      return {
        success: true,
        message: `Watered friend's crop, earned ${result.reward} coins`,
        data: result,
      };
    },
  },
  
  {
    name: 'get_active_friends',
    description: 'Get list of friends who are currently active or have mature crops.',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (params, context) => {
      const friends = await getActiveFriends(context.userId);
      return {
        success: true,
        message: `Found ${friends.length} active friends`,
        data: friends,
      };
    },
  },
];
```

#### 4. Strategy Skills (策略技能)

```typescript
const strategySkills: AgentSkill[] = [
  {
    name: 'optimize_planting_schedule',
    description: 'Calculate optimal crop planting schedule based on energy and time.',
    category: 'strategy',
    parameters: {
      type: 'object',
      properties: {
        timeHorizon: { 
          type: 'number', 
          description: 'Planning horizon in hours',
          default: 24,
        },
      },
    },
    execute: async (params, context) => {
      const farmState = await getFarmState(context.userId);
      const cropConfigs = await getAllCropConfigs();
      
      // 简单贪心算法：优先种植利润/时间比最高的作物
      const schedule = cropConfigs
        .map(crop => ({
          cropId: crop.id,
          profitPerHour: crop.baseReward / (crop.growTime / 3600),
          energyCost: crop.energyCost,
        }))
        .sort((a, b) => b.profitPerHour - a.profitPerHour);
      
      return {
        success: true,
        message: 'Optimal planting schedule calculated',
        data: { schedule, recommendation: schedule[0].cropId },
      };
    },
  },
  
  {
    name: 'risk_assessment',
    description: 'Assess current risks and opportunities in the game.',
    category: 'strategy',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (params, context) => {
      const farmState = await getFarmState(context.userId);
      const user = await getUser(context.userId);
      
      const risks = [];
      const opportunities = [];
      
      // 能量不足风险
      if (farmState.energy < 50) {
        risks.push('Low energy - consider waiting for recovery');
      }
      
      // 金币不足风险
      if (user.farmCoins < 100) {
        risks.push('Low coins - focus on harvesting');
      }
      
      // 空地机会
      const emptyPlots = farmState.landPlots.filter(p => !p.cropId).length;
      if (emptyPlots > 0 && farmState.energy > 50) {
        opportunities.push(`${emptyPlots} empty plots available for planting`);
      }
      
      return {
        success: true,
        message: 'Risk assessment completed',
        data: { risks, opportunities },
      };
    },
  },
];
```

---

## LLM 决策引擎

### 核心实现

创建 `src/lib/ai-agent-engine.ts`:

```typescript
import OpenAI from 'openai';
import { prisma } from './prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 合并所有 Skills
const ALL_SKILLS = [
  ...farmingSkills,
  ...tradingSkills,
  ...socialSkills,
  ...strategySkills,
];

export async function runAIAgent(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { user: true },
  });

  if (!agent || agent.status !== 'running') {
    return;
  }

  try {
    // 1. 收集上下文信息
    const context = await gatherContext(agent);

    // 2. 构建系统提示词
    const systemPrompt = buildSystemPrompt(agent, context);

    // 3. 调用 LLM 决策
    const decisions = await makeLLMDecision(systemPrompt, context);

    // 4. 执行决策
    await executeDecisions(agent, decisions, context);

    // 5. 更新 Agent 状态
    await updateAgentStats(agent, decisions);

  } catch (error) {
    await logAgentError(agentId, error);
  }
}

// 收集上下文信息
async function gatherContext(agent: Agent) {
  const [farmState, inventory, friends, marketPrices] = await Promise.all([
    getFarmState(agent.userId),
    getInventory(agent.userId),
    getFriends(agent.userId),
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
    timestamp: new Date().toISOString(),
  };
}

// 构建系统提示词
function buildSystemPrompt(agent: Agent, context: any): string {
  return `You are an AI farming agent with the following characteristics:

**Personality**: ${agent.personality}
- aggressive: Take risks, maximize short-term profits
- conservative: Play safe, focus on steady growth
- balanced: Mix of both strategies

**Strategy Type**: ${agent.strategyType}
- farming: Focus on planting and harvesting
- trading: Focus on market analysis and trading
- social: Focus on friend interactions

**Current Situation**:
- Energy: ${context.farmState.energy}/${context.farmState.maxEnergy}
- Farm Coins: ${context.farmState.user.farmCoins}
- Empty Plots: ${context.farmState.landPlots.filter(p => !p.cropId).length}
- Mature Crops: ${context.farmState.landPlots.filter(p => p.growthStage === 4).length}
- Growing Crops: ${context.farmState.landPlots.filter(p => p.cropId && p.growthStage < 4).length}

**Available Skills**: You have access to the following skills (use them wisely):
${ALL_SKILLS.map(s => `- ${s.name}: ${s.description}`).join('\n')}

**Your Goal**: 
Maximize farm profits while following your personality and strategy. 
Analyze the current situation and decide which skills to use in what order.

**Important Rules**:
1. Always check energy before planting
2. Harvest mature crops first (highest priority)
3. Consider profit margins when choosing crops
4. Don't waste energy on low-value actions
5. Use social skills when available for extra rewards

Respond with a JSON array of skill calls in execution order.`;
}

// LLM 决策
async function makeLLMDecision(systemPrompt: string, context: any) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: 'Analyze the current situation and decide what actions to take. Return a JSON array of skill calls.' 
      },
    ],
    functions: ALL_SKILLS.map(skill => ({
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
    })),
    function_call: 'auto',
    temperature: 0.7,
  });

  const message = response.choices[0].message;

  // 处理 Function Calling
  if (message.function_call) {
    return [{
      skillName: message.function_call.name,
      parameters: JSON.parse(message.function_call.arguments),
    }];
  }

  // 处理 JSON 响应
  try {
    const content = message.content || '[]';
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// 执行决策
async function executeDecisions(
  agent: Agent,
  decisions: any[],
  context: AgentContext
) {
  for (const decision of decisions) {
    const skill = ALL_SKILLS.find(s => s.name === decision.skillName);
    
    if (!skill) {
      await logAgentWarning(agent.id, `Unknown skill: ${decision.skillName}`);
      continue;
    }

    try {
      // 检查冷却时间
      if (skill.cooldown) {
        const lastUse = await getLastSkillUse(agent.id, skill.name);
        if (lastUse && Date.now() - lastUse.getTime() < skill.cooldown * 1000) {
          await logAgentInfo(agent.id, `Skill ${skill.name} on cooldown`);
          continue;
        }
      }

      // 检查能量消耗
      if (skill.energyCost) {
        const currentEnergy = await getCurrentEnergy(agent.userId);
        if (currentEnergy < skill.energyCost) {
          await logAgentInfo(agent.id, `Not enough energy for ${skill.name}`);
          continue;
        }
      }

      // 执行技能
      const result = await skill.execute(decision.parameters, context);

      // 记录执行结果
      await prisma.agentTask.create({
        data: {
          agentId: agent.id,
          taskType: skill.name,
          taskData: decision.parameters,
          status: 'completed',
          result,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      await logAgentInfo(agent.id, `Executed ${skill.name}: ${result.message}`);

      // 更新技能使用时间
      if (skill.cooldown) {
        await recordSkillUse(agent.id, skill.name);
      }

    } catch (error: any) {
      await logAgentError(agent.id, `Skill ${skill.name} failed: ${error.message}`);
    }
  }
}
```

---

## 提示词工程

### 高级提示词模板

```typescript
function buildAdvancedPrompt(agent: Agent, context: any, history: any[]): string {
  return `You are "${agent.name}", an AI farming agent in AgentFarm X.

## Your Identity
- **Personality**: ${agent.personality}
- **Strategy**: ${agent.strategyType}
- **Total Profit**: ${agent.totalProfit} coins
- **Success Rate**: ${(agent.successRate * 100).toFixed(1)}%

## Current State Analysis
\`\`\`json
{
  "energy": ${context.farmState.energy}/${context.farmState.maxEnergy},
  "coins": ${context.farmState.user.farmCoins},
  "level": ${context.farmState.user.level},
  "plots": {
    "empty": ${context.farmState.landPlots.filter(p => !p.cropId).length},
    "growing": ${context.farmState.landPlots.filter(p => p.cropId && p.growthStage < 4).length},
    "mature": ${context.farmState.landPlots.filter(p => p.growthStage === 4).length}
  },
  "inventory": ${JSON.stringify(context.inventory.slice(0, 5))}
}
\`\`\`

## Recent Performance
${history.slice(-5).map(h => `- ${h.timestamp}: ${h.action} → ${h.result}`).join('\n')}

## Market Intelligence
${Object.entries(context.marketPrices).map(([crop, price]) => 
  `- ${crop}: ${price} coins (${calculateProfitMargin(crop, price)}% margin)`
).join('\n')}

## Decision Framework
1. **Immediate Actions** (Priority 1):
   - Harvest all mature crops (free money!)
   - Check for time-sensitive opportunities

2. **Resource Management** (Priority 2):
   - Maintain energy above 30% for emergencies
   - Keep coin reserve for unlock opportunities

3. **Growth Strategy** (Priority 3):
   - Plant high-margin crops on empty plots
   - Balance short-term vs long-term profits

4. **Social Optimization** (Priority 4):
   - Visit friends for daily rewards
   - Help friends when energy allows

## Available Skills
${ALL_SKILLS.map(s => `
### ${s.name}
- **Category**: ${s.category}
- **Description**: ${s.description}
- **Cost**: ${s.energyCost ? `${s.energyCost} energy` : 'Free'}
- **Cooldown**: ${s.cooldown ? `${s.cooldown}s` : 'None'}
`).join('\n')}

## Your Task
Analyze the situation and create an action plan. Consider:
1. What's the most profitable action right now?
2. What risks should I avoid?
3. How can I maximize long-term growth?

Return a JSON array of skill calls with reasoning:
\`\`\`json
[
  {
    "skillName": "harvest_crop",
    "parameters": { "plotId": "plot_1" },
    "reasoning": "Mature crop ready, immediate profit"
  },
  {
    "skillName": "plant_crop",
    "parameters": { "plotId": "plot_1", "cropId": "Apple" },
    "reasoning": "Apple has highest profit margin (45%)"
  }
]
\`\`\`

Think step by step and be strategic!`;
}
```

---

## 成本优化

### 1. 使用更便宜的模型

```typescript
// 根据任务复杂度选择模型
function selectModel(taskComplexity: 'simple' | 'medium' | 'complex') {
  switch (taskComplexity) {
    case 'simple':
      return 'gpt-3.5-turbo'; // $0.0005/1K tokens
    case 'medium':
      return 'gpt-4-turbo-preview'; // $0.01/1K tokens
    case 'complex':
      return 'gpt-4'; // $0.03/1K tokens
  }
}
```

### 2. 缓存决策

```typescript
// 缓存相似场景的决策
async function getCachedDecision(context: any) {
  const cacheKey = `agent_decision:${hashContext(context)}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const decision = await makeLLMDecision(context);
  await redis.setex(cacheKey, 3600, JSON.stringify(decision)); // 1小时缓存
  
  return decision;
}
```

### 3. 批量处理

```typescript
// 一次 LLM 调用生成多轮决策
async function generateMultiRoundPlan(agent: Agent, rounds: number = 5) {
  const prompt = `Generate a ${rounds}-round action plan for the next ${rounds * 5} minutes.`;
  
  const plan = await makeLLMDecision(prompt, context);
  
  // 存储计划，按时间执行
  await redis.set(`agent_plan:${agent.id}`, JSON.stringify(plan), { ex: 3600 });
}
```

### 4. 成本估算

| 模型 | 成本/1K tokens | 每次决策 tokens | 每次成本 | 每天成本 (100次) |
|------|---------------|----------------|---------|-----------------|
| GPT-3.5 Turbo | $0.0005 | ~500 | $0.00025 | $0.025 |
| GPT-4 Turbo | $0.01 | ~500 | $0.005 | $0.50 |
| Claude 3 Sonnet | $0.003 | ~500 | $0.0015 | $0.15 |

**推荐**: 使用 GPT-3.5 Turbo 或 Claude 3 Haiku 作为默认模型，复杂决策时切换到 GPT-4。

---

## 实战示例

### 完整 Agent 执行流程

```typescript
// 启动 AI Agent
async function startAIAgent(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  
  // 每 5 分钟执行一次决策
  const interval = setInterval(async () => {
    try {
      // 1. 收集上下文
      const context = await gatherContext(agent);
      
      // 2. LLM 决策
      const systemPrompt = buildAdvancedPrompt(agent, context, []);
      const decisions = await makeLLMDecision(systemPrompt, context);
      
      // 3. 执行决策
      for (const decision of decisions) {
        const skill = ALL_SKILLS.find(s => s.name === decision.skillName);
        if (skill) {
          const result = await skill.execute(decision.parameters, context);
          console.log(`[Agent ${agent.name}] ${decision.reasoning} → ${result.message}`);
        }
      }
      
      // 4. 更新心跳
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastActiveAt: new Date() },
      });
      
    } catch (error) {
      console.error(`[Agent ${agent.name}] Error:`, error);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  return interval;
}
```

---

## 总结

### AI Agent 优势

1. ✅ **智能决策** - 基于 LLM 推理，适应复杂场景
2. ✅ **自然语言** - 用户可以用自然语言配置策略
3. ✅ **可扩展** - 添加新 Skill 无需修改核心代码
4. ✅ **可解释** - LLM 提供决策理由
5. ✅ **持续学习** - 可以基于历史数据优化

### 实施建议

1. **MVP 阶段**: 先实现 5-10 个核心 Skill
2. **模型选择**: 使用 GPT-3.5 Turbo 降低成本
3. **缓存策略**: 缓存相似场景决策
4. **监控成本**: 设置 API 调用上限
5. **用户控制**: 允许用户自定义 Agent 行为

### 下一步

- 实现 Skill Registry 系统
- 集成 OpenAI Function Calling
- 添加 Agent 性能分析面板
- 支持用户自定义 Skill

这个 AI Agent 系统将让你的游戏更加智能和有趣！🚀
