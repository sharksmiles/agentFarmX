"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAgent } from "@/hooks/useAgent";
import { useAgentDecisions } from "@/hooks/useAgentDecisions";
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";
import { QuickActionsPanel } from "@/components/agents/QuickActionsPanel";
import { CostMonitoringPanel } from "@/components/agents/CostMonitoringPanel";
import { DecisionDetailModal } from "@/components/agents/DecisionDetailModal";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function AgentDashboardPage() {
  const params = useParams();
  const agentId = params.id as string;

  const { agent, isLoading, startAgent, stopAgent, triggerDecision, refetch } = useAgent(agentId);
  const { decisions } = useAgentDecisions(agentId, { limit: 5 });

  const [selectedDecision, setSelectedDecision] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-[#252A31] rounded-2xl h-48" />
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#252A31] rounded-2xl h-32" />
            <div className="bg-[#252A31] rounded-2xl h-32 col-span-2" />
          </div>
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
      {/* 顶部状态卡片 */}
      <AgentStatusCard
        agent={agent}
        onStart={startAgent}
        onStop={stopAgent}
      />

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：快速操作 + 成本监控 */}
        <div className="lg:col-span-1 space-y-4">
          <QuickActionsPanel
            agentId={agentId}
            onTriggerDecision={triggerDecision}
            onRefresh={refetch}
          />
          <CostMonitoringPanel agentId={agentId} />
        </div>

        {/* 右侧：最近决策 */}
        <div className="lg:col-span-2">
          <RecentDecisions
            decisions={decisions}
            onViewDetail={setSelectedDecision}
          />
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

function RecentDecisions({
  decisions,
  onViewDetail,
}: {
  decisions: any[];
  onViewDetail: (decision: any) => void;
}) {
  return (
    <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
      <h3 className="font-bold text-base mb-4">最近决策</h3>

      {decisions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-3xl mb-2">🧠</p>
          <p className="text-sm">暂无决策记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((decision) => (
            <DecisionItem
              key={decision.id}
              decision={decision}
              onClick={() => onViewDetail(decision)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionItem({ decision, onClick }: { decision: any; onClick: () => void }) {
  const skillCount = decision.decisions?.length || 0;
  const timeAgo = formatDistanceToNow(new Date(decision.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl border border-[#353B45] hover:border-[#5964F5] hover:bg-[#1A1F25] transition-colors cursor-pointer"
    >
      {/* 状态图标 */}
      <div className="mt-1">
        {decision.executed ? (
          decision.success ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )
        ) : (
          <Clock className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* 决策内容 */}
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm">
            {decision.executed ? "已执行" : "待执行"} · {skillCount} 个任务
          </p>
          <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo}</span>
        </div>

        {/* 决策理由 */}
        {decision.reasoning && (
          <p className="text-sm text-gray-400 line-clamp-2">{decision.reasoning}</p>
        )}

        {/* Skills 列表 */}
        {decision.decisions && decision.decisions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {decision.decisions.slice(0, 3).map((d: any, i: number) => (
              <span
                key={i}
                className="px-2 py-1 bg-[#1A1F25] rounded-lg text-xs text-gray-300"
              >
                {d.skillName}
              </span>
            ))}
            {skillCount > 3 && (
              <span className="px-2 py-1 bg-[#1A1F25] rounded-lg text-xs text-gray-500">
                +{skillCount - 3}
              </span>
            )}
          </div>
        )}

        {/* 成本信息 */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>模型: {decision.model}</span>
          <span>Token: {decision.tokensUsed}</span>
          <span>成本: ${decision.cost.toFixed(4)}</span>
          <span>{decision.latency}ms</span>
        </div>
      </div>
    </div>
  );
}
