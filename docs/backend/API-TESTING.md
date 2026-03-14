# API 测试指南

> **版本**: v1.0 | **更新时间**: 2026-03-14

---

## 📋 目录

1. [环境准备](#环境准备)
2. [健康检查](#健康检查)
3. [用户管理](#用户管理)
4. [农场管理](#农场管理)
5. [Agent 管理](#agent-管理)
6. [Skills 管理](#skills-管理)
7. [AI 决策](#ai-决策)
8. [成本监控](#成本监控)

---

## 环境准备

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 设置环境变量

确保 `.env.local` 包含：
```env
POSTGRES_URL="..."
OPENAI_API_KEY="sk-..."
```

### 3. 初始化数据库

```bash
npm run db:push
npm run db:seed
```

---

## 健康检查

### GET /api/health

检查 API 和数据库状态

```bash
curl http://localhost:3000/api/health
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-14T15:20:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 用户管理

### GET /api/users

获取用户信息

```bash
curl "http://localhost:3000/api/users?walletAddress=0x1234567890123456789012345678901234567890"
```

**响应**:
```json
{
  "user": {
    "id": "user_123",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "username": null,
    "level": 1,
    "farmCoins": 1000,
    "farmState": { ... },
    "inventory": [],
    "agents": []
  }
}
```

### POST /api/users

创建新用户

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "username": "Alice"
  }'
```

**响应**: `201 Created`
```json
{
  "user": {
    "id": "user_123",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "username": "Alice",
    "farmState": {
      "energy": 100,
      "landPlots": [ ... ]
    }
  }
}
```

---

## 农场管理

### POST /api/farm/plant

种植作物

```bash
curl -X POST http://localhost:3000/api/farm/plant \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 0,
    "cropId": "Apple"
  }'
```

**响应**:
```json
{
  "plot": {
    "id": "plot_123",
    "plotIndex": 0,
    "cropId": "Apple",
    "plantedAt": "2026-03-14T15:20:00.000Z",
    "harvestAt": "2026-03-14T15:21:00.000Z",
    "growthStage": 1
  },
  "farmState": {
    "energy": 90,
    "totalPlants": 1
  }
}
```

### POST /api/farm/harvest

收获作物

```bash
curl -X POST http://localhost:3000/api/farm/harvest \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 0
  }'
```

**响应**:
```json
{
  "plot": { ... },
  "user": {
    "farmCoins": 1050,
    "experience": 10
  },
  "reward": 50,
  "inventory": {
    "itemId": "Apple",
    "quantity": 1
  }
}
```

---

## Agent 管理

### GET /api/agents

获取用户的所有 Agent

```bash
curl "http://localhost:3000/api/agents?userId=user_123"
```

**响应**:
```json
{
  "agents": [
    {
      "id": "agent_123",
      "name": "My First Agent",
      "status": "idle",
      "personality": "balanced",
      "strategyType": "farming",
      "totalProfit": 0,
      "totalTasks": 0
    }
  ]
}
```

### POST /api/agents

创建新 Agent

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "scaAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
    "name": "Farmer Bot",
    "personality": "balanced",
    "strategyType": "farming",
    "aiModel": "gpt-3.5-turbo"
  }'
```

**响应**: `201 Created`
```json
{
  "agent": {
    "id": "agent_123",
    "name": "Farmer Bot",
    "status": "idle",
    "aiModel": "gpt-3.5-turbo",
    "temperature": 0.7
  }
}
```

### GET /api/agents/[id]

获取 Agent 详情

```bash
curl http://localhost:3000/api/agents/agent_123
```

### POST /api/agents/[id]/start

启动 Agent

```bash
curl -X POST http://localhost:3000/api/agents/agent_123/start
```

**响应**:
```json
{
  "agent": {
    "id": "agent_123",
    "status": "running",
    "isActive": true,
    "lastActiveAt": "2026-03-14T15:20:00.000Z"
  }
}
```

### POST /api/agents/[id]/stop

停止 Agent

```bash
curl -X POST http://localhost:3000/api/agents/agent_123/stop
```

---

## Skills 管理

### GET /api/agents/skills

获取所有可用 Skills

```bash
curl http://localhost:3000/api/agents/skills
```

**响应**:
```json
{
  "skills": [
    {
      "id": "skill_123",
      "name": "plant_crop",
      "displayName": "种植作物",
      "category": "farming",
      "energyCost": 10,
      "totalUsages": 0
    }
  ]
}
```

### GET /api/agents/skills?category=farming

按分类过滤

```bash
curl "http://localhost:3000/api/agents/skills?category=farming"
```

### GET /api/agents/[id]/skills

获取 Agent 的 Skill 使用历史

```bash
curl "http://localhost:3000/api/agents/agent_123/skills?limit=20"
```

**响应**:
```json
{
  "usages": [
    {
      "id": "usage_123",
      "skillId": "skill_123",
      "skill": {
        "name": "plant_crop",
        "displayName": "种植作物"
      },
      "parameters": { "plotIndex": 0, "cropId": "Apple" },
      "success": true,
      "executionTime": 150
    }
  ],
  "total": 1,
  "stats": {
    "totalUsages": 1,
    "successCount": 1,
    "failureCount": 0,
    "avgExecutionTime": 150
  }
}
```

---

## AI 决策

### POST /api/agents/[id]/decide

触发 AI 决策

```bash
curl -X POST http://localhost:3000/api/agents/agent_123/decide \
  -H "Content-Type: application/json"
```

**响应**:
```json
{
  "decision": {
    "id": "decision_123",
    "model": "gpt-3.5-turbo",
    "decisions": [
      {
        "skillName": "plant_crop",
        "parameters": { "plotIndex": 0, "cropId": "Apple" }
      },
      {
        "skillName": "harvest_crop",
        "parameters": { "plotIndex": 1 }
      }
    ],
    "reasoning": "Plant Apple on empty plot, harvest mature crop on plot 1",
    "tokensUsed": 350,
    "cost": 0.000525,
    "latency": 1200,
    "executed": false
  }
}
```

### GET /api/agents/[id]/decisions

获取决策历史

```bash
curl "http://localhost:3000/api/agents/agent_123/decisions?limit=10"
```

**响应**:
```json
{
  "decisions": [ ... ],
  "total": 5,
  "stats": {
    "totalDecisions": 5,
    "executedCount": 3,
    "successCount": 2,
    "totalTokens": 1750,
    "totalCost": 0.002625,
    "avgLatency": 1150
  }
}
```

---

## 成本监控

### GET /api/agents/[id]/costs

获取成本统计

```bash
curl "http://localhost:3000/api/agents/agent_123/costs?days=7"
```

**响应**:
```json
{
  "stats": {
    "todayCost": 0.001575,
    "weekCost": 0.005250,
    "avgDailyCost": 0.000750,
    "todayTokens": 1050,
    "weekTokens": 3500
  },
  "trend": [
    {
      "date": "2026-03-14",
      "cost": 0.001575,
      "tokens": 1050,
      "count": 3
    }
  ]
}
```

---

## 设置管理

### GET /api/agents/[id]/settings

获取 Agent 设置

```bash
curl http://localhost:3000/api/agents/agent_123/settings
```

**响应**:
```json
{
  "aiModel": "gpt-3.5-turbo",
  "customPrompt": null,
  "temperature": 0.7,
  "personality": "balanced",
  "strategyType": "farming"
}
```

### PATCH /api/agents/[id]/settings

更新 Agent 设置

```bash
curl -X PATCH http://localhost:3000/api/agents/agent_123/settings \
  -H "Content-Type: application/json" \
  -d '{
    "aiModel": "gpt-4-turbo",
    "temperature": 0.5,
    "customPrompt": "Focus on maximizing profit"
  }'
```

---

## 测试流程

### 完整测试流程

```bash
# 1. 健康检查
curl http://localhost:3000/api/health

# 2. 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890"}'

# 3. 种植作物
curl -X POST http://localhost:3000/api/farm/plant \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","plotIndex":0,"cropId":"Apple"}'

# 4. 创建 Agent
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","scaAddress":"0xabc...","name":"Bot"}'

# 5. 启动 Agent
curl -X POST http://localhost:3000/api/agents/agent_123/start

# 6. 触发 AI 决策
curl -X POST http://localhost:3000/api/agents/agent_123/decide

# 7. 查看决策历史
curl http://localhost:3000/api/agents/agent_123/decisions

# 8. 查看成本统计
curl http://localhost:3000/api/agents/agent_123/costs?days=7
```

---

## 错误处理

### 常见错误

**400 Bad Request**
```json
{
  "error": "userId is required"
}
```

**404 Not Found**
```json
{
  "error": "Agent not found"
}
```

**409 Conflict**
```json
{
  "error": "User already exists"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

**最后更新**: 2026-03-14 23:30
