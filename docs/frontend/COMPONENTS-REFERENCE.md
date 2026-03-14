# AI Agent 组件参考文档

> **版本**: v1.0 | **更新时间**: 2026-03-14

---

## 📋 目录

1. [组件概览](#组件概览)
2. [自定义 Hooks](#自定义-hooks)
3. [核心组件](#核心组件)
4. [使用示例](#使用示例)

---

## 组件概览

### 组件层级结构

```
src/
├── hooks/
│   ├── useAgent.ts                    # Agent 数据和操作
│   ├── useAgentSkills.ts              # Skills 管理
│   └── useAgentDecisions.ts           # 决策历史
│
├── components/agents/
│   ├── AgentStatusCard.tsx            # 状态卡片
│   ├── QuickActionsPanel.tsx          # 快速操作面板
│   ├── DecisionDetailModal.tsx        # 决策详情弹窗
│   └── CostMonitoringPanel.tsx        # 成本监控面板
│
└── app/agents/[id]/
    ├── layout.tsx                     # Tab 导航布局
    ├── page.tsx                       # 重定向到 dashboard
    ├── dashboard/page.tsx             # Dashboard 页面
    ├── skills/page.tsx                # Skills 管理
    ├── decisions/page.tsx             # 决策历史
    ├── performance/page.tsx           # 性能分析
    └── settings/page.tsx              # 设置
```

---

## 自定义 Hooks

### useAgent

**文件**: `src/hooks/useAgent.ts`

**用途**: 管理 Agent 数据获取和操作

**API**:
```typescript
const {
  agent,           // Agent 数据对象
  isLoading,       // 加载状态
  error,           // 错误信息
  startAgent,      // 启动 Agent
  stopAgent,       // 停止 Agent
  triggerDecision, // 触发 AI 决策
  refetch,         // 重新获取数据
} = useAgent(agentId);
```

**示例**:
```typescript
import { useAgent } from "@/hooks/useAgent";

function MyComponent() {
  const { agent, startAgent, stopAgent } = useAgent("agent_123");
  
  return (
    <button onClick={agent.status === "running" ? stopAgent : startAgent}>
      {agent.status === "running" ? "停止" : "启动"}
    </button>
  );
}
```

---

### useAgentSkills

**文件**: `src/hooks/useAgentSkills.ts`

**用途**: 获取和管理 Agent Skills

**API**:
```typescript
const {
  skills,    // Skills 列表
  isLoading, // 加载状态
  error,     // 错误信息
  refetch,   // 重新获取
} = useAgentSkills(agentId, category?);
```

**示例**:
```typescript
import { useAgentSkills } from "@/hooks/useAgentSkills";

function SkillsList() {
  const { skills } = useAgentSkills("agent_123", "farming");
  
  return (
    <div>
      {skills.map(skill => (
        <div key={skill.id}>{skill.displayName}</div>
      ))}
    </div>
  );
}
```

---

### useAgentDecisions

**文件**: `src/hooks/useAgentDecisions.ts`

**用途**: 获取 Agent 决策历史

**API**:
```typescript
const {
  decisions, // 决策列表
  total,     // 总数
  stats,     // 统计数据
  isLoading,
  error,
  refetch,
} = useAgentDecisions(agentId, { limit, offset });
```

**示例**:
```typescript
import { useAgentDecisions } from "@/hooks/useAgentDecisions";

function DecisionsList() {
  const { decisions, stats } = useAgentDecisions("agent_123", { limit: 10 });
  
  return (
    <div>
      <p>总成本: ${stats.totalCost}</p>
      {decisions.map(d => <div key={d.id}>{d.reasoning}</div>)}
    </div>
  );
}
```

---

## 核心组件

### AgentStatusCard

**文件**: `src/components/agents/AgentStatusCard.tsx`

**用途**: 显示 Agent 状态和关键指标

**Props**:
```typescript
interface AgentStatusCardProps {
  agent: {
    id: string;
    name: string;
    type: string;
    status: "running" | "idle" | "paused" | "error" | "out_of_funds";
    personality?: string;
    strategyType?: string;
    aiModel?: string;
    totalProfit: number;
    totalTasks: number;
    successRate: number;
  };
  onStart?: () => void;
  onStop?: () => void;
}
```

**特点**:
- 渐变背景设计（紫色 → 靛蓝）
- 状态徽章（运行中/空闲/暂停/错误）
- 关键指标展示（总收益、成功率、执行任务）
- 快速操作按钮（启动/暂停、设置）

**示例**:
```typescript
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";

<AgentStatusCard
  agent={agent}
  onStart={() => console.log("启动")}
  onStop={() => console.log("停止")}
/>
```

---

### QuickActionsPanel

**文件**: `src/components/agents/QuickActionsPanel.tsx`

**用途**: 提供快速操作入口

**Props**:
```typescript
interface QuickActionsPanelProps {
  agentId: string;
  onTriggerDecision?: () => Promise<any>;
  onRefresh?: () => void;
}
```

**功能**:
- 触发 AI 决策
- 刷新状态
- 查看性能报告
- 错误处理和提示

**示例**:
```typescript
import { QuickActionsPanel } from "@/components/agents/QuickActionsPanel";

<QuickActionsPanel
  agentId="agent_123"
  onTriggerDecision={async () => {
    const result = await fetch(`/api/agents/${agentId}/decide`, { method: 'POST' });
    return result.json();
  }}
  onRefresh={() => window.location.reload()}
/>
```

---

### DecisionDetailModal

**文件**: `src/components/agents/DecisionDetailModal.tsx`

**用途**: 显示 AI 决策详细信息

**Props**:
```typescript
interface DecisionDetailModalProps {
  decision: {
    id: string;
    model: string;
    response: string;
    decisions: Array<{
      skillName: string;
      parameters: any;
      reasoning?: string;
    }>;
    reasoning?: string;
    tokensUsed: number;
    cost: number;
    latency: number;
    executed: boolean;
    success: boolean;
  } | null;
  open: boolean;
  onClose: () => void;
}
```

**特点**:
- 基本信息展示（ID、模型、Token、成本、延迟）
- 决策理由说明
- Skills 执行序列（步骤化展示）
- LLM 原始响应（可折叠）

**示例**:
```typescript
import { DecisionDetailModal } from "@/components/agents/DecisionDetailModal";

const [selectedDecision, setSelectedDecision] = useState(null);

<DecisionDetailModal
  decision={selectedDecision}
  open={!!selectedDecision}
  onClose={() => setSelectedDecision(null)}
/>
```

---

### CostMonitoringPanel

**文件**: `src/components/agents/CostMonitoringPanel.tsx`

**用途**: 监控 AI 决策成本

**Props**:
```typescript
interface CostMonitoringPanelProps {
  agentId: string;
}
```

**功能**:
- 今日/本周成本统计
- Token 使用进度条
- 预算超支警告
- 成本趋势图（占位）

**示例**:
```typescript
import { CostMonitoringPanel } from "@/components/agents/CostMonitoringPanel";

<CostMonitoringPanel agentId="agent_123" />
```

---

## 使用示例

### 完整 Dashboard 页面

```typescript
"use client";

import { useParams } from "next/navigation";
import { useAgent } from "@/hooks/useAgent";
import { useAgentDecisions } from "@/hooks/useAgentDecisions";
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";
import { QuickActionsPanel } from "@/components/agents/QuickActionsPanel";
import { CostMonitoringPanel } from "@/components/agents/CostMonitoringPanel";
import { DecisionDetailModal } from "@/components/agents/DecisionDetailModal";
import { useState } from "react";

export default function DashboardPage() {
  const params = useParams();
  const agentId = params.id as string;

  const { agent, startAgent, stopAgent, triggerDecision, refetch } = useAgent(agentId);
  const { decisions } = useAgentDecisions(agentId, { limit: 5 });
  const [selectedDecision, setSelectedDecision] = useState(null);

  if (!agent) return <div>加载中...</div>;

  return (
    <div className="p-4 space-y-4">
      {/* 状态卡片 */}
      <AgentStatusCard
        agent={agent}
        onStart={startAgent}
        onStop={stopAgent}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧 */}
        <div className="space-y-4">
          <QuickActionsPanel
            agentId={agentId}
            onTriggerDecision={triggerDecision}
            onRefresh={refetch}
          />
          <CostMonitoringPanel agentId={agentId} />
        </div>

        {/* 右侧：决策列表 */}
        <div className="lg:col-span-2">
          {/* 决策列表组件 */}
        </div>
      </div>

      {/* 决策详情弹窗 */}
      <DecisionDetailModal
        decision={selectedDecision}
        open={!!selectedDecision}
        onClose={() => setSelectedDecision(null)}
      />
    </div>
  );
}
```

---

## API 端点要求

所有组件依赖以下 API 端点：

```
GET  /api/agents/{id}              # Agent 详情
POST /api/agents/{id}/start        # 启动 Agent
POST /api/agents/{id}/stop         # 停止 Agent
POST /api/agents/{id}/decide       # 触发 AI 决策
GET  /api/agents/{id}/skills       # 获取 Skills
GET  /api/agents/{id}/decisions    # 获取决策历史
GET  /api/agents/{id}/costs        # 获取成本统计
GET  /api/agents/{id}/settings     # 获取设置
PATCH /api/agents/{id}/settings    # 更新设置
```

参考后端文档：
- `docs/backend/02-API-ROUTES-AI-SKILLS.md`
- `docs/backend/06-AI-AGENT-ENHANCED.md`

---

## 样式规范

### 颜色系统

```css
/* 主色调 */
--primary: #5964F5        /* 紫色 */
--background: #1A1F25     /* 深色背景 */
--card: #252A31           /* 卡片背景 */
--border: #353B45         /* 边框 */

/* 状态颜色 */
--success: #10B981        /* 绿色 */
--warning: #F59E0B        /* 黄色 */
--error: #EF4444          /* 红色 */
--info: #3B82F6           /* 蓝色 */
```

### 组件尺寸

- **卡片圆角**: `rounded-2xl` (16px)
- **按钮圆角**: `rounded-xl` (12px)
- **间距**: `gap-4` (16px) 或 `gap-3` (12px)
- **内边距**: `p-4` (16px) 或 `p-6` (24px)

---

## 最佳实践

### 1. 错误处理

```typescript
const { agent, error } = useAgent(agentId);

if (error) {
  return <div className="text-red-400">{error}</div>;
}
```

### 2. 加载状态

```typescript
const { isLoading } = useAgent(agentId);

if (isLoading) {
  return <div className="animate-pulse">加载中...</div>;
}
```

### 3. 响应式设计

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 移动端 1 列，平板 2 列，桌面 3 列 */}
</div>
```

---

**最后更新**: 2026-03-14 23:10
