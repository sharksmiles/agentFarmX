"use client";

import { useParams } from "next/navigation";
import { useAgent } from "@/hooks/useAgent";

export default function AgentPerformancePage() {
  const params = useParams();
  const agentId = params.id as string;
  const { agent, isLoading } = useAgent(agentId);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="bg-[#252A31] rounded-2xl h-64" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Agent 不存在</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">性能分析</h2>

      {/* 性能统计 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">关键指标</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="总收益" value={`${agent.totalProfit} 币`} color="text-[#FBB602]" />
          <StatCard label="成功率" value={`${(agent.successRate * 100).toFixed(1)}%`} color="text-green-400" />
          <StatCard label="执行任务" value={agent.totalTasks.toString()} />
          <StatCard label="全球排名" value={`#${agent.stats.ranking}`} color="text-[#5964F5]" />
        </div>
      </div>

      {/* 详细统计 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">详细统计</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="总操作数" value={agent.stats.total_actions.toLocaleString()} />
          <StatCard label="总收益" value={`${agent.stats.total_earned_coin.toLocaleString()} COIN`} color="text-[#FBB602]" />
          <StatCard label="胜率" value={`${agent.stats.win_rate}%`} color="text-green-400" />
          {agent.stats.steal_success_count !== undefined && (
            <StatCard 
              label="偷菜战绩" 
              value={`${agent.stats.steal_success_count}W / ${agent.stats.steal_fail_count}L`} 
            />
          )}
          <StatCard label="Gas 消耗" value={`${agent.stats.total_spent_gas.toFixed(4)} OKB`} />
          <StatCard label="USDC 消耗" value={`${agent.stats.total_spent_usdc.toFixed(2)} USDC`} />
        </div>
      </div>

      {/* 占位：图表区域 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">收益趋势</h3>
        <div className="h-48 flex items-center justify-center text-gray-500">
          <p className="text-sm">图表功能开发中...</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#1A1F25] rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-bold ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}
