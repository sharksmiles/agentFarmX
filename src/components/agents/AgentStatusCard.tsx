"use client";

import { Brain, Zap, TrendingUp, Play, Pause, Settings } from "lucide-react";
import Link from "next/link";

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

const AGENT_TYPE_ICONS: Record<string, string> = {
  farmer: "🌾",
  trader: "📈",
  raider: "⚔️",
  defender: "🛡️",
};

export function AgentStatusCard({ agent, onStart, onStop }: AgentStatusCardProps) {
  const isRunning = agent.status === "running";

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between">
        {/* 左侧：Agent 信息 */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              {AGENT_TYPE_ICONS[agent.type] || <Brain className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{agent.name}</h2>
              <p className="text-white/80 text-sm capitalize">
                {agent.personality || agent.type} · {agent.strategyType || "Auto"}
              </p>
            </div>
          </div>

          {/* 状态徽章 */}
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.status} />
            {agent.aiModel && (
              <span className="px-2 py-1 bg-white/10 border border-white/30 rounded-lg text-xs font-medium">
                {agent.aiModel}
              </span>
            )}
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
        <div className="flex flex-col gap-2 ml-4">
          {isRunning ? (
            <button
              onClick={onStop}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Pause className="w-4 h-4" />
              暂停
            </button>
          ) : (
            <button
              onClick={onStart}
              className="bg-white hover:bg-white/90 text-purple-600 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              启动
            </button>
          )}
          <Link href={`/agents/${agent.id}/settings`}>
            <button className="text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors w-full">
              <Settings className="w-4 h-4" />
              设置
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    running: { label: "运行中", className: "bg-green-500 animate-pulse" },
    idle: { label: "空闲", className: "bg-gray-400" },
    paused: { label: "已暂停", className: "bg-yellow-500" },
    error: { label: "错误", className: "bg-red-500" },
    out_of_funds: { label: "余额不足", className: "bg-orange-500" },
  };

  const { label, className } = config[status] || config.idle;

  return (
    <span className={`${className} text-white border-0 px-3 py-1 rounded-full text-xs font-semibold`}>
      {label}
    </span>
  );
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
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
