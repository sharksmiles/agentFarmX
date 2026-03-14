# AI Agent 前端 UI 设计方案

> **技术栈**: React + TailwindCSS + Lucide Icons | **版本**: v2.0 | **状态**: ✅ 已完成 (95%)

---

## 📋 目录

1. [实施状态](#实施状态) ⭐ NEW
2. [页面架构设计](#页面架构设计)
3. [Agent 控制面板](#agent-控制面板)
4. [Skills 管理界面](#skills-管理界面)
5. [决策可视化](#决策可视化)
6. [成本监控面板](#成本监控面板)
7. [组件库设计](#组件库设计)

---

## 实施状态

### ✅ 已完成 (95%)

**自定义 Hooks** (`src/hooks/`)
- ✅ `useAgent.ts` - Agent 数据和操作
- ✅ `useAgentSkills.ts` - Skills 管理
- ✅ `useAgentDecisions.ts` - 决策历史

**页面路由** (`src/app/agents/[id]/`)
- ✅ `layout.tsx` - Tab 导航布局
- ✅ `page.tsx` - 主页面重定向到 dashboard
- ✅ `dashboard/page.tsx` - Dashboard 页面 ⭐ NEW
- ✅ `skills/page.tsx` - Skills 管理页面
- ✅ `decisions/page.tsx` - 决策历史页面
- ✅ `performance/page.tsx` - 性能分析页面
- ✅ `settings/page.tsx` - 设置页面 ⭐ NEW

**核心组件** (`src/components/agents/`)
- ✅ `AgentStatusCard.tsx` - 增强版状态卡片 ⭐ NEW
- ✅ `QuickActionsPanel.tsx` - 快速操作面板 ⭐ NEW
- ✅ `DecisionDetailModal.tsx` - 决策详情弹窗 ⭐ NEW
- ✅ `CostMonitoringPanel.tsx` - 成本监控面板 ⭐ NEW

### ⏳ 待实施 (5%)

- ⏳ 图表库集成 (Recharts)
- ⏳ 实时日志流 (SSE)
- ⏳ 旧功能迁移 (Top-up, Emergency Stop)

**详细进度**: 查看 [IMPLEMENTATION-PROGRESS.md](./IMPLEMENTATION-PROGRESS.md)

**🎉 核心功能已全部完成！** 所有主要组件和页面已实现，可以开始 API 集成和测试。

---

## 页面架构设计

### 路由结构

```
/agents                          # Agent 列表页
/agents/create                   # 创建 Agent
/agents/[id]                     # Agent 详情页
  ├── /agents/[id]/dashboard     # 控制面板 (默认)
  ├── /agents/[id]/skills        # Skills 管理
  ├── /agents/[id]/decisions     # 决策历史
  ├── /agents/[id]/performance   # 性能分析
  └── /agents/[id]/settings      # 设置
```

### 页面层级关系

```
┌─────────────────────────────────────────────────────┐
│                   Agent 列表页                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Agent 1 │ │ Agent 2 │ │ Agent 3 │  [+ 创建]    │
│  └─────────┘ └─────────┘ └─────────┘              │
└──────────────────────┬──────────────────────────────┘
                       │ 点击进入
                       ▼
┌─────────────────────────────────────────────────────┐
│              Agent 详情页 (Tabs)                     │
│  ┌──────┬──────┬──────┬──────┬──────┐             │
│  │ 面板 │Skills│ 决策 │ 性能 │ 设置 │             │
│  └──────┴──────┴──────┴──────┴──────┘             │
│  ┌─────────────────────────────────────┐           │
│  │         Tab Content Area            │           │
│  │                                     │           │
│  └─────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

---

## Agent 控制面板

### 页面布局

创建 `src/app/agents/[id]/dashboard/page.tsx`:

```typescript
import { AgentStatusCard } from '@/components/agents/AgentStatusCard';
import { QuickActionsPanel } from '@/components/agents/QuickActionsPanel';
import { RecentDecisions } from '@/components/agents/RecentDecisions';
import { PerformanceMetrics } from '@/components/agents/PerformanceMetrics';
import { ActivityTimeline } from '@/components/agents/ActivityTimeline';

export default function AgentDashboard({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 顶部状态卡片 */}
      <AgentStatusCard agentId={params.id} />

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：快速操作 + 性能指标 */}
        <div className="lg:col-span-1 space-y-6">
          <QuickActionsPanel agentId={params.id} />
          <PerformanceMetrics agentId={params.id} />
        </div>

        {/* 右侧：最近决策 + 活动时间线 */}
        <div className="lg:col-span-2 space-y-6">
          <RecentDecisions agentId={params.id} />
          <ActivityTimeline agentId={params.id} />
        </div>
      </div>
    </div>
  );
}
```

### 1. Agent 状态卡片

创建 `src/components/agents/AgentStatusCard.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Settings, Zap, Brain, TrendingUp } from 'lucide-react';
import { useAgent } from '@/hooks/useAgent';

export function AgentStatusCard({ agentId }: { agentId: string }) {
  const { agent, isLoading, startAgent, stopAgent } = useAgent(agentId);

  if (isLoading) return <CardSkeleton />;

  return (
    <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* 左侧：Agent 信息 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{agent.name}</h2>
                <p className="text-white/80 text-sm">
                  {agent.personality} · {agent.strategyType}
                </p>
              </div>
            </div>

            {/* 状态徽章 */}
            <div className="flex items-center gap-2">
              <StatusBadge status={agent.status} />
              <Badge variant="outline" className="bg-white/10 border-white/30">
                {agent.aiModel}
              </Badge>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <MetricItem
                icon={<TrendingUp className="w-4 h-4" />}
                label="总收益"
                value={`${agent.totalProfit} 币`}
              />
              <MetricItem
                icon={<Zap className="w-4 h-4" />}
                label="成功率"
                value={`${(agent.successRate * 100).toFixed(1)}%`}
              />
              <MetricItem
                icon={<Brain className="w-4 h-4" />}
                label="执行任务"
                value={agent.totalTasks}
              />
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex flex-col gap-2">
            {agent.status === 'running' ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => stopAgent()}
                className="bg-white/20 hover:bg-white/30"
              >
                <Pause className="w-4 h-4 mr-2" />
                暂停
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => startAgent()}
                className="bg-white hover:bg-white/90 text-purple-600"
              >
                <Play className="w-4 h-4 mr-2" />
                启动
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    running: { label: '运行中', className: 'bg-green-500 animate-pulse' },
    idle: { label: '空闲', className: 'bg-gray-400' },
    paused: { label: '已暂停', className: 'bg-yellow-500' },
    error: { label: '错误', className: 'bg-red-500' },
  };

  const { label, className } = config[status] || config.idle;

  return (
    <Badge className={`${className} text-white border-0`}>
      {label}
    </Badge>
  );
}

function MetricItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-white/60">{icon}</div>
      <div>
        <p className="text-xs text-white/60">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
```

### 2. 快速操作面板

创建 `src/components/agents/QuickActionsPanel.tsx`:

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Zap, RefreshCw, TrendingUp } from 'lucide-react';
import { useAgent } from '@/hooks/useAgent';
import { toast } from 'sonner';

export function QuickActionsPanel({ agentId }: { agentId: string }) {
  const { triggerDecision, isDeciding } = useAgent(agentId);

  const handleDecision = async () => {
    try {
      const result = await triggerDecision();
      toast.success(`AI 决策完成！生成 ${result.decisions.length} 个任务`);
    } catch (error) {
      toast.error('决策失败，请重试');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          快速操作
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={handleDecision}
          disabled={isDeciding}
        >
          <Brain className="w-4 h-4 mr-2" />
          {isDeciding ? '思考中...' : '触发 AI 决策'}
        </Button>

        <Button className="w-full justify-start" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新状态
        </Button>

        <Button className="w-full justify-start" variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          查看性能报告
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 3. 最近决策列表

创建 `src/components/agents/RecentDecisions.tsx`:

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAgentDecisions } from '@/hooks/useAgentDecisions';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function RecentDecisions({ agentId }: { agentId: string }) {
  const { decisions, isLoading } = useAgentDecisions(agentId, { limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          最近决策
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <DecisionsSkeleton />
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => (
              <DecisionItem key={decision.id} decision={decision} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DecisionItem({ decision }: any) {
  const skillCount = decision.decisions.length;
  const timeAgo = formatDistanceToNow(new Date(decision.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
      {/* 状态图标 */}
      <div className="mt-1">
        {decision.executed ? (
          decision.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )
        ) : (
          <Clock className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* 决策内容 */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            {decision.executed ? '已执行' : '待执行'} · {skillCount} 个任务
          </p>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>

        {/* 决策理由 */}
        {decision.reasoning && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {decision.reasoning}
          </p>
        )}

        {/* Skills 列表 */}
        <div className="flex flex-wrap gap-1">
          {decision.decisions.slice(0, 3).map((d: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {d.skillName}
            </Badge>
          ))}
          {skillCount > 3 && (
            <Badge variant="outline" className="text-xs">
              +{skillCount - 3}
            </Badge>
          )}
        </div>

        {/* 成本信息 */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>模型: {decision.model}</span>
          <span>Token: {decision.tokensUsed}</span>
          <span>成本: ${decision.cost.toFixed(4)}</span>
          <span>延迟: {decision.latency}ms</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Skills 管理界面

### 页面布局

创建 `src/app/agents/[id]/skills/page.tsx`:

```typescript
import { SkillsGrid } from '@/components/agents/SkillsGrid';
import { SkillsFilter } from '@/components/agents/SkillsFilter';
import { SkillUsageChart } from '@/components/agents/SkillUsageChart';

export default function AgentSkillsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 顶部：使用统计图表 */}
      <SkillUsageChart agentId={params.id} />

      {/* Skills 网格 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">可用技能</h2>
          <SkillsFilter />
        </div>
        <SkillsGrid agentId={params.id} />
      </div>
    </div>
  );
}
```

### Skills 卡片网格

创建 `src/components/agents/SkillsGrid.tsx`:

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Clock, Star, TrendingUp } from 'lucide-react';
import { useAgentSkills } from '@/hooks/useAgentSkills';

export function SkillsGrid({ agentId }: { agentId: string }) {
  const { skills, isLoading } = useAgentSkills(agentId);

  if (isLoading) return <SkillsGridSkeleton />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}

function SkillCard({ skill }: any) {
  const categoryColors = {
    farming: 'bg-green-100 text-green-700',
    trading: 'bg-blue-100 text-blue-700',
    social: 'bg-purple-100 text-purple-700',
    strategy: 'bg-orange-100 text-orange-700',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {skill.displayName}
              {skill.recommended && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </CardTitle>
            <Badge
              className={`mt-2 ${categoryColors[skill.category]}`}
              variant="secondary"
            >
              {skill.category}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 描述 */}
        <p className="text-sm text-gray-600 line-clamp-2">
          {skill.description}
        </p>

        {/* 使用统计 */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>使用 {skill.usageCount} 次</span>
          </div>
          {skill.successRate > 0 && (
            <div className="flex items-center gap-1">
              <span>成功率 {skill.successRate.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* 限制条件 */}
        <div className="flex items-center gap-2 text-xs">
          {skill.energyCost > 0 && (
            <Badge variant="outline" className="gap-1">
              <Zap className="w-3 h-3" />
              {skill.energyCost} 能量
            </Badge>
          )}
          {skill.cooldown > 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {skill.cooldown}s 冷却
            </Badge>
          )}
        </div>

        {/* 操作按钮 */}
        <Button variant="outline" size="sm" className="w-full">
          查看详情
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 决策可视化

### 决策详情弹窗

创建 `src/components/agents/DecisionDetailModal.tsx`:

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

export function DecisionDetailModal({ decision, open, onClose }: any) {
  if (!decision) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI 决策详情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="决策 ID" value={decision.id.slice(0, 8)} />
            <InfoItem label="模型" value={decision.model} />
            <InfoItem label="Token 消耗" value={decision.tokensUsed} />
            <InfoItem label="成本" value={`$${decision.cost.toFixed(4)}`} />
            <InfoItem label="延迟" value={`${decision.latency}ms`} />
            <InfoItem
              label="状态"
              value={
                <StatusBadge
                  executed={decision.executed}
                  success={decision.success}
                />
              }
            />
          </div>

          <Separator />

          {/* 决策理由 */}
          {decision.reasoning && (
            <div>
              <h3 className="font-semibold mb-2">决策理由</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">{decision.reasoning}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Skills 执行序列 */}
          <div>
            <h3 className="font-semibold mb-3">执行计划 ({decision.decisions.length} 个任务)</h3>
            <div className="space-y-3">
              {decision.decisions.map((d: any, index: number) => (
                <SkillExecutionItem key={index} skill={d} index={index} />
              ))}
            </div>
          </div>

          {/* LLM 原始响应 (可折叠) */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-semibold">
              LLM 原始响应
            </summary>
            <pre className="mt-3 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {decision.response}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: any) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function StatusBadge({ executed, success }: any) {
  if (!executed) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="w-3 h-3" />
        待执行
      </Badge>
    );
  }

  return success ? (
    <Badge className="bg-green-500 gap-1">
      <CheckCircle className="w-3 h-3" />
      成功
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="w-3 h-3" />
      失败
    </Badge>
  );
}

function SkillExecutionItem({ skill, index }: any) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold">
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{skill.skillName}</p>
        {skill.reasoning && (
          <p className="text-xs text-gray-600 mt-1">{skill.reasoning}</p>
        )}
        <div className="mt-2">
          <Badge variant="secondary" className="text-xs">
            参数: {JSON.stringify(skill.parameters)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
```

---

## 成本监控面板

创建 `src/components/agents/CostMonitoringPanel.tsx`:

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useAgentCosts } from '@/hooks/useAgentCosts';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function CostMonitoringPanel({ agentId }: { agentId: string }) {
  const { costs, stats, isLoading } = useAgentCosts(agentId, { days: 7 });

  if (isLoading) return <CostPanelSkeleton />;

  const dailyBudget = 0.50; // $0.50/天
  const isOverBudget = stats.todayCost > dailyBudget;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          成本监控
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 关键指标 */}
        <div className="grid grid-cols-3 gap-4">
          <CostMetric
            label="今日成本"
            value={`$${stats.todayCost.toFixed(4)}`}
            trend={isOverBudget ? 'up' : 'down'}
            isWarning={isOverBudget}
          />
          <CostMetric
            label="本周成本"
            value={`$${stats.weekCost.toFixed(3)}`}
          />
          <CostMetric
            label="平均/天"
            value={`$${stats.avgDailyCost.toFixed(4)}`}
          />
        </div>

        {/* 预算警告 */}
        {isOverBudget && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-700">
              今日成本已超出预算 ${dailyBudget}
            </p>
          </div>
        )}

        {/* 成本趋势图 */}
        <div>
          <h4 className="text-sm font-medium mb-3">7 天成本趋势</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={costs}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Token 使用统计 */}
        <div>
          <h4 className="text-sm font-medium mb-2">Token 使用</h4>
          <div className="space-y-2">
            <TokenBar label="今日" used={stats.todayTokens} max={100000} />
            <TokenBar label="本周" used={stats.weekTokens} max={700000} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostMetric({ label, value, trend, isWarning }: any) {
  return (
    <div className={`p-3 rounded-lg ${isWarning ? 'bg-yellow-50' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className={`text-lg font-semibold ${isWarning ? 'text-yellow-700' : ''}`}>
          {value}
        </p>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
      </div>
    </div>
  );
}

function TokenBar({ label, used, max }: any) {
  const percentage = (used / max) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-gray-500">
          {used.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 组件库设计

### 自定义 Hooks

创建 `src/hooks/useAgent.ts`:

```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAgent(agentId: string) {
  const queryClient = useQueryClient();

  // 获取 Agent 数据
  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => fetch(`/api/agents/${agentId}`).then(res => res.json()),
  });

  // 启动 Agent
  const { mutate: startAgent } = useMutation({
    mutationFn: () => fetch(`/api/agents/${agentId}/start`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    },
  });

  // 停止 Agent
  const { mutate: stopAgent } = useMutation({
    mutationFn: () => fetch(`/api/agents/${agentId}/stop`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    },
  });

  // 触发 AI 决策
  const { mutate: triggerDecision, isPending: isDeciding } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/decide`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions', agentId] });
    },
  });

  return {
    agent,
    isLoading,
    startAgent,
    stopAgent,
    triggerDecision,
    isDeciding,
  };
}
```

---

## 响应式设计

### 移动端适配

```typescript
// 使用 TailwindCSS 响应式类
<div className="
  grid 
  grid-cols-1           // 移动端：1列
  md:grid-cols-2        // 平板：2列
  lg:grid-cols-3        // 桌面：3列
  gap-4
">
  {/* Cards */}
</div>

// 隐藏/显示元素
<div className="
  hidden              // 移动端隐藏
  lg:block            // 桌面显示
">
  {/* Desktop only content */}
</div>
```

---

## 总结

### 核心页面

1. ✅ **Agent 控制面板** - 状态监控、快速操作
2. ✅ **Skills 管理界面** - Skills 浏览、使用统计
3. ✅ **决策可视化** - 决策历史、执行详情
4. ✅ **成本监控面板** - 成本追踪、预算警告

### 技术栈

- **UI 框架**: shadcn/ui + TailwindCSS
- **图标**: Lucide Icons
- **图表**: Recharts
- **状态管理**: TanStack Query
- **表单**: React Hook Form + Zod

### 下一步

1. 实现实时日志流 (SSE)
2. 添加 Agent 性能分析图表
3. 实现 Skills 自定义编辑器
4. 添加决策模拟器

前端 UI 设计方案已完成！🎨
