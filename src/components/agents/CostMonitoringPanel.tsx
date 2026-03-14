"use client";

import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface CostMonitoringPanelProps {
  agentId: string;
}

interface CostStats {
  todayCost: number;
  weekCost: number;
  avgDailyCost: number;
  todayTokens: number;
  weekTokens: number;
}

export function CostMonitoringPanel({ agentId }: CostMonitoringPanelProps) {
  const [stats, setStats] = useState<CostStats>({
    todayCost: 0,
    weekCost: 0,
    avgDailyCost: 0,
    todayTokens: 0,
    weekTokens: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCostStats();
  }, [agentId]);

  const fetchCostStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agents/${agentId}/costs?days=7`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch cost stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dailyBudget = 0.5; // $0.50/天
  const isOverBudget = stats.todayCost > dailyBudget;

  if (isLoading) {
    return (
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45] animate-pulse">
        <div className="h-32 bg-[#1A1F25] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-green-500" />
        <h3 className="font-bold text-base">成本监控</h3>
      </div>

      <div className="space-y-4">
        {/* 关键指标 */}
        <div className="grid grid-cols-3 gap-3">
          <CostMetric
            label="今日成本"
            value={`$${stats.todayCost.toFixed(4)}`}
            trend={isOverBudget ? "up" : "down"}
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
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-400">
              今日成本已超出预算 ${dailyBudget.toFixed(2)}
            </p>
          </div>
        )}

        {/* Token 使用统计 */}
        <div>
          <h4 className="text-sm font-medium mb-2">Token 使用</h4>
          <div className="space-y-2">
            <TokenBar label="今日" used={stats.todayTokens} max={100000} />
            <TokenBar label="本周" used={stats.weekTokens} max={700000} />
          </div>
        </div>

        {/* 成本趋势占位 */}
        <div>
          <h4 className="text-sm font-medium mb-2">7 天成本趋势</h4>
          <div className="h-32 bg-[#1A1F25] rounded-lg flex items-center justify-center text-gray-500 text-xs">
            图表功能开发中...
          </div>
        </div>
      </div>
    </div>
  );
}

function CostMetric({
  label,
  value,
  trend,
  isWarning,
}: {
  label: string;
  value: string;
  trend?: "up" | "down";
  isWarning?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${isWarning ? "bg-yellow-500/10" : "bg-[#1A1F25]"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-base font-semibold ${isWarning ? "text-yellow-400" : ""}`}>
          {value}
        </p>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-red-400" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-green-400" />}
      </div>
    </div>
  );
}

function TokenBar({ label, used, max }: { label: string; used: number; max: number }) {
  const percentage = Math.min((used / max) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">
          {used.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-[#1A1F25] rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
